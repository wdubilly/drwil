#!/usr/bin/env node
// Cadrage côté agent pour Claude Code (Edit, Write, MultiEdit ; docs/ia-first.md
// section 7, docs/projects/kit-mechanics.md), selon .drwil/ia-first.json -> scopeReminder :
// - "blocking" (défaut) : hook PreToolUse, REFUSE l'écriture d'un fichier de code
//   qu'aucune fiche de docs/projects/ ne couvre, avant qu'elle ait lieu : l'agent doit
//   d'abord rattacher le fichier à son chantier (ou à docs/projects/routine-maintenance.md).
//   Une règle qui ne tient que par la mémoire de l'agent n'est pas une garantie ;
//   le commit refuse de toute façon.
// - "warning" : hook PostToolUse, simple rappel après l'écriture.
// - "off" : rien.
// Toute entrée inattendue, voire une exception, donne « rien » (le hook git reste la
// barrière). La grammaire vient de .githooks/scope.mjs, la même que le contrôle au commit.
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Claude Code invoque le hook avec le dossier du projet en cwd.
const RACINE = process.cwd();
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

/** Résout les liens symboliques jusqu'au premier ancêtre existant (le fichier visé par
 * un Write n'existe pas encore), pour comparer deux chemins sur la même base réelle :
 * macOS résout /tmp et /var vers /private/... au premier `cd`, ce que `resolve()` seul
 * ne voit pas. */
function realpathAncetre(chemin) {
  let c = resolve(chemin);
  const reste = [];
  while (!existsSync(c)) {
    reste.unshift(basename(c));
    const parent = dirname(c);
    if (parent === c) return resolve(chemin);
    c = parent;
  }
  return reste.length ? join(realpathSync(c), ...reste) : realpathSync(c);
}

function cheminRelatif(chemin, racine) {
  try {
    const r = relative(realpathAncetre(racine), realpathAncetre(chemin));
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

  const cadrage = await import(pathToFileURL(join(racine, ".githooks", "scope.mjs")).href);
  const cfg = loadConfig(racine);
  if (cfg.scopeReminder === "off") return "";
  if (!cadrage.estDuCode(relatif, cfg)) return "";

  const projetsDir = join(racine, cfg.dirs?.projects ?? "docs/projects");
  const fiches = mdRecursif(projetsDir).filter((p) => !MODELE_RE.test(relative(projetsDir, p)));
  const fichesTexte = fiches.map((f) => [relative(racine, f), readFileSync(f, "utf8")]);
  const motifsParFiche = cadrage.motifsDuDepot(fichesTexte);
  if (cadrage.fichesCouvrant(relatif, motifsParFiche).length) return "";

  const bloquant = (cfg.scopeReminder ?? "blocking") === "blocking";
  // Sans nom d'événement (appel direct, ancienne configuration) : comportement PostToolUse.
  const avant = evenement.hook_event_name === "PreToolUse";
  if (avant && bloquant) {
    return JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          `Écriture refusée (QUA-016, scopeReminder : blocking) : aucune fiche de docs/projects/ ne couvre ${relatif}. ` +
          "Rattacher d'abord ce chemin, ou un motif qui le couvre, au bloc « scope » de la fiche du chantier " +
          "en cours (ou à docs/projects/routine-maintenance.md pour une petite tâche), puis réessayer.",
      },
    });
  }
  if (avant || bloquant) return "";
  const suite = 'Rien n\'est bloqué ici, ni au commit (réglage "scopeReminder" de .drwil/ia-first.json : warning).';
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `Rappel de cadrage : aucune fiche de docs/projects/ ne couvre ${relatif}. Ajouter ce chemin, ou un ` +
        "motif qui le couvre, au bloc « scope » de la fiche du chantier en cours (ou à " +
        `docs/projects/routine-maintenance.md pour une petite tâche). ${suite}`,
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let entree = "";
  process.stdin.on("data", (d) => {
    entree += d;
  });
  process.stdin.on("end", async () => {
    const sortie = await main(entree);
    if (sortie) console.log(sortie);
  });
}
