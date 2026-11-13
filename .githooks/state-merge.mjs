// Answer to the `drwil-merge` poll, read by the poll hook (.claude/hooks/merge-poll.mjs). The automatic merge is the
// default (`.githooks/merge-auto.mjs`): the answer no longer writes anything; a legacy `auto_merge` in the state is read
// as it is, without effect. No command line: state-merge.mjs has no entry point.
import { config } from "./briefs.mjs";
import { fill } from "./state-messages.mjs";
import { readState } from "./state-validate.mjs";

const ACTIVE = ["BUILD", "EVIDENCE", "VERIFY", "CLOSING"];

const TEXTS = {
  fr: {
    answered:
      "réponse au sondage de fusion lue, état inchangé : la fusion automatique est le comportement par défaut, `node .githooks/merge-auto.mjs <PR>` la programmera, une fois la PR ouverte",
    notActive:
      "réponse au sondage de fusion ignorée : {0}, hors de BUILD à CLOSING ; état inchangé (en fin de cadrage, c'est le sondage `drwil-scope`)",
    activity: "l'activité est {0}",
  },
  en: {
    answered:
      "answer to the merge poll read, state unchanged: the automatic merge is the default behaviour, `node .githooks/merge-auto.mjs <PR>` will schedule it, once the PR is open",
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
 * Reads the human's answer (`"auto"` or `"manual"`), from the poll hook: nothing is written any more. From BUILD to
 * CLOSING only, never on an invalid state, as before. `{ code, message }`.
 */
export function recordMerge(root, _choice) {
  const T = TEXTS[config(root).lang === "en" ? "en" : "fr"];
  const { state, problems } = readState(root);
  if (problems.length || !ACTIVE.includes(state.activity))
    return { code: 1, message: fill(T.notActive, problems.length ? problems.join(" ; ") : fill(T.activity, state.activity)) };
  return { code: 0, message: T.answered };
}
