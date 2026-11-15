// History of the active workstream's transitions in the governance state (QUA-305): one entry per transition,
// `{ activity, at, reopened? }`, opened at start, kept until the next start. It lets the consumption be split by
// activity; it is never rebuilt (`state.mjs resume` on a fresh clone starts without it) and never guessed.
// state-messages-*.mjs are full: its messages live here.

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

const HISTORY_TEXTS = {
  fr: "« history » doit être une liste d'entrées { activity, at, reopened? } : activité connue, instant ISO 8601, réouverture marquée true seulement",
  en: '"history" must be a list of { activity, at, reopened? } entries: a known activity, an ISO 8601 instant, a reopening marked true only',
};

/**
 * `history` with the entry of the transition to `activity` at `at` appended; a state written before the history
 * existed starts one from this transition, the earlier ones staying unknown.
 */
export function withEntry(history, activity, at, { reopened = false } = {}) {
  return [...(Array.isArray(history) ? history : []), { activity, at, ...(reopened ? { reopened: true } : {}) }];
}

/** The problem of a history (absent: valid, a state written before it), `null` if none. */
export function historyProblem(history, activities, lang) {
  if (history === undefined) return null;
  const entry = (e) =>
    e !== null &&
    typeof e === "object" &&
    Object.keys(e).every((k) => ["activity", "at", "reopened"].includes(k)) &&
    activities.includes(e.activity) &&
    typeof e.at === "string" &&
    ISO_RE.test(e.at) &&
    !Number.isNaN(Date.parse(e.at)) &&
    [undefined, true].includes(e.reopened);
  return Array.isArray(history) && history.every(entry) ? null : HISTORY_TEXTS[lang === "en" ? "en" : "fr"];
}
