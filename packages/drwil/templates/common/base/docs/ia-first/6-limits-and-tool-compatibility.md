# 6. Assumed limits

Section 6 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

What the architecture does not do, and does not claim to do:

- Human proofs are named in `docs/contracts.md` ("Out of registry" section)
  and in each contract's "Proof" column.
- Nothing automatically assesses the quality of a diff: review stays
  human, or delegated to the assistant, with the report as the only trace.
- Projects not yet done are in the project index (`.drwil/ia-first.json` →
  `dirs.index`): "pending" is not an invariant, and must not be presented
  as checked.

## Tool compatibility matrix

What each assistant really holds, measured by the drwil repository's agent
bench (non-interactive mode, drwil installed in a temporary project in
SCOPING, the agent asked to write a code file). A tool is "held" only when its own hooks
ran, the write was refused **by the write hook** (not by the agent obeying
`AGENTS.md`) and the state reminder arrived. An absent tool is "not tested",
never "held". Whatever the tool, the Git barrier at commit still holds.

| Tool | Hooks run | Code write in SCOPING | State reminder | Trial (version) | Attested by the human |
|---|---|---|---|---|---|
| Claude Code | yes | refused by the hook | received | 2026-10-19 (2.1.303) | pending |
| Copilot CLI | yes | refused by the hook | received | 2026-10-19 (1.0.98) | pending |
| Gemini CLI | yes | refused by the hook | received | 2026-10-19 (0.61.0) | pending |
| Codex | not tested | not tested | not tested | not tested | — |
| Cursor | not tested | not tested | not tested | not tested | — |

Copilot CLI: it reads the .claude folder (settings, hooks, skills) and
its native hooks (in the .github/hooks folder) itself, so `--tools copilot` installs both, and the
`/drwil-*` commands are the same as with Claude Code. It loads a repository's
hooks only in a **trusted folder** (the bench uses a temporary `COPILOT_HOME`
that trusts the trial project, your configuration untouched). In the trial of
2026-10-18 the write hook did not refuse because Copilot sends the file as
`path`, not `file_path`, and the state reminder was not received because
Copilot reads JSON, not raw text; both are fixed. The interactive session
cannot be run by the bench (non-interactive mode only): a hook that exceeded
Copilot's 30-second delay there was not reproduced, and its cause is not
established. A hook that fails never counts as an agreement, but a timeout
lets the call through; the hooks therefore never wait for an input that does
not close.

Gemini CLI: `--tools gemini` installs the settings of the .gemini folder (hooks for the
session start, each message and the `write_file` and `replace` tools) and the
shared scripts of the .claude/hooks folder, the same set as for every other tool
(only the declaration differs). Like Copilot CLI, it loads a repository's hooks
only in a **trusted folder** (trust it once in an interactive session; the bench
sets `GEMINI_CLI_TRUST_WORKSPACE` for its trial project only, `--skip-trust` alone
does not load them). The trial of 2026-10-18 saw no hook because of that trust.
Gemini has no `/drwil-*` commands here: **start a workstream with
`node .githooks/state.mjs start` in an interactive terminal**, then work in
Gemini CLI. The free-tier quota of the model can make a bench run fail (429, 503):
a failed run proves nothing and is run again.

Codex: `--tools codex` installs `AGENTS.md` (read natively) and a hooks.json file in the .codex folder that gives the state at session start (`SessionStart`) and the state
reminder at each message (`UserPromptSubmit`), the plain text output of
`.githooks/state.mjs` being added to the context as Codex's documentation
describes. Codex runs a project's hooks only in a trusted project, and only after
the human has reviewed and approved them with `/hooks`. No write-blocking hook is
delivered: the format of the `apply_patch` input has not been checked against the
shared script. None of this has been tried (no capable model available on
2026-11-02): Codex stays "not tested", whatever its documentation promises.

## Workstream cycle parity

What each tool offers for the launch poll, the queue and one workstream per
fresh context. The agent bench covers only the hooks, the write and the reminder
(table above): every cell below is a delivery or a documented fallback, "not
tested" until a human trial dates it (project "tool parity", batch 1).

| Tool | Launch poll | Queue of several briefs | One workstream per fresh context |
|---|---|---|---|
| Claude Code | `/drwil-start`, read by a hook | one multiple-choice poll | subagent per workstream (instruction delivered), not tested by the bench |
| Copilot CLI | `/drwil-start`, read by a hook | chained single-choice `drwil-file` polls (multiple choice came back empty, 2026-11-02); the chain is not tested for real | subagent (`task` tool) if it works in the repository folder, not tested; otherwise a new conversation |
| Gemini CLI | none: `node .githooks/state.mjs start` in a terminal | not tested | new conversation offered to the human between two workstreams; subagents not tested |
| Codex | none | not tested | new conversation offered to the human between two workstreams; subagents not tested |
| Cursor | none | not tested | new conversation offered to the human between two workstreams; subagents not tested |

The fallback is never the agent's decision: when the tool has no usable
subagent, the state reminder tells the agent to stop after a closing and merge
and to offer the human a new conversation; the next workstream starts there
(`node .githooks/state.mjs next`) only on the human's explicit yes.

## Human attestation parity

The five tools selectable by `init --tools` are all targets for chat
attestation, not just Claude Code. This is **not delivered parity**:
`attest-poll` prepares Claude Code's question by default and each native
`ask_user` with `--tool copilot` or `--tool gemini`. Claude keeps its
session/tool-call check and `tool_response.answers`. The two portable adapters
use a visible random nonce bound to the exact poll and native session instead
of inventing a missing call identifier. A terminal attestation remains
available to the human, but does not fulfil chat parity.

Assessment on 2026-11-03; documentation inspection, **not an interactive
trial**. The earlier hook/write bench above did not test attestation.

| Tool | Delivered attestation adapter | Native human channel investigated | Fictitious attestation events tested | Real chat attestation trial |
|---|---|---|---|---|
| Claude Code | `AskUserQuestion`, `PreToolUse` / `PostToolUse`; session + tool-call correlation, one-use preparation | `tool_response.answers`, never answers in `tool_input` | yes, Claude-shaped fixtures only | not tested |
| Copilot CLI | native `preToolUse` / `postToolUse`; one-use nonce, exact poll, native session and subagent context | `ask_user` arguments `question` / `choices`; `sessionId`, `toolArgs`, success `toolResult.textResultForLlm`; only the exact `User responded: <positive choice>` result is accepted | yes, documented-shape fictitious events and installed hook commands only | not tested |
| Gemini CLI | native `BeforeTool` / `AfterTool` declarations for `ask_user`; same portable protocol | `session_id`, `tool_input.questions`; JSON string in `tool_response.llmContent`, only `answers["0"]` with the exact positive choice, no error | yes, documented-shape fictitious events and installed hook commands only | not tested |
| Codex | none; delivered hooks only remind the state | `request_user_input` is a candidate; `PreToolUse` / `PostToolUse` document session + tool-call identifiers and tool-specific output, but coverage of this question and its exact returned payload have not been tried | not tested | not tested |
| Cursor | none; only an always-applied instruction rule is installed | native `preToolUse` / `postToolUse` document `tool_use_id` and `tool_output`; the human question's name, arguments, result and session correlation have not been established | not tested | not tested |

### Portable protocol and remaining prerequisites

- The human explicitly authorised the alternative correlation on 2026-11-03.
  Preparation generates a random UUID nonce in the visible question. The
  pre-hook recomputes the exact native arguments from the engine's summary
  and atomically reserves one poll per native session, recording tool,
  session, subagent context if provided, poll, exact proof snapshot and time.
  A permanent local nonce tombstone prevents rearming it across tools or
  sessions. The post-hook claims the reservation atomically before rerunning
  checks, verifies its commitment, expiry (one hour), native context and exact
  arguments, and accepts only the native human result. It compares the
  snapshot before writing. Decline/absence/invalid result consumes the poll.
  Concurrent calls or returns cannot overwrite a reservation or attest twice.
  New polls require fresh JSON; no agent-interpreted chat phrase is evidence.
- This is local correlation, **not strong identity**. It trusts the runtime,
  hook code and local evidence files, just like the Claude adapter. A crash
  can leave a session occupied: inspect it and open a fresh native session,
  never manufacture an answer or delete nonce tombstones to reuse a poll.
- Copilot CLI and Gemini CLI: perform the real interactive trial below.
  A version exposing neither documented native session field is refused;
  no fabricated session, environment-derived guess or call identifier is used.
  Copilot denials use native `permissionDecision: "deny"` with exit 0.
  No attestation is written without a valid reservation and native positive
  result. Missing Node or disabled hooks cannot prepare or attest; a hook
  timeout is not a successful validation or human trial.
- Codex and Cursor: obtain a native before/after pair for a **fictitious**
  human question in a trusted interactive session, including its exact
  question and response schema. Generic tool-hook documentation and
  third-party hook imports do not prove that the human question traverses
  those hooks.
- On the inspected workstation, Claude Code 2.1.317 and Copilot CLI
  1.0.105 are installed; Gemini CLI, Codex and Cursor are not available
  through their CLI names. Reading a version proves no question or hook.
  Their absence here is not a claim that the tools cannot support this.

For each tool, a human trial must record the tool version, date, trusted
workspace setup, hook names actually fired, session/call correlation and
the field carrying only the human response, using no production or
personal data. First use a fictitious contract and explicitly choose to
attest or decline. Before any claim of support, fixture tests must cover
both outcomes, no answer, prefilled answers/defaults/recommendations,
wrong session/call, replay, expiry and changed proof or covered files;
then the real interactive trial must confirm the same boundary. An agent
never records the human's readability judgment or replies to that poll.
No live attestation was made during this assessment.

Documentation consulted (2026-11-03), not compatibility evidence:
[Copilot hook payloads](https://docs.github.com/en/copilot/reference/hooks-reference),
[Copilot SDK user-input contract](https://github.com/github/copilot-sdk/blob/main/nodejs/src/types.ts)
and [official ask_user example](https://github.com/github/copilot-sdk/blob/main/go/internal/e2e/ask_user_e2e_test.go)
(`question`, `choices`; the installed CLI 1.0.105 renderer explicitly handles
the `User responded:` prefix; no real response captured),
[Gemini hooks](https://geminicli.com/docs/hooks/reference/) and
[ask_user](https://geminicli.com/docs/tools/ask-user/),
[Codex hooks and tool coverage](https://developers.openai.com/codex/hooks),
[Cursor hooks](https://cursor.com/docs/hooks) and
[third-party imports](https://cursor.com/docs/reference/third-party-hooks).

## Instructions reach every tool

An instruction or mechanism the kit delivers reaches each chosen tool by the
file every tool reads (`AGENTS.md`) or by its native file; otherwise its gap is
declared here. The entry files that only point to `AGENTS.md` (Copilot CLI's
instructions file and Cursor's always-applied rule) also
repeat the bounded wait of long commands (`.githooks/wait-command.mjs`, never a
`while pgrep` loop), so that a tool that does not follow the pointer still reads
it. Claude Code and Gemini CLI import `AGENTS.md`; Codex reads it natively.
Declared gap: no subagent file of the kit exists for Copilot CLI, Gemini CLI,
Codex or Cursor, the `AGENTS.md` line is their only instruction. That a tool
obeys the instruction is "not tested": no trial has measured it. A new
mechanism is added to the parity test's list of mechanisms in the
workstream that creates it.

Declared gap: chat attestation has Claude Code, Copilot CLI and Gemini CLI adapters,
with fictitious-event tests and no real interactive trial. Codex and Cursor
have no delivered attestation adapter. The
"Human attestation parity" table records each missing native-event
prerequisite; shared instructions or shared hook scripts do not fill it.
