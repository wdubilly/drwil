// Readers of the dashboard (dashboard.mjs): configuration, briefs, contracts, consumption and audit
// reports, all read from the existing files. Tolerant by design: a missing or malformed source is
// ignored rather than crashing the dashboard.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const MODEL_RE = /^modele-|^model-/;
// Tolerant extraction: check-docs.mjs only requires the line to be there (see its own STATUS_RE);
// here the text is captured, even if a parenthesis (date, etc.) separates "Status" from the colon.
const STATUS_LINE_RE = /^\*{0,2}(Statut|Status)\*{0,2}[^:]*:\s*(.*)$/i;
// Explicit maturity field ("**Maturité** : prêt"); shown as written, only used to sort the briefs
// (ready first, to refine last — same ranking as scopedBriefs in .githooks/briefs.mjs).
const MATURITY_LINE_RE = /^\*{0,2}(?:Maturité|Maturity)\*{0,2}\s*:\s*(.*)$/i;
const maturityRank = (value) => (/^(?:prêt|ready)\b/i.test(value) ? 0 : /^(?:à affiner|to refine)\b/i.test(value) ? 2 : 1);
// Flexible section title: the model says "## 6. Increments", a real brief may say "## 4. Lots proposés".
const INCREMENTS_RE = /^#{1,4}\s*\d*\.?\s*(Increments|Lots|Batches)\b/i;
const INCREMENT_LINE_RE = /^-\s+\*\*(.+?)\*\*\s*\[([^\]]+)\]\s*:?\s*(.*)$/;
const MARKER_RE = /\b(IA|AI|humain|human|décision|decision)\b/i;
// A contract ID (baseline or catalog): letters-digits, with an optional prefix ("catalogue:",
// "other-repo:") — permissive rather than depending on cfg.contractPrefixes, to cover the
// project's registry as well as different prefix conventions.
const ID_RE = /^(?:[a-z][\w-]*:)?[A-Z]{2,6}-\d{2,4}$/;

export function loadConfig(root) {
  try {
    return JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return {};
  }
}

export function readBriefs(root, cfg) {
  const projectsDir = join(root, cfg.dirs?.projects ?? "docs/projects");
  const indexPath = join(root, cfg.dirs?.index ?? "docs/projects/pending.md");
  if (!existsSync(projectsDir)) return { index: null, briefs: [] };
  const files = readdirSync(projectsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !MODEL_RE.test(e.name))
    .map((e) => join(projectsDir, e.name));
  const index = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : null;
  const briefs = files
    .filter((f) => f !== indexPath)
    .map((f) => parseBrief(root, f, readFileSync(f, "utf8")))
    .sort((a, b) => maturityRank(a.maturity ?? "") - maturityRank(b.maturity ?? "") || a.path.localeCompare(b.path));
  return { index, briefs };
}

function parseBrief(root, path, text) {
  const lines = text.split(/\r?\n/);
  const title = (lines.find((l) => l.startsWith("# ")) ?? "# ?").replace(/^#\s*/, "");
  const statusLine = lines.slice(0, 15).find((l) => STATUS_LINE_RE.test(l));
  const status = statusLine ? statusLine.match(STATUS_LINE_RE)[2].trim() : null;
  const maturityLine = lines.slice(0, 15).find((l) => MATURITY_LINE_RE.test(l));
  const maturity = maturityLine ? maturityLine.match(MATURITY_LINE_RE)[1].trim() : null;
  const start = lines.findIndex((l) => INCREMENTS_RE.test(l));
  const increments = [];
  if (start !== -1) {
    for (let i = start + 1; i < lines.length && !/^#{1,4}\s/.test(lines[i]); i++) {
      const m = lines[i].match(INCREMENT_LINE_RE);
      if (m) increments.push({ title: m[1], marker: m[2].match(MARKER_RE)?.[1] ?? m[2], text: m[3] });
    }
  }
  return { path: relative(root, path), title, status, maturity, increments };
}

function tableRow(line) {
  if (!/^\|.*\|$/.test(line.trim())) return null;
  const cols = line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
  if (cols.every((c) => /^:?-+:?$/.test(c))) return null; // separator row of the markdown table
  return cols;
}

export function readContracts(path) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    // An ID is defined either as a heading (## ID — ...), or as the first cell of a table row
    // (same detection as .githooks/check-docs.mjs: ^(?:##\s+|\|\s*)(ID)).
    const heading = lines[i].match(/^##\s+(\S+)/);
    if (heading && ID_RE.test(heading[1])) {
      let rule = "";
      for (let j = i + 1; j < lines.length && !/^##\s/.test(lines[j]); j++) {
        const rm = lines[j].match(/^\*{0,2}(Règle|Rule)\*{0,2}\s?:\s?(.*)$/i);
        if (rm) {
          rule = rm[2].trim();
          break;
        }
      }
      out.push({ id: heading[1], rule });
      continue;
    }
    const cells = tableRow(lines[i]);
    if (cells && ID_RE.test(cells[0])) out.push({ id: cells[0], rule: cells[1] ?? "" });
  }
  return out;
}

// Tolerant reading: a malformed line (invalid JSON, missing field) is ignored rather than
// crashing the whole dashboard — the file stays fed by hand or by the AI.
export function readUsage(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter((e) => e && typeof e.workstream === "string");
}

export function aggregateUsage(entries) {
  const byWorkstream = new Map();
  for (const e of entries) {
    const acc = byWorkstream.get(e.workstream) ?? { tokens: 0, minutes: 0, models: new Set() };
    acc.tokens += Number(e.tokens) || 0;
    acc.minutes += Number(e.duration_min) || 0;
    if (e.model) acc.models.add(String(e.model));
    byWorkstream.set(e.workstream, acc);
  }
  return byWorkstream;
}

// Reads the quote block ("> Key: value") at the top of an audit report generated by the
// audit-risks-and-debt / discover-product-value skills. Tolerant of its absence (skill never run).
export function readAudit(path) {
  if (!existsSync(path)) return null;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const title = (lines.find((l) => l.startsWith("# ")) ?? "").replace(/^#\s*/, "");
  const metaLines = [];
  let inBlock = false;
  for (const l of lines) {
    if (l.startsWith(">")) {
      inBlock = true;
      metaLines.push(l.replace(/^>\s?/, ""));
    } else if (inBlock) break;
  }
  const entries = [];
  for (const l of metaLines) {
    const m = l.match(/^([^:]{2,40}?)\s*:\s*(.*)$/);
    if (m) entries.push([m[1].trim(), m[2].trim()]);
    else if (entries.length) entries[entries.length - 1][1] += " " + l.trim();
  }
  return { title, entries };
}

// Staleness of an audit: more than 30 days since its "Dernier scan"/"Last scan".
// Returns the number of days if stale, otherwise null (missing date, unreadable, or recent).
const STALE_AFTER_DAYS = 30;
export function staleDays(audit) {
  const entry = audit.entries.find(([k]) => /^dernier scan|^last scan/i.test(k));
  if (!entry) return null;
  const m = entry[1].match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return null;
  const days = Math.floor((Date.now() - new Date(m[0]).getTime()) / 86400000);
  return days >= STALE_AFTER_DAYS ? days : null;
}

// Trends (indicators, never blocking): CI duration noted by hand in the journal, cache read per request
// from the usage file. Alert thresholds: CI 3m55 (30 % under the ~5m35 reference), cache 25 % above
// the ~170 k reference — to re-evaluate as readings accumulate.
export const THRESHOLDS = { ci: 235, cache: 212500 };
const CI_LINE_RE = /^- \*\*Durée de CI \(job checks\)\*\*\s*:\s*(?:(\d+)\s*m\s*(\d+)|(\d+)\s*s)\b(.*)$/i;
export function readCiDurations(path) {
  if (!existsSync(path)) return [];
  let date = "";
  const out = [];
  for (const l of readFileSync(path, "utf8").split(/\r?\n/)) {
    const h = l.match(/^## (\d{4}-\d{2}-\d{2})/);
    const m = l.match(CI_LINE_RE);
    if (h) date = h[1];
    else if (m && /hooks inchangés|hooks unchanged/i.test(m[4])) out.push({ label: date, value: m[3] ? +m[3] : +m[1] * 60 + +m[2] });
  }
  return out;
}
export const cachePerRequest = (entries) =>
  entries
    .filter((e) => Number(e.requests) > 0 && Number(e.cache_read) > 0)
    .map((e) => ({ label: e.workstream, value: Math.round(e.cache_read / e.requests) }));
export function trend(points, threshold, window = 5) {
  const last = points.slice(-window);
  if (!last.length) return null;
  const mean = Math.round(last.reduce((s, p) => s + p.value, 0) / last.length);
  return { points: last, mean, alert: mean > threshold };
}
