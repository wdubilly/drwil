// `core.hooksPath` and the git hooks of the project, split from essentials.ts (QUA-001).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";

// Hooks drwil installs in git; commit-msg is shipped disabled, so it is not required.
const GIT_HOOKS = ["pre-commit", "pre-push", "prepare-commit-msg"];

/** `core.hooksPath` of the repository, `undefined` when unset or outside a git repository. */
export function hooksPath(targetDir: string): string | undefined {
  if (!existsSync(join(targetDir, ".git"))) return undefined;
  const r = spawnSync("git", ["config", "core.hooksPath"], { cwd: targetDir, encoding: "utf8" });
  return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : undefined;
}

// husky 9 points core.hooksPath to `.husky/_`, generated: the project's scripts live in `.husky/`.
export const scriptsDir = (path: string) => {
  const p = path.replace(/\/$/, "");
  return p.endsWith("/_") ? dirname(p) : p;
};

/** drwil hooks not called by the project's own hooks. */
export function unchainedHooks(targetDir: string, path: string): string[] {
  const dirs = [resolvePath(targetDir, path), resolvePath(targetDir, scriptsDir(path))];
  const calls = (hook: string) =>
    dirs.some((d) => existsSync(join(d, hook)) && readFileSync(join(d, hook), "utf8").includes(`.githooks/${hook}`));
  return GIT_HOOKS.filter((h) => !calls(h));
}
