# 7. Scoping reminder

Section 7 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

A code file must not stay detached from every project. A brief in
`docs/projects/` carries, in an HTML comment invisible when rendered, a
`scope` block (one path or pattern per line under `files:`): it covers
the files this project touches.

- **Configurable severity at commit** (`.githooks/check-docs.mjs`,
  `scopeReminder` setting in `.drwil/ia-first.json`): a code file indexed by git
  that no block covers, or a malformed block (no `files:` line, too
  broad a pattern like `**` or `scripts/*`), is reported. `blocking`
  (written by `drwil init`): fails the check. `warning`: never
  blocking, just shown (the value used when the setting is missing). `off`:
  disables the check (and its reminder to the agent). `docs/` and any
  markdown file are never code.
- **Agent side** (Claude Code, hook
  `.claude/hooks/scope-reminder.mjs`, if present), following the same setting: in `blocking`, writing a code file
  outside any brief is refused before it happens (PreToolUse hook); in
  `warning`, a reminder is slipped after the write (PostToolUse hook),
  nothing is blocked; in `off`, nothing.
- **Small task**: attaches to `docs/projects/routine-maintenance.md`,
  without opening a separate project.
- **Kit's own files**: covered by `docs/projects/kit-mechanics.md`, set up
  at install.
- **Shell command guard** (Claude Code, PreToolUse hook
  `.claude/hooks/bash-guard.mjs`, if present): asks for approval on a
  secrets file or a pipe into a shell within a Bash command, the person
  decides; refuses outright skipping the git hooks and `cat`, `less` or
  `more` of the contract registry or the journal.
- **Targeted reading** (Claude Code, PreToolUse hook on Read, read-guard in
  `.claude/hooks/`, if present): reading `docs/contracts.md` or
  `docs/projects/journal.md` whole, without a range, is refused before it
  happens, with `node .githooks/glossary.mjs --contract <ID>`, `--contracts`
  and `--journal <brief>` instead; a read by range (to edit) and a search
  stay allowed.

- **Generated copies** (`scopeMirrors` setting, absent by default): pairs
  of path prefixes `{ "from": "templates/", "to": "" }`. A scoped file under
  `from` also covers the same path under `to`, for the scope barrier, the
  check and the agent-side reminder: a brief names the source of a copy
  without listing the copy.
- **Language of the public docs** (`docLang` setting, absent by default:
  the project language `lang`): the language of the map
  `docs/architecture.md`, the `README.md` and the changelog, for a project
  that works in one language and shows itself in another. Given to the
  agent by `AGENTS.md` and the CLOSING reminder.
- **What a scope usually forgets** (warnings from check-docs): code
  without any test file, or a criterion that creates a contract without
  `.drwil/ia-first.json`, where that contract's own check is declared.
- **Widening mid-workstream**: a commit that stages documentation only
  (`docs/`, Markdown) does not replay the tests of the checks nor the
  project's checks on the working tree, which holds the lot in progress;
  they are reported not run, and push and CI always replay them.

The block's grammar (`.githooks/scope.mjs`) is shared by the check and
the reminder: a single source.

**Readable identifiers.** An identifier cited to a human (contract ID,
catalog line, lot or point of the active brief, value-discovery opportunity
`OPT-N`, marker an intention or a brief declares in its « Markers » section,
one `` - `ID` — label `` line each) is followed by what it designates. A
single source, `.githooks/glossary.mjs`, reads the labels: the checks'
outputs and `drwil verify` annotate the first mention of each ID; any agent
gets the labels with `node .githooks/glossary.mjs "<text>"` (`AGENTS.md`,
Copilot and Cursor instructions). With Claude Code, two hooks: at the end of
each reply, `.claude/hooks/reply-glossary.mjs` (if present) shows the human, under the
reply, « ID — label » for each ID cited without a gloss right after it (a
parenthesis, a dash, a colon, a table cell) — it completes the reply, never
rewrites nor blocks it; after each tool that brings text in (shell, reads,
searches), `.claude/hooks/id-glossary.mjs` (if present) slips the labels into the
agent's context, once per identifier and per session.
