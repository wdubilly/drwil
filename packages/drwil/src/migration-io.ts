// File reading helpers of the migration of the old format, split from migration.ts (QUA-001).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const IGNORED = new Set([".git", "node_modules", "dist", "build", "coverage", ".venv", "venv", "vendor", "target"]);
export const TEXT_EXTENSIONS = [".md", ".mdc", ".json", ".yml", ".yaml", ".toml"];
// Mechanics scripts (.mjs hooks, git hooks without extension): any other file under `.githooks/`
// (Python cache, binary) is never read as text.
export const SCRIPT_RE = /(\.m?js|\.cjs|\.sh|\/[^./]+)$/;
// Read and rewritten apart, field by field: never by a plain text replacement.
export const APART = new Set([
  ".drwil/ia-first.json",
  ".drwil/state.json",
  ".drwil/usage.jsonl",
  ".drwil/fichiers-installes.json",
  ".drwil/installed-files.json",
]);

export function files(root: string, rel = ""): string[] {
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

export const read = (root: string, rel: string) => readFileSync(join(root, rel), "utf8");

export function readJson(root: string, rel: string): Record<string, unknown> | null {
  try {
    return JSON.parse(read(root, rel));
  } catch {
    return null;
  }
}
