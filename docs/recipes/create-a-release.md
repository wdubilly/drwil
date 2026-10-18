# Recipe: create a release (tag + GitHub note)

Goal: mark a merged workstream with a Git tag (`vX.Y.Z`) and a release
note, without publishing to npm and without committing any file
(compatible with a "no direct commit on the main branch" contract, if
adopted).

This is **not installed by default** in the kit's template: the script
is an optional module, like the dashboard — see the README in
`templates/common/optional/create-release/` (module shipped by the kit
package). On this repository, it is already activated as
`.githooks/create-release.mjs`. Like a commit or a push, this script only
runs on the user's explicit request, never on its own in CI.

## Publication green light

Creating the release (step 3 below) posts a tag and a note that everyone
sees: by default it is a gesture **after agreement** — the agent shows
the `--dry-run` result and waits for the human's yes before creating
anything.

The human can give that yes **at launch** instead, so that a queue of
workstreams run by sub-agents (which cannot ask a question) publishes
without stopping: an explicit sentence in the request that launches the
workstream or the queue, naming the version — e.g. « publication green
light: v1.4.0 ». The agent that orchestrates passes it verbatim to the
sub-agent in charge of the release. With that green light, the agent
runs the `--dry-run`, then creates the release only if the computed
version is the one named and the script refused nothing; otherwise, or
without a green light, it stops after the `--dry-run` and gives the human
the exact command to run. The green light covers one release, never the
following ones, and never an npm publication (see « Assumed limits »).

## Method (once the module is activated)

1. Preview without creating anything: `node .githooks/create-release.mjs
   --dry-run` — shows the last tag, the detected bump (major/minor/patch)
   and the next version.
2. The version: when there are publishable npm packages (tracked
   package.json, with a `name`, without `"private": true`), the tag is
   **`v` + their `version`** — single source, decided in a PR with
   `npm version patch|minor|major --no-git-tag-version`. The script refuses
   (exit 1, `--dry-run` included) a tag that already exists, a version that
   does not increase, or packages that disagree. Without an npm package,
   the version is computed *best-effort* from commit messages since the
   last tag, Conventional-Commits style (`feat:` → minor, announced
   breaking change → major, otherwise patch by default); with packages,
   that computation is only a displayed suggestion. In the same PR, if the
   project keeps a `CHANGELOG.md` (if present), its « Unreleased » section, fed by each
   workstream's closing, is renamed to that version (a new empty
   « Unreleased » above it).
3. Create for real, after the human's agreement or with the green light
   given at launch (see above): `node .githooks/create-release.mjs`
   (annotated tag pushed to `origin`, then `gh release create
   --generate-notes` if `gh` is available and authenticated).
4. If the repo contains one or more publishable npm packages (tracked
   package.json, with a `name`, without `"private": true`), a tarball
   (`npm pack`) is built for each and attached as a downloadable asset on
   the GitHub release — handy to hand the package to someone to try
   without publishing to npm (that is the case of `packages/drwil` on this
   repository). `--dry-run` lists the packages that would be packed
   without building anything.
5. Wrong version for once (miscalculated tag): delete the tag (`git tag
   -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`) and rerun once the
   fix is in place — never rewrite shared history.

## Assumed limits

- Designed for GitHub (`gh release create`); on GitLab, only the Git tag
  is posted by the script, the release note still needs to be created
  via the GitLab Releases API (best-effort, not covered).
- Never publishes to npm: a separate decision, out of scope for this
  recipe.
