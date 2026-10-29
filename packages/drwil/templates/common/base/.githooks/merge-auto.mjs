#!/usr/bin/env node
// Schedules the automatic merge of a pull request in the safe order (QUA-166): wait until GitHub has
// computed the PR, update it if it is behind the main branch (BEHIND), `gh pr merge --auto --merge`, then
// check that the merge is really scheduled. Only with the « Automatic merge » authorisation given at start
// (read in the state), or, in SCOPING, the one given by the end-of-scoping poll for the PR of its branch
// (`scoping_merge`, QUA-188); never schedules on a PR whose state is unknown or not up to date, never claims
// the merge is scheduled without having seen it (QUA-013). Following the PR stays `pr-watch.mjs`'s job.
// Usage: node .githooks/merge-auto.mjs [<pr number>] [--timeout <minutes>]
// Exit code: 0 scheduled, 1 refused, 2 not run (gh unreachable, state not computed in time).
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readState } from "./state.mjs";

const TEXTS = {
  fr: {
    noAuth:
      "[merge-auto] refusé : la fusion automatique n'a pas été autorisée au lancement (état : auto_merge absent), ni en fin de cadrage (réponse « Automatic merge » du sondage, état : scoping_merge absent). La fusion reste un geste humain.",
    otherBranch:
      "[merge-auto] refusé : la PR #{0} est celle de la branche {1}, alors que la fusion automatique de fin de cadrage n'est autorisée que pour la branche {2}. La fusion reste un geste humain.",
    notRun: "[merge-auto] non exécuté : {0}",
    noGh: "gh injoignable ou non connecté (gh auth login), ou aucune PR pour cette branche",
    timeout: "état de la PR #{0} non calculé ou pas à jour après {1} min (« {2} ») ; relancer la commande",
    notOpen: "[merge-auto] refusé : la PR #{0} n'est pas ouverte ({1}).",
    conflict: "[merge-auto] refusé : la PR #{0} est en conflit avec la branche principale ; résoudre le conflit, puis relancer.",
    updateFailed:
      "[merge-auto] non exécuté : la mise à jour de la PR #{0} a échoué ; à faire à la main (`gh pr update-branch {0}`), puis relancer.",
    updated: "[merge-auto] PR #{0} en retard sur la branche principale : mise à jour.",
    notAllowed:
      "[merge-auto] auto-merge non autorisé par le dépôt (PR #{0}) : un administrateur coche « Allow auto-merge » (réglages GitHub, General → Pull Requests), ou l'humain fusionne à la main. Rester en CLOSING ; la fusion n'est PAS programmée.",
    refused: "[merge-auto] refusé par gh pour la PR #{0} : {1} La fusion n'est PAS programmée.",
    notScheduled:
      "[merge-auto] la fusion de la PR #{0} n'apparaît pas programmée (autoMergeRequest vide) : la fusion n'est PAS programmée.",
    scheduled: "[merge-auto] fusion de la PR #{0} programmée et vérifiée. Suivre : node .githooks/pr-watch.mjs {0}",
  },
  en: {
    noAuth:
      "[merge-auto] refused: automatic merge was not authorised at start (state: auto_merge missing), nor at the end of scoping (answer « Automatic merge » to the poll, state: scoping_merge missing). The merge stays a human gesture.",
    otherBranch:
      "[merge-auto] refused: PR #{0} is the one of branch {1}, while the end-of-scoping automatic merge is authorised for branch {2} only. The merge stays a human gesture.",
    notRun: "[merge-auto] not run: {0}",
    noGh: "gh unreachable or not logged in (gh auth login), or no PR for this branch",
    timeout: "state of PR #{0} not computed or not up to date after {1} min (« {2} »); run the command again",
    notOpen: "[merge-auto] refused: PR #{0} is not open ({1}).",
    conflict: "[merge-auto] refused: PR #{0} conflicts with the main branch; resolve the conflict, then run again.",
    updateFailed: "[merge-auto] not run: updating PR #{0} failed; do it by hand (`gh pr update-branch {0}`), then run again.",
    updated: "[merge-auto] PR #{0} is behind the main branch: updating it.",
    notAllowed:
      "[merge-auto] auto-merge not allowed by the repository (PR #{0}): an admin ticks « Allow auto-merge » (GitHub settings, General → Pull Requests), or the human merges by hand. Stay in CLOSING; the merge is NOT scheduled.",
    refused: "[merge-auto] refused by gh for PR #{0}: {1} The merge is NOT scheduled.",
    notScheduled: "[merge-auto] the merge of PR #{0} does not appear scheduled (empty autoMergeRequest): the merge is NOT scheduled.",
    scheduled: "[merge-auto] merge of PR #{0} scheduled and checked. Follow it: node .githooks/pr-watch.mjs {0}",
  },
};

const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);
const lang = (root) => {
  try {
    return JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
};

/** `gh` for real: { status, stdout, stderr }; status null when gh does not start. */
export const ghRun = (args) => spawnSync("gh", args, { encoding: "utf8" });

/** Looks at the PR: parsed JSON, or null when gh fails or answers something unreadable. */
function view(gh, pr) {
  const r = gh(["pr", "view", ...(pr ? [pr] : []), "--json", "number,state,mergeStateStatus,autoMergeRequest,headRefName"]);
  try {
    return r.status === 0 ? JSON.parse(r.stdout) : null;
  } catch {
    return null;
  }
}

/** Runs the sequence; returns { code, message }. */
export async function mergeAuto({
  pr,
  timeout = 5,
  interval = 5000,
  root = process.cwd(),
  gh = ghRun,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  now = Date.now,
  log = () => {},
}) {
  const T = TEXTS[lang(root)];
  const out = (code, key, ...values) => ({ code, message: fill(T[key], ...values) });
  const notRun = (reason) => ({ code: 2, message: fill(T.notRun, reason) });
  const { state } = readState(root);
  // In SCOPING, only the scoping PR of the branch the human answered for (QUA-188); never another PR.
  const scoping = state.activity === "SCOPING" ? (state.scoping_merge?.branch ?? null) : null;
  if (state.auto_merge !== true && !scoping) return out(1, "noAuth");
  const end = now() + timeout * 60_000;
  let updated = false;
  for (;;) {
    const v = view(gh, pr);
    if (!v) return notRun(T.noGh);
    if (scoping && v.headRefName !== scoping) return out(1, "otherBranch", v.number, v.headRefName, scoping);
    if (v.state !== "OPEN") return out(1, "notOpen", v.number, v.state);
    if (v.mergeStateStatus === "DIRTY") return out(1, "conflict", v.number);
    if (v.mergeStateStatus === "BEHIND" && !updated) {
      if (gh(["pr", "update-branch", String(v.number)]).status !== 0) return out(2, "updateFailed", v.number);
      updated = true;
      log(fill(T.updated, v.number));
    } else if (!["UNKNOWN", "BEHIND", undefined].includes(v.mergeStateStatus)) {
      const m = gh(["pr", "merge", String(v.number), "--auto", "--merge"]);
      if (m.status !== 0) {
        const why = `${m.stderr ?? ""}${m.stdout ?? ""}`.trim();
        return /not allowed/i.test(why) ? out(1, "notAllowed", v.number) : out(1, "refused", v.number, why || "(?)");
      }
      return view(gh, String(v.number))?.autoMergeRequest ? out(0, "scheduled", v.number) : out(1, "notScheduled", v.number);
    }
    if (now() >= end) return notRun(fill(T.timeout, v.number, timeout, v.mergeStateStatus));
    await sleep(interval);
  }
}

/** Command line: `[<pr>] [--timeout <minutes>]`. */
export function parseArgs(argv) {
  const i = argv.indexOf("--timeout");
  return { pr: argv.find((a, j) => /^\d+$/.test(a) && argv[j - 1] !== "--timeout"), timeout: i >= 0 ? Number(argv[i + 1]) || 5 : 5 };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const interval = Number(process.env.DRWIL_MERGE_AUTO_INTERVAL) || 5000;
  const r = await mergeAuto({ ...parseArgs(process.argv.slice(2)), interval, log: console.log });
  (r.code === 0 ? console.log : console.error)(r.message);
  process.exitCode = r.code;
}
