#!/usr/bin/env node
// Closing of a workstream in one gesture (QUA-048): `node .githooks/close.mjs` (in CLOSING) deletes
// the brief, removes its index line and records the consumption; `--check` (any activity) only
// reports, before the commit, what would make the closing fail. It never stages, commits, pushes nor
// merges anything, and it never writes the state: the journal entry and the limits stay the agent's.
// The recognition and deletion of the merged local branches live in close-branches.mjs (QUA-048,
// QUA-058, QUA-059), re-exported here.
import { existsSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { undeclaredHooks } from "./base-checks.mjs";
import { config } from "./briefs.mjs";
import { bareNames, criteriaToCreate, deadReferences, git, journalTwice } from "./close-checks.mjs";
import { texts } from "./close-texts.mjs";
import { main as consumption } from "./consumption.mjs";
import {
  applyProposals,
  checkboxProblems,
  codeCitations,
  deadReferences as deadCitations,
  indexItem,
  intentLeft,
  proposals,
  twinIntents,
} from "./doc-coherence.mjs";
import { closureProof, proofNotCited, proofText, writeProof } from "./closure-proof.mjs";
import { lateLines } from "./worktree.mjs";
import { readState, stateRoot, verifyEvidence } from "./state.mjs";

// Compatibility: the branches' functions live in close-branches.mjs, importers keep this path.
export {
  branchMerged,
  closingMerged,
  ghRun,
  mainBranch,
  mergedPullRequests,
  noGhText,
  prunedMessage,
  pruneMergedBranches,
} from "./close-branches.mjs";

const USAGE = [".drwil", "usage.jsonl"];
const recorded = (text, name) =>
  text.split("\n").some((l) => {
    try {
      return JSON.parse(l).workstream === name;
    } catch {
      return false;
    }
  });

/**
 * Records the consumption; for a reopened workstream (QUA-118), its line is replaced by the new total
 * (the logs are read again in full), never doubled, and kept as it was when nothing is measured.
 */
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

/**
 * What would make the closing of `brief` fail and what it only warns about; `text`: the brief, read before it
 * is deleted. `problems`: `{ message }`, with the line rewrite (`file`, `line`, and `edit` or `fixTo`) when
 * the correction needs no judgement; the rules shared with check-docs live in doc-coherence.mjs.
 */
export function closingReport(root, brief, text = existsSync(join(root, brief)) ? readFileSync(join(root, brief), "utf8") : "") {
  const cfg = config(root);
  const lang = cfg.lang === "en" ? "en" : "fr";
  const T = texts(root);
  const plain = [
    ...criteriaToCreate(root, brief, text),
    ...undeclaredHooks(root, text).lines,
    ...proofNotCited(root, brief),
    ...journalTwice(root, brief),
    ...deadReferences(root, brief),
    ...bareNames(root),
  ].map((message) => ({ message }));
  const reported = new Set(plain.map((p) => /^(\S+:\d+) /.exec(p.message)?.[1]));
  const code = codeCitations(root, cfg, lang).filter((c) => !reported.has(c.place));
  const boxes = checkboxProblems(root, cfg, lang, { except: brief }).map((p) => ({
    ...p,
    message: `${p.place} : ${p.message}${p.fixTo ? "" : ` — ${T.byHand}`}`,
  }));
  const problems = [
    ...plain,
    ...deadCitations(root, cfg, lang, brief),
    ...boxes,
    ...code,
    ...intentLeft(root, lang, brief, text).map((message) => ({ message })),
  ];
  return { problems, warnings: twinIntents(root, cfg, lang) };
}

/** What would make the closing of `brief` fail, as messages. */
export const closingSignals = (root, brief, text) => closingReport(root, brief, text).problems.map((p) => p.message);

const STEPS = ["BUILD", "EVIDENCE", "VERIFY", "CLOSING"];

/**
 * The commands that remain from `activity` to CLOSING (neighbouring transitions only), the evidence
 * renewal placed before the last one when it is absent or from another commit than HEAD; null outside
 * a started workstream, where closing is not in the agent's hands.
 */
export function pathToClosing(root, activity) {
  const at = STEPS.indexOf(activity);
  if (at < 0 || at === STEPS.length - 1) return null;
  const T = texts(root);
  const steps = STEPS.slice(at + 1).map((a) => `node .githooks/state.mjs move ${a}`);
  const evidence = verifyEvidence(root);
  if (!evidence.ok && (evidence.code === "noEvidence" || evidence.code === "otherCommit")) steps.splice(steps.length - 1, 0, T.rerun);
  return T.path(steps);
}

/**
 * `{ code, message }`. Without `check`: the mechanics (CLOSING only) — brief deleted, index item
 * removed, consumption recorded — then the signals. With `check`: the signals only. With `fix`, the
 * corrections that need no judgement are written (and only then); otherwise they are proposed as a diff.
 */
export function close(root, { brief, check = false, fix = false, env = process.env, logs } = {}) {
  const T = texts(root);
  const { state } = readState(root);
  const path = brief ? posix.normalize(brief.replace(/\\/g, "/")) : state.active_brief;
  if (!path) return { code: 1, message: T.noBrief };
  const route = pathToClosing(root, state.activity);
  if (!check && state.activity !== "CLOSING") return { code: 1, message: [T.notClosing(state.activity), route].filter(Boolean).join("\n") };
  const text = existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : "";
  const done = [];
  if (!check) {
    const hooks = undeclaredHooks(root, text); // QUA-137: refused before anything is written
    if (hooks.files.length) return { code: 1, message: [T.signals, ...hooks.lines.map((s) => `  ⚠ ${s}`)].join("\n") };
    // The proof first: a brief is never deleted while what it had proven would stay unwritten (QUA-084).
    const proof = closureProof(root, path, text, { head: git(root, "rev-parse", "HEAD") });
    const problem = proof.problem ?? writeProof(root, proof);
    if (problem) return { code: 1, message: proofText(root, "proofRefused", problem) };
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
  }
  let report = closingReport(root, path, text);
  let proposed = proposals(root, report.problems);
  if (fix && proposed.length) {
    done.push(T.applied(applyProposals(root, proposed)));
    report = closingReport(root, path, text);
    proposed = proposals(root, report.problems);
  }
  const problems = report.problems.map((p) => p.message);
  const diff = proposed.flatMap((p) => [`  ${p.file}:${p.line}`, `    - ${p.from}`, `    + ${p.to}`]);
  const lines = [
    ...done,
    ...(problems.length ? [T.signals, ...problems.map((s) => `  ⚠ ${s}`)] : [T.clean]),
    ...(diff.length ? [T.proposed, ...diff] : []),
    ...(report.warnings.length ? [T.warnings, ...report.warnings.map((w) => `  ⚠ ${w}`)] : []),
    ...(check ? [...lateLines(root), route] : [T.rest]),
  ];
  return { code: problems.length ? 1 : 0, message: lines.filter(Boolean).join("\n") };
}

/** Entry point: `node .githooks/close.mjs [--check] [<brief>] [--logs <folder>]`. Returns the exit code. */
export function main(args, root, { env = process.env } = {}) {
  const i = args.indexOf("--logs");
  const logs = i >= 0 ? args[i + 1] : undefined;
  const rest = args.filter((a, j) => a !== "--check" && a !== "--fix" && (i < 0 || (j !== i && j !== i + 1)));
  if (rest.some((a) => a.startsWith("-")) || rest.length > 1) {
    console.error(texts(root).usage);
    return 2;
  }
  const r = close(root, { brief: rest[0], check: args.includes("--check"), fix: args.includes("--fix"), env, logs });
  (r.code === 0 ? console.log : console.error)(r.message);
  return r.code;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2), stateRoot());
}
