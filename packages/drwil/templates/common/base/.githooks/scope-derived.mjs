// Files derived from a brief's scope, admitted as if they were in its `scope` block — single definition, read by
// the scope gate (commit and replay), check-docs's scope reminder, the agent's write guard and the closing.
// Four closed cases, never a rules file:
//   1. a test file whose text cites the path of a module of the scope;
//   2. a file cited by the `**Périmètre**` / `**Tests**` fields of a contract the brief cites (criteria, « Contrats modifiés »);
//   3. a file new on the branch, in the folder of a scope file, named after it plus a dash, that this file imports (its split);
//   4. the template source of a cited copy (`scopeMirrors` read the other way).
// In doubt (unreadable file, missing brief, no main branch), the file is not admitted: never a success by default (QUA-013).
import { readFileSync } from "node:fs";
import { basename, dirname, join, posix } from "node:path";
import { acceptanceCriteria, declaredContracts } from "./briefs-criteria.mjs";
import { readContracts } from "./contracts.mjs";
import { rulesFiles } from "./detour-rules.mjs";
import { git, reference } from "./scope-gate-merge.mjs";
import { fnmatch, normalize, readBlock, withMirrors } from "./scope.mjs";

// Agents' instructions, settings and hooks: rules too, besides `rulesFiles` (registry, hooks, thresholds, CI).
const AGENT_RULES = [
  "AGENTS.md",
  "*/AGENTS.md",
  "CLAUDE.md",
  "*/CLAUDE.md",
  "GEMINI.md",
  "*/GEMINI.md",
  "docs/ia-first.md",
  "docs/ia-first/*",
  ".claude/*",
  ".gemini/*",
  ".github/hooks/*",
];
const TEST_RE = /(^|\/)(tests?|__tests__|spec)\/|[._-](test|spec)\.[^./]+$|(^|\/)test_[^/]*\.py$/;
const WILD = /[*?[]/;
const ID_RE = /^[A-Z][A-Z0-9]*-\d+$/;
const SCOPE_FIELD = /^\*\*(Périmètre|Perimetre|Scope)\*\*\s*:?\s*(.*)$/i;

/** True if `f` changes the rules: never admitted as derived. The template sources of the copies included. */
export function isRulesFile(f, cfg = {}) {
  const p = normalize(f);
  if (rulesFiles([p], cfg).length) return true;
  return withMirrors([p], cfg).some((t) => AGENT_RULES.some((g) => fnmatch(t, g)));
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const stem = (p) => basename(p).replace(/\.[^.]+$/, "");

/** True if `text` (the file `from`) names `target`: its path from the root, or a relative import with or without extension. */
function cites(text, from, target) {
  if (new RegExp(`(^|[^\\w./-])${esc(target)}(?![\\w/-])`).test(text)) return true;
  let rel = posix.relative(dirname(from), target);
  if (!rel.startsWith(".")) rel = `./${rel}`;
  const bare = rel.replace(/\.[^./]+$/, "");
  return new RegExp(`["'\`]${esc(bare)}(\\.[\\w]+)?["'\`]`).test(text);
}

/** Backticked paths of the scope and tests fields of the contracts `ids` of `registry`. */
function contractPaths(registry, ids) {
  const paths = new Map();
  for (const k of readContracts(registry ?? "")) {
    if (!ids.has(k.id)) continue;
    const scopeLine =
      k.text
        .split("\n")
        .map((l) => SCOPE_FIELD.exec(l)?.[2])
        .find((v) => v !== undefined) ?? "";
    const quoted = [...scopeLine.matchAll(/`([^`\s]+)`/g)].map((m) => m[1]);
    for (const p of [...quoted, ...(k.tests ?? [])].map(normalize))
      if (!WILD.test(p) && (p.includes("/") || /\.\w+$/.test(p)) && !paths.has(p)) paths.set(p, k.id);
  }
  return paths;
}

/**
 * Derivation of `f` from a brief: `{ kind: 1..4, from }` or null. `ctx`: `patterns` (scope patterns, copies included),
 * `brief` (its text), `registry` (text of the contracts registry next to the brief), `read(path)` (text at the judged
 * revision, null if absent), `isNew(path)` (absent from the main branch), `cfg`.
 */
export function derivation(file, ctx) {
  const f = normalize(file);
  const { patterns = [], cfg = {} } = ctx;
  if (isRulesFile(f, cfg) || patterns.some((p) => fnmatch(f, p))) return null;
  const literal = patterns.filter((p) => !WILD.test(p) && p !== f);
  if (TEST_RE.test(f)) {
    const text = ctx.read(f);
    const from = text === null ? undefined : literal.find((p) => !TEST_RE.test(p) && cites(text, f, p));
    if (from) return { kind: 1, from };
  }
  if (typeof ctx.brief === "string") {
    const ids = new Set(
      [...acceptanceCriteria(ctx.brief).map((c) => c.link), ...declaredContracts(ctx.brief)].filter((id) => ID_RE.test(id ?? "")),
    );
    const cited = contractPaths(ctx.registry, ids);
    for (const [p, id] of cited) if (withMirrors([p], cfg).includes(f)) return { kind: 2, from: id };
  }
  const split = literal.find((p) => dirname(p) === dirname(f) && stem(f).startsWith(`${stem(p)}-`));
  if (split && ctx.isNew(f)) {
    const text = ctx.read(split);
    if (text !== null && cites(text, split, f)) return { kind: 3, from: split };
  }
  for (const m of (Array.isArray(cfg.scopeMirrors) ? cfg.scopeMirrors : []).filter(
    (m) => typeof m?.from === "string" && m.from && typeof m.to === "string",
  )) {
    const copy = f.startsWith(m.from) ? normalize(m.to + f.slice(m.from.length)) : null;
    if (copy && patterns.some((p) => fnmatch(copy, p))) return { kind: 4, from: copy };
  }
  return null;
}

/** `isNew(path)` against the main branch's merge base: no base or git failure, nothing is new (a doubt). */
export function newOnBranch(root, base) {
  return (f) => {
    if (!base) return false;
    const out = git(root, ["ls-tree", "-z", "--name-only", "--full-tree", base, "--", f]);
    return out === "";
  };
}

/**
 * Context of a brief judged in git: scope, brief and registry read at `briefRev`, files at `rev` (":" for the
 * index); `brief` null or absent there: no pattern, nothing derived.
 */
export function revisionContext(root, { rev, briefRev, brief, cfg = {}, base }) {
  const show = (r, p) => git(root, ["show", `${r === ":" ? "" : r}:${p}`]);
  const text = brief ? show(briefRev, brief) : null;
  return {
    patterns: text === null ? [] : withMirrors(readBlock(text).patterns, cfg),
    brief: text,
    registry: text === null ? null : show(briefRev, cfg.dirs?.contracts ?? "docs/contracts.md"),
    read: (p) => show(rev, p),
    isNew: newOnBranch(root, base),
    cfg,
  };
}

/**
 * Files of `files` derived from one of the briefs `briefTexts` (`[path, text]`), read in the working tree
 * (check-docs, the agent's write guard): `Map file -> { kind, from, brief }`. `extra(path)`: text about to be
 * written, added to what is read.
 */
export function derivedInWorktree(root, files, briefTexts, cfg = {}, { env = process.env, extra = () => null } = {}) {
  const read = (p) => {
    let text = null;
    try {
      text = readFileSync(join(root, p), "utf8");
    } catch {
      // absent: only the text about to be written, if any.
    }
    const more = extra(p);
    return more === null ? text : `${text ?? ""}\n${more}`;
  };
  const registry = read(cfg.dirs?.contracts ?? "docs/contracts.md");
  const isNew = newOnBranch(root, reference(root, env));
  const result = new Map();
  for (const f of files.map(normalize)) {
    for (const [brief, text] of briefTexts) {
      if (typeof text !== "string") continue;
      const d = derivation(f, { patterns: withMirrors(readBlock(text).patterns, cfg), brief: text, registry, read, isNew, cfg });
      if (d) {
        result.set(f, { ...d, brief });
        break;
      }
    }
  }
  return result;
}
