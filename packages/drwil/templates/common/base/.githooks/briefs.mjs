// Lecture du dépôt pour l'état de gouvernance (découpé de state.mjs, qui le réexporte) : réglages,
// statut et liste des fiches cadrées, priorités de l'index commité.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { lireBloc } from "./scope.mjs";

export const DOSSIERS_FICHES = ["docs/projects/"];
export const MODELE_RE = /^modele-|^model-/;

/** Réglages du projet (.drwil/ia-first.json) ; illisibles ou absents : aucun. */
export function config(racine) {
  try {
    return JSON.parse(readFileSync(join(racine, ".drwil", "ia-first.json"), "utf8")) ?? {};
  } catch {
    return {};
  }
}

const STATUT_LIGNE_RE = /^\*\*(?:Statut|Status)\*\*\s*:\s*(.*)$/;

/**
 * « terminee », « reference » ou « ouverte » — seule définition, partagée avec check-docs.mjs.
 * Seul un marqueur explicite en tête du statut compte : un mot cherché n'importe où (« essai réel
 * fait », « fait (lot 1) » d'une fiche à plusieurs lots) donnait de faux « terminée ».
 */
export function statutFiche(texte) {
  const statut =
    texte
      .split(/\r?\n/)
      .slice(0, 15)
      .map((l) => STATUT_LIGNE_RE.exec(l))
      .find(Boolean)?.[1] ?? "";
  if (/^(?:terminé\s+le|done\s+on)\s+\d{4}-\d{2}-\d{2}\b/i.test(statut)) return "terminee";
  if (/^(?:référence|reference)\b/i.test(statut)) return "reference";
  return "ouverte";
}

const INDEX_DEFAUT = ["docs/projects/pending.md"];
const PRIORITE_DEFAUT = 2;

/** Priorité de chaque fiche citée par un sujet ouvert de l'index commité ([P0] à [P3], [P2] sans tag). */
function prioritesIndex(racine) {
  const priorites = new Map();
  for (const chemin of [config(racine).dirs?.index, ...INDEX_DEFAUT].filter(Boolean)) {
    const r = spawnSync("git", ["show", `HEAD:${chemin}`], { cwd: racine, encoding: "utf8" });
    if (r.status !== 0) continue;
    // Un sujet : sa ligne « - [ ] » et ses lignes de suite ; un point coché d'une fiche à plusieurs
    // lots ne dit rien de la priorité du travail restant.
    for (const sujet of r.stdout.split(/\r?\n(?=\s*- \[)/)) {
      if (!/^\s*- \[ \]/.test(sujet)) continue;
      const p = /\[P([0-3])\]/.exec(sujet)?.[1];
      for (const m of sujet.matchAll(/`(docs\/projects\/[^`]+\.md)`/g)) {
        if (!priorites.has(m[1])) priorites.set(m[1], p === undefined ? PRIORITE_DEFAUT : Number(p));
      }
    }
    break;
  }
  return priorites;
}

/** `[décision]` encore ouvertes dans la section « Points à trancher » (« Points to decide »). */
function decisionsOuvertes(texte) {
  let dans = false;
  let n = 0;
  for (const ligne of texte.split(/\r?\n/)) {
    if (/^##\s/.test(ligne)) dans = /^##\s*(\d+\.\s*)?(Points à trancher|Points to decide)\b/i.test(ligne);
    else if (dans && /^\s*-\s*\[(décision|decision)\]/i.test(ligne)) n++;
  }
  return n;
}

/**
 * Fiches qu'on peut lancer : fiches de docs/projects/, hors modèles, non
 * terminées, dont le bloc `cadrage` existe dans HEAD — le cadrage validé est le cadrage commité,
 * comme pour la barrière. `[{ chemin, titre, priorite, decisions, prete }]` : prêtes d'abord (aucune
 * décision ouverte), puis par priorité de l'index, puis par chemin.
 */
export function fichesCadrees(racine) {
  const priorites = prioritesIndex(racine);
  const fiches = [];
  for (const dossier of DOSSIERS_FICHES) {
    const abs = join(racine, dossier);
    if (!existsSync(abs)) continue;
    for (const nom of readdirSync(abs).sort()) {
      const chemin = dossier + nom;
      if (!nom.endsWith(".md") || MODELE_RE.test(nom)) continue;
      const r = spawnSync("git", ["show", `HEAD:${chemin}`], { cwd: racine, encoding: "utf8" });
      if (r.status !== 0 || !lireBloc(r.stdout).motifs.length) continue;
      // Une fiche de référence (mécanique du kit) garde son cadrage sans être un chantier à lancer.
      if (statutFiche(r.stdout) !== "ouverte") continue;
      const decisions = decisionsOuvertes(r.stdout);
      const priorite = priorites.get(chemin) ?? PRIORITE_DEFAUT;
      fiches.push({
        chemin,
        titre: /^#\s+(.+)$/m.exec(r.stdout)?.[1]?.trim() ?? chemin,
        priorite: `P${priorite}`,
        decisions,
        prete: decisions === 0,
      });
    }
  }
  return fiches.sort(
    (a, b) => Number(b.prete) - Number(a.prete) || a.priorite.localeCompare(b.priorite) || a.chemin.localeCompare(b.chemin),
  );
}
