// Verdicts left by a pass and reused by the next one (QUA-140, QUA-141, QUA-152), split from run-checks.mjs.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { treeFingerprint } from "./engine.mjs";

const VERDICTS = ".drwil/evidence/run-checks-verdicts.json";
const PREPUSH = ".drwil/evidence/pre-push-verdicts.json";

// QUA-152: at push time the pre-push judges the working tree, so it only reuses when that tree is the pushed commit: a clean tree, and the
// one pushed reference is the current branch (the hook gives remote references only: any other push is replayed in full).
function pushedTreeIsWorkTree() {
  const git = (...a) => spawnSync("git", a, { encoding: "utf8" });
  const branch = git("symbolic-ref", "--short", "-q", "HEAD");
  const status = git("status", "--porcelain");
  const pushed = process.env.DRWIL_PUSH_REFS.trim();
  return branch.status === 0 && status.status === 0 && status.stdout.trim() === "" && pushed === `refs/heads/${branch.stdout.trim()}`;
}

const readVerdicts = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8")).checks ?? {};
  } catch {
    return {};
  }
};

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
  const reuseActive = (!hooked || prePush) && !process.env.CI && !replayAll;
  // The verdict to keep for a check: an "ok" of a source whose own fingerprint is the current one.
  function lastOf(c) {
    if (!reuseActive || !c.perControl || !controls.get(c.id)) return null;
    for (const [m, name] of sources) {
      const v = m[c.id];
      if (v?.status === "ok" && v.reusable !== false && v.control === controls.get(c.id)) return { v, name };
    }
    return null;
  }
  const keptFrom = new Map(list.map((c) => [c.id, lastOf(c)]).filter(([, k]) => k));
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
  if (prePush) {
    const after = list.fingerprints();
    const ok = Object.entries(verdicts).filter(([id, v]) => v.status === "ok" && v.control && after.get(id) === v.control);
    try {
      mkdirSync(".drwil/evidence", { recursive: true });
      writeFileSync(PREPUSH, JSON.stringify({ ranAt, checks: Object.fromEntries(ok) }, null, 2));
    } catch {}
  }
}
