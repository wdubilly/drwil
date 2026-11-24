import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { matchPaths } from "../.githooks/glob.mjs";
import { lireSource } from "./resserrer-paths-lecture.mjs";
import { fermeture, invalides, principal, proposer, reecrire, resoudre } from "./resserrer-paths.mjs";

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true });
  dossiers = [];
});

/** Dépôt temporaire : { "chemin": "contenu" }. */
function depot(fichiers) {
  const d = mkdtempSync(join(tmpdir(), "drwil-resserrer-"));
  dossiers.push(d);
  for (const [chemin, texte] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(d, chemin)), { recursive: true });
    writeFileSync(join(d, chemin), texte);
  }
  return d;
}

const controle = (run, paths) => ({ id: "tests-x", run, paths });

test("QUA-338 lit les imports relatifs sous toutes leurs formes, jamais ceux d'un commentaire ou d'un texte", () => {
  const l = lireSource(
    [
      'import a from "./a.mjs";',
      'import "./b.mjs";',
      'export { c } from "./c.mjs";',
      'export * from "../d.mjs";',
      'const e = await import("./e.mjs");',
      'const f = require("./f.cjs");',
      'import { g } from "node:fs";',
      'import h from "paquet";',
      '// import x from "./commentaire.mjs"',
      '/* import y from "./bloc.mjs" */',
      'const t = "texte ./pas-un-import.mjs";',
    ].join("\n"),
  );
  assert.deepEqual(l.relatifs.sort(), ["../d.mjs", "./a.mjs", "./b.mjs", "./c.mjs", "./e.mjs", "./f.cjs"]);
  assert.deepEqual(l.douteux, []);
});

test("QUA-338 un import ou un require non littéral, un dossier balayé, un sous-processus de code sont un doute", () => {
  const douteux = (src) => lireSource(src).douteux.length > 0;
  assert.ok(douteux("const m = await import(nom);"));
  assert.ok(douteux("const m = require(`./" + "$" + "{x}.js`);"));
  assert.ok(douteux('import { spawnSync } from "node:child_process"; spawnSync("sh", ["-c", f]);'));
  assert.ok(!douteux('const m = await import(join(M, "a.mjs"));'));
  assert.ok(douteux('import { spawnSync } from "node:child_process"; spawnSync(cmd, []);'));
  assert.ok(
    !douteux(
      'import { spawnSync } from "node:child_process"; spawnSync(process.execPath, [f]); spawnSync("git", ["status"]); const r = /["\']/;',
    ),
  );
});

test("QUA-338 résout extension, index, .js vers .ts et dist vers src ; rend null si rien n'existe", () => {
  const d = depot({
    "p/a.mjs": "",
    "p/lib/index.mjs": "",
    "p/src/x.ts": "",
    "p/dist-hors/y.json": "{}",
    "p/test/t.mjs": "",
  });
  assert.equal(resoudre("./a.mjs", "p/test/t.mjs", d), null);
  assert.equal(resoudre("../a.mjs", "p/test/t.mjs", d), "p/a.mjs");
  assert.equal(resoudre("../a", "p/test/t.mjs", d), "p/a.mjs");
  assert.equal(resoudre("../lib", "p/test/t.mjs", d), "p/lib/index.mjs");
  assert.equal(resoudre("../src/x.js", "p/test/t.mjs", d), "p/src/x.ts");
  assert.equal(resoudre("../dist/x.js", "p/test/t.mjs", d), "p/src/x.ts");
  assert.equal(resoudre("../dist/absent.js", "p/test/t.mjs", d), null);
});

test("QUA-338 la fermeture suit les imports de proche en proche, finit sur un cycle et signale un import non résolu", () => {
  const d = depot({
    "t/a.test.mjs": 'import "./b.mjs";',
    "t/b.mjs": 'import "./c.mjs";',
    "t/c.mjs": 'import "./b.mjs";',
  });
  const f = fermeture(["t/a.test.mjs"], d);
  assert.deepEqual([...f.fichiers].sort(), ["t/a.test.mjs", "t/b.mjs", "t/c.mjs"]);
  assert.deepEqual(f.douteux, []);
  const e = depot({ "t/a.test.mjs": 'import "./absent.mjs";' });
  assert.match(fermeture(["t/a.test.mjs"], e).douteux.join(" "), /absent\.mjs/);
});

test("QUA-338 les fichiers lus par une jointure ou un chemin littéral entrent dans la fermeture, par leur nom si besoin", () => {
  const d = depot({
    ".githooks/etat.mjs": "",
    ".githooks/pre-commit": "",
    ".githooks/autre.mjs": "",
    "packages/drwil/templates/base/AGENTS.md": "",
    "t/a.test.mjs":
      'import { join } from "node:path"; const H = join(R, ".githooks"); join(H, "etat.mjs"); join(R, "templates", "base", "AGENTS.md"); "pre-commit";',
  });
  const f = fermeture(["t/a.test.mjs"], d);
  for (const attendu of [".githooks/etat.mjs", ".githooks/pre-commit", "packages/drwil/templates/base/AGENTS.md"])
    assert.ok(f.fichiers.has(attendu), attendu);
  assert.ok(!f.fichiers.has(".githooks/autre.mjs"));
});

test("QUA-338 la lecture d'un dossier du dépôt, nommé dans ses arguments, dans la variable passée ou, faute de définition, dans le fichier, est un doute ; celle d'un dossier inconnu non", () => {
  const d = depot({
    ".githooks/ex/x.md": "",
    "t/a.test.mjs": 'import { readdirSync } from "node:fs"; readdirSync(d);',
    "t/b.test.mjs": 'import { readdirSync } from "node:fs"; readdirSync(join(R, ".githooks/ex"));',
    "t/c.test.mjs": 'import { readdirSync } from "node:fs"; const dossier = join(R, "ex"); readdirSync(dossier);',
    "t/d.test.mjs":
      'import { readdirSync } from "node:fs"; const tmp = mkdtempSync(join(tmpdir(), "x")); readdirSync(tmp, { withFileTypes: true });',
    "t/e.test.mjs":
      'import { readdirSync } from "node:fs"; const HOOKS = join(R, "ex"); function lister(dossier) { return readdirSync(dossier); }',
  });
  assert.match(fermeture(["t/e.test.mjs"], d).douteux.join(" "), /lit le dossier ex/);
  assert.match(fermeture(["t/c.test.mjs"], d).douteux.join(" "), /lit le dossier ex/);
  assert.deepEqual(fermeture(["t/d.test.mjs"], d).douteux, []);
  assert.deepEqual(fermeture(["t/a.test.mjs"], d).douteux, []);
  assert.match(fermeture(["t/b.test.mjs"], d).douteux.join(" "), /lit le dossier \.githooks\/ex/);
});

test("QUA-338 proposer remplace les motifs larges par la fermeture, garde le reste, et aucun fichier lu n'est perdu", () => {
  const d = depot({
    ".githooks/moteur.mjs": "",
    ".githooks/autre.mjs": "",
    ".githooks/moteur.test.mjs": 'import "./moteur.mjs";',
  });
  const c = controle("node .githooks/contract-tests.mjs QUA-1 .githooks/moteur.test.mjs", [
    ".githooks/contract-tests.mjs",
    ".githooks/**",
    "package.json",
    "!.githooks/*.test.mjs",
    "docs/**",
  ]);
  const p = proposer(c, d);
  assert.deepEqual(p.douteux, []);
  const lu = matchPaths(p.paths);
  assert.ok(lu(".githooks/moteur.mjs") && lu(".githooks/moteur.test.mjs"));
  assert.ok(!lu(".githooks/autre.mjs"));
  for (const gardé of [".githooks/contract-tests.mjs", "package.json", "docs/x.md"]) assert.ok(lu(gardé), gardé);
  assert.ok(!p.paths.some((x) => x.startsWith("!")));
});

test("QUA-338 au moindre doute le motif large est gardé tel quel ; un contrôle sans motif large n'est pas touché", () => {
  const d = depot({ ".githooks/a.test.mjs": "const m = await import(nom);" });
  const large = controle("node .githooks/contract-tests.mjs QUA-1 .githooks/a.test.mjs", [".githooks/**", "package.json"]);
  const p = proposer(large, d);
  assert.deepEqual(p.paths, large.paths);
  assert.ok(p.douteux.length > 0);
  assert.equal(proposer(controle("node x.mjs", [".githooks/**"]), d), null);
  assert.equal(
    proposer(controle("node .githooks/contract-tests.mjs --all .githooks/a.test.mjs && node outils/v.mjs", [".githooks/**"]), d),
    null,
  );
  assert.equal(proposer(controle("node .githooks/contract-tests.mjs QUA-1 a.test.mjs", ["docs/**"]), d), null);
});

test("QUA-338 compte les contrôles invalidés par un fichier touché", () => {
  const checks = [{ paths: [".githooks/**"] }, { paths: [".githooks/a.mjs"] }, { paths: [".githooks/**", "!.githooks/a.mjs"] }];
  assert.equal(invalides(checks, ".githooks/a.mjs"), 2);
  assert.equal(invalides(checks, ".githooks/b.mjs"), 2);
});

test("QUA-338 la commande n'écrit rien sans --appliquer, puis réécrit seulement les contrôles résolus", () => {
  const d = depot({
    ".githooks/m.mjs": "",
    ".githooks/m.test.mjs": 'import "./m.mjs";',
    ".githooks/z.mjs": "",
    ".drwil/ia-first.json":
      JSON.stringify(
        { checks: [{ id: "tests-m", run: "node .githooks/contract-tests.mjs QUA-1 .githooks/m.test.mjs", paths: [".githooks/**"] }] },
        null,
        2,
      ) + "\n",
  });
  const avant = readFileSync(join(d, ".drwil/ia-first.json"), "utf8");
  const sortie = [];
  principal([d], (l) => sortie.push(l));
  assert.equal(readFileSync(join(d, ".drwil/ia-first.json"), "utf8"), avant);
  assert.match(sortie.join("\n"), /tests-m/);
  principal([d, "--appliquer"], () => {});
  const apres = JSON.parse(readFileSync(join(d, ".drwil/ia-first.json"), "utf8"));
  assert.deepEqual(apres.checks[0].paths.sort(), [".githooks/m.mjs", ".githooks/m.test.mjs"]);
});

test("QUA-338 réécrit seulement le tableau `paths` du contrôle visé, dans le style où il était", () => {
  const texte = `{\n  "checks": [\n    {\n      "id": "a",\n      "paths": ["x", "y"]\n    },\n    {\n      "id": "b",\n      "paths": [\n        "x",\n        "y"\n      ],\n      "z": 1\n    }\n  ]\n}\n`;
  const apres = reecrire(texte, [{ id: "b", paths: ["u", "v", "w"] }]);
  assert.equal(apres, texte.replace('"x",\n        "y"\n      ]', '"u",\n        "v",\n        "w"\n      ]'));
  assert.equal(JSON.parse(reecrire(texte, [{ id: "a", paths: ["q"] }])).checks[0].paths[0], "q");
  assert.match(reecrire(texte, [{ id: "a", paths: ["q", "r"] }]), /"paths": \["q", "r"\]/);
});
