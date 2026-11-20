import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, play, shared, texts, verdict } from "./contract-tests.mjs";
import reporter, { command, detect, parse } from "./contract-tests-reporters.mjs";

const SCRIPT = fileURLToPath(new URL("./contract-tests.mjs", import.meta.url));
let dirs = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dirs = [];
});
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-contract-tests-"));
  dirs.push(d);
  return d;
};
const write = (root, file, text) => {
  mkdirSync(join(root, file, ".."), { recursive: true });
  writeFileSync(join(root, file), text);
};

// Un faux Vitest (bin objet) et un faux Jest (bin chaîne) : chacun compte ses lancements et écrit le rapport JSON préparé.
const FAKE = [
  'const fs = require("node:fs");',
  'fs.appendFileSync("lancements.txt", "x");',
  'const out = process.argv.find((a) => a.startsWith("--outputFile")).split("=")[1];',
  'fs.writeFileSync(out, fs.readFileSync("rapport.json", "utf8"));',
].join("\n");
function project(runner, report) {
  const root = tmp();
  const pkg = runner === "vitest" ? { bin: { vitest: "cli.cjs" } } : { bin: "cli.cjs" };
  write(root, `node_modules/${runner}/package.json`, JSON.stringify(pkg));
  write(root, `node_modules/${runner}/cli.cjs`, FAKE);
  write(root, "package.json", JSON.stringify({ devDependencies: { [runner]: "1" } }));
  write(root, "rapport.json", JSON.stringify(report));
  return root;
}
const assertion = (title, status, ancestorTitles = []) => ({ title, status, ancestorTitles });
const REPORT = {
  testResults: [
    {
      name: "src/a.test.js",
      status: "failed",
      assertionResults: [assertion("cas", "passed", ["APP-001 : r"]), assertion("APP-002 : cassé", "failed")],
    },
    {
      name: "src/b.test.js",
      status: "passed",
      assertionResults: [assertion("APP-003 : bon", "passed"), assertion("APP-0031 : autre", "passed")],
    },
  ],
};
const cli = (root, args, pass) =>
  spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, DRWIL_PASS_ID: pass ?? "", NODE_TEST_CONTEXT: undefined },
  });

test("QUA-316 : dans une passe, le lanceur n'est lancé qu'une fois pour tous les contrats qui le partagent ; le verdict ne lit que les tests à l'ID", () => {
  for (const runner of ["vitest", "jest"]) {
    const root = project(runner, REPORT);
    assert.equal(cli(root, ["APP-001"], "p1").status, 0, "un test dans un describe à l'ID compte");
    const ko = cli(root, ["APP-002"], "p1");
    assert.equal(ko.status, 1);
    assert.match(ko.stderr, /src\/a\.test\.js : ✗ APP-002 : cassé/);
    assert.equal(cli(root, ["APP-003"], "p1").status, 0, "un test cassé fait échouer son seul contrat");
    assert.equal(readFileSync(join(root, "lancements.txt"), "utf8"), "x");
    assert.equal(cli(root, ["APP-003"], "p2").status, 0);
    assert.deepEqual(readdirSync(join(root, ".drwil", "evidence", "passe")), ["p2"]);
    assert.equal(readFileSync(join(root, "lancements.txt"), "utf8"), "xx");
  }
  const root = project("jest", REPORT);
  assert.equal(cli(root, ["APP-003", "src/b.test.js"]).status, 0);
  assert.equal(cli(root, ["APP-003", "src/*.test.js"]).status, 0, "un motif est développé");
});

test("QUA-316 : avec `node --test`, chaque fichier est lancé une fois par passe, partagé entre les contrats qui le citent", () => {
  const root = tmp();
  // Sur une seule ligne : le vérificateur des tests de contrats ne doit pas lire ce jeu d'essai comme de vrais tests.
  const jeu =
    'import { test, describe } from "node:test"; import { appendFileSync } from "node:fs"; appendFileSync("lancements.txt", "x"); describe("APP-901 : r", () => { test("a", () => {}); test("b", { skip: true }, () => {}); }); test("APP-902 : cassé", () => { throw new Error("cassé"); });';
  write(root, "a.test.mjs", `${jeu}\n`);
  write(root, "b.test.mjs", 'import { test } from "node:test"; test("APP-901 : aussi", () => {});\n');
  assert.equal(cli(root, ["APP-901", "a.test.mjs", "b.test.mjs"], "p1").status, 0);
  assert.equal(cli(root, ["--runner", "node", "APP-902", "a.test.mjs"], "p1").status, 1);
  assert.equal(readFileSync(join(root, "lancements.txt"), "utf8"), "x");
  assert.match(cli(root, ["APP-901", "a.test.mjs"]).stdout, /APP-901 : 1 test\(s\) à l'ID/);
  assert.equal(readFileSync(join(root, "lancements.txt"), "utf8"), "xx", "hors passe, le fichier est rejoué");
});

test("QUA-317 : aucun test à l'ID, un lancement qui n'a rien joué ou un fichier en erreur hors test n'est jamais un succès", () => {
  const T = texts("/nulle-part");
  const launch = (result) => [{ what: "suite", result: { tests: [], broken: [], code: 0, output: "", ...result } }];
  const ok = { file: "a", title: "APP-001 : x", ancestors: [], state: "passed" };
  assert.equal(verdict("APP-001", launch({ tests: [ok] }), T).ok, true);
  assert.match(verdict("APP-009", launch({ tests: [ok] }), T).lines.join(), /aucun test joué de suite ne porte l'ID APP-009/);
  assert.equal(verdict("APP-.*", launch({ tests: [ok] }), T).ok, false, "un ID n'est jamais un motif");
  assert.equal(verdict("APP-001", launch({ tests: [{ ...ok, state: "skipped" }] }), T).ok, false, "un test sauté ne prouve rien");
  assert.match(verdict("APP-001", launch({ code: 3, output: "mort" }), T).lines.join(), /suite : aucun test joué, code 3,mort/);
  assert.match(verdict("APP-001", launch({ missing: "vitest" }), T).lines[0], /vitest introuvable/);
  const brokenEmpty = verdict("APP-001", launch({ tests: [ok], broken: [{ file: "b", tests: 0 }] }), T);
  assert.match(brokenEmpty.lines[0], /^b : erreur hors de tout test/);
  assert.equal(verdict("APP-001", launch({ tests: [ok], broken: [{ file: "a", tests: 1 }] }), T).ok, false);
  assert.equal(
    verdict("APP-001", launch({ tests: [ok], broken: [{ file: "c", tests: 2 }] }), T).ok,
    true,
    "l'erreur d'un autre fichier lu ne touche pas ce contrat",
  );

  const root = tmp();
  write(root, "casse.test.mjs", 'import "./absent.mjs";\n');
  const dead = cli(root, ["APP-001", "casse.test.mjs"]);
  assert.equal(dead.status, 1);
  assert.match(dead.stderr, /casse\.test\.mjs : erreur hors de tout test/);
  const vide = project("vitest", { testResults: [{ name: join(root, "x.test.js"), status: "failed", message: "chargement" }, {}] });
  assert.equal(cli(vide, ["APP-001"]).status, 1);
  assert.match(cli(tmp(), ["--runner", "jest", "APP-001"]).stderr, /jest introuvable dans node_modules/);
  assert.equal(cli(tmp(), ["APP-001"]).status, 1, "node --test sans aucun fichier de test : rien joué");
  assert.match(cli(tmp(), []).stderr, /usage/);
  assert.equal(cli(tmp(), ["--runner", "mocha", "APP-001"]).status, 2);
});

test("QUA-317 : un lanceur qui ne démarre pas, ou un verrou jamais levé, ne donne jamais un succès hors de tout lancement", () => {
  const root = tmp();
  const r = play("node", [], join(root, "w"), root, join(root, "absent"));
  assert.equal(r.code, 1);
  assert.match(r.output, /ENOENT/);
  write(root, "a.test.mjs", 'import { test } from "node:test"; test("APP-1 : x", () => {});\n');
  mkdirSync(join(root, ".drwil", "evidence", "passe", "p1", "node-a.test.mjs.verrou"), { recursive: true });
  const secours = shared("node", ["a.test.mjs"], "p1", root, { tries: 2 });
  assert.deepEqual(
    secours.tests.map((t) => [t.file, t.title]),
    [["a.test.mjs", "APP-1 : x"]],
  );
  assert.equal(shared("node", ["a.test.mjs"], "", root).tests.length, 1);
});

test("QUA-316 : le lanceur est détecté dans les dépendances, ou déclaré, et ses résultats lus dans la même forme", async () => {
  const root = tmp();
  assert.equal(detect(root), "node");
  write(root, "package.json", JSON.stringify({ dependencies: { jest: "1" } }));
  assert.equal(detect(root), "jest");
  write(root, "package.json", JSON.stringify({ devDependencies: { vitest: "1", jest: "1" } }));
  assert.deepEqual(parseArgs(["APP-001"], root), { runner: "vitest", id: "APP-001", files: [] });
  assert.equal(parseArgs(["--runner", "node", "APP-001", "a.js"], root).runner, "node");
  assert.equal(command("vitest", [], "o", root).missing, "vitest");
  write(root, "node_modules/jest/package.json", JSON.stringify({ bin: "bin/jest.js" }));
  assert.deepEqual(command("jest", [], "o", root).args.slice(1), ["--json", "--outputFile=o"]);
  assert.ok(command("jest", ["a"], "o", root).args.includes("--runTestsByPath"));
  assert.deepEqual(parse("jest", JSON.stringify({})), { tests: [], broken: [] });
  const vitest = parse(
    "vitest",
    JSON.stringify({ testResults: [{ name: "f", status: "failed", assertionResults: [{ title: "t", status: "failed" }] }] }),
  );
  assert.deepEqual(vitest, { tests: [{ file: "f", title: "t", ancestors: [], state: "failed" }], broken: [] });
  write(root, ".drwil/ia-first.json", JSON.stringify({ lang: "en" }));
  assert.match(texts(root).all, /whole suite/);
  const en = texts(root);
  const failed = { file: "f", title: "APP-1", ancestors: [], state: "failed" };
  const one = (result) => verdict("APP-1", [{ what: "s", result: { tests: [], broken: [], code: 2, output: "", ...result } }], en).lines;
  assert.match(
    one({ tests: [failed], broken: [{ file: "g", tests: 0 }], missing: "jest" }).join("\n"),
    /jest not found[\s\S]*g: error outside any test[\s\S]*f: ✗ APP-1/,
  );
  assert.deepEqual(one({}), ["s: no test run, code 2", "no test run from s carries the ID APP-1"]);
  write(root, "a.test.mjs", 'import { test } from "node:test"; test("APP-1 : x", () => {});\n');
  assert.match(cli(root, ["--runner", "node", "APP-1", "a.test.mjs"]).stdout, /APP-1: 1 test\(s\) with the ID/);
  write(root, ".drwil/ia-first.json", "{}");
  assert.match(texts(root).all, /toute la suite/);
  const events = [
    { type: "test:start", data: {} },
    { type: "test:pass", data: { name: "APP-1", file: join(root, "a.mjs"), nesting: 0 } },
    { type: "test:pass", data: { name: "b", file: join(root, "a.mjs"), nesting: 1, todo: true } },
    { type: "test:fail", data: { name: "APP-2", file: join(root, "a.mjs"), nesting: 0 } },
    { type: "test:fail", data: { name: join(root, "c.mjs"), file: join(root, "c.mjs"), nesting: 0 } },
  ];
  const lines = [];
  // Un tableau suffit : `for await` lit aussi un itérable synchrone.
  for await (const l of reporter(events)) lines.push(JSON.parse(l));
  assert.deepEqual(
    lines.map((l) => `${l.state}/${l.broken}`),
    ["passed/false", "skipped/false", "failed/false", "failed/true"],
  );
  assert.deepEqual(parse("node", lines.map((l) => JSON.stringify(l)).join("\n")).broken, [{ file: join(root, "c.mjs"), tests: 0 }]);
});
