// Resume after a detour (QUA-050), split from detour.mjs, which re-exports it: once the detour's PR is
// merged (by squash too: `branchMerged` in close.mjs), back to the workstream's branch brought up to the
// fixed main branch, the work restored, the state pointed back at the workstream's brief.
// A branch already pushed (an upstream, or one that cannot be read) is never rewritten: the main branch is
// merged into it (merge commit, the repository's hooks run); a branch never pushed is rebased; a branch that
// already contains the main branch is taken as it is. Any failed step puts the state, the branch and the
// set-aside work back as they were: a failed git call refuses, never a success (QUA-013).
import { spawnSync } from "node:child_process";
import { config } from "./briefs.mjs";
import { branchMerged, mainBranch, mergedPullRequests, noGhText } from "./close.mjs";
import { JOURNAL, TEXTS } from "./detour-texts.mjs";
import { readState, setDetour, writeState } from "./state.mjs";
import { fill } from "./state-texts.mjs";

const texts = (root) => TEXTS[config(root).lang === "en" ? "en" : "fr"];
const done = (message) => ({ code: 0, message });
const refused = (message) => ({ code: 1, message });
const run = (root, args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });

/** Output of `git <args>`, trimmed, or null when git fails. */
export const git = (root, ...args) => {
  const r = run(root, args);
  return r.status === 0 ? r.stdout.trim() : null;
};

/** The ref a detour starts from and a resume brings the workstream up to: the remote main branch, fetched, if any; else the local one. */
export function baseRef(root, main) {
  if (git(root, "rev-parse", "--verify", "--quiet", `refs/remotes/origin/${main}`) === null) return main;
  git(root, "fetch", "-q", "origin", main);
  return `origin/${main}`;
}

/**
 * True when `branch` was pushed: an upstream, an upstream configured but gone, or a remote-tracking branch
 * of the same name. Anything git cannot answer counts as pushed: in doubt, never a rewrite.
 */
function pushed(root, branch) {
  if (git(root, "rev-parse", "--abbrev-ref", "--symbolic-full-name", `${branch}@{u}`) !== null) return true;
  // `git config --get` exits with 1 for a missing key only.
  if (run(root, ["config", "--get", `branch.${branch}.remote`]).status !== 1) return true;
  const remote = git(root, "for-each-ref", "--format=%(refname)", `refs/remotes/*/${branch}`);
  return remote === null || remote !== "";
}

/**
 * Brings the workstream's branch (checked out) up to `base`. `{ how, ok }`: `how` is "upToDate", "merge" or
 * "rebase" (null when git cannot say); a failed merge or rebase is aborted.
 */
function catchUp(root, base, mergeMessage, branch) {
  // `--is-ancestor` exits with 1 for "no" only; any other failure refuses.
  const ancestor = run(root, ["merge-base", "--is-ancestor", base, "HEAD"]).status;
  if (ancestor === 0) return { how: "upToDate", ok: true };
  if (ancestor !== 1) return { how: null, ok: false };
  if (pushed(root, branch)) {
    if (run(root, ["merge", "-q", "--no-ff", "-m", mergeMessage, base]).status === 0) return { how: "merge", ok: true };
    git(root, "merge", "--abort");
    return { how: "merge", ok: false };
  }
  if (run(root, ["rebase", "-q", base]).status === 0) return { how: "rebase", ok: true };
  git(root, "rebase", "--abort");
  return { how: "rebase", ok: false };
}

/** Closes the detour and goes back to the workstream (see the header). `{ code, message }`. */
export function resume(root, { now = new Date().toISOString(), gh } = {}) {
  const T = texts(root);
  const { state } = readState(root);
  const d = state.detour;
  if (!d) return refused(T.noDetour);
  if (git(root, "status", "--porcelain") !== "") return refused(T.dirty);
  const base = baseRef(root, mainBranch(root) ?? "main");
  // A PR merged by squash leaves no trace git can see: gh proves it (QUA-058), git alone without it (QUA-059).
  let merged = branchMerged(root, d.branch, base, []);
  if (merged === "no") merged = branchMerged(root, d.branch, base, mergedPullRequests(root, { branch: d.branch, gh }));
  if (merged === "unknown") return refused(`${fill(T.notMerged, d.branch, base)} (${noGhText(root)})`);
  if (merged === "no") return refused(fill(T.notMerged, d.branch, base));
  if (git(root, "cat-file", "-e", `${base}:${state.active_brief}`) !== null) return refused(fill(T.briefLeft, state.active_brief, base));
  if (!(git(root, "show", `${base}:${JOURNAL}`) ?? "").includes(d.branch)) return refused(fill(T.noJournal, d.branch, base));
  let n = -1;
  if (d.stash) {
    const stashes = git(root, "stash", "list", "--format=%H");
    n = stashes === null ? -1 : stashes.split("\n").indexOf(d.stash);
    if (n < 0) return refused(fill(T.stashMissing, d.stash.slice(0, 7)));
  }
  if (git(root, "switch", "-q", d.origin_branch) === null) return refused(fill(T.switchBack, d.origin_branch));
  const before = git(root, "rev-parse", "HEAD");
  if (before === null) return refused(fill(T.gitFailed, d.origin_branch, base));
  // The merge commit is made under the workstream's brief: its hook gives it that brief's trailer.
  setDetour(root, d.origin_brief, null, now);
  /** Puts the branch back at its commit, the worktree clean and the state as it was; the stash is never touched. */
  const undo = (message) => {
    git(root, "reset", "-q", "--hard", before);
    git(root, "clean", "-fdq");
    writeState(root, state);
    return refused(message);
  };
  const { how, ok } = catchUp(root, base, fill(T.mergeMessage, d.branch, base), d.origin_branch);
  if (!ok) return undo(fill(how === null ? T.gitFailed : T[how], d.origin_branch, base));
  if (d.stash) {
    // The worktree was clean before the apply: what is there after a failed one comes from the stash, which stays.
    if (git(root, "stash", "apply", "-q", `stash@{${n}}`) === null) return undo(fill(T.restore, d.stash.slice(0, 7)));
    if (git(root, "stash", "drop", "-q", `stash@{${n}}`) === null) return undo(fill(T.restore, d.stash.slice(0, 7)));
  }
  return done(fill(T.resumed[how], d.origin_brief, d.origin_branch, base));
}
