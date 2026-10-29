# "IA first" architecture — description

State as of 2026-10-29. This document explains **how this repo is built to be
modified by agents**: where the rules live, who checks them, and what is
not checked. It describes neither the product nor the detail of invariants
(single source: `docs/contracts.md`); the product, if described, lives in
docs/features.md and docs/architecture.md (if present). Like the rest of
the repo, it is to be updated in the same commit as what it describes.

"IA first" names a property of the repo, not a product feature: **the rule
is written in the repo and checked by a machine, not entrusted to the
assistant writing the code.**

## Summary: one short file per section

Each section lives in its own file under `docs/ia-first/`, written to be read
alone: open only the file your situation calls for, never the whole folder.
A citation "`docs/ia-first.md`, section N" leads to section N below, then to
its file. Section 7 is split by subsection: pick the subsection's file.

| § | Section | File | Read it when |
|---|---|---|---|
| 1 | A single entry point, and a budgeted context | `docs/ia-first/1-single-entry-point.md` | you wonder what to load and in which order |
| 2 | One piece of information, one source | `docs/ia-first/2-one-source.md` | a fact seems written in two places |
| 3 | Invariants are tooled, not merely stated | `docs/ia-first/3-tooled-invariants.md` | you add or change a contract or its check |
| 4 | The check lives in git, not in the tool | `docs/ia-first/4-checks-in-git.md` | a hook, a commit check or CI refuses something |
| 5 | What the agent must prove about its work (`drwil verify`, agent / human workflow) | `docs/ia-first/5-proving-the-work.md` | you are about to say "done" or "verified" |
| 6 | Assumed limits (tool compatibility matrix) | `docs/ia-first/6-limits-and-tool-compatibility.md` | you work with a tool other than Claude Code |
| 7 | Projects, resumable cold (risk levels, index and briefs) | `docs/ia-first/7-projects-and-risk-levels.md` | you write a brief or the project index |
| 7 | Project lifecycle | `docs/ia-first/7-project-lifecycle.md` | you move an idea towards a brief, then the journal |
| 7 | Scoping reminder | `docs/ia-first/7-scoping-reminder.md` | a commit warns that no brief covers a file |
| 7 | Governance state | `docs/ia-first/7-governance-state.md` | you read or change the activity (`SCOPING`, `BUILD`…) |
| 7 | Starting and closing | `docs/ia-first/7-starting-and-closing.md` | you start, close or merge a workstream |
| 7 | Scope barrier | `docs/ia-first/7-scope-barrier.md` | a commit is refused as out of scope |
| 7 | Disabling or removing governance | `docs/ia-first/7-disabling-governance.md` | governance must be switched off or removed |
| 8 | Conduct rules, in detail | `docs/ia-first/8-conduct-rules.md` | you need the full text of a rule of `AGENTS.md` |
