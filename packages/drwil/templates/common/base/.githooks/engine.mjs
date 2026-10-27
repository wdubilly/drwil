// Single check engine: .githooks/run-checks.mjs (git adapter) and `drwil verify` both use it, neither reimplements a check.
// Dependency-free: the hooks stay self-contained. Each check has a stable identifier (cited by the **Check** field of
// docs/contracts.md) and returns one of these results (stable values: they leave the hooks through `drwil verify` and its evidence):
// "ok" / "fail"; "not-run": it should have run but could not (missing tool, deferred at commit time), never a success (QUA-013);
// "not-applicable": excluded by design in this context (e.g. QUA-017 in CI).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { availableParallelism, homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { globToRegex } from "./glob.mjs";
import { controlFingerprints, treeFingerprint } from "./fingerprints.mjs";
import { mainBranchVerdict } from "./engine-branch.mjs";
import { createLaunchers } from "./engine-launch.mjs";
import { createPass } from "./engine-pass.mjs";
import { texts } from "./engine-texts.mjs";
import { checkScope } from "./scope-gate.mjs";
import { normalize } from "./scope.mjs";

export { controlFingerprints, texts, treeFingerprint };

/** Project root for run-checks.mjs (`scriptUrl`: its import.meta.url): the parent of `.githooks/`; `DRWIL_ROOT` replaces it, for its tests only. */
export function projectRoot(scriptUrl, env = process.env) {
  return env.DRWIL_ROOT || join(dirname(fileURLToPath(scriptUrl)), "..");
}

function findGitleaks() {
  for (const candidate of ["gitleaks", join(homedir(), ".local", "bin", "gitleaks")]) {
    if (!spawnSync(candidate, ["version"], { stdio: "ignore" }).error) return candidate;
  }
  return null;
}

/**
 * The project's checks, in the hooks' run order: [{ id, name, run, reuse }].
 * `run({ stdio, beforeRun })` returns { status, detail?, message?, output? } (`message`: explanation of a failure to show instead of
 * the name); `beforeRun` is called just before actually launching the command (not for a skipped check).
 * `staged` (pre-commit hook only): staged files, to defer a project check outside its `paths`; null everywhere else.
 * `whole`: analyses the whole repository rather than the staged files only (CI, `drwil verify`).
 */
export function checks(root, { cfg = {}, env = process.env, staged = null, whole = Boolean(env.CI) } = {}) {
  const T = texts(cfg.lang);
  const full = (cfg.mode ?? "full") === "full";
  const pass = createPass(root, env);
  const { finish } = pass;
  const { launch, launchAsync, build, buildAsync } = createLaunchers({ root, env, cfg, T, pass });
  const list = [];
  // `parallel` (setting, off by default): checks that only run a command also get `runAsync`, started together by `startParallel`.
  const parallel = cfg.parallel === true;
  const add = (id, name, run, runAsync) =>
    list.push({ id, name, run: (o = {}) => run(o, name), ...(runAsync && parallel ? { runAsync: () => runAsync(name) } : {}) });
  // A commit staging documentation only (docs/ or Markdown, not isCode()) does not replay the tests on the working tree (QUA-035);
  // push and CI always do.
  const docsOnly = Boolean(staged?.length) && staged.every((f) => /^docs\//.test(normalize(f)) || /\.md$/i.test(f));

  add("secrets", T.secrets, (o, name) => {
    if (!full) return { status: "not-applicable", detail: T.minimalMode };
    const gitleaks = findGitleaks();
    if (!gitleaks) return { status: "not-run", detail: T.gitleaksMissing };
    if (spawnSync("git", ["rev-parse", "--git-dir"], { cwd: root, stdio: "ignore" }).status !== 0)
      return { status: "not-run", detail: T.noGit, configured: true };
    // In CI (or for `drwil verify`) nothing is staged to judge: the whole history is analysed, not an empty index.
    const args = whole ? ["git", "--no-banner", "--redact", "."] : ["git", "--pre-commit", "--staged", "--no-banner", "--redact", "."];
    // Must see the index of the commit in progress: under `git commit -a`, the one named by GIT_INDEX_FILE.
    return launch(gitleaks, args, { ...o, keepGit: true }, name);
  });

  add("docs-references", T.docs, (o, name) => launch(process.execPath, [".githooks/check-docs.mjs"], o, name));
  add("contract-tests", T.contractTests, (o, name) => launch(process.execPath, [".githooks/check-contract-tests.mjs"], o, name));
  add("architecture-map", T.architecture, (o, name) => launch(process.execPath, [".githooks/check-architecture.mjs"], o, name));

  // Brief scope gate: at commit time the local state; elsewhere (push, CI, verify) each commit of the branch, through its trailer.
  add("scope-gate", T.scope, (o, name) => {
    o.beforeRun?.(name);
    const r = checkScope(root, { cfg, staged, env });
    const output = r.problems.map((p) => `  ${r.status === "fail" ? "✗" : "⚠"} ${p}`).join("\n");
    if (output && o.stdio !== "pipe") console.log(output);
    return { status: r.status, message: r.message, detail: r.detail, configured: r.configured, output };
  });

  add("main-branch", T.branch, () => mainBranchVerdict(root, env, T));

  const selfTests = () => {
    if (!full) return { status: "not-applicable", detail: T.minimalMode };
    const dir = join(root, ".githooks");
    const tests = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".test.mjs")) : [];
    // These tests try drwil's code: an equipped project does not receive them.
    if (!tests.length) return { status: "not-applicable", detail: T.noTests };
    if (docsOnly) return { status: "not-run", detail: T.docsOnly };
    return { args: ["--test", ...tests.map((f) => join(".githooks", f))] };
  };
  add(
    "checks-self-test",
    T.selfTests,
    (o, name) => {
      const t = selfTests();
      return t.args ? launch(process.execPath, t.args, o, name) : t;
    },
    async (name) => {
      const t = selfTests();
      return t.args ? launchAsync(process.execPath, t.args, {}, name) : t;
    },
  );

  add("ci-coverage", T.ciCoverage, (o, name) => {
    if (!full) return { status: "not-applicable", detail: T.minimalMode };
    const ciFiles = Array.isArray(cfg.ciFiles) ? cfg.ciFiles : [];
    if (!ciFiles.length) return { status: "not-run", detail: T.noCi, configured: true };
    return launch(process.execPath, [".githooks/check-control-coverage.mjs"], o, name);
  });

  // Stack checks (lint, typecheck, tests) are declared by the project. At pre-commit only (`staged` given), a check declaring `paths`
  // is deferred if no staged file matches: it stays "not run" (QUA-013), and the pre-push as well as CI replay it.
  for (const c of Array.isArray(cfg.checks) ? cfg.checks : []) {
    const name = c.name ?? c.run;
    const skipped = () => {
      if (docsOnly) return { status: "not-run", detail: T.docsOnly };
      if (staged && Array.isArray(c.paths) && c.paths.length) {
        const patterns = c.paths.map(globToRegex);
        if (!staged.some((f) => patterns.some((p) => p.test(f)))) return { status: "not-run", detail: T.deferred };
      }
      return null;
    };
    const cwd = c.cwd ? join(root, c.cwd) : root;
    list.push({
      id: c.id ?? `project:${name}`,
      name,
      // QUA-141: what the check declares, for its own fingerprint (a project check only).
      declaration: JSON.stringify([c, c.needsBuild ? cfg.build : null]),
      paths: Array.isArray(c.paths) && c.paths.length ? c.paths : null,
      run: (o = {}) => skipped() ?? (c.needsBuild ? build(name, o) : null) ?? launch(c.run, [], { ...o, shell: true, cwd }, name),
      ...(parallel && c.parallel !== false
        ? {
            runAsync: async () =>
              skipped() ?? (c.needsBuild ? await buildAsync(name) : null) ?? launchAsync(c.run, [], { shell: true, cwd }, name),
          }
        : {}),
    });
  }
  // QUA-136: a check that ran reports `durationMs` (whole ms, its own on a parallel pass); not-run and not-applicable have none, never 0.
  const timed = (fn) => (o) => {
    const start = performance.now();
    const end = (r) => (r.status.startsWith("not-") ? r : { ...r, durationMs: Math.round(performance.now() - start) });
    const r = fn(o);
    return r instanceof Promise ? r.then(end) : end(r);
  };
  for (const c of list) for (const k of ["run", "runAsync"]) if (c[k]) c[k] = timed(c[k]);
  // QUA-140: `reuse: false` in the project's check declares it always replayed (it reads the network, the forge, the clock).
  const declared = Array.isArray(cfg.checks) ? cfg.checks : [];
  // QUA-141: a check is also reused on its own (`perControl`) when it declares `paths` and neither `reuse: false` nor `reuse: "tree"`.
  for (const c of list) {
    const reuse = declared.find((d) => (d.id ?? `project:${d.name ?? d.run}`) === c.id)?.reuse;
    c.reuse = reuse !== false;
    c.perControl = c.reuse && reuse !== "tree" && Array.isArray(c.paths);
  }
  list.fingerprints = () => controlFingerprints(root, list);
  list.finish = finish;
  return list;
}

/**
 * Starts the `runAsync` of the checks that have one, in list order, at most `limit` at a time (by default half the cores, two at
 * least: the suites a check launches are parallel themselves): returns a Map id → Promise of the result. The caller reads them in
 * the list order, so the report is the one of a sequential run.
 */
export function startParallel(list, limit = Math.max(2, availableParallelism() >> 1)) {
  const waiting = new Map();
  const pending = list.filter((c) => c.runAsync);
  for (const c of pending) waiting.set(c.id, Promise.withResolvers());
  let active = 0;
  const next = () => {
    while (active < Math.max(1, limit) && pending.length) {
      const c = pending.shift();
      const { resolve, reject } = waiting.get(c.id);
      active++;
      c.runAsync()
        .then(resolve, reject)
        .finally(() => {
          active--;
          next();
        });
    }
  };
  next();
  return new Map([...waiting].map(([id, d]) => [id, d.promise]));
}
