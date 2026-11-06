// The main branch's CI after a pull request is merged (QUA-251): `pr-watch.mjs` follows the CI run of the
// merge commit and the alert issue the CI opens when it breaks (job `alert-if-ci-broken`), and records what it
// saw for that commit; only « green » with no such issue open is the proof a queue requires before starting its
// next workstream (`start` of the queue's head, so `state.mjs next` and the chaining at the merge seen, QUA-178),
// the other verdicts let the refusal say why. The proof holds for one commit: the tip of the up-to-date main
// branch, the one the next workstream's branch is cut from. Only on GitHub: elsewhere the start is not held back.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mainBranch } from "./close-branches.mjs";

export const WORKFLOW = "ia-first.yml";
export const ALERT_TITLE = "CI broken on the main branch";
export const PROOF = [".drwil", "evidence", "main-ci.json"];

const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

/** One look at the main branch's CI on `sha`: { state: "green" | "red" | "pending" | "issue" | "not-run", run?, issue? }. */
export function lookMain(sha, gh) {
  const runs = gh([
    "run",
    "list",
    "--commit",
    sha,
    "--workflow",
    WORKFLOW,
    "--event",
    "push",
    "--json",
    "databaseId,status,conclusion,url",
  ]);
  if (!Array.isArray(runs)) return { state: "not-run" };
  // gh lists the most recent run first; a run re-attempted keeps its id.
  const run = runs[0];
  if (run?.status === "completed" && run.conclusion !== "success") return { state: "red", run };
  const issues = gh(["issue", "list", "--state", "open", "--search", `${ALERT_TITLE} in:title`, "--json", "number,title"]);
  if (!Array.isArray(issues)) return { state: "not-run" };
  const issue = issues.find((i) => String(i.title).startsWith(ALERT_TITLE));
  if (issue) return { state: "issue", issue, run };
  // No run yet (the push event takes a few seconds to create it): still running, never green (QUA-013).
  return run?.status === "completed" ? { state: "green", run } : { state: "pending" };
}

/** Records the main branch's CI seen on `sha` (`ci`: green, red, pending, issue); returns its path relative to `root`. */
export function writeProof(root, { pr, sha, run, ci = "green", issue, now = new Date().toISOString() }) {
  mkdirSync(join(root, ...PROOF.slice(0, -1)), { recursive: true });
  const proof = { pr: Number(pr), mergeCommit: sha, workflow: WORKFLOW, run: run?.databaseId, url: run?.url, ci, issue, checkedAt: now };
  writeFileSync(join(root, ...PROOF), JSON.stringify(proof, null, 2) + "\n");
  return PROOF.join("/");
}

// A verdict other than green is only recorded to explain the refusal: failing to write it changes nothing.
const record = (root, verdict) => {
  try {
    writeProof(root, verdict);
  } catch {}
};

/**
 * Follows the main branch's CI on `sha` until it is over or `end`; `{ code, message }`: 0 green (proof written),
 * 1 red or alert issue open, 2 still running at the deadline or not followed (no proof, never « green »).
 */
export async function followMain({ root, pr, sha, gh, wait, now, end, interval, log, T }) {
  const short = String(sha ?? "").slice(0, 7);
  if (!sha) return { code: 2, message: fill(T.mainNotRun, T.noMergeCommit) };
  for (;;) {
    const s = lookMain(sha, gh);
    if (s.state === "not-run") return { code: 2, message: fill(T.mainNotRun, T.noGh) };
    if (s.state === "red" || s.state === "issue") record(root, { pr, sha, run: s.run, ci: s.state, issue: s.issue?.number });
    if (s.state === "red") return { code: 1, message: fill(T.mainRed, short, s.run.url ?? s.run.databaseId) };
    if (s.state === "issue") return { code: 1, message: fill(T.mainIssue, s.issue.number, s.issue.title) };
    if (s.state === "green") {
      try {
        return { code: 0, message: fill(T.mainGreen, short, writeProof(root, { pr, sha, run: s.run })) };
      } catch (e) {
        return { code: 2, message: fill(T.mainNotRun, fill(T.proofFailed, e.message)) };
      }
    }
    if (now() >= end) {
      record(root, { pr, sha, ci: "pending" });
      return { code: 2, message: fill(T.mainTimeout, short, pr) };
    }
    log(fill(T.mainWaiting, short));
    await wait(interval);
  }
}

const git = (root, ...args) => {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
};

/** Tip of the up-to-date main branch: `origin/<main>` once fetched if it contains the local one (like `createBranch`), else local. */
export function mainTip(root) {
  const main = mainBranch(root);
  if (!main) return null;
  const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
  const fetched = spawnSync("git", ["fetch", "--quiet", "origin", main], { cwd: root, timeout: 20000, env }).status === 0;
  const remote = fetched && git(root, "merge-base", "--is-ancestor", main, `origin/${main}`) !== null;
  return git(root, "rev-parse", remote ? `origin/${main}` : main);
}

/** Forge of the `origin` remote, by the rule of `drwil guarantees` (`forgeOf`): "github", "other", or null without a remote. */
export function originForge(root) {
  const url = git(root, "remote", "get-url", "origin");
  return url === null ? null : /github/i.test(url) ? "github" : "other";
}

/**
 * Gate of the queue's next start: `{ refusal }` (null when the proof holds), or, on a forge other than GitHub, where
 * `gh` cannot follow the main branch's CI, never a refusal but a `note` saying it is to be checked by hand.
 */
export function mainCiGate(root, T) {
  return originForge(root) === "other" ? { refusal: null, note: `\n${T.nextOffGithub}` } : { refusal: mainCiRefusal(root, T) };
}

/** Why the queue's next workstream may not start (messages `T` of the state), or null when the proof holds for `tip`. */
export function mainCiRefusal(root, T, tip = mainTip(root)) {
  if (!tip) return T.nextNoMain;
  let proof = null;
  try {
    proof = JSON.parse(readFileSync(join(root, ...PROOF), "utf8"));
  } catch {}
  if (typeof proof?.mergeCommit !== "string") return fill(T.nextNoProof, tip.slice(0, 7));
  if (proof.mergeCommit !== tip) return fill(T.nextOtherMerge, proof.mergeCommit.slice(0, 7), proof.pr, tip.slice(0, 7));
  const why = { red: T.nextRed, pending: T.nextPending, issue: fill(T.nextIssue, proof.issue) }[proof.ci];
  return proof.ci === "green" ? null : fill(why ?? T.nextNoProof, tip.slice(0, 7), proof.pr);
}
