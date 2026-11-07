// The closing refuses an intent brief born on the branch without the human's choice (QUA-264): a limit outside
// the brief's scope becomes an intent brief only on the « Record as intent » answer to the limits poll
// (`drwil-limite`, recorded in the state by .githooks/state-limits.mjs, QUA-253); a limit answered « Handle now »
// is handled in the workstream, never written as an intent. Its texts live here: state-messages-fr.mjs is full.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, posix } from "node:path";
import { branchFiles, briefIntent, config } from "./briefs.mjs";
import { changedFiles } from "./check-code-rules.mjs";
import { intentsDir } from "./state-limits.mjs";
import { readState } from "./state-validate.mjs";

const TEXTS = {
  fr: {
    unanswered: (f) =>
      `\`${f}\` : fiche d'intention ajoutée par la branche sans réponse « Noter en intention » de l'humain — une limite hors cadre se soumet au sondage des limites (en-tête \`drwil-limite\`, une question nommant ce chemin, réponses « Traiter maintenant » et « Noter en intention », aucune recommandée) ; une limite dans le cadre se traite et la fiche se retire`,
    handleNow: (f) =>
      `\`${f}\` : limite répondue « Traiter maintenant » par l'humain, devenue fiche d'intention — la traiter dans ce chantier et retirer la fiche, ou reposer le sondage \`drwil-limite\` pour ce chemin`,
  },
  en: {
    unanswered: (f) =>
      `\`${f}\`: intent brief added by the branch without the human's « Record as intent » answer — a limit outside the scope goes to the limits poll (header \`drwil-limite\`, one question naming this path, answers « Handle now » and « Record as intent », none recommended); a limit within the scope is handled and the brief removed`,
    handleNow: (f) =>
      `\`${f}\`: limit answered « Handle now » by the human, turned into an intent brief — handle it in this workstream and remove the brief, or ask the \`drwil-limite\` poll again for this path`,
  },
};

/** Intent briefs the branch adds: committed since the merge base, or new in the working tree. */
function addedIntents(root, dir) {
  const isNew = (f) => existsSync(join(root, f)) && spawnSync("git", ["cat-file", "-e", `HEAD:${f}`], { cwd: root }).status !== 0;
  const files = new Set([...branchFiles(root, "A"), ...changedFiles(root).filter(isNew)]);
  return [...files].filter((f) => f.endsWith(".md") && posix.dirname(f) === dir).sort();
}

/**
 * What refuses the closing about limits, as messages; `text`: the brief, read before it is deleted. Each intent brief
 * added by the branch — the brief's own intent, the folder's README and the notes file excepted — needs the human's
 * « Record as intent » answer for its path; « Handle now » or no answer refuses.
 */
export function limitProblems(root, text = "") {
  const T = TEXTS[config(root).lang === "en" ? "en" : "fr"];
  const dir = intentsDir(root);
  const origin = briefIntent(text);
  const skip = new Set([origin && posix.normalize(origin), `${dir}/notes.md`]);
  const answers = new Map((readState(root).state?.limits ?? []).map((l) => [l.intent, l.choice]));
  return addedIntents(root, dir)
    .filter((f) => !skip.has(f) && !/^readme\.md$/i.test(posix.basename(f)) && answers.get(f) !== "note")
    .map((f) => (answers.get(f) === "now" ? T.handleNow(f) : T.unanswered(f)));
}
