import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { pruneEmptyDirs, sha256 } from "./manifest.js";
import { APART, SCRIPT_RE, TEXT_EXTENSIONS, files, read, readJson } from "./migration-io.js";
import { json, migrateBrief, migrateConfig, migrateState, migrateUsage, oldFormat, replacer, rewriteJson } from "./migration-rewrite.js";
import { BRIEF_DIR, CHECK_IDS, MECHANICS, MOVED, OLD_KIT_FILES, PROJECT_CHECK_PREFIX, REGISTRIES } from "./migration-table.js";

export { formatMigration } from "./migration-format.js";

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
