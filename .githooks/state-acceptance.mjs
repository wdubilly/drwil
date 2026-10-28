// Acceptance of a brief's criteria by the human (split from state.mjs, which wires it): the start the human
// decides (poll read by the hook, interactive terminal) records the fingerprint of the « Acceptance criteria »
// section; the closing reads it back, says it in the closing proof and refuses a section modified since, until
// the human accepts again (`node .githooks/state.mjs accept`, terminal only). The record is local, in the
// evidence folder outside git, like the state: it holds a fingerprint, never the criteria.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { acceptanceCriteria, config } from "./briefs.mjs";
import { readState } from "./state-validate.mjs";

const FILE = [".drwil", "evidence", "acceptance.json"];
const HEADING = /^##\s*(\d+\.\s*)?(Critères d'acceptation|Acceptance criteria)\b/i;
// What follows a criterion's text: its proof (a contract ID, or the contract to create), written as the work
// goes on without the criterion changing.
const PROOF_TAIL = /\s+[—–]\s+(?:contrat à créer|contract to create|`[A-Za-z][\w.:-]*`).*$/;

const TEXTS = {
  fr: {
    notTerminal: "acceptation refusée : seul un terminal interactif, tenu par l'humain, enregistre l'acceptation des critères",
    noBrief: "acceptation impossible : aucun chantier actif (`node .githooks/state.mjs`)",
    noCriteria: (b) => `acceptation impossible : ${b} n'a aucun critère d'acceptation`,
    show: (b) => `Critères de ${b} :`,
    confirm: "Taper ACCEPT pour accepter ces critères tels quels : ",
    notConfirmed: "acceptation non confirmée : rien n'est enregistré",
    done: (b, f) => `critères de ${b} acceptés (empreinte ${f})`,
  },
  en: {
    notTerminal: "acceptance refused: only an interactive terminal, held by the human, records the acceptance of the criteria",
    noBrief: "acceptance impossible: no active workstream (`node .githooks/state.mjs`)",
    noCriteria: (b) => `acceptance impossible: ${b} has no acceptance criteria`,
    show: (b) => `Criteria of ${b}:`,
    confirm: "Type ACCEPT to accept these criteria as they are: ",
    notConfirmed: "acceptance not confirmed: nothing is recorded",
    done: (b, f) => `criteria of ${b} accepted (fingerprint ${f})`,
  },
};
const texts = (root) => TEXTS[config(root).lang === "en" ? "en" : "fr"];

/** `sha256:<16 hex>` of the criteria of `text` (their proofs left out), or null without any. */
export function criteriaFingerprint(text) {
  const items = [];
  let inside = false;
  let open = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s/.test(line)) {
      inside = HEADING.test(line);
      open = false;
      continue;
    }
    const item = inside ? /^\s*-\s+(.+)$/.exec(line) : null;
    if (item) items.push(item[1]);
    else if (open && /^\s+\S/.test(line)) items[items.length - 1] += ` ${line.trim()}`;
    open = Boolean(item) || (open && /^\s+\S/.test(line));
  }
  if (!items.length) return null;
  const normal = items.map((i) => i.replace(PROOF_TAIL, "").replace(/\s+/g, " ").trim());
  return `sha256:${createHash("sha256").update(JSON.stringify(normal)).digest("hex").slice(0, 16)}`;
}

function readAll(root) {
  try {
    const all = JSON.parse(readFileSync(join(root, ...FILE), "utf8"));
    return all && typeof all === "object" && !Array.isArray(all) ? all : {};
  } catch {
    return {};
  }
}

function writeAll(root, all) {
  mkdirSync(dirname(join(root, ...FILE)), { recursive: true });
  writeFileSync(join(root, ...FILE), JSON.stringify(all, null, 2) + "\n");
}

/** Records the acceptance of the criteria of `brief` as they are now; null (nothing recorded) without a readable brief or criteria. */
export function recordAcceptance(root, brief, now = new Date()) {
  let print;
  try {
    print = criteriaFingerprint(readFileSync(join(root, brief), "utf8"));
  } catch {
    return null;
  }
  if (!print) return null;
  const record = { fingerprint: print, acceptedAt: now.toISOString() };
  writeAll(root, { ...readAll(root), [brief]: record });
  return record;
}

/** Forgets the acceptance of `brief` (back in SCOPING, a start that is not the human's). */
export function forgetAcceptance(root, brief) {
  const { [brief]: forgotten, ...rest } = readAll(root);
  if (forgotten !== undefined) writeAll(root, rest);
}

/**
 * Where the criteria of `brief` (its `text`) stand against what the human accepted: `none` (no acceptance
 * recorded: a start that was not the human's), `same`, or `changed` (a criterion modified since).
 */
export function acceptanceCheck(root, brief, text) {
  const record = readAll(root)[brief];
  if (typeof record?.fingerprint !== "string") return { kind: "none" };
  const current = criteriaFingerprint(text);
  return { kind: current === record.fingerprint ? "same" : "changed", record, current };
}

/** `accept` command: records the acceptance of the active brief's criteria, from an interactive terminal only. Exit code. */
export async function accept(root) {
  const T = texts(root);
  if (!(process.stdin.isTTY && process.stdout.isTTY)) {
    console.error(`✗ ${T.notTerminal}`);
    return 1;
  }
  const brief = readState(root).state.active_brief;
  if (!brief) {
    console.error(`✗ ${T.noBrief}`);
    return 1;
  }
  let labels = [];
  try {
    labels = acceptanceCriteria(readFileSync(join(root, brief), "utf8"));
  } catch {
    // brief unreadable: reported as without criteria
  }
  if (!labels.length) {
    console.error(`✗ ${T.noCriteria(brief)}`);
    return 1;
  }
  console.log([T.show(brief), ...labels.map((c) => `- ${c.text}`)].join("\n"));
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  try {
    answer = (await rl.question(T.confirm)).trim();
  } finally {
    rl.close();
  }
  if (answer !== "ACCEPT") {
    console.error(`✗ ${T.notConfirmed}`);
    return 1;
  }
  console.log(`✓ ${T.done(brief, recordAcceptance(root, brief).fingerprint)}`);
  return 0;
}
