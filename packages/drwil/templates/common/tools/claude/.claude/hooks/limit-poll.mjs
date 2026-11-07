// Limits poll (`drwil-limite`, QUA-253), for prompt-hook.mjs: at the end of BUILD and before VERIFY, one question per
// limit outside the brief's scope, naming the intent path it would become, with two answers, « Traiter maintenant » and
// « Noter en intention » (« Handle now », « Record as intent »). The human's answers, read here, are recorded in the state
// by `.githooks/state-limits.mjs`. Never the agent: a poll that arrives answered, preselected, recommended or with a
// default value is refused before it is shown.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { copilotField } from "./start-poll.mjs";

const MARK = "drwil-limite";
const RECOMMENDED_RE = /\((recommended|recommandée?)\)/i;

const TEXTS = {
  fr: {
    refused:
      "drwil : sondage des limites refusé — une question par limite (en-tête `drwil-limite`, 4 au plus), qui nomme le chemin `docs/intentions/<nom>.md` qu'elle deviendrait (un chemin distinct par question), choix unique, exactement deux réponses « Traiter maintenant » et « Noter en intention », sans réponse remplie, valeur par défaut ni recommandation ; c'est l'humain qui choisit.",
    noAnswer: "aucune réponse lue dans le sondage des limites : rien n'est enregistré, l'état est inchangé.",
    unanswered: (l) => ` Sans réponse lue, non enregistrée(s), à soumettre de nouveau : ${l}.`,
    error: (m) => `erreur à la lecture du sondage des limites (${m}) : rien n'est enregistré, l'état est inchangé.`,
  },
  en: {
    refused:
      "drwil: limits poll refused — one question per limit (header `drwil-limite`, 4 at most), naming the `docs/intentions/<name>.md` path it would become (a distinct path per question), single choice, exactly two answers « Handle now » and « Record as intent », with no answer filled in, default value or recommendation; the human chooses.",
    noAnswer: "no answer read in the limits poll: nothing recorded, the state is unchanged.",
    unanswered: (l) => ` No answer read, not recorded, to ask again: ${l}.`,
    error: (m) => `error while reading the limits poll (${m}): nothing recorded, the state is unchanged.`,
  },
};

/** The limits poll's questions, in one of the two known forms (Claude Code, Copilot CLI); null otherwise. */
function limitPoll(input, L, root) {
  const e = input?.tool_input ?? {};
  const qs = Array.isArray(e.questions) ? e.questions.filter((x) => x?.header === MARK) : [];
  if (qs.length) {
    const questions = qs.map((q) => {
      const options = Array.isArray(q.options) ? q.options : [];
      return {
        key: q.question,
        intent: L.intentPath(root, q.question),
        choices: options.map((o) => L.limitChoice(o?.label)),
        recommended: options.some((o) => RECOMMENDED_RE.test(`${o?.label ?? ""} ${o?.description ?? ""}`)),
        prefilled: q.multiSelect === true,
      };
    });
    return { form: "claude", questions, prefilled: Boolean(e.answers && Object.keys(e.answers).length) };
  }
  if (typeof e.message !== "string" || !e.message.startsWith(MARK)) return null;
  // Copilot CLI: one single-choice field (`enum` on a string) per limit, named by its intent path.
  const props = e.requestedSchema?.properties ?? {};
  const questions = Object.entries(props).map(([key, p]) => ({
    key,
    intent: L.intentPath(root, key),
    choices: (Array.isArray(p?.enum) ? p.enum : []).map(L.limitChoice),
    recommended: (p?.enum ?? []).some((v) => RECOMMENDED_RE.test(String(v))),
    prefilled: !p || "default" in p || p.type === "array",
  }));
  return { form: "copilot", questions, keys: Object.keys(props), prefilled: false };
}

/** Each question names one distinct intent path and offers exactly the two answers; nothing filled in nor recommended. */
function pollValid(poll) {
  const qs = poll.questions;
  const intents = new Set(qs.map((q) => q.intent));
  return (
    !poll.prefilled &&
    qs.length >= 1 &&
    qs.length <= 4 &&
    intents.size === qs.length &&
    qs.every(
      (q) =>
        q.intent && !q.prefilled && !q.recommended && q.choices.length === 2 && q.choices.includes("now") && q.choices.includes("note"),
    )
  );
}

/** The human's answer label to one question; null if missing. */
function answer(input, poll, q) {
  if (poll.form === "claude") return input?.tool_response?.answers?.[q.key] ?? null;
  const text = input?.tool_result?.text_result_for_llm;
  const m = typeof text === "string" ? /User responded:\s*(.+)\s*$/s.exec(text) : null;
  if (!m) return null;
  const raw = m[1].trim();
  return copilotField(raw, poll.keys, q.key) ?? (poll.keys.length === 1 && !raw.includes("=") ? raw : null);
}

/** Handles a limits poll: null if the input is not one, else the hook's exit code. */
export async function limitHook(input, { root, lang, tell }) {
  const e = input?.tool_input ?? {};
  const marked =
    (Array.isArray(e.questions) && e.questions.some((x) => x?.header === MARK)) ||
    (typeof e.message === "string" && e.message.startsWith(MARK));
  if (!marked) return null;
  const T = TEXTS[lang];
  try {
    const L = await import(pathToFileURL(join(root, ".githooks", "state-limits.mjs")).href);
    const poll = limitPoll(input, L, root);
    if (input.hook_event_name === "PreToolUse") {
      if (pollValid(poll)) return 0;
      console.error(T.refused);
      return 2;
    }
    if (input.hook_event_name !== "PostToolUse") return 0;
    const read = poll.questions.map((q) => ({ q, choice: L.limitChoice(answer(input, poll, q)) }));
    const given = read.filter((r) => r.q.intent && r.choice).map((r) => ({ intent: r.q.intent, choice: r.choice }));
    const missing = read.filter((r) => !r.q.intent || !r.choice).map((r) => r.q.intent ?? r.q.key);
    if (!given.length) {
      tell(`✗ ${T.noAnswer}`);
      return 0;
    }
    const r = await L.recordLimits(root, given);
    tell(`${r.code === 0 ? "✓" : "✗"} ${r.message}${r.code === 0 && missing.length ? T.unanswered(missing.join(", ")) : ""}`);
  } catch (err) {
    if (input.hook_event_name === "PostToolUse") tell(`✗ ${T.error(err?.message ?? String(err))}`);
  }
  return 0;
}
