// Split of a workstream's consumption by the governance activity at each request's instant (QUA-306, QUA-309),
// and the count of the split workstreams towards the review of 10 (QUA-310). The activity comes from the state's
// `history` (QUA-305), which only the active workstream has: any other request goes to « unattributed », said,
// never guessed. Only the consumption fields of the requests are read.
import { basename } from "node:path";
import { WEIGHTS } from "./consumption-log.mjs";
import { readState } from "./state-validate.mjs";

/** The parts, in the order they are shown and written. */
export const PARTS = ["production", "verification", "governance", "unattributed"];
/** Workstreams split before the review (decision of the requester): a count, never a threshold nor a refusal. */
export const EXPECTED = 10;

const PART_OF = { BUILD: "production", EVIDENCE: "verification", VERIFY: "verification", SCOPING: "governance", CLOSING: "governance" };
// A scoping branch is governance by its name alone, whatever the history.
const SCOPING_BRANCH = /^(scoping|cadrage)\//;
const BRIEF_BRANCH = /^(workstream|chantier|scoping|cadrage)\//;

/** Whether a branch belongs to a brief (its workstream or its scoping): only those are split. */
export const briefBranch = (branch) => typeof branch === "string" && BRIEF_BRANCH.test(branch);

/** The history of `brief`'s workstream in the state, `null` if the state is another one's, has none or is invalid. */
export function briefHistory(root, brief) {
  const { state } = readState(root);
  const active = state.active_brief;
  if (typeof active !== "string" || basename(active, ".md") !== brief || !Array.isArray(state.history)) return null;
  return state.history.length ? state.history : null;
}

/**
 * Part of one request: its scoping branch, or the activity of the last transition at or before its instant; a BUILD
 * after a reopening (QUA-116) is governance. Before the first transition, without history or instant: unattributed.
 */
export function partOf(answer, history) {
  if (SCOPING_BRANCH.test(answer.branch ?? "")) return "governance";
  if (!history || !Number.isFinite(answer.time)) return "unattributed";
  let part = "unattributed";
  let reopened = false;
  for (const e of history) {
    if (Date.parse(e.at) > answer.time) break;
    reopened ||= e.reopened === true;
    part = e.activity === "BUILD" && reopened ? "governance" : (PART_OF[e.activity] ?? "unattributed");
  }
  return part;
}

/** `{ part: { tokens, requests } }` of answers (a request counted once, `since` as for the totals). */
export function split(answers, history, { since = null } = {}) {
  const seen = new Set();
  const sums = Object.fromEntries(PARTS.map((p) => [p, { weighted: 0, requests: 0 }]));
  for (const a of answers) {
    if (since !== null && !(Number.isFinite(a.time) && a.time >= since)) continue;
    if (seen.has(a.key)) continue;
    seen.add(a.key);
    const s = sums[partOf(a, history)];
    s.requests++;
    s.weighted += Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + a.usage[k] * w, 0);
  }
  return Object.fromEntries(PARTS.map((p) => [p, { tokens: Math.round(sums[p].weighted), requests: sums[p].requests }]));
}

/** A line's split if it is one: every part with numeric totals and at least one attributed request. */
function lineSplit(line) {
  const a = line?.activities;
  if (!a || typeof a !== "object") return null;
  const ok = PARTS.every((p) => a[p] && Number.isFinite(a[p].tokens) && Number.isFinite(a[p].requests));
  return ok && PARTS.slice(0, 3).some((p) => a[p].requests > 0) ? a : null;
}

/**
 * The split workstreams of usage.jsonl: `{ count, expected, mean }`; `mean` (each part's average share of the
 * weighted tokens, in %) only from `expected` split workstreams on, `null` before.
 */
export function recordedSplit(text) {
  const shares = [];
  for (const l of text.split("\n")) {
    let a;
    try {
      a = lineSplit(JSON.parse(l));
    } catch {
      continue;
    }
    if (!a) continue;
    const total = PARTS.reduce((s, p) => s + a[p].tokens, 0);
    shares.push(total > 0 ? Object.fromEntries(PARTS.map((p) => [p, a[p].tokens / total])) : null);
  }
  const weighed = shares.filter(Boolean);
  const mean =
    shares.length >= EXPECTED && weighed.length
      ? Object.fromEntries(PARTS.map((p) => [p, Math.round((100 * weighed.reduce((s, x) => s + x[p], 0)) / weighed.length)]))
      : null;
  return { count: shares.length, expected: EXPECTED, mean };
}
