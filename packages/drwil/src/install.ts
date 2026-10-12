import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { KIT_MECHANICS, readConfig, resolve, type InitOptions, type Resolved } from "./config.js";
import { readManifest, sha256 } from "./manifest.js";
import type { Overwrite } from "./render.js";
import { detectStack } from "./stack.js";

export interface InstallChoices {
  r: Resolved;
  /** An already equipped project, or existing code: never a `git init`, layers from the detected stack. */
  existing: boolean;
  /** Manifest of the previous installation (empty for a new one). */
  previous: Record<string, string>;
  shouldOverwrite: Overwrite;
}

/**
 * What `drwil init` decides before writing anything, shared with its preview (`--dry-run`) so that
 * the preview cannot diverge from the installation. A new project gets the default layers; an
 * existing one, the subfolders where a stack was found. The kit mechanics are refreshed when they
 * did not change since their installation (or were never recorded); a mechanics file modified by
 * hand is reported as drift, never overwritten. `--force` rewrites everything.
 */
export function installChoices(opts: InitOptions): InstallChoices {
  const existing = readConfig(opts.targetDir) !== null || detectStack(opts.targetDir).length > 0;
  const r = resolve(opts, (stack) => (stack.length ? stack.map((s) => s.path).filter((p) => p !== ".") : ["backend", "frontend"]));
  const previous = readManifest(opts.targetDir);
  const unchanged = (rel: string) => {
    const abs = join(opts.targetDir, rel);
    return !(rel in previous) || !existsSync(abs) || previous[rel] === sha256(readFileSync(abs, "utf8"));
  };
  const shouldOverwrite: Overwrite = opts.force ? () => true : (rel) => rel.startsWith(KIT_MECHANICS) && unchanged(rel);
  return { r, existing, previous, shouldOverwrite };
}
