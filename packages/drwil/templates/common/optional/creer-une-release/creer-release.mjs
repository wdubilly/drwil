#!/usr/bin/env node
// Pose un tag Git (vX.Y.Z) + une note de release GitHub sur le commit
// courant, pour tracer les chantiers fusionnés sans publier sur npm.
// Ne modifie JAMAIS de fichier suivi (QUA-017 : pas de commit sur la
// branche principale) : seuls un tag Git et une release GitHub (hors
// dépôt) sont créés. Version : celle des paquets npm publiables du dépôt
// (package.json, source unique décidée et relue en PR) ; à défaut de paquet
// npm, calculée depuis les messages de commit façon Conventional Commits,
// best-effort (défaut sûr : bump "patch" si aucun type reconnu).
// Usage : node creer-release.mjs [--dry-run]
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

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

// Repère les paquets npm publiables du dépôt (package.json suivi par Git,
// avec un "name" et sans "private": true) — ignore le package.json racine
// d'un monorepo privé (workspaces) et tout paquet explicitement marqué privé.
// Best-effort : un package.json illisible/invalide est ignoré, pas une erreur.
export function paquetsPublics() {
  let fichiers;
  try {
    fichiers = git(["ls-files", "--", "package.json", "*/package.json", "*/*/package.json", "*/*/*/package.json"])
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
  const dossiers = [];
  for (const f of fichiers) {
    try {
      const pkg = JSON.parse(readFileSync(f, "utf8"));
      if (pkg.private || !pkg.name) continue;
      dossiers.push(dirname(f));
    } catch {
      // package.json illisible ou invalide : ignoré, pas bloquant pour la release
    }
  }
  return dossiers;
}

// Versions déclarées par les paquets publiables : [{ dossier, version }].
export function versionsPaquets(dossiers) {
  return dossiers.map((dossier) => {
    try {
      return { dossier, version: JSON.parse(readFileSync(join(dossier, "package.json"), "utf8")).version ?? null };
    } catch {
      return { dossier, version: null };
    }
  });
}

function comparer(a, b) {
  const p = (v) => v.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const [x, y] = [p(a), p(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// Décide la version de la release (pure, exportée pour les tests). Avec des paquets npm, le tag suit
// leur package.json : un seul numéro pour le tag, le tarball et `--version`, jamais deux qui divergent.
// Rend { prochain, source } ou { erreur } ; null s'il n'y a rien à publier.
export function deciderVersion({ dernier, bump, versions = [], tagsExistants = [] }) {
  if (!bump) return null;
  if (!versions.length) return { prochain: dernier ? versionSuivante(dernier, bump) : "v0.1.0", source: "commits" };
  const distinctes = [...new Set(versions.map((v) => v.version))];
  if (distinctes.length > 1) return { erreur: `paquets en désaccord sur la version (${versions.map((v) => `${v.dossier}@${v.version}`).join(", ")}) : les aligner dans une PR` };
  if (!/^\d+\.\d+\.\d+$/.test(distinctes[0] ?? "")) return { erreur: `version de paquet absente ou non semver (${distinctes[0]}) dans ${versions[0].dossier}/package.json` };
  const prochain = `v${distinctes[0]}`;
  const corriger = "changer la version dans une PR (npm version patch|minor|major --no-git-tag-version)";
  if (tagsExistants.includes(prochain)) return { erreur: `${prochain} existe déjà : ${corriger}` };
  if (dernier && comparer(prochain, dernier) <= 0) return { erreur: `${prochain} n'est pas supérieure au dernier tag ${dernier} : ${corriger}` };
  return { prochain, source: `package.json (${versions.map((v) => v.dossier).join(", ")})` };
}

// Construit un tarball (npm pack) pour chaque paquet publiable trouvé, dans
// un dossier temporaire, et renvoie les chemins des .tgz produits.
function construireTarballs(dossiers) {
  const sortie = [];
  if (dossiers.length === 0) return sortie;
  const dest = mkdtempSync(join(tmpdir(), "creer-release-"));
  for (const dossier of dossiers) {
    try {
      const out = execFileSync("npm", ["pack", "--silent", "--pack-destination", dest], { cwd: dossier, encoding: "utf8" }).trim();
      const nomFichier = out.split("\n").pop();
      sortie.push(join(dest, nomFichier));
    } catch (e) {
      console.error(`[creer-release] "npm pack" a échoué pour ${dossier}, tarball non attaché : ${e.message}`);
    }
  }
  return sortie;
}

function main() {
  const tag = dernierTag();
  const commits = commitsDepuis(tag);
  const bump = detecterBump(commits);
  const paquets = paquetsPublics();
  const tagsExistants = git(["tag", "-l", "v*"]).split("\n").filter(Boolean);
  const decision = deciderVersion({ dernier: tag, bump, versions: versionsPaquets(paquets), tagsExistants });
  if (!decision) {
    console.log(`[creer-release] rien à publier depuis ${tag ?? "le début du dépôt"} (aucun commit).`);
    return;
  }
  console.log(`[creer-release] dernier tag : ${tag ?? "(aucun)"}`);
  if (decision.erreur) {
    console.error(`[creer-release] ✗ release refusée : ${decision.erreur}`);
    process.exitCode = 1;
    return;
  }
  const prochain = decision.prochain;
  console.log(`[creer-release] ${paquets.length ? "suggestion d'après les commits" : "bump détecté"} : ${bump} (${commits.length} commit(s) analysé(s))`);
  console.log(`[creer-release] prochaine version : ${prochain} (source : ${decision.source})`);
  if (paquets.length > 0) {
    console.log(`[creer-release] tarball(s) à construire et attacher à la release : ${paquets.join(", ")}`);
  }
  if (dryRun) {
    console.log("[creer-release] --dry-run : aucun tag ni release créé.");
    return;
  }
  const notes = commits.map((c) => `- ${c.sujet}`).join("\n");
  git(["tag", "-a", prochain, "-m", `Release ${prochain}\n\n${notes}`]);
  git(["push", "origin", prochain]);
  console.log(`[creer-release] tag ${prochain} créé et poussé.`);
  const tarballs = construireTarballs(paquets);
  try {
    execFileSync("gh", ["release", "create", prochain, ...tarballs, "--generate-notes"], { stdio: "inherit" });
    if (tarballs.length > 0) console.log(`[creer-release] tarball(s) attaché(s) à la release : ${tarballs.join(", ")}`);
  } catch (e) {
    console.error(`[creer-release] tag créé, mais la release GitHub a échoué (gh indisponible ou permission insuffisante) : ${e.message}`);
    console.error("[creer-release] rattraper à la main : gh release create " + prochain + " --generate-notes" + (tarballs.length ? " " + tarballs.join(" ") : ""));
  }
}

// Ne s'exécute que lancé directement (node creer-release.mjs), pas quand
// detecterBump/versionSuivante sont importées pour un test unitaire.
// pathToFileURL (pas une concaténation "file://" + argv[1]) : sur Windows
// process.argv[1] utilise des antislashs (D:\...) alors qu'import.meta.url
// utilise des slashs (file:///D:/...) — la comparaison naïve échoue
// silencieusement et main() ne s'exécute jamais.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
