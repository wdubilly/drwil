// `drwil verify --failed` (QUA-159): replays only the contracts that were not PASS or ATTESTED at the last
// evidence, through the `only` option `drwil attest` already uses. The verdict is partial: the contracts left
// out are not judged (QUA-013), so it is never a PASS and writes no evidence.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { verify } from "./verify.js";
import { loadProject } from "./verify-project.js";
import type { PartialRun, Verdict, VerifyOptions } from "./verify-types.js";

const EVIDENCE_DIR = [".drwil", "evidence"];

/** Status of each contract at the last evidence (verify-*.json, name = timestamp); null if none is readable. */
function lastEvidence(root: string): { file: string; status: Map<string, string> } | null {
  const dir = join(root, ...EVIDENCE_DIR);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => /^verify-.+\.json$/.test(f))
    .sort()
    .reverse();
  for (const f of files) {
    try {
      const results: { id: string; status: string }[] = JSON.parse(readFileSync(join(dir, f), "utf8")).results;
      const status = new Map(results.map((r) => [r.id, r.status]));
      if (status.size) return { file: [...EVIDENCE_DIR, f].join("/"), status };
    } catch {}
  }
  return null;
}

export async function verifyFailed(opts: VerifyOptions): Promise<Verdict> {
  const project = await loadProject(opts.targetDir);
  // A project verify cannot load: verify says why, whatever the option.
  if (typeof project === "string") return verify(opts);
  const ids = project.contracts
    .readContracts(readFileSync(join(opts.targetDir, project.registry), "utf8"))
    .map((k: { id: string }) => k.id);
  const last = lastEvidence(opts.targetDir);
  const partial: PartialRun = { previous: last?.file ?? null, replayed: [], manual: [], skipped: 0 };
  if (last)
    for (const id of ids) {
      const s = last.status.get(id);
      if (s === "pass" || s === "attested") partial.skipped++;
      else if (s === "manual") partial.manual.push(id);
      else partial.replayed.push(id);
    }
  const v = await verify({ ...opts, only: partial.replayed });
  // Never a success exit code: a partial verdict proves nothing about the contracts it did not replay.
  if (v.code === 0) v.code = 1;
  return { ...v, partial };
}
