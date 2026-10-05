---
name: drwil-release
description: Post a Git tag and a GitHub release note on the latest merged chantier (optional module, never modifies a tracked file). Use once the module is activated on the project, to preview (--dry-run) then create the release.
---

Recipe: `docs/recipes/create-a-release.md`. Optional module, not
installed by default — first check that `.githooks/creer-release.mjs` (if present) exists
(otherwise follow the activation steps described in
the recipe before continuing). Always start with
`node .githooks/creer-release.mjs --dry-run` and show the result (last
tag, detected bump, next version) before actually creating anything.
