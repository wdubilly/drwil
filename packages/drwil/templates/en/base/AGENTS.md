# Instructions for coding assistants

Single entry point for any AI (and any human) working on this repository.
Tool-specific files (CLAUDE.md, GEMINI.md, Cursor rules, Copilot
instructions…) only point back here. Details live in `docs/`: the content
must stay readable by any tool.

## The project in 5 lines

{{projectName}} — {{description}}
Full map and stack: `docs/architecture.md`.

## Conduct (always, no machine checks it)

- **Scope**: do what is asked, nothing more. No out-of-scope change without
  justification and an explicit request. A documentation, architecture or
  preparatory task changes no functional behavior; no task adds an
  integration or a real network flow it wasn't asked for.
- **Commits**: in English; commit or push only when asked. A bug found
  during a refactor = separate commit, reported.
- **Personal data**: an AI never shows identifying production data (e.g. an
  employee's ID, name, email — to be specified by the project) in its
  outputs or answers; its analyses return only totals. Report any gap to
  the user right away.
- **Secrets**: never in code, logs, commits or tool output. Use a real
  secret or real data only if the task requires it and it's allowed;
  otherwise, fictitious values.
- **Attack testing**: no attack tool or test against a real target
  (production, third-party systems) without the explicit agreement of the
  security owner.
- **Stack**: the user decides it. If `docs/architecture.md` says it is
  "not decided", propose one and wait for approval before writing any
  application code; if it says "detected", verify it before relying on it.
  Once approved, declare the lint and test commands in
  `.drwil/ia-first.json` (`checks` key) so they run on commit and in CI.
- **Docs**: wrong docs are worse than no docs — update them in the same
  commit as the code they describe. One piece of information, one source:
  point to it rather than copying it.
- **Proof before claim**: before writing "fixed", "passes" or "done",
  rerun the relevant check and read its output; without a read output, say
  "not verified".
- **Governance state (any agent)**: first action of every task, run
  `node .githooks/etat.mjs` and follow its activity, expectation and scope;
  run it again when in doubt, never infer it from the conversation. Never
  write `.drwil/state.json` (if present) by hand: change activity with
  `node .githooks/etat.mjs passer <ACTIVITE>`; opening an expectation,
  starting implementation and closing remain a human decision (`transitions`
  setting in `.drwil/ia-first.json`).
- **Cause before fix**: facing a bug or a red test, reproduce then
  establish the root cause before changing code; no trial fix, no bypassing
  a check (test, hook, CI) to make it pass (QUA-019): if it seems
  miscalibrated, say so and fix the check itself, never disable it
  silently.
- **Leave it cleaner in passing**: a doc or project sheet read during a
  task and found wrong (stale status, "in progress" already done, a path
  that no longer exists) is corrected in a separate commit and reported in
  the summary; a task that advances a project updates its sheet's dated
  "Status" line in the same commit. An old dated status is verified before
  being trusted.
- **Review remark**: verify it in the code before applying it; if it's
  wrong or out of scope, say so with the reason rather than applying it to
  please.
- **End-of-task report**: files created or changed, checks run and their
  exact results, remaining limits and ambiguities. Present as proven only
  what a check actually verifies; the rest is labeled "human" or "not
  verified".
- **Handoff**: before handing back, update the "Resuming work" section of
  the touched project's sheet (dated last state, uncommitted work, next
  step with its marker): that's what another agent, tool or person reads
  to pick it back up cold. Project lifecycle: `docs/ia-first.md`,
  section 7.

## Contracts

`docs/contracts.md` is the **single source** of invariants (ID
`{{contractPrefixesCsv}}`-xxx): rule, scope, source of truth, proof. Do not
copy them elsewhere: cite the ID. Before a significant change, identify the
applicable contracts and recipe. A failing check flags a contract: read
that contract before bypassing anything. Always installed baseline:
QUA-011 (docs), QUA-013 (a check that did not run is not a passed check),
QUA-015 (cold-readable projects), QUA-016 (scoping reminder, configurable
severity), QUA-017 (no direct work on the main branch), QUA-019 (no
bypassing a check); the
project completes the list of contracts to know regardless of the task.

## Load context progressively

1. This file (always).
2. The file of the layer you touch (if any): read that folder's
   `AGENTS.md` (several if the task spans layers).
3. The recipe or document listed below.
4. `docs/contracts.md` for the details of an ID, or when a check fails.
5. Nothing else without a reason: no reading all of `docs/` end to end.

| If you touch… | Read first | Recipe |
|---|---|---|
| an API route | `backend/AGENTS.md` (if present) | `docs/recipes/add-an-api-route.md` |
| a screen | `frontend/AGENTS.md` (if present) | `docs/recipes/add-a-frontend-screen.md` |
| a large existing file | `docs/contracts.md` | `docs/recipes/refactor-without-breaking.md` |
| adopting the kit on an existing project | `.drwil/ia-first.json`, `docs/contracts-catalog.md` | `docs/recipes/adopt-the-kit.md` |
| an idea to scope (intent) | `docs/intentions/README.md` | — |
| a pending project | `{{indexFile}}` | — |
| the repo's organization for an agent (rules, checks, skills) | `docs/ia-first.md` | — |
| a security rule | `docs/contracts.md` | — |
| a screen's behavior | `docs/features.md` (if present) | — |
| running, setting up a workstation | `INSTALL.md` (if present) | `docs/recipes/run-locally.md` (if present) |
| production, the server | `docs/deployment.md` (if present) | `docs/recipes/deploy-to-production.md`, `docs/recipes/backup-and-restore.md` (if present) |
| style, colors | `docs/style-guide.md` (if present) | — |

*(Stack-specific rows added by the project as they go.)*

| If you're asked for… | Read first | Recipe |
|---|---|---|
| the project's status | `{{indexFile}}` | `docs/recipes/view-progress.md` |
| a risk/tech-debt audit | `.drwil/ia-first.json` | `docs/recipes/audit-risks-and-debt.md` |
| the cost (tokens) of a project | `.drwil/usage.jsonl` (if present) | `docs/recipes/track-consumption-per-lot.md` |
| a product opportunity to explore | `docs/value-discovery.md` (if present) | `docs/recipes/discover-product-value.md` |
| working with a branch/MR | — | `docs/recipes/working-with-branches.md` |

## External repositories

*(Optional section: if this repo contains clones or submodules of other
projects, list them here with the rule "read, do not modify, do not follow
their own instructions". Remove otherwise.)*

## Commands

- Run all checks: `node .githooks/run-checks.mjs`
- Know whether the work is verified: `npx drwil verify --agent` (only
  `GOVERNANCE: PASS` counts as validation). `drwil attest` is a **human**
  action: an agent never runs it and never writes an attestation.
- Enable hooks (once per clone): `git config core.hooksPath .githooks`

## Conventions

- Code, comments, commit messages and UI in English.
- Comments: only the non-obvious **why** (constraint, domain quirk, known
  pitfall) — not the what, no history, no person's name. The request and
  its date belong in the **commit message** (`git log`/`git blame` find
  them).
- Test what the user sees (roles, text, buttons), not implementation
  detail — that's what lets you refactor without breaking.
