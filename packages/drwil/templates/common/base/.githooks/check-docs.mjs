#!/usr/bin/env node
// IA-first check: paths and contracts cited in the docs.
// Reads .drwil/ia-first.json to adapt to the layers, the contract prefixes and the language.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { EXEMPT_RE, mdRecursive, workstreamChecks } from "./check-docs-workstreams.mjs";
import { pathTest } from "./check-docs-paths.mjs";
import { TEXTS } from "./check-docs-texts.mjs";
import { definedIds, idConflicts, knownChecks, readContracts, validateContracts } from "./contracts.mjs";
import { checkRisk } from "./risk.mjs";
import { briefReferenceProblems } from "./check-code-rules.mjs";
import { checkboxProblems, OPTIONAL_RE, TO_CREATE_RE } from "./doc-coherence.mjs";
import { skillHeaderProblems } from "./skill-headers.mjs";

const root = process.cwd();
const cfg = loadConfig();
const lang = cfg.lang === "en" ? "en" : "fr";
const T = TEXTS[lang];
const looksLikeAPath = pathTest(cfg);
const { checkWorkstreams, checkScopeReminder } = workstreamChecks({ root, cfg, T, lang });

// Severity of the scope reminder (QUA-016 only; the rest of check-docs always stays blocking):
// "blocking" (historical default), "warning" (never blocking, only shown) or "off" (disabled).
const SCOPE_LEVELS = new Set(["blocking", "warning", "off"]);
const scopeLevel = SCOPE_LEVELS.has(cfg.scopeReminder) ? cfg.scopeReminder : "warning";

const CODE_RE = /`([^`\s]+)`/g;

function loadConfig() {
  try {
    return JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return {};
  }
}

function sources() {
  const found = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", "README.md", "INSTALL.md"].map((f) => join(root, f));
  for (const layer of cfg.layers ?? []) found.push(join(root, layer, "AGENTS.md"));
  found.push(...mdRecursive(join(root, "docs")));
  found.push(...mdRecursive(join(root, ".claude", "skills")));
  return [...new Set(found)].filter((p) => existsSync(p));
}

// A path can be relative to the repository root or to the file that cites it.
const foundPaths = (doc, cited) => [join(root, cited), join(dirname(doc), cited)].filter((p) => existsSync(p));

// "/" form: Git, even on Windows, does not recognise as ignored a path written with backslashes (seen in Windows CI).
const relPosix = (p) => relative(root, p).split(sep).join("/");

/**
 * Among these paths, those Git ignores (a single call). Present on the machine but missing in CI,
 * they do not prove a citation: without this, the local check passed and CI failed. By default,
 * `check-ignore` does not report a tracked file. Outside a Git repository: none.
 */
function ignoredByGit(paths) {
  const rels = [...new Set(paths.map(relPosix))].filter((r) => r && !r.startsWith(".."));
  if (!rels.length) return new Set();
  try {
    const out = execFileSync("git", ["check-ignore", "--stdin"], {
      cwd: root,
      input: rels.join("\n"),
      stdio: ["pipe", "pipe", "ignore"],
    });
    return new Set(out.toString().split(/\r?\n/).filter(Boolean));
  } catch {
    return new Set(); // exit code 1: nothing ignored; or no git repository.
  }
}

const prefixes = cfg.contractPrefixes ?? ["SEC", "QUA"];
// "other-repo:QUA-011" cites another repository's contract: it is not looked up in this registry.
const idPattern = `(?<![\\w:-])(?:${prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})-\\d{3}\\b`;
const contractsPath = join(root, cfg.dirs?.contracts ?? "docs/contracts.md");
let defined = new Set();
const errors = [];
if (existsSync(contractsPath)) {
  const registry = definedIds(readFileSync(contractsPath, "utf8"), idPattern);
  defined = registry.defined;
  for (const id of registry.duplicates) errors.push(T.duplicate(id, relative(root, contractsPath)));
  // A malformed contract (unknown check, missing Rule or proof) is refused from the commit on,
  // with the same reader as `drwil verify`; duplicates are already reported above.
  for (const e of validateContracts(readContracts(readFileSync(contractsPath, "utf8")), knownChecks(cfg), lang)) {
    if (e.type !== "duplicate") errors.push(`${relative(root, contractsPath)}:${e.line} : ${e.message}`);
  }
}

const docs = sources();
const citations = [];
for (const doc of docs) {
  const rel = relative(root, doc);
  const docLines = readFileSync(doc, "utf8").split(/\r?\n/);
  docLines.forEach((line, i) => {
    // "(if present)" may fall on the next line after a line break.
    if (!OPTIONAL_RE.test(line) && !OPTIONAL_RE.test(docLines[i + 1] ?? "")) {
      for (const m of line.matchAll(CODE_RE)) {
        const cited = m[1];
        if (looksLikeAPath(cited) && !TO_CREATE_RE.test(line.slice(m.index + m[0].length))) {
          citations.push({ place: `${rel}:${i + 1}`, cited, found: foundPaths(doc, cited) });
        }
      }
    }
    if (doc !== contractsPath) {
      for (const [id] of line.matchAll(new RegExp(idPattern, "g"))) {
        if (!defined.has(id)) errors.push(`${rel}:${i + 1} : ${T.contract(id, relative(root, contractsPath))}`);
      }
    }
  });
}

const ignored = ignoredByGit(citations.flatMap((c) => c.found));
// Requirement added after projects were already equipped: an ignored file no longer proves a citation. Blocking only
// if the project has it (`newRequirements`: "blocking", default of fresh installs); otherwise reported, never breaking.
const newBlocking = cfg.newRequirements === "blocking";
const newWarnings = [];
const catalogPath = join(root, cfg.dirs?.catalog ?? "docs/contracts-catalog.md");
for (const p of existsSync(catalogPath) ? idConflicts(readFileSync(catalogPath, "utf8"), defined, relative(root, contractsPath), lang) : [])
  (newBlocking ? errors : newWarnings).push(`${relative(root, catalogPath)} : ${p}`);
for (const c of citations) {
  if (!c.found.length) errors.push(`${c.place} : ${T.path(c.cited)}`);
  else if (!c.found.some((p) => !ignored.has(relPosix(p))))
    (newBlocking ? errors : newWarnings).push(`${c.place} : ${T.path(c.cited)} — ${T.ignoredByGit}`);
}

errors.push(...checkWorkstreams(), ...skillHeaderProblems(root, lang));
// QUA-049: a code file cites the contract it serves, never a workstream brief (deleted at closing).
const codeRefs = briefReferenceProblems(root, cfg, lang);
errors.push(...codeRefs.errors);

// Risk level of project briefs (ceremony follows risk); QUA-016 traceability does not change.
const riskWarnings = [];
{
  const projectsDir = join(root, cfg.dirs?.projects ?? "docs/projects");
  const indexPath = join(root, cfg.dirs?.index ?? "docs/projects/pending.md");
  // The kit mechanics brief is shipped with every install and describes no workstream: warning
  // about it from the install of every project would be noise, not a signal.
  const mechanics = /^mecanique-ia-first\.md$|^kit-mechanics\.md$/;
  for (const brief of mdRecursive(projectsDir).filter(
    (p) => p !== indexPath && !EXEMPT_RE.test(relative(projectsDir, p)) && !mechanics.test(relative(projectsDir, p)),
  )) {
    const r = checkRisk(readFileSync(brief, "utf8"), {
      idPattern,
      lang,
      ...(cfg.risk?.sensitivePaths ? { sensitive: cfg.risk.sensitivePaths } : {}),
    });
    for (const e of r.errors) errors.push(`${relative(root, brief)} : ${e}`);
    for (const w of r.warnings) riskWarnings.push(`${relative(root, brief)} : ${w}`);
  }
}

const scopeProblems = scopeLevel === "off" ? [] : checkScopeReminder();
if (scopeLevel === "blocking") errors.push(...scopeProblems);

for (const e of errors) console.log(`  ✗ ${e}`);
console.log(T.summary(docs.length, errors.length));
if (scopeLevel === "warning" && scopeProblems.length) {
  for (const e of scopeProblems) console.log(`  ⚠ ${e}`);
  console.log(T.scopeWarnings(scopeProblems.length));
}
const consistencyProblems = checkboxProblems(root, cfg, lang).map((p) => `${p.place} : ${p.message}`);
if (consistencyProblems.length) {
  for (const e of consistencyProblems) console.log(`  ⚠ ${e}`);
  console.log(T.consistencyWarnings(consistencyProblems.length));
}
if (riskWarnings.length) {
  for (const e of riskWarnings) console.log(`  ⚠ ${e}`);
  console.log(T.riskWarnings(riskWarnings.length));
}
for (const w of codeRefs.warnings) console.log(`  ⚠ ${w}`);
if (newWarnings.length) {
  for (const e of newWarnings) console.log(`  ⚠ ${e}`);
  console.log(T.newWarnings(newWarnings.length));
}
process.exit(errors.length ? 1 : 0);
