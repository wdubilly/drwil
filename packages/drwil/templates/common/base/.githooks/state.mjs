#!/usr/bin/env node
// Runtime governance state: .drwil/state.json (docs/ia-first.md, "Governance state").
//
// Only reader and only writer of the state: the context reinjected to the agent
// (`node .githooks/state.mjs`, Claude's SessionStart hook), the transitions
// (`node .githooks/state.mjs move <ACTIVITY>`, `drwil state`) and the pre-commit
// import it. No agent tool is required.
// The state is local (gitignored) and only holds references: the allowed scope
// lives in the `scope` block of the active brief, which is versioned.
// Missing file = neutral SCOPING; no active state is ever inferred.
// An invalid state is brought back to neutral AND reported: never hidden, never permissive.
// Closing (VERIFY → CLOSING) requires the evidence of `drwil verify --evidence`: this
// file reads it, it runs no check (a single engine, .githooks/engine.mjs).
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { main as mainBase, readStdinJson, reminderIfChanged } from "./state-cli.mjs";
import { accept, forgetAcceptance, recordAcceptance } from "./state-acceptance.mjs";
import { reopen } from "./state-reopen.mjs";
import { undeclaredCitedWarning } from "./state-hooks.mjs";
import { clearLots, lotsRefusal } from "./state-lots.mjs";
import { move as moveBase, start as startBase } from "./state-transitions.mjs";
import { fill } from "./state-texts.mjs";
import { readState, texts, validateState } from "./state-validate.mjs";
import { mainBranch } from "./close-branches.mjs";
import { git } from "./worktree.mjs";

// Unchanged interface for the other hooks, the CLI and the tools: everything this file exported
// before it was split stays importable from here.
export {
  acceptanceCriteria,
  briefMaturity,
  briefStatus,
  declaredContracts,
  hasIncrements,
  openDecisions,
  readyGaps,
  scopedBriefs,
} from "./briefs.mjs";
export { context, governanceDisabled, shortReminder } from "./state-texts.mjs";
// The command line lives in state-cli.mjs (QUA-001: files under 200 lines); `node .githooks/state.mjs`
// stays the entry point.
export { readStdinJson, reminderIfChanged, reopen };
export { ACTIVITIES, NEUTRAL_STATE, readState, transitionAllowed, validateState } from "./state-validate.mjs";
export { latestEvidence, requiresHuman, verifyEvidence } from "./state-evidence.mjs";
export { nextHead, prepareTransition, settleClosing } from "./state-transitions.mjs";

/** Command line (state-cli.mjs) and its `accept` command (state-acceptance.mjs): the human's acceptance of the criteria. */
export async function main(args, root, input) {
  return args[0] === "accept" ? accept(root) : mainBase(args, root, input);
}

/**
 * Starts a workstream (state-transitions.mjs); the lots of a previous one are forgotten. The human's start (poll,
 * interactive terminal) records the acceptance of the criteria of the brief and of those it queues; any other start
 * keeps the acceptance of a brief taken from the queue the human decided, and forgets that of the others.
 */
export function start(root, brief, opts = {}) {
  const queued = readState(root).state.queue?.[0];
  const r = startBase(root, brief, opts);
  if (r.code !== 0) return r;
  clearLots(root);
  const { active_brief: active } = readState(root).state;
  if (opts.human === true) {
    const norm = (b) => posix.normalize(String(b).trim().replace(/\\/g, "/"));
    for (const b of [active, ...(opts.queue ?? []).map(norm)]) recordAcceptance(root, b);
  } else if (queued !== active) forgetAcceptance(root, active);
  return { ...r, message: r.message + undeclaredCitedWarning(root, readFileSync(join(root, active), "utf8")) };
}

/**
 * Applies a transition (state-transitions.mjs). The closing is refused while an [IA] lot of the brief is
 * not done; the lots are forgotten on the return to SCOPING.
 */
export async function move(root, args, opts) {
  const refusal = args.to === "CLOSING" ? lotsRefusal(root) : null;
  if (refusal) return { code: 1, message: refusal };
  const before = readState(root).state.active_brief;
  const r = await moveBase(root, args, opts);
  if (r.code === 0 && args.to === "SCOPING") {
    clearLots(root);
    if (before) forgetAcceptance(root, before);
  }
  return r;
}

/** Stops the queue (QUA-037): the active workstream goes on, nothing is started after it. */
export function stopQueue(root) {
  const T = texts(root);
  const read = readState(root);
  if (!read.state.queue) return { code: 0, message: T.noQueue };
  const state = { ...read.state };
  delete state.queue;
  delete state.queue_merge;
  writeState(root, state);
  return { code: 0, message: fill(T.queueStopped, read.state.queue.join(", ")) };
}

/**
 * Points the state at `brief` with the `detour` record, or back without it (`detour` null), QUA-050.
 * The only writer for .githooks/detour.mjs; an invalid result is a bug of the caller: it throws.
 */
export function setDetour(root, brief, detour, now = new Date().toISOString()) {
  const state = { ...readState(root).state, active_brief: brief, since: now };
  if (detour) state.detour = detour;
  else delete state.detour;
  writeState(root, state);
}

/**
 * Records the human's answer to the end-of-scoping poll (QUA-187), read by the poll hook — never called by the agent:
 * « Automatic merge » (`auto`) authorises `.githooks/merge-auto.mjs` for the scoping PR of the current branch, in
 * SCOPING only (QUA-188); « Manual merge » and « Continue scoping » schedule nothing and withdraw an earlier
 * authorisation (QUA-189).
 */
export function scopingMerge(root, choice) {
  const T = texts(root);
  const { state, problems } = readState(root);
  // An invalid state is never overwritten: it would hide it (read as neutral SCOPING).
  if (problems.length || state.activity !== "SCOPING")
    return { code: 1, message: fill(T.scopingMergeNotScoping, problems.length ? problems.join(" ; ") : state.activity) };
  const branch = git(root, "rev-parse", "--abbrev-ref", "HEAD");
  const rest = { ...state };
  delete rest.scoping_merge;
  if (choice !== "auto") {
    if (state.scoping_merge) writeState(root, rest);
    return { code: 0, message: choice === "continue" ? fill(T.scopingMergeContinue, branch ?? "?") : T.scopingMergeManual };
  }
  if (!branch || branch === "HEAD" || branch === mainBranch(root)) return { code: 1, message: T.scopingMergeBranch };
  writeState(root, { ...rest, scoping_merge: { branch } });
  return { code: 0, message: fill(T.scopingMergeAuthorised, branch) };
}

/** Records in this folder's state the briefs launched in parallel (QUA-147), the rest of the state unchanged. */
export function recordParallel(root, briefs) {
  writeState(root, { ...readState(root).state, parallel: briefs });
}

/** Writes `state` to .drwil/state.json, the only place that does; an invalid state is a bug of the caller: it throws. */
export function writeState(root, state) {
  const problems = validateState(state, root);
  if (problems.length) throw new Error(problems.join(" ; "));
  mkdirSync(join(root, ".drwil"), { recursive: true });
  writeFileSync(join(root, ".drwil", "state.json"), JSON.stringify(state, null, 2) + "\n");
}

/**
 * Root of the command: the parent of .githooks/, like run-checks (engine.mjs, projectRoot — not
 * imported: scope-gate.mjs imports this file), never the current folder: the agent's hooks call it
 * from wherever the agent `cd`-ed. `DRWIL_ROOT` replaces it, for tests only.
 */
export function stateRoot(scriptUrl = import.meta.url, env = process.env) {
  return env.DRWIL_ROOT || join(dirname(fileURLToPath(scriptUrl)), "..");
}

// Real paths on both sides: a project path through a symbolic link must still run the command.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = await main(process.argv.slice(2), stateRoot());
}
