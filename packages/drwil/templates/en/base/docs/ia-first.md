# "IA first" architecture — description

State as of {{date}}. This document explains **how this repo is built to be
modified by agents**: where the rules live, who checks them, and what is
not checked. It describes neither the product nor the detail of invariants
(single source: `docs/contracts.md`); the product, if described, lives in
docs/features.md and docs/architecture.md (if present). Like the rest of
the repo, it is to be updated in the same commit as what it describes.

"IA first" names a property of the repo, not a product feature: **the rule
is written in the repo and checked by a machine, not entrusted to the
assistant writing the code.**

## 1. A single entry point, and a budgeted context

The setup is deliberately minimal and readable by any tool, not only a
given assistant:

- `AGENTS.md` carries the conduct rule, the contracts to know, the "if you
  touch… read first" table, and the context-loading order.
- `CLAUDE.md` and `GEMINI.md`, if present, contain only one line,
  `@AGENTS.md` (some tools don't read `AGENTS.md` on their own): there is
  no second copy of the instructions to keep in sync.
- One `AGENTS.md` per layer: a task's context is read in the touched
  folder, not the whole repo. Each layer has the same one-line redirect as
  the root.
- `docs/` is plain markdown, readable without any install.

Context loading is **progressive and bounded** (`AGENTS.md`, "Load context
progressively" section): this file, then the layer's `AGENTS.md`, then the
recipe or document from the table, then `docs/contracts.md` for an ID's
detail, then "nothing else without a reason".

Consequence: switching assistants changes nothing in what it reads, and the
context loaded for a task stays proportionate to the task.

## 2. One piece of information, one source

Since duplication is the first cause of wrong docs, the repo forbids
copying:

- **skills** (`.claude/skills/`, if present) are shortcuts, not recipes:
  each contains only the trigger and a pointer to the recipe in
  `docs/recipes/`, which is itself the substance;
- layer `AGENTS.md` files do not copy a contract's rule, they cite its ID
  and give the file where to read it;
- `docs/contracts.md` is the single registry of invariants, where each ID
  is defined exactly once.

This split is checked: QUA-011 (`.githooks/check-docs.mjs`) fails if a path
cited in backticks doesn't exist, or if a cited contract ID isn't in the
registry.

## 3. Invariants are tooled, not merely stated

`docs/contracts.md` lists the project's contracts. Each has a normative
rule, a scope, a source of truth (the code that implements it), a proof and
a reason.

The design rule is explicit in that registry: **"a contract that matters is
machine-checked; a human proof is flagged as such: it's the next check to
tool up"**. The repo therefore distinguishes three things too often
presented as one:

| What it is | Example | Where it's checked |
|---|---|---|
| Tooled invariant | QUA-011 (cited paths and contracts) | `.githooks/check-docs.mjs` |
| Tooled invariant, partial proof | a contract only part of which is machine-provable | its "Proof" column, limit named |
| Assumed human rule | a review convention | `docs/contracts.md`, "Out of registry" section |

This is what tells apart an IA-first architecture from a merely
well-documented repo: the repo **announces** what it doesn't check, instead
of letting people believe everything is.

The baseline of `docs/contracts.md` is deliberately minimal (green from day
one, with no stack assumption). `docs/contracts-catalog.md` lists common
generic contracts, not installed by default: a project adopts them one by
one, with `docs/recipes/adopt-the-kit.md` (or the `adopt-the-kit` skill),
each adoption staying a decision of the requester.

## 4. The check lives in git, not in the tool

This is the repo's structuring decision. Checks live in `.githooks/`
(versioned), wired through `core.hooksPath`, not in an assistant setting:

- `AGENTS.md` assumes it: the hook applies to whoever commits or pushes
  (human in a terminal, AI assistant…);
- `.githooks/run-checks.mjs` carries the argument as a comment: a real git
  hook runs regardless of what invoked `git commit`, unlike a tool-specific
  hook. An assistant with no local configuration is thus subject to the
  same checks as a human.

What `.githooks/run-checks.mjs` chains, in order: secrets (gitleaks, if
installed), doc references (QUA-011), tests of the checks themselves (if
any), CI coverage of each check (QUA-013, if there is a CI), then the
project's own checks declared in `.drwil/ia-first.json` (`checks` key).

To keep commits fast, a project check that declares `chemins` (patterns,
e.g. `["src/**"]`) runs **at commit time** only if a staged file matches one
of them; otherwise it ends up "not run", never hidden. Push
(`.githooks/pre-push`), CI and a manual run of `.githooks/run-checks.mjs`
always run it. Without `chemins`, it runs on every commit. Also list in
`chemins` the files the check depends on outside its folder (root dependency
manifest and lockfile, `.drwil/ia-first.json`…): otherwise a commit touching
only them reruns it only on push.

One detail makes this check actually run rather than get bypassed: **a
check that did not run is visible** (QUA-013) — a check that cannot run on
a workstation (missing tool) ends up "not run", never hidden as a silent
success. A **degradable** check (e.g. secrets, without gitleaks) must also
have a CI job triggered on the same paths:
`.githooks/check-control-coverage.mjs` verifies this by re-reading the CI
file, not merely noting the job exists (a job that exists but never
triggers covers nothing). The same hook replays on push
(`.githooks/pre-push`), to catch a commit made with `--no-verify`. A
`commit-msg` hook (rejecting the "Co-Authored-By" line) is shipped but
disabled by default (`chmod +x .githooks/commit-msg` to enable it).

*(AI-tool-specific safety net, in addition to and never instead of git
hooks: see the "Scoping reminder" section further down for what the kit
already tools up with Claude Code.)*

## 5. What the agent must prove about its work

- **Test what the user sees**, roles, text and buttons, not implementation
  detail (`AGENTS.md`, Conventions).
- **The end-of-task report is normative** (`AGENTS.md`, Conduct): files
  touched, checks run and their exact results, remaining limits and
  ambiguities. "Present as proven only what a check actually verifies; the
  rest is labeled 'human' or 'not verified'."
- **A failing check is not a constraint to bypass**: it flags a contract,
  to be read before any accommodation.

## 6. Assumed limits

What the architecture does not do, and does not claim to do:

- Human proofs are named in `docs/contracts.md` ("Out of registry" section)
  and in each contract's "Proof" column.
- Nothing automatically assesses the quality of a diff: review stays
  human, or delegated to the assistant, with the report as the only trace.
- Projects not yet done are in the project index (`.drwil/ia-first.json` →
  `dirs.index`): "pending" is not an invariant, and must not be presented
  as checked.

## 7. Projects, resumable cold

An agent picks a project back up without the conversation history that
created it: everything it needs must be in the sheet.

- **A short index, sheets**: the project index has one line per topic and
  points to the sheet as soon as there's more than two lines to say. An
  agent reads only the sheet of the topic it handles.
- **Status lives in the sheet**, a "Status" line at the top of a project or
  an intent, never copied into the index: a copy ends up wrong.
- **Existing state is surveyed in the code, dated**, and what isn't
  checked is labeled "not verified".
- **A project splits into short lots**, each with its exit criterion
  written in advance, its contracts and its dated decisions.
- **Every open item says who can act**: `[AI]`, `[human]` or `[decision]`.
  An agent does not attempt a human gesture (server, vault, approval) and
  does not decide a decision: it raises it.
- **Leave it cleaner in passing** (`AGENTS.md`, Conduct): what an agent
  reads and finds wrong during a task, it fixes separately and reports;
  what it advances, it dates in the sheet.

### Project lifecycle

| Stage | Where | Who moves it forward |
|---|---|---|
| idea expressed | intent sheet: Need, Surveyed existing state, Questions to decide | the agent writes it; the requester decides the questions |
| scoped, short | an `[AI]` or `[human]` line in the project index | the agent, once the questions are decided |
| scoped, long | project sheet: dated status, lots and exit criteria, Resuming work | the agent; the requester approves the scoping |
| in progress | the same sheet, Resuming work updated at the end of every task | the agent working on it (handoff) |
| delivered | line removed from the index; status "delivered on …"; final Resuming work | the agent, with proof (QUA-013) |
| abandoned | sheet or line removed, reason in the commit message | the requester decides, the agent applies it |

A `[decision]` only moves forward once decided by the requester; a
`[human]` gesture is never done by the agent, who raises it.

**Handoff**: the "Resuming work" section of every project sheet (dated last
state, uncommitted work, next step with its marker) acts as a handoff file:
another agent, another tool or a person picks it back up cold from it,
without any tool-specific memory.

Checked by QUA-015 for what a machine can verify (markers, **dated** status
line, intent sections, projects' "Resuming work" section): a machine can't
tell if a status is true, but a dated status shows its age. Content
accuracy stays human. Exceptions to the check: `docs/projects/template-*.md`
files (templates to copy, not sheets) and `docs/projects/routine-maintenance.md`
(permanent sheet, not a lotted project).

### Scoping reminder

A code file must not stay detached from every project. A sheet in
`docs/projects/` carries, in an HTML comment invisible when rendered, a
`cadrage` block (one path or pattern per line under `fichiers:`): it covers
the files this project touches.

- **Configurable severity at commit** (`.githooks/check-docs.mjs`,
  `cadrage` setting in `.drwil/ia-first.json`): a code file indexed by git
  that no block covers, or a malformed block (no `fichiers:` line, too
  broad a pattern like `**` or `scripts/*`), is reported. `avertissement`
  (default): never blocking, just shown. `bloquant`: fails the check.
  `off`: disables the check (and its reminder to the agent). `docs/` and
  any markdown file are never code.
- **Reminder to the agent, informative** (Claude Code, PostToolUse hook
  `.claude/hooks/rappel-cadrage.mjs`, if present): after writing a code
  file outside any sheet, a message is slipped to it; nothing is blocked
  (the file is already written), the commit follows the `cadrage` setting
  above.
- **Small task**: attaches to `docs/projects/routine-maintenance.md`,
  without opening a separate project.
- **Kit's own files**: covered by `docs/projects/kit-mechanics.md`, set up
  at install.
- **Shell command guard** (Claude Code, PreToolUse hook
  `.claude/hooks/garde-fou-bash.mjs`, if present): asks for approval on a
  secrets file or a pipe into a shell within a Bash command; blocks
  nothing, the person decides.

The block's grammar (`.githooks/cadrage.mjs`) is shared by the check and
the reminder: a single source.
