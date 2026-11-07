# Intention : le commentaire de `merge_cancelled` dans `.githooks/state-validate.mjs` dit la règle actuelle de QUA-181

**Statut** : proposée le 2026-11-06 — limite du chantier « merge-auto dit vrai sur une PR déjà verte, et efface le rappel « fusion annulée » » (journal du 2026-11-06).

## Besoin

QUA-181 (une réouverture échouée après l'annulation de la fusion automatique dit que l'humain la reprogramme) a changé le 2026-11-06 : la marque `merge_cancelled` tombe aussi quand `node .githooks/merge-auto.mjs` voit la fusion programmée sur sa PR. Le commentaire de `.githooks/state-validate.mjs` (ligne 30, gabarit et copie) dit encore « until a reopening succeeds or back in SCOPING ». Le fichier était hors du périmètre du chantier.

## Existant (relevé le 2026-11-06)

- `.githooks/state-validate.mjs:30` (et `packages/drwil/templates/common/base/.githooks/state-validate.mjs:30`) : « until a reopening succeeds or back in SCOPING ».
- `.githooks/merge-auto.mjs` (`withMarkCleared`) efface la marque ; son test est dans `.githooks/merge-auto.test.mjs`.

## Questions à trancher

- [décision] Corriger le commentaire seul (petit chantier ou détour), ou à l'occasion du prochain chantier qui touche `.githooks/state-validate.mjs` ?
- [décision] Le contrôle `tests-qua-181` de `.drwil/ia-first.json` ne lance que `.githooks/state.test.mjs` : y ajouter `.githooks/merge-auto.test.mjs`, où vit depuis le 2026-11-06 le test de la marque effacée par `merge-auto` (il tourne aujourd'hui dans les tests des hooks, pas dans le contrôle de la règle) ?
