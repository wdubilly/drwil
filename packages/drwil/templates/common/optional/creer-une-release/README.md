# Create a release (optional)

Module **not installed by default**: `scaffold()` does not copy this
folder. Posts an **annotated Git tag** (`vX.Y.Z`) and a **GitHub release
note** (`gh release create --generate-notes`) on the current commit — never
a modified tracked file (no committed `CHANGELOG.md`, no `package.json`
bump): compatible with QUA-017 (no direct commit on the main branch)
without an extra PR.

## Contents

- `creer-release.mjs`: computes the next version from the latest tag and
  the non-merge commits since that tag (Conventional Commits, best effort
  — no message format is imposed, safe default: *patch* bump if no `feat`
  or breaking type is recognised), then posts the tag and the release.
  `--dry-run` mode: prints the computed version without creating anything.

## npm tarball attached to the release (downloadable)

If the repository holds one or more publishable npm packages (a
`package.json`, if present, tracked by Git, with a `name`, without
`"private": true` — a monorepo with `workspaces` and a private root is no
problem: only non-private packages are picked up), the script builds a
tarball (`npm pack`) for each and attaches it as an asset of the GitHub
release. Anyone visiting the release page can then download the `.tgz`
directly, without cloning the repository or publishing to the npm
registry. `--dry-run` lists the packages that would be packed without
building or attaching anything.

## Manual activation (on explicit request, like a commit or a push)

Like any commit or push, this script must never run on its own: it is
started only when the user explicitly asks (e.g. "make a release", "tag a
version"), not automatically at each merge.

1. Copy `creer-release.mjs` into the project's `.githooks/`.
2. Preview without creating anything: `node .githooks/creer-release.mjs --dry-run`.
3. Actually create the tag and the release: `node .githooks/creer-release.mjs`
   (needs `git push` to `origin` and an authenticated `gh` for the release
   note — the tag is created even if `gh` fails).

Accepted limit: designed for GitHub (`gh release create`). On GitLab, the
Git tag is posted the same way (`git tag` + `git push`), but the release
note has to be created through GitLab's Releases API (not covered here —
to adapt, best effort as for `alerter-si-ci-cassee`).
