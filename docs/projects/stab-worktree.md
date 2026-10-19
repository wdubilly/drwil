# Projet : un push depuis un worktree ne touche jamais le vrai dépôt (0.6.6, 1 sur 4)

**Statut** : cadré le 2026-10-19.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/tests-isoles-depuis-un-worktree.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/templates/common/base/.githooks/pre-push
  - .githooks/pre-push
  - .githooks/acceptance-sheet.test.mjs
  - .githooks/check-architecture.test.mjs
  - .githooks/check-code-rules.test.mjs
  - .githooks/check-contract-tests.test.mjs
  - .githooks/check-control-coverage.test.mjs
  - .githooks/check-docs.test.mjs
  - .githooks/check-file-size.test.mjs
  - .githooks/close.test.mjs
  - .githooks/consumption.test.mjs
  - .githooks/contracts.test.mjs
  - .githooks/create-release.test.mjs
  - .githooks/dashboard.test.mjs
  - .githooks/detour.test.mjs
  - .githooks/glob.test.mjs
  - .githooks/glossary.test.mjs
  - .githooks/promote-release.test.mjs
  - .githooks/release-verdict.test.mjs
  - .githooks/risk.test.mjs
  - .githooks/scope-gate.test.mjs
  - .githooks/scope.test.mjs
  - .githooks/state.test.mjs
  - packages/drwil/test/*.test.mjs
  - outils/audit-dependances.test.mjs
  - outils/installer-depot.test.mjs
  - outils/tester-tarball.test.mjs
  - outils/verifier-miroirs.test.mjs
  - outils/verifier-tests-contrats.test.mjs
  - .github/scripts/*.test.mjs
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
-->

(cadrage : le lanceur des contrôles et le pre-push, gabarit et copies,
pour nettoyer l'environnement de leurs enfants ; les fichiers de test, pour
trouver celui qui agit sur le vrai dépôt et ajouter la non-régression ; la
carte, le registre, les contrôles, les miroirs et le changelog.)

## 1. Besoin

Le 2026-10-18, un `git push` depuis un worktree secondaire a fait agir la
suite des contrôles sur le vrai dépôt : `core.bare=true` écrit dans la
configuration commune, branche parasite créée, index du worktree sali
(`docs/intentions/tests-isoles-depuis-un-worktree.md`). C'est une
régression du correctif du 2026-10-10 (journal, « Tests des contrôles
isolés des variables GIT_* du hook »). Un simple push peut abîmer le dépôt
et casser un chantier en cours.

## Critères d'acceptation

- Un push depuis un worktree d'un dépôt jetable laisse le dépôt principal
  identique (configuration, branches, index, arbre) ; le test rejoue
  l'incident du 2026-10-18 et échoue sans le correctif — contrat à créer
- Le lanceur des contrôles retire les variables `GIT_*` de
  l'environnement de chaque contrôle qu'il lance, quel que soit le fichier
  de test — contrat à créer

## 2. Hors périmètre

- Le budget de temps sous Windows (décision du 2026-10-19 : inchangé) :
  `docs/intentions/budget-temps-windows.md`.

## 3. Contraintes

- Cause avant correctif : reproduire l'incident dans un dépôt jetable,
  identifier le test ou la variable en cause, avant toute modification.
- Les hooks gardent les `GIT_*` dont ils ont besoin (décision du
  2026-10-10) : seul l'environnement des contrôles lancés est nettoyé.
- Tous les tests sur dépôts temporaires, jamais sur le dépôt réel.
- Livré à tout projet (QUA-018, dépôt ou livrable) : gabarit d'abord, puis
  `npm run installer-depot`.
- Hooks à 100 % de couverture (QUA-004) ; fichiers de code sous 400
  lignes (QUA-001).

## 4. Lots

- **Lot 1** : reproduire l'incident dans un dépôt jetable et en établir
  la cause.
- **Lot 2** : nettoyage centralisé par le lanceur, et non-régression qui
  rejoue un push depuis un worktree.

## 5. Décisions

- **2026-10-19 — Les deux garde-fous** (demandeur) : nettoyage centralisé
  par le lanceur, et test de non-régression depuis un worktree.
- **2026-10-19 — Dans la 0.6.6, en premier** (demandeur).

## 6. Reprise

- **Dernier état** (2026-10-19) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
