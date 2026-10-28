// Lots of the active brief, one fresh subagent per lot: the current lot and the lots done are
// read here, `lot next` moves on (command line in state-cli-lots.mjs). The lot record is local like the
// state (.drwil/lot.json) and only holds numbers; the lots themselves come from the brief (briefs-lots.mjs).
// A brief with fewer than two lots, or without an [IA] one, behaves as before: no status.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readLots } from "./briefs-lots.mjs";
import { fill } from "./state-messages.mjs";
import { readState, texts } from "./state-validate.mjs";

const FILE = [".drwil", "lot.json"];
const WITH_LOTS = new Set(["BUILD", "EVIDENCE", "VERIFY", "CLOSING"]);

/** Record of the lots done for `brief`; any other, or unreadable, record counts nothing done (QUA-013). */
function readRecord(root, brief) {
  try {
    const r = JSON.parse(readFileSync(join(root, ...FILE), "utf8"));
    if (r.brief === brief && Array.isArray(r.done) && r.done.every(Number.isInteger)) return r;
  } catch {}
  return { brief, done: [], current: null };
}

/** Forgets the lots: at the closing and back in SCOPING, and when a brief is started. */
export function clearLots(root) {
  rmSync(join(root, ...FILE), { force: true });
}

/** `{ lots, ia, current, done, left, humans }` of the active brief, or null if it has no chain of lots. */
export function lotStatus(root, read) {
  const { activity, active_brief: brief } = read.state;
  if (!brief || !WITH_LOTS.has(activity)) return null;
  let lots;
  try {
    lots = readLots(readFileSync(join(root, brief), "utf8"));
  } catch {
    return null;
  }
  const ia = lots.filter((l) => l.kind === "ia");
  if (lots.length < 2 || !ia.length) return null;
  const record = readRecord(root, brief);
  const done = ia.filter((l) => record.done.includes(l.n));
  const left = ia.filter((l) => !done.includes(l));
  const current = ia.find((l) => l.n === record.current) ?? left[0] ?? ia.at(-1);
  return { lots, ia, current, done, left, humans: lots.filter((l) => l.kind === "human"), record };
}

export const lotLabel = (l) => `${l.n} — ${l.title}`;
const list = (T, lots) => (lots.length ? lots.map(lotLabel).join(" ; ") : T.lotNothing);

/** Why the closing is refused while an [IA] lot is not done; null if it can go on. */
export function lotsRefusal(root) {
  const T = texts(root);
  const status = lotStatus(root, readState(root));
  return status?.left.length ? fill(T.lotRemaining, list(T, status.left)) : null;
}

/** Lines of the `lot` command: current lot, done, left, [human] lots. */
export function lotLines(root, status) {
  const T = texts(root);
  return [
    fill(T.lotCurrent, lotLabel(status.current)),
    fill(T.lotDone, list(T, status.done)),
    fill(T.lotLeft, list(T, status.left)),
    ...(status.humans.length ? [fill(T.lotHumans, list(T, status.humans))] : []),
  ];
}

/** `lot next`: the current lot (committed tree required) is done; the next [IA] lot becomes the current one. */
export function nextLot(root, read) {
  const T = texts(root);
  if (read.state.activity !== "BUILD") return { code: 1, message: fill(T.lotActivity, read.state.activity) };
  const status = lotStatus(root, read);
  if (!status) return { code: 1, message: T.lotNone };
  const { current, humans } = status;
  const git = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  if (git.status !== 0 || git.stdout.trim()) return { code: 1, message: fill(T.lotDirty, current.n) };
  const already = status.record.done.includes(current.n);
  const next = status.left.find((l) => l.n > current.n);
  if (!next && already) return { code: 1, message: fill(T.lotLast, current.n) };
  const done = [...new Set([...status.record.done, current.n])];
  mkdirSync(join(root, ".drwil"), { recursive: true });
  writeFileSync(join(root, ...FILE), JSON.stringify({ brief: read.state.active_brief, current: (next ?? current).n, done }) + "\n");
  const rest = humans.length ? fill(T.lotHumansLeft, list(T, humans)) : "";
  return {
    code: 0,
    message: next ? fill(T.lotAdvanced, current.n, lotLabel(next), rest) : fill(T.lotLastDone, current.n, rest),
  };
}
