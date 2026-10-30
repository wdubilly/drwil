# Intention : déclarer les copies `.githooks/` du module de release dans `scopeMirrors`

**Statut** : proposée le 2026-10-30 — limite du chantier « release allégée » (journal du 2026-10-30).

## Besoin

Les fichiers du module `packages/drwil/templates/common/optional/create-release/` ont leur copie dans `.githooks/` (`.githooks/create-release.mjs`, `.githooks/recette-note.mjs` et leurs textes). Le bloc scope d'une fiche doit aujourd'hui les citer un par un ; ils ne sont pas déclarés dans `scopeMirrors` de `.drwil/ia-first.json`, qui couvre leur copie par le gabarit.

## Existant

Relevé le 2026-10-30 : `scopeMirrors` (`.drwil/ia-first.json`) ne contient pas les copies `.githooks/` du module optionnel de release ; le cadrage du chantier a dû les lister une à une.

## Questions à trancher

- [décision] Ajouter ces copies à `scopeMirrors`, pour qu'un fichier du gabarit du module couvre sa copie du dépôt, dans un chantier court ?
