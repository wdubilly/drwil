// Overlap of two briefs' scopes (split from briefs.mjs, which re-exports it).
import { spawnSync } from "node:child_process";
import { config, DEFAULT_INDEX } from "./briefs.mjs";
import { fnmatch, readBlock, withMirrors } from "./scope.mjs";

const wildcardAt = (p) => [...p].findIndex((c) => c === "*" || c === "?");

// Can one path match both patterns? Exact for a literal, conservative (shared prefix) for two globs.
function patternsMeet(a, b) {
  const [ia, ib] = [wildcardAt(a), wildcardAt(b)];
  if (ia === -1 && ib === -1) return a === b;
  if (ia === -1) return fnmatch(a, b);
  if (ib === -1) return fnmatch(b, a);
  const [pa, pb] = [a.slice(0, ia), b.slice(0, ib)];
  return pa.startsWith(pb) || pb.startsWith(pa);
}

/**
 * First pair of `scope` patterns (committed in HEAD, installed copies included) that two briefs
 * share: `{ a, b }`, or null. Two workstreams in parallel on such files would meet at the merge.
 * The workstreams' index and journal do not count: nearly every brief declares them for its closing,
 * and their closing conflict is resolved by the workstream's subagent (QUA-148).
 */
export function scopesOverlap(root, briefA, briefB) {
  const dirs = config(root).dirs ?? {};
  const closing = new Set([dirs.index ?? DEFAULT_INDEX[0], `${dirs.projects ?? "docs/projects"}/journal.md`]);
  const patterns = (brief) => {
    const r = spawnSync("git", ["show", `HEAD:${brief}`], { cwd: root, encoding: "utf8" });
    return r.status === 0 ? withMirrors(readBlock(r.stdout).patterns, config(root)).filter((p) => !closing.has(p)) : [];
  };
  const [pa, pb] = [patterns(briefA), patterns(briefB)];
  for (const a of pa) for (const b of pb) if (patternsMeet(a, b)) return { a, b };
  return null;
}
