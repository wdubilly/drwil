#!/usr/bin/env node
// Scope gate (docs/ia-first.md, "Scope barrier"), the engine's "scope-gate" check
// (.githooks/engine.mjs): commit, push, CI, `drwil verify`.
//
// - Briefs (docs/projects/, docs/intentions/…) can always be committed; so can the contracts registry in SCOPING.
// - At commit time, any other file requires the BUILD activity and must be covered by the
//   scope block of the active brief as it is in HEAD: widening its scope takes a separate
//   commit, visible on its own. During a merge, only the resolution is judged (QUA-111).
// - Elsewhere (pre-push, CI, verify), there is no local state: each commit of the branch is
//   replayed against the scope of the brief named by its `Drwil-Brief` trailer, read in its
//   parent. A commit is judged by its parent's rules: without a gate in the parent, it is not
//   checked.
// A kit update commit (trailer `Drwil-Kit-Update`, scope-gate-kit.mjs) is judged on its files outside the kit manifest only.
// Severity: `scopeGate` setting (off | warning | blocking), warning if missing. A commit that changes the
// scope block of the active brief always shows a warning, whatever the setting (QUA-213).
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contractsAddedOnly, isHookTest, isRegistry, rulesFiles, weakenedTests } from "./detour.mjs";
import { fnmatch, normalize, readBlock, withMirrors } from "./scope.mjs";
import { governanceDisabled, readState } from "./state.mjs";
import { LOT_TRAILER, lotStatus } from "./state-lots.mjs";
import { git, reference, replaying, resolution, scopeChange } from "./scope-gate-merge.mjs";
import { TRAILER, texts } from "./scope-gate-texts.mjs";
import { KIT_ENV, KIT_TRAILER, nonKitFiles } from "./scope-gate-kit.mjs";

// Attestations pass like briefs: a human proof already guarded by `drwil attest` (terminal
// required, contract fingerprint), reviewed; subjecting them to the scope would force widening
// every brief in order to close. The consumption log likewise: its line is written in CLOSING,
// for the closing commit (`consumption.mjs --record`). The closing proof likewise (QUA-084): the
// closing writes it in CLOSING, for the closing commit, and refuses to close without it.
// The scoping recipes' outputs (value discovery, risk audit — French and English names) are scoping
// work, written in SCOPING: exact names, never a broad pattern on docs/. The release notes
// likewise (`docs/recettes/`): written by `recette-note.mjs` and committed by git plumbing, with no
// hook, so no trailer, while no brief is active; reviewed in their pull request.
export const OUT_OF_SCOPE = [
  "docs/projects/*",
  "docs/intentions/*",
  ".drwil/evidence/attestations/*",
  ".drwil/usage.jsonl",
  "docs/preuves/*",
  "docs/recettes/*",
  "docs/value-discovery.md",
  "docs/decouverte-valeur.md",
  "docs/audit-risks.md",
  "docs/audit-risques.md",
];
export { TRAILER };
const LEVELS = new Set(["off", "warning", "blocking"]);
const MARKER = ".githooks/scope-gate.mjs";

/** Files subject to the scope: everything but briefs (configurable list). */
export function outsideBriefFiles(files, outOfScope = OUT_OF_SCOPE) {
  return files.map(normalize).filter((f) => !outOfScope.some((p) => fnmatch(f, p)));
}

const covered = (f, patterns) => patterns.some((p) => fnmatch(f, p));

/**
 * Problems of a commit being prepared (pure). `addedOnly(f)`: true when the staged registry `f` only
 * adds new contracts (read by checkScope); without it, any registry change waits for the yes.
 * `weakened(f)`: names of the contract tests the staged test file `f` removes or weakens; a test file otherwise
 * is no rule.
 */
export function checkIndex({ files, state, patterns, outOfScope, cfg, addedOnly = () => false, weakened = () => [] }) {
  const T = texts(cfg);
  // The registry is written in SCOPING, like a brief: a criterion cites a contract already in it, and a new contract
  // enters in the same commit as the brief that cites it. The guard stays the regression check of `verify` (QUA-023).
  const scoping = state.activity === "SCOPING";
  const subject = outsideBriefFiles(files, outOfScope).filter((f) => !(scoping && isRegistry(f, cfg)));
  if (!subject.length) return [];
  if (state.activity !== "BUILD") return [T.activity(state.activity, subject.length)];
  const problems = subject.filter((f) => !covered(f, patterns)).map((f) => T.outsideScope(f, state.active_brief));
  // QUA-050, QUA-117: an ordinary detour or reopening fix needs no one, nor does adding a contract; one
  // that changes the rules (an existing contract modified or removed among them) waits for the human's yes.
  const exception = state.detour ?? state.reopened;
  if (exception && exception.human !== true)
    problems.push(
      ...rulesFiles(subject, cfg)
        .filter((f) => !addedOnly(f))
        .map(state.detour ? T.rules : T.reopenRules),
      ...subject
        .filter((f) => isHookTest(f, cfg))
        .map((f) => [f, weakened(f)])
        .filter(([, names]) => names.length)
        .map(([f, names]) => T.weakenedTest(f, names, Boolean(state.detour))),
    );
  return problems;
}

/** Patterns of the scope block of `brief` in revision `rev`, copies included; none if the brief does not exist there. */
function patternsAt(root, rev, brief, cfg) {
  const text = brief ? git(root, ["show", `${rev}:${brief}`]) : null;
  return text === null ? [] : withMirrors(readBlock(text).patterns, cfg);
}

function checkBranch(root, base, { outOfScope, cfg }) {
  const T = texts(cfg);
  const problems = [];
  // No `?? ""` fallback on these git calls: they work on existing commits (base from merge-base);
  // a failure must break the check, not let it pass without judging anything (QUA-013).
  const commits = git(root, ["rev-list", "--no-merges", "--reverse", `${base}..HEAD`])
    .split("\n")
    .filter(Boolean);
  for (const c of commits) {
    const short = c.slice(0, 7);
    // The parent's rules: without a gate in the parent, the commit is not judged.
    if (git(root, ["cat-file", "-e", `${c}^:${MARKER}`]) === null) continue;
    let files = git(root, ["diff-tree", "--no-commit-id", "--name-only", "-r", "--no-renames", c]).split("\n").filter(Boolean);
    // A kit update (`drwil init`): the files its manifest explains are not judged, any other one is, as usual.
    if (git(root, ["log", "-1", `--format=%(trailers:key=${KIT_TRAILER},valueonly)`, c]).trim())
      files = nonKitFiles(root, `${c}^`, c, files);
    const subject = outsideBriefFiles(files, outOfScope);
    if (!subject.length) continue;
    const values = git(root, ["log", "-1", `--format=%(trailers:key=${TRAILER},valueonly)`, c])
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    const brief = values.at(-1);
    if (!brief) {
      // A commit without trailer was made in SCOPING (no active brief): the registry is accepted there, like a brief.
      const rest = subject.filter((f) => !isRegistry(f, cfg));
      if (rest.length) problems.push(T.noTrailer(short, rest.length));
      continue;
    }
    const patterns = patternsAt(root, `${c}^`, brief, cfg);
    for (const f of subject) if (!covered(f, patterns)) problems.push(T.outsideScopeCommit(short, f, brief));
  }
  return problems;
}

/**
 * Full check for the engine: `{ status, problems, message?, detail? }`.
 * `staged` (staged files) is only given at pre-commit; otherwise the branch is replayed.
 */
export function checkScope(root, { cfg = {}, staged = null, env = process.env } = {}) {
  const level = LEVELS.has(cfg.scopeGate) ? cfg.scopeGate : "warning";
  // QUA-213: shown even with the gate off (QUA-019), never a failure by itself.
  const warnings = [];
  if (staged) {
    const { state } = readState(root);
    const change =
      state.active_brief && resolution(root, staged).includes(normalize(state.active_brief)) ? scopeChange(root, state.active_brief) : null;
    if (change) warnings.push(texts(cfg).widened(state.active_brief, change.added, change.removed));
  }
  if (level === "off") return { status: "not-applicable", problems: warnings, detail: "scopeGate: off" };
  const outOfScope = Array.isArray(cfg.outOfScope) ? cfg.outOfScope : OUT_OF_SCOPE;
  let problems;
  if (staged) {
    const { state } = readState(root);
    // The staged registry against HEAD's: `git show` fails (null) on a registry created or removed — a doubt.
    const addedOnly = (f) => isRegistry(f, cfg) && contractsAddedOnly(git(root, ["show", `HEAD:${f}`]), git(root, ["show", `:${f}`]));
    const weakened = (f) => weakenedTests(git(root, ["show", `HEAD:${f}`]), git(root, ["show", `:${f}`]));
    // `init` sets KIT_ENV for the commit of a kit update only: the files its manifest explains are not judged.
    const files = resolution(root, staged);
    problems = checkIndex({
      files: env[KIT_ENV] ? nonKitFiles(root, "HEAD", null, files) : files,
      state,
      patterns: patternsAt(root, "HEAD", state.active_brief, cfg),
      outOfScope,
      cfg,
      addedOnly,
      weakened,
    });
  } else {
    const base = reference(root, env);
    if (!base) return { status: "not-run", problems: [], detail: texts(cfg).noReference, configured: true };
    problems = checkBranch(root, base, { outOfScope, cfg });
  }
  if (problems.length && level === "blocking")
    return { status: "fail", problems: [...problems, ...warnings], message: texts(cfg).failed(problems.length) };
  return { status: "ok", problems: [...problems, ...warnings] };
}

/**
 * Adds `Drwil-Brief: <active brief>` to the message (prepare-commit-msg hook), and `Drwil-Lot: <current lot>`
 * when the brief has lots (QUA-246: `resume` reads it back on another clone); nothing without a brief or
 * governance, nor during a rebase: a replayed commit keeps the brief it was made under (a detour's resume
 * rebases the workstream's branch while the state still names the detour's brief).
 */
export function addTrailer(root, messageFile) {
  if (governanceDisabled(root) || replaying(root)) return;
  const read = readState(root);
  const brief = read.state.active_brief;
  if (!brief) return;
  const lot = lotStatus(root, read)?.current.n;
  const trailers = [`${TRAILER}: ${brief}`, ...(lot ? [`${LOT_TRAILER}: ${lot}`] : [])].flatMap((t) => ["--trailer", t]);
  git(root, ["interpret-trailers", "--in-place", "--if-exists", "replace", ...trailers, messageFile]);
}

// `node .githooks/scope-gate.mjs --trailer <file>` (prepare-commit-msg). Never blocks the commit:
// addTrailer does not throw, a git failure leaves the message as it is.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const i = process.argv.indexOf("--trailer");
  if (i >= 0 && process.argv[i + 1]) addTrailer(process.cwd(), process.argv[i + 1]);
}
