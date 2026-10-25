# Intention : découper `.githooks/close.mjs`, arrivé au plafond de lignes

**Statut** : proposée le 2026-10-25 — limite constatée à la clôture du chantier
« un hook modifié se déclare avant la clôture, et le retour en SCOPING attend
la CI » (journal du 2026-10-25).

## Besoin

`.githooks/close.mjs` (la clôture en un geste, QUA-048) compte 400 lignes, le
plafond de QUA-001 (fichier de code plafonné). Le signal des hooks non déclarés
(QUA-137) n'y est entré qu'en remplaçant une fonction par sa valeur : le
prochain ajout à la clôture demandera de découper le fichier, et ce découpage
pèserait sur un chantier qui n'en parle pas.

## Existant (relevé le 2026-10-25)

- Sujets mêlés dans le fichier : branches fusionnées (`branchMerged`,
  `pruneMergedBranches`, `closingMerged`), signaux de clôture
  (`closingReport`), consommation (`recordConsumption`), mécanique (`close`).
- Recette : `docs/recipes/refactor-without-breaking.md` (tests de
  caractérisation d'abord ; `.githooks/close.test.mjs` couvre déjà 100 %).

## Questions à trancher

- [décision] Découper maintenant (par exemple les branches fusionnées dans
  leur propre module), ou au prochain chantier qui touche la clôture ? Un
  nouveau module dans `.githooks/` est un hook modifié à déclarer (QUA-137).
