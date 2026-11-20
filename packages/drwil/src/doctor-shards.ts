// Point « Contrôle lent non découpé » of `drwil doctor` (QUA-089, catalog:QUA-020): an `e2e` check of a tool of the kit's table
// (guarantees-e2e-tools.ts, the single source) declared without `shards` or with a fixed N gets the `"auto"` declaration. `--fix`
// sets it, whoever wrote the check: the kit never wrote a fixed N, so an unsliced check is always hand-written.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { e2eDeclaration, e2eToolOf } from "./guarantees-e2e-tools.js";
import { TEXTS } from "./doctor-texts.js";
import { fill, type MessageLang } from "./i18n.js";
import { loadProject } from "./verify-project.js";
import type { DiagnosisPoint } from "./doctor.js";

type Check = { id?: unknown; run?: unknown; cwd?: unknown; shards?: unknown; [field: string]: unknown };

export interface ShardsProposal {
  tool: string;
  /** Configuration file of the tool, from the root of the project. */
  config: string;
  /** The fields to set on the check: always `shards` and `shardsCount`, `run` too when it does not read the slice variables. */
  fields: Record<string, string>;
}

/** What `--fix` set on the `e2e` check: the proposal, and the former value of each field it replaced. */
export interface ShardsFix extends ShardsProposal {
  replaced: Record<string, unknown>;
}

/** What to set on an unsliced `e2e` check of a tool of the table; `null` when already `"auto"`, or when the tool is not in the table. */
export function shardsProposal(root: string, check: Check): ShardsProposal | null {
  if (check.shards === "auto") return null;
  const layer = typeof check.cwd === "string" ? check.cwd : ".";
  const found = e2eToolOf(root, layer);
  if (!found) return null;
  const kit = e2eDeclaration(found.tool, found.config, layer);
  const fields: Record<string, string> = { shards: "auto", shardsCount: kit.shardsCount as string };
  if (typeof check.run !== "string" || !check.run.includes("DRWIL_SHARD_INDEX")) fields.run = kit.run as string;
  return { tool: found.tool.tool, config: layer === "." ? found.config : `${layer}/${found.config}`, fields };
}

const e2eOf = (checks: unknown) =>
  (Array.isArray(checks) ? checks : []).find((c): c is Check => !!c && typeof c === "object" && c.id === "e2e");

/** `--fix`: sets the proposal on the `e2e` check of `.drwil/ia-first.json`, its other fields kept; `null` (nothing written) otherwise. */
export async function fixShards(root: string): Promise<ShardsFix | null> {
  if (typeof (await loadProject(root)) === "string") return null;
  const file = join(root, ".drwil", "ia-first.json");
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const e2e = e2eOf(raw.checks);
  const proposal = e2e ? shardsProposal(root, e2e) : null;
  if (!e2e || !proposal) return null;
  const replaced: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(proposal.fields)) {
    if (k in e2e) replaced[k] = e2e[k];
    e2e[k] = v;
  }
  writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`);
  return { ...proposal, replaced };
}

const listed = (fields: Record<string, unknown>) =>
  Object.entries(fields)
    .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(", ");

/** Point `e2e-shards`: what `--fix` set (`fixed`), else a warning when the `e2e` check of a tool of the table is not `"auto"`. */
export function shardsPoints(root: string, checks: unknown, lang: MessageLang, fixed: ShardsFix | null = null): DiagnosisPoint[] {
  const T = TEXTS[lang];
  // On a pull request, the aggregation compares N with the main branch's (D6 iv): a fixed N moving to "auto" must be declared.
  if (fixed) {
    const fields = Object.keys(fixed.fields)
      .map((k) => `"${k}"`)
      .join(", ");
    const detail = fill(T.slicedDetail, fixed.tool, fixed.config, fields, listed(fixed.replaced) || T.slicedNone);
    const wasFixed = "shards" in fixed.replaced;
    return [{ id: "e2e-shards", label: T.sliced, state: wasFixed ? "warning" : "ok", detail: wasFixed ? detail + T.shardsPr : detail }];
  }
  const e2e = e2eOf(checks);
  const proposal = e2e ? shardsProposal(root, e2e) : null;
  if (!e2e || !proposal) return [];
  const detail =
    e2e.shards === undefined
      ? fill(T.unslicedDetail, proposal.tool, proposal.config, listed(proposal.fields))
      : `${fill(T.fixedDetail, proposal.tool, proposal.config, String(e2e.shards), listed(proposal.fields))}${T.shardsPr}`;
  return [{ id: "e2e-shards", label: T.unsliced, state: "warning", detail }];
}
