#!/usr/bin/env node
// Generates a static HTML dashboard (a single file, no server nor dependency): progress of the
// workstreams and contract coverage, read directly from the existing .md files. Invents no state:
// shows the "Status" line and the increments as written in each brief (one piece of information,
// one source — docs/ia-first.md). Opt-in, run by hand: `node .githooks/dashboard.mjs [output-path]`.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const cfg = loadConfig();
const lang = cfg.lang === "en" ? "en" : "fr";
const CATALOG = "docs/contracts-catalog.md";
const T = {
  fr: {
    title: "Tableau de bord — {0}",
    generated:
      "Généré le {0} depuis les fichiers du dépôt (rien n'est recalculé : statuts et lots affichés tels qu'écrits dans chaque fiche).",
    pending: "Chantiers en attente",
    workstreams: "Chantiers (fiches de docs/projects/)",
    contracts: "Contrats",
    noStatus: "(pas de ligne Statut)",
    status: "Statut : {0}",
    missing: "(absent)",
    noCheckbox: "(aucune case trouvée)",
    noBrief: "(aucune fiche)",
    none: "(aucun)",
    installed: "Installés ({0} — socle du projet)",
    catalog: "Au catalogue, non installés ({0})",
    simpleColumns: ["ID", "Règle"],
    usage: "Consommation (.drwil/usage.jsonl)",
    usageColumns: ["Chantier", "Tokens (total)", "Durée (min)", "Modèles employés"],
    noUsage: "(.drwil/usage.jsonl absent — aucune donnée de consommation)",
    audits: "Derniers audits",
    notGenerated: "({0} absent — pas encore généré, voir le skill correspondant)",
    staleAudit: "⚠ scan vieux de {0} jours, à relancer",
    done: "Tableau de bord généré : {0}",
  },
  en: {
    title: "Dashboard — {0}",
    generated:
      "Generated on {0} from the repository files (nothing is recomputed: statuses and increments are shown as written in each brief).",
    pending: "Pending work",
    workstreams: "Workstreams (docs/projects/ briefs)",
    contracts: "Contracts",
    noStatus: "(no Status line)",
    status: "Status: {0}",
    missing: "(missing)",
    noCheckbox: "(no checkbox found)",
    noBrief: "(no brief)",
    none: "(none)",
    installed: "Installed ({0} — project baseline)",
    catalog: "In the catalog, not installed ({0})",
    simpleColumns: ["ID", "Rule"],
    usage: "Consumption (.drwil/usage.jsonl)",
    usageColumns: ["Workstream", "Tokens (total)", "Duration (min)", "Models used"],
    noUsage: "(.drwil/usage.jsonl missing — no consumption data)",
    audits: "Latest audits",
    notGenerated: "({0} missing — not generated yet, see the matching skill)",
    staleAudit: "⚠ scan {0} days old, time to re-run",
    done: "Dashboard generated: {0}",
  },
}[lang];
const MODEL_RE = /^modele-|^model-/;
// Tolerant extraction: check-docs.mjs only requires the line to be there (see its own STATUS_RE);
// here the text is captured, even if a parenthesis (date, etc.) separates "Status" from the colon.
const STATUS_LINE_RE = /^\*{0,2}(Statut|Status)\*{0,2}[^:]*:\s*(.*)$/i;
// Flexible section title: the model says "## 6. Increments", a real brief may say "## 4. Lots proposés".
const INCREMENTS_RE = /^#{1,4}\s*\d*\.?\s*(Increments|Lots|Batches)\b/i;
const INCREMENT_LINE_RE = /^-\s+\*\*(.+?)\*\*\s*\[([^\]]+)\]\s*:?\s*(.*)$/;
const MARKER_RE = /\b(IA|AI|humain|human|décision|decision)\b/i;
// A contract ID (baseline or catalog): letters-digits, with an optional prefix ("catalogue:",
// "other-repo:") — permissive rather than depending on cfg.contractPrefixes, to cover the
// project's registry as well as different prefix conventions.
const ID_RE = /^(?:[a-z][\w-]*:)?[A-Z]{2,6}-\d{2,4}$/;

/** Fills the `{0}`, `{1}`… holes of a message. */
const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

function loadConfig() {
  try {
    return JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return {};
  }
}

function readBriefs() {
  const projectsDir = join(root, cfg.dirs?.projects ?? "docs/projects");
  const indexPath = join(root, cfg.dirs?.index ?? "docs/projects/pending.md");
  if (!existsSync(projectsDir)) return { index: null, briefs: [] };
  const files = readdirSync(projectsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !MODEL_RE.test(e.name))
    .map((e) => join(projectsDir, e.name));
  const index = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : null;
  const briefs = files.filter((f) => f !== indexPath).map((f) => parseBrief(f, readFileSync(f, "utf8")));
  return { index, briefs };
}

function parseBrief(path, text) {
  const lines = text.split(/\r?\n/);
  const title = (lines.find((l) => l.startsWith("# ")) ?? "# ?").replace(/^#\s*/, "");
  const statusLine = lines.slice(0, 15).find((l) => STATUS_LINE_RE.test(l));
  const status = statusLine ? statusLine.match(STATUS_LINE_RE)[2].trim() : null;
  const start = lines.findIndex((l) => INCREMENTS_RE.test(l));
  const increments = [];
  if (start !== -1) {
    for (let i = start + 1; i < lines.length && !/^#{1,4}\s/.test(lines[i]); i++) {
      const m = lines[i].match(INCREMENT_LINE_RE);
      if (m) increments.push({ title: m[1], marker: m[2].match(MARKER_RE)?.[1] ?? m[2], text: m[3] });
    }
  }
  return { path: relative(root, path), title, status, increments };
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

function readContracts(path) {
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

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Tolerant reading: a malformed line (invalid JSON, missing field) is ignored rather than
// crashing the whole dashboard — the file stays fed by hand or by the AI.
function readUsage(path) {
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

function aggregateUsage(entries) {
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

function renderIncrements(increments) {
  if (!increments.length) return "";
  return `<ul class="increments">${increments
    .map(
      (l) =>
        `<li><span class="marker">[${escapeHtml(l.marker)}]</span> <strong>${escapeHtml(l.title)}</strong> — ${escapeHtml(l.text)}</li>`,
    )
    .join("")}</ul>`;
}

function renderIndex(text) {
  if (!text) return `<p>${T.missing}</p>`;
  const lines = text.split(/\r?\n/).filter((l) => /^\s*-\s*\[[ xX]\]/.test(l));
  if (!lines.length) return `<p>${T.noCheckbox}</p>`;
  return `<ul class="index">${lines
    .map((l) => {
      const checked = /^\s*-\s*\[[xX]\]/.test(l);
      const content = l.replace(/^\s*-\s*\[[ xX]\]\s*/, "");
      return `<li class="${checked ? "done" : "open"}">${checked ? "☑" : "☐"} ${escapeHtml(content)}</li>`;
    })
    .join("")}</ul>`;
}

function renderContracts(title, contracts) {
  if (!contracts.length) return `<h3>${escapeHtml(title)}</h3><p>${T.none}</p>`;
  return (
    `<h3>${escapeHtml(title)}</h3><table><thead><tr>${T.simpleColumns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>` +
    `<tbody>${contracts.map((c) => `<tr><td><code>${escapeHtml(c.id)}</code></td><td>${escapeHtml(c.rule)}</td></tr>`).join("")}</tbody></table>`
  );
}

function renderUsage(byWorkstream) {
  if (!byWorkstream.size) return `<p>${T.noUsage}</p>`;
  const rows = [...byWorkstream.entries()]
    .map(
      ([workstream, acc]) =>
        `<tr><td><code>${escapeHtml(workstream)}</code></td><td>${acc.tokens}</td><td>${acc.minutes}</td><td>${escapeHtml([...acc.models].join(", "))}</td></tr>`,
    )
    .join("");
  return `<table><thead><tr>${T.usageColumns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}

// Reads the quote block ("> Key: value") at the top of an audit report generated by the
// audit-risks-and-debt / discover-product-value skills. Tolerant of its absence (skill never run).
function readAudit(path) {
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
function staleDays(audit) {
  const entry = audit.entries.find(([k]) => /^dernier scan|^last scan/i.test(k));
  if (!entry) return null;
  const m = entry[1].match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return null;
  const days = Math.floor((Date.now() - new Date(m[0]).getTime()) / 86400000);
  return days >= STALE_AFTER_DAYS ? days : null;
}

function renderAudit(path, audit) {
  if (!audit) return `<p>${fill(T.notGenerated, path)}</p>`;
  const meta = audit.entries.map(([k, v]) => `${escapeHtml(k)} : ${escapeHtml(v)}`).join("<br>");
  const days = staleDays(audit);
  const warning = days !== null ? ` <strong>${escapeHtml(fill(T.staleAudit, days))}</strong>` : "";
  return `<h3>${escapeHtml(audit.title)} <small>(<code>${escapeHtml(path)}</code>)</small></h3><p>${meta}${warning}</p>`;
}

const { index, briefs } = readBriefs();
const contractsPath = cfg.dirs?.contracts ?? "docs/contracts.md";
const registry = readContracts(join(root, contractsPath));
const catalog = readContracts(join(root, CATALOG));
const usageByWorkstream = aggregateUsage(readUsage(join(root, ".drwil", "usage.jsonl")));
const projectName = cfg.projectName ?? root;
const risksAuditPath = { fr: "docs/audit-risques.md", en: "docs/audit-risks.md" }[lang];
const valueDiscoveryPath = { fr: "docs/decouverte-valeur.md", en: "docs/value-discovery.md" }[lang];
const risksAudit = readAudit(join(root, risksAuditPath));
const valueDiscovery = readAudit(join(root, valueDiscoveryPath));

const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(fill(T.title, projectName))}</title>
<style>
body { font: 14px/1.5 system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #1a1a2e; }
h1 { font-size: 1.4rem; } h2 { margin-top: 2.5rem; border-bottom: 2px solid #ddd; padding-bottom: .3rem; }
.brief { border: 1px solid #ddd; border-radius: 6px; padding: 1rem; margin: 1rem 0; }
.brief .status { color: #444; font-style: italic; }
.increments { padding-left: 1.2rem; } .marker { font-family: monospace; color: #0b5; }
.index { list-style: none; padding: 0; } .index li.done { color: #888; text-decoration: line-through; }
table { border-collapse: collapse; width: 100%; margin: .5rem 0 1.5rem; }
th, td { border: 1px solid #ddd; padding: .4rem .6rem; text-align: left; vertical-align: top; font-size: .85rem; }
th { background: #f4f4f8; }
.generated { color: #888; font-size: .8rem; }
</style>
</head>
<body>
<h1>${escapeHtml(fill(T.title, projectName))}</h1>
<p class="generated">${escapeHtml(fill(T.generated, new Date().toISOString().slice(0, 16).replace("T", " ")))}</p>

<h2>${escapeHtml(T.pending)}</h2>
${renderIndex(index)}

<h2>${escapeHtml(T.workstreams)}</h2>
${
  briefs
    .map(
      (b) => `<div class="brief">
  <h3>${escapeHtml(b.title)} <small>(<code>${escapeHtml(b.path)}</code>)</small></h3>
  <p class="status">${b.status ? escapeHtml(fill(T.status, b.status)) : escapeHtml(T.noStatus)}</p>
  ${renderIncrements(b.increments)}
</div>`,
    )
    .join("") || `<p>${T.noBrief}</p>`
}

<h2>${escapeHtml(T.contracts)}</h2>
${renderContracts(fill(T.installed, contractsPath), registry)}
${renderContracts(fill(T.catalog, CATALOG), catalog)}

<h2>${escapeHtml(T.audits)}</h2>
${renderAudit(risksAuditPath, risksAudit)}
${renderAudit(valueDiscoveryPath, valueDiscovery)}

<h2>${escapeHtml(T.usage)}</h2>
${renderUsage(usageByWorkstream)}
</body>
</html>
`;

const output = process.argv[2] ?? "docs/dashboard.html";
writeFileSync(join(root, output), html);
console.log(fill(T.done, output));
