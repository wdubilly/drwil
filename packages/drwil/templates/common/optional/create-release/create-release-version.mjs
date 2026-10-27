// Version of a release (create-release.mjs): latest tag, commits since, Conventional Commits bump,
// publishable npm packages, decision of the version and candidate tag. Re-exported by create-release.mjs.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fill, texts } from "./create-release-texts.mjs";

export function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

export function latestTag() {
  try {
    // stderr captured (not "inherit"): no tag is the normal state of a first call, not an error
    // to show to the user.
    // A candidate (vX.Y.Z-rc.N) is never the latest final tag: the range and the version start
    // from the last final release.
    return execFileSync("git", ["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*.[0-9]*.[0-9]*", "--exclude", "*-*"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null; // no tag: first release
  }
}

export function commitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const out = git(["log", range, "--no-merges", "--pretty=%s%x1f%b%x1e"]);
  if (!out) return [];
  return out
    .split("\x1e")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [subject, body = ""] = s.split("\x1f");
      return { subject: subject.trim(), body: body.trim() };
    });
}

// Detects the semver bump from a list of commits (Conventional Commits, best-effort).
// Exported for the unit test.
export function detectBump(commits) {
  if (commits.length === 0) return null;
  let bump = "patch"; // safe default: every merged workstream deserves at least a patch
  for (const { subject, body } of commits) {
    const m = /^(\w+)(\([^)]*\))?(!)?:\s/.exec(subject);
    const breaking = (m && m[3] === "!") || /BREAKING CHANGE/.test(body) || /BREAKING CHANGE/.test(subject);
    if (breaking) return "major"; // announced break: absolute priority, no need to go on
    if (m && m[1] === "feat") bump = "minor";
  }
  return bump;
}

export function nextVersion(tag, bump) {
  const base = tag ? tag.replace(/^v/, "") : "0.0.0";
  let [maj, min, pat] = base.split(".").map((n) => parseInt(n, 10) || 0);
  if (bump === "major") {
    maj += 1;
    min = 0;
    pat = 0;
  } else if (bump === "minor") {
    min += 1;
    pat = 0;
  } else {
    pat += 1;
  }
  return `v${maj}.${min}.${pat}`;
}

// Finds the repository's publishable npm packages (package.json tracked by Git, with a "name" and
// without "private": true) — ignores the root package.json of a private monorepo (workspaces) and
// any package explicitly marked private. Best-effort: an unreadable/invalid package.json is
// ignored, not an error.
export function publicPackages() {
  let files;
  try {
    files = git(["ls-files", "--", "package.json", "*/package.json", "*/*/package.json", "*/*/*/package.json"]).split("\n").filter(Boolean);
  } catch {
    return [];
  }
  const dirs = [];
  for (const f of files) {
    try {
      const pkg = JSON.parse(readFileSync(f, "utf8"));
      if (pkg.private || !pkg.name) continue;
      dirs.push(dirname(f));
    } catch {
      // unreadable or invalid package.json: ignored, not blocking for the release
    }
  }
  return dirs;
}

// Versions declared by the publishable packages: [{ dir, version }].
export function packageVersions(dirs) {
  return dirs.map((dir) => {
    try {
      return { dir, version: JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version ?? null };
    } catch {
      return { dir, version: null };
    }
  });
}

function compare(a, b) {
  const p = (v) =>
    v
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const [x, y] = [p(a), p(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// Decides the release version (pure, exported for the tests). With npm packages, the tag follows
// their package.json: a single number for the tag, the tarball and `--version`, never two that
// diverge. Returns { next, source } or { error }; null if there is nothing to publish.
export function decideVersion({ latest, bump, versions = [], existingTags = [] }, T = texts()) {
  if (!bump) return null;
  if (!versions.length) return { next: latest ? nextVersion(latest, bump) : "v0.1.0", source: "commits" };
  const distinct = [...new Set(versions.map((v) => v.version))];
  if (distinct.length > 1) return { error: fill(T.disagree, versions.map((v) => `${v.dir}@${v.version}`).join(", ")) };
  if (!/^\d+\.\d+\.\d+$/.test(distinct[0] ?? "")) return { error: fill(T.notSemver, distinct[0], versions[0].dir) };
  const next = `v${distinct[0]}`;
  if (existingTags.includes(next)) return { error: fill(T.exists, next, T.fix) };
  if (latest && compare(next, latest) <= 0) return { error: fill(T.notHigher, next, latest, T.fix) };
  return { next, source: `package.json (${versions.map((v) => v.dir).join(", ")})` };
}

/** Next candidate tag of a version: `vX.Y.Z-rc.N`, N one more than the highest existing (QUA-051). */
export function candidateTag(version, existingTags) {
  const prefix = `${version}-rc.`;
  const n = existingTags.filter((t) => t.startsWith(prefix)).map((t) => parseInt(t.slice(prefix.length), 10) || 0);
  return `${prefix}${Math.max(0, ...n) + 1}`;
}
