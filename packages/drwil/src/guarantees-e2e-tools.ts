// Table of the e2e tools (QUA-320, QUA-322, QUA-324, catalog:QUA-020): the kit declares the `e2e` check itself, sliced with
// `shards: "auto"`, for a tool of the table; the CI plan counts the tests and sets N at each run (engine-shards.mjs). One table, one source: `guarantees`
// declares from it, `doctor` compares against it. A tool outside the table is never sliced by force.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";
import { TEXTS } from "./guarantees-texts.js";
import type { DeclaredCheck } from "./guarantees-table.js";
import { fill, type MessageLang } from "./i18n.js";

type KitPaths = {
  kitPaths: (layer: string, files: string[]) => string[];
  kitCheck: (id: unknown) => boolean;
  kitPathsOf: (check: DeclaredCheck, files: string[]) => string[];
};
// The paths the kit gives its checks: one function, the scope gate's own (shipped by the template), which admits their rewrite.
const gate: KitPaths = await import(new URL("../templates/common/base/.githooks/scope-gate-kit.mjs", import.meta.url).href);
export const { kitPaths, kitCheck, kitPathsOf } = gate;

/** The project's files as `git add -A` would commit them (tracked, untracked not ignored); outside git, its top-level entries. */
export function projectFiles(root: string): string[] {
  const args = ["ls-files", "-z", "--cached", "--others", "--exclude-standard"];
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 30 });
  if (r.status === 0) return r.stdout.split("\0").filter(Boolean);
  try {
    return readdirSync(root, { withFileTypes: true }).map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
  } catch {
    return [];
  }
}

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

/**
 * The exact declaration the kit writes, on `paths` (`["**"]`: the one of the kits before the computed paths): `doctor` and the update
 * recognize a kit-declared check by it, never a hand-written one.
 */
export function e2eDeclaration(tool: E2eTool, config: string, layer: string, paths = ["**"]): DeclaredCheck {
  return {
    id: "e2e",
    name: `e2e (${tool.tool})`,
    run: tool.run(config),
    shards: "auto",
    shardsCount: tool.count(config),
    ...(layer === "." ? {} : { cwd: layer }),
    paths,
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
    checks.push(e2eDeclaration(found.tool, found.config, layer, kitPaths(".", projectFiles(root))));
    return [fill(T.e2eDeclared, found.tool.tool, posix.join(layer, found.config))];
  }
  return [fill(T.e2eOutside, E2E_TOOLS.map((t) => t.tool).join(", "))];
}

const intact = (root: string, c: DeclaredCheck): boolean => {
  const layer = typeof c.cwd === "string" ? c.cwd : ".";
  const found = e2eToolOf(root, layer);
  return !!found && JSON.stringify(e2eDeclaration(found.tool, found.config, layer)) === JSON.stringify(c);
};

/**
 * The kit's checks still on `paths: ["**"]`, rewritten in place with the paths the kit computes: the coverage of a layer
 * (`coverage-<layer>`, `coverage-diff-<layer>`) even modified by hand, `e2e` only as the kit wrote it (`left` otherwise). Nothing when
 * nothing delimits. Shared by the update and `doctor --fix`.
 */
export function rewriteKitPaths(checks: unknown[], root: string): { rewritten: string[]; left: string[] } {
  const done = { rewritten: [] as string[], left: [] as string[] };
  let files: string[] | undefined;
  for (const c of checks) {
    if (!c || typeof c !== "object" || !kitCheck((c as DeclaredCheck).id)) continue;
    const check = c as DeclaredCheck;
    if (JSON.stringify(check.paths) !== '["**"]') continue;
    files ??= projectFiles(root);
    const paths = kitPathsOf(check, files);
    if (paths.join() === "**") continue;
    if (check.id === "e2e" && !intact(root, check)) done.left.push("e2e");
    else {
      check.paths = paths;
      done.rewritten.push(String(check.id));
    }
  }
  return done;
}

const REPATHED = {
  fr: {
    rewritten:
      'Chemins posés par le kit sur {0} : ils étaient sur `paths: ["**"]`, rejoués par tout fichier modifié ; ils couvrent désormais le code et sa configuration (sources, tests, configuration de l\'outil, manifeste et verrou du paquet).',
    held: "Reste à décider : {0} reste sur `paths: [\"**\"]` — le garde de la branche principale (celui d'avant cette mise à jour) n'admettrait pas leur resserrement dans ce commit ; lancer `npx drwil doctor --fix` une fois cette mise à jour fusionnée.",
    left: 'Reste à décider : {0} retouché à la main reste sur `paths: ["**"]` — y poser les chemins de ce qu\'il lit (sources, tests, configuration, manifeste et verrou du paquet).',
  },
  en: {
    rewritten:
      'Paths set by the kit on {0}: they were on `paths: ["**"]`, replayed by any changed file; they now cover the code and its configuration (sources, tests, tool configuration, package manifest and lock).',
    held: 'Left to decide: {0} stays on `paths: ["**"]` — the main branch\'s guard (the one from before this update) would not admit narrowing them in this commit; run `npx drwil doctor --fix` once this update is merged.',
    left: 'Left to decide: {0}, modified by hand, stays on `paths: ["**"]` — set the paths of what it reads (sources, tests, configuration, package manifest and lock).',
  },
};

/** QUA-238: the guard the project had before the update (HEAD, never the announced version) exports `kitPathsOf`; CI replays that one. */
function guardAdmits(root: string): boolean {
  const shown = spawnSync("git", ["show", "HEAD:.githooks/scope-gate-kit.mjs"], { cwd: root, encoding: "utf8" });
  return shown.status === 0 && /export\s+(const|function)\s+kitPathsOf\b|export\s*\{[^}]*\bkitPathsOf\b/.test(shown.stdout);
}

/**
 * The update (QUA-141): rewrites the kit's `["**"]` checks of `.drwil/ia-first.json` and says which; the file is written only then,
 * and only if the project's guard from before the update admits it (QUA-238), else the report points to `doctor --fix`.
 */
export function repathConfig(root: string, lang: MessageLang): void {
  const file = join(root, ".drwil", "ia-first.json");
  let raw: { checks?: unknown };
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return;
  }
  if (!Array.isArray(raw?.checks)) return;
  const { rewritten, left } = rewriteKitPaths(raw.checks, root);
  const named = (ids: string[]) => ids.map((id) => `\`${id}\``).join(", ");
  if (!guardAdmits(root)) {
    if (rewritten.length) console.log(fill(REPATHED[lang].held, named(rewritten)));
    if (left.length) console.log(fill(REPATHED[lang].left, named(left)));
    return;
  }
  if (rewritten.length) writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`);
  if (rewritten.length) console.log(fill(REPATHED[lang].rewritten, named(rewritten)));
  if (left.length) console.log(fill(REPATHED[lang].left, named(left)));
}
