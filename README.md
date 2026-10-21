# DRWIL — Governance Layer for AI Agents

<p align="center">
  <strong>Governance for agent-produced work.</strong>
</p>

<p align="center">
  <em>The agent produces the work. DRWIL demands the proof.</em>
</p>

<p align="center">
  DRWIL = <strong>D</strong>eterministic <strong>R</strong>ules for <strong>W</strong>orkflows, <strong>I</strong>ntent &amp; <strong>L</strong>ineage
</p>

<p align="center">
  <a href="https://github.com/wdubilly/drwil">GitHub</a>
  ·
  <a href="https://github.com/wdubilly/drwil/issues">Issues</a>
</p>

---

## In one minute

An AI agent says *"Done."* DRWIL asks: **can you prove it?**

DRWIL is a governance layer for AI-produced work. The human decides what
must be true, the agent builds, and DRWIL checks the proof: a deterministic
verdict (`PASS`, `FAIL`, `ERROR` or `MANUAL`) that does not depend on the
model's own word.

```text
$ npx drwil verify
  ✓ PASS   SEC-007  No secret in the repo
  ✓ PASS   QUA-017  No direct work on the main branch
  ✗ FAIL   QUA-004  Tests pass
             unit-tests: failed
  ? MANUAL QUA-019  No bypassing a check
             human required: a bypass rarely leaves a machine-checkable trace.
9 contracts: 5 PASS, 0 ATTESTED, 1 FAIL, 3 MANUAL, 0 ERROR
GOVERNANCE: FAIL                                            (exit 1)
```

*Condensed output on a sample project. The work is not verified until the rule holds again;
a part that only a human can judge stays `MANUAL` until they attest it.*

### Who it is for

* **Teams and tech leads** who let AI assistants (Claude Code, Copilot,
  Cursor, Codex, Gemini) write code in a shared repository, and need to
  know what was done, within which limits, with which proof.
* **Solo developers** on projects that last weeks or months, who forget
  their own decisions as surely as a colleague would.
* **Organisations with quality or security requirements**, who want a
  traceable line from a decision to its proof.

Not for you if you are looking for a code generator, a linter or a tool
that turns a specification into code: DRWIL governs the work, it does not
produce it.

### Get started

```bash
npm install -D https://github.com/wdubilly/drwil/releases/download/v<version>/drwil-<version>.tgz
npx drwil init       # new, existing or already equipped project
npx drwil verify     # without a CI: VERIFY ERROR, expected — see Installation, step 3
```

`<version>`: the latest validated version, shown on
[https://github.com/wdubilly/drwil/releases/latest](https://github.com/wdubilly/drwil/releases/latest) — that page
never shows a pre-release, and its note gives the exact install command.

Details, prerequisites and upgrades: [Installation](#installation).

---

## What you gain

AI coding assistants are fast. What they lack is a boundary and a proof.
DRWIL adds both, and the people in charge stay in charge.

| You get | Because | Check it yourself |
|---|---|---|
| An agent that stays inside the lines | every commit must fall within the scope of an approved work item | `drwil state`, scope gate at each commit and in CI |
| "Done" that means done | every contract is backed by a check that actually ran; a check that did not run never counts as a pass | `drwil verify` |
| Decisions that stay human | starting a workstream, accepting the work and attesting a manual contract are gestures an agent cannot perform | `drwil attest`, `/drwil-start` |
| Work that survives the session | one `AGENTS.md`, one contract registry, one state on disk: another agent, or a human, resumes without re-reading the chat | `drwil state` |
| One setup for every tool | Claude Code, Copilot, Cursor, Codex and Gemini read the same rules | `drwil init` |
| Adoption without a big bang | works on a new or an existing project, previews with `--dry-run`, does not overwrite your files unless you force it | `drwil init --dry-run` |

Nothing to take on faith: each line is a command you can run.

---

## What is DRWIL?

DRWIL is a lightweight **governance and verification layer for AI agents**.

It sits between human intent and agent-produced work.

The human defines what must be true.

The agent produces the work.

DRWIL verifies whether the important requirements can actually be proven.

The core loop is:

```text
HUMAN
  ↓
Intent / Specification
  ↓
AGENT
  ↓
Work + Evidence
  ↓
DRWIL VERIFY
  ↓
PASS / FAIL / ERROR / MANUAL
  ↓
Human attestation when required
```

The principle is simple:

> **The agent produces the work. DRWIL demands the proof.**

---

## The Agent Layer

DRWIL is designed as a governance layer around the agent workflow, not as another AI agent.

```text
                 HUMAN
                   │
                   │ intent / requirements
                   ▼
             ┌─────────────┐
             │  AI AGENT   │
             │             │
             │ Build       │
             │   ↓         │
             │ Prove       │
             └──────┬──────┘
                    │
                    │ work + evidence
                    ▼
             ┌─────────────┐
             │   DRWIL     │
             │             │
             │ Contracts   │
             │ Controls    │
             │ Evidence    │
             │ Verify      │
             └──────┬──────┘
                    │
                    ▼
                 VERDICT
```

The separation is intentional:

* **Human** defines what must be true.
* **Agent** produces the work and available evidence.
* **DRWIL** verifies declared obligations.
* **Human** explicitly attests when mechanical verification is insufficient.

DRWIL therefore acts as a **governance boundary around agent-produced work**.

---

## Why DRWIL?

AI agents are increasingly capable of producing code, documentation, analyses, reports and other deliverables.

The problem is not only whether the agent can produce the work.

The harder question is:

> **How do we know that the important requirements were actually satisfied?**

An agent can say:

```text
"Done."
```

DRWIL asks:

```text
"Can you prove it?"
```

Instead of relying entirely on an agent's own statement of completion, DRWIL makes important requirements explicit and gives them a verification mechanism.

---

## The core model

DRWIL follows a simple model:

```text
INTENTION
    ↓
SPECIFICATION
    ↓
PROOF
    ↓
VERIFY
    ↓
VERDICT
```

Or, operationally:

```text
Specify → Build → Prove
```

A human defines what must be true.

The agent produces the work.

The agent can produce evidence and execute available controls.

DRWIL verifies the controls and produces a deterministic verdict.

When something cannot be fully verified mechanically, a human can explicitly attest to it.

---

## Why not just use `AGENTS.md`?

`AGENTS.md` is useful, but it answers a different question.

### `AGENTS.md`

Describes **how the agent should work**.

Examples:

* coding conventions;
* architecture rules;
* preferred commands;
* workflow instructions;
* things the agent should or should not do.

### DRWIL contracts

Describe **what must be true**.

Examples:

* no secrets are committed;
* required documentation exists;
* a specific control has been executed;
* an important project rule is satisfied;
* a human review is required for a particular obligation.

The distinction is:

```text
AGENTS.md  → HOW
Contracts  → WHAT MUST BE TRUE
Controls   → HOW TO PROVE IT
Verify     → WHETHER IT IS TRUE
Attest     → EXPLICIT HUMAN VALIDATION
```

DRWIL complements agent instructions rather than replacing them.

---

## Specification-Driven Development

Specification-Driven Development (SDD) is one of the natural ways to define the requirements that DRWIL governs:

> **Specify what must be true before asking an agent to build it.**

```text
                    DRWIL
          Governance Layer
                 │
       ┌─────────┴─────────┐
       │                   │
      SDD              Other sources
       │              of requirements
       │                   │
       └─────────┬─────────┘
                 ↓
              CONTRACTS
                 ↓
               AGENT
                 ↓
            WORK + PROOF
                 ↓
             DRWIL VERIFY
                 ↓
              VERDICT
```

AI agents are good at producing implementation. But when requirements remain implicit, ambiguous, or scattered across instructions, it becomes difficult to know whether the resulting work actually satisfies the intended specification.

DRWIL makes the specification explicit and connects it to verification.

```text
Human intent
     ↓
Specification
     ↓
Contracts
     ↓
Agent implementation
     ↓
Proofs / controls
     ↓
DRWIL verification
     ↓
Verdict
```

### From specification to proof

A specification describes the expected outcome.

DRWIL adds a path from that specification to evidence:

```text
SPECIFY → BUILD → PROVE → VERIFY
```

The important distinction is:

| Layer         | Question                               |
| ------------- | -------------------------------------- |
| Specification | What should be true?                   |
| Contract      | What obligation must be satisfied?     |
| Control       | How can we prove it?                   |
| Agent         | How do we build it?                    |
| DRWIL         | Is the obligation actually verified?   |
| Human         | What still requires explicit judgment? |

Not every requirement needs to be automatically verifiable.

When a requirement can be checked mechanically, DRWIL executes the corresponding control.

When it cannot, DRWIL reports `MANUAL` rather than silently treating the requirement as satisfied.

This creates a clear boundary between:

* **what was requested;**
* **what was implemented;**
* **what was proven;**
* **what still requires human judgment.**

### SDD for agent-produced work

The role of DRWIL is not to replace Specification-Driven Development.

It adds a governance layer around it:

```text
SDD
Define what must be true
        ↓
AGENT
Build the requested work
        ↓
DRWIL
Demand evidence that the specification was satisfied
        ↓
HUMAN
Attest only where mechanical verification is insufficient
```

This is especially important when the implementation is produced by an AI agent.

The agent is responsible for producing the work.

DRWIL is responsible for verifying the declared obligations.

The human remains responsible for explicit attestation when the machine cannot reliably establish the result.

---

## A 30-second example

A project can declare a contract:

```md
## SEC-007 — No secret in the repo

**Rule** : No secret in the repo (`.env`, keys, passwords, client configs).

**Check** : `secrets`
```

The contract states the obligation.

The control defines how it can be checked.

Running:

```bash
drwil verify
```

produces a governance result based on the actual verification.

The important difference is that the requirement is no longer just an instruction buried in documentation.

It is an executable governance obligation.

---

## Verification states

DRWIL distinguishes several states:

| Status     | Meaning                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------- |
| `PASS`     | The obligation was verified successfully.                                                     |
| `FAIL`     | The obligation was checked and is not satisfied.                                              |
| `ERROR`    | Verification could not be completed because of a configuration, tooling or execution problem. |
| `MANUAL`   | The obligation requires explicit human validation.                                            |
| `ATTESTED` | A human has explicitly attested to the remaining human-verifiable part.                       |

A key rule:

> **MANUAL is never silently converted into PASS.**

Likewise, an agent cannot attest on behalf of the human.

---

## The trust boundary

DRWIL deliberately separates three responsibilities:

```text
AGENT
  │
  ├─ builds the work
  ├─ runs available controls
  └─ produces evidence
        │
        ▼
DRWIL
  │
  ├─ resolves contracts
  ├─ executes controls
  ├─ evaluates evidence
  └─ produces a verdict
        │
        ▼
HUMAN
  │
  └─ explicitly attests when mechanical verification is insufficient
```

The critical boundary is:

> **An agent can build and produce evidence. DRWIL can verify. A human can attest. The agent cannot self-attest.**

This is intentional.

---

## Contracts

Contracts live in:

```text
docs/contracts.md
```

They are human-readable and structured enough for DRWIL to discover and verify.

A contract contains at least:

* an identifier;
* a rule;
* a named control, or a manual part when the proof stays human.

For example:

```md
## QUA-011 — Docs never wrong

**Rule** : Documentation references must point to existing elements.

**Check** : `docs-references`
```

The contract describes the obligation.

The control describes the proof mechanism.

DRWIL orchestrates them.

---

## Evidence

Verification can produce evidence about what was actually executed.

Evidence can include:

* control execution;
* command result;
* exit status;
* relevant output;
* verification metadata;
* human attestations.

Evidence is intended to make verification inspectable rather than merely declarative.

Sensitive values are masked where appropriate.

---

## Human attestation

Some requirements cannot be completely verified by a machine.

For those cases:

```text
MANUAL
  ↓
Human review
  ↓
drwil attest <CONTRACT_ID>
  ↓
ATTESTED
  ↓
drwil verify
```

Attestation is deliberately an explicit human action.

It requires an interactive terminal.

The agent must not execute it on behalf of the user.

Attestations are versioned and tied to the relevant contract/control fingerprint so that changes to the governed proof invalidate the previous attestation.

A contract can also declare the files it judges (`**Covers**` field, path patterns): the attestation records a fingerprint of their content, and a covered file modified, added, removed or renamed makes it stale (`verify` names the file). A still-valid attestation can be renewed on purpose with `drwil attest <CONTRACT_ID> --renew`, from the same interactive terminal.

---

## Agent independence

DRWIL is not designed around a specific AI provider.

The core workflow is:

```text
AI Agent
   ↓
drwil verify
```

The agent could be Claude, Codex, Cursor, Copilot, another tool, or a custom agent.

DRWIL's core verification engine remains independent of the agent that produced the work.

Integrations can therefore remain thin adapters around the native CLI.

---

## Installation

DRWIL is not published on npm yet. Install it from the tarball attached to a
GitHub release, by its URL: nothing to download, no file left in your project
(Node.js 22+). The latest validated version is always at
[https://github.com/wdubilly/drwil/releases/latest](https://github.com/wdubilly/drwil/releases/latest): a version is
published there only once its acceptance has approved it (candidates stay
pre-releases), and its note gives the exact install command.

### Before you start: prerequisites, recommendations, options

**Prerequisites** — without them, DRWIL does not work:

* Node.js 22+ and git. In an empty folder, `init` creates the git repository
  and a first working branch; in an existing repository, it keeps your
  history and only adds its files.

**Recommendations** — not required, but they make working with an agent
smoother and safer:

* **Restart your agent's session after `init`** (and after any change to its
  hooks). Claude Code loads its hooks when a session starts: a session
  opened before `init` runs none of them — no governance reminder, no start
  poll, no scope guard. How a tool reloads its configuration depends on the
  tool. Check that it worked: with Claude Code, a new session starts with
  `[drwil] Governance state…` (`[drwil] État de gouvernance…` in a French
  project); with any agent, ask it to run
  `node .githooks/state.mjs` and read the activity it reports.
* **Protect the main branch and require the CI checks.** Then nothing merges
  before the checks are green, auto-merge included. On GitHub: Settings →
  Rules → Rulesets (or Branches), target the default branch, require a pull
  request and the status check `checks` (the job of the CI `init` installs),
  with branches up to date. It takes admin rights on the repository. DRWIL
  does not set it up nor check it yet; GitLab has its own protected
  branches.

**Options**:

* **Automatic merge** (chosen when starting a workstream). On GitHub, an
  admin must tick « Allow auto-merge » (Settings → General → Pull
  Requests); otherwise `gh pr merge --auto` fails, and the agent says
  « auto-merge not allowed by the repository » and leaves the merge to you —
  it never reports a merge as scheduled when it is not. A mergeable PR,
  auto-merge allowed by the repository, auto-merge scheduled and merge done
  are four different states.

### 1. Install it as a dev dependency

From your project folder:

```bash
npm install -D https://github.com/wdubilly/drwil/releases/download/v<version>/drwil-<version>.tgz
```

`<version>` is the one shown on the latest release page. `package.json`
then points to that URL, and `npx drwil` uses this version. To avoid
touching `package.json`, replace `npx drwil` with
`npx --package https://github.com/wdubilly/drwil/releases/download/v<version>/drwil-<version>.tgz drwil`
in the commands below.

To upgrade, run the same command with the new release's URL. A project
installed from a downloaded tarball (`file:drwil-*.tgz` in `package.json`)
switches the same way; the old `drwil-*.tgz` file can then be deleted.

### 2. Set up DRWIL in the project

```bash
npx drwil init --dry-run    # preview: what would be written, nothing is written
npx drwil init              # install, never overwriting a project file
```

The same command works for an empty folder, an existing project, and an
update. Then run `/drwil-adopt` with your agent: on an empty folder it
scopes the project first (need, first version, stack, business rules) and
no layer is invented until you declare them (`npx drwil init --layers
api,web`); on existing code it builds the architecture map from the code,
which drwil keeps current from then on.

**Upgrading a project that already had DRWIL:** `init` refreshes what the
kit installed and the project never modified: its mechanics (hooks) and its
prose and settings (skills, recipes, `docs/ia-first.md`, the agents'
instructions, the contract catalog, `.claude/settings.json`). Your own
documents (README, architecture map, contract registry, briefs…) are never
touched, even unchanged. A kit file modified by hand stays in place and is
reported as drifted. Update it with a diff and a confirmation per file (a
`.bak` backup is kept):

```bash
npx drwil resolve-drift
```

A project equipped by an older, French-named version is migrated first (see
`packages/drwil/CHANGELOG.md`).

Contracts still in the legacy table format remain readable, but stay `MANUAL`
until they declare a control.

### 3. Check the installation, then the governance

```bash
npx drwil doctor            # diagnosis, without running any control
npx drwil contracts         # list and validate the contract registry
npx drwil verify            # human-readable verdict
npx drwil verify --agent    # output for an agent (Claude Code: /drwil verify)
```

A project without a CI reads `GOVERNANCE: VERIFY ERROR` here, and that is
expected: the CI-coverage contract (QUA-013) is not run, and a check that did
not run never counts as passed. Declare a CI to get out of it:
`npx drwil init --ci github` (or `--ci gitlab`). `verify` and `doctor` say the
same.

### 4. Attest a MANUAL contract (human, in your own terminal)

```bash
npx drwil attest QUA-015 --note "sheets reviewed"
npx drwil verify
```

### Good to know

* `init` enables the git hooks when it finds a git repository: direct commits
  to `main`/`master` are then refused (QUA-017) — work on a branch. A
  `core.hooksPath` already set by a hook manager (husky, lefthook…) is kept:
  `init` tells you how to call the drwil hooks from it.
* On an existing project, `init` never overwrites your files. When one of
  them lacks what DRWIL needs (`.gitignore` entries, `@AGENTS.md` import,
  Claude hooks…), it adds only that, in a delimited `drwil` block; your own
  `AGENTS.md` stays and points to the drwil instructions written aside
  (.drwil/AGENTS.md). `--dry-run` shows it first, `doctor` checks it later.
* The CI already in use is detected; in an existing CI file, `init` does not
  write: it prints the `checks` job to add.
* Without gitleaks installed, the secrets contract (SEC-007) is `ERROR` in
  `verify` (tool unavailable).
* Without a CI configured, the CI-coverage contract (QUA-013) is `ERROR`
  ("no CI configured"): `npx drwil init --ci github` (or `--ci gitlab`)
  declares one.

---

## Uninstalling

DRWIL removes only what it installed, and never silently:

```bash
npx drwil uninstall         # dry-run: lists what would be removed
npx drwil uninstall --yes   # actually removes those files
```

`uninstall` relies on the installed-files manifest that `init` keeps in the
`.drwil/` folder:

* it removes the files DRWIL installed **that are unchanged since installation**;
* it lists the files you modified and leaves them in place;
* it removes what `init` added to your own files (the `drwil` blocks, the
  kit's hooks in `.claude/settings.json`), and nothing else;
* it lists the local governance state, `.drwil/state.json` (if present,
  git-ignored), and deletes it only with `--yes`;
* it never touches the project's chantier, intention and recipe folders.

To only switch governance off (reversible, nothing deleted), set
`"scopeGate": "off"` in `.drwil/ia-first.json`: no scope barrier, no
`Drwil-Brief` trailer, no activity context for the agent.

It does not remove everything, on purpose. To finish cleaning up:

```bash
git config --unset core.hooksPath   # if set to .githooks: stop running the DRWIL git hooks
npm uninstall -D drwil              # if installed as a dev dependency
```

Then decide yourself what to do with what remains — your contracts, the
`.drwil/` folder (configuration, versioned human attestations) and any file
listed as modified: DRWIL never deletes your governance history for you.

---

## Slash commands (Claude Code)

When Claude Code is among the configured tools (`--tools claude`, the
default), DRWIL installs slash commands as Claude Code skills. They are thin
entry points to the project's recipes (in `docs/`), which any other agent
can read directly. The names are the same whatever the project language.

### Governance

| Command | What it does |
| --- | --- |
| `/drwil` | Menu of DRWIL capabilities and their commands |
| `/drwil verify` | Is my work verified? Runs `drwil verify --agent` and follows the agent / human workflow |
| `/drwil-adopt` | Make the kit live on an existing project after `init` |
| `/drwil-audit` | Audit risks and technical debt |
| `/drwil-value` | Discover the next high-value product features |
| `/drwil-usage` | Measure a workstream's tokens from Claude Code's session logs and record its closing line |
| `/drwil-progress` | Generate a static HTML progress dashboard |
| `/drwil-release` | Tag and publish a GitHub release, or a candidate pre-release with its acceptance sheet, then promote it once a human approved it (optional module) |

There is deliberately **no** `/drwil attest`: attestation is a human action,
run by the human in their own terminal (`drwil attest <CONTRACT_ID>`).

### Working recipes

| Command | What it does |
| --- | --- |
| `/add-an-api-route` | Add or change a backend API route with permissions and tests |
| `/add-a-frontend-screen` | Add a front-end screen consistent with the existing ones |
| `/refactor-without-breaking` | Restructure code without changing its behavior |
| `/modify-permissions` | Change roles or permissions, server and front aligned |
| `/manage-access` | Manage access through an external identity provider |
| `/run-locally` | Run the project locally for development |
| `/deploy-to-production` | Deploy to production, only on explicit request |
| `/backup-and-restore` | Back up or restore production data safely |

---

## CLI

The core interface is intentionally small.

### Verify

```bash
drwil verify
```

Run the project's contracts and produce a governance verdict.

### JSON output

```bash
drwil verify --json
```

Useful for automation and agent integrations.

### Agent-oriented verification

```bash
drwil verify --agent
```

Produces guidance suitable for an agent workflow while keeping the governance decision explicit.

### Human attestation

```bash
drwil attest QUA-015
```

Used by the human when a contract requires explicit human validation.

### Doctor

```bash
drwil doctor
```

Checks whether the DRWIL installation and project setup are coherent.

### Preview an install or update

```bash
drwil init --dry-run
```

Audits what would be installed or changed, writing nothing.

### Contracts

```bash
drwil contracts [--json]
```

Lists and validates the contract registry without running any check.

### Update and uninstall

```bash
drwil resolve-drift   # take over kit files modified by hand, with a diff and a .bak
drwil uninstall       # dry run; add --yes to remove only what the kit installed
```

### Governance state

```bash
drwil state           # see "The workstream cycle"
```

DRWIL avoids silent destructive operations.

---

## The workstream cycle

A piece of work moves through activities, kept in a local state
(`.drwil/state.json` (if present), never edited by hand):

```text
SCOPING ──start──▶ BUILD ──▶ EVIDENCE ──▶ VERIFY ──▶ CLOSING ──▶ SCOPING
 (frame)    human   (code)    (proofs)     (verdict)   (journal,
                                                        PR)
```

1. **SCOPING**: the request is framed as a work item in `docs/projects/`
   with a `scope` block listing the files the work may touch, and its
   **acceptance criteria**, each proven by a contract of the registry: the
   business non-regression grows with every workstream.
2. **Start (human)**: the human picks a framed work item (`/drwil-start`
   or `drwil state start`) and may authorise the merge in advance. The
   agent cannot start work by itself. Several ready work items ticked at
   once form a queue the agent chains, stopping at the first human gate.
3. **BUILD**: the agent implements inside the scope; each commit carries a
   `Drwil-Brief` trailer.
4. **EVIDENCE / VERIFY**: `drwil verify --evidence` writes the proof;
   closing requires `PASS` or `ATTESTED` on the current commit, a `MANUAL`
   contract waiting for the human's `drwil attest`; an unproven acceptance
   criterion makes the verdict fail. The work item judged is found without
   the local state too (`Drwil-Brief` trailer of the branch's commits), and
   the criteria of the closing proofs are replayed: one whose proof has
   disappeared makes the verdict fail and is named.
5. **CLOSING**: the work item is condensed into the journal, its closing
   proof is written (`docs/preuves/<work item>.md`: every criterion, its
   contract, that contract's checks, the verified commit and the
   fingerprint of the covered files) — without it the closing is refused —
   and the item itself is deleted,
   its token consumption is recorded (`.drwil/usage.jsonl`, read from
   Claude Code's session logs), its untreated limits become intents, the
   README, changelog and
   architecture map are updated when the work changes them, the pull
   request is opened, then back to SCOPING. The merge stays a
   human gesture unless authorised at start.

```bash
drwil state              # current activity, work item, scope
drwil state briefs       # framed work items, ready ones first
drwil state move <ACTIVITY>
```

---

## Exit codes

DRWIL uses deterministic exit codes:

```text
0 → all blocking contracts PASS or ATTESTED
1 → at least one blocking contract FAIL or MANUAL
2 → verification/configuration/tooling ERROR
```

This makes DRWIL usable both interactively and from automation.

---

## Severity

Contracts can carry different governance severities:

```text
BLOCKING
WARNING
ADVISORY
```

Only blocking contracts determine the global verification exit status.

This allows governance to remain proportional to risk rather than turning every project rule into a hard failure.

---

## Safe adoption

DRWIL is designed to work with both new and existing projects.

The goal is not to force a project into a large framework.

Instead:

```text
Existing project
      ↓
Declare important obligations
      ↓
Add controls
      ↓
Run drwil verify
      ↓
Improve progressively
```

Legacy contracts can remain readable while they are progressively migrated to the structured model.

No destructive migration is required.

---

## Git integration

DRWIL can participate in Git workflows without replacing Git or CI.

The verification engine can be reused by hooks while the hooks themselves remain autonomous.

This keeps the architecture simple:

```text
DRWIL verification engine
        ↑
        │
   thin adapters
        ↑
        │
 Git hooks / agents / CI / other integrations
```

DRWIL is a governance layer, not a replacement for your development tooling.

---

## JSON API

Machine-readable output is available through:

```bash
drwil verify --json
```

The JSON result is designed to allow agents and external tooling to consume the governance state without parsing human-oriented terminal output.

This makes DRWIL suitable as a verification primitive inside larger agent workflows.

---

## Design principles

### 1. Explicitness

Important requirements should be explicit.

### 2. Executability

Important requirements should have a concrete verification mechanism whenever possible.

### 3. Agent independence

Governance should not depend on the identity of the agent producing the work.

### 4. No silent success

An unverified requirement must not silently become a verified one.

### 5. Human responsibility remains human

When a machine cannot establish something reliably, the system makes that limitation visible and asks for explicit human validation.

### 6. Proportional ceremony

Low-risk work should not require the same governance ceremony as high-risk work.

### 7. Evidence over assertion

"Done" is not evidence.

A reproducible control result is.

---

## What DRWIL is not

DRWIL is intentionally **not**:

* an AI coding agent;
* an autonomous agent;
* a SaaS dashboard;
* a project management platform;
* a CI replacement;
* an authorization system;
* a marketplace for AI agents;
* a framework tied to one AI provider.

Its role is narrower:

> **Make important requirements explicit, make them verifiable, and make the verification state visible.**

---

## Current status

**V0.2 — Executable Governance** is delivered (see
`packages/drwil/CHANGELOG.md`); the latest validated release is at
[releases/latest](https://github.com/wdubilly/drwil/releases/latest). 0.6.0 added
the business non-regression fed by every workstream, queues of
workstreams, token consumption measured per workstream, readable
identifiers and a maintained architecture map. Next: trying it on real
projects (V1).

V0.2 covered:

* structured contracts;
* executable controls;
* deterministic verification;
* machine-readable results;
* installation diagnostics;
* safe project adoption;
* risk/severity levels;
* evidence;
* human attestation;
* agent integrations;
* initial benchmark methodology.

The project is still evolving: the goal is a small, reliable governance
engine, not to solve every possible governance problem.

---

## Roadmap

### V0.2 — Executable Governance (delivered)

Build a solid local governance and verification engine.

Focus:

```text
Contracts
Controls
Verify
Evidence
Attestation
CLI
```

### V1 — Stabilization & Adoption

Focus on:

* packaging;
* installation;
* documentation;
* compatibility;
* adoption patterns;
* integrations;
* non-regression benchmarks.

### V2 — Broader Governance

Explore governance patterns beyond the initial implementation while keeping the core model small and deterministic.

### V3 — Beyond Code

Explore whether the same model can govern other kinds of agent-produced work:

* investigation reports;
* log analysis;
* audits;
* data analysis;
* documentation;
* operational procedures;
* structured research;
* other human-reviewed deliverables.

The underlying model remains:

```text
HUMAN
  ↓
REQUIREMENTS
  ↓
AGENT
  ↓
ARTIFACT
  ↓
PROOFS
  ↓
DRWIL VERIFY
  ↓
VERDICT
```

This is an exploration, not a promise that every artifact type will become a first-class DRWIL feature.

---

## The bigger idea

Software development is only one instance of a broader problem.

When an AI agent produces something important, the central question becomes:

> **What did we ask for, what was actually produced, and what evidence do we have that the important requirements are satisfied?**

DRWIL explores a simple answer:

```text
Specify
   ↓
Build
   ↓
Prove
   ↓
Verify
   ↓
Attest when necessary
```

That is the foundation of the project.

---

## Contributing

Contributions are welcome.

If you want to contribute:

1. Read the project documentation.
2. Understand the contract/control model.
3. Keep the core verification engine independent from specific AI agents.
4. Prefer small, testable changes.
5. Add or update tests for behavioral changes.
6. Make governance decisions explicit.

Issues and pull requests are welcome on GitHub.

---

## License

DRWIL is released under the MIT License.

See [`LICENSE`](LICENSE).
