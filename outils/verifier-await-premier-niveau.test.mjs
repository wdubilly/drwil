import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fichiersLus, lireModule, verifier } from "./verifier-await-premier-niveau.mjs";

const SCRIPT = fileURLToPath(new URL("./verifier-await-premier-niveau.mjs", import.meta.url));
const RACINE = fileURLToPath(new URL("..", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

/** Un dossier temporaire avec `fichiers` ({ chemin: contenu }). */
function arbre(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-await-"));
  dossiers.push(racine);
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  return racine;
}

const lancer = (racine) => spawnSync(process.execPath, [SCRIPT, racine], { encoding: "utf8" });

const LANCEMENT = 'import { b } from "./b.mjs";\nexport const a = 1;\nif (process.argv[1]) {\n  process.exitCode = await main();\n}\n';

test("QUA-249 : await de premier niveau lu dans l'arbre syntaxique, jamais dans une fonction, une chaîne ou un commentaire", () => {
  const texte = [
    'import x from "./x.mjs";',
    'export { y } from "../y.mjs";',
    'import z from "node:fs";',
    "if (x) {",
    "  process.exitCode = await main(await f());",
    "}",
    "async function f() { await g(); }",
    "const h = async () => { await 1; };",
    "class C { async m() { await 2; } }",
    'const s = "await x";',
    "// await y",
    "for await (const v of w) {}",
    'const m = async () => (await import("./dyn.mjs")).run();',
  ].join("\n");
  assert.deepEqual(lireModule(texte), { awaits: [5, 12], imports: ["./x.mjs", "../y.mjs", "./dyn.mjs"] });
});

test("QUA-249 : un hook importé par un autre module refusé, nommé par fichier, ligne et importeur ; un point d'entrée seul accepté", () => {
  const racine = arbre({
    ".githooks/a.mjs": LANCEMENT,
    ".githooks/b.mjs": 'export async function b() { return (await import("./a.mjs")).a; }\n',
    ".githooks/seul.mjs": "process.exitCode = await main();\n",
    ".githooks/seul.test.mjs": 'import "./seul.mjs";\n',
    "packages/drwil/templates/common/optional/mod/c.mjs": "await 1;\n",
    "packages/drwil/templates/common/optional/mod/d.mjs": 'import "./c.mjs";\n',
    ".claude/hooks/e.mjs": "export const e = 1;\n",
  });
  assert.deepEqual(fichiersLus(racine), [
    ".claude/hooks/e.mjs",
    ".githooks/a.mjs",
    ".githooks/b.mjs",
    ".githooks/seul.mjs",
    "packages/drwil/templates/common/optional/mod/c.mjs",
    "packages/drwil/templates/common/optional/mod/d.mjs",
  ]);
  const { problemes, lus } = verifier(racine);
  assert.equal(lus, 6);
  assert.deepEqual(problemes, [
    ".githooks/a.mjs:4 : await de premier niveau dans un hook importé par .githooks/b.mjs — lancer la commande par main(…).then(…)",
    "packages/drwil/templates/common/optional/mod/c.mjs:1 : await de premier niveau dans un hook importé par packages/drwil/templates/common/optional/mod/d.mjs — lancer la commande par main(…).then(…)",
  ]);
  const r = lancer(racine);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /✗ \.githooks\/a\.mjs:4 : await de premier niveau/);
});

test("QUA-249 : aucun hook lu est une erreur, jamais un succès ; le dépôt lui-même passe", () => {
  const vide = lancer(arbre({ "README.md": "rien\n" }));
  assert.equal(vide.status, 1);
  assert.match(vide.stderr, /aucun hook lu .* contrôle non exécuté/);
  const depot = lancer(RACINE);
  assert.equal(depot.status, 0, depot.stderr);
  assert.match(depot.stdout, /✓ \d+ hook\(s\) lus, aucun await de premier niveau/);
});
