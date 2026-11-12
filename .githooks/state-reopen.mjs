// Reopening of a closed workstream (split from state-cli.mjs; QUA-116).
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { config } from "./briefs.mjs";
import { ghRun, mainBranch } from "./close.mjs";
import { glabRun } from "./close-branches.mjs";
import { changeForge } from "./close-checks.mjs";
import { normalizeMr } from "./merge-auto-forge.mjs";
import { readState, writeState } from "./state.mjs";
import { fill } from "./state-texts.mjs";
import { texts } from "./state-validate.mjs";

// GitLab's words for the messages that name the change request or its tool (QUA-116): state-messages-*.mjs are full.
const GITLAB_TEXTS = {
  fr: {
    reopenUnknown:
      "réouverture refusée : l'état de la MR de {0} est inconnu (glab absent, non connecté, ou aucune MR) — un état non établi ne rouvre rien ; rien n'a changé",
    reopenNotOpen:
      "réouverture refusée : la MR !{0} est {1}, pas ouverte — un défaut après la fusion relève d'un nouveau chantier ou de l'entretien courant ; rien n'a changé",
    reopenAutoMerge:
      "réouverture refusée : la fusion automatique de la MR !{0} n'a pas pu être annulée (`glab api --method POST projects/:id/merge_requests/{0}/cancel_merge_when_pipeline_succeeds`) — la branche ne reçoit rien tant qu'elle est programmée ; rien d'autre n'a changé",
    reopenMessage: "Réouverture de {0} : défaut révélé par la MR !{1}",
    reopened: "CLOSING → BUILD (réouverture de {0}, MR !{1} ouverte)",
  },
  en: {
    reopenUnknown:
      "reopening refused: the state of the MR of {0} is unknown (glab missing, not logged in, or no MR) — a state not established reopens nothing; nothing changed",
    reopenNotOpen:
      "reopening refused: MR !{0} is {1}, not open — a defect after the merge belongs to a new workstream or to routine maintenance; nothing changed",
    reopenAutoMerge:
      "reopening refused: the automatic merge of MR !{0} could not be cancelled (`glab api --method POST projects/:id/merge_requests/{0}/cancel_merge_when_pipeline_succeeds`) — the branch receives nothing while it is scheduled; nothing else changed",
    reopenMessage: "Reopening of {0}: defect revealed by MR !{1}",
    reopened: "CLOSING → BUILD (reopening of {0}, MR !{1} open)",
  },
};

/**
 * Reopens a closed workstream whose pull request revealed a defect before its merge (QUA-116): from
 * CLOSING, on the workstream's branch, clean worktree, its PR open. The automatic merge is cancelled
 * first (a branch whose merge is scheduled receives no push); the brief, and each file it cites that the
 * branch deleted, come back as they were before the commit that deleted them, in a commit of their own (hooks run); then BUILD on it, `reopened` set, the
 * merge authorisation and the queue kept. History is never rewritten, nothing is pushed. Refused
 * without changing anything otherwise; a failed git, gh or glab call refuses, never lets through (QUA-013).
 * `{ code, message }`.
 */
export function reopen(root, { gh = ghRun, glab = glabRun, forge = changeForge(root), now = new Date().toISOString() } = {}) {
  const gitlab = forge === "gitlab";
  const T = gitlab ? { ...texts(root), ...GITLAB_TEXTS[config(root).lang === "en" ? "en" : "fr"] } : texts(root);
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
  // On GitLab the merge request is read in GitHub's shape (merge-auto-forge's normalizeMr): one guard for both forges.
  const read = () =>
    gitlab
      ? normalizeMr(JSON.parse(glab(root, ["mr", "view", branch, "--output", "json"]) ?? ""))
      : JSON.parse(gh(root, ["pr", "view", branch, "--json", "number,state,autoMergeRequest"]) ?? "");
  const view = () => {
    try {
      const pr = read();
      return pr && Number.isInteger(pr.number) && typeof pr.state === "string" ? pr : null;
    } catch {
      return null;
    }
  };
  const pr = view();
  if (!pr) return refused("reopenUnknown", branch);
  if (pr.state !== "OPEN") return refused("reopenNotOpen", pr.number, pr.state);
  // The brief before the closing: the parent of the branch's commit that deleted it; still in HEAD, nothing to restore.
  const lastDeletion = (file) => git("log", "-1", "--diff-filter=D", "--format=%H", `${main}..HEAD`, "--", file);
  const missing = (file) => git("cat-file", "-e", `HEAD:${file}`) === null;
  let text = null;
  if (missing(brief)) {
    const closing = lastDeletion(brief);
    text = closing ? raw("show", `${closing}^:${brief}`) : null;
    if (!text) return refused("reopenNoBrief", brief, branch);
  }
  // Files the brief cites (code spans, scope block) that the branch deleted, the origin intention first: the restored
  // brief would otherwise cite a missing path and the commit be refused. Never a file deleted elsewhere than on the branch.
  const briefText = text ?? readFileSync(join(root, brief), "utf8");
  const cited = [
    ...new Set([...briefText.matchAll(/`([^`\s*]+\/[^`\s*]*[^`\s*/])`|^\s+- (\S+\/\S*[^\s/])$/gm)].map((m) => m[1] ?? m[2])),
  ].filter((f) => f !== brief && !f.includes("..") && !f.includes("://") && missing(f) && lastDeletion(f));
  const restoredFiles = [...(text === null ? [] : [brief]), ...cited];
  let cancelled = "";
  if (pr.autoMergeRequest) {
    const cancel = gitlab
      ? glab(root, ["api", "--method", "POST", `projects/:id/merge_requests/${pr.number}/cancel_merge_when_pipeline_succeeds`])
      : gh(root, ["pr", "merge", String(pr.number), "--disable-auto"]);
    const after = cancel === null ? null : view();
    if (!after || after.autoMergeRequest) return refused("reopenAutoMerge", pr.number);
    cancelled = `\n${T.reopenCancelled}`;
  }
  if (restoredFiles.length) {
    let r;
    restoredFiles.every((file) => {
      r = spawnSync("git", ["checkout", `${lastDeletion(file)}^`, "--", file], { cwd: root, encoding: "utf8" });
      return r.status === 0;
    });
    if (r.status === 0) {
      for (const args of [
        ["add", "--", ...restoredFiles],
        ["commit", "-q", "-m", fill(T.reopenMessage, brief, pr.number), "--", ...restoredFiles],
      ]) {
        r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
        if (r.status !== 0) break;
      }
    }
    if (r.status !== 0) {
      raw("reset", "-q", "--", ...restoredFiles);
      for (const file of restoredFiles) rmSync(join(root, file), { force: true });
      // The tool never reschedules the merge (it could merge the faulty code): the mark keeps the reminder alive.
      if (cancelled) writeState(root, { ...state, merge_cancelled: { pr: pr.number } });
      return {
        code: 1,
        message: fill(T.reopenCommitFailed, r.stderr.trim().split("\n").at(-1)) + (cancelled && `\n${T.reopenCancelledHuman}`),
      };
    }
  }
  const { merge_cancelled: _, ...kept } = state;
  writeState(root, { ...kept, activity: "BUILD", since: now, reopened: { pr: pr.number } });
  const sha = restoredFiles.length ? git("rev-parse", "--short", "HEAD") : "";
  const restored = text === null ? "" : `\n${fill(T.reopenRestored, brief, sha)}`;
  const restoredCited = cited.length ? `\n${fill(T.reopenRestoredCited, cited.length, cited.join(", "), sha)}` : "";
  return { code: 0, message: fill(T.reopened, brief, pr.number) + restored + restoredCited + cancelled };
}
