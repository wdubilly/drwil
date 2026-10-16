#!/usr/bin/env node
// Glossary of the identifiers a human reads (QUA-039): a contract ID, a catalog line, a lot or a
// numbered point of the active brief, cited alone, tells the human nothing. A single source, read by
// the checks' outputs, by any agent (`node .githooks/glossary.mjs "<text>"`) and by the agent-side
// hooks: the labels are read from the registry, the catalog and the active brief, never copied.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readContracts } from "./contracts.mjs";

const MAX = 15;
const SHORT = 90;
const short = (s) => (s.length > SHORT ? `${s.slice(0, SHORT - 1).trimEnd()}…` : s);
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

/** Labels known in `root`: `Map` from the identifier as cited (« QUA-015 », « catalog:QUA-004 », « lot 3 », « point 12 ») to its label. */
export function glossary(root) {
  let cfg = {};
  try {
    cfg = JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8")) ?? {};
  } catch {}
  const labels = new Map();
  for (const k of readContracts(read(join(root, cfg.dirs?.contracts ?? "docs/contracts.md"))))
    if (k.title) labels.set(k.id, short(k.title));
  for (const m of read(join(root, cfg.dirs?.catalog ?? "docs/contracts-catalog.md")).matchAll(
    /^\|\s*(catal(?:ogue|og):[A-Z][A-Z0-9]*-\d+)\s*\|\s*([^|]+)\|/gm,
  ))
    labels.set(m[1], short(m[2].trim()));
  let brief = null;
  try {
    brief = JSON.parse(readFileSync(join(root, ".drwil", "state.json"), "utf8"))?.active_brief;
  } catch {}
  const text = typeof brief === "string" ? read(join(root, brief)) : "";
  for (const m of text.matchAll(/^\s*-\s*\*\*(?:Lot|Increment|Incrément)\s+(\d+[a-z]?)\s*[—–-]\s*([^*]+)\*\*/gim))
    labels.set(`lot ${m[1]}`, short(m[2].trim()));
  for (const m of text.matchAll(/^\s*(\d+)\.\s+\*\*([^*]+)\*\*/gm)) labels.set(`point ${m[1]}`, short(m[2].trim()));
  return labels;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Pattern of an identifier as it is written in a text (lots and points in either language, any case). */
function pattern(id) {
  const m = /^(lot|point) (.+)$/.exec(id);
  if (m) return new RegExp(`\\b(?:${m[1] === "lot" ? "lot|increment" : "point"})\\s+${escapeRe(m[2])}\\b`, "i");
  // Not inside a longer ID, nor inside a catalog reference (« catalog:QUA-004 » is the catalog's line).
  return new RegExp(`(?<![A-Za-z0-9:-])${escapeRe(id)}(?![0-9])`);
}

/** The known identifiers cited in `text`, each with its label: `[{ id, label }]`, at most fifteen. */
export function cited(text, labels) {
  const found = [];
  for (const [id, label] of labels) {
    if (pattern(id).test(text)) found.push({ id, label });
    if (found.length >= MAX) break;
  }
  return found;
}

/** `text` with the first mention of each known identifier followed by its label, unless it already is. */
export function annotate(text, labels) {
  let out = text;
  for (const { id, label } of cited(text, labels)) {
    // `cited` found it in `text`, and an annotation never removes an ID: it is still there.
    const m = pattern(id).exec(out);
    const end = m.index + m[0].length;
    if (out.slice(end, end + label.length + 6).includes(label.slice(0, 20))) continue;
    // Already inside parentheses (« (QUA-004) »): a dash, not nested parentheses.
    out = `${out.slice(0, end)}${out[end] === ")" ? ` — ${label}` : ` (${label})`}${out.slice(end)}`;
  }
  return out;
}

/** Runs the command: labels of the identifiers cited in the arguments (or standard input); returns the exit code. */
export function main(args = process.argv.slice(2), root = process.cwd(), log = console.log, input = () => readFileSync(0, "utf8")) {
  let text = args.join(" ");
  if (!args.length) {
    try {
      text = input();
    } catch {}
  }
  for (const { id, label } of cited(text, glossary(root))) log(`${id} — ${label}`);
  return 0;
}

// Through a symbolic link (an installed copy), argv[1] is the link: compare the real paths.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) process.exitCode = main();
