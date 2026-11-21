// Commit et push du kit posés par `drwil init` (split from run-checks.mjs) — QUA-325 : quand le manifeste du kit
// (QUA-238, `nonKitFiles`) explique chaque fichier du commit posé par `init` (variable DRWIL_KIT_UPDATE, pre-commit), ou
// de chaque commit poussé portant le trailer (pre-push, DRWIL_PUSH_COMMITS), les contrôles du projet qui déclarent
// `paths` ne jugent pas ces fichiers que le projet n'a pas écrits : « non exécuté », rejoués en CI (jamais ici en CI).
// La variable ou le trailer seuls ne diffèrent rien : un seul fichier non expliqué et tout joue comme avant (QUA-019).
import { spawnSync } from "node:child_process";
import { ciOnly } from "./engine-runat.mjs";
import { KIT_ENV, KIT_TRAILER, nonKitFiles } from "./scope-gate-kit.mjs";
import { git } from "./scope-gate-merge.mjs";

const TEXTS = {
  fr: {
    commit: "commit du kit, reconnu par son manifeste : rejoué au push et en CI",
    push: "commit du kit, reconnu par son manifeste : rejoué en CI",
  },
  en: {
    commit: "kit commit, recognised by its manifest: replayed on push and in CI",
    push: "kit commit, recognised by its manifest: replayed in CI",
  },
};
const SHA = /^[0-9a-f]{7,64}$/;
const ZERO = /^0+$/;

/** At pre-commit only (DRWIL_HOOK=pre-commit): the staged files; null elsewhere, or if git does not answer (everything then runs). */
export function stagedFiles(env = process.env) {
  if (env.DRWIL_HOOK !== "pre-commit") return null;
  const r = spawnSync("git", ["diff", "--cached", "--name-only", "--no-renames", "-z"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split("\0").filter(Boolean) : null;
}

const listed = (out) => (out === null ? null : out.split(/[\n\0]/).filter(Boolean));

/** The commits a push sends (`local:remote` pairs from the pre-push); null when one cannot be read. */
function pushedCommits(root, spec) {
  const all = [];
  // An absent or empty list (an older pre-push) is unreadable: nothing is deferred.
  for (const pair of `${spec}`.trim().split(/\s+/)) {
    const [local, remote] = pair.split(":");
    if (!SHA.test(local) || !SHA.test(remote)) return null;
    // A new remote branch: every commit no remote branch has yet.
    const out = listed(git(root, ["rev-list", local, ...(ZERO.test(remote) ? ["--not", "--remotes"] : [`^${remote}`])]));
    if (!out) return null;
    all.push(...out);
  }
  return all;
}

/** A single-parent commit carrying the trailer, whose every file the manifest explains. */
function kitCommit(root, c) {
  if (listed(git(root, ["rev-list", "--parents", "-n", "1", c]))?.[0]?.split(" ").length !== 2) return false;
  if (!git(root, ["log", "-1", `--format=%(trailers:key=${KIT_TRAILER},valueonly)`, c])?.trim()) return false;
  const files = listed(git(root, ["diff-tree", "-r", "--name-only", "--no-renames", "-z", `${c}^`, c]));
  return files !== null && nonKitFiles(root, `${c}^`, c, files).length === 0;
}

/**
 * The configuration the engine runs with, and the deferred checks (`deferred`, each named with why): on a kit commit or
 * a push of kit commits only, the project checks declaring `paths` are left out (a check left to CI keeps its own notice).
 */
export function kitDeferral(root, cfg, staged, env = process.env) {
  const none = { cfg, deferred: [] };
  if (env.CI || !Array.isArray(cfg.checks)) return none;
  let kit = false;
  if (staged) kit = Boolean(env[KIT_ENV]) && staged.length > 0 && nonKitFiles(root, "HEAD", null, staged).length === 0;
  else if (env.DRWIL_PUSH_REFS?.trim()) {
    const commits = pushedCommits(root, env.DRWIL_PUSH_COMMITS);
    kit = Boolean(commits?.length) && commits.every((c) => kitCommit(root, c));
  }
  const left = kit ? cfg.checks.filter((c) => Array.isArray(c.paths) && c.paths.length && !ciOnly(c)) : [];
  if (!left.length) return none;
  const why = TEXTS[cfg.lang === "en" ? "en" : "fr"][staged ? "commit" : "push"];
  return { cfg: { ...cfg, checks: cfg.checks.filter((c) => !left.includes(c)) }, deferred: left.map((c) => `${c.name ?? c.run} (${why})`) };
}
