# 1. A single entry point, and a budgeted context

Section 1 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

The setup is deliberately minimal and readable by any tool, not only a
given assistant:

- `AGENTS.md` is a short switchboard (100 lines at most, read at every
  request): one line per conduct rule no machine checks, the contracts to
  know, the "if you touch… read first" table, and the context-loading
  order. The detail of each rule is in `docs/ia-first/8-conduct-rules.md`.
- `CLAUDE.md` and `GEMINI.md`, if present, contain only one line,
  `@AGENTS.md` (some tools don't read `AGENTS.md` on their own): there is
  no second copy of the instructions to keep in sync.
- One `AGENTS.md` per layer: a task's context is read in the touched
  folder, not the whole repo. Each layer has the same one-line redirect as
  the root.
- `docs/` is plain markdown, readable without any install.

Context loading is **progressive and bounded** (`AGENTS.md`, "Load context
progressively" section): this file, then the layer's `AGENTS.md`, then the
recipe or document from the table, then `docs/contracts.md` for an ID's
detail, then "nothing else without a reason".

Consequence: switching assistants changes nothing in what it reads, and the
context loaded for a task stays proportionate to the task.
