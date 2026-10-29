# 7. Projects, resumable cold

Section 7 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

An agent picks a project back up without the conversation history that
created it: everything it needs must be in the brief.

**Risk levels** (ceremony follows risk; traceability never changes:
QUA-016 applies to everything):

- **LOW**: small task without a dedicated brief, attached to
  `docs/projects/routine-maintenance.md`.
- **MEDIUM**: brief with a scope (`**Risk**: MEDIUM`).
- **HIGH**: brief, "Decisions" section, related contracts cited, proofs
  (`drwil verify`). A scope touching governance mechanics (`.githooks/`, CI,
  `.drwil/`) requires HIGH; configurable via `.drwil/ia-first.json` →
  `risk.sensitivePaths`.

The level is declared in the brief and can only be raised: a level below
the detected minimum, or a HIGH without Decisions or contract, is rejected
at commit (`.githooks/check-docs.mjs`); a brief without a "Risk" field whose
scope requires HIGH gets a warning.

- **A short index, briefs**: the project index has one line per topic and
  points to the brief as soon as there's more than two lines to say. An
  agent reads only the brief of the topic it handles.
- **Status lives in the brief**, a "Status" line at the top of a project or
  an intent, never copied into the index: a copy ends up wrong.
- **Existing state is surveyed in the code, dated**, and what isn't
  checked is labeled "not verified".
- **A project splits into short increments**, each with its exit criterion
  written in advance, its contracts and its dated decisions.
- **Every open item says who can act**: `[AI]`, `[human]` or `[decision]`.
  An agent does not attempt a human gesture (server, vault, approval) and
  does not decide a decision: it raises it.
- **Leave it cleaner in passing** (`AGENTS.md`, Conduct): what an agent
  reads and finds wrong during a task, it fixes separately and reports;
  what it advances, it dates in the brief.
