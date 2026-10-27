# Installing drwil from source

drwil is not published on npm yet: use it from a clone of this repository,
or from the tarball attached to a GitHub release (see `README.md`,
"Installation" section).

## 1. Prerequisites

- Node.js (see the tested matrix in `.github/workflows/ia-first.yml`,
  cross-tested on Linux/macOS/Windows);
- npm (shipped with Node.js).

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
