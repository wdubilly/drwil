// Reading of the start poll for prompt-hook.mjs: the two known forms (Claude Code, Copilot CLI), the
// human's answer and the optional questions (merge, worktree, parallel queue); and the end-of-scoping
// poll (`drwil-scope`, QUA-187). Pure functions.

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

// Copilot CLI field of the briefs: single choice (`enum`) or multiple choice (type `array`, values in `items.enum`).
const briefOptions = (p) => (Array.isArray(p?.enum) ? p.enum : p?.type === "array" && Array.isArray(p.items?.enum) ? p.items.enum : null);

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
      entries.find(([k, p]) => k !== MERGE_MARK && k !== WORKTREE_MARK && k !== PARALLEL_MARK && briefOptions(p))?.[0] ?? null;
    const field = entries.find(([k]) => k === fieldKey)?.[1];
    const options = briefOptions(field) ?? [];
    const keys = entries.map(([k]) => k);
    const mergeKey = keys.includes(MERGE_MARK) ? MERGE_MARK : null;
    const worktreeKey = keys.includes(WORKTREE_MARK) ? WORKTREE_MARK : null;
    const parallelKey = keys.includes(PARALLEL_MARK) ? PARALLEL_MARK : null;
    return {
      form: "copilot",
      options,
      fieldKey,
      multiple: field?.type === "array",
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
  const answer = poll.mergeKey || poll.worktreeKey || poll.parallelKey ? copilotField(m[1].trim(), poll.keys, poll.fieldKey) : m[1].trim();
  return poll.multiple ? unbracketed(answer) : answer;
}

/** A multiple choice may come back as a list `[a, b]` or `["a", "b"]`: only the values are kept, comma-separated. */
function unbracketed(answer) {
  const list = answer ? /^\[(.*)\]$/s.exec(answer.trim()) : null;
  if (!list) return answer;
  return (
    list[1]
      .split(/,\s*/)
      .map((v) => v.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean)
      .join(", ") || null
  );
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

// End-of-scoping poll (QUA-187): its own header (12 characters at most under Claude Code), exactly three answers.
const SCOPE_MARK = "drwil-scope";
const SCOPE_ANSWERS = [
  ["auto", /^(fusion automatique|automatic merge)$/i],
  ["manual", /^(fusion manuelle|manual merge)$/i],
  ["continue", /^(continuer à cadrer|continue scoping)$/i],
];
const scopeAnswer = (label) => SCOPE_ANSWERS.find(([, re]) => re.test(String(label ?? "").trim()))?.[0] ?? null;
const RECOMMENDED_RE = /\((recommended|recommandée?)\)/i;

/** The end-of-scoping poll, in one of the two known forms (Claude Code, Copilot CLI); null otherwise. */
export function scopePoll(input) {
  const e = input?.tool_input ?? {};
  const q = Array.isArray(e.questions) ? e.questions.find((x) => x?.header === SCOPE_MARK) : null;
  if (q) {
    const options = Array.isArray(q.options) ? q.options : [];
    return {
      form: "claude",
      question: q.question,
      answers: options.map((o) => scopeAnswer(o?.label)),
      recommended: options.some((o) => RECOMMENDED_RE.test(`${o?.label ?? ""} ${o?.description ?? ""}`)),
      prefilled: Boolean(e.answers && Object.keys(e.answers).length) || q.multiSelect === true,
    };
  }
  if (typeof e.message !== "string" || !e.message.startsWith(SCOPE_MARK)) return null;
  // Copilot CLI: a single-choice field (`enum` only) named `drwil-scope`, the only one read reliably.
  const field = e.requestedSchema?.properties?.[SCOPE_MARK];
  return {
    form: "copilot",
    answers: Array.isArray(field?.enum) ? field.enum.map(scopeAnswer) : [],
    recommended: (field?.enum ?? []).some((v) => RECOMMENDED_RE.test(String(v))),
    prefilled: Object.values(e.requestedSchema?.properties ?? {}).some((p) => p && "default" in p) || field?.type === "array",
  };
}

/** Exactly the three answers, none recommended, nothing filled in nor preselected: the human chooses alone. */
export const scopePollValid = (poll) =>
  !poll.prefilled &&
  !poll.recommended &&
  poll.answers.length === 3 &&
  ["auto", "manual", "continue"].every((a) => poll.answers.includes(a));

/** The human's answer to the end-of-scoping poll: "auto", "manual", "continue", or null if missing or unknown. */
export function scopeChoice(input, poll) {
  if (poll.form === "claude") return scopeAnswer(input?.tool_response?.answers?.[poll.question]);
  const text = input?.tool_result?.text_result_for_llm;
  const m = typeof text === "string" ? /User responded:\s*(.+)\s*$/s.exec(text) : null;
  return m ? scopeAnswer(m[1].trim().replace(new RegExp(`^${SCOPE_MARK}=`), "")) : null;
}
