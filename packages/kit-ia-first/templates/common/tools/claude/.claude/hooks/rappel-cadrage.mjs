#!/usr/bin/env node
// Rappel de cadrage pour Claude Code (hook PostToolUse sur Edit, Write et
// MultiEdit ; docs/ia-first.md section 7, docs/projets/mecanique-ia-first.md).
//
// Après l'écriture d'un fichier de code qu'aucune fiche de docs/projets/ ne
// couvre, glisse un message à l'agent pour qu'il rattache le fichier à son
// chantier (ou à docs/projets/entretien-courant.md pour une petite tâche).
// Ne demande rien et ne refuse rien : toute entrée inattendue, voire une
// exception, donne « pas de rappel ». Le commit suit la sévérité réglée dans
// .drwil/ia-first.json -> cadrage ("bloquant" | "avertissement", défaut ;
// | "off" désactive aussi ce rappel). La grammaire vient de .githooks/cadrage.mjs,
// la même que le contrôle au commit.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, "..", "..");
const OUTILS = new Set(["Edit", "Write", "MultiEdit"]);
const MODELE_RE = /^modele-|^model-/;

function loadConfig(racine) {
  try {
    return JSON.parse(readFileSync(join(racine, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return {};
  }
}

function mdRecursif(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? mdRecursif(p) : e.name.endsWith(".md") ? [p] : [];
  });
}

function cheminRelatif(chemin, racine) {
  try {
    const r = relative(racine, resolve(chemin));
    return r.startsWith("..") ? null : r.replace(/\\/g, "/");
  } catch {
    return null;
  }
}

async function rappel(entree, racine = RACINE) {
  let evenement;
  try {
    evenement = JSON.parse(entree);
  } catch {
    return "";
  }
  if (typeof evenement !== "object" || evenement === null || !OUTILS.has(evenement.tool_name)) return "";
  const chemin = evenement.tool_input?.file_path;
  if (typeof chemin !== "string" || !chemin) return "";
  const relatif = cheminRelatif(chemin, racine);
  if (!relatif) return "";

  const cadrage = await import(`file://${join(racine, ".githooks", "cadrage.mjs")}`);
  const cfg = loadConfig(racine);
  if (cfg.cadrage === "off") return "";
  if (!cadrage.estDuCode(relatif, cfg)) return "";

  const projetsDir = join(racine, cfg.dirs?.projects ?? "docs/projets");
  const fiches = mdRecursif(projetsDir).filter((p) => !MODELE_RE.test(relative(projetsDir, p)));
  const fichesTexte = fiches.map((f) => [relative(racine, f), readFileSync(f, "utf8")]);
  const motifsParFiche = cadrage.motifsDuDepot(fichesTexte);
  if (cadrage.fichesCouvrant(relatif, motifsParFiche).length) return "";

  const suite = cfg.cadrage === "bloquant"
    ? "Rien n'est bloqué ici ; le commit, lui, le sera."
    : "Rien n'est bloqué ici, ni au commit (réglage \"cadrage\" de .drwil/ia-first.json).";
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `Rappel de cadrage : aucune fiche de docs/projets/ ne couvre ${relatif}. Ajouter ce chemin, ou un ` +
        "motif qui le couvre, au bloc « cadrage » de la fiche du chantier en cours (ou à " +
        `docs/projets/entretien-courant.md pour une petite tâche). ${suite}`,
    },
  });
}

/** Point d'entrée du hook : jamais d'erreur, au pire aucun rappel. */
async function main(entree) {
  try {
    return await rappel(entree);
  } catch {
    return "";
  }
}

export { rappel, main };

if (import.meta.url === `file://${process.argv[1]}`) {
  let entree = "";
  process.stdin.on("data", (d) => { entree += d; });
  process.stdin.on("end", async () => {
    const sortie = await main(entree);
    if (sortie) console.log(sortie);
  });
}
