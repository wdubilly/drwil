// Merge poll (`drwil-merge`, QUA-265), for prompt-hook.mjs: from BUILD to CLOSING, a standalone poll (no start nor
// queue question beside it) gives back, or withdraws, the automatic merge of the workstream, e.g. after a resume on
// another clone (QUA-247). One single-choice question, exactly two answers « Automatic merge » and « Manual merge ».
// The human's answer, read here, is recorded in the state by `.githooks/state-merge.mjs`. Never the agent: a poll
// that arrives answered, preselected, recommended or with a default value is refused before it is shown.
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const MARK = "drwil-merge";
const RECOMMENDED_RE = /\((recommended|recommandée?)\)/i;

const TEXTS = {
  fr: {
    refused:
      "drwil : sondage de fusion refusé — une seule question d'en-tête `drwil-merge`, choix unique, exactement deux réponses « Automatic merge » et « Manual merge », sans réponse remplie, valeur par défaut ni recommandation ; c'est l'humain qui choisit.",
    noAnswer: "aucune réponse lue dans le sondage de fusion : rien n'est autorisé, l'état est inchangé.",
    error: (m) => `erreur à la lecture du sondage de fusion (${m}) : rien n'est autorisé, l'état est inchangé.`,
  },
  en: {
    refused:
      "drwil: merge poll refused — a single question headed `drwil-merge`, single choice, exactly two answers « Automatic merge » and « Manual merge », with no answer filled in, default value or recommendation; the human chooses.",
    noAnswer: "no answer read in the merge poll: nothing authorised, the state is unchanged.",
    error: (m) => `error while reading the merge poll (${m}): nothing authorised, the state is unchanged.`,
  },
};

/** The merge poll, in one of the two known forms (Claude Code, Copilot CLI); null otherwise. */
function mergePoll(input, M) {
  const e = input?.tool_input ?? {};
  const qs = Array.isArray(e.questions) ? e.questions : [];
  const q = qs.find((x) => x?.header === MARK);
  if (q) {
    const options = Array.isArray(q.options) ? q.options : [];
    return {
      form: "claude",
      question: q.question,
      choices: options.map((o) => M.mergeChoice(o?.label)),
      recommended: options.some((o) => RECOMMENDED_RE.test(`${o?.label ?? ""} ${o?.description ?? ""}`)),
      prefilled: Boolean(e.answers && Object.keys(e.answers).length) || q.multiSelect === true || qs.length !== 1,
    };
  }
  if (typeof e.message !== "string" || !e.message.startsWith(MARK)) return null;
  // Copilot CLI: one single-choice field (`enum` only) named `drwil-merge`, and nothing else.
  const props = e.requestedSchema?.properties ?? {};
  const field = props[MARK];
  return {
    form: "copilot",
    choices: (Array.isArray(field?.enum) ? field.enum : []).map(M.mergeChoice),
    recommended: (field?.enum ?? []).some((v) => RECOMMENDED_RE.test(String(v))),
    prefilled: !field || "default" in field || field.type === "array" || Object.keys(props).length !== 1,
  };
}

const pollValid = (poll) =>
  !poll.prefilled && !poll.recommended && poll.choices.length === 2 && poll.choices.includes("auto") && poll.choices.includes("manual");

/** The human's answer label; null if missing. */
function answer(input, poll) {
  if (poll.form === "claude") return input?.tool_response?.answers?.[poll.question] ?? null;
  const text = input?.tool_result?.text_result_for_llm;
  const m = typeof text === "string" ? /User responded:\s*(.+)\s*$/s.exec(text) : null;
  return m ? m[1].trim().replace(new RegExp(`^${MARK}=`), "") : null;
}

/** Handles a standalone merge poll: null if the input is not one, else the hook's exit code. */
export async function mergeHook(input, { root, lang, tell }) {
  const e = input?.tool_input ?? {};
  const marked =
    (Array.isArray(e.questions) && e.questions.some((x) => x?.header === MARK)) ||
    (typeof e.message === "string" && e.message.startsWith(MARK));
  if (!marked) return null;
  const T = TEXTS[lang];
  try {
    const M = await import(pathToFileURL(join(root, ".githooks", "state-merge.mjs")).href);
    const poll = mergePoll(input, M);
    if (input.hook_event_name === "PreToolUse") {
      if (pollValid(poll)) return 0;
      console.error(T.refused);
      return 2;
    }
    if (input.hook_event_name !== "PostToolUse") return 0;
    const choice = M.mergeChoice(answer(input, poll));
    if (!choice) {
      tell(`✗ ${T.noAnswer}`);
      return 0;
    }
    const r = M.recordMerge(root, choice);
    tell(`${r.code === 0 ? "✓" : "✗"} ${r.message}`);
  } catch (err) {
    if (input.hook_event_name === "PostToolUse") tell(`✗ ${T.error(err?.message ?? String(err))}`);
  }
  return 0;
}
