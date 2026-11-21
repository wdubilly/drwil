// Polls of the human gestures made from the chat (`node .githooks/state.mjs poll <gesture>`): the poll is printed as
// the agent must ask it to AskUserQuestion, with no answer. Preparing writes nothing: only the hook, on the human's
// answer in the tool's result, records the gesture (QUA-175, QUA-117) through its `…FromPoll` function.
import { acceptancePoll } from "./state-acceptance.mjs";
import { config } from "./briefs.mjs";
import { detourPoll } from "./detour.mjs";
import { move, prepareTransition, readState, requiresHuman } from "./state.mjs";
import { fill } from "./state-texts.mjs";

const TEXTS = {
  fr: {
    usage: "utilisation",
    moveUsage: "utilisation : node .githooks/state.mjs poll move <ACTIVITE> [--brief <fiche>] [--request <demande>]",
    free: "{0} → {1} n'est pas une décision humaine : `node .githooks/state.mjs move {1}` suffit, sans sondage",
    show: "Transition : {0} → {1}",
    brief: "Fiche : {0}",
    request: "Demande : {0}",
    ask: "Autoriser cette transition ?",
    options: [
      { label: "Autoriser", description: "L'état passe de {0} à {1}." },
      { label: "Ne pas autoriser", description: "L'état ne change pas." },
    ],
    hint: " ; depuis le chat : `node .githooks/state.mjs poll move {0}` prépare le sondage `drwil-move`, à poser tel quel : seule la réponse de l'humain l'applique",
  },
  en: {
    usage: "usage",
    moveUsage: "usage: node .githooks/state.mjs poll move <ACTIVITY> [--brief <brief>] [--request <request>]",
    free: "{0} → {1} is not a human decision: `node .githooks/state.mjs move {1}` is enough, without a poll",
    show: "Transition: {0} → {1}",
    brief: "Brief: {0}",
    request: "Request: {0}",
    ask: "Allow this transition?",
    options: [
      { label: "Allow", description: "The state goes from {0} to {1}." },
      { label: "Do not allow", description: "The state does not change." },
    ],
    hint: "; from the chat: `node .githooks/state.mjs poll move {0}` prepares the `drwil-move` poll, to ask as is: only the human's answer applies it",
  },
};
const texts = (root) => TEXTS[config(root).lang === "en" ? "en" : "fr"];

/** The transition's options that were given, in a fixed order: the poll's first line, re-prepared by the hook. */
const given = ({ brief, request }) => Object.fromEntries(Object.entries({ brief, request }).filter(([, v]) => v !== undefined));

/** What the refusal of a human transition outside a terminal adds: the chat poll that gives it (QUA-117). */
export function moveHint(root, to, { brief, request } = {}) {
  const args = [to, brief !== undefined && `--brief ${brief}`, request !== undefined && `--request ${JSON.stringify(request)}`];
  return fill(texts(root).hint, args.filter(Boolean).join(" "));
}

/**
 * The `drwil-move` poll of a transition reserved to the human (QUA-117); writes nothing. Refused, cause said, for a
 * forbidden transition or one the agent makes alone. `data` ties the answer to the state the poll was asked on.
 */
export function movePoll(root, { to, brief, request } = {}) {
  const T = texts(root);
  if (!to || to.startsWith("--")) return { code: 2, message: T.moveUsage };
  const read = readState(root);
  const prep = prepareTransition(read, to, { brief, request, now: new Date().toISOString() }, root);
  if (prep.error) return { code: 1, message: prep.error };
  const from = read.state.activity;
  if (!requiresHuman(from, to, config(root).transitions)) return { code: 1, message: fill(T.free, from, to) };
  const args = given({ brief, request });
  const lines = [fill(T.show, from, to), ...Object.entries(args).map(([k, v]) => fill(T[k], v))];
  const question = [`drwil-move ${to} ${JSON.stringify(args)}`, ...lines, "", T.ask].join("\n");
  const options = T.options.map((o) => ({ label: o.label, description: fill(o.description, from, to) }));
  const poll = { questions: [{ header: "drwil-move", question, options }] };
  const { activity, since, active_brief } = read.state;
  return { code: 0, message: "", poll, data: { to, ...args, state: { activity, since, active_brief } } };
}

/**
 * Applies the transition the human allowed by answering the poll, called by the hook only (QUA-117): the state must
 * still be the one the poll was asked on. `{ code, message }` of the transition, or null (state changed, nothing done).
 */
export async function moveFromPoll(root, data) {
  const { state } = readState(root);
  const asked = data?.state;
  if (!asked || ["activity", "since", "active_brief"].some((k) => (state[k] ?? null) !== (asked[k] ?? null))) return null;
  return move(root, { to: data.to, brief: data.brief, request: data.request }, { human: true });
}

/** `poll move <ACTIVITY> [--brief …] [--request …]`: the transition asked. */
function moveArgs(args) {
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  return { to: args[0], brief: option("--brief"), request: option("--request") };
}

const POLLS = {
  accept: (root) => acceptancePoll(root),
  move: (root, args) => movePoll(root, moveArgs(args)),
  detour: (root) => detourPoll(root),
};

/** `poll <gesture>` command: the prepared poll in JSON on stdout, or why there is none. Exit code. */
export function pollCommand(args, root) {
  const prepare = POLLS[args[1]];
  if (!prepare) {
    console.error(`✗ ${texts(root).usage} : node .githooks/state.mjs poll <${Object.keys(POLLS).join("|")}>`);
    return 2;
  }
  const r = prepare(root, args.slice(2));
  if (r.code !== 0) {
    console.error(`✗ ${r.message}`);
    return r.code;
  }
  console.log(JSON.stringify(r.poll, null, 2));
  return 0;
}
