# Intention : supprimer aussi les branches fusionnées par squash

**Statut** : proposée le 2026-10-18 — limite du chantier « une clôture
allégée, sans encombrants » (journal du 2026-10-18, 0.6.5, 3 sur 4).

## Besoin

Au lancement d'un chantier, les branches locales déjà fusionnées sont
supprimées (QUA-048, clôture en un geste). Seules le sont les branches
dont le dernier commit est dans la branche principale : un projet qui
fusionne par squash (choix laissé au projet par la recette des branches)
garde ses branches, que Git ne voit pas comme fusionnées.

## Existant (vérifié le 2026-10-18)

- `.githooks/close.mjs` (`pruneMergedBranches`) : `git branch --merged`
  puis `git branch -d`, qui refuse toute branche non fusionnée.
- Ce dépôt fusionne par commit de fusion (`gh pr merge --merge`) : non
  concerné.

## Questions à trancher

- [décision] Reconnaître une branche fusionnée par squash (branche
  distante supprimée par la forge, ou contenu déjà présent dans la branche
  principale) au risque d'un faux positif, ou s'en tenir à `git branch -d` ?
