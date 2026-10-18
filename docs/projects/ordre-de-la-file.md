# Projet : la file suit l'ordre du sondage (0.6.5, 2 sur 4)

**Statut** : cadré le 2026-10-18 (découpé de la clôture allégée).
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - .claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - .githooks/state.mjs
  - .githooks/state-cli.mjs
  - .githooks/state.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
-->

(cadrage : le hook de sondage et la skill de lancement, l'état et sa
ligne de commande pour la file — gabarit et copies du dépôt —, leurs
tests (`packages/drwil/test/kit.test.mjs` lance le hook de sondage), le
registre et le changelog.)

## 1. Besoin

Point 6 de la clôture allégée (`docs/projects/cloture-allegee.md`, cadrée
le 2026-10-18) : dans la session de la 0.6.4, la file a suivi l'ordre des
clics dans le sondage, pas celui des options que décrit la skill de
lancement ; il a fallu arrêter la file et relancer le sondage.

## Critères d'acceptation

- La file suit l'ordre des options du sondage, quel que soit l'ordre des
  clics — `QUA-037`

## 2. Hors périmètre

- Le reste de la 0.6.5 : la date gardée et le feu vert de publication
  (fait, journal du 2026-10-18), `docs/projects/cloture-allegee.md`, `docs/projects/detour.md`.

## 3. Contraintes

- Reproduire d'abord (cause racine, recette
  `docs/recipes/corriger-un-defaut.md`), puis corriger ; le test qui
  reproduit échoue avant le correctif.
- Livré à tout projet (QUA-018, dépôt ou livrable) : on édite le gabarit,
  puis `npm run installer-depot`.
- Hooks à 100 % de couverture (QUA-004).

## 4. Décisions

- **2026-10-18 — Une PR par fiche** (demandeur) : la décision « une seule
  PR » portait sur le cadrage de la 0.6.5, pas sur sa réalisation.
- Contrats concernés : QUA-037 (une file de chantiers décidée d'un geste),
  QUA-018 (dépôt ou livrable), QUA-004 (seuil de couverture).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — reproduire** [IA] : un test qui coche les options dans le
  désordre et constate l'ordre de la file ; cause établie.
- **Lot 2 — corriger** [IA] : la file rangée dans l'ordre des options.
  Critère de sortie de chaque lot : `node .githooks/run-checks.mjs` vert ;
  du chantier : `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-10-18) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
