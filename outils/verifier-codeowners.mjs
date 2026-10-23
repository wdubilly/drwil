#!/usr/bin/env node
// Contrôle propre au dépôt drwil, jamais livré (QUA-112) : chaque ligne de .github/CODEOWNERS cite un
// chemin qui correspond à au moins un fichier ou dossier suivi par Git. Sans lui, le renommage du
// registre (docs/contrats.md → docs/contracts.md) a retiré en silence la revue obligatoire des
// contrats : GitHub ignore un motif qui ne correspond à rien, sans erreur.
// Motifs lus selon la syntaxe GitHub (celle de .gitignore, sans négation) : `/` en tête ou au milieu
// ancre à la racine, `/` final ne vise qu'un dossier, `*` reste dans un segment, `**` en traverse
// plusieurs. Tout autre caractère spécial (`?`, `[`, `\`, `!`) est une erreur, jamais un succès
// (QUA-013) : le contrôle ne juge que ce qu'il sait lire.
// Usage : node outils/verifier-codeowners.mjs [racine]
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CODEOWNERS = join(".github", "CODEOWNERS");

/** Lignes utiles de CODEOWNERS : [{ ligne, motif }] (commentaires et lignes vides écartés). */
export function lireCodeowners(texte) {
  return texte.split(/\r?\n/).flatMap((brute, i) => {
    const ligne = brute.trim();
    if (!ligne || ligne.startsWith("#")) return [];
    return [{ ligne: i + 1, motif: ligne.split(/\s+/)[0] }];
  });
}

const echapper = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** { regex, dossier } d'un motif, ou null s'il contient une syntaxe que ce contrôle ne sait pas lire. */
export function compiler(motif) {
  if (/[?[\]\\!]/.test(motif)) return null;
  const dossier = motif.endsWith("/");
  let corps = dossier ? motif.slice(0, -1) : motif;
  const ancre = corps.includes("/");
  if (corps.startsWith("/")) corps = corps.slice(1);
  if (!corps || corps.split("/").includes("")) return null;
  let source = "";
  for (let i = 0; i < corps.length; i++) {
    if (corps.startsWith("**/", i)) {
      source += "(?:.*/)?";
      i += 2;
    } else if (corps.startsWith("**", i)) {
      source += ".*";
      i += 1;
    } else if (corps[i] === "*") source += "[^/]*";
    else source += echapper(corps[i]);
  }
  return { regex: new RegExp(`^${ancre ? "" : "(?:.*/)?"}${source}$`), dossier };
}

/** Problèmes : une ligne par motif non interprété ou sans correspondance dans `suivis` (chemins Git). */
export function verifier(lignes, suivis) {
  const dossiers = new Set();
  for (const f of suivis) {
    const parties = f.split("/");
    for (let i = 1; i < parties.length; i++) dossiers.add(parties.slice(0, i).join("/"));
  }
  const problemes = [];
  for (const { ligne, motif } of lignes) {
    const c = compiler(motif);
    if (!c) {
      problemes.push(`ligne ${ligne} : motif non interprété ${motif} (syntaxe non prise en charge par ce contrôle)`);
      continue;
    }
    const candidats = c.dossier ? [...dossiers] : [...suivis, ...dossiers];
    if (!candidats.some((p) => c.regex.test(p)))
      problemes.push(`ligne ${ligne} : ${motif} ne correspond à aucun ${c.dossier ? "dossier" : "fichier ni dossier"} suivi par Git`);
  }
  return problemes;
}

function principal(racine) {
  const chemin = join(racine, CODEOWNERS);
  if (!existsSync(chemin)) {
    console.error(`[codeowners] ${CODEOWNERS} introuvable : rien à vérifier n'est pas une réussite.`);
    return 1;
  }
  const git = spawnSync("git", ["ls-files", "-z"], { cwd: racine, encoding: "utf8" });
  if (git.status !== 0) {
    console.error(`[codeowners] git ls-files a échoué : ${(git.stderr || git.error?.message || "").trim()}`);
    return 1;
  }
  const suivis = git.stdout.split("\0").filter(Boolean);
  const problemes = verifier(lireCodeowners(readFileSync(chemin, "utf8")), suivis);
  if (problemes.length) {
    for (const p of problemes) console.error(`[codeowners] ${p}`);
    console.error(`[codeowners] ${problemes.length} ligne(s) de ${CODEOWNERS} sans effet : GitHub les ignore en silence.`);
    return 1;
  }
  console.log(`[codeowners] ${CODEOWNERS} : chaque ligne cite un chemin suivi.`);
  return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exit(principal(process.argv[2] ?? process.cwd()));
