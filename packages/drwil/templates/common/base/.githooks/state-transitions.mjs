// Transitions of the governance state (split from state.mjs, which re-exports them): starting a
// workstream in one gesture, preparing and applying a transition.
import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { config, missingCriteria, queueable, scopedBriefs, briefStatus } from "./briefs.mjs";
import { closingMerged, closingSignals, noGhText, pruneMergedBranches, prunedMessage } from "./close.mjs";
import { activeElsewhere } from "./worktree.mjs";
import { ACTIVITIES, readState, texts, transitionAllowed, validateState, NEUTRAL_STATE } from "./state-validate.mjs";
import { requiresHuman, verifyEvidence } from "./state-evidence.mjs";
import { fill } from "./state-texts.mjs";
import { writeState } from "./state.mjs";

const STARTABLE_FROM = new Set(["SCOPING", "EXPECTATION", "REQUEST"]);

/**
 * Starts a workstream in one gesture: from SCOPING, EXPECTATION or REQUEST, moves straight to
 * BUILD on a scoped brief. In "human" mode (default), `human` must be true: it is only for a
 * human answer to a poll read by the tool's hook, or for a choice made in an interactive
 * terminal. `{ code: 0 | 1, message }`.
 */
export function start(root, brief, { human = false, request, autoMerge = false, queue = [], now = new Date().toISOString() } = {}) {
  const T = texts(root);
  const read = readState(root);
  const origin = read.state.activity;
  // CLOSING, brief deleted and its pull request merged: back to SCOPING by itself, then the start goes on.
  const closing = origin === "CLOSING";
  const from = closing ? "SCOPING" : origin;
  if (!closing && !STARTABLE_FROM.has(from)) return { code: 1, message: fill(T.startFrom, origin) };
  const norm = (b) =>
    posix.normalize(
      String(b ?? "")
        .trim()
        .replace(/\\/g, "/"),
    );
  const path = norm(brief);
  // The head of a queue a human decided is started by the agent, without a new gesture (QUA-037).
  const fromQueue = !human && from === "SCOPING" && read.state.queue?.[0] === path;
  if (config(root).transitions !== "agent" && !human && !fromQueue) return { code: 1, message: T.startHuman };
  if (closing) {
    const active = read.state.active_brief;
    if (existsSync(join(root, active))) return { code: 1, message: fill(T.startClosingBrief, active) };
    const refused = { no: T.startClosingOpen, unknown: `${T.startClosingUnknown} — ${noGhText(root)}` }[closingMerged(root)];
    if (refused) return { code: 1, message: refused };
  }
  if (!scopedBriefs(root).some((b) => b.path === path)) return { code: 1, message: fill(T.startNotScoped, brief) };
  const rest = human ? queue.map(norm) : fromQueue ? read.state.queue.slice(1) : [];
  const queued = rest.length || fromQueue ? [path, ...rest] : [];
  const notReady = queued.find((b) => !queueable(root, b));
  if (notReady) return { code: 1, message: fill(T.queueNotReady, notReady) };
  const elsewhere = activeElsewhere(root, path);
  if (elsewhere) return { code: 1, message: fill(T.startBusy, path, elsewhere) };
  const missing = missingCriteria(root, path);
  if (missing === "blocking") return { code: 1, message: fill(T.startNoCriteria, path) };
  const state = { version: 1, activity: "BUILD", active_brief: path, active_request: request ?? null, since: now };
  // Authorising the merge is an acceptance decision: human only, even in agent mode; a queue carries it.
  if ((autoMerge === true && human) || (fromQueue && read.state.queue_merge === true)) state.auto_merge = true;
  if (rest.length) Object.assign(state, { queue: rest, queue_merge: human ? autoMerge === true : read.state.queue_merge === true });
  const problems = validateState(state, root);
  if (problems.length) return { code: 1, message: fill(T.startInvalid, problems.join(" ; ")) };
  writeState(root, state);
  const warned = missing ? `\n${fill(T.noCriteria, path)}` : "";
  const next = rest.length ? `\n${fill(T.queued, rest.join(", "))}` : "";
  // The previous workstreams' branches, merged, are no longer needed (QUA-048).
  const pruned = prunedMessage(root, pruneMergedBranches(root));
  return { code: 0, message: fill(T.started, origin, path, state.auto_merge ? T.mergeAuthorised : "") + next + warned + pruned };
}

/** New state after the transition to `to`, or `{ error }`; writes nothing. */
export function prepareTransition(read, to, { brief, request, now }, root) {
  const T = texts(root);
  const from = read.state.activity;
  if (!transitionAllowed(from, to)) {
    const allowed = ACTIVITIES.filter((a) => transitionAllowed(from, a)).join(", ");
    return { error: fill(T.forbidden, from, to, allowed) };
  }
  if (brief !== undefined && to !== "EXPECTATION") return { error: T.briefOption };
  // Abandoning to SCOPING stays possible; the set-aside work stays in `git stash list`.
  if (read.state.detour && to !== "SCOPING") return { error: T.detourMove };
  let state;
  if (to === "SCOPING") {
    state = { ...NEUTRAL_STATE, since: now };
    // A queue goes on after a closing; any other return to SCOPING abandons it (QUA-037).
    if (from === "CLOSING" && read.state.queue?.length)
      Object.assign(state, { queue: read.state.queue, queue_merge: read.state.queue_merge === true });
  } else if (to === "EXPECTATION") {
    if (!brief) return { error: T.briefNeeded };
    state = {
      version: 1,
      activity: "EXPECTATION",
      active_brief: posix.normalize(brief.replace(/\\/g, "/")),
      active_request: request ?? null,
      since: now,
    };
  } else {
    state = { ...read.state, activity: to, active_request: request ?? read.state.active_request, since: now };
  }
  const problems = validateState(state, root);
  return problems.length ? { error: problems.join(" ; ") } : { state };
}

/**
 * Applies a transition and writes the state. `{ code: 0 | 1, message }`.
 * `confirm(question)` is only called if a human is required, and only in front of
 * an interactive terminal: without a terminal, a human transition is refused.
 */
export async function move(root, { to, brief, request }, { tty = false, confirm, now = new Date().toISOString() } = {}) {
  const T = texts(root);
  const read = readState(root);
  const resumed = read.problems.length ? fill(T.resumed, read.problems.join(" ; ")) : "";
  const prep = prepareTransition(read, to, { brief, request, now }, root);
  if (prep.error) return { code: 1, message: resumed + prep.error };
  const from = read.state.activity;
  // Before the human confirmation: no point asking for a decision that the evidence refuses.
  // Also in agent mode: the "transitions" setting says who decides, not on what.
  const activeBrief = read.state.active_brief && join(root, read.state.active_brief);
  let warning = "";
  if (to === "CLOSING") {
    const evidence = verifyEvidence(root);
    if (!evidence.ok) return { code: 1, message: resumed + fill(T.closingRefused, evidence.reason) };
    // Every workstream brief has acceptance criteria (QUA-021): refused if the project enforces recent
    // requirements, a warning otherwise.
    const missing = missingCriteria(root, read.state.active_brief);
    if (missing === "blocking") return { code: 1, message: resumed + fill(T.closingNoCriteria, read.state.active_brief) };
    if (missing) warning = "\n" + fill(T.noCriteria, read.state.active_brief);
  }
  // Leaving BUILD: last moment to fix code cheaply, so the closing's pitfalls are reported now (QUA-048).
  const signals = to === "EVIDENCE" && activeBrief ? closingSignals(root, read.state.active_brief) : [];
  if (signals.length) warning += `\n${T.closingSignals}\n${signals.map((s) => `  ⚠ ${s}`).join("\n")}`;
  if (
    from === "CLOSING" &&
    to === "SCOPING" &&
    activeBrief &&
    existsSync(activeBrief) &&
    briefStatus(readFileSync(activeBrief, "utf8")) === "done"
  ) {
    return { code: 1, message: resumed + fill(T.stillThere, read.state.active_brief) };
  }
  if (requiresHuman(from, to, config(root).transitions)) {
    if (!tty || typeof confirm !== "function") return { code: 1, message: resumed + fill(T.humanDecision, from, to) };
    if (!(await confirm(fill(T.confirm, from, to)))) return { code: 1, message: T.confirmRefused };
  }
  writeState(root, prep.state);
  return { code: 0, message: `${resumed}${from} → ${to}${warning}` };
}
