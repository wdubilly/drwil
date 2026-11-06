#!/usr/bin/env node
// Follows the CI of a pull request after a push or its creation (QUA-100): waits until its checks are
// over (`gh pr view --json statusCheckRollup`), then says « green », « merged » or « red » with the failing checks. A red CI is fixed, never
// bypassed (QUA-019). Without gh reachable, or past the time limit, the follow-up is « not run »,
// never « green » (QUA-013). Once the PR is merged, it follows the main branch's CI on the merge commit
// and writes the proof a queue needs before its next workstream (QUA-251, pr-watch-main.mjs), within the
// same time limit. Valid for every AI tool: a plain Node script on top of `gh`.
// Usage: node .githooks/pr-watch.mjs [<pr number>] [--timeout <minutes>]
// Exit code: 0 green, or merged with the main branch's CI green; 1 red, closed without merge, main branch's
// CI red or alert issue open; 2 not run (main branch's CI included).
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { followMain } from "./pr-watch-main.mjs";

const TEXTS = {
  fr: {
    notRun: "[pr-watch] suivi non exécuté : {0}",
    noGh: "gh injoignable ou non connecté (gh auth login), ou aucune PR pour cette branche",
    noChecks: "aucun contrôle de CI sur la PR #{0}",
    timeout: "délai de {0} min dépassé, contrôles encore en cours sur la PR #{1}",
    merged: "[pr-watch] PR #{0} fusionnée.",
    closed: "[pr-watch] PR #{0} fermée sans fusion.",
    green: "[pr-watch] PR #{0} : CI verte ({1} contrôle(s)).",
    red: "[pr-watch] PR #{0} : CI rouge — en échec : {1}. Corriger la cause, jamais contourner (QUA-019).",
    waiting: "[pr-watch] PR #{0} : {1} contrôle(s) en cours…",
    mainWaiting: "[pr-watch] CI de la branche principale en cours sur le commit de fusion {0}…",
    mainGreen:
      "[pr-watch] CI de la branche principale verte sur le commit de fusion {0}, aucune issue « CI broken on the main branch » ouverte : preuve écrite ({1}) ; la file peut lancer la suivante (`node .githooks/state.mjs next`).",
    mainRed:
      "[pr-watch] CI de la branche principale ROUGE sur le commit de fusion {0} ({1}) : ne pas lancer la suivante ; s'arrêter et le dire — la correction est un nouveau chantier, jamais un contournement (QUA-019).",
    mainIssue:
      "[pr-watch] issue #{0} ouverte (« {1} ») : la branche principale est signalée cassée ; ne pas lancer la suivante avant sa correction et la fermeture de l'issue — s'arrêter et le dire.",
    mainTimeout:
      "[pr-watch] CI de la branche principale encore en cours sur le commit de fusion {0} au délai : aucune preuve écrite ; relancer `node .githooks/pr-watch.mjs {1}`.",
    mainNotRun: "[pr-watch] CI de la branche principale non suivie : {0} ; aucune preuve écrite.",
    noMergeCommit: "commit de fusion inconnu (`gh pr view --json mergeCommit`)",
    proofFailed: "preuve non écrite ({0})",
  },
  en: {
    notRun: "[pr-watch] follow-up not run: {0}",
    noGh: "gh unreachable or not logged in (gh auth login), or no PR for this branch",
    noChecks: "no CI check on PR #{0}",
    timeout: "{0} min limit reached, checks still running on PR #{1}",
    merged: "[pr-watch] PR #{0} merged.",
    closed: "[pr-watch] PR #{0} closed without merge.",
    green: "[pr-watch] PR #{0}: CI green ({1} check(s)).",
    red: "[pr-watch] PR #{0}: CI red — failing: {1}. Fix the cause, never bypass (QUA-019).",
    waiting: "[pr-watch] PR #{0}: {1} check(s) running…",
    mainWaiting: "[pr-watch] main branch CI running on merge commit {0}…",
    mainGreen:
      "[pr-watch] main branch CI green on merge commit {0}, no « CI broken on the main branch » issue open: proof written ({1}); the queue may start the next one (`node .githooks/state.mjs next`).",
    mainRed:
      "[pr-watch] main branch CI RED on merge commit {0} ({1}): do not start the next one; stop and say so — the fix is a new workstream, never a bypass (QUA-019).",
    mainIssue:
      "[pr-watch] issue #{0} open (« {1} »): the main branch is reported broken; do not start the next one before it is fixed and the issue closed — stop and say so.",
    mainTimeout:
      "[pr-watch] main branch CI still running on merge commit {0} at the time limit: no proof written; run `node .githooks/pr-watch.mjs {1}` again.",
    mainNotRun: "[pr-watch] main branch CI not followed: {0}; no proof written.",
    noMergeCommit: "merge commit unknown (`gh pr view --json mergeCommit`)",
    proofFailed: "proof not written ({0})",
  },
};

const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

/** Messages in the project's language (French by default). */
export function texts(root = process.cwd()) {
  try {
    return TEXTS[JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr"];
  } catch {
    return TEXTS.fr;
  }
}

/** `gh` with JSON output; null when it fails or answers something unreadable. */
export function ghJson(args, run = spawnSync) {
  const r = run("gh", args, { encoding: "utf8" });
  if (r.status !== 0 && !r.stdout) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

/**
 * Bucket of one check of `statusCheckRollup`: a check run (status, conclusion) or a commit status
 * (state). Read from `gh pr view`, which every gh version knows (`gh pr checks --json` came later).
 */
export function bucket(c) {
  if (c.state !== undefined) return c.state === "SUCCESS" ? "pass" : ["PENDING", "EXPECTED"].includes(c.state) ? "pending" : "fail";
  if (c.status !== "COMPLETED") return "pending";
  if (["SUCCESS", "NEUTRAL", "SKIPPED"].includes(c.conclusion)) return "pass";
  return c.conclusion === "CANCELLED" ? "cancel" : "fail";
}

/** One look at the PR: { state: "merged" | "closed" | "green" | "red" | "pending" | "none" | "not-run", … }. */
export function look(pr, gh) {
  const view = gh(["pr", "view", ...(pr ? [pr] : []), "--json", "number,state,statusCheckRollup,mergeCommit"]);
  if (!view) return { state: "not-run" };
  if (view.state === "MERGED") return { state: "merged", number: view.number, mergeCommit: view.mergeCommit?.oid };
  if (view.state === "CLOSED") return { state: "closed", number: view.number };
  const checks = (view.statusCheckRollup ?? []).map((c) => ({ name: c.name ?? c.context, bucket: bucket(c) }));
  if (!checks.length) return { state: "none", number: view.number };
  const failed = checks.filter((c) => c.bucket === "fail" || c.bucket === "cancel").map((c) => c.name);
  if (failed.length) return { state: "red", number: view.number, failed };
  const pending = checks.filter((c) => c.bucket === "pending").length;
  return pending ? { state: "pending", number: view.number, pending } : { state: "green", number: view.number, total: checks.length };
}

/** Waits until the PR's CI is over, then, once merged, the main branch's CI; at most `timeout` minutes; returns { code, message }. */
export async function watch({
  root = process.cwd(),
  pr,
  timeout = 30,
  interval = 15_000,
  gh = (a) => ghJson(a),
  sleep,
  now = Date.now,
  log = () => {},
  T = texts(),
}) {
  const wait = sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const end = now() + timeout * 60_000;
  for (;;) {
    const s = look(pr, gh);
    if (s.state === "merged") {
      const main = await followMain({ root, pr: s.number, sha: s.mergeCommit, gh, wait, now, end, interval, log, T });
      return { code: main.code, message: `${fill(T.merged, s.number)}\n${main.message}` };
    }
    if (s.state === "closed") return { code: 1, message: fill(T.closed, s.number) };
    if (s.state === "green") return { code: 0, message: fill(T.green, s.number, s.total) };
    if (s.state === "red") return { code: 1, message: fill(T.red, s.number, s.failed.join(", ")) };
    if (s.state === "not-run") return { code: 2, message: fill(T.notRun, T.noGh) };
    if (s.state === "none") return { code: 2, message: fill(T.notRun, fill(T.noChecks, s.number)) };
    if (now() >= end) return { code: 2, message: fill(T.notRun, fill(T.timeout, timeout, s.number)) };
    log(fill(T.waiting, s.number, s.pending));
    await wait(interval);
  }
}

/** Command line: `[<pr>] [--timeout <minutes>]`. */
export function parseArgs(argv) {
  const i = argv.indexOf("--timeout");
  const timeout = i >= 0 ? Number(argv[i + 1]) || 30 : 30;
  const pr = argv.find((a, j) => /^\d+$/.test(a) && argv[j - 1] !== "--timeout");
  return { pr, timeout };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const interval = Number(process.env.DRWIL_PR_WATCH_INTERVAL) || 15_000;
  // The proof goes to the repository's root, wherever the script is run from.
  const top = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  const root = top.status === 0 ? top.stdout.trim() : process.cwd();
  const r = await watch({ ...parseArgs(process.argv.slice(2)), root, interval, log: console.log, T: texts(root) });
  (r.code === 0 ? console.log : console.error)(r.message);
  process.exitCode = r.code;
}
