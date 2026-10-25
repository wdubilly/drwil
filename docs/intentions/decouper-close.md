# Intention : découper `.githooks/close.mjs`, arrivé au plafond de lignes

**Statut** : cadrée le 2026-10-25 dans `docs/projects/decouper-close.md` — limite constatée à la clôture du chantier
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

Le demandeur a choisi le 2026-10-25 un chantier dédié maintenant, livré
aux projets et installé dans le dépôt, sans changement de comportement.
Déclarations et critères : `docs/projects/decouper-close.md`.
Aucun point restant à trancher pour ce chantier.
