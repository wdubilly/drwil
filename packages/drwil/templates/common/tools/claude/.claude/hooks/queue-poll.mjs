// Queue built by chained single-choice polls (`drwil-file`, QUA-037), for prompt-hook.mjs: each poll offers the
// ready briefs and « Finish the queue »; the human's answer, read here, adds one brief to the queue under
// construction (`.githooks/state-draft.mjs`) or starts it. Copilot CLI reads a single choice reliably, not a
// multiple one: one brief per poll. Never the agent: a poll that arrives answered, preselected or multiple is refused.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { copilotField, mergeAuthorised } from "./start-poll.mjs";

const MARK = "drwil-file";
const MERGE_MARK = "drwil-merge";
export const FINISH_RE = /^(terminer la file|finish the queue)\b/i;

/** The queue poll, in one of the two known forms (Claude Code, Copilot CLI); null otherwise. */
export function queuePoll(input) {
  const e = input?.tool_input ?? {};
  const q = Array.isArray(e.questions) ? e.questions.find((x) => x?.header === MARK) : null;
  if (q) {
    const options = Array.isArray(q.options) ? q.options.map((o) => o?.label) : [];
    return {
      form: "claude",
      question: q.question,
      mergeQuestion: e.questions.find((x) => x?.header === MERGE_MARK)?.question ?? null,
      options,
      valid: options.some((l) => FINISH_RE.test(String(l))) && q.multiSelect !== true && !(e.answers && Object.keys(e.answers).length),
    };
  }
  if (typeof e.message !== "string" || !e.message.startsWith(MARK)) return null;
  const props = e.requestedSchema?.properties ?? {};
  const field = props[MARK];
  const options = Array.isArray(field?.enum) ? field.enum : [];
  return {
    form: "copilot",
    options,
    fieldKey: MARK,
    mergeKey: MERGE_MARK in props ? MERGE_MARK : null,
    keys: Object.keys(props),
    // Single choice only (`enum` on a string): an array field came back empty under Copilot CLI.
    valid:
      options.some((l) => FINISH_RE.test(String(l))) && field?.type !== "array" && !Object.values(props).some((p) => p && "default" in p),
  };
}

/** The human's answer to the queue poll; null if missing. */
function answer(input, poll) {
  if (poll.form === "claude") return input?.tool_response?.answers?.[poll.question] ?? null;
  const text = input?.tool_result?.text_result_for_llm;
  const m = typeof text === "string" ? /User responded:\s*(.+)\s*$/s.exec(text) : null;
  if (!m) return null;
  return poll.mergeKey ? copilotField(m[1].trim(), poll.keys, poll.fieldKey) : m[1].trim().replace(new RegExp(`^${MARK}=`), "");
}

const TEXTS = {
  fr: {
    refused:
      "drwil : sondage de file refusé — choix unique, avec l'option « Terminer la file », sans réponse remplie ni valeur par défaut ; c'est l'humain qui choisit.",
    noAnswer: "aucune réponse lue dans le sondage de file : rien n'est ajouté ni lancé, l'état est inchangé.",
    error: (m) => `erreur à la lecture du sondage de file (${m}) : rien n'est ajouté ni lancé, l'état est inchangé.`,
  },
  en: {
    refused:
      "drwil: queue poll refused — single choice, with the « Finish the queue » option, with no answer filled in or default value; the human chooses.",
    noAnswer: "no answer read in the queue poll: nothing added or started, the state is unchanged.",
    error: (m) => `error while reading the queue poll (${m}): nothing added or started, the state is unchanged.`,
  },
};

/** Handles a queue poll: null if the input is not one, else the hook's exit code. */
export async function queueHook(input, { root, lang, tell }) {
  const poll = queuePoll(input);
  if (!poll) return null;
  const T = TEXTS[lang];
  if (input.hook_event_name === "PreToolUse") {
    if (poll.valid) return 0;
    console.error(T.refused);
    return 2;
  }
  if (input.hook_event_name !== "PostToolUse") return 0;
  const choice = String(answer(input, poll) ?? "").trim();
  if (!choice) {
    tell(`✗ ${T.noAnswer}`);
    return 0;
  }
  try {
    const state = await import(pathToFileURL(join(root, ".githooks", "state.mjs")).href);
    const r = FINISH_RE.test(choice) ? state.draftFinish(root, { autoMerge: mergeAuthorised(input, poll) }) : state.draftAdd(root, choice);
    tell(`${r.code === 0 ? "✓" : "✗"} ${r.message}`);
  } catch (e) {
    tell(`✗ ${T.error(e?.message ?? String(e))}`);
  }
  return 0;
}
