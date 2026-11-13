# Projet : la ligne « Unreleased » du changelog s'écrit en fin de BUILD

**Statut** : cadré le 2026-11-13.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/audit-risques.md` (RSK-3) et `docs/decouverte-valeur.md` (OPT-5), scans du 2026-11-12

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - packages/drwil/templates/common/base/.githooks/close-checks.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/close-texts.mjs
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - .githooks/state-context-texts.mjs
  - .githooks/close-checks.mjs
  - .githooks/close.mjs
  - .githooks/close-texts.mjs
  - .githooks/state.test.mjs
  - .githooks/close.test.mjs
  - docs/recipes/working-with-branches.md
  - docs/recipes/create-a-release.md
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

QUA-040 et le rappel CLOSING (`.githooks/state-context-texts.mjs`) demandent la ligne « Unreleased » du changelog
« dans le commit de clôture », mais en CLOSING la barrière de périmètre (`.githooks/scope-gate.mjs`) refuse tout
fichier hors de sa liste fermée, changelog compris : la consigne ne se suit pas sans contournement. Résultat : les
clôtures du 2026-11-12 (GitLab `6d696b9`, lancement refusé `e131b85`, marques [IA] `86091cb`) n'ont pas de ligne
« Unreleased ». Décidé le 2026-11-13 : la ligne s'écrit en fin de BUILD, le changelog étant au périmètre de la
fiche.

## Critères d'acceptation

- La consigne d'état (BUILD, français et anglais) dit d'ajouter la ligne « Unreleased » dans le dernier lot quand
  le chantier change ce que voit l'utilisateur ; le rappel CLOSING ne la demande plus dans le commit de clôture —
  `QUA-040`
- L'en-tête de la section « Unreleased » du changelog et les recettes de branche et de release disent la même
  chose — `QUA-040`
- `node .githooks/close.mjs --check` signale, sans bloquer, une branche qui change du code livré sans toucher la
  section « Unreleased » du changelog du projet (s'il en a un) — `QUA-040`
- La barrière de périmètre en CLOSING est inchangée : sa liste fermée n'admet pas le changelog — `QUA-016`
- Les lignes manquantes des trois chantiers du 2026-11-12 sont ajoutées à « Unreleased » — `QUA-040`

## Contrats modifiés

- `QUA-040` — ancien critère : « À la clôture d'un chantier, son commit met à jour le README et ajoute sa ligne « Unreleased » au changelog s'il change ce que voit l'utilisateur » — raison : la ligne s'écrit dans le dernier lot du BUILD, la barrière de CLOSING la refusant ; `close.mjs --check` signale son absence (validé le 2026-11-13)
- `.githooks/state-context-texts.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/close-checks.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/close.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/close-texts.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/state.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)

## 2. Hors périmètre

- Admettre le changelog, le README ou la carte en CLOSING (option écartée le 2026-11-13).
- Rendre le signal bloquant : il informe, la clôture reste libre.
- La carte et le README : leur règle dans QUA-040 suit la même logique, mais seul le changelog est traité ici.

## 3. Contraintes

- Reproduire d'abord : test de `close.mjs --check` sur une branche qui change du code livré sans ligne
  « Unreleased », en échec contre le code actuel.
- Chez l'adoptant sans changelog, aucun signal.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-13 : la ligne « Unreleased » s'écrit en fin de BUILD (et non admise en CLOSING) ; signal non bloquant
  à la clôture ; rattrapage des trois chantiers du 2026-11-12 dans cette fiche.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — consigne, signal, rattrapage** [IA] : test en échec d'abord ; consignes et recettes ; signal de
  `close.mjs --check` ; QUA-040 réécrit ; lignes manquantes ajoutées ; `npm run installer-depot`. Critère de
  sortie : `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-13) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`.
