// QUA-140, QUA-141: fingerprints of what the checks judge, split from engine.mjs (which re-exports them) to keep it under the size cap.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { matchPaths } from "./glob.mjs";

/** QUA-141: scheme of the per-check fingerprint; an update from a kit without this marker says its first pass replays every check. */
export const FINGERPRINT_SCHEME = 2;
const CONFIG = ".drwil/ia-first.json";

/** QUA-141: what a check reads of the configuration: every setting but the checks' declarations (its own is in its declaration); null if unreadable. */
export function configView(text) {
  try {
    const settings = JSON.parse(text);
    delete settings.checks;
    return JSON.stringify(settings);
  } catch {
    return null;
  }
}

/** A check that reads the other checks' declarations (`readsChecks: true`), or the engine's own one, judges the whole configuration. */
const readsChecks = (c) => {
  const d = JSON.parse(c.declaration)[0];
  return typeof d !== "object" || d.readsChecks === true;
};

/**
 * QUA-141, at pre-commit: (staged file, check declaration) → whether that file changes what the check reads. The staged configuration
 * does only if a setting, the check's own declaration, or (`readsChecks`) any byte changed since HEAD; without HEAD, always.
 */
export function stagedConfig(root) {
  const show = (rev) => spawnSync("git", ["show", `${rev}:${CONFIG}`], { cwd: root, encoding: "utf8", maxBuffer: 1 << 30 });
  const [before, after] = [show("HEAD"), show("")];
  const view = before.status === 0 && after.status === 0 && configView(before.stdout);
  const kept = typeof view === "string" && view === configView(after.stdout);
  const declared = new Set(kept ? [].concat(JSON.parse(before.stdout).checks).map((d) => JSON.stringify(d)) : []);
  return (f, c) => f !== CONFIG || c.readsChecks === true || !declared.has(JSON.stringify(c));
}

/**
 * QUA-140: fingerprint of what a check judges (commit, branch, uncommitted changes incl. untracked files not ignored, local state,
 * configuration; not the evidence files of the pass itself): one byte of difference changes it. `null` if git does not answer: nothing is then reusable.
 */
export function treeFingerprint(root) {
  try {
    const git = (...args) => spawnSync("git", args, { cwd: root, maxBuffer: 1 << 30 });
    const h = createHash("sha256");
    const part = (b) => h.update(`${Buffer.byteLength(b)}:`).update(b);
    const outs = [
      "rev-parse HEAD",
      "symbolic-ref -q HEAD",
      "diff HEAD --binary --no-ext-diff",
      "ls-files -o --exclude-standard -z -- :(exclude,glob).drwil/evidence/*",
    ].map((a) => git(...a.split(" ")));
    if (outs.some((r, i) => r.status !== 0 && i !== 1)) return null;
    for (const r of outs) part(r.stdout);
    const read = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f)) : "");
    for (const f of outs[3].stdout.toString().split("\0").filter(Boolean)) part(read(f));
    for (const f of [".drwil/ia-first.json", ".drwil/state.json"]) part(read(f));
    return h.digest("hex");
  } catch {
    return null;
  }
}

/**
 * QUA-141: fingerprint of what ONE check judges — its declaration, this engine and the content of the files its `paths` match
 * (tracked, and untracked not ignored; not the evidence of the pass), `.drwil/ia-first.json` through `configView` unless the check
 * reads the other checks' declarations: one byte of difference changes it, a check added to the configuration does not. A Map id → fingerprint of the
 * `list` entries that declare `paths` (and are not `reuse: false` or `reuse: "tree"`); `null` for every other one, for a check whose
 * `paths` match no file and for one a file of which is unreadable: nothing is then reusable for it. A check that reads a file its `paths`
 * omit would be reused wrongly: the project declares it `reuse: "tree"` (fingerprint of the whole tree only) or completes its `paths`.
 */
export function controlFingerprints(root, list) {
  const out = new Map(list.map((c) => [c.id, null]));
  const wanted = list.filter((c) => c.perControl);
  if (!wanted.length) return out;
  const r = spawnSync("git", ["ls-files", "-c", "-o", "--exclude-standard", "-z"], { cwd: root, maxBuffer: 1 << 30 });
  if (r.status !== 0) return out;
  const files = r.stdout
    .toString()
    .split("\0")
    .filter((f) => f && !f.startsWith(".drwil/evidence/"))
    .sort();
  const dir = dirname(fileURLToPath(import.meta.url));
  const engineFiles = readdirSync(dir)
    .filter((n) => /^engine(-[\w-]+)?\.mjs$/.test(n))
    .sort();
  const engineHash = createHash("sha256").update(readFileSync(fileURLToPath(import.meta.url)));
  for (const n of engineFiles) engineHash.update(readFileSync(join(dir, n)));
  const engine = engineHash.digest("hex");
  const hashes = new Map();
  const hashOf = (f, whole) => {
    const key = whole ? f : `${f}\0settings`;
    if (!hashes.has(key)) {
      try {
        const bytes = readFileSync(join(root, f));
        hashes.set(
          key,
          createHash("sha256")
            .update(whole ? bytes : (configView(bytes.toString()) ?? bytes))
            .digest("hex"),
        );
      } catch (e) {
        hashes.set(key, e.code === "ENOENT" ? "-" : null);
      }
    }
    return hashes.get(key);
  };
  for (const c of wanted) {
    const inPaths = matchPaths(c.paths);
    const h = createHash("sha256").update(`${engine}\0${c.declaration}\0`);
    let judged = 0;
    for (const f of files) {
      if (!inPaths(f)) continue;
      const hash = hashOf(f, f !== CONFIG || readsChecks(c));
      if (hash === null) {
        judged = 0;
        break;
      }
      judged++;
      h.update(`${f}\0${hash}\n`);
    }
    if (judged) out.set(c.id, h.digest("hex"));
  }
  return out;
}
