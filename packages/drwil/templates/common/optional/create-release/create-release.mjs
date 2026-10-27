#!/usr/bin/env node
// Puts a Git tag (vX.Y.Z) + a GitHub release note on the current commit, to trace the merged
// workstreams without publishing to npm.
// NEVER modifies a tracked file (QUA-017: no commit on the main branch): only a Git tag and a
// GitHub release (outside the repository) are created. Version: that of the repository's
// publishable npm packages (package.json, single source decided and reviewed in a PR); without an
// npm package, computed from the commit messages the Conventional Commits way, best-effort (safe
// default: "patch" bump if no type is recognised). The version logic is in create-release-version.mjs
// and the messages in create-release-texts.mjs (both re-exported here).
// `--candidate` (QUA-051): publishes the version as a candidate pre-release (vX.Y.Z-rc.N) with its
// tarball and its generated acceptance sheet (acceptance-sheet.mjs); the final release only comes
// from promote-release.mjs, after the human verdict (release-verdict.mjs).
// Without `--candidate`, the version is published directly: its acceptance note, « no verdict », is
// then proposed through a dedicated branch and a PR (recette-note.mjs, QUA-079); a failure there
// never undoes the tag and the release (QUA-080).
// Before any tag, preview included, the review of README.md, docs/features.md and
// docs/architecture.md must be done (release-review.mjs, QUA-098): otherwise the release is refused.
// Usage: node create-release.mjs [--candidate] [--dry-run]
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync, mkdtempSync, writeFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { TEXTS, fill, texts } from "./create-release-texts.mjs";
import {
  candidateTag,
  commitsSince,
  decideVersion,
  detectBump,
  git,
  latestTag,
  nextVersion,
  packageVersions,
  publicPackages,
} from "./create-release-version.mjs";

export { texts, candidateTag, decideVersion, detectBump, nextVersion, packageVersions, publicPackages };

const dryRun = process.argv.includes("--dry-run");
const candidate = process.argv.includes("--candidate");

// Builds a tarball (npm pack) for each publishable package found, in a temporary folder, and
// returns the paths of the produced .tgz.
function buildTarballs(dirs, T) {
  const out = [];
  if (dirs.length === 0) return out;
  const dest = mkdtempSync(join(tmpdir(), "create-release-"));
  for (const dir of dirs) {
    try {
      const packed = execFileSync("npm", ["pack", "--silent", "--pack-destination", dest], { cwd: dir, encoding: "utf8" }).trim();
      out.push(join(dest, packed.split("\n").pop()));
    } catch (e) {
      console.error(fill(T.packFailed, dir, e.message));
    }
  }
  return out;
}

// Candidate pre-release: tarballs and sheet first (a failure leaves no tag), then the tag, then the
// pre-release carrying the tarballs and the sheet (attached, and as its note: GitHub shows it).
async function publishCandidate({ tag, next, packages, existingTags }, T) {
  const { buildSheet } = await import("./acceptance-sheet.mjs");
  const rc = candidateTag(next, existingTags);
  console.log(fill(T.candidate, rc));
  const tarballs = dryRun ? null : buildTarballs(packages, T);
  const sheet = buildSheet(process.cwd(), { tag: rc, version: next, from: tag, tarballs, packages: packages.length ? packages : null });
  if (dryRun) {
    console.log(`${fill(T.sheet, rc)}\n\n${sheet}`);
    console.log(T.dryRun);
    return;
  }
  const file = join(mkdtempSync(join(tmpdir(), "create-release-")), `recette-${rc}.md`);
  writeFileSync(file, sheet);
  git(["tag", "-a", rc, "-m", `Candidate ${rc}`]);
  git(["push", "origin", rc]);
  console.log(fill(T.pushed, rc));
  const args = ["release", "create", rc, ...tarballs, file, "--prerelease", "--title", rc, "--notes-file", file];
  try {
    execFileSync("gh", args, { stdio: "inherit" });
    console.log(fill(T.prerelease, rc, file));
  } catch (e) {
    console.error(fill(T.ghFailed, e.message));
    console.error(fill(T.catchUp, `gh ${args.join(" ")}`));
  }
}

// Acceptance note of a version published without a candidate: « no verdict », to complete by hand.
// `tarballs` null in --dry-run (nothing built).
async function directNote({ next, commits, tarballs }) {
  const { noteTexts, publishNote, renderNote } = await import("./recette-note.mjs");
  const { sha256 } = await import("./acceptance-sheet.mjs");
  const note = renderNote(
    {
      version: next,
      tarballs: tarballs?.filter(existsSync).map((f) => ({ name: basename(f), sha256: sha256(f) })),
      commits: commits.map((c) => c.subject),
      date: new Date().toISOString().slice(0, 10),
    },
    noteTexts(process.cwd()),
  );
  return publishNote(process.cwd(), { version: next, note, dryRun }, {});
}

async function main() {
  const T = texts();
  const tag = latestTag();
  const commits = commitsSince(tag);
  const bump = detectBump(commits);
  const packages = publicPackages();
  const existingTags = git(["tag", "-l", "v*"]).split("\n").filter(Boolean);
  const decision = decideVersion({ latest: tag, bump, versions: packageVersions(packages), existingTags }, T);
  if (!decision) {
    // Without a commit to publish, there is necessarily a tag: a repository without commits fails at `git log`.
    console.log(fill(T.nothing, tag));
    return;
  }
  console.log(fill(T.lastTag, tag ?? T.none));
  if (decision.error) {
    console.error(fill(T.refused, decision.error));
    process.exitCode = 1;
    return;
  }
  const next = decision.next;
  console.log(fill(T.bump, packages.length ? T.suggestion : T.detected, bump, commits.length));
  console.log(fill(T.next, next, decision.source));
  if (packages.length > 0) console.log(fill(T.tarballs, packages.join(", ")));
  const { reviewDocuments } = await import("./release-review.mjs");
  const review = reviewDocuments(process.cwd(), { tag, version: next, lang: T === TEXTS.en ? "en" : "fr" });
  console.log(review.lines.join("\n"));
  if (!review.ok) {
    console.error(fill(T.refused, review.refused));
    process.exitCode = 1;
    return;
  }
  if (candidate) return publishCandidate({ tag, next, packages, existingTags }, T);
  if (dryRun) {
    console.log((await directNote({ next, commits, tarballs: packages.length ? null : [] })).message);
    console.log(T.dryRun);
    return;
  }
  const notes = commits.map((c) => `- ${c.subject}`).join("\n");
  git(["tag", "-a", next, "-m", `Release ${next}\n\n${notes}`]);
  git(["push", "origin", next]);
  console.log(fill(T.pushed, next));
  const tarballs = buildTarballs(packages, T);
  try {
    execFileSync("gh", ["release", "create", next, ...tarballs, "--generate-notes"], { stdio: "inherit" });
    if (tarballs.length > 0) console.log(fill(T.attached, tarballs.join(", ")));
  } catch (e) {
    console.error(fill(T.ghFailed, e.message));
    console.error(fill(T.catchUp, `gh release create ${next} --generate-notes${tarballs.length ? ` ${tarballs.join(" ")}` : ""}`));
  }
  const written = await directNote({ next, commits, tarballs });
  (written.code === 0 ? console.log : console.error)(written.message);
}

// Only runs when launched directly (node create-release.mjs), not when detectBump/nextVersion are
// imported for a unit test. Real paths on both sides (QUA-044): a "file://" + argv[1] concatenation
// fails on Windows (D:\... against file:///D:/...), and a URL comparison fails through a symbolic
// link (/var → /private/var on macOS) — main() would silently never run.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) await main();
