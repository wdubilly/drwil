#!/usr/bin/env node
// Contrôle d'un contrat métier : son verdict, lu dans un lancement de ses tests partagé avec les autres contrats.
// Un contrôle `npx vitest run -t "APP-001"` par contrat relance tout le lanceur (démarrage, transformation, imports) autant
// de fois qu'il y a de contrats. Ici le lanceur n'est lancé qu'une fois par passe de `run-checks` (DRWIL_PASS_ID, posé par le
// moteur) pour tous les contrôles qui le partagent ; un reporter laisse le résultat de chaque test, lu ensuite par ID.
// Hors passe (lancement à la main), le lanceur est rejoué.
// Usage : node .githooks/contract-tests.mjs [--runner vitest|jest|node] <ID> [fichier…]
//   (sans fichier : toute la suite ; avec `node --test`, un lancement par fichier)
import { spawnSync } from "node:child_process";
import { globSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RUNNERS, command, detect, parse } from "./contract-tests-reporters.mjs";

const CACHE = join(".drwil", "evidence", "passe");

const TEXTS = {
  fr: {
    usage: "usage : node .githooks/contract-tests.mjs [--runner vitest|jest|node] <ID> [fichier…]",
    missing: (r) => `${r} introuvable dans node_modules : installer les dépendances, ou déclarer le lanceur (--runner)`,
    dead: (what, code) => `${what} : aucun test joué, code ${code}`,
    broken: (f) => `${f} : erreur hors de tout test (chargement, hook de suite) : ses tests ne prouvent rien`,
    failed: (f, name) => `${f} : ✗ ${name}`,
    none: (id, what) => `aucun test joué de ${what} ne porte l'ID ${id}`,
    all: "toute la suite",
    ok: (id, runner, n) => `${id} : ${n} test(s) à l'ID, verdict lu dans un lancement ${runner} partagé`,
  },
  en: {
    usage: "usage: node .githooks/contract-tests.mjs [--runner vitest|jest|node] <ID> [file…]",
    missing: (r) => `${r} not found in node_modules: install the dependencies, or declare the runner (--runner)`,
    dead: (what, code) => `${what}: no test run, code ${code}`,
    broken: (f) => `${f}: error outside any test (loading, suite hook): its tests prove nothing`,
    failed: (f, name) => `${f}: ✗ ${name}`,
    none: (id, what) => `no test run from ${what} carries the ID ${id}`,
    all: "the whole suite",
    ok: (id, runner, n) => `${id}: ${n} test(s) with the ID, verdict read from a shared ${runner} run`,
  },
};

const wait = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Joue un lancement : { tests, broken, code, output, missing? } ; `node` : l'exécutable qui lance (remplaçable en test). */
export function play(runner, files, dir, root = process.cwd(), node = process.execPath) {
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "results");
  const cmd = command(runner, files, out, root);
  if (cmd.missing) return { tests: [], broken: [], code: 1, output: "", missing: cmd.missing };
  // NODE_TEST_CONTEXT : sous un `node --test` parent, l'enfant serait sauté sans bruit et rendrait 0 (faux succès).
  const env = { ...process.env, NODE_TEST_CONTEXT: undefined };
  const r = spawnSync(node, cmd.args, { cwd: root, encoding: "utf8", env, maxBuffer: 1 << 30 });
  let found = { tests: [], broken: [] };
  try {
    found = parse(runner, readFileSync(out, "utf8"));
  } catch {}
  const short = (x) => ({ ...x, file: relative(root, resolve(root, x.file)) });
  found = { tests: found.tests.map(short), broken: found.broken.map(short) };
  return { ...found, code: r.error ? 1 : r.status, output: `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? r.error.message : ""}` };
}

/** Le résultat d'un lancement pour cette passe : le premier contrôle qui arrive le joue, les autres l'attendent. */
export function shared(runner, files, pass, root = process.cwd(), { tries = 3000, node } = {}) {
  const cache = join(root, CACHE);
  if (!pass) {
    // Hors passe, rien à partager : le résultat ne laisse aucune trace dans le projet.
    const dir = mkdtempSync(join(tmpdir(), "drwil-contract-tests-"));
    const r = play(runner, files, dir, root, node);
    rmSync(dir, { recursive: true, force: true });
    return r;
  }
  const base = join(cache, pass);
  const key = `${runner}-${files.join("+") || "tout"}`.replace(/[^\w.+-]+/g, "_");
  const final = join(base, `${key}.json`);
  mkdirSync(base, { recursive: true });
  // Une passe d'avant ne sert à personne : son dossier est effacé.
  for (const d of readdirSync(cache)) if (d !== pass) rmSync(join(cache, d), { recursive: true, force: true });
  for (let n = 0; n < tries; n++) {
    try {
      return JSON.parse(readFileSync(final, "utf8"));
    } catch {}
    try {
      mkdirSync(join(base, `${key}.verrou`));
    } catch {
      wait(200);
      continue;
    }
    const r = play(runner, files, join(base, `${key}.travail`), root, node);
    writeFileSync(`${final}.tmp`, JSON.stringify(r));
    renameSync(`${final}.tmp`, final);
    rmSync(join(base, `${key}.travail`), { recursive: true, force: true });
    return r;
  }
  // Le verrou n'a jamais été levé (processus mort) : ce contrôle joue le lancement lui-même.
  return play(runner, files, join(base, `${key}.secours-${process.pid}`), root, node);
}

/** Verdict d'un contrat sur ses lancements [{ what, result }] : { ok, lines, count }. */
export function verdict(id, launches, T = TEXTS.fr) {
  const lines = [];
  let count = 0;
  // Sans RegExp construite depuis l'ID : une valeur de la ligne de commande n'est jamais un motif.
  const carries = (name) => name.startsWith(id) && !/[\w-]/.test(name.charAt(id.length));
  const mine = (t) => carries(t.title) || t.ancestors.some(carries);
  for (const { what, result: r } of launches) {
    const before = lines.length;
    const played = r.tests.filter((t) => t.state === "passed" || t.state === "failed");
    const chosen = played.filter(mine);
    count += chosen.length;
    if (r.missing) lines.push(T.missing(r.missing));
    else if (!r.tests.length && !r.broken.length && r.code !== 0) lines.push(T.dead(what, r.code));
    // Un fichier en erreur hors test : sans test lu, il cachait peut-être ceux du contrat ; avec, ses tests ne prouvent rien.
    for (const b of r.broken) if (!b.tests || chosen.some((t) => t.file === b.file)) lines.push(T.broken(b.file));
    for (const t of chosen) if (t.state === "failed") lines.push(T.failed(t.file, [...t.ancestors, t.title].join(" › ")));
    if (lines.length > before && r.output) lines.push(r.output.split("\n").slice(-40).join("\n"));
  }
  if (!count) lines.push(T.none(id, launches.map((l) => l.what).join(", ")));
  return { ok: !lines.length, lines, count };
}

/** Ligne de commande : { runner, id, files } ou null si elle est incomplète. */
export function parseArgs(argv, root = process.cwd()) {
  const rest = [...argv];
  let runner = detect(root);
  const at = rest.indexOf("--runner");
  if (at >= 0) [, runner] = rest.splice(at, 2);
  const [id, ...asked] = rest;
  if (!id || !RUNNERS.includes(runner)) return null;
  // Un motif (« src/**/*.test.js ») est développé ici : le même contrôle sous tous les interpréteurs de commandes.
  const files = asked.flatMap((f) => (f.includes("*") ? globSync(f, { cwd: root }).sort() : [f]));
  return { runner, id, files };
}

/** Messages dans la langue du projet (français par défaut). */
export function texts(root = process.cwd()) {
  try {
    return TEXTS[JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr"];
  } catch {
    return TEXTS.fr;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const T = texts();
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error(T.usage);
    process.exit(2);
  }
  const { runner, id, files } = args;
  // `node --test` isole déjà chaque fichier : un lancement par fichier, partagé par tous les contrats qui le citent.
  const sets = runner === "node" && files.length ? files.map((f) => [f]) : [files];
  const launches = sets.map((set) => ({ what: set.join(", ") || T.all, result: shared(runner, set, process.env.DRWIL_PASS_ID) }));
  const { ok, lines, count } = verdict(id, launches, T);
  for (const l of lines) console.error(l);
  if (ok) console.log(T.ok(id, runner, count));
  process.exitCode = ok ? 0 : 1;
}
