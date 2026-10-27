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
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { main, readStdinJson, reminderIfChanged } from "./state-cli.mjs";
import { reopen } from "./state-reopen.mjs";
import { fill } from "./state-texts.mjs";
import { readState, texts, validateState } from "./state-validate.mjs";

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
export { main, readStdinJson, reminderIfChanged, reopen };
export { ACTIVITIES, NEUTRAL_STATE, readState, transitionAllowed, validateState } from "./state-validate.mjs";
export { latestEvidence, requiresHuman, verifyEvidence } from "./state-evidence.mjs";
export { move, prepareTransition, start } from "./state-transitions.mjs";

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
