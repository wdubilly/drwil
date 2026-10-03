# Architecture — {{projectName}}

État au {{date}}. Carte du dépôt : où vit quoi. À tenir à jour dans le même commit que le code qu'elle décrit.

## Ce que fait l'application

{{description}}

## Stack

{{stack}}

## Couches

{{layersList}}

## Gouvernance IA-first

- Consignes des IA : `AGENTS.md`, puis l'`AGENTS.md` de la couche touchée.
- Invariants : `docs/contrats.md`.
- Recettes : `docs/recettes/`.
- Contrôles : `.githooks/run-checks.mjs`, lancé au commit par `.githooks/pre-commit`{{ciLine}}. Les contrôles propres à la stack se déclarent dans `.drwil/ia-first.json` (clé `checks`).
- Configuration du kit : `.drwil/ia-first.json`.
