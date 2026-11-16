// Messages of the scope gate, French and English (split from scope-gate.mjs).

export const TRAILER = "Drwil-Brief";

// The four cases of a derived file (scope-derived.mjs), and the mark of a rules file never admitted.
const CASES = {
  fr: ["", "test qui cite", "cité par le contrat", "découpe de", "source de gabarit de la copie"],
  en: ["", "test citing", "cited by contract", "split of", "template source of the copy"],
};
const RULES = { fr: " — fichier de règles, jamais admis d'office", en: " — a rules file, never admitted as derived" };

export const TEXTS = {
  fr: {
    activity: (a, n) =>
      `${n} fichier(s) hors fiches commité(s) en ${a} : seule l'activité BUILD l'autorise (node .githooks/state.mjs move …) ; une mise à jour du kit se commite par « npx drwil init », qui coupe sa branche`,
    outsideScope: (f, brief, rules) =>
      `${f} : hors du cadrage de ${brief} (dans HEAD)${rules ? RULES.fr : ""} — l'ajouter au bloc scope et commiter la fiche d'abord`,
    noTrailer: (c, n) => `${c} : ${n} fichier(s) hors fiches sans trailer ${TRAILER}`,
    outsideScopeCommit: (c, f, brief, rules) => `${c} : ${f} hors du cadrage de ${brief} (dans le parent)${rules ? RULES.fr : ""}`,
    admitted: (f, d, brief) =>
      `ADMIS D'OFFICE — ${f} : ${CASES.fr[d.kind]} ${d.from} (cas ${d.kind}), dérivé du cadrage de ${brief} sans l'élargir — à citer dans le compte rendu`,
    widened: (brief, added, removed) =>
      `ATTENTION — le cadrage de ${brief} change${added.length ? ` ; chemins ajoutés : ${added.join(", ")}` : ""}${removed.length ? ` ; chemins retirés : ${removed.join(", ")}` : ""} — à citer, avec la raison, dans le compte rendu de fin de tâche (QUA-214)`,
    noReference: "aucune branche de référence (origin/HEAD, master, main, ou DRWIL_BASE)",
    failed: (n) => `périmètre de l'attente : ${n} problème(s) (barrière bloquante)`,
    rules: (f) =>
      `${f} : un détour qui change les règles du jeu (contrat existant modifié ou retiré, hook, seuil, barrière, CI) demande le oui de l'humain — \`node .githooks/detour.mjs allow\` dans un terminal ; en file, le sous-agent s'arrête et le signale`,
    reopenRules: (f) =>
      `${f} : un correctif de réouverture qui change les règles du jeu (contrat existant modifié ou retiré, hook, seuil, barrière, CI) demande le oui de l'humain — \`node .githooks/detour.mjs allow\` dans un terminal ; en file, le sous-agent s'arrête et le signale`,
    weakenedTest: (f, names, detour) =>
      `${f} : ${names.join(", ")} — test de contrat retiré ou affaibli (moins d'assert) : un ${detour ? "détour" : "correctif de réouverture"} qui l'affaiblit demande le oui de l'humain — \`node .githooks/detour.mjs allow\` dans un terminal ; en file, le sous-agent s'arrête et le signale`,
  },
  en: {
    activity: (a, n) =>
      `${n} file(s) outside briefs committed in ${a}: only the BUILD activity allows it (node .githooks/state.mjs move …); a kit update is committed by "npx drwil init", which cuts its own branch`,
    outsideScope: (f, brief, rules) =>
      `${f}: outside the scope of ${brief} (in HEAD)${rules ? RULES.en : ""} — add it to the scope block and commit the brief first`,
    noTrailer: (c, n) => `${c}: ${n} file(s) outside briefs without a ${TRAILER} trailer`,
    outsideScopeCommit: (c, f, brief, rules) => `${c}: ${f} outside the scope of ${brief} (in the parent)${rules ? RULES.en : ""}`,
    admitted: (f, d, brief) =>
      `ADMITTED AS DERIVED — ${f}: ${CASES.en[d.kind]} ${d.from} (case ${d.kind}), derived from the scope of ${brief} without widening it — to be quoted in the report`,
    widened: (brief, added, removed) =>
      `WARNING — the scope of ${brief} changes${added.length ? `; paths added: ${added.join(", ")}` : ""}${removed.length ? `; paths removed: ${removed.join(", ")}` : ""} — to be quoted, with the reason, in the end-of-task report (QUA-214)`,
    noReference: "no reference branch (origin/HEAD, master, main, or DRWIL_BASE)",
    failed: (n) => `brief scope: ${n} problem(s) (blocking gate)`,
    rules: (f) =>
      `${f}: a detour that changes the rules (an existing contract modified or removed, hook, threshold, gate, CI) needs the human's yes — \`node .githooks/detour.mjs allow\` in a terminal; in a queue, the subagent stops and reports it`,
    reopenRules: (f) =>
      `${f}: a reopening fix that changes the rules (an existing contract modified or removed, hook, threshold, gate, CI) needs the human's yes — \`node .githooks/detour.mjs allow\` in a terminal; in a queue, the subagent stops and reports it`,
    weakenedTest: (f, names, detour) =>
      `${f}: ${names.join(", ")} — contract test removed or weakened (fewer asserts): a ${detour ? "detour" : "reopening fix"} that weakens it needs the human's yes — \`node .githooks/detour.mjs allow\` in a terminal; in a queue, the subagent stops and reports it`,
  },
};

export const texts = (cfg) => TEXTS[cfg?.lang === "en" ? "en" : "fr"];
