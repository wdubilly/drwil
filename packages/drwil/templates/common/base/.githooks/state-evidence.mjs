// Verify evidence and who may open rights (split from state.mjs, which re-exports them).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { texts } from "./state-validate.mjs";
import { fill } from "./state-texts.mjs";

// Transitions that open rights: reserved to a human in "human" mode (default).
// The others narrow rights or go back. Closing is no longer one of them
// (docs/ia-first.md, "Starting and closing"): closing removes rights, requires verify
// evidence, and acceptance stays the merge of the PR, a human one.
const HUMAN = new Set(["SCOPING>EXPECTATION", "REQUEST>BUILD"]);

export function requiresHuman(from, to, mode) {
  return mode !== "agent" && HUMAN.has(`${from}>${to}`);
}

/**
 * Latest verify evidence (.drwil/evidence/verify-*.json, outside git): `{ name, data }`, `data` null
 * when the file is unreadable; null without any evidence. Read here alone: the closing's proof file
 * reads the same one (QUA-084).
 */
export function latestEvidence(root) {
  const dir = join(root, ".drwil", "evidence");
  // ISO timestamp in the name: alphabetical order is chronological order.
  const names = existsSync(dir)
    ? readdirSync(dir)
        .filter((n) => /^verify-.+\.json$/.test(n))
        .sort()
    : [];
  const name = names.at(-1);
  if (!name) return null;
  try {
    return { name, data: JSON.parse(readFileSync(join(dir, name), "utf8")) };
  } catch {
    return { name, data: null };
  }
}

/**
 * What the latest evidence says about closing: `{ ok: true }` if it allows it, otherwise
 * `{ ok: false, reason }` (`code` "noEvidence" or "otherCommit" when it is to be renewed). Verdict
 * pass or attested, on the HEAD commit, clean worktree at verify time and now: otherwise, what is
 * closed would not be what was verified.
 */
export function verifyEvidence(root) {
  const T = texts(root);
  const last = latestEvidence(root);
  if (!last) return { ok: false, code: "noEvidence", reason: T.noEvidence };
  const { name, data: ev } = last;
  if (!ev) return { ok: false, reason: fill(T.evidenceUnreadable, name) };
  const git = (...args) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  const head = git("rev-parse", "HEAD");
  if (!head) return { ok: false, reason: T.noHead };
  if (ev.commit !== head) return { ok: false, code: "otherCommit", reason: fill(T.otherCommit, name) };
  if (ev.dirtyWorktree !== false || git("status", "--porcelain") !== "") return { ok: false, reason: T.dirty };
  if (ev.status === "pass" || ev.status === "attested") {
    // Evidence without `criteria` (no active brief, or written by an older verify): nothing to judge.
    const unproven = (Array.isArray(ev.criteria) ? ev.criteria : []).filter((c) => c.status !== "pass");
    if (unproven.length) return { ok: false, reason: fill(T.criteria, unproven.map((c) => `« ${c.text} » (${c.status})`).join(", ")) };
    if (Array.isArray(ev.undeclared) && ev.undeclared.length) return { ok: false, reason: fill(T.undeclared, ev.undeclared.join(", ")) };
    return { ok: true };
  }
  if (ev.status === "manual") return { ok: false, reason: T.manual };
  if (ev.status === "fail" || ev.status === "error") return { ok: false, reason: fill(T.failed, ev.status.toUpperCase()) };
  return { ok: false, reason: fill(T.noVerdict, name) };
}
