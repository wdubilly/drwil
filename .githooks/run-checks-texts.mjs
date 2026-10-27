// Messages of run-checks.mjs, French and English (split from it).

export const TEXTS = {
  fr: {
    project: "contrôles du projet (lint, tests…)",
    noCheck: "aucun déclaré dans .drwil/ia-first.json → checks",
    notRun: "non exécuté :",
    failed: "échec :",
    ok: (n, f) => `contrôles exécutés : OK (${n} avertissement(s), non exécutés compris — détail : ${f})`,
    ko: (k, n, f) => `contrôles exécutés : ${k} en échec, ${n} avertissement(s) — détail : ${f}`,
    leak: (name, n) => `${name} laisse ${n} élément(s) dans son dossier temporaire : le supprimer à la source`,
    keptTmp: (d) => `dossiers temporaires des contrôles en échec gardés pour le diagnostic : ${d}`,
    cleanupFailed: "dossier temporaire de la passe non supprimé (fichier encore ouvert ?)",
    duration: (ms) => `durée : ${ms} ms`,
    reused: (at, src) => `repris (fichiers du contrôle inchangés, ${src} du ${at})`,
    replayed: "rejoué",
    reuseSummary: (r, p) => `${r} repris (fichiers du contrôle inchangés), ${p} rejoué(s)`,
    slowest:
      "contrôles du plus lent au plus rapide (durée de chaque contrôle ; en passe parallèle, elles se recouvrent : ce n'est pas sa part de la passe) :",
    slowestSummary: "les plus lents :",
    tail: (n, f) => `    … ${n} ligne(s) plus haut, dans ${f}`,
    staleAudit: (f, n) => `audit périmé (${f}, vieux de ${n} jours) : à relancer`,
    staleIntent: (f, n) => `intention sans revue depuis ${n} jours (${f}) : la revoir, la mettre à jour (ligne « Revu le ») ou la clore`,
    intentLeft: (b, i) =>
      `la fiche ${b} est supprimée sans que son intention ${i} soit touchée : la mettre à jour, ou la résumer au journal et la retirer si elle est couverte`,
  },
  en: {
    project: "project checks (lint, tests…)",
    noCheck: "none declared in .drwil/ia-first.json → checks",
    notRun: "not run:",
    failed: "failed:",
    ok: (n, f) => `checks run: OK (${n} warning(s), not run included — detail: ${f})`,
    ko: (k, n, f) => `checks run: ${k} failed, ${n} warning(s) — detail: ${f}`,
    leak: (name, n) => `${name} leaves ${n} item(s) in its temporary folder: remove them at the source`,
    keptTmp: (d) => `temporary folders of the failed checks kept for diagnosis: ${d}`,
    cleanupFailed: "the pass's temporary folder was not removed (file still open?)",
    duration: (ms) => `duration: ${ms} ms`,
    reused: (at, src) => `reused (check files unchanged, ${src} of ${at})`,
    replayed: "replayed",
    reuseSummary: (r, p) => `${r} reused (check files unchanged), ${p} replayed`,
    slowest:
      "checks from slowest to fastest (each check's own duration; on a parallel pass they overlap: it is not its share of the pass):",
    slowestSummary: "slowest:",
    tail: (n, f) => `    … ${n} line(s) above, in ${f}`,
    staleAudit: (f, n) => `stale audit (${f}, ${n} days old): time to re-run`,
    staleIntent: (f, n) => `intent not reviewed for ${n} days (${f}): review it, update it ("Reviewed on" line) or close it`,
    intentLeft: (b, i) =>
      `brief ${b} is deleted without touching its intent ${i}: update it, or summarise it in the journal and remove it when covered`,
  },
};
