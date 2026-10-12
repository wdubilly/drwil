# Recipe: track consumption per increment/project

Goal: know, increment by increment, how many tokens were used, which model was
employed, and how long the setup took — never for billing or blocking a
commit, just to inform project tracking.

## Format: `.drwil/usage.jsonl` (to create)

Append-only file at the project root, one JSON line per increment closure:

```json
{ "chantier": "add-csv-export", "lot": "Lot 2", "tokens": 42000, "modele": "claude-sonnet-5", "duree_min": 95, "date": "2026-10-04" }
```

- `chantier`: file name (without extension) of the `docs/projects/<project>.md`
  brief concerned.
- `lot`: the increment's title as written in its brief (`## Lots`).
- `tokens`: order of magnitude of tokens consumed for this increment (integer).
- `modele`: identifier of the model used (e.g. `claude-sonnet-5`). If
  several models were used on the same increment, either one line per model or
  `"mixte"`.
- `duree_min`: setup time for the increment, in minutes.
- `date`: increment closure date (`YYYY-MM-DD`).

The file is never recomputed: each line is written once, at increment closure,
never rewritten afterwards.

## Who fills the file?

No standalone script: session data (tokens, model, duration) is only
accessible to the running AI agent, not to an external process. So it's
the AI that, when closing an increment, appends the line:

- **With Copilot CLI**: query `session_store_sql` (`session_usage` table
  for model and tokens; `turns`/`events` for the increment's start/end
  timestamps, hence `duree_min`), then append the JSON line to
  `.drwil/usage.jsonl` (to create).
- **With another AI tool**, or without a queryable history: estimate by
  hand (an order of magnitude is enough) and fill `modele` and
  `duree_min` as best as possible rather than omitting the line.

## Reading: the dashboard

`docs/recipes/view-progress.md` (optional module
`.githooks/tableau-de-bord.mjs` (to create)) reads `.drwil/usage.jsonl` (to create)
if it exists
and shows, per project: total tokens, total minutes and the list of
models used. If the file is absent, the dashboard works exactly as
before (no regression).

## The analysis skills

`audit-risks-and-debt` and `discover-product-value` also show, at the top
of their report, a short overview (section "Consumption overview")
summarizing `.drwil/usage.jsonl` (to create) if it exists — never invented if the
file is absent.
