# Intention : réduire la durée du rejeu par la branche principale en CI

**Statut** : proposée le 2026-10-24 — limite du chantier « les
contournements restants fermés ou assumés » (journal du 2026-10-24).

## Besoin

Le rejeu des contrôles avec les hooks de la branche principale (QUA-113,
sur une PR, la CI rejoue les contrôles avec les hooks de la branche
principale) relance toute la suite : dans ce dépôt, le job `checks`
dure environ 3 minutes de plus, soit à peu près le double. Un projet adopté
paie le même doublement.

## Existant (relevé le 2026-10-24)

- `.githooks/base-checks.mjs` extrait `.githooks/` de la base par
  `git show` et rejoue tous les contrôles déclarés, dans le même job.

## Questions à trancher

- [décision] Ne rejouer que lorsque la PR touche `.githooks/` ou la liste
  de contrôles (sinon les deux passages sont identiques), le lancer dans un
  job parallèle, ou garder le rejeu complet ?
