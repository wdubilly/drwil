---
name: drwil
description: Entry point to discover the kit's governance capabilities. Without an argument, shows a menu of capabilities and their dedicated command. With an argument (adopt, audit, value, usage, progress, release), goes straight to the matching recipe.
argument-hint: "[adopt|audit|value|usage|progress|release]"
arguments: capability
disable-model-invocation: true
---

Requested capability: `$capability`.

If `$capability` is empty, show this menu and stop there (don't run
anything else):

| Command | Capability | Recipe |
| --- | --- | --- |
| `/drwil-adopt` | Adopt the kit on an existing project | `docs/recipes/adopt-the-kit.md` |
| `/drwil-audit` | Audit risks and debt | `docs/recipes/audit-risks-and-debt.md` |
| `/drwil-value` | Discover product value | `docs/recipes/discover-product-value.md` |
| `/drwil-usage` | Track consumption per lot | `docs/recipes/track-consumption-per-lot.md` |
| `/drwil-progress` | View progress | `docs/recipes/view-progress.md` |
| `/drwil-release` | Create a release (tag + GitHub note), optional module | `docs/recipes/create-a-release.md` |

If `$capability` matches one of `adopt`, `audit`, `value`, `usage`,
`progress`, `release`, apply the matching recipe from the table above directly
(don't rewrite it here, read it and follow it). Otherwise, say the
capability isn't recognized and show the menu again.
