// Workstreams, intents and scope reminder checks of check-docs (split from check-docs.mjs).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { MARKERS_RE, STATUS_RE } from "./doc-coherence.mjs";
import * as scope from "./scope.mjs";
import { briefMaturity, briefStatus, readyGaps } from "./state.mjs";
import { execFileSync } from "node:child_process";

const DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/;
// Intent sections, in either language (an intent written before a language switch stays valid), named in the project's.
const INTENT_SECTIONS = [
  ["## Besoin", "## Need"],
  ["## Existant", "## Current state"],
  ["## Questions à trancher", "## Open questions"],
];
// Models to copy and permanent brief: not workstreams with increments, exempt from the QUA-015 check.
export const EXEMPT_RE = /^modele-|^model-|^entretien-courant\.md$|^routine-maintenance\.md$|^journal\.md$/;
// Models to copy: never a real source of scope (their block, if any, is only an example).
const MODEL_RE = /^modele-|^model-/;

export function mdRecursive(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return mdRecursive(p);
      return e.name.endsWith(".md") ? [p] : [];
    })
    .sort();
}

export function workstreamChecks({ root, cfg, T, lang }) {
  // QUA-015: each workstream can be resumed cold (markers, dated status, sections, Hand-off).
  function checkWorkstreams() {
    const errors = [];
    const indexPath = join(root, cfg.dirs?.index ?? "docs/projects/pending.md");
    if (existsSync(indexPath)) {
      const relIndex = relative(root, indexPath);
      readFileSync(indexPath, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (/^\s*-\s*\[ \]/.test(line) && !MARKERS_RE.test(line)) errors.push(`${relIndex}:${i + 1} : ${T.marker()}`);
        });
    }
    const projectsDir = join(root, cfg.dirs?.projects ?? "docs/projects");
    const briefs = mdRecursive(projectsDir).filter((p) => p !== indexPath && !EXEMPT_RE.test(relative(projectsDir, p)));
    for (const brief of briefs) checkBrief(brief, errors, true);
    const intentsDir = join(root, cfg.dirs?.intentions ?? "docs/intentions");
    const intents = mdRecursive(intentsDir).filter((p) => relative(intentsDir, p) !== "README.md");
    for (const intent of intents) checkBrief(intent, errors, false);
    return errors;
  }

  // Scope reminder: an indexed code file must be covered by the `scope` block of a brief of
  // docs/projects/ (including the permanent "routine maintenance" brief for small tasks).
  // Severity configurable per project ("scopeReminder" key of .drwil/ia-first.json, default "warning"):
  // "blocking" fails the commit; "warning" shows without ever blocking; "off" disables the check.
  // This setting only touches this check, never the rest of check-docs.
  function checkScopeReminder() {
    const errors = [];
    let indexed;
    try {
      indexed = execFileSync("git", ["ls-files"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .split(/\r?\n/)
        .filter(Boolean);
    } catch {
      return errors; // no git repository, or git missing: nothing to check.
    }
    const projectsDir = join(root, cfg.dirs?.projects ?? "docs/projects");
    const briefs = mdRecursive(projectsDir).filter((p) => !MODEL_RE.test(relative(projectsDir, p)));
    const briefTexts = briefs.map((f) => [relative(root, f), readFileSync(f, "utf8")]);
    for (const [rel, text] of briefTexts) {
      const { problems } = scope.readBlock(text);
      for (const p of problems) {
        if (p.kind === "header") errors.push(T.scopeHeader(rel));
        else if (p.kind === "line") errors.push(T.scopeLine(rel, p.line));
        else if (p.kind === "broad") errors.push(T.scopeBroad(rel, p.pattern));
      }
    }
    const byBrief = scope.patternsByBrief(briefTexts, cfg);
    for (const c of scope.outsideBriefs(indexed, byBrief, cfg)) errors.push(T.outsideBriefs(c));
    return errors;
  }

  function checkBrief(brief, errors, isProject) {
    const rel = relative(root, brief);
    const text = readFileSync(brief, "utf8");
    const lines = text.split(/\r?\n/);
    const start = lines.slice(0, 15).findIndex((l) => STATUS_RE.test(l));
    if (start === -1 || !DATE_RE.test(lines.slice(start, start + 4).join(" "))) errors.push(T.status(rel));
    if (isProject) {
      if (briefStatus(text) === "done") errors.push(T.briefDone(rel));
      if (briefMaturity(text) === "ready") for (const gap of readyGaps(text)) errors.push(T[gap](rel));
      // the model numbers its sections ("## 7. Hand-off"): detection must tolerate that prefix.
      if (!lines.some((l) => /^##\s*(\d+\.\s*)?(Reprise|Hand-off)\b/.test(l))) errors.push(T.handOff(rel));
    } else {
      for (const names of INTENT_SECTIONS) {
        if (!names.some((s) => lines.some((l) => l.startsWith(s)))) errors.push(T.section(rel, names[lang === "en" ? 1 : 0].slice(3)));
      }
    }
  }
  return { checkWorkstreams, checkScopeReminder };
}
