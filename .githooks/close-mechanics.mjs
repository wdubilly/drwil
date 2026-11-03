import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";
import { config } from "./briefs.mjs";
import { git } from "./close-checks.mjs";
import { journalPlan } from "./close-journal.mjs";
import { texts } from "./close-texts.mjs";
import { main as consumption } from "./consumption.mjs";
import { indexItem } from "./doc-coherence.mjs";
import { closureProof, proofText, writeProof } from "./closure-proof.mjs";

const USAGE = [".drwil", "usage.jsonl"];
const recorded = (text, name) =>
  text.split("\n").some((l) => {
    try {
      return JSON.parse(l).workstream === name;
    } catch {
      return false;
    }
  });

// QUA-118 : remplacer le total rouvert, sans perdre une mesure précédente faute de journaux.
function recordConsumption(root, name, { reopened, env, logs, log }) {
  const file = join(root, ...USAGE);
  const before = reopened && existsSync(file) ? readFileSync(file, "utf8") : null;
  const replace = before !== null && recorded(before, name);
  if (replace)
    writeFileSync(
      file,
      before
        .split("\n")
        .filter((l) => !recorded(l, name))
        .join("\n"),
    );
  consumption(["--record", name, ...(logs ? ["--logs", logs] : [])], { env, root, log, err: log });
  if (replace && !recorded(readFileSync(file, "utf8"), name)) writeFileSync(file, before);
}

export function closingMechanics(root, path, text, { state, env, logs, done }) {
  const T = texts(root);
  // QUA-084 : aucune suppression tant que la preuve n'est pas écrite.
  const proof = closureProof(root, path, text, { head: git(root, "rev-parse", "HEAD") });
  if (proof.problem) return { code: 1, message: proofText(root, "proofRefused", proof.problem) };
  const journal = journalPlan(root, path, text);
  if (journal.problem) return { code: 1, message: journal.problem };
  const problem = writeProof(root, proof);
  if (problem) return { code: 1, message: proofText(root, "proofRefused", problem) };
  const journalProblem = writeProof(root, journal);
  if (journalProblem) return { code: 1, message: T.journalRefused(journalProblem) };
  done.push(proofText(root, "proofWritten", proof.file));
  if (existsSync(join(root, path))) {
    unlinkSync(join(root, path));
    done.push(T.deleted(path));
  }
  const index = config(root).dirs?.index ?? "docs/projects/pending.md";
  const lines = existsSync(join(root, index)) ? readFileSync(join(root, index), "utf8").split("\n") : [];
  const item = indexItem(lines, path);
  if (item) {
    lines.splice(item[0], item[1] - item[0]);
    writeFileSync(join(root, index), lines.join("\n"));
    done.push(T.indexLine(index));
  } else done.push(T.noIndexLine(index, path));
  recordConsumption(root, posix.basename(path, ".md"), { reopened: Boolean(state.reopened), env, logs, log: (m) => done.push(m) });
  return null;
}
