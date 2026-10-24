# Intention : jouer aussi les tests de `.githooks/` sur Node 24

**Statut** : proposée le 2026-10-24 — limite du chantier « accélérer la CI
sans perte de qualité » (journal du 2026-10-24).

## Besoin

Le job `checks` joue toute la suite une seule fois, sur Node 22 (QUA-123) :
les tests de `.githooks/*.test.mjs` ne tournent donc plus sur Node 24, où ils
tournaient avant. `kit-tests` joue la suite du paquet (qui lance les hooks dans
des projets temporaires) sur Node 24, pas ces tests-là.

## Existant (relevé le 2026-10-24)

- Job `checks` (`.github/workflows/ia-first.yml`) : Node 22 ; `kit-tests` : Node 24, suite du paquet seule.

## Questions à trancher

- [décision] Accepter ce recul (les hooks sont aussi exercés sur Node 24 par la
  suite du paquet) ou ajouter `node --test .githooks/*.test.mjs` à `kit-tests`
  (nécessite d'élargir le test de structure de `ci-multi-os`) ?
