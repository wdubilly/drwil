// Messages of the scope gate, French and English (split from scope-gate.mjs).

export const TRAILER = "Drwil-Brief";

export const TEXTS = {
  fr: {
    activity: (a, n) =>
      `${n} fichier(s) hors fiches commité(s) en ${a} : seule l'activité BUILD l'autorise (node .githooks/state.mjs move …)`,
    outsideScope: (f, brief) => `${f} : hors du cadrage de ${brief} (dans HEAD) — l'ajouter au bloc scope et commiter la fiche d'abord`,
    noTrailer: (c, n) => `${c} : ${n} fichier(s) hors fiches sans trailer ${TRAILER}`,
    outsideScopeCommit: (c, f, brief) => `${c} : ${f} hors du cadrage de ${brief} (dans le parent)`,
    noReference: "aucune branche de référence (origin/HEAD, master, main, ou DRWIL_BASE)",
    failed: (n) => `périmètre de l'attente : ${n} problème(s) (barrière bloquante)`,
    rules: (f) =>
      `${f} : un détour qui change les règles du jeu (contrat existant modifié ou retiré, hook, seuil, barrière, CI) demande le oui de l'humain — \`node .githooks/detour.mjs allow\` dans un terminal ; en file, le sous-agent s'arrête et le signale`,
    reopenRules: (f) =>
      `${f} : un correctif de réouverture qui change les règles du jeu (contrat existant modifié ou retiré, hook, seuil, barrière, CI) demande le oui de l'humain — \`node .githooks/detour.mjs allow\` dans un terminal ; en file, le sous-agent s'arrête et le signale`,
  },
  en: {
    activity: (a, n) =>
      `${n} file(s) outside briefs committed in ${a}: only the BUILD activity allows it (node .githooks/state.mjs move …)`,
    outsideScope: (f, brief) => `${f}: outside the scope of ${brief} (in HEAD) — add it to the scope block and commit the brief first`,
    noTrailer: (c, n) => `${c}: ${n} file(s) outside briefs without a ${TRAILER} trailer`,
    outsideScopeCommit: (c, f, brief) => `${c}: ${f} outside the scope of ${brief} (in the parent)`,
    noReference: "no reference branch (origin/HEAD, master, main, or DRWIL_BASE)",
    failed: (n) => `brief scope: ${n} problem(s) (blocking gate)`,
    rules: (f) =>
      `${f}: a detour that changes the rules (an existing contract modified or removed, hook, threshold, gate, CI) needs the human's yes — \`node .githooks/detour.mjs allow\` in a terminal; in a queue, the subagent stops and reports it`,
    reopenRules: (f) =>
      `${f}: a reopening fix that changes the rules (an existing contract modified or removed, hook, threshold, gate, CI) needs the human's yes — \`node .githooks/detour.mjs allow\` in a terminal; in a queue, the subagent stops and reports it`,
  },
};

export const texts = (cfg) => TEXTS[cfg?.lang === "en" ? "en" : "fr"];
