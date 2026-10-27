// Texts of the governance context reinjected to the agent, by language (split from state-texts.mjs).

export const TEXTS = {
  fr: {
    header: "[drwil] État de gouvernance, lu sur disque (.drwil/state.json) — ne pas le déduire de la conversation.",
    missing: "(.drwil/state.json absent : état neutre)",
    disabled:
      "[drwil] Gouvernance désactivée (réglage « scopeGate » : off dans .drwil/ia-first.json) : aucune activité ni périmètre à suivre.",
    invalid: "⚠ État invalide, traité comme SCOPING neutre :",
    activity: (a) => `Activité : ${a}`,
    brief: (b) => `Attente active : ${b ?? "aucune attente active"}`,
    request: (r) => `Demande active : ${r ?? "aucune"}`,
    autoMerge:
      "Fusion automatique autorisée au lancement : en CLOSING, après verify PASS et le push de la clôture, dans cet ordre : attendre que GitHub ait calculé la PR (`gh pr view --json mergeStateStatus`) et, si elle est en retard sur la branche principale (BEHIND), la mettre à jour ; programmer `gh pr merge --auto --merge` ; vérifier que la fusion est bien programmée (`gh pr view --json autoMergeRequest`) ; suivre la PR par `node .githooks/pr-watch.mjs <numéro>`, relancé tant qu'il dit « verte » sans « fusionnée », 30 minutes au plus en tout ; la PR fusionnée, seulement ensuite revenir en SCOPING, qui efface l'autorisation — jamais avant : une CI rouge ne pourrait plus rouvrir le chantier. CI rouge avant la fusion : rester en CLOSING et rouvrir le chantier (`node .githooks/state.mjs reopen`, qui annule la fusion programmée). Délai dépassé, ou autre échec : rester en CLOSING et le signaler.",
    queue:
      "File décidée au lancement : ensuite {0}{1}. Avec Claude Code, chaque chantier de la file se mène dans un sous-agent (contexte neuf), un seul à la fois, dans le dossier du dépôt et jamais dans une copie isolée (worktree : l'état n'y est pas) : sa consigne commence par lire l'état (`node .githooks/state.mjs`), il mène le chantier jusqu'au retour en SCOPING sans lancer la suivante et rend un compte rendu ; la session principale ne garde que leurs comptes rendus (autre outil : tout dans la même session). Après la clôture, la session principale suit la PR par `gh` jusqu'à la fusion, 30 minutes au plus, met à jour la branche principale et lance la suivante : `node .githooks/state.mjs next`, dans un nouveau sous-agent ; plus de suivante : un bilan. S'arrêter au premier chantier qui bute (attestation humaine, FAIL non corrigé, CI rouge, délai de fusion dépassé, décision à prendre) en disant pourquoi et ce qui est attendu ; jamais de suivante sur une fusion non faite. Un compte rendu court à chaque clôture, un bilan en fin de file.",
    parallel:
      "File en parallèle décidée au lancement : {0}, chacune lancée dans son worktree par le hook (la session principale n'en crée aucun). Avec Claude Code, chaque chantier se mène dans un sous-agent (contexte neuf) dont le dossier de travail est son worktree (chemin listé ci-dessous, jamais `isolation: \"worktree\"`) : sa consigne commence par lire l'état dans ce dossier (`node <worktree>/.githooks/state.mjs`), il n'en modifie aucun autre, mène le chantier jusqu'à la clôture et rend un compte rendu ; la session principale ne garde que leurs comptes rendus (autre outil : pas de file en parallèle). La session principale suit chaque PR par `gh` jusqu'à la fusion, 30 minutes au plus chacune, sans attendre la fusion d'un autre chantier ; en cas de conflit de clôture sur l'index ou le journal des chantiers, le sous-agent rebase et résout seul. Un chantier qui demande un humain (attestation, FAIL non corrigé, CI rouge, délai de fusion dépassé, décision à prendre) arrête son sous-agent en disant pourquoi et ce qui est attendu ; les autres continuent et la session principale ne lance rien de plus d'elle-même. Un compte rendu court à chaque clôture, un bilan de file en fin : l'état de chaque chantier (worktree, branche, fiche, activité, PR).",
    queueMerge: " (fusion automatique)",
    detour:
      "Détour en cours (QUA-050), ouvert depuis {0} (branche {1}, travail en cours mis de côté par l'outil) : corriger le défaut sous cette fiche courte, sur la branche {2} ; PR intitulée « Détour de {0} : … », au mode de fusion décidé au lancement ; avant le push, entrée de journal citant la branche {2} et fiche supprimée ; une fois la PR fusionnée, `node .githooks/detour.mjs resume`. Jamais de stash ni de changement de branche à la main.",
    reopened:
      "Chantier rouvert après sa clôture (QUA-116), PR #{0} ouverte : corriger le défaut sur cette branche, sans réécrire l'historique ni pousser en force ; un correctif qui change les règles du jeu (contrat existant modifié ou retiré, hook, seuil, barrière, CI) attend le oui de l'humain (`node .githooks/detour.mjs allow`, terminal ; en file, le sous-agent s'arrête) ; puis EVIDENCE, VERIFY et CLOSING comme la première fois : l'entrée de journal du chantier se met à jour (jamais une seconde), `node .githooks/close.mjs` réécrit la preuve et remplace la ligne de consommation.",
    // Un « continue » ambigu a lancé un chantier le 2026-10-17 : une file reprise exige un oui explicite.
    queueResume:
      "Reprise de file : si cette session n'a pas mené la clôture précédente (nouvelle session, après `/clear` ou un redémarrage), demander d'abord à l'humain « la file reprend avec {0} : je lance ? » et ne lancer `node .githooks/state.mjs next` que sur un oui explicite ; sans oui explicite, rien n'est lancé.",
    closingNoQueue:
      "Hors file : terminer en proposant à l'humain `/clear` avant sa prochaine demande (Claude Code ; autre outil : une nouvelle conversation) — un contexte neuf ne relit pas ce chantier.",
    nextSession:
      "Après une clôture, le chantier suivant se lance dans une nouvelle session (Claude Code : `/clear` ; autre outil : une nouvelle conversation) — un contexte neuf ne relit pas le chantier clos ; si cette session vient d'en clore un, le proposer à l'humain avant sa prochaine demande. Une file garde son sous-agent par chantier.",
    scope: "Périmètre autorisé (bloc scope de la fiche) :",
    noScope: "  (aucun bloc scope : aucun fichier de code autorisé)",
    briefDeleted: "fiche supprimée (clôture)",
    rule: (r) => `Règle : ${r}`,
    docLanguage: (l) =>
      `Langue de la carte, du README et du changelog : ${{ fr: "français", en: "anglais" }[l] ?? l} (réglage docLang, à défaut la langue du projet).`,
    reminder: (a, b, n) =>
      `[drwil] Rappel : ${a}${b ? ` · ${b}` : " · aucune attente active"}${n === null ? "" : ` · périmètre : ${n} fichier(s) ou motif(s)`} (relire avec \`node .githooks/state.mjs\`).`,
    invalidReminder: "[drwil] Rappel : état invalide, traité comme SCOPING neutre (détail : `node .githooks/state.mjs`).",
    footer:
      "Ne jamais écrire .drwil/state.json à la main. Lancer un chantier : `/drwil-start` (sondage) ou `node .githooks/state.mjs start` dans un terminal — décision humaine, sauf réglage « transitions » : agent. Changer d'activité : `node .githooks/state.mjs move <ACTIVITE>` ; clore est libre sur évidence de verify valide. Noter une idée sans changer d'activité : `node .githooks/note.mjs '<texte>'` (une note est une intention, jamais un ordre de coder).",
    rules: {
      SCOPING: "lire, analyser, cadrer ; ne modifier aucun fichier de code.",
      EXPECTATION: "formaliser l'attente dans sa fiche ; ne modifier aucun fichier de code.",
      REQUEST: "expliciter la demande de réalisation ; ne modifier encore aucun fichier de code.",
      BUILD:
        "réaliser l'attente, en ne modifiant que les fichiers du périmètre (bloc scope de la fiche active). Un défaut préalable hors du cadrage : un détour, `node .githooks/detour.mjs open <nom> --title <défaut>`, jamais un élargissement sans rapport.",
      EVIDENCE: "produire les preuves et lancer les contrôles ; un correctif demande de revenir en BUILD.",
      VERIFY:
        "lancer `npx drwil verify --evidence` ; seul son verdict compte, pas l'affirmation de l'agent. PASS ou ATTESTED : clore ; FAIL ou ERROR : revenir en BUILD ; MANUAL : attestation humaine (`npx drwil attest`), puis relancer.",
      CLOSING:
        "fiche entièrement terminée : la condenser dans le journal, puis `node .githooks/close.mjs` la supprime, retire sa ligne de l'index, consigne la consommation et signale ce qui ferait échouer la clôture (incohérences de documentation comprises ; `--fix` applique les corrections proposées), avant le commit ; sinon mettre à jour statut et reprise. Boucler les intentions : chaque limite non traitée devient une fiche d'intention (jamais une fiche de chantier), listée dans l'index en [décision] et citée par « Limites connues » du journal ; l'intention d'origine (champ Intention de la fiche) est mise à jour, ou résumée au journal et retirée si elle est entièrement couverte. Tenir ce que lit l'utilisateur : README et ligne « Unreleased » du changelog si le chantier change ce qu'il voit, carte docs/architecture.md s'il change la structure. Consigner la consommation du chantier : `node .githooks/consumption.mjs --record <fiche>` (fait par close.mjs ; journaux de Claude Code ; autre outil : estimer à la main), la ligne entre dans le commit de clôture. Puis revenir en SCOPING. Un défaut révélé par la PR, ouverte et pas encore fusionnée (CI rouge, analyse de la forge) : `node .githooks/state.mjs reopen` rouvre le chantier sur sa branche (fusion automatique annulée d'abord, fiche restaurée, BUILD), jamais un contournement.",
    },
  },
  en: {
    header: "[drwil] Governance state, read from disk (.drwil/state.json) — do not infer it from the conversation.",
    missing: "(.drwil/state.json missing: neutral state)",
    disabled: '[drwil] Governance disabled ("scopeGate" setting: off in .drwil/ia-first.json): no activity or scope to follow.',
    invalid: "⚠ Invalid state, treated as neutral SCOPING:",
    activity: (a) => `Activity: ${a}`,
    brief: (b) => `Active brief: ${b ?? "none"}`,
    request: (r) => `Active request: ${r ?? "none"}`,
    autoMerge:
      "Automatic merge authorised at start: in CLOSING, after verify PASS and pushing the closing commit, in this order: wait until GitHub has computed the PR (`gh pr view --json mergeStateStatus`) and, if it is behind the main branch (BEHIND), update it; schedule `gh pr merge --auto --merge`; check that the merge is actually scheduled (`gh pr view --json autoMergeRequest`); follow the PR with `node .githooks/pr-watch.mjs <number>`, run again while it says « green » without « merged », 30 minutes at most in all; the PR merged, only then go back to SCOPING, which clears the authorisation — never before: a red CI could no longer reopen the workstream. Red CI before the merge: stay in CLOSING and reopen the workstream (`node .githooks/state.mjs reopen`, which cancels the scheduled merge). Time limit exceeded, or any other failure: stay in CLOSING and report it.",
    queue:
      "Queue decided at start: then {0}{1}. With Claude Code, each workstream of the queue runs in a subagent (fresh context), one at a time, in the repository folder and never in an isolated copy (worktree: the state is not there): its instructions start by reading the state (`node .githooks/state.mjs`), it carries the workstream until back in SCOPING without starting the next one and returns a report; the main session keeps only their reports (another tool: everything in the same session). After the closing, the main session follows the PR with `gh` until it is merged, 30 minutes at most, updates the main branch and starts the next one: `node .githooks/state.mjs next`, in a new subagent; no next one: a summary. Stop at the first workstream that gets stuck (human attestation, FAIL not fixed, red CI, merge delay exceeded, decision to make), saying why and what is expected; never a next one on a merge not done. A short report at each closing, a summary at the end of the queue.",
    parallel:
      "Parallel queue decided at start: {0}, each launched in its own worktree by the hook (the main session creates none). With Claude Code, each workstream runs in a subagent (fresh context) whose working folder is its worktree (path listed below, never `isolation: \"worktree\"`): its instructions start by reading the state in that folder (`node <worktree>/.githooks/state.mjs`), it modifies no other folder, carries the workstream to its closing and returns a report; the main session keeps only their reports (another tool: no parallel queue). The main session follows each PR with `gh` until it is merged, 30 minutes at most each, without waiting for another workstream's merge; on a closing conflict on the workstreams' index or journal, the subagent rebases and resolves it alone. A workstream that needs a human (attestation, FAIL not fixed, red CI, merge delay exceeded, decision to make) stops its own subagent, saying why and what is expected; the others go on and the main session starts nothing more by itself. A short report at each closing, a queue summary at the end: the state of each workstream (worktree, branch, brief, activity, PR).",
    queueMerge: " (automatic merge)",
    detour:
      "Detour in progress (QUA-050), opened from {0} (branch {1}, work in progress set aside by the tool): fix the defect under this short brief, on branch {2}; PR titled « Detour of {0}: … », with the merge mode decided at start; before the push, a journal entry citing branch {2} and the brief deleted; once the PR is merged, `node .githooks/detour.mjs resume`. Never stash or switch branches by hand.",
    reopened:
      "Workstream reopened after its closing (QUA-116), PR #{0} open: fix the defect on this branch, without rewriting history or force-pushing; a fix that changes the rules (an existing contract modified or removed, hook, threshold, gate, CI) waits for the human's yes (`node .githooks/detour.mjs allow`, terminal; in a queue, the subagent stops); then EVIDENCE, VERIFY and CLOSING like the first time: the workstream's journal entry is updated (never a second one), `node .githooks/close.mjs` rewrites the proof and replaces the consumption line.",
    queueResume:
      "Resuming a queue: if this session did not carry the previous closing (new session, after `/clear` or a restart), first ask the human « the queue resumes with {0}: shall I start it? » and run `node .githooks/state.mjs next` only on an explicit yes; without an explicit yes, nothing is started.",
    closingNoQueue:
      "Outside a queue: finish by suggesting `/clear` to the human before their next request (Claude Code; another tool: a new conversation) — a fresh context does not read this workstream again.",
    nextSession:
      "After a closing, the next workstream starts in a new session (Claude Code: `/clear`; another tool: a new conversation) — a fresh context does not read the closed workstream again; if this session just closed one, suggest it to the human before their next request. A queue keeps its subagent per workstream.",
    scope: "Allowed scope (scope block of the brief):",
    noScope: "  (no scope block: no code file allowed)",
    briefDeleted: "brief deleted (closing)",
    rule: (r) => `Rule: ${r}`,
    docLanguage: (l) =>
      `Language of the map, README and changelog: ${{ fr: "French", en: "English" }[l] ?? l} (docLang setting, else the project language).`,
    reminder: (a, b, n) =>
      `[drwil] Reminder: ${a}${b ? ` · ${b}` : " · no active brief"}${n === null ? "" : ` · scope: ${n} file(s) or pattern(s)`} (read again with \`node .githooks/state.mjs\`).`,
    invalidReminder: "[drwil] Reminder: invalid state, treated as neutral SCOPING (details: `node .githooks/state.mjs`).",
    footer:
      'Never write .drwil/state.json by hand. Start a workstream: `/drwil-start` (poll) or `node .githooks/state.mjs start` in a terminal — a human decision, unless the "transitions" setting is agent. Change activity: `node .githooks/state.mjs move <ACTIVITY>`; closing is free on valid verify evidence. Note an idea without changing activity: `node .githooks/note.mjs "<text>"` (a note is an intent, never an order to code).',
    rules: {
      SCOPING: "read, analyse, frame; do not modify any code file.",
      EXPECTATION: "write down the expectation in its brief; do not modify any code file.",
      REQUEST: "make the implementation request explicit; do not modify any code file yet.",
      BUILD:
        "implement the expectation, modifying only the files in the scope (scope block of the active brief). A prior defect outside the scope: a detour, `node .githooks/detour.mjs open <name> --title <defect>`, never an unrelated widening.",
      EVIDENCE: "produce evidence and run the checks; a fix means going back to BUILD.",
      VERIFY:
        "run `npx drwil verify --evidence`; only its verdict counts, not the agent's claim. PASS or ATTESTED: close; FAIL or ERROR: go back to BUILD; MANUAL: human attestation (`npx drwil attest`), then run it again.",
      CLOSING:
        "brief fully finished: condense it into the journal, then `node .githooks/close.mjs` deletes it, removes its index line, records the consumption and reports what would make the closing fail (documentation inconsistencies included; `--fix` applies the proposed corrections), before the commit; otherwise update status and hand-off. Close the intent loop: each limit left untreated becomes an intent brief (never a workstream brief), listed in the index as [decision] and cited by the journal's « Known limits »; the original intent (the brief's Intent field) is updated, or summarised in the journal and removed when fully covered. Keep what the user reads current: README and « Unreleased » changelog line if the workstream changes what they see, map docs/architecture.md if it changes the structure. Record the workstream's consumption: `node .githooks/consumption.mjs --record <brief>` (done by close.mjs; Claude Code logs; another tool: estimate by hand), the line goes into the closing commit. Then go back to SCOPING. A defect revealed by the PR, open and not merged yet (red CI, forge analysis): `node .githooks/state.mjs reopen` reopens the workstream on its branch (automatic merge cancelled first, brief restored, BUILD), never a workaround.",
    },
  },
};
