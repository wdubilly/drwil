// Messages of the worktrees, French and English (split from worktree.mjs).
import { config } from "./briefs.mjs";

export const TEXTS = {
  fr: {
    inWorktree:
      "Ce dossier est un worktree du dépôt principal {0} (branche {1}, chantier {2}). Les autres dossiers listés ci-dessous sont des worktrees du même dépôt, non des dépôts distincts : ne modifier que celui-ci.",
    inMain:
      "Ce dossier est le dépôt principal ; les dossiers listés ci-dessous sont des worktrees ouverts du même dépôt, non des dépôts distincts : n'y modifier aucun fichier depuis cette session.",
    entry: "  - {0} — branche {1}, chantier {2}",
    none: "aucun",
    noRepo: "worktree refusé : ce dossier n'est pas un dépôt git lisible ; rien n'est créé",
    manyBriefs: "worktree refusé : un seul chantier à la fois par worktree (la file reste dans le dossier du dépôt) ; rien n'est créé",
    parallelOne: "file en parallèle refusée : au moins deux fiches sont attendues ; rien n'est créé",
    parallelDuplicate: "file en parallèle refusée : la fiche {0} est choisie deux fois ; rien n'est créé",
    parallelNotReady:
      "file en parallèle refusée : {0} ne peut pas entrer dans une file (cadrée, maturité « prêt », aucune décision ouverte, critères d'acceptation) ; rien n'est créé",
    parallelTooMany:
      "file en parallèle refusée : {0} chantier(s) déjà actifs, {1} demandés, au plus {2} à la fois (réglage « maxParallel » de .drwil/ia-first.json) ; rien n'est créé",
    parallelOverlap:
      "file en parallèle refusée : les cadrages de {0} et de {1} se recoupent ({2} et {3}), ils se rencontreraient à la fusion ; rien n'est créé",
    parallelDone: "File en parallèle : {0} chantier(s) lancé(s) sur {1}, chacun dans son worktree, au plus {2} actifs à la fois.",
    parallelStopped: "✗ File en parallèle interrompue à {0} : les suivants ne sont pas lancés, ceux déjà lancés tournent.",
    notScoped: "worktree refusé : {0} n'est pas une fiche cadrée ; rien n'est créé",
    busy: "worktree refusé : la fiche {0} est déjà active dans {1} ; rien n'est créé",
    noMain: "worktree refusé : aucune branche principale locale (main ou master) ; rien n'est créé",
    exists: "worktree refusé : {0} existe déjà ; rien n'est créé",
    branchExists: "worktree refusé : la branche {0} existe déjà ; rien n'est créé",
    stale: "git fetch a échoué : le worktree part de la branche locale {0}, peut-être en retard sur la branche principale distante",
    addFailed: "worktree refusé : git worktree add a échoué ({0}) ; rien n'est créé",
    created: "Worktree créé : {0} (branche {1}, depuis {2}).",
    noInstall:
      "Aucune installation lancée (réglage « worktreeInstall » absent de .drwil/ia-first.json) : installer les dépendances du projet dans ce dossier avant de travailler.",
    installed: "Installation lancée dans le worktree : {0} (réussie).",
    installFailed:
      "✗ Installation en échec dans le worktree : {0} ({1}) ; le worktree et l'état restent, relancer la commande à la main dans ce dossier.",
    startFailed: "✗ Chantier non lancé dans le worktree : {0} ; le worktree reste, l'état du dossier d'origine est inchangé.",
    open: "Ouvrir un terminal dans {0} et y lancer l'agent : le chantier se mène là. Le dossier d'origine reste inchangé : ne pas y travailler cette fiche.",
    late: "branche en retard de {0} commit(s) sur origin/{1} : `git merge origin/{1}` avant de clore (la clôture n'est pas refusée pour ce motif)",
    lateUnknown: "retard sur origin/{0} non mesuré (git fetch a échoué, réseau ?) : rien n'est conclu",
  },
  en: {
    inWorktree:
      "This folder is a worktree of the main repository {0} (branch {1}, workstream {2}). The other folders listed below are worktrees of the same repository, not separate repositories: only modify this one.",
    inMain:
      "This folder is the main repository; the folders listed below are open worktrees of the same repository, not separate repositories: modify none of their files from this session.",
    entry: "  - {0} — branch {1}, workstream {2}",
    none: "none",
    noRepo: "worktree refused: this folder is not a readable git repository; nothing created",
    manyBriefs: "worktree refused: one workstream at a time per worktree (a queue stays in the repository folder); nothing created",
    parallelOne: "parallel queue refused: at least two briefs are expected; nothing created",
    parallelDuplicate: "parallel queue refused: brief {0} is chosen twice; nothing created",
    parallelNotReady:
      'parallel queue refused: {0} cannot enter a queue (scoped, maturity "ready", no open decision, acceptance criteria); nothing created',
    parallelTooMany:
      'parallel queue refused: {0} workstream(s) already active, {1} requested, at most {2} at a time ("maxParallel" setting of .drwil/ia-first.json); nothing created',
    parallelOverlap:
      "parallel queue refused: the scopes of {0} and {1} overlap ({2} and {3}), they would meet at the merge; nothing created",
    parallelDone: "Parallel queue: {0} workstream(s) launched out of {1}, each in its own worktree, at most {2} active at a time.",
    parallelStopped: "✗ Parallel queue interrupted at {0}: the next ones are not launched, those already launched keep running.",
    notScoped: "worktree refused: {0} is not a scoped brief; nothing created",
    busy: "worktree refused: brief {0} is already active in {1}; nothing created",
    noMain: "worktree refused: no local main branch (main or master); nothing created",
    exists: "worktree refused: {0} already exists; nothing created",
    branchExists: "worktree refused: branch {0} already exists; nothing created",
    stale: "git fetch failed: the worktree starts from the local branch {0}, possibly behind the remote main branch",
    addFailed: "worktree refused: git worktree add failed ({0}); nothing created",
    created: "Worktree created: {0} (branch {1}, from {2}).",
    noInstall:
      'No installation run (no "worktreeInstall" setting in .drwil/ia-first.json): install the project dependencies in this folder before working.',
    installed: "Installation run in the worktree: {0} (succeeded).",
    installFailed:
      "✗ Installation failed in the worktree: {0} ({1}); the worktree and the state stay, run the command by hand in that folder.",
    startFailed: "✗ Workstream not started in the worktree: {0}; the worktree stays, the original folder's state is unchanged.",
    open: "Open a terminal in {0} and start the agent there: the workstream runs there. The original folder stays unchanged: do not work this brief in it.",
    late: "branch {0} commit(s) behind origin/{1}: `git merge origin/{1}` before closing (the closing is not refused for this reason)",
    lateUnknown: "lag behind origin/{0} not measured (git fetch failed, network?): nothing concluded",
  },
};

export const label = (value, fallback) => value || fallback;
export const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);
export const texts = (root) => TEXTS[config(root).lang === "en" ? "en" : "fr"];
