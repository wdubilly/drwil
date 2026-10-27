// Version of the installed engine (.drwil/install.json), split from manifest.ts (QUA-001).
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const INSTALL_PATH = [".drwil", "install.json"];

/** Version of the installed engine (.drwil/install.json): versions only, so the file only changes with the version. */
export interface InstallRecord {
  format: 1;
  version: string;
  /** null: installed before versions were recorded (before 0.6.0), origin unknown rather than wrong. */
  firstVersion: string | null;
}

/** Version of this drwil package, read from its package.json (the single source of the version). */
export function engineVersion(): string {
  return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
}

export function readInstall(targetDir: string): InstallRecord | null {
  try {
    const r = JSON.parse(readFileSync(join(targetDir, ...INSTALL_PATH), "utf8"));
    if (typeof r?.version !== "string") return null;
    return { format: 1, version: r.version, firstVersion: r.firstVersion === null ? null : String(r.firstVersion ?? r.version) };
  } catch {
    return null;
  }
}

/**
 * Records the engine version; the first installed version is kept across updates. Rewritten only
 * when it changes. `upgrade`: a previous installation exists (manifest) — without any record, it
 * predates the record, so its first version is unknown rather than the current one.
 */
export async function writeInstall(targetDir: string, version: string, upgrade = false): Promise<void> {
  const path = join(targetDir, ...INSTALL_PATH);
  const previous = readInstall(targetDir);
  const unrecorded = upgrade && !existsSync(path);
  const firstVersion = previous ? previous.firstVersion : unrecorded ? null : version;
  const record: InstallRecord = { format: 1, version, firstVersion };
  const content = JSON.stringify(record, null, 2) + "\n";
  if (existsSync(path) && readFileSync(path, "utf8") === content) return;
  await mkdir(join(targetDir, ".drwil"), { recursive: true });
  await writeFile(path, content);
}

/** -1, 0 or 1, on the numeric x.y.z part; a suffix (-beta…) is ignored. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) =>
    v
      .split("-")[0]
      .split(".")
      .map((n) => Number.parseInt(n, 10) || 0);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0) ? -1 : 1;
  return 0;
}

// Briefs and decisions produced by the user/the AI over time, never removed automatically (neither
// by the obsolete cleanup nor by `uninstall`), even if their initial content (empty template) was
// copied by the kit. The French folders stay protected: `uninstall` can run on a project that was
