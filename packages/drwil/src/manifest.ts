import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { KIT_MECHANICS } from "./config.js";

export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

const MANIFEST_PATH = [".drwil", "installed-files.json"];

export function readManifest(targetDir: string): Record<string, string> {
  try {
    return JSON.parse(readFileSync(join(targetDir, ...MANIFEST_PATH), "utf8"));
  } catch {
    return {};
  }
}

// Merged (never fully rewritten): a partial install (targeted apply) must not lose the entries of a
// previous install. `obsolete`: paths removed by removeObsolete() in this same run, taken out of the
// merged manifest (otherwise the merge would bring them back).
export async function writeManifest(targetDir: string, manifest: Record<string, string>, obsolete: string[] = []): Promise<void> {
  const merged = { ...readManifest(targetDir), ...manifest };
  for (const o of obsolete) delete merged[o];
  await mkdir(join(targetDir, ".drwil"), { recursive: true });
  await writeFile(join(targetDir, ...MANIFEST_PATH), JSON.stringify(merged, null, 2) + "\n");
}

// Briefs and decisions produced by the user/the AI over time, never removed automatically (neither
// by the obsolete cleanup nor by `uninstall`), even if their initial content (empty template) was
// copied by the kit. The French folders stay protected: `uninstall` can run on a project that was
// never migrated.
const PROTECTED_DIRS = ["docs/projets/", "docs/projects/", "docs/intentions/", "docs/recettes/", "docs/recipes/"];
function isProtected(rel: string): boolean {
  return PROTECTED_DIRS.some((p) => rel.startsWith(p));
}

// Files written by an earlier kit version, absent from the current template (`expected`), never
// modified since installation (unchanged fingerprint): removed. Limited to the kit mechanics (same
// scope as KIT_MECHANICS) — never the briefs; mechanism shared with `uninstall`.
export async function removeObsolete(targetDir: string, previous: Record<string, string>, expected: string[]): Promise<string[]> {
  const expectedSet = new Set(expected);
  const removed: string[] = [];
  for (const [rel, hash] of Object.entries(previous)) {
    if (!rel.startsWith(KIT_MECHANICS) || expectedSet.has(rel) || isProtected(rel)) continue;
    const abs = join(targetDir, rel);
    if (!existsSync(abs)) continue;
    const current = sha256(await readFile(abs, "utf8"));
    if (current !== hash) continue; // modified since installation: never removed automatically.
    await rm(abs);
    removed.push(rel);
  }
  return removed;
}

// Removes, bottom-up, the folders that became empty after files were removed.
export async function pruneEmptyDirs(targetDir: string, relRemoved: string[]): Promise<void> {
  const dirs = new Set(relRemoved.map((r) => dirname(join(targetDir, r))));
  for (const start of dirs) {
    let current = start;
    while (current !== targetDir && current.startsWith(targetDir)) {
      let entries: string[];
      try {
        entries = await readdir(current);
      } catch {
        break;
      }
      if (entries.length) break;
      // fs.rm requires recursive:true for a folder, even an empty one (otherwise EISDIR).
      await rm(current, { recursive: true });
      current = dirname(current);
    }
  }
}

export interface UninstallOptions {
  targetDir: string;
  /** Default `true`: lists what would be removed without touching anything (explicit confirmation
   * before a real removal). */
  dryRun?: boolean;
}

export interface UninstallReport {
  /** Files removed (or that would be, in dry-run mode). */
  removed: string[];
  /** Files whose fingerprint differs from the manifest (modified since installation): never removed. */
  modified: string[];
}

/** Uninstalls the kit mechanics from the manifest of installed files. Never touches the briefs,
 * intents and recipes folders, nor a file modified since installation (different fingerprint). */
export async function uninstall(opts: UninstallOptions): Promise<UninstallReport> {
  const manifest = readManifest(opts.targetDir);
  const dryRun = opts.dryRun ?? true;
  const removed: string[] = [];
  const modified: string[] = [];
  for (const [rel, hash] of Object.entries(manifest)) {
    if (isProtected(rel)) continue;
    const abs = join(opts.targetDir, rel);
    if (!existsSync(abs)) continue;
    const current = sha256(await readFile(abs, "utf8"));
    if (current !== hash) {
      modified.push(rel);
      continue;
    }
    removed.push(rel);
  }
  // Local governance state (gitignored, outside the manifest): read by no other tool once the
  // mechanics are removed; listed like the rest, so never removed silently.
  if (existsSync(join(opts.targetDir, ".drwil", "state.json"))) removed.push(".drwil/state.json");
  if (!dryRun) {
    for (const rel of removed) await rm(join(opts.targetDir, rel));
    const remaining = { ...manifest };
    for (const rel of removed) delete remaining[rel];
    await mkdir(join(opts.targetDir, ".drwil"), { recursive: true });
    await writeFile(join(opts.targetDir, ...MANIFEST_PATH), JSON.stringify(remaining, null, 2) + "\n");
    await pruneEmptyDirs(opts.targetDir, removed);
  }
  return { removed, modified };
}
