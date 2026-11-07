#!/usr/bin/env node
// Closing of a workstream in one gesture (QUA-048): `node .githooks/close.mjs` (in CLOSING) deletes
// the brief, removes its index line and records the consumption; `--check` (any activity) only
// reports, before the commit, what would make the closing fail. It never stages, commits, pushes nor
// merges anything, and it never writes the state: journal decisions and limits stay the agent's.
// The recognition and deletion of the merged local branches live in close-branches.mjs (QUA-048,
// QUA-058, QUA-059), re-exported here.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { undeclaredHooks } from "./base-checks.mjs";
import { config } from "./briefs.mjs";
import { bareNames, closingCi, criteriaToCreate, deadReferences, lookMr, referenceScope } from "./close-checks.mjs";
import { closingMechanics } from "./close-mechanics.mjs";
import { limitProblems } from "./close-limits.mjs";
import { journalPlan } from "./close-journal.mjs";
import { texts } from "./close-texts.mjs";
import {
  applyProposals,
  checkboxProblems,
  codeCitations,
  deadReferences as deadCitations,
  intentLeft,
  proposals,
  twinIntents,
} from "./doc-coherence.mjs";
import { ghJson, look } from "./pr-watch.mjs";
import { lateLines } from "./worktree.mjs";
import { readState, stateRoot, verifyEvidence } from "./state.mjs";

// Compatibility: the branches' functions live in close-branches.mjs, importers keep this path.
export {
  branchMerged,
  closingMerged,
  ghRun,
  mainBranch,
  mergedPullRequests,
  noGhText,
  prunedMessage,
  pruneMergedBranches,
} from "./close-branches.mjs";

/**
 * What would make the closing of `brief` fail and what it only warns about; `text`: the brief, read before it
 * is deleted. `problems`: `{ message }`, with the line rewrite (`file`, `line`, and `edit` or `fixTo`) when
 * the correction needs no judgement; the rules shared with check-docs live in doc-coherence.mjs.
 */
export function closingReport(root, brief, text = existsSync(join(root, brief)) ? readFileSync(join(root, brief), "utf8") : "") {
  const cfg = config(root);
  const lang = cfg.lang === "en" ? "en" : "fr";
  const T = texts(root);
  const journal = journalPlan(root, brief, text);
  const plain = [
    ...(journal.problem ? [journal.problem] : []),
    ...criteriaToCreate(root, brief, text),
    ...undeclaredHooks(root, text).lines,
    ...limitProblems(root, text),
    ...deadReferences(root, brief),
    ...referenceScope(root, brief),
    ...bareNames(root),
  ].map((message) => ({ message }));
  const reported = new Set(plain.map((p) => /^(\S+:\d+) /.exec(p.message)?.[1]));
  const code = codeCitations(root, cfg, lang).filter((c) => !reported.has(c.place));
  const boxes = checkboxProblems(root, cfg, lang, { except: brief }).map((p) => ({
    ...p,
    message: `${p.place} : ${p.message}${p.fixTo ? "" : ` — ${T.byHand}`}`,
  }));
  const problems = [
    ...plain,
    ...deadCitations(root, cfg, lang, brief),
    ...boxes,
    ...code,
    ...intentLeft(root, lang, brief, text).map((message) => ({ message })),
  ];
  return { problems, warnings: twinIntents(root, cfg, lang) };
}

/** What would make the closing of `brief` fail, as messages. */
export const closingSignals = (root, brief, text) => closingReport(root, brief, text).problems.map((p) => p.message);

const STEPS = ["BUILD", "EVIDENCE", "VERIFY", "CLOSING"];

/**
 * The commands that remain from `activity` to CLOSING (neighbouring transitions only), the evidence
 * renewal placed before the last one when it is absent or from another commit than HEAD; null outside
 * a started workstream, where closing is not in the agent's hands.
 */
export function pathToClosing(root, activity) {
  const at = STEPS.indexOf(activity);
  if (at < 0 || at === STEPS.length - 1) return null;
  const T = texts(root);
  const steps = STEPS.slice(at + 1).map((a) => `node .githooks/state.mjs move ${a}`);
  const evidence = verifyEvidence(root);
  if (!evidence.ok && (evidence.code === "noEvidence" || evidence.code === "otherCommit")) steps.splice(steps.length - 1, 0, T.rerun);
  return T.path(steps);
}

/** One look at the CI of the branch's PR (GitHub) or MR (GitLab), through pr-watch (QUA-262). */
const lookChange = (forge) =>
  forge === "gitlab" ? lookMr(undefined, (a) => ghJson(a, spawnSync, "glab")) : look(undefined, (a) => ghJson(a));

/**
 * `{ code, message, ciAcquired }`. Without `check`: the mechanics (CLOSING only) — brief deleted, index item
 * removed, consumption recorded — then the signals. With `check`: the signals only. With `fix`, the
 * corrections that need no judgement are written (and only then); otherwise they are proposed as a diff.
 */
export function close(root, { brief, check = false, fix = false, env = process.env, logs, lookCi = lookChange } = {}) {
  const T = texts(root);
  const { state } = readState(root);
  const path = brief ? posix.normalize(brief.replace(/\\/g, "/")) : state.active_brief;
  if (!path) return { code: 1, message: T.noBrief };
  const route = pathToClosing(root, state.activity);
  if (!check && state.activity !== "CLOSING") return { code: 1, message: [T.notClosing(state.activity), route].filter(Boolean).join("\n") };
  const text = existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : "";
  const done = [];
  if (!check) {
    // QUA-137 (undeclared hook) and QUA-264 (intent born without the human's choice): refused before anything is written.
    const hooks = undeclaredHooks(root, text);
    const before = [...(hooks.files.length ? hooks.lines : []), ...limitProblems(root, text)];
    if (before.length) return { code: 1, message: [T.signals, ...before.map((s) => `  ⚠ ${s}`)].join("\n") };
    const refused = closingMechanics(root, path, text, { state, env, logs, done });
    if (refused) return refused;
  }
  let report = closingReport(root, path, text);
  let proposed = proposals(root, report.problems);
  if (fix && proposed.length) {
    done.push(T.applied(applyProposals(root, proposed)));
    report = closingReport(root, path, text);
    proposed = proposals(root, report.problems);
  }
  const problems = report.problems.map((p) => p.message);
  // QUA-262: with checks left to CI, the closing is acquired only once the PR or MR CI is green on them; said either way.
  const ci = closingCi(root, lookCi);
  const diff = proposed.flatMap((p) => [`  ${p.file}:${p.line}`, `    - ${p.from}`, `    + ${p.to}`]);
  const lines = [
    ...done,
    ...(problems.length ? [T.signals, ...problems.map((s) => `  ⚠ ${s}`)] : [T.clean]),
    ...(diff.length ? [T.proposed, ...diff] : []),
    ...(report.warnings.length ? [T.warnings, ...report.warnings.map((w) => `  ⚠ ${w}`)] : []),
    ...(ci ? [ci.line] : []),
    ...(check ? [...lateLines(root), route] : [T.rest]),
  ];
  return { code: problems.length ? 1 : 0, message: lines.filter(Boolean).join("\n"), ciAcquired: ci ? ci.acquired : null };
}

/** Entry point: `node .githooks/close.mjs [--check] [<brief>] [--logs <folder>]`. Returns the exit code. */
export function main(args, root, { env = process.env } = {}) {
  const i = args.indexOf("--logs");
  const logs = i >= 0 ? args[i + 1] : undefined;
  const rest = args.filter((a, j) => a !== "--check" && a !== "--fix" && (i < 0 || (j !== i && j !== i + 1)));
  if (rest.some((a) => a.startsWith("-")) || rest.length > 1) {
    console.error(texts(root).usage);
    return 2;
  }
  const r = close(root, { brief: rest[0], check: args.includes("--check"), fix: args.includes("--fix"), env, logs });
  (r.code === 0 ? console.log : console.error)(r.message);
  return r.code;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2), stateRoot());
}
