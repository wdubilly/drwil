# 8. Conduct rules, in detail

Section 8 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

`AGENTS.md` keeps one line per rule that no machine checks, because it is
read at every request. The full text of each rule is here, read by section
(never end to end). Each rule below carries the name used in `AGENTS.md`.

- **Scope**: do what is asked, nothing more. No out-of-scope change without
  justification and an explicit request. A documentation, architecture or
  preparatory task changes no functional behavior; no task adds an
  integration or a real network flow it wasn't asked for.
- **Commits**: in the project language; commit or push only when asked. A
  bug found during a refactor = separate commit, reported.
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
  `node .githooks/state.mjs` and follow its activity, expectation and scope;
  run it again when in doubt and before modifying any file if the activity
  may have changed, never infer it from the conversation (a tool that
  allows it injects a short reminder when the state changes). Never
  write `.drwil/state.json` (if present) by hand: change activity with
  `node .githooks/state.mjs move <ACTIVITE>`; starting a workstream
  remains a human decision (`/drwil-start`: a poll whose answer the human
  chooses; or `node .githooks/state.mjs start` in a terminal; `transitions`
  setting in `.drwil/ia-first.json`); closing is free once the `drwil
  verify` evidence is valid. A commit outside the active brief's
  scoping is refused: widen the scoping in a separate commit touching only
  the brief.
- **Intention or request**: in SCOPING, a need the human expresses is
  framed (an intention or a brief), never coded; when it is unclear whether
  a message is an intention or a request to build, ask "intention or
  implementation request?" before acting.
- **Cause before fix**: facing a bug or a red test, reproduce then
  establish the root cause before changing code; no trial fix, no bypassing
  a check (test, hook, CI) to make it pass (QUA-019, no bypassing a check):
  if it seems miscalibrated, say so and fix the check itself, never disable
  it silently.
- **Leave it cleaner in passing**: a doc or brief read during a
  task and found wrong (stale status, "in progress" already done, a path
  that no longer exists) is corrected in a separate commit and reported in
  the summary; a task that advances a project updates its brief's dated
  "Status" line in the same commit. An old dated status is verified before
  being trusted.
- **Review remark**: verify it in the code before applying it; if it's
  wrong or out of scope, say so with the reason rather than applying it to
  please.
- **Closing loops intents**: at the closing of a workstream, each limit
  left untreated becomes an intent brief in `docs/intentions/` — the agent
  may write it alone, never a workstream brief (re-scoping it is the
  requester's decision) — listed in the index as `[decision]` and cited by
  the journal; the original intent (the brief's `**Intent**` field) is
  updated, or summarised in the journal and removed when fully covered.
- **Closing in one gesture**: once the journal entry is written,
  `node .githooks/close.mjs` deletes the brief, removes its index line,
  records the consumption and reports, before the commit, what would make
  the closing fail (`--check`: the report alone, at any time). Code cites
  the contract it serves, never a workstream brief: the brief is deleted at
  closing.
- **Detour for a prior defect**: mid-workstream, a defect outside the
  active brief's scope is fixed by a detour the agent opens alone —
  `node .githooks/detour.mjs open <name> --title <defect>` sets the work
  aside, branches from the main branch and writes a short brief; its PR is
  titled « Detour of <brief> »; once merged, `node .githooks/detour.mjs
  resume` restores the work on the rebased workstream branch. Never widen
  an unrelated scope, never stash by hand. A detour that changes the rules
  (an existing contract modified or removed, hooks, thresholds, the gate)
  waits for the human's yes; adding a new contract does not
  (`docs/recipes/corriger-un-defaut.md`).
- **Defect revealed after the closing**: in CLOSING, when the workstream's
  PR, open and not merged yet, reveals a defect (red CI, forge analysis),
  the agent reopens the workstream alone with `node .githooks/state.mjs
  reopen`: the automatic merge is cancelled first, the brief comes back as
  it was before the closing commit (a commit of its own), BUILD again on the
  same branch — no history rewritten, no force push. The fix follows the
  detour's rule: one that changes the rules waits for the human's yes. The
  new closing updates the workstream's journal entry (never a second one)
  and rewrites the proof; a defect found after the merge is a new
  workstream.
- **Queue of workstreams**: when the human ticked several briefs at start,
  the agent runs them one after the other without a new poll — with Claude
  Code, each one in a subagent (fresh context), the main session keeping
  only the reports; start the next one only after the previous PR is
  merged (followed with `gh`, 30 minutes at most), and stop at the first
  one that needs a human (attestation, unfixed FAIL, red CI, decision). A
  queue resumed in a new session waits for the human's explicit yes.
- **One session per workstream**: once a closing is done and the state is
  back in SCOPING, the next workstream starts in a new session (Claude
  Code: `/clear`; another tool: a new conversation): a fresh context does
  not read the closed workstream again. A queue keeps its subagent per
  workstream.
- **Documentation-only PR**: a PR that touches only documentation
  (Markdown files, `docs/`) is put in automatic merge by the agent
  (`gh pr merge --auto --merge`) without asking the `drwil-merge` question;
  the poll keeps that question for PRs that touch code. The repository must
  allow auto-merge, otherwise say « auto-merge not allowed by the
  repository » and leave the merge to the human.
- **Follow the CI of a PR**: after a push or creating a PR, run
  `node .githooks/pr-watch.mjs [<number>]`: it waits for the end of the CI
  and says « green », « merged » or « red » with the failing check. A red
  CI is fixed at its cause, never bypassed (QUA-019), the contract against
  bypassing a check; without `gh` reachable, the follow-up is « not run », never « green »
  (QUA-013, a check that did not run is not a passed check).
- **Mandatory guarantees**: once the stack is known (`/drwil-adopt`),
  `npx drwil guarantees` wires 100 % test coverage per layer and requires
  an e2e test of the critical paths, a protected forge with a CI and a
  written presentation of the product; each one not held gets a blocking
  `[P0]` brief, offered alone at start, and `drwil verify` stays FAIL until
  it is held. No waiver: only a declared and justified exclusion.
- **Readable references**: an identifier cited to a human — contract ID
  (`QUA-015`), catalog line (`catalog:QUA-004`), lot or point of a brief —
  is always followed by what it designates: « QUA-015 (projects resumable
  cold) ». Its label: `node .githooks/glossary.mjs "<text>"` (read from
  the registry, the catalog and the active brief).
- **End-of-task report**: files created or changed, checks run and their
  exact results, remaining limits and ambiguities. Present as proven only
  what a check actually verifies; the rest is labeled "human" or "not
  verified".
- **Hand-off**: before handing back, update the "Hand-off" section of
  the touched project's brief (dated last state, uncommitted work, next
  step with its marker): that's what another agent, tool or person reads
  to pick it back up cold. Project lifecycle: section 7.
- **Contracts**: `docs/contracts.md` is the single source of invariants:
  never read it whole (a file read stays in the context and is read again
  at every request). With Claude Code, reading the
  registry or the journal whole (without a range) is refused: go through `node
  .githooks/glossary.mjs` (a read by range stays allowed, to edit). A
  failing check flags a contract: read that contract before bypassing
  anything. A past workstream: `node .githooks/glossary.mjs --journal
  <brief>` gives its journal entry, not the whole journal. Always installed
  baseline: QUA-011 (docs), QUA-013 (a check that did not run is not a
  passed check), QUA-015 (cold-readable projects), QUA-016 (scoping
  reminder, configurable severity), QUA-017 (no direct work on the main
  branch), QUA-019 (no bypassing a check); the project completes the list
  of contracts to know regardless of the task.
- Long checks in a subagent, if the tool allows it: with Claude Code, the
  `drwil-checks` subagent (`.claude/agents/drwil-checks.md` (if present))
  runs `run-checks` and `drwil verify --agent` and returns only
  the verdict and the failures, the `GOVERNANCE: …` line and the failing or
  to-attest contracts copied word for word; the main session says
  « verified » only on that copied line. Another tool: the same if it
  allows a subagent without write access, otherwise run them directly.
- **Human gestures**: `drwil attest` is a **human** action: an agent never
  runs it and never writes an attestation. Likewise, the acceptance verdict
  on a candidate release (`.githooks/release-verdict.mjs` (if present),
  release module) is a **human** gesture: an agent never runs it.
- **Project language** (`lang` in `.drwil/ia-first.json`): reply, and write
  briefs, intents, journal entries and commit messages, in that language,
  even though the kit's own files are in English. What a visitor reads
  first — the map `docs/architecture.md`, the `README.md` and the
  changelog — is written in the `docLang` setting's language (absent: the
  project language). Code, comments and UI follow the project's
  conventions.
- **Comments**: only the non-obvious **why** (constraint, domain quirk,
  known pitfall) — not the what, no history, no person's name. The request
  and its date belong in the **commit message** (`git log`/`git blame` find
  them).
- **Tests**: test what the user sees (roles, text, buttons), not
  implementation detail — that's what lets you refactor without breaking.
- **Updating the kit**: `drwil init` on an equipped project refreshes
  `AGENTS.md` only when the kit installed it and the project never changed
  it; a modified one is reported as drift and is only replaced after the
  per-file diff is confirmed, with a `.bak` backup (`drwil resolve-drift`).
  A project whose own `AGENTS.md` is long keeps its rules: the kit writes
  its instructions aside (`.drwil/AGENTS.md` (if present)) and adds one pointer line.
  Moving a long project `AGENTS.md` to the short pointer is done by the
  project, rule by rule, from the diff.
