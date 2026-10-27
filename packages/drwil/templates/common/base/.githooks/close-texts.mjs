// Messages of the closing, French and English (split from close.mjs).
import { config } from "./briefs.mjs";

export const TEXTS = {
  fr: {
    usage: "usage : node .githooks/close.mjs [--check] [--fix] [<chemin de la fiche>] [--logs <dossier>]",
    noBrief: "clôture : aucune fiche active ni fiche donnée",
    notClosing: (a) =>
      `clôture refusée : activité ${a} — la mécanique de clôture se fait en CLOSING (\`--check\` signale sans rien écrire)`,
    path: (steps) => `Chemin jusqu'à CLOSING, dans l'ordre :\n${steps.map((s) => `  ${s}`).join("\n")}`,
    rerun: "`npx drwil verify --evidence` (l'évidence ne date pas de HEAD : la renouveler une fois le travail commité)",
    deleted: (b) => `fiche supprimée : ${b}`,
    indexLine: (f) => `ligne d'index retirée : ${f}`,
    noIndexLine: (f, b) =>
      `aucune ligne d'index à retirer pour ${b} dans ${f} (ligne absente, ou commune à plusieurs fiches : à retirer à la main)`,
    toCreate: (c, b, id) => `critère « ${c} » encore « contrat à créer » : écrire, entre backticks à la fin de ce critère (${b}), ${id}`,
    candidates: (ids) => (ids.length ? `l'ID du contrat créé (${ids.join(" ou ")})` : "l'ID du contrat, une fois créé dans le registre"),
    dead: (place, b) => `${place} cite ${b}, qui sera supprimée : citer le contrat ou le journal à la place`,
    bare: (place, n) => `${place} : \`${n}\` sans chemin, refusé par check-docs — écrire son chemin depuis la racine`,
    signals: "Avant le commit, ce qui ferait échouer la clôture :",
    byHand: "à corriger à la main (la case dépend de plusieurs fiches, ou la ligne n'a pas de marqueur)",
    clean: "Rien ne ferait échouer la clôture.",
    proposed: "Corrections proposées, rien n'est écrit (`node .githooks/close.mjs --fix` les applique) :",
    applied: (n) => `corrections appliquées : ${n}`,
    warnings: "Avertissements (non bloquants) :",
    rest: "Reste à l'agent : l'entrée du journal (décisions, limites en intentions), puis le commit de clôture.",
    twice: (j, f, n) =>
      `${j} : ${n} entrées citent \`${f}\` — un chantier rouvert met à jour son entrée de journal, il n'en ajoute pas une seconde`,
  },
  en: {
    usage: "usage: node .githooks/close.mjs [--check] [--fix] [<brief path>] [--logs <folder>]",
    noBrief: "closing: no active brief and no brief given",
    notClosing: (a) => `closing refused: activity ${a} — the closing mechanics run in CLOSING (\`--check\` reports without writing)`,
    path: (steps) => `Path to CLOSING, in order:\n${steps.map((s) => `  ${s}`).join("\n")}`,
    rerun: "`npx drwil verify --evidence` (the evidence is not from HEAD: renew it once the work is committed)",
    deleted: (b) => `brief deleted: ${b}`,
    indexLine: (f) => `index line removed: ${f}`,
    noIndexLine: (f, b) => `no index line to remove for ${b} in ${f} (line missing, or shared by several briefs: remove it by hand)`,
    toCreate: (c, b, id) =>
      `criterion « ${c} » still « contract to create »: write, in backticks at the end of this criterion (${b}), ${id}`,
    candidates: (ids) =>
      ids.length ? `the ID of the contract created (${ids.join(" or ")})` : "the contract's ID, once created in the registry",
    dead: (place, b) => `${place} cites ${b}, which will be deleted: cite the contract or the journal instead`,
    bare: (place, n) => `${place}: \`${n}\` without a path, refused by check-docs — write its path from the root`,
    signals: "Before the commit, what would make the closing fail:",
    byHand: "to fix by hand (the box depends on several briefs, or the line has no marker)",
    clean: "Nothing would make the closing fail.",
    proposed: "Proposed corrections, nothing is written (`node .githooks/close.mjs --fix` applies them):",
    applied: (n) => `corrections applied: ${n}`,
    warnings: "Warnings (non-blocking):",
    rest: "Left to the agent: the journal entry (decisions, limits as intents), then the closing commit.",
    twice: (j, f, n) => `${j}: ${n} entries cite \`${f}\` — a reopened workstream updates its journal entry, it never adds a second one`,
  },
};

export const texts = (root) => TEXTS[config(root).lang === "en" ? "en" : "fr"];
