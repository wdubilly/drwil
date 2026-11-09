// Slices in run-checks.mjs (engine-shards.mjs): reading of the options, and the verdict file each slice leaves for the aggregation.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { texts } from "./engine-texts.mjs";
import { gitCommit, parseShardArgs, shardMatrix, SHARDS_DIR } from "./engine-shards.mjs";

/**
 * `--shard i/N`, `--without-shards`, `--aggregate-shards <dir>`: the options for `checks()`, or exit 2 on a malformed one.
 * `--shard-plan` plays nothing: it prints the matrix of the slices the CI plays (`{"include":[{"index":1,"total":4}…]}`, empty without
 * sharded check), or exits 1 naming the declarations it refuses (a plan that cannot be read is no plan, QUA-013).
 */
export function shardOptions(argv, T, cfg = {}) {
  if (argv.includes("--shard-plan")) {
    const { include, problems } = shardMatrix(cfg, texts(cfg.lang === "en" ? "en" : "fr"));
    if (problems.length) console.error(problems.join("\n"));
    else console.log(JSON.stringify({ include }));
    process.exit(problems.length ? 1 : 0);
  }
  const shard = parseShardArgs(argv);
  if (!shard?.error) return shard;
  console.error(T.shardUsage);
  process.exit(2);
}

/**
 * Writes, for each check this slice played, its verdict (check, fingerprint, commit, index, total, status) in `SHARDS_DIR`, uploaded as an
 * artifact by the CI. A check that did not run leaves none: its slice is missing for the aggregation (QUA-013).
 */
export function writeShardVerdicts({ root, list, verdicts, shard }) {
  const controls = list.fingerprints();
  const commit = gitCommit(root);
  mkdirSync(join(root, SHARDS_DIR), { recursive: true });
  for (const [id, v] of Object.entries(verdicts)) {
    const verdict = {
      check: id,
      control: controls.get(id) ?? null,
      commit,
      index: shard.index,
      total: shard.total,
      status: v.status,
      ranAt: v.ranAt,
    };
    writeFileSync(
      join(root, SHARDS_DIR, `${id.replace(/[^\w.-]/g, "_")}.${shard.index}-of-${shard.total}.json`),
      JSON.stringify(verdict, null, 2),
    );
  }
}
