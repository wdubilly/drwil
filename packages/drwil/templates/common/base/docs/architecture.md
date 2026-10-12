# Architecture — {{projectName}}

As of {{date}}. Map of the repository: what lives where. Keep it up to date in the same commit as the code it describes.

## What the application does

{{description}}

## Stack

{{stack}}

## Layers

{{layersList}}

## AI-first governance

- AI instructions: `AGENTS.md`, then the `AGENTS.md` of the layer you touch.
- Invariants: `docs/contracts.md`.
- Recipes: `docs/recipes/`.
- Checks: `.githooks/run-checks.mjs`, run on commit by `.githooks/pre-commit`{{ciLine}}. Stack-specific checks are declared in `.drwil/ia-first.json` (`checks` key).
- Kit configuration: `.drwil/ia-first.json`.
