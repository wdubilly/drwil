// Resume after a detour (QUA-050), split from detour.mjs, which re-exports it: once the detour's PR is
// merged (by squash too: `branchMerged` in close.mjs), back to the workstream's branch brought up to the
// fixed main branch, the work restored, the state pointed back at the workstream's brief.
// A branch already pushed (an upstream, or one that cannot be read) is never rewritten: the main branch is
// merged into it (merge commit, the repository's hooks run); a branch never pushed is rebased; a branch that
// already contains the main branch is taken as it is. A conflict limited to the journal, both sides having
// only appended to it, keeps both entries, the main branch's first (QUA-300); any other conflict refuses. Any
// failed step puts the state, the branch and the set-aside work back as they were: a failed git call refuses,
// never a success (QUA-013).
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
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
 * The journal both sides only appended to, the main branch's entries first, then the workstream's; null when
 * either side changed what was there before (QUA-300). The same entry on both sides is kept once.
 */
export function appendBoth(before, main, work) {
  if (before === null || main === null || work === null) return null;
  if (!main.startsWith(before) || !work.startsWith(before)) return null;
  const added = work.slice(before.length);
  if (added === main.slice(before.length)) return main;
  return main + (main === "" || main.endsWith("\n") ? "" : "\n") + added;
}

/** Content of the index stage `n` of `file` (untrimmed), or null. */
const stage = (root, n, file) => {
  const r = run(root, ["show", `:${n}:${file}`]);
  return r.status === 0 ? r.stdout : null;
};

/**
 * Settles a stopped merge or rebase when the journal is the only file in conflict and a pure append on both
 * sides (`appendBoth`), and stages it. `mainStage`: 3 in a merge (theirs: the main branch), 2 in a rebase
 * (ours: the main branch being built upon). False for any other conflict, or when git cannot say.
 */
function settleJournal(root, mainStage) {
  const files = git(root, "diff", "--name-only", "--diff-filter=U");
  if (files !== JOURNAL) return false;
  const text = appendBoth(stage(root, 1, JOURNAL), stage(root, mainStage, JOURNAL), stage(root, 5 - mainStage, JOURNAL));
  if (text === null) return false;
  writeFileSync(join(root, JOURNAL), text);
  return git(root, "add", "--", JOURNAL) !== null;
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
    // `-m`, not `--no-edit`: the latter would keep git's "# Conflicts:" lines in the message.
    if (settleJournal(root, 3) && run(root, ["commit", "-q", "-m", mergeMessage]).status === 0) return { how: "merge", ok: true };
    git(root, "merge", "--abort");
    return { how: "merge", ok: false };
  }
  let r = run(root, ["rebase", "-q", base]);
  // Each replayed commit can stop on the journal again; the hooks run on each `--continue`.
  while (r.status !== 0 && settleJournal(root, 2)) r = run(root, ["-c", "core.editor=true", "rebase", "--continue"]);
  if (r.status === 0) return { how: "rebase", ok: true };
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
