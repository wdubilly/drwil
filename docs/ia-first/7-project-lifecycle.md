# 7. Project lifecycle

Section 7 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

| Stage | Where | Who moves it forward |
|---|---|---|
| idea expressed | intent brief: Need, Surveyed existing state, Questions to decide | the agent writes it; the requester decides the questions |
| scoped, short | an `[AI]` or `[human]` line in the project index | the agent, once the questions are decided |
| scoped, long | brief: dated status, increments and exit criteria, Hand-off | the agent; the requester approves the scoping |
| in progress | the same brief, Hand-off updated at the end of every task | the agent working on it (handoff) |
| delivered | line removed from the index; status "delivered on …"; final Hand-off | the agent, with proof (QUA-013) |
| abandoned | brief or line removed, reason in the commit message | the requester decides, the agent applies it |

A `[decision]` only moves forward once decided by the requester; a
`[human]` gesture is never done by the agent, who raises it.

**Noting an idea at any moment**: `node .githooks/note.mjs "<text>"`, from any
tool or a terminal, appends one dated line to the intents' notes file
(`docs/intentions/notes.md` (if present), outside the index) without changing the activity
or touching the active brief; under Claude Code, `/drwil-note` calls it. A
note is always an intent, never an order to code; it is
committed with the branch in progress and promoted to an intent brief when it
matures.

**Hand-off**: the "Hand-off" section of every brief (dated last
state, uncommitted work, next step with its marker) acts as a hand-off file:
another agent, another tool or a person picks it back up cold from it,
without any tool-specific memory.

Checked by QUA-015 for what a machine can verify (markers, **dated** status
line, intent sections, projects' "Hand-off" section): a machine can't
tell if a status is true, but a dated status shows its age. Content
accuracy stays human. Exceptions to the check: `docs/projects/template-*.md`
files (templates to copy, not briefs) and `docs/projects/routine-maintenance.md`
(permanent brief, not a project split into increments).
