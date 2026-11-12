#!/usr/bin/env node
// Schedules the automatic merge of a pull request in the safe order (QUA-166): wait until the forge has
// computed the PR, update it if it is behind the main branch (BEHIND), `gh pr merge --auto --merge`, then
// check that the merge is really scheduled. On GitLab, the same sequence on the merge request through `glab`
// (QUA-161, client in merge-auto-forge.mjs: `glab mr rebase`, `glab mr merge --auto-merge`, merge_when_pipeline_succeeds). Only with the « Automatic merge » authorisation given at start
// (read in the state), or, in SCOPING, the one given by the end-of-scoping poll for the PR of its branch
// (`scoping_merge`, QUA-188); never schedules on a PR whose state is unknown or not up to date, never claims
// the merge is scheduled without having seen it (QUA-013). Following the PR stays `pr-watch.mjs`'s job.
// Usage: node .githooks/merge-auto.mjs [<pr number>] [--timeout <minutes>]
// Exit code: 0 scheduled (or merged at once: CI already green), 1 refused, 2 not run (gh or glab unreachable, state not
// computed in time). Seeing the merge scheduled on the PR of the state's `merge_cancelled` mark (QUA-181) clears
// the mark, through writeState: the only state this tool writes.
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { changeForge } from "./close-checks.mjs";
import { forgeClient, ghRun } from "./merge-auto-forge.mjs";
import { texts } from "./pr-watch.mjs";
import { STATE_MESSAGES } from "./state-messages.mjs";
import { readState, writeState } from "./state.mjs";

const TEXTS = {
  fr: {
    noAuth:
      "[merge-auto] refusé : la fusion automatique n'a pas été autorisée au lancement (état : auto_merge absent), ni en fin de cadrage (réponse « Automatic merge » du sondage, état : scoping_merge absent). La fusion reste un geste humain.",
    otherBranch:
      "[merge-auto] refusé : la {0} est celle de la branche {1}, alors que la fusion automatique de fin de cadrage n'est autorisée que pour la branche {2}. La fusion reste un geste humain.",
    notRun: "[merge-auto] non exécuté : {0}",
    timeout: "état de la {0} non calculé ou pas à jour après {1} min (« {2} ») ; relancer la commande",
    notOpen: "[merge-auto] refusé : la {0} n'est pas ouverte ({1}).",
    conflict: "[merge-auto] refusé : la {0} est en conflit avec la branche principale ; résoudre le conflit, puis relancer.",
    updateFailed: "[merge-auto] non exécuté : la mise à jour de la {0} a échoué ; à faire à la main (`{1}`), puis relancer.",
    updated: "[merge-auto] {0} en retard sur la branche principale : mise à jour.",
    notAllowed:
      "[merge-auto] auto-merge non autorisé par le dépôt ({0}) : un administrateur coche « Allow auto-merge » (réglages GitHub, General → Pull Requests), ou l'humain fusionne à la main. Rester en CLOSING ; la fusion n'est PAS programmée.",
    refused: "[merge-auto] refusé par {2} pour la {0} : {1} La fusion n'est PAS programmée.",
    notScheduled: "[merge-auto] la fusion de la {0} n'apparaît pas programmée (autoMergeRequest vide) : la fusion n'est PAS programmée.",
    scheduled: "[merge-auto] fusion de la {0} programmée et vérifiée. Suivre : node .githooks/pr-watch.mjs {1}",
  },
  en: {
    noAuth:
      "[merge-auto] refused: automatic merge was not authorised at start (state: auto_merge missing), nor at the end of scoping (answer « Automatic merge » to the poll, state: scoping_merge missing). The merge stays a human gesture.",
    otherBranch:
      "[merge-auto] refused: {0} is the one of branch {1}, while the end-of-scoping automatic merge is authorised for branch {2} only. The merge stays a human gesture.",
    notRun: "[merge-auto] not run: {0}",
    timeout: "state of {0} not computed or not up to date after {1} min (« {2} »); run the command again",
    notOpen: "[merge-auto] refused: {0} is not open ({1}).",
    conflict: "[merge-auto] refused: {0} conflicts with the main branch; resolve the conflict, then run again.",
    updateFailed: "[merge-auto] not run: updating {0} failed; do it by hand (`{1}`), then run again.",
    updated: "[merge-auto] {0} is behind the main branch: updating it.",
    notAllowed:
      "[merge-auto] auto-merge not allowed by the repository ({0}): an admin ticks « Allow auto-merge » (GitHub settings, General → Pull Requests), or the human merges by hand. Stay in CLOSING; the merge is NOT scheduled.",
    refused: "[merge-auto] refused by {2} for {0}: {1} The merge is NOT scheduled.",
    notScheduled: "[merge-auto] the merge of {0} does not appear scheduled (empty autoMergeRequest): the merge is NOT scheduled.",
    scheduled: "[merge-auto] merge of {0} scheduled and checked. Follow it: node .githooks/pr-watch.mjs {1}",
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

export { ghRun };

/** The merge seen scheduled on the PR of the `merge_cancelled` mark: the reminder became false, the mark goes (QUA-181). */
function withMarkCleared(root, number, result, label) {
  const { state } = readState(root);
  if (state.merge_cancelled?.pr !== number) return result;
  const { merge_cancelled: _, ...kept } = state;
  writeState(root, kept);
  return { ...result, message: `${result.message}\n${fill(STATE_MESSAGES[lang(root)].mergeCancelledCleared, label)}` };
}

/** Runs the sequence; returns { code, message }. */
export async function mergeAuto({
  pr,
  timeout = 5,
  interval = 5000,
  root = process.cwd(),
  gh = ghRun,
  glab,
  forge = changeForge(root),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  now = Date.now,
  log = () => {},
}) {
  const client = forgeClient(forge, { gh, glab });
  const T = { ...TEXTS[lang(root)], ...client.texts[lang(root)] };
  const M = STATE_MESSAGES[lang(root)];
  const W = texts(root);
  const name = (n) => fill(forge === "gitlab" ? W.mr : W.pr, n);
  const out = (code, key, n, ...values) => ({ code, message: fill(T[key], name(n), ...values) });
  const notRun = (reason) => ({ code: 2, message: fill(T.notRun, reason) });
  const { state } = readState(root);
  // In SCOPING, only the scoping PR of the branch the human answered for (QUA-188); never another PR.
  const scoping = state.activity === "SCOPING" ? (state.scoping_merge?.branch ?? null) : null;
  if (state.auto_merge !== true && !scoping) return out(1, "noAuth");
  const end = now() + timeout * 60_000;
  let updated = false;
  for (;;) {
    const v = client.view(pr);
    if (!v) return notRun(forge === "gitlab" ? W.noGlab : W.noGh);
    if (scoping && v.headRefName !== scoping) return out(1, "otherBranch", v.number, v.headRefName, scoping);
    if (v.state !== "OPEN") return out(1, "notOpen", v.number, v.state);
    if (v.mergeStateStatus === "DIRTY") return out(1, "conflict", v.number);
    if (v.mergeStateStatus === "BEHIND" && !updated) {
      if (client.update(v.number).status !== 0) return out(2, "updateFailed", v.number, client.updateHint(v.number));
      updated = true;
      log(fill(T.updated, name(v.number)));
    } else if (!["UNKNOWN", "BEHIND", undefined].includes(v.mergeStateStatus)) {
      const m = client.merge(v.number);
      if (m.status !== 0) {
        const why = `${m.stderr ?? ""}${m.stdout ?? ""}`.trim();
        return client.notAllowed.test(why) ? out(1, "notAllowed", v.number) : out(1, "refused", v.number, why || "(?)", client.tool);
      }
      // With the whole CI already green, `gh pr merge --auto` (or `glab mr merge --auto-merge`) merges at once (QUA-162).
      const seen = client.view(String(v.number));
      if (seen?.autoMergeRequest) return withMarkCleared(root, v.number, out(0, "scheduled", v.number, v.number), name(v.number));
      if (seen?.state !== "MERGED") return out(1, "notScheduled", v.number);
      return T.merged ? out(0, "merged", v.number) : { code: 0, message: fill(M.mergeAutoMerged, v.number) };
    }
    if (now() >= end) return notRun(fill(T.timeout, name(v.number), timeout, v.mergeStateStatus));
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
