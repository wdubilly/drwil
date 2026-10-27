#!/usr/bin/env node
// Detour (QUA-050): mid-workstream, a prior defect outside the active brief's scope is fixed on its own
// branch, cut from the main branch, under its own short brief — the workstream's scope never widens
// for it (QUA-019, no bypassing a check; QUA-017, no direct work on the main branch).
// - `open <name> --title <defect> [--files <a,b>]` (BUILD): sets the work in progress aside (named
//   stash, recorded in the state), creates the branch detour/<name> and its brief, points the state at it.
// - `resume` (once the detour's PR is merged, by squash too: `branchMerged` in close.mjs): back to the
//   workstream's branch, rebased on the fixed main branch, the work restored, the state pointed back at the workstream's brief; refused without
//   losing anything if any step fails.
// - `allow` (human, interactive terminal): the yes a detour, or a reopened workstream's fix (QUA-117),
//   that changes the rules needs; until then the scope gate refuses its commits touching them (`rulesFiles`).
// It never commits, pushes nor opens the PR; the state is written by `setDetour` (state.mjs) only.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BRIEF_DIRS, config } from "./briefs.mjs";
import { branchMerged, mainBranch, mergedPullRequests, noGhText } from "./close.mjs";
import { contractsAddedOnly, isRegistry, RULES, rulesFiles } from "./detour-rules.mjs";
import { JOURNAL, TEXTS } from "./detour-texts.mjs";
import { minimumLevel, SENSITIVE_PATHS } from "./risk.mjs";
import { normalize } from "./scope.mjs";
import { readState, setDetour, stateRoot, writeState } from "./state.mjs";
import { fill } from "./state-texts.mjs";

export { contractsAddedOnly, isRegistry, RULES, rulesFiles };

const texts = (root) => TEXTS[config(root).lang === "en" ? "en" : "fr"];
const done = (message) => ({ code: 0, message });
const refused = (message) => ({ code: 1, message });

const git = (root, ...args) => {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
};

/** The ref a detour starts from and a resume rebases on: the remote main branch, fetched, if any; else the local one. */
function baseRef(root, main) {
  if (git(root, "rev-parse", "--verify", "--quiet", `refs/remotes/origin/${main}`) === null) return main;
  git(root, "fetch", "-q", "origin", main);
  return `origin/${main}`;
}

/** Opens a detour (see the header). `{ code, message }`. */
export function open(root, name, { title, files = [], now = new Date().toISOString() } = {}) {
  const T = texts(root);
  const cfg = config(root);
  const { state } = readState(root);
  if (state.activity !== "BUILD") return refused(fill(T.notBuild, state.activity));
  if (state.detour) return refused(fill(T.already, state.detour.branch));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name ?? "") || !title) return refused(T.name);
  const main = mainBranch(root);
  const current = git(root, "symbolic-ref", "--quiet", "--short", "HEAD");
  if (!main || !current || current === main) return refused(T.noBranch);
  const branch = `detour/${name}`;
  const brief = `${BRIEF_DIRS[0]}detour-${name}.md`;
  if (git(root, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`) !== null || existsSync(join(root, brief)))
    return refused(fill(T.exists, branch, brief));
  const base = baseRef(root, main);
  // The branch first: a failed `git switch -c` leaves the worktree half switched; `git branch` touches nothing.
  const r = spawnSync("git", ["branch", branch, base], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) return refused(fill(T.switchFailed, r.stderr.trim()));
  let stash = null;
  if (git(root, "status", "--porcelain") !== "") {
    if (git(root, "stash", "push", "-q", "--include-untracked", "-m", `drwil-detour: ${name}`) === null) {
      git(root, "branch", "-D", branch);
      return refused(T.stashFailed);
    }
    stash = git(root, "rev-parse", "stash@{0}");
  }
  // Clean worktree (everything set aside), new branch from an existing commit: nothing left to block it.
  git(root, "switch", "-q", branch);
  const list = files.map(normalize);
  const risk = minimumLevel(list, cfg.risk?.sensitivePaths ?? SENSITIVE_PATHS) === "HIGH" ? "HIGH" : "MEDIUM";
  mkdirSync(dirname(join(root, brief)), { recursive: true });
  const origin = state.active_brief;
  const scopeLines = list.map((f) => `  - ${f}`).join("\n");
  writeFileSync(join(root, brief), fill(T.brief, title, origin, branch, now.slice(0, 10), risk, scopeLines));
  setDetour(root, brief, { origin_brief: origin, origin_branch: current, branch, stash }, now);
  const rules = rulesFiles(list, cfg);
  const report = [
    fill(T.opened, branch, base, brief, stash ? fill(T.stashed, stash.slice(0, 7)) : ""),
    fill(T.steps, origin, branch, brief, state.auto_merge === true ? T.auto : T.manual),
  ];
  if (rules.length) report.push(fill(T.rulesAhead, rules.join(", ")));
  return done(report.join("\n"));
}

/** Closes the detour and goes back to the workstream (see the header). `{ code, message }`. */
export function resume(root, { now = new Date().toISOString(), gh } = {}) {
  const T = texts(root);
  const { state } = readState(root);
  const d = state.detour;
  if (!d) return refused(T.noDetour);
  if (git(root, "status", "--porcelain") !== "") return refused(T.dirty);
  const base = baseRef(root, mainBranch(root) ?? "main");
  // A PR merged by squash leaves no trace git can see: gh proves it (QUA-058), git alone without it (QUA-059).
  let merged = branchMerged(root, d.branch, base, []);
  if (merged === "no") merged = branchMerged(root, d.branch, base, mergedPullRequests(root, { branch: d.branch, gh }));
  if (merged === "unknown") return refused(`${fill(T.notMerged, d.branch, base)} (${noGhText(root)})`);
  if (merged === "no") return refused(fill(T.notMerged, d.branch, base));
  if (git(root, "cat-file", "-e", `${base}:${state.active_brief}`) !== null) return refused(fill(T.briefLeft, state.active_brief, base));
  if (!(git(root, "show", `${base}:${JOURNAL}`) ?? "").includes(d.branch)) return refused(fill(T.noJournal, d.branch, base));
  if (git(root, "switch", "-q", d.origin_branch) === null) return refused(fill(T.switchBack, d.origin_branch));
  if (git(root, "rebase", "-q", base) === null) {
    git(root, "rebase", "--abort");
    return refused(fill(T.rebase, d.origin_branch, base));
  }
  if (d.stash) {
    const n = git(root, "stash", "list", "--format=%H").split("\n").indexOf(d.stash);
    if (n < 0) return refused(fill(T.stashMissing, d.stash.slice(0, 7)));
    if (git(root, "stash", "apply", "-q", `stash@{${n}}`) === null) {
      // The worktree was clean before the apply: what is there now comes from the stash, which stays.
      git(root, "reset", "-q", "--hard");
      git(root, "clean", "-fdq");
      return refused(fill(T.restore, d.stash.slice(0, 7)));
    }
    git(root, "stash", "drop", "-q", `stash@{${n}}`);
  }
  setDetour(root, d.origin_brief, null, now);
  const pushed = git(root, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}") !== null;
  return done([fill(T.resumed, d.origin_brief, d.origin_branch, base), ...(pushed ? [T.forcePush] : [])].join("\n"));
}

/**
 * The human's yes for a detour, or a reopened workstream's fix (QUA-117), that changes the rules;
 * `confirm(question)` only in an interactive terminal.
 */
export async function allow(root, { tty = false, confirm } = {}) {
  const T = texts(root);
  const { state } = readState(root);
  const reopened = !state.detour && state.reopened;
  if (!state.detour && !reopened) return refused(T.noDetour);
  if (!tty || typeof confirm !== "function") return refused(T.human);
  const name = reopened ? state.active_brief : state.detour.branch;
  if (!(await confirm(fill(reopened ? T.reopenConfirm : T.confirm, name)))) return refused(T.refused);
  if (reopened) writeState(root, { ...state, reopened: { ...state.reopened, human: true } });
  else setDetour(root, state.active_brief, { ...state.detour, human: true });
  return done(fill(reopened ? T.reopenAllowed : T.allowed, name));
}

/** Value of the `--name value` option in `args`, or undefined. */
function option(args, name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

/** Entry point: `node .githooks/detour.mjs open|resume|allow …`. Returns the exit code. */
export async function main(args, root) {
  let r;
  if (args[0] === "open") {
    const files = (option(args, "--files") ?? "").split(",").filter(Boolean);
    r = open(root, args[1], { title: option(args, "--title"), files });
  } else if (args[0] === "resume") r = resume(root);
  else if (args[0] === "allow") {
    const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    const confirm = async (question) => {
      const { createInterface } = await import("node:readline/promises");
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        return (await rl.question(question)).trim() === "DETOUR";
      } finally {
        rl.close();
      }
    };
    r = await allow(root, { tty, confirm });
  } else {
    console.error(texts(root).usage);
    return 2;
  }
  (r.code === 0 ? console.log : console.error)(`${r.code === 0 ? "✓" : "✗"} ${r.message}`);
  return r.code;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = await main(process.argv.slice(2), stateRoot());
}
