# Intention : nettoyer les worktrees d'un chantier fusionné

**Statut** : proposée le 2026-10-26 — limite du chantier « un chantier par worktree, lancé d'un geste humain » (journal du 2026-10-26).

## Besoin

Un worktree créé au lancement (`../<dépôt>-<fiche>`) reste sur le disque après la fusion de son chantier. Le besoin : que le dossier soit retiré proprement, sans perdre de travail non fusionné.

## Existant

Relevé le 2026-10-26 : la recette `docs/recipes/working-with-branches.md` indique le nettoyage à la main (`git worktree remove`) ; aucun outil ne le fait, et la suppression des branches fusionnées (QUA-048) ne retire pas le dossier.

## Questions à trancher

- [décision] Un outil retire-t-il le worktree à la clôture, ou la recette suffit-elle ?
- [décision] Que faire d'un worktree dont la branche n'est pas fusionnée ?
