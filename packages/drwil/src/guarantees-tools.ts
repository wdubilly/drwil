// Rows of the coverage tools table (QUA-087), split from guarantees-table.ts (QUA-001).
import { join } from "node:path";
import { ALL_METRICS, at, type CoverageTool, pct, readJson } from "./guarantees-table.js";

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
