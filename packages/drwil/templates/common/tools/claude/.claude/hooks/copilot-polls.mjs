#!/usr/bin/env node
// QUA-235 : les sondages préparés (attestation, acceptation des critères, verdict de recette, transition réservée à
// l'humain, oui au détour) sous Copilot CLI. Forme réelle relevée dans ses journaux de session (2026-11-14 et 15) :
// `ask_user` prend `message` et `requestedSchema` (un champ `enum`), le preToolUse natif porte `toolCalls[]`, pas
// `toolName` / `toolArgs`, le postToolUse `toolCallId` et `toolResult.textResultForLlm` (« User responded: <valeur> »).
// L'ancienne lecture attendait `question` / `choices` et `toolArgs` en preToolUse : rien n'était préparé, la réponse
// était refusée. Ici, la forme Copilot est traduite dans celle de Claude Code et confiée au même socle
// (prepared-poll.mjs) : mêmes préparation, corrélation (session et appel), refus nommés, sans les recopier.
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { acceptanceHook } from "./accept-poll.mjs";
import { attestationHook } from "./attest-poll.mjs";
import { detourHook } from "./detour-poll.mjs";
import { moveHook } from "./move-poll.mjs";
import { verdictHook } from "./verdict-poll.mjs";

const HOOKS = {
  "drwil-attest": attestationHook,
  "drwil-accept": acceptanceHook,
  "drwil-verdict": verdictHook,
  "drwil-move": moveHook,
  "drwil-detour": detourHook,
};
export const HEADERS = Object.keys(HOOKS);
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const SEP = " : ";

/**
 * Le sondage préparé (forme Claude Code, une question à choix unique) en arguments de `ask_user` : la question puis,
 * après une ligne vide, une ligne « libellé : description » par option ; un champ nommé par l'en-tête, les libellés
 * en `enum`. Lève une erreur pour ce qui ne se lit pas sous Copilot CLI (choix multiple, en-tête inconnu).
 */
export function copilotArgs(poll) {
  const qs = Array.isArray(poll?.questions) ? poll.questions : [];
  const q = obj(qs[0]);
  if (qs.length !== 1 || !HEADERS.includes(q.header)) throw new Error("une seule question préparée par drwil attendue");
  if (q.multiSelect) throw new Error("choix multiple non lu sous Copilot CLI : un contrat par sondage");
  const options = Array.isArray(q.options) ? q.options : [];
  return {
    message: [q.question, "", ...options.map((o) => `${o.label}${SEP}${o.description}`)].join("\n"),
    requestedSchema: { type: "object", properties: { [q.header]: { type: "string", title: q.header, enum: options.map((o) => o.label) } } },
  };
}

/** L'en-tête d'un `ask_user` préparé : le nom de son champ, ou le premier mot de son message ; null sinon. */
function header(args) {
  const keys = Object.keys(obj(obj(args.requestedSchema).properties));
  return keys.find((k) => HEADERS.includes(k)) ?? HEADERS.find((h) => String(args.message ?? "").startsWith(`${h} `)) ?? null;
}

/** Arguments `ask_user` → question de Claude Code ; tout ajout devient un champ que le socle refuse, cause dite. */
function question(args, name) {
  const schema = obj(args.requestedSchema);
  const props = obj(schema.properties);
  const field = obj(props[name]);
  const array = field.type === "array";
  const labels = (array ? obj(field.items).enum : field.enum) ?? [];
  const lines = String(args.message ?? "").split("\n");
  const n = Array.isArray(labels) ? labels.length : 0;
  const tail = lines.slice(lines.length - n);
  const described =
    n > 0 && lines.length > n && lines[lines.length - n - 1] === "" && tail.every((l, i) => l.startsWith(`${labels[i]}${SEP}`));
  const extra = Object.fromEntries(
    Object.entries(field).filter(([k, v]) => !["type", "title", "enum", "items"].includes(k) || (k === "title" && v !== name)),
  );
  const q = {
    header: name,
    question: described ? lines.slice(0, lines.length - n - 1).join("\n") : lines.join("\n"),
    multiSelect: array,
    options: (n ? labels : []).map((label, i) =>
      described ? { label, description: tail[i].slice(String(label).length + SEP.length) } : { label },
    ),
    ...extra,
  };
  const others = Object.keys(props)
    .filter((k) => k !== name)
    .map((k) => ({ header: k }));
  const added = Object.fromEntries([
    ...Object.keys(args)
      .filter((k) => !["message", "requestedSchema"].includes(k))
      .map((k) => [k, args[k]]),
    ...Object.keys(schema)
      .filter((k) => !["type", "properties"].includes(k))
      .map((k) => [`requestedSchema.${k}`, schema[k]]),
  ]);
  return { questions: [q, ...others], ...added };
}

/** L'événement natif de Copilot CLI en celui de Claude Code ; null s'il ne porte aucun sondage préparé. */
export function claudeEvent(input, phase) {
  const e = obj(input);
  const calls =
    phase === "pre" && Array.isArray(e.toolCalls) ? e.toolCalls.map(obj) : [{ id: e.toolCallId, name: e.toolName, args: e.toolArgs }];
  const asked = calls.filter((c) => c.name === "ask_user" && header(obj(c.args)));
  if (!asked.length || !["pre", "post"].includes(phase)) return null;
  const [first] = asked;
  const polls = asked.map((c) => question(obj(c.args), header(obj(c.args))));
  const tool_input = { ...polls[0], questions: polls.flatMap((p) => p.questions) };
  const result = obj(e.toolResult);
  const said = result.resultType === "success" ? /^User responded: ([\s\S]*)$/.exec(String(result.textResultForLlm ?? "")) : null;
  return {
    hook_event_name: phase === "pre" ? "PreToolUse" : "PostToolUse",
    tool_name: "AskUserQuestion",
    session_id: e.sessionId,
    tool_use_id: first.id,
    tool_input,
    ...(phase === "post" ? { tool_response: { answers: said ? { [tool_input.questions[0].question]: said[1] } : {} } } : {}),
  };
}

/** Un sondage préparé posé sous Copilot CLI : null s'il n'en porte pas, sinon le code du socle (2 refuse). */
export async function copilotPollHook(input, ctx) {
  const event = claudeEvent(input, ctx.phase);
  if (!event) return null;
  return HOOKS[event.tool_input.questions[0].header](event, { ...ctx, source: "copilot-poll" });
}

// `<préparation> | node .claude/hooks/copilot-polls.mjs` : le sondage préparé, en arguments de `ask_user`.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    console.log(JSON.stringify(copilotArgs(JSON.parse(readFileSync(0, "utf8"))), null, 2));
  } catch (e) {
    console.error(
      `✗ copilot-polls : ${e.message} — passer la sortie d'une préparation drwil (attest-poll, state.mjs poll, release-verdict-poll).`,
    );
    process.exitCode = 2;
  }
}
