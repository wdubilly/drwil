# Intention : conflits de clôture entre chantiers menés en parallèle

**Statut** : proposée le 2026-10-26 — limite du chantier « un chantier par worktree, lancé d'un geste humain » (journal du 2026-10-26).

## Besoin

Deux chantiers en worktrees touchent chacun l'index des chantiers et le journal : le second à fusionner a un conflit. Le besoin : que ce conflit soit rare ou résolu sans perte.

## Existant

Relevé le 2026-10-26 : le signal de retard de `close --check` (QUA-146) prévient la branche en retard sur la principale ; la recette décrit les conflits attendus. Aucune résolution automatique ; non mesuré sur des chantiers réels.

## Questions à trancher

- [décision] Une résolution assistée des conflits d'index et de journal, ou la mise à jour de la branche suffit-elle ?
