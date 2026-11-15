# Recipe: track consumption per increment/project

Goal: know, increment by increment, how many tokens were used, which model was
employed, and how long the setup took — never for billing or blocking a
commit, just to inform project tracking.

## Measure: `node .githooks/consumption.mjs`

With Claude Code or Copilot CLI, nothing to type: the script reads the
session logs of both tools, where each model call carries its tokens, model,
timestamp and git branch. One branch per brief (`workstream/<brief>`, and its
scoping branch) attributes it:

```bash
node .githooks/consumption.mjs                    # per workstream: tokens, weighted, active time, models
node .githooks/consumption.mjs --since 2026-10-01 --json
node .githooks/consumption.mjs --record <brief>   # at closing: one line in .drwil/usage.jsonl
node .githooks/consumption.mjs --recorded         # the recorded workstreams compared: cache read per request
```

- Claude Code: the project's logs, `~/.claude/projects/<project path>/`
  (`$CLAUDE_CONFIG_DIR/projects/…`; `--logs <folder>` to read another one);
  each agent answer carries its usage and `gitBranch`.
- Copilot CLI: `~/.copilot/session-state/<session>/events.jsonl`
  (`$COPILOT_HOME/session-state`; `--copilot-logs <folder>` to read another
  one), every project in one folder. One `session.usage_record` event per
  model call (`data.usage`: `model`, `inputTokens`, `outputTokens`,
  `cacheReadTokens`, `cacheWriteTokens`, a unique `accounting.usageId`; a
  sub-agent's calls are in its parent's log); the branch and the folder come
  from the last `session.start` (`data.context`) or
  `session.context_changed` (`cwd`, `gitRoot`, `branch`). Only the calls
  made in the project (or below it) count. `inputTokens` includes the cache
  read and written: the uncached input is the difference. No field is
  missing (cache tokens and branch are there); a call without a
  `timestamp` would still be counted, in the « unattributed » part below,
  and a call without any key (`usageId`, `apiCallId`, `id`) never.
- A workstream led with both tools (started under one, resumed under the
  other): one line, the two consumptions summed, each tool named with its
  part; a call is never counted twice (each tool has its own keys).

## Split by activity: production, verification, governance

Each workstream's requests (both tools) are split by the governance
activity at their instant, read in the state's `history` (the transitions of
the active workstream, from its start):

- production: `BUILD`;
- verification: `EVIDENCE` and `VERIFY`;
- governance: the scoping branch (`scoping/<brief>`), `SCOPING`,
  `CLOSING`, and every `BUILD` after a reopening;
- unattributed: a request whose activity is unknown — before the start,
  without a history (a state written before it, a fresh clone, another
  workstream's state), or without an instant. Said, never guessed.

The report gives one split line per workstream (`activities` with
`--json`), then how many workstreams of `.drwil/usage.jsonl` (if present)
are split, out of the 10 expected before the review; from 10 on, the mean
share of each activity. No threshold, never a refusal: the review of the 10
decides.

- Cache read per request: the context read again at each request (files
  read, tool outputs, a long session), the first cost of a workstream.
  `--recorded` reads `.drwil/usage.jsonl` (if present) only, no log needed, and
  lists each recorded workstream with its average cache read per request,
  oldest first, to compare two workstreams after a change of practice
  (indicator, no threshold). Keeping it low: read a contract or a journal
  entry by itself (`node .githooks/glossary.mjs --contract <ID>`,
  `--journal <brief>`), long checks in a subagent, one session per
  workstream.

- Four token categories (input, output, cache read, cache write) and an
  indicative weighted total (in input-token equivalents: output ×5, cache
  read ×0.1, cache write ×1.25; prices change).
- Active time: the gaps between answers, without pauses over 15 minutes.
- Only the consumption fields are read: never a message content is shown
  or written. Never blocking: without a readable log, it says so.

## Format: `.drwil/usage.jsonl` (if present)

Append-only and versioned, one JSON line per workstream, written at its
closing by `--record` (never twice for the same workstream):

```json
{ "workstream": "add-csv-export", "increment": "all", "tokens": 4200000, "input": 900, "output": 61000, "cache_read": 38000000, "cache_write": 120000, "requests": 64, "model": "claude-opus-5-5", "duration_min": 95, "date": "2026-10-16", "source": "claude-code-logs" }
```

- `workstream`: the brief's file name, without extension.
- `tokens`: the weighted total; the four categories follow.
- `model`: the model, or the models separated by commas.
- `duration_min`: active time; `date`: closing date (`YYYY-MM-DD`).
- `source`: the tool read, `claude-code-logs` or `copilot-cli-logs`; both,
  joined by `+`, for a workstream led with both tools, whose line then also
  carries `tools`, each tool's part with the same totals:

```json
{ "workstream": "add-csv-export", "tokens": 5200000, "…": "…", "source": "claude-code-logs+copilot-cli-logs", "tools": { "claude-code": { "tokens": 4200000, "requests": 64, "…": "…" }, "copilot-cli": { "tokens": 1000000, "requests": 20, "…": "…" } } }
```

- `activities`: the split by activity, after the existing fields (which
  it never changes), each part's weighted tokens and requests:

```json
{ "workstream": "add-csv-export", "…": "…", "activities": { "production": { "tokens": 2600000, "requests": 40 }, "verification": { "tokens": 900000, "requests": 12 }, "governance": { "tokens": 700000, "requests": 12 }, "unattributed": { "tokens": 0, "requests": 0 } } }
```

## Another AI tool

The script reads Claude Code's and Copilot CLI's logs. With another AI
tool, append the line by hand at closing, with `"source": "estimate"`:
estimate (an order of magnitude is enough) and fill `model` and
`duration_min` as best as possible rather than omitting the line.

## Reading: `drwil serve` and the dashboard

`drwil serve` (Consumption view) shows each workstream's part per tool
(Claude Code, Copilot CLI); a line without a named tool (older, or an
estimate) still counts, as « unknown tool ». It also shows each
workstream's split by activity; a line without `activities` (older, or an
estimate) is said « not split ». The dashboard reads both kinds of lines,
without showing the split.


`docs/recipes/view-progress.md` (optional module
`.githooks/dashboard.mjs` (to create)) reads `.drwil/usage.jsonl` (if present)
if it exists
and shows, per project: total tokens, total minutes and the list of
models used. If the file is absent, the dashboard works exactly as
before (no regression).

## The analysis skills

`audit-risks-and-debt` and `discover-product-value` also show, at the top
of their report, a short overview (section "Consumption overview")
summarizing `.drwil/usage.jsonl` (if present) if it exists — never invented if the
file is absent.
