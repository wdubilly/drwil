# drwil

**IA-first governance, scaffolded in one command and enforced on every commit.**

drwil stands for **D**eterministic **R**ules for **W**orkflows, **I**ntent &
**L**ineage: rules a machine checks, a workflow with human gates, and a
traceable line from the intent to the work and its proof.

When an AI assistant (or a human) writes code without a frame, things
quietly go wrong: context lost between sessions, a rule skipped, "fixed"
announced without proof, a secret in a commit, a CI check that silently
stopped running. drwil writes the rules once, in the files every AI tool
reads first, and enforces them with Git hooks, CI and a verdict
(`drwil verify`) — for code written by you or by Claude, Copilot, Cursor,
Codex or Gemini. Any stack, any OS, new or existing project.

This is not a linter and not a style guide: it is a contract between the
rules you decide and the mechanics that prove them, so that "the rule is
respected" is a provable fact, never a claim.

```text
$ npx drwil verify
  ✓ PASS   SEC-007  No secret in the repo
  ✓ PASS   QUA-017  No direct work on the main branch
  ✗ FAIL   QUA-020  Unit tests pass
             unit-tests: failed
  ? MANUAL QUA-019  No bypassing a check
             human required: a bypass rarely leaves a machine-checkable trace.
9 contracts: 5 PASS, 0 ATTESTED, 1 FAIL, 3 MANUAL, 0 ERROR
GOVERNANCE: FAIL                                            (exit 1)
```

*Excerpt of a real run. The work is not verified until the rule holds again;
a part that only a human can judge stays `MANUAL` until they attest it.*

```bash
npm install -D https://github.com/wdubilly/drwil/releases/download/v<version>/drwil-<version>.tgz
npx drwil init       # new, existing or already equipped project
npx drwil verify     # without a CI: VERIFY ERROR, expected — `npx drwil init --ci github` declares one
```

`<version>`: the latest validated version, shown on
[https://github.com/wdubilly/drwil/releases/latest](https://github.com/wdubilly/drwil/releases/latest) (never a
pre-release; its note gives the exact command). The tarball is installed
from the GitHub release URL: nothing is downloaded into the project. To upgrade, run the same command with the new release's
URL; an old `drwil-*.tgz` left by a previous install can be deleted.

After `init`, restart your agent's session: Claude Code loads its hooks when
a session starts. Prerequisites, recommendations (session restart, branch
protection) and options (automatic merge) are in the repository README,
« Before you start ».

## What you gain

AI coding assistants are fast. What they lack is a boundary and a proof.
drwil adds both, and the people in charge stay in charge.

| You get | Because | Check it yourself |
|---|---|---|
| An agent that stays inside the lines | every commit must fall within the scope of an approved work item | `drwil state`, scope gate at each commit and in CI |
| "Done" that means done | every contract is backed by a check that actually ran; a check that did not run never counts as a pass | `drwil verify` |
| Decisions that stay human | starting a workstream, accepting the work and attesting a manual contract are gestures an agent cannot perform | `drwil attest`, `/drwil-start` |
| Work that survives the session | one `AGENTS.md`, one contract registry, one state on disk: another agent, or a human, resumes without re-reading the chat | `drwil state` |
| One setup for every tool | Claude Code, Copilot, Cursor, Codex and Gemini read the same rules | `drwil init` |
| Adoption without a big bang | works on a new or an existing project, previews with `--dry-run`, never overwrites your files: what drwil needs goes into a delimited block | `drwil init --dry-run` |
| A business non-regression that grows | every workstream lists its acceptance criteria, each proven by a contract of the registry: replayed on every commit, push and CI run afterwards | `drwil verify` (business rules summary) |

Nothing to take on faith: each line is a command you can run.

## Table of contents

- [What you gain](#what-you-gain)
- [Who it's for](#whos-its-for)
- [What problem it solves](#what-problem-it-solves)
- [What gets installed](#what-gets-installed)
- [How the governance loop works](#how-the-governance-loop-works)
- [The workstream cycle](#the-workstream-cycle)
- [How this compares to Spec-Driven Development](#how-this-compares-to-spec-driven-development)
- [Installing](#installing)
- [CLI reference](#cli-reference)
- [Supported stacks, AI tools and CI providers](#supported-stacks-ai-tools-and-ci-providers)
- [The contracts registry](#the-contracts-registry)
- [Optional modules](#optional-modules-never-installed-by-default)
- [Internationalization](#internationalization)
- [Compatibility](#compatibility)
- [Learn more](#learn-more)

## Who it's for

drwil pays off concretely when:

- **Several AI coding tools work on the same project** (Claude Code,
  GitHub Copilot, Cursor, Codex, Gemini…) and their instructions drift
  apart because each tool has its own convention file and nothing keeps
  them in sync.
- **An AI task gets interrupted and resumed** by a different agent, a
  different session, or a human — without that person re-reading the
  entire conversation history to understand where things stand.
- **A trust incident already happened** — a leaked secret, a bypassed
  security rule, a "this is fixed" that turned out not to be — and you
  want a mechanism that catches the next one automatically, not a promise
  that it won't happen again.
- **You want AI-written code to stay accountable**: every non-trivial
  change traceable to a decision, every claim of "done" backed by a
  re-run check, every important rule backed by a working test instead of
  a comment nobody re-reads.

Solo developers benefit too: a project spanning several weeks or months
means *you* forget your own past decisions and constraints just as much
as a second person would.

## What problem it solves

| Concrete problem | drwil's mechanism | Contract / proof |
|---|---|---|
| Every AI tool has its own rules file, and they drift apart for lack of a single source | One `AGENTS.md` at the project root, imported by each tool's own pointer file (`CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules`, etc., shipped according to the tools chosen at install time) — a single source of truth, never copy-pasted | — |
| A doc references a file path or a contract ID that no longer exists | A Git hook refuses the commit if the docs cite a path or ID that isn't there | QUA-011 |
| An agent claims "it's fixed" without having re-run the relevant check | Explicit convention (`AGENTS.md`): proof before claim — re-run the check and read its output before announcing success | — |
| A secret (API key, password, `.env` content) lands in a commit | Secret scanning (gitleaks) on every commit and in CI, covering tracked files and history | SEC-007 |
| A dependency has a known vulnerability and nobody notices | Dependency audit wired into the project's standard checks | SEC-006 |
| A CI check gets silently removed or stops covering the right paths | A hook verifies every expected check actually runs in CI — an unexecuted check is never counted as passing | QUA-013 |
| Picking up a piece of work cold (another agent, or weeks later) means re-reading everything to understand its state | Every work item under `docs/projects/` carries a dated status and a "resume" section; every entry in the backlog index states who must decide (`[AI]` / `[human]` / `[decision]`) | QUA-015 |
| Code gets added with no link to any documented piece of work | Every tracked code file must be covered by the scoping block of a work item | QUA-016 |
| A direct commit or push to the main branch bypasses review | Blocked after the very first commit: all work goes through a branch and a pull/merge request | QUA-017 |
| A blocking check (test, hook, CI) gets disabled or skipped "just this once" to move forward | Silently bypassing a check is forbidden; a miscalibrated check gets fixed, not switched off | QUA-019 |
| No branch protection available (private repo, free plan): a broken merge to `main` can go unnoticed | A GitHub/GitLab issue is opened automatically when CI breaks on the main branch (no duplicate if one is already open) | — (dedicated recipe) |

## What gets installed

Running `init` (new project or existing one) adds:

- **`AGENTS.md`** — the single entry point every AI assistant reads
  first: project description, non-negotiable conduct rules (scope,
  secrets, proof-before-claim, root-cause-before-fix), and a progressive
  context-loading table (which doc to read for which kind of task).
- **Per-tool pointer files** — `CLAUDE.md`, `.github/copilot-instructions.md`,
  `.cursor/rules/`, `.codex/`, `.gemini/`, depending on the tools you
  selected — each one simply imports `AGENTS.md` so the same rule never
  needs to be written twice.
- **`docs/contracts.md`** — the registry of rules that actually matter,
  each one with an ID (`SEC-xxx`, `QUA-xxx`), a one-line description and
  a pointer to the check that proves it.
- **`.githooks/`** — Git hooks (`pre-commit` and friends) that run the
  project's checks (`run-checks.mjs`) before every commit,
  and the equivalent CI workflow (GitHub Actions or GitLab CI, your
  choice) so the same checks run server-side too.
- **`docs/recipes/`** — reusable step-by-step procedures (add an API
  route, add a screen, refactor safely, deploy, audit risk, release…)
  that both humans and AI assistants are expected to follow instead of
  improvising each time.
- **`docs/projects/`** — the work-item system: one dated, decision-driven
  sheet per piece of work, an index of pending items, and a journal of
  closed ones — so any session (human or AI) can resume work without
  having to reconstruct context from chat history.
- **An installed-files manifest** — a record of exactly which files the
  kit installed and their fingerprint, used by `init`/`uninstall` to
  never silently overwrite or delete something you wrote yourself.

Nothing above is ever force-installed over your own files: an existing
file is never overwritten, and flagged if it has drifted from the shipped
template (see `resolve-drift` below). When one of them lacks something
drwil needs, `init` adds only that, without touching the rest (see
"Existing project" below).

## How the governance loop works

1. **A request comes in.** If it's ambiguous or has multiple reasonable
   solutions, it becomes a scoping sheet in `docs/projects/` *before* any
   code is written — open questions go to the human, not decided
   silently by the assistant.
2. **Code gets written**, following the project's own `AGENTS.md` and the
   relevant recipe (`docs/recipes/`).
3. **A commit is attempted.** `.githooks/pre-commit` runs the project's
   checks: documentation consistency, secret scanning, test suite,
   contract coverage, scoping coverage. The commit is rejected if any
   rule is broken — no exception, no bootstrap loophole.
4. **A pull/merge request is opened.** The same checks run again in CI,
   so a bypassed local hook (or a contributor who skipped `git config
   core.hooksPath .githooks`) still can't merge a rule violation.
5. **Claims require proof.** Before an assistant writes "fixed" or
   "passing", the convention requires re-running the relevant check and
   reading its actual output — not assuming the earlier fix still holds.

## The workstream cycle

A piece of work moves through activities, kept in a local state
(`.drwil/state.json` (if present), never edited by hand):

```text
SCOPING ──start──▶ BUILD ──▶ EVIDENCE ──▶ VERIFY ──▶ CLOSING ──▶ SCOPING
 (frame)    human   (code)    (proofs)     (verdict)   (journal,
                                                        PR)
```

1. **SCOPING** — the request is framed as a work item
   (`docs/projects/<name>.md`) with its `scope` block (the files the work
   may touch) and its **acceptance criteria**, each one proven by a
   contract of the registry (or `[human]`, through an attested contract).
   Nothing is built.
2. **Start (human).** The human picks a framed work item (`/drwil-start`
   in Claude Code or Copilot CLI, or `drwil state start` in a terminal)
   and decides at once whether the merge is authorised in advance. The
   agent cannot start work by itself. Ticking several ready work items
   queues them: the agent chains them, each after the previous merge, and
   stops at the first one that needs a human. A third question of the poll
   (`drwil-worktree`) can run the work item in a new sibling worktree
   `../<repository>-<work item>` instead: the human's answer creates it
   from the up-to-date main branch, runs the optional `worktreeInstall`
   command of `.drwil/ia-first.json` there and starts the work item in
   that folder (one terminal and one agent session per worktree). A work
   item already active in another worktree cannot be started again, the
   state reminder tells each agent the folders are one repository, and
   `node .githooks/close.mjs --check` reports a branch behind the main
   branch without refusing the closing. With several work items ticked, a
   fourth question (`drwil-parallel`: "Parallel queue" / "Sequential queue")
   runs the queue in parallel instead: the hook launches each work item in its
   own worktree, at most `maxParallel` at once (`.drwil/ia-first.json`, 3 by
   default) and refuses work items whose `scope` blocks overlap; the main
   session runs one subagent per worktree, keeps only their reports, and a work
   item that needs a human stops its own subagent without interrupting the
   others.
3. **BUILD** — the agent implements, only inside the scope. Each commit
   carries a `Drwil-Brief` trailer; widening the scope takes its own
   commit, touching only the work item.
4. **EVIDENCE / VERIFY** — `drwil verify --evidence` writes the proof.
   Closing requires a `PASS` or `ATTESTED` verdict on the current commit; a
   `MANUAL` contract waits for the human's `drwil attest`. An unproven
   acceptance criterion makes the verdict fail.
5. **CLOSING** — the work item is condensed into the journal, its closing
   proof is written (`docs/preuves/<work item>.md`: every criterion, its
   contract, that contract's checks, the verified commit and the
   fingerprint of the covered files) and the item itself is deleted;
   without that proof, the closing is refused. Its token consumption is
   recorded (`.drwil/usage.jsonl`, read from
   Claude Code's session logs);
   its untreated limits become intents; the README, the `CHANGELOG.md`
   « Unreleased » section and the map `docs/architecture.md` are updated
   when the work changes them; the pull request is opened, then back to
   **SCOPING**. The merge is a
   human gesture, unless it was authorised at start: the agent then
   schedules `gh pr merge --auto --merge`, and the host merges once the
   required checks pass.

```bash
npx drwil state                  # current activity, active work item, scope
npx drwil state briefs           # framed work items, ready ones first
npx drwil state move <ACTIVITY>  # change activity (one step at a time)
```

The agent reads the state first at every task, and a short reminder is
injected whenever it changes. Full rules, transitions and limits:
`docs/ia-first.md` once installed.

## Five-minute example: RULE → PROOF → VERIFY

From an empty folder. Every step below is replayed by the package's test
suite (`test/kit.test.mjs`, "DRWIL-031"), so this example cannot silently
go stale.

1. **Install** (git repo, working branch and hooks are set up for you):

   ```bash
   mkdir demo && cd demo
   npx drwil init --lang en --tools claude --ci github
   ```

2. **Declare a check** the engine can run, in `.drwil/ia-first.json` →
   `checks`:

   ```json
   { "id": "unit-tests", "name": "unit tests", "run": "node --test" }
   ```

3. **State the rule** in `docs/contracts.md` — the contract names the
   check, never the command:

   ```markdown
   ## QUA-020 — Unit tests pass
   **Rule**: every unit test passes.
   **Check**: `unit-tests`
   ```

4. **Write the work** — here, one test file `sum.test.mjs`:

   ```js
   import { test } from "node:test";
   import assert from "node:assert/strict";
   test("sum", () => assert.equal(1 + 1, 2));
   ```

5. **Verify**: `npx drwil verify` shows `QUA-020` as `PASS`. The overall
   verdict of a fresh project is `GOVERNANCE: MANUAL REVIEW REQUIRED`
   (exit 1): the baseline contracts keep a human part (`MANUAL`), and a
   human part is never counted as a pass.

6. **Break it**: change `2` into `3`; `npx drwil verify` now reports
   `QUA-020` as `FAIL` with the failing output, and `GOVERNANCE: FAIL`
   (exit 1). The work is not verified until the rule holds again.

## How this compares to Spec-Driven Development

drwil shares one idea with Spec-Driven Development (SDD): an ambiguous
request becomes a **written decision sheet before any code is written**,
instead of being decided silently mid-implementation. That's where the
similarity ends — drwil is not an SDD tool. It has no spec language, does
not generate code from a formal spec, and does not execute a spec as a
machine-verifiable contract end to end. Scoping-before-code is one piece
of a broader governance layer: keeping every AI tool aligned on the same
rules, blocking secrets and unproven "fixed" claims, and making sure a
check that stops running in CI is never silently counted as passing.
Think of it as **governance-first, not spec-first**: the contract that
gets enforced is "this rule is checked", not "this spec generates this
code".

## Installing

`init` runs **in the current directory** (`cd` into the project first); it
never creates a new folder.

### `init` — new project, existing project, or update

```bash
mkdir MyProject && cd MyProject      # or cd MyExistingProject
npx drwil init --name "MyProject" --lang en
```

A single command for every case:

- **New project** (empty folder, no stack detected): scaffolds the kit
  (`AGENTS.md`, `docs/contracts.md`, the map `docs/architecture.md`),
  creates the Git repository on a working branch and enables the hooks —
  without inventing layers. Then scope the project with your agent
  (`/drwil-adopt`: need, first version, stack, first business rules), and
  declare its layers once decided: `npx drwil init --layers api,web`
  creates each layer's `AGENTS.md`.
- **Existing project** (code, Git history, dependencies): detects the
  stack (subfolders become the layers) and the CI already in use
  (`.github/workflows/`, `.gitlab-ci.yml`), and installs the kit on top
  **without ever overwriting a project file**; no new Git repository.
  `/drwil-adopt` then builds the map `docs/architecture.md` from the real
  code; drwil keeps it current (the `architecture-map` check reports a
  code folder it does not cite).
  When a file you already have lacks what drwil needs, `init` adds only
  that, and says so (`--dry-run` shows it first):
  - `.gitignore`, `CLAUDE.md`, `GEMINI.md`, Copilot and Cursor
    instructions: the missing lines, in a block delimited by `>>> drwil`
    and `<<< drwil`;
  - `AGENTS.md`: your text stays; the drwil instructions go to
    `.drwil/AGENTS.md`, and one line pointing to it is added;
  - `.claude/settings.json`: the kit's hooks and permissions are merged
    in, your keys and rules are kept;
  - `.gitleaks.toml`: the kit manifest is added to the allowlist.

  Two things stay yours, reported with the fix to paste: the `checks` job
  in an existing CI file, and a `core.hooksPath` already set by a hook
  manager (husky, lefthook…) — it is never switched off: call the drwil
  hooks from yours (`.githooks/pre-commit "$@" || exit $?`), or set
  `git config core.hooksPath .githooks`.
- **Update** (project already equipped): creates what is missing,
  refreshes the kit mechanics (`.githooks/`, `.claude/hooks/`) that did not change since
  their installation, and reports — never overwrites — a file modified by
  hand (see `resolve-drift` below). A project equipped by an older,
  French-named version is migrated first (see `CHANGELOG.md`).

The project's settings (`.drwil/ia-first.json`: language, tools, layers,
CI, code prefixes…) are kept: an option you don't pass takes the installed
value. To start the settings over, delete that file first. `--force`
overwrites everything, including project docs added since — reserve it
for a deliberate reset.

`npx drwil init --dry-run` audits the repository and prints a preview
without writing anything: detected stack, AI tool files already present,
safeguards already in place (npm `test`/`lint` scripts, eslint, husky,
pre-commit, gitleaks, CI, git hooks), the exact list of files it would add
or refresh, and the existing files it would leave untouched. The preview
runs through the same code path as the real install, so it cannot drift
from what `init` actually does.

### `verify` — validate the work against the project's contracts

```bash
npx drwil verify
```

Reads every contract in `docs/contracts.md` (or `docs/contracts.md`), runs
the check each one names (`**Contrôle**`/`**Check**`) through the same
engine as the git hooks (`.githooks/engine.mjs`), and prints a verdict:
`PASS` (exit 0), `FAIL` or `MANUAL REVIEW REQUIRED` (exit 1), `VERIFY
ERROR` (exit 2). A contract with a human part is `MANUAL`, never `PASS`;
an unknown check is an `ERROR`. While a work item is active, its
acceptance criteria are judged too: an unproven one makes the verdict
fail. The item judged is found without the local state as well — from the
`Drwil-Brief` trailer of the branch's commits — so CI judges the same
criteria as the machine that wrote them. After the closing, the criteria
of the closing proofs are replayed: one whose proof has disappeared (check
removed, contract abandoned) makes the verdict `FAIL` and is named. The output ends with a summary of the business rules (proven by a
test, to complete, broken). See `docs/ia-first.md`, section 5, in an
installed project.

A check that `run-checks` has just played is not played twice (QUA-140): a
`run-checks` pass outside any git hook leaves each check's verdict in
`.drwil/evidence/run-checks-verdicts.json` (git-ignored), with a fingerprint of
the commit, the branch, the uncommitted changes (tracked files, and untracked
files that are not ignored) and `.drwil/ia-first.json`. `verify` takes the
verdict of a check whose fingerprint is identical to the byte, says so for each
contract (« reused from run-checks of … » or « replayed »), and replays any
check whose fingerprint differs, whose verdict is missing or is not `ok` or
`fail`, or that the project declares always replayed with `"reuse": false` in
its `checks` (a check that reads the network, the forge or the clock). CI
always replays everything. `npx drwil verify --no-reuse` replays every check
even on an identical tree.

While iterating, a check is also reused on its own files (QUA-141): a check that
declares `paths` gets a fingerprint of its declaration and of the files those
`paths` match. Outside a hook and CI, `run-checks` does not replay a check whose
last verdict is `ok` on the same fingerprint, and `verify` takes it the same
way, saying « reused (check files unchanged) … per-check reuse: not a closing
proof ». A check without `paths`, declared `"reuse": false` or `"reuse": "tree"`
(it reads more than its `paths`), or that failed, is replayed. `run-checks
--replay-all` replays everything, and `verify --evidence` (the closing proof)
and `--no-reuse` only reuse a verdict on an identical whole tree.

`npx drwil verify --json` prints only a stable JSON document (`version: 1`,
`status`, `exitCode`, `contracts` counts, per-contract `results`) with the
same exit codes; `fail` and `manual` stay distinct. Raw check output is not
included. `--evidence` also records the run in `.drwil/evidence/` (git-ignored):
verdict, timestamp, commit, and per-check summaries (last output lines,
redacted: keys, tokens, `password=…`).

### `attest` — explicit human proof for a MANUAL contract

```bash
npx drwil attest QUA-015 --note "sheets reviewed"
```

Only for a contract whose automated part passes and whose remaining proof is
human (`Manual` field, or legacy contract without a check). Shows the
contract, its rule and automated results, then asks you to type the contract
ID in an interactive terminal (no `--yes`; scripts and agents are refused).
The attestation (contract, `ATTESTED`, timestamp, git `user.name` marked as
declarative, redacted note, fingerprint, commit) goes to
`.drwil/evidence/attestations/`, which is versioned. `verify` then reports
the contract as `ATTESTED` — satisfied, but never shown as `PASS` — until the
rule, the `Manual` field, the severity or an attested check changes, which
makes the attestation stale; adding a check to the contract does not. Exit 0: recorded; 1: refused or not eligible; 2: unknown contract.

A contract can declare what its attestation judges with a `**Covers**` field
(path patterns between backticks: `` `package.json`, `src/auth/**` ``). The
attestation (version 3) then records a fingerprint of the content of each file
matched, read from the files themselves (not from git; line endings and path
order change nothing). A covered file modified, added, removed or renamed
makes the attestation stale and `verify` names it; a file outside the patterns
changes nothing. A contract with a human part and no `**Covers**` keeps its
attestation, but `verify` and `doctor` flag it. Attestations of version 1 and 2
stay valid as they are; the next one is version 3.

```bash
npx drwil attest QUA-015 --renew
```

`--renew` replaces, on purpose, an attestation that is still valid (the history
is kept). Same interactive terminal, same typing of the identifier: no `--yes`.

### Agent / human workflow (`verify --agent`, `/drwil verify`)

```text
Agent : drwil verify --agent    (Claude Code: /drwil verify)
DRWIL : PASS / FAIL / ERROR / MANUAL
Human : drwil attest <id>       (only if MANUAL, in their own terminal)
Then  : drwil verify  →  GOVERNANCE: PASS
```

`--agent` prints, for any agent, the counts (PASS, ATTESTED, FAIL, ERROR,
MANUAL), the verdict, the next step to take, and — when MANUAL — "Human
attestation required.", the contracts and `drwil attest <CONTRACT_ID>` as a
human action. It only formats `verify --json`; exit codes are unchanged.
The installed `AGENTS.md` tells every agent to use it and never to run
`drwil attest`.

### `doctor` — diagnose the installation

```bash
npx drwil doctor          # human-readable
npx drwil doctor --json   # machine-readable (version 1)
```

Checks the installation without running any check: configuration,
installed-files manifest, `AGENTS.md`, AI tool entry files, contract
registry validity, contracts with an automated proof, git hooks
(`core.hooksPath`, or the drwil hooks called from your hook manager), CI
file, required tools (git, gitleaks), and what drwil needs inside your own
files (`.gitignore` entries, `@AGENTS.md` import, Claude hooks, CI job),
each with its fix. Exit 0:
healthy (warnings allowed); 1: problems; 2: not a drwil project.

### `contracts` — list and validate the contract registry

```bash
npx drwil contracts [--json]
```

Lists each contract with its checks and manual part, without running
anything. Exit 0: valid registry; 2: invalid (unknown check, missing rule
or proof, duplicate).

### `resolve-drift` — resolve mechanics drift

```bash
npx drwil resolve-drift
```

When `init` detects that a mechanics file (`.githooks/`,
`.claude/settings.json`, CI workflow file), or a piece of the kit's prose it
installed (skills, recipes, agents' instructions…), has drifted from the
version shipped by the kit, this command walks through each drifted file, shows a
unified diff, and asks for confirmation before overwriting — always
creating a `.bak` backup first, and never creating a file that doesn't
exist yet. `--force` skips the confirmation for scripted/non-interactive
use.

### `uninstall` — remove the kit's mechanics

```bash
npx drwil uninstall          # dry-run: prints what would be removed
npx drwil uninstall --yes    # actually removes the files
```

Driven by the installed-files manifest, so it only removes what the kit
itself installed. Never touches `docs/projects/`, `docs/intentions/`, or
`docs/recipes/` — your project's decisions and history are never
deleted automatically. The local governance state,
`.drwil/state.json` (if present, git-ignored), is listed too, and deleted only with `--yes`. What `init`
added to your own files is removed the same way: the `drwil` blocks, and
the kit's hooks in `.claude/settings.json` (their scripts are gone); the
merged permissions stay. To only switch
governance off, without removing anything: `"scopeGate": "off"` in
`.drwil/ia-first.json`.

### Try it without publishing to npm

If you're working from a clone of this repository rather than the
published package:

```bash
cd packages/drwil
npm install && npm run build
npm pack                 # produces drwil-<version>.tgz
npm install /path/to/drwil-<version>.tgz
npx drwil init --name "MyProject"
```

## CLI reference

Options of `init`. On a project already installed,
an option you don't pass takes the value from `.drwil/ia-first.json`; the
defaults below apply to a new install only.

| Option | Description | Default |
|---|---|---|
| `-n, --name <name>` | Project name | current folder name |
| `-s, --short <short>` | Short name | — |
| `-l, --lang <lang>` | Project language: `fr` or `en` (the kit itself is in English) | `en` |
| `--layers <layers>` | Comma-separated layers | subfolders where a stack is detected, else none (new project: decided at scoping) |
| `-d, --description <text>` | What the application does — fills `AGENTS.md` and `docs/architecture.md` | — |
| `--tools <tools>` | AI tools to configure, CSV: `claude,codex,cursor,gemini,copilot` | all five |
| `--ci <ci>` | CI workflow to generate: `none`, `github`, `gitlab` | the CI already in use (`.github/workflows/`, `.gitlab-ci.yml`), else `none` |
| `--contract-prefixes <csv>` | Contract ID prefixes to use | `SEC,QUA` |
| `--mode <mode>` | `minimal` or `full` | `full` |
| `--no-git` | Skip `git init` and hook activation | — |
| `--dry-run` | Preview what would be written; write nothing | — |
| `--force` | Overwrite every file, even modified ones | — |

Run `npx drwil init --help` for the live, authoritative list.

## Supported stacks, AI tools and CI providers

- **Layers**: any folder name (`api`, `web`, `backend`…), or `generic`
  (single-folder project) — auto-detected by `init` on existing code,
  explicit via `--layers`.
- **AI tools**: Claude Code, GitHub Copilot, Cursor, Codex, Gemini — pick
  any combination via `--tools`; each gets its own pointer file importing
  the shared `AGENTS.md`.
- **CI providers**: GitHub Actions, GitLab CI, or none — `--ci`.
- **Operating systems**: the kit's own test suite runs green on Linux,
  macOS and Windows (`kit-tests` matrix).

## The contracts registry

Every rule enforced by the kit's own hooks ships pre-registered in
`docs/contracts.md`, each with a stable ID so it can be cited anywhere in
the project (commits, PR descriptions, other docs):

| ID | What it guarantees |
|---|---|
| SEC-006 | No dependency with a known vulnerability |
| SEC-007 | No secret in the repository (tracked files + history) |
| QUA-011 | Documentation never cites a path or ID that doesn't exist |
| QUA-013 | A check that doesn't actually run in CI is never counted as passed |
| QUA-015 | Every work item stays resumable cold (dated status + resume section) |
| QUA-016 | Every tracked code file is covered by a scoping block |
| QUA-017 | No direct commit/push to the main branch — branch + PR always required |
| QUA-019 | A blocking check is never disabled or bypassed to make progress |
| QUA-029 | A test file cited by a contract exists and carries its ID |
| QUA-040 | The architecture map cites every code folder |
| APP-001 | Example business contract, to replace with your first one |

A separate **catalog** (`docs/contracts-catalog.md`) lists optional
contracts a project can choose to adopt beyond this baseline (test
coverage threshold, file size cap, rights scope…). Your business rules go
in the same registry: each workstream's acceptance criteria create or cite
them, with an **Origin** field.

## Optional modules (never installed by default)

| Module | What it does | How to enable |
|---|---|---|
| `dashboard` | Static HTML page aggregating work items, contracts and audit history | Copy the script in, see its own README |
| `front-quality` | Contrast/color-accessibility checks (RGAA/WCAG) for a front-end | Same as above |
| `create-release` | Git tag + GitHub release note, best-effort semver bump from Conventional Commits | Always manual, on explicit request — see `docs/recipes/create-a-release.md` |

## Internationalization

The kit ships **one template, in English**: docs, recipes, skills, hooks.
`--lang fr|en` sets the **project language** (English by default): the
installed `AGENTS.md` asks the agent to reply and to write briefs, intents,
journal entries and commit messages in it, and hook messages follow it.
The map, README and changelog follow `docLang` (absent: the project
language), for a project that works in one language and shows itself in
another.

## Compatibility

- Node.js, TypeScript-built CLI (`commander`-based).
- Tested green in CI on Linux, macOS and Windows.
- Not yet published to npm at the time of writing — install today from a
  clone of the source repository or a `npm pack` tarball (see above).

## Learn more

Full source, documentation (recipes, contract catalog, architecture):
<https://github.com/wdubilly/drwil>.
