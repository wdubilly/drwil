// The automatic merge given back during a workstream (QUA-265): a standalone poll headed `drwil-merge`, answered by
// the human (« Automatic merge » or « Manual merge ») and read by the poll hook (.claude/hooks/merge-poll.mjs), writes
// `auto_merge` in the state, from BUILD to CLOSING. It gives back what a resume on another clone never rebuilds
// (QUA-247), without restarting the workstream. Never the agent: no command line writes it, only the hook.
import { config } from "./briefs.mjs";
import { fill } from "./state-messages.mjs";
import { readState } from "./state-validate.mjs";
import { writeState } from "./state.mjs";

const ACTIVE = ["BUILD", "EVIDENCE", "VERIFY", "CLOSING"];

const TEXTS = {
  fr: {
    auto: "fusion automatique autorisée par l'humain (sondage `drwil-merge`) pour ce chantier : `node .githooks/merge-auto.mjs <PR>` la programmera, une fois la PR ouverte",
    manual:
      "fusion manuelle choisie par l'humain (sondage `drwil-merge`) : la fusion automatique n'est pas autorisée pour ce chantier, la fusion reste un geste humain",
    notActive:
      "réponse au sondage de fusion ignorée : {0}, hors de BUILD à CLOSING ; état inchangé (en fin de cadrage, c'est le sondage `drwil-scope`)",
    activity: "l'activité est {0}",
  },
  en: {
    auto: "automatic merge authorised by the human (`drwil-merge` poll) for this workstream: `node .githooks/merge-auto.mjs <PR>` will schedule it, once the PR is open",
    manual:
      "manual merge chosen by the human (`drwil-merge` poll): the automatic merge is not authorised for this workstream, the merge stays a human gesture",
    notActive:
      "answer to the merge poll ignored: {0}, outside BUILD to CLOSING; state unchanged (at the end of scoping, it is the `drwil-scope` poll)",
    activity: "the activity is {0}",
  },
};

/** "auto", "manual", or null: the choice an answer label means, in either language. */
export function mergeChoice(label) {
  const text = String(label ?? "").trim();
  if (/^(automatic merge|fusion automatique)$/i.test(text)) return "auto";
  if (/^(manual merge|fusion manuelle)$/i.test(text)) return "manual";
  return null;
}

/**
 * Records the human's answer (`"auto"` or `"manual"`), read by the poll hook: `auto_merge: true`, or no `auto_merge`.
 * From BUILD to CLOSING only; an invalid state is never overwritten. `{ code, message }`.
 */
export function recordMerge(root, choice) {
  const T = TEXTS[config(root).lang === "en" ? "en" : "fr"];
  const { state, problems } = readState(root);
  if (problems.length || !ACTIVE.includes(state.activity))
    return { code: 1, message: fill(T.notActive, problems.length ? problems.join(" ; ") : fill(T.activity, state.activity)) };
  const next = { ...state, auto_merge: true };
  if (choice !== "auto") delete next.auto_merge;
  writeState(root, next);
  return { code: 0, message: choice === "auto" ? T.auto : T.manual };
}
