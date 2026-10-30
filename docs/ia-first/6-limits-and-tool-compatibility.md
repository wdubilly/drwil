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
