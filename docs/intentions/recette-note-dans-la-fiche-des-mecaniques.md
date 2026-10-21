# Intention : citer le module de note de recette dans la fiche des mécaniques et le README du module

**Statut** : proposée le 2026-10-21 — limite non traitée de la clôture « note de recette par version » (journal du 2026-10-21).

## Besoin

`.githooks/recette-note.mjs`, livré avec le module de release, n'est cité ni par la
fiche des mécaniques du kit (dépôt et gabarit : le périmètre d'un projet qui
active le module ne le couvre pas, son premier commit est refusé) ni par le
README du module. Le chantier ne pouvait pas les toucher : hors de son cadrage.

## Existant (relevé le 2026-10-21)

- `docs/projects/kit-mechanics.md` et sa copie livrée
  `packages/drwil/templates/common/base/docs/projects/kit-mechanics.md` citent
  chaque script du module sauf `.githooks/recette-note.mjs`.
- `packages/drwil/templates/common/optional/create-release/README.md` liste
  les scripts à copier sans `.githooks/recette-note.mjs` : un projet qui copie moins que
  la liste obtient une erreur d'import au lancement de `.githooks/create-release.mjs`.
- Le test du kit (`packages/drwil/test/kit.test.mjs`) ajoute la ligne dans le
  projet de test pour contourner le manque.

## Questions à trancher

- Ajouter les trois citations dans un chantier court (fiche à cadrer), puis
  retirer le contournement du test du kit.
