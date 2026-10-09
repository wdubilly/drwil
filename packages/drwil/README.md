# drwil

**IA-first governance, scaffolded in one command and enforced on every commit.**

drwil is a CLI and template kit that installs a verified, machine-checked
governance layer into any software project — new or existing, any stack,
any OS. It exists for one reason: when an AI coding assistant (or a human)
writes code without a shared frame of reference, things quietly go wrong —
context gets lost between sessions, a security rule gets skipped, "fixed"
gets announced without proof, a secret leaks into a commit, a CI check
silently stops running. drwil writes the rules that matter exactly once,
in files every AI tool reads first, and backs them with Git hooks and CI
checks that block a commit or a pull request when a rule is broken —
whether the code was written by you or by Claude, GitHub Copilot, Cursor,
Codex, or Gemini.

This is not a linter and not a style guide. It is a governance contract
between the rules you decide on and the mechanics that enforce them, so
that "the rule is respected" is always a provable fact, never a claim.

## Table of contents

- [Who it's for](#whos-its-for)
- [What problem it solves](#what-problem-it-solves)
- [What gets installed](#what-gets-installed)
- [How the governance loop works](#how-the-governance-loop-works)
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
| Picking up a piece of work cold (another agent, or weeks later) means re-reading everything to understand its state | Every work item under `docs/projets/` carries a dated status and a "resume" section; every entry in the backlog index states who must decide (`[AI]` / `[human]` / `[decision]`) | QUA-015 |
| Code gets added with no link to any documented piece of work | Every tracked code file must be covered by the scoping block of a work item | QUA-016 |
| A direct commit or push to the main branch bypasses review | Blocked after the very first commit: all work goes through a branch and a pull/merge request | QUA-017 |
| A blocking check (test, hook, CI) gets disabled or skipped "just this once" to move forward | Silently bypassing a check is forbidden; a miscalibrated check gets fixed, not switched off | QUA-019 |
| No branch protection available (private repo, free plan): a broken merge to `main` can go unnoticed | A GitHub/GitLab issue is opened automatically when CI breaks on the main branch (no duplicate if one is already open) | — (dedicated recipe) |

## What gets installed

Running `init` (new project) or `apply` (existing project) adds:

- **`AGENTS.md`** — the single entry point every AI assistant reads
  first: project description, non-negotiable conduct rules (scope,
  secrets, proof-before-claim, root-cause-before-fix), and a progressive
  context-loading table (which doc to read for which kind of task).
- **Per-tool pointer files** — `CLAUDE.md`, `.github/copilot-instructions.md`,
  `.cursor/rules/`, `.codex/`, `.gemini/`, depending on the tools you
  selected — each one simply imports `AGENTS.md` so the same rule never
  needs to be written twice.
- **`docs/contrats.md`** — the registry of rules that actually matter,
  each one with an ID (`SEC-xxx`, `QUA-xxx`), a one-line description and
  a pointer to the check that proves it.
- **`.githooks/`** — Git hooks (`pre-commit` and friends) that run the
  project's checks (`run-checks.mjs`) before every commit,
  and the equivalent CI workflow (GitHub Actions or GitLab CI, your
  choice) so the same checks run server-side too.
- **`docs/recettes/`** — reusable step-by-step procedures (add an API
  route, add a screen, refactor safely, deploy, audit risk, release…)
  that both humans and AI assistants are expected to follow instead of
  improvising each time.
- **`docs/projets/`** — the work-item system: one dated, decision-driven
  sheet per piece of work, an index of pending items, and a journal of
  closed ones — so any session (human or AI) can resume work without
  having to reconstruct context from chat history.
- **An installed-files manifest** — a record of exactly which files the
  kit installed and their fingerprint, used by `apply`/`uninstall` to
  never silently overwrite or delete something you wrote yourself.

Nothing above is ever force-installed over your own files on a repeat
`apply`: existing files are left untouched and flagged if they have
drifted from the shipped template (see `resoudre-derive` below).

## How the governance loop works

1. **A request comes in.** If it's ambiguous or has multiple reasonable
   solutions, it becomes a scoping sheet in `docs/projets/` *before* any
   code is written — open questions go to the human, not decided
   silently by the assistant.
2. **Code gets written**, following the project's own `AGENTS.md` and the
   relevant recipe (`docs/recettes/`).
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

Both commands run **in the current directory** (`cd` into the project
first); neither one creates a new folder.

### `init` — brand-new project, or empty folder

```bash
mkdir MyProject && cd MyProject
npx drwil init --name "MyProject" --lang en
```

Scaffolds the kit's full structure in the current folder (`AGENTS.md`,
`docs/contrats.md`, Git hooks enabled). Re-running `init` only refreshes
`.githooks/` by default (docs you've already written are left alone);
`--force` overwrites everything, including project docs added since —
reserve it for a deliberate reset.

### `apply` — project that already exists

```bash
cd MyExistingProject
npx drwil apply --lang en
```

For a repository that already has code, Git history, and dependencies in
place. `apply` detects the stack present (backend/frontend subfolders,
AI tools already configured) and installs the kit on top **without ever
overwriting anything**: an existing file is left as-is, and flagged if it
has drifted from the template since a previous install. This is the
command to use to adopt drwil on an ongoing project.

Before writing anything, `apply` audits the repository and prints a
preview: detected stack, AI tool files already present, safeguards already
in place (npm `test`/`lint` scripts, eslint, husky, pre-commit, gitleaks,
CI, git hooks), the exact list of files it will add, and the existing
files it will leave untouched. `npx drwil apply --dry-run` stops after the
preview and writes nothing; the preview runs through the same code path as
the real install, so it cannot drift from what `apply` actually does.

### `verify` — validate the work against the project's contracts

```bash
npx drwil verify
```

Reads every contract in `docs/contrats.md` (or `docs/contracts.md`), runs
the check each one names (`**Contrôle**`/`**Check**`) through the same
engine as the git hooks (`.githooks/moteur.mjs`), and prints a verdict:
`PASS` (exit 0), `FAIL` or `MANUAL REVIEW REQUIRED` (exit 1), `VERIFY
ERROR` (exit 2). A contract with a human part is `MANUAL`, never `PASS`;
an unknown check is an `ERROR`. See `docs/ia-first.md`, section 5, in an
installed project.

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
contract text or its proof definition changes, which makes the attestation
stale. Exit 0: recorded; 1: refused or not eligible; 2: unknown contract.

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
(`core.hooksPath`), CI file, required tools (git, gitleaks). Exit 0:
healthy (warnings allowed); 1: problems; 2: not a drwil project.

### `contracts` — list and validate the contract registry

```bash
npx drwil contracts [--json]
```

Lists each contract with its checks and manual part, without running
anything. Exit 0: valid registry; 2: invalid (unknown check, missing rule
or proof, duplicate).

### `resoudre-derive` — resolve mechanics drift

```bash
npx drwil resoudre-derive
```

When `init`/`apply` detect that a mechanics file (`.githooks/`,
`.claude/settings.json`, CI workflow file) has drifted from the version
shipped by the kit, this command walks through each drifted file, shows a
unified diff, and asks for confirmation before overwriting — always
creating a `.bak` backup first, and never creating a file that doesn't
exist yet. `--forcer` skips the confirmation for scripted/non-interactive
use.

### `uninstall` — remove the kit's mechanics

```bash
npx drwil uninstall          # dry-run: prints what would be removed
npx drwil uninstall --yes    # actually removes the files
```

Driven by the installed-files manifest, so it only removes what the kit
itself installed. Never touches `docs/projets/`, `docs/intentions/`, or
`docs/recettes/` — your project's decisions and history are never
deleted automatically. The local governance state,
`.drwil/state.json` (if present, git-ignored), is listed too, and deleted only with `--yes`. To only switch
governance off, without removing anything: `"barriere": "off"` in
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

Common options (both `init` and `apply`):

| Option | Description | Default |
|---|---|---|
| `-n, --name <name>` | Project name | current folder name |
| `-s, --short <short>` | Short name | — |
| `-l, --lang <lang>` | Template language: `fr` or `en` | `fr` |
| `--layers <layers>` | Comma-separated layers | detected (`apply`) / `backend,frontend` (`init`) |
| `-d, --description <text>` | What the application does — fills `AGENTS.md` and `docs/architecture.md` | — |
| `--tools <tools>` | AI tools to configure, CSV: `claude,codex,cursor,gemini,copilot` | all five |
| `--ci <ci>` | CI workflow to generate: `none`, `github`, `gitlab` | `none` |
| `--contract-prefixes <csv>` | Contract ID prefixes to use | `SEC,QUA` |
| `--mode <mode>` | `minimal` or `full` | `full` |
| `--no-git` | Skip `git init` and hook activation | — |
| `--force` | (`init` only) Overwrite every file, not just `.githooks/` | — |

Run `npx drwil init --help` or `npx drwil apply --help` for the live,
authoritative list.

## Supported stacks, AI tools and CI providers

- **Layers**: `backend`, `frontend`, or `generic` (single-folder project)
  — auto-detected by `apply`, explicit via `--layers` for `init`.
- **AI tools**: Claude Code, GitHub Copilot, Cursor, Codex, Gemini — pick
  any combination via `--tools`; each gets its own pointer file importing
  the shared `AGENTS.md`.
- **CI providers**: GitHub Actions, GitLab CI, or none — `--ci`.
- **Operating systems**: the kit's own test suite runs green on Linux,
  macOS and Windows (`kit-tests` matrix).

## The contracts registry

Every rule enforced by the kit's own hooks ships pre-registered in
`docs/contrats.md`, each with a stable ID so it can be cited anywhere in
the project (commits, PR descriptions, other docs):

| ID | What it guarantees |
|---|---|
| SEC-001 | Scope of rights is explicit and reviewed |
| SEC-006 | No dependency with a known vulnerability |
| SEC-007 | No secret in the repository (tracked files + history) |
| QUA-004 | Test coverage stays above a declared threshold |
| QUA-011 | Documentation never cites a path or ID that doesn't exist |
| QUA-013 | A check that doesn't actually run in CI is never counted as passed |
| QUA-015 | Every work item stays resumable cold (dated status + resume section) |
| QUA-016 | Every tracked code file is covered by a scoping block |
| QUA-017 | No direct commit/push to the main branch — branch + PR always required |
| QUA-019 | A blocking check is never disabled or bypassed to make progress |

A separate **catalog** (`docs/catalogue-contrats.md`) lists optional
contracts a project can choose to adopt beyond this baseline.

## Optional modules (never installed by default)

| Module | What it does | How to enable |
|---|---|---|
| `tableau-de-bord` (dashboard) | Static HTML page aggregating work items, contracts and audit history | Copy the script in, see its own README |
| `front-quality` | Contrast/color-accessibility checks (RGAA/WCAG) for a front-end | Same as above |
| `creer-une-release` | Git tag + GitHub release note, best-effort semver bump from Conventional Commits | Always manual, on explicit request — see `docs/recettes/creer-une-release.md` |

## Internationalization

Every template ships in **French and English** with equivalent content in
both languages (checked by an automated test comparing file counts and
structure) — pick with `--lang fr|en` at install time. This README itself
follows the same convention: English first, French below.

## Compatibility

- Node.js, TypeScript-built CLI (`commander`-based).
- Tested green in CI on Linux, macOS and Windows.
- Not yet published to npm at the time of writing — install today from a
  clone of the source repository or a `npm pack` tarball (see above).

## Learn more

Full source, documentation (recipes, contract catalog, architecture):
<https://github.com/wdubilly/drwil>.

---

# drwil (Français)

**Quand une IA (ou un humain) code sans cadre**, rien n'empêche un oubli
de contexte entre deux sessions, une règle de sécurité non respectée, un
« c'est corrigé » annoncé sans preuve, ou un secret qui fuite dans un
commit. drwil installe dans un projet un **cadre vérifié
automatiquement** : les règles importantes sont écrites une seule fois,
et un contrôle Git les fait respecter à chaque commit — que ce soit vous
ou une IA (Claude, Copilot, Cursor, Codex, Gemini) qui écrive le code.

Concrètement, le kit ajoute à un projet :
- un **point d'entrée unique** que toute IA lit en premier (`AGENTS.md`) ;
- un **registre des règles qui comptent** (`docs/contrats.md`), chacune
  avec sa preuve ;
- des **contrôles Git** (hooks) qui bloquent un commit qui viole une
  règle — en local et en CI.

## Installer

Les deux commandes s'exécutent **dans le dossier courant** (`cd` dans le
projet avant de lancer la commande) ; aucune ne crée de nouveau dossier.
Le choix entre les deux dépend de l'état du projet.

### `init` — projet tout neuf, ou dossier vide

```bash
mkdir MonProjet && cd MonProjet
npx drwil init --name "MonProjet"
```

Scaffolde la structure complète du kit dans le dossier courant
(`AGENTS.md`, `docs/contrats.md`, hooks Git activés). Un deuxième
`init` ne rafraîchit que `.githooks/` par défaut (les docs déjà
écrites ne sont pas touchées) ; `--force` écrase tout, y compris les
docs de projet ajoutées depuis — à réserver à un rattrapage volontaire.

### `apply` — projet déjà existant

```bash
cd MonProjetExistant
npx drwil apply
```

Pour un dépôt qui a déjà du code, un historique Git et des dépendances
en place. `apply` détecte la stack présente (sous-dossiers
backend/frontend, outils IA déjà configurés) et installe le kit
par-dessus **sans jamais rien écraser** : un fichier déjà présent est
laissé tel quel, et signalé s'il a dérivé du gabarit depuis une
installation précédente. C'est la commande à utiliser pour adopter
drwil sur un projet en cours.

Options principales (communes aux deux commandes) : `--lang fr|en`,
`--layers backend,frontend` (détecté sinon), `--tools
claude,copilot,cursor,codex,gemini`, `--ci github|gitlab|none`. Voir
`npx drwil init --help` ou `npx drwil apply --help`.

## Ce que ça résout, et comment

| Problème concret | Mécanisme drwil |
|---|---|
| Chaque outil IA a ses propres règles, qui divergent faute d'un point d'entrée commun | `AGENTS.md` unique, importé par le fichier propre à chaque outil installé |
| Une doc cite un chemin ou un ID de contrat qui n'existe plus | Un hook refuse le commit si la doc cite un chemin/ID inexistant |
| Un secret (clé, mot de passe, `.env`) atterrit dans un commit | Détection de secrets au commit et en CI |
| Un contrôle CI a été silencieusement retiré | Un hook vérifie que chaque contrôle attendu tourne réellement en CI |
| Un chantier repris à froid oblige à tout relire pour comprendre où ça en est | Chaque fiche de chantier a un Statut daté et une section Reprise |
| Du code est ajouté sans lien avec aucun chantier documenté | Tout fichier de code doit être couvert par un bloc de cadrage |
| Un commit ou push direct sur la branche principale contourne la revue | Bloqué après le tout premier commit : le travail passe par une branche + pull/merge request |

## Comment ça cadre l'IA

- **Contexte chargé à la demande** : `AGENTS.md` de couche, pas tout le
  dépôt — une IA comprend les règles qui s'appliquent sans tout ingérer.
- **Cadrage avant code** : une demande ambiguë devient une fiche de
  décision avant d'écrire — les points à trancher sont posés à l'humain.
- **Preuve mécanique plutôt que relecture** : un contrat vérifié par un
  contrôle évite les allers-retours de validation manuelle.
- **Multi-outils sans dérive** : Claude Code, GitHub Copilot, Cursor,
  Codex et Gemini lisent tous le même `AGENTS.md`.

## Comment ça cadre l'équipe

- **Branche + revue systématiques** : personne ne pousse directement sur
  la branche principale après le tout premier commit.
- **Historique des décisions traçable** : le registre de contrats et les
  fiches de chantier remplacent les décisions orales perdues dans un
  chat.
- **Alerte CI cassée** : une issue est ouverte automatiquement si la CI
  casse sur la branche principale (utile sans protection de branche).

## Modules optionnels (jamais installés par défaut)

- **tableau-de-bord** : page HTML qui agrège chantiers, contrats et
  audits.
- **front-quality** : contrôle de contraste/couleurs (RGAA/WCAG) pour un
  front.
- **créer une release** : tag Git + note de release GitHub, calcul de
  version best-effort — toujours manuel, sur demande explicite.

## En savoir plus

Code source, documentation complète (recettes, catalogue de contrats,
architecture) : <https://github.com/wdubilly/drwil>.
