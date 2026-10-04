# Recipe: working with branches and merge/pull requests

Goal: keep the link between a `docs/projects/` card and the git work that
delivers it when that work goes through a branch and a pull/merge
request, instead of direct commits on the main branch.

## Opening a branch

- Name the branch `chantier/<card-slug>`, where `<card-slug>` is the file
  name (without extension) of the relevant `docs/projects/` card. Example:
  a card named my-project.md is worked on a branch named
  chantier/my-project.
- The card already exists (scoping done) before opening the branch — no
  coding without a card, branch or not.

## During the work

- The card is updated **on the branch**, just like for direct work on the
  main branch (Status, Lots, Resuming work).
- The card's Status stays "in progress" as long as the branch isn't
  merged, even if the work on it is finished: "done" is only said once
  the merge has actually happened. An index (`docs/projects/pending.md`)
  that checks a box before the merge would be inconsistent with the real
  state of the main branch.

## Opening the pull/merge request

- The pull/merge request description points to the relevant
  `docs/projects/` card (the template shipped by the kit, if installed,
  already has this section).
- Checks (`.githooks/run-checks.mjs`) must be
  green before opening the pull/merge request, not only before merging
  it.

## Closing

- Once the pull/merge request is merged (merge or squash, project's
  choice, the kit doesn't impose anything here): set the card's Status to
  "done", check its box in the index if it's listed there, delete the
  branch.
- If the merge is done by someone other than the author of the work
  (human review), that person closes the card at merge time — not
  before.

## What the kit checks (QUA-017)

- `.githooks/run-checks.mjs` (so `pre-commit` and `pre-push`) refuses to
  commit or push directly to the main branch (`master`/`main`) — except
  for the very first commit of a freshly initialized repository
  (bootstrap). No setting disables this check.
- This check never runs in CI: it only applies locally, at commit/push
  time, not when CI replays an already-made push (a merge landing on the
  main branch is legitimate).

## What the kit does not do

- No automatic check verifies the branch **name**
  (`chantier/<card-slug>` stays a documented convention, not enforced)
  or requires a pull/merge request to exist before a commit on a
  non-main branch.
- The kit does not open or merge pull/merge requests on the human's
  behalf (no GitHub/GitLab API calls): only description templates are
  provided.
