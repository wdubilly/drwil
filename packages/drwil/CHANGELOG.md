# Changelog

## Unreleased

Each workstream that changes what a user sees adds its line here, in its
closing commit; the release renames this section to its version.

### Added

- Release module: new setting `release.mode` in `.drwil/ia-first.json`, `solo` (the
  default) or `team`. Behaviour change for projects that have the module: without
  the key, `solo` applies, and `team` is the way to keep the candidate, verdict and
  promotion path. In `team`, `create-release.mjs` without `--candidate` is refused
  and points to `--candidate`; in `solo` it publishes the version directly. An
  existing value is kept by an update, and any other value is refused
  (QUA-199 to QUA-201).
- `/drwil-scope` (skill `scope-a-workstream`, listed in the `/drwil` menu): at the
  end of a pushed scoping, a poll asks what to do with its PR — « Automatic merge »,
  « Manual merge » or « Continue scoping » (PR left open, next scopings on the same
  branch) — with no default or recommended answer. The human's answer, read by the
  poll hook, is the only way to authorise `.githooks/merge-auto.mjs` in SCOPING,
  and only for the PR of that branch (QUA-187 to QUA-189).
- `**Covers**` (`**Couvre**`) accepts `` `aucun` `` (or `` `none` ``) with its reason for a
  contract that judges a conduct: it counts as declared for `verify` and
  `doctor`, and covers no file. The attested contracts of this repository now
  all declare what they cover (QUA-185).
- An attestation (version 4) is bound to the effect of the checks its contract
  cites (command, targeted tests, `paths`), no longer to their execution fields:
  adding `build`, `needsBuild`, `parallel` or `reuse` to checks no longer makes
  attestations stale, while a changed command, test or path still does and
  `verify` names the check. Attestations of version 1, 2 and 3 stay readable;
  the next `drwil attest` writes version 4 (QUA-183, QUA-184).
- A reopening (`state.mjs reopen`) that fails after cancelling the automatic
  merge now says the merge is cancelled and not scheduled again, that the tool
  never reschedules it by itself and that the human does; the state context and
  reminder say it again in CLOSING until a reopening succeeds or the state goes
  back to SCOPING (QUA-181). The full cycle of a reopened workstream is also
  played on Windows, with a launchable simulated `gh` (QUA-182).
- The brief life cycle no longer needs workarounds: the contracts registry is
  written in SCOPING like a brief, in the same commit as the brief that cites
  a new contract; a code file already delivered on the main branch stays
  covered after its brief is closed (a new or modified file still needs a
  brief); the criteria the human accepts at start are fingerprinted, said in
  the closing proof, and a criterion modified afterwards refuses the closing
  until the human accepts again with `node .githooks/state.mjs accept`
  (interactive terminal only); the start names every `.githooks/` file the
  scope cites without a « Modified contracts » bullet; the closing removes the
  index line of a brief even when it also cites another document of `docs/`.
- The queue now waits for the merge: reading the state in CLOSING whose pull
  request is merged brings it back to SCOPING and says so (open or unknown
  pull request, `gh` absent: it stays CLOSING and says so); `node
  .githooks/state.mjs next` refuses to start the head of the queue until the
  previous workstream's pull request is merged; a queue decided at start goes
  on by itself when the merge is seen at a prompt of the running session,
  while a queue resumed in a new session still waits for the human's yes.
- Starting a workstream in « This folder » now creates and switches to
  `workstream/<brief>`, cut from the up-to-date main branch (kept if you are
  already on it); it is refused, with what to do, when the current branch is not
  merged, the working tree is dirty or the branch already exists.
- The `/drwil-start` poll under Copilot CLI now asks for the brief as a single
  choice (one brief per poll), the only form read reliably (the multiple choice
  field came back empty); the hook still reads a multiple choice field if
  another tool sends one.
- A brief with several lots (bullets « **Lot N — title** [IA|human] » of its
  « Increments » section) is now carried lot by lot: `node .githooks/state.mjs
  lot` names the current lot, the lots done and those left, and `lot next`
  moves on once the lot is committed (never past the last one). The state's
  reminder names the current lot and says to work on it only; a [human] lot is
  skipped and recalled at the closing; the closing stays single and is refused
  while an [IA] lot is not done. The launch skill tells the agent to give each
  lot a fresh subagent (Claude Code, Copilot CLI), the hand-over going through
  the commits and the brief's hand-off section. A brief with one lot, or none,
  runs as before.
- With Copilot CLI, the `/drwil-start` poll now offers a multiple-choice
  field of briefs (a queue, optionally in parallel): the start hook reads a
  field of type `array` (values in `items.enum`) like the single-choice one,
  in the poll's order of options, and the launch skill tells the agent to ask
  it. The exact shape of Copilot's answer is still to be confirmed by a real
  run.
- `node .githooks/merge-auto.mjs <pr>` schedules the automatic merge of a pull
  request in the safe order, instead of a list of `gh` commands left to the
  agent: it waits until GitHub has computed the PR, updates it if it is
  behind the main branch, runs `gh pr merge --auto --merge`, then checks that
  the merge is really scheduled. It runs only with the "Automatic merge"
  authorisation given at start, and says "not scheduled" on a state not
  computed in time, a conflict, `gh` missing or a repository that does not
  allow auto-merge. The state's procedure and the launch skill now call it;
  following the PR (`pr-watch`) is unchanged.
- The scoping reminder now warns, never blocking, when a code file listed in
  a brief's scope is 180 lines or more (90 % of the 200-line ceiling, read
  from the same source): the brief should list upfront the files its split
  will create. The brief model also reminds to list the architecture map and
  `docs/projects/kit-mechanics.md` when a code file or a hook is added.
- A size check for the files the kit installs (`.githooks/check-kit-size.mjs`,
  declared as `taille-kit` in `.drwil/ia-first.json` by `drwil init`, without
  touching the project's own checks): ceilings in lines of 200 for code, hooks
  and settings, 100 for `AGENTS.md`, 400 for on-demand documents, 250 for
  recipes. In an installed project an overrun is a warning naming the file and
  its ceiling, never a blocker; the project's own code is never measured.
  `kitSizeLegacy` in `.drwil/ia-first.json` tolerates a file already above its
  ceiling, which can only shrink.
- `drwil verify --failed` replays only the contracts that were not `PASS` or
  `ATTESTED` at the last evidence, to check a fix without a full pass. The
  verdict is partial (`GOVERNANCE: PARTIAL (--failed) — NOT A VERDICT`, never
  exit 0, no evidence written, never a closing proof); a contract awaiting an
  attestation is named, not replayed; the VERIFY reminder suggests it after a
  `FAIL`, then the full `verify --evidence`.

### Changed

- `docs/ia-first.md` is now a short summary (under 100 lines) that keeps the
  section numbering and gives the file of each section in `docs/ia-first/`
  (one per section, and one per subsection of section 7), each under the
  400-line ceiling and readable on its own: an agent loads only the section it
  needs. The most-read pointers (`AGENTS.md`, the `drwil` skill, the brief
  model, the project index, routine maintenance) name the exact section file;
  the others go through the summary. `drwil init` installs the folder and an
  update refreshes its files like the rest of the kit's prose, keeping a
  section the project adapted (QUA-190).
- Pointers left behind by that split now lead to their target: the scope gate
  hook's header cites the "Scope barrier" section, and no section file sends
  the reader to "this document" or to a title "below" that lives in another
  file; a package test proves both, hook comments included (QUA-190).
- The shipped recipe `docs/recipes/working-with-branches.md` now says that a
  start in "This folder" creates `workstream/<brief>` from the up-to-date main
  branch, and when the start is refused (QUA-179).
- The `/drwil-start` poll (`state.mjs briefs`) now lists the briefs in the
  realisation order of the index's "Fiches cadrées" section, not by priority:
  a brief that is not ready keeps its place, and the briefs the index does not
  cite come after, in the previous order.

- A new install writes the scope gate (`scopeGate`) as `blocking` instead of
  `warning`. A project already installed keeps its setting, and `warning`
  when it had none: an update never blocks a commit that used to pass.
- `drwil doctor` prints the protection level the project really holds
  (1 diagnosis only, 2 local governance active, 3 CI checks active, 4 forge
  protection verified), each proved by a check; a level it cannot verify is
  "not verified", never reached. It gives the command to the next level
  (`protection` in `--json`).
- Under the mandatory guarantees, `drwil verify` is FAIL while `scopeGate`
  is not `blocking`, and names the command that hardens it.

## 0.10.0 (2026-10-27)

### Changed

- The agent hooks installed in `.claude/hooks/` that exceeded 200 lines are
  split, none above 200 lines, with no change of behavior: `bash-guard.mjs`
  now imports `shell-split.mjs`, and `prompt-hook.mjs` imports `start-poll.mjs`.
  A project already equipped gets both new files on update; the hooks stay
  scripts run by Claude Code, Gemini CLI and Copilot CLI alike.
- The `AGENTS.md` installed by the kit is now a short switchboard (93 lines
  instead of 247, about half the context read at every request): one line per
  conduct rule that no machine checks, the contracts to know and the "if you
  touch… read first" table. The full text of each rule moved to section 8 of
  `docs/ia-first.md`, read by section. A project's `AGENTS.md` is never lost on
  update: a file the project modified is reported as drift and replaced only
  after the per-file diff is confirmed (`.bak` backup), and a project with its
  own `AGENTS.md` keeps it. A project that kept the former long `AGENTS.md` moves
  to the short one with `npx drwil resolve-drift`, rule by rule from the diff.
- Code files are capped at 200 lines in the drwil repository (QUA-001), files
  above it being capped at their measured size; the kit now proposes 200 lines
  when a project adopts the file-size check (adoption recipe, catalog, script
  example). The script's default without a ceiling stays 400, so no adopted
  project breaks on update.
- The 17 base hooks installed in `.githooks/` that exceeded 200 lines are split
  into smaller modules (`state-*`, `engine-*`, `run-checks-*`, `detour-*`,
  `briefs-*`, `check-docs-*`, `close-*`, `consumption-*`, `worktree-texts`,
  `doc-coherence-*`, `scope-gate-*`, `contracts-validate`,
  `check-control-coverage-jobs`, `glossary-labels`), none above 200 lines, with no
  change of behavior. No compatibility with an earlier installation is kept: a
  project already equipped runs `npx drwil uninstall --yes`, then installs the kit
  again.
- The optional modules are split the same way, none above 200 lines, with no
  change of behavior: release (`create-release-texts`, `create-release-version`,
  `acceptance-sheet-texts`, `acceptance-sheet-works`, `recette-note-texts`) and
  dashboard (`dashboard-texts`, `dashboard-read`). A project that already enabled
  one of them copies every `.mjs` file of the module into `.githooks/` again (each
  module's README lists them), and may list the new files in its
  `docs/projects/kit-mechanics.md`.

## 0.9.0 (2026-10-26)

### Added

- A queue of workstreams can run in parallel (QUA-147 to QUA-149): a
  `drwil-parallel` question of the `/drwil-start` poll ("Parallel queue" /
  "Sequential queue", sequential staying the default) makes the hook launch
  each ticked brief in its own worktree, at most `maxParallel` active at once
  (`.drwil/ia-first.json`, 3 by default); briefs whose `scope` blocks overlap
  are refused, nothing being created. The main session runs one subagent per
  worktree and keeps only the reports; a workstream that needs a human stops
  its own subagent without interrupting the others, and the queue summary
  gives the state of each. `QUA-037` (a queue decided in one gesture) now
  distinguishes the two modes.

- One workstream per worktree (QUA-142 to QUA-146): the `/drwil-start` poll
  can carry a `drwil-worktree` question ("New worktree" / "This folder"); the
  human's answer, read by the hook, creates the sibling folder
  `../<repository>-<brief>` and its branch from the up-to-date main branch,
  runs the optional `worktreeInstall` command of `.drwil/ia-first.json` there
  and starts the workstream in it, the origin folder's state unchanged.
  Starting a brief already active in another worktree is refused with that
  worktree's path; the state reminder names the main repository and lists the
  open worktrees, so an agent never takes one for a separate repository;
  `close.mjs --check` reports a branch behind the main branch and the command
  to update it, without refusing the closing. New hook `.githooks/worktree.mjs`.

- `drwil verify` no longer replays what `run-checks` has just played (QUA-140):
  a `run-checks` pass outside any hook records each check's verdict with a
  fingerprint of the tree (commit, branch, uncommitted and untracked changes)
  and of `.drwil/ia-first.json`; `verify` takes the verdict of a check whose
  fingerprint is identical, says so contract by contract (« reused from
  run-checks of … » or « replayed », in the reasons, in `verify --evidence` and
  as a count in `--agent`), and replays any other check — different
  fingerprint, missing verdict, a check that did not run, or one declared
  `"reuse": false` because it reads the network, the forge or the clock. CI
  always replays everything, and `drwil verify --no-reuse` replays
  everything on demand. QUA-013 now says why a reused verdict is a check that
  ran, not a stale proof.

- `run-checks` and `drwil verify` reuse a verdict check by check while you
  iterate (QUA-141): a check that declares `paths` has its own fingerprint
  (its declaration and the files its `paths` match); outside a hook and CI, a
  check whose last verdict is `ok` on the same fingerprint is not replayed, and
  the output says so (« reused (check files unchanged) »). Checks without
  `paths`, declared `"reuse": false` or `"reuse": "tree"`, or failed, are
  replayed; `run-checks --replay-all` replays everything. The closing proof
  (`verify --evidence`) and `--no-reuse` keep the fingerprint of the whole tree.

- The pre-push reuses a verdict check by check (QUA-152): a check that declares
  `paths` whose own fingerprint is that of an `ok` verdict (of `run-checks` or of
  a previous pre-push, in `.drwil/evidence/pre-push-verdicts.json`, ignored by
  `verify`) is not replayed, and the output says « reused » or « replayed ». A
  working tree that is not the pushed commit, a check without `paths`, failed,
  or declared `"reuse": false` / `"reuse": "tree"`, is replayed in full; CI
  always replays everything.

- `drwil verify` plays its checks in parallel (QUA-139): with the `parallel`
  setting, the command checks the contracts cite start together (same limit as
  `run-checks`) and are read in registry order, so each contract gets the same
  verdict and reasons as a serial pass. Without the setting, nothing changes.

- A hook modified by the branch without being declared is reported before the
  closing (QUA-137): `node .githooks/close.mjs --check`, the move from BUILD to
  EVIDENCE and the closing name each `.githooks/` file the branch modifies or
  deletes that no brief lists under « Modified contracts », with the bullet to
  write (on the requester's yes); the closing is refused, before writing
  anything, while one is left — instead of the CI's replay failing later.

- Each check says how long it took (QUA-136): the engine measures every check
  it runs, in whole milliseconds; `run-checks` writes each duration to
  `.drwil/evidence/run-checks.log`, lists the checks from slowest to fastest at
  the end of the file, and names the three slowest in its summary line;
  `drwil verify --evidence` records each check's duration in `verify-*.json`. A
  check that did not run has no duration. On a parallel pass the duration is the
  check's own, not its share of the pass.

### Changed

- With the automatic merge, the return to SCOPING waits for the merge
  (QUA-138): after scheduling it, the agent follows the PR with
  `node .githooks/pr-watch.mjs` until it is merged (30 minutes at most); a red
  CI keeps the workstream in CLOSING, where `node .githooks/state.mjs reopen`
  applies.

- The merged local branches' recognition and deletion move from
  `.githooks/close.mjs` to the new `.githooks/close-branches.mjs` (QUA-048,
  QUA-058, QUA-059), so that the closing command stays under the 400-line cap
  (QUA-001); `close.mjs` re-exports the same functions and nothing else changes.

### Fixed

- `docs/ia-first.md` no longer says that a queue always stays in the
  repository folder: it describes the parallel queue (QUA-147), its
  `drwil-parallel` question, the `maxParallel` limit (3 by default) and the
  refusal of briefs whose `scope` blocks overlap.

- A parallel queue no longer refuses two briefs that only share the
  workstreams' index and journal (QUA-147): every closing modifies them, and
  their conflict is resolved when rebasing.

- The checks no longer leave temporary folders behind (QUA-133, QUA-134): each
  pass of the check engine (hooks, `run-checks`, `drwil verify`, CI) gives
  every check its own `TMPDIR`/`TMP`/`TEMP` under a `drwil-checks-*` root,
  removed at the end of the pass; the folders of failed checks are kept at a
  fixed path (replaced each time, named in the `run-checks` summary), and a
  check that leaves files in its folder is named in the report and counted as
  a warning.
- At push time, the main-branch check (QUA-017) judges the pushed remote
  branches (the `pre-push` hook's standard input), not the current branch:
  pushing `recette/vX.Y.Z` from `master` now passes, and pushing to
  `refs/heads/master` (or `main`) from any other branch is refused. The
  acceptance note of a release can reach the repository again.
- When the acceptance note's branch cannot be pushed,
  `.githooks/recette-note.mjs` shows git's output (the reason of the refusal)
  along with the catch-up command.

## 0.8.0 (2026-10-25)

### Added

- Targeted reading, so an agent does not read whole files into its context:
  `node .githooks/glossary.mjs --contract <ID>` gives a contract's full
  text, `--contracts` lists every contract (ID and title, none left out),
  `--journal <brief>` gives a workstream's journal entry; `AGENTS.md` and the
  recipes point to them instead of reading `docs/contracts.md` or the
  journal end to end.
- `.githooks/run-checks.mjs` shows only the failed checks (each with its
  contract and the last 40 lines of its output; all of it in CI) and one
  summary line counting the non-blocking warnings; the full report goes to
  `.drwil/evidence/run-checks.log`. A check that did not run still fails
  visibly outside a commit; the exit code is unchanged.
- `node .githooks/close.mjs --check` groups its possible-duplicate warnings:
  one line per cited path, naming every new intent citing it; blocking
  errors are all still shown.
- With Claude Code, a `drwil-checks` subagent (`.claude/agents/drwil-checks.md`)
  runs `run-checks` and `drwil verify --agent` and returns only the verdict and
  the failures, copied word for word; it has no write tool and never attests.
  `AGENTS.md` tells any tool to do the same if it allows it.
- With Claude Code, reading `docs/contracts.md` or the journal whole is
  refused before it happens: a new `PreToolUse` hook on Read
  (`.claude/hooks/read-guard.mjs`) blocks a read without a range, and
  `.claude/hooks/bash-guard.mjs` blocks their `cat`, `less` or `more`; the
  message points to `node .githooks/glossary.mjs --contract <ID>`,
  `--contracts` and `--journal <brief>`. A read by range and a search stay
  allowed.
- Back in SCOPING after a closing, the state reminder invites starting the
  next workstream in a new session (Claude Code: `/clear`; another tool: a new
  conversation); a queue keeps its subagent per workstream.
- `node .githooks/consumption.mjs --recorded` compares the recorded
  workstreams by their average cache read per request (read from
  `.drwil/usage.jsonl` only, no session log needed).
- `.drwil/ia-first.json` accepts `build` (the compile command, run once per
  pass by the first check that needs it, `needsBuild: true`; a failed build
  fails every dependent check) and `parallel: true` (command checks run
  together, at most half the cores; the report and the verdict stay those of a
  serial run, a check opts out with `parallel: false`).
- On a pull request, `.githooks/base-checks.mjs` skips the replay with the main
  branch's hooks (QUA-113) when `.githooks/` and `.drwil/ia-first.json` are
  byte for byte the main branch's, saying so in its output; any difference,
  doubt or failing Git read still replays in full.
- A workstream whose pull request reveals a defect after the closing
  commit (red CI, forge analysis) is reopened by the agent with one
  command, `node .githooks/state.mjs reopen`: in CLOSING, PR open and not
  merged, the scheduled automatic merge is cancelled first, the brief is
  restored as it was before the closing (a commit of its own) and the
  state goes back to BUILD on the same branch, keeping the merge
  authorisation and the queue; refused without changing anything on a
  merged, closed or unknown PR (QUA-116). A reopening fix that changes the
  rules waits for the human's yes, like a detour (QUA-117). The new closing
  replaces the consumption line instead of keeping the old one, rewrites
  the proof, and refuses a second journal entry for the same workstream
  (QUA-118).
- `init` attaches the existing code: on a first install of a project that
  already has code files indexed by git, it writes a reference brief
  « existing code » (file existing-code.md of `docs/projects/`) whose `scope` block lists each of them
  (the kit's files excluded) and cites their folders in the map
  `docs/architecture.md` (role « to describe at adoption »). The first
  commit, even of a brief alone, now passes with the blocking defaults; a
  new project and an update are unchanged, an existing brief or map is
  never rewritten and `uninstall` leaves the brief in place (QUA-110).
- The CI replays the checks with the main branch's hooks: off the main
  branch, the `checks` job (GitHub and GitLab) runs the main branch's copy
  of the new `.githooks/base-checks.mjs`, which lays the main branch's
  `.githooks/` over the working tree for one run of `run-checks.mjs`, with
  the branch's list of checks. A pull request that weakens or deletes a
  hook, or removes a check from `.drwil/ia-first.json`, fails, unless the
  brief declares it in « Modified contracts »; a main branch that cannot be
  found is « not run », never a success (QUA-113). The GitLab `checks` job
  now clones the full history (`GIT_DEPTH: "0"`).
- The Claude Code shell guard refuses, without asking, any command that
  skips the git hooks or writes, removes or overrides `core.hooksPath`
  (`--no-verify`, `commit -n`, `-c core.hooksPath=`, `git config
  core.hooksPath …`, `--unset`, `GIT_CONFIG_*`), also in a compound
  command or a `sh -c "…"`; reading the setting still passes, the other
  risks still ask (QUA-114).
- `drwil guarantees` and `drwil doctor` read the bypass list
  (`bypass_actors`) of the rulesets protecting the main branch with the
  human's token: a non-empty list is a gap of the protection; without an
  administrator token it is said « not verified », never counted as held
  (QUA-115).

### Fixed

- The scope gate judges a merge commit on its resolution only: while a
  merge is in progress, a staged file identical to its version in one of
  the two parents is brought as it is and passes, whatever the activity and
  the scope; a file that differs from both (a resolved conflict) is still
  judged. Committing the merge of the main branch into a workstream branch
  after a conflict was refused for the files the main branch brought
  (QUA-111).
- Every shipped script of `.githooks/` and `.claude/hooks/` now runs when
  called through a symbolic link (`/var` → `/private/var` on macOS): the
  shell guard, the scope gate's commit trailer, the main-branch hook replay,
  the PR watch and the release script compared URLs and silently did
  nothing (QUA-044). The shell guard also reads an unquoted Windows path
  (`C:\Users\…`) instead of losing its separators.

## 0.7.0 (2026-10-22)

### Added

- `drwil guarantees`: the mandatory guarantees of a governed project, run by
  `/drwil-adopt` once the stack is known. Every layer whose stack is in the
  table (Node/TypeScript, Python, Go, JVM) gets its coverage check at 100 %
  (lines, branches, functions, statements, as far as the tool measures
  them); an existing project in test debt gets a ratchet at its measured
  level, 100 % on new or modified code and a non-blocking climb brief. A
  stack outside the table, a tool that cannot run, no `e2e` check of the
  critical paths, an incomplete forge (Git, GitHub or GitLab remote, CI
  replaying the hook, protected main branch with no administrator bypass)
  or a README still in skeleton: each gets a blocking `[P0]` brief, the
  only one offered at start, and `drwil verify` is FAIL until it is held.
  `--protect` sets the branch protection, with the human's agreement only.
- `.githooks/pr-watch.mjs` follows the CI of a pull request: green, merged
  or red with the failing check; « not run » without `gh`.
- Release module: no tag, preview included, before the README, features and
  map are reviewed — updated, or recorded « unchanged » with a reason.

### Changed

- The shipped README presents the user's product first; drwil keeps a few
  lines pointing to `AGENTS.md` and `docs/`.
- A documentation-only pull request is put in automatic merge without the
  `drwil-merge` question.
- The adoption recipe and the catalog: a new project starts at 100 %
  coverage with its e2e test; no longer « a low threshold first ».

### Fixed

- The release note of a version (`docs/recettes/`) passes the scope
  barrier: committed by the release module with no trailer, it was refused
  by the CI.

## 0.6.10 (2026-10-22)

### Added

- An attestation falls when what it covers changes: a contract can declare
  the files it judges (`**Covers**` field, path patterns), the attestation
  (version 3) records a fingerprint of their content, and a covered file
  modified, added, removed or renamed makes it stale — `verify` names the
  file. A file outside the patterns changes nothing; version 1 and 2
  attestations stay valid as they are.
- `verify` and `doctor` flag a contract with a human part and no `**Covers**`,
  without dropping its attestation.
- `drwil attest <ID> --renew` renews on purpose an attestation that is still
  valid, from an interactive terminal, retyping the identifier.
- Criteria that survive the closing: the closing writes a versioned proof
  file per work item (`docs/preuves/<work item>.md`) — every acceptance
  criterion with its contract, that contract's checks, the verified commit
  and the fingerprint of the covered files, copied from the latest
  `verify --evidence` evidence. Without that evidence, or if the file
  cannot be written, the closing is refused and nothing is deleted; the
  journal entry cites the proof.
- `verify` replays the criteria of those proofs: one whose proof has
  disappeared (check removed, contract abandoned or failing) makes the
  verdict `FAIL` and is named, with the same exit code locally and in CI.
- The work item whose criteria are judged is found without the local state
  too, from the `Drwil-Brief` trailer of the branch's commits: CI judges
  the same criteria as the machine that wrote them.

## 0.6.9 (2026-10-21)

### Added

- Guided closing: closing from an activity other than CLOSING now names the
  remaining path and the command that renews stale evidence, without moving
  the state. The intention warning compares the whole branch.
- `verify` tells the human whether to add or remove the `[humain]` marker on
  a criterion, and names the contract concerned.
- A terminal note command (`node .githooks/note.mjs '<text>'`) records an
  idea as one dated line, without changing the activity, from any tool.
- Claude Code hooks and skills are unchanged, proven by simulated inputs.

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
