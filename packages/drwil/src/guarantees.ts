// Garanties obligatoires (QUA-087 à QUA-097, QUA-224 à QUA-227) : câbler n'est pas prouver ;
// l'absence de code diffère une garantie, jamais l'exécution d'un contrôle applicable.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { coverLayer, type LayerContext, type LayerReport } from "./guarantees-layers.js";
import { TEXTS } from "./guarantees-texts.js";
import { TEXTS as FORGE_TEXTS } from "./guarantees-forge-texts.js";
import { type DeclaredCheck, type Exec, type GuaranteeConfig, defaultExec, layersOf, skeletonFiles } from "./guarantees-table.js";
import { briefTitle, type GuaranteeBrief, writeBriefs } from "./guarantees-briefs.js";
import { readAutoMerge } from "./protection.js";
import { coverageFailures } from "./guarantees-verify.js";
import { type ForgeReport, inspectForge, protectBranch } from "./guarantees-forge.js";

// QUA-227 : le lecteur canonique livré par le kit, pas une seconde grammaire des contrats.
const { readContracts } = await import(new URL("../templates/common/base/.githooks/contracts.mjs", import.meta.url).href);

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
  /** null : pas encore applicable ; true : déclaré et cité, pas une preuve d'exécution. */
  e2e: boolean | null;
  gaps?: string[];
  forge: ForgeReport;
  skeleton: string[];
  briefs: GuaranteeBrief[];
  written: string[];
  protectedNow: boolean;
  /** Auto-merge allowed now by `--protect`: true done, false refused by the forge, null not attempted. */
  autoMergeNow: boolean | null;
  /** Repository auto-merge as read at the end ("na" off GitHub or without forge access). */
  autoMerge: "allowed" | "refused" | "unread" | "na";
}

/** Allows auto-merge on the GitHub repository (`--protect`, the human's agreement); true when it succeeded. */
const enableAutoMerge = (root: string, exec: Exec) =>
  exec("gh api -X PATCH repos/{owner}/{repo} -F allow_auto_merge=true", root).status === 0;

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
  const registry = join(root, cfg.dirs?.contracts ?? "docs/contracts.md");
  const contracts = existsSync(registry) ? readContracts(readFileSync(registry, "utf8")) : [];
  const judged = {
    ...cfg,
    checks,
    guarantees: {
      ...cfg.guarantees,
      layers: {
        ...cfg.guarantees?.layers,
        ...Object.fromEntries(layers.filter((l) => l.status !== "not-applicable").map((l) => [l.slug, l.mode])),
      },
    },
  };
  const gaps = coverageFailures(root, judged, contracts);
  const e2e = layers.every((l) => l.status === "not-applicable") ? null : !gaps.some((g) => g.layer === null);
  for (const l of layers) {
    const reasons = gaps.filter((g) => g.layer === l.layer).map((g) => g.reason);
    if (!reasons.length || briefs.some((b) => b.path === `docs/projects/couverture-${l.slug}.md`)) continue;
    briefs.push({
      kind: "coverage",
      path: `docs/projects/couverture-${l.slug}.md`,
      title: briefTitle("coverage", l.layer, lang),
      reasons,
      blocking: true,
    });
  }
  if (e2e === false)
    briefs.push({
      kind: "e2e",
      path: "docs/projects/e2e-chemins-critiques.md",
      title: briefTitle("e2e", "", lang),
      reasons: gaps.filter((g) => g.layer === null).map((g) => g.reason),
      blocking: true,
    });
  let forge = inspectForge(root, cfg, exec, lang);
  let protectedNow = false;
  if (opts.protect && !opts.dryRun && forge.forge && !forge.protected && forge.notRun === null) {
    protectedNow = protectBranch(root, forge.forge, forge.branch, exec);
    forge = inspectForge(root, cfg, exec, lang);
  }
  let autoMergeNow: boolean | null = null;
  if (opts.protect && !opts.dryRun && forge.forge === "github" && forge.notRun === null && readAutoMerge(exec, root) === "refused") {
    autoMergeNow = enableAutoMerge(root, exec);
    forge = inspectForge(root, cfg, exec, lang);
  }
  const autoMerge = forge.forge === "github" && forge.notRun === null ? readAutoMerge(exec, root) : "na";
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
      layers: judged.guarantees.layers,
      ...(forge.protected
        ? { protection: { forge: forge.forge, branch: forge.branch, verifiedAt: new Date().toISOString().slice(0, 10) } }
        : {}),
    };
    writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);
    written = writeBriefs(root, briefs, cfg.dirs?.index ?? "docs/projects/pending.md", lang);
  }
  return {
    lang,
    dryRun: Boolean(opts.dryRun),
    layers,
    e2e,
    gaps: gaps.map((g) => g.reason),
    forge,
    skeleton,
    briefs,
    written,
    protectedNow,
    autoMergeNow,
    autoMerge,
  };
}

export function formatGuarantees(r: GuaranteesReport): string[] {
  const T = TEXTS[r.lang];
  const FT = FORGE_TEXTS[r.lang];
  const out: string[] = [];
  for (const l of r.layers) {
    out.push(fill(T.layer, l.layer, l.tool ?? "?"));
    out.push(...l.lines.map((x) => `  ${l.status === "blocked" ? "✗" : "-"} ${x}`));
  }
  if (r.e2e !== false) out.push(r.e2e === null ? `- ${T.e2ePending}` : `✓ ${T.e2eOk}`);
  out.push(...(r.gaps ?? []).map((gap) => `✗ ${gap}`));
  if (r.protectedNow) out.push(`✓ ${fill(T.protected, r.forge.branch, r.forge.forge)}`);
  if (r.autoMergeNow !== null) out.push(r.autoMergeNow ? `✓ ${FT.autoMergeSet}` : `✗ ${FT.autoMergeFailed}`);
  const gaps = [...r.forge.missing, ...(r.forge.notRun ? [r.forge.notRun] : [])];
  if (!gaps.length) out.push(`✓ ${fill(T.forgeOk, r.forge.forge, r.forge.branch)}`);
  for (const g of gaps) out.push(`✗ ${fill(T.forgeGap, g)}`);
  // QUA-115: unread without an administrator token, said so, never counted as held nor as a gap.
  if (r.forge.unverified) out.push(`⚠ ${fill(T.forgeGap, r.forge.unverified)}`);
  if (r.autoMerge === "refused" && r.autoMergeNow === null) out.push(`  ${FT.autoMergeOff}`);
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
