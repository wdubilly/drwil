# Project: kit mechanics (files owned by the kit)

**Status**: mechanics shipped at kit install time, {{date}}.

<!-- cadrage
fichiers:
  - .githooks/run-checks.mjs
  - .githooks/check-docs.mjs
  - .githooks/check-control-coverage.mjs
  - .githooks/glob.mjs
  - .githooks/cadrage.mjs
  - .githooks/cadrage.test.mjs
  - .githooks/pre-commit
  - .githooks/pre-push
  - .githooks/commit-msg
  - .githooks/check-file-size.mjs
  - .githooks/check-file-size.legacy.json
  - .githooks/check-code-rules.mjs
{{cadrageCi}}
{{cadrageClaude}}
-->

## 1. Need

The commit check (`.githooks/check-docs.mjs`) reports any indexed code file
not covered by a `docs/projects/` fiche (scoping reminder, severity set in
`.drwil/ia-first.json` -> `cadrage`: `avertissement` by default, `bloquant`
optional). Without this fiche, the files the kit itself writes would be
reported from the project's very first commit (blocking if `bloquant` is
chosen).

## 2. Out of scope

The project's own application code: each piece of work carries its own
`cadrage` block in its fiche. A small task that does not deserve its own
fiche attaches to the project's running-chores fiche, once the project adds
one (English fiche templates are not shipped yet — see the kit's own
hand-off doc).

## Hand-off

- **Last state**: fiche shipped at install time, nothing to hand off. If the
  kit adds a new mechanics file (`.githooks/` or an AI tool setting), add it
  here. Lot 4 added `.githooks/check-control-coverage.mjs` (QUA-013),
  `.githooks/pre-push`, `.githooks/commit-msg` (shipped disabled) and
  `.githooks/cadrage.test.mjs`. Lot 5 added `.githooks/check-file-size.mjs`
  and its legacy-ceiling file `.githooks/check-file-size.legacy.json`, plus
  the empty extension point `.githooks/check-code-rules.mjs` — all three
  shipped but **opt-in** (not run until the project declares them in
  `.drwil/ia-first.json → checks`).
