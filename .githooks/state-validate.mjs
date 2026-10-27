// Shape of the governance state (split from state.mjs, which re-exports it): activities, allowed
// transitions, validation, and the only reader of .drwil/state.json.
import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { BRIEF_DIRS, config, MODEL_RE } from "./briefs.mjs";
import { fill, STATE_MESSAGES } from "./state-texts.mjs";

export const ACTIVITIES = ["SCOPING", "EXPECTATION", "REQUEST", "BUILD", "EVIDENCE", "VERIFY", "CLOSING"];

// One activity at a time; back to BUILD after EVIDENCE or a failed VERIFY;
// abandon to SCOPING from any activity.
const NEXT = {
  SCOPING: ["EXPECTATION"],
  EXPECTATION: ["REQUEST"],
  REQUEST: ["BUILD"],
  BUILD: ["EVIDENCE"],
  EVIDENCE: ["VERIFY", "BUILD"],
  VERIFY: ["CLOSING", "BUILD"],
  CLOSING: ["SCOPING"],
};

export const NEUTRAL_STATE = Object.freeze({ version: 1, activity: "SCOPING", active_brief: null, active_request: null, since: null });

// auto_merge: absent from the neutral state, set only by a human start (`start`).
// queue, queue_merge (QUA-037): the briefs a human queued at start, run next without a new gesture.
// parallel (QUA-147): the briefs a human launched at once, each in its own worktree, recorded by the main folder.
// detour (QUA-050): the workstream set aside while a prior defect is fixed (.githooks/detour.mjs).
// reopened (QUA-116): the workstream reopened after its closing, `{ pr, human? }`, until back in SCOPING.
const FIELDS = new Set([...Object.keys(NEUTRAL_STATE), "auto_merge", "queue", "queue_merge", "detour", "reopened", "parallel"]);
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
export const texts = (root) => STATE_MESSAGES[config(root).lang === "en" ? "en" : "fr"];

export function transitionAllowed(from, to) {
  if (!ACTIVITIES.includes(from) || !ACTIVITIES.includes(to) || from === to) return false;
  return to === "SCOPING" || NEXT[from].includes(to);
}

/** Problems of the state (in the project's language, empty list if valid). */
export function validateState(state, root) {
  const T = texts(root);
  if (typeof state !== "object" || state === null || Array.isArray(state)) return [T.notObject];
  const problems = [];
  for (const key of Object.keys(state)) if (!FIELDS.has(key)) problems.push(fill(T.unknownField, key));
  if (state.version !== 1) problems.push(T.version);
  if (!ACTIVITIES.includes(state.activity)) {
    problems.push(fill(T.unknownActivity, state.activity, ACTIVITIES.join(", ")));
  } else if (state.activity === "SCOPING") {
    if (state.active_brief !== null || state.active_request !== null) problems.push(T.scopingEmpty);
  } else if (state.active_brief === null || state.active_brief === undefined) {
    problems.push(fill(T.briefRequired, state.activity));
  }
  // A detour's brief is deleted by its own PR, before the resume: its absence is expected too.
  if (state.active_brief !== null && state.active_brief !== undefined)
    problems.push(...validateBrief(state.active_brief, root, state.activity === "CLOSING" || state.detour !== undefined, T));
  if (state.detour !== undefined) problems.push(...validateDetour(state.detour, state.activity, root, T));
  const r = state.reopened;
  if (r !== undefined && !(r && typeof r === "object" && Number.isInteger(r.pr) && [undefined, true, false].includes(r.human)))
    problems.push(T.reopenedType);
  else if (r !== undefined && !["BUILD", "EVIDENCE", "VERIFY", "CLOSING"].includes(state.activity)) problems.push(T.reopenedActivity);
  if (state.active_request !== null && typeof state.active_request !== "string") problems.push(T.request);
  if (state.auto_merge !== undefined && typeof state.auto_merge !== "boolean") problems.push(T.autoMergeType);
  else if (state.auto_merge === true && state.activity === "SCOPING") problems.push(T.autoMergeScoping);
  if (state.queue !== undefined) {
    if (!Array.isArray(state.queue) || state.queue.some((b) => typeof b !== "string")) problems.push(T.queueType);
    else for (const b of state.queue) problems.push(...validateBrief(b, root, false, T));
  }
  if (state.parallel !== undefined && (!Array.isArray(state.parallel) || state.parallel.some((b) => typeof b !== "string")))
    problems.push(T.parallelType);
  if (state.queue_merge !== undefined && typeof state.queue_merge !== "boolean") problems.push(T.queueMergeType);
  if (state.since !== null && !(typeof state.since === "string" && ISO_RE.test(state.since) && !Number.isNaN(Date.parse(state.since)))) {
    problems.push(T.since);
  }
  return problems;
}

function validateBrief(brief, root, mayBeMissing, T) {
  if (typeof brief !== "string") return [T.briefType];
  const path = posix.normalize(brief.replace(/\\/g, "/"));
  const dir = BRIEF_DIRS.find((d) => path.startsWith(d));
  if (!dir || !path.endsWith(".md")) return [fill(T.briefPlace, brief, BRIEF_DIRS.join(T.or))];
  if (MODEL_RE.test(posix.basename(path))) return [fill(T.briefModel, brief)];
  // In CLOSING, the "Closing" recipe deletes the brief: its absence is the normal outcome, and
  // refusing it would make the state invalid at the very moment of going back to SCOPING.
  if (!existsSync(join(root, path)) && !mayBeMissing) return [fill(T.briefMissing, brief)];
  return [];
}

// The workstream's brief may be missing on the detour's branch, cut from the main branch.
function validateDetour(d, activity, root, T) {
  const text = (v) => typeof v === "string" && v !== "";
  const shape =
    typeof d === "object" &&
    d !== null &&
    text(d.origin_branch) &&
    text(d.branch) &&
    (d.stash === null || text(d.stash)) &&
    (d.human === undefined || typeof d.human === "boolean");
  if (!shape) return [T.detourType];
  if (activity !== "BUILD") return [T.detourActivity];
  return validateBrief(d.origin_brief, root, true, T);
}

/** `{ state, source: "missing" | "file", problems }`; an invalid state is replaced by the neutral one. */
export function readState(root) {
  const file = join(root, ".drwil", "state.json");
  if (!existsSync(file)) return { state: { ...NEUTRAL_STATE }, source: "missing", problems: [] };
  let state;
  try {
    state = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { state: { ...NEUTRAL_STATE }, source: "file", problems: [texts(root).unreadable] };
  }
  const problems = validateState(state, root);
  return problems.length ? { state: { ...NEUTRAL_STATE }, source: "file", problems } : { state, source: "file", problems };
}
