# Recipe: create a release (tag + GitHub note)

Goal: mark a merged chantier with a Git tag (`vX.Y.Z`) and a release
note, without publishing to npm and without committing any file
(compatible with a "no direct commit on the main branch" contract, if
adopted).

This is **not installed by default**: the script that computes and posts
the release is an optional module, like the dashboard — see the README
in `templates/common/optional/creer-une-release/` (module shipped by the
kit package) to activate it, copied to
`.githooks/creer-release.mjs` (to create). Like a commit or a push, this
script only runs on the user's explicit request, never on its own in CI.

## Method (once the module is activated)

1. Preview without creating anything: `node .githooks/creer-release.mjs
   --dry-run` — shows the last tag, the detected bump (major/minor/patch)
   and the next version.
2. The bump is computed *best-effort* from non-merge commit messages
   since the last tag, Conventional-Commits style (`feat:` → minor, an
   announced breaking change → major, otherwise patch by default). No
   format is enforced: a message without a recognized prefix still falls
   back to the default (patch).
3. Create for real: `node .githooks/creer-release.mjs` (annotated tag
   pushed to `origin`, then `gh release create --generate-notes` if `gh`
   is available and authenticated).
4. Wrong version for once (miscalculated tag): delete the tag (`git tag
   -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`) and rerun once the
   fix is in place — never rewrite shared history.

## Assumed limits

- Designed for GitHub (`gh release create`); on GitLab, only the Git tag
  is posted by the script, the release note still needs to be created
  via the GitLab Releases API (best-effort, not covered).
- Never publishes to npm: a separate decision, out of scope for this
  recipe.
