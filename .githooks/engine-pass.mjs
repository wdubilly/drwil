// Temporary root of a pass of checks (QUA-133), split from engine.mjs.
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

// One temporary root per pass (QUA-133): each check gets its own sub-folder as TMPDIR/TMP/TEMP, removed at the end of the pass; the
// failed checks' folders move to a fixed path, replaced at each failure. A pass dying before `finish` is cleaned by the `exit` handler.
const passes = new Set();
let exitHooked = false;
const hookExit = () => {
  if (exitHooked) return;
  exitHooked = true;
  process.on("exit", () => {
    for (const finish of [...passes]) finish();
  });
};
const removeTree = (dir) => {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    return true;
  } catch {
    return false;
  }
};

/** The temporary folders of one pass: `tempFor` a check, `settle` its verdict, `finish` the pass. */
export function createPass(root, env) {
  const base = env.TMPDIR || tmpdir();
  const failedPath = join(base, `drwil-checks-failed-${createHash("sha1").update(root).digest("hex").slice(0, 8)}`);
  let passRoot = null;
  let sequence = 0;
  const launches = [];
  const tempFor = (name) => {
    try {
      if (!passRoot) {
        passRoot = mkdtempSync(join(base, "drwil-checks-"));
        passes.add(finish);
        hookExit();
      }
      const dir = join(
        passRoot,
        `${++sequence}-${String(name)
          .replace(/[^\w.-]+/g, "_")
          .slice(0, 40)}`,
      );
      mkdirSync(dir);
      const temp = { name, dir, failed: false, leaked: 0 };
      launches.push(temp);
      return temp;
    } catch {
      return null; // no temporary root: the check keeps the inherited one, as before
    }
  };
  const settle = (temp, ok) => {
    if (!temp) return {};
    temp.failed = !ok;
    try {
      temp.leaked = readdirSync(temp.dir).length;
    } catch {}
    return temp.leaked ? { leaked: temp.leaked } : {};
  };
  // Ends the pass: counts what the checks left, keeps the failed ones' folders, removes the rest.
  function finish() {
    passes.delete(finish);
    const result = {
      kept: null,
      leaks: launches.filter((l) => l.leaked).map((l) => ({ name: l.name, count: l.leaked })),
      cleanupFailed: false,
    };
    if (!passRoot) return result;
    const failed = launches.filter((l) => l.failed);
    if (failed.length) {
      removeTree(failedPath);
      try {
        mkdirSync(failedPath);
        for (const l of failed) renameSync(l.dir, join(failedPath, basename(l.dir)));
        result.kept = failedPath;
      } catch {}
    }
    result.cleanupFailed = !removeTree(passRoot);
    passRoot = null;
    launches.length = 0;
    return result;
  }
  return { tempFor, settle, finish };
}
