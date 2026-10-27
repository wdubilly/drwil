// `drwil guarantees` (QUA-087 to QUA-097): the mandatory guarantees of a governed project, wired
// once the stack is known (`/drwil-adopt`): 100 % test coverage per layer, an e2e test of the
// critical paths, a repository on a protected forge with a CI, a presentation of the user's product.
// A guarantee is either wired and proven, or a blocking [P0] brief is written; `drwil verify` is FAIL
// as long as it is not held. No light profile, no waiver: only a declared and justified exclusion.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { coverLayer, type LayerContext, type LayerReport } from "./guarantees-layers.js";
import { TEXTS } from "./guarantees-texts.js";
import { type DeclaredCheck, type Exec, type GuaranteeConfig, defaultExec, layersOf, skeletonFiles } from "./guarantees-table.js";
import { briefTitle, type GuaranteeBrief, writeBriefs } from "./guarantees-briefs.js";
import { type ForgeReport, inspectForge, protectBranch } from "./guarantees-forge.js";

export interface GuaranteesOptions {
  targetDir: string;
  dryRun?: boolean;
  /** Sets the protection of the main branch on the forge: only with the human's agreement. */
  protect?: boolean;
  /** Shell runner (tests); default: the real shell, in the given folder. */
  exec?: Exec;
}

export interface GuaranteesReport {
  lang: MessageLang;
  dryRun: boolean;
  layers: LayerReport[];
  e2e: boolean;
  forge: ForgeReport;
  skeleton: string[];
  briefs: GuaranteeBrief[];
  written: string[];
  protectedNow: boolean;
}

/** Runs the guarantees: wires what can be, writes a blocking brief for the rest. */
export function guarantees(opts: GuaranteesOptions): GuaranteesReport {
  const root = opts.targetDir;
  const lang = projectLang(root);
  const exec = opts.exec ?? defaultExec;
  const cfgPath = join(root, ".drwil", "ia-first.json");
  const cfg: GuaranteeConfig = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
  const checks: DeclaredCheck[] = Array.isArray(cfg.checks) ? [...cfg.checks] : [];
  const briefs: GuaranteeBrief[] = [];
  const ctx: LayerContext = { root, cfg, exec, lang, checks, briefs };
  const layers = layersOf(root, cfg).map(({ layer, technos }) => coverLayer(ctx, layer, technos));
  const e2e = checks.some((c) => c?.id === "e2e");
  if (!e2e)
    briefs.push({
      kind: "e2e",
      path: "docs/projects/e2e-chemins-critiques.md",
      title: briefTitle("e2e", "", lang),
      reasons: [TEXTS[lang].e2eMissing],
      blocking: true,
    });
  let forge = inspectForge(root, cfg, exec, lang);
  let protectedNow = false;
  if (opts.protect && !opts.dryRun && forge.forge && !forge.protected && forge.notRun === null) {
    protectedNow = protectBranch(root, forge.forge, forge.branch, exec);
    forge = inspectForge(root, cfg, exec, lang);
  }
  const forgeReasons = [...forge.missing, ...(forge.notRun ? [forge.notRun] : [])];
  if (forgeReasons.length)
    briefs.push({
      kind: "versioning",
      path: "docs/projects/versionnement.md",
      title: briefTitle("versioning", "", lang),
      reasons: forgeReasons,
      blocking: true,
    });
  const skeleton = skeletonFiles(root);
  if (skeleton.length)
    briefs.push({
      kind: "presentation",
      path: "docs/projects/presentation-du-projet.md",
      title: briefTitle("presentation", "", lang),
      reasons: skeleton.map((f) => `\`${f}\``),
      blocking: true,
    });
  let written: string[] = [];
  if (!opts.dryRun) {
    const previous = cfg.guarantees ?? {};
    cfg.checks = checks;
    cfg.guarantees = {
      ...previous,
      enforced: true,
      layers: { ...previous.layers, ...Object.fromEntries(layers.filter((l) => l.tool).map((l) => [l.slug, l.mode])) },
      ...(forge.protected
        ? { protection: { forge: forge.forge, branch: forge.branch, verifiedAt: new Date().toISOString().slice(0, 10) } }
        : {}),
    };
    writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);
    written = writeBriefs(root, briefs, cfg.dirs?.index ?? "docs/projects/pending.md", lang);
  }
  return { lang, dryRun: Boolean(opts.dryRun), layers, e2e, forge, skeleton, briefs, written, protectedNow };
}

export function formatGuarantees(r: GuaranteesReport): string[] {
  const T = TEXTS[r.lang];
  const out: string[] = [];
  for (const l of r.layers) {
    out.push(fill(T.layer, l.layer, l.tool ?? "?"));
    out.push(...l.lines.map((x) => `  ${l.status === "blocked" ? "✗" : "-"} ${x}`));
  }
  out.push(r.e2e ? `✓ ${T.e2eOk}` : `✗ ${T.e2eMissing}`);
  if (r.protectedNow) out.push(`✓ ${fill(T.protected, r.forge.branch, r.forge.forge)}`);
  const gaps = [...r.forge.missing, ...(r.forge.notRun ? [r.forge.notRun] : [])];
  if (!gaps.length) out.push(`✓ ${fill(T.forgeOk, r.forge.forge, r.forge.branch)}`);
  for (const g of gaps) out.push(`✗ ${fill(T.forgeGap, g)}`);
  // QUA-115: unread without an administrator token, said so, never counted as held nor as a gap.
  if (r.forge.unverified) out.push(`⚠ ${fill(T.forgeGap, r.forge.unverified)}`);
  if (r.forge.forge && !r.forge.protected && r.forge.notRun === null) out.push(`  ${T.protectHint}`);
  out.push(r.skeleton.length ? `✗ ${fill(T.skeleton, r.skeleton.join(", "))}` : `✓ ${T.presentationOk}`);
  for (const w of r.written) out.push(fill(T.brief, w));
  const blocking = r.briefs.filter((b) => b.blocking).length;
  out.push(blocking ? fill(T.notHeld, blocking) : T.held);
  if (r.dryRun) out.push(T.dryRun);
  return out;
}

export { guaranteeFailures, judgeGuarantees } from "./guarantees-verify.js";
export type { LayerReport };
