# Projet : le suivi de PR ne dit « verte » que sur la CI de la PR, qu'il attend si elle tarde

**Statut** : cadré le 2026-11-13.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/decouverte-valeur.md` (OPT-2) et `docs/audit-risques.md` (RSK-1, RSK-5, RSK-6), scans du 2026-11-12

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/pr-watch.mjs
  - packages/drwil/templates/common/base/.githooks/merge-auto-forge.mjs
  - .githooks/pr-watch.mjs
  - .githooks/merge-auto-forge.mjs
  - .githooks/pr-watch.test.mjs
  - .githooks/merge-auto-forge.test.mjs
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

`node .githooks/pr-watch.mjs <n>` suit la CI d'une PR ; la fusion automatique par défaut
(`docs/projects/fusion-automatique-par-defaut.md`), la clôture (QUA-262) et la file (QUA-251) reposent sur son
verdict. Quatre défauts, vérifiés dans le code le 2026-11-13 :

- **Verte sans CI de PR (RSK-1)** : sur le push d'une branche à PR ouverte, la CI saute ses jobs (`SKIPPED`) et la
  vraie CI part sur l'événement `pull_request`. `bucket()` compte `SKIPPED` et `NEUTRAL` comme réussis : entre les
  deux runs, `pr-watch` dit « verte » sans qu'aucun contrôle de la PR n'ait tourné. Le test actuel
  (`.githooks/pr-watch.test.mjs`) affirme ce comportement. Constaté par le demandeur le 2026-11-12.
- **Commit précédent jugé (RSK-6)** : `watch()` lit `headRefOid` sans le comparer à `HEAD` ; juste après un push,
  le rollup peut être celui du commit d'avant.
- **CI pas encore inscrite (OPT-2)** : l'état « aucun contrôle » est final dès la première lecture ; l'agent
  s'arrête ou relance la CI à la main (commit `8b6bab0`).
- **Appel à la forge sans délai (RSK-5)** : `ghJson` (`.githooks/pr-watch.mjs`) et `ghRun`/`glabRun`
  (`.githooks/merge-auto-forge.mjs`) appellent `spawnSync` sans `timeout` ; un `gh` bloqué suspend le suivi au-delà des
  30 minutes.

## Critères d'acceptation

- Un contrôle sauté (`SKIPPED`) ou neutre ne compte jamais comme réussi ; « verte » exige au moins un contrôle
  réellement réussi et aucun en échec ni en cours — `QUA-100`
- « verte », « rouge » ou « fusionnée » ne se disent que si la tête de la PR (`headRefOid`) est le commit `HEAD`
  local ; sinon le suivi attend, dans le délai global — `QUA-100`
- Sans aucun contrôle inscrit (ou seulement des contrôles sautés), le suivi attend jusqu'à 3 minutes que la CI
  apparaisse (GitHub et GitLab) ; passé ce délai, il reste « non exécuté » (code 2), jamais « verte » — `QUA-013`,
  `QUA-100`
- Le délai de grâce compte dans les 30 minutes du délai global, jamais en plus — `QUA-100`
- Au délai global dépassé, le message nomme les contrôles restés en file d'attente (jamais démarrés), distincts de
  ceux en cours ; aucune relance automatique — `QUA-100`
- Chaque appel à `gh` ou `glab` de `.githooks/pr-watch.mjs` et `.githooks/merge-auto-forge.mjs` a un délai ; un délai atteint vaut
  « non exécuté », jamais un succès — `QUA-013`, `QUA-161`, `QUA-100`
- Tests : push seul visible (contrôles sautés et un succès hors PR), CI de PR absente puis inscrite, tête de PR en
  retard sur `HEAD`, appel bloqué ; chacun en échec contre le code actuel — `QUA-100`

## Contrats modifiés

- `QUA-100` — ancien critère : « sans `gh` joignable, sans contrôle ou après le délai, le suivi est « non exécuté » (code 2) » — raison : « verte » exige un contrôle réellement réussi (un saut ne compte pas) sur la tête de PR égale à `HEAD` ; « sans contrôle » s'entend après un délai de grâce de 3 minutes ; au délai dépassé, les contrôles jamais démarrés sont nommés ; chaque appel à la forge a un délai (validé le 2026-11-13)
- `.githooks/pr-watch.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/merge-auto-forge.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)

## 2. Hors périmètre

- La relance automatique d'une CI bloquée en file d'attente (geste sur la forge, à décider à part).
- Le saut des jobs sur le push dans la CI (`.github/workflows/ia-first.yml` et sa copie livrée) : il reste, c'est le
  suivi qui ne s'y trompe plus.
- Le suivi en temps réel (`docs/intentions/pr-watch-en-temps-reel.md`).
- `.githooks/merge-auto.mjs` et la fusion automatique par défaut (fiche `fusion-automatique-par-defaut`).

## 3. Contraintes

- Reproduire d'abord : des tests avec faux `gh` (puis faux `glab`) en échec contre le code actuel.
- Le test existant qui compte un `SKIPPED` dans « verte » est réécrit, pas supprimé.
- `.githooks/pr-watch.mjs` n'a pas d'`await` de premier niveau (QUA-249) ; les textes restent en français et en
  anglais.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-13 : délai de grâce de 3 minutes ; message de délai qui distingue « en file d'attente » de « en cours » ;
  RSK-1, RSK-5 et RSK-6 de l'audit fusionnés dans cette fiche ; modification de QUA-100 validée par le demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — verdict juste et attente** [IA] : tests en échec d'abord ; `bucket`, `ciOf`, `watch` (tête de PR, délai
  de grâce, file d'attente) et délai des appels ; QUA-100 réécrit ; `npm run installer-depot` ; ligne
  « Unreleased » du CHANGELOG. Critère de sortie : `node .githooks/run-checks.mjs` sans échec,
  `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-13) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`, avant `fusion-automatique-par-defaut`.
