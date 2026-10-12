# Dashboard (optional)

Module **not installed by default**: `scaffold()` does not copy this
folder. Generates a **single static HTML file** (no server, no container,
no dependency): progress of the workstreams and coverage of the contracts,
read straight from the existing `.md` files. It invents and recomputes no
state — it shows the « Status » line and the increments as written in each
brief ("one piece of information, one source", `docs/ia-first.md`
section 7).

## Contents

- `tableau-de-bord.mjs`: the generator, bilingual (FR/EN according to `.drwil/ia-first.json -> lang`).

## Activation

1. Copy `tableau-de-bord.mjs` into the project's `.githooks/`.
2. Run it by hand, when needed: `node .githooks/tableau-de-bord.mjs
   [output-path]` (default: `docs/tableau-de-bord.html`). **Never** in CI
   or at commit — it is a reading tool, not a check.
3. Add the output file to `.gitignore` (it is a derived artefact, not a
   source).

## What it shows

- **Workstreams**: the index checkboxes (`docs/projects/pending.md` or
  equivalent) as they are, then for each brief in `docs/projects/`
  (templates excluded) its title, its raw « Status » line and the
  increments of its « Lots » section (title, marker, first text excerpt).
- **Contracts**: the registry IDs (`docs/contracts.md`) with their rule,
  then those of the catalog (`docs/contracts-catalog.md`, not installed) —
  both definition formats are recognised (`## ID — ...` heading or
  `| ID | ... |` table, same detection as `.githooks/check-docs.mjs`).

Accepted limit: the generic shape of a brief does not structurally encode
a done/not done status per increment — this dashboard does not try to
infer it, it copies the existing text.
