// Versioning guarantee (QUA-094, QUA-095): Git repository, remote on GitHub or GitLab, declared CI
// replaying the hook's checks, protected main branch (merge through PR/MR, required checks, no
// bypass even for administrators). Without access to the forge, the protection stays "not run",
// never "passed" (QUA-013). The protection is only set with `--protect`: the human's agreement.
// A GitHub ruleset's bypass list (`bypass_actors`) is only returned to an administrator (QUA-115):
// read with the human's token when it is one, a non-empty list is a gap; otherwise "not verified",
// never "held". The CI token is not an administrator: the CI does not compare it.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CI_FILES, type Ci } from "./config.js";
import { fill, type MessageLang } from "./i18n.js";
import { TEXTS } from "./guarantees-forge-texts.js";
import { at, type Exec, type GuaranteeConfig } from "./guarantees-table.js";

export type Forge = "github" | "gitlab";

export interface ForgeReport {
  forge: Forge | null;
  branch: string;
  /** Missing elements, each one a reason of the blocking brief. */
  missing: string[];
  /** The protection could not be read (no gh/glab, not logged in): neither held nor refused. */
  notRun: string | null;
  /** Protection read on the forge and complete. */
  protected: boolean;
  /** Read only with an administrator token (QUA-115): said "not verified", never counted as held. */
  unverified: string | null;
}

/** Bypass list of the GitHub rulesets protecting a branch (QUA-115). */
export type Bypass = { state: "none" | "bypass" | "unverified" | "no-ruleset"; actors: string[] };

const ok = (exec: Exec, cmd: string, cwd: string) => exec(cmd, cwd).status === 0;

function json(exec: Exec, cmd: string, cwd: string): unknown {
  const r = exec(cmd, cwd);
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

/** Forge of a remote URL, or null (Bitbucket, Gitea… are out of scope). */
export function forgeOf(url: string): Forge | null {
  if (/github/i.test(url)) return "github";
  if (/gitlab/i.test(url)) return "gitlab";
  return null;
}

function mainBranch(exec: Exec, root: string): string {
  const head = exec("git symbolic-ref --quiet refs/remotes/origin/HEAD", root);
  if (head.status === 0 && head.stdout.trim()) return head.stdout.trim().replace(/^refs\/remotes\/origin\//, "");
  return ok(exec, "git rev-parse --verify --quiet refs/heads/master", root) ? "master" : "main";
}

/**
 * Bypass list of the rulesets that apply to `branch` (QUA-115): each one read by its ID; a ruleset
 * that cannot be read, or that comes without `bypass_actors` (a token that is not an administrator's),
 * makes the whole "unverified".
 */
export function rulesetBypass(exec: Exec, root: string, branch: string): Bypass {
  const rules = json(exec, `gh api repos/{owner}/{repo}/rules/branches/${branch}`, root);
  const ids = [...new Set((Array.isArray(rules) ? rules : []).map((r) => at(r, "ruleset_id")).filter((id) => Number.isInteger(id)))];
  if (!ids.length) return { state: "no-ruleset", actors: [] };
  const actors: string[] = [];
  for (const id of ids) {
    const list = at(json(exec, `gh api repos/{owner}/{repo}/rulesets/${id}`, root), "bypass_actors");
    if (!Array.isArray(list)) return { state: "unverified", actors: [] };
    actors.push(...list.map((a) => `${at(a, "actor_type")} ${at(a, "actor_id") ?? ""}`.trim()));
  }
  return { state: actors.length ? "bypass" : "none", actors };
}

/**
 * For `drwil doctor` (QUA-115): the bypass of the rulesets protecting the main branch, read with the
 * human's token; null off GitHub or without a ruleset (the classic protection is judged by `drwil guarantees`).
 */
export function bypassDiagnosis(
  root: string,
  exec: Exec,
  lang: MessageLang,
): { state: "ok" | "warning" | "problem"; detail: string } | null {
  const T = TEXTS[lang];
  const remote = exec("git remote get-url origin", root);
  if (remote.status !== 0 || forgeOf(remote.stdout) !== "github") return null;
  const branch = mainBranch(exec, root);
  if (!ok(exec, "gh auth status", root)) return { state: "warning", detail: T.bypassUnverified };
  const b = rulesetBypass(exec, root, branch);
  if (b.state === "no-ruleset") return null;
  if (b.state === "unverified") return { state: "warning", detail: T.bypassUnverified };
  return b.state === "bypass"
    ? { state: "problem", detail: fill(T.rulesetBypass, b.actors.join(", ")) }
    : { state: "ok", detail: fill(T.bypassNone, branch) };
}

/** What the GitHub protection of `branch` lacks ([] = complete); null if it cannot be read. */
function githubGaps(exec: Exec, root: string, branch: string, lang: MessageLang, report: ForgeReport): string[] | null {
  const T = TEXTS[lang];
  if (!ok(exec, "gh auth status", root)) return null;
  // Rulesets first (the current way), then the classic protection.
  const rules = json(exec, `gh api repos/{owner}/{repo}/rules/branches/${branch}`, root);
  const types = new Set<unknown>(Array.isArray(rules) ? rules.map((r) => at(r, "type")) : []);
  if (types.has("pull_request") && types.has("required_status_checks")) {
    const bypass = rulesetBypass(exec, root, branch);
    if (bypass.state === "unverified" || bypass.state === "no-ruleset") report.unverified = T.bypassUnverified;
    return bypass.state === "bypass" ? [fill(T.partial, branch, fill(T.rulesetBypass, bypass.actors.join(", ")))] : [];
  }
  const p = json(exec, `gh api repos/{owner}/{repo}/branches/${branch}/protection`, root);
  if (!p) return [fill(T.unprotected, branch)];
  const gaps: string[] = [];
  if (!at(p, "required_pull_request_reviews")) gaps.push(T.noPr);
  if (!at(p, "required_status_checks")) gaps.push(T.noChecks);
  if (!at(p, "enforce_admins", "enabled")) gaps.push(T.adminBypass);
  return gaps.length ? [fill(T.partial, branch, gaps.join(", "))] : [];
}

/** What the GitLab protection of `branch` lacks ([] = complete); null if it cannot be read. */
function gitlabGaps(exec: Exec, root: string, branch: string, lang: MessageLang): string[] | null {
  const T = TEXTS[lang];
  if (!ok(exec, "glab auth status", root)) return null;
  const p = json(exec, `glab api projects/:id/protected_branches/${branch}`, root);
  if (!p) return [fill(T.unprotected, branch)];
  const project = json(exec, "glab api projects/:id", root);
  const gaps: string[] = [];
  const levels = at(p, "push_access_levels");
  if (Array.isArray(levels) && levels.some((l) => at(l, "access_level") !== 0)) gaps.push(T.pushAllowed);
  if (!at(project, "only_allow_merge_if_pipeline_succeeds")) gaps.push(T.noChecks);
  if (at(p, "allow_force_push")) gaps.push(T.adminBypass);
  return gaps.length ? [fill(T.partial, branch, gaps.join(", "))] : [];
}

/** Inspects the repository, the CI and the forge; reads only, writes nothing. */
export function inspectForge(root: string, cfg: GuaranteeConfig, exec: Exec, lang: MessageLang): ForgeReport {
  const T = TEXTS[lang];
  const report: ForgeReport = { forge: null, branch: "main", missing: [], notRun: null, protected: false, unverified: null };
  if (!ok(exec, "git rev-parse --is-inside-work-tree", root)) {
    report.missing.push(T.noGit);
    return report;
  }
  report.branch = mainBranch(exec, root);
  const remote = exec("git remote get-url origin", root);
  report.forge = remote.status === 0 ? forgeOf(remote.stdout) : null;
  if (!report.forge) report.missing.push(T.noRemote);
  const ci = (cfg.ci ?? "none") as Ci;
  const files = CI_FILES[ci] ?? [];
  if (!files.length) report.missing.push(T.noCi);
  for (const f of files) {
    if (!existsSync(join(root, f))) report.missing.push(fill(T.ciFile, f));
    else if (!readFileSync(join(root, f), "utf8").includes("run-checks.mjs")) report.missing.push(T.noReplay);
  }
  if (!report.forge) return report;
  const gaps =
    report.forge === "github" ? githubGaps(exec, root, report.branch, lang, report) : gitlabGaps(exec, root, report.branch, lang);
  if (gaps === null) report.notRun = fill(T.notRun, report.forge === "github" ? "gh" : "glab");
  else {
    report.missing.push(...gaps);
    report.protected = gaps.length === 0;
  }
  return report;
}

/**
 * Sets the protection of the main branch (`--protect`, the human's agreement): merge through PR/MR,
 * the CI job `checks` required, branch up to date, no administrator bypass, no force push.
 * Returns true when every call succeeded.
 */
export function protectBranch(root: string, forge: Forge, branch: string, exec: Exec): boolean {
  if (forge === "github") {
    const body = {
      required_status_checks: { strict: true, contexts: ["checks"] },
      enforce_admins: true,
      required_pull_request_reviews: { required_approving_review_count: 0 },
      restrictions: null,
      allow_force_pushes: false,
      allow_deletions: false,
    };
    const file = join(mkdtempSync(join(tmpdir(), "drwil-protect-")), "protection.json");
    writeFileSync(file, JSON.stringify(body));
    return ok(exec, `gh api -X PUT repos/{owner}/{repo}/branches/${branch}/protection --input ${JSON.stringify(file)}`, root);
  }
  return (
    ok(
      exec,
      `glab api -X POST projects/:id/protected_branches -f name=${branch} -f push_access_level=0 -f merge_access_level=40 -f allow_force_push=false`,
      root,
    ) && ok(exec, "glab api -X PUT projects/:id -f only_allow_merge_if_pipeline_succeeds=true", root)
  );
}
