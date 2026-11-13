// Resume of a workstream on another clone (`node .githooks/state.mjs resume`; QUA-245, QUA-246, QUA-247):
// the local state is rebuilt from what git proves on the workstream's branch. It takes no decision,
// so the agent may run it; the human decisions (automatic merge, queue, reopening) are never rebuilt.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readLots } from "./briefs-lots.mjs";
import { config } from "./briefs.mjs";
import { branchMerged, ghRun, glabRun, mainBranch, mergedPullRequests } from "./close-branches.mjs";
import { changeForge } from "./close-checks.mjs";
import { LOT_TRAILER, clearLots, writeLots } from "./state-lots.mjs";
import { fill } from "./state-messages.mjs";
import { readState, texts } from "./state-validate.mjs";
import { writeState } from "./state.mjs";

const BRANCH_RE = /^workstream\/([^/]+)$/;

// The automatic merge after a resume (QUA-247): the default behaviour, nothing to give back; its texts live here,
// state-messages-fr.mjs is full.
const MERGE_BACK = {
  fr: " Fusion automatique : en fait rien à redemander, c'est le comportement par défaut ; à la clôture, `node .githooks/merge-auto.mjs <numéro>`.",
  en: " Automatic merge: actually nothing to ask again, it is the default behaviour; at the closing, `node .githooks/merge-auto.mjs <number>`.",
};

// GitLab's words for the refusals that name the merge request or its tool (QUA-247).
const GITLAB_TEXTS = {
  fr: {
    resumeUnknown:
      "reprise refusée : glab n'a pas dit si la MR de {0} est fusionnée (absent, non authentifié ou hors ligne) ; non prouvé, rien n'est écrit",
    resumeMerged: "reprise refusée : la MR de {0} est fusionnée, le chantier est terminé ; revenir sur la branche principale",
  },
  en: {
    resumeUnknown:
      "resume refused: glab did not say whether the MR of {0} is merged (missing, not authenticated or offline); not proved, nothing written",
    resumeMerged: "resume refused: the MR of {0} is merged, the workstream is over; go back to the main branch",
  },
};

function git(root, ...args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** The main branch to compare with: the local one, else the remote's (a clone made with `-b` has no local one), like mainBranch: main, then master. */
function baseRef(root) {
  const remote = ["origin/main", "origin/master"].find((r) => git(root, "rev-parse", "--verify", "--quiet", r) !== null);
  return mainBranch(root) ?? remote ?? null;
}

/** Number of the last `Drwil-Lot` trailer committed on the branch since `base`, or null. */
export function lastLot(root, base) {
  // A failed git call writes nothing on stdout: no lot proved.
  const out = spawnSync("git", ["log", `--format=%(trailers:key=${LOT_TRAILER},valueonly)`, `${base}..HEAD`], {
    cwd: root,
    encoding: "utf8",
  }).stdout;
  const n = out
    .split("\n")
    .map((s) => s.trim())
    .find((s) => /^\d+$/.test(s));
  return n === undefined ? null : Number(n);
}

/** Current lot of `brief` copied from the history (QUA-246); the [IA] lots before it count done. */
function resumeLot(root, brief, base) {
  clearLots(root);
  const n = lastLot(root, base);
  const ia = readLots(readFileSync(join(root, brief), "utf8")).filter((l) => l.kind === "ia");
  if (n === null || !ia.some((l) => l.n === n)) return null;
  writeLots(root, { brief, current: n, done: ia.filter((l) => l.n < n).map((l) => l.n) });
  return n;
}

/**
 * Rebuilds the state on `workstream/<name>`: BUILD on docs/projects/<name>.md when it is there; CLOSING
 * when a commit of the branch deleted it (the closing) and the branch's PR is not merged. Refused without
 * writing anything when the history proves nothing (QUA-247). `{ code, message }`.
 */
export function resume(root, { gh = ghRun, glab = glabRun, forge = changeForge(root), now = new Date().toISOString() } = {}) {
  const lang = config(root).lang === "en" ? "en" : "fr";
  const T = forge === "gitlab" ? { ...texts(root), ...GITLAB_TEXTS[lang] } : texts(root);
  const refused = (key, ...args) => ({ code: 1, message: fill(T[key], ...args) });
  const branch = git(root, "symbolic-ref", "--quiet", "--short", "HEAD");
  const name = branch?.match(BRANCH_RE)?.[1];
  if (!name) return refused("resumeBranch", branch ?? "HEAD");
  const brief = `docs/projects/${name}.md`;
  const { state } = readState(root);
  if (state.activity !== "SCOPING")
    return state.active_brief === brief
      ? { code: 0, message: fill(T.resumeAlready, brief, state.activity) }
      : refused("resumeBusy", state.active_brief, brief);
  const base = baseRef(root);
  if (!base) return refused("resumeNoMain");
  let activity = "BUILD";
  if (!existsSync(join(root, brief))) {
    // A failed git call proves no closing: refused, never let through (QUA-013).
    if (!git(root, "log", "--diff-filter=D", "--format=%H", `${base}..HEAD`, "--", brief)) return refused("resumeNoBrief", brief);
    const merged = branchMerged(root, branch, base, mergedPullRequests(root, { branch, gh, glab, forge }));
    if (merged === "unknown") return refused("resumeUnknown", branch);
    if (merged !== "no") return refused("resumeMerged", branch);
    activity = "CLOSING";
  }
  writeState(root, { version: 1, activity, active_brief: brief, active_request: null, since: now });
  const lot = activity === "BUILD" ? resumeLot(root, brief, base) : null;
  return {
    code: 0,
    message:
      fill(
        T.resumeDone,
        activity,
        brief,
        branch,
        lot === null ? "" : fill(T.resumeLot, lot),
        activity === "BUILD" ? T.resumeBuildNext : T.resumeClosingNext,
      ) + MERGE_BACK[lang],
  };
}
