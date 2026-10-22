// `drwil guarantees` (QUA-087 to QUA-097): the mandatory guarantees of a governed project, wired
// once the stack is known (`/drwil-adopt`): 100 % test coverage per layer, an e2e test of the
// critical paths, a repository on a protected forge with a CI, a presentation of the user's product.
// A guarantee is either wired and proven, or a blocking [P0] brief is written; `drwil verify` is FAIL
// as long as it is not held. No light profile, no waiver: only a declared and justified exclusion.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import {
  ALL_METRICS,
  hasSources,
  type CoverageTool,
  type DeclaredCheck,
  at,
  type Exec,
  type GuaranteeConfig,
  type Thresholds,
  defaultExec,
  layersOf,
  skeletonFiles,
  slugOf,
  toolFor,
} from "./guarantees-table.js";
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

export interface LayerReport {
  layer: string;
  slug: string;
  tool: string | null;
  mode: "new" | "existing";
  /** wired: check added; kept: already declared, not replaced; blocked: blocking brief. */
  status: "wired" | "kept" | "blocked";
  lines: string[];
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

const TEXTS = {
  fr: {
    layer: "Couche `{0}` ({1}) :",
    unknownStack: "pile non détectée : outil de couverture inconnu",
    outsideTable: "pile `{0}` hors de la table des outils de couverture",
    kept: "contrôle `{0}` déjà déclaré : gardé tel quel, jamais remplacé",
    absent: "outil {0} non installé ou non lançable (`{1}`) : contrôle non exécuté, jamais « passé »",
    wired: "contrôle `{0}` câblé à 100 % ({1}) avec {2}",
    measures: "mesure : {0}",
    metricsNote: "l'outil mesure : {0}",
    measureFailed: "mesure de la couverture actuelle impossible (`{0}`) : non exécutée",
    noMeasure: "mesure de la couverture actuelle non prise en charge pour {0} : seuil à poser par le demandeur",
    ratchet: "contrôle `{0}` câblé au niveau mesuré ({1}), cliquet jamais en baisse",
    diffWired: "contrôle `{0}` câblé : 100 % sur le code nouveau ou modifié",
    noDiff: "couverture du diff : outil absent ou inconnu pour {0} (`{1}`)",
    exclusion: "exclusion `{0}` refusée : sans raison déclarée",
    cite: "à citer dans le contrat de couverture du projet (`catalog:QUA-004`), sinon `drwil verify` ne le rejoue pas",
    e2eOk: "E2E : contrôle `e2e` déclaré",
    e2eMissing: "E2E : aucun contrôle `e2e` déclaré pour rejouer le test des chemins critiques",
    forgeOk: "Versionnement : dépôt, forge {0}, CI et protection de `{1}` en place",
    forgeGap: "Versionnement : {0}",
    protectHint: "protection à poser avec l'accord de l'humain : `npx drwil guarantees --protect`",
    protected: "Protection de `{0}` posée sur {1}",
    protectFailed: "pose de la protection de `{0}` refusée par {1} (droits ?) : rien n'est tenu",
    presentationOk: "Présentation : README, 5 lignes et fonctionnalités rédigés",
    skeleton: "Présentation : texte du squelette dans {0}",
    brief: "Fiche écrite : {0}",
    dryRun: "--dry-run : rien n'est écrit.",
    held: "Toutes les garanties sont tenues.",
    notHeld:
      "{0} garantie(s) non tenue(s) : `drwil verify` est en FAIL tant qu'elles le restent ; `/drwil-start` ne propose que leurs fiches.",
    verifyLayer: "garantie de couverture non tenue sur la couche `{0}` : contrôle `{1}` {2} (`npx drwil guarantees`)",
    undeclared: "non déclaré",
    uncited: "cité par aucun contrat",
    verifyE2e: "garantie e2e non tenue : contrôle `e2e` {0} (`npx drwil guarantees`)",
    verifyForge: "garantie de versionnement non tenue : {0}",
    noProtection: "protection de la branche principale jamais vérifiée (`npx drwil guarantees`)",
    verifySkeleton: "garantie de présentation non tenue : texte du squelette dans {0}",
  },
  en: {
    layer: "Layer `{0}` ({1}):",
    unknownStack: "stack not detected: coverage tool unknown",
    outsideTable: "stack `{0}` outside the coverage tools table",
    kept: "check `{0}` already declared: kept as it is, never replaced",
    absent: "tool {0} not installed or not launchable (`{1}`): check not run, never « passed »",
    wired: "check `{0}` wired at 100 % ({1}) with {2}",
    measures: "measures: {0}",
    metricsNote: "the tool measures: {0}",
    measureFailed: "measure of the current coverage impossible (`{0}`): not run",
    noMeasure: "measure of the current coverage not supported for {0}: threshold to set by the requester",
    ratchet: "check `{0}` wired at the measured level ({1}), ratchet never lowered",
    diffWired: "check `{0}` wired: 100 % on new or modified code",
    noDiff: "diff coverage: tool missing or unknown for {0} (`{1}`)",
    exclusion: "exclusion `{0}` refused: no declared reason",
    cite: "to cite in the project's coverage contract (`catalog:QUA-004`), otherwise `drwil verify` does not replay it",
    e2eOk: "E2E: `e2e` check declared",
    e2eMissing: "E2E: no `e2e` check declared to replay the test of the critical paths",
    forgeOk: "Versioning: repository, forge {0}, CI and protection of `{1}` in place",
    forgeGap: "Versioning: {0}",
    protectHint: "protection to set with the human's agreement: `npx drwil guarantees --protect`",
    protected: "Protection of `{0}` set on {1}",
    protectFailed: "setting the protection of `{0}` refused by {1} (permissions?): nothing is held",
    presentationOk: "Presentation: README, 5 lines and features written",
    skeleton: "Presentation: skeleton text in {0}",
    brief: "Brief written: {0}",
    dryRun: "--dry-run: nothing written.",
    held: "Every guarantee is held.",
    notHeld: "{0} guarantee(s) not held: `drwil verify` is FAIL as long as they stay so; `/drwil-start` offers only their briefs.",
    verifyLayer: "coverage guarantee not held on layer `{0}`: check `{1}` {2} (`npx drwil guarantees`)",
    undeclared: "not declared",
    uncited: "cited by no contract",
    verifyE2e: "e2e guarantee not held: check `e2e` {0} (`npx drwil guarantees`)",
    verifyForge: "versioning guarantee not held: {0}",
    noProtection: "protection of the main branch never checked (`npx drwil guarantees`)",
    verifySkeleton: "presentation guarantee not held: skeleton text in {0}",
  },
};

/** Exclusions of a layer (`guarantees.exclusions`: `{ layer?, path, reason }`): kept, refused. */
function exclusionsOf(cfg: GuaranteeConfig, layer: string): { kept: string[]; refused: string[] } {
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

interface LayerContext {
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

/** One layer: wired, kept or blocked (QUA-087, QUA-088, QUA-090, QUA-091, QUA-093). */
function coverLayer(ctx: LayerContext, layer: string, technos: string[]): LayerReport {
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
  if (!tool) return block(technos.length ? fill(T.outsideTable, technos.join(", ")) : T.unknownStack);
  const dir = join(ctx.root, layer);
  report.mode = hasSources(dir, tool.sources) ? "existing" : "new";
  if (ctx.checks.some((c) => c?.id === id)) {
    report.status = "kept";
    report.lines.push(fill(T.kept, id));
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
  ctx.checks.push(check(id, report.layer, tool.run(floor, ex), `coverage ratchet of ${report.layer} (${tool.tool})`));
  report.status = "wired";
  report.lines.push(fill(T.ratchet, id, fmt(floor)), T.cite);
  ctx.briefs.push({
    kind: "climb",
    path: `docs/projects/couverture-${report.slug}-montee.md`,
    title: briefTitle("climb", report.layer, ctx.lang),
    reasons: [fmt(floor)],
    blocking: false,
  });
  const diffId = `coverage-diff-${report.slug}`;
  if (ctx.checks.some((c) => c?.id === diffId)) report.lines.push(fill(T.kept, diffId));
  else if (tool.diff && ctx.exec(tool.diff.probe, dir).status === 0) {
    ctx.checks.push(check(diffId, report.layer, tool.diff.run, `diff coverage of ${report.layer}`));
    report.lines.push(fill(T.diffWired, diffId));
  } else return block(fill(T.noDiff, tool.tool, tool.diff?.probe ?? "—"));
  return report;
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
  if (r.forge.forge && !r.forge.protected && r.forge.notRun === null) out.push(`  ${T.protectHint}`);
  out.push(r.skeleton.length ? `✗ ${fill(T.skeleton, r.skeleton.join(", "))}` : `✓ ${T.presentationOk}`);
  for (const w of r.written) out.push(fill(T.brief, w));
  const blocking = r.briefs.filter((b) => b.blocking).length;
  out.push(blocking ? fill(T.notHeld, blocking) : T.held);
  if (r.dryRun) out.push(T.dryRun);
  return out;
}

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
