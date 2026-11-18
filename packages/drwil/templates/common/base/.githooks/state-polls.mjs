// Preparation of the polls of the human gestures made from the chat (`node .githooks/state.mjs poll <gesture>`): the
// poll is printed as the agent must ask it to AskUserQuestion, with no answer. Nothing is ever written here: only the
// hook, on the human's answer in the tool's result, records the gesture (QUA-175).
import { acceptancePoll } from "./state-acceptance.mjs";
import { config } from "./briefs.mjs";

const POLLS = { accept: acceptancePoll };

/** `poll <gesture>` command: the prepared poll in JSON on stdout, or why there is none. Exit code. */
export function pollCommand(args, root) {
  const prepare = POLLS[args[1]];
  if (!prepare) {
    const usage = config(root).lang === "en" ? "usage" : "utilisation";
    console.error(`✗ ${usage} : node .githooks/state.mjs poll <${Object.keys(POLLS).join("|")}>`);
    return 2;
  }
  const r = prepare(root);
  if (r.code !== 0) {
    console.error(`✗ ${r.message}`);
    return r.code;
  }
  console.log(JSON.stringify(r.poll, null, 2));
  return 0;
}
