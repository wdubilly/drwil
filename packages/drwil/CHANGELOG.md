# Changelog

## Unreleased

Each workstream that changes what a user sees adds its line here, in its
closing commit; the release renames this section to its version.

### Starting a project

- A new project (no code yet) no longer gets invented `backend/` and
  `frontend/` layers: `init` says to scope it first. `/drwil-adopt` now
  starts a new project by scoping it (need, first version, stack, first
  business rules, risk) and writes `AGENTS.md`, the map and a first README;
  the layers are then declared with `drwil init --layers <layers>`, which
  creates each layer's `AGENTS.md`, `CLAUDE.md` and `GEMINI.md`.
- `/drwil-adopt` on an existing project builds the map
  (`docs/architecture.md`) from the real code.

### Every workstream leaves its non-regression

- Acceptance criteria are mandatory for every workstream brief: starting
  and closing a brief without any are refused (a warning only on a project
  installed before, see `newRequirements`).
- Each criterion is proven by a contract of the registry, never by a check
  alone; a contract created by the workstream carries an **Origin** field.
- While a brief is active, an unproven criterion makes `drwil verify` fail
  (or `MANUAL` for a human criterion awaiting its attestation): the agent
  can no longer claim « verified » too early. The unproven criteria are
  listed in every output (`criteria` in the JSON).
- `drwil verify` ends with a summary of the business rules (proven by a
  test, without a cited test, to complete, broken with their workstream).
- New check `contract-tests`: a test file cited by a contract (**Tests**
  field) must exist and carry the contract's ID.
- A failing check cited by several contracts is reported as « not
  attributable »; the adoption recipe teaches one check per business rule,
  filtering its tests by the ID.
- A brief's **Maturity** (`ready`, `to refine`, `in progress`) orders the
  start poll; a « ready » brief with an open decision or no increment is
  refused.

### Scoping and closing

- `scopeMirrors` setting: a scoped file also covers its declared generated
  copy.
- check-docs warns about what a scope usually forgets: code without any
  test file, a contract to create without `.drwil/ia-first.json`.
- A commit that stages documentation only (a brief widened mid-workstream)
  no longer replays the tests on the working tree; push and CI still do.
- Closing loops the intents: each untreated limit becomes an intent brief,
  the brief's **Intent** is updated or closed (a warning when a brief is
  deleted without touching it), and intents with no dated review for 30
  days are reported.
- Closing keeps what the user reads current: README and this changelog
  when the user-visible behaviour changes, the map when the structure
  changes. New check `architecture-map`: a code folder the map does not
  cite is reported, with the line to complete.
- New setting `docLang` (absent: the project language): the language of
  the map, README and changelog, given to the agent by `AGENTS.md` and the
  closing reminder.

### Running several workstreams

- One start poll with several briefs ticked queues them: the agent runs them
  one after the other (`node .githooks/state.mjs next`), after each merge,
  and stops at the first one that needs a human; `queue stop` drops the
  queue. Only ready briefs can be queued.

### Attestations and readability

- An attestation (version 2) stays valid when a check is added to its
  contract; it becomes stale when the rule, the Manual field, the severity
  or an attested check changes. Version 1 attestations keep their old
  fingerprint.
- `drwil attest` announces each check it re-runs, and its result.
- An identifier cited to a human (contract ID, catalog line, lot or point of
  the active brief) comes with its label: `node .githooks/glossary.mjs
  "<text>"` for any agent, annotated outputs of `drwil verify` and of the
  checks, a Claude Code hook; `AGENTS.md`, Copilot and Cursor instructions
  carry the rule.

### Reliability

- `init` records the engine's version (`.drwil/install.json`) and `doctor`
  compares it with the CLI; an update from an older version keeps the
  project's work and refreshes the unchanged mechanics.
- A dangerous path in the manifest (absolute, `..`, outgoing symbolic link)
  stops `init` and `uninstall` before any write; outside a commit, a check
  that should have run and could not makes the checks fail.
- An ID defined both in the registry and in the catalog, or twice in the
  catalog, is reported.
- The redaction of private keys in the evidence runs in linear time (a
  quadratic pattern on a crafted output).

## 0.5.1

### `init` on an existing project: nothing left aside silently

- A file the project already has is still never overwritten, but `init`
  now adds what drwil needs in it, and says so (`--dry-run` shows it
  first):
  - `.gitignore`, `CLAUDE.md`, `GEMINI.md`, Copilot and Cursor
    instructions: the missing lines, in a block delimited by `>>> drwil` /
    `<<< drwil`. The template's `.gitignore` carries the same block, the
    single source of these lines.
  - `AGENTS.md`: the project's text stays; the drwil instructions are
    written to `.drwil/AGENTS.md`, pointed to by one added line (and
    imported by `CLAUDE.md` / `GEMINI.md`).
  - `.claude/settings.json`: the kit's hooks and permissions are merged,
    the project's keys and rules kept.
  - `.gitleaks.toml`: the kit manifest is added to the allowlist (both
    `[allowlist]` and `[[allowlists]]` forms).
- The CI already in use (`.github/workflows/`, `.gitlab-ci.yml`) is
  detected when `--ci` is not given (it was `none`). An existing CI file is
  not rewritten: `init` prints the `checks` job to add.
- A `core.hooksPath` already set (husky, lefthook…) is no longer replaced
  by `.githooks`: `init` says how to call the drwil hooks from it.
- `.claude/hooks/` is a kit mechanic like `.githooks/`: refreshed when
  unchanged since its installation, reported as drift otherwise.
- `doctor` checks what drwil needs inside the project's files, and accepts
  drwil hooks called from a hook manager; each gap comes with its fix.
- `uninstall` removes what `init` added to the project's files (the `drwil`
  blocks, the kit's hooks in `.claude/settings.json`); merged permissions
  stay.

- Documentation: the READMEs (package and repository) now describe the
  gain, the workstream cycle (`SCOPING` → `BUILD` → `EVIDENCE` → `VERIFY` →
  `CLOSING`), the `state` command and the update / uninstall commands; the
  contract examples of the repository README are in English.

## 0.5.0

**Breaking change: the CLI is in English, with a single install command.**

### A single `drwil init`

- `drwil apply` is removed, without an alias: `drwil init` installs a new
  project, equips an existing one, and updates an equipped one.
  - New project (no config, no detected stack): default layers
    `backend,frontend`, Git repository created on a working branch.
  - Existing project: layers from the detected stack, never a `git init`.
  - Update: what is missing is created; the kit mechanics (`.githooks/`)
    are refreshed only if unchanged since their installation — a file
    modified by hand is reported as drift, never overwritten (`init` used to
    overwrite it). `--force` still rewrites everything.
- `drwil init --dry-run` previews what would be written (the former
  `apply --dry-run`), through the same code path as the install.

### Renamed

| Before | After |
|---|---|
| `drwil apply` | `drwil init` |
| `drwil etat` | `drwil state` |
| `drwil resoudre-derive --forcer` | `drwil resolve-drift --force` |
| Check identifiers `secrets-fichiers`, `perimetre-attente`, `controles-autotest`, `couverture-ci`, `branche-principale`, `projet:<name>` | `secrets`, `scope-gate`, `checks-self-test`, `ci-coverage`, `main-branch`, `project:<name>` |
| Engine statuses `echec`, `non-execute`, `non-applicable` (in `drwil verify --json` and evidence) | `fail`, `not-run`, `not-applicable` |
| Redaction marker `[CAVIARDÉ]` | `[REDACTED]` |
| `node .githooks/state.mjs` options `--fiche`, `--demande` | `--brief`, `--request` |
| Typed confirmations `LANCER`, `FUSION` | `START`, `MERGE` |
| Skill `/drwil-lancer`, poll headers `drwil-lancer` / `drwil-fusion` | `/drwil-start`, `drwil-start` / `drwil-merge` |

`drwil init` migrates the check identifiers cited by the project's contract
registry (`dirs.contracts`, `docs/contracts.md`, `docs/contracts-catalog.md`)
and touches nothing else for this step. A contract whose text cites a check
identifier gets a new fingerprint: its attestations become obsolete and
must be renewed (`drwil attest`, a human action). Severities keep being read
in either language (`bloquant` or `blocking`…); internally and in the JSON
outputs they are `blocking`, `warning`, `advisory`.

### Messages

The CLI's messages follow the project's language (`lang` of
`.drwil/ia-first.json`, or `--lang` for a preview), English outside a
project. Two shipped messages no longer show an identifier internal to
drwil's own repository.

## 0.4.0

**Breaking change: the governance core is now in English.** The hooks only
read the English names; a project equipped by an earlier version is
migrated once by `drwil init` or `drwil apply` (no aliases).

### Migration

- `drwil apply --dry-run` lists what the migration would do, writing
  nothing; `drwil init` and `drwil apply` run it first, then install.
- The migration is idempotent: on a migrated project it does nothing.
- Project content (briefs, index, contracts, journal) is moved, never
  deleted; a target that was already modified is not overwritten (reported
  as a conflict).
- An old kit file that was not modified since installation is removed and
  reinstalled under its English name; one that was modified by hand is
  kept and reported, to be taken over by hand.
- References are rewritten in text files (docs, settings, `.gitignore`,
  hook scripts), never in the project's code.

### Renamed

| Before | After |
|---|---|
| `docs/projets/`, `en-attente.md` | `docs/projects/`, `pending.md` |
| `docs/contrats.md`, `docs/catalogue-contrats.md` | `docs/contracts.md`, `docs/contracts-catalog.md` |
| `docs/recettes/` | `docs/recipes/` |
| Activities `CADRAGE`, `ATTENTE`, `DEMANDE`, `REALISATION`, `PREUVES`, `CLOTURE` | `SCOPING`, `EXPECTATION`, `REQUEST`, `BUILD`, `EVIDENCE`, `CLOSING` (`VERIFY` unchanged) |
| State fields `activite`, `attente_active`, `demande_active`, `fusion_autorisee`, `depuis` | `activity`, `active_brief`, `active_request`, `auto_merge`, `since` |
| Settings `barriere`, `cadrage`, `nouvellesExigences`, `horsPerimetre`, `risque.cheminsSensibles`, `checks[].chemins`, `dirs.recettes` | `scopeGate`, `scopeReminder`, `newRequirements`, `outOfScope`, `risk.sensitivePaths`, `checks[].paths`, `dirs.recipes` |
| Setting values `bloquant`, `avertissement`, `humain` | `blocking`, `warning`, `human` |
| Brief block `<!-- cadrage` / `fichiers:` | `<!-- scope` / `files:` |
| Commit trailer `Drwil-Attente` | `Drwil-Brief` |
| Hooks `etat`, `perimetre`, `cadrage`, `fiches`, `contrats`, `moteur`, `risque` | `state`, `scope-gate`, `scope`, `briefs`, `contracts`, `engine`, `risk` |
| Claude Code hooks `garde-fou-bash`, `rappel-cadrage`, `saisie-drwil` | `bash-guard`, `scope-reminder`, `prompt-hook` |
| Optional modules `tableau-de-bord`, `creer-une-release` | `dashboard` (output `docs/dashboard.html`), `create-release` |
| `node .githooks/state.mjs` subcommands `passer`, `lancer`, `fiches`, `rappel` | `move`, `start`, `briefs`, `reminder` |
| `.drwil/fichiers-installes.json`, `.drwil/rappel.json` | `.drwil/installed-files.json`, `.drwil/reminder.json` |
| `.drwil/usage.jsonl` fields `chantier`, `lot`, `modele`, `duree_min` | `workstream`, `increment`, `model`, `duration_min` |
| Branch prefix `chantier/` (convention) | `workstream/`; `init` creates `workstream/kit-installation` |
| CI alert job `alerter-si-ci-cassee` | `alert-if-ci-broken` |

The code shipped with the kit (hooks, modules, CI, configuration) is in
English; messages stay in the project's language (French or English).
Intent sections are accepted in either language.

### Unchanged for now

Values visible outside the hooks keep their names until the CLI is
translated: check identifiers cited by contract registries
(`perimetre-attente`…), engine statuses in `drwil verify` evidence
(`echec`, `non-execute`…), contract severities (`bloquant`…), the CLI
commands and messages (`drwil etat`…), the `--fiche` / `--demande`
options, the typed confirmations `LANCER` / `FUSION`, the `/drwil-lancer`
skill and the `contraste-fond:` directive of the front-quality module.
