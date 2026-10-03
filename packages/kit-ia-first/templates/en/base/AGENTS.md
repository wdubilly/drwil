# Instructions for coding assistants

Single entry point for any AI (and any human) working on this repository.
Tool-specific files (CLAUDE.md, GEMINI.md, Cursor rules, Copilot
instructions…) only point back here. Details live in `docs/`: the content
must stay readable by any tool.

## The project in 5 lines

{{projectName}} — {{description}}
Full map and stack: `docs/architecture.md`.

## Conduct (always)

- **Scope**: do what is asked, nothing more. No out-of-scope change without
  justification and an explicit request.
- **Commits**: in English; commit or push only when asked.
- **Personal data**: an AI never shows identifying production data in its
  outputs or answers.
- **Secrets**: never in code, logs, commits or tool output.
- **Stack**: the user decides it. If `docs/architecture.md` says it is
  "not decided", propose one and wait for approval before writing any
  application code; if it says "detected", verify it before relying on it.
  Once approved, declare the lint and test commands in `.drwil/ia-first.json`
  (`checks` key) so they run on commit and in CI.
- **Docs**: wrong docs are worse than no docs — update them in the same commit
  as the code they describe. One piece of information, one source.
- **Proof before claim**: before writing "fixed", "passes" or "done", rerun
  the relevant check and read its output.
- **Cause before fix**: reproduce, then establish the root cause before changing code.
- **Leave it cleaner**: document and report any gap you find.
- **End-of-task report**: files created/changed, checks run and exact results, remaining limits and ambiguities.

## Contracts

`docs/contracts.md` is the **single source** of invariants. Cite the ID. Before a significant change, identify the applicable contracts and recipe.

## Load context progressively

1. This file (always).
2. The file of the layer you touch (if any): read that folder's `AGENTS.md`.
3. The recipe or document listed below.
4. `docs/contracts.md` for the details of an ID, or when a check fails.
5. Nothing else without a reason.

| If you touch… | Read first | Recipe |
|---|---|---|
| an API route | `backend/AGENTS.md` (if present) | `docs/recipes/add-an-api-route.md` |
| a screen | `frontend/AGENTS.md` (if present) | `docs/recipes/add-a-frontend-screen.md` |
| a major refactor | — | `docs/recipes/refactor-without-breaking.md` |
| deployment | `docs/deployment.md` (if present) | `docs/recipes/deploy-to-production.md` |

## Commands

- Run all checks: `node .githooks/run-checks.mjs`
- Enable hooks (once per clone): `git config core.hooksPath .githooks`

## Conventions

- Code, comments, commit messages and UI in English.
- Comments: only the non-obvious **why** (constraint, known pitfall). Not the what.
