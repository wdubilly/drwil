---
name: drwil-scope
description: At the end of a scoping pushed (brief or intention committed on a scoping branch, its PR open), group the scoping edits of the conversation on that one branch and PR, then set its PR to automatic merge with the tool when needed, without a poll — the automatic merge is the default behaviour. Use when a scoping is pushed and its PR opened, or when the human runs /drwil-scope.
---

# End of a scoping (`/drwil-scope`)

A pushed scoping is offered by `/drwil-start` only once its PR is merged: the tool reads the briefs of
the current folder, that is of the main branch. The automatic merge is the default behaviour: no poll,
no authorisation to ask for. Its guard is the proof — green CI, PR of the current branch, scheduling read
back on the forge — carried by `.githooks/merge-auto.mjs`, never by the agent's memory.

1. Read the state: `node .githooks/state.mjs`. In BUILD, a documentation scoping (a brief of
   `docs/projects/`, an intention of `docs/intentions/`) is done in the workstream's folder, on its branch,
   without a worktree: the scope gate commits it without changing the state or the active brief, nor
   widening its scope; it travels and merges with the workstream's PR (no scoping branch or PR of its
   own, nothing to schedule here). Commit it apart: a commit of briefs and intents only, the active brief
   untouched — an intention it adds is then no limit, the closing does not ask the limits poll for it. The
   contracts registry stays out of it. Anything else than SCOPING or
   BUILD: say so and stop (a workstream's PR is set to automatic merge at its closing, as the state's
   instruction says). The steps below are those of a scoping made in SCOPING.
2. The scoping is committed on its own branch, never on the main branch, pushed, and its PR opened
   (GitHub: `gh pr create --base <main branch>`; GitLab: its MR, `glab mr create --target-branch <main
   branch>`).
3. **Scoping edits grouped**: the next scoping edits of the same conversation are committed, by default, on
   **the same branch** (one branch, one PR, no new branch), each one pushed; nothing to ask the human. Its
   merge is scheduled only when it is needed: a `/drwil-start` needs a brief it carries (the poll only
   offers briefs of the main branch), the human asks for it, or it is offered at the end of the exchange
   (one sentence, never a poll). A scoping edit is never pushed on a branch whose merge is already
   scheduled (GitHub: `gh pr view <number> --json autoMergeRequest`; GitLab: `merge_when_pipeline_succeeds`
   of `glab mr view <number>`) or done: it goes on a new scoping branch cut from the up-to-date main branch.
4. To schedule the merge, run `node .githooks/merge-auto.mjs <number>`, from the scoping branch: it only
   schedules the PR of the current git branch — never chain the forge's commands (`gh`, `glab`) by hand,
   never say the merge is scheduled unless it said so.
5. Follow the PR with `node .githooks/pr-watch.mjs <number>`, run again while it says green without
   merged, 30 minutes at most in all. A refusal or a red CI: report it as is, fix a red CI on the same
   branch, never bypass it.
