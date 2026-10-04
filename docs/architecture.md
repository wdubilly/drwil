# Architecture — drwil

État au 2026-10-04. Carte du dépôt : où vit quoi. À tenir à jour dans le même commit que le code qu'elle décrit.

## Ce que fait l'application

(à décrire : ce que fait l'application, pour qui)

## Stack

- `./` : Node.js (TypeScript)

Détectée à l'installation d'après les fichiers de projet : à confirmer par l'utilisateur.

## Couches

Aucune couche séparée : le code vit à la racine du dépôt.

## Gouvernance IA-first

- Consignes des IA : `AGENTS.md`, puis l'`AGENTS.md` de la couche touchée.
- Invariants : `docs/contrats.md`.
- Recettes : `docs/recettes/`.
- Contrôles : `.githooks/run-checks.mjs`, lancé au commit par `.githooks/pre-commit` et en CI (`.github/workflows/ia-first.yml`). Les contrôles propres à la stack se déclarent dans `.drwil/ia-first.json` (clé `checks`).
- Configuration du kit : `.drwil/ia-first.json`.
