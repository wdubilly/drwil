# Contrats (source unique des invariants)

Chaque invariant est identifié par un ID unique. Ne pas les recopier ailleurs : citer l'ID.

Preuve vérifiable (DRWIL-001, fiche V0.2 close : `docs/projects/journal.md`, « Fiche close : drwil V0.2 ») :
`**Contrôle**` cite, entre backticks, l'identifiant d'un contrôle connu du
moteur (socle de `.githooks/run-checks.mjs`, ou `id` d'un contrôle de
`.drwil/ia-first.json` → `checks`) ; la commande n'est jamais recopiée ici.
`**Manuel**` décrit la partie de la preuve qui reste humaine. Au moins l'un
des deux ; un contrôle inconnu est une erreur de configuration.
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
**Règle** : Un contrôle qui n'a pas tourné n'est pas un contrôle passé.
**Périmètre** : Tout contrôle listé dans les vérifs.
**Source de vérité** : `.githooks/run-checks.mjs` (moteur `.githooks/engine.mjs`) et son historique d'exécution.
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
**Règle** : Commiter ou pousser directement sur la branche principale (`master`/`main`) est refusé, y compris le tout premier commit d'un dépôt. Le travail doit passer par une branche (`docs/recipes/working-with-branches.md`) fusionnée ensuite via une pull/merge request. `init()` crée et bascule systématiquement sur une branche de travail (`chantier/installation-kit`) juste après `git init`, avant tout commit : personne n'a donc jamais besoin de commiter sur la branche principale, même au bootstrap. Pas de porte de sortie configurable (contrairement à QUA-016). Ce contrôle ne tourne jamais en CI (`process.env.CI`) : la CI s'exécute aussi sur la branche principale après un merge légitime, qu'il ne faut pas bloquer rétroactivement.
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
**Règle** : Une attestation (version 2) couvre la part humaine d'un contrat (règle, champ Manuel, sévérité ; toute la section pour un contrat historique en tableau) et, séparément, la définition de chaque contrôle attesté : un contrôle ajouté ensuite ne la rend pas obsolète (il doit passer), un changement de la part humaine ou un contrôle attesté retiré ou redéfini, si. Une attestation version 1 reste jugée par son ancienne empreinte. `drwil attest` annonce chaque contrôle qu'il relance, puis son résultat, avant le résumé et la question.
**Périmètre** : `drwil attest`, le jugement des attestations par `drwil verify`.
**Source de vérité** : `packages/drwil/src/verify.ts` (`humanFingerprint`, `proofFingerprints`), `packages/drwil/src/attest.ts`.
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
**Règle** : Quand une fiche est active, `drwil verify` combine le jugement de ses critères d'acceptation au verdict des contrats : un critère non prouvé le fait passer à `FAIL`, ou à `MANUAL` si le seul manque est un critère de jugement humain dont le contrat attend son attestation. Les critères non prouvés sont listés dans la sortie humaine, la sortie agent et le JSON (`criteria`). Sans fiche active (CI, `drwil attest`), le verdict ne change pas.
**Périmètre** : `drwil verify` (verdict, code de sortie, sorties humaine, agent et JSON).
**Source de vérité** : `packages/drwil/src/criteria.ts` (`criteriaVerdict`), `packages/drwil/src/verify.ts`.
**Preuve** : tests du paquet.
**Contrôle** : `tests-qua-034`
**Tests** : `packages/drwil/test/cycle.test.mjs`
**Origine** : un critère non prouvé fait tomber le verdict de verify — « Un critère automatique non prouvé de la fiche active fait passer le verdict de verify à FAIL »
**Raison** : verify pouvait dire `GOVERNANCE: PASS` alors qu'un critère du chantier n'était pas prouvé ; l'agent ne le découvrait qu'à la clôture et pouvait annoncer un travail « vérifié » qui ne l'était pas.

## QUA-035 — Un cadrage complet du premier coup, un élargissement sans friction
**Règle** : Un fichier cité dans le bloc scope d'une fiche couvre aussi sa copie déclarée par le réglage `scopeMirrors` de `.drwil/ia-first.json` (paires de préfixes source → copie), pour la barrière de périmètre, le rappel de cadrage de check-docs et celui de l'agent ; sans réglage, rien ne change. `check-docs` avertit une fiche dont le cadrage cite du code sans aucun fichier de test, ou dont un critère crée un contrat sans que le cadrage cite `.drwil/ia-first.json`. Un commit qui n'indexe que de la documentation (`docs/`, Markdown) ne rejoue ni les tests des contrôles ni les contrôles du projet : ils sont signalés non exécutés, et le push comme la CI les rejouent toujours (QUA-013). Échappent au périmètre, comme les fiches et les intentions, les sorties des recettes de cadrage — découverte de valeur et audit de risques, noms exacts en français et en anglais (`OUT_OF_SCOPE`, `.githooks/scope-gate.mjs`) — : elles se commitent en SCOPING ; aucun motif large sur `docs/`.
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
**Règle** : Un seul sondage de lancement à choix multiple, lu par le hook et jamais par l'agent, enregistre une file ordonnée de fiches et la fusion automatique (seconde question `drwil-merge` sous Claude Code, second champ du même nom sous Copilot CLI ; sans cette réponse, jamais de fusion programmée par l'agent) ; seule une fiche prête (maturité « prêt », aucune `[décision]` ouverte, critères d'acceptation) peut y entrer, sinon le lancement entier est refusé. La file reste après une clôture ; l'agent lance seul la tête de file (`node .githooks/state.mjs next`), avec la fusion décidée, et jamais une fiche hors de la file ; tout autre retour en SCOPING, ou `node .githooks/state.mjs queue stop`, l'abandonne. La skill de lancement, le rappel d'état et `AGENTS.md` disent d'attendre la fusion avant la suivante, de s'arrêter au premier chantier qui demande un humain, et de rendre un compte rendu par chantier et un bilan de file. Avec Claude Code, chaque chantier d'une file se mène dans un sous-agent (contexte neuf), un à la fois, dans le dossier du dépôt (jamais une copie isolée), dont la consigne commence par lire l'état ; la session principale ne garde que les comptes rendus, suit la PR par `gh` jusqu'à la fusion, 30 minutes au plus, et ne lance jamais de suivante sur une fusion non faite. Une file reprise dans une nouvelle session (état en SCOPING avec une file) attend le oui explicite de l'humain avant `next`. Chaque chantier, en file ou non, se mène dans un sous-agent sous Claude Code et sous Copilot CLI (outil `task`). Depuis CLOSING, `start` et `next` ramènent seuls en SCOPING quand la fiche active est supprimée et que la PR de clôture est fusionnée (branche principale courante, ou branche fusionnée selon git ou `gh`) ; sinon le lancement est refusé et l'état reste CLOSING. Hors file, le rappel de clôture fait proposer `/clear` avant la prochaine demande.
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
**Règle** : Les hooks d'agent livrés (`.claude/hooks/`) prennent pour racine du projet le dossier qui contient leur `.claude/`, et le moteur d'état (`.githooks/state.mjs`) le parent de son `.githooks/` (`DRWIL_ROOT` pour les tests seulement), comme le moteur des contrôles ; la commande du glossaire, le parent du `.githooks/` par lequel elle est appelée. Jamais le dossier courant : lancés depuis un sous-dossier, ils lisent le bon état, la garde de cadrage refuse toujours un fichier de code hors fiche, et rien n'est écrit dans le sous-dossier. Appelés par un chemin qui passe par un lien symbolique, ils se lancent quand même (chemins réels comparés).
**Périmètre** : `.claude/hooks/` (sondage, garde de cadrage, glossaire), `.githooks/state.mjs`, `.githooks/glossary.mjs` ; livré dans le gabarit.
**Source de vérité** : chaque hook (constante de racine), `.githooks/state.mjs` (point d'entrée), `.githooks/glossary.mjs` (point d'entrée).
**Preuve** : tests du paquet et du moteur d'état.
**Contrôle** : `tests-qua-044`
**Tests** : `packages/drwil/test/kit.test.mjs`, `.githooks/state.test.mjs`
**Origine** : les hooks trouvent la racine du projet par l'emplacement de leur fichier — « Tous les hooks d'agent livrés, et le moteur d'état quand un hook l'appelle, prennent pour racine le dossier qui contient leur `.claude/` ou `.githooks/`, jamais le dossier courant »
**Raison** : Constaté le 2026-10-16 : après un `cd` de l'agent, le rappel lisait un état absent et créait un `.drwil` parasite ; vérifié au chantier, la garde de cadrage ne refusait plus rien depuis un sous-dossier.

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
**Périmètre** : `.githooks/close.mjs` (commande de clôture, suppression des branches fusionnées), `.githooks/state.mjs` (`start`, `move`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/close.mjs`.
**Preuve** : tests des hooks sur de vrais dépôts git temporaires (fusions, branches, journaux de session).
**Contrôle** : `tests-qua-048`
**Manuel** : un essai réel d'une clôture depuis BUILD, en suivant seulement les messages, aboutit sans lire le code, sous Copilot CLI ou en terminal ; l'essai sous Claude Code est reporté (attestation humaine : `drwil attest QUA-048`).
**Tests** : `.githooks/close.test.mjs`
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
**Périmètre** : `.githooks/close.mjs` (`mergedPullRequests`, `branchMerged`, `pruneMergedBranches`), `.githooks/detour.mjs` (`resume`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/close.mjs` (`branchMerged`).
**Preuve** : tests des hooks sur de vrais dépôts git temporaires, fusions par squash, `gh` simulé (PR au même commit, branche allée plus loin, PR d'un autre commit).
**Contrôle** : `tests-qua-058`
**Tests** : `.githooks/close.test.mjs`, `.githooks/detour.test.mjs`
**Origine** : les branches fusionnées par squash reconnues (0.6.6) — « Une branche dont la PR est fusionnée sur GitHub (y compris par squash) est reconnue fusionnée : supprimée au lancement suivant, et acceptée par la reprise d'un détour »
**Raison** : Point de recette v0.6.5-P8 : pour une équipe qui fusionne par squash, git ne voit jamais la branche fusionnée — elle n'était jamais supprimée et un détour ne pouvait pas reprendre.

## QUA-059 — Sans gh joignable, seule la fusion classique est reconnue, et c'est dit
**Règle** : Livré à tout projet. Quand `gh` ne répond pas (absent, non connecté, hors GitHub, trop lent), la reconnaissance d'une branche fusionnée (QUA-058) se replie sur git seul (fusion classique) : aucune branche non fusionnée aux yeux de git n'est supprimée, et le lancement dit « gh injoignable » en nommant les branches gardées ; la reprise d'un détour est refusée en disant de même, état et mise de côté intacts.
**Périmètre** : `.githooks/close.mjs` (`branchMerged`, `pruneMergedBranches`, `prunedMessage`), `.githooks/detour.mjs` (`resume`) ; livré dans le gabarit.
**Source de vérité** : `.githooks/close.mjs` (`branchMerged`).
**Preuve** : tests des hooks sur de vrais dépôts git temporaires, `gh` simulé muet puis le vrai `gh` hors GitHub.
**Contrôle** : `tests-qua-059`
**Tests** : `.githooks/close.test.mjs`, `.githooks/detour.test.mjs`
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
**Périmètre** : `AGENTS.md` ; livré dans le gabarit.
**Source de vérité** : `packages/drwil/templates/common/base/AGENTS.md`.
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
**Règle** : Un fichier de code ne dépasse pas 400 lignes, tests exclus ; un fichier déjà au-dessus à l'adoption serait plafonné à sa taille actuelle et ne pourrait que maigrir (`.githooks/check-file-size.legacy.json`, vide à l'adoption le 2026-10-12, après découpage — voir `docs/projects/journal.md`).
**Périmètre** : `packages/drwil/src/` (fichiers ts), `packages/drwil/bin/` (fichiers js), `.githooks/` et `outils/` (fichiers mjs).
**Source de vérité** : `.drwil/ia-first.json` → `checks` (contrôle `taille-fichiers`), `.githooks/check-file-size.mjs`.
**Preuve** : Hook + CI (`.drwil/ia-first.json` → `checks`, job `checks`).
**Contrôle** : `taille-fichiers`
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
