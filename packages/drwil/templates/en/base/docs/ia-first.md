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

The tests of the checks exercise drwil's own code: they stay in the drwil
repository and are not shipped, so they never slow down the project's
commits (the check reports "not applicable"). A requirement added by a kit
version released after the project was installed (today: a cited path that
only exists as a file ignored by Git) follows the `nouvellesExigences`
setting of `.drwil/ia-first.json`: `bloquant` for a fresh install,
`avertissement` for a project that was already set up without it — an
upgrade never breaks a commit that used to pass; `drwil apply` never
hardens this setting, the project switches it to `bloquant` when it wants.

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

### `drwil verify`: the work-validation primitive

`drwil verify` is not just an audit: it is what lets you call a piece of
work **verified**. The chain is intent (**Reason**) → explicit requirement
(**Rule**) → proof (**Check**, **Manual**) → verdict, for each contract in
`docs/contracts.md`:

- **Check** names the identifier of a check known to the engine
  (`.githooks/moteur.mjs`, the same one the git hooks use; or the `id` of a
  check in `.drwil/ia-first.json` → `checks`). The command is never copied
  into the contract.
- **Manual** describes the part of the proof that stays human.

Status per contract: `PASS` (fully proven by a check), `FAIL` (a check
fails, its cause is shown), `MANUAL` (a human part remains, or a legacy
contract without a check — never counted as PASS; the automated part is
shown separately), `ERROR` (unknown check, missing requirement or proof,
tool unavailable). Every contract is blocking. Overall verdict and exit
code: `GOVERNANCE: PASS` → 0; `GOVERNANCE: FAIL` or `MANUAL REVIEW
REQUIRED` → 1; `VERIFY ERROR` → 2.

Deterministic priority, per contract and for the overall verdict: FAIL >
ERROR > MANUAL > PASS.
Only **blocking** contracts (the default severity) decide the verdict; a
`warning` or `advisory` contract is run and shown without changing the exit
code. A malformed registry stays an `ERROR`, whatever the severity.

**Human attestation** (`drwil attest <ID>`): a `MANUAL` contract whose
automated part passes can receive an explicit human proof. The command shows
the contract, its rule and its automated proof, requires an interactive
terminal and typing the contract identifier (no `--yes`: an agent or a
script cannot attest), then writes the attestation to
.drwil/evidence/attestations, versioned so it is reviewed. The
attestation is bound by fingerprint to the contract text and its proof
definition: if either changes, it becomes stale and the contract is `MANUAL`
again. `ATTESTED` status: distinct from `PASS`, it satisfies the contract;
never attestable: a `PASS`, `FAIL`, `ERROR` or not-applicable contract.

### Agent / human workflow

```text
Agent : drwil verify            (or /drwil verify; --agent output)
DRWIL : PASS / FAIL / ERROR / MANUAL
  FAIL   → the agent fixes, then runs drwil verify again
  ERROR  → the agent reports the problem, never claims it is verified
  MANUAL → the agent stops: "Human attestation required."
Human : drwil attest <id>       (in their own terminal, if MANUAL)
Then  : drwil verify
Last  : GOVERNANCE: PASS        (only this verdict counts as validation)
```

The agent produces and verifies proofs; only the human attests. `drwil
attest` refuses any non-interactive environment (agent, script, redirected
input) and has no `--yes` option. drwil does not prove that a human typed
the command: it requires an attestation to be explicit, traceable and
subject to the change review (.drwil/evidence/attestations folder,
versioned).

`drwil verify --evidence` keeps the proof of a run (.drwil/evidence folder,
created on first run,
git-ignored): verdict, timestamp, commit, and per check a summary of its
output, redacted (keys, tokens, `password=…`) so that no secret is ever kept
(SEC-007).

**`verify` is the validation gate: a piece of work is verified by drwil
only if `verify` returns PASS.** `FAIL`: it must be fixed. `MANUAL`: it is
not validated yet — never a deferred success. `ERROR`: drwil cannot
establish the verdict. `verify` is the primitive an agent, a hook or a CI
can build on to enforce this gate; it does not enforce it by itself. Git
hooks do not depend on it: they use the same engine without drwil being
installed.

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

**Risk levels** (ceremony follows risk; traceability never changes:
QUA-016 applies to everything):

- **LOW**: small task without a dedicated sheet, attached to
  `docs/projects/routine-maintenance.md`.
- **MEDIUM**: project sheet with a scope (`**Risk**: MEDIUM`).
- **HIGH**: sheet, "Decisions" section, related contracts cited, proofs
  (`drwil verify`). A scope touching governance mechanics (`.githooks/`, CI,
  `.drwil/`) requires HIGH; configurable via `.drwil/ia-first.json` →
  `risque.cheminsSensibles`.

The level is declared in the sheet and can only be raised: a level below
the detected minimum, or a HIGH without Decisions or contract, is rejected
at commit (`.githooks/check-docs.mjs`); a sheet without a "Risk" field whose
scope requires HIGH gets a warning.

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
  broad a pattern like `**` or `scripts/*`), is reported. `bloquant`
  (written by `drwil init`): fails the check. `avertissement`: never
  blocking, just shown (the value used when the setting is missing). `off`:
  disables the check (and its reminder to the agent). `docs/` and any
  markdown file are never code.
- **Agent side** (Claude Code, hook
  `.claude/hooks/rappel-cadrage.mjs`, if present), following the same setting: in `bloquant`, writing a code file
  outside any sheet is refused before it happens (PreToolUse hook); in
  `avertissement`, a reminder is slipped after the write (PostToolUse hook),
  nothing is blocked; in `off`, nothing.
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

### Governance state

The current activity (`CADRAGE`, `ATTENTE`, `DEMANDE`, `REALISATION`,
`PREUVES`, `VERIFY`, `CLOTURE`) and the active expectation live in
`.drwil/state.json` (if present): a **local** state, ignored by Git, holding references
only (activity, path of the active sheet, active request, timestamp). The
allowed scope stays the sheet's `cadrage` block, which is versioned.

- **Deterministic reading** (`.githooks/etat.mjs`, the only reader):
  `node .githooks/etat.mjs` prints the active context, `--json` the raw
  state. Without a file, the state is neutral `CADRAGE`; an invalid state is
  reported and treated as neutral, never guessed.
- **Agent-agnostic**: the source (`state.json`, if present) and the command
  (`node .githooks/etat.mjs`) depend on no tool. The universal channel is
  `AGENTS.md`, which asks every agent to run the command at the start of a
  task. A tool offering a session-start hook can wire the same command to
  re-inject the context automatically — Claude Code does (SessionStart hook,
  if present); it is only an accelerator.
- **Short reminder, only when the state changes**: `node .githooks/etat.mjs
  rappel` prints two lines (activity, sheet, scope size, rule) if they
  differ from the last reminder injected, nothing otherwise; the last
  reminder's fingerprint lives in `.drwil/rappel.json` (if present), local
  and git-ignored like the state. Claude Code calls it on every message
  (`UserPromptSubmit` hook); after an automatic context summary, the
  session-start hook re-injects the full state. A tool without a prompt
  hook follows the `AGENTS.md` instruction: read the state again before
  modifying any file. It is a behavioural barrier: the guarantee stays in
  Git.
- **Hand-off to someone else**: a clone's state does not travel; resume from
  the versioned sheet ("Hand-off" section) and re-activate the expectation
  explicitly.
- **Transitions**: one activity at a time, back to `REALISATION` after
  `PREUVES` or a failed `VERIFY`, abandon to `CADRAGE` from any activity.
  Command: `node .githooks/etat.mjs passer <ACTIVITE> [--fiche <sheet>]
  [--demande <text>]` (or `drwil etat passer …`, a mere facade); `--fiche`
  opens an expectation from `CADRAGE`.
- **Who decides** (`transitions` setting in `.drwil/ia-first.json`): `humain`
  (default) — opening rights is a human decision: starting a chantier (see
  "Starting and closing" below), or, step by step, opening an expectation
  and moving from `DEMANDE` to `REALISATION` in an interactive terminal by
  typing the target activity; the other transitions, which narrow rights or
  go back, stay free, closing included. `agent`: any allowed transition is
  free.
- **Closing on `drwil verify` evidence**: `VERIFY → CLOTURE` requires,
  whatever the `transitions` setting, the latest evidence written by
  `drwil verify --evidence` (`.drwil/evidence/` (if present), not in git): verdict `PASS`
  or `ATTESTED`, on the `HEAD` commit, clean worktree. `.githooks/etat.mjs` reads that
  evidence without running anything: verify stays the only judge, over all
  blocking contracts. `FAIL` or `ERROR`: go back to `REALISATION` to fix.
  `MANUAL`: a human attests (`drwil attest <ID>`), then verify runs again. A
  fiche's acceptance criteria are not a parallel system: a checkable
  criterion becomes a contract with a `Check`, a human one a `MANUAL`
  contract.
- **Tool-side blocks** (Claude Code, `deny` rules in
  `.claude/settings.json`, if present): `git … --no-verify`, `git commit -n` and writing `.drwil/state.json`
  (if present) directly are refused by the tool, not by the model.
- **Limits**: an agent with a shell can still cheat locally (rewrite the
  state, fake a terminal, combined short option). The aim is cheating that
  shows in the diff and is refused in CI, not impossible cheating.

### Starting and closing

Two human gestures per chantier: **start** and **merge the PR** — only one if the merge is
authorised at start (below).

- **Start**: from `CADRAGE`, `ATTENTE` or `DEMANDE`, a single decision moves
  to `REALISATION` on a **framed sheet** (`cadrage` block committed in
  `HEAD`, sheet not finished, templates excluded; list: `node
  .githooks/etat.mjs fiches`). It applies to that committed cadrage.
  - **In the chat** (`/drwil-lancer`, if present): the agent opens a poll of
    the framed sheets, in the order of `fiches --json` (ready sheets first,
    no open `[decision]`, then by index priority; the intentions' proposed
    order breaks ties), and recommends the first ready sheet (in the
    description, never by preselection); it is the **human's answer**, read by a tool hook
    (`.claude/hooks/saisie-drwil.mjs` (if present)), that starts — never the
    model. The hook refuses a start poll that arrives with an answer already
    filled or a default value. Checked on 2026-10-10 in Claude Code (an
    answer pre-filled by the model is ignored by the tool) and in Copilot
    CLI, which fires the same hooks on its own poll.
  - **In a terminal** (any tool): `node .githooks/etat.mjs lancer` lists the
    framed sheets, asks for a number, then for typing `LANCER`.
- **Close**: free as soon as the `drwil verify` evidence is valid (see
  above); closing removes rights, and accepting the work remains the human
  PR merge.
- **Merge authorised at start** (Claude Code): a second question of the
  poll (`drwil-fusion`) lets the human accept in advance; their answer,
  read by the hook, is kept in the local state (`fusion_autorisee`) until
  going back to CADRAGE, never set by the agent (even with
  `transitions: agent`). In CLOTURE, after verify PASS and pushing the
  closing commit, the agent schedules `gh pr merge --auto --merge`: the
  host only merges once the required checks pass ("Allow auto-merge"
  repository setting required). In the terminal, `lancer` asks the same
  question (type `FUSION`).
- **Limit**: an agent with a shell could call these functions itself or
  rewrite the local state; Claude Code's `deny` rules block calling the hook
  directly, and cheating stays visible and refused off the machine (commit
  barrier, CI), as for the rest.

### Scope barrier

The engine's `perimetre-attente` check (`.githooks/perimetre.mjs`), run at
commit, push, in CI and in `drwil verify`. Severity: `barriere` setting in
`.drwil/ia-first.json` — `avertissement` (written by `drwil init`: gaps are
shown, nothing is blocked), `bloquant`, `off`.

- **Sheets always pass**: `docs/projects/` and `docs/intentions/`, as do
  human attestations, written by `drwil attest`:
  `.drwil/evidence/attestations/` (if present) — configurable list: `horsPerimetre`. Any other file,
  code or doc, is subject to the scope.
- **At commit**: outside sheets, a commit is accepted only in
  `REALISATION`, for files covered by the active sheet's `cadrage` block
  **as it is in `HEAD`**. Widening one's scope thus takes a separate commit
  touching only the sheet; the code comes in the next commit.
- **Trailer**: the `prepare-commit-msg` hook adds `Drwil-Attente: <active
  sheet>` to the message. Git never skips this hook.
- **On push, in CI and in `drwil verify`**: each commit of the branch
  (since the main branch, or `DRWIL_BASE`) is replayed against the cadrage
  of its trailer's sheet, read in its parent commit. A commit outside
  sheets without a trailer is refused. A commit is judged by its parent's
  rules: if the barrier did not exist there yet, it is not checked. The
  activity only exists locally, so CI only checks the scope.
- **Removal**: see below.

### Disabling or removing governance

No installation creates a permanent lock: governance is switched off by a
setting, then removed with the rest of the mechanics.

- **Disable** (reversible, nothing is deleted): `"barriere": "off"` in
  `.drwil/ia-first.json`. No more barrier at commit, push or in CI, no more
  `Drwil-Attente` trailer, and the context reinjected to the agent shrinks
  to "governance disabled". Setting `avertissement` or `bloquant` back
  restores it as it was.
- **Remove**: `npx drwil uninstall` (dry run: lists what would be removed),
  then `npx drwil uninstall --yes`. Mechanics files left untouched are
  removed (hooks, `.githooks/etat.mjs`, rules of
  `.claude/settings.json` (if present)); the local state
  `.drwil/state.json` (if present) is listed with
  them and deleted only with `--yes`. Sheets, contracts and versioned
  attestations stay: they are the project's history.
- **Limit**: Claude Code's `deny` rule on `.drwil/state.json` (if present)
  also refuses any shell command that mentions that path, even a read;
  reading the state goes through `node .githooks/etat.mjs`.
