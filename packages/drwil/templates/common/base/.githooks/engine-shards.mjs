// Slices of a slow check (`shards: N` in its declaration), split from engine.mjs: validation of the setting, variables given to the
// command, and the aggregation of the slices' verdicts. A slice divides the work, never the requirement: a check that lacks a slice,
// has a failed one, or one of another commit or fingerprint is not passed (QUA-013).
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { declarations } from "./base-checks.mjs";

export const SHARD_MAX = 16;
export const SHARDS_DIR = ".drwil/evidence/shards";

const isSharded = (c) => c.shards !== undefined;

/** The problem of a declaration (message), or null: a check that ignored the variables would play the whole check N times. */
export function shardProblem(c, name, T) {
  if (!isSharded(c)) return null;
  if (!Number.isInteger(c.shards) || c.shards < 2 || c.shards > SHARD_MAX) return T.shardsRange(name, SHARD_MAX);
  if (c.reuse === "tree") return T.shardsTree(name);
  if (typeof c.run !== "string" || !c.run.includes("DRWIL_SHARD_INDEX")) return T.shardsNoVariable(name);
  return null;
}

/**
 * Matrix of the CI's slices (`--shard-plan`): `include` lists `{ index, total }`, `problems` refuses a declaration or several totals (one pass
 * per total is not planned). No slice is planned when `covered` (ids) holds every sharded check: the pull request's previous pass settled them.
 */
export function shardMatrix(cfg, T, covered = new Set()) {
  const sharded = (Array.isArray(cfg.checks) ? cfg.checks : []).filter(isSharded);
  const problems = sharded.map((c) => shardProblem(c, c.name ?? c.run, T)).filter(Boolean);
  const totals = [...new Set(sharded.map((c) => c.shards))];
  if (totals.length > 1) problems.push(T.shardsSeveral(totals.join(", ")));
  const total = covered.size && sharded.every((c) => covered.has(c.id ?? `project:${c.name ?? c.run}`)) ? 0 : (totals[0] ?? 0);
  return { include: problems.length ? [] : Array.from({ length: total }, (_, i) => ({ index: i + 1, total })), problems };
}

/**
 * Options of run-checks: null (a single pass), `{ index, total }` (`--shard i/N`), `{ without: true, aggregate }` (`--without-shards`,
 * `--aggregate-shards <dir>`, which implies it) or `{ error: true }`.
 */
export function parseShardArgs(argv) {
  const value = (flag) => {
    const i = argv.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (i < 0) return undefined;
    return argv[i].includes("=") ? argv[i].slice(flag.length + 1) : (argv[i + 1] ?? "");
  };
  const slice = value("--shard");
  const aggregate = value("--aggregate-shards");
  const without = argv.includes("--without-shards");
  if (slice === undefined && aggregate === undefined && !without) return null;
  if (slice === undefined) return aggregate === "" ? { error: true } : { without: true, aggregate: aggregate ?? null };
  const m = /^(\d+)\/(\d+)$/.exec(slice);
  const [index, total] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
  if (aggregate !== undefined || without || index < 1 || index > total || total > SHARD_MAX) return { error: true };
  return { index, total };
}

/**
 * What the engine does with a check declaring `shards` under the option `shard`: `{ skip }` (a function giving the result instead of
 * running it) or `{ env }` (the environment of its command). Without option, one single pass: slice 1 of 1 (never the variables absent).
 */
export function shardPlan(c, shard, { env, root, list, id, name, T, cfg }) {
  if (!isSharded(c)) return null;
  const fingerprint = () => list.fingerprints().get(id);
  const problem = shardProblem(c, name, T);
  if (problem) return { skip: () => ({ status: "fail", message: problem }) };
  if (shard?.without) {
    if (shard.aggregate) return { skip: () => aggregateShards({ root, dir: shard.aggregate, c, id, name, fingerprint, T, env, cfg }) };
    return { skip: () => ({ status: "not-applicable", detail: T.shardsEntrusted }) };
  }
  const [index, total] = shard ? [shard.index, shard.total] : [1, 1];
  if (shard && total !== c.shards) return { skip: () => ({ status: "fail", message: T.shardsMismatch(name, total, c.shards) }) };
  return { env: { ...env, DRWIL_SHARD_INDEX: String(index), DRWIL_SHARD_TOTAL: String(total) } };
}

/** In a pass of one slice, only the checks declaring `shards` are kept (in place: the list carries `fingerprints` and `finish`). */
export function keepSharded(list) {
  list.splice(0, list.length, ...list.filter((c) => c.sharded));
}

function jsonFiles(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? jsonFiles(join(dir, e.name)) : /\.json$/.test(e.name) ? [join(dir, e.name)] : [],
    );
  } catch {
    return [];
  }
}

/** The result of an aggregated check: "ok" only if its N slices, all of this commit and this fingerprint, are "ok" and none is missing or doubled. */
export function aggregateShards({ root, dir, c, id, name, fingerprint, T, env = {}, cfg = {}, commit = gitCommit(root) }) {
  const mine = [];
  const problems = [];
  for (const file of jsonFiles(join(root, dir))) {
    let v;
    try {
      v = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      problems.push(T.shardsUnreadable(file));
      continue;
    }
    if (v?.check === id) mine.push(v);
  }
  const control = fingerprint();
  const seen = new Set();
  for (const v of mine) {
    const at = `${v.index}/${v.total}`;
    if (seen.has(v.index)) problems.push(T.shardsDuplicate(at));
    seen.add(v.index);
    if (v.total !== c.shards || !Number.isInteger(v.index) || v.index < 1 || v.index > c.shards) problems.push(T.shardsTotal(at, c.shards));
    if (!commit || v.commit !== commit) problems.push(T.shardsCommit(at));
    if (v.control !== control) problems.push(T.shardsControl(at));
    if (v.status !== "ok") problems.push(T.shardsFailed(at));
  }
  for (let i = 1; i <= c.shards; i++) if (!seen.has(i)) problems.push(T.shardsMissing(`${i}/${c.shards}`));
  const base = againstBase({ root, c, id, name, env, cfg, T });
  if (base?.problem) problems.push(base.problem);
  if (!problems.length) return { status: "ok", ...(base?.note ? { output: `[ia-first-warning] ${base.note}` } : {}) };
  return { status: "fail", message: T.shardsAggregate(name), output: problems.map((p) => `  ✗ ${p}`).join("\n") };
}

/**
 * D6 (iv): on a pull request, N is compared to the one the main branch declares for the check, so that a branch lowering it cannot lose
 * files; a change declared in a « Contrats modifiés » section of the branch is accepted. Without a declaration on the main branch, the
 * branch's N is the only one and the aggregation says so (`note`).
 */
function againstBase({ root, c, id, name, env, cfg, T }) {
  const branch = env.GITHUB_BASE_REF || env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
  if (!branch) return null;
  const ref = `origin/${branch}`;
  let base;
  try {
    const shown = spawnSync("git", ["show", `${ref}:.drwil/ia-first.json`], { cwd: root, encoding: "utf8" });
    base = JSON.parse(shown.stdout).checks.find((b) => (b.id ?? `project:${b.name}`) === id);
  } catch {}
  if (!isSharded(base ?? {})) return { note: T.shardsNoBase(name) };
  if (base.shards === c.shards) return null;
  try {
    if (declarations(root, ref, cfg.dirs?.projects ?? "docs/projects").has(String(c.id ?? c.name))) return null;
  } catch {}
  return { problem: T.shardsBase(name, base.shards, c.shards) };
}

export function gitCommit(root) {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}
