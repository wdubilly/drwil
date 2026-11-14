// Fusion des deux contrôles de couverture d'une couche en dette en un seul run (QUA-302), séparée de
// guarantees-layers.ts (QUA-001). Seule une paire exactement générée par le kit est réécrite : la moindre
// différence (option ajoutée, exclusion changée) compte comme personnalisée, par prudence (QUA-019).
import type { CoverageTool, DeclaredCheck, Thresholds } from "./guarantees-table.js";

const THRESHOLDS = /--lines (\d+) --branches (\d+) --functions (\d+) --statements (\d+) /;

/** Seuils lus dans une commande de seuil c8 (`--lines N --branches N…`), ou null. */
export function thresholdsOf(run: string): Thresholds | null {
  const m = THRESHOLDS.exec(run);
  return m ? { lines: +m[1], branches: +m[2], functions: +m[3], statements: +m[4] } : null;
}

/** La paire `coverage-<couche>` + `coverage-diff-<couche>` déclarée, ou null quand l'une manque. */
export function declaredPair(checks: DeclaredCheck[], slug: string): { threshold: DeclaredCheck; diff: DeclaredCheck } | null {
  const threshold = checks.find((c) => c?.id === `coverage-${slug}`);
  const diff = checks.find((c) => c?.id === `coverage-diff-${slug}`);
  return threshold && diff ? { threshold, diff } : null;
}

/**
 * Seuils de la paire et commande unique quand la paire est exactement celle que le kit génère pour ces exclusions (même
 * commande de seuil à ces seuils, même commande de diff) ; null sinon : paire personnalisée, ou outil sans run unique.
 */
export function seriesThresholds(tool: CoverageTool, pair: { threshold: DeclaredCheck; diff: DeclaredCheck }, ex: string[]) {
  const run = pair.threshold.run;
  const t = typeof run === "string" ? thresholdsOf(run) : null;
  if (!t || !tool.single || !tool.diff || tool.run(t, ex) !== run || pair.diff.run !== tool.diff.run) return null;
  return { thresholds: t, single: tool.single(t, ex) };
}

/**
 * Remplace, dans `checks`, une paire de série par le contrôle unique `coverage-diff-<couche>` (à la place du contrôle
 * de diff, ses autres champs gardés) ; rend les seuils gardés, ou null quand rien n'est réécrit.
 */
export function mergeSeriesPair(checks: DeclaredCheck[], tool: CoverageTool, slug: string, layer: string, ex: string[]) {
  const pair = declaredPair(checks, slug);
  const series = pair && seriesThresholds(tool, pair, ex);
  if (!pair || !series) return null;
  const merged = { ...pair.diff, name: `coverage ratchet and diff of ${layer} (${tool.tool})`, run: series.single };
  checks.splice(checks.indexOf(pair.diff), 1, merged);
  checks.splice(checks.indexOf(pair.threshold), 1);
  return series.thresholds;
}
