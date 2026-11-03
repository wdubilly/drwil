// Verdict side of the guarantees (QUA-088), split from guarantees.ts (QUA-001).
import { exclusionsOf } from "./guarantees-layers.js";
import { type Exec, type GuaranteeConfig, at, defaultExec, layerHasCode, layersOf, skeletonFiles, slugOf } from "./guarantees-table.js";
import { inspectForge } from "./guarantees-forge.js";
import { TEXTS } from "./guarantees-texts.js";
import { fill, projectLang } from "./i18n.js";
import { scopeGateFailure } from "./protection.js";

/**
 * Judged by `drwil verify` without network (QUA-088): once `drwil guarantees` has enforced them,
 * every guarantee not held is an error and the verdict is FAIL. Returns the messages.
 */
export function coverageFailures(root: string, cfg: GuaranteeConfig, contracts: { checks?: string[] | null }[]) {
  const T = TEXTS[projectLang(root)];
  const declared = new Set((Array.isArray(cfg.checks) ? cfg.checks : []).map((c) => at(c, "id")));
  const cited = new Set(contracts.flatMap((k) => k.checks ?? []));
  const state = (id: string) => (!declared.has(id) ? T.undeclared : !cited.has(id) ? T.uncited : null);
  const out: { layer: string | null; reason: string }[] = [];
  let code = false;
  for (const { layer } of layersOf(root, cfg)) {
    for (const r of exclusionsOf(cfg, layer).refused) out.push({ layer, reason: fill(T.exclusion, r) });
    if (!layerHasCode(root, layer)) continue;
    code = true;
    const slug = slugOf(layer);
    const ids = [`coverage-${slug}`, ...(cfg.guarantees?.layers?.[slug] === "existing" ? [`coverage-diff-${slug}`] : [])];
    for (const id of ids) {
      const s = state(id);
      if (s) out.push({ layer, reason: fill(T.verifyLayer, layer, id, s) });
    }
  }
  const e2e = code ? state("e2e") : null;
  if (e2e) out.push({ layer: null, reason: fill(T.verifyE2e, e2e) });
  return out;
}

/** QUA-224 : une non-applicabilité n'est ni un échec ni une preuve de réussite. */
export function pendingGuarantees(root: string, cfg: GuaranteeConfig): Map<string, string> {
  const pending = new Map<string, string>();
  if (cfg.guarantees?.enforced !== true) return pending;
  const T = TEXTS[projectLang(root)];
  const layers = layersOf(root, cfg);
  const empty = layers.filter(({ layer }) => !layerHasCode(root, layer));
  for (const { layer } of empty) {
    for (const id of [`coverage-${slugOf(layer)}`, `coverage-diff-${slugOf(layer)}`]) pending.set(id, fill(T.layerPending, layer));
  }
  if (empty.length === layers.length) pending.set("e2e", T.e2ePending);
  return pending;
}

export const guaranteeNotices = (root: string, cfg: GuaranteeConfig): string[] => [...new Set(pendingGuarantees(root, cfg).values())];

export function guaranteeFailures(root: string, cfg: GuaranteeConfig, contracts: { checks?: string[] | null }[]): string[] {
  if (cfg.guarantees?.enforced !== true) return [];
  const T = TEXTS[projectLang(root)];
  const out = coverageFailures(root, cfg, contracts).map((gap) => gap.reason);
  const offline: Exec = (cmd, cwd) => (cmd.startsWith("git ") ? defaultExec(cmd, cwd) : { status: 1, stdout: "" });
  const forge = inspectForge(root, cfg, offline, projectLang(root));
  // Offline: the forge is never called here, its protection is the one recorded by `drwil guarantees`.
  for (const m of forge.missing) out.push(fill(T.verifyForge, m));
  if (!cfg.guarantees.protection) out.push(fill(T.verifyForge, T.noProtection));
  const skeleton = skeletonFiles(root);
  if (skeleton.length) out.push(fill(T.verifySkeleton, skeleton.join(", ")));
  return out;
}

/** A guarantee not held makes the verdict FAIL, named among the errors (QUA-088); the scope gate too. */
export function judgeGuarantees(
  v: { status: string; code: number; errors: string[]; notices?: string[] },
  root: string,
  cfg: GuaranteeConfig,
  contracts: { checks?: string[] | null }[],
): void {
  const gate = scopeGateFailure(cfg, projectLang(root));
  const failures = [...guaranteeFailures(root, cfg, contracts), ...(gate ? [gate] : [])];
  v.notices = guaranteeNotices(root, cfg);
  if (!failures.length) return;
  v.errors.push(...failures);
  v.status = "FAIL";
  v.code = 1;
}
