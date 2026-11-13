#!/usr/bin/env node
// Follows the CI of a pull request after a push or its creation (QUA-100): waits until its checks are
// over (`gh pr view --json statusCheckRollup`; on GitLab, the merge request's pipeline through `glab`, QUA-262), then says
// « green », « merged » or « red » with the failing checks. A red CI is fixed, never
// bypassed (QUA-019). Without gh reachable, or past the time limit, the follow-up is « not run »,
// never « green » (QUA-013). Once the PR is merged, it follows the main branch's CI on the merge commit
// and writes the proof a queue needs before its next workstream (QUA-251, pr-watch-main.mjs), within the
// same time limit (GitHub only). Valid for every AI tool: a plain Node script on top of `gh` or `glab`. QUA-262: the checks left
// to CI (`runAt: ["ci"]`) are proven by that CI alone: green names them, anything else says the workstream stays in CLOSING.
// QUA-100: a skipped or neutral check never counts as passed; a verdict is said only on the PR's head equal to the local
// commit of its branch; no CI yet is waited for during a grace period counted inside the time limit; every forge call
// has a time limit.
// Usage: node .githooks/pr-watch.mjs [<pr or mr number>] [--timeout <minutes>]
// Exit code: 0 green, or merged with the main branch's CI green; 1 red, closed without merge, main branch's
// CI red or alert issue open; 2 not run (main branch's CI included).
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { changeForge, ciChecks, lookMr } from "./close-checks.mjs";
import { ghJson, look, lookGitlab, localTip } from "./merge-auto-forge.mjs";
import { followMain } from "./pr-watch-main.mjs";

/** Grace period for the PR's CI to appear: a push to a branch with an open PR runs a skipped CI before the PR's own. */
export const GRACE_MS = 3 * 60_000;

const TEXTS = {
  fr: {
    notRun: "[pr-watch] suivi non exécuté : {0}",
    noGh: "gh injoignable ou non connecté (gh auth login), ou aucune PR pour cette branche",
    noGlab: "glab injoignable ou non connecté (glab auth login), ou aucune MR pour cette branche",
    pr: "PR #{0}",
    mr: "MR !{0}",
    noChecks: "aucun contrôle de CI sur la {0} après {1} min d'attente",
    timeout: "délai de {0} min dépassé sur la {1}",
    running: " — en cours : {0}",
    queued: " — en file d'attente, jamais démarrés : {0} (aucune relance automatique)",
    stale: " — sa tête ({0}) n'est pas le commit local {1}",
    staleWaiting: "[pr-watch] {0} : tête de la PR {1}, commit local {2} — attente de la CI du commit local…",
    graceWaiting: "[pr-watch] {0} : CI de la PR pas encore inscrite, attente (délai de grâce de {1} min)…",
    merged: "[pr-watch] {0} fusionnée.",
    closed: "[pr-watch] {0} fermée sans fusion.",
    green: "[pr-watch] {0} : CI verte ({1} contrôle(s)).",
    red: "[pr-watch] {0} : CI rouge — en échec : {1}. Corriger la cause, jamais contourner (QUA-019).",
    waiting: "[pr-watch] {0} : {1} contrôle(s) en cours…",
    ciProven: " Contrôles confiés à la CI joués par cette CI : {0}.",
    ciUnproven: "\n[pr-watch] contrôles confiés à la CI non prouvés ({0}) : la clôture n'est pas acquise, le chantier reste en CLOSING.",
    mrMerged: "[pr-watch] CI de la MR à la fusion : {0} ; CI de la branche principale non suivie hors GitHub, à vérifier à la main.",
    states: { green: "verte", red: "rouge", pending: "en cours", none: "absente" },
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
    noGlab: "glab unreachable or not logged in (glab auth login), or no MR for this branch",
    pr: "PR #{0}",
    mr: "MR !{0}",
    noChecks: "no CI check on {0} after waiting {1} min",
    timeout: "{0} min limit reached on {1}",
    running: " — running: {0}",
    queued: " — queued, never started: {0} (no automatic restart)",
    stale: " — its head ({0}) is not the local commit {1}",
    staleWaiting: "[pr-watch] {0}: PR head {1}, local commit {2} — waiting for the local commit's CI…",
    graceWaiting: "[pr-watch] {0}: the PR's CI is not registered yet, waiting (grace period of {1} min)…",
    merged: "[pr-watch] {0} merged.",
    closed: "[pr-watch] {0} closed without merge.",
    green: "[pr-watch] {0}: CI green ({1} check(s)).",
    red: "[pr-watch] {0}: CI red — failing: {1}. Fix the cause, never bypass (QUA-019).",
    waiting: "[pr-watch] {0}: {1} check(s) running…",
    ciProven: " Checks left to CI played by this CI: {0}.",
    ciUnproven: "\n[pr-watch] checks left to CI not proven ({0}): the closing is not acquired, the workstream stays in CLOSING.",
    mrMerged: "[pr-watch] MR CI at the merge: {0}; main branch CI not followed outside GitHub, to check by hand.",
    states: { green: "green", red: "red", pending: "running", none: "missing" },
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

// Reading the forge lives in merge-auto-forge.mjs; re-exported for close.mjs and the tests.
export { bucket, ciOf, ghJson, localTip, look } from "./merge-auto-forge.mjs";

const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

/** Messages in the project's language (French by default). */
export function texts(root = process.cwd()) {
  let lang = "fr";
  try {
    lang = JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr";
  } catch {}
  return TEXTS[lang];
}

/**
 * Waits until the PR's (or MR's, `forge` "gitlab") CI is over, then, once merged, the main branch's CI (GitHub); at most
 * `timeout` minutes; returns { code, message }. `ci`: the checks left to CI, named by every verdict (QUA-262).
 */
export async function watch({ root = process.cwd(), pr, timeout = 30, interval = 15_000, forge = "github", ci = [], sleep, ...rest }) {
  const { gh = (a) => ghJson(a), glab = (a) => ghJson(a, spawnSync, "glab"), now = Date.now, log = () => {}, T = texts() } = rest;
  const { localHead = (branch) => localTip(root, branch) } = rest;
  const wait = sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const start = now();
  const end = start + timeout * 60_000;
  // The grace period counts inside the time limit, never on top of it.
  const graceEnd = Math.min(start + GRACE_MS, end);
  const graceMin = Math.round((graceEnd - start) / 60_000);
  const gitlab = forge === "gitlab";
  const name = (n) => fill(gitlab ? T.mr : T.pr, n);
  const proven = (ok, message) => `${message}${ci.length ? fill(ok ? T.ciProven : T.ciUnproven, ci.join(", ")) : ""}`;
  const done = (code, message) => ({ code, message: proven(code === 0, message) });
  const short = (sha) => String(sha ?? "?").slice(0, 7);
  for (;;) {
    const s = gitlab ? lookGitlab(pr, glab, lookMr) : look(pr, gh);
    if (s.state === "not-run") return done(2, fill(T.notRun, gitlab ? T.noGlab : T.noGh));
    if (s.state === "closed") return done(1, fill(T.closed, name(s.number)));
    // A verdict on another commit than the local one is not this push's: wait for the PR's head to catch up.
    const local = localHead(s.branch);
    if (local && s.head !== local) {
      const stale = fill(T.stale, short(s.head), short(local));
      if (now() >= end) return done(2, fill(T.notRun, fill(T.timeout, timeout, name(s.number)) + stale));
      log(fill(T.staleWaiting, name(s.number), short(s.head), short(local)));
      await wait(interval);
      continue;
    }
    if (s.state === "merged" && gitlab) {
      const code = s.ci === "green" ? 0 : s.ci === "red" ? 1 : 2;
      return done(code, `${fill(T.merged, name(s.number))}\n${fill(T.mrMerged, T.states[s.ci])}`);
    }
    if (s.state === "merged") {
      const main = await followMain({ root, pr: s.number, sha: s.mergeCommit, gh, wait, now, end, interval, log, T });
      return { code: main.code, message: `${fill(T.merged, name(s.number))}\n${main.message}` };
    }
    if (s.state === "red") return done(1, fill(T.red, name(s.number), s.failed.join(", ")));
    const inGrace = now() < graceEnd;
    if (s.state === "green" && !(s.early && inGrace)) return done(0, fill(T.green, name(s.number), s.total));
    if (s.state === "none" && !inGrace) return done(2, fill(T.notRun, fill(T.noChecks, name(s.number), graceMin)));
    if (s.state === "pending" && now() >= end) {
      const parts = [
        s.running?.length ? fill(T.running, s.running.join(", ")) : "",
        s.queued?.length ? fill(T.queued, s.queued.join(", ")) : "",
      ];
      return done(2, fill(T.notRun, fill(T.timeout, timeout, name(s.number)) + parts.join("")));
    }
    log(s.state === "pending" ? fill(T.waiting, name(s.number), s.pending) : fill(T.graceWaiting, name(s.number), graceMin));
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
  const options = { forge: changeForge(root), ci: ciChecks(root), T: texts(root) };
  // QUA-249: no top-level await, this hook is imported by close.mjs.
  watch({ ...parseArgs(process.argv.slice(2)), root, interval, log: console.log, ...options }).then((r) => {
    (r.code === 0 ? console.log : console.error)(r.message);
    process.exitCode = r.code;
  });
}
