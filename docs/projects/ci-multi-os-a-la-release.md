# Projet : Windows et macOS testés à la release, ubuntu seul à chaque PR

**Statut** : cadré le 2026-11-07.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : note du 2026-11-07 de `docs/intentions/notes.md` (CI multi-OS seulement à la release),
rattachée à « Suivre la durée de la CI et le contexte relu » (`docs/intentions/suivi-ci-et-contexte.md`)

<!-- scope
files:
  - .github/workflows/ia-first.yml
  - .github/scripts/ci-multi-os.mjs
  - .github/scripts/ci-multi-os.test.mjs
  - .github/scripts/workflows-yaml.test.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/templates/common/optional/create-release/create-release.mjs
  - packages/drwil/templates/common/optional/create-release/create-release-texts.mjs
  - packages/drwil/templates/common/optional/create-release/promote-release.mjs
  - packages/drwil/templates/common/optional/create-release/acceptance-sheet.mjs
  - packages/drwil/templates/common/optional/create-release/acceptance-sheet-texts.mjs
  - packages/drwil/templates/common/optional/create-release/README.md
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - packages/drwil/src/config-write.ts
  - packages/drwil/test/config-write.test.mjs
  - .githooks/create-release.mjs
  - .githooks/create-release-texts.mjs
  - .githooks/promote-release.mjs
  - .githooks/acceptance-sheet.mjs
  - .githooks/acceptance-sheet-texts.mjs
  - .githooks/create-release.test.mjs
  - .githooks/promote-release.test.mjs
  - .githooks/acceptance-sheet.test.mjs
  - docs/recipes/create-a-release.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/features.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/notes.md
  - docs/intentions/suivi-ci-et-contexte.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Aujourd'hui (QUA-045), `kit-tests` tourne sur ubuntu, Windows et macOS sur toute PR qui touche du code
et à chaque push sur `master`. Mesure du dernier passage vert de `master` (2026-11-07) : Windows
11 min 36, macOS 3 min 34, ubuntu 1 min 45 ; Windows fixe la durée de la CI. Les derniers correctifs
« Windows » de l'historique visaient les tests eux-mêmes (fins de ligne, Bash pris pour `cmd.exe`),
pas le livrable, et ont coûté des réouvertures de chantier (PR #373).

À l'inverse, un tag de release ne teste qu'ubuntu (`matrice` de `.github/scripts/ci-multi-os.mjs` ne reconnaît que `master`) : la release
n'est couverte que par le push sur `master` qui l'a précédée. Et ce dépôt publie en mode `solo`
(QUA-200, release directe sans candidate) : aucune promotion n'a jamais eu lieu, rien ne bloque une
release que Windows casserait.

Décision du demandeur le 2026-11-07 : **les trois OS seulement à la release**, avec une barrière
outillée avant la publication.

## Critères d'acceptation

- Une PR (code ou documentation) et un push sur une branche, `master` compris, ne lancent la suite du
  kit que sur ubuntu ; `kit-tests (windows-latest)` et `kit-tests (macos-latest)` restent rapportés
  sous leur nom exigé par le ruleset, étapes sautées et notice qui le dit — `QUA-045` modifié
- Le push d'un tag de release (`vX.Y.Z`, `vX.Y.Z-rc.N`) et un lancement manuel du workflow
  (`workflow_dispatch`) lancent la suite sur les trois OS — `QUA-045` modifié
- Avec le réglage des OS exigés renseigné dans `.drwil/ia-first.json`, `.githooks/create-release.mjs` (création
  directe ou candidate) et `.githooks/promote-release.mjs` refusent, sans rien créer, tant qu'un OS exigé n'a pas
  réellement lancé la suite avec succès sur le commit visé, et disent lequel et la commande pour lancer
  le workflow à la main ; `--dry-run` le signale sans refuser — contrat créé `QUA-268`, prouvé par un test en dur
- Un job dont les étapes de test ont été sautées ne compte jamais comme OS testé, ni pour la barrière
  ni dans la fiche de recette (« OS testés par la CI ») — même contrat `QUA-268`
- Réglage absent ou vide (défaut de l'adoptant) : comportement de la release inchangé ; une mise à jour
  du kit ne l'ajoute pas — même contrat ; renseigné dans ce dépôt avec les trois OS — même contrat `QUA-268`
- La recette `docs/recipes/create-a-release.md` et le README du module disent l'ordre : lancer le workflow sur le
  commit, attendre les trois OS verts, puis créer la release — même contrat `QUA-268`

## Contrats modifiés

- `QUA-045` — titre et règle réécrits : ubuntu seul sur PR et push de branche (`master` compris), les
  trois OS sur un tag de release et un lancement manuel ; noms exigés toujours rapportés ; diff
  illisible toujours en échec (validé par le demandeur le 2026-11-07, sondages « Moment » et
  « Barrière »)
- `.github/workflows/ia-first.yml` — déclencheur `workflow_dispatch` ajouté, commentaires des jobs
  `matrice-os` et `kit-tests` mis à jour (validé par le demandeur le 2026-11-07)
- `QUA-051`, `QUA-054`, `QUA-200` — textes inchangés ; leurs tests peuvent devoir simuler une CI verte
  quand le réglage est renseigné, la nouvelle barrière vit dans le contrat à créer
- `.githooks/create-release.mjs`, `.githooks/create-release-texts.mjs`, `.githooks/promote-release.mjs`,
  `.githooks/acceptance-sheet.mjs`, `.githooks/acceptance-sheet-texts.mjs` (copies du gabarit create-release) —
  barrière : refus de créer ou de promouvoir une release tant qu'un OS exigé n'a pas sa CI verte ; textes associés
  (validé par le demandeur le 2026-11-07)
- `.githooks/promote-release.mjs` — la promotion refuse tant qu'un OS exigé n'a pas sa CI verte (validé par le demandeur le 2026-11-08)
- `.githooks/acceptance-sheet.mjs` — `ciGate`, `testedOs`, `testedJob` : la barrière, et un job aux étapes de test sautées ne compte pas comme OS testé (validé par le demandeur le 2026-11-08)
- `.githooks/acceptance-sheet-texts.mjs` — textes de la barrière et de la fiche de recette (validé par le demandeur le 2026-11-08)
- `.githooks/acceptance-sheet.test.mjs` — tests de la barrière et des jobs sautés (validé par le demandeur le 2026-11-08)
- `.githooks/promote-release.test.mjs` — tests de la promotion refusée puis faite (validé par le demandeur le 2026-11-08)
- `.githooks/run-checks.test.mjs` — le test de QUA-121 suit le déclencheur `workflow_dispatch` ajouté au workflow (validé par le demandeur le 2026-11-08)

## 2. Hors périmètre

- Le ruleset GitHub de `master` : les noms exigés restent rapportés, rien à y changer.
- Le job `checks` (ubuntu) et CodeQL : inchangés.
- Une CI multi-OS livrée aux adoptants : le kit ne leur livre pas de matrice ; seule la barrière de
  release (réglage) est livrée.

## 3. Contraintes

- On édite le gabarit puis `npm run installer-depot` ; le contrôle `miroirs-gabarit` refuse tout écart.
- La barrière lit la CI par `gh` comme la fiche de recette (`ciOs`) ; `gh` indisponible ou CI illisible :
  refus qui le dit, jamais une release devinée verte (QUA-013).
- `workflow_dispatch` ne s'essaie qu'une fois le workflow fusionné sur `master` : le premier essai réel
  se fait à la release suivante, et la clôture le dit en limite connue.

## 4. Décisions

- 2026-11-07 : trois OS sur tag de release et lancement manuel, ubuntu seul ailleurs (sondage « Moment »).
- 2026-11-07 : barrière avant publication (sondage « Barrière ») ; ce dépôt étant en `solo`, elle porte
  sur `.githooks/create-release.mjs` comme sur `.githooks/promote-release.mjs`, en réglage livré vide par défaut, actif ici
  (sondage « Barrière », seconde question).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — la CI du dépôt** [IA] : `.github/scripts/ci-multi-os.mjs` (tag de release, `workflow_dispatch`), workflow,
  tests, QUA-045. Critère de sortie : tests de QUA-045 verts.
- **Lot 2 — la barrière de release** [IA] : réglage, `.githooks/create-release.mjs`, `.githooks/promote-release.mjs`,
  `ciOs` qui ignore les jobs sautés, recette et README du module, contrat à créer et son test.
  Critère de sortie : tests du nouveau contrat verts, `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-07) : lot 1 fait. `.github/scripts/ci-multi-os.mjs` (`matrice`) : sur une PR,
  Ubuntu seul teste (aucun si documentation seule), Windows et macOS rapportés sans tests avec une
  `raison` ; push de branche (master compris) : Ubuntu seul ; tag `vX.Y.Z` / `vX.Y.Z-rc.N` et
  `workflow_dispatch` : les trois OS. Workflow : `on: [push, pull_request, workflow_dispatch]`, notice de
  saut qui lit `matrix.raison` par l'environnement (bash), commentaires de `matrice-os` et `kit-tests`.
  QUA-045 réécrit dans `docs/contracts.md`, carte (`docs/architecture.md`) précisée. Ajout au scope :
  `.githooks/run-checks.test.mjs` (son test QUA-121 exigeait `on: [push, pull_request]`).
- **Prochaine étape** : [IA] lot 2 — réglage des OS exigés (`.drwil/ia-first.json`, `packages/drwil/src/config-write.ts`),
  barrière dans `.githooks/create-release.mjs` et `.githooks/promote-release.mjs` (gabarit puis `npm run installer-depot`),
  `ciOs` de la fiche de recette qui ignore un job dont les étapes de test ont été sautées (avec
  `raison`, la notice « non testé » ; le job reste `success`), recette et README du module, contrat à
  créer et son test, `GOVERNANCE: PASS`. `workflow_dispatch` ne s'essaie qu'après fusion sur master.
