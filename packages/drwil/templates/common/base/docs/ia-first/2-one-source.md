# 2. One piece of information, one source

Section 2 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

Since duplication is the first cause of wrong docs, the repo forbids
copying:

- **skills** (`.claude/skills/`, if present) are shortcuts, not recipes:
  each contains only the trigger and a pointer to the recipe in
  `docs/recipes/`, which is itself the substance;
- layer `AGENTS.md` files do not copy a contract's rule, they cite its ID
  and give the file where to read it;
- `docs/contracts.md` is the single registry of invariants, where each ID
  is defined exactly once.

This split is checked: QUA-011 (`.githooks/check-docs.mjs`) fails if a path
cited in backticks doesn't exist, or if a cited contract ID isn't in the
registry.
