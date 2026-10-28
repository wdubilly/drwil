# Intention : la fusion automatique ordonnée éprouvée sur une vraie PR en retard

**Statut** : proposée le 2026-10-28 — limite du chantier « la fusion automatique s'enchaîne dans l'ordre par un outil » (journal du 2026-10-28).

## Besoin

`node .githooks/merge-auto.mjs` n'a été joué qu'avec un `gh` simulé : la mise à jour d'une PR `BEHIND` par `gh pr update-branch`, le recalcul de `mergeStateStatus` qui suit, et le refus « Auto merge is not allowed for this repository » n'ont pas été vus sur une vraie PR.

## Existant (relevé le 2026-10-28)

- `.githooks/merge-auto.test.mjs` : ordre des appels, états `UNKNOWN`/`BEHIND`/`DIRTY`, refus du dépôt, programmation non vue, tous avec `gh` simulé.
- `.githooks/pr-watch.mjs` : suit la CI et la fusion, inchangé.

## Questions à trancher

- [décision] Jouer l'outil à la première PR réelle en retard sur `master` (la prochaine clôture avec fusion automatique), et noter ici ce que `gh` répond vraiment (délai du recalcul de l'état après la mise à jour) ; ajuster le délai par défaut de 5 minutes si besoin.
