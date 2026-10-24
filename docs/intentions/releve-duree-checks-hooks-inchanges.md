# Intention : relever la durée du job `checks` quand les hooks sont inchangés

**Statut** : proposée le 2026-10-24 — limite du chantier « accélérer la CI
sans perte de qualité » (décision du demandeur, critère de durée, QUA-122).

## Besoin

Le saut du rejeu par la branche principale (QUA-123) n'agit qu'une fois
fusionné : la CI lit sur master l'ancienne copie de `.githooks/base-checks.mjs`. Gain
attendu : environ 2 minutes de moins que les passages à hooks modifiés
(3m02 à 4m37).

## Existant (relevé le 2026-10-24)

- Durées relevées (hooks modifiés) : 3m02, 3m45, 4m37 ; hooks inchangés : aucune.

## Questions à trancher

- Relever la durée du job `checks` sur la première PR ordinaire (hooks et
  `.drwil/ia-first.json` inchangés) après la fusion, la consigner au journal,
  puis supprimer cette fiche.
