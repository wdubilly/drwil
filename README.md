# DRWIL — Governance Layer for AI Agents

<p align="center">
  <strong>Governance for agent-produced work.</strong>
</p>

<p align="center">
  <em>The agent produces the work. DRWIL demands the proof.</em>
</p>

<p align="center">
  <a href="https://github.com/wdubilly/drwil">GitHub</a>
  ·
  <a href="https://github.com/wdubilly/drwil/issues">Issues</a>
</p>

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
## SEC-007 — Pas de secret dans le dépôt

**Règle:**
Aucun secret ne doit être commité dans le dépôt.

**Contrôle:**
secrets-fichiers
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
docs/contrats.md
```

They are human-readable and structured enough for DRWIL to discover and verify.

A contract contains at least:

* an identifier;
* a rule;
* a named control, or a manual part when the proof stays human.

For example:

```md
## QUA-011 — Documentation cohérente

**Règle:**
Les références documentaires doivent pointer vers des éléments existants.

**Contrôle:**
docs-references
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
GitHub release (Node.js 20+, and the GitHub CLI `gh` authenticated with access
to the repository).

### 1. Download the release tarball

From your project folder:

```bash
gh release download v0.2.0 --repo wdubilly/drwil --pattern 'drwil-*.tgz'
```

### 2. Install it as a dev dependency

```bash
npm install -D ./drwil-*.tgz
```

`npx drwil` then uses this version. To avoid touching `package.json`, replace
`npx drwil` with `npx --package ./drwil-*.tgz drwil` in the commands below.

### 3. Set up DRWIL in the project

```bash
npx drwil apply --dry-run   # preview: what would be added, nothing is written
npx drwil apply             # install, never overwriting an existing file
```

For an empty folder, use `npx drwil init` instead.

**Upgrading a project that already had DRWIL:** `apply` never overwrites, so
older hooks stay in place and are reported as drifted. Update the mechanics
with a diff and a confirmation per file (a `.bak` backup is kept):

```bash
npx drwil resoudre-derive
```

Contracts still in the legacy table format remain readable, but stay `MANUAL`
until they declare a control.

### 4. Check the installation, then the governance

```bash
npx drwil doctor            # diagnosis, without running any control
npx drwil contracts         # list and validate the contract registry
npx drwil verify            # human-readable verdict
npx drwil verify --agent    # output for an agent (Claude Code: /drwil verify)
```

### 5. Attest a MANUAL contract (human, in your own terminal)

```bash
npx drwil attest QUA-015 --note "sheets reviewed"
npx drwil verify
```

### Good to know

* `apply` enables the git hooks when it finds a git repository: direct commits
  to `main`/`master` are then refused (QUA-017) — work on a branch.
* Without gitleaks installed, the secrets contract (SEC-007) is `ERROR` in
  `verify` (tool unavailable).
* Without a CI configured, the CI-coverage contract (QUA-013) is `ERROR`
  ("no CI configured").

---

## Uninstalling

DRWIL removes only what it installed, and never silently:

```bash
npx drwil uninstall         # dry-run: lists what would be removed
npx drwil uninstall --yes   # actually removes those files
```

`uninstall` relies on the installed-files manifest that `init` and `apply` keep in the
`.drwil/` folder:

* it removes the files DRWIL installed **that are unchanged since installation**;
* it lists the files you modified and leaves them in place;
* it lists the local governance state `.drwil/state.json` (git-ignored) and
  deletes it only with `--yes`;
* it never touches the project's chantier, intention and recipe folders.

To only switch governance off (reversible, nothing deleted), set
`"barriere": "off"` in `.drwil/ia-first.json`: no scope barrier, no
`Drwil-Attente` trailer, no activity context for the agent.

It does not remove everything, on purpose. To finish cleaning up:

```bash
git config --unset core.hooksPath   # stop running the DRWIL git hooks
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
can read directly. Names below are for an English install; a French install
(`--lang fr`) uses the French names shown in parentheses.

### Governance

| Command | What it does |
| --- | --- |
| `/drwil` | Menu of DRWIL capabilities and their commands |
| `/drwil verify` | Is my work verified? Runs `drwil verify --agent` and follows the agent / human workflow |
| `/drwil-adopt` (`/drwil-adopter`) | Make the kit live on an existing project after `apply` |
| `/drwil-audit` | Audit risks and technical debt |
| `/drwil-value` (`/drwil-valeur`) | Discover the next high-value product features |
| `/drwil-usage` (`/drwil-conso`) | Record tokens, model and setup time for a finished lot |
| `/drwil-progress` (`/drwil-avancement`) | Generate a static HTML progress dashboard |
| `/drwil-release` | Tag and publish a GitHub release (optional module) |

There is deliberately **no** `/drwil attest`: attestation is a human action,
run by the human in their own terminal (`drwil attest <CONTRACT_ID>`).

### Working recipes

| Command | What it does |
| --- | --- |
| `/add-an-api-route` (`/ajouter-une-route-api`) | Add or change a backend API route with permissions and tests |
| `/add-a-frontend-screen` (`/ajouter-un-ecran-front`) | Add a front-end screen consistent with the existing ones |
| `/refactor-without-breaking` (`/refactorer-sans-casser`) | Restructure code without changing its behavior |
| `/modify-permissions` (`/modifier-les-droits`) | Change roles or permissions, server and front aligned |
| `/manage-access` (`/gerer-les-acces`) | Manage access through an external identity provider |
| `/run-locally` (`/lancer-en-local`) | Run the project locally for development |
| `/deploy-to-production` (`/deployer-en-prod`) | Deploy to production, only on explicit request |
| `/backup-and-restore` (`/sauvegarder-et-restaurer`) | Back up or restore production data safely |

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

### Apply

```bash
drwil apply
```

Audits what would be installed or changed before applying the project setup.

DRWIL avoids silent destructive operations.

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

DRWIL is currently focused on **V0.2 — Executable Governance**.

The current work focuses on:

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

The project is still evolving.

The goal of V0.2 is not to solve every possible governance problem.

It is to establish a small, reliable governance engine.

---

## Roadmap

### V0.2 — Executable Governance

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
