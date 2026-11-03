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
