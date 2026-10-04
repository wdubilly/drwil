# Contracts (single source of invariants)

**Single source of the project's invariants.** Other documents
(`AGENTS.md`, layer `AGENTS.md` files, recipes, skills) cite a contract by
its ID and do not copy its rule.

A **contract** is an invariant of the product or the code whose violation
can be objectively observed (in the repo or at runtime). It has a stable ID
(never reassigned, even once removed), a normative rule, a scope, a source
of truth (the code that implements it), a proof and a reason. Principle:
**a contract that matters is machine-checked**; a **human** proof is
flagged as such: it's the next check to tool up.

Where the checks run: pre-commit hook (`.githooks/run-checks.mjs`, to
enable once per clone with `git config core.hooksPath .githooks`) and CI
if configured.

This registry only holds the **baseline** installed by default and the
contracts specific to this project. `docs/contracts-catalog.md` offers
other generic contracts, not yet adopted (see
`docs/recipes/adopt-the-kit.md`).

## Security (SEC)

| ID | Rule | Scope | Source of truth | Proof | Reason |
|---|---|---|---|---|---|
| SEC-006 | No dependency with a known vulnerability. | project dependencies | dependency manifest (e.g. package.json, requirements.txt) | audit declared by the project (`.drwil/ia-first.json` → `checks`), hook + CI | a vulnerable library voids the rest |
| SEC-007 | No secret in the repo (`.env`, keys, passwords, client configs). | the whole repo and its history | — | gitleaks: indexed files (hook, if installed) + full history (CI job, if configured) | an irreversible leak once pushed |

## Quality (QUA)

| ID | Rule | Scope | Source of truth | Proof | Reason |
|---|---|---|---|---|---|
| QUA-011 | Every repo path and every contract ID cited in the docs and the skills exist (IDs defined exactly once in the registry). | `AGENTS.md`, layer `AGENTS.md` files, `docs/`, `.claude/skills/` (if present) | — | `.githooks/check-docs.mjs` (hook + CI) | wrong docs mislead AIs |
| QUA-013 | No check can disappear without it being visible. A check that cannot run on a workstation (missing tool) is only ever a warning, never a silent success. A degradable check must also have a CI job triggered on the same paths (verified, not just assumed). | the checks in `.githooks/run-checks.mjs` | `.githooks/run-checks.mjs`, `.githooks/check-control-coverage.mjs` and its run history | **machine**: every check ends up "failed", "OK" or "not run", never hidden; CI coverage is replayed (hook + CI, if there is a CI) | a check that can silently not run is, eventually, a check that proves nothing |
| QUA-015 | Projects resumable cold: every open item in the project index carries an `[AI]`, `[human]` or `[decision]` marker; every sheet in `docs/projects/` and `docs/intentions/` (excluding the index and README) has a dated "Status" line at the top (YYYY-MM-DD); every intent sheet has "Need", "Current state" and "Open questions" sections; every project sheet has a "Resuming work" section (handoff). Extension: an index item that cites a sheet whose "Status" contains `done`/`closed`/`terminé` must be checked, and vice versa (non-blocking warning). | `docs/projects/`, `docs/intentions/` | `docs/ia-first.md` (section 7) | `.githooks/check-docs.mjs` (hook + CI); accuracy of status and content: **human** | an agent picks up a project cold: without status or marker, it redoes the work, attempts a human gesture or decides in the requester's place |
| QUA-016 | Scoping reminder: every indexed code file is covered by the `cadrage` block of a sheet in `docs/projects/`; a malformed block (no `fichiers:` line, too broad a pattern) is rejected. `docs/` and any markdown file are never code. Severity configurable per project (`.drwil/ia-first.json` -> `cadrage`: `avertissement` by default, never blocking; `bloquant` to restore the strict behaviour; `off` to disable). | the whole repo (indexed files), excluding `docs/` and markdown | `.githooks/cadrage.mjs`, `docs/ia-first.md` (section 7) | `.githooks/check-docs.mjs` (hook + CI, severity per setting); informative reminder to the agent: `.claude/hooks/rappel-cadrage.mjs` (if present, silent if `cadrage: off`) | code detached from any project gets lost, for an agent as much as for a person |

## Out of registry (these are not contracts)

| Rule | Nature | Where it lives |
|---|---|---|
| Commits, personal data in an AI's outputs, secrets in tool output, attack testing on a real target, docs kept current in the same commit | conduct (human) | `AGENTS.md`, Conduct section |
| Refactor without behavior change | procedure (human) | `docs/recipes/refactor-without-breaking.md` |
| File size, project-specific code hygiene rules | opt-in tooling (no universal threshold) | `.githooks/check-file-size.mjs`, `.githooks/check-code-rules.mjs`, `docs/recipes/refactor-without-breaking.md` |
| Tests shipped with every new component | convention (human) | the relevant layer's `AGENTS.md` |
