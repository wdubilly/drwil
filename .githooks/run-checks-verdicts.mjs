// Verdicts left by a pass and reused by the next one (QUA-140, QUA-141, QUA-152, QUA-250), split from run-checks.mjs.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { treeFingerprint } from "./engine.mjs";
import { prContext } from "./run-checks-pr.mjs";

const VERDICTS = ".drwil/evidence/run-checks-verdicts.json";
const PREPUSH = ".drwil/evidence/pre-push-verdicts.json";
const PR_WRITTEN = ".drwil/evidence/pr-verdicts";
const PR_PREVIOUS = ".drwil/evidence/pr-previous";
const SHA = /^[0-9a-f]{40,64}$/;
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

// A slow check is a sharded one, or one that took the project's threshold (a minute by default) the pass that played it.
const slow = (c, v) => c.sharded || v.durationMs >= Number(process.env.DRWIL_PR_SLOW_MS ?? 60000);
const isAncestor = (older, head) => spawnSync("git", ["merge-base", "--is-ancestor", older, head], { stdio: "ignore" }).status === 0;

// QUA-152: at push time the pre-push judges the working tree, so it only reuses when that tree is the pushed commit: a clean tree, and the
// one pushed reference is the current branch (the hook gives remote references only: any other push is replayed in full).
function pushedTreeIsWorkTree() {
  const git = (...a) => spawnSync("git", a, { encoding: "utf8" });
  const branch = git("symbolic-ref", "--short", "-q", "HEAD");
  const status = git("status", "--porcelain");
  const pushed = process.env.DRWIL_PUSH_REFS.trim();
  return branch.status === 0 && status.status === 0 && status.stdout.trim() === "" && pushed === `refs/heads/${branch.stdout.trim()}`;
}

// QUA-250: in CI, reuse only when the CI asks for it (a pull request, on the verdicts file restored from the main branch's last CI,
// which only a push on the main branch writes): a pull request never reads a verdict it could have written itself.
const ciReuseAsked = () => process.env.DRWIL_CI_REUSE === "1";

const readVerdicts = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8")).checks ?? {};
  } catch {
    return {};
  }
};

/**
 * The verdicts the previous pass of this same pull request left (`.drwil/evidence/pr-previous`, downloaded by the CI), Map id → verdict.
 * Every doubt replays (QUA-013): sum of the file not matching, another pull request or run, a verdict of another fingerprint (QUA-141) or
 * base, a commit that is not an ancestor of this head (a rewritten history), a check that is not slow or not "ok".
 */
export function loadPrVerdicts(list, controls) {
  const ctx = prContext();
  const kept = new Map();
  let text;
  let sum;
  try {
    text = readFileSync(`${PR_PREVIOUS}/pr-verdicts.json`, "utf8");
    sum = readFileSync(`${PR_PREVIOUS}/pr-verdicts.sum`, "utf8").trim();
  } catch {}
  if (!ctx || !text || sum !== sha256(text)) return kept;
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    return kept;
  }
  if (file?.identity?.id !== ctx.id || (ctx.previousRun !== undefined && String(file.identity.run) !== ctx.previousRun)) return kept;
  for (const c of list) {
    const v = file.checks?.[c.id];
    const control = controls.get(c.id);
    const sound = v?.status === "ok" && v.reusable !== false && c.perControl && control && v.control === control && v.base === ctx.base;
    if (sound && slow(c, v) && SHA.test(v.head) && isAncestor(v.head, ctx.head)) kept.set(c.id, v);
  }
  return kept;
}

/** Ids of the sharded checks the previous pass of this pull request already settled: the plan of the CI plays no slice for them. */
export const prCovered = (list) => new Set(loadPrVerdicts(list, list.fingerprints()).keys());

// The "ok" verdicts of the slow checks of this pass, with the commit that played them, for the next pass of the same pull request.
function savePrVerdicts(list, verdicts) {
  const ctx = prContext();
  if (!ctx) return;
  const checks = {};
  for (const [id, v] of Object.entries(verdicts)) {
    const c = list.find((x) => x.id === id);
    if (v.status === "ok" && v.reusable !== false && v.control && c.perControl && slow(c, v))
      checks[id] = { ...v, head: v.head ?? ctx.head, base: ctx.base, run: v.run ?? ctx.run };
  }
  const text = JSON.stringify({ identity: { id: ctx.id, run: ctx.run }, checks }, null, 2);
  try {
    mkdirSync(PR_WRITTEN, { recursive: true });
    writeFileSync(`${PR_WRITTEN}/pr-verdicts.json`, text);
    writeFileSync(`${PR_WRITTEN}/pr-verdicts.sum`, sha256(text));
  } catch {}
}

/** Reuse of the last pass: `{ prePush, controls, reuseActive, keptFrom }`, `keptFrom` mapping the id of each reused check to its kept verdict. */
export function loadReuse(list, { hooked, atCommit, replayAll }) {
  const prePush = Boolean(process.env.DRWIL_PUSH_REFS) && !atCommit && !process.env.CI && !replayAll && pushedTreeIsWorkTree();
  const controls = hooked && !prePush ? new Map() : list.fingerprints();
  const files = prePush
    ? [
        [VERDICTS, "run-checks"],
        [PREPUSH, "pre-push"],
      ]
    : [[VERDICTS, "run-checks"]];
  const sources = files.map(([f, name]) => [readVerdicts(f), name]);
  const reuseActive = (!hooked || prePush) && (!process.env.CI || ciReuseAsked()) && !replayAll;
  // The verdict to keep for a check: an "ok" of a source whose own fingerprint is the current one.
  function lastOf(c) {
    if (!reuseActive || !c.perControl || !controls.get(c.id)) return null;
    for (const [m, name] of sources) {
      const v = m[c.id];
      if (v?.status === "ok" && v.reusable !== false && v.control === controls.get(c.id)) return { v, name };
    }
    return null;
  }
  const pr = reuseActive ? loadPrVerdicts(list, controls) : new Map();
  const keptFrom = new Map(
    list
      .map((c) => [c.id, lastOf(c) ?? (pr.has(c.id) ? { v: pr.get(c.id), name: `PR run ${pr.get(c.id).run}` } : null)])
      .filter(([, k]) => k),
  );
  return { prePush, controls, reuseActive, keptFrom };
}

/**
 * Writes the verdicts of this pass (and, at push time, the pre-push ones). A tree changed during the pass (a check writing a file…)
 * leaves no tree fingerprint, a check whose files changed no check fingerprint (the verdicts were not taken on one tree): what is left
 * of neither is not written. Only the checks played in this pass are in the whole-tree fingerprint (`played`): a verdict kept from the
 * last pass carries its own fingerprint only (QUA-141).
 */
export function saveVerdicts({ root, list, verdicts, reused, fingerprint, ranAt, hooked, prePush }) {
  if (!hooked) {
    const after = list.fingerprints();
    const stable = Boolean(fingerprint) && treeFingerprint(root) === fingerprint;
    for (const [id, v] of Object.entries(verdicts)) if (v.control && after.get(id) !== v.control) v.control = null;
    const played = Object.keys(verdicts).filter((id) => !reused.has(id));
    if (stable || Object.values(verdicts).some((v) => v.control)) {
      try {
        mkdirSync(".drwil/evidence", { recursive: true });
        writeFileSync(
          VERDICTS,
          JSON.stringify({ ranAt, fingerprint: stable ? fingerprint : null, played: stable ? played : [], checks: verdicts }, null, 2),
        );
      } catch {}
    }
  }
  if (!hooked) savePrVerdicts(list, verdicts);
  if (prePush) {
    const after = list.fingerprints();
    const ok = Object.entries(verdicts).filter(([id, v]) => v.status === "ok" && v.control && after.get(id) === v.control);
    try {
      mkdirSync(".drwil/evidence", { recursive: true });
      writeFileSync(PREPUSH, JSON.stringify({ ranAt, checks: Object.fromEntries(ok) }, null, 2));
    } catch {}
  }
}
