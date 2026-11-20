// Point « Contrôle lent non découpé » of `drwil doctor` (QUA-089, catalog:QUA-020): an `e2e` check of a tool of the kit's table
// (guarantees-e2e-tools.ts, the single source) declared without `shards` or with a fixed N gets the `"auto"` declaration to set.
// The kit only ever wrote `"auto"`: a check without it was written or modified by hand, so `--fix` never rewrites it (D1).
import { e2eDeclaration, e2eToolOf } from "./guarantees-e2e-tools.js";
import { TEXTS } from "./doctor-texts.js";
import { fill, type MessageLang } from "./i18n.js";
import type { DiagnosisPoint } from "./doctor.js";

type Check = { id?: unknown; run?: unknown; cwd?: unknown; shards?: unknown };

export interface ShardsProposal {
  tool: string;
  /** Configuration file of the tool, from the root of the project. */
  config: string;
  /** The fields to set on the check: always `shards` and `shardsCount`, `run` too when it does not read the slice variables. */
  fields: Record<string, string>;
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

/** Point `e2e-shards`, a warning only when the `e2e` check of a tool of the table is not sliced `"auto"`; none otherwise. */
export function shardsPoints(root: string, checks: unknown, lang: MessageLang): DiagnosisPoint[] {
  const T = TEXTS[lang];
  const e2e = (Array.isArray(checks) ? checks : []).find((c): c is Check => !!c && typeof c === "object" && c.id === "e2e");
  const proposal = e2e ? shardsProposal(root, e2e) : null;
  if (!e2e || !proposal) return [];
  const fields = Object.entries(proposal.fields)
    .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(", ");
  // On a pull request, the aggregation compares N with the main branch's (D6 iv): a fixed N moving to "auto" must be declared.
  const detail =
    e2e.shards === undefined
      ? fill(T.unslicedDetail, proposal.tool, proposal.config, fields)
      : fill(T.fixedDetail, proposal.tool, proposal.config, String(e2e.shards), fields);
  return [{ id: "e2e-shards", label: T.unsliced, state: "warning", detail }];
}
