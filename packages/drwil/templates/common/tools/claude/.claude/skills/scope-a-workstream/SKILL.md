---
name: drwil-scope
description: At the end of a scoping pushed (brief or intention committed on a scoping branch, its PR open), ask the human what to do with the PR — automatic merge, manual merge, or continue scoping on the same branch; the human's answer, read by the tool, is the only authorisation of the automatic merge in SCOPING. Use when a scoping is pushed and its PR opened, or when the human runs /drwil-scope.
---

# End of a scoping (`/drwil-scope`)

A pushed scoping is offered by `/drwil-start` only once its PR is merged: the tool reads the briefs of
the current folder, that is of the main branch. Deciding what to do with that PR is the human's
decision: it is **their answer to the poll**, read by a tool hook (`.claude/hooks/prompt-hook.mjs`),
that records it — never the agent.

1. Read the state: `node .githooks/state.mjs`. Anything other than SCOPING: say so and stop (a
   workstream's merge is decided at its start, `drwil-merge`).
2. The scoping is committed on its own branch, never on the main branch, pushed, and its PR opened
   (`gh pr create --base <main branch>`); follow its CI with `node .githooks/pr-watch.mjs <number>`.
3. Open **one** poll, a single question, single choice:
   - Claude Code (`AskUserQuestion`): `header` exactly `drwil-scope`, `multiSelect: false`, exactly
     three options, labels exactly `Automatic merge` (the agent schedules the merge of this PR with
     `.githooks/merge-auto.mjs`), `Manual merge` (nothing is scheduled, the human merges) and
     `Continue scoping` (the PR stays open, the next scopings go on the same branch).
   - Copilot CLI (`ask_user`): `message` starting with `drwil-scope :`, a single field named exactly
     `drwil-scope`, **single choice**: `type: "string"` and `enum` = the three labels above, never
     `type: "array"` (only the single choice is read reliably).
   - **Forbidden**: a recommendation (no "(Recommended)", in a label or a description), an answer
     filled in (`answers`), a default value (`default`), a fourth option: the hook refuses the poll.
     The human chooses alone.
4. After the answer, read the `[drwil]` message the hook gives back:
   - **Automatic merge** (`✓`, authorisation recorded for the branch): run
     `node .githooks/merge-auto.mjs <number>` — never chain the `gh` commands by hand, never say the
     merge is scheduled unless it said so; then follow the PR with `node .githooks/pr-watch.mjs <number>`,
     run again while it says green without merged, 30 minutes at most in all. A refusal or a red CI:
     report it as is, fix a red CI on the same branch, never bypass it.
   - **Manual merge**: nothing is scheduled; give the human the PR number and say the brief is offered
     by `/drwil-start` once the PR is merged.
   - **Continue scoping**: nothing is scheduled; the PR stays open and the next scopings are committed
     on **the same branch** (one branch, one PR, no new branch); ask this poll again at the end of the
     next scoping.
   - A refusal (`✗`): report it as is, without retrying another way. No `[drwil]` message at all: the
     hooks are not active in this session — say so and suggest restarting the session.
5. Never schedule `gh pr merge --auto` on a scoping PR without the "Automatic merge" answer, in any
   tool: `.githooks/merge-auto.mjs` is the only way, and it refuses without that answer.

Without a poll in the tool: the merge of the scoping PR stays a human gesture.
