// The pull request (GitHub) or merge request branch (GitLab) a CI pass belongs to, and the verdicts its previous pass left (QUA-250),
// split from run-checks-verdicts.mjs: the CI files only call it, nothing of this lives in YAML.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const PREVIOUS = ".drwil/evidence/pr-previous";
const SHA = /^[0-9a-f]{40,64}$/;
const git = (...args) => spawnSync("git", args, { encoding: "utf8" });

// A fork gets no identity (a pull request must not read or write verdicts through a repository it does not own).
function githubContext(env) {
  if (env.GITHUB_EVENT_NAME !== "pull_request") return null;
  let pr;
  try {
    pr = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8")).pull_request;
  } catch {
    return null;
  }
  if (pr?.head?.repo?.full_name !== env.GITHUB_REPOSITORY) return null;
  return { id: `${env.GITHUB_REPOSITORY}#${pr.number}`, head: pr.head.sha, base: pr.base.sha, run: env.GITHUB_RUN_ID };
}

// GitLab runs one pipeline per push (QUA-263, no merge request pipeline): the branch is the identity of the merge request.
function gitlabContext(env) {
  const target = env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME || env.CI_DEFAULT_BRANCH;
  if (env.CI_COMMIT_TAG || !env.CI_COMMIT_BRANCH || env.CI_COMMIT_BRANCH === target) return null;
  git("fetch", "--quiet", "origin", `+refs/heads/${target}:refs/remotes/origin/${target}`);
  const base = git("rev-parse", `origin/${target}`).stdout.trim();
  return { id: `${env.CI_PROJECT_ID}:${env.CI_COMMIT_BRANCH}`, head: env.CI_COMMIT_SHA, base, run: env.CI_PIPELINE_ID };
}

/**
 * What the CI says of this pass: `{ id, head, base, run, previousRun }`, or null (not in CI, not a pull request, a fork, an unreadable
 * commit): nothing is then written nor read. `DRWIL_PR_ID`, `DRWIL_PR_HEAD`, `DRWIL_PR_BASE`, `DRWIL_PR_RUN` state it for another CI;
 * `previousRun` is the run `--pr-previous` downloaded from (or `DRWIL_PR_PREVIOUS_RUN`), undefined when the CI cannot name it.
 */
export function prContext(env = process.env) {
  if (!env.CI) return null;
  let ctx = null;
  if (env.DRWIL_PR_ID) ctx = { id: env.DRWIL_PR_ID, head: env.DRWIL_PR_HEAD, base: env.DRWIL_PR_BASE, run: env.DRWIL_PR_RUN };
  else if (env.GITHUB_ACTIONS) ctx = githubContext(env);
  else if (env.GITLAB_CI) ctx = gitlabContext(env);
  if (!SHA.test(ctx?.head) || !SHA.test(ctx.base)) return null;
  let previousRun = env.DRWIL_PR_PREVIOUS_RUN;
  try {
    previousRun ??= readFileSync(`${PREVIOUS}/run`, "utf8").trim();
  } catch {}
  return { ...ctx, previousRun };
}

/** True when the pull request changes the hooks or the configuration: the replay with the base's hooks (QUA-113) then plays everything. */
export const hooksChanged = (ctx) => git("diff", "--quiet", ctx.base, "--", ".githooks", ".drwil/ia-first.json").status !== 0;

// GitHub: the runs of this very pull request (same repository), newest first.
function githubRuns(exec, env, repo, number) {
  const branch = encodeURIComponent(env.GITHUB_HEAD_REF);
  const found = exec("gh", ["api", `repos/${repo}/actions/runs?event=pull_request&branch=${branch}&per_page=30`], { encoding: "utf8" });
  let runs = [];
  try {
    runs = JSON.parse(found.stdout).workflow_runs;
  } catch {}
  return runs
    .filter((r) => String(r.id) !== env.GITHUB_RUN_ID && r.path.startsWith(".github/workflows/ia-first.yml"))
    .filter((r) => r.head_repository.full_name === r.repository.full_name && r.pull_requests.some((p) => p.number === Number(number)))
    .map((r) => String(r.id));
}

/**
 * Downloads, into `.drwil/evidence/pr-previous`, the verdicts of the previous pass of this same pull request: the artifact `pr-verdicts`
 * of its previous run (GitHub, `run` forced when the plan already chose it) or of the last successful pipeline of the branch (GitLab).
 * Nothing is trusted here: run-checks checks the sum, the identity, the commit, the base and the fingerprint (QUA-013).
 * Returns the run it read from (GitHub), "" (GitLab), null when there is nothing to read.
 */
export function fetchPrevious(run, env = process.env, exec = spawnSync) {
  const ctx = prContext(env);
  rmSync(PREVIOUS, { recursive: true, force: true });
  if (!ctx) return null;
  mkdirSync(PREVIOUS, { recursive: true });
  if (env.GITHUB_ACTIONS) {
    const [repo, number] = ctx.id.split("#");
    for (const candidate of run ? [run] : githubRuns(exec, env, repo, number)) {
      if (exec("gh", ["run", "download", candidate, "--repo", repo, "--name", "pr-verdicts", "--dir", PREVIOUS]).status !== 0) continue;
      writeFileSync(`${PREVIOUS}/run`, candidate);
      return candidate;
    }
  } else {
    const url = `${env.CI_API_V4_URL}/projects/${env.CI_PROJECT_ID}/jobs/artifacts/${encodeURIComponent(env.CI_COMMIT_BRANCH)}/raw/.drwil/evidence/pr-verdicts`;
    const ok = ["pr-verdicts.json", "pr-verdicts.sum"].every(
      (f) =>
        exec("curl", ["-sSfL", "--header", `JOB-TOKEN: ${env.CI_JOB_TOKEN}`, "-o", `${PREVIOUS}/${f}`, `${url}/${f}?job=checks`]).status ===
        0,
    );
    if (ok) return "";
  }
  console.error("No previous verdict of this pull request: every slow check is replayed.");
  rmSync(PREVIOUS, { recursive: true, force: true });
  return null;
}
