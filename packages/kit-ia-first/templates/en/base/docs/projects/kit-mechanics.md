# Project: kit mechanics (files owned by the kit)

**Status**: mechanics shipped at kit install time, {{date}}.

<!-- cadrage
fichiers:
  - .githooks/run-checks.mjs
  - .githooks/check-docs.mjs
  - .githooks/check-control-coverage.mjs
  - .githooks/cadrage.mjs
  - .githooks/cadrage.test.mjs
  - .githooks/pre-commit
  - .githooks/pre-push
  - .githooks/commit-msg
{{cadrageCi}}
{{cadrageClaude}}
-->

## 1. Need

The commit check (`.githooks/check-docs.mjs`) rejects any indexed code file
not covered by a `docs/projects/` fiche (blocking cadrage reminder). Without
this fiche, the files the kit itself writes would block the project's very
first commit.

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
  `.githooks/cadrage.test.mjs`.
