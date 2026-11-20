// `drwil doctor --fix` (QUA-318, QUA-303): rewrites in `.drwil/ia-first.json` only what has one safe, deterministic form;
// anything else stays reported by its point, with the line to set. Without `--fix`, `doctor` writes nothing.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { declaredPair, singleFromPair } from "./guarantees-merge.js";
import { fill, type MessageLang } from "./i18n.js";
import { loadProject } from "./verify-project.js";
import type { DiagnosisPoint } from "./doctor.js";

const TEXTS = {
  fr: {
    label: "Corrigé par --fix",
    grouped: "`{0}` groupé",
    paths: '`{0}` : "paths": ["**"]',
    merged: "`{0}` fusionné dans `{1}`",
  },
  en: {
    label: "Fixed by --fix",
    grouped: "`{0}` grouped",
    paths: '`{0}`: "paths": ["**"]',
    merged: "`{0}` merged into `{1}`",
  },
};

export type Fix = { kind: "grouped" | "paths"; id: string } | { kind: "merged"; id: string; into: string };
type Check = Record<string, unknown>;

const ID = "[A-Z][A-Z0-9]*-\\d+";
const FILE = String.raw`[^\s"'-][^\s"']*\.(?:test|spec)\.[cm]?[jt]sx?`;
// Strict forms only: the runner, its test files and a filter on exactly one ID. Any other option (configuration, project,
// environment variable, chained command) would be lost by the grouped form: such a check stays reported, never rewritten.
const DIRECT = new RegExp(
  String.raw`^(?:npx\s+)?(vitest(?:\s+run)?|jest)((?:\s+${FILE})*)\s+(?:-t|--testNamePattern)(?:\s+|=)(["']?)(${ID})\3((?:\s+${FILE})*)$`,
);
const NPM = new RegExp(String.raw`^npm\s+(?:run\s+)?test\s+--\s+(?:-t|--testNamePattern)(?:\s+|=)(["']?)(${ID})\1$`);
// `npm test` is only the runner when the project's test script is the bare runner (otherwise its options would be lost).
const SCRIPTS: Record<string, string> = { vitest: "vitest", "vitest run": "vitest", jest: "jest" };

/**
 * The grouped form of a contract check when the rewrite keeps everything its command did, `null` otherwise. Each test file must
 * exist at that path: Vitest filters and Jest matches its arguments, the grouped form passes them as paths.
 */
export function safeGrouped(run: string, root: string, testScript: unknown): string | null {
  const direct = DIRECT.exec(run);
  const npm = direct ? null : NPM.exec(run);
  const script = typeof testScript === "string" ? SCRIPTS[testScript.trim()] : undefined;
  const runner = direct ? (direct[1].startsWith("vitest") ? "vitest" : "jest") : npm ? script : undefined;
  if (!runner) return null;
  const files = direct ? `${direct[2]}${direct[5]}`.split(/\s+/).filter(Boolean) : [];
  if (!files.every((f) => existsSync(join(root, f)))) return null;
  return ["node .githooks/contract-tests.mjs --runner", runner, direct ? direct[4] : npm?.[2], ...files].join(" ");
}

const same = (a: Check, b: Check, key: string) => JSON.stringify(a[key]) === JSON.stringify(b[key]);
const atRoot = (c: Check) => c.cwd === undefined || c.cwd === ".";

/**
 * Rewrites `checks` in place, only the safe forms; returns what was rewritten. `cited`: the checks a contract cites (a merged
 * `coverage-<layer>` would leave its citation unknown, so the pair stays reported).
 */
export function fixChecks(checks: unknown[], ctx: { root: string; cited: Set<string>; testScript: unknown }): Fix[] {
  const fixes: Fix[] = [];
  const list = checks.filter((c): c is Check => !!c && typeof c === "object");
  const tool = existsSync(join(ctx.root, ".githooks", "contract-tests.mjs"));
  for (const c of list) {
    const id = typeof c.id === "string" ? c.id : String(c.run);
    const grouped = tool && atRoot(c) && typeof c.run === "string" ? safeGrouped(c.run, ctx.root, ctx.testScript) : null;
    if (grouped) {
      c.run = grouped;
      fixes.push({ kind: "grouped", id });
    }
    // An empty list may be meant (never at commit): only a missing `paths` is set.
    if (Array.isArray(c.runAt) && c.runAt.join() === "ci" && !("paths" in c)) {
      c.paths = ["**"];
      fixes.push({ kind: "paths", id });
    }
  }
  for (const diff of list) {
    const slug = typeof diff.id === "string" ? /^coverage-diff-(.+)$/.exec(diff.id)?.[1] : undefined;
    const pair = slug ? declaredPair(list, slug) : null;
    const single = pair && singleFromPair(pair);
    if (!pair || !single || ctx.cited.has(`coverage-${slug}`)) continue;
    const { threshold } = pair as { threshold: Check };
    if (!["cwd", "runAt", "paths"].every((k) => same(threshold, diff, k))) continue;
    diff.run = single;
    checks.splice(checks.indexOf(threshold), 1);
    fixes.push({ kind: "merged", id: `coverage-${slug}`, into: `coverage-diff-${slug}` });
  }
  return fixes;
}

/** Applies the safe fixes to `.drwil/ia-first.json`, written only when something changed. Not a drwil project: nothing. */
export async function fixConfig(root: string): Promise<Fix[]> {
  const project = await loadProject(root);
  if (typeof project === "string") return [];
  const file = join(root, ".drwil", "ia-first.json");
  const raw = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(raw.checks)) return [];
  const contracts: { checks?: string[] | null }[] = project.contracts.readContracts(readFileSync(join(root, project.registry), "utf8"));
  let testScript: unknown;
  try {
    testScript = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts?.test;
  } catch {}
  const cited = new Set(contracts.flatMap((k) => k.checks ?? []));
  const fixes = fixChecks(raw.checks, { root, cited, testScript });
  if (fixes.length) writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`);
  return fixes;
}

/** Point `fixed`: what `--fix` rewrote, none when nothing was. */
export function fixedPoints(fixes: Fix[], lang: MessageLang = "fr"): DiagnosisPoint[] {
  const T = TEXTS[lang];
  const said = fixes.map((f) => (f.kind === "merged" ? fill(T.merged, f.id, f.into) : fill(T[f.kind], f.id)));
  return said.length ? [{ id: "fixed", label: T.label, state: "ok", detail: said.join(" ; ") }] : [];
}
