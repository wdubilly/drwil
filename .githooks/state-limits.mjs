// The human's answers to the limits poll (`drwil-limite`, QUA-253): a limit outside the brief's scope goes to the
// human, once, at the end of BUILD and before VERIFY; each answer, « Handle now » or « Record as intent », is read by
// the poll hook (.claude/hooks/limit-poll.mjs) and recorded here in the state (`limits`), never by the agent, which
// has no command for it. The answers fall when the state goes back to SCOPING (neutral state).
import { posix } from "node:path";
import { config } from "./briefs.mjs";
import { fill } from "./state-messages.mjs";
import { readState, texts } from "./state-validate.mjs";

/** The two answers of each question, in both languages: the poll's labels, and what the reminders say. */
export const LIMIT_LABELS = {
  fr: { now: "Traiter maintenant", note: "Noter en intention" },
  en: { now: "Handle now", note: "Record as intent" },
};

const ACTIVE = ["BUILD", "EVIDENCE", "VERIFY", "CLOSING"];

/** The intent briefs' folder, `dirs.intentions` of the configuration, else `docs/intentions`. */
export const intentsDir = (root) => posix.normalize(String(config(root).dirs?.intentions ?? "docs/intentions")).replace(/\/+$/, "");

/** "now", "note", or null: the choice an answer label means, in either language. */
export function limitChoice(label) {
  const text = String(label ?? "").trim();
  for (const labels of Object.values(LIMIT_LABELS))
    for (const [choice, l] of Object.entries(labels)) if (text.toLowerCase() === l.toLowerCase()) return choice;
  return null;
}

/** The single intent path (`<intents folder>/<name>.md`) a question names; null if none, or several different ones. */
export function intentPath(root, text) {
  const dir = intentsDir(root);
  const found = new Set(
    [...String(text ?? "").matchAll(/[\w./-]+\.md\b/g)].map((m) => posix.normalize(m[0])).filter((p) => posix.dirname(p) === dir),
  );
  return found.size === 1 ? [...found][0] : null;
}

/** Lines of the full context: the limits rule in BUILD, and the answers already recorded. */
export function limitLines(state, T, lang) {
  const lines = state.activity === "BUILD" ? [T.limitsRule] : [];
  if (state.limits?.length) lines.push(fill(T.limitsAnswers, describe(state.limits, lang)));
  return lines;
}

const describe = (limits, lang) => limits.map((l) => `${l.intent} → « ${LIMIT_LABELS[lang][l.choice]} »`).join(" ; ");

/**
 * Records the human's answers (`[{ intent, choice }]`), read by the poll hook: an answer replaces an earlier one for
 * the same intent path. From BUILD to CLOSING only; an invalid state is never overwritten. `{ code, message }`.
 */
export async function recordLimits(root, answers) {
  const T = texts(root);
  const { state, problems } = readState(root);
  if (problems.length || !ACTIVE.includes(state.activity))
    return { code: 1, message: fill(T.limitsNotActive, problems.length ? problems.join(" ; ") : state.activity) };
  const given = answers.map(({ intent, choice }) => ({ intent, choice }));
  const limits = [...(state.limits ?? []).filter((l) => !given.some((a) => a.intent === l.intent)), ...given];
  // Imported on demand: state.mjs imports state-texts.mjs, which imports this file.
  (await import("./state.mjs")).writeState(root, { ...state, limits });
  const lang = config(root).lang === "en" ? "en" : "fr";
  return { code: 0, message: fill(T.limitsRecorded, describe(given, lang)) };
}
