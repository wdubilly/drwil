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
**Règle** : Chaque case ouverte de l'index des chantiers porte un marqueur `[IA]`, `[humain]` ou `[décision]` ; chaque fiche de `docs/projects/` et de `docs/intentions/` (hors index et README) a une ligne « Statut » en tête, datée (AAAA-MM-JJ) ; chaque fiche d'intention a les sections « Besoin », « Existant » et « Questions à trancher » ; chaque fiche de projet a une section « Reprise ». Extension (2026-10-04) : la case d'une ligne d'index qui cite une fiche dont le « Statut » contient `fait`/`terminé`/`clos` doit être cochée, et réciproquement une case cochée doit citer une fiche qui se dit terminée — avertissement non bloquant (la prose de « Statut » n'est pas un champ structuré, angles morts assumés).
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
**Règle** : `init` (installation ou mise à jour) enregistre la version du moteur dans `.drwil/install.json` (si présent ; `format`, `version`, `firstVersion` conservée aux mises à jour ; aucun horodatage, réécrit seulement si la version change), sans modifier le manifeste `.drwil/installed-files.json` (si présent) ; `uninstall` le retire.
**Périmètre** : Tout projet équipé par `drwil init`.
**Source de vérité** : `packages/drwil/src/manifest.ts` (`writeInstall`, `readInstall`, `uninstall`), `packages/drwil/src/index.ts` (`init`).
**Preuve** : Test sur un dépôt temporaire.
**Contrôle** : `tests-qua-025`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : fiabiliser le package npm — « init (installation ou mise à jour) enregistre la version du moteur dans .drwil/install.json sans changer le manifeste ; uninstall le retire »
**Raison** : Savoir quelle version du moteur tourne dans un projet, pour le diagnostiquer et le mettre à jour.

## QUA-026 — doctor signale la version installée
**Règle** : `drwil doctor` affiche la version du moteur installé ; avertissement, jamais problème, si la CLI est plus récente (mettre à jour par `npx drwil init`), plus ancienne, ou si l'enregistrement manque.
**Périmètre** : `drwil doctor`.
**Source de vérité** : `packages/drwil/src/doctor.ts` (point « version »).
**Preuve** : Test sur un dépôt temporaire.
**Contrôle** : `tests-qua-026`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : fiabiliser le package npm — « doctor affiche la version installée et signale un écart avec la CLI »
**Raison** : Un écart de version silencieux fait tourner des hooks d'une version avec une CLI d'une autre.

## QUA-027 — Mise à jour sûre d'une version à la suivante
**Règle** : `drwil init` sur un projet équipé par une version antérieure préserve les fichiers du projet et la mécanique modifiée par le client (signalée comme dérive), rafraîchit la mécanique jamais modifiée, retire les fichiers obsolètes jamais modifiés (en gardant ceux modifiés), tient le manifeste à jour et enregistre la nouvelle version.
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
**Règle** : Un fichier cité dans le bloc scope d'une fiche couvre aussi sa copie déclarée par le réglage `scopeMirrors` de `.drwil/ia-first.json` (paires de préfixes source → copie), pour la barrière de périmètre, le rappel de cadrage de check-docs et celui de l'agent ; sans réglage, rien ne change. `check-docs` avertit une fiche dont le cadrage cite du code sans aucun fichier de test, ou dont un critère crée un contrat sans que le cadrage cite `.drwil/ia-first.json`. Un commit qui n'indexe que de la documentation (`docs/`, Markdown) ne rejoue ni les tests des contrôles ni les contrôles du projet : ils sont signalés non exécutés, et le push comme la CI les rejouent toujours (QUA-013).
**Périmètre** : `.githooks/scope.mjs`, `.githooks/scope-gate.mjs`, `.githooks/risk.mjs`, `.githooks/engine.mjs`, `.claude/hooks/scope-reminder.mjs` ; livré dans le gabarit ; ce dépôt déclare son gabarit dans `scopeMirrors`.
**Source de vérité** : `.githooks/scope.mjs` (`withMirrors`), `.githooks/risk.mjs` (`scopeGaps`), `.githooks/engine.mjs`.
**Preuve** : tests des hooks.
**Contrôle** : `tests-qua-035`
**Tests** : `.githooks/scope.test.mjs`, `.githooks/scope-gate.test.mjs`, `.githooks/risk.test.mjs`, `.githooks/engine.test.mjs`
**Origine** : un cadrage complet du premier coup, un élargissement sans friction — « Un fichier du gabarit cité dans le bloc scope couvre aussi sa copie »
**Raison** : Neuf élargissements de cadrage en deux jours, chacun un commit à part et un `git stash` du lot en cours : la première friction qu'un vrai projet rencontrerait.

## QUA-036 — La clôture boucle les intentions
**Règle** : À la clôture d'un chantier, chaque limite non traitée devient une fiche d'intention (`docs/intentions/`, jamais une fiche de chantier : l'agent peut l'écrire seul, la recadrer reste une décision du demandeur), listée dans l'index en `[décision]` et citée par le journal ; l'intention d'origine, nommée par le champ `**Intention**` de la fiche, est mise à jour, ou résumée au journal et retirée si elle est entièrement couverte. Le rappel de l'activité CLOSING et la recette le disent ; le commit qui supprime une fiche sans toucher son intention reçoit un avertissement, sans blocage. Une intention dont la dernière revue datée (Statut, « Revu le … », « Existant » daté) a 30 jours ou plus est signalée par un avertissement non bloquant.
**Périmètre** : `AGENTS.md`, la recette des branches (section « Closing »), `.githooks/state-texts.mjs`, `.githooks/briefs.mjs`, `.githooks/run-checks.mjs` ; livré dans le gabarit.
**Source de vérité** : `.githooks/briefs.mjs` (`briefIntent`, `intentsLeftBehind`, `lastReview`, `staleIntents`), `.githooks/state-texts.mjs`.
**Preuve** : tests des hooks.
**Contrôle** : `tests-qua-036`
**Tests** : `.githooks/state.test.mjs`, `.githooks/run-checks.test.mjs`
**Origine** : la clôture boucle les intentions — « À la clôture, le rappel d'activité et la recette demandent de consigner chaque limite non traitée en fiche d'intention »
**Raison** : Deux intentions réalisées étaient restées ouvertes plusieurs jours et cinq autres disaient faux ; le 2026-10-16, ce bouclage a été fait à la main à chaque clôture.

## QUA-037 — Une file de chantiers décidée d'un geste
**Règle** : Un seul sondage de lancement à choix multiple, lu par le hook et jamais par l'agent, enregistre une file ordonnée de fiches et la fusion automatique ; seule une fiche prête (maturité « prêt », aucune `[décision]` ouverte, critères d'acceptation) peut y entrer, sinon le lancement entier est refusé. La file reste après une clôture ; l'agent lance seul la tête de file (`node .githooks/state.mjs next`), avec la fusion décidée, et jamais une fiche hors de la file ; tout autre retour en SCOPING, ou `node .githooks/state.mjs queue stop`, l'abandonne. La skill de lancement, la recette de clôture et `AGENTS.md` disent d'attendre la fusion avant la suivante, de s'arrêter au premier chantier qui demande un humain, et de rendre un compte rendu par chantier et un bilan de file.
**Périmètre** : l'état de gouvernance (`.githooks/state.mjs`, `.githooks/state-cli.mjs`, `.githooks/briefs.mjs`), le hook de sondage (`.claude/hooks/prompt-hook.mjs`), la skill `/drwil-start` ; livré dans le gabarit.
**Source de vérité** : `.githooks/state.mjs` (`start`, `stopQueue`), `.githooks/briefs.mjs` (`queueable`).
**Preuve** : tests des hooks et du paquet.
**Contrôle** : `tests-qua-037`
**Tests** : `.githooks/state.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : enchaîner plusieurs chantiers sans intervention — « Un seul sondage /drwil-start à choix multiple enregistre une file ordonnée de fiches et la fusion automatique »
**Raison** : Chaque chantier exigeait un sondage et une autorisation de fusion, même quand rien n'était à trancher : l'humain devait revenir entre deux chantiers. Premier pas vers l'intention « fabrique autonome ».

## QUA-038 — Un projet neuf commence par son cadrage global, sans couche inventée
**Règle** : Sans pile détectée, `drwil init` n'écrit aucune couche et dit quoi faire (cadrer le projet, ou `--layers`) ; un `package.json` qui n'installe que drwil (aucune autre dépendance, aucun script, comme après l'étape `npm install -D` du README) n'est pas une pile : le dossier reste un projet neuf (dépôt git et branche créés, pile « Not decided » dans la carte) ; une pile détectée, `--layers` ou un projet déjà installé gardent leurs couches ; `drwil init --layers <couches>`, relancé une fois la pile choisie, crée l'`AGENTS.md` de chaque couche et enregistre les couches. La recette d'adoption commence un projet neuf par son cadrage global (besoin, périmètre, pile, premières règles métier, risque ; `AGENTS.md`, carte, premier README).
**Périmètre** : `drwil init` (`packages/drwil/src/install.ts`, `packages/drwil/src/index.ts`), la recette d'adoption ; livré.
**Source de vérité** : `packages/drwil/src/install.ts`, `docs/recipes/adopt-the-kit.md` (étape 0).
**Preuve** : tests du paquet.
**Contrôle** : `tests-qua-038`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : un projet neuf commence par son cadrage global — « Sans pile détectée, drwil init n'écrit aucune couche »
**Raison** : Un répertoire vide recevait backend/ et frontend/ pour un projet qui n'existait pas encore, et l'adoption supposait du code existant.

## QUA-039 — Un identifiant cité à l'humain vient avec ce qu'il désigne
**Règle** : Une seule source, `.githooks/glossary.mjs`, lit les libellés des identifiants (contrats du registre, lignes du catalogue, lots et points numérotés de la fiche active) et les donne à tout agent (`node .githooks/glossary.mjs "<texte>"`). Les sorties de drwil (`drwil verify` humaine et agent, `.githooks/run-checks.mjs`, `.githooks/check-contract-tests.mjs`) font suivre la première mention d'un identifiant de son libellé, jamais deux fois. `AGENTS.md` et les instructions Copilot et Cursor livrées en font la règle. Avec Claude Code, un hook injecte les libellés après chaque outil qui en cite, sans jamais bloquer.
**Périmètre** : `.githooks/glossary.mjs`, les sorties de drwil, `.claude/hooks/id-glossary.mjs` ; livré dans le gabarit.
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
**Règle** : Livré à tout projet. `node .githooks/consumption.mjs` donne, par chantier (branches `workstream/<fiche>` et de cadrage regroupées), les tokens en quatre catégories, un total pondéré indicatif, le temps actif et les modèles, lus dans les journaux de session de Claude Code — seuls les champs de consommation, jamais un contenu de message. À la clôture, `--record <fiche>` ajoute une ligne à `.drwil/usage.jsonl`, jamais deux pour le même chantier ; le rappel CLOSING et la recette de clôture le demandent. Jamais bloquant : sans journal lisible (autre outil IA), il le dit, sort en succès, et la recette garde l'estimation à la main.
**Périmètre** : `.githooks/consumption.mjs`, `.drwil/usage.jsonl`, recettes de consommation et de clôture ; livré dans le gabarit.
**Source de vérité** : `.githooks/consumption.mjs`.
**Preuve** : tests du script.
**Contrôle** : `tests-qua-042`
**Tests** : `.githooks/consumption.test.mjs`, `.githooks/state.test.mjs`
**Origine** : la consommation de tokens par chantier, mesurée chez tout projet — « Livré à tout projet : `node .githooks/consumption.mjs` donne, par chantier, les tokens en quatre catégories, un total pondéré indicatif, le temps actif et les modèles »
**Raison** : Le pilote de la 0.6.0 sur 2 ou 3 projets doit dire ce que coûte un chantier chez eux ; la mesure n'existait que dans ce dépôt, et la recette livrée la disait impossible.

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
