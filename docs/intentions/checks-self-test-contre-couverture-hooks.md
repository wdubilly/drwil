# Intention : `checks-self-test` double-t-il `couverture-hooks` ?

**Statut** : proposée le 2026-10-24 — limite du chantier « accélérer la CI
sans perte de qualité » (journal du 2026-10-24).

## Besoin

Mesuré au chantier : `checks-self-test` (≈ 30 s) et `couverture-hooks`
(≈ 34 s) rejouent les mêmes tests de `.githooks/`. Aucun des deux n'a été
retiré : l'absence de perte de garantie n'est pas prouvée (couverture-hooks
exige 100 %, checks-self-test nomme son propre contrat).

## Existant (relevé le 2026-10-24)

- Deux contrôles de `.drwil/ia-first.json` lancent les tests de `.githooks/`.

## Questions à trancher

- [décision] Prouver (mêmes fichiers, même verdict, même contrat nommé) puis
  retirer l'un des deux, ou garder les deux ?
