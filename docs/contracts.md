# Contrats (source unique des invariants)

Chaque invariant est identifié par un ID unique. Ne pas les recopier ailleurs : citer l'ID.

Preuve vérifiable (DRWIL-001, fiche V0.2 close : `docs/projects/journal.md`, « Fiche close : drwil V0.2 ») :
`**Contrôle**` cite, entre backticks, l'identifiant d'un contrôle connu du
moteur (socle de `.githooks/run-checks.mjs`, ou `id` d'un contrôle de
`.drwil/ia-first.json` → `checks`) ; la commande n'est jamais recopiée ici.
`**Manuel**` décrit la partie de la preuve qui reste humaine. Au moins l'un
des deux ; un contrôle inconnu est une erreur de configuration.
`**Couvre**` (facultatif) : les motifs de chemins, entre backticks, de ce que le
contrat juge ; une attestation tombe quand un fichier sous ces motifs change
(`docs/ia-first.md`, règle de validité) ; `aucun` suivi de sa raison déclare un
contrat que des fichiers ne jugent pas (QUA-185).
`**Sévérité**` (facultatif) : `blocking` (défaut), `warning` ou
`indicatif`. Seuls les contrats bloquants décident du verdict de
`drwil verify` ; les autres sont exécutés et affichés sans changer son code
de sortie.
`**Origine**` (facultatif) : le chantier et le critère d'acceptation dont le
contrat est issu (`**Origine** : <chantier> — « <critère> »`). Quand son
contrôle échoue, `drwil verify` l'affiche : l'échec casse ce critère,
régression sauf si la fiche active déclare le changement (section
« Contrats modifiés »).

## SEC-001 — Portée des droits
**Règle** : Les droits d'accès sont décidés par le backend.
**Périmètre** : Toutes les routes exposées.
**Source de vérité** : Code backend (couche autorisations).
**Preuve** : Tests d'autorisation.
**Manuel** : tests d'autorisation propres au projet (drwil n'a pas de backend).
**Couvre** : `aucun` — contrat de conduite (drwil n'a pas de backend) : aucun fichier précis ne le juge, et le manifeste du paquet ferait tomber l'attestation à chaque release
**Raison** : Principe de défense en profondeur.

## QUA-013 — Contrôle non exécuté n'est pas passé
**Règle** : Un contrôle qui n'a pas tourné n'est pas un contrôle passé. La règle vaut aussi pour les critères d'acceptation, ceux de la fiche active comme ceux des fiches de preuve de clôture : une preuve absente, périmée ou non rejouée ne vaut jamais un succès, en local comme en CI. Une attestation dont un contrôle cité change d'effet (commande, test visé ou `paths`) tombe : l'empreinte sur l'effet (QUA-183) ne laisse jamais vivre un jugement dont la preuve n'est plus la même (QUA-184). Le verdict d'un contrôle joué par `run-checks` sur un arbre et une configuration identiques (QUA-140), ou, pour une itération, sur les seuls fichiers du contrôle identiques (QUA-141, QUA-152 au pre-push), est une exécution du contrôle sur ce même code, pas une preuve périmée ; tout autre verdict repris reste un échec.
**Périmètre** : Tout contrôle listé dans les vérifs, et tout critère d'acceptation jugé par `drwil verify`.
**Source de vérité** : `.githooks/run-checks.mjs` (moteur `.githooks/engine.mjs`) et son historique d'exécution, `packages/drwil/src/closure.ts` pour les critères.
**Preuve** : Sortie lue du contrôle concerné.
**Contrôle** : `ci-coverage`, `tests-qua-013`
**Manuel** : lecture de la sortie du contrôle concerné.
**Couvre** : `.github/workflows/ia-first.yml`, `packages/drwil/src/verdict.ts`
**Tests** : `packages/drwil/test/kit.test.mjs`, `.githooks/run-checks.test.mjs`
**Raison** : Empêcher l'affirmation sans exécution.

## SEC-006 — Pas de dépendance vulnérable connue
**Règle** : Aucune dépendance avec une faille connue.
**Périmètre** : Dépendances du dépôt.
**Source de vérité** : Manifeste de dépendances (`package.json`…), audit déclaré (`.drwil/ia-first.json` → `checks`).
**Preuve** : Hook + CI : `outils/audit-dependances.mjs` lit la sortie JSON de `npm audit` (toutes les dépendances, production et développement) ; une faille high ou critical échoue, moderate et low sont affichées sans bloquer, un registre injoignable donne « audit non exécuté », jamais un succès (QUA-013). Au commit, il ne tourne que si le manifeste, le verrou ou l'outil changent ; toujours au push et en CI.
**Contrôle** : `audit-dependances`
**Raison** : Une bibliothèque vulnérable annule le reste.

## SEC-007 — Pas de secret dans le dépôt
**Règle** : Pas de secret dans le dépôt (`.env`, clés, mots de passe, configs clients).
**Périmètre** : Tout le dépôt et son historique.
**Source de vérité** : gitleaks (fichiers indexés + historique, si configuré).
**Preuve** : Hook + CI.
**Contrôle** : `secrets`
**Raison** : Fuite irréversible une fois poussée.

## QUA-011 — Doc jamais fausse
**Règle** : Tout chemin du dépôt et tout ID de contrat cités dans la doc et les skills existent (ID définis une seule fois au registre).
**Périmètre** : `AGENTS.md`, les `AGENTS.md` de couche, `docs/`, `.claude/skills/` (si présent).
**Source de vérité** : `.githooks/check-docs.mjs`.
**Preuve** : Hook + CI.
**Contrôle** : `docs-references`
**Raison** : Une doc fausse égare les IA.

## QUA-015 — Chantiers exploitables à froid
**Règle** : Chaque case ouverte de l'index des chantiers porte un marqueur `[IA]`, `[humain]` ou `[décision]` ; chaque fiche de `docs/projects/` et de `docs/intentions/` (hors index et README) a une ligne « Statut » en tête, datée (AAAA-MM-JJ) ; chaque fiche d'intention a les sections « Besoin », « Existant » et « Questions à trancher » ; chaque fiche de projet a une section « Reprise ». Extension (2026-10-04) : la case d'une ligne d'index qui cite une fiche dont le « Statut » contient `fait`/`terminé`/`clos` doit être cochée, et réciproquement une case cochée doit citer une fiche qui se dit terminée — avertissement non bloquant au commit, bloquant à la clôture (QUA-074) ; la prose de « Statut » n'est pas un champ structuré, angles morts assumés.
**Périmètre** : `docs/projects/`, `docs/intentions/`.
**Source de vérité** : `docs/ia-first/7-project-lifecycle.md`.
**Preuve** : `.githooks/check-docs.mjs` (hook + CI) ; justesse du contenu : humaine.
**Contrôle** : `docs-references`, `tests-qua-015`
**Manuel** : justesse du contenu des fiches.
**Couvre** : `.githooks/briefs.mjs`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Raison** : Un agent reprend un chantier à froid sans refaire le travail ni trancher à la place du demandeur.

## QUA-016 — Rappel de cadrage
**Règle** : Tout fichier de code indexé est couvert par le bloc `scope` d'une fiche de `docs/projects/` ; un bloc mal formé (sans `files:`, motif trop large) est refusé. Sévérité réglable par projet (`.drwil/ia-first.json` -> `cadrage` : `blocking` par défaut et sur ce dépôt, `warning`, ou `off`). Hors réglage `blocking`, ce contrat n'est pas prouvé : lui ajouter un champ Manuel.
**Périmètre** : Tout le dépôt (fichiers indexés), hors `docs/` et le markdown.
**Source de vérité** : `.githooks/scope.mjs`, `docs/ia-first/7-scoping-reminder.md`.
**Preuve** : `.githooks/check-docs.mjs` (hook + CI, sévérité selon le réglage) ; refus avant écriture côté agent : `.claude/hooks/scope-reminder.mjs`.
**Contrôle** : `docs-references`, `tests-qua-016`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Raison** : Du code détaché de tout chantier ne se retrouve plus.

## QUA-017 — Pas de travail direct sur la branche principale
**Règle** : Commiter ou pousser directement sur la branche principale (`master`/`main`) est refusé, y compris le tout premier commit d'un dépôt. Une seule exception, bornée : le tout premier envoi vers un distant qui n'a aucune branche (`git ls-remote --heads` répond et ne renvoie rien ; hors ligne ou en erreur, pas d'exception), puisqu'aucune pull/merge request ne peut y fusionner ; dès que le distant a une branche, tout envoi direct est refusé comme avant, et le commit local sur la branche principale reste refusé. Le travail doit passer par une branche (`docs/recipes/working-with-branches.md`) fusionnée ensuite via une pull/merge request. `init()` crée et bascule systématiquement sur une branche de travail (`chantier/installation-kit`) juste après `git init`, avant tout commit : personne n'a donc jamais besoin de commiter sur la branche principale, même au bootstrap. Au commit, la branche courante est jugée (c'est là que le commit atterrit) ; au push, la référence distante poussée est jugée, pas la branche courante (entrée standard du hook `pre-push`) : pousser `recette/vX.Y.Z` depuis `master` passe, pousser vers `refs/heads/master` (ou `main`) est refusé d'où qu'on pousse (le hook `pre-push` passe le distant visé au contrôle). Pas de porte de sortie configurable (contrairement à QUA-016). Ce contrôle ne tourne jamais en CI (`process.env.CI`) : la CI s'exécute aussi sur la branche principale après un merge légitime, qu'il ne faut pas bloquer rétroactivement.
**Périmètre** : Tout dépôt git, y compris avant le tout premier commit, en local uniquement (hooks `pre-commit`/`pre-push`).
**Source de vérité** : `docs/recipes/working-with-branches.md`.
**Preuve** : `.githooks/run-checks.mjs` (hook uniquement, jamais en CI).
**Contrôle** : `main-branch`, `tests-qua-017`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Raison** : Un commit ou un push direct sur la branche principale contourne la revue (pull/merge request) et casse le lien fiche ↔ branche décrit par la recette.

## QUA-018 — Périmètre explicite : dépôt drwil vs livrable gabarit
**Règle** : Ce dépôt a deux casquettes : drwil-le-dépôt (ce projet en tant que tel — son `AGENTS.md` racine, sa CI dogfood, ses `docs/`, ses chantiers) et drwil-le-livrable (le gabarit distribué via `npx`/`npm`, `packages/drwil/templates/`, copié dans tout projet généré). Si une demande ne précise pas clairement laquelle des deux casquettes est visée, l'IA doit le demander explicitement avant d'agir plutôt que de deviner.
**Périmètre** : Toute modification susceptible de concerner `packages/drwil/templates/` et/ou son équivalent dogfood à la racine (`AGENTS.md`, `docs/`, `.github/workflows/`, `.githooks/`, `.claude/skills/`).
**Source de vérité** : Ce contrat (rappelé dans `AGENTS.md`) ; écarts voulus entre dépôt et gabarit : `outils/miroirs.json`.
**Preuve** : Mixte. Le contrôle `miroirs-gabarit` (`outils/verifier-miroirs.mjs`) prouve : tout fichier présent des deux côtés est identique ou son écart est déclaré avec sa raison ; aucun fichier n'existe d'un seul côté (dossiers miroirs du dépôt, parties du gabarit installées ici) sans être déclaré ; la CI du dépôt contient tous les jobs du gabarit, ses jobs en plus sont déclarés, et un job déclaré propre au dépôt qui apparaît dans le gabarit est refusé (la fuite qui a motivé ce contrat) ; le contenu livré (tout `packages/drwil/templates/`) ne cite pas l'historique interne de drwil — numéro de PR, décision datée du demandeur, ADR, lot interne, projet d'origine, fiche propre à ce dépôt. Hors de sa portée : les identifiants internes `DRWIL-…` encore affichés par deux messages livrés (les retirer change une sortie : à décider à part), le contenu d'un fichier dont l'écart est déclaré, le texte des variables d'un gabarit (comparé dans sa forme), la comparaison des miroirs pour une autre langue que celle du dépôt (`packages/drwil/templates/en/`, que la recherche d'historique interne couvre pourtant), et la part humaine : demander la casquette visée avant d'agir.
**Contrôle** : `miroirs-gabarit`
**Manuel** : appréciation contextuelle du périmètre.
**Couvre** : `outils/miroirs.json`
**Raison** : Un changement fait sans clarifier le périmètre risque de fuiter du dogfood vers le gabarit exporté (ou l'inverse), comme déjà vu pour le job CI de release (dogfood-only, pas destiné au gabarit).

## QUA-019 — Pas de contournement d'un contrôle
**Règle** : Un contrôle bloquant (test, hook, CI) n'est jamais désactivé, sauté (`--no-verify`, skip, flag d'exception) ni contourné pour faire avancer une tâche. S'il semble mal calibré pour un cas légitime, le signaler et proposer une correction du contrôle lui-même (ou ouvrir une fiche de décision), jamais le désactiver en silence.
**Périmètre** : Tout contrôle de `.githooks/`, toute CI, tout test.
**Source de vérité** : Ce contrat (rappelé dans `AGENTS.md`).
**Preuve** : Humaine — un contournement laisse rarement une trace automatisable (voir `catalogue:QUA-009` pour le cas outillable d'un test désactivé).
**Manuel** : un contournement laisse rarement une trace automatisable.
**Couvre** : `.githooks/pre-commit`, `.githooks/pre-push`, `.github/workflows/ia-first.yml`
**Raison** : Contourner un contrôle masque silencieusement une régression ou un vrai problème ; c'est l'opposé de QUA-013 (un contrôle qui ne tourne pas ne prouve rien).

## QUA-021 — Fiche prête avec critères d'acceptation
**Règle** : Toute fiche de chantier a au moins un critère d'acceptation, quelle que soit sa maturité : sans critère, son lancement (`state.mjs start`, `/drwil-start`) et sa clôture sont refusés si le projet impose les exigences récentes (`newRequirements` : `blocking`, cas de ce dépôt), avertis sinon ; l'entretien courant (`docs/projects/routine-maintenance.md`) en est exempt. Une fiche déclarée « prête » sans critère reste refusée par `check-docs`.
**Périmètre** : Les fiches de `docs/projects/`.
**Source de vérité** : `.githooks/briefs.mjs` (`readyGaps`), `.githooks/check-docs.mjs`, `.githooks/state.mjs` (clôture).
**Preuve** : `check-docs` (hook + CI) refuse la fiche « prête » ; la clôture avertit.
**Contrôle** : `tests-qua-021`
**Tests** : `.githooks/check-docs.test.mjs`, `.githooks/state.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : capitaliser les non-régressions — « Une fiche « prête » sans critères d'acceptation est refusée par check-docs ; une fiche sans critères qui n'est pas « prête » reçoit un avertissement à la clôture »
**Raison** : Un chantier sans critère prouvé ne laisse rien à rejouer : la non-régression métier commence par la fiche.

## QUA-022 — Preuve d'un critère laissée au registre
**Règle** : Un critère d'acceptation est prouvé par un contrat du registre avec un contrôle rejouable (ou un contrat Manuel attesté pour un jugement humain) ; un critère sans contrat, y compris lié à un contrôle seul, est refusé à la clôture. `drwil verify` classe chaque contrat lié contre la base de la branche : créé, réutilisé tel quel (accepté) ou modifié ; un contrat créé par le chantier porte le champ Origine (`<chantier> — « <critère> »`), sinon il n'est pas une preuve durable.
**Périmètre** : Les critères d'acceptation de la fiche active.
**Source de vérité** : `packages/drwil/src/criteria.ts` (`evaluateCriteria`, `contractChanges`).
**Preuve** : `drwil verify` et son évidence, lue par la clôture.
**Contrôle** : `tests-qua-022`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : capitaliser les non-régressions — « Un critère dont le contrat n'existe pas ou n'a pas de contrôle rejouable est refusé à la clôture ; un critère nouveau crée ou modifie son contrat dans la branche »
**Raison** : La preuve d'un critère doit survivre au chantier, pour être rejouée par les suivants.

## QUA-023 — Régression ou évolution d'un contrat
**Règle** : Un contrat modifié dans la branche sans déclaration dans la section « Contrats modifiés » de la fiche active est une régression : `drwil verify` le liste et la clôture est refusée ; déclaré (validé par le demandeur au cadrage), il est accepté. Un contrat en échec qui porte `**Origine**` affiche le critère qu'il protège.
**Périmètre** : Le registre `docs/contracts.md`, comparé à la base de la branche.
**Source de vérité** : `packages/drwil/src/criteria.ts` (`judgeBrief`, `showOrigins`), `.githooks/briefs.mjs` (`declaredContracts`), `.githooks/state.mjs` (clôture).
**Preuve** : `drwil verify` et son évidence, lue par la clôture.
**Contrôle** : `tests-qua-023`
**Tests** : `packages/drwil/test/kit.test.mjs`, `.githooks/state.test.mjs`
**Origine** : capitaliser les non-régressions — « Un contrat modifié sans déclaration dans « Contrats modifiés » est refusé ; quand un contrôle échoue, verify affiche le chantier d'origine qu'il protège »
**Raison** : Assouplir un contrat en silence efface la non-régression qu'il portait ; le changer reste possible, mais décidé.

## QUA-024 — Premier contrat métier d'un dépôt neuf
**Règle** : `init` livre dans le registre un contrat métier d'exemple, `APP-001`, dont le contrôle est à compléter (champ Manuel : jamais prouvé tant qu'il n'est pas remplacé) ; le guide d'adoption explique comment écrire le premier.
**Périmètre** : Le gabarit livré (`packages/drwil/templates/common/base/docs/contracts.md`, `docs/recipes/adopt-the-kit.md`).
**Source de vérité** : Ces deux fichiers du gabarit.
**Preuve** : Test sur un `init` neuf.
**Contrôle** : `tests-qua-024`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : capitaliser les non-régressions — « Un init neuf fournit un contrat métier d'exemple avec un contrôle à compléter »
**Raison** : Un dépôt neuf démarre sans filet métier : l'exemple montre où et comment poser le premier.

## QUA-025 — Version du moteur installé enregistrée
**Règle** : `init` (installation ou mise à jour) enregistre la version du moteur dans `.drwil/install.json` (si présent ; `format`, `version`, `firstVersion` conservée aux mises à jour, `null` — origine inconnue — pour un projet installé avant l'enregistrement : manifeste présent, enregistrement absent ; aucun horodatage, réécrit seulement si la version change), sans modifier le manifeste `.drwil/installed-files.json` (si présent) ; `uninstall` le retire.
**Périmètre** : Tout projet équipé par `drwil init`.
**Source de vérité** : `packages/drwil/src/manifest.ts` (`writeInstall`, `readInstall`, `uninstall`), `packages/drwil/src/index.ts` (`init`).
**Preuve** : Test sur un dépôt temporaire.
**Contrôle** : `tests-qua-025`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : fiabiliser le package npm — « init (installation ou mise à jour) enregistre la version du moteur dans .drwil/install.json sans changer le manifeste ; uninstall le retire »
**Raison** : Savoir quelle version du moteur tourne dans un projet, pour le diagnostiquer et le mettre à jour.

## QUA-026 — doctor signale la version installée
**Règle** : `drwil doctor` affiche la version du moteur installé et sa première version, ou « version d'origine inconnue, antérieure à 0.6.0 » quand elle n'a pas été enregistrée ; avertissement, jamais problème, si la CLI est plus récente (mettre à jour par `npx drwil init`), plus ancienne, ou si l'enregistrement manque.
**Périmètre** : `drwil doctor`.
**Source de vérité** : `packages/drwil/src/doctor.ts` (point « version »).
**Preuve** : Test sur un dépôt temporaire.
**Contrôle** : `tests-qua-026`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : fiabiliser le package npm — « doctor affiche la version installée et signale un écart avec la CLI »
**Raison** : Un écart de version silencieux fait tourner des hooks d'une version avec une CLI d'une autre.

## QUA-027 — Mise à jour sûre d'une version à la suivante
**Règle** : `drwil init` sur un projet équipé par une version antérieure préserve les fichiers du projet et la mécanique modifiée par le client (signalée comme dérive), rafraîchit la mécanique jamais modifiée, rafraîchit aussi la prose et les réglages du kit (skills, recettes, `docs/ia-first.md`, instructions des agents, catalogue, `.claude/settings.json`) installés par le kit et jamais modifiés — jamais les documents de départ du projet ni une prose absente du manifeste —, retire les fichiers obsolètes jamais modifiés (en gardant ceux modifiés ; jamais les fiches ni les recettes), tient le manifeste à jour et enregistre la nouvelle version ; `drwil resolve-drift` propose le diff d'une mécanique ou d'une prose du kit modifiée, avec confirmation par fichier et sauvegarde `.bak`.
**Périmètre** : `drwil init` sur un projet déjà équipé.
**Source de vérité** : `packages/drwil/src/index.ts` (`init`), `packages/drwil/src/manifest.ts` (`removeObsolete`, `writeManifest`, `writeInstall`).
**Preuve** : Test de mise à jour sur un dépôt temporaire, version antérieure simulée hors réseau.
**Contrôle** : `tests-qua-027`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : fiabiliser le package npm — « Passer d'une version à la suivante préserve les fichiers modifiés par le client et retire les fichiers obsolètes non modifiés »
**Raison** : Une mise à jour qui écrase le travail du client ou laisse des restes fait renoncer aux mises à jour.

## QUA-028 — Un ID de contrat n'est défini qu'à un seul endroit
**Règle** : Un ID de contrat n'est jamais défini à la fois dans le registre et dans le catalogue (un contrat adopté du catalogue garde son ID et le quitte ; sinon la ligne du catalogue est renumérotée), ni deux fois dans le catalogue. Bloquant si le projet impose les exigences récentes (`newRequirements` : `blocking`, cas de ce dépôt), avertissement sinon.
**Périmètre** : `docs/contracts.md` et `docs/contracts-catalog.md` (dossiers réglables : `dirs.contracts`, `dirs.catalog`).
**Source de vérité** : `.githooks/contracts.mjs` (`definedIds`, `idConflicts`), `.githooks/check-docs.mjs`.
**Preuve** : `check-docs` (hook + CI).
**Contrôle** : `docs-references`, `tests-qua-028`
**Tests** : `.githooks/contracts.test.mjs`, `.githooks/check-docs.test.mjs`
**Origine** : cohérence des ID de contrat entre registre et catalogue — « Un ID défini à la fois dans le registre et dans le catalogue, ou deux fois dans le catalogue, est signalé par check-docs »
**Raison** : Deux règles sous un même ID rendent toute citation ambiguë ; le cas s'est produit (SEC-001) et a failli se reproduire (un ID déjà pris par le catalogue proposé pour un nouveau contrat).

## QUA-029 — Les tests cités par un contrat existent et portent son ID
**Règle** : Chaque fichier cité par le champ Tests d'un contrat existe et contient l'ID du contrat (cité dans le nom du test qui le protège). Indépendant de la pile : les noms de test ne sont pas analysés. Bloquant si le projet impose les exigences récentes (`newRequirements` : `blocking`, cas de ce dépôt), avertissement sinon.
**Périmètre** : le champ Tests du registre (`docs/contracts.md`, dossier réglable : `dirs.contracts`), livré dans le gabarit.
**Source de vérité** : `.githooks/check-contract-tests.mjs`, `.githooks/contracts.mjs` (lecture du champ Tests).
**Preuve** : contrôle `contract-tests` du moteur (hook + CI, `drwil verify`).
**Contrôle** : `contract-tests`, `tests-qua-029`
**Tests** : `.githooks/check-contract-tests.test.mjs`, `.githooks/contracts.test.mjs`, `.githooks/engine.test.mjs`
**Origine** : lien contrat ↔ test, échec attribué à la bonne règle — « Un contrat dont le champ Tests cite un fichier absent, ou un fichier qui ne porte pas son ID, est signalé »
**Raison** : Une règle métier n'est une non-régression que si son test existe encore : un test supprimé ou renommé laissait le contrat vert sans plus rien prouver.

## QUA-030 — Un contrôle partagé qui échoue est signalé non attribuable
**Règle** : Quand un contrôle cité par plusieurs contrats échoue, `drwil verify` le dit dans les raisons de chacun (« contrôle partagé par APP-001, APP-002 : échec non attribuable à une seule règle »), au lieu de l'imputer sans réserve. Le registre livré (APP-001) et la recette d'adoption enseignent un contrôle par règle métier, qui filtre ses tests par l'ID.
**Périmètre** : `packages/drwil/src/verify.ts` ; livrable : `docs/contracts.md` et `docs/recipes/adopt-the-kit.md` du gabarit.
**Source de vérité** : `packages/drwil/src/verify.ts`, `docs/recipes/adopt-the-kit.md` (étape 5).
**Preuve** : tests du paquet (`couverture-tests`).
**Contrôle** : `tests-qua-030`
**Tests** : `packages/drwil/test/cycle.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : lien contrat ↔ test, échec attribué à la bonne règle — « Quand un contrôle cité par plusieurs contrats échoue, verify le dit au lieu de l'imputer sans réserve à chacun »
**Raison** : Dans un vrai projet, tout passe souvent par un seul `npm test` : verify bloquait bien, mais pouvait désigner APP-001 quand APP-002 était cassé.

## QUA-031 — verify montre où en sont les règles métier
**Règle** : `drwil verify` se termine, en sortie humaine et en sortie agent, par un bilan d'une ligne des règles métier : prouvées par un test, prouvées sans test cité, à compléter (part humaine), cassées (chacune avec son chantier d'origine). Le détail règle par règle (état, tests cités, origine) est dans le JSON de verify et dans son évidence. Une règle métier est un contrat au préfixe métier (`APP` par défaut, réglable : `businessPrefixes` de `.drwil/ia-first.json`) ou un contrat qui porte un champ Origine. Sans règle métier, pas de ligne.
**Périmètre** : `packages/drwil/src/rules.ts`, la sortie de `drwil verify` (humaine, agent, JSON, évidence).
**Source de vérité** : `packages/drwil/src/rules.ts`.
**Preuve** : tests du paquet (`couverture-tests`).
**Contrôle** : `tests-qua-031`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Origine** : vue des règles métier dans drwil verify — « `drwil verify` se termine par un bilan d'une ligne des règles métier »
**Raison** : La non-régression métier grandit chantier après chantier ; sans vue, on ne sait ni ce qui est prouvé, ni ce qui reste à compléter, ni quel chantier une règle cassée protège.

## QUA-032 — Une attestation ne coûte que le jugement demandé
**Règle** : Une attestation (version 4) couvre la part humaine d'un contrat (règle, champ Manuel, sévérité, motifs du champ Couvre ; toute la section pour un contrat historique en tableau), séparément l'effet de chaque contrôle attesté (QUA-183, QUA-184) et l'empreinte du contenu des fichiers du champ Couvre (QUA-081) : un contrôle ajouté ensuite ne la rend pas obsolète (il doit passer), un changement de la part humaine, un contrôle attesté retiré ou dont l'effet change ou un fichier couvert changé, si. Une attestation version 3 reste jugée par la définition de ses contrôles (commande et dossier), une version 2 sans couverture, une version 1 par son ancienne empreinte. `drwil attest` annonce chaque contrôle qu'il relance, puis son résultat, avant le résumé et la question.
**Périmètre** : `drwil attest`, le jugement des attestations par `drwil verify`.
**Source de vérité** : `packages/drwil/src/verify.ts` (`humanFingerprint`, `proofFingerprints`), `packages/drwil/src/attest.ts`, `packages/drwil/src/coverage.ts`.
**Preuve** : tests du paquet (`couverture-tests`).
**Contrôle** : `tests-qua-032`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Origine** : attestation sans friction inutile — « Ajouter un contrôle à un contrat attesté ne rend pas son attestation obsolète »
**Raison** : L'attestation est le seul geste humain obligatoire de la clôture : réattester une preuve seulement renforcée, ou attendre deux minutes devant un terminal muet, coûtait plus que le jugement demandé.

## QUA-033 — Un contrôle par règle dans ce dépôt
**Règle** : Chaque contrat du registre qui cite des tests (champ Tests) cite aussi son propre contrôle, `tests-<id>` (`tests-qua-016` pour QUA-016), qui ne rejoue que les fichiers de son champ Tests, filtrés par son ID (`node --test --test-name-pattern`) : un test cassé fait échouer ce seul contrat. La couverture (`couverture-tests`, `couverture-hooks`) n'est citée que par QUA-004 (seuil de couverture).
**Périmètre** : `docs/contracts.md` et `.drwil/ia-first.json` de ce dépôt (règle enseignée au livrable par QUA-030).
**Source de vérité** : `outils/verifier-tests-contrats.mjs`.
**Preuve** : contrôle `tests-contrats` (hook + CI) ; un filtre qui ne sélectionnerait aucun test est déjà refusé par ce même contrôle (chaque fichier cité porte un test au nom commençant par l'ID).
**Contrôle** : `tests-contrats`, `tests-qua-033`
**Tests** : `outils/verifier-tests-contrats.test.mjs`
**Origine** : un contrôle par règle dans le dépôt drwil — « Chaque contrat qui cite des tests a son propre contrôle »
**Raison** : `couverture-tests` partagé par 13 contrats faisait échouer les 13 sur un seul test cassé, chacun « non attribuable » : le dépôt n'appliquait pas la règle qu'il enseigne.

## QUA-034 — Un critère non prouvé fait tomber le verdict de verify
**Règle** : Quand une fiche est jugée, `drwil verify` combine le jugement de ses critères d'acceptation au verdict des contrats : un critère non prouvé le fait passer à `FAIL`, ou à `MANUAL` si le seul manque est un critère de jugement humain dont le contrat attend son attestation. Les critères non prouvés sont listés dans la sortie humaine, la sortie agent et le JSON (`criteria`). La fiche jugée ne vient plus du seul état local : elle est trouvée sans lui (QUA-086). Hors d'une fiche jugée (branche principale, `drwil attest`), le verdict ne change pas.
**Périmètre** : `drwil verify` (verdict, code de sortie, sorties humaine, agent et JSON).
**Source de vérité** : `packages/drwil/src/criteria.ts` (`criteriaVerdict`), `packages/drwil/src/closure.ts` (`judgeDurable`).
**Preuve** : tests du paquet.
**Contrôle** : `tests-qua-034`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Origine** : un critère non prouvé fait tomber le verdict de verify — « Un critère automatique non prouvé de la fiche active fait passer le verdict de verify à FAIL »
**Raison** : verify pouvait dire `GOVERNANCE: PASS` alors qu'un critère du chantier n'était pas prouvé ; l'agent ne le découvrait qu'à la clôture et pouvait annoncer un travail « vérifié » qui ne l'était pas.

## QUA-035 — Un cadrage complet du premier coup, un élargissement sans friction
**Règle** : Un fichier cité dans le bloc scope d'une fiche couvre aussi sa copie déclarée par le réglage `scopeMirrors` de `.drwil/ia-first.json` (paires de préfixes source → copie), pour la barrière de périmètre, le rappel de cadrage de check-docs et celui de l'agent ; sans réglage, rien ne change. `check-docs` avertit une fiche dont le cadrage cite du code sans aucun fichier de test, ou dont un critère crée un contrat sans que le cadrage cite `.drwil/ia-first.json`. Un commit qui n'indexe que de la documentation (`docs/`, Markdown) ne rejoue ni les tests des contrôles ni les contrôles du projet : ils sont signalés non exécutés, et le push comme la CI les rejouent toujours (QUA-013). Échappent au périmètre, comme les fiches et les intentions, les sorties des recettes de cadrage — découverte de valeur et audit de risques, noms exacts en français et en anglais (`OUT_OF_SCOPE`, `.githooks/scope-gate.mjs`) — : elles se commitent en SCOPING ; de même les notes de recette d'une version (`docs/recettes/`), écrites et commitées par le module de release sans trailer ni fiche active, relues en PR ; aucun motif large sur `docs/`.
**Périmètre** : `.githooks/scope.mjs`, `.githooks/scope-gate.mjs`, `.githooks/risk.mjs`, `.githooks/engine.mjs`, `.claude/hooks/scope-reminder.mjs` ; livré dans le gabarit ; ce dépôt déclare son gabarit dans `scopeMirrors`.
**Source de vérité** : `.githooks/scope.mjs` (`withMirrors`), `.githooks/risk.mjs` (`scopeGaps`), `.githooks/engine.mjs`.
**Preuve** : tests des hooks.
**Contrôle** : `tests-qua-035`
**Tests** : `.githooks/scope.test.mjs`, `.githooks/scope-gate.test.mjs`, `.githooks/risk.test.mjs`, `.githooks/engine.test.mjs`
**Origine** : un cadrage complet du premier coup, un élargissement sans friction — « Un fichier du gabarit cité dans le bloc scope couvre aussi sa copie »
**Raison** : Neuf élargissements de cadrage en deux jours, chacun un commit à part et un `git stash` du lot en cours : la première friction qu'un vrai projet rencontrerait.

## QUA-036 — La clôture boucle les intentions
**Règle** : Une limite dans le cadre de la fiche (bloc `scope`, contrats déclarés) se traite dans le chantier, jamais notée ; une limite hors cadre est soumise à l'humain par le sondage des limites (QUA-253), et seule sa réponse « Noter en intention » en fait, à la clôture, une fiche d'intention (`docs/intentions/`, jamais une fiche de chantier ; la recadrer reste une décision du demandeur ; la clôture refuse une fiche d'intention née sur la branche sans cette réponse, QUA-264), listée dans l'index en `[décision]` et citée par le journal ; l'intention d'origine, nommée par le champ `**Intention**` de la fiche, est mise à jour, ou résumée au journal et retirée si elle est entièrement couverte. Le rappel de BUILD (QUA-253), le rappel de l'activité CLOSING, les règles de conduite (`AGENTS.md`, section 8 de `docs/ia-first.md`) et la recette le disent ; le commit qui supprime une fiche sans toucher son intention reçoit un avertissement, sans blocage ; la clôture, elle, le refuse (QUA-074). Une intention dont la dernière revue datée (Statut, « Revu le … », « Existant » daté) a 30 jours ou plus est signalée par un avertissement non bloquant.
**Périmètre** : `AGENTS.md`, `docs/ia-first/8-conduct-rules.md`, la recette des branches (section « Closing »), `.githooks/state-texts.mjs`, `.githooks/briefs.mjs`, `.githooks/run-checks.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/briefs.mjs` (`briefIntent`, `intentsLeftBehind`, `lastReview`, `staleIntents`), `.githooks/state-texts.mjs`.
**Preuve** : tests des hooks ; les règles de conduite livrées et le rappel de BUILD disent la règle des limites, en français et en anglais.
**Contrôle** : `tests-qua-036`
**Tests** : `.githooks/state.test.mjs`, `.githooks/run-checks.test.mjs`
**Origine** : la clôture boucle les intentions — « À la clôture, le rappel d'activité et la recette demandent de consigner chaque limite non traitée en fiche d'intention »
**Raison** : Deux intentions réalisées étaient restées ouvertes plusieurs jours et cinq autres disaient faux ; le 2026-10-16, ce bouclage a été fait à la main à chaque clôture.
**Modifié** : 2026-11-07 — une limite dans le cadre se traite ; hors cadre, elle ne devient fiche d'intention que sur la réponse « Noter en intention » de l'humain au sondage des limites, l'agent ne l'écrit plus seul ; validé par le demandeur le 2026-11-05 (chantier « limites pendant le chantier »).

## QUA-037 — Une file de chantiers décidée d'un geste
**Règle** : Une file ordonnée de fiches et la fusion automatique se décident par l'humain seul, jamais par l'agent, de l'une de deux façons lues par le hook : un seul sondage de lancement à choix multiple, ou, sous un outil qui ne lit de façon fiable qu'un choix unique (Copilot CLI), des sondages `drwil-file` à choix unique enchaînés (une fiche ajoutée par réponse à la file en construction `queue_draft`, rien n'est lancé, puis la réponse « Terminer la file » la lance ; l'agent n'a aucune commande pour ajouter ni terminer, un sondage déjà répondu, à valeur par défaut ou à choix multiple est refusé, et l'abandon est `node .githooks/state.mjs queue stop`). Le sondage à choix multiple enregistre la file ordonnée (seconde question `drwil-merge` sous Claude Code, second champ du même nom sous Copilot CLI ; sans cette réponse, jamais de fusion programmée par l'agent) ; seule une fiche prête (maturité « prêt », aucune `[décision]` ouverte, critères d'acceptation) peut y entrer, sinon le lancement entier est refusé. La file reste après une clôture ; l'agent lance seul la tête de file (`node .githooks/state.mjs next`), avec la fusion décidée, et jamais une fiche hors de la file ; tout autre retour en SCOPING, ou `node .githooks/state.mjs queue stop`, l'abandonne. La skill de lancement, le rappel d'état et `AGENTS.md` disent d'attendre la fusion avant la suivante, de s'arrêter au premier chantier qui demande un humain, et de rendre un compte rendu par chantier et un bilan de file. Avec Claude Code, chaque chantier d'une file se mène dans un sous-agent (contexte neuf) dont la consigne commence par lire l'état ; la session principale ne garde que les comptes rendus. Mode séquentiel (défaut : réponse « File séquentielle » ou sondage sans question `drwil-parallel`) : un chantier à la fois, dans le dossier du dépôt (jamais une copie isolée) ; la session suit la PR par `gh` jusqu'à la fusion, 30 minutes au plus, et ne lance jamais de suivante sur une fusion non faite. Mode parallèle (réponse « File en parallèle », QUA-147) : chaque chantier se mène dans un sous-agent dont le dossier de travail est son worktree (jamais `isolation: "worktree"`), jusqu'à N à la fois ; la session suit chaque PR jusqu'à la fusion (30 minutes au plus chacune) ; un chantier qui demande un humain (attestation, FAIL non corrigé, CI rouge, décision) n'interrompt pas ceux qui tournent, et le bilan de file dit l'état de chacun ; en cas de conflit de clôture sur l'index ou le journal, le sous-agent rebase et résout seul (QUA-148, QUA-149). Une file reprise dans une nouvelle session (état en SCOPING avec une file) attend le oui explicite de l'humain avant `next`. Chaque chantier, en file ou non, se mène dans un sous-agent sous Claude Code et sous Copilot CLI (outil `task`) ; sous un outil sans sous-agent exploitable (Gemini CLI, Codex, Cursor : non essayés, « not tested »), une conversation par chantier : après la clôture et la fusion, l'agent s'arrête et propose à l'humain d'ouvrir une nouvelle conversation pour la suivante (`next` y est lancé sur son oui explicite), jamais la suite dans la même session. Depuis CLOSING, `start` ramène seul en SCOPING quand la fiche active est supprimée et que la PR de clôture est fusionnée (branche principale courante, ou branche fusionnée selon git ou `gh`) ; sinon le lancement est refusé et l'état reste CLOSING ; `next` refuse tant que la PR du chantier précédent n'est pas fusionnée (QUA-177), et la lecture de l'état ramène seule en SCOPING à la fusion constatée (QUA-176, QUA-178). Hors file, le rappel de clôture fait proposer `/clear` avant la prochaine demande.
**Périmètre** : l'état de gouvernance (`.githooks/state.mjs`, `.githooks/state-cli.mjs`, `.githooks/briefs.mjs`, `.githooks/state-draft.mjs`), le hook de sondage (`.claude/hooks/prompt-hook.mjs`, `.claude/hooks/queue-poll.mjs`), la skill `/drwil-start` ; livré dans le gabarit.
**Source de vérité** : `.githooks/state.mjs` (`start`, `stopQueue`), `.githooks/state-draft.mjs` (`draftAdd`, `draftFinish`), `.githooks/briefs.mjs` (`queueable`).
**Preuve** : tests des hooks et du paquet.
**Contrôle** : `tests-qua-037`
**Tests** : `.githooks/state.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : enchaîner plusieurs chantiers sans intervention — « Un seul sondage /drwil-start à choix multiple enregistre une file ordonnée de fiches et la fusion automatique »
**Raison** : Chaque chantier exigeait un sondage et une autorisation de fusion, même quand rien n'était à trancher : l'humain devait revenir entre deux chantiers. Premier pas vers l'intention « fabrique autonome ».
**Modifié** : 2026-11-02 — file par sondages à choix unique enchaînés, décidée par le demandeur (chantier « parité des outils », lot 2) : Copilot CLI ne lit de façon fiable qu'un choix unique, donc une fiche par sondage ; l'invariant reste que l'humain répond et qu'un outil lit.
**Modifié** : 2026-11-02 — sous-agent ou nouvelle conversation, décidé par le demandeur (chantier « parité des outils », lot 3) : le rappel d'état de la file ne dit plus « tout dans la même session » pour un outil sans sous-agent exploitable.

## QUA-038 — Un projet neuf commence par son cadrage global, sans couche inventée
**Règle** : Sans pile détectée, `drwil init` n'écrit aucune couche et dit quoi faire (cadrer le projet, ou `--layers`) ; un `package.json` qui n'installe que drwil (aucune autre dépendance, aucun script hormis le `test` par défaut de `npm init`, au texte exact, comme après `npm init -y` puis l'étape `npm install -D` du README) n'est pas une pile : le dossier reste un projet neuf (dépôt git et branche créés, pile « Not decided » dans la carte) ; une pile détectée, `--layers` ou un projet déjà installé gardent leurs couches ; `drwil init --layers <couches>`, relancé une fois la pile choisie, crée l'`AGENTS.md` de chaque couche et enregistre les couches. La recette d'adoption commence un projet neuf par son cadrage global (besoin, périmètre, pile, premières règles métier, risque ; `AGENTS.md`, carte, premier README).
**Périmètre** : `drwil init` (`packages/drwil/src/install.ts`, `packages/drwil/src/index.ts`), la recette d'adoption ; livré.
**Source de vérité** : `packages/drwil/src/install.ts`, `docs/recipes/adopt-the-kit.md` (étape 0).
**Preuve** : tests du paquet.
**Contrôle** : `tests-qua-038`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : un projet neuf commence par son cadrage global — « Sans pile détectée, drwil init n'écrit aucune couche »
**Raison** : Un répertoire vide recevait backend/ et frontend/ pour un projet qui n'existait pas encore, et l'adoption supposait du code existant.

## QUA-039 — Un identifiant cité à l'humain vient avec ce qu'il désigne
**Règle** : Une seule source, `.githooks/glossary.mjs`, lit les libellés des identifiants (contrats du registre, lignes du catalogue, lots et points numérotés de la fiche active, opportunités `OPT-N` de la découverte de valeur, repères qu'une intention ou une fiche déclare dans sa section « Repères ») et les donne à tout agent (`node .githooks/glossary.mjs "<texte>"`). Les sorties de drwil (`drwil verify` humaine et agent, `.githooks/run-checks.mjs`, `.githooks/check-contract-tests.mjs`) font suivre la première mention d'un identifiant de son libellé, jamais deux fois. `AGENTS.md` et les instructions Copilot et Cursor livrées en font la règle. Avec Claude Code : en fin de réponse, un hook affiche à l'humain, sous la réponse, « ID — libellé » pour chaque identifiant dont la première mention n'est suivie d'aucune glose (parenthèse, tiret, deux-points, cellule de tableau), sans réécrire la réponse ni la bloquer, et sans rien injecter au modèle ; après chaque outil qui en cite, un hook injecte les libellés à l'agent, une fois par identifiant et par session. Jamais bloquant.
**Périmètre** : `.githooks/glossary.mjs`, les sorties de drwil, `.claude/hooks/id-glossary.mjs`, `.claude/hooks/reply-glossary.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/glossary.mjs`, `packages/drwil/src/verdict.ts` (`labelIds`).
**Preuve** : tests des hooks et du paquet.
**Contrôle** : `tests-qua-039`
**Tests** : `.githooks/glossary.test.mjs`, `.githooks/run-checks.test.mjs`, `packages/drwil/test/kit.test.mjs`, `packages/drwil/test/cycle.test.mjs`
**Origine** : un identifiant cité à l'humain vient avec ce qu'il désigne — « Une seule source repère dans un texte les identifiants et rend leurs libellés »
**Raison** : La règle écrite (« références lisibles ») ne suffisait pas : des comptes rendus citaient encore « QUA-036 » sans dire ce que c'est. Le libellé doit être sous les yeux de l'agent, quel qu'il soit.

## QUA-040 — drwil entretient la carte, le README et le changelog
**Règle** : Livré à tout projet. La carte `docs/architecture.md`, fichier du projet qu'`init` ne réécrit jamais, cite chaque dossier de code (deux niveaux) et, sous les chemins réglés (`architectureMap.files`), chaque fichier hors tests : le contrôle `architecture-map` signale un oubli avec la ligne à compléter, bloquant si `newRequirements` l'impose. À l'adoption d'un projet existant, la carte est construite depuis le code. À la clôture d'un chantier, son commit met à jour le README et ajoute sa ligne « Unreleased » au changelog s'il change ce que voit l'utilisateur, et la carte s'il change la structure (recette et rappel CLOSING) ; la release renomme la section « Unreleased » en version. Carte, README et changelog s'écrivent dans la langue du réglage `docLang` (à défaut la langue du projet), donnée à l'agent par l'`AGENTS.md` livré et le rappel CLOSING. Le contrôle juge qu'un dossier est cité, pas que le rôle écrit est juste : cette part reste humaine, assumée.
**Périmètre** : `.githooks/check-architecture.mjs`, `.githooks/state-texts.mjs`, les recettes de clôture, de release et d'adoption ; livré dans le gabarit ; ce dépôt exige les fichiers de `packages/drwil/src/`, `.githooks/` et `outils/`.
**Source de vérité** : `.githooks/check-architecture.mjs`, `docs/recipes/working-with-branches.md`.
**Preuve** : contrôle `architecture-map` et tests des hooks.
**Contrôle** : `architecture-map`, `tests-qua-040`
**Tests** : `.githooks/check-architecture.test.mjs`, `.githooks/engine.test.mjs`, `.githooks/state.test.mjs`
**Origine** : une documentation à jour pour la 0.6.0, et qui le reste — « Un fichier de code de ce dépôt que la carte ne cite pas est signalé par un contrôle »
**Raison** : Toute la documentation lue par un nouvel utilisateur datait du 2026-10-13 au plus tard, quinze chantiers plus tôt : la règle écrite (« doc mise à jour dans le même commit ») n'avait pas suffi.

## QUA-041 — La documentation lue par un nouvel utilisateur dit vrai
**Règle** : Le changelog (`packages/drwil/CHANGELOG.md`), les README du dépôt et du paquet, `INSTALL.md`, la recette d'adoption et la carte `docs/architecture.md` décrivent le livrable tel qu'il est, en partant du parcours d'un nouvel utilisateur (projet neuf ou existant, premier chantier, non-régression métier) ; leurs chemins et contrats cités existent.
**Périmètre** : la documentation d'entrée du dépôt et du paquet.
**Source de vérité** : le code du livrable ; `docs/projects/journal.md` pour le changelog.
**Preuve** : contrôle `docs-references` (chemins et contrats cités) ; justesse du contenu : humaine.
**Contrôle** : `docs-references`
**Manuel** : justesse du contenu, relu par le demandeur.
**Couvre** : `README.md`, `packages/drwil/README.md`
**Origine** : une documentation à jour pour la 0.6.0, et qui le reste — « Rattrapage : le changelog couvre tout depuis la 0.5.1 ; les README, INSTALL.md, la recette d'adoption et la carte décrivent le livrable tel qu'il est »
**Raison** : Un README faux ne se voit pas par un contrôle : il trompe le premier utilisateur avant même son premier chantier.

## QUA-042 — Consommation de tokens mesurée par chantier
**Règle** : Livré à tout projet. `node .githooks/consumption.mjs` donne, par chantier (branches `workstream/<fiche>` et de cadrage regroupées), les tokens en quatre catégories, le cache lu moyen par requête (le coût du contexte relu, affiché au relevé et à la consignation, jamais enregistré), un total pondéré indicatif, le temps actif et les modèles, lus dans les journaux de session de Claude Code — seuls les champs de consommation, jamais un contenu de message. À la clôture, `--record <fiche>` ajoute une ligne à `.drwil/usage.jsonl`, jamais deux pour le même chantier ; le rappel CLOSING et la recette de clôture le demandent. Jamais bloquant : sans journal lisible (autre outil IA), il le dit, sort en succès, et la recette garde l'estimation à la main.
**Périmètre** : `.githooks/consumption.mjs`, `.drwil/usage.jsonl`, recettes de consommation et de clôture ; livré dans le gabarit.
**Source de vérité** : `.githooks/consumption.mjs`.
**Preuve** : tests du script.
**Contrôle** : `tests-qua-042`
**Tests** : `.githooks/consumption.test.mjs`, `.githooks/state.test.mjs`
**Origine** : la consommation de tokens par chantier, mesurée chez tout projet — « Livré à tout projet : `node .githooks/consumption.mjs` donne, par chantier, les tokens en quatre catégories, un total pondéré indicatif, le temps actif et les modèles »
**Raison** : Le pilote de la 0.6.0 sur 2 ou 3 projets doit dire ce que coûte un chantier chez eux ; la mesure n'existait que dans ce dépôt, et la recette livrée la disait impossible.

## QUA-043 — Un projet sans CI sait comment en déclarer une
**Règle** : Sans CI déclarée (`ci: none`), le détail du contrôle de couverture CI (`.githooks/engine.mjs`, vu par `run-checks` et `drwil verify`) et la ligne CI de `drwil doctor` nomment la commande qui en déclare une (`npx drwil init --ci github` ou `--ci gitlab`), en français et en anglais. Le verdict ne change pas : le contrôle reste non exécuté, donc jamais passé (QUA-013).
**Périmètre** : `.githooks/engine.mjs`, `packages/drwil/src/doctor.ts` ; livré dans le gabarit.
**Source de vérité** : `.githooks/engine.mjs` (texte `noCi`), `packages/drwil/src/doctor.ts` (texte `noCi`).
**Preuve** : tests du moteur et du paquet.
**Contrôle** : `tests-qua-043`
**Tests** : `.githooks/engine.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : un premier essai propre (0.6.2) — « Sans CI déclarée, le détail de QUA-013 (contrôle non exécuté n'est pas passé) dans verify et la ligne CI de doctor disent comment en sortir (npx drwil init --ci github ou --ci gitlab), en français et en anglais, prouvé par les tests ; le verdict reste ERROR »
**Raison** : Constaté le 2026-10-17 sur le pilote `drwil_com` : le premier `verify` d'un projet neuf, tel que le donne le README, finit en `VERIFY ERROR` sans dire que c'est attendu ni comment en sortir.

## QUA-044 — Les hooks lisent la racine du projet, pas le dossier courant
**Règle** : Les hooks d'agent livrés (`.claude/hooks/`) prennent pour racine du projet le dossier qui contient leur `.claude/`, et le moteur d'état (`.githooks/state.mjs`) le parent de son `.githooks/` (`DRWIL_ROOT` pour les tests seulement), comme le moteur des contrôles ; la commande du glossaire, le parent du `.githooks/` par lequel elle est appelée. Jamais le dossier courant : lancés depuis un sous-dossier, ils lisent le bon état, la garde de cadrage refuse toujours un fichier de code hors fiche, et rien n'est écrit dans le sous-dossier. Appelés par un chemin qui passe par un lien symbolique, ils se lancent quand même : tout point d'entrée livré de `.githooks/` et `.claude/hooks/` (modules optionnels compris) compare les chemins réels des deux côtés (`realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))`), jamais une URL tirée de `process.argv[1]` ni un chemin réel à un chemin non résolu.
**Périmètre** : `.claude/hooks/` (sondage, garde de cadrage, glossaire, gardes de lecture et du shell), `.githooks/state.mjs`, `.githooks/glossary.mjs` ; pour le point d'entrée, tout script livré dans `.githooks/` et `.claude/hooks/` ; livré dans le gabarit.
**Source de vérité** : chaque hook (constante de racine), `.githooks/state.mjs` (point d'entrée), `.githooks/glossary.mjs` (point d'entrée), le point d'entrée de chaque script livré.
**Preuve** : tests du paquet et du moteur d'état ; un test parcourt les scripts du gabarit et refuse tout point d'entrée qui ne compare pas les chemins réels des deux côtés.
**Contrôle** : `tests-qua-044`
**Tests** : `packages/drwil/test/kit.test.mjs`, `.githooks/state.test.mjs`
**Origine** : les hooks trouvent la racine du projet par l'emplacement de leur fichier — « Tous les hooks d'agent livrés, et le moteur d'état quand un hook l'appelle, prennent pour racine le dossier qui contient leur `.claude/` ou `.githooks/`, jamais le dossier courant »
**Raison** : Constaté le 2026-10-16 : après un `cd` de l'agent, le rappel lisait un état absent et créait un `.drwil` parasite ; vérifié au chantier, la garde de cadrage ne refusait plus rien depuis un sous-dossier. Étendu le 2026-10-24 (PR #223, CI macOS rouge) : la correction par chemins réels n'avait pas été appliquée partout — le garde shell, la garde de commit, le rejeu des hooks de la branche principale, le suivi de PR et la création de release comparaient encore des URL et ne faisaient rien par un lien symbolique.

## QUA-045 — Windows et macOS testés à la release, Ubuntu seul à chaque PR
**Règle** : Propre au dépôt drwil (QUA-018). Sur une PR, la suite du kit (`kit-tests`) ne tourne que sur Ubuntu ; Windows et macOS y sont rapportés sous leur nom exigé par le ruleset de master mais sautent leurs étapes en disant pourquoi (notice). Sur une PR qui ne touche que `docs/**` et `.drwil/usage.jsonl`, Ubuntu saute aussi en le disant : le job `checks` y rejoue les contrôles (QUA-250). Un push sur une branche, master compris, ne rapporte et ne teste qu'Ubuntu. Le push d'un tag de release (`vX.Y.Z`, `vX.Y.Z-rc.N`) et un lancement manuel du workflow (`workflow_dispatch`) font tourner la suite sur Ubuntu, Windows et macOS. « Code touché » se lit sur tout le diff de la PR ; un diff illisible fait échouer le calcul, jamais une matrice devinée (QUA-013).
**Périmètre** : `.github/workflows/ia-first.yml` (jobs `matrice-os` et `kit-tests`), `.github/scripts/ci-multi-os.mjs`.
**Source de vérité** : `.github/scripts/ci-multi-os.mjs` (fonction `matrice`).
**Preuve** : tests du calcul et du workflow qui s'en sert.
**Contrôle** : `tests-qua-045`
**Tests** : `.github/scripts/ci-multi-os.test.mjs`
**Origine** : Windows et macOS testés seulement quand une PR touche du code — « Toute PR de code, et chaque push sur master, fait tourner la suite du kit sur Ubuntu, Windows et macOS ; Windows et macOS une seule fois par push »
**Raison** : Une PR de documentation attendait Windows (5 à 8 minutes) et macOS pour rien, deux fois par push ; tester à chaque PR de code désigne tout de suite le changement en cause d'un échec propre à un OS. Puis, mesure du 2026-11-07 : Windows (11 min 36) fixait la durée de chaque CI de code pour des échecs qui visaient surtout les tests eux-mêmes, pas le livrable ; Windows et macOS se testent donc là où la release se joue, sur son tag ou par un lancement manuel avant de la créer.

## QUA-046 — Fichiers de CI en YAML valide avant le push
**Règle** : Propre au dépôt drwil (QUA-018). Chaque fichier de CI du dépôt (`.github/workflows/*.yml`) et du gabarit (fichiers YAML sous `packages/drwil/templates/common/ci/`, lus par motif) est du YAML valide ; sinon le commit est refusé, avec le fichier et la ligne de l'erreur. Syntaxe seulement : la sémantique propre à GitHub Actions (expressions, clés inconnues) n'est pas vérifiée.
**Périmètre** : `.github/workflows/`, `packages/drwil/templates/common/ci/`.
**Source de vérité** : `.github/scripts/workflows-yaml.test.mjs` (parseur `yaml`, dépendance de dev du `package.json` racine).
**Preuve** : test qui parse chaque fichier couvert ; un cas négatif rejoue le `run:` non cité de l'incident.
**Contrôle** : `tests-qua-046`
**Tests** : `.github/scripts/workflows-yaml.test.mjs`
**Origine** : un workflow CI au YAML invalide est refusé avant le push — « Un fichier de CI du dépôt ou du gabarit qui n'est pas du YAML valide est refusé au commit, avec le fichier et la ligne de l'erreur »
**Raison** : Un `run:` non cité contenant « : » a rendu le workflow invalide : GitHub l'a rejeté en bloc, aucun job lancé, alors que les contrôles locaux étaient verts ; un contrôle placé dans ce workflow n'aurait pas tourné.

## QUA-047 — Une date seule ne réécrit pas un document installé
**Règle** : Livré à tout projet. Installer ou mettre à jour (`drwil init`, avec ou sans `--force`, et `npm run installer-depot` qui s'en sert) ne réécrit pas un fichier du gabarit déjà présent qui ne diffère du rendu que par ses dates (`{{date}}`) : le fichier et sa date d'origine sont gardés, le manifeste suit le fichier gardé. Dès que le reste du document change, il est réécrit avec la date du jour. La date n'est jamais retirée du document.
**Périmètre** : `packages/drwil/src/render.ts` (rendu et écriture des fichiers du gabarit), `outils/installer-depot.mjs` ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/src/render.ts` (`keepDate`).
**Preuve** : tests du paquet et de l'installateur du dépôt (vraie CLI).
**Contrôle** : `tests-qua-047`
**Tests** : `packages/drwil/test/kit.test.mjs`, `outils/installer-depot.test.mjs`
**Origine** : date gardée et feu vert de publication (0.6.5) — « Installer ou mettre à jour ne réécrit pas un document dont seule la date changerait : la date d'origine est gardée, une nouvelle date n'est écrite que si le reste du document change »
**Raison** : Chaque `npm run installer-depot` réécrivait la date de `docs/ia-first.md`, seul fichier changé : un faux changement à annuler à la main ou qui polluait le commit ; une mise à jour d'un projet faisait le même bruit sur ses documents datés.

## QUA-048 — Une clôture en un geste, ses pièges signalés avant le commit
**Règle** : Livré à tout projet. En CLOSING, `node .githooks/close.mjs` supprime la fiche active, retire sa ligne de l'index et consigne la consommation du chantier ; il ne commite, ne pousse, ne fusionne rien et n'écrit pas l'état. Il signale, avant le commit, ce qui ferait échouer la clôture : critère encore « contrat à créer » (avec l'ID à écrire), références à la fiche qui deviendraient mortes, noms de fichiers sans chemin dans les documents modifiés ; les mêmes signaux sont donnés par `--check` (sans rien écrire) et au passage de BUILD à EVIDENCE, tant que le code peut encore changer. Au lancement du chantier suivant, les branches locales déjà fusionnées dans la branche principale sont supprimées (`git branch -d`, ou `git branch -D` quand une PR fusionnée prouve la fusion par squash, QUA-058) — jamais la branche principale, la courante, une branche encore au sommet de la principale ni une branche non fusionnée.
**Périmètre** : `.githooks/close.mjs` (commande de clôture), `.githooks/close-branches.mjs` (suppression des branches fusionnées, exports repris par `.githooks/close.mjs`), `.githooks/state.mjs` (`start`, `move`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/close.mjs`, `.githooks/close-branches.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (fusions, branches, journaux de session).
**Contrôle** : `tests-qua-048`
**Manuel** : un essai réel d'une clôture depuis BUILD, en suivant seulement les messages, aboutit sans lire le code, sous Copilot CLI ou en terminal ; l'essai sous Claude Code est reporté (attestation humaine : `drwil attest QUA-048`).
**Couvre** : `.githooks/close.mjs`, `.githooks/close-branches.mjs`, `.githooks/state.mjs`
**Tests** : `.githooks/close.test.mjs`, `.githooks/close-branches.test.mjs`
**Origine** : clôture allégée (0.6.5) — « Une commande de clôture fait la mécanique d'un geste — fiche supprimée, ligne d'index retirée, consommation consignée — et signale avant le commit ce qui ferait échouer la clôture ; les branches locales déjà fusionnées sont supprimées au lancement du chantier suivant »
**Raison** : Relevé dans la session de la 0.6.4 : la clôture coûtait des gestes et des reprises sans gain de qualité — un commit à part pour citer l'ID d'un contrat créé, des références à une fiche supprimée restées fausses, un commit de clôture refusé pour un nom de fichier sans chemin, 53 branches fusionnées jamais supprimées.

## QUA-049 — Le code cite le contrat qu'il sert, jamais une fiche de chantier
**Règle** : Livré à tout projet. Un commentaire de fichier de code ne cite pas une fiche de chantier (`docs/projects/<fiche>.md`, hors index, journal, modèles et fiches permanentes) : la fiche est supprimée à la clôture, la citation deviendrait fausse. check-docs le refuse dans un fichier modifié (réglage `newRequirements` : `blocking` ; sinon un avertissement), donc dès le BUILD ; au commit, les citations des fichiers non modifiés sont résumées en un avertissement ; la clôture refuse toutes les citations, fichier modifié ou non (QUA-074).
**Périmètre** : `.githooks/check-code-rules.mjs` (`briefReferences`, `briefReferenceProblems`), `.githooks/check-docs.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/check-code-rules.mjs`.
**Preuve** : tests des hooks, dont check-docs lancé sur un vrai dépôt git temporaire.
**Contrôle** : `tests-qua-049`
**Tests** : `.githooks/check-code-rules.test.mjs`
**Origine** : clôture allégée (0.6.5) — « Un fichier de code cite le contrat qu'il sert, jamais une fiche de chantier : signalé dès le BUILD, quand on peut encore le corriger »
**Raison** : En CLOSING aucun fichier de code ne peut changer : deux commentaires de test citant une fiche supprimée à la 0.6.4 sont restés faux. Décision du demandeur du 2026-10-18 : le code cite le contrat, pas la fiche.

## QUA-050 — Un détour pour une correction intercalée, sans élargir le chantier
**Règle** : Livré à tout projet. En BUILD, un défaut préalable hors du cadrage de la fiche active se corrige par un détour, que l'agent ouvre seul : `node .githooks/detour.mjs open <nom> --title <défaut>` met le travail en cours de côté (stash nommé, enregistré dans l'état, jamais à la main), crée la branche `detour/<nom>` depuis la branche principale (distante si elle existe) et sa fiche courte (la correction et son test), et pointe l'état sur elle ; le détour ne sert pas à élargir la fiche d'origine : ce cadrage ne s'élargit que par un commit de cadrage séparé, que la barrière rend visible (QUA-213, QUA-214). La PR du détour est intitulée « Détour de <fiche> », au mode de fusion décidé au lancement, et porte son entrée de journal et la suppression de sa fiche. `node .githooks/detour.mjs resume` n'accepte qu'un arbre propre et une PR fusionnée (fiche retirée, journal qui cite la branche) : il revient sur la branche du chantier, la rebase sur la branche principale corrigée (un commit rejoué garde son trailer `Drwil-Brief`), restaure le travail et remet l'état en BUILD sur la fiche d'origine ; toute étape qui échoue est refusée sans rien perdre (état inchangé, mise de côté intacte). Pendant un détour, aucune transition sauf l'abandon en SCOPING. Un détour qui change les règles du jeu (contrat existant du registre modifié ou retiré, hook, seuil, barrière, CI) voit ses commits refusés par la barrière de périmètre jusqu'au oui de l'humain ; un ajout pur au registre (nouveaux contrats, d'ID jamais définis, chaque bloc existant, préambule compris, gardé mot pour mot, jugé sur le contenu indexé contre HEAD) passe sans ce oui, et dans le doute (registre créé ou retiré, titre répété, section qui n'est pas un contrat) le oui reste demandé (`node .githooks/detour.mjs allow`, terminal interactif seulement) ; en file, le sous-agent s'arrête.
**Périmètre** : `.githooks/detour.mjs` (commande de détour), `.githooks/scope-gate.mjs` (exception des règles du jeu, ajout pur au registre, trailer gardé au rebase), `.githooks/detour.mjs` (`contractsAddedOnly`), `.githooks/state.mjs` (`setDetour`, validation, transitions) ; livré dans le gabarit.
**Source de vérité** : `.githooks/detour.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (mise de côté, branches, fusion, rebase, dépôt distant, hook prepare-commit-msg réel) et du paquet (livraison).
**Contrôle** : `tests-qua-050`
**Tests** : `.githooks/detour.test.mjs`, `.githooks/state.test.mjs`, `.githooks/scope-gate.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : un détour pour une correction intercalée (0.6.5) — « En plein chantier, l'agent ouvre seul un détour pour un défaut hors du cadrage : le travail en cours est mis de côté et restauré par l'outil (jamais perdu), la correction passe par sa propre branche partie de la branche principale, sa fiche courte (correction et son test), sa PR marquée « détour de <fiche> » au mode de fusion décidé au lancement, et son entrée de journal ; à la reprise, la branche du chantier part de la branche principale corrigée et l'état revient en BUILD sur la fiche d'origine. Un détour qui changerait un contrat existant, un hook, un seuil ou la barrière demande le oui de l'humain ; en file, le sous-agent s'arrête alors »
**Raison** : Point 8 de la clôture allégée (0.6.5) : en plein chantier, un défaut préalable hors du cadrage obligeait l'agent à élargir un cadrage sans rapport ou à s'arrêter ; il improvisait stash, allers-retours de branche et retours en cadrage à la main.

## QUA-051 — Une version candidate en pré-release, avec sa fiche de recette générée
**Règle** : Livré à tout projet avec le module de release (optionnel). `node .githooks/create-release.mjs --candidate` publie la version en pré-release GitHub `vX.Y.Z-rc.N` (N un de plus que la plus haute candidate de la version), avec son tarball et sa fiche de recette en Markdown, jointe et en note de la pré-release, générée par `.githooks/acceptance-sheet.mjs` (jamais écrite à la main) du dernier tag définitif à la candidate — une candidate n'est jamais le dernier tag définitif. Tarballs et fiche sont produits avant le tag : un échec ne laisse aucun tag. `--candidate --dry-run` montre la version et la fiche sans rien construire ni publier. Aucun fichier suivi n'est modifié (QUA-017).
**Périmètre** : `.githooks/create-release.mjs` (`--candidate`, `candidateTag`), `.githooks/acceptance-sheet.mjs` ; module optionnel livré dans le gabarit (`templates/common/optional/create-release/`).
**Source de vérité** : `.githooks/create-release.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (origin nu local, gh et npm simulés) et du paquet (module livré, jamais copié par défaut, `--candidate --dry-run` dans un projet installé).
**Contrôle** : `tests-qua-051`
**Tests** : `.githooks/create-release.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : une recette par version, pour une équipe hors dépôt (0.6.5) — « Une version candidate est publiée en pré-release GitHub (par exemple v0.6.5-rc.1), avec son tarball et une fiche de recette en Markdown générée (jamais écrite à la main) du dernier tag définitif à la candidate, lisible sans Git »
**Raison** : Une équipe de recette, qui ne lit pas le dépôt, valide chaque version ; son approbation conditionne la publication : elle teste le tarball avant la release définitive.

## QUA-052 — La fiche de recette dit quoi valider, puis ce que la non-régression a prouvé
**Règle** : En tête de la fiche, « à valider » : un point par critère humain des fiches des chantiers de la plage (chacune lue dans sa dernière version : au commit de la candidate, sinon juste avant le commit qui l'a supprimée, jamais à un commit de fusion), par limite connue de l'entrée de journal (« pas encore essayé en réel » si elle parle d'un essai en réel ; une phrase de besoin ou de décision ne devient jamais un point), et par contrat dont l'attestation est à refaire (statut MANUAL de `drwil verify`) ; chacun dit quoi regarder et comment, porte un identifiant stable `vX.Y.Z-P<n>` et le lien vers la PR de son chantier, retrouvée par le trailer `Drwil-Brief` des commits (commit de fusion ou squash). En dessous, la non-régression : verdict de `drwil verify` (paquet local ; non exécuté = « non disponible », jamais un succès, QUA-013), jugé hors d'un contrat qui n'échoue que par son contrôle `main-branch` (QUA-017 : une release se crée toujours sur la branche principale), que la fiche nomme ; tout autre échec, une erreur ou un critère ouvert garde le verdict de verify ; nombre, ID et libellés des contrats qui passent et citent un test, OS des jobs de CI réussis sur le commit, empreinte sha256 de chaque tarball. Ne cite que des sources existantes ; aucune donnée nominative.
**Périmètre** : `.githooks/acceptance-sheet.mjs` ; module optionnel livré dans le gabarit.
**Source de vérité** : `.githooks/acceptance-sheet.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (fusion par PR, squash, fiche supprimée, fiche cadrée sur la branche principale puis corrigée sur la branche du chantier, journal), gh et verify simulés ; les trois défauts de la fiche réelle de `v0.6.5-rc.1` (verify en échec pour QUA-017 seul, phrases de décision prises pour des essais réels, critères lus dans une fiche périmée) y sont rejoués.
**Contrôle** : `tests-qua-052`
**Tests** : `.githooks/acceptance-sheet.test.mjs`
**Origine** : une recette par version, pour une équipe hors dépôt (0.6.5) — « En tête de la fiche, « à valider » : chaque point dit quoi regarder et comment — critères marqués humain, attestations à refaire, ce qui n'a pas été essayé en réel, limites connues — et porte un identifiant stable (version et numéro de point) et le lien vers la PR de son chantier (retrouvée par le trailer Drwil-Brief des commits) ; en dessous, la non-régression : verdict de drwil verify, nombre de contrats prouvés par un test, leurs ID et libellés, OS testés par la CI, et l'empreinte du tarball »
**Raison** : L'équipe de recette doit savoir en quelques minutes ce qu'elle a à valider, et ce que la non-régression automatique a déjà prouvé, pour ne pas tout retester.

## QUA-053 — Le verdict de recette est un geste humain, enregistré sur la candidate
**Règle** : `node .githooks/release-verdict.mjs <vX.Y.Z-rc.N>` enregistre le verdict : `--approve` (approuvée), `--reserve <point>` (approuvée avec réserves) ou `--refuse <point>` (refusée), chaque point cité devant exister dans la fiche de la candidate. Geste humain, comme `drwil attest` : refusé hors d'un terminal interactif et sans le nom de la candidate retapé ; un agent ne l'exécute jamais. Refusé sur une release qui n'est pas une pré-release, ou qui a déjà un verdict. Le verdict garde qui l'a donné (identité GitHub seulement) et quand ; il est enregistré sur la pré-release (asset recette-verdict.json, résumé ajouté à sa note), jamais dans un commit (QUA-017). Chaque réserve et chaque refus devient une issue qui cite son point.
**Périmètre** : `.githooks/release-verdict.mjs` ; module optionnel livré dans le gabarit ; `AGENTS.md`.
**Source de vérité** : `.githooks/release-verdict.mjs`.
**Preuve** : tests des hooks (gh simulé, terminal interactif simulé).
**Contrôle** : `tests-qua-053`
**Tests** : `.githooks/release-verdict.test.mjs`
**Origine** : une recette par version, pour une équipe hors dépôt (0.6.5) — « Une commande humaine enregistre le verdict de recette sur la candidate : approuvée, approuvée avec réserves (chaque réserve citée par l'identifiant de son point) ou refusée (chaque point refusé cité) ; un agent ne l'exécute jamais ; le verdict garde qui l'a donné et quand »
**Raison** : Décision du demandeur du 2026-10-18 : l'approbation de la recette conditionne la publication ; un verdict donné par l'agent ne serait que sa parole.

## QUA-054 — Seule une candidate approuvée est promue, avec le même tarball
**Règle** : `node .githooks/promote-release.mjs <vX.Y.Z-rc.N>` refuse une candidate sans verdict ou refusée, une version définitive qui existe déjà, une fiche absente, et un tarball dont l'empreinte diffère de la fiche. Approuvée, avec ou sans réserves, elle pose le tag `vX.Y.Z` sur le commit de la candidate, le pousse, et crée la release définitive (`latest`) avec le même tarball, les réserves et leurs issues listées dans sa note, puis ouvre une PR qui porte la note de recette de la version dans le dépôt (QUA-078) ; l'échec de cette PR ne défait pas ce qui est publié (QUA-080). Elle ne modifie aucun fichier suivi de la branche courante. `--dry-run` montre ce que ferait la promotion, note comprise, sans rien publier. La recette « corriger un défaut » dit comment ranger chaque issue de réserve ou de refus : défaut à corriger (une régression) ou intention (un manque).
**Périmètre** : `.githooks/promote-release.mjs`, `.githooks/recette-note.mjs` ; module optionnel livré dans le gabarit ; recette « corriger un défaut ».
**Source de vérité** : `.githooks/promote-release.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (origin nu local), gh simulé.
**Contrôle** : `tests-qua-054`
**Tests** : `.githooks/promote-release.test.mjs`
**Origine** : une recette par version, pour une équipe hors dépôt (0.6.5) — « La promotion refuse une candidate sans verdict, ou refusée ; approuvée, avec ou sans réserves, elle crée la release définitive sur le même commit avec le même tarball (même empreinte), les réserves listées dans la note de release ; chaque réserve et chaque refus devient une issue, que la recette « corriger un défaut » dit comment ranger : défaut à corriger (une régression) ou intention (un manque) »
**Raison** : Ce que la recette a validé doit être exactement ce qui est publié.

## QUA-055 — Les README pointent vers la dernière version validée, sans commit à chaque version
**Règle** : Les README du dépôt et du paquet pointent vers la dernière version validée par le lien fixe `https://github.com/wdubilly/drwil/releases/latest`, qui ne montre jamais une pré-release, et ne citent aucun lien de téléchargement d'une version précise : aucun commit à chaque version.
**Périmètre** : `README.md`, `packages/drwil/README.md`.
**Source de vérité** : `README.md`.
**Preuve** : test du paquet qui lit les deux README.
**Contrôle** : `tests-qua-055`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : une recette par version, pour une équipe hors dépôt (0.6.5) — « Les README pointent vers la dernière version validée par un lien fixe (releases/latest), qui ne montre jamais une pré-release : aucun commit à chaque version »
**Raison** : Un README qui cite une version doit être recommité à chaque release, et montrerait une candidate non validée.

## QUA-056 — Un push depuis un worktree ne touche jamais le dépôt principal
**Règle** : Un `git push` lancé depuis un worktree secondaire (`git worktree add`) laisse le dépôt principal identique : configuration commune (jamais `core.bare=true`), branches, index et arbre, même quand un contrôle lancé au pre-push fait `git init` ou `git add` dans un dossier temporaire.
**Périmètre** : `.githooks/pre-push`, `.githooks/run-checks.mjs`, `.githooks/engine.mjs` (gabarit et copies du dépôt).
**Source de vérité** : `.githooks/engine.mjs` (lanceur des contrôles, voir QUA-057).
**Preuve** : test qui rejoue l'incident du 2026-10-18 dans un dépôt jetable : push depuis un worktree, contrôle hostile, dépôt principal photographié avant et après.
**Contrôle** : `tests-qua-056`
**Tests** : `.githooks/run-checks.test.mjs`
**Origine** : un push depuis un worktree ne touche jamais le vrai dépôt (0.6.6) — « Un push depuis un worktree d'un dépôt jetable laisse le dépôt principal identique (configuration, branches, index, arbre) ; le test rejoue l'incident du 2026-10-18 et échoue sans le correctif »
**Raison** : Le 2026-10-18, un push depuis un worktree a écrit `core.bare=true` dans la configuration commune et sali l'index : un simple push peut abîmer le dépôt et casser un chantier en cours.

## QUA-057 — Le lanceur des contrôles retire les GIT_* de leur environnement
**Règle** : Le lanceur des contrôles (`.githooks/engine.mjs`, partagé par les hooks et `drwil verify`) retire les variables `GIT_*` de l'environnement de chaque contrôle qu'il lance (tests des contrôles, contrôles du socle, contrôles déclarés par le projet), quel que soit le fichier de test ; les hooks eux-mêmes les gardent. Seule exception : gitleaks, qui ne fait que lire le dépôt et doit voir l'index du commit en cours (`GIT_INDEX_FILE` sous `git commit -a`).
**Périmètre** : `.githooks/engine.mjs` (gabarit et copie du dépôt).
**Source de vérité** : `.githooks/engine.mjs` (fonction `launch`).
**Preuve** : test du moteur qui lance chaque sorte de contrôle avec `GIT_DIR`, `GIT_INDEX_FILE` et `GIT_WORK_TREE` posés.
**Contrôle** : `tests-qua-057`
**Tests** : `.githooks/engine.test.mjs`
**Origine** : un push depuis un worktree ne touche jamais le vrai dépôt (0.6.6) — « Le lanceur des contrôles retire les variables GIT_* de l'environnement de chaque contrôle qu'il lance, quel que soit le fichier de test »
**Raison** : Retirer les `GIT_*` dans chaque fichier de test ne tient pas : un fichier ajouté sans ce retrait (`.githooks/check-architecture.test.mjs`, `outils/verifier-miroirs.test.mjs`, `outils/verifier-tests-contrats.test.mjs`) a suffi à rejouer l'incident.

## QUA-058 — Une branche dont la PR est fusionnée sur GitHub est reconnue fusionnée, squash compris
**Règle** : Livré à tout projet. Une seule fonction dit si une branche est fusionnée dans la branche principale (`branchMerged`), partagée par le ménage des branches au lancement (QUA-048) et la reprise d'un détour (QUA-050) : fusionnée si git la voit dans la branche principale (fusion classique), ou si une PR fusionnée de cette branche, lue par `gh pr list --state merged`, porte son dernier commit (fusion par squash comprise) ; une branche qui a reçu des commits après sa PR n'est pas fusionnée. Une branche ainsi prouvée est supprimée au lancement suivant (`git branch -D`, sur la seule preuve de `gh`) et acceptée par la reprise d'un détour. Une seule question à `gh` pour toutes les branches du ménage, posée seulement si git ne suffit pas.
**Périmètre** : `.githooks/close-branches.mjs` (`mergedPullRequests`, `branchMerged`, `pruneMergedBranches`, repris par `.githooks/close.mjs`), `.githooks/detour.mjs` (`resume`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/close-branches.mjs` (`branchMerged`).
**Preuve** : tests des hooks sur de vrais dépôts git temporaires, fusions par squash, `gh` simulé (PR au même commit, branche allée plus loin, PR d'un autre commit).
**Contrôle** : `tests-qua-058`
**Tests** : `.githooks/close-branches.test.mjs`, `.githooks/detour.test.mjs`
**Origine** : les branches fusionnées par squash reconnues (0.6.6) — « Une branche dont la PR est fusionnée sur GitHub (y compris par squash) est reconnue fusionnée : supprimée au lancement suivant, et acceptée par la reprise d'un détour »
**Raison** : Point de recette v0.6.5-P8 : pour une équipe qui fusionne par squash, git ne voit jamais la branche fusionnée — elle n'était jamais supprimée et un détour ne pouvait pas reprendre.

## QUA-059 — Sans gh joignable, seule la fusion classique est reconnue, et c'est dit
**Règle** : Livré à tout projet. Quand `gh` ne répond pas (absent, non connecté, hors GitHub, trop lent), la reconnaissance d'une branche fusionnée (QUA-058) se replie sur git seul (fusion classique) : aucune branche non fusionnée aux yeux de git n'est supprimée, et le lancement dit « gh injoignable » en nommant les branches gardées ; la reprise d'un détour est refusée en disant de même, état et mise de côté intacts.
**Périmètre** : `.githooks/close-branches.mjs` (`branchMerged`, `pruneMergedBranches`, `prunedMessage`, repris par `.githooks/close.mjs`), `.githooks/detour.mjs` (`resume`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/close-branches.mjs` (`branchMerged`).
**Preuve** : tests des hooks sur de vrais dépôts git temporaires, `gh` simulé muet puis le vrai `gh` hors GitHub.
**Contrôle** : `tests-qua-059`
**Tests** : `.githooks/close-branches.test.mjs`, `.githooks/detour.test.mjs`
**Origine** : les branches fusionnées par squash reconnues (0.6.6) — « Sans `gh` joignable, la reconnaissance se replie sur git (fusion classique seulement) et le dit clairement, sans jamais supprimer une branche non fusionnée »
**Raison** : La PR fusionnée via `gh` fait foi (décision du demandeur, 2026-10-19) ; sans elle, rien ne prouve une fusion par squash, et supprimer une branche sur un doute pourrait perdre du travail.

## QUA-060 — Un outil n'est tenu que prouvé par le banc, jamais présumé
**Règle** : Propre au dépôt drwil (QUA-018). `node outils/banc-agents.mjs` installe drwil dans un projet temporaire (jamais dans le dépôt) en SCOPING, demande à l'agent réel, en mode non interactif, d'écrire un fichier de code, et rend par outil : hooks lancés, écriture refusée ou acceptée, rappel d'état reçu ou non. Un outil n'est « conforme » que si son hook d'écriture a été lancé, le fichier est absent et le rappel est reçu : un refus sans hook lancé (l'agent a obéi aux consignes) est « non éprouvé ». Un outil absent du poste ou dont le lancement n'est pas défini est « non testé », jamais « conforme ».
**Périmètre** : `outils/banc-agents.mjs`.
**Source de vérité** : `outils/banc-agents.mjs` (`analyser`, `essayer`).
**Preuve** : tests du banc avec un exécuteur simulé (aucun vrai agent) ; l'essai sur l'outil réel est un geste du poste.
**Contrôle** : `tests-qua-060`
**Manuel** : lancer le banc sur le poste et attester le résultat (colonne « Attested by the human » de la matrice).
**Couvre** : `outils/banc-agents.mjs`
**Tests** : `outils/banc-agents.test.mjs`
**Origine** : compatibilité des agents, le socle commun (0.6.7) — « Le banc installe drwil dans un projet temporaire en SCOPING, lance l'agent demandé en mode non interactif avec une consigne d'écriture de code, et rend pour chaque outil : hooks lancés ou non, écriture refusée ou acceptée, rappel d'état reçu ou non ; un outil absent du poste est signalé « non testé », jamais « conforme » »
**Raison** : Sous Copilot CLI et Gemini CLI, essais du 2026-10-18 : rien n'arrêtait l'écriture de code hors chantier, sans que rien ne le signale ; sans preuve par outil réel, une simulation en CI ne dit pas que l'outil lance le hook.

## QUA-061 — En SCOPING, une intention se cadre, une demande de réalisation se code
**Règle** : Livré à tout projet. `AGENTS.md` dit qu'en SCOPING un besoin exprimé par l'humain se cadre (intention ou fiche) et ne se code pas, et qu'en cas de doute l'agent demande « intention ou demande de réalisation ? » avant d'agir. La règle est dans `AGENTS.md`, lu par tous les outils (consigne seulement : elle ne remplace pas le blocage par hook, QUA-060).
**Périmètre** : `AGENTS.md`, `docs/ia-first/8-conduct-rules.md` ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/AGENTS.md`, `packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md`.
**Preuve** : test du paquet qui installe un projet et lit la règle dans son `AGENTS.md`.
**Contrôle** : `tests-qua-061`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : compatibilité des agents, le socle commun (0.6.7) — « `AGENTS.md` dit qu'en SCOPING un besoin exprimé se cadre (intention ou fiche) et ne se code pas, et qu'en cas de doute l'agent demande « intention ou demande de réalisation ? » avant d'agir »
**Raison** : Essais du 2026-10-18 : aucun outil autre que Claude Code ne distinguait une intention d'une demande de réalisation, et l'agent codait dès qu'un besoin était exprimé.

## QUA-062 — Chaque en-tête de skill se lit en YAML strict
**Règle** : Livré à tout projet. L'en-tête YAML de chaque `.claude/skills/<skill>/SKILL.md` se lit en YAML strict ; un en-tête invalide (valeur non citée contenant « : » ou « # », caractère réservé en tête, guillemet mal refermé, ligne illisible, en-tête non refermé) est refusé au commit par `.githooks/check-docs.mjs`, avec le fichier et la ligne. Le contrôle ne demande aucune bibliothèque YAML et est vérifié contre le vrai parseur dans les tests.
**Périmètre** : `.githooks/skill-headers.mjs`, `.githooks/check-docs.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/skill-headers.mjs` (`headerProblems`, `skillHeaderProblems`).
**Preuve** : tests qui comparent le contrôle au parseur `yaml` sur chaque skill livré, un cas négatif rejoue l'en-tête de `start-a-workstream`, et un projet installé qui refuse le commit.
**Contrôle** : `tests-qua-062`
**Tests** : `.githooks/skill-headers.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : compatibilité des agents, le socle commun (0.6.7) — « Chaque en-tête de skill livré se lit en YAML strict ; un en-tête invalide est refusé au commit, et `start-a-workstream` apparaît dans `copilot skill list` »
**Raison** : Sous Copilot CLI, un en-tête invalide en YAML strict fait disparaître le skill sans que rien ne le signale ; celui de `start-a-workstream` l'était (« : » dans la description).

## QUA-063 — La matrice de compatibilité dit ce qui est tenu, outil par outil, avec sa date d'essai
**Règle** : Livré à tout projet. `docs/ia-first/6-limits-and-tool-compatibility.md` porte une matrice qui donne, pour chaque outil (Claude Code, Copilot CLI, Gemini CLI, Codex, Cursor), les hooks lancés, l'écriture en SCOPING, le rappel d'état, la date et la version de l'essai, et l'attestation humaine ; un outil jamais essayé y est « not tested », jamais « tenu ». Un second tableau, « Workstream cycle parity », dit par outil le sondage de lancement, la file et le contexte neuf par chantier (sous-agent ou nouvelle conversation) ; il ne date aucun essai que le banc n'a pas fait, et la matrice dit que le `packages/drwil/templates/common/tools/codex/.codex/hooks.json` livré pour Codex (état et rappel, soumis à `/hooks`) ne le rend pas « tenu ».
**Périmètre** : `docs/ia-first/6-limits-and-tool-compatibility.md` ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/docs/ia-first/6-limits-and-tool-compatibility.md` (section « Tool compatibility matrix »).
**Preuve** : test qui lit la matrice : une ligne par outil, date et version si essayé, « not tested » sinon.
**Contrôle** : `tests-qua-063`
**Manuel** : l'attestation de chaque ligne par l'humain (colonne « Attested by the human »), après un essai du banc sur son poste.
**Couvre** : `docs/ia-first/6-limits-and-tool-compatibility.md`
**Tests** : `outils/banc-agents.test.mjs`
**Origine** : compatibilité des agents, le socle commun (0.6.7) — « La matrice de compatibilité (`docs/ia-first.md`) donne, outil par outil, ce qui est réellement tenu, et sa date d'essai »
**Raison** : Dire qu'un outil est compatible sans l'avoir mesuré est la même erreur qu'une doc fausse : la matrice est remplie par le banc, pas par la mémoire de l'agent.
**Modifié** : 2026-11-02 — tableau « Workstream cycle parity » et `packages/drwil/templates/common/tools/codex/.codex/hooks.json` livré pour Codex sans le dire tenu (chantier « parité des outils », lot 3).

## QUA-064 — Choisir Copilot installe aussi l'arbre `.claude` et les hooks natifs de Copilot
**Règle** : Livré à tout projet. Quand `copilot` est parmi les outils, `drwil init` installe aussi `.claude/` (réglages, hooks, skills) — Copilot CLI le lit lui-même, ce qui lui donne le blocage d'écriture (QUA-016) et les commandes `/drwil-*` — et les hooks natifs de Copilot (dossier .github/hooks), qui donnent l'état au démarrage de session et le rappel d'état à chaque message. Le pointeur `CLAUDE.md` reste lié au seul outil `claude`.
**Périmètre** : `packages/drwil/src/config.ts` (`usesClaudeTree`), `packages/drwil/src/render.ts`, `packages/drwil/src/drift.ts`, `packages/drwil/src/essentials.ts` ; `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json`.
**Source de vérité** : `packages/drwil/src/config.ts` (`usesClaudeTree`).
**Preuve** : test du paquet qui installe un projet avec le seul outil `copilot` et y trouve les hooks, les réglages, les skills et les hooks natifs, sans `CLAUDE.md`.
**Contrôle** : `tests-qua-064`
**Manuel** : un `/drwil-start` tapé dans Copilot CLI interactif lance un chantier (le banc ne lance que le mode non interactif).
**Couvre** : `packages/drwil/src/config.ts`, `packages/drwil/src/render.ts`, `packages/drwil/src/drift.ts`, `packages/drwil/src/essentials.ts`, `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : compatibilité des agents, volet Copilot (0.6.7) — « Copilot lit `.claude/` : hooks, réglages et skills lui sont donnés, et ses hooks natifs apportent l'état et le rappel »
**Raison** : Essais du 2026-10-18 : `--tools copilot` n'installait que des consignes, donc aucun hook ni commande `/drwil-*` ; l'écriture de code hors chantier n'était arrêtée par rien.

## QUA-065 — Les hooks de Copilot parlent son format, sans jamais bloquer
**Règle** : Livré à tout projet. `node .githooks/state.mjs copilot-start` rend `{"additionalContext": <état>}` et `copilot-message` rend `{"modifiedTransformedPrompt": <rappel> + message}` (le rappel une seule fois par changement d'état), seuls formats que Copilot lit. Aucun ne rend d'erreur ni n'attend une entrée qui ne se ferme pas : l'entrée est lue dès que son JSON est complet, avec un délai de repli de 2 s. `scope-reminder` lit le fichier sous `path` (Copilot) comme sous `file_path` (Claude).
**Périmètre** : `.githooks/state-cli.mjs`, `.githooks/state.mjs` ; `.claude/hooks/scope-reminder.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/state-cli.mjs` (`main`, `readStdinJson`).
**Preuve** : tests des deux modes (rappel, une seule fois, entrée vide ou invalide, entrée jamais fermée) ; essai réel du banc sur Copilot (hooks lancés, écriture refusée, rappel reçu).
**Contrôle** : `tests-qua-065`
**Tests** : `.githooks/state.test.mjs`
**Origine** : compatibilité des agents, volet Copilot (0.6.7) — « le rappel d'état est reçu au démarrage et à chaque message, aucun hook ne dépasse le délai »
**Raison** : `.githooks/state.mjs` imprimait du texte brut que Copilot ignore (rappel jamais reçu), et `scope-reminder` lisait `file_path` alors que Copilot envoie `path` (l'écriture n'était jamais refusée) ; un hook qui attend son entrée sans fin est laissé passer au délai (30 s).

## QUA-004 — Seuil de couverture de test
**Règle** : La couverture de test ne descend pas sous le seuil déclaré pour chaque périmètre, et un seuil ne redescend jamais (cible 100 %). `packages/drwil` (`packages/drwil/src/` compilé et `packages/drwil/bin/`, tout fichier compté même jamais importé par les tests, `--all`) : 98 % lignes, 90 % branches, 98 % fonctions (relevé le 2026-10-30 aux chiffres mesurés ; cible 100 % — voir `docs/intentions/couverture-paquet-100.md`) ; hooks Claude du gabarit (`packages/drwil/templates/common/tools/claude/.claude/hooks/*.mjs`) et module optionnel front (`packages/drwil/templates/common/optional/front-quality/*.mjs`) : 97 % lignes et instructions, 88 % branches, 93 % fonctions (niveau réel du 2026-10-30) ; hooks de gouvernance (`.githooks/*.mjs`) à 100 % lignes, branches, fonctions et instructions (voir `docs/projects/journal.md`, 2026-10-11). Les hooks du gabarit (`packages/drwil/templates/`) sont exclus de la mesure du paquet : leurs copies sont mesurées à 100 % par le dépôt.
**Périmètre** : `packages/drwil` (code du générateur), `.githooks/*.mjs` (hooks de ce dépôt, mesurés avec leurs tests `.githooks/*.test.mjs`), hooks Claude et module front du gabarit (mesurés avec `packages/drwil/test/claude-hooks.test.mjs` et `packages/drwil/test/front-quality.test.mjs`).
**Source de vérité** : `packages/drwil/package.json` (script `test:coverage`) et `package.json` (scripts `test:hooks:coverage` et `test:claude:coverage`), options `c8`.
**Preuve** : Hook + CI (`.drwil/ia-first.json` → `checks`, job `checks`).
**Contrôle** : `couverture-tests`, `couverture-hooks`, `couverture-claude`
**Raison** : Sans seuil vérifié, la couverture peut régresser silencieusement à chaque ajout de code, et du code livré hors mesure n'échoue jamais.

## QUA-001 — Fichier de code plafonné
**Règle** : Un fichier de code ne dépasse pas 200 lignes, tests exclus ; un fichier déjà au-dessus au 2026-10-27 est plafonné à sa taille mesurée ce jour-là et ne peut que maigrir (`.githooks/check-file-size.legacy.json`). Le livrable propose 200 lignes à l'adoption (recette d'adoption, catalogue, exemple du script) ; le défaut du script livré reste 400 sans plafond donné, pour ne casser aucun projet déjà adopté.
**Périmètre** : `packages/drwil/src/` (fichiers ts), `packages/drwil/bin/` (fichiers js), `.githooks/`, `outils/`, `.claude/hooks/` et les hooks d'agent du gabarit `packages/drwil/templates/common/tools/claude/.claude/hooks/` (fichiers mjs).
**Source de vérité** : `.drwil/ia-first.json` → `checks` (contrôle `taille-fichiers`), `.githooks/check-file-size.mjs`.
**Preuve** : Hook + CI (`.drwil/ia-first.json` → `checks`, job `checks`).
**Tests** : `.githooks/check-file-size.test.mjs`
**Contrôle** : `taille-fichiers`, `tests-qua-001`
**Raison** : Un fichier géant mêle plusieurs sujets ; chaque changement y coûte plus cher à écrire et à relire.

## QUA-066 — Choisir Gemini installe aussi les hooks partagés et ses réglages natifs
**Règle** : Livré à tout projet. Quand `gemini` est parmi les outils, `drwil init` installe `.gemini/settings.json` — les hooks natifs de Gemini CLI : état au démarrage de session, rappel d'état à chaque message, et le même script `scope-reminder` avant et après `write_file` et `replace` — et les scripts partagés du dossier `.claude/hooks` (un seul jeu pour tous les outils, seule la déclaration diffère). Le pointeur `CLAUDE.md` reste lié au seul outil `claude`.
**Périmètre** : `packages/drwil/src/config.ts` (`usesClaudeTree`), `packages/drwil/templates/common/tools/gemini/.gemini/settings.json`.
**Source de vérité** : `packages/drwil/templates/common/tools/gemini/.gemini/settings.json`.
**Preuve** : test du paquet qui installe un projet avec le seul outil `gemini` et y trouve les réglages natifs, les hooks partagés et `GEMINI.md`, sans `CLAUDE.md`.
**Contrôle** : `tests-qua-066`
**Manuel** : approuver le dossier dans une session Gemini CLI interactive (sans cela, Gemini ne lance aucun hook du dépôt).
**Couvre** : `packages/drwil/src/config.ts`, `packages/drwil/templates/common/tools/gemini/.gemini/settings.json`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : compatibilité des agents, volet Gemini (0.6.7) — « Sous Gemini CLI, en SCOPING, une écriture de fichier de code (`write_file`, `replace`) est refusée avec le motif drwil »
**Raison** : Essai du 2026-10-18 : `--tools gemini` ne posait que `GEMINI.md`, aucun hook ; sonde du 2026-10-19 : Gemini ne charge les hooks d'un dépôt que dans un dossier de confiance (`--skip-trust` seul ne suffit pas), et lit `GEMINI_PROJECT_DIR`.

## QUA-067 — Les hooks de Gemini parlent son format : refus d'écriture et rappel d'état
**Règle** : Livré à tout projet. `scope-reminder` refuse `write_file` et `replace` en rendant `{"decision":"deny","reason":…}` sur l'événement `BeforeTool` (et rappelle après coup en mode avertissement, sur `AfterTool`) ; `node .githooks/state.mjs gemini-start` rend `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":<état>}}` et `gemini-message` rend le rappel sur `BeforeAgent`, une seule fois par changement d'état. Aucun ne rend d'erreur : au pire, rien.
**Périmètre** : `.githooks/state-cli.mjs`, `.githooks/state.mjs` ; `.claude/hooks/scope-reminder.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/state-cli.mjs` (`main`), `.claude/hooks/scope-reminder.mjs` (`remind`).
**Preuve** : tests des deux modes (rappel, une seule fois, racine inutilisable) et de `scope-reminder` (refus, avertissement, doc jamais refusée) ; essai réel du banc sur Gemini (hooks lancés, écriture refusée, rappel reçu).
**Contrôle** : `tests-qua-067`
**Manuel** : lancer le banc sur le poste et attester la ligne Gemini de la matrice.
**Couvre** : `.githooks/state-cli.mjs`, `.githooks/state.mjs`, `.claude/hooks/scope-reminder.mjs`
**Tests** : `.githooks/state.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : compatibilité des agents, volet Gemini (0.6.7) — « Gemini CLI reçoit le rappel d'état au démarrage et à chaque message »
**Raison** : `.githooks/state.mjs` imprimait du texte brut et `scope-reminder` rendait le format de Claude Code (`permissionDecision`), que Gemini ignore ; sans le format natif, ni refus ni rappel n'arrivent.

## QUA-068 — Le lancement d'un chantier sous Gemini est dit clairement dans la matrice
**Règle** : Livré à tout projet. Gemini CLI n'a pas de commande `/drwil-start` ici : la matrice de `docs/ia-first/6-limits-and-tool-compatibility.md` dit qu'un chantier s'y lance par `node .githooks/state.mjs start` dans un terminal interactif (décision humaine), puis que l'on travaille dans Gemini.
**Périmètre** : `docs/ia-first/6-limits-and-tool-compatibility.md` ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/docs/ia-first/6-limits-and-tool-compatibility.md` (section « Tool compatibility matrix »).
**Preuve** : test qui lit la matrice et y trouve la commande de lancement pour Gemini.
**Contrôle** : `tests-qua-068`
**Tests** : `outils/banc-agents.test.mjs`
**Origine** : compatibilité des agents, volet Gemini (0.6.7) — « Un chantier se lance depuis Gemini CLI : par son sondage s'il en a un, sinon par `node .githooks/state.mjs start` dans un terminal, dit clairement dans la matrice »
**Raison** : Sans cette consigne, l'utilisateur de Gemini ne sait pas comment passer en BUILD, et l'agent ne peut pas le faire à sa place (décision humaine).

## QUA-069 — Copilot CLI enchaîne deux chantiers d'un seul sondage, essai réel attesté
**Règle** : Un essai sous Copilot CLI réel, fait par l'humain, enchaîne deux fiches prêtes lancées d'un seul sondage (champ `drwil-merge` compris), mène chaque chantier dans un sous-agent qui porte les hooks et l'état, et s'arrête au premier blocage humain.
**Périmètre** : le sondage de lancement, l'état de gouvernance et la skill `/drwil-start` sous Copilot CLI ; l'essai se fait sur le poste de l'humain.
**Source de vérité** : `docs/ia-first/6-limits-and-tool-compatibility.md` (matrice de compatibilité, ligne Copilot CLI).
**Preuve** : attestation humaine de l'essai, avec la version de Copilot CLI et la date.
**Manuel** : l'essai lui-même, que seul l'humain peut faire et attester (`drwil attest QUA-069`).
**Couvre** : `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json`, `.githooks/state-cli.mjs`
**Origine** : 0.6.8, Copilot CLI enchaîne les chantiers sans interruption — « Un essai sous Copilot CLI réel enchaîne deux fiches prêtes d'un seul sondage et s'arrête au premier blocage humain »
**Raison** : Les hooks et les sous-agents de Copilot CLI ne se prouvent pas par un test local : sans essai réel, la compatibilité serait présumée, pas tenue (QUA-060).

## QUA-070 — `verify` dit s'il faut ajouter ou retirer `[humain]` sur un critère « not-durable »
**Règle** : Livré à tout projet. Pour un critère d'acceptation « not-durable », `verify` (sortie lisible, sortie pour agent, tableau des critères écrit à côté de l'évidence) nomme le contrat et dit quoi changer : ajouter `[humain]` quand le contrat est à attester (ligne **Manuel**, ou sans contrôle), le retirer quand le contrat est entièrement automatisé ; un seul message par sens, en français ou en anglais selon la langue du projet. Aucun message ne dit cela à l'élargissement du cadrage.
**Périmètre** : `packages/drwil/src/criteria.ts` (`durabilityHint`), `packages/drwil/src/verdict.ts`, `packages/drwil/src/agent.ts` ; code du paquet, livré avec lui.
**Source de vérité** : `packages/drwil/src/criteria.ts` (`durabilityHint`).
**Preuve** : tests du paquet : un message par sens dans le tableau et la sortie lisible, dans les deux langues.
**Contrôle** : `tests-qua-070`
**Tests** : `packages/drwil/test/criteria.test.mjs`
**Origine** : fluidité de la clôture (0.6.9) — « `verify` dit, pour un critère « not-durable », s'il faut ajouter `[humain]` (contrat à attester) ou le retirer (contrat entièrement automatisé), et nomme le contrat »
**Raison** : Relevé le 2026-10-19 : `verify` répondait seulement « not-durable » ; il fallait lire `packages/drwil/src/criteria.ts` pour comprendre qu'un marqueur manquait ou était de trop.

## QUA-071 — Une note s'ajoute à tout moment, d'une commande de terminal, sans changer d'activité
**Règle** : Livré à tout projet. `node .githooks/note.mjs "<texte>"` ajoute une ligne datée au fichier de notes des intentions (`docs/intentions/notes.md` (si présent), créé au besoin) et date sa ligne « Statut » ; elle n'écrit pas l'état, ne change pas d'activité, ne touche pas la fiche active, ne commite rien, et fonctionne depuis n'importe quel outil (aucun code propre à un outil) ; une note vide est refusée. Le rappel d'état la cite. La note reste hors de l'index des chantiers.
**Périmètre** : `.githooks/note.mjs`, `.githooks/state-texts.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/note.mjs` (`note`).
**Preuve** : tests sur de vrais dépôts git temporaires : ligne ajoutée, état et fiche inchangés, fichier créé, note vide refusée, ligne de commande.
**Contrôle** : `tests-qua-071`
**Tests** : `.githooks/note.test.mjs`
**Origine** : fluidité de la clôture (0.6.9) — « une commande de terminal de note ajoute une ligne datée au fichier de notes des intentions, sans changer d'activité ni toucher à la fiche active, depuis n'importe quel outil »
**Raison** : Aucun geste court pour consigner une idée en plein chantier (2026-10-19) : une fiche d'intention complète est trop lourde, et un agent qui reçoit une idée en BUILD risquait de la coder.

## QUA-072 — Les hooks et skills de Claude Code ne changent pas, prouvé sans session réelle
**Règle** : Livré à tout projet. Le skill `/drwil-note` a la même forme que les autres skills `/drwil-*` (en-tête YAML `name` et `description` lisibles, corps qui nomme la commande), et les hooks de Claude Code existants (`.claude/hooks/prompt-hook.mjs` du sondage, `.claude/hooks/scope-reminder.mjs`), rejoués avec leurs entrées simulées, donnent la même sortie qu'avant ce chantier.
**Périmètre** : `.claude/skills/drwil-note/SKILL.md`, `.claude/hooks/prompt-hook.mjs`, `.claude/hooks/scope-reminder.mjs` ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/test/kit.test.mjs` (entrées simulées et sorties attendues des hooks).
**Preuve** : test du paquet qui installe un projet, lit la forme du skill et rejoue les hooks avec des entrées simulées ; aucune session réelle ni appel au modèle.
**Contrôle** : `tests-qua-072`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : fluidité de la clôture (0.6.9) — « Compatibilité Claude Code prouvée sans session réelle : le skill `/drwil-note` a la même forme que les autres skills `/drwil-*` (test du gabarit) et les hooks Claude Code existants, rejoués avec leurs entrées simulées, donnent la même sortie qu'avant »
**Raison** : Pas de session Claude Code réelle disponible (plus de crédit) ; sans preuve déterministe, une régression des hooks de l'outil de référence passerait inaperçue.

## QUA-073 — Hors de CLOSING, la clôture dit le chemin restant, et l'avertissement d'intention regarde toute la branche
**Règle** : Livré à tout projet. Depuis une activité autre que CLOSING (de BUILD à VERIFY), `node .githooks/close.mjs` et `--check` nomment le chemin restant jusqu'à CLOSING — les commandes `state.mjs move`, dans l'ordre, transitions voisines seulement — et, si l'évidence de `verify` manque ou date d'un autre commit que HEAD, la commande qui la renouvelle, placée avant le passage en CLOSING ; ils n'avancent jamais l'état (QUA-048). L'avertissement « fiche supprimée sans que son intention soit touchée » compare l'intention à toute la branche depuis la base de fusion, pas au seul commit de clôture : une intention mise à jour ou retirée par un commit précédent du chantier n'est pas signalée.
**Périmètre** : `.githooks/close.mjs` (`pathToClosing`), `.githooks/state.mjs` (`verifyEvidence`), `.githooks/briefs.mjs` (`intentsLeftBehind`) ; livrés dans le gabarit.
**Source de vérité** : `.githooks/close.mjs` (`pathToClosing`), `.githooks/briefs.mjs` (`intentsLeftBehind`).
**Preuve** : tests des hooks sur de vrais dépôts git temporaires : chemin depuis chaque activité, évidence absente, périmée ou à jour, intention touchée dans un commit précédent, jamais touchée, retirée.
**Contrôle** : `tests-qua-073`
**Tests** : `.githooks/close.test.mjs`
**Origine** : fluidité de la clôture (0.6.9) — « Depuis une activité autre que CLOSING, `.githooks/close.mjs` et `.githooks/close.mjs --check` nomment le chemin restant jusqu'à CLOSING et, si l'évidence date d'un autre commit que HEAD, la commande qui la renouvelle »
**Raison** : Le 2026-10-19, la clôture depuis BUILD répondait « clôture refusée » sans dire la suite : il a fallu tâtonner entre les transitions voisines, puis relancer `verify --evidence` ; l'avertissement d'intention signalait à tort une intention déjà mise à jour dans un commit précédent.

## QUA-074 — La clôture refuse toute incohérence de l'index, des fiches et du code, en un seul message
**Règle** : Livré à tout projet. `node .githooks/close.mjs` (en CLOSING) et `--check` (à tout moment) refusent, dans le même message que les autres signaux de clôture (QUA-048) et sans empiler le chemin restant jusqu'à CLOSING (QUA-073), toute incohérence de l'index et des fiches, sur tout l'index à chaque clôture : une case cochée ou ouverte qui contredit le statut de la fiche citée (QUA-015), un commentaire de fichier de code, modifié ou non, qui cite une fiche de chantier (QUA-049), une fiche supprimée dont l'intention n'est pas touchée par la branche ni par le dossier de travail (QUA-036). Au commit, ces écarts restent des avertissements : seule la clôture refuse. La ligne d'index d'une fiche est retirée à la clôture même quand elle cite aussi d'autres documents de `docs/` : seule une fiche de `docs/projects/` compte comme fiche de la ligne (`indexItem`), une ligne qui en cite deux reste signalée (QUA-048). La clôture ne commite, ne pousse, ne fusionne rien et n'écrit pas l'état (QUA-048) ; elle ne réécrit jamais le code.
**Périmètre** : `.githooks/close.mjs` (`closingReport`), `.githooks/doc-coherence.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/close.mjs` (`closingReport`), `.githooks/doc-coherence.mjs` (`checkboxProblems`, `codeCitations`, `intentLeft`).
**Preuve** : tests des hooks sur de vrais dépôts git temporaires : index et fiches incohérents refusés en un seul message, rien écrit sans `--fix` ; ligne d'index qui cite aussi un autre document de `docs/` retirée avec sa fiche, deux fiches citées signalées.
**Contrôle** : `tests-qua-074`
**Tests** : `.githooks/doc-coherence.test.mjs`, `.githooks/close.test.mjs`
**Origine** : clôture qui vérifie la cohérence de la documentation — « La clôture (`.githooks/close.mjs` et `--check`) refuse, en un seul message avec les autres signaux de clôture, toute incohérence de l'index et des fiches »
**Raison** : Le 2026-10-21, le commit de clôture de la 0.6.9 a été refusé deux fois par check-docs (renvois vers des intentions retirées, fichier de code cité hors de toute fiche), chaque fois découvert au dernier moment ; les avertissements ne sont lus par personne.

## QUA-075 — Les règles de cohérence sont écrites une fois, lues par le commit et par la clôture
**Règle** : Livré à tout projet. Les règles de cohérence entre l'index, les fiches et le code (case et statut, citations de fiche, références mortes) vivent dans `.githooks/doc-coherence.mjs` ; `.githooks/check-docs.mjs` (au commit, en avertissement) et `.githooks/close.mjs` (à la clôture, bloquant) les lisent du même module : une même incohérence est vue par les deux, avec le même message.
**Périmètre** : `.githooks/doc-coherence.mjs`, `.githooks/check-docs.mjs`, `.githooks/close.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/doc-coherence.mjs`.
**Preuve** : un test lance check-docs et la lecture de la clôture sur le même dépôt temporaire et retrouve le même message ; les deux fichiers importent le module.
**Contrôle** : `tests-qua-075`
**Tests** : `.githooks/doc-coherence.test.mjs`
**Origine** : clôture qui vérifie la cohérence de la documentation — « Ces règles ne sont écrites qu'une fois : `.githooks/check-docs.mjs` (au commit) et `.githooks/close.mjs` (à la clôture) les lisent du même module, et une même incohérence est vue par les deux »
**Raison** : Deux copies d'une règle divergent : la clôture aurait refusé ce que le commit laisse passer, ou l'inverse.

## QUA-076 — La clôture propose les corrections sans jugement, et ne les écrit qu'avec `--fix`
**Règle** : Livré à tout projet. Pour chaque incohérence corrigeable sans jugement, la clôture propose la correction en diff (ancienne ligne, nouvelle ligne) sans rien écrire, et ne l'applique qu'avec `--fix`, jamais d'elle-même : une case de l'index alignée sur le statut de la fiche (seulement si toutes les fiches citées par la ligne s'accordent, et si une case rouverte garde son marqueur) ; une référence morte — vers la fiche du chantier qui se clôt, elle est réorientée vers le journal ; vers toute autre fiche ou intention retirée, la citation est supprimée. Une ligne modifiée entre la proposition et `--fix` n'est pas réécrite. Le reste (citation de fiche dans du code, intention non touchée, case ambiguë) refuse en disant la correction à faire.
**Périmètre** : `.githooks/close.mjs` (`close`), `.githooks/doc-coherence.mjs` (`deadReferences`, `proposals`, `applyProposals`) ; livrés dans le gabarit.
**Source de vérité** : `.githooks/doc-coherence.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires : diff proposé sans écriture, `--fix` qui écrit, ligne modifiée laissée, fins de ligne conservées.
**Contrôle** : `tests-qua-076`
**Tests** : `.githooks/doc-coherence.test.mjs`, `.githooks/close.test.mjs`
**Origine** : clôture qui vérifie la cohérence de la documentation — « Pour chaque incohérence corrigeable sans jugement (case cochée ou ouverte alignée sur le statut de la fiche ; référence morte vers une fiche ou une intention retirée, supprimée ou réorientée vers le journal), la clôture propose la correction (liste ou diff) sans rien écrire, et ne l'applique qu'avec `--fix` ; le reste refuse en disant la correction à faire »
**Raison** : Bloquer sans dire quoi changer coûte un aller-retour par écart ; décision du demandeur du 2026-10-21 : proposer toujours, n'écrire qu'avec `--fix`.

## QUA-077 — Une intention nouvelle qui cite un chemin déjà cité par une autre est signalée
**Règle** : Livré à tout projet. À la clôture (et à `--check`), une intention ajoutée par la branche ou pas encore commitée qui cite, entre backticks, un chemin (hors `docs/`) déjà cité par une autre intention est signalée par un avertissement non bloquant, sans mots clés : le chemin seul fait le lien. Le fichier de notes et le README des intentions n'en sont pas.
**Périmètre** : `.githooks/doc-coherence.mjs` (`twinIntents`), `.githooks/close.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/doc-coherence.mjs` (`twinIntents`).
**Preuve** : tests des hooks sur de vrais dépôts git temporaires : doublon signalé, notes et README écartés, intention déjà fusionnée non signalée.
**Contrôle** : `tests-qua-077`
**Tests** : `.githooks/doc-coherence.test.mjs`, `.githooks/close.test.mjs`
**Origine** : clôture qui vérifie la cohérence de la documentation — « Une intention nouvelle qui cite un chemin déjà cité par une autre intention est signalée en avertissement, sans mots clés »
**Raison** : Le 2026-10-19, une intention a été presque recréée alors qu'elle existait déjà (`docs/intentions/consommation-autres-outils.md`).

## QUA-078 — La note de recette d'une version promue arrive dans le dépôt par une PR dédiée
**Règle** : Livré à tout projet avec le module de release (optionnel). La promotion d'une candidate approuvée (QUA-054) écrit la note de la version dans le dossier des recettes (`docs/recettes/README.md`), un fichier par version : la fiche de recette de la candidate, le verdict, les réserves, l'auteur et la date du verdict, le sha256 de chaque tarball (`.githooks/recette-note.mjs`, jamais écrite à la main). Elle arrive par une branche dédiée `recette/vX.Y.Z`, partie de la branche principale distante, et une PR : jamais un commit sur la branche principale (QUA-017), ni l'arbre, l'index ou la branche courante touchés. Une note déjà dans le dépôt n'est pas refaite. `--dry-run` montre la note sans rien écrire.
**Périmètre** : `.githooks/recette-note.mjs`, `.githooks/promote-release.mjs` ; module optionnel livré dans le gabarit.
**Source de vérité** : `.githooks/recette-note.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (origin nu local), gh simulé : trois cas de note (approuvée, avec réserves), branche poussée sans toucher la branche principale ni l'arbre, PR demandée, `--dry-run` sans écriture.
**Contrôle** : `tests-qua-078`
**Tests** : `.githooks/recette-note.test.mjs`, `.githooks/promote-release.test.mjs`
**Origine** : note de recette par version — « La promotion d'une candidate approuvée écrit la note de la version dans `docs/recettes/<version>.md` — la fiche de recette, le verdict, les réserves, l'auteur et la date du verdict, le sha256 de chaque tarball — sur une branche dédiée et une PR, jamais sur la branche principale ; `--dry-run` montre la note sans rien écrire »
**Raison** : La fiche et le verdict n'existaient que sur la pré-release GitHub : ils ne suivaient pas le code et se perdraient avec la forge.

## QUA-079 — En solo, une version publiée sans candidate porte sa note « sans verdict » dans le corps de sa release
**Règle** : Livré à tout projet avec le module de release (optionnel). En mode `solo`, `node .githooks/create-release.mjs` (sans `--candidate`) publie la version et donne pour corps à la release GitHub (`gh release create --notes-file`) la note de la version (QUA-078) : la mention « sans verdict — version publiée sans candidate ni verdict de recette ; à compléter par l'humain », les empreintes des tarballs, les changements depuis le dernier tag et une partie « à compléter » (ce qui a été validé, par qui, quand). Aucune branche `recette/vX.Y.Z` ni PR : la note n'arrive par la PR dédiée qu'en `team`, à la promotion. `--dry-run` montre la note et où elle irait (corps de la release en `solo`, PR à la promotion pour une candidate), sans rien créer.
**Périmètre** : `.githooks/recette-note.mjs`, `.githooks/create-release.mjs` ; module optionnel livré dans le gabarit.
**Source de vérité** : `.githooks/recette-note.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (origin nu local, gh et npm simulés) : la note « sans verdict » en français et en anglais, la release directe dont elle est le corps (fichier passé à `--notes-file`, aucune branche ni PR), `--dry-run` en `solo` et pour une candidate.
**Contrôle** : `tests-qua-079`
**Tests** : `.githooks/recette-note.test.mjs`, `.githooks/create-release.test.mjs`
**Origine** : note de recette par version — « Une version publiée sans candidate ni verdict reçoit quand même sa note, générée avec la mention « sans verdict », à compléter par l'humain » ; réécrit par release-allegee (validé le 2026-10-30) : en `solo`, la note va dans le corps de la release, la PR reste propre à `team`
**Raison** : La note reste obligatoire à chaque version : une version sans recette doit le dire plutôt que laisser un trou.

## QUA-080 — Le tag et la release publiés ne dépendent jamais de la PR de la note
**Règle** : Livré à tout projet avec le module de release (optionnel). Le tag et la release GitHub sont publiés avant la note et ne dépendent pas d'elle : si la branche, la PR ou l'écriture de la note échoue, la promotion (QUA-054) le dit, avec la commande de rattrapage (`node .githooks/recette-note.mjs vX.Y.Z <fichier de la note>`, ou `gh pr create` quand seule la PR a échoué), sans défaire ce qui est publié ; en `solo` (QUA-079), la note est le corps de la release : si `gh release create` échoue, le tag reste et la commande de rattrapage (`--notes-file`) est donnée. La note est gardée dans un fichier. Une branche de note déjà poussée n'est jamais écrasée.
**Périmètre** : `.githooks/recette-note.mjs`, `.githooks/promote-release.mjs`, `.githooks/create-release.mjs` ; module optionnel livré dans le gabarit.
**Source de vérité** : `.githooks/recette-note.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (origin nu local, sans origin, gh simulé en échec) : tag et release présents malgré l'échec, commande de rattrapage nommée, note gardée, rattrapage par la ligne de commande.
**Contrôle** : `tests-qua-080`
**Tests** : `.githooks/recette-note.test.mjs`, `.githooks/promote-release.test.mjs`, `.githooks/create-release.test.mjs`
**Origine** : note de recette par version — « Le tag et la release GitHub ne dépendent pas de la PR de la note : si la branche, la PR ou l'écriture échoue, la promotion le dit avec la commande de rattrapage, sans défaire ce qui est publié »
**Raison** : Une release publiée ne se défait pas ; la note se rattrape.

## QUA-081 — Une attestation tombe quand un fichier qu'elle couvre change
**Règle** : Livré à tout projet. Un contrat déclare ce qu'il juge par le champ `**Couvre**` (motifs de chemins entre backticks). L'attestation (version 3) enregistre l'empreinte du contenu de chaque fichier couvert, lue sur les fichiers eux-mêmes (indépendante de git ; l'ordre des chemins et les fins de ligne ne la changent pas). Un fichier couvert modifié, ajouté, supprimé ou renommé sans toucher au contrat fait passer le contrat en `MANUAL` : `drwil verify` ne rend plus PASS et nomme le fichier ; un fichier hors des motifs laisse l'attestation `ATTESTED`. Tout changement de contenu compte, y compris de simple forme.
**Périmètre** : `drwil verify`, `drwil attest`, `.githooks/contracts.mjs` (lecture du champ) ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/src/coverage.ts` (`coverageOf`, `coverageChanges`), `packages/drwil/src/verify.ts`, `.githooks/contracts.mjs`.
**Preuve** : tests du paquet sur des dépôts temporaires (dont le scénario d'une dépendance ajoutée) et de l'analyseur de contrats.
**Contrôle** : `tests-qua-081`
**Tests** : `packages/drwil/test/cycle.test.mjs`, `.githooks/contracts.test.mjs`
**Origine** : attestation liée à son objet — « Un fichier couvert par un contrat, modifié, ajouté, supprimé ou renommé sans toucher au contrat, fait tomber son attestation en MANUAL ; verify ne rend plus PASS et nomme le fichier ; un fichier hors couverture laisse l'attestation ATTESTED »
**Raison** : Une attestation restait `ATTESTED` après un changement de ce qu'elle était censée couvrir (une dépendance ajoutée, un workflow modifié) : une preuve humaine périmée valait validation.

## QUA-082 — Un contrat attestable sans couverture est signalé, ses attestations anciennes restent lisibles
**Règle** : Livré à tout projet. Un contrat à partie humaine sans champ `**Couvre**` est signalé par `drwil verify` (ligne du contrat) et `drwil doctor` (avertissement), sans faire tomber son attestation existante. Une attestation de version 1 ou 2 reste lisible et valide telle quelle, sans réattestation forcée ; la première réattestation passe à la version 4 (QUA-183).
**Périmètre** : `drwil verify`, `drwil doctor`, `drwil attest` ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/src/coverage.ts` (`lacksCoverage`), `packages/drwil/src/verify.ts` (`covers`), `packages/drwil/src/doctor.ts`.
**Preuve** : tests du paquet sur des dépôts temporaires (attestations des versions 2 et 3, signalement, réattestation).
**Contrôle** : `tests-qua-082`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Origine** : attestation liée à son objet — « Un contrat attestable sans Covers est signalé par verify et doctor sans faire tomber son attestation ; une attestation de format ancien reste lisible, sa première réattestation passe au nouveau format »
**Raison** : Imposer une couverture à tous les contrats déjà attestés forcerait des réattestations humaines en masse (une attestation ne coûte que le jugement demandé, QUA-032) ; le signalement dit ce qui reste à couvrir.

## QUA-083 — `drwil attest` renouvelle volontairement une attestation encore valide
**Règle** : Livré à tout projet. `drwil attest <ID> --renew` remplace une attestation encore valide par une nouvelle (l'historique est conservé), sans l'option le contrat déjà attesté reste refusé. Le renouvellement est un geste humain comme toute attestation : terminal interactif, identifiant retapé, aucune option `--yes` ; sans terminal, rien n'est écrit.
**Périmètre** : `drwil attest` (CLI et moteur).
**Source de vérité** : `packages/drwil/src/attest.ts`, `packages/drwil/bin/drwil.js`.
**Preuve** : tests du paquet : renouvellement, refus sans confirmation, refus sans option, refus sans terminal.
**Contrôle** : `tests-qua-083`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Origine** : attestation liée à son objet — « drwil attest renouvelle volontairement une attestation encore valide (option dédiée), toujours depuis un terminal interactif, sans que l'identifiant retapé ni l'identité du geste soient affaiblis »
**Raison** : Un humain qui veut réattester une attestation encore valide (après relecture d'un fichier non couvert, ou pour passer en version 3) ne le pouvait pas.

## QUA-084 — La clôture écrit la preuve versionnée du chantier, ou elle est refusée
**Règle** : Livré à tout projet. Avant de supprimer quoi que ce soit, la clôture (`node .githooks/close.mjs`) écrit un fichier de preuve versionné par chantier (`docs/preuves/<chantier>.md`, réglage `dirs.proofs`) : la date de clôture, le commit vérifié et son verdict, puis chaque critère d'acceptation avec son contrat, les contrôles de ce contrat et l'empreinte des fichiers qu'il couvre, recopiés de la dernière évidence de `drwil verify --evidence` — jamais un jugement refait par la clôture. Sans évidence du commit vérifié, avec un verdict non passant, ou si le fichier ne peut pas être écrit, la clôture est refusée et la fiche reste. L'entrée de journal du chantier cite ce fichier.
**Périmètre** : `.githooks/close.mjs`, `.githooks/closure-proof.mjs`, la barrière de périmètre qui laisse passer la preuve écrite en CLOSING (`.githooks/scope-gate.mjs`) et l'évidence de `drwil verify --evidence` (couverture par contrat) ; livré dans le gabarit.
**Source de vérité** : `.githooks/closure-proof.mjs`, `packages/drwil/src/evidence.ts`.
**Preuve** : tests des hooks et du paquet : preuve écrite, journal qui la cite, refus sans évidence, évidence d'un autre commit, verdict non passant, fichier non écrivable, preuve commitée en CLOSING.
**Contrôle** : `tests-qua-084`
**Tests** : `.githooks/close.test.mjs`, `.githooks/scope-gate.test.mjs`, `packages/drwil/test/cycle.test.mjs`
**Origine** : des critères et des preuves qui survivent à la clôture — « La clôture d'un chantier écrit un fichier de preuve versionné, un par chantier, cité par son entrée de journal : il garde chaque critère, son contrat, son contrôle, le commit vérifié et l'empreinte des fichiers couverts ; la clôture est refusée si ce fichier ne peut pas être écrit »
**Raison** : la fiche supprimée à la clôture emportait ses critères d'acceptation : plus rien ne disait ce qu'un chantier avait fait accepter, ni ce qui le prouvait.

## QUA-085 — Un critère dont la preuve a disparu fait échouer `verify`, en le nommant
**Règle** : Livré à tout projet. `drwil verify` rejoue les critères des fichiers de preuve de clôture : un critère dont la preuve a disparu — contrat absent du registre, contrat en échec, ou contrat sans aucun contrôle alors que le critère n'est pas de jugement humain — fait passer le verdict à `FAIL`, jamais à un avertissement, avec le même code de sortie en local et en CI. Les critères concernés sont nommés dans la sortie humaine, la sortie agent et le JSON (`closureProofs`). Un contrat attestable qui attend son attestation n'est pas une preuve disparue.
**Périmètre** : `drwil verify` (verdict, code de sortie, sorties humaine, agent et JSON).
**Source de vérité** : `packages/drwil/src/closure.ts` (`judgeProofs`).
**Preuve** : tests du paquet : contrôle retiré, contrat abandonné, contrat en échec, contrat attestable en attente.
**Contrôle** : `tests-qua-085`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Origine** : des critères et des preuves qui survivent à la clôture — « Un critère dont la preuve a disparu (contrôle retiré, test supprimé, contrat abandonné) fait échouer un contrôle qui le nomme, avec le même code en local et en CI ; jamais un avertissement »
**Raison** : une fois le chantier clos, retirer son contrôle ou son contrat ne faisait rien échouer : la preuve d'un critère accepté pouvait disparaître en silence.

## QUA-086 — La fiche jugée est trouvée sans état local
**Règle** : Livré à tout projet. `drwil verify` juge les critères de la fiche du chantier même sans état local : la fiche est alors lue depuis le trailer `Drwil-Brief` des commits de la branche, de sorte que la CI juge les mêmes critères que la machine qui les a écrits, avec le même code et le même code de sortie. Hors d'une branche portant ce trailer (branche principale, `drwil attest`), aucun critère de fiche n'est jugé ; après la clôture, ce sont les critères du fichier de preuve qui sont rejoués.
**Périmètre** : `drwil verify` (choix de la fiche jugée), en local comme en CI.
**Source de vérité** : `packages/drwil/src/closure.ts` (`trailerBrief`, `briefToJudge`), `packages/drwil/src/criteria.ts`.
**Preuve** : tests du paquet : sans état local, la fiche du trailer est jugée ; sans trailer, aucun critère.
**Contrôle** : `tests-qua-086`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Origine** : des critères et des preuves qui survivent à la clôture — « En CI, les critères de la fiche du chantier sont jugés sans état local : la fiche est lue depuis le trailer `Drwil-Brief` des commits de la branche ; après la clôture, ce sont les critères du fichier de preuve qui sont rejoués »
**Raison** : l'état local est ignoré par git : la CI ne voyait aucune fiche active et laissait passer un critère non prouvé que la machine locale refusait.

## QUA-087 — Les garanties câblent la couverture à 100 % de chaque couche dont la pile est dans la table
**Règle** : Livré à tout projet. `drwil guarantees`, lancé par `/drwil-adopt` une fois la pile connue, déclare dans `.drwil/ia-first.json` → `checks` le contrôle `coverage-<couche>` de chaque couche dont la pile est dans la table des outils (Node/TypeScript, Python, Go, JVM ; une pile = une ligne) : 100 % sur lignes, branches, fonctions et instructions, autant que l'outil les mesure, dit tel quel (Go : instructions seulement ; Python : un taux combiné ; JVM : la règle JaCoCo du fichier de build). Un contrôle déjà déclaré est signalé, jamais remplacé.
**Périmètre** : `drwil guarantees` (câblage de la couverture).
**Source de vérité** : `packages/drwil/src/guarantees.ts`, `packages/drwil/src/guarantees-table.ts`.
**Preuve** : tests du paquet sur des projets temporaires, exécuteur de commandes simulé : contrôle à 100 % câblé, contrôle existant gardé, lignes de la table.
**Contrôle** : `tests-qua-087`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Une commande drwil, lancée par `/drwil-adopt` une fois la pile connue, câble dans `.drwil/ia-first.json` → `checks` le contrôle de couverture de chaque couche dont la pile est dans la table des outils, à 100 % lignes, branches, fonctions et instructions »
**Raison** : Le câblage se faisait à la main, pile par pile : la promesse de qualité restait déclarative.

## QUA-088 — Une garantie non tenue écrit une fiche bloquante, met `verify` en FAIL et passe seule au lancement
**Règle** : Livré à tout projet. Pour une couche dont l'outil de couverture est absent ou inconnu (et pour toute garantie non tenue), `drwil guarantees` écrit une fiche `[P0]` portant `**Garantie** : bloquante` (`docs/projects/couverture-<couche>.md`, jamais réécrite si elle existe) et la liste à l'index. Une fois les garanties imposées (`guarantees.enforced`), `drwil verify` est en `FAIL` tant qu'une garantie n'est pas tenue — contrôle non déclaré ou cité par aucun contrat —, en nommant la couche ; tant qu'une fiche bloquante existe, `/drwil-start` ne propose qu'elle.
**Périmètre** : `drwil guarantees`, `drwil verify`, `.githooks/briefs.mjs` (`scopedBriefs`).
**Source de vérité** : `packages/drwil/src/guarantees.ts` (`guaranteeFailures`), `packages/drwil/src/guarantees-briefs.ts`, `.githooks/briefs.mjs`.
**Preuve** : tests du paquet (pile hors table, verify en FAIL puis levé) et des hooks (seules les fiches bloquantes proposées).
**Contrôle** : `tests-qua-088`
**Tests** : `packages/drwil/test/guarantees.test.mjs`, `.githooks/state.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Pour une couche dont l'outil de couverture est absent ou inconnu, la commande crée une fiche bloquante `[P0]` (`docs/projects/couverture-<couche>.md`) qui demande au demandeur de choisir l'outil ; tant qu'elle existe, `verify` est en `FAIL` sur cette couche et `/drwil-start` ne propose qu'elle »
**Raison** : Rien n'empêchait de continuer à travailler quand l'outil d'une pile manquait.

## QUA-089 — Un test e2e des chemins critiques est exigé de tout projet
**Règle** : Livré à tout projet. Sans contrôle `e2e` déclaré, `drwil guarantees` écrit la fiche bloquante `[P0]` des chemins critiques (e2e-chemins-critiques.md), qui demande au demandeur de nommer les chemins critiques et l'outil e2e de la pile (`catalog:QUA-020`) ; `drwil verify` est en `FAIL` tant que le contrôle `e2e` n'est pas déclaré et cité par un contrat, donc la fiche ne se clôt qu'une fois ce contrôle rejoué.
**Périmètre** : `drwil guarantees`, `drwil verify`.
**Source de vérité** : `packages/drwil/src/guarantees.ts`.
**Preuve** : tests du paquet : fiche écrite, échec tant que `e2e` manque, levé une fois déclaré et cité.
**Contrôle** : `tests-qua-089`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Le même mécanisme exige un e2e des chemins critiques (`catalog:QUA-020`) : une fiche bloquante `[P0]` demande au demandeur de nommer ces chemins, et ne se clôt que lorsqu'un test e2e rejoué par un contrôle les couvre »
**Raison** : L'e2e n'était qu'un objectif du catalogue, jamais exigé.

## QUA-090 — Aucune dérogation aux garanties, seulement une exclusion déclarée et justifiée
**Règle** : Livré à tout projet. Les garanties n'ont ni profil léger ni option pour les abaisser. Une exclusion de fichier se déclare dans `.drwil/ia-first.json` → `guarantees.exclusions` (`{ layer, path, reason }`) : justifiée, elle est passée à l'outil (`--exclude`, `--omit`) ; sans raison, elle est refusée, signalée par la commande et par `drwil verify` (FAIL).
**Périmètre** : `drwil guarantees`, `drwil verify`.
**Source de vérité** : `packages/drwil/src/guarantees.ts` (`exclusionsOf`).
**Preuve** : tests du paquet : exclusion justifiée appliquée, exclusion sans raison refusée et en échec.
**Contrôle** : `tests-qua-090`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Aucune exception : pas de profil léger, pas de dérogation à ces garanties ; une exclusion de fichier (configuration, point d'entrée…) reste permise si elle est déclarée et justifiée dans le contrat de couverture du projet »
**Raison** : Une garantie qui se négocie au cas par cas n'en est plus une ; une exclusion sans raison cache une dette.

## QUA-091 — Un outil de couverture non lançable ne donne jamais un « passé »
**Règle** : Livré à tout projet. Avant de câbler, `drwil guarantees` lance la sonde de l'outil dans la couche (par exemple `npx --no-install c8 --version`) : en échec, la commande le dit (« non exécuté, jamais passé »), aucun contrôle n'est câblé et la fiche bloquante est écrite (QUA-013).
**Périmètre** : `drwil guarantees`.
**Source de vérité** : `packages/drwil/src/guarantees.ts` (`coverLayer`), `packages/drwil/src/guarantees-table.ts` (`probe`).
**Preuve** : tests du paquet : sonde en échec, aucun contrôle, fiche bloquante.
**Contrôle** : `tests-qua-091`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Un outil de couverture non installable ou non lançable ne donne jamais un « passé » : la commande le dit, le contrôle reste « non exécuté » et la fiche bloquante est créée (QUA-013) »
**Raison** : Un contrôle câblé sur un outil absent échouerait plus tard sans dire pourquoi, ou serait désactivé.

## QUA-092 — Sur un dossier vide, la garantie de couverture se prouve en vrai
**Règle** : Livré à tout projet. Sur un dossier vide puis une pile connue (Node/TypeScript d'abord) et un premier test, le contrôle câblé par `drwil guarantees` à 100 % passe, et retirer le test le fait échouer ; sur une pile hors table, la fiche bloquante apparaît et bloque (`drwil verify` en FAIL, `/drwil-start` ne propose qu'elle).
**Périmètre** : `drwil guarantees`, `drwil verify`, `/drwil-start` sur un vrai projet.
**Source de vérité** : `packages/drwil/src/guarantees.ts`.
**Preuve** : essai réel par l'humain ; parties automatisées : contrats QUA-087 et QUA-088.
**Contrôle** : `tests-qua-087`, `tests-qua-088`
**Manuel** : sur un dossier vide, `npx drwil init`, une pile Node/TypeScript (`package.json`, c8 installé) et un premier test : `npx drwil guarantees` câble `coverage-root`, le contrôle passe à 100 % ; retirer le test le fait échouer. Puis une pile hors table (Rust) : la fiche bloquante apparaît, `drwil verify` est en FAIL, `/drwil-start` ne propose qu'elle.
**Couvre** : `packages/drwil/src/guarantees*.ts`
**Origine** : garanties obligatoires à l'adoption — « Sur un dossier vide, une pile connue (Node/TypeScript d'abord) puis un premier test : le contrôle à 100 % passe, retirer le test le fait échouer ; sur une pile hors table, la fiche bloquante apparaît et bloque »
**Raison** : Les tests simulent les outils ; seul un essai réel prouve que c8 câblé à 100 % tient sur un vrai projet.

## QUA-093 — Un projet existant en dette garde un cliquet au niveau mesuré et 100 % sur le diff
**Règle** : Livré à tout projet. Sur une couche qui a déjà du code de sa pile, `drwil guarantees` mesure la couverture actuelle (outil de la table) : à 100 %, le contrôle est câblé à 100 % ; en dessous, il est câblé au niveau mesuré (cliquet, jamais abaissé par la commande), un contrôle `coverage-diff-<couche>` exige 100 % sur le code nouveau ou modifié (`diff-cover`) et une fiche de montée `[P1]` non bloquante vise 100 %. Mesure impossible, non prise en charge (JVM) ou outil de diff absent : fiche bloquante. L'e2e reste exigé comme sur un projet neuf.
**Périmètre** : `drwil guarantees`, `drwil verify`.
**Source de vérité** : `packages/drwil/src/guarantees.ts` (`existing`), `packages/drwil/src/guarantees-table.ts` (`measure`, `diff`).
**Preuve** : tests du paquet : mesure simulée (Node, Python, Go), cliquet, diff, fiche de montée, cas bloquants.
**Contrôle** : `tests-qua-093`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Sur un projet **existant** adopté avec du code legacy non couvert, la commande mesure la couverture actuelle de chaque couche et la pose comme seuil (cliquet, jamais en baisse), exige 100 % sur le code nouveau ou modifié (couverture du diff) et crée une fiche de montée `[P1]` non bloquante, cible 100 % ; l'e2e reste exigé comme sur un projet neuf »
**Raison** : Exiger 100 % d'emblée d'un projet en dette bloquerait tout ; ne rien exiger laisserait la dette grandir.

## QUA-094 — Un projet gouverné a un dépôt, une forge GitHub ou GitLab, une CI et une branche principale protégée
**Règle** : Livré à tout projet. `drwil guarantees` vérifie le dépôt Git, le dépôt distant `origin` sur GitHub ou GitLab, la CI déclarée (`ci`) et son fichier, et la protection de la branche principale lue par `gh` ou `glab`. Un élément absent écrit la fiche bloquante du versionnement (versionnement.md) ; sans accès à la forge, la protection reste « non exécuté » et la fiche reste ouverte (QUA-013). La protection se pose par `drwil guarantees --protect`, avec l'accord de l'humain, jamais en silence ; une protection vérifiée est enregistrée (`guarantees.protection`) et `drwil verify`, qui ne joint pas la forge, l'exige.
**Périmètre** : `drwil guarantees`, `drwil verify`.
**Source de vérité** : `packages/drwil/src/guarantees-forge.ts`.
**Preuve** : tests du paquet, exécuteur simulé : sans dépôt, sans origin, sans CI, gh injoignable, ruleset complet, enregistrement de la protection, verify hors ligne.
**Contrôle** : `tests-qua-094`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Un projet gouverné a un dépôt Git et une forge, GitHub ou GitLab : CI déclarée (`--ci github|gitlab`), dépôt distant, protection de la branche principale (fusion par PR/MR, contrôles requis). Un élément absent crée une fiche bloquante `[P0]` ; la protection de branche se pose par `gh` ou `glab` **avec l'accord de l'humain**, jamais en silence ; sans accès à la forge, le contrôle reste « non exécuté » et la fiche reste ouverte (QUA-013) »
**Raison** : Sans forge protégée, les hooks locaux se contournent et rien ne rattrape l'écart avant la fusion.

## QUA-095 — La protection de branche impose CI verte, sans contournement administrateur, et une CI qui rejoue le hook
**Règle** : Livré à tout projet, neuf comme existant, sans souplesse. La protection attendue : fusion par PR/MR, contrôles de CI requis, aucun contournement par les administrateurs (GitHub : `enforce_admins` ou ruleset ; GitLab : aucun push direct, pipeline requis, pas de force push). La CI doit rejouer les contrôles du hook (`node .githooks/run-checks.mjs`), ce qui rattrape un `--no-verify` avant la fusion. Chaque manque est une raison de la fiche bloquante `[P0]`. La détection directe d'un `--no-verify` n'existe pas encore : c'est la CI qui le rattrape.
**Périmètre** : `drwil guarantees`.
**Source de vérité** : `packages/drwil/src/guarantees-forge.ts`.
**Preuve** : tests du paquet : protection classique incomplète, CI sans run-checks, GitLab, pose par `--protect` seulement.
**Contrôle** : `tests-qua-095`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Bonnes pratiques de versionnement imposées par la même protection de branche : CI verte obligatoire, sans contournement même pour les administrateurs ; la CI rejoue les contrôles du hook local, donc un `--no-verify` est rattrapé avant la fusion ; l'usage de `--no-verify` est signalé par `drwil verify` quand il est détectable. Projet neuf : tout est imposé dès `init` (fiche bloquante `[P0]`) ; projet existant adopté : même liste, aussi en fiche bloquante `[P0]` (aucune souplesse, contrairement à la couverture) »
**Raison** : Une protection contournable par un administrateur ou une CI qui ne rejoue pas le hook laisse passer ce que le hook local refuse.

## QUA-096 — Le README livré présente d'abord le produit de l'utilisateur
**Règle** : Livré à tout projet. Le gabarit `README.md` commence par le produit (ce que fait l'application, pour qui, comment la lancer, sa documentation) ; l'outillage drwil n'y tient que quelques lignes de renvoi vers `AGENTS.md` et `docs/`, en fin de fichier.
**Périmètre** : gabarit `packages/drwil/templates/common/base/README.md`.
**Source de vérité** : `packages/drwil/templates/common/base/README.md`.
**Preuve** : test du paquet sur le gabarit : ordre des sections, renvoi court.
**Contrôle** : `tests-qua-096`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Le README livré présente le **produit de l'utilisateur** d'abord (ce que fait l'application, pour qui, comment la lancer) ; l'outillage drwil n'y tient que quelques lignes de renvoi vers `AGENTS.md` et `docs/` »
**Raison** : Le README livré parlait de drwil plus que du projet de l'utilisateur.

## QUA-097 — Une présentation restée en squelette écrit une fiche bloquante
**Règle** : Livré à tout projet. Tant que `README.md`, `AGENTS.md` (« Le projet en 5 lignes ») ou `docs/features.md` gardent du texte du squelette (« to describe », « template to fill in », « à décrire », « gabarit à remplir »), `drwil guarantees` écrit la fiche bloquante `[P0]` de présentation (presentation-du-projet.md) et `drwil verify` est en `FAIL` ; tout est levé une fois le texte rédigé.
**Périmètre** : `drwil guarantees`, `drwil verify`.
**Source de vérité** : `packages/drwil/src/guarantees-table.ts` (`skeletonFiles`).
**Preuve** : tests du paquet : fiche et échec sur un projet installé, levés après rédaction ; garanties toutes tenues.
**Contrôle** : `tests-qua-097`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Tant que le README, la ligne « Le projet en 5 lignes » d'`AGENTS.md` ou `docs/features.md` gardent le texte du squelette (« to describe », « template to fill in »), une fiche bloquante `[P0]` demande à l'humain de les rédiger (à partir de la carte `docs/architecture.md` si elle existe) ; elle se clôt quand le texte a changé »
**Raison** : Constat sur un projet adopté : README, 5 lignes et fonctionnalités jamais remplis alors que la carte l'était.

## QUA-098 — La release exige l'examen du README, des fonctionnalités et de la carte avant le tag
**Règle** : Livré à tout projet avec le module de release (optionnel). Avant tout tag, aperçu compris, `.githooks/create-release.mjs` examine `README.md`, `docs/features.md` et `docs/architecture.md` (`.githooks/release-review.mjs`) : il montre, pour chacun, les chantiers clos depuis le dernier tag, le nombre de fichiers de code touchés et si le document a changé. Un document inchangé sans ligne « inchangé : <raison> » pour la version dans le fichier d'examen des versions (release-review.md, sous docs/), ou qui garde du texte de squelette, fait refuser la release. L'agent met les documents à jour dans la PR de version, avant le tag.
**Périmètre** : `.githooks/create-release.mjs`, `.githooks/release-review.mjs` ; module optionnel livré dans le gabarit.
**Source de vérité** : `.githooks/release-review.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires : document inchangé refusé, raison enregistrée acceptée, squelette bloquant, aperçu refusé.
**Contrôle** : `tests-qua-098`
**Tests** : `.githooks/release-review.test.mjs`, `.githooks/create-release.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « La commande de release refuse de poser le tag (aperçu et création) tant que l'examen de `README.md`, `docs/features.md` et `docs/architecture.md` n'est pas fait : pour chacun, le script montre ce qui a changé depuis le dernier tag (chantiers clos, fichiers de code touchés, document modifié ou non) ; l'agent le met à jour dans la PR de version, ou enregistre « inchangé » avec sa raison (une ligne versionnée) ; un document qui garde du texte de squelette bloque aussi »
**Raison** : Les documents lus d'abord par un visiteur vieillissaient d'une version à l'autre sans que rien ne le signale.

## QUA-099 — Une PR de documentation seule part en fusion automatique sans question
**Règle** : Livré à tout projet. La consigne d'`AGENTS.md` et le skill de lancement disent : une PR qui ne touche que de la documentation (Markdown, `docs/`) est mise en fusion automatique par l'agent (`gh pr merge --auto --merge`) sans poser la question `drwil-merge`, gardée pour les PR qui touchent du code ; si le dépôt n'autorise pas l'auto-merge, le message de refus existant s'applique.
**Périmètre** : gabarits `AGENTS.md`, `docs/ia-first/8-conduct-rules.md` et skill `start-a-workstream`.
**Source de vérité** : `packages/drwil/templates/common/base/AGENTS.md`, `packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md`, `packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md`.
**Preuve** : test du paquet sur les gabarits livrés.
**Contrôle** : `tests-qua-099`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Une PR qui ne touche que de la documentation est mise en fusion automatique par l'agent sans poser la question `drwil-merge` ; le sondage ne garde la question que pour les PR qui touchent du code. Le dépôt doit autoriser l'auto-merge, sinon le message de refus existant s'applique »
**Raison** : Poser la question de fusion pour une PR de documentation seule coûtait un geste humain sans enjeu.

## QUA-100 — Le suivi de la CI d'une PR dit verte, fusionnée ou rouge, jamais « verte » sans l'avoir vu
**Règle** : Livré à tout projet. `node .githooks/pr-watch.mjs [<n>]` suit la CI d'une PR par `gh` jusqu'à la fin de ses contrôles (30 minutes au plus) et dit « verte », « fusionnée » ou « rouge » avec les contrôles en échec (codes 0, 0, 1) ; la PR fusionnée, il suit aussi la CI de la branche principale sur le commit de fusion et son code de sortie en tient compte (QUA-251) ; sans `gh` joignable, sans contrôle ou après le délai, le suivi est « non exécuté » (code 2), jamais « verte » (QUA-013). `AGENTS.md` consigne de le lancer après chaque push ou création de PR, et de corriger une CI rouge sans la contourner (QUA-019).
**Périmètre** : `.githooks/pr-watch.mjs` ; consigne d'`AGENTS.md` et son texte complet (`docs/ia-first/8-conduct-rules.md`).
**Source de vérité** : `.githooks/pr-watch.mjs`.
**Preuve** : tests des hooks (gh simulé, attente, délai, ligne de commande) et du paquet (consigne livrée).
**Contrôle** : `tests-qua-100`
**Tests** : `.githooks/pr-watch.test.mjs`, `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Après un push ou la création d'une PR, un script attend la fin de la CI (`gh pr checks`) et dit « verte », « fusionnée » ou « rouge » avec le contrôle en échec ; l'agent corrige l'échec sans jamais le contourner (QUA-019, pas de contournement) ; sans accès à la forge, le suivi reste « non exécuté » et le dit (QUA-013) ; script Node, valable pour tous les outils »
**Raison** : L'agent annonçait une PR prête sans avoir vu sa CI finir.
**Modifié** : 2026-11-06 — la PR fusionnée, le suivi continue sur la CI de la branche principale (QUA-251, chantier « CI rapide pour la doc », lot 4, décidé par le demandeur) : « fusionnée » est toujours dit, le code de sortie devient celui de la CI de la branche principale (0 verte, 1 rouge ou issue ouverte, 2 non suivie).

## QUA-101 — Le mini-banc se rejoue d'une commande et écrit un résultat JSON par passage
**Règle** : Propre au dépôt drwil (QUA-018). `node outils/banc.mjs passage` prépare une copie jetable de `bench/reference/` hors du dépôt (jamais dedans, et rien n'y reste), sous git, avec drwil installé par le vrai `drwil init` pour la condition « avec » (hooks actifs, `transitions: agent`), lance l'agent en mode non interactif sur la consigne mot pour mot d'une tâche de `bench/taches/` (même modèle, même effort, plafond de tours, flux JSON), puis écrit un résultat JSON par passage : tokens, coût estimé, tours, durée, verdict du juge. `node outils/banc.mjs plan` donne les passages, l'ordre avec/sans tiré au sort par tâche ; un passage d'essai est seul et hors mesure.
**Périmètre** : `outils/banc.mjs`, `bench/`.
**Source de vérité** : `outils/banc.mjs` (`preparer`, `passage`, `plan`).
**Preuve** : tests du banc avec un agent simulé (aucun vrai agent), drwil init réel.
**Contrôle** : `tests-qua-101`
**Tests** : `outils/banc.test.mjs`
**Origine** : mini-banc — « Le banc se rejoue d'une commande sur une copie jetable du projet de référence, avec et sans drwil, et écrit un résultat JSON par passage (tokens, coût, tours, verdict du juge) ; éprouvé avec un agent simulé »
**Raison** : Savoir si drwil améliore le livrable et ce qu'il coûte demande une mesure rejouable, pas une impression.

## QUA-102 — Le juge du mini-banc est indépendant de drwil
**Règle** : Propre au dépôt drwil (QUA-018). Le juge (`outils/banc-juge.mjs`) ne s'appuie sur aucun contrôle de drwil : les tests cachés de la tâche ne sont copiés dans la copie qu'après le passage de l'agent, puis lancés ; les tests visibles sont relancés (régression : en échec après, pas avant) ; le diff et les commandes de l'agent relèvent les contournements (test sauté ou supprimé, commande de test changée, `--no-verify`, réglage des hooks `core.hooksPath` écrit, retiré ou surchargé — jamais sa simple lecture —, fichier de contrôle modifié) ; les fichiers de code touchés hors de la tâche sont comptés, ceux de la gouvernance (`docs/`, `.drwil/`) à part. Réussi = tests cachés verts, aucun contournement, aucune régression.
**Périmètre** : `outils/banc-juge.mjs`.
**Source de vérité** : `outils/banc-juge.mjs` (`juger`, `contournements`, `diff`).
**Preuve** : tests du banc avec un agent simulé.
**Contrôle** : `tests-qua-102`
**Tests** : `outils/banc.test.mjs`
**Origine** : mini-banc — « Le juge est indépendant : tests cachés copiés après le passage, contournement détecté sur le diff (test sauté ou supprimé, `--no-verify`, contrôle désactivé), fichiers hors tâche comptés »
**Raison** : Juger le livrable par les contrôles de drwil, ce serait juger le produit par lui-même.

## QUA-103 — Un passage du mini-banc qui n'a pas pu tourner est « non mesuré »
**Règle** : Propre au dépôt drwil (QUA-018), application de QUA-013 (contrôle non exécuté n'est pas passé). Un passage dont l'agent est absent, dont la préparation échoue, qui dépasse son délai, qui ne rend aucun message de résultat ou dont l'agent finit en erreur (hors plafond de tours atteint, qui est jugé) est « non mesuré », avec sa raison — pour une erreur de l'agent, son message réel (texte du résultat ou ses erreurs), jamais le seul `subtype` de Claude Code, qui vaut « success » même en erreur : jamais compté réussi ni raté, et le rapport le compte à part.
**Périmètre** : `outils/banc.mjs` (`passage`), `outils/banc-juge.mjs` (`rapport`).
**Source de vérité** : `outils/banc.mjs` (`passage`).
**Preuve** : tests du banc avec un agent simulé.
**Contrôle** : `tests-qua-103`
**Tests** : `outils/banc.test.mjs`
**Origine** : mini-banc — « Un passage qui n'a pas pu tourner est « non mesuré », jamais compté réussi ni raté »
**Raison** : Un passage tombé (quotas, panne) compté raté ou réussi fausserait la comparaison sans que rien ne le dise.

## QUA-104 — Le mini-banc mesure à part le coût de la gouvernance
**Règle** : Propre au dépôt drwil (QUA-018). Chaque résultat de passage porte, lus du flux de l'agent et calculés de la même façon avec et sans drwil : les blocages (appel d'outil refusé par un contrôle), les faux blocages (refus d'écrire un fichier de la tâche, ou d'un commit dans un passage jugé réussi), le nombre d'appels de contrôle et le temps passé dans ces appels (refusés, ou commandes de contrôle : hooks, drwil, commit, push).
**Périmètre** : `outils/banc-juge.mjs` (`lireFlux`, `gouvernance`).
**Source de vérité** : `outils/banc-juge.mjs` (`gouvernance`).
**Preuve** : tests du banc sur un flux simulé.
**Contrôle** : `tests-qua-104`
**Tests** : `outils/banc.test.mjs`
**Origine** : mini-banc — « Le coût de la gouvernance est mesuré à part : faux blocages (contrôle qui refuse un travail correct) et temps passé à satisfaire les contrôles, avec et sans drwil (ajouté le 2026-10-22, revue externe) »
**Raison** : La barrière a refusé de vrais écarts mais coûté des allers-retours (2026-10-09) : ce coût se mesure plutôt qu'il ne se suppose.

## QUA-105 — Le workflow du mini-banc ne tourne qu'à la demande, sans secret dans les résultats
**Règle** : Propre au dépôt drwil (QUA-018). `.github/workflows/banc.yml` ne se déclenche que par `workflow_dispatch`, jamais sur une PR ni un push ; jeton GitHub du job en lecture seule ; version de Claude Code épinglée ; deux passages à la fois au plus (fenêtre d'usage de l'abonnement) ; seul secret, le jeton d'abonnement `CLAUDE_CODE_OAUTH_TOKEN`. L'agent ne reçoit que le strict nécessaire de l'environnement ; tout jeton ou clé présent dans un résultat est masqué avant l'écriture, et le masque est dit. Le retrait des tâches et de l'historique avant le passage (`--isoler`) ne s'emploie que sur une machine de CI.
**Périmètre** : `.github/workflows/banc.yml`, `outils/banc.mjs` (`envAgent`, `isoler`), `outils/banc-juge.mjs` (`masquerSecrets`, `ecrireResultat`).
**Source de vérité** : `.github/workflows/banc.yml`, `outils/banc-juge.mjs`.
**Preuve** : tests du banc (workflow lu en YAML, résultats écrits avec un faux jeton).
**Contrôle** : `tests-qua-105`
**Tests** : `outils/banc.test.mjs`
**Origine** : mini-banc — « Le workflow du banc ne se déclenche qu'à la demande, jamais sur une PR ni un push, et aucun secret n'apparaît dans les résultats »
**Raison** : Chaque passage consomme l'abonnement du demandeur : il ne part que sur son geste, et son jeton ne sort jamais du job.

## QUA-106 — Le rapport du mini-banc rapporte tous les passages, min et max, sur un protocole daté avant la mesure
**Règle** : Propre au dépôt drwil (QUA-018). `node outils/banc.mjs rapport` liste tous les passages de la campagne, mesurés ou non, puis par tâche et condition le min, le max et la moyenne de chaque mesure ; les passages d'essai n'y comptent pas. Il est refusé si `docs/benchmark-protocole.md` ne date pas le protocole réduit, ou s'il le date après un passage mesuré. Le rapport de campagne est versionné, daté, à côté du protocole, sans aucun passage relancé parce qu'il s'est mal passé.
**Périmètre** : `outils/banc-juge.mjs` (`rapport`, `dateProtocole`), `docs/benchmark-protocole.md`.
**Source de vérité** : `outils/banc-juge.mjs` (`rapport`).
**Preuve** : tests du banc. La campagne et son rapport sont un geste humain, qui ne peut venir qu'après la fusion du workflow sur la branche principale : sa vérification manuelle s'ajoutera ici quand la campagne sera lancée (`docs/intentions/campagne-mini-banc.md`).
**Contrôle** : `tests-qua-106`
**Couvre** : `outils/banc-juge.mjs`, `docs/benchmark-protocole.md`
**Tests** : `outils/banc.test.mjs`
**Origine** : mini-banc — « Le rapport de campagne rapporte tous les passages, min et max, avec le protocole daté fixé avant la mesure »
**Raison** : Avec 3 répétitions, seule une dispersion honnête de tous les passages dit quelque chose ; un protocole ajusté après coup ne dit plus rien.

## QUA-107 — Le mini-banc conserve le déroulé de chaque passage, secrets masqués
**Règle** : Propre au dépôt drwil (QUA-018). Chaque passage qui a lancé l'agent, mesuré ou non (délai dépassé, pas de résultat, erreur de l'agent), écrit à côté de son résultat le déroulé de la session de l'agent (le flux `stream-json` de `claude -p`), tel que reçu, ligne à ligne, dans un fichier de même nom en JSON Lines (`.jsonl`) ; tout jeton ou clé y est masqué avant l'écriture (`masquerSecrets`, comme le résultat, QUA-105), et le résultat dit le fichier, le nombre de lignes et le nombre de masques. Un passage qui n'a pas lancé l'agent n'a pas de déroulé, et son résultat le dit (`deroule: null`). Le rapport ne lit que les résultats, jamais un déroulé.
**Périmètre** : `outils/banc.mjs` (`passage`), `outils/banc-juge.mjs` (`ecrireResultat`).
**Source de vérité** : `outils/banc-juge.mjs` (`ecrireResultat`).
**Preuve** : tests du banc (passage simulé avec un faux jeton dans le flux, passages non mesurés, rapport sur un dossier qui contient un déroulé).
**Contrôle** : `tests-qua-107`
**Tests** : `outils/banc.test.mjs`
**Origine** : deroule-banc — « Chaque passage, mesuré ou non, écrit le déroulé de la session de l'agent à côté de son résultat, tel que reçu, ligne à ligne ; tout jeton ou clé y est masqué avant l'écriture, et le résultat dit le nombre de masques ; le rapport ne lit que les résultats, jamais un déroulé »
**Raison** : Le résultat ne garde que les chiffres et le verdict : on saurait qu'un agent a été bloqué, pas où ni pourquoi ; le dépôt est public, l'artefact du run se télécharge.

## QUA-108 — La copie du mini-banc est préparée comme chez un utilisateur réel
**Règle** : Propre au dépôt drwil (QUA-018). Dans la condition « avec », drwil est installé dans la copie depuis le tarball de la version construite dans ce dépôt (`npm pack`, jamais une version publiée ailleurs), en dépendance de développement, puis `init` par ce paquet ; `npx drwil` s'y résout sur place, jamais sur le registre npm, et `npx drwil verify` y tourne hors réseau ; aucune fiche bloquante n'y existe (garanties obligatoires ni câblées ni exigées : la forge protégée est impossible dans le bac à sable). La copie « avec » est ensuite adoptée comme chez un utilisateur avant sa première tâche, de façon fixe et identique à chaque passage, commitée avant l'activation des hooks (`docs/recipes/adopt-the-kit.md`, étapes 1 à 3) : CI déclarée, carte d'architecture qui cite le code avec son rôle, code existant rattaché à la fiche « code existant » écrite par `init`, contrôles de la pile déclarés (`npm test`) ; un commit de fiche seule y passe et `verify` n'y signale aucune dette antérieure à l'agent (ni FAIL ni ERROR). Dans les deux conditions, la copie a un dépôt distant local (`origin`), qui a déjà sa branche principale, où pousser une branche ; seule l'installation de drwil diffère.
**Périmètre** : `outils/banc.mjs` (`installerDrwil`, `adopter`, `preparer`).
**Source de vérité** : `outils/banc.mjs` (`preparer`).
**Preuve** : tests du banc sur une copie préparée réellement (tarball, `npx drwil verify` hors réseau, push d'une branche hooks actifs ; copie adoptée : commit d'une fiche seule, `verify` sans FAIL ni ERROR).
**Contrôle** : `tests-qua-108`
**Tests** : `outils/banc.test.mjs`
**Origine** : deroule-banc — « La copie est préparée comme chez un utilisateur réel : dans la condition « avec », drwil est installé depuis le tarball du dépôt en dépendance de développement, puis `init` par ce paquet, et `npx drwil` s'y résout sur place, jamais sur le registre npm ; dans les deux conditions, la copie a un dépôt distant local où pousser une branche. Prouvé sur une copie préparée réellement : `npx drwil verify` y tourne hors réseau, aucune fiche bloquante n'y existe, une branche s'y pousse »
**Raison** : drwil n'est pas publié sur npm et la copie n'avait aucun dépôt distant : `npx drwil verify` et un push y auraient échoué par la faute du banc, faussant la mesure contre la condition « avec ».

## QUA-109 — Le job de passage du mini-banc installe gitleaks comme la CI principale
**Règle** : Propre au dépôt drwil (QUA-018). Le job `passage` de `.github/workflows/banc.yml` installe gitleaks avant le passage, avec la même étape que la CI principale (`.github/workflows/ia-first.yml`) : version épinglée, archive vérifiée par sa somme sha256 publiée, installée dans `~/.local/bin`, là où le moteur le cherche (`HOME` passe à l'agent, QUA-105).
**Périmètre** : `.github/workflows/banc.yml` (job `passage`).
**Source de vérité** : `.github/workflows/banc.yml`.
**Preuve** : test du banc qui lit les deux workflows en YAML et compare l'étape d'installation.
**Contrôle** : `tests-qua-109`
**Tests** : `outils/banc.test.mjs`
**Origine** : banc-pret-essai — « Le job de passage du banc installe gitleaks en version épinglée, archive vérifiée par sa somme, comme la CI principale ; prouvé par la lecture du workflow »
**Raison** : Sans gitleaks, le contrôle des secrets de la copie « avec » est « non exécuté » et le push refusé (QUA-013) : la mesure pèserait contre drwil pour une installation incomplète du banc.

## QUA-110 — `init` rattache le code indexé avant le kit : le premier commit d'une fiche passe
**Règle** : Livré à tout projet. À la première installation d'un projet qui a déjà des fichiers de code indexés par git (jugés par `isCode` de `.githooks/scope.mjs`, avec le réglage écrit par `init`), hors fichiers du kit et fichiers déjà couverts par une fiche, `init` écrit une fiche de référence « code existant » (`docs/projects/existing-code.md`, si présent, statut « référence — … », bloc `scope` qui les liste un par un) et ajoute à la carte `docs/architecture.md` qu'il vient d'écrire une section qui cite chacun de leurs dossiers, rôle « à décrire à l'adoption ». Un projet neuf (aucun code indexé) et une mise à jour n'en reçoivent aucune ; une fiche ou une carte déjà présente n'est jamais réécrite (les dossiers à citer sont alors dits) ; `uninstall` laisse la fiche en place. Un chemin qu'un bloc `scope` ne peut pas nommer seul est signalé, jamais écrit.
**Périmètre** : `drwil init`.
**Source de vérité** : `packages/drwil/src/existing-code.ts` (`attachExistingCode`), `packages/drwil/src/index.ts` (`init`).
**Preuve** : tests du paquet sur un vrai projet installé (hooks actifs, `scopeReminder` et `newRequirements` bloquants) : `run-checks` n'y signale ni fichier hors fiche ni dossier absent de la carte, le commit d'installation puis celui d'une fiche seule passent ; projet neuf, mise à jour, fiche et carte préexistantes, `uninstall`, textes anglais.
**Contrôle** : `tests-qua-110`
**Tests** : `packages/drwil/test/existing-code.test.mjs`
**Origine** : premier-commit-avant-adoption — « Sur un projet qui a déjà des fichiers de code indexés, `init` écrit une fiche de référence « code existant » dont le bloc `scope` couvre chacun d'eux (hors fichiers du kit), et une carte d'architecture qui cite chacun de leurs dossiers ; prouvé sur un vrai projet installé : un commit qui ne touche qu'une fiche y passe, hooks actifs et réglages bloquants, et `run-checks` n'y signale aucun fichier hors fiche ni dossier absent de la carte » ; « Un projet neuf (aucun code indexé) et la mise à jour d'un projet déjà installé ne changent pas : aucune fiche « code existant » créée, aucune fiche ni carte existante réécrite »
**Raison** : Sur une installation neuve, le rappel de cadrage (QUA-016) et la carte (QUA-040) sont bloquants sur tout le dépôt : sans ce rattachement, le premier geste de gouvernance d'un agent sur un projet existant, le commit d'une fiche seule, échoue sur une dette antérieure à lui et l'agent, qui ne contourne rien (QUA-019), s'arrête.

## QUA-111 — La barrière de périmètre juge un commit de fusion sur sa seule résolution
**Règle** : Livré à tout projet. Au commit (pre-commit), pendant une fusion (`MERGE_HEAD` présent), la barrière de périmètre ne juge que la résolution : un fichier indexé identique à sa version dans l'un des deux parents (`HEAD` ou `MERGE_HEAD`, mode et contenu ; un fichier supprimé de l'index et absent d'un parent compte comme identique à ce parent) est apporté tel quel et passe, quels que soient l'activité et le cadrage ; un fichier différent des deux parents (conflit résolu, combinaison) reste jugé comme tout fichier indexé. Un appel git qui échoue juge le fichier, jamais ne le laisse passer (QUA-013). Hors fusion, rien ne change ; le push et la CI ignorent déjà les commits de fusion.
**Périmètre** : `.githooks/scope-gate.mjs` (`checkScope`, au pre-commit) ; livré dans le gabarit.
**Source de vérité** : `.githooks/scope-gate.mjs` (`resolution`).
**Preuve** : tests des hooks sur un dépôt temporaire : fusion apportant un fichier hors cadrage acceptée en SCOPING, CLOSING et BUILD ; conflit résolu sur un fichier de code hors cadrage refusé ; fichier supprimé par la branche principale accepté ; commit ordinaire inchangé ; `MERGE_HEAD` illisible : fichier jugé.
**Contrôle** : `tests-qua-111`
**Tests** : `.githooks/scope-gate.test.mjs`
**Origine** : barriere-commit-de-fusion — « Pendant une fusion, la barrière ne juge que la résolution : un fichier indexé identique à sa version dans l'un des deux parents passe, quels que soient l'activité et le cadrage ; un fichier différent des deux parents (conflit résolu, combinaison) reste jugé comme tout fichier indexé ; hors fusion, rien ne change »
**Raison** : Au commit d'une fusion de la branche principale dans une branche de chantier, la barrière comptait comme écrits par l'auteur les fichiers que la branche principale apportait (PR #213, 2026-10-23) : chaque conflit entre une branche de chantier et la branche principale bloquait le commit.

## QUA-112 — Chaque ligne de CODEOWNERS cite un chemin suivi par Git
**Règle** : Propre au dépôt drwil, jamais livré (QUA-018). Chaque ligne utile de `.github/CODEOWNERS` cite un motif qui correspond à au moins un fichier ou dossier suivi par Git, lu selon la syntaxe GitHub (`/` en tête ou au milieu ancre à la racine, `/` final ne vise qu'un dossier, `*` reste dans un segment, `**` en traverse plusieurs) ; un motif à la syntaxe non prise en charge (`?`, `[`, `\`, `!`), un `CODEOWNERS` absent ou un `git ls-files` qui échoue est une erreur, jamais un succès (QUA-013). En particulier, le registre des contrats y est cité sous son nom actuel.
**Périmètre** : `.github/CODEOWNERS` de ce dépôt ; rejoué au commit et en CI sur tout changement (un renommage peut vider une ligne).
**Source de vérité** : `outils/verifier-codeowners.mjs`.
**Preuve** : contrôle `codeowners` sur le dépôt ; tests sur des dépôts temporaires : fichier et dossier suivis acceptés, chemin absent refusé avec sa ligne, fichier présent mais non suivi refusé, motif non interprété en erreur, `CODEOWNERS` absent ou dépôt illisible en erreur.
**Contrôle** : `codeowners`, `tests-qua-112`
**Tests** : `outils/verifier-codeowners.test.mjs`
**Origine** : codeowners-registre — « `.github/CODEOWNERS` cite le registre sous son nom actuel, et un contrôle du dépôt, rejoué au commit et en CI, refuse toute ligne de `CODEOWNERS` dont le chemin ne correspond à aucun fichier ni dossier suivi par Git »
**Raison** : `CODEOWNERS` citait encore l'ancien nom docs/contrats.md après le renommage du registre en `docs/contracts.md` : GitHub ignore en silence une ligne qui ne correspond à rien, et une modification des contrats n'exigeait plus la revue du propriétaire que le ruleset impose (`require_code_owner_review`) aux autres zones sensibles.

## QUA-113 — Sur une PR, la CI rejoue les contrôles avec les hooks de la branche principale
**Règle** : Livré à tout projet, GitHub et GitLab. Dans le job `checks` (celui que la protection exige), hors de la branche principale, la CI lance la copie de `.githooks/base-checks.mjs` lue sur la branche principale (celle de la branche contrôlée seulement tant que la principale n'en a pas, à l'adoption). Ce script lit par Git (`git show <base>:…`, dans un dossier temporaire, jamais par un second clone) les `.githooks/` de la branche principale, les pose sur la copie de travail le temps d'un `.githooks/run-checks.mjs`, avec la liste de contrôles de la branche, puis rend la copie de travail telle quelle. Il saute ce rejeu, en le disant dans sa sortie, seulement quand `.githooks/` et `.drwil/ia-first.json` de la branche sont identiques octet pour octet à ceux de la branche principale (fichiers suivis ou non) : le rejeu serait alors strictement le passage déjà fait (QUA-123). Au moindre écart, au moindre doute ou si Git ne répond pas, il rejoue. Le rejeu reprend le verdict de la première passe de la PR (`DRWIL_CI_REUSE=1`, QUA-250, fichier de verdicts laissé par cette passe) pour chaque contrôle « ok » dont l'empreinte propre (sa déclaration et les fichiers de ses `paths`, QUA-141) est identique une fois les hooks de la branche principale posés, et le dit (« reprise demandée ») : un hook affaibli que lit un contrôle change son empreinte, donc ce contrôle est rejoué avec le hook de la base et échoue comme avant. Quand la pose change un module du moteur de `run-checks` (`.githooks/run-checks.mjs` de la branche principale et les modules qu'il importe, suivis par Git, hors fichiers déclarés gardés), le rejeu ne reprend rien (`--tout-rejouer`) et le dit (« aucune reprise ») : ce moteur juge et écrit les verdicts de tous les contrôles. Échouent : les contrôles en échec avec ces hooks (un hook affaibli ou supprimé par la branche), un contrôle de `.drwil/ia-first.json` de la branche principale absent de celui de la branche (comparé par `id`, sinon `name`, sinon `run`). Un contrôle retiré, ou un fichier de `.githooks/` gardé à sa version de la branche (son fichier de test `<nom>.test.mjs` avec lui), passe s'il est cité entre backticks en tête d'une puce de la section « Contrats modifiés » d'une fiche touchée par la branche, lue à sa dernière version (avant sa suppression à la clôture), validée par le demandeur. Branche principale inconnue ou introuvable (premier push, branche orpheline, clone superficiel), historique ou configuration illisibles : « non exécuté », code 1, jamais un succès (QUA-013) ; branche principale sans `.githooks/` (adoption) : « non applicable ». Limites assumées : une branche qui corrige un défaut d'un hook est jugée par le hook encore fautif tant que le fichier n'est pas déclaré ; une branche qui retire l'étape du workflow lui-même n'est retenue que par la relecture.
**Périmètre** : `.githooks/base-checks.mjs` ; étape du job `checks` des CI du gabarit (`ci/github`, `ci/gitlab`) et de ce dépôt.
**Source de vérité** : `.githooks/base-checks.mjs` (`replay`).
**Preuve** : tests des hooks sur des dépôts temporaires : hook affaibli refusé et rendu, hook supprimé rejoué puis absent, reprise demandée quand le moteur de `run-checks` est celui de la base (module importé de loin compris, version déclarée gardée comprise), aucune reprise et `--tout-rejouer` quand la pose le change, contrôle retiré non déclaré refusé, retrait déclaré accepté même fiche supprimée, hook déclaré gardé avec son test, rejeu sauté si hooks et configuration sont identiques à la base, base introuvable ou orpheline « non exécuté », base sans hooks « non applicable », ligne de commande ; scénario de contournement dans un projet installé ; les trois CI le lancent dans le job `checks`.
**Contrôle** : `tests-qua-113`
**Tests** : `.githooks/base-checks.test.mjs`, `packages/drwil/test/cycle.test.mjs`, `.github/scripts/workflows-yaml.test.mjs`
**Origine** : contournements-completes — « Sur une PR, la CI rejoue aussi les contrôles avec le code des hooks de la branche principale (sa `.githooks/`) et la liste de contrôles de la PR : une PR qui affaiblit un hook échoue ; un contrôle retiré de `.drwil/ia-first.json` fait échouer la CI, sauf s'il est déclaré dans « Contrats modifiés » de la fiche du chantier, validé par le demandeur ; prouvé par un scénario de contournement dans un vrai dépôt »
**Raison** : La CI exécutait les scripts de la branche contrôlée : une PR qui affaiblissait `.githooks/run-checks.mjs` ou retirait un contrôle se validait elle-même ; seule la relecture d'un code owner l'arrêtait dans ce dépôt, et rien dans un projet adopté sans CODEOWNERS.

## QUA-114 — La garde shell de Claude Code refuse le saut des hooks et l'écriture de core.hooksPath
**Règle** : Livré à tout projet équipé de Claude Code. Le hook `PreToolUse` `.claude/hooks/bash-guard.mjs` refuse (`deny`), sans demander l'accord, toute commande qui saute les hooks git ou écrit, supprime ou surcharge `core.hooksPath` : `--no-verify` (et ses abréviations `--no-veri`, `--no-verif`) sur toute commande git, `-n` dans les options courtes de `git commit` (avant une option à valeur), `-c core.hooksPath=…` et `--config-env core.hooksPath=…`, `git config` qui écrit, ajoute, retire ou édite `core.hooksPath` ou retire la section `core`, une variable `GIT_CONFIG_*` dans une commande qui cite `hooksPath`, une édition de `.git/config` qui cite `hooksPath` (`sed -i`, `tee`, redirection). Il voit chaque commande d'une commande composée (`&&`, `;`, `|`, sous-shell) et les chaînes entre guillemets (`sh -c "…"`, `eval`). Lire le réglage (`git config core.hooksPath`, `--get`, `get`) passe ; un refus l'emporte sur une demande d'accord ; les autres risques (secrets, pipe vers un shell) gardent la demande d'accord. Une chaîne entre guillemets qui cite une telle commande (message de commit, texte écrit par un heredoc) est refusée aussi : l'agent passe alors par un fichier.
**Périmètre** : `.claude/hooks/bash-guard.mjs` (gabarit `tools/claude`).
**Source de vérité** : `.claude/hooks/bash-guard.mjs` (`skipsHooks`).
**Preuve** : tests du paquet : chaque forme refusée, y compris composée et dans `sh -c`, `bash -c`, `eval` ; les lectures et les messages qui citent `-n` ou `--no-verify` sans commande git passent ; dans un projet installé, le refus l'emporte sur la demande d'accord d'un `.env`.
**Contrôle** : `tests-qua-114`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : contournements-completes — « La garde shell de Claude Code refuse à l'agent, sans demander, toute commande qui saute les hooks ou écrit, supprime ou surcharge `core.hooksPath` (`--no-verify`, `commit -n`, `-c core.hooksPath=`, `git config core.hooksPath`, `--unset`, `GIT_CONFIG_*`), y compris dans une commande composée ou un `sh -c` ; une simple lecture du réglage passe »
**Raison** : Les permissions de Claude Code refusaient `git *--no-verify*` et `git -c *`, mais ni `git config core.hooksPath …`, ni `--unset`, ni les variables `GIT_CONFIG_*`, ni une commande enfouie dans `bash -c "…"` ; la garde shell ne les voyait pas.

## QUA-115 — `bypass_actors` est vérifié avec le jeton de l'humain, « non vérifié » sinon
**Règle** : Livré à tout projet sur GitHub. `drwil guarantees` lit, pour chaque ruleset qui protège la branche principale (`rules/branches/<branche>`, `ruleset_id`), sa liste `bypass_actors`, que GitHub ne renvoie qu'à un administrateur : lue et non vide, c'est un manque de la protection (fiche bloquante, QUA-095) ; absente (jeton non administrateur), ruleset illisible ou règles sans ruleset nommé, la ligne « non vérifié » s'affiche (⚠), sans compter ni comme un manque ni comme une protection tenue de plus. `drwil doctor` affiche le même constat (point « Contournement du ruleset » : ok, ⚠ non vérifié, ✗ contourné), hors GitHub ou sans ruleset aucun point. La CI ne le compare pas : son jeton n'est pas administrateur, et aucun jeton administrateur n'y est ajouté.
**Périmètre** : `drwil guarantees`, `drwil doctor`.
**Source de vérité** : `packages/drwil/src/guarantees-forge.ts` (`rulesetBypass`, `bypassDiagnosis`).
**Preuve** : tests du paquet, forge simulée : liste vide tenue, liste non vide en manque, champ absent ou ruleset illisible « non vérifié » affiché par `guarantees` et `doctor`, hors GitHub ou sans ruleset rien.
**Contrôle** : `tests-qua-115`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : contournements-completes — « `bypass_actors` reste non comparé en CI, limite écrite : `drwil guarantees` et `doctor` le vérifient avec le jeton de l'humain quand il est administrateur, et le disent « non vérifié » sinon »
**Raison** : `.github/scripts/verifier-ruleset.mjs` ne compare `bypass_actors` que s'il le lit, et le jeton de la CI n'est pas administrateur : un acteur ajouté au contournement du ruleset passait sans trace.

## QUA-116 — Un chantier clos dont la PR révèle un défaut se rouvre sur sa branche, d'une commande
**Règle** : Livré à tout projet. En CLOSING, `node .githooks/state.mjs reopen` rouvre le chantier dont la PR, ouverte et pas encore fusionnée, révèle un défaut : sur la branche du chantier (ni la branche principale, ni un HEAD détaché), arbre propre, l'état de la PR lu par `gh pr view` ; une fusion automatique programmée est annulée avant tout (`gh pr merge --disable-auto`, puis relue : encore programmée, refus) ; la fiche revient telle qu'au parent du commit de la branche qui l'a supprimée, dans un commit qui ne touche qu'elle (hooks compris ; refusé, la fiche est retirée et l'état reste) ; l'activité repasse en BUILD sur elle, sur la même branche, avec la marque `reopened` (numéro de la PR), l'autorisation de fusion et la file du lancement gardées, l'historique jamais réécrit, rien poussé. Fiche encore dans HEAD : rien à restaurer, l'état seul change. Refusée sans rien changer hors CLOSING, sur un arbre modifié, hors branche de chantier, sur une PR fusionnée ou fermée, quand l'état de la PR est inconnu (`gh` absent, muet ou illisible) ou qu'aucun commit de la branche ne supprime la fiche ; un appel `git` ou `gh` qui échoue refuse (QUA-013). La transition `move` depuis CLOSING reste SCOPING seule ; la marque `reopened` ne vit que de BUILD à CLOSING et tombe au retour en SCOPING.
**Périmètre** : `.githooks/state-cli.mjs` (`reopen`), `.githooks/state.mjs` (validation, `writeState`), `.githooks/state-texts.mjs` (messages, contexte, règle de CLOSING) ; livré dans le gabarit.
**Source de vérité** : `.githooks/state-cli.mjs` (`reopen`).
**Preuve** : tests des hooks sur de vrais dépôts git temporaires, `gh` simulé : PR ouverte avec et sans fusion automatique, fusionnée, fermée, inconnue, réponse illisible, annulation en échec ou sans effet, hook pre-commit qui refuse, fiche encore dans HEAD ; ordre vérifié (annulation avant le premier commit) ; cycle complet dans un projet installé, hooks réels.
**Contrôle** : `tests-qua-116`
**Tests** : `.githooks/state.test.mjs`
**Origine** : reouvrir-apres-cloture — « En CLOSING, quand la PR du chantier est ouverte et non fusionnée, l'agent rouvre le chantier seul, par une commande : la fiche revient telle qu'elle était au commit qui précède la clôture, l'activité repasse en BUILD sur elle, sur la même branche, sans réécrire l'historique ni pousser en force ; une fusion automatique programmée est annulée avant tout ; la réouverture est refusée, sans rien changer, hors CLOSING, sur une PR fusionnée ou fermée, et quand l'état de la PR est inconnu (`gh` absent) »
**Raison** : Un défaut révélé après le commit de clôture (CodeQL le 2026-10-21, CI rouge sur la PR #213 le 2026-10-23) laissait l'agent sans chemin gouverné : CLOSING ne mène qu'à SCOPING, la fiche est supprimée, la barrière n'accepte le code qu'en BUILD et un détour part de la branche principale, où le code fautif n'est pas.

## QUA-117 — Un correctif de réouverture qui change les règles du jeu attend le oui de l'humain
**Règle** : Livré à tout projet. Sur un chantier rouvert (QUA-116), la barrière de périmètre applique au commit en préparation l'exception du détour (QUA-050), sans la dupliquer : un fichier qui change les règles du jeu (contrat existant du registre modifié ou retiré, hook, seuil et contrôles de `.drwil/ia-first.json`, CI, sources du gabarit de leurs copies déclarées) est refusé jusqu'au oui de l'humain, donné dans un terminal interactif par `node .githooks/detour.mjs allow` (marque `human` de `reopened`) ; un ajout pur au registre et un correctif ordinaire passent sans personne ; en file, le sous-agent s'arrête.
**Périmètre** : `.githooks/scope-gate.mjs` (`checkIndex`), `.githooks/detour.mjs` (`allow`, `rulesFiles`, `contractsAddedOnly`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/scope-gate.mjs` (`checkIndex`).
**Preuve** : tests des hooks : hook, registre, CI, réglages et source de gabarit refusés, correctif ordinaire et ajout pur au registre acceptés, oui refusé sans terminal ou sans confirmation, donné puis correctif accepté ; en anglais aussi.
**Contrôle** : `tests-qua-117`
**Tests** : `.githooks/scope-gate.test.mjs`
**Origine** : reouvrir-apres-cloture — « Un correctif de réouverture qui change les règles du jeu (contrat existant modifié ou retiré, hook, seuil, barrière, CI) voit ses commits refusés par la barrière de périmètre jusqu'au oui de l'humain, comme un détour ; un correctif ordinaire passe sans personne »
**Raison** : L'agent rouvre seul : sans cette borne, une réouverture permettrait d'affaiblir un contrôle après la clôture, sans le oui que le détour exige déjà.

## QUA-118 — La nouvelle clôture d'un chantier rouvert passe comme la première, sans rien doubler
**Règle** : Livré à tout projet. La clôture (`node .githooks/close.mjs`) d'un chantier rouvert (QUA-116) réécrit sa preuve de clôture sur le nouveau commit vérifié (QUA-084) et remplace sa ligne de consommation de `.drwil/usage.jsonl` par le nouveau total, journaux relus en entier ; rien de mesuré, la ligne précédente reste telle quelle ; hors réouverture, une ligne existante n'est jamais remplacée (QUA-042). Le journal ne garde qu'une entrée par chantier : deux entrées `## ` qui citent la même preuve font échouer la clôture et son `--check`, en le disant. L'autorisation de fusion automatique et la file décidées au lancement restent jusqu'au retour en SCOPING.
**Périmètre** : `.githooks/close.mjs` (`recordConsumption`, `journalTwice`, `closingReport`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/close.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (première clôture commitée, réouverture, correctif, nouvelle clôture ; journaux vides ; entrée doublée, en anglais aussi) et du paquet : cycle complet dans un projet installé, hooks réels et `gh` simulé dans le PATH — une entrée de journal, une ligne de consommation au nouveau total, preuve réécrite, première clôture gardée dans l'historique.
**Contrôle** : `tests-qua-118`
**Tests** : `.githooks/close.test.mjs`, `packages/drwil/test/cycle.test.mjs`
**Origine** : reouvrir-apres-cloture — « La nouvelle clôture passe comme la première : une seule entrée de journal pour le chantier (mise à jour, jamais doublée), une seule ligne de consommation, preuve de clôture réécrite sur le nouveau commit vérifié ; l'autorisation de fusion automatique et la file décidées au lancement sont gardées »
**Raison** : Sans elle, la seconde clôture d'un chantier rouvert gardait la consommation de la première (« déjà une ligne »), et rien n'empêchait une seconde entrée de journal pour le même chantier.

## QUA-119 — Les contrôles du projet vont plus vite sans rien perdre de leur exigence
**Règle** : Livré à tout projet. Avec le réglage `parallel` de `.drwil/ia-first.json`, le moteur sait lancer en même temps (au plus la moitié des cœurs, deux au moins, Node seul) les contrôles de commande — ceux du projet et les tests des contrôles eux-mêmes ; un contrôle peut y renoncer (`parallel: false`). `.githooks/run-checks.mjs` lit les résultats dans l'ordre de la liste : mêmes rapport, mêmes sorties groupées par contrôle et même verdict qu'une exécution en série. Chaque contrat garde son contrôle propre (QUA-033, un contrôle par règle), un échec nomme son contrôle, une commande qui ne peut pas démarrer échoue, un contrôle reporté reste « non exécuté » (QUA-013, un contrôle non exécuté n'est pas un succès). Sans le réglage, tout reste en série.
**Périmètre** : `.githooks/engine.mjs` (`checks`, `startParallel`), `.githooks/run-checks.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/engine.mjs` (`startParallel`).
**Preuve** : tests des hooks : mêmes verdicts en parallèle et en série (réussite, échec, commande introuvable, autotest), contrôle qui renonce, sans réglage rien en parallèle, limite de concurrence ; run-checks sur un projet temporaire : ordre du rapport, sorties groupées, non exécuté signalé.
**Contrôle** : `tests-qua-119`
**Tests** : `.githooks/engine.test.mjs`, `.githooks/run-checks.test.mjs`
**Origine** : acceleration-ci — « Les contrôles du projet s'exécutent à la même exigence qu'avant, plus vite : chaque contrat garde son contrôle propre, un échec nomme toujours le contrat fautif, et un contrôle qui ne s'est pas exécuté reste un échec »
**Raison** : Le job `checks` durait environ 3,4 min en série ; une PR attendait 5 à 6 min à chaque passage, y compris pour une correction d'une ligne.

## QUA-120 — La compilation du projet n'est faite qu'une fois par passage
**Règle** : Livré à tout projet. Le réglage `build` de `.drwil/ia-first.json` déclare la commande de compilation ; un contrôle qui en dépend le dit (`needsBuild`) et ne la relance pas : le moteur la fait une fois par passage, au premier contrôle qui doit réellement tourner (un contrôle reporté ne la déclenche pas), en série comme en parallèle. Une compilation en échec fait échouer chaque contrôle qui en dépend, en nommant ce contrôle, sa sortie dite une seule fois ; `needsBuild` sans `build` déclaré échoue aussi : jamais un succès faute d'avoir compilé (QUA-013, un contrôle non exécuté n'est pas un succès).
**Périmètre** : `.githooks/engine.mjs` (`checks`), `.drwil/ia-first.json` (`build`, `needsBuild`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/engine.mjs` (`build`, `buildAsync`).
**Preuve** : tests des hooks : un seul build pour plusieurs contrôles, en série puis en parallèle, aucun build quand rien n'en dépend ou que le contrôle est reporté, build en échec (message nommant le contrôle, sortie dite une fois, en français et en anglais), `needsBuild` sans `build`.
**Contrôle** : `tests-qua-120`
**Tests** : `.githooks/engine.test.mjs`
**Origine** : acceleration-ci — « La compilation du paquet n'est faite qu'une fois par passage de `run-checks`, pas une fois par contrôle ; une compilation en échec fait échouer tous les contrôles qui en dépendent, jamais passer »
**Raison** : 56 contrôles refaisaient chacun `tsc --build` avant leur `node --test` filtré.

## QUA-121 — Le workflow ne rejoue pas deux fois un même commit de branche
**Règle** : Propre au dépôt drwil (QUA-018). Un push sur une branche qui a déjà une pull request ouverte est sauté, l'étape `pr` du job `matrice-os` le reconnaissant : `checks` ne tourne pas et `kit-tests` rapporte ses noms exigés sans tester, en le disant (notice), la PR gardant ses propres checks ; sans PR ouverte, ou si GitHub ne répond pas, le push teste comme avant (QUA-045) ; un push sur la branche principale n'est jamais sauté et garde l'alerte de CI cassée (`alert-if-ci-broken`). Les noms de checks exigés par le ruleset de master ne changent pas : `checks` et `kit-tests (<os>)`.
**Périmètre** : `.github/workflows/ia-first.yml`.
**Source de vérité** : `.github/workflows/ia-first.yml` (étape `pr` du job `matrice-os`).
**Preuve** : test de la structure du workflow : déclencheurs inchangés, `checks` dépend de `matrice-os` et saute sur sa sortie, la matrice de `kit-tests` devient non testée, master et GitHub muet jamais sautés, noms exigés et alerte conservés.
**Contrôle** : `tests-qua-121`
**Tests** : `.githooks/run-checks.test.mjs`
**Origine** : acceleration-ci — « Le workflow ne lance pas deux fois les mêmes jobs pour un même commit de branche (push et pull_request) ; un push sur la branche principale garde l'alerte de CI cassée et les noms de checks exigés par le ruleset de master ne changent pas »
**Raison** : Chaque commit poussé sur une branche à PR faisait tourner `checks` et `kit-tests` deux fois, pour le même verdict.

## QUA-122 — Le job `checks` est nettement plus court, hooks modifiés comme hooks inchangés
**Règle** : Propre au dépôt drwil (QUA-018). Preuve historique, bornée au chantier d'accélération de la CI du 2026-10-24 : hooks modifiés (rejeu complet), le job `checks` de la CI durait 3m02, 3m45 et 4m37 sur trois passages, contre une référence d'environ 5m35 (objectif retenu : 3m55 au plus) ; hooks inchangés (rejeu sauté, QUA-123) : non relevé. Ces valeurs et leurs limites sont conservées dans `docs/mesures-ci-reference.md`. Pour les chantiers suivants, la durée du job `checks` est un indicateur relevé à la main dans l'entrée de journal du chantier (référence du passage de CI, durée, catégorie « hooks modifiés » ou « hooks inchangés » ; « non mesurée » si le relevé manque ou est inexploitable) : sans seuil, il ne bloque ni `verify` ni la clôture.
**Périmètre** : `docs/mesures-ci-reference.md`.
**Source de vérité** : `docs/mesures-ci-reference.md` (mesures d'origine) ; `docs/projects/journal.md` (relevés suivants).
**Preuve** : aucune automatique : une durée de CI dépend de la charge de la forge, elle se relève sur la forge.
**Manuel** : examiner que `docs/mesures-ci-reference.md` reprend fidèlement les mesures et limites du journal du 2026-10-24, puis attester ; ajouter un contrôle ou modifier le workflow ne demande plus de renouveler cette attestation.
**Couvre** : `docs/mesures-ci-reference.md`
**Origine** : acceleration-ci — « Hooks modifiés : job `checks` au moins 30 % plus court que la référence ≈5m35 (≤ 3m55), relevé sur trois passages de CI ; hooks inchangés : durée relevée sur la première PR ordinaire après fusion, suivie par une intention jusqu'à relevé » ; duree-ci-en-indicateur — la durée future devient un indicateur non bloquant (QUA-023, évolution déclarée)
**Raison** : Sans mesure sur la forge, le gain annoncé reste une impression ; couvrir toute la configuration faisait tomber l'attestation à chaque contrôle ajouté.

## QUA-123 — Chaque contrôle n'est joué qu'une fois par PR en CI, sans perte de garantie
**Règle** : Livré à tout projet pour le saut du rejeu ; propre au dépôt drwil (QUA-018) pour Node. Sur une PR, le rejeu par la branche principale (QUA-113) n'a pas lieu quand `.githooks/` et `.drwil/ia-first.json` sont identiques octet pour octet à la base (fichiers suivis ou non) : il serait strictement le passage de `run-checks` déjà fait dans le même job ; le saut est dit dans la sortie (« rejeu sauté »), code 0. Hook ou configuration modifié, contrôle retiré, hook supprimé : rejeu complet, avec les échecs de QUA-113. Au moindre doute (lecture Git en échec), rejeu : un contrôle non exécuté reste un échec (QUA-013), jamais un saut silencieux. Dans ce dépôt, le job `checks` joue toute la suite une seule fois, sur Node 22 (plus ancienne version prise en charge) ; plus d'`npm test` séparé qui refait `couverture-tests` ; Node 24 joue la suite du paquet dans `kit-tests`. Un hook ne peut pas être affaibli par une PR : tout écart rejoue avec les hooks de la base.
**Périmètre** : `.githooks/base-checks.mjs` ; job `checks` de `.github/workflows/ia-first.yml`.
**Source de vérité** : `.githooks/base-checks.mjs` (`unchanged`) ; `.github/workflows/ia-first.yml`.
**Preuve** : tests des hooks sur dépôts temporaires : hooks et configuration identiques ⇒ saut dit (français, anglais) ; hook modifié, fichier non suivi, contrôle retiré ⇒ rejeu et échec ; index Git illisible ⇒ pas de saut ; test de la structure du workflow : `checks` sur Node 22, sans `npm test` séparé.
**Contrôle** : `tests-qua-123`
**Tests** : `.githooks/base-checks.test.mjs`, `.githooks/run-checks.test.mjs`
**Origine** : acceleration-ci — « Chaque contrôle n'est joué qu'une seule fois par PR en CI, à l'endroit stratégique qui permet à l'agent de corriger son développement, sans perte de garantie : un hook ne peut jamais être affaibli par une PR, la CI reste la porte de confiance »
**Raison** : Le rejeu complet doublait le job `checks` même quand la PR ne touchait ni hooks ni contrôles, et `npm test` refaisait `couverture-tests`.

## QUA-124 — Un contrat ou une entrée du journal se lit seul, sans lire tout le fichier
**Règle** : Livré à tout projet. `node .githooks/glossary.mjs --contract <ID>` rend le texte complet d'un contrat du registre (titre et champs, tels qu'écrits), `--journal <chantier>` l'entrée du journal d'un chantier (celle qui cite sa preuve de clôture ou sa branche, à défaut celle dont le titre contient le texte donné) ; un ID ou un chantier inconnu le dit et sort en 1, jamais une sortie vide. `AGENTS.md` (gabarit et dépôt) et les recettes renvoient à cette lecture ciblée, jamais à la lecture du registre ou du journal entiers.
**Périmètre** : `.githooks/glossary.mjs` (`contractText`, `journalEntries`) ; `AGENTS.md`, `docs/recipes/working-with-branches.md`, `docs/recipes/track-consumption-per-increment.md` ; livré dans le gabarit.
**Source de vérité** : `.githooks/glossary.mjs`.
**Preuve** : tests des hooks sur des projets temporaires : texte complet d'un contrat, entrée par preuve, par branche (jamais la branche voisine), par titre, dossiers réglés, inconnus en français et en anglais, ligne de commande.
**Contrôle** : `tests-qua-124`
**Tests** : `.githooks/glossary.test.mjs`
**Origine** : reduction-contexte — « Un agent obtient le texte complet d'un contrat par son ID, ou une entrée du journal par son chantier, sans lire le fichier entier ; `AGENTS.md` et les recettes pointent vers cette lecture ciblée, jamais vers la lecture du fichier entier »
**Raison** : Un fichier lu reste dans le contexte et se relit à chaque requête : `docs/contracts.md` et `docs/projects/journal.md` lus en entier pesaient près de la moitié du cache lu d'un chantier (relevé du 2026-10-24).

## QUA-125 — La liste de tous les contrats se lit en une lecture courte
**Règle** : Livré à tout projet. `node .githooks/glossary.mjs --contracts` rend une ligne par contrat du registre, « ID — titre », titre jamais raccourci, aucun omis ; `AGENTS.md` (gabarit et dépôt) y renvoie avant toute modification importante, pour identifier les contrats applicables sans connaître leur ID, puis lire chacun par `--contract`.
**Périmètre** : `.githooks/glossary.mjs` (`contractList`) ; `AGENTS.md` ; livré dans le gabarit.
**Source de vérité** : `.githooks/glossary.mjs`.
**Preuve** : tests des hooks : titre long gardé entier, contrat sans titre, section libre ignorée, registre absent.
**Contrôle** : `tests-qua-125`
**Tests** : `.githooks/glossary.test.mjs`
**Origine** : reduction-contexte — « Un agent obtient en une lecture courte la liste de tous les contrats (ID et titre, aucun omis) ; `AGENTS.md` y renvoie avant toute modification importante, pour identifier les contrats applicables sans connaître leur ID »
**Raison** : Sans liste complète, la lecture ciblée ferait manquer un contrat applicable dont l'agent ignore l'ID : la gouvernance s'affaiblirait pour gagner du contexte.

## QUA-126 — `run-checks` n'affiche que ses échecs et un résumé, le détail complet dans un fichier
**Règle** : Livré à tout projet. `.githooks/run-checks.mjs` n'affiche en sortie que les contrôles en échec — chacun nommé avec son contrat et son libellé (QUA-033, un contrôle par règle ; QUA-039, un identifiant vient avec ce qu'il désigne), suivi des 40 dernières lignes de sa sortie (toute la sortie en CI, où le fichier ne survit pas au job) — puis une ligne de résumé, qui nomme aussi les trois contrôles les plus lents de la passe avec leur durée (QUA-136, durée par contrôle). Le rapport complet (chaque contrôle annoncé, sa sortie, chaque avertissement, chaque échec, le résumé) est écrit dans `.drwil/evidence/run-checks.log` (si présent), hors de git ; un rapport impossible à écrire ne change pas le verdict. Un contrôle non exécuté hors commit reste un échec affiché (QUA-013, un contrôle non exécuté n'est pas un succès) ; le code de sortie ne change pas.
**Périmètre** : `.githooks/run-checks.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/run-checks.mjs`.
**Preuve** : tests des hooks sur des projets temporaires : sortie d'un échec long (contrat libellé, 40 dernières lignes, renvoi au fichier), rien d'un contrôle réussi ni d'annonce, détail complet dans l'ordre, CI avec toute la sortie, non exécuté en échec visible, rapport impossible à écrire.
**Contrôle** : `tests-qua-126`
**Tests** : `.githooks/run-checks.test.mjs`
**Origine** : reduction-contexte — « `run-checks` n'affiche en sortie que les contrôles en échec (chacun avec le contrat fautif, QUA-033) et une ligne de résumé ; le détail complet reste lisible dans un fichier, et un contrôle non exécuté reste un échec visible (QUA-013) »
**Raison** : La sortie complète de `run-checks` (annonces, sorties des suites de tests réussies, avertissements) entrait dans le contexte de l'agent et s'y relisait à chaque requête, pour un verdict qui tient en une ligne.

## QUA-127 — Le résumé de `run-checks` compte chaque avertissement et dit où lire le détail
**Règle** : Livré à tout projet. La ligne de résumé de `.githooks/run-checks.mjs` donne le nombre d'avertissements non bloquants (contrôles non exécutés au commit, audits périmés, rappels d'intentions), en réussite comme en échec, et le chemin du rapport complet ; un avertissement n'est jamais tu sans être compté : le compte est celui des lignes `⚠` du rapport.
**Périmètre** : `.githooks/run-checks.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/run-checks.mjs`.
**Preuve** : tests des hooks : quatre avertissements de natures différentes comptés et présents au rapport, résumé en échec et en réussite, en français et en anglais, renvoi au fichier d'une sortie coupée.
**Contrôle** : `tests-qua-127`
**Tests** : `.githooks/run-checks.test.mjs`
**Origine** : reduction-contexte — « Le résumé de `run-checks` compte les avertissements non bloquants et donne le chemin du fichier de détail ; un avertissement n'est jamais tu sans être compté »
**Raison** : Retirer les avertissements de la sortie sans les compter les aurait rendus invisibles : la gouvernance perdait ce que le contexte gagnait.

## QUA-128 — Les doublons d'intention possibles se signalent une fois par chemin cité
**Règle** : Livré à tout projet. À la clôture et à `node .githooks/close.mjs --check`, les avertissements de doublon possible (QUA-077, une intention nouvelle qui cite un chemin déjà cité est signalée) sont regroupés : une ligne par chemin cité, qui nomme chaque intention nouvelle qui le cite et, s'il y en a, les intentions plus anciennes ; deux intentions nouvelles qui se citent l'une l'autre sont nommées une fois. Les erreurs bloquantes restent toutes affichées, une par problème.
**Périmètre** : `.githooks/doc-coherence.mjs` (`twinIntents`), `.githooks/close.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/doc-coherence.mjs` (`twinIntents`).
**Preuve** : tests des hooks sur un vrai dépôt git temporaire : trois intentions nouvelles et une ancienne sur deux chemins ⇒ deux lignes, entre nouvelles seulement, en français et en anglais ; deux erreurs bloquantes toutes deux affichées.
**Contrôle** : `tests-qua-128`
**Tests** : `.githooks/close.test.mjs`
**Origine** : reduction-contexte — « `close.mjs --check` regroupe ses avertissements de doublon possible (une ligne par fichier cité, pas une par intention) ; les erreurs bloquantes restent toutes affichées »
**Raison** : Une clôture qui crée plusieurs intentions sur le même fichier produisait une ligne par paire, répétée à chaque `--check`, sans rien dire de plus.

## QUA-129 — Les contrôles longs tournent dans un sous-agent qui ne rend que le verdict et les échecs
**Règle** : Livré à tout projet. Avec Claude Code (et les outils qui reçoivent l'arbre `.claude`), le gabarit livre le sous-agent `drwil-checks` (`.claude/agents/drwil-checks.md`) : il lance `node .githooks/run-checks.mjs` puis `drwil verify --agent` et ne rend que le verdict et les échecs, sans rien modifier. `AGENTS.md` (gabarit et dépôt) donne la consigne pour tout outil : les contrôles longs en sous-agent si l'outil le permet, sans droit d'écriture ; sinon, les lancer directement. Aucune promesse au-delà de cette consigne écrite pour Copilot, Gemini et Codex (QUA-060, un outil n'est tenu que prouvé par le banc). Les hooks et skills de Claude Code ne changent pas (QUA-072).
**Périmètre** : `.claude/agents/drwil-checks.md`, `AGENTS.md`, `docs/ia-first/8-conduct-rules.md` ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/tools/claude/.claude/agents/drwil-checks.md`.
**Preuve** : test du paquet qui installe un projet Claude Code (sous-agent livré, commandes lancées, consigne d'`AGENTS.md`) et un projet Codex seul (pas d'arbre `.claude`, consigne présente) ; en-tête du sous-agent dans la preuve de QUA-072.
**Contrôle** : `tests-qua-129`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : reduction-contexte — « Avec Claude Code, les passages longs (`run-checks`, `drwil verify`) peuvent tourner dans un sous-agent livré (nommé `drwil-checks`, à créer dans l'arbre `.claude` du gabarit) qui ne renvoie que le verdict et les échecs ; pour les autres outils, `AGENTS.md` donne la consigne « si l'outil le permet » »
**Raison** : Les sorties des contrôles longs restaient dans le contexte de la session principale ; un sous-agent les lit dans un contexte à part et n'en rend que la conclusion.

## QUA-130 — Le sous-agent des contrôles recopie le verdict mot pour mot, sans attester ni écrire
**Règle** : Livré à tout projet. Le sous-agent `drwil-checks` recopie mot pour mot, sans reformulation ni résumé, la ligne de verdict `GOVERNANCE: …` de `drwil verify --agent` et les listes des contrats en échec, non vérifiés ou à attester (et des critères non prouvés), ainsi que les lignes d'échec de `run-checks` ; une commande qui ne tourne pas est dite « not run », jamais réussie. Ses outils sont une liste fermée sans outil d'écriture (`Bash`, `Read`, `Grep`, `Glob`) ; il n'exécute jamais `drwil attest` ni le verdict de recette (`drwil attest` exige de toute façon un terminal interactif et la saisie de l'ID). `AGENTS.md` dit que la session principale n'annonce « vérifié » que sur la ligne recopiée.
**Périmètre** : `.claude/agents/drwil-checks.md`, `AGENTS.md`, `docs/ia-first/8-conduct-rules.md` ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/tools/claude/.claude/agents/drwil-checks.md`.
**Preuve** : test du paquet sur un projet installé : liste d'outils fermée sans écriture, interdits et format de recopie mot pour mot dans le sous-agent, consigne de la session principale dans `AGENTS.md`. Le comportement d'une session réelle n'est pas rejoué (pas de session Claude Code dans les tests, comme pour QUA-072).
**Contrôle** : `tests-qua-130`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : reduction-contexte — « Le sous-agent recopie mot pour mot la ligne de verdict (`GOVERNANCE: …`) et la liste des contrats en échec ou à attester, sans reformulation ; il n'a accès ni à `drwil attest` ni à l'écriture de fichiers ; la session principale n'annonce « vérifié » que sur cette ligne recopiée »
**Raison** : Un sous-agent qui résume pourrait transformer un FAIL en « presque bon » ; la gouvernance ne repose que sur la ligne de verdict elle-même.

## QUA-131 — Après une clôture, le chantier suivant se lance dans une nouvelle session
**Règle** : Livré à tout projet. Revenu en SCOPING par une transition (après une clôture, hors file), le rappel d'état (`node .githooks/state.mjs`, la sortie de `move` et l'injection de début de session) invite à lancer le chantier suivant dans une nouvelle session, pour tout outil (Claude Code : `/clear` ; autre outil : une nouvelle conversation). Une file garde son sous-agent par chantier : en file, c'est le texte de la file qui parle. Un état neutre (aucune transition) ne le dit pas.
**Périmètre** : `.githooks/state-texts.mjs` (`context`) ; `AGENTS.md`, `docs/recipes/working-with-branches.md` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/state-texts.mjs`.
**Preuve** : tests des hooks sur un dépôt temporaire : CLOSING → SCOPING par `move` puis contexte, état neutre, file, BUILD, en français et en anglais.
**Contrôle** : `tests-qua-131`
**Tests** : `.githooks/state.test.mjs`
**Origine** : reduction-contexte — « Après le retour en SCOPING qui suit une clôture, le rappel d'état invite à ouvrir une nouvelle session pour le chantier suivant, pour tous les outils ; la file de chantiers garde son sous-agent par chantier »
**Raison** : Une session qui enchaîne plusieurs chantiers garde tout le contexte des précédents et le relit à chaque requête.

## QUA-132 — Avec Claude Code, le registre et le journal ne se lisent jamais en entier
**Règle** : Livré à tout projet qui installe Claude Code. Le hook `PreToolUse` sur l'outil Read (`.claude/hooks/read-guard.mjs`, branché dans `.claude/settings.json`) refuse, avant qu'elle ait lieu, la lecture sans plage (ni `offset` ni `limit`) du registre des contrats (`dirs.contracts` de `.drwil/ia-first.json`, par défaut `docs/contracts.md`) et du journal (fichier journal.md de `dirs.projects`, par défaut `docs/projects/journal.md`) ; `.claude/hooks/bash-guard.mjs` refuse `cat`, `less` ou `more` de ces fichiers dans une commande shell. Le refus renvoie vers `node .githooks/glossary.mjs --contract <ID>`, `--contracts` et `--journal <chantier>`. Restent permises : une lecture par plage (pour éditer), une recherche (Grep, `grep`, `sed -n`, `head`). Chemin absolu ou relatif, normalisé (liens symboliques résolus) ; un fichier absent du projet, une entrée inattendue ou une erreur interne laissent passer la lecture. Limites assumées : la garde shell juge le texte de la commande (une lecture cachée derrière une variable ou un autre programme n'est pas vue) ; les autres outils (Gemini, Copilot, Codex, Cursor) n'ont que la consigne écrite d'`AGENTS.md`.
**Périmètre** : `.claude/hooks/read-guard.mjs`, `.claude/hooks/bash-guard.mjs`, `.claude/settings.json`, `AGENTS.md`, `docs/ia-first/8-conduct-rules.md` ; livrés dans le gabarit.
**Source de vérité** : `.claude/hooks/read-guard.mjs` (`guardedFiles`, `decide`).
**Preuve** : test du paquet qui installe un projet et rejoue les hooks avec des entrées simulées : lecture entière refusée (chemin absolu, relatif, par un lien symbolique, depuis un sous-dossier), lecture par plage permise, autre fichier permis, fichier absent ou entrée invalide permis, chemins lus dans la configuration, message en français et en anglais ; `cat`, `less` et `more` refusés, `sed -n`, `grep` et `head` permis ; le `.claude/settings.json` livré branche le hook sur Read.
**Contrôle** : `tests-qua-132`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : reduction-contexte — « Avec Claude Code, la lecture entière de `docs/contracts.md` ou de `docs/projects/journal.md` est refusée avant qu'elle ait lieu (outil Read sans plage, `cat`/`less`/`more` du fichier dans une commande shell), avec un renvoi vers `node .githooks/glossary.mjs --contract <ID>`, `--contracts` et `--journal <chantier>` ; une lecture par plage et une recherche restent permises ; `AGENTS.md` le dit »
**Raison** : La consigne écrite de lecture ciblée (QUA-124) ne suffit pas : un agent qui lit le registre ou le journal en entier y ajoute des dizaines de milliers de tokens, relus à chaque requête suivante.

## QUA-133 — Chaque passe des contrôles a sa racine temporaire, supprimée à la fin
**Règle** : Livré à tout projet. Le moteur de contrôles (`.githooks/engine.mjs` : hooks, `run-checks`, `drwil verify`, CI) crée à chaque passe un dossier `drwil-checks-*` dans le dossier temporaire du système et donne à chaque contrôle qu'il lance son propre sous-dossier comme `TMPDIR`, `TMP` et `TEMP` ; la racine est supprimée à la fin de la passe (ou à la sortie du processus), de sorte qu'une passe réussie ne laisse aucun dossier `drwil-*`. Les sous-dossiers des contrôles en échec sont déplacés sous un chemin fixe par projet (`drwil-checks-failed-<empreinte>`), remplacé à chaque échec, jamais accumulé, et le résumé de `run-checks` dit ce chemin.
**Périmètre** : `.githooks/engine.mjs`, `.githooks/run-checks.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/engine.mjs` (`checks`, `finish`).
**Preuve** : test du moteur avec des contrôles simulés qui écrivent dans leur dossier temporaire : variables identiques et propres au contrôle, aucun reste après une passe réussie, dossier du contrôle en échec gardé au même chemin et remplacé à la passe suivante ; test de `run-checks` : le chemin gardé figure au résumé.
**Contrôle** : `tests-qua-133`
**Tests** : `.githooks/engine.test.mjs`
**Origine** : dossiers-temporaires-des-tests — « Chaque passe du moteur de contrôles donne à chaque contrôle qu'elle lance un dossier temporaire propre à la passe (variables `TMPDIR`, `TMP` et `TEMP`), supprimé à la fin de la passe ; une passe en échec garde le dossier temporaire de ses contrôles en échec pour le diagnostic, au même chemin d'une passe à l'autre »
**Raison** : Troisième épuisement des inodes de `/tmp` par des dossiers `drwil-*` de tests jamais supprimés (7 919, 40 061, 13 500) : corriger les tests un à un n'empêchait pas les suivants de fuir.

## QUA-134 — Un contrôle qui laisse des fichiers temporaires est nommé et compté comme avertissement
**Règle** : Livré à tout projet. Le rapport de `.githooks/run-checks.mjs` nomme chaque contrôle qui laisse des éléments dans son dossier temporaire (QUA-133, une racine temporaire par passe), avec leur nombre, et le résumé les compte parmi les avertissements (QUA-127, le résumé compte chaque avertissement) ; la fuite ne fait pas échouer la passe, la racine par passe l'empêchant déjà de s'accumuler. Une racine qu'on ne parvient pas à supprimer (fichier encore ouvert) est de même un avertissement, jamais un échec de la passe.
**Périmètre** : `.githooks/engine.mjs`, `.githooks/run-checks.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/run-checks.mjs`.
**Preuve** : test de `run-checks` : un contrôle qui écrit dans son dossier temporaire est nommé avec son nombre d'éléments, compté au résumé, sans changer le verdict, en français et en anglais ; aucun reste après la passe ; racine non supprimable signalée en avertissement.
**Contrôle** : `tests-qua-134`
**Tests** : `.githooks/run-checks.test.mjs`
**Origine** : dossiers-temporaires-des-tests — « Un contrôle qui laisse des fichiers dans son dossier temporaire est nommé dans le rapport, avec le nombre d'éléments laissés, et compté comme avertissement dans le résumé ; il ne fait pas échouer la passe »
**Raison** : Faire échouer la passe sur une fuite aurait bloqué tous les commits tant que les fuites actuelles ne sont pas corrigées ; sans les nommer, personne ne les corrigerait à la source.

## QUA-135 — Le banc refuse une base située dans le dépôt sans y créer de dossier
**Règle** : Propre au dépôt drwil (QUA-018). `preparer` d'`outils/banc-agents.mjs` juge la base du projet temporaire avant toute création : une base située dans le dépôt est refusée, et la racine du dépôt ne reçoit aucun dossier `drwil-banc-*` de plus (le dossier n'est pas créé puis abandonné). Complète QUA-060 (un outil n'est tenu que prouvé par le banc, projet temporaire hors du dépôt).
**Périmètre** : `outils/banc-agents.mjs`.
**Source de vérité** : `outils/banc-agents.mjs` (`preparer`).
**Preuve** : test du banc : le refus d'une base située dans le dépôt, puis le nombre de dossiers `drwil-banc-*` de la racine du dépôt, inchangé.
**Contrôle** : `tests-qua-135`
**Tests** : `outils/banc-agents.test.mjs`
**Origine** : dossiers-temporaires-des-tests — « Le banc refuse une base située dans le dépôt sans y créer de dossier : après le test du refus, la racine du dépôt ne contient aucun nouveau `drwil-banc-*` »
**Raison** : Le test du refus créait un dossier vide à la racine du dépôt à chaque passe (958 relevés le 2026-10-25) : le refus arrivait après la création.

## QUA-136 — Chaque contrôle exécuté consigne sa durée en millisecondes
**Règle** : Livré à tout projet. Le moteur de contrôles (`.githooks/engine.mjs`, `run` et `runAsync`) mesure chaque contrôle qu'il exécute et renvoie sa durée en millisecondes entières (`durationMs`) avec son statut ; un contrôle qui n'a pas été exécuté (non exécuté, non applicable) n'a pas de durée, jamais 0. `.githooks/run-checks.mjs` la consigne au détail de la passe (`.drwil/evidence/run-checks.log` (si présent)), pour chaque contrôle exécuté dans l'ordre de la passe, puis liste les contrôles du plus lent au plus rapide en fin de fichier ; `drwil verify --evidence` l'écrit dans la preuve (`verify-*.json`), par contrôle. Sur une passe parallèle, la durée est celle du contrôle, pas sa part de la passe : le détail le dit.
**Périmètre** : `.githooks/engine.mjs`, `.githooks/run-checks.mjs`, `packages/drwil/src/verify.ts`, `packages/drwil/src/evidence.ts` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/engine.mjs` (`checks`).
**Preuve** : test du moteur (durée entière en synchrone et en parallèle, absente pour un contrôle non exécuté) ; test de `run-checks` (durée au détail, liste du plus lent au plus rapide en fin de fichier, trois plus lents au résumé, en français et en anglais) ; test de `drwil verify --evidence` (durée de chaque contrôle dans la preuve).
**Contrôle** : `tests-qua-136`
**Tests** : `.githooks/engine.test.mjs`, `.githooks/run-checks.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : duree-par-controle — « Chaque contrôle joué par `run-checks` ou par `drwil verify` a sa durée consignée dans le détail de la passe et dans la preuve de `verify` (`verify-*.json`) »
**Raison** : Un `verify --evidence` a pris environ 4 min 30 et six passes 25 à 30 min d'un chantier de 45 min, sans qu'on puisse dire lesquels des 121 contrôles coûtent le plus : la mesure précède le choix de ce qu'il faut accélérer.

## QUA-137 — Un hook modifié non déclaré est signalé avant la clôture, qui le refuse
**Règle** : Livré à tout projet. `node .githooks/close.mjs` (`--check`, à tout moment), le passage de BUILD à EVIDENCE et la clôture nomment chaque fichier de `.githooks/` que la branche modifie ou supprime (copie de travail comparée à sa base de fusion avec la branche principale : `DRWIL_BASE`, `origin/HEAD`, `origin/master`, `origin/main`, `master` puis `main`) sans qu'il soit cité entre backticks en tête d'une puce de la section « Contrats modifiés » d'une fiche touchée par la branche — même règle que le rejeu par la branche principale (QUA-113) : la fiche lue à sa dernière version, avant sa suppression à la clôture, ou telle qu'elle est dans la copie de travail pour la fiche active ; un fichier de test `<nom>.test.mjs` suit la déclaration de son module ; un fichier ajouté par la branche ne compte pas. Chaque message donne la puce à écrire et rappelle que déclarer un hook change les règles du jeu : la puce s'écrit sur le oui du demandeur. La clôture est refusée tant qu'il en reste, avant toute écriture (ni preuve, ni fiche supprimée, ni index touché). Dès le lancement (sondage, `node .githooks/state.mjs start`, `.githooks/state-hooks.mjs`), le message nomme chaque fichier existant de `.githooks/` cité par le bloc `scope` de la fiche (chemin du gabarit compris ; un fichier de test comme son module) sans puce « Contrats modifiés » qui le nomme, avec la puce à écrire sur le oui du demandeur : un signalement, jamais un refus de lancement. Branche principale introuvable ou historique illisible : « non exécuté », dit et compté parmi ce qui ferait échouer la clôture, jamais un succès (QUA-013) ; sans `.githooks/`, rien à comparer.
**Périmètre** : `.githooks/base-checks.mjs` (`undeclaredHooks`, `hookDeclared`), `.githooks/close.mjs` (`closingReport`, `close`), `.githooks/state-hooks.mjs` (signalement au lancement) ; livrés dans le gabarit.
**Source de vérité** : `.githooks/base-checks.mjs` (`undeclaredHooks`).
**Preuve** : tests sur de vrais dépôts git temporaires : hook modifié ou supprimé non déclaré nommé avec sa puce, fichier ajouté ignoré, hook déclaré par une fiche commitée, supprimée à la clôture ou pas encore commitée, test qui suit son module, branche principale introuvable ou orpheline « non exécuté », sans `.githooks/`, en anglais ; signal à `--check` et au passage à EVIDENCE, clôture refusée sans rien écrire puis acceptée une fois déclaré ; au lancement, hooks cités sans puce nommés (gabarit, test, anglais) sans refuser le lancement, hook cité inexistant ou déclaré ignoré.
**Contrôle** : `tests-qua-137`
**Tests** : `.githooks/base-checks.test.mjs`, `.githooks/close.test.mjs`, `.githooks/state.test.mjs`
**Origine** : hooks-declares-et-scoping-apres-ci — « `node .githooks/close.mjs` (clôture, `--check` et passage de BUILD à EVIDENCE) signale chaque fichier de `.githooks/` modifié par la branche et absent des « Contrats modifiés » de ses fiches, nomme la puce à écrire et rappelle qu'elle demande le oui du demandeur ; la clôture est refusée tant qu'il en reste ; sans branche principale lisible, le signal est « non exécuté » et le dit, jamais un succès »
**Raison** : Un hook modifié sans déclaration n'était vu qu'en CI, par le rejeu QUA-113 qui remet sa version de la branche principale et fait échouer les contrôles (PR #220, PR #232) : chaque fois corrigé dans la fiche après coup, jamais à la cause.

## QUA-138 — Avec la fusion automatique, le retour en SCOPING attend la fusion de la PR
**Règle** : Livré à tout projet. Quand la fusion automatique est autorisée au lancement, la procédure donnée par l'état (`.githooks/state-texts.mjs`, `autoMerge`, en français et en anglais) et le skill de lancement disent, dans cet ordre : programmer la fusion, vérifier qu'elle est programmée, suivre la PR par `node .githooks/pr-watch.mjs <numéro>` (relancé tant qu'il dit « verte » sans « fusionnée », 30 minutes au plus en tout), et seulement la PR fusionnée revenir en SCOPING ; CI rouge avant la fusion : rester en CLOSING et `node .githooks/state.mjs reopen` (QUA-116) ; délai dépassé ou autre échec : rester en CLOSING et le signaler. `reopen` reste réservé à CLOSING.
**Périmètre** : `.githooks/state-texts.mjs` (qui affiche `autoMerge`), `.githooks/state-context-texts.mjs` (son texte), skill `start-a-workstream` (Claude Code) ; livrés dans le gabarit.
**Source de vérité** : `.githooks/state-context-texts.mjs` (`autoMerge`).
**Preuve** : test unitaire du texte de l'état : en CLOSING avec la fusion automatique, en français et en anglais, chaque étape vient après la précédente (programmation, vérification de la programmation, suivi par `node .githooks/pr-watch.mjs`, relance tant qu'il dit « verte » sans « fusionnée », 30 minutes au plus, retour en SCOPING seulement la PR fusionnée, CI rouge : CLOSING et `reopen`, délai dépassé ou échec : CLOSING et signalement) et aucun retour en SCOPING n'est cité avant le suivi, ce qui le fait échouer contre l'ancienne procédure (SCOPING dès la programmation) ; test du cycle dans un projet installé : l'état en CLOSING avec la fusion automatique donne la procédure dans l'ordre, en français et en anglais, et le skill installé la reprend.
**Contrôle** : `tests-qua-138`
**Tests** : `.githooks/state.test.mjs`, `packages/drwil/test/cycle.test.mjs`
**Origine** : hooks-declares-et-scoping-apres-ci — « Avec la fusion automatique, le retour en SCOPING n'a lieu qu'une fois la PR fusionnée, suivie par `node .githooks/pr-watch.mjs` (30 minutes au plus) ; CI rouge : l'état reste en CLOSING et `reopen` s'applique ; délai dépassé : rester en CLOSING et le signaler »
**Raison** : La procédure faisait revenir en SCOPING dès la fusion programmée, avant la fin de la CI : une CI rouge ensuite ne pouvait plus rouvrir le chantier, `reopen` n'étant permis qu'en CLOSING (PR #232).

## QUA-139 — `drwil verify` joue ses contrôles en parallèle quand le projet le permet
**Règle** : Livré à tout projet. Avec le réglage `parallel` de `.drwil/ia-first.json` (QUA-119), `drwil verify` lance ensemble les contrôles de commande cités par les contrats (même limite que `run-checks` : au plus la moitié des cœurs, deux au moins) et lit leurs résultats dans l'ordre du registre : chaque contrat reçoit le même verdict et les mêmes raisons, dans le même ordre, qu'une passe en série. Un contrôle cité par plusieurs contrats n'est joué qu'une fois ; un contrôle qui ne se lance pas reste une erreur (QUA-013, un contrôle non exécuté n'est pas un succès). Sans le réglage, ou avec un moteur installé qui ne sait pas lancer en parallèle, la passe reste en série.
**Périmètre** : `packages/drwil/src/verify.ts` (`verify`) ; utilise `startParallel` du moteur (`.githooks/engine.mjs`).
**Source de vérité** : `packages/drwil/src/verify.ts`.
**Preuve** : tests du paquet : mêmes statuts, raisons et contrôles, contrat par contrat, en parallèle et en série (échec, réussite, contrôle partagé, preuve humaine, commande introuvable) ; deux contrôles qui s'attendent l'un l'autre ne passent qu'avec le réglage.
**Contrôle** : `tests-qua-139`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : verify-en-parallele — « Avec le réglage `parallel`, `drwil verify` lance en parallèle les contrôles qui le permettent et rend le même verdict, contrat par contrat, qu'une passe en série »
**Raison** : La passe de `verify` durait la somme de tous ses contrôles, alors que `run-checks` les lance déjà en parallèle.

## QUA-140 — `drwil verify` reprend le verdict de `run-checks` sur un arbre identique, sinon il rejoue
**Règle** : Livré à tout projet. Une passe de `run-checks` lancée hors hook (arbre entier, comme `verify`) consigne dans `.drwil/evidence/run-checks-verdicts.json` (si présent, hors de git) le verdict « ok » ou « fail » de chaque contrôle, avec l'empreinte du commit, de la branche, des modifications non commitées (fichiers suivis et non suivis non ignorés), de l'état local et de `.drwil/ia-first.json` (`treeFingerprint` du moteur) prise avant et après la passe ; un arbre changé pendant la passe ne laisse rien. `drwil verify` reprend ce verdict, au lieu de rejouer le contrôle, si l'empreinte courante est identique à l'octet près ; il rejoue tout contrôle dont l'empreinte diffère, dont le verdict manque ou n'est pas « ok » ou « fail » (non exécuté, non applicable, inconnu), que le projet déclare toujours rejoué par `reuse: false` (réseau, forge, heure) ou que `run-checks` n'a pas jugé comme `verify` (`secrets` hors CI). Une passe de hook (pre-commit, pre-push) ne laisse rien à reprendre. La preuve (raisons de chaque contrat, `verify --evidence`, `--agent`) dit, contrat par contrat et contrôle par contrôle, « repris de run-checks du … » ou « rejoué » ; `verify({ reuse: false })` rejoue tout. QUA-013 (un contrôle non exécuté n'est pas un succès) reste vrai : un verdict repris a bien tourné sur ce même code, tout autre est rejoué.
**Périmètre** : `.githooks/engine.mjs` (`treeFingerprint`, `reuse`), `.githooks/run-checks.mjs`, `packages/drwil/src/verify.ts` et `packages/drwil/src/evidence.ts` (`reusableVerdicts`), `packages/drwil/src/agent.ts` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/engine.mjs` (`treeFingerprint`) et `packages/drwil/src/evidence.ts` (`reusableVerdicts`).
**Preuve** : tests du moteur (empreinte stable, changée par un octet d'un fichier suivi, par un fichier non suivi ajouté, par la configuration ; `reuse` déclaré) ; test de `run-checks` (verdicts consignés hors hook, rien dans un hook ni sur un arbre changé en cours de passe) ; tests du paquet (verdict repris, puis rejoué : arbre modifié d'un octet, fichier non suivi ajouté, configuration changée, verdict absent, contrôle `reuse: false`, `reuse: false` de `verify`).
**Contrôle** : `tests-qua-140`
**Tests** : `.githooks/engine.test.mjs`, `.githooks/run-checks.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : verify-reprend-run-checks — « `drwil verify` reprend le verdict d'un contrôle joué par `run-checks` sur un arbre et une configuration identiques, le dit dans sa preuve, contrat par contrat, et rejoue tout contrôle dont l'empreinte diffère, dont le verdict manque ou qui dépend de l'extérieur »
**Raison** : Le 2026-10-25, un `verify --evidence` a pris environ 4 min 30, dont la suite complète du paquet avec couverture, déjà jouée juste avant par `run-checks` sur le même code.

## QUA-141 — `run-checks` et `drwil verify` reprennent un verdict contrôle par contrôle, pour les itérations seulement
**Règle** : Livré à tout projet. Un contrôle dont la déclaration porte `paths` a une empreinte propre : sa déclaration (commande, `needsBuild`) et le contenu des fichiers suivis ou non suivis, non ignorés, qui correspondent à ses `paths` (`controlFingerprints` du moteur). Hors hook, hors CI (sauf demande de la CI d'une PR, QUA-250) et sans `--tout-rejouer`, `run-checks` ne rejoue pas un contrôle dont le verdict précédent est « ok » sur la même empreinte de contrôle et le dit (« repris (fichiers du contrôle inchangés, run-checks du … ») ; `drwil verify` fait de même, hors `--evidence` et `reuse: false`. Un contrôle sans `paths`, déclaré `reuse: false` ou `reuse: "tree"` (qui lit plus que ses `paths`), en échec, ou dont un fichier ne se lit pas, est rejoué. L'empreinte de l'arbre entier de QUA-140 reste la règle de la preuve de clôture : `verify --evidence` ne reprend un verdict que sur un arbre identique, et un verdict repris par contrôle n'entre jamais dans l'empreinte de l'arbre (seuls les contrôles joués dans la passe y entrent). La preuve et la ligne de `--agent` disent « repris (fichiers du contrôle inchangés) … ne vaut pas preuve de clôture ». QUA-013 (un contrôle non exécuté n'est pas un succès) reste vrai : un verdict repris a tourné sur les mêmes fichiers que ceux qu'il lit.
**Périmètre** : `.githooks/engine.mjs` (`controlFingerprints`), `.githooks/run-checks.mjs`, `packages/drwil/src/verify.ts`, `packages/drwil/src/evidence.ts` (`reusableVerdicts`), `packages/drwil/src/agent.ts`, `packages/drwil/bin/drwil.js` ; livrés dans le gabarit ; `paths` des contrôles de `.drwil/ia-first.json` (audités pour couvrir ce que chacun lit).
**Source de vérité** : `.githooks/engine.mjs` (`controlFingerprints`) et `packages/drwil/src/evidence.ts` (`reusableVerdicts`).
**Preuve** : tests du moteur (empreinte de contrôle stable, changée par un octet d'un fichier du `paths`, par la déclaration, jamais calculée sans `paths` ni avec `reuse` refusé) ; tests de `run-checks` (reprise, rejeu sur octet ou déclaration changés, `--tout-rejouer`, CI, hook, contrôles jamais repris, fichiers changés pendant la passe) ; tests du paquet (reprise par contrôle, rejeu, `--evidence` et `--no-reuse` sans reprise par contrôle).
**Contrôle** : `tests-qua-141`
**Tests** : `.githooks/engine.test.mjs`, `.githooks/run-checks.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : verify-reprise-par-controle — « `run-checks` et `drwil verify` reprennent un verdict contrôle par contrôle, pour les itérations, sur une empreinte propre à chaque contrôle ; la preuve de clôture garde l'empreinte de tout l'arbre »
**Raison** : Depuis QUA-140, un octet changé n'importe où invalide tous les verdicts : pendant les itérations, le gain était nul et `run-checks` rejouait tout.

## QUA-142 — Le sondage de lancement peut mener le chantier dans un nouveau worktree, sur la seule réponse de l'humain
**Règle** : Livré à tout projet. Le sondage `/drwil-start` peut porter une troisième question (Claude Code, en-tête `drwil-worktree`) ou un troisième champ (Copilot CLI, nommé `drwil-worktree`) : « Nouveau worktree » ou « Ce dossier », sans recommandation ni valeur par défaut. La réponse, lue par le hook (`.claude/hooks/prompt-hook.mjs`) et jamais par l'agent, crée le dossier frère `../<dépôt>-<fiche>` et sa branche `workstream/<fiche>` depuis la branche principale distante après `git fetch` (sans réseau : depuis la branche locale, et la sortie le dit), sans option qui écrive dans la configuration commune (`--no-track`, QUA-056), puis lance le chantier dans ce dossier par le `start` de `.githooks/state.mjs` : l'état du nouveau dossier est écrit par lui, jamais à la main, et l'état du dossier d'origine ne change pas. Refusé sans rien créer : plusieurs fiches à la fois (la file reste dans le dossier du dépôt, QUA-037), fiche non cadrée, dossier ou branche déjà existants, branche principale locale absente ; un `git worktree add` qui échoue refuse aussi.
**Périmètre** : `.githooks/worktree.mjs` (`launchInWorktree`), `.claude/hooks/prompt-hook.mjs` (`worktreeChosen`), `.claude/skills/start-a-workstream/SKILL.md` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/worktree.mjs` (`launchInWorktree`).
**Preuve** : tests sur dépôts jetables (dépôt `origin` nu et clone) : dossier et branche créés depuis une branche principale avancée sur `origin`, état BUILD écrit dans le worktree, aucun état dans le dossier d'origine, configuration du dépôt principal identique avant et après ; refus sans rien créer ; repli sans réseau ; hook rejoué sur les deux formes de sondage (réponse « Nouveau worktree » lancée dans le worktree, « Ce dossier » dans le dossier d'origine).
**Contrôle** : `tests-qua-142`
**Tests** : `.githooks/worktree.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : worktree-par-chantier — « Au sondage de lancement, l'humain peut choisir de mener le chantier dans un nouveau worktree ; la réponse, lue par le hook et jamais par l'agent, crée le dossier et sa branche depuis la branche principale à jour, et y lance le chantier : son fichier d'état est écrit par `.githooks/state.mjs`, jamais à la main, et l'état du dossier d'origine ne change pas »
**Raison** : Travailler deux chantiers à la fois imposait `git worktree add`, l'installation et le lancement à la main, et rien ne laissait à l'humain le choix au moment où il lance.

## QUA-143 — Un agent ne prend jamais un worktree pour un dépôt distinct : le rappel d'état nomme le dépôt principal et les worktrees
**Règle** : Livré à tout projet. Dans un worktree, le rappel d'état (`node .githooks/state.mjs` et l'injection de début de session) nomme le dépôt principal, la branche et le chantier du dossier, dit que les autres dossiers listés sont des worktrees du même dépôt et qu'on ne modifie que le sien ; dans le dossier principal, il liste les worktrees ouverts, leur branche et leur chantier. La liste vient de `git worktree list --porcelain` et de l'état de chaque dossier listé ; un dossier listé mais disparu est ignoré, pas une erreur. Sans autre worktree, le rappel ne change pas.
**Périmètre** : `.githooks/worktree.mjs` (`worktreeLines`), `.githooks/state-texts.mjs` (`context`) ; livrés dans le gabarit.
**Source de vérité** : `.githooks/worktree.mjs` (`worktreeLines`).
**Preuve** : tests sur dépôts jetables : rappel d'un worktree et du dossier principal, absence de mention sans autre worktree, dossier disparu ignoré.
**Contrôle** : `tests-qua-143`
**Tests** : `.githooks/worktree.test.mjs`
**Origine** : worktree-par-chantier — « Un agent ne prend jamais un worktree pour un dépôt distinct : dans un worktree, le rappel d'état nomme le dépôt principal, la branche et le chantier du dossier, dit que les autres dossiers listés sont des worktrees du même dépôt et qu'on ne modifie que le sien ; dans le dossier principal, il liste les worktrees ouverts et leur chantier »
**Raison** : Un agent qui voit un dossier frère portant le même projet peut le croire distinct et y écrire, ou croire son propre dossier isolé du reste.

## QUA-144 — La commande d'installation déclarée est lancée dans le nouveau worktree, son échec est dit sans rien défaire
**Règle** : Livré à tout projet. Le réglage facultatif `worktreeInstall` de `.drwil/ia-first.json` (par exemple `npm ci`) est lancé dans le nouveau worktree, avant le lancement du chantier. Sans réglage, rien n'est lancé et la sortie dit d'installer les dépendances dans ce dossier. Un échec est dit avec la fin de sa sortie ; le worktree et l'état restent, le chantier est lancé quand même.
**Périmètre** : `.githooks/worktree.mjs` (`launchInWorktree`) ; `docs/ia-first/7-starting-and-closing.md` (réglage) ; livrés dans le gabarit.
**Source de vérité** : `.githooks/worktree.mjs`.
**Preuve** : tests sur dépôts jetables : commande lancée dans le nouveau dossier et pas dans l'autre, échec dit avec sa sortie et état BUILD gardé, absence de réglage dite.
**Contrôle** : `tests-qua-144`
**Tests** : `.githooks/worktree.test.mjs`
**Origine** : worktree-par-chantier — « Une commande d'installation déclarée dans `.drwil/ia-first.json` est lancée dans le nouveau worktree ; sans réglage, rien n'est lancé et la sortie dit quoi faire ; un échec d'installation est dit, le worktree et l'état restent »
**Raison** : Un worktree neuf n'a pas les dépendances ignorées par git : sans elles, les contrôles du chantier échouent pour une raison sans rapport avec lui.

## QUA-145 — Une fiche déjà active dans un autre worktree du même dépôt ne se relance pas
**Règle** : Livré à tout projet. `start` (`.githooks/state.mjs`), donc aussi le lancement en worktree, refuse une fiche dont l'état d'un autre worktree du même dépôt (`git worktree list --porcelain`, état lu dans chaque dossier) dit qu'elle est active (toute activité hors SCOPING), en donnant le chemin de ce worktree et sans rien changer. Un dossier disparu, ou sans état lisible, ne retient rien. Le lancement en worktree refuse aussi une fiche active dans le dossier d'origine, avant de rien créer.
**Périmètre** : `.githooks/worktree.mjs` (`activeElsewhere`), `.githooks/state.mjs` (`start`) ; livrés dans le gabarit.
**Source de vérité** : `.githooks/worktree.mjs` (`activeElsewhere`).
**Preuve** : tests sur dépôts jetables : relance depuis le dossier principal et directe refusées avec le chemin, état inchangé, dossier disparu ignoré.
**Contrôle** : `tests-qua-145`
**Tests** : `.githooks/worktree.test.mjs`
**Origine** : worktree-par-chantier — « Le lancement d'une fiche déjà active dans un autre worktree du même dépôt est refusé, avec le chemin de ce worktree »
**Raison** : Le fichier d'état n'est pas versionné et chaque dossier a le sien : rien n'empêchait de mener la même fiche dans deux dossiers, qui se seraient heurtés à la clôture.

## QUA-146 — `close --check` signale une branche de chantier en retard sur la branche principale, sans refuser la clôture
**Règle** : Livré à tout projet. `node .githooks/close.mjs --check` mesure, après `git fetch origin <branche principale>`, le retard de la branche courante sur `origin/<branche principale>` ; en retard, il le dit avec le nombre de commits et la commande de mise à jour (`git merge origin/<branche principale>`). Le signal ne change ni le code de sortie ni la clôture. Sans réseau (fetch en échec), il dit qu'il ne conclut rien ; sans remote `origin`, sur la branche principale ou en HEAD détaché, il ne dit rien.
**Périmètre** : `.githooks/worktree.mjs` (`lateLines`), `.githooks/close.mjs` (`close`) ; livrés dans le gabarit.
**Source de vérité** : `.githooks/worktree.mjs` (`lateLines`).
**Preuve** : test sur dépôt jetable avec `origin` nu : à jour, aucun signal ; en retard d'un commit, signal avec la commande et même code de sortie ; sur la branche principale, aucun ; origine disparue, « non mesuré ».
**Contrôle** : `tests-qua-146`
**Tests** : `.githooks/worktree.test.mjs`
**Origine** : worktree-par-chantier — « `node .githooks/close.mjs --check` signale une branche de chantier en retard sur la branche principale et donne la commande de mise à jour ; la clôture n'est pas refusée pour ce motif »
**Raison** : Deux chantiers menés en parallèle se rencontrent à la clôture sur l'index et le journal, sans que rien ne prévienne qu'une branche est en retard.

## QUA-147 — Une file de chantiers peut se lancer en parallèle, un worktree par fiche, sur la seule réponse de l'humain
**Règle** : Livré à tout projet. Le sondage `/drwil-start` à choix multiple peut porter une question `drwil-parallel` (Claude Code, en-tête exact) ou un champ du même nom (Copilot CLI) : « File en parallèle » ou « File séquentielle », sans recommandation ni valeur par défaut ; « File séquentielle » garde la file du dossier du dépôt (QUA-037). La réponse, lue par le hook (`.claude/hooks/prompt-hook.mjs`) et jamais par l'agent, lance chaque fiche cochée, dans l'ordre des options du sondage, dans son propre worktree par `launchInWorktree` (QUA-142), avec la fusion automatique décidée au sondage ; aucune file n'est écrite dans un worktree. Au plus N chantiers sont actifs à la fois, tous worktrees confondus (réglage `maxParallel` de `.drwil/ia-first.json`, 3 par défaut). Sont refusées, sans rien créer : moins de deux fiches, une fiche choisie deux fois, une fiche qui ne peut pas entrer dans une file (cadrée, maturité « prêt », aucune `[décision]` ouverte, critères d'acceptation), une fiche déjà active ailleurs, un dépassement de N, deux fiches (choisies, ou l'une choisie et l'autre active dans un worktree) dont les blocs `scope` se recoupent, l'index et le journal des chantiers exceptés (toute clôture les modifie ; leur conflit se règle au rebase, QUA-148). Un lancement qui échoue arrête les suivants sans défaire ceux déjà lancés. Les fiches lancées sont enregistrées dans le champ `parallel` de l'état du dossier d'origine, écrit par `.githooks/state.mjs` (`recordParallel`).
**Périmètre** : `.githooks/worktree.mjs` (`launchParallel`), `.githooks/briefs.mjs` (`scopesOverlap`), `.githooks/state.mjs` (`recordParallel`), `.claude/hooks/prompt-hook.mjs` (`parallelChosen`), `.claude/skills/start-a-workstream/SKILL.md` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/worktree.mjs` (`launchParallel`).
**Preuve** : tests sur dépôts jetables (dépôt `origin` nu et clone) : deux fiches lancées chacune dans son worktree en BUILD avec la fusion portée et sans file, dossier d'origine en SCOPING avec `parallel` ; refus sans rien créer (une fiche, doublon, fiche non prête, cadrages recoupés hors index et journal, au-delà de `maxParallel` en comptant les chantiers d'un autre worktree) ; échec d'un lancement qui garde les précédents ; hook rejoué sur le sondage Claude Code (« File en parallèle » lance les worktrees dans l'ordre du sondage, « File séquentielle » garde la file du dossier, réponse préremplie refusée).
**Contrôle** : `tests-qua-147`
**Tests** : `.githooks/worktree.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : file-en-parallele — « Au sondage, l'humain choisit de mener la file en parallèle ; chaque fiche choisie est lancée dans son propre worktree par le hook, jamais par l'agent ; au plus N chantiers sont actifs à la fois »
**Raison** : Des chantiers indépendants d'une file attendaient la fusion du précédent sans raison, et un lancement des worktrees par l'agent aurait contourné la décision de l'humain.

## QUA-148 — En file parallèle, chaque chantier se mène dans un sous-agent dont le dossier de travail est son worktree
**Règle** : Livré à tout projet. Quand l'état du dossier d'origine porte `parallel` (QUA-147), le rappel d'état et la skill de lancement disent : les worktrees existent, créés par le hook, la session principale n'en crée aucun ; chaque chantier se mène avec Claude Code dans un sous-agent (contexte neuf) dont le dossier de travail est son worktree, jamais `isolation: "worktree"` (une copie sans l'état), dont la consigne commence par lire l'état dans ce dossier et qui n'en modifie aucun autre ; la session principale ne garde que les comptes rendus et suit chaque PR par `gh` jusqu'à la fusion, 30 minutes au plus chacune, sans attendre la fusion d'un autre chantier ; en cas de conflit de clôture sur l'index ou le journal des chantiers, le sous-agent rebase et résout seul. Hors file parallèle, le rappel n'en dit rien.
**Périmètre** : `.githooks/state-texts.mjs` (`context`), `.claude/skills/start-a-workstream/SKILL.md` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/state-texts.mjs` (texte `parallel`).
**Preuve** : test du rappel d'état, en français et en anglais : file parallèle (sous-agent par worktree, comptes rendus seuls, suivi de chaque PR, rebase du sous-agent), absence du texte hors file parallèle.
**Contrôle** : `tests-qua-148`
**Tests** : `.githooks/state.test.mjs`
**Origine** : file-en-parallele — « Chaque chantier se mène dans un sous-agent dont le dossier de travail est son worktree ; la session principale ne garde que les comptes rendus »
**Raison** : Sans consigne, la session principale aurait mené les chantiers dans son propre dossier, ou dans une copie isolée sans l'état, et gardé tous leurs contextes.

## QUA-149 — En file parallèle, un chantier qui demande un humain n'interrompt pas les autres, et le bilan de file dit l'état de chacun
**Règle** : Livré à tout projet. Quand l'état du dossier d'origine porte `parallel` (QUA-147), le rappel d'état et la skill de lancement disent : un chantier qui demande un humain (attestation, FAIL non corrigé, CI rouge, délai de fusion dépassé, décision à prendre) arrête son propre sous-agent en disant pourquoi et ce qui est attendu ; les autres continuent et la session principale ne lance rien de plus d'elle-même ; un compte rendu court à chaque clôture, puis un bilan de file donnant l'état de chaque chantier (worktree, branche, fiche, activité, PR).
**Périmètre** : `.githooks/state-texts.mjs` (`context`), `.claude/skills/start-a-workstream/SKILL.md` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/state-texts.mjs` (texte `parallel`).
**Preuve** : test du rappel d'état, en français et en anglais : arrêt du seul sous-agent concerné, absence de lancement par la session principale, bilan par chantier.
**Contrôle** : `tests-qua-149`
**Tests** : `.githooks/state.test.mjs`
**Origine** : file-en-parallele — « Un chantier qui demande un humain arrête le lancement des suivants, sans interrompre ceux qui tournent ; le bilan de file dit l'état de chacun »
**Raison** : Sans règle, un chantier bloqué en parallèle aurait fait tout arrêter, ou la session principale aurait relancé d'elle-même ce qui attendait l'humain.

## QUA-150 — Les tests du dépôt qui mesurent une durée sont recensés, et chacun est rendu stable ou sa conservation justifiée
**Règle** : Les tests du dépôt qui mesurent une durée (`performance.now`, `Date.now`, comparaison de durées, délai) sont recensés à l'entrée de journal du chantier « tests de timing stables » ; chacun y est rendu déterministe, passé en indicateur (ligne `[ia-first-warning]`, avertissement compté par `run-checks`) ou conservé avec sa justification. Un test de timing qu'une charge de machine peut faire échouer sans qu'aucun code ne soit en cause n'est pas une preuve : il se corrige ou se justifie.
**Périmètre** : `packages/drwil/test/kit.test.mjs`, `.githooks/run-checks.test.mjs`, `.githooks/state.test.mjs`, `.githooks/engine.test.mjs`, `outils/banc.test.mjs`, `outils/banc-agents.test.mjs` ; l'entrée de journal du chantier.
**Source de vérité** : `docs/projects/journal.md` (entrée « Les tests de timing ne dépendent plus de la charge de la machine »).
**Preuve** : attestation humaine : relecture du recensement et de chaque justification.
**Manuel** : jugement humain : le recensement est complet et chaque test conservé l'est à bon droit.
**Couvre** : `.githooks/engine.test.mjs`, `outils/banc.test.mjs`, `outils/banc-agents.test.mjs`
**Origine** : tests-de-timing-stables — « Les autres tests du dépôt qui mesurent une durée sont recensés au journal ; chacun est rendu déterministe ou passé en indicateur, ou sa conservation est justifiée »
**Raison** : Le pre-push parallèle refusait des pushs sur des tests de durée, sans défaut de code : chaque refus coûtait une passe complète et poussait à relancer à l'aveugle.

## QUA-151 — Un push ne dépend pas de la charge de la machine : cinq passes consécutives sous charge ne refusent rien
**Règle** : Cinq passes consécutives de `.githooks/run-checks.mjs` en conditions de pre-push (références poussées, contrôles en parallèle, processeurs restreints par `taskset`) ne refusent aucun push pour un test de timing ; le résultat de chaque passe est consigné à l'entrée de journal du chantier « tests de timing stables ».
**Périmètre** : `.githooks/run-checks.mjs`, `.githooks/pre-push` ; l'entrée de journal du chantier.
**Source de vérité** : `docs/projects/journal.md` (entrée « Les tests de timing ne dépendent plus de la charge de la machine »).
**Preuve** : attestation humaine : relecture du résultat consigné des cinq passes, ou rejeu par l'humain.
**Manuel** : jugement humain : la charge simulée est représentative du pre-push et les cinq passes consignées sont convaincantes.
**Couvre** : `.githooks/run-checks.mjs`, `.githooks/pre-push`
**Origine** : tests-de-timing-stables — « Cinq passes consécutives du pre-push sous charge (`taskset`, contrôles en parallèle) ne refusent plus aucun push pour un test de timing »
**Raison** : La stabilité d'un test de durée ne se prouve que par la répétition sous charge ; une seule passe verte ne dit rien.

## QUA-152 — Le pre-push reprend un verdict « ok » dont les fichiers du contrôle n'ont pas changé, la CI rejoue tout
**Règle** : Livré à tout projet. Au pre-push (références poussées données par `.githooks/pre-push`), hors CI et sans `--tout-rejouer`, `run-checks` ne rejoue pas un contrôle déclarant `paths` dont l'empreinte propre (QUA-141 : sa déclaration et les fichiers de ses `paths`) est celle d'un verdict « ok » consigné par une passe de `run-checks` (`.drwil/evidence/run-checks-verdicts.json` (si présent)) ou par un pre-push précédent (`.drwil/evidence/pre-push-verdicts.json` (si présent), fichier distinct, hors de git, que `drwil verify` ignore : QUA-140 reste vrai) ; il le dit (« repris (fichiers du contrôle inchangés, run-checks du … » ou « pre-push du … », puis le décompte des repris et rejoués) et rejoue le reste. Tout est rejoué si l'arbre de travail n'est pas le commit poussé (modifications non commitées ou fichiers non suivis non ignorés, ou référence poussée autre que la branche courante, ou plusieurs), et un contrôle sans `paths`, en échec, sans verdict lisible, déclaré `reuse: false` ou `reuse: "tree"`, ou dont l'empreinte est `null` est rejoué. La CI ne reprend jamais rien : elle rejoue tout. Le pre-commit ne reprend rien (il diffère par `paths`). QUA-013 (un contrôle non exécuté n'est pas un succès) reste vrai : un verdict repris a tourné sur les mêmes fichiers que ceux qu'il lit.
**Périmètre** : `.githooks/run-checks.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/run-checks.mjs` (`pushedTreeIsWorkTree`, `lastOf`).
**Preuve** : tests de `run-checks` sur dépôts temporaires : commit de documentation seule repris (verdict de `run-checks`, puis du pre-push), fichier du `paths` modifié rejoué ; arbre sale, autre référence poussée, deux références, CI et `--tout-rejouer` rejoués ; échec, `reuse: false`, `reuse: "tree"` et sans `paths` rejoués ; fichier de verdicts de `run-checks` inchangé par un pre-push.
**Contrôle** : `tests-qua-152`
**Tests** : `.githooks/run-checks.test.mjs`
**Origine** : pre-push-reprend-les-verdicts — « Le pre-push ne rejoue pas un contrôle dont les fichiers n'ont pas changé depuis un passage « ok », le dit dans sa sortie, et rejoue tout quand l'arbre de travail n'est pas le commit poussé ; la CI rejoue toujours tout »
**Raison** : Le 2026-10-25, pousser un commit de documentation seule a rejoué tout le paquet (build, tests, couverture) : 2 min 32 s pour des contrôles qui ne jugent aucun des fichiers poussés.

## QUA-153 — Le `AGENTS.md` livré est un aiguillage de 100 lignes au plus, dont chaque règle a son détail dans `docs/ia-first.md`
**Règle** : Livré à tout projet. `AGENTS.md`, relu à chaque requête, tient en 100 lignes au plus (gabarit et copie du dépôt) : une ligne par règle de conduite qu'aucun contrôle machine ne rattrape, qui renvoie à la section 8 de `docs/ia-first.md` où le texte complet de chaque règle est conservé sous le même nom en gras ; aucune règle n'est perdue. Le plafond sur le gabarit est tenu par un test du paquet, d'ici à ce que le contrôle de taille du kit le reprenne.
**Périmètre** : `AGENTS.md`, `docs/ia-first/8-conduct-rules.md` ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/AGENTS.md`, `packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md`.
**Preuve** : test du paquet qui lit le gabarit : au plus 100 lignes, renvoi à la section 8, et chaque règle de conduite de `AGENTS.md` retrouvée sous son nom dans la section 8.
**Contrôle** : `tests-qua-153`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : agents-md-court — « `AGENTS.md` du gabarit et celui du dépôt font 100 lignes au plus. »
**Raison** : `AGENTS.md` est chargé à chaque requête par tout agent : livré à 247 lignes, il coûtait du contexte à chaque message.

## QUA-154 — Une installation neuve écrit la barrière de périmètre en bloquant, un projet déjà installé garde son réglage, même absent
**Règle** : Livré à tout projet. `drwil init` écrit `scopeGate` à `blocking` quand le projet n'a pas encore de configuration ; sur un projet déjà installé, il garde la valeur choisie et, à défaut de réglage, écrit `warning` : une mise à jour ne bloque jamais un commit qui passait. La barrière n'est ainsi jamais un simple avertissement par défaut sans que rien ne le dise (`drwil doctor` le montre : QUA-155).
**Périmètre** : `drwil init` (écriture de `.drwil/ia-first.json`) ; livré par le paquet.
**Source de vérité** : `packages/drwil/src/config-write.ts`.
**Preuve** : test du paquet : installation neuve en bloquant ; réinstallation d'un projet sans réglage en avertissement ; réglage choisi gardé.
**Contrôle** : `tests-qua-154`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : niveau-de-protection — « Une installation neuve écrit la barrière de périmètre en bloquant ; un projet déjà installé garde son réglage, même absent, et rien ne change pour lui »
**Raison** : Le 2026-10-22, une revue externe a relevé qu'un projet qui adopte drwil croit avoir une barrière de périmètre alors qu'elle n'était qu'un avertissement par défaut, y compris sur une installation neuve.

## QUA-155 — `drwil doctor` dit le niveau de protection du projet, chacun prouvé par une vérification, jamais par une déclaration
**Règle** : Livré à tout projet. `drwil doctor` (texte et `--json`) affiche le niveau de protection : 1 diagnostic seul, 2 gouvernance locale active (hooks branchés, barrière bloquante), 3 contrôles CI actifs (la CI rejoue les contrôles du hook), 4 protection de forge vérifiée (branche protégée, contrôles requis, aucun contournement administrateur : la lecture de forge de QUA-094 et QUA-095, sans la refaire). Le niveau atteint est le plus haut sans trou ; un niveau que `doctor` n'a pas pu vérifier (sans `gh` ni `glab` joignable, ou contournement non lisible) est « non vérifié », jamais atteint (QUA-013). La sortie dit la commande qui mène au niveau suivant. Le calcul est unique, dans un module lu aussi par `drwil verify`.
**Périmètre** : `drwil doctor` ; livré par le paquet.
**Source de vérité** : `packages/drwil/src/protection.ts`.
**Preuve** : tests du paquet : chaque niveau atteint, manquant ou non vérifié par un exécuteur de forge simulé ; commande du niveau suivant ; sortie texte et `--json`, en français et en anglais.
**Contrôle** : `tests-qua-155`
**Tests** : `packages/drwil/test/protection.test.mjs`
**Origine** : niveau-de-protection — « `drwil doctor` affiche le niveau de protection du projet, chacun prouvé par une vérification, jamais par une déclaration ; un niveau qu'il n'a pas pu vérifier est « non vérifié », jamais atteint ; il dit la commande qui mène au niveau suivant (`--json` compris) »
**Raison** : Le 2026-10-22, aucune sortie ne distinguait « une règle est écrite » de « la garantie est tenue » : un projet pouvait se croire protégé alors que sa barrière n'était qu'un avertissement.

## QUA-156 — Sous garanties obligatoires, une barrière de périmètre non bloquante fait échouer `drwil verify`, avec la commande qui la durcit
**Règle** : Livré à tout projet. Une fois les garanties imposées (`drwil guarantees`, QUA-088), `drwil verify` rend FAIL tant que `scopeGate` n'est pas `blocking`, et le message nomme la commande qui la durcit. Sans garanties imposées, rien n'est jugé.
**Périmètre** : `drwil verify` ; livré par le paquet.
**Source de vérité** : `packages/drwil/src/guarantees.ts` (`judgeGuarantees`), `packages/drwil/src/protection.ts` (`scopeGateFailure`).
**Preuve** : test du paquet : FAIL avec la commande de durcissement sous garanties et barrière en avertissement ; PASS une fois bloquante ; rien sans garanties imposées.
**Contrôle** : `tests-qua-156`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : niveau-de-protection — « Un projet sous garanties obligatoires dont la barrière n'est pas bloquante fait échouer `drwil verify`, avec la commande qui la durcit »
**Raison** : Une garantie « obligatoire » qui laisse la barrière de périmètre en avertissement ne garantit rien : la décision du demandeur du 2026-10-23 est que `verify`, pas seulement `doctor`, échoue.

## QUA-157 — La taille de chaque fichier que le kit installe est surveillée, sans geste du projet : elle bloque sur le gabarit de ce dépôt, elle avertit chez un projet adopté
**Règle** : Livré à tout projet. `.githooks/check-kit-size.mjs` compare chaque fichier installé à son plafond, en lignes : 200 pour le code, les hooks et les réglages, 100 pour `AGENTS.md`, 400 pour les documents lus à la demande, 250 pour les recettes. Dans ce dépôt il mesure le gabarit (`packages/drwil/templates/`) et un dépassement échoue ; chez un projet adopté il lit la liste des fichiers que l'installation a écrits et un dépassement n'est qu'un avertissement qui nomme le fichier et son plafond (jamais bloquant : le projet a pu enrichir un fichier du kit exprès), sans jamais mesurer le code du projet ni ses fiches, intentions, registre et README. Un fichier du kit modifié à la main reste mesuré. Liste d'installation absente, illisible ou vide : échec qui le dit (QUA-013). `drwil init` déclare le contrôle (`taille-kit`) dans `.drwil/ia-first.json` → `checks`, sans effacer les contrôles du projet. Le réglage `kitSizeLegacy` tolère un fichier déjà au-dessus de son plafond jusqu'à sa taille actuelle : il ne peut que maigrir ; ce dépôt n'en déclare plus aucun (`docs/ia-first.md` découpé en sections, QUA-190). QUA-001 garde le code du projet.
**Périmètre** : `.githooks/check-kit-size.mjs` ; `packages/drwil/src/config-write.ts` ; livré dans le gabarit.
**Source de vérité** : `.githooks/check-kit-size.mjs` (`CEILINGS`, `kindOf`, `measure`), `.drwil/ia-first.json` → `checks` (contrôle `taille-kit`) et `kitSizeLegacy`.
**Preuve** : Hook + CI (`.drwil/ia-first.json` → `checks`, job `checks`) ; tests : chaque sorte et son plafond, blocage sur le gabarit, avertissement chez un projet adopté, liste absente en échec, déclaration à l'installation.
**Contrôle** : `taille-kit`, `tests-qua-157`
**Tests** : `.githooks/check-kit-size.test.mjs`
**Origine** : surveillance de la taille du kit — « Un contrôle livré surveille la taille de chaque fichier que la CLI installe, chacun sous le plafond de sa sorte ; il bloque sur le gabarit de ce dépôt et avertit chez un projet adopté » ; ia-first-en-sections-courtes — « Aucun document lu à la demande du kit ne dépasse le nouveau plafond, et `kitSizeLegacy` est retiré »
**Raison** : Corriger les hooks et `AGENTS.md` une fois ne retenait pas un fichier livré de regrossir ; chaque ligne d'`AGENTS.md` se paie à chaque requête de l'agent.

## QUA-158 — Le rappel de cadrage avertit, dès la rédaction d'une fiche, qu'un fichier de code de son scope est proche du plafond de taille
**Règle** : Livré à tout projet. Le rappel de cadrage (QUA-016) mesure chaque fichier de code nommé dans le bloc scope d'une fiche (motifs à joker et fichiers inexistants ignorés) et, à 90 % du plafond de code (180 lignes pour 200), avertit en nommant la fiche, le fichier, sa taille et le plafond, et en disant de lister d'avance les fichiers issus de sa découpe, la carte d'architecture et `docs/projects/kit-mechanics.md`. Jamais bloquant : un avertissement dans le réglage par défaut (`warning`), muet avec `off`, absent avec `blocking` (où les messages du rappel feraient échouer le commit). Le seuil se déduit de `CEILINGS.code` (QUA-001, QUA-157), jamais une seconde valeur en dur. Le modèle de fiche rappelle les mêmes fichiers à lister quand un fichier de code ou un hook est ajouté. La barrière de périmètre (`scope-gate`) ne change pas.
**Périmètre** : `.githooks/check-docs-workstreams.mjs` ; `.githooks/check-docs-texts.mjs` ; `docs/projects/model-brief.md` ; livré dans le gabarit.
**Source de vérité** : `.githooks/check-docs-workstreams.mjs` (`NEAR_CEILING`), `.githooks/check-kit-size.mjs` (`CEILINGS`).
**Preuve** : Hook + CI (`.drwil/ia-first.json` → `checks`, job `checks`) ; tests : à 180 lignes, en dessous, fichier inexistant.
**Contrôle** : `tests-qua-158`
**Tests** : `.githooks/check-docs.test.mjs`
**Origine** : le cadrage d'une fiche anticipe les découpes — « Le rappel de cadrage avertit, sans jamais bloquer, quand un fichier de code du scope d'une fiche atteint 180 lignes ou plus, et dit de lister d'avance les fichiers issus de sa découpe ; en dessous, aucun avertissement »
**Raison** : Deux chantiers de suite se sont arrêtés sur un fichier issu d'une découpe, absent de leur scope ; la barrière fait son travail, c'est le cadrage qui ne l'avait pas prévu.

## QUA-159 — `drwil verify --failed` rejoue les seuls contrats qui n'étaient pas PASS ou ATTESTED à la dernière preuve, pour un verdict partiel qui ne vaut jamais clôture
**Règle** : Livré à tout projet. `drwil verify --failed` (`--agent` et `--json` compris) lit la dernière preuve de `.drwil/evidence/` (`verify-*.json`) et rejoue, par l'option `only` qui sert déjà à `drwil attest`, les seuls contrats qui n'y étaient ni PASS ni ATTESTED ni en attente d'attestation seule (un contrat absent de la preuve est rejoué). Le verdict est partiel et le dit (libellé `GOVERNANCE: PARTIAL (--failed) — NOT A VERDICT`, `status` « partial » en JSON, jamais le libellé `GOVERNANCE: PASS`), son code de sortie n'est jamais 0 (1, ou 2 si une erreur survient), il n'écrit aucune preuve dans `.drwil/evidence/` et ne juge ni les critères, ni les garanties, ni les contrats non rejoués (QUA-013) ; il renvoie à la passe complète `drwil verify --evidence`, seule preuve de clôture. Sans preuve précédente lisible, il le dit et ne rejoue rien. Un contrat seulement en attente d'attestation (MANUAL à la dernière preuve) n'est pas un échec : le verdict partiel le nomme et renvoie à `drwil attest`, sans le rejouer. `--failed` et `--evidence` s'excluent. Le rappel de l'état en VERIFY propose, après un FAIL, `--failed` puis la passe complète. La reprise par contrôle (QUA-141, QUA-152) reste distincte et inchangée : un contrôle repris n'est pas un contrat non rejoué.
**Périmètre** : `packages/drwil/src/failed.ts`, `packages/drwil/src/cli-verify.ts`, `packages/drwil/src/verdict.ts`, `packages/drwil/src/agent.ts`, `packages/drwil/src/verify-types.ts` ; le rappel de l'état `.githooks/state-context-texts.mjs` ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/src/failed.ts` (`verifyFailed`).
**Preuve** : tests du paquet (contrats rejoués, PASS/ATTESTED et MANUAL non rejoués, libellé, code de sortie, aucune preuve écrite, sans preuve lisible, `--failed` avec `--evidence`) ; test du rappel de VERIFY.
**Contrôle** : `tests-qua-159`
**Tests** : `packages/drwil/test/kit.test.mjs`, `.githooks/state.test.mjs`
**Origine** : verify-rejoue-les-echecs — « `drwil verify --failed` rejoue les seuls contrats qui n'étaient pas PASS ou ATTESTED à la dernière preuve ; ce verdict partiel le dit, n'est jamais `GOVERNANCE: PASS` et ne vaut jamais preuve de clôture »
**Raison** : Corriger un contrat après un FAIL obligeait à une passe complète de `verify` pour savoir si la correction tient : six passes ont pris 25 à 30 min d'un chantier de 45 min, avec 17 passes FAIL sur 40 en deux jours.

## QUA-160 — Le sondage de lancement propose les fiches dans l'ordre de réalisation de l'index, une fiche pas prête gardant sa place
**Règle** : Livré à tout projet. `state.mjs briefs` (donc le sondage `/drwil-start`) liste les fiches cadrées dans l'ordre des lignes ouvertes de la section « Fiches cadrées » de l'index des chantiers, lu depuis le HEAD commité par la lecture qui donne déjà les priorités : quelles que soient leur priorité et leur maturité, et sans reléguer en fin de liste une fiche pas prête (`ready` faux, décisions à prendre), qui garde sa place. Une fiche absente de cette section est listée après les fiches indexées, dans l'ordre d'avant (prête d'abord, maturité, priorité, chemin). Une fiche de garantie bloquante (QUA-088) reste seule listée. La file (`queue`, QUA-037) n'accepte toujours que des fiches prêtes. Le mode d'emploi du sondage (`.claude/skills/start-a-workstream/SKILL.md`) dit cet ordre et plus l'ancien.
**Périmètre** : `.githooks/briefs.mjs`, `.githooks/briefs-order.mjs`, `.claude/skills/start-a-workstream/SKILL.md` ; livré dans le gabarit.
**Source de vérité** : `.githooks/briefs-order.mjs` (`cadredOrder`, `pollComparator`), `.githooks/briefs.mjs` (`scopedBriefs`).
**Preuve** : test de l'ordre suivi, de la fiche pas prête en place, de la fiche non indexée après et de la garantie bloquante seule.
**Contrôle** : `tests-qua-160`
**Tests** : `.githooks/state.test.mjs`
**Origine** : sondage-suit-l-ordre-de-pending — « `state.mjs briefs` liste les fiches d'une version dans l'ordre des lignes ouvertes de la section « Fiches cadrées » de `docs/projects/pending.md`, une fiche pas prête gardant sa place ; une fiche absente de l'index vient après »
**Raison** : Le sondage triait par priorité P1-P3 et ignorait l'ordre de réalisation de l'index : une fiche P3 pouvait être proposée avant une P2 qui devait passer avant, et le demandeur lançait dans le désordre sans le savoir.

## QUA-161 — La fusion automatique d'une PR s'enchaîne dans l'ordre par un outil : état calculé, mise à jour si BEHIND, programmation, vérification
**Règle** : Livré à tout projet. `node .githooks/merge-auto.mjs [<n>]` enchaîne, dans cet ordre : attendre que GitHub ait calculé la PR (`mergeStateStatus` connu), la mettre à jour (`gh pr update-branch`) si elle est `BEHIND` puis attendre de nouveau l'état, programmer `gh pr merge --auto --merge`, vérifier par `gh pr view --json autoMergeRequest` que la fusion est programmée, et dire où suivre la PR (`pr-watch`). Sortie 0 : programmée et vérifiée.
**Périmètre** : `.githooks/merge-auto.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/merge-auto.mjs` (`mergeAuto`).
**Preuve** : test avec `gh` simulé : ordre exact des appels (état inconnu, `BEHIND`, mise à jour, programmation, vérification), PR déjà à jour, PR de la branche courante sans numéro.
**Contrôle** : `tests-qua-161`
**Tests** : `.githooks/merge-auto.test.mjs`
**Origine** : fusion-auto-ordonnee — « `node .githooks/merge-auto.mjs <numéro>` enchaîne, dans cet ordre : attendre que GitHub ait calculé la PR, la mettre à jour si elle est `BEHIND`, programmer l'auto-merge, vérifier qu'il est programmé »
**Raison** : L'ordre sûr de la fusion automatique ne vivait que dans un texte : un sous-agent (PR #292) puis l'agent principal (PR #293) ont programmé l'auto-merge avant la mise à jour de la branche, le 2026-10-28.

## QUA-162 — L'outil de fusion automatique ne programme jamais sur un état inconnu ou pas à jour, et ne dit jamais la fusion programmée sans l'avoir vue
**Règle** : Livré à tout projet. `node .githooks/merge-auto.mjs` ne programme jamais l'auto-merge d'une PR dont l'état n'est pas calculé ou qui est encore `BEHIND` : délai dépassé (5 minutes par défaut) ou `gh` injoignable, c'est « non exécuté » (code 2). PR fermée ou fusionnée, en conflit, refus de `gh` (dont « Auto merge is not allowed for this repository », avec la sortie à suivre : un administrateur coche « Allow auto-merge », ou l'humain fusionne) ou programmation non vue après coup : « refusé » (code 1). Aucun de ces messages ne prétend que la fusion est programmée (QUA-013). Seule exception au succès sur une fusion vue programmée (`autoMergeRequest` non nul) : la PR vue fusionnée après la commande (toute sa CI déjà verte, `gh pr merge --auto` fusionne sur-le-champ) est un succès (code 0), dit « fusionnée », jamais « programmée » ; une PR ni programmée ni fusionnée reste un refus.
**Périmètre** : `.githooks/merge-auto.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/merge-auto.mjs` (`mergeAuto`).
**Preuve** : test avec `gh` simulé : état inconnu, `BEHIND` persistant, conflit, PR fermée, échec de la mise à jour, `gh` absent ou illisible, refus du dépôt, autre refus, programmation non vue ; PR fusionnée sur-le-champ (succès dit « fusionnée », en français et en anglais), PR ni programmée ni fusionnée (refus) ; aucun appel de programmation avant un état à jour.
**Contrôle** : `tests-qua-162`
**Tests** : `.githooks/merge-auto.test.mjs`
**Origine** : fusion-auto-ordonnee — « L'outil ne programme jamais l'auto-merge sur une PR dont l'état n'est pas calculé ou pas à jour ; délai dépassé, `gh` absent ou refus : il le dit, avec la sortie à suivre, et ne prétend jamais que la fusion est programmée »
**Raison** : Un état inconnu pris pour un feu vert est un contrôle non exécuté pris pour un succès (QUA-013) ; le refus du dépôt doit rester dit tel quel, avec la sortie.

## QUA-163 — L'outil de fusion automatique ne s'exécute qu'avec l'autorisation « Automatic merge » donnée au lancement
**Règle** : Livré à tout projet. `node .githooks/merge-auto.mjs` lit l'état (`.drwil/state.json` (si présent), `auto_merge`) avant tout appel à `gh` : sans l'autorisation donnée au lancement (réponse humaine « Automatic merge », ou fusion automatique de la file), ni, en SCOPING, celle de la réponse « Automatic merge » au sondage de fin de cadrage pour la branche où elle a été donnée (`scoping_merge`, QUA-188), il refuse (code 1) sans rien lancer, la fusion restant un geste humain. Messages en français ou en anglais selon la langue du projet.
**Périmètre** : `.githooks/merge-auto.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/merge-auto.mjs` (`mergeAuto`).
**Preuve** : test : état sans `auto_merge` ou absent, refus sans aucun appel `gh`, en français et en anglais ; ligne de commande avec un `gh` factice.
**Contrôle** : `tests-qua-163`
**Tests** : `.githooks/merge-auto.test.mjs`
**Origine** : fusion-auto-ordonnee — « Il ne s'exécute qu'avec l'autorisation « Automatic merge » donnée au lancement (lue dans l'état) ; sans elle il refuse »
**Raison** : La fusion est la décision d'acceptation, prise par l'humain au lancement : un outil qui programme l'auto-merge sans cette autorisation la lui prendrait.

## QUA-164 — La consigne de l'état et le skill de lancement appellent l'outil de fusion automatique, le suivi et le retour en SCOPING restent
**Règle** : Livré à tout projet. Avec la fusion automatique autorisée, la consigne donnée par l'état (`.githooks/state-context-texts.mjs`, `autoMerge`, en français et en anglais) et le skill `start-a-workstream` disent de lancer `node .githooks/merge-auto.mjs <numéro>` au lieu de lister les commandes `gh` à enchaîner à la main, puis de suivre la PR par `node .githooks/pr-watch.mjs <numéro>` et de ne revenir en SCOPING qu'une fois la PR fusionnée ; CI rouge avant la fusion : rester en CLOSING et `reopen` (QUA-138, inchangé).
**Périmètre** : `.githooks/state-context-texts.mjs` (`autoMerge`), skill `start-a-workstream` ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/state-context-texts.mjs` (`autoMerge`), `packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md`.
**Preuve** : test sur les gabarits livrés : l'appel de l'outil précède le suivi par `pr-watch`, dans la consigne française, anglaise et le skill, sans mise à jour à la main.
**Contrôle** : `tests-qua-164`
**Tests** : `.githooks/merge-auto.test.mjs`
**Origine** : fusion-auto-ordonnee — « La consigne de l'état et le skill appellent cet outil au lieu de lister les commandes `gh` ; le suivi (`pr-watch`) et le retour en SCOPING après la fusion restent inchangés »
**Raison** : Une consigne qui liste les commandes dépend de la mémoire de l'agent ; l'outil porte l'ordre, la consigne n'a plus qu'à l'appeler.

## QUA-165 — Sous Copilot CLI, le sondage de lancement propose et lit un choix multiple de fiches, comme sous Claude Code
**Règle** : Livré à tout projet. Le hook de lecture du sondage (`.claude/hooks/start-poll.mjs`) reconnaît, sous Copilot CLI, le champ des fiches à choix unique (`enum`) comme à choix multiple (type `array`, valeurs dans `items.enum`) et en tire la liste des options. La réponse à un choix multiple (valeurs séparées par des virgules, ou liste entre crochets, les champs `drwil-merge`, `drwil-worktree` et `drwil-parallel` restant lus comme avant) est lue comme une file, dans l'ordre des options du sondage (`inPollOrder`, QUA-037) ; une seule fiche cochée est un lancement simple, et le choix unique est lu à l'identique. Une valeur par défaut dans le champ reste refusée (le hook ne répond jamais à la place de l'humain). Ce que le skill `start-a-workstream` prescrit à l'agent Copilot pour ce champ est fixé par QUA-180 (choix unique).
**Périmètre** : `.claude/hooks/start-poll.mjs`, skill `start-a-workstream` ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs`, `packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md`.
**Preuve** : test du hook rejoué sur un sondage Copilot à champ `array` : file lue dans l'ordre des options malgré une réponse en désordre, fusion lue, liste entre crochets, une seule fiche, valeur par défaut refusée. La forme réelle de la réponse de Copilot CLI n'est pas encore relevée (essai humain, `docs/intentions/sondage-worktree-copilot-cli.md`).
**Contrôle** : `tests-qua-165`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : sondage-copilot-choix-multiple — « Le sondage `/drwil-start` de Copilot CLI propose et lit un choix multiple (file de chantiers) »
**Raison** : Sans ce champ, Copilot CLI ne proposait jamais la file ni le lancement en parallèle que le hook sait lire.

## QUA-166 — Les lots d'une fiche se lisent dans sa section « Increments » et `state.mjs lot` dit le lot courant, ceux qui sont faits et ceux qui restent
**Règle** : Livré à tout projet. Les lots d'une fiche sont lus dans sa section « Increments » (puces « **Lot N — titre** [IA|humain] » ; sans étiquette, un lot est [IA]) par `.githooks/briefs-lots.mjs`. `node .githooks/state.mjs lot` dit le lot courant, les lots [IA] faits, ceux qui restent et les lots [humain] à faire ; un lot dont l'état est inconnu n'est pas compté fait (QUA-013, un contrôle non exécuté n'est pas passé). Une fiche à un seul lot, ou sans lot, n'a pas de lot courant.
**Périmètre** : `.githooks/briefs-lots.mjs`, `.githooks/state-lots.mjs`, `.githooks/state-cli-lots.mjs`
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/briefs-lots.mjs`.
**Preuve** : test de lecture des puces (étiquettes, section, doublons) et de la commande `lot` sur un dépôt de test.
**Contrôle** : `tests-qua-166`
**Tests** : `.githooks/state-lots.test.mjs`
**Origine** : lots-en-sous-agents — « La commande `state.mjs lot` dit le lot courant, ceux qui sont faits et ceux qui restent »
**Raison** : Un lot courant lu par l'outil, jamais déduit de la conversation, est la condition pour qu'un sous-agent neuf sache quel lot traiter.

## QUA-167 — `state.mjs lot next` ne passe au lot suivant que si le lot courant est commité, et jamais au-delà du dernier
**Règle** : Livré à tout projet. `node .githooks/state.mjs lot next` marque le lot courant fait et passe au lot [IA] suivant seulement si l'arbre est propre (un état de git inconnu refuse aussi) ; au dernier lot [IA] il le marque fait sans aller plus loin, et un nouvel appel est refusé. Il ne s'exécute qu'en BUILD, par l'outil (l'état n'est jamais écrit à la main). Le lot courant, local comme l'état, dans un fichier de `.drwil/`, est effacé au lancement d'un chantier et au retour en SCOPING.
**Périmètre** : `.githooks/state-lots.mjs` (`nextLot`), `.githooks/state.mjs` (`start`, `move`)
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/state-lots.mjs`.
**Preuve** : tests : arbre modifié refusé, pas de passage au-delà du dernier lot, lot oublié au retour en SCOPING.
**Contrôle** : `tests-qua-167`
**Tests** : `.githooks/state-lots.test.mjs`
**Origine** : lots-en-sous-agents — « `state.mjs lot next` passe au lot suivant seulement si le lot courant est commité (arbre propre) ; il ne passe jamais à un lot au-delà du dernier »
**Raison** : Le lot suivant démarre sur la preuve du lot précédent, ses commits : un lot non commité ferait perdre son travail au sous-agent neuf.

## QUA-168 — Le rappel d'état d'un chantier à lots nomme le lot courant et dit de ne traiter que lui
**Règle** : Livré à tout projet. En BUILD, le contexte (`.githooks/state-texts.mjs`) et le rappel injecté à chaque message (`shortReminder`), en français et en anglais, nomment le lot courant, disent de ne traiter que lui et de passer par `lot next` une fois commité ; au dernier lot [IA], de vérifier puis clore.
**Périmètre** : `.githooks/state-texts.mjs`, `.githooks/state-context-texts.mjs`
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/state-texts.mjs`.
**Preuve** : test du contexte et du rappel d'une fiche à lots : lot courant nommé, « ne traiter que lui ».
**Contrôle** : `tests-qua-168`
**Tests** : `.githooks/state-lots.test.mjs`
**Origine** : lots-en-sous-agents — « Le rappel d'état d'un chantier à lots nomme le lot courant et dit de ne traiter que lui »
**Raison** : Sans le rappel, un sous-agent neuf relirait toute la fiche et traiterait plusieurs lots, ce que l'enchaînement veut éviter.

## QUA-169 — Un lot [humain] est sauté par l'enchaînement, nommé comme restant à faire et rappelé à la clôture
**Règle** : Livré à tout projet. `lot next` saute les lots [humain], continue sur les lots [IA] suivants et nomme les lots [humain] restant à faire ; le contexte les rappelle en BUILD et en CLOSING, avec ce qui est attendu (leur critère est jugé par `verify`).
**Périmètre** : `.githooks/state-lots.mjs`, `.githooks/state-texts.mjs`
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/state-lots.mjs`.
**Preuve** : tests : lot [humain] sauté et nommé par `lot next`, rappelé dans le contexte de CLOSING.
**Contrôle** : `tests-qua-169`
**Tests** : `.githooks/state-lots.test.mjs`
**Origine** : lots-en-sous-agents — « Un lot [humain] est sauté par l'enchaînement, nommé comme restant à faire, et rappelé à la clôture avec ce qui est attendu »
**Raison** : Un lot humain ne s'exécute pas dans un sous-agent : il ne doit ni bloquer l'enchaînement ni disparaître de la clôture.

## QUA-170 — La clôture d'une fiche à lots reste unique : refusée tant qu'un lot [IA] n'est pas fait, inchangée pour une fiche à un seul lot
**Règle** : Livré à tout projet. Le passage à CLOSING est refusé, avant toute autre vérification, tant qu'un lot [IA] de la fiche n'est pas fait (`lot next` après le commit de chacun, le dernier compris) ; un lot [humain] n'est que rappelé, son critère est jugé par `verify`. Une fiche à un seul lot, ou sans lot, se comporte comme avant : scope, critères, `verify` et clôture restent ceux de la fiche.
**Périmètre** : `.githooks/state.mjs` (`move`), `.githooks/state-lots.mjs` (`lotsRefusal`)
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/state-lots.mjs`.
**Preuve** : tests : clôture refusée avec les lots restants nommés, acceptée une fois faits (le refus suivant est celui de l'évidence), fiche à un lot ou sans lot inchangée.
**Contrôle** : `tests-qua-170`
**Tests** : `.githooks/state-lots.test.mjs`
**Origine** : lots-en-sous-agents — « La clôture reste unique : refusée tant qu'un lot [IA] n'est pas fait … une fiche à un seul lot (ou sans lot) se comporte comme avant »
**Raison** : Une clôture autorisée avec un lot [IA] manquant livrerait une fiche à moitié réalisée.

## QUA-171 — Le mode d'emploi du lancement dit qu'un sous-agent neuf traite chaque lot, la passation se faisant par les commits et la section « Reprise »
**Règle** : Livré à tout projet. Le skill `start-a-workstream` dit qu'une fiche à lots se réalise avec un sous-agent neuf par lot (même fiche, branche et PR, une clôture), dont la consigne commence par lire l'état, que la passation se fait par les commits et la section « Reprise » de la fiche, que le sous-agent lance `lot next` une fois son lot commité, que le dernier lot clôt la fiche, et que `verify --failed` n'est lancé entre deux lots qu'après un échec.
**Périmètre** : skill `start-a-workstream` ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md`.
**Preuve** : test sur le gabarit livré : sous-agent neuf par lot, `lot next` et section de reprise cités.
**Contrôle** : `tests-qua-171`
**Tests** : `.githooks/state-lots.test.mjs`
**Origine** : lots-en-sous-agents — « Le mode d'emploi du lancement … dit qu'un sous-agent neuf traite chaque lot, la passation se faisant par les commits et la section « Reprise » de la fiche »
**Raison** : Les outils ne lancent pas de sous-agent : c'est la consigne du skill qui fait enchaîner les lots.

## QUA-172 — Le registre des contrats s'écrit en SCOPING comme une fiche, et reste soumis au cadrage en BUILD
**Règle** : Livré à tout projet. La barrière de périmètre (`.githooks/scope-gate.mjs`) accepte le registre des contrats (`docs/contracts.md`, ou `dirs.contracts`) en SCOPING, sans avertissement, comme une fiche : un nouveau contrat entre dans le même commit que la fiche qui le cite. Au rejeu d'une branche (CI, pre-push, `verify`), un commit sans trailer `Drwil-Brief` (fait en SCOPING) qui n'écrit que le registre passe ; tout autre fichier hors fiche du même commit reste signalé. En BUILD, EVIDENCE ou CLOSING, le registre reste jugé comme tout autre fichier (cadrage de la fiche, ou activité refusée) ; la régression d'un contrat modifié sans ligne « Contrats modifiés » reste signalée par `drwil verify` et refuse la clôture (QUA-023, QUA-084).
**Périmètre** : `.githooks/scope-gate.mjs` (`checkIndex`, `checkBranch`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/scope-gate.mjs` (`checkIndex`).
**Preuve** : tests de la barrière : registre accepté en SCOPING seul ou avec une fiche, refusé avec un fichier de code, jugé en BUILD et CLOSING, registre déclaré par `dirs.contracts` ; rejeu d'une branche : commit sans trailer qui n'écrit que le registre accepté, commit avec trailer jugé.
**Contrôle** : `tests-qua-172`
**Tests** : `.githooks/scope-gate.test.mjs`
**Origine** : cycle-de-vie-des-fiches — « Le registre des contrats s'écrit en SCOPING sans avertissement de périmètre, et un nouveau contrat entre dans le même commit que la fiche qui le cite ; la régression d'un contrat modifié dans une branche sans ligne « Contrats modifiés » reste signalée par `drwil verify` et refuse la clôture »
**Raison** : Écrire le registre pendant le cadrage déclenchait l'avertissement de périmètre : créer un contrat en cours de chantier demandait deux commits (la fiche ne peut citer l'ID avant qu'il soit inscrit).

## QUA-173 — Le code déjà livré sur la branche principale reste couvert par défaut après la clôture d'une fiche
**Règle** : Livré à tout projet. Un fichier de code suivi par git sur la branche principale (base de fusion de HEAD avec `DRWIL_BASE`, `origin/HEAD`, `origin/master`, `origin/main`, `master` puis `main`) et identique dans la copie de travail est « livré » : le rappel de cadrage (`outsideBriefs`, `.githooks/scope.mjs`) ne le signale pas quand aucune fiche ne le cite plus. Un fichier nouveau, modifié ou retiré par la branche n'est pas livré et reste soumis à une fiche ; la barrière de périmètre à la validation et au rejeu (QUA-172, `.githooks/scope-gate.mjs`) n'est pas touchée : tout fichier modifié exige toujours une fiche active qui le cadre. Branche principale introuvable, historique ou dépôt illisible : aucun fichier n'est livré, jamais un succès par défaut (QUA-013).
**Périmètre** : `.githooks/scope.mjs` (`deliveredFiles`, `outsideBriefs`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/scope.mjs` (`deliveredFiles`).
**Preuve** : tests sur de vrais dépôts git temporaires : fichier identique livré, fichier nouveau, modifié ou retiré non livré, fiche qui couvre un fichier non livré, branche principale introuvable ou hors dépôt git sans fichier livré, lecture du dépôt où le hook est installé.
**Contrôle** : `tests-qua-173`
**Tests** : `.githooks/scope.test.mjs`
**Origine** : cycle-de-vie-des-fiches — « Un fichier de code déjà présent sur la branche principale reste couvert par défaut après la clôture d'une fiche ; le cadrage ne garde que le code nouveau ou modifié, et la barrière de périmètre n'est pas affaiblie pour un fichier hors de ce cas »
**Raison** : La clôture supprime la fiche alors que tout fichier de code doit rester couvert : drwil_com a dû créer à la main une fiche de référence « code livré ».

## QUA-174 — Les critères d'acceptation acceptés au lancement sont figés : un critère modifié ensuite refuse la clôture
**Règle** : Livré à tout projet. Le lancement décidé par l'humain (sondage lu par le hook, terminal interactif) enregistre, pour la fiche lancée et celles qu'il met en file, l'empreinte (`sha256:` et 16 hexadécimaux) de la section « Critères d'acceptation » : texte de chaque puce, lignes de continuation jointes, espaces normalisés, preuve citée (`` `ID` ``, « contrat à créer ») exclue. Les marques de classification `[humain]` et `[human]` (sans distinction de casse) sont aussi exclues : ajouter ou retirer une marque ou un lien de preuve ne change pas l'empreinte. Une marque citée entre accents graves reste du texte ; tout autre changement du texte d'un critère change l'empreinte. L'enregistrement est local, dans un fichier du dossier d'évidence `.drwil/evidence/` (hors git) : une empreinte, jamais les critères. La clôture (`.githooks/closure-proof.mjs`) relit l'empreinte : identique ou absente (fiche lancée sans l'humain), elle écrit la ligne « Critères acceptés » dans la preuve (empreinte et date, ou « aucune acceptation enregistrée ») ; modifiée, elle est refusée sans rien écrire (ni preuve, ni fiche supprimée) jusqu'à ce que l'humain accepte de nouveau les critères (`node .githooks/state.mjs accept`, terminal interactif, saisie de `ACCEPT` après affichage des critères). Un lancement refusé, une fiche sans critère ou illisible n'enregistrent rien.
**Périmètre** : `.githooks/state-acceptance.mjs`, `.githooks/state.mjs` (`start`, `move`, commande `accept`), `.githooks/closure-proof.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/state-acceptance.mjs` (`criteriaFingerprint`, `acceptanceCheck`).
**Preuve** : tests : empreinte insensible à la preuve citée, à la mise en forme et aux marques de classification humaines, mais sensible au texte (y compris les marques citées en code), enregistrement au lancement humain (fiche et file), ajout ou retrait de marque sans renouveler l'acceptation ni refuser la clôture, refus sans enregistrement, preuve de clôture avec ou sans acceptation (français, anglais), clôture refusée sur critère modifié ou retiré sans rien écrire, commande `accept` (confirmation, sans chantier, sans critère).
**Contrôle** : `tests-qua-174`
**Tests** : `.githooks/state.test.mjs`, `.githooks/close.test.mjs`
**Origine** : cycle-de-vie-des-fiches — « Le lancement par sondage enregistre l'empreinte des critères acceptés par l'humain ; l'empreinte entre dans la preuve de clôture ; un critère modifié ensuite redemande un geste humain avant la clôture »
**Raison** : Rien ne figeait les critères acceptés : un agent pouvait les réécrire en cours de chantier, puis clore sur ses propres critères.

## QUA-175 — Aucun agent ne peut écrire l'acceptation des critères
**Règle** : Livré à tout projet. L'acceptation n'est enregistrée que par un lancement dont l'appelant atteste la décision humaine (`start(…, { human: true })` : sondage lu par le hook, `.githooks/worktree.mjs`) ou par la commande `accept` d'un terminal interactif (entrée et sortie standard attachées à un terminal). Un lancement en mode agent (`transitions: agent`, sans sondage) n'enregistre rien et oublie l'acceptation de la fiche lancée, sauf celle qu'elle avait reçue en tête de file d'un lancement humain ; le retour en SCOPING oublie celle de la fiche quittée. `accept` sans terminal est refusée sans rien écrire. Un fichier d'acceptation absent, illisible ou d'une autre forme vaut « aucune acceptation », jamais une erreur ni un succès par défaut (QUA-013).
**Périmètre** : `.githooks/state-acceptance.mjs` (`accept`), `.githooks/state.mjs` (`start`, `move`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/state-acceptance.mjs` et `.githooks/state.mjs` (`start`).
**Preuve** : tests : lancement en mode agent sans enregistrement et effaçant une ancienne acceptation, fiche prise en file conservée, retour en SCOPING, fichier illisible ou d'une autre forme, `accept` refusée sans terminal.
**Manuel** : vérifier qu'aucune commande, aucun hook ni aucun outil de l'agent n'écrit ce fichier d'acceptation ; l'écriture directe du fichier par un agent n'est pas empêchée par ce contrat (gardes d'écriture hors périmètre).
**Couvre** : `.githooks/state-acceptance.mjs`, `.githooks/state.mjs`
**Contrôle** : `tests-qua-175`
**Tests** : `.githooks/state.test.mjs`
**Origine** : cycle-de-vie-des-fiches — « Aucun agent ne peut écrire l'acceptation : elle vient du sondage lu par le hook ou du terminal interactif »
**Raison** : Une acceptation que l'agent peut s'accorder lui-même ne prouve rien du consentement de l'humain.

## QUA-176 — Lire l'état en CLOSING dont la PR du chantier est fusionnée ramène en SCOPING
**Règle** : Livré à tout projet. Lire l'état (`node .githooks/state.mjs`, début de session, rappel d'invite) en CLOSING, fiche active supprimée, ramène en SCOPING et le dit quand la PR du chantier est fusionnée (même preuve que le lancement depuis CLOSING : `closingMerged`, branche principale courante ou branche fusionnée selon git ou `gh`) ; la file décidée au lancement est conservée et l'autorisation de fusion automatique effacée, comme tout retour en SCOPING. PR ouverte, introuvable, `gh` absent ou fiche encore là : l'état reste CLOSING et le dit, jamais un retour (QUA-013). Une lecture qui échoue ne casse jamais le début de session.
**Périmètre** : `.githooks/state-transitions.mjs` (`settleClosing`), `.githooks/state-cli.mjs` (appel à la lecture), messages français et anglais ; livré dans le gabarit.
**Source de vérité** : `.githooks/state-transitions.mjs` (`settleClosing`) et `.githooks/close-branches.mjs` (`closingMerged`).
**Preuve** : tests : fusionnée (branche principale, branche fusionnée), ouverte, `gh` absent, fiche encore là, file conservée.
**Contrôle** : `tests-qua-176`
**Tests** : `.githooks/state.test.mjs`
**Origine** : retour-scoping-branche-sondage — « Après la fusion de la PR du chantier, l'état dit "CLOSING, fiche supprimée" alors que tout est fini : le déclencheur du retour en SCOPING manque à la fusion constatée »
**Raison** : Le retour en SCOPING n'avait lieu qu'au prochain `start` ou `next` : l'état mentait après la fusion et le cadrage suivant demandait un geste de plus.

## QUA-177 — `next` ne lance la tête de file qu'une fois la PR du chantier précédent fusionnée
**Règle** : Livré à tout projet. `node .githooks/state.mjs next` refuse de lancer la tête de file tant que la PR du chantier précédent n'est pas fusionnée (`closingMerged`) et le dit ; PR introuvable, `gh` absent ou branche principale introuvable : refus qui le dit, jamais un lancement (QUA-013). Sans file, `next` refuse comme avant.
**Périmètre** : `.githooks/state-transitions.mjs` (`nextHead`), `.githooks/state-cli.mjs` (`next`), messages français et anglais ; livré dans le gabarit.
**Source de vérité** : `.githooks/state-transitions.mjs` (`nextHead`).
**Preuve** : tests : branche principale, PR ouverte, `gh` absent, dépôt sans branche principale locale (ni `main` ni `master`), branche fusionnée.
**Contrôle** : `tests-qua-177`
**Tests** : `.githooks/state.test.mjs`
**Origine** : retour-scoping-branche-sondage — « next ne vérifie pas la fusion : l'agent peut lancer le suivant sur une branche pas à jour »
**Raison** : « La suivante après la fusion de la précédente » n'était qu'une consigne écrite ; rien n'empêchait de lancer le suivant sur une branche pas à jour.

## QUA-178 — Une file décidée au lancement enchaîne le chantier suivant à la fusion constatée
**Règle** : Livré à tout projet. Le retour en SCOPING de QUA-176, constaté à l'invite d'une session en cours (rappel d'état de Claude Code, Copilot CLI ou Gemini CLI), lance aussitôt la tête de la file décidée au lancement, avec la fusion décidée, sans nouveau geste. Constaté au début d'une session (lecture de l'état, `copilot-start`, `gemini-start`), il ne lance rien : une file reprise dans une nouvelle session attend le oui explicite de l'humain avant `next` (QUA-037). Un lancement refusé (fiche plus prête, ou CI de la branche principale non prouvée verte sur sa dernière fusion, QUA-251) est dit et l'état reste SCOPING.
**Périmètre** : `.githooks/state-transitions.mjs` (`settleClosing`), `.githooks/state-cli.mjs` (invite ou début de session) ; livré dans le gabarit.
**Source de vérité** : `.githooks/state-transitions.mjs` (`settleClosing`).
**Preuve** : tests : invite des trois outils, début de session des trois outils, fiche suivante non prête, file absente.
**Contrôle** : `tests-qua-178`
**Tests** : `.githooks/state.test.mjs`
**Origine** : retour-scoping-branche-sondage — « Une file décidée au lancement devrait enchaîner le chantier suivant dès que la fusion du précédent est constatée, sans geste de plus ; une file reprise dans une nouvelle session attend toujours le oui explicite de l'humain »
**Raison** : Une file ne repartait pas seule après la fusion : l'humain devait relancer chaque chantier, alors qu'il avait décidé la file d'un geste.
**Modifié** : 2026-11-06 — l'enchaînement attend la preuve de CI verte de la branche principale sur sa dernière fusion, comme `next` (QUA-251, chantier « CI rapide pour la doc », lot 4) : sans elle, retour en SCOPING seul, refus dit, file gardée.

## QUA-179 — Lancer en « This folder » crée `workstream/<fiche>` depuis la branche principale à jour
**Règle** : Livré à tout projet. Un lancement dans le dossier courant (`start`, hors « New worktree » qui crée déjà sa branche) crée et bascule sur `workstream/<fiche>`, coupée de `origin/<principale>` après un `git fetch` (sans suivi, `--no-track`), ou de la branche locale si elle porte des commits que `origin` n'a pas (jamais un commit local perdu) ou si le fetch échoue (et le dit) ; si la branche courante est déjà `workstream/<fiche>`, elle est gardée et rien n'est refusé. Refus, qui dit quoi faire et sans rien changer (ni branche, ni état) : branche courante non fusionnée dans la principale, ou fusion non établie (`gh` absent, HEAD détachée, QUA-013), même preuve que QUA-176 (`closingMerged`) ; arbre de travail avec des modifications non commitées ; branche `workstream/<fiche>` déjà existante ailleurs. Sans branche principale locale (`main` ou `master`) ou hors git, aucune branche n'est créée. Le refus de commit sur la branche principale (QUA-017) reste le filet de sécurité. La recette livrée `docs/recipes/working-with-branches.md` le dit : un lancement en « This folder » crée `workstream/<fiche>` depuis la branche principale à jour, et les cas où il refuse.
**Périmètre** : `.githooks/worktree.mjs` (`prepareBranch`), `.githooks/state-transitions.mjs` (`start`), `docs/recipes/working-with-branches.md` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/worktree.mjs` (`prepareBranch`).
**Preuve** : tests : création depuis `origin` à jour sans suivi, depuis la principale locale en avance sur `origin`, branche gardée, arbre sale, branche non fusionnée, fusion non établie, branche existante, `git switch` en échec, branche fusionnée quittée, messages anglais, `fetch` en échec, sans branche principale ; test du paquet : la recette livrée a la puce « This folder », qui dit la création de `workstream/<fiche>` depuis la principale à jour et ses refus.
**Contrôle** : `tests-qua-179`
**Tests** : `.githooks/worktree.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : retour-scoping-branche-sondage — « Un lancement en "This folder" depuis la branche principale crée et bascule sur workstream/<fiche> depuis la branche principale à jour ; depuis une branche de chantier il la garde ; une branche déjà existante ou un arbre sale est refusé avec un message qui dit quoi faire »
**Raison** : Le lancement en « This folder » passait en BUILD sur la branche courante, souvent la principale : seul le refus de commit forçait ensuite à créer la branche à la main.

## QUA-180 — Sous Copilot CLI, le sondage de lancement pose le champ des fiches en choix unique
**Règle** : Livré à tout projet. Le skill `start-a-workstream` dit à l'agent Copilot de poser le champ `fiche` en choix unique (`type: "string"` et `enum` seul, jamais `type: "array"`), seul lu de façon fiable : le champ à choix multiple est revenu vide sous Copilot CLI malgré la case cochée. Une fiche par sondage, donc pas de file ni de `drwil-parallel` depuis Copilot CLI ; `drwil-merge` et `drwil-worktree` restent posés avec lui. Le hook (`.claude/hooks/start-poll.mjs`) lit la réponse à ce champ et, sans rien casser, lit encore un champ à choix multiple (`array`) si un autre outil l'envoie (QUA-165).
**Périmètre** : skill `start-a-workstream`, `.claude/hooks/start-poll.mjs` ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md`.
**Preuve** : test : le skill livré prescrit le choix unique et interdit `array` pour Copilot CLI ; le hook rejoué lit une fiche et la fusion sur un champ `enum` seul, et lit toujours un tableau.
**Contrôle** : `tests-qua-180`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : retour-scoping-branche-sondage — « Le sondage multi-choix revient vide sous Copilot CLI ; le même champ en choix unique est lu »
**Raison** : Le champ en tableau prescrit par le skill revenait vide trois fois : le lancement ne partait pas.

## QUA-181 — Une réouverture échouée après l'annulation de la fusion automatique dit que l'humain la reprogramme
**Règle** : Livré à tout projet. Quand `node .githooks/state.mjs reopen` (QUA-116) échoue après avoir annulé la fusion automatique (commit de la fiche restaurée refusé), le refus dit que la fusion est annulée et non reprogrammée, que l'outil ne la reprogramme jamais seul (au risque de fusionner le code fautif) et qu'il revient à l'humain de la reprogrammer. L'état garde alors, en CLOSING seulement, la marque `merge_cancelled` (numéro de la PR) ; le contexte et le rappel d'état le redisent, en français et en anglais, jusqu'à une réouverture réussie (qui l'efface), au retour en SCOPING, ou au passage de `node .githooks/merge-auto.mjs` qui voit la fusion programmée sur la PR de la marque : il l'efface (par l'outil d'état, seule écriture de l'état qu'il fasse) et le dit ; une autre PR, ou une fusion non vue programmée, la laisse. L'outil ne reprogramme jamais seul : `merge-auto` exige toujours l'autorisation de l'humain (QUA-163, QUA-188). Sans fusion programmée, rien n'est annulé et aucune marque n'est posée.
**Périmètre** : `.githooks/state-reopen.mjs` (`reopen`), `.githooks/state-validate.mjs` (champ `merge_cancelled`), `.githooks/state-transitions.mjs` (`prepareTransition`), `.githooks/state-texts.mjs` (contexte, rappel), `.githooks/state-messages-fr.mjs` et `.githooks/state-messages-en.mjs`, `.githooks/merge-auto.mjs` (marque effacée) ; livré dans le gabarit.
**Source de vérité** : `.githooks/state-reopen.mjs` (`reopen`).
**Preuve** : tests : hook pre-commit qui refuse avec fusion programmée (marque posée, message, rappel et contexte, en français et en anglais), réouverture réussie ensuite (marque effacée), sans fusion programmée (pas de marque), marque invalide ou hors CLOSING refusée, retour en SCOPING qui l'efface ; `merge-auto` qui voit la fusion programmée sur la PR de la marque l'efface et le dit (en français et en anglais), autre PR, programmation non vue ou PR fusionnée sur-le-champ la laissent.
**Contrôle** : `tests-qua-181`
**Tests** : `.githooks/state.test.mjs`, `.githooks/merge-auto.test.mjs`
**Origine** : reouverture-dite-et-eprouvee — « Quand la réouverture échoue après l'annulation de la fusion automatique, le refus dit que la fusion est annulée, qu'elle n'est pas reprogrammée par l'outil, et qu'il revient à l'humain de la reprogrammer ; le rappel d'état en CLOSING le redit tant que la fusion n'est pas reprogrammée »
**Raison** : Le message disait « à reprogrammer » sans dire qui ni quand : une fusion annulée par une réouverture échouée pouvait rester oubliée, ou être reprogrammée par l'agent sur du code fautif.

## QUA-182 — Le cycle complet d'un chantier rouvert se joue aussi sous Windows
**Règle** : Livré à tout projet. Le test du cycle complet d'un chantier rouvert (QUA-118 : clôture, réouverture, correctif, nouvelle clôture) n'est plus sauté sous Windows : son `gh` simulé y est un `gh.cmd` du PATH, et un module préchargé (`NODE_OPTIONS`) donne le shell aux appels `gh` des hooks, sans rien changer aux hooks ni au test sous Linux, où `gh` reste un script à shebang. Aucun test du cycle n'est sauté par plateforme.
**Périmètre** : `packages/drwil/test/cycle.test.mjs` (cycle de QUA-118).
**Source de vérité** : `packages/drwil/test/cycle.test.mjs`.
**Preuve** : test : le `gh` simulé du cycle se lance par le PATH et répond (script à shebang sous Linux, `gh.cmd` et shell préchargé sous Windows) ; le test du cycle (QUA-118) n'a plus de `skip` par plateforme ; la voie Windows n'est exécutée que sur un poste ou une CI Windows.
**Contrôle** : `tests-qua-182`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Origine** : reouverture-dite-et-eprouvee — « Le test du cycle complet d'une réouverture (QUA-118 : nouvelle clôture d'un chantier rouvert) se joue aussi sous Windows, avec un `gh` simulé lançable (`gh.cmd` et shell), au lieu d'être sauté »
**Raison** : Le seul test du cycle de réouverture était sauté sous Windows : un script du PATH n'y est pas lancé sans shell, la mécanique n'y était prouvée que par des tests à `gh` injecté.

## QUA-183 — L'empreinte d'une attestation porte sur l'effet des contrôles, pas sur leur forme d'exécution
**Règle** : Livré à tout projet. L'attestation (version 4) lie chaque contrôle cité à son effet : la commande (qui porte les tests visés), son dossier et ses `paths` (ordre indifférent). Les champs d'exécution (`build`, `needsBuild`, `parallel`, `reuse` et tout autre champ de la déclaration) n'y entrent pas : en ajouter ou en retirer un ne fait pas tomber l'attestation. Les attestations de version 1, 2 et 3 restent lues par leur empreinte d'origine ; la première réattestation passe à la version 4, et `drwil verify` dit pour une attestation obsolète quelle partie a changé et, pour une ancienne version, laquelle est lue.
**Périmètre** : `drwil attest`, le jugement des attestations par `drwil verify`.
**Source de vérité** : `packages/drwil/src/fingerprint.ts` (`proofFingerprints`, `covers`, `obsoleteReasons`), `packages/drwil/src/attest.ts`.
**Preuve** : test du paquet sur un dépôt temporaire : champs d'exécution et ordre des paths changés, attestation intacte ; attestation de version 3 lue puis rendue obsolète avec la raison.
**Contrôle** : `tests-qua-183`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : attestations-sur-l-effet-et-couvre — « L'empreinte d'une attestation porte sur l'effet des contrôles que le contrat cite (commande, tests visés, `paths`) et plus sur les champs d'exécution (`build`, `needsBuild`, `parallel`, `reuse`) : ajouter ou retirer un champ d'exécution ne fait pas tomber l'attestation »
**Raison** : Le 2026-10-24, l'ajout de champs de compilation et de parallélisme à une centaine de contrôles a périmé six attestations alors que l'effet des contrôles n'avait pas changé : l'humain a dû tout réattester.

## QUA-184 — Une attestation tombe quand l'effet d'un contrôle cité change
**Règle** : Livré à tout projet. Une attestation (version 4) devient obsolète, et le contrat repasse en `MANUAL`, quand la commande d'un contrôle cité, un test qu'elle vise ou ses `paths` changent, ou quand un contrôle attesté est retiré ; la sortie de `drwil verify` nomme le contrôle dont l'effet a changé. Rétablir l'effet d'origine rend l'attestation de nouveau valable. Précise QUA-013 : l'empreinte sur l'effet ne rend jamais valable un jugement sur un contrôle qui a vraiment changé.
**Périmètre** : le jugement des attestations par `drwil verify`.
**Source de vérité** : `packages/drwil/src/fingerprint.ts` (`proofFingerprints`, `obsoleteReasons`), `packages/drwil/src/verify.ts`.
**Preuve** : test du paquet sur un dépôt temporaire : commande, test visé et paths changés tour à tour, statut `MANUAL` et raison nommant le contrôle.
**Contrôle** : `tests-qua-184`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : attestations-sur-l-effet-et-couvre — « Une attestation tombe quand l'effet d'un contrôle change (commande, test visé ou `paths`), comme avant : QUA-013 (un contrôle non exécuté n'est pas passé) reste vrai »
**Raison** : Alléger l'empreinte ne doit pas laisser vivre une preuve humaine sur un contrôle qui ne dit plus la même chose (QUA-013).

## QUA-185 — Chaque contrat attesté déclare ce qu'il couvre, ou `aucun` avec sa raison
**Règle** : Livré à tout projet pour la lecture de `aucun` ; dans ce dépôt, chaque contrat à partie humaine déclare ce qu'il juge par le champ `**Couvre**` : des motifs de chemins, ou `` `aucun` `` suivi de sa raison pour un contrat de conduite que des fichiers ne jugent pas (SEC-001). `aucun` (ou `none`) compte comme déclaré pour `drwil verify` et `drwil doctor`, ne couvre aucun fichier et n'est jamais lu comme un chemin. `drwil doctor` ne signale plus aucun contrat attesté sans couverture déclarée.
**Périmètre** : `drwil doctor`, `drwil verify` ; le registre de ce dépôt.
**Source de vérité** : `packages/drwil/src/coverage.ts` (`coverageOf`, `lacksCoverage`), `docs/contracts.md` (champs `**Couvre**`).
**Preuve** : test du paquet : `aucun` déclaré dans un dépôt temporaire (aucun fichier couvert, attestation intacte, doctor muet) et `drwil doctor` sur ce dépôt (point de couverture au vert).
**Contrôle** : `tests-qua-185`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : attestations-sur-l-effet-et-couvre — « Chaque contrat attesté du dépôt déclare ce qu'il couvre (`**Couvre**`) ; `drwil doctor` ne signale plus aucun contrat attesté sans couverture déclarée »
**Raison** : 15 contrats attestés sur 17 ne déclaraient rien : le code jugé pouvait changer sans que l'attestation tombe (le workflow de CI de QUA-013 a changé ainsi).

## QUA-186 — Les attestations tombées par le passage à la version 4 sont réattestées en une séance
**Règle** : Les attestations tombées par le chantier attestations-sur-l-effet-et-couvre (empreinte sur l'effet, `Couvre` déclaré) sont réattestées par l'humain en une seule séance, et `drwil verify --evidence` rend `GOVERNANCE: PASS`.
**Périmètre** : les attestations de `.drwil/evidence/attestations/` des contrats qui repassent en `MANUAL` à ce chantier.
**Source de vérité** : `.drwil/evidence/attestations/` ; sortie de `drwil verify`.
**Preuve** : jugement humain : la liste des contrats `MANUAL` de `drwil verify` est vide, chacun réattesté par `drwil attest <ID>` en une séance.
**Manuel** : relancer `drwil verify` : plus aucun contrat `MANUAL` hors celui-ci ; réattester chaque contrat tombé (`drwil attest <ID>`), puis attester celui-ci (`drwil attest QUA-186`) ; `drwil verify --evidence` rend `GOVERNANCE: PASS`.
**Couvre** : `aucun` — jugement ponctuel d'une séance : aucun fichier ne le juge, ses attestations changent à chaque séance
**Origine** : attestations-sur-l-effet-et-couvre — « Les attestations tombées par le chantier sont réattestées par l'humain en une seule séance, et `drwil verify --evidence` rend `GOVERNANCE: PASS` »
**Raison** : Changer l'empreinte et déclarer `Couvre` périment toutes les attestations ; les faire dans un seul chantier ne coûte à l'humain qu'une séance.

## QUA-187 — En fin de cadrage, le skill pose un sondage à trois réponses, sans réponse par défaut ni recommandée
**Règle** : Livré à tout projet. Le skill `scope-a-workstream` (`/drwil-scope`, cité au menu `/drwil`) pose, à la fin d'un cadrage poussé et sa PR ouverte, un sondage d'une seule question, en-tête `drwil-scope` (12 caractères au plus), choix unique, à exactement trois réponses : « Automatic merge », « Manual merge », « Continue scoping » ; sous Copilot CLI, un champ `drwil-scope` en choix unique (`enum` seul). Le hook du sondage (`.claude/hooks/prompt-hook.mjs`, lecture dans `.claude/hooks/start-poll.mjs`) refuse avant affichage un sondage recommandé, prérempli, avec valeur par défaut, à choix multiple ou sans exactement ces trois réponses ; après la réponse, il la transmet seul à `.githooks/state.mjs` (`scopingMerge`), qui écrit l'autorisation `scoping_merge: { branch }` en SCOPING seulement, jamais sur la branche principale ni sur un état invalide.
**Périmètre** : skill `scope-a-workstream`, menu `/drwil`, `.claude/hooks/prompt-hook.mjs`, `.claude/hooks/start-poll.mjs`, `.githooks/state.mjs`, `.githooks/state-validate.mjs` ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/tools/claude/.claude/skills/scope-a-workstream/SKILL.md`, `.claude/hooks/start-poll.mjs` (`scopePoll`, `scopePollValid`, `scopeChoice`).
**Preuve** : test : le skill livré prescrit l'en-tête, les trois réponses et l'interdiction de recommander ; le hook rejoué refuse les sondages non conformes (Claude Code et Copilot CLI), écrit l'autorisation sur la réponse « Automatic merge » pour la branche courante, la retire sur une autre réponse, et refuse sur la branche principale et hors SCOPING.
**Contrôle** : `tests-qua-187`
**Tests** : `.githooks/state.test.mjs`
**Origine** : fin-de-cadrage-sondage — « Un skill de cadrage pose, à la fin d'un cadrage poussé, un sondage à trois réponses : « Automatic merge », « Manual merge », « Continue scoping » ; jamais de réponse par défaut ni recommandée »
**Raison** : Un cadrage poussé n'est pris en compte qu'à la fusion de sa PR, et rien ne demandait quoi en faire : quatre PR de cadrage sont restées à fusionner à la main ; la décision reste humaine, lue par l'outil.

## QUA-188 — La réponse « Automatic merge » de fin de cadrage ouvre l'outil de fusion automatique pour la PR de sa branche, en SCOPING
**Règle** : Livré à tout projet. En SCOPING, `node .githooks/merge-auto.mjs` accepte l'autorisation `scoping_merge: { branch }` que seule la réponse « Automatic merge » au sondage de fin de cadrage écrit (QUA-187), et seulement pour la PR dont la branche (`headRefName`) est celle de l'autorisation : la PR d'une autre branche est refusée (code 1) sans rien programmer ; sans cette autorisation il refuse comme avant (QUA-163), sans appel à `gh`. Le rappel d'état en SCOPING dit l'autorisation, la branche et la suite (`.githooks/merge-auto.mjs`, puis `.githooks/pr-watch.mjs`). L'autorisation n'existe qu'en SCOPING (`.githooks/state-validate.mjs`), jamais `queue_merge`.
**Périmètre** : `.githooks/merge-auto.mjs`, `.githooks/state-texts.mjs`, `.githooks/state-validate.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/merge-auto.mjs` (`mergeAuto`).
**Preuve** : test : en SCOPING avec l'autorisation, la PR de la branche est programmée puis vérifiée ; celle d'une autre branche refusée après une seule lecture ; sans autorisation, refus sans appel `gh` ; rappel d'état en français et en anglais.
**Contrôle** : `tests-qua-188`
**Tests** : `.githooks/merge-auto.test.mjs`
**Origine** : fin-de-cadrage-sondage — « La réponse « Automatic merge », lue par le hook, autorise `.githooks/merge-auto.mjs` pour la PR de cadrage en SCOPING (aujourd'hui refusé : `auto_merge` n'existe qu'après un lancement) ; sans cette réponse, `.githooks/merge-auto.mjs` refuse comme avant »
**Raison** : Fusionner une PR de cadrage sans geste manuel, par la seule voie sûre (`merge-auto`), sans jamais ouvrir la fusion d'une autre PR.

## QUA-189 — « Manual merge » et « Continue scoping » ne programment rien ; « Continue scoping » garde la branche et la PR
**Règle** : Livré à tout projet. Les réponses « Manual merge » et « Continue scoping » au sondage de fin de cadrage n'écrivent aucune autorisation et retirent celle d'une réponse précédente : `node .githooks/merge-auto.mjs` refuse ensuite sans appel à `gh`. « Continue scoping » laisse la PR ouverte : le message du hook et le skill `scope-a-workstream` disent que les cadrages suivants se commitent sur la même branche (une branche, une PR) et que le sondage se repose au cadrage suivant ; « Manual merge » laisse la fusion à l'humain.
**Périmètre** : `.githooks/state.mjs` (`scopingMerge`), skill `scope-a-workstream` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/state.mjs` (`scopingMerge`).
**Preuve** : test : après chaque réponse, état sans `scoping_merge`, `merge-auto` refuse sans appel `gh`, message de « Continue scoping » qui nomme la branche ; le skill livré prescrit la même branche.
**Contrôle** : `tests-qua-189`
**Tests** : `.githooks/merge-auto.test.mjs`
**Origine** : fin-de-cadrage-sondage — « La réponse « Continue scoping » laisse la PR ouverte et garde la même branche pour les cadrages suivants (une branche, une PR) ; « Manual merge » ne programme rien »
**Raison** : On cadre souvent plusieurs fiches à la suite et on veut les relire ensemble : la fusion repoussée ne doit rien programmer en douce.

## QUA-190 — `docs/ia-first.md` est un sommaire court : chaque section est un fichier de `docs/ia-first/` qui se lit seul, et chaque renvoi y mène
**Règle** : Livré à tout projet. `docs/ia-first.md` ne garde que son introduction et le sommaire : c'est un sommaire de moins de 100 lignes qui garde la numérotation des sections 1 à 8 et donne, pour chacune et pour chaque sous-section de la section 7, le chemin de son fichier dans `docs/ia-first/` ; le dossier ne contient que les fichiers du sommaire. Le texte de chaque règle vit dans un seul fichier de section, jamais en double : aucun paragraphe de règle au sommaire, aucun paragraphe non trivial dans deux fichiers du dossier ni à la fois au sommaire et dans une section. Chaque fichier tient sous le plafond des documents lus à la demande (QUA-157), commence par le titre numéroté de sa section et renvoie au sommaire : un agent le charge sans lire les autres. Chaque renvoi du gabarit à `docs/ia-first.md` mène à une section existante : « section N » à une ligne du sommaire, un chemin du dossier docs/ia-first/ à un fichier livré, un titre cité dans un document ou dans un commentaire d'un hook livré à un titre de section ; aucun renvoi relatif d'un fichier de `docs/ia-first/` ne sort de ce fichier (ni « this document », ni titre cité avec « below » ou « above » absent du même fichier). Les renvois les plus lus (`AGENTS.md`, skill `drwil`, `docs/projects/model-brief.md`, `docs/projects/pending.md`, `docs/projects/routine-maintenance.md`, gabarit et copie du dépôt) visent le fichier de section exact, jamais « section N » du sommaire. Le registre du dépôt (`docs/contracts.md`) et l'intention sur la compatibilité des outils font de même : aucun renvoi « `docs/ia-first.md` (section N) », de la matrice ou du réglage par le sommaire, et chaque fichier de section cité existe. `drwil init` livre le dossier et une mise à jour le traite comme la prose du kit (`KIT_PROSE`) : une section restée telle qu'installée est rafraîchie, une section adaptée par le projet est gardée.
**Périmètre** : `docs/ia-first.md`, `docs/ia-first/` ; `packages/drwil/src/config.ts` (`KIT_PROSE`) ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/docs/ia-first.md` (sommaire), `packages/drwil/templates/common/base/docs/ia-first/`, `packages/drwil/src/config.ts` (`KIT_PROSE`).
**Preuve** : tests du paquet : sommaire de moins de 100 lignes avec une ligne et un fichier par section, sommaire réduit à l'introduction et à la table des sections (aucun paragraphe de règle), aucun paragraphe d'au moins 40 caractères en double entre fichiers (hors titres et en-tête de renvoi), dossier et sommaire identiques (gabarit et copie du dépôt), chaque fichier sous 400 lignes, titré et renvoyant au sommaire ; chaque renvoi du gabarit résolu, titres cités dans les commentaires des hooks livrés compris, aucun renvoi relatif hors de son fichier (gabarit et copie du dépôt), renvois les plus lus vers un fichier de section existant ; registre du dépôt et intention sur la compatibilité des outils sans renvoi par le sommaire, chaque fichier de section cité existant ; installation qui livre le dossier au manifeste, mise à jour qui rafraîchit une section inchangée et garde une section adaptée.
**Contrôle** : `tests-qua-190`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : ia-first-en-sections-courtes — « Chaque section issue de la découpe se lit seule : un agent la charge sans lire les autres, et chaque renvoi existant vers `docs/ia-first.md` mène à la bonne section »
**Raison** : `docs/ia-first.md` faisait 916 lignes : un agent qui ne cherchait qu'une règle en chargeait des centaines.

## QUA-191 — Les lignes ajoutées ou modifiées d'une branche, et les branches qu'elles ouvrent, sont couvertes à 100 % d'après le rapport lcov du projet
**Règle** : Livré à tout projet qui déclare `diffCoverage` dans `.drwil/ia-first.json`. `.githooks/check-diff-coverage.mjs` lit le diff de la branche contre sa base (`git diff <base>...HEAD`, base : option `--base`, `diffCoverage.base`, puis `origin/master`, `origin/main`, `master`, `main`) et le rapport lcov du projet : toute ligne ajoutée ou modifiée dont le compteur est nul, et toute branche ouverte par une telle ligne et jamais prise, fait échouer le contrôle en nommant fichier et ligne ; un fichier modifié qui correspond à `diffCoverage.include` mais que le rapport ignore compte comme non mesuré, donc en échec. Indépendant de la pile : le rapport est celui de l'outil de couverture de la pile, produit par la commande déclarée (`diffCoverage.produce`). Au push et en CI (job `checks`), pas à l'écriture du code : la PR entière est jugée avant fusion.
**Périmètre** : `.githooks/check-diff-coverage.mjs` et son gabarit ; `.drwil/ia-first.json` (`diffCoverage`, contrôle `couverture-diff`).
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/check-diff-coverage.mjs` (livré, copie du dépôt `.githooks/check-diff-coverage.mjs`), `.drwil/ia-first.json` (`diffCoverage`).
**Preuve** : tests du dépôt : lcov (lignes `DA`, branches `BRDA`, chemins absolus ramenés à la racine), diff (lignes ajoutées, fichier supprimé ignoré), verdict (ligne, branche, fichier absent du rapport), contrôle de bout en bout dans un dépôt git temporaire (couvert, ligne non couverte, branche non couverte, ligne non modifiée ignorée, base lue en option, en configuration ou par défaut).
**Contrôle** : `tests-qua-191`
**Tests** : `.githooks/check-diff-coverage.test.mjs`
**Origine** : couverture-du-code-modifie — « Les lignes ajoutées ou modifiées d'une branche, et les branches qu'elles ouvrent, sont couvertes à 100 % d'après le rapport lcov du projet »
**Raison** : Un projet qui adopte drwil a souvent une couverture basse : un seuil global élevé le bloquerait, un seuil bas laisse entrer du code neuf non testé (QUA-004, seuil de couverture de test). Exiger 100 % sur ce qui change fait monter la couverture d'elle-même.

## QUA-192 — Une exclusion du contrôle de couverture du diff n'est admise que déclarée avec sa justification
**Règle** : Livré à tout projet qui déclare `diffCoverage`. Une exclusion (code généré, configuration, ligne non testable) est une entrée de `diffCoverage.exclusions` dans `.drwil/ia-first.json` : `path` (motif de chemin), `lines` (ligne ou intervalle `a-b`, absent pour le fichier entier) et `reason`. Une exclusion sans `reason`, ou à `reason` vide, est refusée : elle n'écarte rien et le contrôle échoue en la nommant.
**Périmètre** : `.githooks/check-diff-coverage.mjs` et son gabarit ; `.drwil/ia-first.json` (`diffCoverage`, contrôle `couverture-diff`).
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/check-diff-coverage.mjs` (livré, copie du dépôt `.githooks/check-diff-coverage.mjs`), `.drwil/ia-first.json` (`diffCoverage`).
**Preuve** : tests du dépôt : exclusion sans raison ou à raison vide refusée, exclusion justifiée écartant un fichier, un intervalle ou une ligne, bout en bout : le trou écarté laisse passer, la même exclusion sans raison échoue et laisse le trou signalé.
**Contrôle** : `tests-qua-192`
**Tests** : `.githooks/check-diff-coverage.test.mjs`
**Origine** : couverture-du-code-modifie — « Une exclusion du contrôle de couverture du diff n'est admise que déclarée avec sa justification »
**Raison** : Une exclusion muette est un trou dans la mesure que personne ne revoit.

## QUA-193 — Sans rapport lcov, le contrôle de couverture du diff est non exécuté, jamais passé
**Règle** : Livré à tout projet qui déclare `diffCoverage`. Si `diffCoverage.lcov` n'est pas déclaré, si le rapport est absent ou vide, si la commande `diffCoverage.produce` échoue ou si la base du diff est introuvable, le contrôle sort en échec avec « Couverture du diff non exécutée : <cause> » : il ne passe jamais faute d'avoir mesuré (QUA-013, un contrôle qui n'a pas tourné n'a pas passé). Le contrôle n'invente pas de rapport pour une pile sans outil de couverture.
**Périmètre** : `.githooks/check-diff-coverage.mjs` et son gabarit ; `.drwil/ia-first.json` (`diffCoverage`, contrôle `couverture-diff`).
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/check-diff-coverage.mjs` (livré, copie du dépôt `.githooks/check-diff-coverage.mjs`), `.drwil/ia-first.json` (`diffCoverage`).
**Preuve** : tests du dépôt : rapport absent, vide, non déclaré, configuration illisible, commande de production réussie puis échouée, base introuvable : chaque cas sort en échec avec la cause.
**Contrôle** : `tests-qua-193`
**Tests** : `.githooks/check-diff-coverage.test.mjs`
**Origine** : couverture-du-code-modifie — « Sans rapport lcov, le contrôle de couverture du diff est non exécuté, jamais passé »
**Raison** : Un contrôle silencieux quand il ne mesure rien ferait croire à une couverture que personne n'a vue.

## QUA-194 — Ce dépôt applique le contrôle à ses propres branches, en plus du cliquet de seuils
**Règle** : Le contrôle `couverture-diff` de `.drwil/ia-first.json` (job CI `checks`) fait tourner `.githooks/check-diff-coverage.mjs` sur les branches de ce dépôt, avec `diffCoverage` déclaré (rapport lcov des hooks `.githooks/*.mjs`, produit par c8, base `origin/master`, fichiers de test exclus avec leur raison) ; il s'ajoute au cliquet de seuils de QUA-004 sans le remplacer, et la copie du dépôt reste identique au gabarit livré. Limite connue : seuls les hooks sont mesurés par le contrôle ; le paquet `packages/drwil` n'y entre pas (`docs/intentions/couverture-paquet-100.md`).
**Périmètre** : `.drwil/ia-first.json`, `.githooks/check-diff-coverage.mjs`, gabarit livré.
**Source de vérité** : `.drwil/ia-first.json` (`checks`, `diffCoverage`).
**Preuve** : test du paquet : le contrôle `couverture-diff` est déclaré dans le job CI `checks` avec sa commande, son rapport et ses exclusions justifiées, et la copie du dépôt est identique au gabarit.
**Contrôle** : `tests-qua-194`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : couverture-du-code-modifie — « Ce dépôt applique le contrôle à ses propres branches, en plus du cliquet de seuils »
**Raison** : Le dépôt qui livre le contrôle l'éprouve sur ses propres branches avant d'y obliger les autres.

## QUA-195 — Le catalogue définit l'e2e une seule fois, par forme de projet
**Règle** : Livré à tout projet. `docs/contracts-catalog.md` contient une section « What "end to end" means » (gabarit, en anglais) qui donne une définition unique de `catalogue:QUA-020` : un parcours complet depuis une interface publique jusqu'au résultat attendu, sans doublure sur ce que le test doit garantir, avec une ligne par forme de projet (bibliothèque : installer le paquet comme un client, appeler l'API publique, vérifier résultats et erreurs ; service : un parcours à travers son API ; application web : un parcours utilisateur). Le niveau d'exigence est le même pour toutes les formes : ni exception ni dérogation. La copie de ce dépôt, en français, porte la même définition.
**Périmètre** : `docs/contracts-catalog.md`, gabarit livré et copie du dépôt.
**Source de vérité** : `packages/drwil/templates/common/base/docs/contracts-catalog.md` (définition), sa copie française `docs/contracts-catalog.md`.
**Preuve** : test du paquet : la section existe dans le gabarit et dans la copie du dépôt, avec la ligne de chaque forme (bibliothèque, service, application web) et la mention d'absence d'exception.
**Contrôle** : `tests-qua-195`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : e2e-et-attestation-precises — « Le catalogue définit l'e2e par forme de projet : bibliothèque (installer le paquet comme un client, appeler l'API publique, vérifier résultats et erreurs), service (un parcours à travers son API), application web (un parcours utilisateur) »
**Raison** : « De bout en bout » ne voulait rien dire pour une bibliothèque ou un outil sans interface ; chacun l'interprétait à sa façon.

## QUA-196 — La recette d'adoption renvoie à la définition de l'e2e sans la recopier
**Règle** : Livré à tout projet. `docs/recipes/adopt-the-kit.md` renvoie à la section du catalogue qui définit l'e2e (une information, une seule source) et ne recopie aucune ligne de la définition (ni les formes de projet, ni le tableau). Gabarit et copie du dépôt identiques.
**Périmètre** : `docs/recipes/adopt-the-kit.md`, gabarit livré et copie du dépôt.
**Source de vérité** : `packages/drwil/templates/common/base/docs/contracts-catalog.md` (la définition) ; la recette ne fait que la citer.
**Preuve** : test du paquet : la recette cite la section du catalogue, aucune des lignes du tableau de formes n'y figure, et la copie du dépôt est identique au gabarit.
**Contrôle** : `tests-qua-196`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : e2e-et-attestation-precises — « La recette d'adoption renvoie à cette définition sans la recopier (une information, une seule source) »
**Raison** : Deux définitions de l'e2e finiraient par diverger.

## QUA-197 — La doc des preuves distingue l'identité, l'approbation et la preuve d'exécution de l'attestation
**Règle** : Livré à tout projet. `docs/ia-first/5-proving-the-work.md` a une section qui distingue l'identité, l'approbation et la preuve d'exécution, et dit ce que `drwil attest` garantit (preuve d'exécution des contrôles cités, acte interactif lié au texte du contrat) et ce qu'il ne garantit pas (l'identité : l'auteur vient de la configuration git, déclarative). Elle redit qu'aucune exigence n'est assouplie. Gabarit et copie du dépôt identiques.
**Périmètre** : `docs/ia-first/5-proving-the-work.md`, gabarit livré et copie du dépôt.
**Source de vérité** : `packages/drwil/templates/common/base/docs/ia-first/5-proving-the-work.md`.
**Preuve** : test du paquet : la section nomme les trois niveaux, dit que l'identité n'est pas garantie et que l'auteur vient de la configuration git, et la copie du dépôt est identique au gabarit.
**Contrôle** : `tests-qua-197`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : e2e-et-attestation-precises — « La doc des preuves distingue l'identité, l'approbation et la preuve d'exécution, et dit ce que garantit `drwil attest` et ce qu'il ne garantit pas »
**Raison** : Une attestation lue comme une preuve d'identité donnerait une fausse assurance.

## QUA-198 — Le tableau de bord montre la tendance de la durée de la CI et du cache lu par requête, avec un seuil d'alerte non bloquant
**Règle** : Propre au dépôt drwil (QUA-018) pour l'usage ; le gabarit du module tableau de bord et la copie du dépôt sont identiques. Le tableau de bord (`.githooks/dashboard.mjs`) a une section « Tendances » qui lit deux relevés, sans rien écrire de plus que sa sortie : la ligne `- **Durée de CI (job checks)** : <durée> — … — hooks inchangés` des entrées du journal (une durée « 3m02 » ou « 200 s » ; les lignes « hooks modifiés » et « non mesurée » sont ignorées) et le cache lu par requête de chaque ligne de `.drwil/usage.jsonl` (`cache_read` divisé par `requests`, lignes sans requête ou sans cache ignorées). Chaque tendance montre les cinq derniers relevés, leur moyenne et le seuil d'alerte (3m55, soit 235 s, pour la durée ; 212 500 pour le cache lu, soit 25 % au-dessus de la référence d'environ 170 k) ; une moyenne au-dessus du seuil est affichée en alerte. L'alerte est un indicateur : elle ne bloque ni `verify` ni la clôture, et le seuil se réévalue au fil des relevés. Sans relevé, la section le dit.
**Périmètre** : `.githooks/dashboard.mjs`, `.githooks/dashboard-read.mjs`, leur gabarit `packages/drwil/templates/common/optional/dashboard/`.
**Source de vérité** : `.githooks/dashboard-read.mjs` (lecture des relevés, seuils, tendance) ; `docs/mesures-ci-reference.md` (procédure du relevé de durée).
**Preuve** : test `.githooks/dashboard.test.mjs` : durées et cache lus, lignes ignorées, cinq derniers relevés, moyenne, alerte au-dessus du seuil, absence d'alerte dessous, section sans relevé, en français et en anglais.
**Contrôle** : `tests-qua-198`
**Tests** : `.githooks/dashboard.test.mjs`
**Origine** : releves-de-ci-et-de-contexte — « La durée du job `checks` sur une PR à hooks inchangés et le cache lu moyen par requête sont relevés au journal » ; « Le tableau de bord montre la tendance de la durée de la CI et du cache lu par requête, avec un seuil d'alerte non bloquant »
**Raison** : Sans tendance visible, une CI qui ralentit ou un contexte relu qui grossit ne se remarque qu'à la gêne ; un contrat attesté sur une durée dépend de la charge de la forge, d'où un indicateur.

## QUA-199 — Le réglage `release.mode` vaut `solo` ou `team`, `solo` par défaut, et une mise à jour le conserve
**Règle** : Livré à tout projet avec le module de release (optionnel). `.drwil/ia-first.json` déclare `release.mode` : `solo` (défaut) ou `team`. Une installation neuve écrit `solo` ; une réinstallation ou une montée de version garde la valeur déjà déclarée (même inconnue, jamais corrigée en silence) et les autres clés de `release`. `node .githooks/create-release.mjs` refuse toute autre valeur (aperçu et candidate compris), sans rien publier, et dit les valeurs attendues ; sans fichier ni clé, c'est `solo`.
**Périmètre** : `packages/drwil/src/config-write.ts`, `packages/drwil/src/migration-table.ts`, `.githooks/create-release.mjs` ; module optionnel livré dans le gabarit.
**Source de vérité** : `packages/drwil/src/migration-table.ts` (`RELEASE_MODES`) ; le module lit la même liste dans `.githooks/create-release-texts.mjs`.
**Preuve** : tests du paquet (installation neuve, réinstallation avec `team`, avec une valeur inconnue, projet antérieur au réglage) et des hooks (valeur inconnue refusée sans tag, clé absente = `solo`).
**Contrôle** : `tests-qua-199`
**Tests** : `packages/drwil/test/config-write.test.mjs`, `.githooks/create-release.test.mjs`
**Origine** : release-allegee — « Le réglage `release.mode` vaut `solo` ou `team`, `solo` par défaut ; une autre valeur est refusée et la migration d'un projet existant le conserve »
**Raison** : Sans réglage, les équipes d'acceptation et les projets solo subiraient le même parcours ; une valeur corrigée en silence cacherait une faute de frappe.

## QUA-200 — En `solo`, la release sans `--candidate` publie directement, sans candidate ni verdict
**Règle** : Livré à tout projet avec le module de release (optionnel). Avec `release.mode` à `solo`, `node .githooks/create-release.mjs` sans `--candidate` pose le tag définitif et crée la release GitHub, sans candidate ni verdict de recette (QUA-079) ; `--candidate` reste disponible sur demande.
**Périmètre** : `.githooks/create-release.mjs` ; module optionnel livré dans le gabarit.
**Source de vérité** : `.githooks/create-release.mjs`.
**Preuve** : test des hooks sur un vrai dépôt git temporaire (origin nu local, gh et npm simulés) : tag définitif poussé, aucune pré-release demandée à `gh`.
**Contrôle** : `tests-qua-200`
**Tests** : `.githooks/create-release.test.mjs`
**Origine** : release-allegee — « En `solo`, `.githooks/create-release.mjs` sans `--candidate` publie directement un patch, sans candidate ni verdict »
**Raison** : Pour un projet solo, la candidate et le verdict ne servent personne : un patch coûtait 3 h.

## QUA-201 — En `team`, la création directe d'une release est refusée et renvoie à `--candidate`
**Règle** : Livré à tout projet avec le module de release (optionnel). Avec `release.mode` à `team`, `node .githooks/create-release.mjs` sans `--candidate` (aperçu compris) est refusé, sans tag ni release, et dit d'utiliser `--candidate` puis la promotion après le verdict ; `--candidate` fonctionne comme avant.
**Périmètre** : `.githooks/create-release.mjs` ; module optionnel livré dans le gabarit.
**Source de vérité** : `.githooks/create-release.mjs`.
**Preuve** : test des hooks sur un vrai dépôt git temporaire : refus avec et sans `--dry-run`, aucun tag poussé, `--candidate --dry-run` accepté.
**Contrôle** : `tests-qua-201`
**Tests** : `.githooks/create-release.test.mjs`
**Origine** : release-allegee — « En `team`, la création directe d'une release est refusée et dit d'utiliser `--candidate` »
**Raison** : Une équipe qui a choisi le verdict humain ne doit pas pouvoir le contourner par un geste direct.

## QUA-202 — `--protect` autorise aussi l'auto-merge du dépôt GitHub, et `doctor` dit s'il l'est
**Règle** : Livré à tout projet sur GitHub. `drwil guarantees --protect`, avec l'accord de l'humain et jamais à blanc (`--dry-run`) ni sans `--protect`, active le réglage « Allow auto-merge » du dépôt (`gh api -X PATCH repos/{owner}/{repo} -F allow_auto_merge=true`) lorsqu'il le lit refusé, que la protection de la branche soit posée dans le même geste ou déjà tenue ; il relit le réglage ensuite et ne dit « autorisé » que s'il l'est, un refus de la forge (droit administrateur absent) est dit, jamais annoncé posé. `drwil doctor` lit `allow_auto_merge` : autorisé, il l'écrit au niveau 4 ; refusé, le niveau 4 n'est pas atteint et la commande suivante est `--protect` ; illisible, le niveau 4 est « non vérifié » (QUA-013). Hors GitHub (GitLab n'a pas de réglage équivalent) rien n'est lu ni posé ; le réglage n'est pas un manque des garanties (pas de fiche bloquante).
**Périmètre** : `drwil guarantees --protect`, `drwil doctor` (niveau de protection 4).
**Source de vérité** : `packages/drwil/src/guarantees-forge.ts` (`readAutoMerge`), `packages/drwil/src/guarantees.ts` (`enableAutoMerge`).
**Preuve** : tests du paquet, forge simulée : réglage lu autorisé, refusé, illisible, hors GitHub ; posé avec `--protect` puis relu, refusé par la forge, jamais sans `--protect` ni à blanc ; niveau 4 atteint, non atteint ou non vérifié dans `doctor`.
**Contrôle** : `tests-qua-202`
**Tests** : `packages/drwil/test/guarantees.test.mjs`, `packages/drwil/test/protection.test.mjs`
**Origine** : installation-depot-neuf — « `drwil guarantees --protect`, avec l'accord de l'humain, active aussi l'auto-merge du dépôt GitHub avec la protection de la branche principale, et `drwil doctor` dit si l'auto-merge est autorisé »
**Raison** : Sur un dépôt neuf, la protection était posée mais pas l'auto-merge : `.githooks/merge-auto.mjs` refusait, et qui choisissait « Automatic merge » au lancement échouait à la clôture.

## QUA-203 — `init` demande les outils IA à l'humain et ne les choisit jamais à sa place
**Règle** : Livré à tout projet. À la première installation (aucun outil enregistré dans `.drwil/ia-first.json`) sans `--tools`, `drwil init` demande à l'humain les outils IA à configurer en terminal interactif ; sans terminal il s'arrête, sans rien écrire, avec un message qui nomme l'option `--tools`. Une mise à jour lit les outils déjà enregistrés et ne demande rien ; `--tools` explicite est toujours respecté ; `--dry-run` n'écrit rien et ne demande rien.
**Périmètre** : `drwil init`.
**Source de vérité** : `packages/drwil/src/cli-install.ts` (`chooseTools`).
**Preuve** : tests du paquet : première installation sans terminal refusée avec le nom de l'option ; question posée en terminal, « all » et liste acceptés, réponse vide refusée ; mise à jour et `--tools` explicite sans question.
**Contrôle** : `tests-qua-203`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : installation-depot-neuf — « `init` demande à l'humain quels outils IA configurer en terminal interactif ; sans terminal, il refuse de choisir à sa place et demande `--tools` »
**Raison** : `init` configurait cinq outils sans le demander ; à l'installation de `drwil_walk` l'agent en a choisi un seul de lui-même, un choix qui revient à l'utilisateur.

## QUA-204 — Le gabarit Claude Code autorise sans demande les lectures courantes et garde la demande sur push, merge et rebase
**Règle** : Livré à tout projet qui configure Claude Code. Le `.claude/settings.json` du gabarit autorise sans demande les commandes locales courantes, les lectures `gh pr view` et `gh pr checks` et les outils `.githooks` en lecture (`.githooks/state.mjs`, `.githooks/glossary.mjs`…) ; `git push`, `git merge` et `git rebase` restent en `ask`, jamais en `allow` ; les refus (`--no-verify`, `git -c`, le fichier d'état) sont intacts : une règle `allow` n'ouvre aucun geste que le hook ou la forge refusent (QUA-019).
**Périmètre** : `.claude/settings.json` livré par le gabarit.
**Source de vérité** : `packages/drwil/templates/common/tools/claude/.claude/settings.json`.
**Preuve** : test du paquet qui lit le gabarit : les règles `allow` attendues y sont, `push`, `merge` et `rebase` sont dans `ask` et absents de `allow`, le refus de `--no-verify` demeure.
**Contrôle** : `tests-qua-204`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : adoption-fluide-projet-neuf — « Le gabarit livre un `.claude/settings.json` Claude Code qui autorise sans demande les commandes git, gh et `.githooks` courantes et garde une demande sur `git push`, `merge` et `rebase` »
**Raison** : À l'installation de `drwil_walk`, chaque commande git, gh ou `.githooks` courante déclenchait une demande d'autorisation, sans rien protéger de plus.

## QUA-205 — Le sondage de lancement porte toujours la question drwil-worktree
**Règle** : Le hook du sondage de lancement (Claude Code et Copilot CLI) refuse un sondage `drwil-start` sans la question `drwil-worktree` : la question du worktree est toujours posée, jamais laissée à l'agent. `state.mjs start` au terminal pose la même question, et sa réponse `WORKTREE` lance le chantier dans un worktree frère (QUA-142) ; le skill de lancement dit que la question est obligatoire.
**Périmètre** : Sondage de lancement (`/drwil-start`), `node .githooks/state.mjs start`.
**Source de vérité** : `.claude/hooks/prompt-hook.mjs` (`startPoll`), `.githooks/state-cli.mjs`.
**Preuve** : tests : sondage sans `drwil-worktree` refusé sous les deux formes (statut 2, message qui nomme la question) ; au terminal, la réponse `WORKTREE` lance le chantier dans un worktree frère et laisse le principal en SCOPING.
**Contrôle** : `tests-qua-205`
**Tests** : `packages/drwil/test/claude-hooks.test.mjs`, `.githooks/state.test.mjs`
**Origine** : adoption-fluide-projet-neuf — « La question `drwil-worktree` devient obligatoire dans le sondage de lancement »
**Raison** : Le lancement ne proposait pas toujours le worktree : l'agent devait penser à ajouter la question au sondage.

## QUA-206 — `init` commite le kit sur le dépôt neuf qu'il crée, avant d'activer les hooks
**Règle** : Sur un dossier sans dépôt git, `drwil init` crée le dépôt sur la branche d'installation (jamais la branche principale, QUA-017) et y commite le kit avant de régler `core.hooksPath`, pour que le premier chantier se lance sans commit refusé par la barrière de périmètre bloquante (QUA-154). `init` commite lui-même dans deux cas : l'installation sur un dépôt neuf (branche d'installation) et la mise à jour d'un projet équipé (branche dédiée, tous les fichiers du manifeste, arbre propre, identité git présente, branche principale à jour, QUA-237) ; une première installation sur un dépôt existant n'est jamais commitée. Sans identité git, `init` le dit et ne casse pas : le commit reste à faire à la main.
**Périmètre** : `drwil init` sur un dossier sans dépôt git ; la mise à jour d'un projet équipé relève de QUA-237.
**Source de vérité** : `packages/drwil/src/install.ts` (`commitKit`), appelé par `packages/drwil/src/index.ts`.
**Preuve** : test du paquet sur un dossier vide : un seul commit sur `workstream/kit-installation`, arbre propre, kit suivi, relance sans nouveau commit ; sans identité git, l'avertissement est émis.
**Contrôle** : `tests-qua-206`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : adoption-fluide-projet-neuf — « Sur un projet neuf, `drwil init` commite lui-même le kit sur sa branche d'installation, et le premier chantier peut se lancer sans commit refusé »
**Raison** : Depuis que l'installation neuve écrit `scopeGate` en `blocking`, le premier commit du kit en SCOPING était refusé sans que la recette le dise.
**Modifié** : 2026-11-04 — décision humaine (mise-a-jour-du-kit-sans-blocage) : l'ancien critère « un dépôt déjà existant n'est jamais commité par `init` » devient « `init` commite aussi la mise à jour d'un projet équipé, sur sa branche dédiée ».

## QUA-207 — La recette d'adoption et `INSTALL.md` disent le commit initial de `init` et pourquoi une autorisation n'est pas demandée
**Règle** : La recette d'adoption (gabarit) dit ce que `init` fait du premier commit (branche d'installation, avant les hooks, pourquoi, et quand il ne le fait pas) ; `INSTALL.md` le dit aussi et explique pourquoi Claude Code ne demande pas d'autorisation pour les commandes courantes (une règle `allow` n'ouvre aucun geste que les hooks ou la forge refusent).
**Périmètre** : Recette `adopt-the-kit`, `INSTALL.md`.
**Source de vérité** : `packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md`, `INSTALL.md`.
**Preuve** : test du paquet qui lit la recette du gabarit et `INSTALL.md` et y cherche les passages attendus ; la lisibilité du texte reste jugée par l'humain.
**Contrôle** : `tests-qua-207`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : adoption-fluide-projet-neuf — « La recette d'adoption et `INSTALL.md` disent ce que fait `init` du premier commit et pourquoi une autorisation n'est pas demandée »
**Raison** : L'adoptant ne devait pas deviner le commit initial de `init` ni la raison des autorisations livrées.

## QUA-208 — Un contrôle réservé par `runAt` n'est pas joué au commit ni au push, et le dit
**Règle** : Livré à tout projet. Un contrôle du projet qui déclare `runAt` (liste parmi `commit`, `push`, `verify`, `ci`) sans `commit` n'est pas joué au pre-commit, sans `push` il n'est pas joué au pre-push : le moteur le rend « non exécuté » avec la raison (« réservé par runAt… »), jamais « passé » (QUA-013). Le report est un avertissement qui ne bloque ni le commit ni le push (la reprise de verdict du pre-push, QUA-152, couvre le reste) ; le déclarer avec `commit` ou `push` le fait tourner là. `runAt` est jugé avant `paths`. `["ci"]` seul est permis en plus de `verify` et `ci` ensemble : le contrôle est alors confié à la CI de la PR (GitHub) ou de la MR (GitLab) — joué par la CI (variable `CI`, même avec des références de push), il ne tourne ni au commit, ni au push, ni dans `drwil verify`, son verdict n'y est jamais repris, et chaque sortie l'annonce « confié à la CI », jamais « passé » (le détail du contrôle, et le résumé de `run-checks`, seule ligne d'une passe verte d'un hook). Sans CI déclarée (`ciFiles` vide) ni CI GitHub (dossier .github/workflows/) ou GitLab (fichier .gitlab-ci.yml) dans `ciFiles`, `["ci"]` est refusé avec la raison, partout.
**Périmètre** : `.githooks/engine.mjs`, `.githooks/engine-runat.mjs`, `.githooks/run-checks.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/engine-runat.mjs` (`runAtVerdict`, `runContext`).
**Preuve** : tests du moteur sur dépôt temporaire (au commit avec un fichier sous ses `paths`, aux trois formes du push, avec `commit` ou `push` déclaré, en anglais ; `["ci"]` non exécuté et annoncé au commit, au push et en verify, joué en CI avec ou sans références de push, GitLab accepté, refusé sans `ciFiles`, `ciFiles` vide ou autre forge, en anglais) et de `run-checks` de bout en bout (avertissement sans blocage au commit et au push ; `["ci"]` annoncé « confié à la CI » par le résumé au commit, au push et hors hook, bloquant en CI, refusé sans CI déclarée) ; dans ce dépôt, la configuration (`.drwil/ia-first.json`) : couverture, tarball et couverture du diff confiés à la CI, acceptés par le moteur et joués par la CI du dépôt, les tests des contrats en local.
**Contrôle** : `tests-qua-208`
**Tests** : `.githooks/engine.test.mjs`, `.githooks/run-checks.test.mjs`
**Origine** : controles-lents-verify-ci — « Un contrôle déclaré réservé (par exemple `runAt: ["verify", "ci"]`) n'est pas joué au commit et le dit : « non exécuté », jamais « passé » »
**Raison** : Un contrôle lent (les e2e) rejouait à chaque commit de code puis au push : une heure de contrôles par chantier (mesure du lot 1, 341 s par passage).
**Modifié** : 2026-11-07 — `["ci"]` seul permis, annoncé « confié à la CI » par chaque sortie, refusé sans CI déclarée ; ancien critère : « `verify` et `ci` y figurent toujours », décidé par le demandeur (chantier « contrôle lent une seule fois en CI », lot 1).

## QUA-209 — `drwil verify` et la CI jouent un contrôle réservé, son échec bloque ; un `runAt` mal formé est refusé
**Règle** : Livré à tout projet. Hors commit et hors push (`drwil verify`, CI, y compris une CI qui reçoit des références de push, passe manuelle de `run-checks`), un contrôle réservé par `runAt` est joué comme tout autre : son échec, ou son absence, bloque la clôture et la fusion (QUA-013). `runAt` doit être une liste non vide de valeurs connues (`commit`, `push`, `verify`, `ci`) contenant `verify` et `ci`, ou `ci` seul (contrôle confié à la CI, QUA-208, joué en CI seulement) : une chaîne, une liste vide, une valeur inconnue ou l'absence de `verify` ou de `ci` hors de `["ci"]` est un échec du contrôle avec un message qui nomme le contrôle et la raison, au commit comme ailleurs, jamais un réglage ignoré.
**Périmètre** : `.githooks/engine-runat.mjs` (`runAtVerdict`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/engine-runat.mjs` (`runAtVerdict`, `RUN_AT`).
**Preuve** : tests du moteur : contrôle réservé joué hors hook et en CI (avec ou sans références de push), son échec en `fail`, six formes mal formées refusées au commit et hors commit avec leur message, en anglais ; `run-checks` de bout en bout : échec bloquant hors hook et en CI.
**Contrôle** : `tests-qua-209`
**Tests** : `.githooks/engine.test.mjs`
**Origine** : controles-lents-verify-ci — « `drwil verify` et la CI jouent ce contrôle, et son absence ou son échec bloque la clôture et la fusion, comme pour tout contrôle (QUA-013, un contrôle non exécuté n'est pas passé) ; un réglage inconnu ou mal formé est refusé avec un message clair, jamais ignoré »
**Raison** : Ignorer un `runAt` mal écrit ferait tourner le contrôle là où l'on croit qu'il ne tourne pas, ou l'inverse ; un contrôle jamais joué à la clôture affaiblirait la preuve.
**Modifié** : 2026-11-07 — `ci` seul admis à côté de `verify` et `ci` ensemble, conséquence de QUA-208 modifié (chantier « contrôle lent une seule fois en CI », lot 1).

## QUA-210 — Un contrôle sans `runAt` se comporte exactement comme avant
**Règle** : Livré à tout projet. Un contrôle du projet qui ne déclare pas `runAt` est joué au commit (ou reporté hors de ses `paths`), au push, en `drwil verify` et en CI exactement comme avant le réglage, avec le même message de report, et sa déclaration (donc son empreinte, QUA-141) n'est pas modifiée : une mise à jour du kit ne change rien aux projets déjà installés.
**Périmètre** : `.githooks/engine.mjs`, `.githooks/engine-runat.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/engine-runat.mjs` (`runAtVerdict` : `null` sans le champ).
**Preuve** : test du moteur : un contrôle avec `paths` et sans `runAt` joué ou reporté dans les cinq contextes (commit sous et hors ses `paths`, push, verify, CI), message de report inchangé, déclaration inchangée.
**Contrôle** : `tests-qua-210`
**Tests** : `.githooks/engine.test.mjs`
**Origine** : controles-lents-verify-ci — « Un contrôle sans ce réglage se comporte exactement comme avant »
**Raison** : Les projets installés ne déclarent pas le réglage : la mise à jour ne devait rien changer pour eux.

## QUA-211 — La page des contrôles décrit `runAt` ; l'empreinte propre et l'attestation restent justes pour un contrôle réservé
**Règle** : Livré à tout projet. La page `docs/ia-first/4-checks-in-git.md` (gabarit et copie du dépôt) décrit `runAt` : les quatre valeurs, le défaut, le report « non exécuté » sans blocage au commit et au push, le jeu complet en `verify` et en CI, `verify` et `ci` obligatoires, le refus d'un réglage mal formé. `runAt` entre dans l'empreinte propre du contrôle (QUA-141) : le changer rejoue le contrôle, un même réglage garde la même empreinte. Étant un champ d'exécution, il ne fait pas tomber l'attestation d'un contrat qui cite le contrôle (QUA-183) ; un changement de commande, de test visé ou de `paths` la fait toujours tomber (QUA-184).
**Périmètre** : `docs/ia-first/4-checks-in-git.md`, son gabarit, `.githooks/engine.mjs` (empreinte) et `drwil attest` (attestation).
**Source de vérité** : `packages/drwil/templates/common/base/docs/ia-first/4-checks-in-git.md` ; `packages/drwil/src/fingerprint.ts` (`proofFingerprints`) pour l'attestation.
**Preuve** : test du moteur : trois réglages (aucun, `["verify", "ci"]`, `["push", "verify", "ci"]`) donnent trois empreintes, le même réglage la même ; test du paquet sur un dépôt temporaire : attestation intacte après ajout de `runAt`, tombée quand les `paths` changent, page du gabarit et copie du dépôt qui portent les passages attendus ; la lisibilité du texte reste jugée par l'humain.
**Contrôle** : `tests-qua-211`
**Tests** : `.githooks/engine.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : controles-lents-verify-ci — « La doc de `paths` décrit le réglage, et l'attestation (QUA-183, QUA-184) et la reprise par contrôle (QUA-141) restent justes pour un contrôle réservé »
**Raison** : Un réglage que la doc ne décrit pas ne s'adopte pas ; un verdict repris ou une attestation gardée sous un autre réglage serait une preuve périmée.

## QUA-212 — Les tests du dépôt ne dépendent pas des variables `DRWIL_PUSH_*` du pre-push
**Règle** : Le hook pre-push exporte `DRWIL_PUSH_REFS`, `DRWIL_PUSH_REMOTE`, `DRWIL_PUSH_TAGS_ONLY` et `DRWIL_PUSH_NO_BRANCH` aux contrôles qu'il lance. Aucun test du dépôt n'en dépend : un test qui joue le moteur ou `verify` dans son processus part d'un environnement sans elles, et celui qui les lit les pose lui-même par l'`env` de son lancement, jamais par l'héritage. Le jeu de tests lancé avec elles posées passe comme sans.
**Périmètre** : `.githooks/engine.test.mjs` et `packages/drwil/test/kit.test.mjs`.
**Source de vérité** : `.githooks/engine.test.mjs` (garde `beforeEach`), `packages/drwil/test/kit.test.mjs` (retrait de `process.env`).
**Preuve** : test du moteur qui relance les tests du moteur et ceux du paquet, `DRWIL_PUSH_*` posées comme au push, et exige qu'ils passent.
**Contrôle** : `tests-qua-212`
**Tests** : `.githooks/engine.test.mjs`
**Origine** : tests-isoles-du-pre-push — « Aucun test du dépôt ne dépend des variables `DRWIL_PUSH_*` du processus qui le lance : le jeu complet passe aussi lancé avec elles posées »
**Raison** : Un test qui hérite de ces variables se croit au push et échoue au pre-push alors qu'il passe au commit : le contrôle bloque le chemin légitime de clôture sans rien protéger (précédent : QUA-057 pour les `GIT_*`).

## QUA-213 — Un commit qui change le bloc scope de la fiche active avertit, avec les chemins
**Règle** : Livré à tout projet. En BUILD, l'agent peut élargir le bloc `scope` de la fiche active, dans un commit de cadrage séparé que la barrière de périmètre lit dans HEAD. Tout commit qui change ce bloc (chemins ajoutés ou retirés ; ordre et texte de la fiche sans effet) affiche un avertissement net, qui nomme la fiche, les chemins ajoutés et retirés et rappelle de les citer au compte rendu (QUA-214). L'avertissement s'affiche quel que soit le réglage `scopeGate`, `off` compris (QUA-019, pas de contournement d'un contrôle), et n'échoue jamais à lui seul. Une fiche absente de HEAD (en cours de création) n'élargit rien ; une fusion n'est jugée que sur sa résolution (QUA-111).
**Périmètre** : `.githooks/scope-gate.mjs` (`checkScope`), `.githooks/scope-gate-merge.mjs` (`scopeChange`), `.githooks/scope-gate-texts.mjs` (`widened`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/scope-gate-merge.mjs` (`scopeChange`).
**Preuve** : tests des hooks sur de vrais dépôts git temporaires : avertissement avec les chemins ajoutés et retirés sous chaque réglage (`off` compris), en anglais aussi ; aucun avertissement pour un changement du texte de la fiche seul ou une fiche absente de l'index.
**Contrôle** : `tests-qua-213`
**Tests** : `.githooks/scope-gate.test.mjs`
**Origine** : perimetre-visible — « Tout commit qui modifie le bloc scope de la fiche active affiche un avertissement net, avec les chemins ajoutés »
**Raison** : Décision du demandeur du 2026-10-30 : garder l'élargissement du cadrage en BUILD (vu au lot 1 de release-allegee, où des copies du module de release étaient hors `scopeMirrors`), mais le rendre bien visible plutôt que silencieux.

## QUA-214 — Le compte rendu de fin de tâche cite les chemins ajoutés au bloc scope, et la raison
**Règle** : Livré à tout projet. Quand un chantier a élargi le bloc `scope` de sa fiche (QUA-213), le compte rendu de fin de tâche liste les chemins ajoutés et dit pourquoi ; sans élargissement, il le dit en une ligne ou se tait. Consigne de conduite, reprise par l'avertissement de QUA-213 qui la rappelle à chaque commit concerné : aucune machine ne lit le compte rendu.
**Périmètre** : `AGENTS.md` et `docs/ia-first/8-conduct-rules.md` (consigne « Compte rendu de fin de tâche »), livrés dans le gabarit.
**Source de vérité** : `docs/ia-first/8-conduct-rules.md`.
**Preuve** : test du dépôt : la consigne « Compte rendu de fin de tâche » de `AGENTS.md` (dépôt et gabarit) et de `docs/ia-first/8-conduct-rules.md` (dépôt et gabarit) cite les chemins ajoutés au bloc `scope` et la raison, et le message de QUA-213 renvoie à QUA-214 ; justesse d'un compte rendu réel : humaine (aucune machine ne le lit).
**Contrôle** : `tests-qua-214`
**Tests** : `.githooks/scope-gate.test.mjs`
**Origine** : perimetre-visible — « Le compte rendu de fin de tâche mentionne les chemins ajoutés au bloc scope et la raison »
**Raison** : Décision du demandeur du 2026-10-30 : un élargissement visible au commit doit aussi l'être au moment où l'humain relit le chantier ; ligne de preuve de clôture écartée (aucune source machine fiable de la raison).

## QUA-215 — Un hook d'assistant lancé sans `node` dans le PATH dit que `node` est introuvable et quoi faire
**Règle** : Livré à tout projet. Chaque commande de hook des réglages livrés de Claude Code (`.claude/settings.json`) et de Copilot (`packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json`, champ `bash`) teste `command -v node` avant de l'appeler ; absent, elle écrit sur stderr « node not found in the PATH of this assistant. Restart it from a shell where which node answers. » et rien sur stdout, au lieu du code 127 muet d'un shell qui ne trouve pas `node` (gestionnaire de versions comme fnm, propre au shell qui l'a initialisé). Aucun chemin absolu de `node` n'est écrit à l'installation et aucun repli automatique n'est tenté : le message suffit. Le repli est une commande `sh` : Claude Code exécute ses hooks par Git Bash sous Windows (les réglages en dépendent déjà par `${CLAUDE_PROJECT_DIR}`), Copilot lit un champ `powershell` distinct (`Get-Command node`) pour Windows. Les réglages de Gemini (`.gemini/settings.json`) n'ont qu'un champ `command`, lu par `bash -c` sous Linux et macOS et par PowerShell sous Windows (`hookRunner` de Gemini CLI), et aucune forme unique n'est sûre pour les deux (`||`, `trap` et `if` ne se lisent pas dans les deux langages, `||` manque à Windows PowerShell 5.1). `init` choisit donc la forme selon `process.platform` à l'installation : hors Windows, la commande passe par le lanceur `sh` `.gemini/hooks/drwil-node.sh` (même test, même message, `exec node` sinon ; code 2 pour la garde `BeforeTool`, qu'il lit comme un refus, 1 pour les autres, un simple avertissement) ; sous Windows elle reste l'appel `node` seul, sans repli (limite connue : le réglage est versionné, une équipe qui mélange les systèmes garde la forme du système qui a lancé `init`). Sans le lanceur, Gemini lisait déjà le 127 comme un refus dont la raison est « node: command not found », sans la piste à suivre.
**Périmètre** : `packages/drwil/templates/common/tools/claude/.claude/settings.json`, `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json` (copie du dépôt : `.claude/settings.json`), `packages/drwil/templates/common/tools/gemini/.gemini/settings.json`, `packages/drwil/templates/common/tools/gemini/.gemini/hooks/drwil-node.sh`, `packages/drwil/src/render-gemini.ts`.
**Source de vérité** : les commandes de hook de ces réglages ; `packages/drwil/src/render-gemini.ts` (forme de Gemini selon le système).
**Preuve** : test du paquet : chaque commande de hook de Claude et de Copilot, lancée par `/bin/sh` avec un `PATH` vide, écrit le message sur stderr et rien sur stdout (hors Windows) ; pour Gemini, `init` écrit la forme à lanceur, qui sans node sort 2 (`BeforeTool`) ou 1 avec le message et, avec node, donne la sortie du hook appelé directement ; la forme Windows est celle de `node` seul (test de `geminiNode("win32")`) ; les formes PowerShell de Copilot et de Windows ne sont pas jouées en CI (humaine).
**Contrôle** : `tests-qua-215`
**Tests** : `packages/drwil/test/claude-hooks.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : hooks-sans-dependance-au-shell — « Un hook d'assistant lancé sans `node` dans le `PATH` dit en clair que `node` est introuvable et quoi faire, au lieu d'un 127 muet »
**Raison** : Constaté le 2026-11-02 : sous fnm, un assistant lancé depuis un autre shell que celui qui a initialisé `node` exécute les hooks du kit en code 127 « hook errored », sans cause ni piste ; décision du demandeur du même jour : message lisible seulement, ni chemin absolu écrit à l'installation, ni repli vers fnm ou `~/.local/bin`.

## QUA-216 — Sans `node`, les gardes de Claude Code refusent toujours et les hooks de Copilot sortent sans erreur ; avec `node`, le repli ne change rien
**Règle** : Livré à tout projet. Sans `node`, la commande de repli de QUA-215 sort avec le code que l'assistant lit comme il se doit : 2 pour un hook `PreToolUse` de Claude Code (bash-guard, scope-reminder, read-guard, prompt-hook : refus, stderr montré à l'agent, fail-closed, QUA-019), 1 pour les hooks informatifs de Claude Code (`SessionStart`, `UserPromptSubmit`, `PostToolUse`, `Stop` : erreur non bloquante, le code 2 bloquerait le message ou relancerait l'agent), 0 pour tous ceux de Copilot ; ses rappels QUA-065 ne bloquent pas et son adaptateur d'attestation ne peut alors préparer ni confirmer. Avec `node`, le repli ne change ni la sortie ni le code de sortie du hook : le code de `node` est celui de la commande, un refus reste un refus. Le refus d'un sondage Copilot invalide utilise son JSON natif `permissionDecision: "deny"`, avec le code 0, distinct d'une erreur de hook.
**Périmètre** : `packages/drwil/templates/common/tools/claude/.claude/settings.json` et `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json` (copie du dépôt : `.claude/settings.json`).
**Source de vérité** : les commandes de hook de ces deux fichiers.
**Preuve** : test du paquet : sans `node`, code 2 pour chaque `PreToolUse` de Claude, 1 pour les autres, 0 pour Copilot ; avec `node`, chaque garde `PreToolUse` donne la même sortie et le même code que le script appelé directement.
**Contrôle** : `tests-qua-216`
**Tests** : `packages/drwil/test/claude-hooks.test.mjs`
**Origine** : hooks-sans-dependance-au-shell — « Ce message ne change ni le refus ni le format de sortie des hooks quand `node` est présent : le fail-closed des gardes de Claude Code est conservé (QUA-019), et les hooks de Copilot ne bloquent toujours jamais (QUA-065) »
**Raison** : Avant ce contrat, un code 127 est une erreur non bloquante pour Claude Code (doc des hooks, « Other exit codes ») : sans `node`, les gardes laissaient tout passer sans le dire ; le code 2 les fait refuser avec un message, sans changer le comportement de Copilot (QUA-065) ni la sortie des hooks quand `node` est là.
**Modifié** : 2026-11-03 — adaptation du protocole d'attestation autorisée : refus natif Copilot explicite, sans changer les codes de repli ni les rappels existants.

## QUA-217 — Les tests du moteur passent quand `node` n'est que dans un dossier propre au shell
**Règle** : Les tests de `.githooks/engine.test.mjs` ne supposent aucun `node` dans `/usr/bin` ni `/usr/local/bin` : un contrôle dont la commande est `node` se résout par le `PATH` hérité, que l'environnement réduit passé au contrôle conserve. Sous un gestionnaire de versions comme fnm (`node` dans un dossier propre au shell), le pre-commit et le pre-push, qui rejouent ces tests, ne sont donc plus bloqués.
**Périmètre** : `.githooks/engine.test.mjs`.
**Source de vérité** : `.githooks/engine.test.mjs` (`avecPath`, test `QUA-217`).
**Preuve** : test du moteur : le fichier est rejoué dans un sous-processus dont le `PATH` ne contient que `git` et un dossier à lien vers `node` (aucun dossier système de `node`), et doit passer en entier. Limite : le test prouve l'absence de dépendance à un `node` système dans ce fichier seul, pas dans les autres suites ; il est sauté sous Windows (liens symboliques) ; si `git` vit dans le même dossier que `node` (cas de la CI), le `PATH` reste réduit mais n'isole plus `node`.
**Contrôle** : `tests-qua-217`
**Tests** : `.githooks/engine.test.mjs`
**Origine** : hooks-sans-dependance-au-shell — « Les tests du moteur passent sans `node` dans le `PATH` système, donc sous fnm : aucun ne suppose un `node` dans `/usr/bin` »
**Raison** : Constaté le 2026-11-02 : sous fnm, les tests QUA-208, 209 et 210 passaient un environnement sans `PATH` à un contrôle `node -e 0` (code 127) ; la CI ne le voyait pas parce que `node` est dans `/usr/bin` sur ses machines.

## QUA-218 — `INSTALL.md` décrit le prérequis `node` dans le PATH de l'assistant et le piège fnm
**Règle** : Livré à ce dépôt (`INSTALL.md`, doc visiteur en anglais). `INSTALL.md` dit que `node` doit être dans le `PATH` du processus de l'assistant et pas seulement d'un shell, décrit le piège des gestionnaires de versions à dossier propre au shell (fnm), le message que les hooks affichent et la marche à suivre, et les limites connues (Gemini sous Windows sans repli, formes PowerShell non jouées en CI).
**Périmètre** : `INSTALL.md`.
**Source de vérité** : `INSTALL.md`, section « Node.js in the PATH of your assistant ».
**Preuve** : relecture humaine ; aucun test ne juge si le texte est clair.
**Manuel** : lire la section de `INSTALL.md` : le prérequis, le piège fnm, le message des hooks, la marche à suivre et les limites y sont, et sont justes par rapport à QUA-215 et QUA-216.
**Couvre** : `INSTALL.md`
**Origine** : hooks-sans-dependance-au-shell — « Le prérequis (`node` dans le `PATH` du processus de l'assistant) et le piège fnm sont décrits dans `INSTALL.md` »
**Raison** : Sans cette section, un développeur sous fnm voit « hook errored » sans savoir que le shell de l'assistant n'a pas `node`.

## QUA-219 — Un script du kit lance une commande longue en tâche de fond et en écrit le verdict dans un fichier
**Règle** : Livré à tout projet. `node .githooks/wait-command.mjs <commande>` lance la commande en tâche de fond, détachée (dans le dossier `wait` des évidences locales, hors versionnement), et en écrit le verdict dans un fichier : son code de sortie seul, jamais sa sortie, qui reste dans un journal local dont le chemin est dit (QUA-013 : non exécuté n'est pas passé ; une commande tuée par un signal est un échec). Un verdict livré est consommé : l'appel suivant rejoue la commande.
**Périmètre** : `.githooks/wait-command.mjs` et son gabarit (`packages/drwil/templates/common/base/.githooks/wait-command.mjs`).
**Source de vérité** : `.githooks/wait-command.mjs`.
**Preuve** : tests des hooks : commande de quelques secondes lancée en fond, verdict de réussite et d'échec, contenu du fichier de verdict, rejeu après consommation, signal.
**Contrôle** : `tests-qua-219`
**Tests** : `.githooks/wait-command.test.mjs`
**Origine** : attente-commandes-longues — « Un script du kit lance une commande longue en tâche de fond et écrit son verdict dans un fichier »
**Raison** : Le 2026-10-30, 15 boucles `while pgrep` zombies : faute d'outil pour attendre `run-checks`, `verify` ou un commit à hooks au-delà de 120 s, les sous-agents bouclaient.

## QUA-220 — L'attente est bornée : elle rend le verdict ou dit « toujours en cours », sans jamais boucler indéfiniment
**Règle** : Livré à tout projet. `node .githooks/wait-command.mjs [--wait <secondes>] [--status] <commande>` attend au plus `--wait` secondes (100 par défaut, sous les 120 s d'un appel d'outil) et rend le verdict (codes 0 réussie, 1 échec, 2 non exécutée ou interrompue) ou dit « toujours en cours » (code 3) à l'échéance, sans tuer la commande ; un second lancement de la même commande rejoint celle qui tourne au lieu de la dupliquer ; `--status` lit sans lancer ni attendre ni consommer ; une exécution morte sans verdict est dite interrompue, jamais passée.
**Périmètre** : `.githooks/wait-command.mjs` et son gabarit.
**Source de vérité** : `.githooks/wait-command.mjs`.
**Preuve** : tests des hooks : attente trop courte sur une commande de 3 s (« toujours en cours », commande menée à terme), second lancement sans doublon, `--status`, exécution interrompue, ligne de commande et codes de sortie.
**Contrôle** : `tests-qua-220`
**Tests** : `.githooks/wait-command.test.mjs`
**Origine** : attente-commandes-longues — « Le même script expose une attente bornée : elle rend le verdict ou dit « toujours en cours » à l'échéance, sans jamais boucler indéfiniment »
**Raison** : Une attente qui ne finit pas se voit elle-même (`pgrep`) ; l'échéance ne tue pas la commande, pour ne laisser aucun orphelin ni verdict perdu.

## QUA-221 — La consigne du sous-agent de contrôles impose le script et `run_in_background`, et interdit la boucle `pgrep`
**Règle** : Livré avec Claude Code. `.claude/agents/drwil-checks.md` (gabarit et copie installée) fait lancer `run-checks` et `verify` par `.githooks/wait-command.mjs`, dans un appel Bash en `run_in_background`, et interdit la boucle `while pgrep …; do sleep …; done`. La règle de conduite (`docs/ia-first/8-conduct-rules.md`) le redit.
**Périmètre** : `packages/drwil/templates/common/tools/claude/.claude/agents/drwil-checks.md`, sa copie `.claude/agents/drwil-checks.md`, `docs/ia-first/8-conduct-rules.md` et son gabarit.
**Source de vérité** : `packages/drwil/templates/common/tools/claude/.claude/agents/drwil-checks.md`.
**Preuve** : test des hooks : les deux copies citent le script et `run_in_background` et interdisent la boucle `pgrep`. Limite : le test juge le texte de la consigne, pas que le modèle la suive.
**Contrôle** : `tests-qua-221`
**Tests** : `.githooks/wait-command.test.mjs`
**Origine** : attente-commandes-longues — « Les consignes des sous-agents imposent ce script et `run_in_background`, et interdisent la boucle `pgrep` »
**Raison** : Sans consigne, un sous-agent continue d'écrire sa propre boucle d'attente.

## QUA-222 — Tout mécanisme ou consigne du kit atteint chaque outil choisi, ou son écart est déclaré dans la matrice
**Règle** : Livré à tout projet. Une consigne ou un mécanisme que le kit livre atteint chaque outil choisi par le fichier que tous lisent (`AGENTS.md`) ou par son fichier natif ; les fichiers d'entrée natifs qui ne font que renvoyer à `AGENTS.md` (Copilot CLI, Cursor) reprennent en une ligne la consigne, avec les mêmes marqueurs. Un écart (un outil sans fichier propre au kit, comme un sous-agent) est déclaré dans la section « Instructions reach every tool » de `docs/ia-first/6-limits-and-tool-compatibility.md`, qui dit « not tested » pour ce qu'aucun essai n'a mesuré (QUA-060). Une liste déclarée « mécanisme → marqueurs » est relue par le test ; un mécanisme nouveau s'y inscrit dans le chantier qui le crée, la liste ne repère que ce qu'on y met.
**Périmètre** : `packages/drwil/templates/common/base/AGENTS.md`, `packages/drwil/templates/common/tools/copilot/.github/copilot-instructions.md`, `packages/drwil/templates/common/tools/cursor/.cursor/rules/ia-first.mdc` et `docs/ia-first/6-limits-and-tool-compatibility.md` ; livrés dans le gabarit.
**Source de vérité** : `outils/parite-des-outils.test.mjs` (la liste des mécanismes) ; textes dans le gabarit.
**Preuve** : test des outils : chaque marqueur de la liste est dans chacun des fichiers d'entrée, et la matrice porte la section et l'écart déclaré, identique dans le gabarit. Limite : le test juge le texte, pas que l'outil le suive.
**Contrôle** : `tests-qua-222`
**Tests** : `outils/parite-des-outils.test.mjs`
**Origine** : outiller-tous-les-outils — « Toute consigne ou tout mécanisme livré par le kit atteint chaque outil choisi, par le fichier que tous lisent (`AGENTS.md`) ou par son fichier natif, sinon son écart est déclaré dans la matrice de compatibilité »
**Raison** : Une consigne n'atteignait que Claude Code : les autres outils continuaient d'écrire leur boucle `while pgrep`.

## QUA-223 — La consigne d'attente bornée des commandes longues est lue au démarrage sous tout outil
**Règle** : Livré à tout projet. Le `AGENTS.md` livré (et celui du dépôt) et les fichiers d'entrée natifs de Copilot CLI et de Cursor disent de lancer les commandes longues par `.githooks/wait-command.mjs` et de ne jamais attendre par une boucle `while pgrep` ; le détail reste dans `docs/ia-first/8-conduct-rules.md` (QUA-221 pour le sous-agent de Claude Code). `AGENTS.md` reste sous le plafond de 100 lignes (QUA-153).
**Périmètre** : `packages/drwil/templates/common/base/AGENTS.md`, `AGENTS.md`, `packages/drwil/templates/common/tools/copilot/.github/copilot-instructions.md`, `packages/drwil/templates/common/tools/cursor/.cursor/rules/ia-first.mdc` ; livrés dans le gabarit.
**Source de vérité** : `docs/ia-first/8-conduct-rules.md` (règle « Long commands »), repris dans `packages/drwil/templates/common/base/AGENTS.md`.
**Preuve** : test des outils : le script et la boucle interdite sont cités dans chacun des quatre fichiers. Limite : le test juge le texte ; que le modèle de chaque outil le suive reste « not tested » dans la matrice.
**Contrôle** : `tests-qua-223`
**Tests** : `outils/parite-des-outils.test.mjs`
**Origine** : outiller-tous-les-outils — « Sous tout outil, la consigne de lancer les commandes longues par `.githooks/wait-command.mjs` et de ne jamais attendre par une boucle `while pgrep` est lue au démarrage »
**Raison** : Seule la consigne du sous-agent de Claude Code interdisait la boucle ; les autres outils n'en lisaient rien.

## QUA-224 — Sans code, couverture et e2e sont pas encore applicables, jamais réputés prouvés
**Règle** : Livré à tout projet. Une couche sans fichier source présent n'a pas encore de garantie de couverture applicable ; si toutes les couches sont vides, l'e2e n'est pas encore applicable non plus. `drwil guarantees` ne câble aucun contrôle ni n'écrit de fiche bloquante pour ces garanties ; `drwil verify` les explique sans FAIL ni demande d'attestation. Même déjà déclarés et cités, leurs contrôles ne sont pas exécutés et ne sont jamais présentés comme une preuve passée. Les autres garanties et les exclusions sans justification restent exigées.
**Périmètre** : `drwil guarantees`, `drwil verify`.
**Source de vérité** : `packages/drwil/src/guarantees-table.ts` (`sourceFiles`), `packages/drwil/src/guarantees-verify.ts` (`pendingGuarantees`, `coverageFailures`).
**Preuve** : projet installé sans pile puis avec manifeste de pile seul ; absence de fiches couverture/e2e, information texte et JSON ; contrôles déjà cités non lancés, autres garanties toujours bloquantes.
**Contrôle** : `tests-qua-224`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : clôture-sur-projet-neuf — « Sur un projet sans code, une garantie couverture ou e2e dont la couche n'a aucun code est “pas encore applicable” : elle ne met pas verify en FAIL, et le dit en clair »
**Raison** : Un chantier de versionnement ne pouvait pas se clore avant même le premier fichier du produit.

## QUA-225 — Le premier fichier source réactive immédiatement les garanties de sa couche
**Règle** : Livré à tout projet. L'applicabilité est recalculée à chaque commande, sans option de dérogation : dès le premier fichier source, même non encore indexé, la couverture de sa couche et l'e2e redeviennent obligatoires ; une pile inconnue avec du code reste bloquante. La recherche descend sans limite de profondeur dans les couches déclarées (sinon détectées, sinon la racine). Les extensions de source sont définies par `sourceFiles` ; manifestes, configurations `*.config.*`, déclarations TypeScript `*.d.ts`, fichiers cachés, documentation, gabarits (`templates`, `gabarits`), dépendances, sorties de compilation et rapports de couverture ne comptent pas. Un lien symbolique hors de ces dossiers compte conservativement comme du code, sans être suivi. Une erreur de lecture n'est pas assimilée à une couche vide.
**Périmètre** : `drwil guarantees`, `drwil verify`.
**Source de vérité** : `packages/drwil/src/guarantees-table.ts` (`sourceFiles`, `layerHasCode`).
**Preuve** : projet à deux couches vides, ajout profond d'un premier fichier Rust avant tout commit ; seule sa couche est réactivée, l'e2e bloque ; les contrôles déjà déclarés échouent à nouveau après le premier code.
**Contrôle** : `tests-qua-225`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : clôture-sur-projet-neuf — « Dès que la couche reçoit du code, la garantie redevient applicable et son échec redevient bloquant »
**Raison** : L'absence de code n'est pas une exclusion permanente et ne doit pas masquer une nouvelle couche.

## QUA-226 — Le code créé après la première installation ne devient pas une dette héritée
**Règle** : Livré à tout projet. La première installation mémorise les chemins du code présent dans `guaranteeBaseline`. Une réinstallation garde cette photo. Pour chaque couche d'une pile connue, seul le code de sa pile présent sur cette photo la classe « existante » ; le code ajouté ensuite reste neuf, couvert à 100 %, même si `drwil guarantees` n'a jamais été lancé auparavant. Sur une ancienne installation sans photo, le classement conservateur à partir du code courant reste inchangé.
**Périmètre** : `drwil init`, `drwil guarantees`.
**Source de vérité** : `packages/drwil/src/config-write.ts`, `packages/drwil/src/guarantees-layers.ts`.
**Preuve** : init sans code, premier fichier puis réinstallation et guarantees : câblage à 100 %, sans mesure de dette ni diff ; les tests du cliquet restent vrais pour le code présent avant init.
**Contrôle** : `tests-qua-226`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : clôture-sur-projet-neuf — « le classement “nouveau” ou “existant” dépend de la présence de code au moment où drwil guarantees est lancé, alors que la recette d'un projet neuf impose d'écrire le code d'abord »
**Raison** : La recette du projet neuf déclenchait une mesure de dette héritée dès son premier test.

## QUA-227 — Déclarer une garantie ne la prouve pas, guarantees et verify partagent le même juge
**Règle** : Livré à tout projet. Sur une couche applicable, `drwil guarantees` et `drwil verify` jugent par la même fonction la déclaration et la citation des contrôles de couverture et d'e2e. Un contrôle câblé mais cité par aucun contrat laisse la garantie non tenue et écrit une fiche bloquante. Le résumé de `guarantees` distingue le câblage de la preuve d'exécution, qui reste le verdict de `verify` ; il ne promet pas que les garanties sont tenues sur la seule déclaration.
**Périmètre** : `drwil guarantees`, `drwil verify`.
**Source de vérité** : `packages/drwil/src/guarantees-verify.ts` (`coverageFailures`), lecteur canonique des contrats livré par le kit.
**Preuve** : contrôle de couverture câblé puis cité, e2e déclaré puis cité : les deux commandes donnent le même diagnostic, sans faux résumé de réussite.
**Contrôle** : `tests-qua-227`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : clôture-sur-projet-neuf — « drwil guarantees affiche “✓ couverture” alors que drwil verify déclare la garantie non tenue »
**Raison** : Deux diagnostics divergents faisaient croire le chantier de garantie fini.

## QUA-228 — La clôture complète automatiquement le renvoi de preuve et l'index
**Règle** : Livré à tout projet. Après validation de l'évidence et avant suppression de la fiche, la clôture écrit sa preuve et son renvoi dans le journal (`dirs.projects`), sans demander de citation manuelle préalable. L'entrée est reconnue par la preuve déjà citée, le titre de la fiche, son nom ou sa ligne de clôture qui nomme sa branche (« Clôturé par », « Closed by ») ; une simple mention de la branche ne la désigne qu'à défaut de toute autre entrée reconnue, si bien que l'entrée d'un autre chantier qui la cite ne compte pas pour une seconde ; une ambiguïté ou une erreur de lecture/écriture refuse la suppression. Sans entrée identifiable, seule une entrée minimale nommée par le chantier et citant sa preuve est ajoutée : aucune décision métier n'est inventée. Une relance ne double ni entrée ni renvoi. La ligne propre à cette fiche est retirée de l'index (`dirs.index`), continuations comprises ; les lignes communes à plusieurs fiches gardent la prudence de QUA-074. `--check` prépare et signale sans écrire.
**Périmètre** : `.githooks/close.mjs`, `.githooks/close-mechanics.mjs`, `.githooks/close-journal.mjs`, gabarit et installation.
**Source de vérité** : `.githooks/close-journal.mjs` et `.githooks/close-mechanics.mjs`.
**Preuve** : clôture de bout en bout avec résumé de journal sans citation, plusieurs entrées, entrée d'un autre chantier qui cite seulement la branche ignorée, ligne de clôture en français et en anglais, index multilignes, relance, dossiers réglés et langue anglaise ; refus avant suppression si journal ambigu ou inaccessible ; preuve refusée sans modification du journal.
**Contrôle** : `tests-qua-228`
**Tests** : `.githooks/close.test.mjs`
**Origine** : clôture-sur-projet-neuf — « La clôture écrit elle-même la ligne “Preuve de clôture” du journal et corrige la ligne de l'index qui cite la fiche supprimée »
**Raison** : Le renvoi écrit à la main échouait avant que la clôture ait pu créer la preuve ; la mécanique doit finir sans retouche.
**Modifié** : 2026-11-07 — la branche ne compte plus, dans une entrée, que sur sa ligne de clôture (ou à défaut de toute autre entrée reconnue) : l'entrée d'un autre chantier qui citait la branche comptait pour une seconde et refusait la clôture ; validé par le demandeur le 2026-11-07 (réponse « Traiter maintenant » au sondage des limites, chantier « limites pendant le chantier »).

## QUA-229 — La référence à la preuve future du seul chantier actif n'est pas une référence morte
**Règle** : Livré à tout projet. Le contrôle des références utilisé par `drwil verify` tolère un chemin de preuve absent uniquement s'il est exactement celui du chantier actif existant, lu dans un état valide BUILD, EVIDENCE, VERIFY ou CLOSING, selon `dirs.proofs`. Hors chantier actif, après suppression de la fiche, avec un état absent ou illisible, et pour toute autre preuve absente, la référence reste bloquante. Une preuve présente mais ignorée par Git reste jugée par la règle ordinaire ; aucune preuve déjà close n'est dispensée de vérification.
**Périmètre** : `.githooks/check-docs.mjs`, gabarit et installation.
**Source de vérité** : `.githooks/check-docs.mjs`, chemin partagé de `.githooks/closure-proof.mjs`.
**Preuve** : contrôle réel sur projets git : quatre activités actives, dossier de preuves réglé, état absent/invalide/SCOPING, fiche disparue et ancienne preuve absente.
**Contrôle** : `tests-qua-229`
**Tests** : `.githooks/check-docs.test.mjs`
**Origine** : clôture-sur-projet-neuf — « Avant la clôture, la citation de la preuve du chantier actif ne fait plus échouer verify »
**Raison** : Le fichier est créé par la clôture après verify ; exiger sa présence avant rendait le cycle impossible.

## QUA-230 — Les renvois hors périmètre sont signalés avant la clôture
**Règle** : Livré à tout projet. Dès BUILD, `node .githooks/close.mjs --check` nomme les fichiers et lignes citant la fiche à supprimer, y compris catalogue, dashboard, intentions, index et journal. Pour les fichiers dont la correction serait hors du bloc scope commité dans HEAD, il propose les chemins à ajouter, à motiver et commiter séparément avant la correction. Les motifs, miroirs et exclusions de la barrière de périmètre sont respectés ; les fichiers déjà couverts ou exemptés ne demandent aucune extension. La ligne d'index retirée automatiquement reste régie par QUA-228. Le signal n'écrit ni renvoi ni périmètre ; il complète les corrections proposées par QUA-076.
**Périmètre** : `.githooks/close-checks.mjs`, `.githooks/close.mjs`, `.githooks/close-texts.mjs`, gabarit et installation.
**Source de vérité** : `.githooks/close-checks.mjs` (`referenceScope`), grammaire et exclusions de `.githooks/scope.mjs` et `.githooks/scope-gate.mjs`.
**Preuve** : dépôts git réels, renvois Markdown et HTML hors scope, plusieurs citations du même fichier, fichiers couverts ou exemptés, extension non commitée puis commitée, langue anglaise, miroirs et exclusions configurés ; aucune écriture par `--check`.
**Contrôle** : `tests-qua-230`
**Tests** : `.githooks/close.test.mjs`
**Origine** : clôture-sur-projet-neuf — « En BUILD, close --check liste les renvois à la fiche qui bloqueraient le commit de clôture et propose l'extension du bloc scope »
**Raison** : Découvrir le hors-périmètre après suppression de la fiche impose une reprise tardive ; l'extension se décide pendant BUILD.

## QUA-231 — Un rapport public de défaut du kit est imprimable sans rejouer les contrôles
**Règle** : `drwil report` imprime un texte à coller avec la version de la CLI, la version numérique du kit installé lorsqu'elle est lisible, les identifiants fermés des contrôles du kit en échec au dernier instantané run-checks et un message public normalisé d'échec. La source et l'absence de vérification de sa fraîcheur sont explicites ; absence, format invalide ou entrée refusée restent « non lu », jamais un succès. Le code de sortie zéro signifie seulement que le rapport est imprimé.
**Périmètre** : commande `report` du paquet drwil, recette livrée.
**Source de vérité** : `packages/drwil/src/cli-report.ts`, messages dans `packages/drwil/src/cli-texts.ts`.
**Preuve** : commande publique en sous-processus sur des données fictives, versions, échec et entrées absentes ou invalides.
**Contrôle** : `tests-qua-231`
**Tests** : `packages/drwil/test/report.test.mjs`
**Origine** : signaler-un-defaut-du-kit — « Une commande drwil imprime un rapport de défaut prêt à coller : version du kit, contrôle en échec et son message »
**Raison** : Un défaut doit pouvoir être décrit depuis le projet installé sans inventer une exécution.

## QUA-232 — Le rapport de défaut n'exporte aucune donnée du projet
**Règle** : Le rapport n'exporte ni chemin absolu, nom de projet ou de dépôt, contenu de fichier, secret, commande du projet, sortie brute, horodatage ni empreinte. Seuls les identifiants fermés des contrôles intégrés au kit et une version strictement numérique sont repris des entrées locales ; les messages sont normalisés par le paquet. Tout champ libre, contrôle propre au projet, suffixe de version ou donnée douteuse est exclu. Les fichiers d'entrée symboliques ou trop volumineux sont refusés.
**Périmètre** : texte produit par `drwil report`.
**Source de vérité** : liste fermée et lecteur dans `packages/drwil/src/cli-report.ts`.
**Preuve** : marqueurs privés fictifs de formats variés dans tous les champs, version forgée, contrôles inconnus, liens symboliques et volume excessif.
**Contrôle** : `tests-qua-232`
**Tests** : `packages/drwil/test/report.test.mjs`
**Origine** : signaler-un-defaut-du-kit — « Le rapport ne contient aucune donnée du projet (chemins absolus, noms de dépôt, contenu de fichiers, secrets) »
**Raison** : Un masque de secrets connus ne garantit pas la confidentialité d'un texte arbitraire.

## QUA-233 — Le rapport est strictement local et en lecture seule
**Règle** : `drwil report` imprime sur stdout ; il n'écrit aucun fichier, ne lance aucun programme, n'exécute pas de contrôle ni de code du projet et ne contacte aucune forge ni autre dépôt. La reproduction indiquée est une instruction pour l'utilisateur, pas une exécution du rapport.
**Périmètre** : commande et API publique `report`.
**Source de vérité** : `packages/drwil/src/cli-report.ts`.
**Preuve** : instantané des fichiers avant/après la CLI et contrôle local sentinelle qui ne doit pas tourner ; lecteur limité à des fichiers locaux non symboliques.
**Contrôle** : `tests-qua-233`
**Tests** : `packages/drwil/test/report.test.mjs`
**Origine** : signaler-un-defaut-du-kit — « La commande n'écrit jamais dans un autre dépôt et n'appelle aucune forge »
**Raison** : La remontée d'un défaut n'autorise ni télémétrie ni action dans un autre dépôt.

## QUA-234 — Un humain juge la lisibilité et la reproductibilité du rapport de défaut
**Règle** : Un humain lit un rapport de défaut généré sur des données fictives et la recette livrée, juge le texte lisible et assez précis pour préparer une reproduction, y compris les limites des messages normalisés et la nécessité d'un exemple fictif.
**Périmètre** : présentation publique du rapport et recette.
**Source de vérité** : `packages/drwil/src/cli-report.ts`, `packages/drwil/src/cli-texts.ts`, recette livrée.
**Preuve** : lecture humaine du rapport et de la recette.
**Contrôle** : `tests-qua-234`
**Manuel** : Lire le rapport et la recette ; confirmer la lisibilité et la précision suffisante pour une reproduction sans donnée du projet.
**Couvre** : `packages/drwil/src/cli-report.ts`, `packages/drwil/src/cli-texts.ts`, `packages/drwil/templates/common/base/docs/recipes/report-a-kit-defect.md`
**Tests** : `packages/drwil/test/report.test.mjs`
**Origine** : signaler-un-defaut-du-kit — « Le texte du rapport est lisible et assez précis pour être reproduit »
**Raison** : La présence automatique de champs ne prouve pas qu'un mainteneur peut comprendre le signalement.

## QUA-235 — Le hook d'attestation ne confirme que la réponse humaine à un sondage préparé
**Règle** : `drwil attest-poll <ID> --tried <essai> [--renew] [--tool claude|copilot|gemini|codex|cursor]` prépare sans attester un sondage : règle, résultats automatiques, jugement humain, essai de l'agent et chemins couverts. Le hook ou client dédié refuse avant affichage tout champ ajouté, réponse remplie, défaut, recommandation, choix multiple ou résumé différent du moteur. Claude Code conserve la corrélation par session et appel de `AskUserQuestion` et ne lit que `tool_response.answers`. Copilot CLI et Gemini CLI corrèlent leur `ask_user`, et Codex son `request_user_input`, par session native, outil, contexte de sous-agent fourni, nonce aléatoire visible à usage unique et contenu exact ; Codex lie aussi le `tool_use_id` natif, jamais inventé. Cursor dispose du client supplémentaire `drwil cursor-acp`, qui lance `agent acp`, initialise/authentifie/crée une session et transmet les messages humains ; il reçoit `cursor/ask_question`, lie le `toolCallId` natif, réserve le même protocole et présente lui-même la question sur son TTY. Ce client lit exclusivement le choix saisi par l'humain, renvoie `outcome.answered.answers[].selectedOptionIds` et refuse toute entrée/sortie non TTY, réponse en argument ou entrée stdin redirigée ; aucun choix n'est implicite. Il gère explicitement les permissions humaines et les notifications ACP utiles, refuse les méthodes non prises en charge, borne durée et taille et arrête son sous-processus. Une fermeture ou annulation empêche aussi la confirmation pendant la relance. Ce n'est pas une intégration garantie au chat Cursor habituel ni un hook natif inventé. Un seul sondage portable est en attente par session, réservé atomiquement avant toute attente asynchrone. Le nonce ne se réarme jamais, même dans une autre session ou un autre outil ; le retour est réclamé atomiquement avant relance. Seule la réponse positive du résultat natif confirme : `toolResult.textResultForLlm` d'un succès Copilot, chaîne JSON `tool_response.llmContent` de Gemini, chaîne JSON `tool_response` avec l'unique `answers["drwil_attest"].answers` de Codex, ou choix humain du client Cursor ; jamais un argument, un texte du chat ou de l'agent, un refus ou une absence de réponse. Une préparation expire après une heure ; un contrat, une preuve ou une couverture changés pendant la question exigent un nouveau sondage. Le moteur existant réexécute les contrôles et compare le snapshot exact avant d'écrire la même attestation version 4 ; `--renew` reste explicite. La provenance distingue appel natif, nonce et empreinte du sondage portable ; elle est déclarative, pas une identité forte. Codex réserve l'entrée native et refuse son appel direct par Bash ; ses hooks doivent être revus et approuvés dans `/hooks`. Le terminal est inchangé. Les cinq adaptateurs ont des tests fictifs locaux, pas un essai interactif réel.
**Périmètre** : préparation CLI/API, quatre adaptateurs de hooks et client ACP Cursor dédié livrés ; pas une preuve de parité interactive des cinq outils.
**Source de vérité** : `packages/drwil/src/attest.ts`, `packages/drwil/src/attest-portable.ts`, `packages/drwil/src/cli-attest.ts`, `packages/drwil/src/cli-cursor.ts`, `packages/drwil/src/cursor-acp.ts`, `packages/drwil/src/cursor-acp-session.ts`, `packages/drwil/templates/common/tools/claude/.claude/hooks/attest-poll.mjs`, `packages/drwil/templates/common/tools/claude/.claude/hooks/portable-attest.mjs`, `packages/drwil/templates/common/tools/claude/.claude/hooks/attest-adapters.mjs`.
**Preuve** : projets fictifs : préparation sans écriture, confirmation via le retour natif, refus d'entrées falsifiées, rejeu/réarmement, concurrence, corrélation, expiration, préparation altérée, changement couvert, relance des contrôles et renouvellement ; aucun essai réel prétendu.
**Contrôle** : `tests-qua-235`
**Tests** : `packages/drwil/test/claude-hooks.test.mjs`, `packages/drwil/test/portable-attest.test.mjs`, `packages/drwil/test/cursor-acp.test.mjs`, `packages/drwil/test/cycle.test.mjs`
**Origine** : attester-depuis-le-chat — sondage lu par le hook, frontière humain/agent préservée.
**Raison** : Préparer le jugement dans la conversation ne doit jamais autoriser l'agent à confirmer à la place de l'humain ; la provenance du hook n'est pas une identité forte.
**Modifié** : 2026-11-04 — décision humaine « Construire un pont ACP dédié » : ajout explicite du client et de son intermédiaire TTY, garanties de corrélation conservées ; aucun essai réel prétendu.

## QUA-236 — Le sondage d'attestation ne demande que le jugement utile
**Règle** : L'humain lit un sondage d'attestation sur un contrat fictif et juge que le critère, la preuve essayée et les fichiers couverts lui permettent de décider sans reconstituer le contexte ; aucun choix n'est suggéré ni prérempli.
**Périmètre** : présentation des sondages Claude Code, Copilot CLI, Gemini CLI, Codex et client ACP Cursor dédié et recette d'adoption ; jugement humain toujours requis.
**Source de vérité** : `packages/drwil/src/attest.ts`, `packages/drwil/src/attest-portable.ts`, `packages/drwil/src/cli-cursor.ts`, `packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md`.
**Preuve** : lecture humaine du sondage fictif et de la recette ; aucun agent n'enregistre ce jugement.
**Manuel** : Lire le sondage et la recette, confirmer leur lisibilité et que seul le jugement utile est demandé.
**Couvre** : `packages/drwil/src/attest.ts`, `packages/drwil/src/attest-portable.ts`, `packages/drwil/src/cli-cursor.ts`, `packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md`
**Origine** : attester-depuis-le-chat — le sondage est lisible et ne demande que le jugement utile.
**Raison** : La présence automatique des champs ne prouve pas que le jugement demandé est compréhensible.

## QUA-240 — `drwil contracts adopt` déplace un contrat du catalogue vers le registre
**Règle** : `drwil contracts adopt <ID>` retire du catalogue la ligne `catalogue:<ID>` et écrit dans le registre du projet une section du même ID, sans préfixe, avec la règle et le périmètre du catalogue et, comme preuve, le contrôle type du catalogue (champs Preuve et Manuel) ; le registre reste valide pour `drwil contracts`. Un agent peut la lancer ; modifier ou retirer un contrat reste un geste humain (QUA-050).
**Périmètre** : `drwil contracts adopt`, registre et catalogue du projet de la commande (le dépôt ou le livrable, jamais l'autre : QUA-018).
**Source de vérité** : `packages/drwil/src/cli-contracts.ts` (`adoptContract`).
**Preuve** : test sur un projet installé, en français et en anglais : section écrite sans préfixe, ligne retirée du catalogue, `drwil contracts` valide.
**Contrôle** : `tests-qua-240`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Couvre** : `packages/drwil/src/cli-contracts.ts`, `packages/drwil/src/cli-texts.ts`
**Origine** : commande-de-contrat — `drwil contracts adopt <ID>` déplace le contrat du catalogue vers le registre, sans préfixe, et écrit la déclaration de son contrôle depuis le catalogue pour la pile
**Raison** : Adopter un contrat obligeait à recopier une ligne de tableau à la main et à la retirer du catalogue.

## QUA-241 — `drwil contracts adopt` refuse sans rien écrire
**Règle** : `drwil contracts adopt <ID>` refuse, sans écrire ni le registre ni le catalogue, un ID déjà défini dans le registre, un ID absent du catalogue, une ligne du catalogue sans contrôle proposé pour la pile, un registre invalide et, en BUILD, un registre ou un catalogue hors du cadrage de la fiche active (QUA-172) ; le refus dit pourquoi.
**Périmètre** : `drwil contracts adopt`.
**Source de vérité** : `packages/drwil/src/cli-contracts.ts` (`adoptContract`).
**Preuve** : test des cinq refus, fichiers inchangés, puis adoption acceptée une fois le cadrage élargi.
**Contrôle** : `tests-qua-241`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Couvre** : `packages/drwil/src/cli-contracts.ts`, `packages/drwil/src/cli-texts.ts`
**Origine** : commande-de-contrat — un ID déjà défini, un contrat absent du catalogue ou un registre invalide est refusé, sans rien écrire
**Raison** : Une commande qui écrit deux fichiers ne doit jamais en laisser un à moitié modifié.

## QUA-242 — `drwil contracts add` écrit le squelette d'un contrat propre au projet
**Règle** : `drwil contracts add [ID]` ajoute au registre du projet une section d'un ID jamais défini (ni au registre ni au catalogue ; sans ID, le prochain `PRJ-<n>` libre) avec sa règle et son titre s'ils sont donnés, sinon des champs « À compléter » ; le registre reste valide pour `drwil contracts`. Un agent peut la lancer ; modifier ou retirer un contrat reste un geste humain (QUA-050).
**Périmètre** : `drwil contracts add`, registre du projet de la commande (le dépôt ou le livrable, jamais l'autre : QUA-018).
**Source de vérité** : `packages/drwil/src/cli-contracts.ts` (`addContract`).
**Preuve** : test sur un projet installé, en français et en anglais : section écrite, ID proposé puis ID explicite, `drwil contracts` valide.
**Contrôle** : `tests-qua-242`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Couvre** : `packages/drwil/src/cli-contracts.ts`, `packages/drwil/src/cli-texts.ts`
**Origine** : commande-de-contrat — `drwil contracts add` crée le squelette d'un contrat propre au projet, d'un ID jamais défini
**Raison** : Écrire un contrat propre obligeait à recopier la structure d'une section à la main.

## QUA-243 — `drwil contracts add` refuse sans rien écrire
**Règle** : `drwil contracts add` refuse, sans rien écrire, un ID déjà défini dans le registre ou dans le catalogue, un ID mal formé, un registre invalide et, en BUILD, un registre hors du cadrage de la fiche active (QUA-172) ; le refus dit pourquoi.
**Périmètre** : `drwil contracts add`.
**Source de vérité** : `packages/drwil/src/cli-contracts.ts` (`addContract`).
**Preuve** : test des refus, fichiers inchangés, puis ajout accepté une fois le cadrage élargi.
**Contrôle** : `tests-qua-243`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Couvre** : `packages/drwil/src/cli-contracts.ts`, `packages/drwil/src/cli-texts.ts`
**Origine** : commande-de-contrat — un ID déjà défini ou un registre invalide est refusé, sans rien écrire
**Raison** : Un ID défini deux fois ou un registre cassé rendrait tous les contrats illisibles.

## QUA-237 — `drwil init` sur un projet équipé commite la mise à jour sur sa branche dédiée, ou refuse avant d'écrire
**Règle** : `drwil init` sur un projet équipé (manifeste présent) dans un dépôt git coupe la branche `workstream/kit-update` depuis la branche principale (origin/HEAD, à défaut master ou main), applique la mise à jour et la commite lui-même (message en français ou anglais selon le projet, trailer `Drwil-Kit-Update: <version>`, hooks du projet joués, aucun contournement) : en SCOPING, l'arbre est propre ensuite et aucun commit n'est refusé par la barrière de périmètre. Avant d'écrire quoi que ce soit, il refuse en disant quoi faire si l'arbre est sale, s'il n'y a pas d'identité git, si la branche principale est en retard sur le distant (la commande à lancer : `git fetch`, puis fast-forward ; `init` ne la met pas à jour lui-même) ou si la branche de mise à jour existe déjà. Rien à commiter : retour sur la branche d'origine, branche supprimée. Sans branche principale trouvée, ou `--no-git` : la mise à jour reste dans l'arbre, sans commit. `core.hooksPath` géré par un autre outil : `init` le dit, sans le casser.
**Périmètre** : `drwil init` sur un projet déjà équipé dans un dépôt git ; ni première installation, ni `--no-git`.
**Source de vérité** : `packages/drwil/src/kit-update.ts` (`prepareUpdate`, `finishUpdate`), appelé par `packages/drwil/src/index.ts`.
**Preuve** : test du paquet sur un dépôt temporaire équipé par une version antérieure : mise à jour en SCOPING commitée sur `workstream/kit-update` avec le trailer, arbre propre, branche principale intacte ; refus sans rien écrire (arbre sale, sans identité git, principale en retard, branche existante) ; mise à jour déjà faite sans nouveau commit.
**Contrôle** : `tests-qua-237`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : mise-a-jour-du-kit-sans-blocage — « Après `drwil init` sur un projet équipé en SCOPING, `git status` est propre ou la mise à jour est commitée sur sa propre branche, sans commit refusé par la barrière de périmètre »
**Raison** : Le 2026-11-04, sur `drwil_walk`, une mise à jour laissait une soixantaine de fichiers non commités que la barrière de périmètre refusait en SCOPING, sans issue indiquée (QUA-027, mise à jour sûre).

## QUA-238 — La barrière de périmètre reconnaît la mise à jour du kit par son manifeste, jamais une édition à la main
**Règle** : Un commit portant le trailer `Drwil-Kit-Update` (rejeu local, pre-push, CI, `verify`) ou posé par `init` (variable `DRWIL_KIT_UPDATE` au pre-commit) n'est pas jugé sur les fichiers que le manifeste du kit (installed-files.json, dans .drwil/) explique : fichier présent dont l'empreinte est celle du manifeste du commit, fichier retiré dont l'empreinte est celle du manifeste du parent, enregistrement de version, configuration où seuls changent les réglages recalculés par `init` (ajout de contrôles et de réglages sans coupure de garde compris). Tout autre fichier du même commit reste jugé comme dans un commit ordinaire ; un fichier de mécanique modifié à la main, avec ou sans trailer, reste refusé en SCOPING.
**Périmètre** : barrière de périmètre livrée par le gabarit (`.githooks/scope-gate.mjs`, `.githooks/scope-gate-kit.mjs`) ; limite connue : un commit qui falsifie aussi le manifeste et porte le trailer n'est arrêté que par la revue de sa pull request.
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/scope-gate-kit.mjs` (`nonKitFiles`), `packages/drwil/templates/common/base/.githooks/scope-gate.mjs` (`checkScope`, `checkBranch`).
**Preuve** : tests de la barrière sur un dépôt temporaire : mise à jour reconnue au commit et au rejeu ; hook modifié à la main refusé avec ou sans trailer, même avec la variable ; fichier hors manifeste dans le commit de mise à jour refusé ; configuration dont une garde est coupée refusée ; test du paquet bout en bout.
**Contrôle** : `tests-qua-238`
**Tests** : `.githooks/scope-gate.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : mise-a-jour-du-kit-sans-blocage — « La mise à jour commitée passe la barrière en local et en CI (rejeu de la branche), alors qu'un fichier de mécanique modifié à la main dans un commit ordinaire reste refusé en SCOPING »
**Raison** : Sans règle écrite, la mise à jour commitée par `init` serait refusée par la barrière, ou la barrière serait contournée (QUA-019).

## QUA-244 — La mise à jour du kit garde au manifeste l'empreinte des fichiers qu'elle complète
**Règle** : Quand `drwil init` complète un fichier déjà présent (ligne ajoutée au `.gitignore`, bloc `scope` de la fiche de mécanique, pointeur…), il en garde l'empreinte : un fichier encore intact depuis l'installation précédente (empreinte égale à celle du manifeste) reçoit au manifeste sa nouvelle empreinte ; tout autre fichier complété lors d'une mise à jour (modifié à la main, ou propre au projet) garde son entrée du manifeste — `uninstall` et le retrait des fichiers obsolètes ne le suppriment toujours pas — et son empreinte après complétion est notée à part (completed-files.json, dans .drwil/ : `{ files: [{ file, sha256 }] }`, réécrit à chaque passage, retiré quand il est vide ; rien n'y est noté à une première installation). Dans le commit de mise à jour seulement (QUA-238), la barrière de périmètre admet un fichier dont l'empreinte dans l'index est celle notée à part ; toute autre empreinte reste refusée. Le commit de mise à jour d'un projet équipé qui complète un fichier du manifeste passe donc la barrière, au commit comme au rejeu.
**Périmètre** : `drwil init` sur un projet déjà équipé ; barrière de périmètre livrée par le gabarit (`.githooks/scope-gate-kit.mjs`) ; `drwil uninstall` (retire le fichier des empreintes notées à part).
**Source de vérité** : `packages/drwil/src/manifest-completed.ts` (`recordCompletion`, `writeCompleted`), appelé par `packages/drwil/src/complete.ts` et `packages/drwil/src/index.ts` ; `packages/drwil/templates/common/base/.githooks/scope-gate-kit.mjs` (`nonKitFiles`).
**Preuve** : test du paquet sur un dépôt temporaire équipé par une version antérieure dont le `.gitignore` et la fiche de mécanique sont à compléter, intacts puis retouchés à la main : mise à jour commitée sans refus, rejeu de la barrière vert ; intacts, nouvelle empreinte au manifeste et rien de noté à part ; retouchés, empreinte d'installation gardée, empreinte après complétion notée à part, `uninstall` ne supprime pas le fichier ; une retouche suivante sous le signal de `init` reste refusée.
**Contrôle** : `tests-qua-244`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : empreinte-des-fichiers-completes-par-init — « Sur un projet équipé par une version précédente, une mise à jour par `init` qui complète un fichier du manifeste — intact ou modifié à la main par le projet — commite sans refus de la barrière de périmètre ; un fichier intact reçoit sa nouvelle empreinte au manifeste ; un fichier modifié à la main garde son empreinte d'installation (`uninstall` et le retrait des fichiers obsolètes ne le suppriment toujours pas) et son empreinte après complétion est notée à part, admise par la barrière seulement pour le commit de mise à jour »
**Raison** : Le 2026-11-05, sur un projet équipé, `drwil init` 0.11.0 complétait `.gitignore` et la fiche de mécanique sans mettre leur empreinte à jour : la barrière les jugeait hors kit et refusait le commit, la mise à jour du kit était bloquée.

## QUA-239 — `init` dit, à la fin d'une mise à jour, ce qu'il a fait, ce qui reste à décider et la commande suivante
**Règle** : En fin de mise à jour d'un projet équipé, `drwil init` écrit trois choses dans la langue du projet : ce qu'il a fait (version, branche, branche d'origine, nombre de fichiers, ou « déjà à jour »), ce qui reste à décider (relire et fusionner par une pull request ; les fichiers modifiés à la main non réécrits, avec `drwil resolve-drift`) et la commande suivante (`git push -u origin <branche>`, `gh pr create --base <principale>`). Un commit non fait ou un `core.hooksPath` géré par un autre outil est dit, sans casser.
**Périmètre** : fin de `drwil init` sur un projet équipé dans un dépôt git.
**Source de vérité** : `packages/drwil/src/kit-update.ts` (`finishUpdate`).
**Preuve** : test du paquet : les trois messages en français et en anglais après une mise à jour, le message « déjà à jour », le signalement des fichiers non réécrits et d'un `core.hooksPath` externe.
**Contrôle** : `tests-qua-239`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : mise-a-jour-du-kit-sans-blocage — « `init` dit, à la fin d'une mise à jour, ce qu'il a fait, ce qui reste à décider et la commande suivante »
**Raison** : Sans ce compte rendu, l'utilisateur ne sait pas que la mise à jour attend une fusion ni quelle commande lancer.

## QUA-245 — Sur un clone neuf placé sur la branche d'un chantier, `state.mjs resume` remet l'état en BUILD ou en CLOSING d'après l'historique Git
**Règle** : Livré à tout projet. Sur la branche `workstream/<nom>`, état local en SCOPING (absent compris), `node .githooks/state.mjs resume` écrit l'état BUILD sur `docs/projects/<nom>.md` quand la fiche est présente ; quand elle est absente, qu'un commit de la branche depuis la branche principale (locale `main` ou `master`, sinon `origin/main` ou `origin/master`) l'a supprimée et que la PR de la branche n'est pas fusionnée (git et `gh`, QUA-058), il écrit l'état CLOSING sur elle. L'état écrit ne porte que l'activité, la fiche et l'horodatage : jamais EVIDENCE ni VERIFY (la preuve de verify est locale, à rejouer), jamais une décision humaine (fusion automatique, file, réouverture), que le message dit à redemander. La commande ne prend aucune décision : l'agent peut la lancer. Une fois l'état repris, le commit suivant d'un fichier du périmètre passe la barrière de périmètre.
**Périmètre** : `.githooks/state-resume.mjs` (`resume`), `.githooks/state-cli-commands.mjs` (`resumeCommand`), `.githooks/state-cli.mjs` (aiguillage) ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/state-resume.mjs` (`resume`).
**Preuve** : tests sur un dépôt d'origine et son clone neuf (`git clone -b workstream/<nom>`, sans branche principale locale, identité git explicite) : barrière refusée avant la reprise, BUILD repris et commit accepté après ; fiche supprimée par un commit de clôture, PR non fusionnée : CLOSING sans `auto_merge` ; ligne de commande.
**Contrôle** : `tests-qua-245`
**Tests** : `.githooks/state-resume.test.mjs`
**Origine** : reprise-d-etat-sur-un-autre-clone — « Sur un clone neuf placé sur `workstream/<fiche>`, `node .githooks/state.mjs resume` remet l'état en BUILD sur cette fiche quand elle est présente, et en CLOSING quand un commit de clôture l'a supprimée et que la PR de la branche n'est pas fusionnée ; le commit suivant passe la barrière de périmètre, prouvé par un test qui clone un dépôt de chantier en cours »
**Raison** : L'état est local et ignoré par Git : sur une autre machine, la branche arrivait sans lui, le commit et le lancement étaient refusés et aucune commande ne remettait l'état d'accord, écrire l'état à la main étant interdit (demande bloquante du 2026-11-05).

## QUA-246 — Chaque commit d'une fiche à lots porte `Drwil-Lot: N`, et `resume` reprend le dernier lot lu dans l'historique
**Règle** : Livré à tout projet. Le hook `prepare-commit-msg` (`.githooks/scope-gate.mjs --trailer`) ajoute `Drwil-Lot: N`, N le lot courant (`state.mjs lot`, QUA-166), à côté de `Drwil-Brief`, quand la fiche active a un enchaînement de lots ; jamais en double, rien sans lots. `resume` en BUILD lit le dernier trailer `Drwil-Lot` des commits de la branche depuis la branche principale : s'il désigne un lot [IA] de la fiche, il devient le lot courant et les lots [IA] qui le précèdent sont comptés faits ; sans trailer, ou un numéro qui n'est pas un lot [IA], aucun lot n'est repris (le premier lot restant est le courant).
**Périmètre** : `.githooks/scope-gate.mjs` (`addTrailer`), `.githooks/state-lots.mjs` (`LOT_TRAILER`, `writeLots`), `.githooks/state-resume.mjs` (`lastLot`) ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/state-resume.mjs` (`lastLot`), `packages/drwil/templates/common/base/.githooks/scope-gate.mjs` (`addTrailer`).
**Preuve** : test du trailer ajouté une seule fois avec le lot courant ; test de reprise sur un clone dont un commit porte `Drwil-Lot: 2` (lot 2 courant, lot 1 fait), puis sans trailer et avec un numéro de lot [humain].
**Contrôle** : `tests-qua-246`
**Tests** : `.githooks/state-resume.test.mjs`, `.githooks/scope-gate.test.mjs`
**Origine** : reprise-d-etat-sur-un-autre-clone — « Pour une fiche à plusieurs lots, chaque commit de lot porte le trailer `Drwil-Lot: N` et `resume` reprend le dernier lot lu dans l'historique de la branche »
**Raison** : Le lot courant était gardé dans un fichier local de `.drwil/`, perdu avec le dossier : un sous-agent repris sur un autre clone ne savait plus quel lot traiter.

## QUA-247 — `resume` refuse sans rien écrire quand l'historique ne prouve rien, et ne reconstruit jamais une décision humaine
**Règle** : Livré à tout projet. `node .githooks/state.mjs resume` refuse, sans écrire d'état et en disant pourquoi : sur une branche qui n'est pas `workstream/<nom>` (HEAD détachée comprise) ; sans branche principale, ni locale ni distante ; fiche absente sans commit de la branche qui l'a supprimée ; PR de la branche fusionnée ; `gh` muet sur la fusion (non prouvé, QUA-013) ; état local déjà actif sur une autre fiche (l'état reste tel quel). Déjà actif sur la même fiche : rien à reprendre, rien n'est écrit. Il ne reconstruit jamais la fusion automatique, la file ni la réouverture : le message dit qu'elles sont à redemander, et comment redonner la fusion automatique : le sondage `drwil-merge` lu par le hook (QUA-265), jamais une commande.
**Périmètre** : `.githooks/state-resume.mjs` (`resume`), messages dans `.githooks/state-messages-fr.mjs` et `.githooks/state-messages-en.mjs` ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/state-resume.mjs` (`resume`).
**Preuve** : tests sur dépôts temporaires : autre branche, HEAD détachée, fiche inconnue, PR fusionnée, `gh` muet, sans branche principale (aussi en ligne de commande, code 1) : refus nommé, aucun état écrit ; état actif sur une autre fiche gardé ; même fiche : rien à reprendre ; reprise réussie : fusion automatique non reconstruite, message qui nomme le sondage `drwil-merge`, en français et en anglais.
**Contrôle** : `tests-qua-247`
**Tests** : `.githooks/state-resume.test.mjs`
**Origine** : reprise-d-etat-sur-un-autre-clone — « `resume` refuse, sans rien écrire, quand l'historique ne prouve rien (branche qui n'est pas celle d'un chantier, fiche absente sans commit de clôture, PR fusionnée, état local déjà actif sur une autre fiche) et dit pourquoi ; il ne reconstruit jamais une décision humaine (fusion automatique, file, réouverture) : il dit qu'elle est à redemander »
**Raison** : Une reprise qui devinerait l'état écrirait à la main ce que la gouvernance interdit d'écrire : seul ce que Git prouve est recopié.
**Modifié** : 2026-11-07 — le message de reprise dit aussi comment redonner la fusion automatique (sondage `drwil-merge`, QUA-265) ; rien n'est reconstruit de plus ; validé par le demandeur le 2026-11-07 (réponse « Traiter maintenant » au sondage des limites, chantier « limites pendant le chantier »).

## QUA-248 — Chaque sous-commande de `node .githooks/state.mjs` rend la main dans un vrai processus
**Règle** : Livré à tout projet. Chaque sous-commande de `node .githooks/state.mjs` (lecture, `--json`, `briefs`, `briefs --json`, `resume`, `lot`, `lot next`, `reminder`, messages des outils, `next`, `queue stop`, `reopen`, `accept`, `move`, `start`, dont `start` vers un nouveau worktree), lancée dans un vrai processus et non par `main()` d'un test, rend la main d'elle-même avec sa sortie : jamais le code 13 ni l'avertissement « unsettled top-level await ». La CLI installée depuis l'archive du paquet lance aussi `node .githooks/state.mjs briefs --json` dans le projet qu'elle vient d'initialiser, et y lit une liste JSON.
**Périmètre** : `.githooks/state.mjs` (lancement de la commande, sans await de premier niveau), `.githooks/detour.mjs` et `.githooks/release-verdict.mjs` (même lancement) ; livrés dans le gabarit. `outils/tester-tarball.mjs` (contrôle `tarball`), propre au dépôt.
**Source de vérité** : `packages/drwil/templates/common/base/.githooks/state.mjs` (lancement), `outils/tester-tarball.mjs` (`lireBriefs`).
**Preuve** : tests en vrai processus (`node .githooks/state.mjs …`, `DRWIL_ROOT` sur un dépôt temporaire, identité git explicite) : chaque sous-commande rend la main avec son code attendu ; `resume`, `lot` et `lot next` sur la branche du chantier ; `start` vers un worktree, réponses d'un terminal simulé, chantier lancé dans le dossier voisin. Contrôle `tarball` : `briefs --json` dans le projet initialisé depuis l'archive ; code 13 ou sortie illisible refusés.
**Contrôle** : `tests-qua-248`, `tarball`
**Tests** : `.githooks/state-cli-process.test.mjs`, `outils/tester-tarball.test.mjs`
**Origine** : commandes-d-etat-bloquees — « Chaque sous-commande de `node .githooks/state.mjs` (dont `briefs`, `briefs --json`, `resume`, `lot`, `start` vers un worktree), lancée dans un vrai processus sur un dépôt de test, rend la main avec sa sortie, jamais le code 13 ; la CLI installée depuis l'archive (`outils/tester-tarball.mjs`) lance aussi `node .githooks/state.mjs briefs --json` dans le projet créé »
**Raison** : Depuis la PR #361, `briefs` et `resume` sortaient en code 13 sans rien écrire : `/drwil-start` ne listait plus les fiches. Les tests appelaient `main()` dans leur propre processus, où `.githooks/state.mjs` était déjà chargé, et ne pouvaient pas voir l'import circulaire bloqué par l'await de premier niveau.

## QUA-249 — Aucun hook du kit importé par un autre module ne fait d'await de premier niveau
**Règle** : Propre au dépôt drwil, jamais livré (QUA-018). Un contrôle lit les modules JavaScript (tests exclus) de `.githooks/`, `.claude/hooks/` et `packages/drwil/templates/` (gabarit et modules optionnels) par l'arbre syntaxique de TypeScript, et refuse tout await de premier niveau (`await`, `for await`, hors de toute fonction) d'un fichier qu'un autre de ces fichiers importe, statiquement, par réexport ou par `import()` ; le refus nomme le fichier, la ligne et l'importeur. Un hook que rien n'importe est un point d'entrée seul : son await est accepté. Aucun fichier lu est une erreur, jamais un succès (QUA-013).
**Périmètre** : hooks du dépôt, du gabarit et de ses modules optionnels ; rejoué au commit et en CI.
**Source de vérité** : `outils/verifier-await-premier-niveau.mjs`.
**Preuve** : contrôle `await-premier-niveau` sur le dépôt ; tests : await lu dans un bloc de premier niveau et dans `for await`, jamais dans une fonction, une méthode, une chaîne ou un commentaire ; hook importé refusé avec fichier, ligne et importeur, dans `.githooks/` comme dans un module optionnel ; point d'entrée seul et test importeur acceptés ; aucun hook lu en erreur.
**Contrôle** : `await-premier-niveau`, `tests-qua-249`
**Tests** : `outils/verifier-await-premier-niveau.test.mjs`
**Origine** : commandes-d-etat-bloquees — « Aucun hook du kit importé par un autre module ne fait d'await de premier niveau : un contrôle du dépôt le refuse en nommant le fichier et la ligne »
**Raison** : Un module chargé à la demande qui réimporte un hook encore en évaluation attend qu'il finisse, et le hook attend sa commande : Node sort en code 13 sans rien écrire. Ni la couverture, qui compte les lignes, ni les tests en processus ne le voyaient.

## QUA-250 — Sur une PR, la CI reprend le verdict de la dernière CI de la branche principale pour chaque contrôle inchangé
**Règle** : Livré à tout projet (CI GitHub et GitLab du gabarit). En CI, `run-checks` ne reprend un verdict que si la CI le demande (`DRWIL_CI_REUSE=1`) ; hors CI, rien ne change (QUA-141). Sur une PR, la CI restaure le fichier de verdicts (`.drwil/evidence/run-checks-verdicts.json` (si présent)) écrit par la dernière CI de la branche principale et demande la reprise à la seule passe de la PR : chaque contrôle « ok » dont l'empreinte propre (sa déclaration et les fichiers de ses `paths`, QUA-141) est identique est repris et le dit ; les autres sont rejoués. Seul un push sur la branche principale, qui ne demande jamais la reprise et rejoue donc tout, sauvegarde ces verdicts : la passe de la PR ne relit jamais un verdict qu'elle aurait pu écrire. Sans fichier restauré (premier passage, cache expiré) ou illisible, tout est rejoué, jamais « repris » sans verdict (QUA-013). Le rejeu avec les hooks de la branche principale (QUA-113) est la seule autre passe qui demande la reprise, sur les verdicts que la première passe de la PR vient de laisser et à ces conditions seulement (empreinte propre identique sous les hooks de la base, moteur de `run-checks` inchangé par la pose) ; il ne relit jamais ceux de la branche principale autrement que par cette première passe. La CI GitHub livrée fait de même (cache Actions) ; la CI GitLab livrée, hors de la branche principale, télécharge avec le jeton du job l'artefact de verdicts du job `checks` du dernier pipeline réussi de la branche principale et demande la reprise ; seul un pipeline de la branche principale garde cet artefact (effacé avant l'envoi ailleurs, même en échec) ; téléchargement manqué : tout rejoué. Pas de cache GitLab : par défaut les branches protégées et non protégées ne le partagent pas, et partagé une merge request pourrait l'écrire. Sur GitHub (CI du dépôt et du gabarit), un push sur la branche principale ne rejoue rien quand son arbre (`git rev-parse HEAD^{tree}`) est celui que la dernière CI verte d'une PR a joué : la CI d'une PR, en dernière étape du job `checks` (donc seulement si tout a réussi), dépose l'artefact `arbre-prouve` (`proven-tree` dans le gabarit) qui porte cette empreinte ; le push la lit dans le run `pull_request` le plus récent, vert, de la tête de la PR qui contient son commit, saute installation, gitleaks et `run-checks` et le dit (`::notice::`). Aucune PR, run non vert, artefact absent ou expiré, `gh` muet, arbre différent (PR non à jour au moment de la fusion) : tout est rejoué, jamais sauté sur une supposition (QUA-013). Le job reste rapporté « succès » sous son nom exigé, donc la CI de la branche principale reste verte pour QUA-251, et une CI rouge garde son issue d'alerte. La durée du job est un objectif suivi (8 min sur une PR de code), jamais un seuil qui fait échouer la CI. Sur GitLab, le push sur la branche principale rejoue tout (aucune preuve d'arbre n'y est lue).
**Périmètre** : `.githooks/run-checks-verdicts.mjs` (`loadReuse`), livré dans le gabarit ; job `checks` de `.github/workflows/ia-first.yml` (restauration sur une PR, sauvegarde sur un push de la branche principale) ; job `checks` des CI du gabarit (`packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml`, `packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml`).
**Source de vérité** : `.githooks/run-checks-verdicts.mjs` (`loadReuse`) et le job `checks` de chaque CI (dépôt et gabarit).
**Preuve** : tests de `run-checks` (passe de la branche principale en CI sans reprise, verdicts restaurés dans une autre copie de travail repris pour les contrôles inchangés et rejoués sinon ; CI sans demande, sans verdict, verdicts illisibles, `--tout-rejouer` : tout rejoué) ; tests des workflows du dépôt et du gabarit GitHub (restauration sur une PR avant la passe, reprise demandée à cette seule passe, sauvegarde sur un push de la branche principale seulement ; preuve d'arbre lue par le seul push de la branche principale, avant la passe, dans le run de PR vert ; passe, installation et gitleaks sautés sur arbre prouvé ; artefact posé par une PR seulement, en dernière étape du job) et du gabarit GitLab (téléchargement hors de la branche principale, reprise demandée à cette seule passe, artefact effacé hors de la branche principale, aucun cache des verdicts : seule l'archive de gitleaks, vérifiée par sa somme à chaque passe, est cachée) ; test du paquet (CI installées par `init`, GitHub et GitLab).
**Contrôle** : `tests-qua-250`
**Tests** : `.githooks/run-checks.test.mjs`, `.github/scripts/workflows-yaml.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : ci-rapide-pour-la-doc — « Sur une PR, la CI reprend le verdict de la dernière CI de la branche principale pour chaque contrôle dont l'empreinte (fichiers et commande) est identique ; elle rejoue les autres ; le push sur la branche principale rejoue tout et seul écrit ces verdicts »
**Raison** : Une PR de documentation attendait 6 min 11 s dans le job `checks` (mesuré sur la PR #362) : la reprise contrôle par contrôle (QUA-141) évitait ce coût en local, pas en CI.

## QUA-251 — Une file ne lance le chantier suivant que sur la preuve d'une CI verte de la branche principale sur sa dernière fusion
**Règle** : Livré à tout projet. Une PR vue fusionnée, `node .githooks/pr-watch.mjs <n>` suit, dans le même délai (30 minutes au plus), la CI de la branche principale sur le commit de fusion (`gh run list --commit <sha> --workflow ia-first.yml --event push`) et les issues ouvertes dont le titre commence par « CI broken on the main branch » (écrites par le job `alert-if-ci-broken`) ; il dit « verte », « rouge », « en cours » (au délai) ou « issue ouverte », et consigne ce verdict pour ce SHA dans `.drwil/evidence/main-ci.json` (si présent) ; seule une CI verte sans issue ouverte en fait une preuve (code 0) ; rouge ou issue ouverte : code 1 ; en cours au délai, `gh` muet ou commit de fusion inconnu : code 2, jamais « verte » (QUA-013). La « dernière fusion de la file » est le sommet de la branche principale à jour, celle d'où part la branche du chantier suivant : `origin/<principale>` après un `git fetch` s'il contient la branche locale, sinon la branche locale. Le lancement de la tête de file par l'agent (`node .githooks/state.mjs next`, et l'enchaînement à la fusion constatée de QUA-178) refuse, en dur, sans preuve pour ce sommet, et dit pourquoi et quoi faire : aucune preuve, preuve d'une autre fusion, CI rouge, encore en cours, issue ouverte, branche principale introuvable ; l'état reste SCOPING, la file gardée. Le verrou ne vaut que sur une forge GitHub : le dépôt distant `origin` sur une autre forge (GitLab…, reconnue comme `drwil guarantees` : son URL ne nomme pas GitHub), `next` et l'enchaînement ne sont pas bloqués et la sortie le dit en une ligne (pas de preuve possible sur cette forge, CI de la branche principale à vérifier à la main) ; sans `origin`, le verrou tient (QUA-013). Un `start` humain, `queue stop` et les autres transitions ne changent pas. Les rappels de l'état, la skill `start-a-workstream` et la recette `docs/recipes/working-with-branches.md` le disent.
**Périmètre** : `.githooks/pr-watch.mjs`, `.githooks/pr-watch-main.mjs` (`lookMain`, `followMain`, `writeProof`, `mainTip`, `mainCiRefusal`, `originForge`, `mainCiGate`), `.githooks/state-transitions.mjs` (`start` de la tête de file), messages français et anglais, rappels (`.githooks/state-context-texts.mjs`), skill `start-a-workstream`, recette `docs/recipes/working-with-branches.md` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/pr-watch-main.mjs` (`followMain`, `mainCiRefusal`, `mainCiGate`).
**Preuve** : tests de `pr-watch` (`gh` simulé : CI verte sans issue, preuve écrite liée au SHA ; rouge ; en cours puis verte, en cours au délai ; issue ouverte, même CI en cours ; `gh` muet, commit de fusion inconnu ; en anglais) ; refus de la suivante (aucune preuve, preuve d'une autre fusion, rouge, en cours, issue ouverte, verdict inconnu, branche principale introuvable ; preuve du sommet acceptée ; forge reconnue par `origin` : GitHub, autre, aucune ; forge non GitHub : aucun refus, une ligne le dit, en français et en anglais ; sans `origin`, le verrou tient) ; tests de l'état sur dépôts jetables (`next` refusé et dit, la branche principale avancée depuis la preuve, rouge, en cours, issue ; `start` humain non bloqué ; `next` lancé sur la preuve du sommet ; enchaînement à la fusion refusé sans preuve, état SCOPING et file gardés ; en anglais ; `origin` hors GitHub sans preuve : `next` et l'enchaînement lancent la tête de file et le disent).
**Contrôle** : `tests-qua-251`
**Tests** : `.githooks/pr-watch.test.mjs`, `.githooks/state.test.mjs`
**Origine** : ci-rapide-pour-la-doc — « Une file de chantiers ne lance le suivant (`node .githooks/state.mjs next`) que sur la preuve, écrite par `node .githooks/pr-watch.mjs` après la fusion, que la CI de la branche principale est verte sur le commit de fusion et qu'aucune issue « CI broken on the main branch » n'est ouverte ; sinon `next` refuse et dit pourquoi (CI rouge, en cours ou non suivie, issue ouverte) ; un `start` humain n'est pas bloqué »
**Raison** : Lever « à jour avec master » laisse deux PR vertes chacune casser la branche principale une fois fusionnées ensemble, vu seulement après coup par sa CI : une file aurait lancé le chantier suivant sur une branche principale rouge. Hors GitHub, `gh` ne peut pas suivre la CI : bloquer la file sans preuve possible l'arrêterait pour toujours (décidé par le demandeur le 2026-11-06).

## QUA-252 — La protection de la branche principale n'exige plus qu'une PR soit à jour avec elle
**Règle** : Propre au dépôt drwil, jamais livré (QUA-018). Le ruleset GitHub de la branche principale (« master protégé ») exige toujours la fusion par PR et les contrôles requis (`checks`, `kit-tests` des trois systèmes), mais plus qu'une PR soit à jour avec la branche principale (`strict_required_status_checks_policy` à `false`) : une autre PR fusionnée ne relance plus la CI de toutes les autres. `.github/ruleset-master.json` le dit, et le job `checks` compare à chaque passe, sans condition, le ruleset de la forge à ce fichier (`.github/scripts/verifier-ruleset.mjs`, jeton de la CI) : un écart fait échouer la CI. Le réglage de la forge est un geste du demandeur ; le fichier se remet d'accord par `node .github/scripts/verifier-ruleset.mjs --ecrire`, relu en PR. Deux PR vertes chacune peuvent casser la branche principale une fois fusionnées ensemble : sa CI le voit après la fusion (alerte « CI broken on the main branch ») et une file attend sa preuve verte (QUA-251). La règle « à jour » que `drwil guarantees` pose chez les adoptants ne change pas.
**Périmètre** : `.github/ruleset-master.json`, job `checks` de `.github/workflows/ia-first.yml`.
**Source de vérité** : `.github/ruleset-master.json`, comparé à la forge par `.github/scripts/verifier-ruleset.mjs`.
**Preuve** : test des workflows : la règle des contrôles requis du fichier versionné n'exige plus la mise à jour, les contrôles et la fusion par PR restent exigés ; le job `checks` lance la comparaison sans condition, avec le jeton de la CI. Comparaison avec la forge vérifiée verte le 2026-11-06 (`.github/scripts/verifier-ruleset.mjs`, ruleset 24840343).
**Contrôle** : `tests-qua-252`
**Tests** : `.github/scripts/workflows-yaml.test.mjs`
**Origine** : ci-rapide-pour-la-doc — « La protection de la branche principale n'exige plus qu'une PR soit à jour avec elle ; `.github/ruleset-master.json` le dit et la CI vérifie que la forge le tient »
**Raison** : La règle « à jour avec master » relançait toute la CI d'une PR dès qu'une autre était fusionnée : une PR de doc attendait plusieurs passes (mesuré sur la PR #362, 6 min 40 s).

## QUA-253 — Le sondage des limites hors cadre est la seule décision de l'humain, lue par le hook et enregistrée dans l'état pour chaque limite
**Règle** : Livré à tout projet. À la fin de BUILD et avant VERIFY, une limite hors du cadre de la fiche est soumise à l'humain par un sondage d'en-tête `drwil-limite` : une question par limite (4 au plus par sondage), qui nomme un chemin distinct `docs/intentions/<nom>.md` (le dossier `dirs.intentions` de la configuration), en choix unique, à exactement deux réponses « Traiter maintenant » et « Noter en intention » (« Handle now », « Record as intent ») ; sous Copilot CLI, un champ par limite, nommé par ce chemin, en choix unique (`enum` seul). Le hook du sondage (`.claude/hooks/prompt-hook.mjs`, aiguillé vers `.claude/hooks/limit-poll.mjs`) refuse avant affichage un sondage avec une réponse remplie, une valeur par défaut, une recommandation, un choix multiple, une question sans chemin d'intention ou un chemin répété, ou d'autres réponses que ces deux ; après le sondage, il transmet seul chaque réponse lue à `.githooks/state-limits.mjs` (`recordLimits`), qui l'enregistre dans l'état (`limits: [{ intent, choice }]`, `now` ou `note`, une réponse par chemin, la dernière remplaçant la précédente), de BUILD à CLOSING seulement, jamais sur un état invalide ; une question sans réponse lue n'est pas enregistrée et le hook le dit. Les réponses tombent au retour en SCOPING. Le contexte de l'état dit, en BUILD, la règle des limites (dans le cadre : traitée sur le champ ; hors cadre : ce sondage, avant VERIFY ; un sous-agent s'arrête avec la liste des limites, la session principale pose le sondage) et liste les réponses enregistrées.
**Périmètre** : `.claude/hooks/prompt-hook.mjs`, `.claude/hooks/limit-poll.mjs`, `.githooks/state-limits.mjs`, `.githooks/state-validate.mjs` (champ `limits`), `.githooks/state-texts.mjs`, `.githooks/state-messages-fr.mjs` et `.githooks/state-messages-en.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.claude/hooks/limit-poll.mjs` (`limitHook`), `.githooks/state-limits.mjs` (`recordLimits`, `limitLines`, `intentPath`, `limitChoice`).
**Preuve** : tests de l'état : le hook rejoué refuse les sondages non conformes (Claude Code et Copilot CLI) et laisse passer les autres ; la réponse humaine, lue par le hook, est enregistrée pour chaque limite, remplace une réponse antérieure, n'enregistre rien sans réponse ni hors de BUILD à CLOSING ; champ `limits` validé ; règle des limites et réponses listées dans le contexte de BUILD, en français et en anglais ; réponses effacées au retour en SCOPING.
**Contrôle** : `tests-qua-253`
**Tests** : `.githooks/state.test.mjs`
**Origine** : limites-pendant-le-chantier — « Le sondage des limites (`drwil-limite`) est refusé avec une réponse remplie, une valeur par défaut ou une recommandation ; la réponse de l'humain, lue par le hook, est enregistrée dans l'état pour chaque limite »
**Raison** : À la clôture, chaque limite non traitée devenait une fiche d'intention que l'agent écrivait seul : des limites traitables dans le chantier, contexte encore chargé, partaient en intentions ; le choix revient à l'humain, lu par l'outil (décidé par le demandeur le 2026-11-05).
## QUA-260 — Un contrôle confié à la CI fait rendre à `drwil verify` `GOVERNANCE: PASS (CI pending)`, jamais un `PASS` sans réserve
**Règle** : Livré à tout projet. Quand au moins un contrôle cité par un contrat est confié à la CI (`runAt: ["ci"]`, QUA-208) et que tout le reste est vert, `drwil verify` rend `GOVERNANCE: PASS (CI pending)` (sortie humaine et `--agent`, code de sortie 0) et nomme les contrôles en attente de la CI de la PR ou MR, sur une ligne juste avant le verdict ; `--json` et la preuve écrite par `--evidence` les listent dans `ciPending` et portent la ligne du verdict dans `label` (`status` reste `pass`) ; la sortie `--agent` ne dit jamais « Work is verified » sous un `PASS (CI pending)` : le travail n'est pas vérifié tant que la CI de la PR ou MR n'est pas verte sur eux (QUA-262). Le contrôle n'y est ni joué ni repris d'une passe de `run-checks` : il est « non applicable ici (confié à la CI…) », jamais « ok », et ne fait pas tomber son contrat. Un verdict qui n'est pas PASS garde son libellé et nomme aussi les contrôles en attente ; sans contrôle confié à la CI, `GOVERNANCE: PASS` reste inchangé.
**Périmètre** : `packages/drwil/src/verdict.ts` (`ciPending`, `verdictLabel`, `formatVerdict`, `verdictJson`), `packages/drwil/src/agent.ts` (`formatForAgent`), `packages/drwil/src/verify-checks.ts` (`replayChecks`), `.githooks/engine.mjs` (`ciPending`).
**Source de vérité** : `packages/drwil/src/verdict.ts` (`verdictLabel`, `ciPending`).
**Preuve** : test du paquet par la CLI sur un projet temporaire : contrôle confié à la CI non joué et non compté passé, `GOVERNANCE: PASS (CI pending)` et la ligne qui le nomme en sortie humaine et `--agent`, `ciPending` et `label` en `--json` et dans la preuve `--evidence`, jamais « Work is verified » en `--agent`, `GOVERNANCE: FAIL` gardé quand un autre contrat échoue, `PASS` sans note sans contrôle confié à la CI.
**Contrôle** : `tests-qua-260`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : controle-lent-une-seule-fois-en-ci — « Avec au moins un contrôle confié à la CI et tout le reste vert, `verify` rend `GOVERNANCE: PASS (CI pending)` et nomme les contrôles en attente ; ce n'est jamais un `PASS` sans réserve »
**Raison** : Un contrôle confié à la CI n'a pas tourné en local : un `PASS` sans réserve le compterait passé (QUA-013), alors que seule la CI de la PR ou MR le prouve.
**Modifié** : 2026-11-07 — le verdict lui-même porte la réserve (preuve `--evidence`, `--json` par `label`, conduite `--agent` sans « Work is verified »), posée par `packages/drwil/src/verdict.ts` et non plus par la seule CLI ; décidé par le demandeur (chantier « contrôle lent une seule fois en CI », après le lot 1).
## QUA-261 — L'option `--with-ci-checks` joue en local les contrôles confiés à la CI, et la sortie le dit
**Règle** : Livré à tout projet. `drwil verify --with-ci-checks` et `node .githooks/run-checks.mjs --with-ci-checks` jouent aussi les contrôles confiés à la CI (`runAt: ["ci"]`, QUA-208), pour reproduire un échec de la CI : leur échec remonte comme tout autre. La sortie dit que l'option est active (`run-checks` : dans son résumé, avec les contrôles ainsi joués ; `verify` : une ligne avant le verdict, `withCiChecks` en `--json`). L'option ne change rien aux autres réglages de `runAt` ni à un réglage refusé ; un verdict « ok » laissé par l'option n'est jamais repris par une passe sans elle.
**Périmètre** : `.githooks/engine-runat.mjs` (`runAtVerdict`, `WITH_CI_CHECKS`), `.githooks/engine.mjs`, `.githooks/run-checks.mjs`, `packages/drwil/src/cli-verify.ts` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/engine-runat.mjs` (`runAtVerdict`, option `withCi`).
**Preuve** : tests du moteur (contrôle confié à la CI joué avec l'option, réglage `["verify", "ci"]` toujours non exécuté au commit, réglage refusé toujours refusé), de `run-checks` de bout en bout (option dite dans le résumé, contrôle joué et son échec bloquant, verdict de l'option non repris sans elle, en anglais) et du paquet par la CLI (`verify --with-ci-checks` : échec remonté, ligne de l'option en sortie humaine et `--agent`, `withCiChecks` en `--json`).
**Contrôle** : `tests-qua-261`
**Tests** : `.githooks/engine.test.mjs`, `.githooks/run-checks.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : controle-lent-une-seule-fois-en-ci — « Une option de `verify` et de `run-checks` (nom à fixer au lot 1, par exemple `--with-ci-checks`) joue aussi en local les contrôles confiés à la CI, pour reproduire un échec ; la sortie dit que l'option est active »
**Raison** : Un contrôle confié à la CI qui échoue doit pouvoir se reproduire en local sans changer la configuration, et sans qu'une passe locale soit prise pour la CI.
## QUA-262 — La clôture n'est acquise qu'une fois la CI de la PR ou MR verte sur les contrôles confiés à la CI
**Règle** : Livré à tout projet. `node .githooks/pr-watch.mjs [<n>]` suit la CI de la PR par `gh` (GitHub) ou celle de la MR par `glab` (GitLab : `glab mr view --output json`, pipeline de tête, ses jobs par `glab api`), la forge reconnue par l'URL d'`origin` (GitHub, GitLab), sinon par un fichier .gitlab-ci.yml à la racine sans dossier .github/workflows/. Une pipeline GitLab n'est verte que sur `success` : `failed` ou `canceled` rouge (un job autorisé à échouer n'est pas nommé), `skipped` ou aucune pipeline « non exécuté », toute autre en cours (manuelle comprise) ; glab muet, « non exécuté » (code 2), jamais « verte » (QUA-013). Une MR fusionnée dit la CI de la MR à la fusion et la CI de la branche principale à vérifier à la main (QUA-251 ne vaut que sur GitHub). Quand le projet confie des contrôles à la CI (`runAt: ["ci"]`, QUA-208), une CI verte les nomme « joués par cette CI » ; rouge, absente, muette, fermée ou au délai, la sortie dit qu'ils ne sont pas prouvés, que la clôture n'est pas acquise et que le chantier reste en CLOSING. `node .githooks/close.mjs` (clôture et `--check`) jette un regard sur la CI de la PR ou MR de la branche : verte sur HEAD, la clôture est acquise sur ce point et le dit ; en cours, rouge, absente ou vue sur un autre commit, la sortie le dit (« clôture non acquise, le chantier reste en CLOSING ») et renvoie à `pr-watch` ; sans contrôle confié à la CI, la forge n'est pas interrogée.
**Périmètre** : `.githooks/pr-watch.mjs` (`look`, `watch`), `.githooks/close-checks.mjs` (`lookMr`, `closingCi`, `changeForge`, `ciChecks`), `.githooks/close.mjs` (`close`) ; livrés dans le gabarit.
**Source de vérité** : `.githooks/close-checks.mjs` (`closingCi`, `lookMr`), `.githooks/pr-watch.mjs` (`watch`).
**Preuve** : tests de `pr-watch` sans réseau (`glab` simulé : pipeline verte, rouge avec job autorisé à échouer, jobs illisibles, absente, sautée, glab muet, MR fermée, en cours puis verte, manuelle, délai, MR fusionnée verte, rouge ou sans pipeline ; contrôles confiés à la CI dits prouvés ou non sur GitHub et GitLab, en anglais ; forge reconnue ; ligne de commande avec un `glab` factice) et de la clôture (CI verte sur HEAD acquise ; vue sur un autre commit, en cours, rouge, absente, gh muet, fusionnée rouge : non acquise et dit ; MR lue sur GitLab ; sans contrôle confié à la CI, aucune question à la forge ; en anglais).
**Contrôle** : `tests-qua-262`
**Tests** : `.githooks/pr-watch.test.mjs`, `.githooks/close.test.mjs`
**Origine** : controle-lent-une-seule-fois-en-ci — « La clôture d'un chantier n'est acquise qu'une fois la CI de la PR (GitHub) ou de la MR (GitLab) verte sur ces contrôles : `pr-watch` la suit sur les deux forges ; rouge ou absente, le chantier reste en CLOSING et le dit »
**Raison** : Un contrôle confié à la CI ne tourne plus en local : seule la CI de la PR ou MR le prouve, et sans la suivre sur GitLab la clôture y serait annoncée sans preuve (QUA-013).
## QUA-263 — La CI livrée ne joue pas deux fois le push d'une branche dont la PR ou MR est ouverte, et joue les contrôles confiés à la CI
**Règle** : Livré à tout projet. CI GitHub du gabarit (`.github/workflows/ia-first.yml`) : la première étape du job `checks` demande à `gh pr list` si la branche poussée a une PR ouverte ; sur un tel push (ni branche principale, ni tag), chaque étape suivante est sautée et une notice le dit, la PR jouant les siennes — pas de `if` de job, un job sauté n'étant pas rapporté sous son nom ; sans PR, ou `gh` muet, le push teste comme avant. Le job lit les PR (`pull-requests: read`). CI GitLab du gabarit (`packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml`) : `workflow: rules` refuse les pipelines de MR, une seule pipeline (de branche) par push, que la MR montre comme la sienne. Sur les deux forges, la CI pose la variable `CI` : `run-checks` y joue les contrôles confiés à la CI (`runAt: ["ci"]`, QUA-208), dont elle est la seule preuve (QUA-262).
**Périmètre** : `packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml`, `packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml`.
**Source de vérité** : `packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml` (étape `pr`), `packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml` (`workflow: rules`).
**Preuve** : tests du paquet sur un projet initialisé : GitHub, script de décision joué par bash avec un `gh` factice (push à PR ouverte sauté et dit ; sans PR, gh muet, PR, branche principale, tag : joué), chaque étape suivante sautée ou propre à la PR ou à la branche principale, pas de `if` de job ; GitLab, `workflow: rules` sans pipeline de MR, aucun job de MR, `run-checks` joué ; moteur livré : contrôle `["ci"]` joué avec la variable `CI`, non joué hors CI ; couverture CI (QUA-013) verte.
**Contrôle** : `tests-qua-263`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : controle-lent-une-seule-fois-en-ci — « Livrable : les CI du gabarit, GitHub et GitLab, ne jouent plus deux fois les contrôles sur le push d'une branche qui a une PR ou une MR ouverte, et jouent bien les contrôles `["ci"]` »
**Raison** : La CI du gabarit tournait deux fois par push quand une PR était ouverte (événements `push` et `pull_request`) : un contrôle lent confié à la CI y aurait été joué deux fois.

## QUA-264 — La clôture refuse une fiche d'intention née sur la branche sans la réponse « Noter en intention » de l'humain
**Règle** : Livré à tout projet. `node .githooks/close.mjs` lit, dans `.githooks/close-limits.mjs` (`limitProblems`), les fiches d'intention que la branche ajoute (dossier `dirs.intentions`, commitées depuis la base de fusion avec la branche principale ou nouvelles dans l'arbre de travail ; l'intention d'origine de la fiche, le README du dossier et le fichier de notes exceptés) et les réponses du sondage des limites enregistrées dans l'état (QUA-253). Une fiche sans réponse « Noter en intention » pour son chemin, ou répondue « Traiter maintenant », refuse la clôture avant toute écriture (fiche, index, preuve, consommation intacts), avec un message par fiche qui nomme son chemin et le sondage à poser (en-tête `drwil-limite`), ou la limite à traiter ; `--check` et le passage de BUILD à EVIDENCE le signalent parmi ce qui ferait échouer la clôture. Aucun autre refus de la clôture ne change. Messages en français et en anglais, selon la langue du projet.
**Périmètre** : `.githooks/close.mjs`, `.githooks/close-limits.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/close-limits.mjs` (`limitProblems`).
**Preuve** : tests de la clôture sur un dépôt temporaire : fiche d'intention ajoutée sans réponse, ou répondue « Traiter maintenant », refusée avant toute écriture et signalée par `--check` et en quittant BUILD ; répondue « Noter en intention », la clôture passe ; intention d'origine, README, notes et intention venue de la branche principale ignorées ; fiche non commitée comptée ; messages en anglais.
**Contrôle** : `tests-qua-264`
**Tests** : `.githooks/close-limits.test.mjs`
**Origine** : limites-pendant-le-chantier — « La clôture refuse une fiche d'intention ajoutée par la branche sans réponse « Noter en intention » enregistrée pour son chemin, et une limite répondue « Traiter maintenant » qui finit quand même en fiche d'intention ; elle dit quelle limite et le sondage à poser »
**Raison** : Une règle de conduite seule laisse l'agent écrire une intention sans demander : le choix de l'humain, lu par le hook du sondage, n'est garanti que si la clôture le vérifie (contrôle dur décidé par le demandeur le 2026-11-05).

## QUA-265 — La fusion automatique se redonne en cours de chantier par un sondage `drwil-merge` dont la réponse humaine est lue par le hook
**Règle** : Livré à tout projet. De BUILD à CLOSING, un sondage autonome d'en-tête `drwil-merge` (sans question de lancement ni de file à côté) redonne ou retire la fusion automatique du chantier, par exemple après une reprise sur un autre clone (QUA-247) : une seule question, en choix unique, à exactement deux réponses « Automatic merge » et « Manual merge » (« Fusion automatique », « Fusion manuelle ») ; sous Copilot CLI, un seul champ nommé `drwil-merge`, en choix unique (`enum` seul). Le hook du sondage (`.claude/hooks/prompt-hook.mjs`, aiguillé vers `.claude/hooks/merge-poll.mjs`) refuse avant affichage un sondage avec une réponse remplie, une valeur par défaut, une recommandation, un choix multiple, une autre question ou un autre champ à côté, ou d'autres réponses que ces deux ; après le sondage, il transmet seul la réponse lue à `.githooks/state-merge.mjs` (`recordMerge`), qui écrit `auto_merge: true` (« Automatic merge ») ou le retire (« Manual merge ») de l'état, le reste de l'état gardé, de BUILD à CLOSING seulement, jamais sur un état invalide ; sans réponse lue, rien n'est écrit et le hook le dit. Aucune ligne de commande ne l'écrit. Le rappel d'état la dit « autorisée par l'humain (au lancement ou par le sondage `drwil-merge`) ». La question `drwil-merge` d'un sondage de lancement ou de file reste lue par ce sondage-là. Messages en français et en anglais.
**Périmètre** : `.claude/hooks/prompt-hook.mjs`, `.claude/hooks/merge-poll.mjs`, `.githooks/state-merge.mjs`, `.githooks/state-context-texts.mjs` (rappel de fusion automatique) ; livrés dans le gabarit.
**Source de vérité** : `.claude/hooks/merge-poll.mjs` (`mergeHook`), `.githooks/state-merge.mjs` (`recordMerge`, `mergeChoice`).
**Preuve** : tests de l'état : le hook rejoué dans un projet temporaire refuse les sondages non conformes (Claude Code et Copilot CLI) et laisse passer les autres ; la réponse humaine écrit ou retire `auto_merge` de BUILD à CLOSING, rien sans réponse, hors de BUILD à CLOSING ni sur un état invalide ; aucune commande ne l'écrit ; rappel d'état « autorisée par l'humain » ; en anglais.
**Contrôle** : `tests-qua-265`
**Tests** : `.githooks/state-merge.test.mjs`
**Origine** : limites-pendant-le-chantier — limite répondue « Traiter maintenant » le 2026-11-07 : « une reprise par `state.mjs resume` perd la fusion automatique, et aucune commande ne permet de la redonner sans relancer le chantier »
**Raison** : `resume` ne reconstruit jamais une décision humaine (QUA-247) : sans ce sondage, la fusion automatique perdue à la reprise ne se redonnait qu'en relançant le chantier ; elle reste une décision humaine lue par un outil, jamais une commande que l'agent lancerait seul (décidé par le demandeur le 2026-11-07).

## QUA-266 — Sous Copilot CLI, Gemini CLI, Codex et le client ACP de Cursor, les sondages `drwil-limite` et `drwil-merge` sont lus par le hook, avec les mêmes refus
**Règle** : Livré à tout projet. Le sondage des limites (QUA-253) et le sondage de fusion (QUA-265) se posent et se lisent sous chaque outil livré, jamais sur une réponse de l'agent. Copilot CLI les lit par les réglages de Claude Code (`.claude/settings.json`, `.claude/hooks/prompt-hook.mjs` sans argument, forme `message` et `requestedSchema`) ; son entrée native (`.claude/hooks/prompt-hook.mjs` avec `copilot pre` ou `copilot post`) reste celle de l'attestation et n'enregistre rien d'un autre sondage. Gemini CLI (`ask_user`, argument `gemini`), Codex (`request_user_input`, argument `codex`) et le client ACP dédié de Cursor (`drwil cursor-acp`, `cursor/ask_question`, l'en-tête dans `title`) passent par `.claude/hooks/portable-polls.mjs`, qui traduit la question native dans la forme de Claude Code et la confie aux mêmes hooks (`.claude/hooks/limit-poll.mjs`, `.claude/hooks/merge-poll.mjs`) : mêmes refus avant affichage (réponse remplie dans l'entrée, valeur par défaut, recommandation, choix multiple ou question Gemini qui n'est pas un choix, autres réponses, chemin d'intention absent ou répété, autre question à côté du sondage de fusion), le code 2 refusant l'appel ; seule la réponse lue dans le résultat natif de l'outil est enregistrée (`answers` par indice de Gemini, `answers[id].answers` à une seule valeur de Codex, `selectedOptionIds` à un seul choix du client Cursor), jamais un argument de l'appel. Toute autre question va, inchangée, au hook d'attestation (QUA-235). Un projet dont les hooks précèdent ce module garde l'attestation seule sous Cursor. Messages en français et en anglais.
**Périmètre** : `.claude/hooks/prompt-hook.mjs` (entrée native), `.claude/hooks/portable-polls.mjs`, `packages/drwil/src/cli-cursor.ts` (`crochetCursor`) ; livrés dans le gabarit.
**Source de vérité** : `.claude/hooks/portable-polls.mjs` (`portablePollHook`, `portableMain`).
**Preuve** : tests sur projets installés par `init` pour chaque outil : la commande lue dans la configuration installée de l'outil (`.gemini/settings.json` ; `packages/drwil/templates/common/tools/codex/.codex/hooks.json` et `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json` une fois installés ; `.claude/settings.json`), jouée par le shell avec une entrée au format de l'outil, et le module du gabarit dans le même processus, même code de sortie ; réponse humaine enregistrée (limites, fusion), réponse absente, double, libre ou en erreur ignorée, sondages non conformes refusés (code 2), question étrangère et événement inconnu sans effet ; sous Copilot CLI, l'entrée native n'enregistre rien et `.claude/settings.json` lit les deux sondages ; client ACP de Cursor sur un serveur local fictif : réponse lue, abandon, refus avant affichage, hooks antérieurs. Aucun essai interactif réel.
**Contrôle** : `tests-qua-266`
**Tests** : `packages/drwil/test/portable-polls.test.mjs`
**Origine** : limites-pendant-le-chantier — limite répondue « Traiter maintenant » le 2026-11-07 : « l'entrée native de Gemini CLI, Codex et Cursor n'aiguillait que l'attestation : les sondages `drwil-limite` et `drwil-merge` n'y étaient jamais lus, et le refus de clôture QUA-264 y aurait bloqué toute fiche d'intention nouvelle »
**Raison** : Le refus de clôture vaut pour tous les outils : sans sondage lu sous chacun, l'humain ne pouvait y répondre que par Claude Code ou Copilot CLI ; la décision reste celle de l'humain, lue par un outil (décidé par le demandeur le 2026-11-07).

## QUA-267 — Une attestation humaine attendue se propose d'abord par le sondage dans le chat, le terminal en repli
**Règle** : Livré à tout projet. Quand une attestation humaine est attendue, `drwil verify --agent` (et la sortie humaine de `verify`), le message du verdict `MANUAL` et le rappel de VERIFY de l'état, le skill `drwil`, la règle « Human gestures », la consigne de `drwil-checks`, `AGENTS.md` et le skill de lancement proposent d'abord le sondage d'attestation dans le chat (préparé par `drwil attest-poll <ID> --tried …`, posé inchangé, sans réponse, défaut ni recommandation, seul l'humain y répond), puis le terminal `drwil attest <ID>` en repli ; aucun de ces textes ne donne le terminal comme seule voie. La recette `docs/recipes/attest-a-contract.md` dit, pour chaque outil qui a un sondage (Claude Code, Copilot CLI, Gemini CLI, Codex, client ACP de Cursor), comment le préparer et le poser, puis le repli au terminal ; `AGENTS.md` et le skill de lancement y renvoient. La frontière humain/agent de QUA-235 est inchangée : l'agent prépare, il n'atteste jamais.
**Périmètre** : `packages/drwil/src/agent.ts`, `packages/drwil/src/verdict-texts.ts`, les messages et rappels d'état, les skills `drwil` et `start-a-workstream`, la consigne de `drwil-checks`, `AGENTS.md`, `docs/ia-first/5-proving-the-work.md`, `docs/ia-first/7-governance-state.md`, `docs/ia-first/8-conduct-rules.md` et la recette, livrés dans le gabarit ; pas la détection de l'outil qui lance `verify` (les deux voies sont toujours données).
**Source de vérité** : `packages/drwil/src/agent.ts` (`ATTEST_STEPS`), `packages/drwil/templates/common/base/docs/recipes/attest-a-contract.md`.
**Preuve** : tests en dur : sortie réelle de `verify --agent` et de `verify` sur un projet installé par `init` avec un contrat `MANUAL` fictif ; messages et rappel de l'état du gabarit ; textes livrés par `init` en français et en anglais (skills, règles, consigne de `drwil-checks`, `AGENTS.md` de 100 lignes au plus, documents de preuve et d'état) ; recette livrée égale au gabarit, une ligne par outil avec sa préparation et son sondage. Dans chaque texte, la préparation `drwil attest-poll` précède la commande `drwil attest <ID>`.
**Contrôle** : `tests-qua-267`
**Tests** : `packages/drwil/test/attest-guidance.test.mjs`
**Origine** : attestation-par-sondage-d-abord — six attestations faites au terminal le 2026-11-06 faute d'un texte qui propose le sondage.
**Raison** : Le demandeur veut que le sondage d'abord soit une règle du kit, pas une mémoire de l'agent (décidé le 2026-11-06) ; preuve par un test en dur, pas une attestation de lisibilité.

## QUA-268 — Avec des OS exigés, la release et la promotion attendent leur CI verte sur le commit visé
**Règle** : Livré à tout projet avec le module de release (optionnel). Avec `release.requiredOs` renseigné dans `.drwil/ia-first.json` (libellés de runner, par exemple `ubuntu-latest`), `node .githooks/create-release.mjs` (release directe ou `--candidate`) et `node .githooks/promote-release.mjs` refusent, sans tag ni release, tant qu'un OS exigé n'a pas de job de CI réussi qui a réellement lancé ses étapes de test sur le commit visé (HEAD, ou le commit de la candidate), et disent lesquels et la commande qui lance le workflow à la main ; `--dry-run` le dit sans refuser. Un job réussi dont la plupart des étapes propres ont été sautées ne compte jamais comme OS testé, ni pour la barrière ni dans la fiche de recette (« OS testés par la CI »). `gh` indisponible ou CI illisible : refus qui le dit, jamais une release devinée verte (QUA-013). Un réglage qui n'est pas une liste de libellés est refusé. Absent ou vide (défaut livré), la release est inchangée et la CI n'est pas lue ; une installation ou une mise à jour du kit ne l'ajoute jamais.
**Périmètre** : `.githooks/acceptance-sheet.mjs` (`ciGate`, `testedOs`, `testedJob`), `.githooks/create-release.mjs`, `.githooks/promote-release.mjs` ; module optionnel livré dans le gabarit (`templates/common/optional/create-release/`) ; `packages/drwil/src/config-write.ts` (réglage `release` jamais complété).
**Source de vérité** : `.githooks/acceptance-sheet.mjs` (`ciGate`).
**Preuve** : tests en dur : barrière sur des réponses `gh` simulées (OS manquant, étapes sautées, CI illisible, réglage invalide, `--dry-run`, réglage absent sans lecture de la CI) ; release directe et candidate sur un vrai dépôt git temporaire (origin nu local, gh et npm simulés) : refus sans tag, création une fois les trois OS verts ; promotion refusée puis faite ; installation et réinstallation par `init` sans le réglage, réglage du projet gardé.
**Contrôle** : `tests-qua-268`
**Tests** : `.githooks/acceptance-sheet.test.mjs`, `.githooks/create-release.test.mjs`, `.githooks/promote-release.test.mjs`, `packages/drwil/test/config-write.test.mjs`
**Origine** : ci-multi-os-a-la-release — « Avec le réglage des OS exigés renseigné dans `.drwil/ia-first.json`, `.githooks/create-release.mjs` (création directe ou candidate) et `.githooks/promote-release.mjs` refusent, sans rien créer, tant qu'un OS exigé n'a pas réellement lancé la suite avec succès sur le commit visé »
**Raison** : Windows et macOS ne sont plus testés à chaque PR (QUA-045) : sans barrière, une release que Windows casserait partirait sans que personne ne l'ait vue (décidé le 2026-11-07, sondage « Barrière »).
