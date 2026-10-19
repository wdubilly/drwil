# Intention : les essais en réel reconnus sans liste de mots

**Statut** : proposée le 2026-10-19 — limite du chantier « une recette par
version, pour une équipe hors dépôt » (journal du 2026-10-19, 0.6.5).

## Besoin

La fiche de recette (QUA-052, la fiche dit quoi valider, puis ce que la
non-régression a prouvé) range parmi « pas encore essayé en réel » toute
phrase d'une fiche ou d'une entrée de journal qui contient « en réel »,
« essai réel » ou leurs équivalents anglais. Une phrase qui le dit
autrement est manquée ; une phrase qui cite le mot sans parler d'un essai
à faire devient un point de trop.

## Existant (vérifié le 2026-10-19)

- `.githooks/acceptance-sheet.mjs` (`realTrials`) : liste de mots.
- Les critères humains et les limites connues, eux, viennent de champs
  structurés (marqueur humain des critères, champ « Limites connues » du
  journal).

## Questions à trancher

- [décision] Un champ structuré dans l'entrée de journal (« Pas essayé en
  réel : … »), demandé par la recette de clôture, à la place de la liste
  de mots — ou garder la liste de mots ?
