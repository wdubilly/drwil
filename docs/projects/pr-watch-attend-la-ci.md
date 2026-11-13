# Projet : le suivi de PR attend que la CI apparaisse avant de la dire absente

**Statut** : cadré le 2026-11-13.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/decouverte-valeur.md` (OPT-2, scan du 2026-11-12)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/pr-watch.mjs
  - .githooks/pr-watch.mjs
  - .githooks/pr-watch.test.mjs
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

`node .githooks/pr-watch.mjs <n>` rend « suivi non exécuté : aucun contrôle de CI » dès sa première lecture quand la
forge n'a pas encore inscrit les contrôles sur une PR qu'on vient de pousser (état `none` final dans `watch`, test
`.githooks/pr-watch.test.mjs`). L'agent s'arrête alors, ou relance la CI à la main (commit `8b6bab0`). La fusion
automatique par défaut (`docs/projects/fusion-automatique-par-defaut.md`) repose sur ce suivi : il doit tenir sans
geste humain sur une forge lente. Autre cas vu : une CI restée en file d'attente jusqu'au délai, dont le message ne
dit pas qu'elle n'a jamais démarré.

## Critères d'acceptation

- Sans aucun contrôle inscrit, le suivi attend jusqu'à 3 minutes que la CI apparaisse (GitHub et GitLab) ; passé ce
  délai, il reste « non exécuté » (code 2), jamais « verte » — `QUA-100`, `QUA-013`
- Des contrôles inscrits pendant le délai de grâce sont suivis normalement jusqu'à verte, rouge ou délai global —
  `QUA-100`
- Au délai global dépassé, le message nomme les contrôles restés en file d'attente (jamais démarrés), distincts de
  ceux en cours ; aucune relance automatique — `QUA-100`
- Le délai de grâce compte dans les 30 minutes du délai global, jamais en plus — `QUA-100`

## Contrats modifiés

- `QUA-100` — ancien critère : « sans `gh` joignable, sans contrôle ou après le délai, le suivi est « non exécuté » (code 2) » — raison : « sans contrôle » s'entend après un délai de grâce de 3 minutes, le temps que la forge inscrive la CI ; au délai dépassé, les contrôles jamais démarrés sont nommés (validé le 2026-11-13)
- `.githooks/pr-watch.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)

## 2. Hors périmètre

- La relance automatique d'une CI bloquée en file d'attente (geste sur la forge, à décider à part).
- Le suivi en temps réel (`docs/intentions/pr-watch-en-temps-reel.md`).
- `.githooks/merge-auto.mjs` et la fusion automatique par défaut (fiche `fusion-automatique-par-defaut`).

## 3. Contraintes

- Reproduire d'abord : un test avec faux `gh` (puis faux `glab`) qui rend une liste vide puis des contrôles, en échec
  contre le code actuel.
- `.githooks/pr-watch.mjs` n'a pas d'`await` de premier niveau (QUA-249) ; les textes restent en français et en anglais.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-13 : délai de grâce de 3 minutes ; message de délai qui distingue « en file d'attente » de « en cours » ;
  modification de QUA-100 validée par le demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — délai de grâce et file d'attente** [IA] : tests en échec d'abord, puis `watch` et ses textes, QUA-100
  réécrit, `npm run installer-depot`, ligne « Unreleased » du CHANGELOG. Critère de sortie :
  `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-13) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`, avant `fusion-automatique-par-defaut`.
