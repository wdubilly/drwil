// Rewriting of the old format (references, brief, config, state, usage log), split from migration.ts (QUA-001).
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { MigrationPlan } from "./migration.js";
import { read, readJson } from "./migration-io.js";
import {
  ACTIVITIES,
  BLOCK,
  BRIEF_DIR,
  CONFIG_KEYS,
  CONFIG_VALUES,
  HOOKS,
  MOVED,
  NESTED_CONFIG_KEYS,
  OLD_KIT_FILES,
  STATE_FIELDS,
  SUBCOMMANDS,
  USAGE_FIELDS,
} from "./migration-table.js";

/** Old → new pairs of the references, longest first: `docs/projets/en-attente.md` must win over
 * `docs/projets/`. */
function pairs(): [string, string][] {
  const p: Record<string, string> = {
    ...MOVED,
    ...OLD_KIT_FILES,
    [BRIEF_DIR[0]]: BRIEF_DIR[1],
    // Values of `dirs` in the config, without a trailing slash.
    "docs/projets": "docs/projects",
    "docs/recettes": "docs/recipes",
    // Pattern of .gitleaks.toml, escaped dot.
    "fichiers-installes\\.json": "installed-files\\.json",
  };
  for (const [old, now] of Object.entries(OLD_KIT_FILES)) {
    if (old.startsWith(".claude/skills/")) p[`${dirname(old)}/`] = `${dirname(now)}/`;
  }
  for (const [old, now] of Object.entries(HOOKS)) {
    // Imports between hooks (`./etat.mjs`) and calls from a script (`$(dirname "$0")/perimetre.mjs`).
    p[`/${basename(old)}`] = `/${basename(now)}`;
  }
  return Object.entries(p).sort((a, b) => b[0].length - a[0].length);
}

export function replacer(): (text: string) => string {
  const list = pairs();
  const table = new Map(list);
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(list.map(([a]) => escapeRe(a)).join("|"), "g");
  const subcommand = new RegExp(`(state\\.mjs(?:\\\\")?) (${Object.keys(SUBCOMMANDS).join("|")})\\b`, "g");
  // A single pass per table: a name already replaced is never replaced a second time. The subcommands
  // follow the script name, already in English (including escaped in a JSON: `\"`).
  return (text) =>
    text.replace(re, (m) => table.get(m) ?? m).replace(subcommand, (_m, script: string, sc: string) => `${script} ${SUBCOMMANDS[sc]}`);
}

/** Scope block and increments section of a brief or an intent. */
export function migrateBrief(text: string, isBrief: boolean): string {
  // The block opens a line: a `<!-- cadrage` cited in the prose is not a block.
  let t = text.replace(/^<!--\s*cadrage[ \t]*\r?\n([\s\S]*?)-->/gm, (_m, body: string) => {
    return `${BLOCK.new}\n${body.replace(new RegExp(`^(\\s*)${BLOCK.oldKey}`, "m"), `$1${BLOCK.newKey}`)}-->`;
  });
  if (isBrief) t = t.replace(/^(#{1,4}\s*\d*\.?\s*)Lots\b/gm, "$1Increments");
  return t;
}

function value(v: unknown, replace: (t: string) => string): unknown {
  if (typeof v === "string") return CONFIG_VALUES[v] ?? replace(v);
  if (Array.isArray(v)) return v.map((x) => value(x, replace));
  return v;
}

function renameKeys(object: Record<string, unknown>, keys: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(object).map(([k, v]) => [keys[k] ?? k, v]));
}

export function migrateConfig(config: Record<string, unknown>, replace: (t: string) => string): Record<string, unknown> {
  const out = renameKeys(config, CONFIG_KEYS);
  for (const [key, subKeys] of Object.entries(NESTED_CONFIG_KEYS)) {
    const v = out[key];
    if (Array.isArray(v)) out[key] = v.map((x) => (x && typeof x === "object" ? renameKeys(x as Record<string, unknown>, subKeys) : x));
    else if (v && typeof v === "object") out[key] = renameKeys(v as Record<string, unknown>, subKeys);
  }
  for (const key of ["scopeGate", "scopeReminder", "newRequirements", "transitions"]) out[key] = value(out[key], replace);
  for (const key of ["dirs", "risk"]) {
    const v = out[key];
    if (v && typeof v === "object") out[key] = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, value(x, replace)]));
  }
  if (Array.isArray(out.outOfScope)) out.outOfScope = value(out.outOfScope, replace);
  if (Array.isArray(out.checks)) {
    out.checks = out.checks.map((c) => (c && typeof c === "object" && "paths" in c ? { ...c, paths: value(c.paths, replace) } : c));
  }
  for (const key of Object.keys(out)) if (out[key] === undefined) delete out[key];
  return out;
}

export function migrateState(state: Record<string, unknown>, replace: (t: string) => string): Record<string, unknown> {
  const out = renameKeys(state, STATE_FIELDS);
  if (typeof out.activity === "string") out.activity = ACTIVITIES[out.activity] ?? out.activity;
  if (typeof out.active_brief === "string") out.active_brief = replace(out.active_brief);
  return out;
}

export function migrateUsage(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      try {
        const e = JSON.parse(line);
        const toRename = e && typeof e === "object" && !Array.isArray(e) && Object.keys(e).some((k) => k in USAGE_FIELDS);
        return toRename ? JSON.stringify(renameKeys(e, USAGE_FIELDS)) : line;
      } catch {
        return line; // empty or unreadable line: kept as it is, never lost.
      }
    })
    .join("\n");
}

export const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

/** Rewrites a JSON only if its content changes: its formatting alone does not count. */
export function rewriteJson(
  root: string,
  rel: string,
  migrateObject: (o: Record<string, unknown>) => Record<string, unknown>,
  plan: MigrationPlan,
  writes: Map<string, string>,
): void {
  const object = readJson(root, rel);
  if (!object) return;
  const migrated = migrateObject(object);
  if (JSON.stringify(migrated) === JSON.stringify(object)) return;
  writes.set(rel, json(migrated));
  plan.rewritten.push(rel);
}

/**
 * Does the project carry a sign of the old format? Without any, the migration does nothing: an
 * already migrated (or new) project may cite old names in its prose (history, release notes) without
 * them being rewritten at every `init`.
 */
export function oldFormat(root: string, all: string[]): boolean {
  if (all.some((f) => f.startsWith(BRIEF_DIR[0]) || MOVED[f] || OLD_KIT_FILES[f])) return true;
  const config = readJson(root, ".drwil/ia-first.json") ?? {};
  if (Object.keys(config).some((k) => k in CONFIG_KEYS)) return true;
  for (const [key, subKeys] of Object.entries(NESTED_CONFIG_KEYS)) {
    const v = config[key];
    const objects = Array.isArray(v) ? v : [v];
    if (objects.some((o) => o && typeof o === "object" && Object.keys(o).some((k) => k in subKeys))) return true;
  }
  const state = readJson(root, ".drwil/state.json") ?? {};
  if (Object.keys(state).some((k) => k in STATE_FIELDS && STATE_FIELDS[k] !== k)) return true;
  if (existsSync(join(root, ".drwil/usage.jsonl")) && migrateUsage(read(root, ".drwil/usage.jsonl")) !== read(root, ".drwil/usage.jsonl"))
    return true;
  return all.some(
    (f) =>
      (f.startsWith(BRIEF_DIR[1]) || f.startsWith("docs/intentions/")) &&
      f.endsWith(".md") &&
      /^<!--\s*cadrage[ \t]*\r?$/m.test(read(root, f)),
  );
}
