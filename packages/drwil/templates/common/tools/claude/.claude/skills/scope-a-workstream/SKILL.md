---
name: drwil-scope
description: At the end of a scoping pushed (brief or intention committed on a scoping branch, its PR open), set its PR to automatic merge with the tool, without a poll — the automatic merge is the default behaviour. Use when a scoping is pushed and its PR opened, or when the human runs /drwil-scope.
---

# End of a scoping (`/drwil-scope`)

A pushed scoping is offered by `/drwil-start` only once its PR is merged: the tool reads the briefs of
the current folder, that is of the main branch. The automatic merge is the default behaviour: no poll,
no authorisation to ask for. Its guard is the proof — green CI, PR of the current branch, scheduling read
back on the forge — carried by `.githooks/merge-auto.mjs`, never by the agent's memory.

1. Read the state: `node .githooks/state.mjs`. Anything other than SCOPING: say so and stop (a
   workstream's PR is set to automatic merge at its closing, as the state's instruction says).
2. The scoping is committed on its own branch, never on the main branch, pushed, and its PR opened
   (GitHub: `gh pr create --base <main branch>`; GitLab: its MR, `glab mr create --target-branch <main
   branch>`).
3. Run `node .githooks/merge-auto.mjs <number>`, from the scoping branch: it only schedules the PR of
   the current git branch — never chain the forge's commands (`gh`, `glab`) by hand, never say the merge
   is scheduled unless it said so.
4. Follow the PR with `node .githooks/pr-watch.mjs <number>`, run again while it says green without
   merged, 30 minutes at most in all. A refusal or a red CI: report it as is, fix a red CI on the same
   branch, never bypass it.
5. Several scopings to read together before they are merged: the human says so; then the next scopings
   are committed on **the same branch** (one branch, one PR, no new branch), and the merge is scheduled
   once the last one is pushed.
