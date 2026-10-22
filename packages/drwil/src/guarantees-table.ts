// Table of the coverage tools (QUA-087): one row per stack, never an implementation per stack —
// adding a stack is adding a row. A stack without a row goes through the blocking brief (QUA-088).
import { spawnSync } from "node:child_process";
import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectStack } from "./stack.js";

export type Metric = "lines" | "branches" | "functions" | "statements";
export const ALL_METRICS: Metric[] = ["lines", "branches", "functions", "statements"];
export type Thresholds = Partial<Record<Metric, number>>;

/** Result of a shell command: what the guarantees need from it (injectable for the tests). */
export interface ExecResult {
  status: number | null;
  stdout: string;
}
export type Exec = (command: string, cwd: string) => ExecResult;

export interface CoverageTool {
  /** Prefix of a techno detected by `detectStack` ("Node.js", "Python"…). */
  stack: string;
  tool: string;
  /** What the tool really measures: never presented as the four metrics when it measures fewer. */
  metrics: Metric[];
  /** Extra word on the metrics (Python: a single combined rate). */
  metricsNote?: string;
  /** Command telling whether the tool can be launched in the layer; exit code 0 = available. */
  probe: string;
  /** Check command at the given thresholds, with the declared exclusions. */
  run: (t: Thresholds, exclusions: string[]) => string;
  /** Extensions of the source files: a layer holding some is an existing project (QUA-093). */
  sources: string[];
  /** Measure of the current coverage (existing project): command, then reading of its result. */
  measure?: { run: (report: string) => string; read: (dir: string, report: string, stdout: string) => Thresholds | null };
  /** Diff coverage at 100 % on the new or modified code (existing project), and its probe. */
  diff?: { run: string; probe: string };
}

const pct = (n: unknown): number | undefined => (typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : undefined);

/** Settings of `.drwil/ia-first.json` read by the guarantees (free JSON, read field by field). */
export interface GuaranteeConfig {
  layers?: unknown;
  ci?: unknown;
  checks?: unknown;
  dirs?: { index?: string };
  guarantees?: { enforced?: boolean; layers?: Record<string, string>; exclusions?: unknown; protection?: unknown };
  [key: string]: unknown;
}

/** A declared check, as far as the guarantees read it. */
export interface DeclaredCheck {
  id?: unknown;
  [key: string]: unknown;
}

/** Reads `o.a.b…`, or undefined as soon as a step is not an object. */
export function at(o: unknown, ...path: string[]): unknown {
  let v = o;
  for (const k of path) v = v !== null && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined;
  return v;
}

export function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

const C8_EXCLUDE = (ex: string[]) => ex.map((e) => ` --exclude=${JSON.stringify(e)}`).join("");
const DIFF_COVER = "diff-cover --version";

export const COVERAGE_TOOLS: CoverageTool[] = [
  {
    stack: "Node.js",
    tool: "c8",
    metrics: ALL_METRICS,
    probe: "npx --no-install c8 --version",
    run: (t, ex) =>
      `npx c8 --check-coverage --lines ${t.lines ?? 100} --branches ${t.branches ?? 100} --functions ${t.functions ?? 100} --statements ${t.statements ?? 100} --all${C8_EXCLUDE(ex)} npm test`,
    sources: [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".mts", ".cts", ".vue", ".svelte"],
    measure: {
      run: (report) => `npx c8 --reporter=json-summary --report-dir=${report} --all npm test`,
      read: (dir, report) => {
        const total = at(readJson(join(dir, report, "coverage-summary.json")), "total");
        if (!total) return null;
        return Object.fromEntries(ALL_METRICS.map((m) => [m, pct(at(total, m, "pct"))]));
      },
    },
    diff: {
      run: "npx c8 --reporter=cobertura --report-dir=coverage npm test && diff-cover coverage/cobertura-coverage.xml --fail-under=100",
      probe: DIFF_COVER,
    },
  },
  {
    stack: "Python",
    tool: "coverage.py",
    metrics: ["lines", "branches"],
    metricsNote: "lines and branches combined into a single rate (coverage.py --branch)",
    probe: "coverage --version",
    run: (t, ex) =>
      `coverage run --branch${ex.length ? ` --omit=${JSON.stringify(ex.join(","))}` : ""} -m pytest && coverage report --fail-under=${Math.min(t.lines ?? 100, t.branches ?? 100)}`,
    sources: [".py"],
    measure: {
      run: (report) => `coverage run --branch -m pytest && coverage json -o ${report}.json`,
      read: (dir, report) => {
        const total = pct(at(readJson(join(dir, `${report}.json`)), "totals", "percent_covered"));
        return total === undefined ? null : { lines: total, branches: total };
      },
    },
    diff: { run: "coverage xml -o coverage.xml && diff-cover coverage.xml --fail-under=100", probe: DIFF_COVER },
  },
  {
    stack: "Go",
    tool: "go test -cover",
    metrics: ["statements"],
    metricsNote: "statements only: Go measures neither branches nor functions apart",
    probe: "go version",
    run: (t) =>
      `go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out | tail -n 1 | awk '{ if ($3+0 < ${t.statements ?? 100}) exit 1 }'`,
    sources: [".go"],
    measure: {
      run: () => "go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out | tail -n 1",
      read: (_dir, _report, stdout) => {
        const m = /(\d+(?:\.\d+)?)%\s*$/.exec(stdout.trim());
        return m ? { statements: Math.floor(Number(m[1])) } : null;
      },
    },
  },
  {
    stack: "Java/Maven",
    tool: "JaCoCo (jacoco:check rule of pom.xml)",
    metrics: ALL_METRICS,
    metricsNote: "thresholds carried by the jacoco:check rule of the build file (LINE, BRANCH, METHOD, INSTRUCTION)",
    probe: "grep -q jacoco pom.xml",
    run: () => "mvn -q verify",
    sources: [".java", ".kt"],
  },
  {
    stack: "JVM/Gradle",
    tool: "JaCoCo (jacocoTestCoverageVerification)",
    metrics: ALL_METRICS,
    metricsNote: "thresholds carried by jacocoTestCoverageVerification in the build file (LINE, BRANCH, METHOD, INSTRUCTION)",
    probe: "grep -qs jacoco build.gradle build.gradle.kts",
    run: () => "./gradlew check jacocoTestCoverageVerification",
    sources: [".java", ".kt"],
  },
];

/** Row of the table for a layer's technos (first matching), or null: unknown stack. */
export function toolFor(technos: string[]): CoverageTool | null {
  for (const t of technos) {
    const row = COVERAGE_TOOLS.find((r) => t === r.stack || t.startsWith(`${r.stack} `));
    if (row) return row;
  }
  return null;
}

/**
 * Skeleton text left by the template (QUA-097): a README, the "5 lines" of AGENTS.md or
 * docs/features.md still carrying one of these is not written yet.
 */
export const SKELETON_MARKERS = ["(to describe", "template to fill in", "(à décrire", "gabarit à remplir"];
export const PRESENTATION_FILES = ["README.md", "AGENTS.md", "docs/features.md"];

/** Files among `files` that still carry skeleton text (missing files are not reported here). */
export function skeletonFiles(root: string, files: string[] = PRESENTATION_FILES): string[] {
  return files.filter((f) => {
    const p = join(root, f);
    if (!existsSync(p)) return false;
    const text = readFileSync(p, "utf8");
    return SKELETON_MARKERS.some((m) => text.includes(m));
  });
}

const SKIPPED = new Set(["node_modules", ".git", "dist", "build", "target", "vendor", "venv", ".venv", "coverage", ".drwil", "docs"]);

/** Does the folder hold a source file of the tool's stack (bounded walk)? */
export function hasSources(dir: string, exts: string[], depth = 6): boolean {
  if (depth < 0) return false;
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIPPED.has(e.name) && !e.name.startsWith(".") && hasSources(join(dir, e.name), exts, depth - 1)) return true;
    } else if (exts.some((x) => e.name.endsWith(x)) && !/\.config\.|^\./.test(e.name)) return true;
  }
  return false;
}

export const defaultExec: Exec = (command, cwd) => {
  const r = spawnSync(command, { cwd, shell: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30 * 60_000 });
  return { status: r.status, stdout: r.stdout ?? "" };
};

export const slugOf = (layer: string) => (layer === "." ? "root" : layer.replace(/[^\w-]+/g, "-"));

/** Layers judged: the declared ones, else those where a stack is detected, else the root. */
export function layersOf(root: string, cfg: GuaranteeConfig): { layer: string; technos: string[] }[] {
  const stack = detectStack(root);
  const declared: string[] =
    Array.isArray(cfg.layers) && cfg.layers.length
      ? cfg.layers.filter((l): l is string => typeof l === "string")
      : stack.map((s) => s.path);
  const layers = declared.length ? declared : ["."];
  return layers.map((layer) => ({ layer, technos: stack.find((s) => s.path === layer)?.technos ?? [] }));
}
