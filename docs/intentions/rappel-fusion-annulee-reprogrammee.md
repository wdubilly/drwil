# Intention : le rappel « fusion annulée » doit tomber quand l'humain reprogramme la fusion

**Statut** : proposée le 2026-10-29 — limite du chantier « la réouverture dit ce qu'elle a annulé » (journal du 2026-10-29).

## Besoin

Une réouverture échouée après l'annulation de la fusion automatique pose la marque `merge_cancelled` de l'état (QUA-181) ; elle ne tombe qu'à une réouverture réussie ou au retour en SCOPING. Si l'humain reprogramme la fusion (`gh pr merge --auto`) sans rouvrir, le contexte continue de dire que la fusion est annulée.

## Existant (relevé le 2026-10-29)

- `.githooks/state-reopen.mjs` pose la marque ; `.githooks/state-transitions.mjs` (`prepareTransition`) l'efface au retour en SCOPING ; `.githooks/state-texts.mjs` la redit.
- La programmation de la fusion (`node .githooks/merge-auto.mjs`) ne touche pas l'état.

## Questions à trancher

- [décision] Faire effacer la marque par `node .githooks/merge-auto.mjs` quand la fusion est vue programmée, ou lire `autoMergeRequest` par `gh` au moment du rappel (un appel réseau par invite) ?
