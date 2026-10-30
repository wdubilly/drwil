# 7. Disabling or removing governance

Section 7 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

No installation creates a permanent lock: governance is switched off by a
setting, then removed with the rest of the mechanics.

- **Disable** (reversible, nothing is deleted): `"scopeGate": "off"` in
  `.drwil/ia-first.json`. No more barrier at commit, push or in CI, no more
  `Drwil-Brief` trailer, and the context reinjected to the agent shrinks
  to "governance disabled". Setting `warning` or `blocking` back
  restores it as it was.
- **Remove**: `npx drwil uninstall` (dry run: lists what would be removed),
  then `npx drwil uninstall --yes`. Mechanics files left untouched are
  removed (hooks, `.githooks/state.mjs`, rules of
  `.claude/settings.json` (if present)); what `init` added to the
  project's own files (the `drwil` blocks, the kit's Claude hooks) is
  removed too; the local state
  `.drwil/state.json` (if present) is listed with
  them and deleted only with `--yes`. Briefs, contracts and versioned
  attestations stay: they are the project's history.
- **Limit**: Claude Code's `deny` rule on `.drwil/state.json` (if present)
  also refuses any shell command that mentions that path, even a read;
  reading the state goes through `node .githooks/state.mjs`.
