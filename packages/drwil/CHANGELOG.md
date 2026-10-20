# Changelog

## Unreleased

Each workstream that changes what a user sees adds its line here, in its
closing commit; the release renames this section to its version.

## 0.6.8 (2026-10-20)

### Added

- Copilot CLI chains workstreams: its start poll carries two fields (the
  brief and `drwil-merge`), and `.githooks/state.mjs start` / `next` now
  work from CLOSING once the closing PR is merged (checked with git, then
  `gh`), so the state returns to SCOPING by itself.
- Each workstream of a queue runs in a subagent from the first one, under
  Claude Code and Copilot CLI alike.

## 0.6.7 (2026-10-19)

### Added

- `AGENTS.md` now says that, in SCOPING, a need the human expresses is
  framed (an intention or a brief), never coded, and that the agent asks
  "intention or implementation request?" when in doubt.
- The checks now refuse a skill whose YAML header does not read in strict
  YAML (a plain value holding `: `), with the file and the line. Copilot
  CLI silently dropped such a skill.
- `docs/ia-first.md` carries a tool compatibility matrix: for each
  assistant, whether its hooks run, whether a code write is refused in
  SCOPING and whether it receives the state reminder, with the date and
  version of the trial.

- Choosing `copilot` now also installs `.claude/` (hooks, settings, skills)
  and `.github/hooks/drwil.json`: Copilot CLI reads them, so a code write in
  SCOPING is refused, the state reaches the session and each message, and the
  `/drwil-*` commands are the same as with Claude Code.
- Choosing `gemini` now also installs `.gemini/settings.json` and the shared
  `.claude/hooks` scripts: a code write (`write_file`, `replace`) is refused in
  SCOPING and the state reaches the session start and each message. Gemini CLI
  only runs a repository's hooks in a trusted folder; a workstream is started
  with `node .githooks/state.mjs start` in a terminal.

### Fixed

- Updating a project equipped by an older version now adds the kit's new
  mechanics files to the scope block of `docs/projects/kit-mechanics.md`; before,
  they were covered by no brief and the docs check failed after the update.
- The write hook read the file under `file_path` only; Copilot CLI sends
  `path`, so nothing was refused there.
- The `/drwil-start` skill header was invalid in strict YAML, so Copilot
  CLI did not list it.
- The write hook answered in Claude Code's format only; it now also answers
  Gemini CLI's (`decision: deny`), and the state hooks speak its JSON.

## 0.6.6 (2026-10-19)

### Changed

- During a detour, a commit that only adds new contracts to the registry
  no longer waits for the human's yes (`node .githooks/detour.mjs allow`),
  so a queue of workstreams no longer stops for it; modifying or removing
  an existing contract still does, and so does any doubt.

### Fixed

- The acceptance sheet of a candidate release (release module) is right
  again on three points met with the first real one: its `drwil verify`
  verdict no longer falls to FAIL only because the release is created on
  the main branch (the rule against direct work there is not counted, and
  the sheet says so); each workstream's brief is read in its last version
  before its deletion, no longer in the scoping version kept on the main
  branch; and only a known limit that says so becomes a « not tried for
  real yet » point, never a sentence of need or decision.
- A `git push` from a secondary worktree no longer touches the main
  repository: the checks launched by the hooks (and by `drwil verify`) now
  run without the hook's `GIT_*` variables, so a test that runs `git init`
  elsewhere can no longer write `core.bare=true` in the shared
  configuration or soil the index. Only gitleaks keeps them, to read the
  index of the commit in progress.
- Branches merged by squash are now recognised as merged: a branch whose
  GitHub pull request is merged (asked to `gh`) is deleted at the next
  workstream start, and `node .githooks/detour.mjs resume` accepts a
  detour merged that way. Without `gh` reachable, only a classic merge is
  recognised and the start or the resume says so; a branch is never
  deleted without proof that it is merged.

## 0.6.5 (2026-10-19)

### Changed

- Installing or updating (`drwil init`, with or without `--force`) no
  longer rewrites a document that would differ only by its date, such as
  `docs/ia-first.md`: the file and its original date are kept; a new date
  is written only when the rest of the document changes. No more false
  change to undo after each update.
- The release recipe and skill let the human give the publication green
  light at launch, naming the version, so that a queue of workstreams run
  by subagents publishes without stopping; without it, creating the
  release stays a gesture after the human's agreement.

### Added

- Acceptance before publication, with the release module: `node
  .githooks/create-release.mjs --candidate` publishes a candidate
  pre-release (`vX.Y.Z-rc.N`) with its tarball and a generated acceptance
  sheet — on top, what an acceptance team that does not read the
  repository has to validate (human criteria, trials for real, known
  limits, attestations to redo), each point with a stable ID and its
  workstream's PR; below, the non-regression already proven (`drwil
  verify` verdict, contracts proven by a test, OS tested by the CI, tarball
  fingerprint). `release-verdict.mjs` records the verdict — approved, with
  reserves or refused, a human gesture an agent never runs — on the
  pre-release, and opens an issue per reserve or refusal;
  `promote-release.mjs` publishes the final release with the same tarball
  once approved. `--dry-run` shows the sheet and the promotion without
  publishing anything.
- The README install commands point to the latest validated release
  (`releases/latest`, never a pre-release) instead of a version number to
  update at each release.
- Closing a workstream in one gesture: once the journal entry is written,
  `node .githooks/close.mjs` deletes the brief, removes its index item and
  records the consumption, then reports before the commit what would make
  the closing fail — a criterion still « contract to create » with the ID
  to write, places citing the brief that would go dead, file names without
  a path. `--check` gives the report alone, at any time; leaving Build for
  Evidence gives it too. It never stages, commits, pushes nor merges.
- Merged local branches are deleted when the next workstream starts
  (`git branch -d`: never an unmerged branch, the current one nor the main
  branch).
- check-docs refuses a code comment citing a workstream brief in a changed
  file (a warning unless `newRequirements` is `blocking`): code cites the
  contract it serves, since the brief is deleted at closing. Citations in
  unchanged files are summed up in one non-blocking warning.
- A detour for a prior defect met mid-workstream, outside the scope:
  `node .githooks/detour.mjs open <name> --title <defect>` sets the work
  in progress aside (named stash, recorded in the state), starts the
  branch `detour/<name>` from the main branch with a short brief and
  points the state at it; once its PR is merged, `resume` rebases the
  workstream's branch on the fixed main branch, restores the work and
  goes back to Build on the original brief — refused without losing
  anything if a step fails. A detour that changes the rules (contracts
  registry, hooks, thresholds, the scope gate, CI) waits for the human's
  yes (`allow`, interactive terminal). The « fix a defect » recipe
  (`docs/recipes/corriger-un-defaut.md`) is now shipped and describes it.

### Changed

- During a detour, a commit that only adds new contracts to the registry
  no longer waits for the human's yes (`node .githooks/detour.mjs allow`),
  so a queue of workstreams no longer stops for it; modifying or removing
  an existing contract still does, and so does any doubt.

### Fixed

- A rebase no longer rewrites the `Drwil-Brief` trailer of the replayed
  commits with the active brief: each keeps the brief it was made under.

## 0.6.4 (2026-10-18)

### Changed

- A queue of workstreams no longer piles up in one session. With Claude
  Code, the start skill and the governance reminder run each workstream
  in a subagent with a fresh context; the main session keeps only the
  reports, follows each PR with `gh` until it is merged (30 minutes at
  most) and never starts the next one on a merge not done. Most of a
  queue's cost was the context read again, and it grew with each
  workstream. A queue resumed in a new session (after `/clear` or a
  restart) now waits for the human's explicit yes before starting the
  next brief. Outside a queue, the closing reminder suggests `/clear`
  before the next request.
- `node .githooks/consumption.mjs` shows the average cache read per
  request for each workstream (table and `--record`), so the cost of a
  long context shows.

### Changed

- During a detour, a commit that only adds new contracts to the registry
  no longer waits for the human's yes (`node .githooks/detour.mjs allow`),
  so a queue of workstreams no longer stops for it; modifying or removing
  an existing contract still does, and so does any doubt.

### Fixed

- A queue started from a multiple-choice `/drwil-start` poll follows the
  order of the poll's options, whatever the order the boxes were ticked
  in: Claude Code returns the choices in click order, and the queue used
  to follow it. A brief typed under « Other » comes after the ticked
  options, in the order typed.

## 0.6.3 (2026-10-17)

### Changed

- During a detour, a commit that only adds new contracts to the registry
  no longer waits for the human's yes (`node .githooks/detour.mjs allow`),
  so a queue of workstreams no longer stops for it; modifying or removing
  an existing contract still does, and so does any doubt.

### Fixed

- A folder that went through `npm init -y` before installing drwil stays
  a new project. The placeholder `test` script `npm init` writes made it
  look like an existing Node.js project: no git repository nor branch, no
  invitation to scope it, and a map saying "Node.js, detected". That exact
  script no longer counts; any other script, or a real `test`, still
  makes a detected Node.js stack.
- The agent's hooks find the project root from where they are installed,
  never from the current folder. After an agent's `cd` into a subfolder,
  the governance reminder read a missing state (and created a stray
  `.drwil` there), the start poll could not find the state engine, and
  the scope guard refused nothing. The hooks now take the folder holding
  their `.claude/` (the state engine, the parent of its `.githooks/`),
  like the checks engine already did — the same for every agent.
- The agent's hooks run when the project path goes through a symbolic
  link. They compared the path they were called by with their real path
  and, on a mismatch (macOS `/var` → `/private/var`, a symlinked home or
  project folder), did nothing, silently: no reminder, no start poll, no
  scope guard. They now compare real paths.

### Added

- With Claude Code, a hook at the end of each agent reply shows the human,
  under the reply, « ID — label » for each identifier the reply cites bare
  (no parenthesis, dash, colon or table cell right after its first
  mention). The reply is already displayed: the note completes it, never
  rewrites nor blocks it, and nothing is sent to the model. Until now, the
  rule « an ID cited to a human comes with what it designates » held for
  drwil's outputs, not for the agent's replies.
- The glossary of identifiers also knows the value discovery's
  opportunities (`OPT-N`) and the markers an intention or a brief declares
  in a « Markers » section (one `` - `ID` — label `` line each).
- Existing projects get the new hook from `npx drwil init` when their
  `.claude/settings.json` is unmodified, otherwise from
  `npx drwil resolve-drift`.

- The README's installation starts with « Before you start »:
  prerequisites (Node.js 22+, git), recommendations (restart the agent's
  session after `init` — Claude Code loads its hooks at session start — and
  how to check the hooks are active; protect the main branch and require
  the CI checks) and options (automatic merge, which needs « Allow
  auto-merge » in the GitHub repository settings).
- When the repository does not allow auto-merge, the start skill says
  « auto-merge not allowed by the repository » and the way out, stays in
  CLOSING and never reports the merge as scheduled.

### Changed

- The scoping recipes' outputs (`docs/value-discovery.md`,
  `docs/audit-risks.md`, and their French names) can be committed while
  scoping, like briefs and intents. The scope gate refused them outside
  BUILD although they are scoping work. Exact names only: the rest of
  `docs/` stays under the scope.

- The glossary reminder slipped into the agent's context after each tool
  recalls an identifier once per session, not after every tool: repeated
  lists of a dozen contracts had become noise.

- An upgrade (`npx drwil init`) also refreshes the kit's prose and
  settings the project never modified: skills, recipes, `docs/ia-first.md`,
  the agents' instructions, the contract catalog and `.claude/settings.json`
  (a new hook arrives on its own). Only files the kit installed and that
  still match their recorded fingerprint are refreshed; the project's own
  documents (README, map, registry, briefs) never are. A modified one is
  reported as drift, and `npx drwil resolve-drift` now offers its diff, with
  a `.bak` backup. Until 0.6.2, a fixed skill (like the « Not now » option
  of `/drwil-start`) never reached an installed project.
- `doctor` says « origin unknown, before 0.6.0 » for a project installed
  before versions were recorded, instead of a wrong first version.

## 0.6.2 (2026-10-17)

### Changed

- During a detour, a commit that only adds new contracts to the registry
  no longer waits for the human's yes (`node .githooks/detour.mjs allow`),
  so a queue of workstreams no longer stops for it; modifying or removing
  an existing contract still does, and so does any doubt.

### Fixed

- Installing no longer leaves a tarball in the project. The README
  downloaded `drwil-<version>.tgz` and installed it from the file:
  `package.json` then required that file (`npm ci` failed without it) and
  git did not ignore it, so it went into the first commit. Both READMEs now
  install from the GitHub release URL (`npm install -D
  https://github.com/wdubilly/drwil/releases/download/v<version>/drwil-<version>.tgz`):
  nothing is downloaded and `gh` is no longer needed to install. To
  upgrade, run it with the new URL; an old local tarball can be deleted.
- The first `verify` of a project without a CI says how to get out of its
  `VERIFY ERROR`. It is expected (the CI-coverage check did not run, so it
  never counts as passed), but neither the message nor the README said so:
  `verify` and `doctor` now name `npx drwil init --ci github` (or
  `--ci gitlab`), and the README explains it next to the first `verify`.
- `/drwil-start` works with a single scoped brief. A poll question needs
  two options, so the poll could not open on a new project's first brief;
  the skill now adds a « Not now » option, which the hook reads as « start
  nothing » and says so.
- The start poll's hook is never silent. With no answer read, or on an
  error, it used to exit without a word, leaving the agent to guess why
  nothing started; it now tells the agent what happened and the fallback
  (`node .githooks/state.mjs start` in a terminal), without blocking and
  without touching the state. No `[drwil]` message at all means the hooks
  are not active in the session (opened before `init`): restart it.
  Existing projects get the hook from `npx drwil init`; the skill, being
  prose, is not refreshed yet (planned for 0.6.3).

## 0.6.1 (2026-10-17)

### Changed

- During a detour, a commit that only adds new contracts to the registry
  no longer waits for the human's yes (`node .githooks/detour.mjs allow`),
  so a queue of workstreams no longer stops for it; modifying or removing
  an existing contract still does, and so does any doubt.

### Fixed

- A new project installed by following the README is a new project
  again. The `npm install -D ./drwil-*.tgz` step creates a `package.json`
  holding drwil alone, which `init` took for a Node.js stack: the empty
  folder was then handled as existing code (no `git init` nor install
  branch, no « scope it first » hint, a map saying « Node.js, detected »
  instead of « Not decided »). A `package.json` with no other dependency
  and no script is no longer a stack; a real Node project is still
  detected.

## 0.6.0 (2026-10-17)

### Upgrading from 0.5.1

- `drwil init` refreshes the hooks (`.githooks/`, `.claude/hooks/`) and
  never loses a project file, but it does not refresh the prose yet: the
  skills, recipes, `AGENTS.md` and `docs/ia-first.md` installed by 0.5.1
  stay as they were, listed as « derived », even when untouched. A
  project upgraded from 0.5.1 thus has the queue and consumption
  mechanics without the matching `/drwil-start` skill and recipes; a new
  project installed with 0.6.0 is not affected. `doctor` reports 0.6.0 as
  the first installed version (0.5.1 did not record its own).

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
- Token consumption per workstream, read from Claude Code's session logs
  with nothing to type: `node .githooks/consumption.mjs` (tokens in four
  categories, weighted total, active time, models); at closing,
  `--record <brief>` appends the line to `.drwil/usage.jsonl`. Only the
  consumption fields are read, never a message content.
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
