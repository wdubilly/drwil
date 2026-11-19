// Acceptance of a brief's criteria by the human (split from state.mjs, which wires it): the start the human
// decides (poll read by the hook, interactive terminal) records the fingerprint of the « Acceptance criteria »
// section; the closing reads it back, says it in the closing proof and refuses a section modified since, until
// the human accepts again (`node .githooks/state.mjs accept` in an interactive terminal, or the `drwil-accept` poll of
// the chat, prepared by `node .githooks/state.mjs poll accept` and read by the hook, QUA-175). The record is local, in
// the evidence folder outside git, like the state: it holds a fingerprint, never the criteria.
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
// QUA-174 : la classification ne change pas le sens ; une marque citée en code reste du texte.
const HUMAN_MARK = /(`+).*?\1|\[(?:humain|human)\]/gi;

const TEXTS = {
  fr: {
    notTerminal:
      "acceptation refusée : seul un terminal interactif, tenu par l'humain, enregistre ici l'acceptation des critères ; depuis le chat, préparer le sondage (`node .githooks/state.mjs poll accept`) et le poser tel quel : seule la réponse de l'humain l'enregistre",
    noBrief: "acceptation impossible : aucun chantier actif (`node .githooks/state.mjs`)",
    noCriteria: (b) => `acceptation impossible : ${b} n'a aucun critère d'acceptation`,
    show: (b) => `Critères de ${b} :`,
    confirm: "Taper ACCEPT pour accepter ces critères tels quels : ",
    notConfirmed: "acceptation non confirmée : rien n'est enregistré",
    done: (b, f) => `critères de ${b} acceptés (empreinte ${f})`,
    ask: "Accepter ces critères tels quels ?",
    options: [
      { label: "Accepter", description: "Les critères ci-dessus sont acceptés tels quels ; la clôture les comparera." },
      { label: "Ne pas accepter", description: "Rien n'est enregistré ; les critères sont à revoir." },
    ],
  },
  en: {
    notTerminal:
      "acceptance refused: only an interactive terminal, held by the human, records the acceptance of the criteria here; from the chat, prepare the poll (`node .githooks/state.mjs poll accept`) and ask it as is: only the human's answer records it",
    noBrief: "acceptance impossible: no active workstream (`node .githooks/state.mjs`)",
    noCriteria: (b) => `acceptance impossible: ${b} has no acceptance criteria`,
    show: (b) => `Criteria of ${b}:`,
    confirm: "Type ACCEPT to accept these criteria as they are: ",
    notConfirmed: "acceptance not confirmed: nothing is recorded",
    done: (b, f) => `criteria of ${b} accepted (fingerprint ${f})`,
    ask: "Accept these criteria as they are?",
    options: [
      { label: "Accept", description: "The criteria above are accepted as they are; the closing will compare them." },
      { label: "Do not accept", description: "Nothing is recorded; the criteria are to be reviewed." },
    ],
  },
};
const texts = (root) => TEXTS[config(root).lang === "en" ? "en" : "fr"];

/** `sha256:<16 hex>` of the criteria of `text` (their proofs left out), or null without any. */
export function criteriaFingerprint(text) {
  return fingerprint(text, false);
}

// QUA-174 : avant la 0.11.2, la preuve était retirée avant la marque ; une marque entre le tiret et la preuve
// laissait la preuve dans le texte. Ce calcul reste relu en repli pour un chantier accepté avant la mise à jour.
function fingerprint(text, legacy) {
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
  const unmark = (i) => i.replace(HUMAN_MARK, (m) => (m.startsWith("`") ? m : ""));
  const normal = items.map((i) =>
    (legacy ? unmark(i.replace(PROOF_TAIL, "")) : unmark(i).replace(PROOF_TAIL, "")).replace(/\s+/g, " ").trim(),
  );
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
  const same = current === record.fingerprint || fingerprint(text, true) === record.fingerprint;
  return { kind: same ? "same" : "changed", record, current };
}

/** The active brief, its criteria and their fingerprint; `message` (nothing to accept) without a brief or criteria. */
function activeCriteria(root, T) {
  const brief = readState(root).state.active_brief;
  if (!brief) return { message: T.noBrief };
  let text = "";
  try {
    text = readFileSync(join(root, brief), "utf8");
  } catch {
    // brief unreadable: reported as without criteria
  }
  const labels = acceptanceCriteria(text);
  if (!labels.length) return { message: T.noCriteria(brief) };
  return { brief, labels, print: criteriaFingerprint(text), shown: [T.show(brief), ...labels.map((c) => `- ${c.text}`)] };
}

/**
 * The `drwil-accept` poll of the active brief, to ask as is in the chat (QUA-175); writes nothing. `data` is what the
 * hook keeps tied to the call and gives back to `acceptFromPoll` with the human's answer.
 */
export function acceptancePoll(root) {
  const T = texts(root);
  const c = activeCriteria(root, T);
  if (c.message) return { code: 1, message: c.message };
  const question = [`drwil-accept ${c.brief}`, ...c.shown, "", T.ask].join("\n");
  const options = T.options.map((o) => ({ ...o }));
  const poll = { questions: [{ header: "drwil-accept", question, multiSelect: false, options }] };
  return { code: 0, message: "", poll, data: { brief: c.brief, fingerprint: c.print } };
}

/**
 * Records the acceptance the human gave by answering the poll, called by the hook only (QUA-175): the brief must
 * still be the active one and its criteria those of the poll. Done message, or null (nothing recorded).
 */
export function acceptFromPoll(root, data) {
  const T = texts(root);
  const c = activeCriteria(root, T);
  if (c.message || c.brief !== data?.brief || c.print !== data.fingerprint) return null;
  return T.done(c.brief, recordAcceptance(root, c.brief).fingerprint);
}

/** `accept` command: records the acceptance of the active brief's criteria, from an interactive terminal only. Exit code. */
export async function accept(root) {
  const T = texts(root);
  if (!(process.stdin.isTTY && process.stdout.isTTY)) {
    console.error(`✗ ${T.notTerminal}`);
    return 1;
  }
  const c = activeCriteria(root, T);
  if (c.message) {
    console.error(`✗ ${c.message}`);
    return 1;
  }
  console.log(c.shown.join("\n"));
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
  console.log(`✓ ${T.done(c.brief, recordAcceptance(root, c.brief).fingerprint)}`);
  return 0;
}
