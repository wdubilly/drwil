# 7. Starting and closing

Section 7 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

Two human gestures per workstream: **start** and **merge the PR** — only one if the merge is
authorised at start (below), and one for a whole **queue**: ticking several briefs in the start
poll (multiple choice) queues them, with the merge decision. The agent then runs them one after
the other — the next brief started by `node .githooks/state.mjs next`, allowed to the agent for
the head of the queue only, once the previous PR is merged — and stops at the first workstream
that needs a human (attestation, unfixed FAIL, red CI, decision to make); only ready briefs
(maturity « ready », no open decision, acceptance criteria) can be queued; any return to
`SCOPING` other than after a closing, or `node .githooks/state.mjs queue stop`, drops the
queue.

- **Start**: from `SCOPING`, `EXPECTATION` or `REQUEST`, a single decision moves
  to `BUILD` on a **scoped brief** (`scope` block committed in
  `HEAD`, brief not finished, templates excluded; list: `node
  .githooks/state.mjs briefs`). It applies to that committed scoping.
  - **In the chat** (`/drwil-start`, if present): the agent opens a poll of
    the scoped briefs, in the order of `briefs --json` (ready briefs first,
    no open `[decision]`, then by index priority; the intentions' proposed
    order breaks ties), and recommends the first ready brief (in the
    description, never by preselection); it is the **human's answer**, read by a tool hook
    (`.claude/hooks/prompt-hook.mjs` (if present)), that starts — never the
    model. The hook refuses a start poll that arrives with an answer already
    filled or a default value. Checked on 2026-10-10 in Claude Code (an
    answer pre-filled by the model is ignored by the tool) and in Copilot
    CLI, which fires the same hooks on its own poll.
  - **In a terminal** (any tool): `node .githooks/state.mjs start` lists the
    scoped briefs, asks for a number, then for typing `START`.
- **Close**: free as soon as the `drwil verify` evidence is valid (see
  above); closing removes rights, and accepting the work remains the human
  PR merge.
- **Merge authorised at start** (Claude Code: a second question of the
  poll, Copilot CLI: a second field) named `drwil-merge` lets the human
  accept in advance; their answer,
  read by the hook, is kept in the local state (`auto_merge`) until
  going back to Scoping, never set by the agent (even with
  `transitions: agent`). In CLOSING, after verify PASS and pushing the
  closing commit, the agent schedules `gh pr merge --auto --merge`: the
  host only merges once the required checks pass ("Allow auto-merge"
  repository setting required). In the terminal, `start` asks the same
  question (type `MERGE`). Without that answer, the agent never schedules
  the merge, in any tool. Once the closing PR is merged, the next `start`
  (or `next`) goes back to Scoping by itself: the brief is deleted and the
  PR merged (main branch current, or the branch merged, `gh` for a
  squash).
- **Worktree at start**: an optional
  third question of the poll (Claude Code) or field (Copilot CLI) named
  `drwil-worktree`, "New worktree" or "This folder", lets the human run the
  workstream in a sibling folder `../<repository>-<brief>`, branch
  `workstream/<brief>` cut from the up-to-date main branch. The hook reads the
  answer (never the model), creates the folder, runs the command declared by
  the `worktreeInstall` setting of `.drwil/ia-first.json` (optional, e.g.
  `npm ci`; without it nothing is run and the output says what to do; a failure
  is reported, the folder and the state stay) and starts the workstream there
  through `.githooks/state.mjs`: the origin folder's state does not change. A
  brief already active in another worktree of the repository is refused, with
  that folder's path. The state reminder names the main repository, the branch
  and the workstream of a worktree, says the other listed folders are worktrees
  of the same repository, and lists the open worktrees in the main folder.
  A single brief per worktree; a sequential queue stays in the repository
  folder.
- **Parallel queue at start**: when several briefs are ticked, a
  `drwil-parallel` question of the poll (Claude Code, exact header) or field
  (Copilot CLI), "Parallel queue" or "Sequential queue", with no
  recommendation nor default, lets the human run the queue in parallel;
  "Sequential queue" keeps the queue in the repository folder (above). The
  hook reads the answer (never the model) and launches each ticked brief, in
  the poll's order, in its own worktree as above, with the merge decided at
  the poll; no queue is written in a worktree. At most `maxParallel`
  workstreams are active at once, all worktrees counted (setting of
  `.drwil/ia-first.json`, 3 by default). Refused, nothing being created: fewer
  than two briefs, a brief chosen twice, a brief that cannot enter a queue, a
  brief already active elsewhere, going over `maxParallel`, two briefs (both
  chosen, or one chosen and one active in a worktree) whose `scope` blocks
  overlap — the workstreams' index and journal excepted: every closing
  modifies them, and their conflict is resolved when rebasing. A failed launch stops the next ones without undoing those already
  launched; the origin folder's state records the launched briefs
  (`parallel`). With Claude Code, each workstream then runs in a subagent
  whose working folder is its worktree; the main session keeps only the
  reports and follows each PR until it is merged; on a closing conflict on the
  workstreams' index or journal, the subagent rebases and resolves it alone; a
  workstream that needs a human stops its own subagent, the others go on, and
  a queue summary gives the state of each.
- **Limit**: an agent with a shell could call these functions itself or
  rewrite the local state; Claude Code's `deny` rules block calling the hook
  directly, and cheating stays visible and refused off the machine (commit
  barrier, CI), as for the rest.
