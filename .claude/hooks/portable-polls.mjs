// Limits (`drwil-limite`) and merge (`drwil-merge`) polls outside Claude Code (QUA-266): Gemini CLI (`ask_user`),
// Codex (`request_user_input`) and Cursor's dedicated ACP client (`cursor/ask_question`) ask them in their native
// form; it is translated here into Claude Code's form and handed to the same hooks (limit-poll.mjs, merge-poll.mjs),
// so the same refusals apply and only the human's answer, read from the tool's native result, is recorded.
// Copilot CLI reads them through `.claude/settings.json` (prompt-hook.mjs without argument): its native entry stays
// the attestation's. Any other question goes on to the attestation hook, unchanged.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nativeAttestationEvent } from "./attest-adapters.mjs";
import { limitHook } from "./limit-poll.mjs";
import { mergeHook } from "./merge-poll.mjs";
import { portableAttestationMain } from "./portable-attest.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MARKS = ["drwil-limite", "drwil-merge"];
// A value the agent would have put in the poll in the human's place.
const FILLED = ["answers", "answer", "default", "defaultValue", "selected"];
const obj = (v) => (v && typeof v === "object" ? v : {});
const list = (v) => (Array.isArray(v) ? v : []);
const filled = (v) => FILLED.some((k) => k in obj(v));

/** The native questions, in Claude Code's shape, with their native identifier (`id`) kept for reading the answers. */
function questions(args, tool) {
  return list(args.questions).map((raw, i) => {
    const q = obj(raw);
    if (tool === "cursor")
      return {
        id: q.id,
        header: args.title,
        question: q.prompt,
        multiSelect: q.allowMultiple !== undefined && q.allowMultiple !== false,
        options: list(q.options).map((o) => ({ id: obj(o).id, label: obj(o).label })),
      };
    return {
      id: tool === "codex" ? q.id : String(i),
      header: q.header,
      question: q.question,
      // Gemini: only a `choice` question offers the two answers; any other type is refused like a multiple choice.
      multiSelect: q.multiSelect === true || (q.type !== undefined && q.type !== "choice"),
      options: list(q.options).map((o) => ({ label: obj(o).label, description: obj(o).description })),
    };
  });
}

/** The label the human chose for each question, keyed by its text, read only from the tool's native result. */
function answers(result, tool, qs) {
  const one = (v) => (list(v).length === 1 ? v[0] : null);
  let pick;
  try {
    if (tool === "cursor") {
      const outcome = obj(obj(result).outcome);
      const given = outcome.outcome === "answered" ? list(outcome.answers) : [];
      pick = (q) => {
        const id = one(obj(given.find((a) => obj(a).questionId === q.id)).selectedOptionIds);
        return q.options.find((o) => o.id === id)?.label;
      };
    } else if (tool === "codex") {
      const given = obj(obj(JSON.parse(result)).answers);
      pick = (q) => one(obj(given[q.id]).answers);
    } else {
      const given = obj(result).error ? {} : obj(obj(JSON.parse(obj(result).llmContent)).answers);
      pick = (q) => given[q.id];
    }
  } catch {
    return {};
  }
  return Object.fromEntries(qs.flatMap((q) => (typeof pick(q) === "string" ? [[q.question, pick(q)]] : [])));
}

function language(root) {
  try {
    return JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

/** A limits or merge poll asked natively: null if the event is not one, else the hook's exit code (2 refuses it). */
export async function portablePollHook(input, { root, tool, phase, tell }) {
  const e = tool === "copilot" ? null : nativeAttestationEvent(input, tool, phase);
  if (!e || !(e.pre || e.post)) return null;
  const args = obj(e.args);
  const qs = questions(args, tool);
  if (!qs.some((q) => MARKS.includes(q.header))) return null;
  const prefilled = filled(args) || list(args.questions).some(filled);
  const claude = {
    hook_event_name: e.pre ? "PreToolUse" : "PostToolUse",
    tool_input: { questions: qs.map(({ id, ...q }) => q), ...(prefilled ? { answers: { prefilled: true } } : {}) },
    tool_response: { answers: e.post ? answers(e.result, tool, qs) : {} },
  };
  const ctx = { root, lang: language(root), tell };
  return (await limitHook(claude, ctx)) ?? mergeHook(claude, ctx);
}

/** Native entry of `prompt-hook.mjs <tool> [phase]`: the limits and merge polls of Gemini and Codex, else the attestation. */
export async function portableMain({ root = ROOT, tool = process.argv[2], phase = process.argv[3], raw = readFileSync(0, "utf8") } = {}) {
  let input = null;
  try {
    input = JSON.parse(raw);
  } catch {}
  const tell = (message) =>
    console.log(
      JSON.stringify({
        hookSpecificOutput: { ...(tool === "codex" ? { hookEventName: "PostToolUse" } : {}), additionalContext: `[drwil] ${message}` },
      }),
    );
  const code = tool === "gemini" || tool === "codex" ? await portablePollHook(input, { root, tool, phase, tell }) : null;
  return code ?? portableAttestationMain({ root, tool, phase, raw });
}
