# Installing drwil from source

drwil is not published on npm yet: use it from a clone of this repository,
or from the tarball attached to a GitHub release (see `README.md`,
"Installation" section).

## 1. Prerequisites

- Node.js (see the tested matrix in `.github/workflows/ia-first.yml`,
  cross-tested on Linux/macOS/Windows);
- npm (shipped with Node.js).

### Node.js in the PATH of your assistant

The hooks the kit ships for Claude Code, Copilot CLI and Gemini CLI run `node`. It must be in the `PATH` of
the **assistant's process**, not only in the `PATH` of some shell you use.

A version manager such as fnm puts `node` in a folder that belongs to the shell that initialised it
(`/run/user/<uid>/fnm_multishells/<id>/bin`). An assistant started from another shell, or still open after
the shell that started it was closed, has no `node` in its `PATH`: without a fallback the hook fails with
exit code 127 ("hook errored") and no cause.

The shipped hooks now say it:

```
drwil: node not found in the PATH of this assistant. Restart it from a shell where which node answers.
```

Do what it says: open a shell where `which node` (`Get-Command node` in PowerShell) answers, and start the
assistant again from it. With `node` present nothing changes. Without it, the `PreToolUse` guards of Claude Code
still refuse (exit 2) and its informative hooks only warn (exit 1); Copilot's hooks never block (exit 0).
The kit never writes an absolute path to `node` and never looks for it elsewhere: the message is the fix.

Limits:

- Gemini CLI: outside Windows, `drwil init` writes commands that go through the launcher
  `.gemini/hooks/drwil-node.sh` (same message; `BeforeTool` refuses, the other hooks warn). On Windows the
  command stays a plain `node …` call: without `node` in the `PATH` there is no message, only Gemini's
  own "command not found". The setting is committed, so a team mixing systems keeps the form of the system that
  ran `init`.
- The tests exercising the fallback run on the Linux, macOS and Windows matrix of the CI, but the cases that
  run the `sh` commands are skipped on Windows. The PowerShell forms (Copilot's `powershell` field) are only
  checked as text: they are not run in CI.

## 2. Clone and set up

```bash
git clone https://github.com/wdubilly/drwil.git
cd drwil/packages/drwil
npm install
npm run build
```

Enable the repository's Git checks, once per clone:
```bash
git config core.hooksPath .githooks
```

## 3. First run and check

```bash
npm test                 # the drwil package's test suite

# try the CLI on an empty folder (no layer is invented: scope the project
# first with /drwil-adopt, then declare its layers with --layers)
node bin/drwil.js init --name "MyProject"
```

From the repository root: `node .githooks/run-checks.mjs` replays every
check, `node outils/tester-tarball.mjs` exercises the CLI installed from
the tarball, as a user would.

### Permission prompts in Claude Code

An installed project ships `.claude/settings.json`, which allows without a prompt the everyday read and
local commands (git status, diff, log, add, commit; `gh pr view`, `gh pr checks`; the read-only
`.githooks` tools such as `.githooks/state.mjs` and `.githooks/glossary.mjs`). Claude Code still asks before `git push`,
`merge` and `rebase`, and the deny rules (`--no-verify`, `git -c`, the state file) are untouched:
an allow rule opens no gesture that the hooks or the forge refuse. Personal exemptions go into
the gitignored local settings file of the same folder.

### First commit of a new project

On an empty folder, `drwil init` creates the git repository on the `workstream/kit-installation` branch and
commits the kit itself, before enabling the hooks: with `scopeGate` blocking, the files of the kit (outside any
brief) could not be committed in SCOPING, and the first workstream would start on a refused commit. A folder
that is already a git repository is never committed by `init`; if git has no identity, `init` says so and the
commit is left to you.

## 4. Build the tarball of a version

```bash
cd packages/drwil
npm pack                 # builds (prepack), then produces drwil-<version>.tgz
```

The version comes from `packages/drwil/package.json`; creating it (tag,
release note, attached tarball) follows `docs/recipes/create-a-release.md`,
which also renames the changelog's "Unreleased" section.

A project already equipped by an earlier version (before 0.10.0, which splits
the base hooks into smaller modules) removes the kit and installs it again:
`npx drwil uninstall --yes`, then `init`.

## 5. Using an AI tool other than Claude

`AGENTS.md` is the shared entry point; tool-specific files (e.g.
`CLAUDE.md`, `GEMINI.md` — if present) only point to it. A new tool: have
it read `AGENTS.md` first, without duplicating its content.
