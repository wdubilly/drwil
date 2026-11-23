#!/usr/bin/env node
// Rappel de la recette réelle (QUA-330), propre au dépôt : une fiche ouverte dont le bloc `scope` touche l'installation
// ou la mise à jour du kit, et dont le lot 1 ne cite pas de recette réelle, est rappelée par une ligne
// `[ia-first-warning]`. Jamais de refus (décision D7 du chantier acceleration-des-controles) : code 0 en toute
// circonstance, une fiche illisible est passée sous silence.
// Usage : node outils/verifier-recette-reelle.mjs [racine]
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { briefStatus, MODEL_RE, ROUTINE_RE } from "../.githooks/briefs.mjs";
import { fnmatch, readBlock } from "../.githooks/scope.mjs";

/** Code de l'installation et de la mise à jour du kit (style fnmatch : `*` traverse `/`). */
export const MOTIFS_INSTALLATION = [
  "packages/drwil/src/kit-*",
  "packages/drwil/src/install*",
  "packages/drwil/src/cli-install.ts",
  "packages/drwil/src/migration*",
  "packages/drwil/src/manifest*",
  "packages/drwil/src/complete*",
  "packages/drwil/src/drift.ts",
  "packages/drwil/src/doctor-install.ts",
  "packages/drwil/src/doctor-upgrade.ts",
  "packages/drwil/bin/drwil.js",
  "packages/drwil/package.json",
];
const RECETTE_RE = /recette\s+réelle|real\s+acceptance\s+run|recette-adoptant/i;
const SECTION_RE = /^##\s*(\d+\.\s*)?(Increments?|Incréments?)\b/i;
const LOT1_RE = /^\s*-\s*\*\*(?:Lot|Increment|Incrément)\s+1\b/i;

const joker = (p) => [...p].findIndex((c) => c === "*" || c === "?");
// Un chemin peut-il répondre aux deux motifs ? Exact pour un littéral, prudent (préfixe commun) pour deux motifs.
function seRencontrent(a, b) {
  const [ia, ib] = [joker(a), joker(b)];
  if (ia === -1) return fnmatch(a, b);
  if (ib === -1) return fnmatch(b, a);
  const [pa, pb] = [a.slice(0, ia), b.slice(0, ib)];
  return pa.startsWith(pb) || pb.startsWith(pa);
}

/** Texte de la puce du lot 1 (lignes de suite comprises), ou null sans lot 1. */
export function texteDuLot1(texte) {
  let dedans = false;
  let lot = null;
  for (const ligne of texte.split(/\r?\n/)) {
    if (/^##\s/.test(ligne)) {
      if (lot !== null) break;
      dedans = SECTION_RE.test(ligne);
    } else if (dedans && lot === null && LOT1_RE.test(ligne)) lot = [ligne];
    else if (lot !== null && /^\s*-\s/.test(ligne)) break;
    else if (lot !== null) lot.push(ligne);
  }
  return lot?.join("\n") ?? null;
}

/** Raison du rappel pour le texte d'une fiche, ou null. */
export function aRappeler(texte) {
  if (briefStatus(texte) !== "open") return null;
  const motif = readBlock(texte).patterns.find((p) => MOTIFS_INSTALLATION.some((m) => seRencontrent(p, m)));
  if (!motif) return null;
  const lot1 = texteDuLot1(texte);
  if (lot1 && RECETTE_RE.test(lot1)) return null;
  const quoi = lot1 ? "le lot 1 ne cite pas de recette réelle" : "aucun lot 1 ne prévoit de recette réelle";
  return `le bloc scope touche l'installation ou la mise à jour (\`${motif}\`) et ${quoi} : prévoir dès le lot 1 une recette réelle (node outils/recette-adoptant.mjs, sur des copies d'adoptants) — rappel, jamais un refus`;
}

/** Fiches ouvertes de `docs/projects/` à rappeler : `[{ fiche, raison }]`. */
export function analyser(racine) {
  const dossier = join(racine, "docs", "projects");
  if (!existsSync(dossier)) return [];
  const rappels = [];
  for (const nom of readdirSync(dossier).sort()) {
    const fiche = `docs/projects/${nom}`;
    if (!nom.endsWith(".md") || MODEL_RE.test(nom) || ROUTINE_RE.test(fiche)) continue;
    let texte;
    try {
      texte = readFileSync(join(dossier, nom), "utf8");
    } catch {
      continue;
    }
    const raison = aRappeler(texte);
    if (raison) rappels.push({ fiche, raison });
  }
  return rappels;
}

/** Écrit un avertissement par fiche rappelée ; rend toujours 0. */
export function principal(racine, ecrire = console.log) {
  try {
    for (const { fiche, raison } of analyser(racine)) ecrire(`[ia-first-warning] ${fiche} : ${raison}`);
  } catch (e) {
    ecrire(`[ia-first-warning] rappel de la recette réelle non évalué : ${e.message}`);
  }
  return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = principal(process.argv[2] ?? process.cwd());
}
