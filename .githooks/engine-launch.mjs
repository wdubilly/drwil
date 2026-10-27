// Launching of the checks' commands, split from engine.mjs: synchronous, asynchronous, and the shared build.
import { spawn, spawnSync } from "node:child_process";

/** `launch`, `launchAsync`, `build` and `buildAsync` of one `checks()` call, each check in its own temporary folder. */
export function createLaunchers({ root, env, cfg, T, pass }) {
  const { tempFor, settle } = pass;
  // NODE_TEST_CONTEXT propagates to children: under `node --test`, a `node --test` launched by a check would be silently skipped
  // ("called recursively") and return 0: a false PASS. QUA-057: a hook run from a worktree or by `git commit -a` receives GIT_DIR,
  // GIT_INDEX_FILE…; a check inheriting them that runs `git init` elsewhere would soil the launching repository: children lose them.
  const prepare = (opts, keepGit, temp) => {
    const checkEnv = { ...(opts.env ?? env), NODE_TEST_CONTEXT: undefined };
    if (temp) checkEnv.TMPDIR = checkEnv.TMP = checkEnv.TEMP = temp.dir;
    if (!keepGit) for (const k of Object.keys(checkEnv)) if (k.startsWith("GIT_")) delete checkEnv[k];
    return { cwd: root, encoding: "utf8", ...opts, env: checkEnv };
  };
  const launch = (cmd, args, { stdio = "inherit", beforeRun, keepGit = false, ...opts } = {}, name) => {
    beforeRun?.(name);
    const temp = tempFor(name);
    const r = spawnSync(cmd, args, { stdio, ...prepare(opts, keepGit, temp) });
    const output = stdio === "pipe" ? `${r.stdout ?? ""}${r.stderr ?? ""}` : undefined;
    // A command that cannot even start is a failure, as before the engine was extracted.
    if (r.error) return { status: "fail", detail: r.error.message, output, ...settle(temp, false) };
    return { status: r.status === 0 ? "ok" : "fail", output, ...settle(temp, r.status === 0) };
  };
  // Same verdict as `launch`, without blocking: output always captured (`launched`: the command did start).
  const launchAsync = (cmd, args, { keepGit = false, ...opts } = {}, name) =>
    new Promise((resolve) => {
      let output = "";
      let done = false;
      const temp = tempFor(name);
      const end = (r) => {
        if (!done) resolve({ ...r, output, launched: true, ...settle(temp, r.status === "ok") });
        done = true;
      };
      const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...prepare(opts, keepGit, temp) });
      for (const stream of [child.stdout, child.stderr]) stream.on("data", (d) => (output += d));
      child.on("error", (e) => end({ status: "fail", detail: e.message }));
      child.on("close", (code) => end({ status: code === 0 ? "ok" : "fail" }));
    });
  // The project is compiled once per run, by the first check that needs it (`needsBuild`); a failed build fails its dependents.
  let built;
  let buildReported = false;
  const buildVerdict = (name, r) => {
    if (r.status === "ok") return null;
    const output = buildReported ? undefined : r.output;
    buildReported = true;
    return { status: "fail", message: T.buildFailed(name), output, launched: output !== undefined };
  };
  const buildOpts = { shell: true };
  const build = (name, o) => {
    if (!cfg.build) return { status: "fail", message: T.buildMissing(name) };
    built ??= launch(cfg.build, [], { ...buildOpts, stdio: o.stdio }, "build");
    return buildVerdict(name, built);
  };
  const buildAsync = async (name) => {
    if (!cfg.build) return { status: "fail", message: T.buildMissing(name) };
    buildPending ??= built ? Promise.resolve(built) : launchAsync(cfg.build, [], buildOpts, "build");
    built = await buildPending;
    return buildVerdict(name, built);
  };
  let buildPending;
  return { launch, launchAsync, build, buildAsync };
}
