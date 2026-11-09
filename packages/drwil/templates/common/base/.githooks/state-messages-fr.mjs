// Messages of the transitions and of the state validation, in French (QUA-040: the project language).
const RERUN = "relancer `npx drwil verify --evidence`";

export const MESSAGES_FR = {
  or: " ou ",
  notObject: "state.json doit contenir un objet JSON",
  unknownField: `champ inconnu « {0} » (l'état ne contient que des références)`,
  version: "version : 1 attendu",
  unknownActivity: `activité inconnue « {0} » (attendu : {1})`,
  scopingEmpty: "en SCOPING, aucune attente ni demande active",
  briefRequired: `{0} : attente active requise`,
  request: "active_request : chaîne ou null attendu",
  autoMergeType: "auto_merge : booléen attendu",
  autoMergeScoping: "auto_merge : jamais en SCOPING (aucun chantier en cours)",
  queueType: "queue : liste de fiches attendue",
  queueMergeType: "queue_merge : booléen attendu",
  parallelType: "parallel : liste de fiches attendue",
  detourType: "detour : objet { origin_brief, origin_branch, branch, stash, human? } attendu",
  detourActivity: "detour : seulement en BUILD",
  detourMove: "détour en cours : le reprendre d'abord (`node .githooks/detour.mjs resume`), ou l'abandonner en SCOPING",
  reopenedType: "reopened : objet { pr, human? } attendu (pr : numéro de la PR)",
  reopenedActivity: "reopened : seulement de BUILD à CLOSING",
  reopenFrom:
    "réouverture refusée : activité {0} — on rouvre depuis CLOSING un chantier clos dont la PR, ouverte, révèle un défaut ; rien n'a changé",
  reopenDirty: "réouverture refusée : arbre modifié — commiter ou retirer d'abord ; rien n'a changé",
  reopenBranch:
    "réouverture refusée : il faut être sur la branche du chantier (ni la branche principale, ni un HEAD détaché) ; rien n'a changé",
  reopenUnknown:
    "réouverture refusée : l'état de la PR de {0} est inconnu (gh absent, non connecté, ou aucune PR) — un état non établi ne rouvre rien ; rien n'a changé",
  reopenNotOpen:
    "réouverture refusée : la PR #{0} est {1}, pas ouverte — un défaut après la fusion relève d'un nouveau chantier ou de l'entretien courant ; rien n'a changé",
  reopenNoBrief: "réouverture refusée : aucun commit de {1} ne supprime {0} — rien à restaurer ; rien n'a changé",
  reopenAutoMerge:
    "réouverture refusée : la fusion automatique de la PR #{0} n'a pas pu être annulée (`gh pr merge {0} --disable-auto`) — la branche ne reçoit rien tant qu'elle est programmée ; rien d'autre n'a changé",
  reopenCancelledHuman:
    "fusion automatique annulée et NON reprogrammée : l'outil ne la reprogramme jamais seul (au risque de fusionner le code fautif) — il revient à l'humain de la reprogrammer, quand il a décidé ; le rappel d'état le redit en CLOSING",
  mergeCancelledType: "merge_cancelled : objet { pr } attendu (pr : numéro de la PR)",
  mergeCancelledActivity: "merge_cancelled : seulement en CLOSING",
  mergeCancelledCleared:
    "[merge-auto] marque « fusion annulée » de la PR #{0} effacée : la fusion est vue programmée, le rappel d'état ne dit plus qu'elle ne l'est pas",
  mergeAutoMerged:
    "[merge-auto] PR #{0} fusionnée par la commande elle-même (toute sa CI était déjà verte). Suivre la CI de la branche principale : node .githooks/pr-watch.mjs {0}",
  scopingMergeType: "scoping_merge : objet { branch } attendu (branch : la branche de la PR de cadrage)",
  scopingMergeActivity: "scoping_merge : seulement en SCOPING",
  scopingMergeReminder:
    "Fusion automatique de la PR de cadrage autorisée pour la branche {0} (réponse « Automatic merge » du sondage de fin de cadrage) : la branche poussée et sa PR ouverte, lancer `node .githooks/merge-auto.mjs <numéro>`, qui refuse toute PR d'une autre branche ; suivre la PR par `node .githooks/pr-watch.mjs <numéro>`, relancé tant qu'il dit « verte » sans « fusionnée », 30 minutes au plus en tout ; ne jamais enchaîner les commandes `gh` à la main. L'autorisation tombe en quittant SCOPING ; une réponse « Manual merge » ou « Continue scoping » la retire.",
  scopingMergeNotScoping:
    "réponse au sondage de fin de cadrage ignorée : l'activité est {0}, pas SCOPING — rien n'est autorisé, l'état est inchangé",
  scopingMergeBranch:
    "fusion automatique de la PR de cadrage non autorisée : la branche courante n'est pas une branche de cadrage (branche principale ou tête détachée) — rien n'est autorisé, l'état est inchangé",
  scopingMergeAuthorised:
    "fusion automatique de la PR de cadrage autorisée pour la branche {0} (réponse « Automatic merge ») : la branche poussée et sa PR ouverte, lancer `node .githooks/merge-auto.mjs <numéro>`, puis suivre la PR par `node .githooks/pr-watch.mjs <numéro>` ; l'autorisation ne vaut que pour cette branche, en SCOPING",
  scopingMergeManual:
    "rien n'est programmé (réponse « Manual merge ») : la fusion de la PR de cadrage reste un geste humain ; la fiche ne sera proposée par `/drwil-start` qu'une fois la PR fusionnée",
  scopingMergeContinue:
    "rien n'est programmé (réponse « Continue scoping ») : la PR reste ouverte et les cadrages suivants se commitent sur la même branche ({0}), une branche, une PR ; le sondage se repose à la fin du cadrage suivant",
  reopenCancelled: "fusion automatique annulée : à reprogrammer après la nouvelle clôture, comme la première fois",
  reopenMessage: "Réouverture de {0} : défaut révélé par la PR #{1}",
  reopenCommitFailed: "réouverture refusée : le commit de la fiche restaurée a échoué ({0}) — fiche retirée, état inchangé",
  reopenRestored: "fiche {0} restaurée telle qu'avant la clôture, dans son propre commit ({1}) ; son cadrage s'élargit à part",
  reopenRestoredCited: "{0} fichier(s) cité(s) par la fiche, supprimé(s) par la branche, restauré(s) dans ce même commit ({2}) : {1}",
  reopened: "CLOSING → BUILD (réouverture de {0}, PR #{1} ouverte)",
  queueNotReady:
    "lancement refusé : « {0} » ne peut pas entrer dans une file — il faut une fiche prête (maturité « prêt », aucune [décision] ouverte, critères d'acceptation)",
  queued: "file : ensuite {0}, lancés un à un par l'agent après chaque clôture et fusion (arrêt : `node .githooks/state.mjs queue stop`)",
  noQueue: "aucune file en cours",
  queueStopped: "file arrêtée : {0} ne seront pas lancés ; le chantier en cours continue",
  draftStopped: "file en construction abandonnée : {0} ne seront pas lancés",
  draftNotScoping: "file refusée : elle se construit en SCOPING, sans file en attente (état : {0})",
  draftHasQueue: "file refusée : une file attend déjà ({0}) ; `node .githooks/state.mjs queue stop` l'abandonne",
  draftDuplicate: "file : « {0} » y est déjà ; rien n'est ajouté",
  draftAdded:
    "file en construction : {0} ajoutée, soit {1}. Rien n'est lancé : l'humain ajoute une autre fiche par un nouveau sondage `drwil-file`, ou répond « Terminer la file » (abandon : `node .githooks/state.mjs queue stop`)",
  draftEmpty: "file vide : aucune fiche ajoutée, rien n'est lancé",
  queueDraftType: "queue_draft : liste de fiches attendue",
  queueDraftActivity: "queue_draft : seulement en SCOPING",
  since: "since : horodatage ISO 8601 ou null attendu",
  briefType: "active_brief : chemin de fiche ou null attendu",
  briefPlace: `active_brief : fiche .md de {1} attendue (« {0} »)`,
  briefModel: `active_brief : « {0} » est un modèle, pas une fiche de chantier`,
  briefMissing: `active_brief : fiche « {0} » introuvable`,
  unreadable: "state.json illisible (JSON invalide)",
  noEvidence: "aucune évidence de verify : lancer `npx drwil verify --evidence`",
  evidenceUnreadable: `évidence {0} illisible : ${RERUN}`,
  noHead: "commit HEAD introuvable : la clôture se juge sur un travail commité",
  otherCommit: `évidence {0} produite sur un autre commit que HEAD : ${RERUN}`,
  dirty: `arbre modifié (au moment de verify ou depuis) : commiter puis ${RERUN}`,
  manual: `verdict MANUAL : un humain atteste, d'abord par le sondage dans le chat (l'agent le prépare : \`npx drwil attest-poll <ID> --tried "<essai>"\`, recette docs/recipes/attest-a-contract.md), sinon dans son terminal (\`npx drwil attest <ID>\`), puis ${RERUN}`,
  failed: `verdict {0} : revenir en BUILD (\`node .githooks/state.mjs move BUILD\`) pour corriger`,
  criteria: `critère(s) d'acceptation non prouvé(s) : {0} — lier chacun à un contrat avec contrôle (ou un contrat Manuel attesté), puis ${RERUN}`,
  noVerdict: `évidence {0} sans verdict reconnu : ${RERUN}`,
  undeclared: `contrat(s) modifié(s) sans déclaration : {0} — régression, ou évolution à déclarer dans la section « Contrats modifiés » de la fiche (validée par le demandeur), puis ${RERUN}`,
  noCriteria:
    "avertissement : la fiche « {0} » n'a aucun critère d'acceptation — ce chantier ne laisse aucun test de non-régression aux suivants (section « Critères d'acceptation » du modèle de fiche)",
  startFrom: `lancement refusé : activité {0} (lancer se fait depuis SCOPING, EXPECTATION ou REQUEST, ou CLOSING une fois la PR de clôture fusionnée)`,
  startClosingBrief: "lancement refusé : CLOSING et la fiche {0} est encore là — la clôturer d'abord (recette « Clôturer »)",
  startClosingOpen:
    "lancement refusé : CLOSING, la PR de clôture n'est pas fusionnée — attendre la fusion (et mettre la branche principale à jour), puis relancer",
  startClosingUnknown: "lancement refusé : CLOSING, la fusion de la PR de clôture n'est pas établie",
  settled: "CLOSING → SCOPING : la PR du chantier est fusionnée",
  settleOpen: "CLOSING : la PR du chantier n'est pas fusionnée — l'état reste CLOSING (retour en SCOPING à la fusion constatée)",
  settleUnknown: "CLOSING : la fusion de la PR du chantier n'est pas établie — l'état reste CLOSING",
  nextOpen:
    "next refusé : la PR du chantier précédent n'est pas fusionnée — attendre la fusion (et mettre la branche principale à jour), puis relancer",
  nextUnknown: "next refusé : la fusion de la PR du chantier précédent n'est pas établie",
  nextNoProof:
    "next refusé : aucune preuve que la CI de la branche principale est verte sur sa dernière fusion ({0}) — lancer `node .githooks/pr-watch.mjs <numéro de la PR fusionnée>`, qui la suit sur le commit de fusion et écrit la preuve si elle est verte sans issue « CI broken on the main branch » ouverte ; rouge, encore en cours ou issue ouverte : s'arrêter et le dire",
  nextOtherMerge:
    "next refusé : la CI de la branche principale suivie par pr-watch porte sur le commit {0} (PR #{1}), la branche principale à jour est à {2} — lancer `node .githooks/pr-watch.mjs <n>` sur la PR fusionnée en dernier, puis relancer",
  nextRed:
    "next refusé : la CI de la branche principale est ROUGE sur sa dernière fusion ({0}, PR #{1}) — s'arrêter et le dire ; la correction est un nouveau chantier, jamais un contournement",
  nextPending:
    "next refusé : la CI de la branche principale était encore en cours sur sa dernière fusion ({0}) — relancer `node .githooks/pr-watch.mjs {1}`, puis relancer next",
  nextIssue:
    "next refusé : l'issue #{0} « CI broken on the main branch » est ouverte — la branche principale est signalée cassée ; s'arrêter et le dire, la suivante attend sa correction et la fermeture de l'issue",
  nextNoMain:
    "next refusé : branche principale introuvable (ni main ni master) — la preuve de CI verte ne peut être rapprochée de sa dernière fusion",
  nextOffGithub:
    "file : la forge d'origin n'est pas GitHub — pas de preuve possible de la CI de la branche principale sur cette forge, la vérifier à la main sur sa dernière fusion (QUA-251)",
  startHuman: "lancement refusé : c'est une décision humaine (sondage `/drwil-start`, ou terminal interactif)",
  startBusy: "lancement refusé : la fiche {0} est déjà active dans le worktree {1}",
  startNotScoped: `lancement refusé : « {0} » n'est pas une fiche cadrée (bloc scope commité, fiche non terminée)`,
  startNoCriteria:
    "lancement refusé : la fiche « {0} » n'a aucun critère d'acceptation — chacun, prouvé par un contrat, devient la non-régression des chantiers suivants (section « Critères d'acceptation » du modèle de fiche)",
  closingNoCriteria:
    "clôture refusée : la fiche « {0} » n'a aucun critère d'acceptation — en écrire, chacun prouvé par un contrat, puis relancer `drwil verify`",
  startInvalid: `lancement refusé : {0}`,
  started: `{0} → BUILD (lancé : {1}){2}`,
  mergeAuthorised: " — fusion automatique autorisée",
  forbidden: `transition {0} → {1} interdite (depuis {0} : {2})`,
  briefOption: "--brief ne sert qu'à ouvrir une attente (SCOPING → EXPECTATION)",
  briefNeeded: "ouvrir une attente exige --brief <docs/projects/….md>",
  resumed: `état précédent invalide, repris depuis le neutre ({0}) ; `,
  closingRefused: `clôture refusée : {0}`,
  closingSignals: "Ce qui ferait échouer la clôture, à corriger tant que le code peut changer (`node .githooks/state.mjs move BUILD`) :",
  stillThere: `retour en SCOPING refusé : {0} se dit terminée mais est encore là — la condenser dans docs/projects/journal.md, la supprimer et retirer sa ligne de l'index (recette « Clôturer »)`,
  humanDecision: `{0} → {1} est une décision humaine : terminal interactif requis (réglage « transitions » : human)`,
  confirm: `Pour passer de {0} à {1}, retapez l'activité visée ({1}) : `,
  confirmRefused: "confirmation refusée : état inchangé",
  noBriefs: "(aucune fiche cadrée : bloc scope commité et fiche non terminée)",
  notReady: ` · non prête : {0} décision(s) à trancher`,
  refine: " · à affiner : à revoir avant de la lancer",
  pick: "Numéro de la fiche à lancer : ",
  confirmStart: `Lancer {0} ? Retapez START : `,
  askWorktree: "Dans un nouveau worktree frère ? Retapez WORKTREE, sinon Entrée (ce dossier) : ",
  askMerge: "Fusion automatique à la fin du chantier ? Retapez MERGE, sinon Entrée : ",
  notConfirmed: "✗ lancement non confirmé : état inchangé",
  unreadableState: `[drwil] état de gouvernance illisible : {0}`,
  lotNone:
    "aucun enchaînement de lots : la fiche active n'a pas au moins deux lots dont un [IA] (section « Increments », puces « **Lot N — titre** [IA|humain] »)",
  lotActivity: "lot suivant refusé : activité {0} — les lots s'enchaînent en BUILD",
  lotDirty:
    "lot suivant refusé : le lot {0} n'est pas commité (arbre modifié, ou état de git inconnu) — commiter d'abord ; rien n'a changé",
  lotLast: "lot suivant refusé : le lot {0} est le dernier lot [IA] et il est déjà fait — clore la fiche",
  lotAdvanced: "lot {0} fait → lot courant : {1}{2}",
  lotLastDone: "lot {0} fait : c'est le dernier lot [IA], la clôture est possible{1}",
  lotHumansLeft: " ; lot(s) [humain] à faire, sautés : {0}",
  lotRemaining:
    "clôture refusée : lot(s) [IA] pas faits : {0} — les enchaîner un par un, `node .githooks/state.mjs lot next` après le commit de chacun (le dernier aussi)",
  lotCurrent: "Lot courant : {0}",
  lotDone: "Lots [IA] faits : {0}",
  lotLeft: "Lots [IA] restants : {0}",
  lotHumans: "Lots [humain] à faire (sautés par l'enchaînement, rappelés à la clôture) : {0}",
  lotNothing: "aucun",
  branchUnmerged:
    "lancement refusé : la branche courante {0} n'est pas fusionnée dans {1} ; la fusionner, ou revenir sur {1} (`git switch {1}`), puis relancer ; rien n'est créé",
  branchUnknown:
    "lancement refusé : la fusion de la branche courante {0} n'est pas établie ({1}) ; revenir sur {2} (`git switch {2}`) ou rendre gh joignable, puis relancer ; rien n'est créé",
  branchDirty:
    "lancement refusé : l'arbre de travail a des modifications non commitées ; les commiter ou les remiser (`git stash -u`), puis relancer ; rien n'est créé",
  branchTaken:
    "lancement refusé : la branche {0} existe déjà ; s'y placer (`git switch {0}`) pour reprendre le chantier, ou la supprimer si elle est périmée, puis relancer ; rien n'est créé",
  branchFailed: "lancement refusé : git switch a échoué ({0}) ; rien n'est créé",
  branchCreated: "Branche créée : {0} (depuis {1}).{2}",
  branchStale: "\ngit fetch a échoué : la branche part de la branche locale {0}, peut-être en retard sur la branche principale distante",
  usage: `usage : node .githooks/state.mjs move <{0}> [--brief <docs/projects/….md>] [--request <texte>] | start [<fiche>] | lot [next] | reopen | briefs [--json] | reminder`,
  resumeBranch:
    "reprise refusée : la branche « {0} » n'est pas celle d'un chantier (workstream/<fiche>) ; s'y placer d'abord (`git switch workstream/<fiche>`)",
  resumeBusy: "reprise refusée : l'état local est déjà actif sur {0}, pas sur {1} ; finir ou abandonner ce chantier d'abord",
  resumeAlready: "rien à reprendre : l'état local est déjà en {1} sur {0}",
  resumeNoMain:
    "reprise refusée : branche principale introuvable (ni main ou master locale, ni origin/main ou origin/master) ; `git fetch origin` puis relancer",
  resumeNoBrief:
    "reprise refusée : {0} est absente et aucun commit de la branche ne l'a supprimée (clôture) : l'historique ne prouve aucun chantier",
  resumeUnknown:
    "reprise refusée : gh n'a pas dit si la PR de {0} est fusionnée (absent, non authentifié ou hors ligne) ; non prouvé, rien n'est écrit",
  resumeMerged: "reprise refusée : la PR de {0} est fusionnée, le chantier est terminé ; revenir sur la branche principale",
  resumeDone:
    "état repris en {0} sur {1}, d'après l'historique de {2}{3}. Décisions humaines non reconstruites, à redemander s'il y a lieu : fusion automatique, file de chantiers, réouverture.{4}",
  resumeLot: " ; lot courant : {0} (dernier trailer Drwil-Lot de la branche)",
  resumeBuildNext: " La preuve de verify est locale : la rejouer (`npx drwil verify --evidence`) avant la clôture.",
  resumeClosingNext: " La clôture est commitée : pousser la branche, puis suivre sa PR.",
  limitsType: "limits : liste de { intent, choice } (choice : now ou note), un chemin une fois, de BUILD à CLOSING",
  limitsNotActive: "réponse au sondage des limites ignorée : l'activité est {0}, hors de BUILD à CLOSING ; état inchangé",
  limitsRecorded:
    "réponses de l'humain au sondage des limites enregistrées : {0}. « Traiter maintenant » : la traiter dans ce chantier (élargir le bloc scope dans un commit séparé : cette réponse en est le oui, puce « Contrats modifiés » comprise) ; « Noter en intention » : écrire cette fiche d'intention, jamais une fiche de chantier",
  limitsRule:
    "Limites : une limite dans le cadre (bloc scope, contrats déclarés) se traite sur le champ, jamais notée ; une limite hors cadre est soumise à l'humain, une fois, à la fin de BUILD et avant VERIFY, par un sondage `drwil-limite` lu par le hook : une question par limite (4 au plus par sondage), qui nomme la limite, les fichiers qu'elle toucherait, la puce « Contrats modifiés » éventuelle et le chemin `docs/intentions/<nom>.md` qu'elle deviendrait ; deux réponses, « Traiter maintenant » et « Noter en intention », aucune recommandée ni remplie. Un sous-agent ne pose pas le sondage : il s'arrête avec la liste des limites hors cadre (chemin d'intention prévu, fichiers touchés, puce éventuelle), la session principale le pose.",
  limitsAnswers: "Réponses de l'humain aux limites hors cadre (sondage `drwil-limite`) : {0}.",
};
