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
(`docs/ia-first.md`, règle de validité).
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
**Raison** : Principe de défense en profondeur.

## QUA-013 — Contrôle non exécuté n'est pas passé
**Règle** : Un contrôle qui n'a pas tourné n'est pas un contrôle passé. La règle vaut aussi pour les critères d'acceptation, ceux de la fiche active comme ceux des fiches de preuve de clôture : une preuve absente, périmée ou non rejouée ne vaut jamais un succès, en local comme en CI. Le verdict d'un contrôle joué par `run-checks` sur un arbre et une configuration identiques (QUA-140), ou, pour une itération, sur les seuls fichiers du contrôle identiques (QUA-141, QUA-152 au pre-push), est une exécution du contrôle sur ce même code, pas une preuve périmée ; tout autre verdict repris reste un échec.
**Périmètre** : Tout contrôle listé dans les vérifs, et tout critère d'acceptation jugé par `drwil verify`.
**Source de vérité** : `.githooks/run-checks.mjs` (moteur `.githooks/engine.mjs`) et son historique d'exécution, `packages/drwil/src/closure.ts` pour les critères.
**Preuve** : Sortie lue du contrôle concerné.
**Contrôle** : `ci-coverage`, `tests-qua-013`
**Manuel** : lecture de la sortie du contrôle concerné.
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
**Source de vérité** : `docs/ia-first.md` (section 7).
**Preuve** : `.githooks/check-docs.mjs` (hook + CI) ; justesse du contenu : humaine.
**Contrôle** : `docs-references`, `tests-qua-015`
**Manuel** : justesse du contenu des fiches.
**Tests** : `packages/drwil/test/kit.test.mjs`
**Raison** : Un agent reprend un chantier à froid sans refaire le travail ni trancher à la place du demandeur.

## QUA-016 — Rappel de cadrage
**Règle** : Tout fichier de code indexé est couvert par le bloc `scope` d'une fiche de `docs/projects/` ; un bloc mal formé (sans `files:`, motif trop large) est refusé. Sévérité réglable par projet (`.drwil/ia-first.json` -> `cadrage` : `blocking` par défaut et sur ce dépôt, `warning`, ou `off`). Hors réglage `blocking`, ce contrat n'est pas prouvé : lui ajouter un champ Manuel.
**Périmètre** : Tout le dépôt (fichiers indexés), hors `docs/` et le markdown.
**Source de vérité** : `.githooks/scope.mjs`, `docs/ia-first.md` (section 7).
**Preuve** : `.githooks/check-docs.mjs` (hook + CI, sévérité selon le réglage) ; refus avant écriture côté agent : `.claude/hooks/scope-reminder.mjs`.
**Contrôle** : `docs-references`, `tests-qua-016`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Raison** : Du code détaché de tout chantier ne se retrouve plus.

## QUA-017 — Pas de travail direct sur la branche principale
**Règle** : Commiter ou pousser directement sur la branche principale (`master`/`main`) est refusé, y compris le tout premier commit d'un dépôt. Le travail doit passer par une branche (`docs/recipes/working-with-branches.md`) fusionnée ensuite via une pull/merge request. `init()` crée et bascule systématiquement sur une branche de travail (`chantier/installation-kit`) juste après `git init`, avant tout commit : personne n'a donc jamais besoin de commiter sur la branche principale, même au bootstrap. Au commit, la branche courante est jugée (c'est là que le commit atterrit) ; au push, la référence distante poussée est jugée, pas la branche courante (entrée standard du hook `pre-push`) : pousser `recette/vX.Y.Z` depuis `master` passe, pousser vers `refs/heads/master` (ou `main`) est refusé d'où qu'on pousse. Pas de porte de sortie configurable (contrairement à QUA-016). Ce contrôle ne tourne jamais en CI (`process.env.CI`) : la CI s'exécute aussi sur la branche principale après un merge légitime, qu'il ne faut pas bloquer rétroactivement.
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
**Raison** : Un changement fait sans clarifier le périmètre risque de fuiter du dogfood vers le gabarit exporté (ou l'inverse), comme déjà vu pour le job CI de release (dogfood-only, pas destiné au gabarit).

## QUA-019 — Pas de contournement d'un contrôle
**Règle** : Un contrôle bloquant (test, hook, CI) n'est jamais désactivé, sauté (`--no-verify`, skip, flag d'exception) ni contourné pour faire avancer une tâche. S'il semble mal calibré pour un cas légitime, le signaler et proposer une correction du contrôle lui-même (ou ouvrir une fiche de décision), jamais le désactiver en silence.
**Périmètre** : Tout contrôle de `.githooks/`, toute CI, tout test.
**Source de vérité** : Ce contrat (rappelé dans `AGENTS.md`).
**Preuve** : Humaine — un contournement laisse rarement une trace automatisable (voir `catalogue:QUA-009` pour le cas outillable d'un test désactivé).
**Manuel** : un contournement laisse rarement une trace automatisable.
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
**Règle** : Une attestation (version 3) couvre la part humaine d'un contrat (règle, champ Manuel, sévérité, motifs du champ Couvre ; toute la section pour un contrat historique en tableau), séparément la définition de chaque contrôle attesté et l'empreinte du contenu des fichiers du champ Couvre (QUA-081) : un contrôle ajouté ensuite ne la rend pas obsolète (il doit passer), un changement de la part humaine, un contrôle attesté retiré ou redéfini ou un fichier couvert changé, si. Une attestation version 2 reste jugée sans couverture, une version 1 par son ancienne empreinte. `drwil attest` annonce chaque contrôle qu'il relance, puis son résultat, avant le résumé et la question.
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
**Règle** : À la clôture d'un chantier, chaque limite non traitée devient une fiche d'intention (`docs/intentions/`, jamais une fiche de chantier : l'agent peut l'écrire seul, la recadrer reste une décision du demandeur), listée dans l'index en `[décision]` et citée par le journal ; l'intention d'origine, nommée par le champ `**Intention**` de la fiche, est mise à jour, ou résumée au journal et retirée si elle est entièrement couverte. Le rappel de l'activité CLOSING et la recette le disent ; le commit qui supprime une fiche sans toucher son intention reçoit un avertissement, sans blocage ; la clôture, elle, le refuse (QUA-074). Une intention dont la dernière revue datée (Statut, « Revu le … », « Existant » daté) a 30 jours ou plus est signalée par un avertissement non bloquant.
**Périmètre** : `AGENTS.md`, la recette des branches (section « Closing »), `.githooks/state-texts.mjs`, `.githooks/briefs.mjs`, `.githooks/run-checks.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/briefs.mjs` (`briefIntent`, `intentsLeftBehind`, `lastReview`, `staleIntents`), `.githooks/state-texts.mjs`.
**Preuve** : tests des hooks.
**Contrôle** : `tests-qua-036`
**Tests** : `.githooks/state.test.mjs`, `.githooks/run-checks.test.mjs`
**Origine** : la clôture boucle les intentions — « À la clôture, le rappel d'activité et la recette demandent de consigner chaque limite non traitée en fiche d'intention »
**Raison** : Deux intentions réalisées étaient restées ouvertes plusieurs jours et cinq autres disaient faux ; le 2026-10-16, ce bouclage a été fait à la main à chaque clôture.

## QUA-037 — Une file de chantiers décidée d'un geste
**Règle** : Un seul sondage de lancement à choix multiple, lu par le hook et jamais par l'agent, enregistre une file ordonnée de fiches et la fusion automatique (seconde question `drwil-merge` sous Claude Code, second champ du même nom sous Copilot CLI ; sans cette réponse, jamais de fusion programmée par l'agent) ; seule une fiche prête (maturité « prêt », aucune `[décision]` ouverte, critères d'acceptation) peut y entrer, sinon le lancement entier est refusé. La file reste après une clôture ; l'agent lance seul la tête de file (`node .githooks/state.mjs next`), avec la fusion décidée, et jamais une fiche hors de la file ; tout autre retour en SCOPING, ou `node .githooks/state.mjs queue stop`, l'abandonne. La skill de lancement, le rappel d'état et `AGENTS.md` disent d'attendre la fusion avant la suivante, de s'arrêter au premier chantier qui demande un humain, et de rendre un compte rendu par chantier et un bilan de file. Avec Claude Code, chaque chantier d'une file se mène dans un sous-agent (contexte neuf) dont la consigne commence par lire l'état ; la session principale ne garde que les comptes rendus. Mode séquentiel (défaut : réponse « File séquentielle » ou sondage sans question `drwil-parallel`) : un chantier à la fois, dans le dossier du dépôt (jamais une copie isolée) ; la session suit la PR par `gh` jusqu'à la fusion, 30 minutes au plus, et ne lance jamais de suivante sur une fusion non faite. Mode parallèle (réponse « File en parallèle », QUA-147) : chaque chantier se mène dans un sous-agent dont le dossier de travail est son worktree (jamais `isolation: "worktree"`), jusqu'à N à la fois ; la session suit chaque PR jusqu'à la fusion (30 minutes au plus chacune) ; un chantier qui demande un humain (attestation, FAIL non corrigé, CI rouge, décision) n'interrompt pas ceux qui tournent, et le bilan de file dit l'état de chacun ; en cas de conflit de clôture sur l'index ou le journal, le sous-agent rebase et résout seul (QUA-148, QUA-149). Une file reprise dans une nouvelle session (état en SCOPING avec une file) attend le oui explicite de l'humain avant `next`. Chaque chantier, en file ou non, se mène dans un sous-agent sous Claude Code et sous Copilot CLI (outil `task`). Depuis CLOSING, `start` et `next` ramènent seuls en SCOPING quand la fiche active est supprimée et que la PR de clôture est fusionnée (branche principale courante, ou branche fusionnée selon git ou `gh`) ; sinon le lancement est refusé et l'état reste CLOSING. Hors file, le rappel de clôture fait proposer `/clear` avant la prochaine demande.
**Périmètre** : l'état de gouvernance (`.githooks/state.mjs`, `.githooks/state-cli.mjs`, `.githooks/briefs.mjs`), le hook de sondage (`.claude/hooks/prompt-hook.mjs`), la skill `/drwil-start` ; livré dans le gabarit.
**Source de vérité** : `.githooks/state.mjs` (`start`, `stopQueue`), `.githooks/briefs.mjs` (`queueable`).
**Preuve** : tests des hooks et du paquet.
**Contrôle** : `tests-qua-037`
**Tests** : `.githooks/state.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : enchaîner plusieurs chantiers sans intervention — « Un seul sondage /drwil-start à choix multiple enregistre une file ordonnée de fiches et la fusion automatique »
**Raison** : Chaque chantier exigeait un sondage et une autorisation de fusion, même quand rien n'était à trancher : l'humain devait revenir entre deux chantiers. Premier pas vers l'intention « fabrique autonome ».

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

## QUA-045 — Windows et macOS testés avant la fusion de tout code
**Règle** : Propre au dépôt drwil (QUA-018). La suite du kit (`kit-tests`) tourne sur Ubuntu, Windows et macOS sur toute PR qui touche du code et à chaque push sur master ; sur une PR qui ne touche que `docs/**` et `.drwil/usage.jsonl`, Windows et macOS sont rapportés sous leur nom exigé mais sautent leurs étapes en le disant (notice), Ubuntu teste toujours. Un push sur une autre branche ne rapporte qu'Ubuntu : Windows et macOS une seule fois par push. « Code touché » se lit sur tout le diff de la PR ; un diff illisible fait échouer le calcul, jamais une matrice devinée (QUA-013).
**Périmètre** : `.github/workflows/ia-first.yml` (jobs `matrice-os` et `kit-tests`), `.github/scripts/ci-multi-os.mjs`.
**Source de vérité** : `.github/scripts/ci-multi-os.mjs` (fonction `matrice`).
**Preuve** : tests du calcul et du workflow qui s'en sert.
**Contrôle** : `tests-qua-045`
**Tests** : `.github/scripts/ci-multi-os.test.mjs`
**Origine** : Windows et macOS testés seulement quand une PR touche du code — « Toute PR de code, et chaque push sur master, fait tourner la suite du kit sur Ubuntu, Windows et macOS ; Windows et macOS une seule fois par push »
**Raison** : Une PR de documentation attendait Windows (5 à 8 minutes) et macOS pour rien, deux fois par push ; tester à chaque PR de code désigne tout de suite le changement en cause d'un échec propre à un OS.

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
**Règle** : Livré à tout projet. En CLOSING, `node .githooks/close.mjs` supprime la fiche active, retire sa ligne de l'index et consigne la consommation du chantier ; il ne commite, ne pousse, ne fusionne rien et n'écrit pas l'état. Il signale, avant le commit, ce qui ferait échouer la clôture : critère encore « contrat à créer » (avec l'ID à écrire), références à la fiche qui deviendraient mortes, noms de fichiers sans chemin dans les documents modifiés ; les mêmes signaux sont donnés par `--check` (sans rien écrire) et au passage de BUILD à EVIDENCE, tant que le code peut encore changer. Au lancement du chantier suivant, les branches locales déjà fusionnées dans la branche principale sont supprimées (`git branch -d`) — jamais la branche principale, la courante, une branche encore au sommet de la principale ni une branche non fusionnée.
**Périmètre** : `.githooks/close.mjs` (commande de clôture), `.githooks/close-branches.mjs` (suppression des branches fusionnées, exports repris par `.githooks/close.mjs`), `.githooks/state.mjs` (`start`, `move`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/close.mjs`, `.githooks/close-branches.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (fusions, branches, journaux de session).
**Contrôle** : `tests-qua-048`
**Manuel** : un essai réel d'une clôture depuis BUILD, en suivant seulement les messages, aboutit sans lire le code, sous Copilot CLI ou en terminal ; l'essai sous Claude Code est reporté (attestation humaine : `drwil attest QUA-048`).
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
**Règle** : Livré à tout projet. En BUILD, un défaut préalable hors du cadrage de la fiche active se corrige par un détour, que l'agent ouvre seul : `node .githooks/detour.mjs open <nom> --title <défaut>` met le travail en cours de côté (stash nommé, enregistré dans l'état, jamais à la main), crée la branche `detour/<nom>` depuis la branche principale (distante si elle existe) et sa fiche courte (la correction et son test), et pointe l'état sur elle ; le cadrage de la fiche d'origine ne s'élargit jamais. La PR du détour est intitulée « Détour de <fiche> », au mode de fusion décidé au lancement, et porte son entrée de journal et la suppression de sa fiche. `node .githooks/detour.mjs resume` n'accepte qu'un arbre propre et une PR fusionnée (fiche retirée, journal qui cite la branche) : il revient sur la branche du chantier, la rebase sur la branche principale corrigée (un commit rejoué garde son trailer `Drwil-Brief`), restaure le travail et remet l'état en BUILD sur la fiche d'origine ; toute étape qui échoue est refusée sans rien perdre (état inchangé, mise de côté intacte). Pendant un détour, aucune transition sauf l'abandon en SCOPING. Un détour qui change les règles du jeu (contrat existant du registre modifié ou retiré, hook, seuil, barrière, CI) voit ses commits refusés par la barrière de périmètre jusqu'au oui de l'humain ; un ajout pur au registre (nouveaux contrats, d'ID jamais définis, chaque bloc existant, préambule compris, gardé mot pour mot, jugé sur le contenu indexé contre HEAD) passe sans ce oui, et dans le doute (registre créé ou retiré, titre répété, section qui n'est pas un contrat) le oui reste demandé (`node .githooks/detour.mjs allow`, terminal interactif seulement) ; en file, le sous-agent s'arrête.
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
**Tests** : `outils/banc-agents.test.mjs`
**Origine** : compatibilité des agents, le socle commun (0.6.7) — « Le banc installe drwil dans un projet temporaire en SCOPING, lance l'agent demandé en mode non interactif avec une consigne d'écriture de code, et rend pour chaque outil : hooks lancés ou non, écriture refusée ou acceptée, rappel d'état reçu ou non ; un outil absent du poste est signalé « non testé », jamais « conforme » »
**Raison** : Sous Copilot CLI et Gemini CLI, essais du 2026-10-18 : rien n'arrêtait l'écriture de code hors chantier, sans que rien ne le signale ; sans preuve par outil réel, une simulation en CI ne dit pas que l'outil lance le hook.

## QUA-061 — En SCOPING, une intention se cadre, une demande de réalisation se code
**Règle** : Livré à tout projet. `AGENTS.md` dit qu'en SCOPING un besoin exprimé par l'humain se cadre (intention ou fiche) et ne se code pas, et qu'en cas de doute l'agent demande « intention ou demande de réalisation ? » avant d'agir. La règle est dans `AGENTS.md`, lu par tous les outils (consigne seulement : elle ne remplace pas le blocage par hook, QUA-060).
**Périmètre** : `AGENTS.md`, `docs/ia-first.md` (section 8) ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/AGENTS.md`, `packages/drwil/templates/common/base/docs/ia-first.md` (section 8).
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
**Règle** : Livré à tout projet. `docs/ia-first.md` porte une matrice qui donne, pour chaque outil (Claude Code, Copilot CLI, Gemini CLI, Codex, Cursor), les hooks lancés, l'écriture en SCOPING, le rappel d'état, la date et la version de l'essai, et l'attestation humaine ; un outil jamais essayé y est « not tested », jamais « tenu ».
**Périmètre** : `docs/ia-first.md` ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/docs/ia-first.md` (section « Tool compatibility matrix »).
**Preuve** : test qui lit la matrice : une ligne par outil, date et version si essayé, « not tested » sinon.
**Contrôle** : `tests-qua-063`
**Manuel** : l'attestation de chaque ligne par l'humain (colonne « Attested by the human »), après un essai du banc sur son poste.
**Tests** : `outils/banc-agents.test.mjs`
**Origine** : compatibilité des agents, le socle commun (0.6.7) — « La matrice de compatibilité (`docs/ia-first.md`) donne, outil par outil, ce qui est réellement tenu, et sa date d'essai »
**Raison** : Dire qu'un outil est compatible sans l'avoir mesuré est la même erreur qu'une doc fausse : la matrice est remplie par le banc, pas par la mémoire de l'agent.

## QUA-064 — Choisir Copilot installe aussi l'arbre `.claude` et les hooks natifs de Copilot
**Règle** : Livré à tout projet. Quand `copilot` est parmi les outils, `drwil init` installe aussi `.claude/` (réglages, hooks, skills) — Copilot CLI le lit lui-même, ce qui lui donne le blocage d'écriture (QUA-016) et les commandes `/drwil-*` — et les hooks natifs de Copilot (dossier .github/hooks), qui donnent l'état au démarrage de session et le rappel d'état à chaque message. Le pointeur `CLAUDE.md` reste lié au seul outil `claude`.
**Périmètre** : `packages/drwil/src/config.ts` (`usesClaudeTree`), `packages/drwil/src/render.ts`, `packages/drwil/src/drift.ts`, `packages/drwil/src/essentials.ts` ; `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json`.
**Source de vérité** : `packages/drwil/src/config.ts` (`usesClaudeTree`).
**Preuve** : test du paquet qui installe un projet avec le seul outil `copilot` et y trouve les hooks, les réglages, les skills et les hooks natifs, sans `CLAUDE.md`.
**Contrôle** : `tests-qua-064`
**Manuel** : un `/drwil-start` tapé dans Copilot CLI interactif lance un chantier (le banc ne lance que le mode non interactif).
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
**Règle** : La couverture de test ne descend pas sous le seuil déclaré pour chaque périmètre : `packages/drwil` à 89 % lignes, 81 % branches, 91 % fonctions (relevé le 2026-10-11 aux chiffres mesurés ; un seuil ne redescend jamais, cible 100 % — voir `docs/projects/adopter-seuil-couverture.md`) ; hooks de gouvernance (`.githooks/*.mjs`) à 100 % lignes, branches, fonctions et instructions (voir `docs/projects/journal.md`, 2026-10-11).
**Périmètre** : `packages/drwil` (code du générateur) et `.githooks/*.mjs` (hooks de ce dépôt, mesurés avec leurs tests `.githooks/*.test.mjs`).
**Source de vérité** : `packages/drwil/package.json` (script `test:coverage`) et `package.json` (script `test:hooks:coverage`), options `c8`.
**Preuve** : Hook + CI (`.drwil/ia-first.json` → `checks`, job `checks`).
**Contrôle** : `couverture-tests`, `couverture-hooks`
**Raison** : Sans seuil vérifié, la couverture peut régresser silencieusement à chaque ajout de code.

## QUA-001 — Fichier de code plafonné
**Règle** : Un fichier de code ne dépasse pas 200 lignes, tests exclus ; un fichier déjà au-dessus au 2026-10-27 est plafonné à sa taille mesurée ce jour-là et ne peut que maigrir (`.githooks/check-file-size.legacy.json`). Le livrable propose 200 lignes à l'adoption (recette d'adoption, catalogue, exemple du script) ; le défaut du script livré reste 400 sans plafond donné, pour ne casser aucun projet déjà adopté.
**Périmètre** : `packages/drwil/src/` (fichiers ts), `packages/drwil/bin/` (fichiers js), `.githooks/` et `outils/` (fichiers mjs).
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
**Tests** : `.githooks/state.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : compatibilité des agents, volet Gemini (0.6.7) — « Gemini CLI reçoit le rappel d'état au démarrage et à chaque message »
**Raison** : `.githooks/state.mjs` imprimait du texte brut et `scope-reminder` rendait le format de Claude Code (`permissionDecision`), que Gemini ignore ; sans le format natif, ni refus ni rappel n'arrivent.

## QUA-068 — Le lancement d'un chantier sous Gemini est dit clairement dans la matrice
**Règle** : Livré à tout projet. Gemini CLI n'a pas de commande `/drwil-start` ici : la matrice de `docs/ia-first.md` dit qu'un chantier s'y lance par `node .githooks/state.mjs start` dans un terminal interactif (décision humaine), puis que l'on travaille dans Gemini.
**Périmètre** : `docs/ia-first.md` ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/docs/ia-first.md` (section « Tool compatibility matrix »).
**Preuve** : test qui lit la matrice et y trouve la commande de lancement pour Gemini.
**Contrôle** : `tests-qua-068`
**Tests** : `outils/banc-agents.test.mjs`
**Origine** : compatibilité des agents, volet Gemini (0.6.7) — « Un chantier se lance depuis Gemini CLI : par son sondage s'il en a un, sinon par `node .githooks/state.mjs start` dans un terminal, dit clairement dans la matrice »
**Raison** : Sans cette consigne, l'utilisateur de Gemini ne sait pas comment passer en BUILD, et l'agent ne peut pas le faire à sa place (décision humaine).

## QUA-069 — Copilot CLI enchaîne deux chantiers d'un seul sondage, essai réel attesté
**Règle** : Un essai sous Copilot CLI réel, fait par l'humain, enchaîne deux fiches prêtes lancées d'un seul sondage (champ `drwil-merge` compris), mène chaque chantier dans un sous-agent qui porte les hooks et l'état, et s'arrête au premier blocage humain.
**Périmètre** : le sondage de lancement, l'état de gouvernance et la skill `/drwil-start` sous Copilot CLI ; l'essai se fait sur le poste de l'humain.
**Source de vérité** : `docs/ia-first.md` (matrice de compatibilité, ligne Copilot CLI).
**Preuve** : attestation humaine de l'essai, avec la version de Copilot CLI et la date.
**Manuel** : l'essai lui-même, que seul l'humain peut faire et attester (`drwil attest QUA-069`).
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
**Règle** : Livré à tout projet. `node .githooks/close.mjs` (en CLOSING) et `--check` (à tout moment) refusent, dans le même message que les autres signaux de clôture (QUA-048) et sans empiler le chemin restant jusqu'à CLOSING (QUA-073), toute incohérence de l'index et des fiches, sur tout l'index à chaque clôture : une case cochée ou ouverte qui contredit le statut de la fiche citée (QUA-015), un commentaire de fichier de code, modifié ou non, qui cite une fiche de chantier (QUA-049), une fiche supprimée dont l'intention n'est pas touchée par la branche ni par le dossier de travail (QUA-036). Au commit, ces écarts restent des avertissements : seule la clôture refuse. La clôture ne commite, ne pousse, ne fusionne rien et n'écrit pas l'état (QUA-048) ; elle ne réécrit jamais le code.
**Périmètre** : `.githooks/close.mjs` (`closingReport`), `.githooks/doc-coherence.mjs` ; livrés dans le gabarit.
**Source de vérité** : `.githooks/close.mjs` (`closingReport`), `.githooks/doc-coherence.mjs` (`checkboxProblems`, `codeCitations`, `intentLeft`).
**Preuve** : tests des hooks sur de vrais dépôts git temporaires : index et fiches incohérents refusés en un seul message, rien écrit sans `--fix`.
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

## QUA-079 — Une version publiée sans candidate reçoit quand même sa note, « sans verdict »
**Règle** : Livré à tout projet avec le module de release (optionnel). `node .githooks/create-release.mjs` (sans `--candidate`) écrit, après le tag et la release, la note de la version par le même module (QUA-078) : la mention « sans verdict — version publiée sans candidate ni verdict de recette ; à compléter par l'humain », les empreintes des tarballs, les changements depuis le dernier tag et une partie « à compléter » (ce qui a été validé, par qui, quand). Elle arrive par la même branche dédiée et la même PR ; `--dry-run` la montre sans rien écrire.
**Périmètre** : `.githooks/recette-note.mjs`, `.githooks/create-release.mjs` ; module optionnel livré dans le gabarit.
**Source de vérité** : `.githooks/recette-note.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (origin nu local, gh et npm simulés) : la note « sans verdict » en français et en anglais, la release directe qui la propose, `--dry-run`.
**Contrôle** : `tests-qua-079`
**Tests** : `.githooks/recette-note.test.mjs`, `.githooks/create-release.test.mjs`
**Origine** : note de recette par version — « Une version publiée sans candidate ni verdict reçoit quand même sa note, générée avec la mention « sans verdict », à compléter par l'humain »
**Raison** : La note reste obligatoire à chaque version : une version sans recette doit le dire plutôt que laisser un trou.

## QUA-080 — Le tag et la release publiés ne dépendent jamais de la PR de la note
**Règle** : Livré à tout projet avec le module de release (optionnel). Le tag et la release GitHub sont publiés avant la note et ne dépendent pas d'elle : si la branche, la PR ou l'écriture de la note échoue, la promotion (QUA-054) comme la création directe d'une release (QUA-079) le disent, avec la commande de rattrapage (`node .githooks/recette-note.mjs vX.Y.Z <fichier de la note>`, ou `gh pr create` quand seule la PR a échoué), sans défaire ce qui est publié ; la note est gardée dans un fichier. Une branche de note déjà poussée n'est jamais écrasée.
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
**Règle** : Livré à tout projet. Un contrat à partie humaine sans champ `**Couvre**` est signalé par `drwil verify` (ligne du contrat) et `drwil doctor` (avertissement), sans faire tomber son attestation existante. Une attestation de version 1 ou 2 reste lisible et valide telle quelle, sans réattestation forcée ; la première réattestation passe à la version 3.
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
**Périmètre** : gabarits `AGENTS.md`, `docs/ia-first.md` (section 8) et skill `start-a-workstream`.
**Source de vérité** : `packages/drwil/templates/common/base/AGENTS.md`, `packages/drwil/templates/common/base/docs/ia-first.md` (section 8), `packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md`.
**Preuve** : test du paquet sur les gabarits livrés.
**Contrôle** : `tests-qua-099`
**Tests** : `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Une PR qui ne touche que de la documentation est mise en fusion automatique par l'agent sans poser la question `drwil-merge` ; le sondage ne garde la question que pour les PR qui touchent du code. Le dépôt doit autoriser l'auto-merge, sinon le message de refus existant s'applique »
**Raison** : Poser la question de fusion pour une PR de documentation seule coûtait un geste humain sans enjeu.

## QUA-100 — Le suivi de la CI d'une PR dit verte, fusionnée ou rouge, jamais « verte » sans l'avoir vu
**Règle** : Livré à tout projet. `node .githooks/pr-watch.mjs [<n>]` suit la CI d'une PR par `gh` jusqu'à la fin de ses contrôles (30 minutes au plus) et dit « verte », « fusionnée » ou « rouge » avec les contrôles en échec (codes 0, 0, 1) ; sans `gh` joignable, sans contrôle ou après le délai, le suivi est « non exécuté » (code 2), jamais « verte » (QUA-013). `AGENTS.md` consigne de le lancer après chaque push ou création de PR, et de corriger une CI rouge sans la contourner (QUA-019).
**Périmètre** : `.githooks/pr-watch.mjs` ; consigne d'`AGENTS.md` et son texte complet (`docs/ia-first.md`, section 8).
**Source de vérité** : `.githooks/pr-watch.mjs`.
**Preuve** : tests des hooks (gh simulé, attente, délai, ligne de commande) et du paquet (consigne livrée).
**Contrôle** : `tests-qua-100`
**Tests** : `.githooks/pr-watch.test.mjs`, `packages/drwil/test/guarantees.test.mjs`
**Origine** : garanties obligatoires à l'adoption — « Après un push ou la création d'une PR, un script attend la fin de la CI (`gh pr checks`) et dit « verte », « fusionnée » ou « rouge » avec le contrôle en échec ; l'agent corrige l'échec sans jamais le contourner (QUA-019, pas de contournement) ; sans accès à la forge, le suivi reste « non exécuté » et le dit (QUA-013) ; script Node, valable pour tous les outils »
**Raison** : L'agent annonçait une PR prête sans avoir vu sa CI finir.

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
**Règle** : Livré à tout projet, GitHub et GitLab. Dans le job `checks` (celui que la protection exige), hors de la branche principale, la CI lance la copie de `.githooks/base-checks.mjs` lue sur la branche principale (celle de la branche contrôlée seulement tant que la principale n'en a pas, à l'adoption). Ce script lit par Git (`git show <base>:…`, dans un dossier temporaire, jamais par un second clone) les `.githooks/` de la branche principale, les pose sur la copie de travail le temps d'un `.githooks/run-checks.mjs`, avec la liste de contrôles de la branche, puis rend la copie de travail telle quelle. Il saute ce rejeu, en le disant dans sa sortie, seulement quand `.githooks/` et `.drwil/ia-first.json` de la branche sont identiques octet pour octet à ceux de la branche principale (fichiers suivis ou non) : le rejeu serait alors strictement le passage déjà fait (QUA-123). Au moindre écart, au moindre doute ou si Git ne répond pas, il rejoue en entier. Échouent : les contrôles en échec avec ces hooks (un hook affaibli ou supprimé par la branche), un contrôle de `.drwil/ia-first.json` de la branche principale absent de celui de la branche (comparé par `id`, sinon `name`, sinon `run`). Un contrôle retiré, ou un fichier de `.githooks/` gardé à sa version de la branche (son fichier de test `<nom>.test.mjs` avec lui), passe s'il est cité entre backticks en tête d'une puce de la section « Contrats modifiés » d'une fiche touchée par la branche, lue à sa dernière version (avant sa suppression à la clôture), validée par le demandeur. Branche principale inconnue ou introuvable (premier push, branche orpheline, clone superficiel), historique ou configuration illisibles : « non exécuté », code 1, jamais un succès (QUA-013) ; branche principale sans `.githooks/` (adoption) : « non applicable ». Limites assumées : une branche qui corrige un défaut d'un hook est jugée par le hook encore fautif tant que le fichier n'est pas déclaré ; une branche qui retire l'étape du workflow lui-même n'est retenue que par la relecture.
**Périmètre** : `.githooks/base-checks.mjs` ; étape du job `checks` des CI du gabarit (`ci/github`, `ci/gitlab`) et de ce dépôt.
**Source de vérité** : `.githooks/base-checks.mjs` (`replay`).
**Preuve** : tests des hooks sur des dépôts temporaires : hook affaibli refusé et rendu, hook supprimé rejoué puis absent, contrôle retiré non déclaré refusé, retrait déclaré accepté même fiche supprimée, hook déclaré gardé avec son test, rejeu sauté si hooks et configuration sont identiques à la base, base introuvable ou orpheline « non exécuté », base sans hooks « non applicable », ligne de commande ; scénario de contournement dans un projet installé ; les trois CI le lancent dans le job `checks`.
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
**Périmètre** : `.claude/agents/drwil-checks.md`, `AGENTS.md`, `docs/ia-first.md` (section 8) ; livrés dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/tools/claude/.claude/agents/drwil-checks.md`.
**Preuve** : test du paquet qui installe un projet Claude Code (sous-agent livré, commandes lancées, consigne d'`AGENTS.md`) et un projet Codex seul (pas d'arbre `.claude`, consigne présente) ; en-tête du sous-agent dans la preuve de QUA-072.
**Contrôle** : `tests-qua-129`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : reduction-contexte — « Avec Claude Code, les passages longs (`run-checks`, `drwil verify`) peuvent tourner dans un sous-agent livré (nommé `drwil-checks`, à créer dans l'arbre `.claude` du gabarit) qui ne renvoie que le verdict et les échecs ; pour les autres outils, `AGENTS.md` donne la consigne « si l'outil le permet » »
**Raison** : Les sorties des contrôles longs restaient dans le contexte de la session principale ; un sous-agent les lit dans un contexte à part et n'en rend que la conclusion.

## QUA-130 — Le sous-agent des contrôles recopie le verdict mot pour mot, sans attester ni écrire
**Règle** : Livré à tout projet. Le sous-agent `drwil-checks` recopie mot pour mot, sans reformulation ni résumé, la ligne de verdict `GOVERNANCE: …` de `drwil verify --agent` et les listes des contrats en échec, non vérifiés ou à attester (et des critères non prouvés), ainsi que les lignes d'échec de `run-checks` ; une commande qui ne tourne pas est dite « not run », jamais réussie. Ses outils sont une liste fermée sans outil d'écriture (`Bash`, `Read`, `Grep`, `Glob`) ; il n'exécute jamais `drwil attest` ni le verdict de recette (`drwil attest` exige de toute façon un terminal interactif et la saisie de l'ID). `AGENTS.md` dit que la session principale n'annonce « vérifié » que sur la ligne recopiée.
**Périmètre** : `.claude/agents/drwil-checks.md`, `AGENTS.md`, `docs/ia-first.md` (section 8) ; livrés dans le gabarit.
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
**Périmètre** : `.claude/hooks/read-guard.mjs`, `.claude/hooks/bash-guard.mjs`, `.claude/settings.json`, `AGENTS.md`, `docs/ia-first.md` (section 8) ; livrés dans le gabarit.
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
**Règle** : Livré à tout projet. `node .githooks/close.mjs` (`--check`, à tout moment), le passage de BUILD à EVIDENCE et la clôture nomment chaque fichier de `.githooks/` que la branche modifie ou supprime (copie de travail comparée à sa base de fusion avec la branche principale : `DRWIL_BASE`, `origin/HEAD`, `origin/master`, `origin/main`, `master` puis `main`) sans qu'il soit cité entre backticks en tête d'une puce de la section « Contrats modifiés » d'une fiche touchée par la branche — même règle que le rejeu par la branche principale (QUA-113) : la fiche lue à sa dernière version, avant sa suppression à la clôture, ou telle qu'elle est dans la copie de travail pour la fiche active ; un fichier de test `<nom>.test.mjs` suit la déclaration de son module ; un fichier ajouté par la branche ne compte pas. Chaque message donne la puce à écrire et rappelle que déclarer un hook change les règles du jeu : la puce s'écrit sur le oui du demandeur. La clôture est refusée tant qu'il en reste, avant toute écriture (ni preuve, ni fiche supprimée, ni index touché). Branche principale introuvable ou historique illisible : « non exécuté », dit et compté parmi ce qui ferait échouer la clôture, jamais un succès (QUA-013) ; sans `.githooks/`, rien à comparer.
**Périmètre** : `.githooks/base-checks.mjs` (`undeclaredHooks`), `.githooks/close.mjs` (`closingReport`, `close`) ; livrés dans le gabarit.
**Source de vérité** : `.githooks/base-checks.mjs` (`undeclaredHooks`).
**Preuve** : tests sur de vrais dépôts git temporaires : hook modifié ou supprimé non déclaré nommé avec sa puce, fichier ajouté ignoré, hook déclaré par une fiche commitée, supprimée à la clôture ou pas encore commitée, test qui suit son module, branche principale introuvable ou orpheline « non exécuté », sans `.githooks/`, en anglais ; signal à `--check` et au passage à EVIDENCE, clôture refusée sans rien écrire puis acceptée une fois déclaré.
**Contrôle** : `tests-qua-137`
**Tests** : `.githooks/base-checks.test.mjs`, `.githooks/close.test.mjs`
**Origine** : hooks-declares-et-scoping-apres-ci — « `node .githooks/close.mjs` (clôture, `--check` et passage de BUILD à EVIDENCE) signale chaque fichier de `.githooks/` modifié par la branche et absent des « Contrats modifiés » de ses fiches, nomme la puce à écrire et rappelle qu'elle demande le oui du demandeur ; la clôture est refusée tant qu'il en reste ; sans branche principale lisible, le signal est « non exécuté » et le dit, jamais un succès »
**Raison** : Un hook modifié sans déclaration n'était vu qu'en CI, par le rejeu QUA-113 qui remet sa version de la branche principale et fait échouer les contrôles (PR #220, PR #232) : chaque fois corrigé dans la fiche après coup, jamais à la cause.

## QUA-138 — Avec la fusion automatique, le retour en SCOPING attend la fusion de la PR
**Règle** : Livré à tout projet. Quand la fusion automatique est autorisée au lancement, la procédure donnée par l'état (`.githooks/state-texts.mjs`, `autoMerge`, en français et en anglais) et le skill de lancement disent, dans cet ordre : programmer la fusion, vérifier qu'elle est programmée, suivre la PR par `node .githooks/pr-watch.mjs <numéro>` (relancé tant qu'il dit « verte » sans « fusionnée », 30 minutes au plus en tout), et seulement la PR fusionnée revenir en SCOPING ; CI rouge avant la fusion : rester en CLOSING et `node .githooks/state.mjs reopen` (QUA-116) ; délai dépassé ou autre échec : rester en CLOSING et le signaler. `reopen` reste réservé à CLOSING.
**Périmètre** : `.githooks/state-texts.mjs` (`autoMerge`), skill `start-a-workstream` (Claude Code) ; livrés dans le gabarit.
**Source de vérité** : `.githooks/state-texts.mjs` (`autoMerge`).
**Preuve** : test du cycle dans un projet installé : l'état en CLOSING avec la fusion automatique donne la procédure dans l'ordre, en français et en anglais, et le skill installé la reprend.
**Contrôle** : `tests-qua-138`
**Tests** : `packages/drwil/test/cycle.test.mjs`
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
**Règle** : Livré à tout projet. Un contrôle dont la déclaration porte `paths` a une empreinte propre : sa déclaration (commande, `needsBuild`) et le contenu des fichiers suivis ou non suivis, non ignorés, qui correspondent à ses `paths` (`controlFingerprints` du moteur). Hors hook, hors CI et sans `--tout-rejouer`, `run-checks` ne rejoue pas un contrôle dont le verdict précédent est « ok » sur la même empreinte de contrôle et le dit (« repris (fichiers du contrôle inchangés, run-checks du … ») ; `drwil verify` fait de même, hors `--evidence` et `reuse: false`. Un contrôle sans `paths`, déclaré `reuse: false` ou `reuse: "tree"` (qui lit plus que ses `paths`), en échec, ou dont un fichier ne se lit pas, est rejoué. L'empreinte de l'arbre entier de QUA-140 reste la règle de la preuve de clôture : `verify --evidence` ne reprend un verdict que sur un arbre identique, et un verdict repris par contrôle n'entre jamais dans l'empreinte de l'arbre (seuls les contrôles joués dans la passe y entrent). La preuve et la ligne de `--agent` disent « repris (fichiers du contrôle inchangés) … ne vaut pas preuve de clôture ». QUA-013 (un contrôle non exécuté n'est pas un succès) reste vrai : un verdict repris a tourné sur les mêmes fichiers que ceux qu'il lit.
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
**Périmètre** : `.githooks/worktree.mjs` (`launchInWorktree`) ; `docs/ia-first.md` (réglage) ; livrés dans le gabarit.
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
**Origine** : tests-de-timing-stables — « Les autres tests du dépôt qui mesurent une durée sont recensés au journal ; chacun est rendu déterministe ou passé en indicateur, ou sa conservation est justifiée »
**Raison** : Le pre-push parallèle refusait des pushs sur des tests de durée, sans défaut de code : chaque refus coûtait une passe complète et poussait à relancer à l'aveugle.

## QUA-151 — Un push ne dépend pas de la charge de la machine : cinq passes consécutives sous charge ne refusent rien
**Règle** : Cinq passes consécutives de `.githooks/run-checks.mjs` en conditions de pre-push (références poussées, contrôles en parallèle, processeurs restreints par `taskset`) ne refusent aucun push pour un test de timing ; le résultat de chaque passe est consigné à l'entrée de journal du chantier « tests de timing stables ».
**Périmètre** : `.githooks/run-checks.mjs`, `.githooks/pre-push` ; l'entrée de journal du chantier.
**Source de vérité** : `docs/projects/journal.md` (entrée « Les tests de timing ne dépendent plus de la charge de la machine »).
**Preuve** : attestation humaine : relecture du résultat consigné des cinq passes, ou rejeu par l'humain.
**Manuel** : jugement humain : la charge simulée est représentative du pre-push et les cinq passes consignées sont convaincantes.
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
