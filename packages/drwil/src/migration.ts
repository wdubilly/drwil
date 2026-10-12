import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fill, type MessageLang } from "./i18n.js";
import { pruneEmptyDirs, sha256 } from "./manifest.js";
import {
  ACTIVITIES,
  BLOCK,
  BRIEF_DIR,
  CHECK_IDS,
  CONFIG_KEYS,
  CONFIG_VALUES,
  HOOKS,
  MECHANICS,
  MOVED,
  NESTED_CONFIG_KEYS,
  OLD_KIT_FILES,
  PROJECT_CHECK_PREFIX,
  REGISTRIES,
  STATE_FIELDS,
  SUBCOMMANDS,
  USAGE_FIELDS,
} from "./migration-table.js";

/** What the migration does (or would do, in a dry run) to a project equipped with the old format. */
export interface MigrationPlan {
  /** Project content moved to its English name. */
  moved: { from: string; to: string }[];
  /** Kit files unchanged since installation: removed, the installation writes them again. */
  removed: string[];
  /** Old kit files modified since installation: kept, to take over by hand. */
  kept: string[];
  /** Impossible moves: the target already exists and was modified. Nothing is touched. */
  conflicts: { from: string; to: string }[];
  /** Files whose content changes (references, block, config, state, usage log). */
  rewritten: string[];
}

const IGNORED = new Set([".git", "node_modules", "dist", "build", "coverage", ".venv", "venv", "vendor", "target"]);
const TEXT_EXTENSIONS = [".md", ".mdc", ".json", ".yml", ".yaml", ".toml"];
// Mechanics scripts (.mjs hooks, git hooks without extension): any other file under `.githooks/`
// (Python cache, binary) is never read as text.
const SCRIPT_RE = /(\.m?js|\.cjs|\.sh|\/[^./]+)$/;
// Read and rewritten apart, field by field: never by a plain text replacement.
const APART = new Set([
  ".drwil/ia-first.json",
  ".drwil/state.json",
  ".drwil/usage.jsonl",
  ".drwil/fichiers-installes.json",
  ".drwil/installed-files.json",
]);

function files(root: string, rel = ""): string[] {
  const dir = join(root, rel);
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!IGNORED.has(e.name) && path !== ".drwil/evidence") out.push(...files(root, path));
    } else if (e.isFile()) out.push(path);
  }
  return out;
}

const read = (root: string, rel: string) => readFileSync(join(root, rel), "utf8");

function readJson(root: string, rel: string): Record<string, unknown> | null {
  try {
    return JSON.parse(read(root, rel));
  } catch {
    return null;
  }
}

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

function replacer(): (text: string) => string {
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
function migrateBrief(text: string, isBrief: boolean): string {
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

function migrateConfig(config: Record<string, unknown>, replace: (t: string) => string): Record<string, unknown> {
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

function migrateState(state: Record<string, unknown>, replace: (t: string) => string): Record<string, unknown> {
  const out = renameKeys(state, STATE_FIELDS);
  if (typeof out.activity === "string") out.activity = ACTIVITIES[out.activity] ?? out.activity;
  if (typeof out.active_brief === "string") out.active_brief = replace(out.active_brief);
  return out;
}

function migrateUsage(text: string): string {
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

const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

/** Rewrites a JSON only if its content changes: its formatting alone does not count. */
function rewriteJson(
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
function oldFormat(root: string, all: string[]): boolean {
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

/**
 * Migrates in one go a project equipped by a French version of the kit (no aliases); idempotent: on
 * an already migrated project, nothing to do. The project's content (briefs, contracts, journal) is
 * never deleted; neither is a kit file modified by hand.
 */
export async function migrate(root: string, { dryRun = false } = {}): Promise<MigrationPlan> {
  const plan: MigrationPlan = { moved: [], removed: [], kept: [], conflicts: [], rewritten: [] };
  const manifestPath = [".drwil/installed-files.json", ".drwil/fichiers-installes.json"].find((f) => existsSync(join(root, f)));
  const manifest = (manifestPath && (readJson(root, manifestPath) as Record<string, string>)) || {};
  const unchanged = (rel: string) => existsSync(join(root, rel)) && manifest[rel] === sha256(read(root, rel));
  const replace = replacer();

  const all = files(root);
  const old = oldFormat(root, all);
  const target = (rel: string) => MOVED[rel] ?? rel.replace(BRIEF_DIR[0], BRIEF_DIR[1]);
  const toMove = old ? all.filter((f) => f.startsWith(BRIEF_DIR[0]) || MOVED[f]) : [];
  const removals = new Set<string>();
  const writes = new Map<string, string>();
  for (const from of toMove) {
    const to = target(from);
    if (existsSync(join(root, to)) && !unchanged(to) && read(root, to) !== read(root, from)) {
      plan.conflicts.push({ from, to });
      continue;
    }
    plan.moved.push({ from, to });
    removals.add(from);
    writes.set(to, read(root, from));
  }
  for (const file of old ? Object.keys(OLD_KIT_FILES) : []) {
    if (!existsSync(join(root, file))) continue;
    if (unchanged(file)) {
      plan.removed.push(file);
      removals.add(file);
    } else plan.kept.push(file);
  }

  // Final content of each text file, at its final place.
  const remaining = old ? all.filter((f) => !removals.has(f) || writes.has(target(f))) : [];
  for (const f of remaining) {
    const here = removals.has(f) ? target(f) : f;
    if (APART.has(here) || APART.has(f)) continue;
    const text = writes.get(here) ?? read(root, f);
    const isText =
      TEXT_EXTENSIONS.some((e) => f.endsWith(e)) ||
      basename(f) === ".gitignore" ||
      (MECHANICS.some((m) => f.startsWith(m)) && SCRIPT_RE.test(f));
    if (!isText) continue;
    let migrated = replace(text);
    if (here.startsWith(BRIEF_DIR[1]) || here.startsWith("docs/intentions/"))
      migrated = migrateBrief(migrated, here.startsWith(BRIEF_DIR[1]));
    if (migrated !== text) {
      writes.set(here, migrated);
      plan.rewritten.push(here);
    }
  }

  if (old) {
    rewriteJson(root, ".drwil/ia-first.json", (o) => migrateConfig(o, replace), plan, writes);
    rewriteJson(root, ".drwil/state.json", (o) => migrateState(o, replace), plan, writes);
  }
  if (old && existsSync(join(root, ".drwil/usage.jsonl"))) {
    const before = read(root, ".drwil/usage.jsonl");
    const after = migrateUsage(before);
    if (after !== before) {
      writes.set(".drwil/usage.jsonl", after);
      plan.rewritten.push(".drwil/usage.jsonl");
    }
  }

  migrateRegistries(root, plan, writes);

  // A conflict or a kept file stays reported at each run, without running the migration again.
  const toMigrate = old && plan.moved.length + plan.removed.length + plan.rewritten.length > 0;
  if (toMigrate) {
    // Unchanged mechanics call the hooks under their old names: removed to be written anew.
    for (const rel of Object.keys(manifest)) {
      if (removals.has(rel) || !MECHANICS.some((m) => rel.startsWith(m)) || !unchanged(rel)) continue;
      plan.removed.push(rel);
      removals.add(rel);
      if (writes.delete(rel)) plan.rewritten = plan.rewritten.filter((r) => r !== rel);
    }
  }
  if (manifestPath && toMigrate) {
    const updated: Record<string, string> = {};
    for (const [rel, h] of Object.entries(manifest)) if (!removals.has(rel)) updated[rel] = h;
    // A moved file keeps the fingerprint of its installation, even if it replaces a kit target.
    for (const { from } of plan.moved) if (manifest[from]) updated[target(from)] = manifest[from];
    for (const rel of plan.removed) delete updated[rel];
    writes.set(".drwil/installed-files.json", json(updated));
    if (manifestPath !== ".drwil/installed-files.json") removals.add(manifestPath);
  }

  if (dryRun) return plan;
  for (const [rel, content] of writes) {
    await mkdir(dirname(join(root, rel)), { recursive: true });
    await writeFile(join(root, rel), content);
  }
  const toRemove = [...removals].filter((r) => !writes.has(r));
  for (const rel of toRemove) await rm(join(root, rel), { force: true });
  await pruneEmptyDirs(root, toRemove);
  return plan;
}

/**
 * Check identifiers of 0.5.0, in the contract registries only (a separate step: it neither needs nor
 * triggers the migration of the old format, which rewrites references in all the prose). Works on
 * the final content of a registry the step above may have moved.
 */
function migrateRegistries(root: string, plan: MigrationPlan, writes: Map<string, string>): void {
  const configured = readJson(root, ".drwil/ia-first.json")?.dirs as Record<string, unknown> | undefined;
  const paths = new Set([...(typeof configured?.contracts === "string" ? [configured.contracts] : []), ...REGISTRIES]);
  const ids = new RegExp(`(?<![\\w-])(${Object.keys(CHECK_IDS).join("|")})(?![\\w-])`, "g");
  const prefix = new RegExp(`(?<![\\w-])${PROJECT_CHECK_PREFIX[0]}`, "g");
  for (const rel of paths) {
    const before = writes.get(rel) ?? (existsSync(join(root, rel)) ? read(root, rel) : null);
    if (before === null) continue;
    const after = before.replace(ids, (m) => CHECK_IDS[m]).replace(prefix, PROJECT_CHECK_PREFIX[1]);
    if (after === before) continue;
    writes.set(rel, after);
    if (!plan.rewritten.includes(rel)) plan.rewritten.push(rel);
  }
}

const TEXTS = {
  fr: {
    moved: ["Serait déplacé vers son nom anglais", "Déplacé vers son nom anglais"],
    removed: ["Ancien fichier du kit, inchangé, serait retiré", "Ancien fichier du kit, inchangé, retiré"],
    rewritten: ["Serait réécrit aux noms anglais", "Réécrit aux noms anglais"],
    kept: "⚠ Ancien fichier du kit modifié à la main, gardé : à reprendre",
    conflicts: "⚠ Déplacement impossible, la cible existe et a été modifiée : rien touché",
    title: ["Migration de l'ancien format (simulation, rien d'écrit) :", "Migration de l'ancien format :"],
    count: "{0} ({1}) :",
  },
  en: {
    moved: ["Would be moved to its English name", "Moved to its English name"],
    removed: ["Old kit file, unchanged, would be removed", "Old kit file, unchanged, removed"],
    rewritten: ["Would be rewritten with the English names", "Rewritten with the English names"],
    kept: "⚠ Old kit file modified by hand, kept: to take over",
    conflicts: "⚠ Impossible move, the target exists and was modified: nothing touched",
    title: ["Migration of the old format (dry run, nothing written):", "Migration of the old format:"],
    count: "{0} ({1}):",
  },
};

/** Summary of a migration of the old format (empty if nothing to migrate), shared with the preview of `init`. */
export function formatMigration(p: MigrationPlan, dryRun = false, lang: MessageLang = "en"): string[] {
  const T = TEXTS[lang];
  const pick = (pair: string[]) => pair[dryRun ? 0 : 1];
  const l: string[] = [];
  const title = (t: string, n: number) => l.push(fill(T.count, t, n));
  if (p.moved.length) title(pick(T.moved), p.moved.length);
  for (const m of p.moved) l.push(`  ${m.from} → ${m.to}`);
  if (p.removed.length) title(pick(T.removed), p.removed.length);
  for (const r of p.removed) l.push(`  - ${r}`);
  if (p.rewritten.length) title(pick(T.rewritten), p.rewritten.length);
  for (const r of p.rewritten) l.push(`  ~ ${r}`);
  if (p.kept.length) title(T.kept, p.kept.length);
  for (const k of p.kept) l.push(`  ! ${k}`);
  if (p.conflicts.length) title(T.conflicts, p.conflicts.length);
  for (const c of p.conflicts) l.push(`  ! ${c.from} → ${c.to}`);
  if (l.length) l.unshift(pick(T.title));
  return l;
}
