# Intention : la dernière version d'une fiche fusionnée par squash dans la fiche de recette

**Statut** : proposée le 2026-10-19 — limite du chantier « une fiche de
recette juste, leçons de la 0.6.5 » (journal du 2026-10-19, 0.6.6, 4 sur
4).

## Besoin

La fiche de recette (QUA-052, la fiche dit quoi valider, puis ce que la
non-régression a prouvé) lit chaque fiche de chantier juste avant le
commit qui l'a supprimée. Avec une fusion classique, c'est un commit de la
branche du chantier : la dernière version. Avec une fusion par squash, le
commit qui la supprime est le squash lui-même, posé sur la branche
principale : son parent garde la version du cadrage, et les critères
corrigés ou rattachés pendant le chantier n'apparaissent pas corrigés.

## Existant (vérifié le 2026-10-19)

- `.githooks/acceptance-sheet.mjs` (`briefText`) : version au commit de la
  candidate, sinon parent du dernier commit (hors fusion) qui supprime la
  fiche.
- Ce dépôt fusionne ses PR par commit de fusion : non touché.
- Les commits de la branche d'un squash ne sont plus dans l'historique de
  la branche principale ; gh peut encore les donner (commits de la PR).

## Questions à trancher

- [décision] Lire la fiche au dernier commit de la PR (gh) quand le
  commit qui la supprime est un squash, ou le signaler dans la fiche de
  recette (« version du cadrage, fusion par squash ») ?
