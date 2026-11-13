// Forge client of merge-auto.mjs (QUA-161, QUA-162), and pr-watch.mjs's readings of the forge (QUA-100): the same
// gestures on GitHub (`gh`) and GitLab (`glab`), the change request always read in GitHub's shape `{ number, state, headRefName, mergeStateStatus, autoMergeRequest }`, so that the
// merge sequence and its guarantees stay one code for both forges. The forge is chosen by close-checks' `changeForge`.
import { spawnSync } from "node:child_process";

/** Time limit of one call to the forge (QUA-100): a blocked `gh` or `glab` never holds the follow-up past its own limit. */
export const FORGE_TIMEOUT_MS = 60_000;

/**
 * `tool` for real with a time limit: { status, stdout, stderr }; status null when it does not start or is cut at the
 * limit, so a blocked call is « not run », never a success (QUA-013).
 */
export function forgeRun(tool, args, { timeout = FORGE_TIMEOUT_MS, run = spawnSync } = {}) {
  const r = run(tool, args, { encoding: "utf8", timeout });
  if (r.error?.code !== "ETIMEDOUT" && !(r.signal && r.status === null)) return r;
  return { ...r, status: null, stderr: `${tool} : délai de ${timeout / 1000} s dépassé (time limit reached)` };
}
/** `gh` for real: { status, stdout, stderr }; status null when gh does not start or is cut at the limit. */
export const ghRun = (args, options) => forgeRun("gh", args, options);
/** `glab` for real, same shape. */
export const glabRun = (args, options) => forgeRun("glab", args, options);

/** Parsed JSON of a run, or null when the tool fails or answers something unreadable. */
const parse = (r) => {
  try {
    return r.status === 0 ? JSON.parse(r.stdout) : null;
  } catch {
    return null;
  }
};

const STATES = { opened: "OPEN", merged: "MERGED", closed: "CLOSED", locked: "CLOSED" };
// GitLab still computing the mergeability: like GitHub's UNKNOWN, never scheduled on it (QUA-162).
const NOT_COMPUTED = new Set(["unchecked", "checking", "preparing", "approvals_syncing", "cannot_be_merged_recheck"]);

/** GitHub's mergeStateStatus of a GitLab merge request: DIRTY (conflict), BEHIND (rebase needed), UNKNOWN, or its own status. */
export function mergeStatus(mr) {
  const status = mr.detailed_merge_status ?? mr.merge_status;
  if (mr.has_conflicts === true || status === "conflict" || status === "cannot_be_merged") return "DIRTY";
  if (status === "need_rebase") return "BEHIND";
  // A missing status is unknown, never a go (QUA-013).
  return typeof status !== "string" || NOT_COMPUTED.has(status) ? "UNKNOWN" : status.toUpperCase();
}

/** A GitLab merge request (`glab mr view --output json`) in GitHub's shape; null when unreadable. */
export function normalizeMr(mr) {
  if (!mr || typeof mr !== "object" || mr.iid === undefined) return null;
  return {
    number: mr.iid,
    state: STATES[mr.state] ?? String(mr.state).toUpperCase(),
    headRefName: mr.source_branch,
    mergeStateStatus: mergeStatus(mr),
    // Only a literal true counts as scheduled: never claimed without seeing it (QUA-162).
    autoMergeRequest: mr.merge_when_pipeline_succeeds === true || mr.auto_merge_enabled === true ? {} : null,
  };
}

const GITLAB_TEXTS = {
  fr: {
    notAllowed:
      "[merge-auto] fusion automatique non permise pour la {0} : le projet doit lancer un pipeline sur la MR et permettre « Auto-merge » (réglages GitLab, Merge requests), ou l'humain fusionne à la main. Rester en CLOSING ; la fusion n'est PAS programmée.",
    notScheduled:
      "[merge-auto] la fusion de la {0} n'apparaît pas programmée (merge_when_pipeline_succeeds faux) : la fusion n'est PAS programmée.",
    merged:
      "[merge-auto] {0} fusionnée par la commande elle-même (son pipeline avait déjà réussi). CI de la branche principale non suivie hors GitHub, à vérifier à la main.",
  },
  en: {
    notAllowed:
      "[merge-auto] automatic merge not allowed for {0}: the project must run a pipeline on the MR and allow « Auto-merge » (GitLab settings, Merge requests), or the human merges by hand. Stay in CLOSING; the merge is NOT scheduled.",
    notScheduled:
      "[merge-auto] the merge of {0} does not appear scheduled (merge_when_pipeline_succeeds false): the merge is NOT scheduled.",
    merged:
      "[merge-auto] {0} merged by the command itself (its pipeline had already succeeded). Main branch CI not followed outside GitHub, to check by hand.",
  },
};

/**
 * The client of `forge` ("github" or "gitlab"): `tool` for the messages, `view(pr)` (normalized or null),
 * `update(n)`, `updateHint(n)`, `merge(n)` (raw runs), `notAllowed` (refusal of the repository) and `texts` (messages
 * that differ from GitHub's, per language).
 */
export function forgeClient(forge, { gh = ghRun, glab = glabRun } = {}) {
  if (forge === "gitlab")
    return {
      tool: "glab",
      view: (mr) => normalizeMr(parse(glab(["mr", "view", ...(mr ? [mr] : []), "--output", "json"]))),
      update: (n) => glab(["mr", "rebase", String(n)]),
      updateHint: (n) => `glab mr rebase ${n}`,
      // --yes: no confirmation prompt, the hook is not interactive.
      merge: (n) => glab(["mr", "merge", String(n), "--auto-merge", "--yes"]),
      notAllowed: /not allowed|405/i,
      texts: GITLAB_TEXTS,
    };
  return {
    tool: "gh",
    view: (pr) => parse(gh(["pr", "view", ...(pr ? [pr] : []), "--json", "number,state,mergeStateStatus,autoMergeRequest,headRefName"])),
    update: (n) => gh(["pr", "update-branch", String(n)]),
    updateHint: (n) => `gh pr update-branch ${n}`,
    merge: (n) => gh(["pr", "merge", String(n), "--auto", "--merge"]),
    notAllowed: /not allowed/i,
    texts: { fr: {}, en: {} },
  };
}

/** `gh` (or `glab`, `tool`) with JSON output, cut at `timeout` ms; null when it fails, is cut or answers something unreadable. */
export function ghJson(args, run = spawnSync, tool = "gh", timeout = FORGE_TIMEOUT_MS) {
  const r = run(tool, args, { encoding: "utf8", timeout });
  // Cut at the limit: whatever it printed is partial, never a state (QUA-013).
  if (r.error || r.signal) return null;
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
  if (c.state !== undefined)
    return c.state === "SUCCESS" ? "pass" : c.state === "EXPECTED" ? "queued" : c.state === "PENDING" ? "pending" : "fail";
  if (c.status === "IN_PROGRESS") return "pending";
  if (c.status !== "COMPLETED") return "queued";
  if (c.conclusion === "SUCCESS") return "pass";
  // Skipped or neutral: nothing was proven, never a pass (QUA-100).
  if (["NEUTRAL", "SKIPPED"].includes(c.conclusion)) return "skip";
  return c.conclusion === "CANCELLED" ? "cancel" : "fail";
}

/**
 * CI state of a list of `{ name, bucket }`: { state: "none" | "red" | "pending" | "green", failed?, pending?, running?,
 * queued?, total?, early? }. Green needs one check really passed. `early`: a check is skipped with no run of the same
 * name, and none has both — the skipped push run may be all that is visible yet, before the PR's own run.
 */
export function ciOf(checks) {
  const names = (b) => checks.filter((c) => b.includes(c.bucket)).map((c) => c.name);
  const failed = names(["fail", "cancel"]);
  if (failed.length) return { state: "red", failed };
  const running = names(["pending"]);
  const queued = names(["queued"]);
  if (running.length || queued.length) return { state: "pending", pending: running.length + queued.length, running, queued };
  const total = names(["pass"]).length;
  if (!total) return { state: "none" };
  const ran = new Set(checks.filter((c) => c.bucket !== "skip").map((c) => c.name));
  const skipped = new Set(names(["skip"]));
  const early = [...skipped].some((n) => !ran.has(n)) && ![...skipped].some((n) => ran.has(n));
  return { state: "green", total, early };
}

/** One look at the PR: { state: "merged" | "closed" | "green" | "red" | "pending" | "none" | "not-run", … }; merged: `ci`, its CI state. */
export function look(pr, gh) {
  const view = gh(["pr", "view", ...(pr ? [pr] : []), "--json", "number,state,statusCheckRollup,mergeCommit,headRefOid,headRefName"]);
  if (!view) return { state: "not-run" };
  const ci = ciOf((view.statusCheckRollup ?? []).map((c) => ({ name: c.name ?? c.context, bucket: bucket(c) })));
  const branch = view.headRefName;
  if (view.state === "MERGED")
    return { state: "merged", number: view.number, mergeCommit: view.mergeCommit?.oid, ci: ci.state, head: view.headRefOid, branch };
  if (view.state === "CLOSED") return { state: "closed", number: view.number };
  return { ...ci, number: view.number, head: view.headRefOid, branch };
}

/** Local commit of `branch` in `root` (HEAD when it is checked out); null without such a branch or Git. */
export function localTip(root, branch) {
  if (!branch) return null;
  const r = spawnSync("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}^{commit}`], {
    cwd: root,
    encoding: "utf8",
    timeout: 20_000,
  });
  return r.status === 0 ? r.stdout.trim() : null;
}

// GitLab job statuses: never started, or running (the others are over or manual).
const GITLAB_QUEUED = new Set(["created", "pending", "waiting_for_resource", "preparing", "scheduled"]);

/** One look at the MR through close-checks' `lookMr` (passed in: importing it would loop back to close.mjs), completed from the same answers: branch, job names, passed count. */
export function lookGitlab(pr, glab, lookMr) {
  let view = null;
  let jobs = null;
  const s = lookMr(pr, (a) => {
    const r = glab(a);
    if (a[0] === "mr") view = r;
    else jobs = r;
    return r;
  });
  const list = Array.isArray(jobs) ? jobs : [];
  const of = (keep) => list.filter((j) => keep(j.status)).map((j) => j.name);
  const more = { branch: view?.source_branch };
  if (s.state === "pending") Object.assign(more, { running: of((x) => x === "running"), queued: of((x) => GITLAB_QUEUED.has(x)) });
  // A skipped job never counts as passed (QUA-100); without readable jobs, the pipeline's own success.
  if (s.state === "green") more.total = of((x) => x === "success").length || s.total;
  return { ...s, ...more };
}
