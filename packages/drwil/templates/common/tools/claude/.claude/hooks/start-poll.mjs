// Reading of the start poll for prompt-hook.mjs: the two known forms (Claude Code, Copilot CLI), the
// human's answer and the optional questions (merge, worktree, parallel queue). Pure functions.

const MARK = "drwil-start";
// Optional second question (Claude Code) or field (Copilot CLI) of the same poll: authorise the automatic merge.
const MERGE_MARK = "drwil-merge";
const MERGE_YES_RE = /^(fusion automatique|automatic merge)\b/i;
// Optional third question or field: run the workstream in a new worktree (QUA-142).
const WORKTREE_MARK = "drwil-worktree";
const WORKTREE_YES_RE = /^(nouveau worktree|new worktree)\b/i;
// Optional fourth question or field: run the chosen briefs in parallel, one worktree each (QUA-147).
const PARALLEL_MARK = "drwil-parallel";
const PARALLEL_YES_RE = /^(file en parallèle|parallel queue)\b/i;
// With a single scoped brief, the poll's second option (a question needs two): start nothing.
export const NOT_NOW_RE = /^(pas maintenant|not now)\b/i;

/** The start poll, in one of the two known forms; null otherwise. */
export function startPoll(input) {
  const e = input?.tool_input ?? {};
  // Claude Code: questions[{ question, header, options }], answers in `answers`.
  const q = Array.isArray(e.questions) ? e.questions.find((x) => x?.header === MARK) : null;
  const qMerge = q ? e.questions.find((x) => x?.header === MERGE_MARK) : null;
  const qWorktree = q ? e.questions.find((x) => x?.header === WORKTREE_MARK) : null;
  const qParallel = q ? e.questions.find((x) => x?.header === PARALLEL_MARK) : null;
  if (q)
    return {
      form: "claude",
      question: q.question,
      mergeQuestion: qMerge?.question ?? null,
      worktreeQuestion: qWorktree?.question ?? null,
      parallelQuestion: qParallel?.question ?? null,
      options: Array.isArray(q.options) ? q.options.map((o) => o?.label) : [],
      prefilled: Boolean(e.answers && Object.keys(e.answers).length),
    };
  // Copilot CLI: message + requestedSchema (options as `enum`), free-text answer; the merge
  // decision is a second field named `drwil-merge`, answered as `fiche=…, drwil-merge=…`.
  if (typeof e.message === "string" && e.message.startsWith(MARK)) {
    const entries = Object.entries(e.requestedSchema?.properties ?? {});
    const properties = entries.map(([, p]) => p);
    const fieldKey =
      entries.find(([k, p]) => k !== MERGE_MARK && k !== WORKTREE_MARK && k !== PARALLEL_MARK && Array.isArray(p?.enum))?.[0] ?? null;
    const options = entries.find(([k]) => k === fieldKey)?.[1]?.enum ?? [];
    const keys = entries.map(([k]) => k);
    const mergeKey = keys.includes(MERGE_MARK) ? MERGE_MARK : null;
    const worktreeKey = keys.includes(WORKTREE_MARK) ? WORKTREE_MARK : null;
    const parallelKey = keys.includes(PARALLEL_MARK) ? PARALLEL_MARK : null;
    return {
      form: "copilot",
      options,
      fieldKey,
      mergeKey,
      worktreeKey,
      parallelKey,
      keys,
      prefilled: properties.some((p) => p && "default" in p),
    };
  }
  return null;
}

/** The human's answer, read after the poll; null if missing. */
export function humanAnswer(input, poll) {
  if (poll.form === "claude") return input?.tool_response?.answers?.[poll.question] ?? null;
  const text = input?.tool_result?.text_result_for_llm;
  const m = typeof text === "string" ? /User responded:\s*(.+)\s*$/s.exec(text) : null;
  if (!m) return null;
  // One field: the whole answer. Several: `key=value, key=value`, in the schema's order of keys or not.
  return poll.mergeKey || poll.worktreeKey || poll.parallelKey ? copilotField(m[1].trim(), poll.keys, poll.fieldKey) : m[1].trim();
}

/** The value of `key` in a Copilot CLI answer `key=value, key=value`; null if absent. */
function copilotField(answer, keys, key) {
  const esc = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|,\\s*)${esc(key ?? "")}=(.*?)(?=,\\s*(?:${keys.map(esc).join("|")})=|$)`, "s").exec(answer);
  return m ? m[1].trim() || null : null;
}

/**
 * The chosen labels in the order of the poll's options (QUA-037): Claude Code gives a multiple
 * choice in the order of the clicks. A label typed under "Other" keeps its typed place, after them.
 */
export function inPollOrder(choices, options = []) {
  const rank = (c) => {
    const i = options.indexOf(c);
    return i === -1 ? options.length : i;
  };
  return choices
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
    .map(({ c }) => c);
}

/** The yes of an optional question (Claude Code) or field (Copilot CLI) of the poll, read in the human's answer. */
function answeredYes(input, poll, question, key, yes) {
  if (poll.form === "claude") return question ? yes.test(String(input?.tool_response?.answers?.[question] ?? "")) : false;
  if (!key) return false;
  const text = input?.tool_result?.text_result_for_llm;
  const m = typeof text === "string" ? /User responded:\s*(.+)\s*$/s.exec(text) : null;
  return yes.test(String(m ? (copilotField(m[1].trim(), poll.keys, key) ?? "") : ""));
}

/** Automatic merge authorised by the human answer to the merge question (second question or field). */
export const mergeAuthorised = (input, poll) => answeredYes(input, poll, poll.mergeQuestion, poll.mergeKey, MERGE_YES_RE);

/** New worktree chosen by the human answer to the worktree question (third question or field), QUA-142. */
export const worktreeChosen = (input, poll) => answeredYes(input, poll, poll.worktreeQuestion, poll.worktreeKey, WORKTREE_YES_RE);

/** Parallel queue chosen by the human answer to the parallel question (fourth question or field), QUA-147. */
export const parallelChosen = (input, poll) => answeredYes(input, poll, poll.parallelQuestion, poll.parallelKey, PARALLEL_YES_RE);
