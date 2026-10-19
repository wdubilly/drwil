# Intention : les essais en réel reconnus sans liste de mots

**Statut** : proposée le 2026-10-19 — limite du chantier « une recette par
version, pour une équipe hors dépôt » (journal du 2026-10-19, 0.6.5).

## Besoin

La fiche de recette (QUA-052, la fiche dit quoi valider, puis ce que la
non-régression a prouvé) range parmi « pas encore essayé en réel » toute
limite connue du journal qui contient « en réel », « essai réel » ou leurs
équivalents anglais (depuis le 2026-10-19, plus aucune phrase de besoin ou
de décision : journal « une fiche de recette juste »). Une limite qui le
dit autrement reste une simple limite ; une limite qui cite le mot sans
parler d'un essai à faire change de nature — constaté sur la 0.6.5 :
« essais en réel reconnus par une liste de mots » devient un point « pas
encore essayé en réel ».

## Existant (vérifié le 2026-10-19)

- `.githooks/acceptance-sheet.mjs` (`realTrials`) : liste de mots,
  appliquée aux seules limites connues.
- Les critères humains et les limites connues, eux, viennent de champs
  structurés (marqueur humain des critères, champ « Limites connues » du
  journal).

## Questions à trancher

- [décision] Un champ structuré dans l'entrée de journal (« Pas essayé en
  réel : … »), demandé par la recette de clôture, à la place de la liste
  de mots — ou garder la liste de mots ?
