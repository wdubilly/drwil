// Messages of the consumption, French and English (split from consumption.mjs).

export const USAGE = ".drwil/usage.jsonl";

export const TEXTS = {
  fr: {
    columns: ["chantier", "requêtes", "entrée", "sortie", "cache lu", "cache écrit", "cache lu/req", "pondéré", "durée", "modèles"],
    weighted: "pondéré : indicatif, en équivalent tokens d'entrée (sortie ×5, cache lu ×0,1, cache écrit ×1,25).",
    noLogs: (d) =>
      `consommation : aucun journal de session lisible dans ${d} (Claude Code seulement) — non mesuré ; autre outil IA : estimer à la main (docs/recipes/track-consumption-per-increment.md)`,
    noAnswer: (d) => `consommation : aucune réponse d'agent dans ${d} pour cette période ou ce chantier — non mesuré`,
    badDate: "consommation : date de --since illisible (attendu AAAA-MM-JJ)",
    noBrief: "consommation : --record attend le nom de la fiche (docs/projects/<fiche>.md, sans extension)",
    unreadable: (n) => `consommation : ${n} ligne(s) de journal illisible(s), ignorée(s)`,
    already: (b) => `consommation : ${USAGE} a déjà une ligne pour « ${b} » — rien d'ajouté`,
    recorded: (b, t, c) => `consommation : « ${b} » consigné dans ${USAGE} (${t} tokens pondérés, cache lu moyen par requête : ${c})`,
    noBranch: "(sans branche)",
    main: "(branche principale)",
    branch: (b) => `(branche ${b})`,
    recordedColumns: ["chantier", "date", "requêtes", "cache lu", "cache lu/req"],
    noRecorded: `consommation : aucune ligne dans ${USAGE} — rien à comparer`,
  },
  en: {
    columns: ["workstream", "requests", "input", "output", "cache read", "cache write", "cache read/req", "weighted", "time", "models"],
    weighted: "weighted: indicative, in input-token equivalents (output ×5, cache read ×0.1, cache write ×1.25).",
    noLogs: (d) =>
      `consumption: no readable session log in ${d} (Claude Code only) — not measured; another AI tool: estimate by hand (docs/recipes/track-consumption-per-increment.md)`,
    noAnswer: (d) => `consumption: no agent answer in ${d} for this period or workstream — not measured`,
    badDate: "consumption: unreadable --since date (expected YYYY-MM-DD)",
    noBrief: "consumption: --record expects the brief's name (docs/projects/<brief>.md, without extension)",
    unreadable: (n) => `consumption: ${n} unreadable log line(s), ignored`,
    already: (b) => `consumption: ${USAGE} already has a line for "${b}" — nothing added`,
    recorded: (b, t, c) => `consumption: "${b}" recorded in ${USAGE} (${t} weighted tokens, average cache read per request: ${c})`,
    noBranch: "(no branch)",
    main: "(main branch)",
    branch: (b) => `(branch ${b})`,
    recordedColumns: ["workstream", "date", "requests", "cache read", "cache read/req"],
    noRecorded: `consumption: no line in ${USAGE} — nothing to compare`,
  },
};
