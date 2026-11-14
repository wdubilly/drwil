// Wiring of the coverage of one layer (QUA-087 to QUA-093), split from guarantees.ts (QUA-001).
import { join } from "node:path";
import { briefTitle, type GuaranteeBrief } from "./guarantees-briefs.js";
import { TEXTS } from "./guarantees-texts.js";
import {
  ALL_METRICS,
  at,
  type CoverageTool,
  type DeclaredCheck,
  type Exec,
  type GuaranteeConfig,
  hasSources,
  layerHasCode,
  slugOf,
  type Thresholds,
} from "./guarantees-table.js";
import { toolFor } from "./guarantees-tools.js";
import { mergeSeriesPair } from "./guarantees-merge.js";
import { fill, type MessageLang } from "./i18n.js";

export interface LayerReport {
  layer: string;
  slug: string;
  tool: string | null;
  mode: "new" | "existing";
  /** wired : ajouté ; kept : conservé ; blocked : fiche bloquante ; not-applicable : aucun code. */
  status: "wired" | "kept" | "blocked" | "not-applicable";
  lines: string[];
}

/** Exclusions of a layer (`guarantees.exclusions`: `{ layer?, path, reason }`): kept, refused. */
export function exclusionsOf(cfg: GuaranteeConfig, layer: string): { kept: string[]; refused: string[] } {
  const all: unknown[] = Array.isArray(cfg.guarantees?.exclusions) ? cfg.guarantees.exclusions : [];
  const mine = all.filter((e) => typeof at(e, "path") === "string" && (at(e, "layer") ?? ".") === layer);
  const justified = (e: unknown) => String(at(e, "reason") ?? "").trim() !== "";
  return {
    kept: mine.filter(justified).map((e) => String(at(e, "path"))),
    refused: mine.filter((e) => !justified(e)).map((e) => String(at(e, "path"))),
  };
}

const fmt = (t: Thresholds) =>
  Object.entries(t)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k} ${v} %`)
    .join(", ");

export interface LayerContext {
  root: string;
  cfg: GuaranteeConfig;
  exec: Exec;
  lang: MessageLang;
  checks: DeclaredCheck[];
  briefs: GuaranteeBrief[];
}

function check(id: string, layer: string, run: string, name: string) {
  return { id, name, run, ...(layer === "." ? {} : { cwd: layer }), paths: [layer === "." ? "**" : `${layer}/**`], degradable: false };
}

/** One layer: wired, kept or blocked (QUA-087, QUA-088, QUA-090, QUA-091, QUA-093, QUA-301, QUA-302). */
export function coverLayer(ctx: LayerContext, layer: string, technos: string[]): LayerReport {
  const T = TEXTS[ctx.lang];
  const slug = slugOf(layer);
  const id = `coverage-${slug}`;
  const tool = toolFor(technos);
  const report: LayerReport = { layer, slug, tool: tool?.tool ?? null, mode: "new", status: "blocked", lines: [] };
  const block = (...reasons: string[]) => {
    report.status = "blocked";
    report.lines.push(...reasons);
    ctx.briefs.push({
      kind: "coverage",
      path: `docs/projects/couverture-${slug}.md`,
      title: briefTitle("coverage", layer, ctx.lang),
      reasons,
      blocking: true,
    });
    return report;
  };
  if (!layerHasCode(ctx.root, layer)) {
    report.status = "not-applicable";
    report.lines.push(fill(T.layerPending, layer));
    return report;
  }
  if (!tool) return block(technos.length ? fill(T.outsideTable, technos.join(", ")) : T.unknownStack);
  const dir = join(ctx.root, layer);
  const baseline = ctx.cfg.guaranteeBaseline;
  const inherited = Array.isArray(baseline)
    ? baseline.some((p) => (layer === "." || p.startsWith(`${layer}/`)) && tool.sources.some((ext) => p.endsWith(ext)))
    : hasSources(dir, tool.sources);
  report.mode = inherited ? "existing" : "new";
  const merged = mergeSeriesPair(ctx.checks, tool, slug, layer, exclusionsOf(ctx.cfg, layer).kept);
  if (merged) {
    // Paire de série fusionnée (QUA-302) : seule une couche en dette la porte.
    report.mode = "existing";
    report.status = "kept";
    report.lines.push(fill(T.merged, id, `coverage-diff-${slug}`, fmt(merged)));
    return report;
  }
  // Existing layer with a single run (QUA-301): its check is `coverage-diff-<layer>`, kept as declared too.
  const declared = [id, ...(report.mode === "existing" && tool.single ? [`coverage-diff-${slug}`] : [])];
  const keptId = declared.find((d) => ctx.checks.some((c) => c?.id === d));
  if (keptId) {
    report.status = "kept";
    report.lines.push(fill(T.kept, keptId));
    return report;
  }
  if (tool.metricsNote) report.lines.push(fill(T.metricsNote, tool.metricsNote));
  const { kept, refused } = exclusionsOf(ctx.cfg, layer);
  for (const r of refused) report.lines.push(fill(T.exclusion, r));
  if (ctx.exec(tool.probe, dir).status !== 0) return block(fill(T.absent, tool.tool, tool.probe));
  if (report.mode === "new") return wire(ctx, report, tool, id, {}, kept);
  return existing(ctx, report, tool, id, kept, block);
}

function wire(ctx: LayerContext, report: LayerReport, tool: CoverageTool, id: string, t: Thresholds, ex: string[]): LayerReport {
  const T = TEXTS[ctx.lang];
  ctx.checks.push(check(id, report.layer, tool.run(t, ex), `coverage of ${report.layer} (${tool.tool})`));
  report.status = "wired";
  report.lines.push(fill(T.wired, id, tool.metrics.join(", "), tool.tool), T.cite);
  return report;
}

/** Existing project in debt (QUA-093): ratchet at the measured level, 100 % on the diff, [P1] climb. */
function existing(
  ctx: LayerContext,
  report: LayerReport,
  tool: CoverageTool,
  id: string,
  ex: string[],
  block: (...r: string[]) => LayerReport,
): LayerReport {
  const T = TEXTS[ctx.lang];
  const dir = join(ctx.root, report.layer);
  if (!tool.measure) return block(fill(T.noMeasure, tool.tool));
  const reportDir = `.drwil/coverage-${report.slug}`;
  const cmd = tool.measure.run(reportDir);
  const r = ctx.exec(cmd, dir);
  const measured = r.status === 0 ? tool.measure.read(dir, reportDir, r.stdout) : null;
  if (!measured) return block(fill(T.measureFailed, cmd));
  report.lines.push(fill(T.measures, fmt(measured)));
  if (tool.metrics.every((m) => (measured[m] ?? 0) >= 100)) return wire(ctx, report, tool, id, {}, ex);
  const floor = Object.fromEntries(ALL_METRICS.filter((m) => tool.metrics.includes(m)).map((m) => [m, measured[m] ?? 0]));
  const diffId = `coverage-diff-${report.slug}`;
  const diffTool = () => !!tool.diff && ctx.exec(tool.diff.probe, dir).status === 0;
  if (tool.single) {
    // One run judges the ratchet then the diff (QUA-301): never wired without the diff tool, the brief blocks.
    if (!diffTool()) return block(fill(T.noDiff, tool.tool, tool.diff?.probe ?? "—"));
    const run = tool.single(floor, ex);
    ctx.checks.push(check(diffId, report.layer, run, `coverage ratchet and diff of ${report.layer} (${tool.tool})`));
    report.lines.push(fill(T.single, diffId, fmt(floor)), T.cite);
  } else {
    ctx.checks.push(check(id, report.layer, tool.run(floor, ex), `coverage ratchet of ${report.layer} (${tool.tool})`));
    report.lines.push(fill(T.ratchet, id, fmt(floor)), T.cite);
  }
  report.status = "wired";
  ctx.briefs.push({
    kind: "climb",
    path: `docs/projects/couverture-${report.slug}-montee.md`,
    title: briefTitle("climb", report.layer, ctx.lang),
    reasons: [fmt(floor)],
    blocking: false,
  });
  if (tool.single) return report;
  if (ctx.checks.some((c) => c?.id === diffId)) report.lines.push(fill(T.kept, diffId));
  else if (tool.diff && diffTool()) {
    ctx.checks.push(check(diffId, report.layer, tool.diff.run, `diff coverage of ${report.layer}`));
    report.lines.push(fill(T.diffWired, diffId));
  } else return block(fill(T.noDiff, tool.tool, tool.diff?.probe ?? "—"));
  return report;
}
