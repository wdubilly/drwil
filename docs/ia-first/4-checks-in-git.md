# 4. The check lives in git, not in the tool

Section 4 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

This is the repo's structuring decision. Checks live in `.githooks/`
(versioned), wired through `core.hooksPath`, not in an assistant setting:

- `AGENTS.md` assumes it: the hook applies to whoever commits or pushes
  (human in a terminal, AI assistant…);
- `.githooks/run-checks.mjs` carries the argument as a comment: a real git
  hook runs regardless of what invoked `git commit`, unlike a tool-specific
  hook. An assistant with no local configuration is thus subject to the
  same checks as a human.

What `.githooks/run-checks.mjs` chains, in order: secrets (gitleaks, if
installed), doc references (QUA-011), tests cited by the contracts
(QUA-029), the architecture map (QUA-040: every code folder cited in
`docs/architecture.md`), the brief's scope (QUA-016), the main branch
(QUA-017), tests of the checks themselves (if any), CI coverage of each
check (QUA-013, if there is a CI), then the project's own checks declared
in `.drwil/ia-first.json` (`checks` key).

The tests of the checks exercise drwil's own code: they stay in the drwil
repository and are not shipped, so they never slow down the project's
commits (the check reports "not applicable"). A requirement added by a kit
version released after the project was installed (today: a cited path that
only exists as a file ignored by Git) follows the `newRequirements`
setting of `.drwil/ia-first.json`: `blocking` for a fresh install,
`warning` for a project that was already set up without it — an
upgrade never breaks a commit that used to pass; `drwil init` never
hardens this setting, the project switches it to `blocking` when it wants.

To keep commits fast, a project check that declares `paths` (patterns,
e.g. `["src/**"]`) runs **at commit time** only if a staged file matches one
of them; otherwise it ends up "not run", never hidden. Push
(`.githooks/pre-push`), CI and a manual run of `.githooks/run-checks.mjs`
always run it. Without `paths`, it runs on every commit. Also list in
`paths` the files the check depends on outside its folder (root dependency
manifest and lockfile, `.drwil/ia-first.json`…): otherwise a commit touching
only them reruns it only on push.

A slow check can also be **reserved** with `runAt`, a list among `commit`,
`push`, `verify` and `ci` (default: all four, so a check without it behaves as
before). `runAt: ["verify", "ci"]` keeps it out of every commit and push: it ends
up "not run" there (a warning that blocks neither the commit nor the push), never "passed", and `drwil verify` and CI always play it, so
its absence or failure still blocks the closing and the merge (QUA-013). Add
`commit` or `push` to play it there too. `verify` and `ci` must both be listed,
or `ci` alone: `runAt: ["ci"]` leaves the check to the CI of the pull request
(GitHub) or merge request (GitLab). It runs neither at commit, nor at push, nor
in `drwil verify`; each output says it is "left to CI", never "passed", and
`drwil verify` then reads `GOVERNANCE: PASS (CI pending)`, naming the checks
waiting for CI (the evidence and `--json` too); the closing is acquired only
once `node .githooks/pr-watch.mjs` (through `gh` or `glab`) or `node .githooks/close.mjs` sees
that CI green, and the workstream stays in CLOSING otherwise. The CI shipped
for GitHub and GitLab plays a pushed commit once, even with a pull or merge
request open. `--with-ci-checks` (on `drwil verify` and `run-checks`) also
plays them locally, to reproduce a CI failure, and says so. `["ci"]` is refused
without a declared GitHub or GitLab CI in `ciFiles`; an unknown or malformed
`runAt` is refused with a message, never ignored. The
setting is part of the check's own fingerprint (the reuse of its last verdict)
and, being an execution field, leaves an attestation citing the check
untouched: only a change of its command, tests or `paths` makes it lapse.

One detail makes this check actually run rather than get bypassed: **a
check that did not run is visible** (QUA-013) — a check that cannot run on
a workstation (missing tool) ends up "not run", never hidden as a silent
success. At commit time it stays a warning; on push and in CI
(`.githooks/run-checks.mjs`) a check that did not run **fails** — only the
stale-audit reminder stays a warning. A **degradable** check (e.g. secrets, without gitleaks) must also
have a CI job triggered on the same paths:
`.githooks/check-control-coverage.mjs` verifies this by re-reading the CI
file, not merely noting the job exists (a job that exists but never
triggers covers nothing). The same hook replays on push
(`.githooks/pre-push`), to catch a commit made with `--no-verify`. A
`commit-msg` hook (rejecting the "Co-Authored-By" line) is shipped but
disabled by default (`chmod +x .githooks/commit-msg` to enable it).

*(AI-tool-specific safety net, in addition to and never instead of git
hooks: see the "Scoping reminder" section further down for what the kit
already tools up with Claude Code.)*
