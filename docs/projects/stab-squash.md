# Projet : les branches fusionnées par squash reconnues (0.6.6, 2 sur 4)

**Statut** : cadré le 2026-10-19.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/branches-fusionnees-par-squash.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - .githooks/close.mjs
  - .githooks/close.test.mjs
  - packages/drwil/templates/common/base/.githooks/detour.mjs
  - .githooks/detour.mjs
  - .githooks/detour.test.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - .githooks/state.mjs
  - .githooks/state-texts.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/working-with-branches.md
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
-->

(cadrage : le ménage des branches au lancement et la reprise d'un détour,
gabarit et copies, avec leurs tests ; la recette des branches ; la carte,
le registre, les contrôles, les miroirs et le changelog.)

## 1. Besoin

La 0.6.5 livre le ménage des branches fusionnées (au lancement) et la
reprise d'un détour (`detour.mjs resume`). Les deux ne reconnaissent que
la fusion classique : pour une équipe qui fusionne par squash, la branche
n'est jamais supprimée et un détour ne peut pas reprendre
(`docs/intentions/branches-fusionnees-par-squash.md`). C'est le défaut le
plus visible de la 0.6.5 (point de recette v0.6.5-P8).

## Critères d'acceptation

- Une branche dont la PR est fusionnée sur GitHub (y compris par squash)
  est reconnue fusionnée : supprimée au lancement suivant, et acceptée par
  la reprise d'un détour — `QUA-058`
- Sans gh joignable, la reconnaissance se replie sur git (fusion
  classique seulement) et le dit clairement, sans jamais supprimer une
  branche non fusionnée — `QUA-059`

## 2. Hors périmètre

- GitLab et les autres forges : `gh` seulement, le repli git ailleurs.

## 3. Contraintes

- Ne jamais supprimer la branche courante, la principale, ni une branche
  dont la fusion n'est pas prouvée (règle de la 0.6.5 gardée).
- `gh` simulé dans les tests ; dépôts temporaires avec identité git locale.
- Livré à tout projet (QUA-018) : gabarit d'abord, puis
  `npm run installer-depot`.
- Hooks à 100 % de couverture (QUA-004) ; fichiers de code sous 400
  lignes (QUA-001).

## 4. Lots

- **Lot 1** : une seule fonction « branche fusionnée ? » (PR « merged »
  via `gh`, repli git), partagée par le ménage et la reprise.
- **Lot 2** : ménage et reprise branchés dessus ; recette des branches à
  jour.

## 5. Décisions

- **2026-10-19 — La PR fusionnée via gh fait foi** (demandeur), repli git
  sans gh.

## 6. Reprise

- **Dernier état** (2026-10-19) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
