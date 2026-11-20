// Table of the e2e tools (QUA-320, QUA-322, QUA-324, catalog:QUA-020): the kit declares the `e2e` check itself, sliced with
// `shards: "auto"`, for a tool of the table; the CI plan counts the tests and sets N at each run (engine-shards.mjs). One table, one source: `guarantees`
// declares from it, `doctor` compares against it. A tool outside the table is never sliced by force.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { TEXTS } from "./guarantees-texts.js";
import type { DeclaredCheck } from "./guarantees-table.js";
import { fill, type MessageLang } from "./i18n.js";

export interface E2eTool {
  tool: string;
  /** Configuration files naming the tool as the e2e one of the layer (first found): the probe, never a unit-test config. */
  configs: string[];
  /** Command printing the tests on stdout, its last line holding their number (setup on stderr: the plan job has only Node). */
  count: (config: string) => string;
  /** Command of a slice, setup included: the slice job has only Node too (D5). */
  run: (config: string) => string;
}

const SLICE = "--shard=$DRWIL_SHARD_INDEX/$DRWIL_SHARD_TOTAL";
// The plan and slice jobs check out the repository without its dependencies; locally they are already there.
const DEPS = "( [ -d node_modules ] || npm ci )";
// A failed listing prints nothing: JSON.parse then fails, and so does the plan (QUA-013), never a count of 0.
const LENGTH = `node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).length))"`;
const exts = (base: string, list: string[]) => list.map((x) => `${base}.${x}`);

export const E2E_TOOLS: E2eTool[] = [
  {
    tool: "Playwright",
    configs: exts("playwright.config", ["ts", "js", "mts", "mjs", "cts", "cjs"]),
    // Last line of `--list`: « Total: 12 tests in 3 files ».
    count: (f) => `${DEPS} >&2 && npx playwright test --config ${f} --list`,
    // System libraries of the browsers only in CI: locally `--with-deps` would ask for root.
    run: (f) => `${DEPS} && npx playwright install \${CI:+--with-deps} && npx playwright test --config ${f} ${SLICE}`,
  },
  {
    tool: "Vitest",
    configs: [...exts("vitest.e2e.config", ["ts", "mts", "js", "mjs"]), ...exts("vitest.config.e2e", ["ts", "mts", "js", "mjs"])],
    count: (f) => `${DEPS} >&2 && npx vitest list --config ${f} --json | ${LENGTH}`,
    run: (f) => `${DEPS} && npx vitest run --config ${f} ${SLICE}`,
  },
  {
    tool: "Jest",
    // `test/jest-e2e.json`: the e2e configuration NestJS generates. Jest lists test files, the unit it slices by.
    configs: [...exts("jest.e2e.config", ["ts", "js", "mjs", "cjs", "json"]), "test/jest-e2e.json"],
    count: (f) => `${DEPS} >&2 && npx jest --config ${f} --listTests --json | ${LENGTH}`,
    run: (f) => `${DEPS} && npx jest --config ${f} ${SLICE}`,
  },
];

/** The e2e tool of a layer and its configuration file, or null: no tool of the table there. */
export function e2eToolOf(root: string, layer: string): { tool: E2eTool; config: string } | null {
  for (const tool of E2E_TOOLS) {
    const config = tool.configs.find((f) => existsSync(join(root, layer, f)));
    if (config) return { tool, config };
  }
  return null;
}

/** The exact declaration the kit writes: `doctor` recognizes a kit-declared check by it, never a hand-written one. */
export function e2eDeclaration(tool: E2eTool, config: string, layer: string): DeclaredCheck {
  return {
    id: "e2e",
    name: `e2e (${tool.tool})`,
    run: tool.run(config),
    shards: "auto",
    shardsCount: tool.count(config),
    ...(layer === "." ? {} : { cwd: layer }),
    paths: ["**"],
    degradable: false,
  };
}

/**
 * Declares the `e2e` check in `checks` for the root, else the first layer, holding a tool of the table (an e2e suite often sits at the
 * root, beside the layers it crosses); a declared `e2e` check is kept as it is (written or modified by hand). Returns the lines of the
 * report; nothing while no layer holds code (QUA-224).
 */
export function declareE2e(
  root: string,
  layers: { layer: string; status: string }[],
  checks: DeclaredCheck[],
  lang: MessageLang,
): string[] {
  const T = TEXTS[lang];
  if (layers.every((l) => l.status === "not-applicable")) return [];
  if (checks.some((c) => c?.id === "e2e")) return [T.e2eKept];
  for (const layer of new Set([".", ...layers.map((l) => l.layer)])) {
    const found = e2eToolOf(root, layer);
    if (!found) continue;
    checks.push(e2eDeclaration(found.tool, found.config, layer));
    return [fill(T.e2eDeclared, found.tool.tool, join(layer, found.config))];
  }
  return [fill(T.e2eOutside, E2E_TOOLS.map((t) => t.tool).join(", "))];
}
