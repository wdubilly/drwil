// Git side of the scope gate (split from scope-gate.mjs): the merge resolution (QUA-111), the reference
// branch, the rebase in progress, and the widening of the active brief's scope block (QUA-213).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { readBlock } from "./scope.mjs";

export function git(root, args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout : null;
}

/** `mode sha` of `f` in `rev` (null: the index); "" when absent; null when git fails. */
function entry(root, rev, f) {
  const args = rev ? ["ls-tree", "-z", "--full-tree", rev, "--", f] : ["ls-files", "--stage", "-z", "--", f];
  const out = git(root, ["--literal-pathspecs", ...args]);
  if (out === null) return null;
  const line = out.split("\0").find((l) => l.endsWith(`\t${f}`));
  if (!line) return "";
  // ls-tree: `mode type sha`; ls-files --stage: `mode sha stage`.
  const fields = line.split("\t")[0].split(" ");
  return `${fields[0]} ${fields[rev ? 2 : 1]}`;
}

/**
 * QUA-111: during a merge (MERGE_HEAD), only the resolution is the author's: a staged file identical to
 * one of the two parents (deleted and absent there included) is brought as it is, not judged. A failed
 * git call keeps the file judged, never lets it pass (QUA-013).
 */
export function resolution(root, staged) {
  if (git(root, ["rev-parse", "--verify", "--quiet", "MERGE_HEAD^{commit}"]) === null) return staged;
  return staged.filter((f) => {
    const own = entry(root, null, f);
    if (own === null) return true;
    return !["HEAD", "MERGE_HEAD"].some((rev) => entry(root, rev, f) === own);
  });
}

/** Merge base of HEAD with the reference branch (`DRWIL_BASE`, origin/HEAD, master, main), or null. */
export function reference(root, env) {
  const candidates = env.DRWIL_BASE ? [env.DRWIL_BASE] : [];
  const origin = git(root, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"]);
  if (origin) candidates.push(origin.trim());
  candidates.push("origin/master", "origin/main", "master", "main");
  for (const ref of candidates) {
    if (git(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]) === null) continue;
    const base = git(root, ["merge-base", "HEAD", ref]);
    if (base) return base.trim();
  }
  return null;
}

/** True while git replays existing commits (rebase): their message, trailer included, is kept as it is. */
export function replaying(root) {
  return ["rebase-merge", "rebase-apply"].some((name) => {
    const path = git(root, ["rev-parse", "--git-path", name]);
    return path !== null && existsSync(resolve(root, path.trim()));
  });
}

/**
 * QUA-213: paths added to / removed from the scope block of `brief` by the commit being prepared (index
 * against HEAD, raw patterns, copies not expanded). Null when nothing changed, or when the brief is not
 * in HEAD (a brief being created widens nothing).
 */
export function scopeChange(root, brief) {
  const before = git(root, ["show", `HEAD:${brief}`]);
  const after = git(root, ["show", `:${brief}`]);
  if (before === null || after === null) return null;
  const old = readBlock(before).patterns;
  const now = readBlock(after).patterns;
  const added = now.filter((p) => !old.includes(p));
  const removed = old.filter((p) => !now.includes(p));
  return added.length || removed.length ? { added, removed } : null;
}
