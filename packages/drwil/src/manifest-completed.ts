// Fingerprints of the files `init` completes (QUA-244): a file of the previous manifest still intact gets its new
// fingerprint there; any other completed file (modified by hand, or the project's own) keeps its manifest entry, so
// uninstall and the removal of obsolete files never delete it, and its fingerprint after completion is noted aside,
// in a file rewritten at each pass: the scope gate admits it only in the commit of that update (scope-gate-kit.mjs).
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sha256 } from "./manifest.js";

export const COMPLETED_PATH = ".drwil/completed-files.json";
// `{ files: [{ file, sha256 }] }`, never a path as key: gitleaks' generic-api-key rule takes a hexadecimal value behind a
// key such as `api/CLAUDE.md` for a secret (the manifest needs its own allowlist entry for that very reason).

export interface Fingerprints {
  /** Manifest of this pass (written by `scaffold`, then by `complete`). */
  manifest?: Record<string, string>;
  /** Manifest of the previous installation. */
  previous?: Record<string, string>;
  /** Fingerprints after completion, noted aside. */
  completed?: Record<string, string>;
}

/** Records the fingerprint of `rel` once written with `content`; `before`: its content just before (null: absent). */
export function recordCompletion(fp: Fingerprints, rel: string, before: string | null, content: string): void {
  if (!fp.manifest) return;
  const intact = before !== null && fp.previous?.[rel] === sha256(before);
  // A file this same install created, then completed, or one the previous install left intact: still the kit's.
  if (rel in fp.manifest || intact) fp.manifest[rel] = sha256(content);
  // Only an update is committed through the scope gate: a first install notes nothing aside.
  else if (fp.completed && Object.keys(fp.previous ?? {}).length) fp.completed[rel] = sha256(content);
}

/** Rewrites the fingerprints noted aside by this pass only: removed when there are none. */
export async function writeCompleted(targetDir: string, completed: Record<string, string>): Promise<void> {
  const path = join(targetDir, COMPLETED_PATH);
  if (!Object.keys(completed).length) {
    if (existsSync(path)) await rm(path);
    return;
  }
  await mkdir(join(targetDir, ".drwil"), { recursive: true });
  const list = Object.entries(completed).map(([file, hash]) => ({ file, sha256: hash }));
  await writeFile(path, JSON.stringify({ files: list }, null, 2) + "\n");
}
