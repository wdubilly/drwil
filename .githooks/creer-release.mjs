#!/usr/bin/env node
// Pose un tag Git (vX.Y.Z) + une note de release GitHub sur le commit
// courant, pour tracer les chantiers fusionnés sans publier sur npm.
// Ne modifie JAMAIS de fichier suivi (QUA-017 : pas de commit sur la
// branche principale) : seuls un tag Git et une release GitHub (hors
// dépôt) sont créés. Version calculée depuis les messages de commit
// façon Conventional Commits, best-effort (aucun format n'est imposé —
// défaut sûr : bump "patch" si aucun type reconnu).
// Usage : node creer-release.mjs [--dry-run]
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const dryRun = process.argv.includes("--dry-run");

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function dernierTag() {
  try {
    // stderr capturé (pas "inherit") : l'absence de tag est l'état normal
    // d'un premier appel, pas une erreur à afficher à l'utilisateur.
    return execFileSync("git", ["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*.[0-9]*.[0-9]*"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null; // aucun tag : première release
  }
}

function commitsDepuis(tag) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const out = git(["log", range, "--no-merges", "--pretty=%s%x1f%b%x1e"]);
  if (!out) return [];
  return out
    .split("\x1e")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [sujet, corps = ""] = s.split("\x1f");
      return { sujet: sujet.trim(), corps: corps.trim() };
    });
}

// Détecte le bump semver depuis une liste de commits (Conventional
// Commits, best-effort). Exportée pour le test unitaire.
export function detecterBump(commits) {
  if (commits.length === 0) return null;
  let bump = "patch"; // défaut sûr : tout chantier fusionné mérite au moins un patch
  for (const { sujet, corps } of commits) {
    const m = /^(\w+)(\([^)]*\))?(!)?:\s/.exec(sujet);
    const rupture = (m && m[3] === "!") || /BREAKING CHANGE/.test(corps) || /BREAKING CHANGE/.test(sujet);
    if (rupture) return "major"; // rupture annoncée : priorité absolue, inutile de continuer
    if (m && m[1] === "feat") bump = "minor";
  }
  return bump;
}

export function versionSuivante(tag, bump) {
  const base = tag ? tag.replace(/^v/, "") : "0.0.0";
  let [maj, min, pat] = base.split(".").map((n) => parseInt(n, 10) || 0);
  if (bump === "major") { maj += 1; min = 0; pat = 0; }
  else if (bump === "minor") { min += 1; pat = 0; }
  else { pat += 1; }
  return `v${maj}.${min}.${pat}`;
}

function main() {
  const tag = dernierTag();
  const commits = commitsDepuis(tag);
  const bump = detecterBump(commits);
  if (!bump) {
    console.log(`[creer-release] rien à publier depuis ${tag ?? "le début du dépôt"} (aucun commit).`);
    return;
  }
  const prochain = tag ? versionSuivante(tag, bump) : "v0.1.0";
  console.log(`[creer-release] dernier tag : ${tag ?? "(aucun)"}`);
  console.log(`[creer-release] bump détecté : ${bump} (${commits.length} commit(s) analysé(s))`);
  console.log(`[creer-release] prochaine version : ${prochain}`);
  if (dryRun) {
    console.log("[creer-release] --dry-run : aucun tag ni release créé.");
    return;
  }
  const notes = commits.map((c) => `- ${c.sujet}`).join("\n");
  git(["tag", "-a", prochain, "-m", `Release ${prochain}\n\n${notes}`]);
  git(["push", "origin", prochain]);
  console.log(`[creer-release] tag ${prochain} créé et poussé.`);
  try {
    execFileSync("gh", ["release", "create", prochain, "--generate-notes"], { stdio: "inherit" });
  } catch (e) {
    console.error(`[creer-release] tag créé, mais la release GitHub a échoué (gh indisponible ou permission insuffisante) : ${e.message}`);
    console.error("[creer-release] rattraper à la main : gh release create " + prochain + " --generate-notes");
  }
}

// Ne s'exécute que lancé directement (node creer-release.mjs), pas quand
// detecterBump/versionSuivante sont importées pour un test unitaire.
// pathToFileURL (pas une concaténation "file://" + argv[1]) : sur Windows
// process.argv[1] utilise des antislashs (D:\...) alors qu'import.meta.url
// utilise des slashs (file:///D:/...) — la comparaison naïve échoue
// silencieusement et main() ne s'exécute jamais.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
