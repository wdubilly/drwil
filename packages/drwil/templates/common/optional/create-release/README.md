# Create a release (optional)

Module **not installed by default**: `scaffold()` does not copy this
folder. Posts an **annotated Git tag** (`vX.Y.Z`) and a **GitHub release
note** (`gh release create --generate-notes`) on the current commit — never
a modified tracked file (no committed `CHANGELOG.md`, no `package.json`
bump): compatible with QUA-017 (no direct commit on the main branch)
without an extra PR.

## Contents

- `create-release.mjs`: computes the next version from the latest final tag
  and the non-merge commits since that tag (Conventional Commits, best effort
  — no message format is imposed, safe default: *patch* bump if no `feat`
  or breaking type is recognised), then posts the tag and the release.
  `--dry-run` mode: prints the computed version without creating anything.
  `--candidate`: publishes a candidate pre-release instead (`vX.Y.Z-rc.N`),
  see « Acceptance before publication » below.
- `acceptance-sheet.mjs`: generates the acceptance sheet of a candidate
  (imported by `create-release.mjs --candidate`, never written by hand).
- `release-verdict.mjs`: records the acceptance verdict on a candidate — a
  **human** gesture (interactive terminal, the candidate's name typed back);
  an agent never runs it.
- `promote-release.mjs`: promotes an approved candidate to the final release.

## Acceptance before publication (candidate, verdict, promotion)

For a project whose versions are validated by an acceptance team that does
not read the repository:

1. `node .githooks/create-release.mjs --candidate` publishes a GitHub
   **pre-release** `vX.Y.Z-rc.N` with the tarball and a generated
   acceptance sheet (Markdown, attached and shown as the release note), from
   the latest final tag to the candidate. On top, **to validate**: each
   point says what to look at and how — human acceptance criteria of the
   workstreams, sentences about a trial for real, known limits from the
   journal, attestations to redo — with a stable ID (`vX.Y.Z-P<n>`) and the
   link to its workstream's PR (found through the `Drwil-Brief` trailer of
   the commits). Below, the **non-regression** already proven: `drwil
   verify` verdict, contracts proven by a test (IDs and titles), OS tested
   by the CI on the commit, tarball fingerprint (sha256). `--candidate
   --dry-run` prints the sheet without building or publishing anything.
2. The acceptance team gives its verdict (human command):
   `node .githooks/release-verdict.mjs vX.Y.Z-rc.N --approve`, or
   `--reserve <point>` / `--refuse <point>` for each point concerned
   (`--note <text>` optional). The verdict keeps who gave it (GitHub
   identity) and when, and is recorded on the pre-release (asset
   `recette-verdict.json`, summary added to its note) — never in a commit.
   Each reserve and each refusal becomes a GitHub issue, sorted afterwards
   as a defect to fix or an intent (recipe « fix a defect »).
3. `node .githooks/promote-release.mjs vX.Y.Z-rc.N` (`--dry-run` to
   preview) refuses a candidate without a verdict or refused; approved, with
   or without reserves, it tags the same commit `vX.Y.Z` and publishes the
   final release with the same tarball (fingerprint checked against the
   sheet), the reserves listed in its note. It becomes `releases/latest`,
   which never shows a pre-release: a README can link there once and for
   all, with no commit at each version.

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

1. Copy the module's `.mjs` files (`create-release.mjs`,
   `acceptance-sheet.mjs`, `release-verdict.mjs`, `promote-release.mjs`)
   into the project's `.githooks/` — `create-release.mjs` alone is enough
   without the candidate path.
2. Preview without creating anything: `node .githooks/create-release.mjs --dry-run`.
3. Actually create the tag and the release: `node .githooks/create-release.mjs`
   (needs `git push` to `origin` and an authenticated `gh` for the release
   note — the tag is created even if `gh` fails).

Accepted limit: designed for GitHub (`gh release create`). On GitLab, the
Git tag is posted the same way (`git tag` + `git push`), but the release
note has to be created through GitLab's Releases API (not covered here —
to adapt, best effort as for `alert-if-ci-broken`).
