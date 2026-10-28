#!/usr/bin/env node
// Watches the size of the files the kit installs, never the project's own code (that is
// check-file-size.mjs, opt-in). Ceilings in lines, by kind: code, hooks and settings 200,
// AGENTS.md 100, on-demand documents 800, recipes 250.
// - In the drwil repository (packages/drwil/templates/ present): measures the template, an overrun fails.
// - In an adopted project: measures the files of .drwil/installed-files.json, an overrun is a warning
//   ("[ia-first-warning]") that never blocks an update; a project may enrich a kit file on purpose.
// A list that is absent, unreadable or empty fails: an unexecuted check is not a passed one (QUA-013).
// "kitSizeLegacy" ({ "docs/ia-first.md": 916 }) in .drwil/ia-first.json tolerates a file already above
// its ceiling up to that size: it can only shrink.
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

export const CEILINGS = { code: 200, agents: 100, docs: 800, recipes: 250 };
const TEMPLATES = join("packages", "drwil", "templates");
const MANIFEST = join(".drwil", "installed-files.json");

const TEXTS = {
  fr: {
    over: "{0} : {1} lignes, plafond {2} ({3}) — le réduire",
    legacy: "{0} : {1} lignes, plafond hérité {2} (ne doit plus grossir)",
    noList: "Liste des fichiers installés absente, illisible ou vide ({0}) : rien n'a été mesuré.",
    title: "Fichiers du kit trop gros :",
    kinds: { code: "code, hooks, réglages", agents: "AGENTS.md", docs: "document", recipes: "recette" },
  },
  en: {
    over: "{0}: {1} lines, ceiling {2} ({3}) — reduce it",
    legacy: "{0}: {1} lines, legacy cap {2} (must not grow any more)",
    noList: "List of installed files missing, unreadable or empty ({0}): nothing was measured.",
    title: "Kit files too big:",
    kinds: { code: "code, hooks, settings", agents: "AGENTS.md", docs: "document", recipes: "recipe" },
  },
};

const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** Kind of a kit file, from its path (relative to the project or to the template). */
export function kindOf(file, recipesDir = "docs/recipes") {
  if (basename(file) === "AGENTS.md" || /(^|\/)layers\/[^/]+\.md$/.test(file)) return "agents";
  if (`/${file}`.includes(`/${recipesDir}/`)) return "recipes";
  return /\.(md|mdc)$/.test(file) ? "docs" : "code";
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__pycache__") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path.replace(/\\/g, "/");
  }
}

// The project's own files, seeded by the kit then filled in by the project: never measured.
function projectOwned(file, dirs) {
  const owned = [dirs.projects, dirs.intentions].filter(Boolean).map((d) => `${d}/`);
  return owned.some((d) => file.startsWith(d)) || [dirs.contracts, "README.md", "docs/architecture.md", "docs/features.md"].includes(file);
}

/** Overruns among `files`: [{ file, lines, cap, kind, legacy }]. */
export function measure(files, { recipesDir, legacy = {} }) {
  const over = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n").length - 1;
    const kind = kindOf(file, recipesDir);
    const key = Object.keys(legacy).find((k) => file === k || file.endsWith(`/${k}`));
    const cap = key ? legacy[key] : CEILINGS[kind];
    if (lines > cap) over.push({ file, lines, cap, kind, legacy: Boolean(key) });
  }
  return over;
}

/** Exit code and lines to print for the project in `process.cwd()`. */
export function run() {
  const config = readJson(join(".drwil", "ia-first.json")) ?? {};
  const T = TEXTS[config.lang === "en" ? "en" : "fr"];
  const dirs = config.dirs ?? {};
  const inRepo = existsSync(TEMPLATES);
  const manifest = inRepo ? null : readJson(MANIFEST);
  const listed = inRepo ? [...walk(TEMPLATES)] : Object.keys(manifest ?? {}).filter((f) => !projectOwned(f, dirs) && existsSync(f));
  if (!inRepo && (!manifest || !Object.keys(manifest).length)) return { code: 1, out: [fill(T.noList, MANIFEST)] };
  const over = measure(listed, { recipesDir: dirs.recipes, legacy: config.kitSizeLegacy ?? {} });
  const lines = over.map((o) => fill(o.legacy ? T.legacy : T.over, o.file, o.lines, o.cap, T.kinds[o.kind]));
  if (inRepo) return { code: lines.length ? 1 : 0, out: lines.length ? [T.title, ...lines.map((l) => `  ${l}`)] : [] };
  return { code: 0, out: lines.map((l) => `[ia-first-warning] ${l}`) };
}

// Run from the command line (not imported by a test): real paths compared, otherwise a symlinked
// .githooks/ would make the check pass without verifying anything.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const { code, out } = run();
  for (const line of out) (code ? console.error : console.log)(line);
  process.exitCode = code;
}
