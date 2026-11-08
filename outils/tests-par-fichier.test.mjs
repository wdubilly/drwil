import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { verdict } from "./tests-par-fichier.mjs";

const SCRIPT = fileURLToPath(new URL("./tests-par-fichier.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

const lire =
  (tests, code = 0) =>
  () => ({ tests, code, sortie: "sortie du fichier" });

test("QUA-033 : le verdict d'un contrat ne regarde que les tests qui portent son ID", () => {
  const tests = [
    { nom: "QUA-901 : bon", ok: true },
    { nom: "QUA-902 : cassé", ok: false },
    { nom: "QUA-9010 : autre contrat", ok: false },
    { nom: "sans ID", ok: false },
  ];
  assert.equal(verdict("QUA-901", ["f.test.mjs"], lire(tests, 1)).ok, true);
  const ko = verdict("QUA-902", ["f.test.mjs"], lire(tests, 1));
  assert.equal(ko.ok, false);
  assert.match(ko.lignes.join("\n"), /✗ QUA-902 : cassé/);
});

test("QUA-033 : aucun test à l'ID, ou un fichier qui n'a rien joué, n'est jamais un succès", () => {
  assert.equal(verdict("QUA-903", ["f.test.mjs"], lire([{ nom: "QUA-901 : x", ok: true }])).ok, false);
  assert.equal(verdict("QUA-901", ["f.test.mjs"], lire([], 1)).ok, false);
  assert.equal(verdict("QUA-.*", ["f.test.mjs"], lire([{ nom: "QUA-901 : x", ok: true }])).ok, false);
  assert.equal(verdict(null, ["f.test.mjs"], lire([{ nom: "sans ID", ok: false }], 1)).ok, false);
  assert.equal(verdict(null, ["f.test.mjs"], lire([{ nom: "sans ID", ok: true }])).ok, true);
});

test("QUA-033 : dans une passe, un fichier de test n'est lancé qu'une fois pour tous ses contrats ; hors passe il est rejoué", () => {
  const racine = mkdtempSync(join(tmpdir(), "drwil-tests-par-fichier-"));
  dossiers.push(racine);
  // Sur une seule ligne : le vérificateur des tests de contrats ne doit pas lire ce jeu d'essai comme de vrais tests.
  const jeu = [
    'import { test } from "node:test";',
    'import { appendFileSync } from "node:fs";',
    'appendFileSync("lancements.txt", "x");',
    'test("QUA-901 : bon", () => {}); test("QUA-902 : cassé", () => { throw new Error("cassé"); });',
  ];
  writeFileSync(join(racine, "a.test.mjs"), `${jeu.join("\n")}\n`);
  const lancer = (id, passe) =>
    spawnSync(process.execPath, [SCRIPT, id, "a.test.mjs"], {
      cwd: racine,
      encoding: "utf8",
      env: { ...process.env, DRWIL_PASS_ID: passe, NODE_TEST_CONTEXT: undefined },
    });
  assert.equal(lancer("QUA-901", "p1").status, 0);
  assert.equal(lancer("QUA-902", "p1").status, 1);
  assert.equal(readFileSync(join(racine, "lancements.txt"), "utf8"), "x");
  assert.equal(lancer("QUA-901", "p2").status, 0);
  assert.equal(readFileSync(join(racine, "lancements.txt"), "utf8"), "xx");
  assert.deepEqual(readdirSync(join(racine, ".drwil", "evidence", "passe")), ["p2"]);
  assert.equal(lancer("QUA-901", "").status, 0);
  assert.equal(readFileSync(join(racine, "lancements.txt"), "utf8"), "xxx");
});
