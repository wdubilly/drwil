#!/usr/bin/env node
// Code changed on a branch arrives 100 % covered: every line added or modified by `git diff <base>...HEAD`,
// and every branch that line opens, must be covered according to the project's lcov report.
// Independent of the stack: the project declares in .drwil/ia-first.json → "diffCoverage"
//   { "lcov": "coverage/lcov.info", "produce": "<command that writes it>", "base": "origin/main",
//     "include": ["src/**"], "exclusions": [{ "path": "src/gen/**", "lines": "10-20", "reason": "…" }] }
// - no report (absent, empty, or `produce` failing): "not run", exit 1 — never passed (QUA-013);
// - an exclusion without a reason is refused: it is not an exclusion, it is a hole;
// - a changed file matching "include" but absent from the report counts as uncovered.
import { readFileSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { globToRegex } from "./glob.mjs";

const TEXTS = {
  fr: {
    title: "Code modifié non couvert à 100 % (diff contre {0}) :",
    line: "{0}:{1} : ligne non couverte",
    branch: "{0}:{1} : branche non couverte",
    unmeasured: "{0} : modifié mais absent du rapport lcov (non mesuré)",
    noReason: "Exclusion {0} sans justification : la déclarer avec sa raison dans .drwil/ia-first.json (diffCoverage.exclusions)",
    notRun: "Couverture du diff non exécutée : {0}",
    noConfig: "diffCoverage.lcov n'est pas déclaré dans .drwil/ia-first.json",
    noReport: "rapport lcov absent ou vide ({0})",
    produce: "la commande de production du rapport a échoué ({0})",
    noBase: "base du diff introuvable ({0})",
  },
  en: {
    title: "Changed code not 100 % covered (diff against {0}):",
    line: "{0}:{1}: line not covered",
    branch: "{0}:{1}: branch not covered",
    unmeasured: "{0}: changed but absent from the lcov report (not measured)",
    noReason: "Exclusion {0} has no justification: declare it with its reason in .drwil/ia-first.json (diffCoverage.exclusions)",
    notRun: "Diff coverage not run: {0}",
    noConfig: "diffCoverage.lcov is not declared in .drwil/ia-first.json",
    noReport: "lcov report missing or empty ({0})",
    produce: "the command producing the report failed ({0})",
    noBase: "diff base not found ({0})",
  },
};
const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

/** lcov text → Map<file, { lines: Map<n, hits>, branches: Map<n, number of branches not taken> }>. */
export function parseLcov(text, cwd = ".") {
  const files = new Map();
  let current = null;
  for (const row of text.split(/\r?\n/)) {
    const [tag, ...rest] = row.split(":");
    const value = rest.join(":");
    if (tag === "SF") {
      const path = (isAbsolute(value) ? relative(cwd, value) : value).replace(/\\/g, "/");
      current = { lines: new Map(), branches: new Map() };
      files.set(path, current);
    } else if (tag === "DA" && current) {
      const [n, hits] = value.split(",");
      current.lines.set(Number(n), Number(hits));
    } else if (tag === "BRDA" && current) {
      const [n, , , taken] = value.split(",");
      const missed = taken === "-" || Number(taken) === 0 ? 1 : 0;
      current.branches.set(Number(n), (current.branches.get(Number(n)) ?? 0) + missed);
    }
  }
  return files;
}

/** `git diff --unified=0` text → Map<file, Set<added or modified line numbers>>. */
export function parseDiff(text) {
  const files = new Map();
  let current = null;
  for (const row of text.split("\n")) {
    if (row.startsWith("+++ ")) {
      const name = row.slice(4);
      const file = name.replace(/^b\//, "");
      current = name === "/dev/null" ? null : files.set(file, new Set()).get(file);
    } else if (current && row.startsWith("@@")) {
      const [, start, count] = /\+(\d+)(?:,(\d+))?/.exec(row);
      for (let i = 0; i < Number(count ?? 1); i++) current.add(Number(start) + i);
    }
  }
  return files;
}

/** "10", "10-20" or absent (whole file) → predicate on a line number. */
function lineRange(spec) {
  if (spec === undefined) return () => true;
  const [from, to = from] = String(spec).split("-").map(Number);
  return (n) => n >= from && n <= to;
}

/** Exclusions are (path, lines) pairs; one without a reason is an error, not an exclusion. */
export function excluder(exclusions) {
  const valid = exclusions.filter((e) => String(e.reason ?? "").trim());
  const rules = valid.map((e) => ({ path: globToRegex(e.path), inRange: lineRange(e.lines) }));
  return {
    skips: (file, n) => rules.some((r) => r.path.test(file) && r.inRange(n)),
    refused: exclusions.filter((e) => !valid.includes(e)).map((e) => e.path),
  };
}

/** Uncovered changed lines and branches, plus changed files the report does not know. */
export function verdict(lcov, diff, { include = [], exclusions = [] }) {
  const { skips, refused } = excluder(exclusions);
  const wanted = include.map(globToRegex);
  const holes = [];
  const unmeasured = [];
  for (const [file, changed] of diff) {
    const report = lcov.get(file);
    if (!report) {
      if (wanted.some((r) => r.test(file)) && ![...changed].every((n) => skips(file, n))) unmeasured.push(file);
      continue;
    }
    for (const n of [...changed].sort((a, b) => a - b)) {
      if (skips(file, n)) continue;
      if (report.lines.get(n) === 0) holes.push({ file, n, kind: "line" });
      if (report.branches.get(n) > 0) holes.push({ file, n, kind: "branch" });
    }
  }
  return { holes, unmeasured, refused };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

const git = (cwd, args) => spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 28 });

function baseOf(cwd, declared, argBase) {
  const candidates = [argBase, declared, "origin/master", "origin/main", "master", "main"].filter(Boolean);
  return candidates.find((ref) => git(cwd, ["rev-parse", "--verify", "--quiet", ref]).status === 0) ?? candidates[0];
}

/** { code, out }: the verdict for the project in `cwd`. */
export function run(cwd = process.cwd(), argv = process.argv.slice(2)) {
  const cfg = readJson(resolve(cwd, ".drwil", "ia-first.json"));
  const T = TEXTS[cfg.lang === "en" ? "en" : "fr"];
  const dc = cfg.diffCoverage ?? {};
  const notRun = (why) => ({ code: 1, out: [fill(T.notRun, why)] });
  if (!dc.lcov) return notRun(T.noConfig);
  if (dc.produce && spawnSync(dc.produce, { cwd, shell: true, stdio: "ignore" }).status !== 0) return notRun(fill(T.produce, dc.produce));
  let report = "";
  try {
    report = readFileSync(resolve(cwd, dc.lcov), "utf8");
  } catch {}
  if (!report.trim()) return notRun(fill(T.noReport, dc.lcov));
  const flag = argv.indexOf("--base");
  const base = baseOf(cwd, dc.base, flag >= 0 ? argv[flag + 1] : undefined);
  const diff = git(cwd, ["diff", "--unified=0", "--no-color", "--no-ext-diff", `${base}...HEAD`]);
  if (diff.status !== 0) return notRun(fill(T.noBase, base));
  const { holes, unmeasured, refused } = verdict(parseLcov(report, cwd), parseDiff(diff.stdout), dc);
  const out = [
    ...refused.map((p) => fill(T.noReason, p)),
    ...holes.map((h) => fill(T[h.kind], h.file, h.n)),
    ...unmeasured.map((f) => fill(T.unmeasured, f)),
  ];
  return { code: out.length ? 1 : 0, out: out.length ? [fill(T.title, base), ...out.map((l) => `  ${l}`)] : [] };
}

// Run from the command line (not imported by a test): real paths compared, otherwise a symlinked
// .githooks/ would make the check pass without verifying anything.
if (realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const { code, out } = run();
  for (const line of out) console.error(line);
  process.exitCode = code;
}
