// Fusion des deux contrôles de couverture d'une couche Node, en dette ou à 100 %, en un seul run (QUA-302), séparée de
// guarantees-layers.ts (QUA-001). Seule une paire exactement générée par le kit est réécrite : la moindre
// différence (option ajoutée, exclusion changée) compte comme personnalisée, par prudence (QUA-019).
import { posix } from "node:path";
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

/**
 * Commande unique composée depuis une paire déclarée, de série ou réglée à la main (QUA-303) : la commande de seuil
 * telle quelle, rapport cobertura en plus, puis la partie `diff-cover` du contrôle de diff telle quelle ; le rapport
 * lu par `diff-cover` est effacé avant le run (QUA-013). Seuil c8, ou Vitest avec `--coverage` (hors table du kit :
 * jamais fusionnée par `guarantees`, seulement signalée). Null sinon ou sans `diff-cover` (Python : inchangé).
 */
export function singleFromPair(pair: { threshold: DeclaredCheck; diff: DeclaredCheck }): string | null {
  const { run: t } = pair.threshold;
  const { run: d } = pair.diff;
  const cover = typeof d === "string" ? /diff-cover (\S+).*$/.exec(d) : null;
  if (typeof t !== "string" || !cover) return null;
  const dir = posix.dirname(cover[1]);
  const check = /\bc8 .*--check-coverage/.test(t) ? withC8Report(t, dir) : withVitestReport(t, dir);
  return check && `rm -f ${cover[1]} && ${check} && ${cover[0]}`;
}

function withC8Report(t: string, dir: string): string {
  const reporter = ` --reporter=cobertura --report-dir=${dir}`;
  if (t.includes("--reporter=cobertura")) return t;
  return t.includes(" --all") ? t.replace(" --all", `${reporter} --all`) : t.replace(/\bc8\b/, `c8${reporter}`);
}

/** Vitest : un `--coverage.reporter` répété s'ajoute aux autres (texte du demandeur gardé) ; null sans `--coverage`. */
function withVitestReport(t: string, dir: string): string | null {
  const flag = /\bvitest\b.*?( --coverage(?:\.enabled(?:=true)?)?)(?=\s|$)/.exec(t);
  if (!flag) return null;
  const extra = [
    t.includes("--coverage.reporter=cobertura") ? "" : " --coverage.reporter=cobertura",
    t.includes("--coverage.reportsDirectory") ? "" : ` --coverage.reportsDirectory=${dir}`,
  ].join("");
  const at = flag.index + flag[0].length;
  return `${t.slice(0, at)}${extra}${t.slice(at)}`;
}
