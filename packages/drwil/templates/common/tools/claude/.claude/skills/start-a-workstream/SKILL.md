---
name: drwil-start
description: Start a workstream, or a queue of workstreams, with one human gesture — open a poll of the scoped briefs; the human's answer, read by the tool, moves governance to BUILD (several briefs chosen: the next ones are queued and started by the agent after each closing). Use when the human wants to start implementing one or several briefs.
---

# Start a workstream (`/drwil-start`)

Starting is the human's decision: it is **their answer to the poll**, read by a tool hook
(`.claude/hooks/prompt-hook.mjs`), that makes the transition — never the agent.

1. List the scoped briefs: `node .githooks/state.mjs briefs --json` (`scope` block committed,
   brief neither finished nor a reference). None: say so and stop. The list is **already
   ordered**: ready briefs first (`ready`: no open `[decision]`), then by `maturity` (`ready`,
   then `in-progress` and `unset`, then `refine`), then by index `priority`;
   `decisions` counts those still to decide.
2. Read the "Proposed order" sections of the intentions (`docs/intentions/`): they may put one
   brief before another of the same rank. Also note the index's P1 intentions that have no framed
   brief yet.
3. Open **one** poll (Claude Code: `AskUserQuestion`; Copilot CLI: `ask_user`), in that order,
   preceded by a short message citing the P1 intentions "to frame" (never offered for start):
   - Claude Code: `header` exactly `drwil-start`; one option per brief, **label = exact path**
     (e.g. `docs/projects/<brief>.md`), description = title. At most 4 options, the first of the
     list; a brief that is not ready keeps its place at the end, its description says "not
     ready: N decision(s) to make first"; a brief with `maturity` `refine` is never hidden, its
     description starts with "to refine: review before starting it"; the human can type another
     path under "Other". `multiSelect: true` when the human wants to chain several briefs (a
     queue): the briefs ticked are run in the poll's order, the first now, the next ones
     started by the agent after each closing; only ready briefs (maturity « ready », no open
     decision, acceptance criteria) can be queued, otherwise the whole start is refused.
   - Claude Code, **second question** of the same poll: `header` exactly `drwil-merge`,
     options "Automatic merge" (the agent will schedule the merge in CLOSING) and "Manual
     merge", with no recommendation: it is the acceptance decision, taken at start.
   - Copilot CLI: `message` starting with `drwil-start :`, choices = exact paths (no second
     question: manual merge).
   - **Recommend**: the first ready brief, first, with "(Recommended)" and the reason in
     its **description** — never in the label.
   - **Forbidden**: filling `answers` or a default value (`default`): the hook refuses the poll.
     The human chooses alone.
4. After the answer, read the state again: `node .githooks/state.mjs`. In BUILD on the
   chosen brief: implement. Otherwise: report the refusal as is, without retrying another way. If the state
   says "Automatic merge authorised": in CLOSING, after verify PASS and pushing the closing
   commit, in this order — wait until GitHub has computed the PR and, if it is behind the main
   branch (BEHIND), update it; schedule `gh pr merge --auto --merge`; check that the merge is
   scheduled (`gh pr view --json autoMergeRequest`); only then go back to Scoping, which clears
   the authorisation. On failure, stay in CLOSING and report it. Otherwise the merge stays a
   human gesture.
5. **Queue** (the state says « Queue decided at start »): after each closing, wait until the
   PR is merged, update the main branch, then start the next brief with
   `node .githooks/state.mjs next` and implement it — no new poll. Stop at the first
   workstream that gets stuck (human attestation awaited, FAIL not fixed, red CI, decision to
   make): say why and what is expected; the queue goes on once it is unblocked, or
   `node .githooks/state.mjs queue stop` drops it. A short report at each closing (criteria,
   checks, limits, intents created), a summary at the end of the queue.

Without a poll in the tool: give the human the command `node .githooks/state.mjs start`, to run
in an interactive terminal.
