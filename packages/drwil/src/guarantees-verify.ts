// Verdict side of the guarantees (QUA-088), split from guarantees.ts (QUA-001).
import { exclusionsOf } from "./guarantees-layers.js";
import { type Exec, type GuaranteeConfig, at, defaultExec, layersOf, skeletonFiles, slugOf } from "./guarantees-table.js";
import { inspectForge } from "./guarantees-forge.js";
import { TEXTS } from "./guarantees-texts.js";
import { fill, projectLang } from "./i18n.js";

/**
 * Judged by `drwil verify` without network (QUA-088): once `drwil guarantees` has enforced them,
 * every guarantee not held is an error and the verdict is FAIL. Returns the messages.
 */
export function guaranteeFailures(root: string, cfg: GuaranteeConfig, contracts: { checks?: string[] | null }[]): string[] {
  if (cfg.guarantees?.enforced !== true) return [];
  const T = TEXTS[projectLang(root)];
  const declared = new Set((Array.isArray(cfg.checks) ? cfg.checks : []).map((c) => at(c, "id")));
  const cited = new Set(contracts.flatMap((k) => k.checks ?? []));
  const state = (id: string) => (!declared.has(id) ? T.undeclared : !cited.has(id) ? T.uncited : null);
  const out: string[] = [];
  for (const { layer } of layersOf(root, cfg)) {
    const slug = slugOf(layer);
    const ids = [`coverage-${slug}`, ...(cfg.guarantees.layers?.[slug] === "existing" ? [`coverage-diff-${slug}`] : [])];
    for (const id of ids) {
      const s = state(id);
      if (s) out.push(fill(T.verifyLayer, layer, id, s));
    }
    for (const r of exclusionsOf(cfg, layer).refused) out.push(fill(T.exclusion, r));
  }
  const e2e = state("e2e");
  if (e2e) out.push(fill(T.verifyE2e, e2e));
  const offline: Exec = (cmd, cwd) => (cmd.startsWith("git ") ? defaultExec(cmd, cwd) : { status: 1, stdout: "" });
  const forge = inspectForge(root, cfg, offline, projectLang(root));
  // Offline: the forge is never called here, its protection is the one recorded by `drwil guarantees`.
  for (const m of forge.missing) out.push(fill(T.verifyForge, m));
  if (!cfg.guarantees.protection) out.push(fill(T.verifyForge, T.noProtection));
  const skeleton = skeletonFiles(root);
  if (skeleton.length) out.push(fill(T.verifySkeleton, skeleton.join(", ")));
  return out;
}

/** A guarantee not held makes the verdict FAIL, named among the errors (QUA-088). */
export function judgeGuarantees(
  v: { status: string; code: number; errors: string[] },
  root: string,
  cfg: GuaranteeConfig,
  contracts: { checks?: string[] | null }[],
): void {
  const failures = guaranteeFailures(root, cfg, contracts);
  if (!failures.length) return;
  v.errors.push(...failures);
  v.status = "FAIL";
  v.code = 1;
}
