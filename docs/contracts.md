# Contrats (source unique des invariants)

Chaque invariant est identifié par un ID unique. Ne pas les recopier ailleurs : citer l'ID.

Preuve vérifiable (DRWIL-001, `docs/projects/drwil-v0-2-gouvernance-executable.md`) :
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
**Contrôle** : `ci-coverage`
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
**Contrôle** : `docs-references`
**Manuel** : justesse du contenu des fiches.
**Tests** : `packages/drwil/test/kit.test.mjs`
**Raison** : Un agent reprend un chantier à froid sans refaire le travail ni trancher à la place du demandeur.

## QUA-016 — Rappel de cadrage
**Règle** : Tout fichier de code indexé est couvert par le bloc `scope` d'une fiche de `docs/projects/` ; un bloc mal formé (sans `files:`, motif trop large) est refusé. Sévérité réglable par projet (`.drwil/ia-first.json` -> `cadrage` : `blocking` par défaut et sur ce dépôt, `warning`, ou `off`). Hors réglage `blocking`, ce contrat n'est pas prouvé : lui ajouter un champ Manuel.
**Périmètre** : Tout le dépôt (fichiers indexés), hors `docs/` et le markdown.
**Source de vérité** : `.githooks/scope.mjs`, `docs/ia-first.md` (section 7).
**Preuve** : `.githooks/check-docs.mjs` (hook + CI, sévérité selon le réglage) ; refus avant écriture côté agent : `.claude/hooks/scope-reminder.mjs`.
**Contrôle** : `docs-references`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Raison** : Du code détaché de tout chantier ne se retrouve plus.

## QUA-017 — Pas de travail direct sur la branche principale
**Règle** : Commiter ou pousser directement sur la branche principale (`master`/`main`) est refusé, y compris le tout premier commit d'un dépôt. Le travail doit passer par une branche (`docs/recipes/working-with-branches.md`) fusionnée ensuite via une pull/merge request. `init()` crée et bascule systématiquement sur une branche de travail (`chantier/installation-kit`) juste après `git init`, avant tout commit : personne n'a donc jamais besoin de commiter sur la branche principale, même au bootstrap. Pas de porte de sortie configurable (contrairement à QUA-016). Ce contrôle ne tourne jamais en CI (`process.env.CI`) : la CI s'exécute aussi sur la branche principale après un merge légitime, qu'il ne faut pas bloquer rétroactivement.
**Périmètre** : Tout dépôt git, y compris avant le tout premier commit, en local uniquement (hooks `pre-commit`/`pre-push`).
**Source de vérité** : `docs/recipes/working-with-branches.md`.
**Preuve** : `.githooks/run-checks.mjs` (hook uniquement, jamais en CI).
**Contrôle** : `main-branch`
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
**Règle** : Une fiche de chantier déclarée « prête » (`**Maturité**`) a au moins un critère d'acceptation ; une fiche sans critères qui n'est pas « prête » peut être close, avec un avertissement : elle ne laisse aucun test de non-régression aux chantiers suivants.
**Périmètre** : Les fiches de `docs/projects/`.
**Source de vérité** : `.githooks/briefs.mjs` (`readyGaps`), `.githooks/check-docs.mjs`, `.githooks/state.mjs` (clôture).
**Preuve** : `check-docs` (hook + CI) refuse la fiche « prête » ; la clôture avertit.
**Contrôle** : `couverture-hooks`, `couverture-tests`
**Tests** : `.githooks/check-docs.test.mjs`, `.githooks/state.test.mjs`, `packages/drwil/test/kit.test.mjs`
**Origine** : capitaliser les non-régressions — « Une fiche « prête » sans critères d'acceptation est refusée par check-docs ; une fiche sans critères qui n'est pas « prête » reçoit un avertissement à la clôture »
**Raison** : Un chantier sans critère prouvé ne laisse rien à rejouer : la non-régression métier commence par la fiche.

## QUA-022 — Preuve d'un critère laissée au registre
**Règle** : Un critère d'acceptation est prouvé par un contrat du registre avec un contrôle rejouable (ou un contrat Manuel attesté pour un jugement humain) ; un critère sans contrat est refusé à la clôture. `drwil verify` classe chaque contrat lié contre la base de la branche : créé, réutilisé tel quel (accepté) ou modifié.
**Périmètre** : Les critères d'acceptation de la fiche active.
**Source de vérité** : `packages/drwil/src/criteria.ts` (`evaluateCriteria`, `contractChanges`).
**Preuve** : `drwil verify` et son évidence, lue par la clôture.
**Contrôle** : `couverture-tests`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : capitaliser les non-régressions — « Un critère dont le contrat n'existe pas ou n'a pas de contrôle rejouable est refusé à la clôture ; un critère nouveau crée ou modifie son contrat dans la branche »
**Raison** : La preuve d'un critère doit survivre au chantier, pour être rejouée par les suivants.

## QUA-023 — Régression ou évolution d'un contrat
**Règle** : Un contrat modifié dans la branche sans déclaration dans la section « Contrats modifiés » de la fiche active est une régression : `drwil verify` le liste et la clôture est refusée ; déclaré (validé par le demandeur au cadrage), il est accepté. Un contrat en échec qui porte `**Origine**` affiche le critère qu'il protège.
**Périmètre** : Le registre `docs/contracts.md`, comparé à la base de la branche.
**Source de vérité** : `packages/drwil/src/criteria.ts` (`judgeBrief`, `showOrigins`), `.githooks/briefs.mjs` (`declaredContracts`), `.githooks/state.mjs` (clôture).
**Preuve** : `drwil verify` et son évidence, lue par la clôture.
**Contrôle** : `couverture-tests`, `couverture-hooks`
**Tests** : `packages/drwil/test/kit.test.mjs`, `.githooks/state.test.mjs`
**Origine** : capitaliser les non-régressions — « Un contrat modifié sans déclaration dans « Contrats modifiés » est refusé ; quand un contrôle échoue, verify affiche le chantier d'origine qu'il protège »
**Raison** : Assouplir un contrat en silence efface la non-régression qu'il portait ; le changer reste possible, mais décidé.

## QUA-024 — Premier contrat métier d'un dépôt neuf
**Règle** : `init` livre dans le registre un contrat métier d'exemple, `APP-001`, dont le contrôle est à compléter (champ Manuel : jamais prouvé tant qu'il n'est pas remplacé) ; le guide d'adoption explique comment écrire le premier.
**Périmètre** : Le gabarit livré (`packages/drwil/templates/common/base/docs/contracts.md`, `docs/recipes/adopt-the-kit.md`).
**Source de vérité** : Ces deux fichiers du gabarit.
**Preuve** : Test sur un `init` neuf.
**Contrôle** : `couverture-tests`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : capitaliser les non-régressions — « Un init neuf fournit un contrat métier d'exemple avec un contrôle à compléter »
**Raison** : Un dépôt neuf démarre sans filet métier : l'exemple montre où et comment poser le premier.

## QUA-025 — Version du moteur installé enregistrée
**Règle** : `init` (installation ou mise à jour) enregistre la version du moteur dans `.drwil/install.json` (si présent ; `format`, `version`, `firstVersion` conservée aux mises à jour ; aucun horodatage, réécrit seulement si la version change), sans modifier le manifeste `.drwil/installed-files.json` (si présent) ; `uninstall` le retire.
**Périmètre** : Tout projet équipé par `drwil init`.
**Source de vérité** : `packages/drwil/src/manifest.ts` (`writeInstall`, `readInstall`, `uninstall`), `packages/drwil/src/index.ts` (`init`).
**Preuve** : Test sur un dépôt temporaire.
**Contrôle** : `couverture-tests`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : fiabiliser le package npm — « init (installation ou mise à jour) enregistre la version du moteur dans .drwil/install.json sans changer le manifeste ; uninstall le retire »
**Raison** : Savoir quelle version du moteur tourne dans un projet, pour le diagnostiquer et le mettre à jour.

## QUA-026 — doctor signale la version installée
**Règle** : `drwil doctor` affiche la version du moteur installé ; avertissement, jamais problème, si la CLI est plus récente (mettre à jour par `npx drwil init`), plus ancienne, ou si l'enregistrement manque.
**Périmètre** : `drwil doctor`.
**Source de vérité** : `packages/drwil/src/doctor.ts` (point « version »).
**Preuve** : Test sur un dépôt temporaire.
**Contrôle** : `couverture-tests`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : fiabiliser le package npm — « doctor affiche la version installée et signale un écart avec la CLI »
**Raison** : Un écart de version silencieux fait tourner des hooks d'une version avec une CLI d'une autre.

## QUA-027 — Mise à jour sûre d'une version à la suivante
**Règle** : `drwil init` sur un projet équipé par une version antérieure préserve les fichiers du projet et la mécanique modifiée par le client (signalée comme dérive), rafraîchit la mécanique jamais modifiée, retire les fichiers obsolètes jamais modifiés (en gardant ceux modifiés), tient le manifeste à jour et enregistre la nouvelle version.
**Périmètre** : `drwil init` sur un projet déjà équipé.
**Source de vérité** : `packages/drwil/src/index.ts` (`init`), `packages/drwil/src/manifest.ts` (`removeObsolete`, `writeManifest`, `writeInstall`).
**Preuve** : Test de mise à jour sur un dépôt temporaire, version antérieure simulée hors réseau.
**Contrôle** : `couverture-tests`
**Tests** : `packages/drwil/test/kit.test.mjs`
**Origine** : fiabiliser le package npm — « Passer d'une version à la suivante préserve les fichiers modifiés par le client et retire les fichiers obsolètes non modifiés »
**Raison** : Une mise à jour qui écrase le travail du client ou laisse des restes fait renoncer aux mises à jour.

## QUA-028 — Un ID de contrat n'est défini qu'à un seul endroit
**Règle** : Un ID de contrat n'est jamais défini à la fois dans le registre et dans le catalogue (un contrat adopté du catalogue garde son ID et le quitte ; sinon la ligne du catalogue est renumérotée), ni deux fois dans le catalogue. Bloquant si le projet impose les exigences récentes (`newRequirements` : `blocking`, cas de ce dépôt), avertissement sinon.
**Périmètre** : `docs/contracts.md` et `docs/contracts-catalog.md` (dossiers réglables : `dirs.contracts`, `dirs.catalog`).
**Source de vérité** : `.githooks/contracts.mjs` (`definedIds`, `idConflicts`), `.githooks/check-docs.mjs`.
**Preuve** : `check-docs` (hook + CI).
**Contrôle** : `docs-references`
**Tests** : `.githooks/contracts.test.mjs`, `.githooks/check-docs.test.mjs`
**Origine** : cohérence des ID de contrat entre registre et catalogue — « Un ID défini à la fois dans le registre et dans le catalogue, ou deux fois dans le catalogue, est signalé par check-docs »
**Raison** : Deux règles sous un même ID rendent toute citation ambiguë ; le cas s'est produit (SEC-001) et a failli se reproduire (un ID déjà pris par le catalogue proposé pour un nouveau contrat).

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
