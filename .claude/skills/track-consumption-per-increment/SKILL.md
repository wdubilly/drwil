---
name: drwil-usage
description: Record in .drwil/usage.jsonl the tokens consumed, the model used, and the setup time for an increment that just finished. Use when closing an increment, to feed the dashboard and the analysis reports.
---

Recipe: `docs/recipes/track-consumption-per-increment.md`. Format
`.drwil/usage.jsonl` (to create) (append-only, one JSON line per increment: `workstream`,
`increment`, `tokens`, `model`, `duration_min`, `date`). With Copilot CLI, query
`session_store_sql` (model/tokens in `session_usage`, timestamps in
`turns`/`events`) to fill the line; otherwise estimate by hand. Later read
by the dashboard (`.githooks/dashboard.mjs` (to create)) and by the
`audit-risks-and-debt` and `discover-product-value` skills ("Consumption
overview" section). Never for billing or blocking a commit — purely
informative.
