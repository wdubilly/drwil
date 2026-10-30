# 7. Scope barrier

Section 7 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

The engine's `scope-gate` check (`.githooks/scope-gate.mjs`), run at
commit, push, in CI and in `drwil verify`. Severity: `scopeGate` setting in
`.drwil/ia-first.json` — `warning` (written by `drwil init`: gaps are
shown, nothing is blocked), `blocking`, `off`.

| `scopeGate` | Gaps in scope | Missing reference branch (push, CI) |
|---|---|---|
| `blocking` | ✗ the commit, push or CI run is refused | not run: refused at push and in CI (QUA-013) |
| `warning` (default) | ⚠ shown, nothing blocked | not run: same |
| `off` | not checked, no trailer | not applicable |

"No reference branch" (`origin/HEAD`, `master`, `main` or `DRWIL_BASE`) is
never a pass: it is a warning at commit and a failure at push and in CI.

- **Briefs always pass**: `docs/projects/` and `docs/intentions/`, as do
  human attestations, written by `drwil attest`:
  `.drwil/evidence/attestations/` (if present), and the consumption log
  `.drwil/usage.jsonl` (if present), written at closing, as is the closing
  proof `docs/preuves/`, the release notes `docs/recettes/` (if present),
  written by the release module and reviewed in their pull request, and
  the scoping recipes' outputs,
  written in SCOPING (value discovery and risk audit:
  `docs/value-discovery.md` (if present), `docs/audit-risks.md` (if present), and their French
  names) — configurable list: `outOfScope`. Any other file,
  code or doc, is subject to the scope.
- **At commit**: outside briefs, a commit is accepted only in
  `BUILD`, for files covered by the active brief's `scope` block
  **as it is in `HEAD`**. Widening one's scope thus takes a separate commit
  touching only the brief; the code comes in the next commit.
- **Trailer**: the `prepare-commit-msg` hook adds `Drwil-Expectation: <active
  brief>` to the message. Git never skips this hook.
- **On push, in CI and in `drwil verify`**: each commit of the branch
  (since the main branch, or `DRWIL_BASE`) is replayed against the scoping
  of its trailer's brief, read in its parent commit. A commit outside
  briefs without a trailer is refused. A commit is judged by its parent's
  rules: if the barrier did not exist there yet, it is not checked. The
  activity only exists locally, so CI only checks the scope.
- **Removal**: see below.
