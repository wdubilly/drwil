#!/usr/bin/env node
// Generates a static HTML dashboard (a single file, no server nor dependency): progress of the
// workstreams and contract coverage, read directly from the existing .md files. Invents no state:
// shows the "Status" line and the increments as written in each brief (one piece of information,
// one source — docs/ia-first.md). Opt-in, run by hand: `node .githooks/dashboard.mjs [output-path]`.
// The messages are in dashboard-texts.mjs, the readers of the sources in dashboard-read.mjs.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { TEXTS, fill } from "./dashboard-texts.mjs";
import { aggregateUsage, loadConfig, readAudit, readBriefs, readContracts, readUsage, staleDays } from "./dashboard-read.mjs";

const root = process.cwd();
const cfg = loadConfig(root);
const lang = cfg.lang === "en" ? "en" : "fr";
const CATALOG = "docs/contracts-catalog.md";
const T = TEXTS[lang];

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

function renderAudit(path, audit) {
  if (!audit) return `<p>${fill(T.notGenerated, path)}</p>`;
  const meta = audit.entries.map(([k, v]) => `${escapeHtml(k)} : ${escapeHtml(v)}`).join("<br>");
  const days = staleDays(audit);
  const warning = days !== null ? ` <strong>${escapeHtml(fill(T.staleAudit, days))}</strong>` : "";
  return `<h3>${escapeHtml(audit.title)} <small>(<code>${escapeHtml(path)}</code>)</small></h3><p>${meta}${warning}</p>`;
}

const { index, briefs } = readBriefs(root, cfg);
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
  <p class="status">${b.status ? escapeHtml(fill(T.status, b.status)) : escapeHtml(T.noStatus)}</p>${b.maturity ? `\n  <p class="status">${escapeHtml(fill(T.maturity, b.maturity))}</p>` : ""}
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
