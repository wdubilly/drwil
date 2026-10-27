// The merge resolution seen by the scope gate (QUA-111, split from scope-gate.mjs).
import { spawnSync } from "node:child_process";

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
