// Forge client of merge-auto.mjs (QUA-161, QUA-162): the same gestures on GitHub (`gh`) and GitLab (`glab`), the change
// request always read in GitHub's shape `{ number, state, headRefName, mergeStateStatus, autoMergeRequest }`, so that the
// merge sequence and its guarantees stay one code for both forges. The forge is chosen by close-checks' `changeForge`.
import { spawnSync } from "node:child_process";

/** `gh` for real: { status, stdout, stderr }; status null when gh does not start. */
export const ghRun = (args) => spawnSync("gh", args, { encoding: "utf8" });
/** `glab` for real, same shape. */
export const glabRun = (args) => spawnSync("glab", args, { encoding: "utf8" });

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
