# 7. Governance state

Section 7 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

The current activity (`SCOPING`, `EXPECTATION`, `REQUEST`, `BUILD`,
`EVIDENCE`, `VERIFY`, `CLOSING`) and the active expectation live in
`.drwil/state.json` (if present): a **local** state, ignored by Git, holding references
only (activity, path of the active brief, active request, timestamp). The
allowed scope stays the brief's `scope` block, which is versioned.

- **Deterministic reading** (`.githooks/state.mjs`, the only reader):
  `node .githooks/state.mjs` prints the active context, `--json` the raw
  state. Without a file, the state is neutral `SCOPING`; an invalid state is
  reported and treated as neutral, never guessed.
- **Agent-agnostic**: the source (`state.json`, if present) and the command
  (`node .githooks/state.mjs`) depend on no tool. The universal channel is
  `AGENTS.md`, which asks every agent to run the command at the start of a
  task. A tool offering a session-start hook can wire the same command to
  re-inject the context automatically — Claude Code does (SessionStart hook,
  if present); it is only an accelerator.
- **Short reminder, only when the state changes**: `node .githooks/state.mjs
  reminder` prints two lines (activity, brief, scope size, rule) if they
  differ from the last reminder injected, nothing otherwise; the last
  reminder's fingerprint lives in `.drwil/reminder.json` (if present), local
  and git-ignored like the state. Claude Code calls it on every message
  (`UserPromptSubmit` hook); after an automatic context summary, the
  session-start hook re-injects the full state. A tool without a prompt
  hook follows the `AGENTS.md` instruction: read the state again before
  modifying any file. It is a behavioural barrier: the guarantee stays in
  Git.
- **Hand-off to someone else**: a clone's state does not travel; resume from
  the versioned brief ("Hand-off" section) and re-activate the expectation
  explicitly.
- **Transitions**: one activity at a time, back to `BUILD` after
  `EVIDENCE` or a failed `VERIFY`, abandon to `SCOPING` from any activity.
  Command: `node .githooks/state.mjs move <ACTIVITY> [--brief <brief>]
  [--request <text>]` (or `drwil state move …`, a mere facade); `--brief`
  opens an expectation from `SCOPING`.
- **Who decides** (`transitions` setting in `.drwil/ia-first.json`): `human`
  (default) — opening rights is a human decision: starting a workstream (see
  "Starting and closing" below), or, step by step, opening an expectation
  and moving from `REQUEST` to `BUILD` in an interactive terminal by
  typing the target activity; the other transitions, which narrow rights or
  go back, stay free, closing included. `agent`: any allowed transition is
  free.
- **Closing on `drwil verify` evidence**: `VERIFY → CLOSING` requires,
  whatever the `transitions` setting, the latest evidence written by
  `drwil verify --evidence` (`.drwil/evidence/` (if present), not in git): verdict `PASS`
  or `ATTESTED`, on the `HEAD` commit, clean worktree. `.githooks/state.mjs` reads that
  evidence without running anything: verify stays the only judge, over all
  blocking contracts. `FAIL` or `ERROR`: go back to `BUILD` to fix.
  `MANUAL`: a human attests (`drwil attest <ID>`), then verify runs again. A
  brief's acceptance criteria are not a parallel system: every workstream
  brief has some (starting and closing are refused without any, a warning
  only if the project does not enforce recent requirements:
  `newRequirements`; routine maintenance excepted), and each one is proven
  by a contract, never by a check alone — a checkable criterion becomes a
  contract with a `Check`, a human one a `MANUAL` contract. A contract
  created by the workstream carries the **Origin** field, otherwise it is not
  a durable proof. While a brief is active, an unproven criterion is part of
  the `drwil verify` verdict, not only of the closing: `FAIL`, or `MANUAL`
  when the only gap is a human criterion awaiting its attestation; the
  unproven criteria are listed in every output (`criteria` in the JSON).
  The brief is found without the local state too: it is named by
  `.drwil/state.json` (if present), or by the `Drwil-Brief` trailer of the
  branch's commits — so CI judges the same criteria as the machine that wrote them,
  with the same code and the same exit code. Outside a branch carrying that
  trailer (the main branch, `drwil attest`), no criterion is judged and the
  verdict is unchanged. A criterion judged « not-durable » says what to
  change, naming its contract: add `[human]` when the contract is to be
  attested, remove it when the contract is fully automated.
- **Closing proof**: the closing writes one versioned file per workstream,
  `docs/preuves/<name>.md` (`dirs.proofs` setting), from the evidence it
  required — nothing is judged again at that moment. Its form: a heading
  (workstream, closing date, verified commit and its verdict), then one
  table row per acceptance criterion.

  ```markdown
  # Closing proof — my-workstream

  **Closed on**: 2026-10-21
  **Verified commit**: `3f1c9a2b10` — `drwil verify` verdict: PASS

  criteria of this workstream, and what still proves them today (replayed by `drwil verify` after the closing):

  | Criterion | Contract | Check | Fingerprint of the covered files |
  |---|---|---|---|
  | the docs never cite a path that does not exist | `QUA-011` | `check-docs` | `sha256:1f3ac07b…` (2 file(s)) |
  | the human validated the pricing rule [human] | `APP-001` | — | — |
  ```

  The checks are those the contract ran; the fingerprint covers the files of
  its **Covers** field (`—` without one), as an attestation records them. The
  journal entry cites the file, and **the closing is refused when it cannot
  be written**: no brief is deleted while what it had proven would stay
  unwritten. Unlike the run evidence, this file is documentation, versioned
  with the code: `drwil verify` replays its criteria after the closing and
  fails, naming them, when a proof has disappeared — a contract gone from the
  registry, a contract that lost its check, or one that no longer passes. A
  row is never deleted to make the verdict green: the proof is restored, or
  the criterion retired on purpose by a workstream that says so.
- **Closing from another activity**: `node .githooks/close.mjs` (and
  `--check`) outside CLOSING names the remaining path — the `state.mjs move`
  commands, in order, neighbouring transitions only — and, when the evidence is
  missing or from another commit than `HEAD`, the command that renews it. It
  never advances the state itself.
- **Documentation coherence at closing**: `node .githooks/close.mjs` (and `--check`)
  refuses, in the same single message, what check-docs only warns about at each commit —
  an index box that contradicts the status of the brief it cites, a code
  comment citing a workstream brief, changed or not, a deleted brief whose
  intent the branch never touched — over the whole index, at every closing.
  The rules live once, in `.githooks/doc-coherence.mjs`, read by both. Every correction
  that needs no judgement (box aligned on the status; dead reference redirected to the
  journal when it targets the closing brief, deleted otherwise) is proposed as a diff
  and written only with `--fix`; the rest says the correction to make. A new intent
  citing a path another intent already cites is flagged by a warning (path only).
- **Tool-side blocks** (Claude Code, `deny` rules in
  `.claude/settings.json`, if present): `git … --no-verify`, `git commit -n` and writing `.drwil/state.json`
  (if present) directly are refused by the tool, not by the model.
- **Limits**: an agent with a shell can still cheat locally (rewrite the
  state, fake a terminal, combined short option). The aim is cheating that
  shows in the diff and is refused in CI, not impossible cheating.
