// Reopening of a closed workstream (split from state-cli.mjs; QUA-116).
import { spawnSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ghRun, mainBranch } from "./close.mjs";
import { readState, writeState } from "./state.mjs";
import { fill } from "./state-texts.mjs";
import { texts } from "./state-validate.mjs";

/**
 * Reopens a closed workstream whose pull request revealed a defect before its merge (QUA-116): from
 * CLOSING, on the workstream's branch, clean worktree, its PR open. The automatic merge is cancelled
 * first (a branch whose merge is scheduled receives no push); the brief comes back as it was before the
 * commit that deleted it, in a commit of its own (hooks run); then BUILD on it, `reopened` set, the
 * merge authorisation and the queue kept. History is never rewritten, nothing is pushed. Refused
 * without changing anything otherwise; a failed git or gh call refuses, never lets through (QUA-013).
 * `{ code, message }`.
 */
export function reopen(root, { gh = ghRun, now = new Date().toISOString() } = {}) {
  const T = texts(root);
  const refused = (key, ...args) => ({ code: 1, message: fill(T[key], ...args) });
  const raw = (...args) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    return r.status === 0 ? r.stdout : null;
  };
  const git = (...args) => raw(...args)?.trim() ?? null;
  const { state } = readState(root);
  const brief = state.active_brief;
  if (state.activity !== "CLOSING" || !brief) return refused("reopenFrom", state.activity);
  if (git("status", "--porcelain") !== "") return refused("reopenDirty");
  const main = mainBranch(root);
  const branch = git("symbolic-ref", "--quiet", "--short", "HEAD");
  if (!main || !branch || branch === main) return refused("reopenBranch");
  const view = () => {
    try {
      const pr = JSON.parse(gh(root, ["pr", "view", branch, "--json", "number,state,autoMergeRequest"]) ?? "");
      return pr && Number.isInteger(pr.number) && typeof pr.state === "string" ? pr : null;
    } catch {
      return null;
    }
  };
  const pr = view();
  if (!pr) return refused("reopenUnknown", branch);
  if (pr.state !== "OPEN") return refused("reopenNotOpen", pr.number, pr.state);
  // The brief before the closing: the parent of the branch's commit that deleted it; still in HEAD, nothing to restore.
  let text = null;
  if (git("cat-file", "-e", `HEAD:${brief}`) === null) {
    const closing = git("log", "-1", "--diff-filter=D", "--format=%H", `${main}..HEAD`, "--", brief);
    text = closing ? raw("show", `${closing}^:${brief}`) : null;
    if (!text) return refused("reopenNoBrief", brief, branch);
  }
  let cancelled = "";
  if (pr.autoMergeRequest) {
    const after = gh(root, ["pr", "merge", String(pr.number), "--disable-auto"]) === null ? null : view();
    if (!after || after.autoMergeRequest) return refused("reopenAutoMerge", pr.number);
    cancelled = `\n${T.reopenCancelled}`;
  }
  if (text !== null) {
    writeFileSync(join(root, brief), text);
    let r;
    for (const args of [
      ["add", "--", brief],
      ["commit", "-q", "-m", fill(T.reopenMessage, brief, pr.number), "--", brief],
    ]) {
      r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
      if (r.status !== 0) break;
    }
    if (r.status !== 0) {
      raw("reset", "-q", "--", brief);
      unlinkSync(join(root, brief));
      return { code: 1, message: fill(T.reopenCommitFailed, r.stderr.trim().split("\n").at(-1)) + cancelled };
    }
  }
  writeState(root, { ...state, activity: "BUILD", since: now, reopened: { pr: pr.number } });
  const restored = text === null ? "" : `\n${fill(T.reopenRestored, brief, git("rev-parse", "--short", "HEAD"))}`;
  return { code: 0, message: fill(T.reopened, brief, pr.number) + restored + cancelled };
}
