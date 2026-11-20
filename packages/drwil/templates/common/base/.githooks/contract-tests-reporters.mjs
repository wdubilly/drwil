// Lanceurs de tests des contrôles de contrats (contract-tests.mjs) : détection, ligne de commande, lecture des résultats.
// Vitest et Jest écrivent le même rapport JSON (testResults → assertionResults) ; `node --test` reçoit ce module comme
// reporter, une ligne JSON par test.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RUNNERS = ["vitest", "jest", "node"];
const MODULE = fileURLToPath(import.meta.url);

/** Reporter de `node --test` : { file, title, ancestors, state, broken } par test. */
export default async function* reporter(source) {
  for await (const e of source) {
    if (e.type !== "test:pass" && e.type !== "test:fail") continue;
    const d = e.data;
    const state = d.skip || d.todo ? "skipped" : e.type === "test:pass" ? "passed" : "failed";
    // Un fichier qui n'a pas pu se charger, ou dont le processus est mort, est rapporté comme un test au nom du fichier.
    const broken = state === "failed" && d.nesting === 0 && resolve(d.name) === d.file;
    yield `${JSON.stringify({ file: d.file, title: d.name, ancestors: [], state, broken })}\n`;
  }
}

/** Le `package.json` du paquet installé, cherché en remontant les dossiers comme le fait Node ; null s'il manque. */
function manifest(name, from) {
  let dir = resolve(from);
  while (!existsSync(join(dir, "node_modules", name, "package.json"))) {
    if (dirname(dir) === dir) return null;
    dir = dirname(dir);
  }
  return join(dir, "node_modules", name, "package.json");
}

/** Le lanceur du projet, lu dans les dépendances de son `package.json` : Vitest, sinon Jest, sinon `node --test`. */
export function detect(root) {
  let pkg = {};
  try {
    pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  } catch {}
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return ["vitest", "jest"].find((name) => name in deps) ?? "node";
}

/**
 * Un lancement : { args } à donner à node, ou { missing } quand le lanceur n'est pas installé. `files` vide : toute la suite.
 * `out` : le fichier où le lanceur laisse le résultat de chaque test.
 */
export function command(runner, files, out, root) {
  if (runner === "node") {
    const reporters = ["--test-reporter=spec", `--test-reporter=${MODULE}`];
    return { args: ["--test", ...reporters, "--test-reporter-destination=stdout", `--test-reporter-destination=${out}`, ...files] };
  }
  const found = manifest(runner, root);
  if (!found) return { missing: runner };
  const { bin } = JSON.parse(readFileSync(found, "utf8"));
  const entry = join(dirname(found), typeof bin === "string" ? bin : bin[runner]);
  const options =
    runner === "vitest"
      ? ["run", "--reporter=default", "--reporter=json", `--outputFile.json=${out}`]
      : ["--json", `--outputFile=${out}`, ...(files.length ? ["--runTestsByPath"] : [])];
  return { args: [entry, ...options, ...files] };
}

/**
 * Résultats d'un lancement : { tests: [{ file, title, ancestors, state }], broken: [{ file, tests }] }, `broken` étant les
 * fichiers en erreur hors de tout test (chargement, hook de suite). Texte illisible : une exception, à l'appelant.
 */
export function parse(runner, text) {
  if (runner === "node") {
    const all = text
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    const tests = all.filter((t) => !t.broken);
    const broken = all.filter((t) => t.broken).map((t) => ({ file: t.file, tests: tests.filter((u) => u.file === t.file).length }));
    return { tests, broken };
  }
  const tests = [];
  const broken = [];
  for (const f of JSON.parse(text).testResults ?? []) {
    const own = (f.assertionResults ?? []).map((a) => ({
      file: f.name,
      title: a.title,
      ancestors: a.ancestorTitles ?? [],
      state: a.status,
    }));
    tests.push(...own);
    if (f.status === "failed" && !own.some((t) => t.state === "failed")) broken.push({ file: f.name, tests: own.length });
  }
  return { tests, broken };
}
