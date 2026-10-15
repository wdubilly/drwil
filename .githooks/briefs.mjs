// Repository reading for the governance state (split from state.mjs, which re-exports it): settings,
// status and list of scoped briefs, priorities from the committed index.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readBlock } from "./scope.mjs";

export const BRIEF_DIRS = ["docs/projects/"];
export const MODEL_RE = /^modele-|^model-/;

/** Project settings (.drwil/ia-first.json); unreadable or missing: none. */
export function config(root) {
  try {
    return JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8")) ?? {};
  } catch {
    return {};
  }
}

const STATUS_LINE_RE = /^\*\*(?:Statut|Status)\*\*\s*:\s*(.*)$/;

/**
 * "done", "reference" or "open" — single definition, shared with check-docs.mjs.
 * Only an explicit marker at the start of the status counts: a word searched anywhere ("essai réel
 * fait", "fait (lot 1)" of a brief with several increments) gave false "done".
 */
export function briefStatus(text) {
  const status =
    text
      .split(/\r?\n/)
      .slice(0, 15)
      .map((l) => STATUS_LINE_RE.exec(l))
      .find(Boolean)?.[1] ?? "";
  if (/^(?:terminé\s+le|done\s+on)\s+\d{4}-\d{2}-\d{2}\b/i.test(status)) return "done";
  if (/^(?:référence|reference)\b/i.test(status)) return "reference";
  return "open";
}

const MATURITY_LINE_RE = /^\*\*(?:Maturité|Maturity)\*\*\s*:\s*(.*)$/;

/**
 * Explicit maturity of a brief: "ready", "refine", "in-progress", or "unset" (field absent or
 * unknown: existing briefs and installed projects keep working). Same header window as the status.
 */
export function briefMaturity(text) {
  const value =
    text
      .split(/\r?\n/)
      .slice(0, 15)
      .map((l) => MATURITY_LINE_RE.exec(l))
      .find(Boolean)?.[1] ?? "";
  if (/^(?:prêt|ready)\b/i.test(value)) return "ready";
  if (/^(?:à affiner|to refine)\b/i.test(value)) return "refine";
  if (/^(?:en cours|in progress)\b/i.test(value)) return "in-progress";
  return "unset";
}

const DEFAULT_INDEX = ["docs/projects/pending.md"];
const MATURITY_RANK = { ready: 0, "in-progress": 1, unset: 1, refine: 2 };
const DEFAULT_PRIORITY = 2;

/** Priority of each brief cited by an open item of the committed index ([P0] to [P3], [P2] without a tag). */
function indexPriorities(root) {
  const priorities = new Map();
  for (const path of [config(root).dirs?.index, ...DEFAULT_INDEX].filter(Boolean)) {
    const r = spawnSync("git", ["show", `HEAD:${path}`], { cwd: root, encoding: "utf8" });
    if (r.status !== 0) continue;
    // An item: its "- [ ]" line and its continuation lines; a checked item of a brief with several
    // increments says nothing about the priority of the remaining work.
    for (const item of r.stdout.split(/\r?\n(?=\s*- \[)/)) {
      if (!/^\s*- \[ \]/.test(item)) continue;
      const p = /\[P([0-3])\]/.exec(item)?.[1];
      for (const m of item.matchAll(/`(docs\/projects\/[^`]+\.md)`/g)) {
        if (!priorities.has(m[1])) priorities.set(m[1], p === undefined ? DEFAULT_PRIORITY : Number(p));
      }
    }
    break;
  }
  return priorities;
}

/** `[decision]` items still open in the "Points to decide" section ("Points à trancher"). */
export function openDecisions(text) {
  let inside = false;
  let n = 0;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s/.test(line)) inside = /^##\s*(\d+\.\s*)?(Points à trancher|Points to decide)\b/i.test(line);
    else if (inside && /^\s*-\s*\[(décision|decision)\]/i.test(line)) n++;
  }
  return n;
}

/** A brief lists its increments as "- **Lot …" or "- **Increment …" bullets. */
export function hasIncrements(text) {
  return /^\s*-\s*\*\*(Lot|Increment|Incrément)\b/im.test(text);
}

/**
 * Acceptance criteria of a brief: one bullet per criterion in the "Critères d'acceptation" section.
 * `[{ text, link, human }]`: `link` is the backticked contract or check ID of the line (null when
 * absent: a criterion without proof, for the evaluation to refuse), `human` is set by `[humain]`.
 */
export function acceptanceCriteria(text) {
  const criteria = [];
  let inside = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s/.test(line)) {
      inside = /^##\s*(\d+\.\s*)?(Critères d'acceptation|Acceptance criteria)\b/i.test(line);
      continue;
    }
    const item = inside ? /^\s*-\s+(.+)$/.exec(line) : null;
    if (!item) continue;
    const human = /\[(humain|human)\]/i.test(item[1]);
    const link = /`([A-Za-z][\w.:-]*)`/.exec(item[1])?.[1] ?? null;
    const label = item[1]
      .replace(/\[(humain|human)\]/gi, "")
      .replace(/`[^`]*`/g, "")
      .replace(/\s*[—–:-]\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (label) criteria.push({ text: label, link, human });
  }
  return criteria;
}

/**
 * Contracts the brief declares as changed on purpose (« Contrats modifiés » section): the ID in backticks
 * at the head of each bullet. A contract modified in the branch without this declaration is refused.
 */
export function declaredContracts(text) {
  const ids = [];
  let inside = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s/.test(line)) inside = /^##\s*(\d+\.\s*)?(Contrats modifiés|Modified contracts)\b/i.test(line);
    else if (inside) {
      const id = /^\s*-\s+`([A-Za-z][\w.:-]*)`/.exec(line)?.[1];
      if (id) ids.push(id);
    }
  }
  return ids;
}

/**
 * What a brief marked "ready" still lacks, as check-docs message keys: an open [decision], no
 * increment, or no acceptance criterion (nothing would be left to replay as non-regression).
 */
export function readyGaps(text) {
  const gaps = [];
  if (openDecisions(text) > 0) gaps.push("readyUndecided");
  if (!hasIncrements(text)) gaps.push("readyNoIncrement");
  if (!acceptanceCriteria(text).length) gaps.push("readyNoCriteria");
  return gaps;
}

/**
 * Briefs that can be started: briefs of docs/projects/, models excluded, not
 * finished, whose `scope` block exists in HEAD — the validated scope is the committed one,
 * as for the scope gate. `[{ path, title, priority, decisions, ready, maturity }]`: ready ones first (no
 * open decision), then by maturity ("ready", then "in-progress" and "unset", "refine" last), then by
 * index priority, then by path. A "refine" brief is listed, never hidden.
 */
export function scopedBriefs(root) {
  const priorities = indexPriorities(root);
  const briefs = [];
  for (const dir of BRIEF_DIRS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs).sort()) {
      const path = dir + name;
      if (!name.endsWith(".md") || MODEL_RE.test(name)) continue;
      const r = spawnSync("git", ["show", `HEAD:${path}`], { cwd: root, encoding: "utf8" });
      if (r.status !== 0 || !readBlock(r.stdout).patterns.length) continue;
      // A reference brief (kit mechanics) keeps its scope without being a workstream to start.
      if (briefStatus(r.stdout) !== "open") continue;
      const decisions = openDecisions(r.stdout);
      const priority = priorities.get(path) ?? DEFAULT_PRIORITY;
      briefs.push({
        path,
        title: /^#\s+(.+)$/m.exec(r.stdout)?.[1]?.trim() ?? path,
        priority: `P${priority}`,
        decisions,
        ready: decisions === 0,
        maturity: briefMaturity(r.stdout),
      });
    }
  }
  return briefs.sort(
    (a, b) =>
      Number(b.ready) - Number(a.ready) ||
      MATURITY_RANK[a.maturity] - MATURITY_RANK[b.maturity] ||
      a.priority.localeCompare(b.priority) ||
      a.path.localeCompare(b.path),
  );
}
