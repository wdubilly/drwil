import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { controler } from "./check-code-rules.mjs";

const SCRIPT = fileURLToPath(new URL("./check-code-rules.mjs", import.meta.url));
const lancer = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });

test("check-code-rules : sans règle, toujours vert, racine existante ou non", () => {
  assert.equal(lancer().status, 0);
  assert.equal(lancer("chemin/qui/n/existe/pas").status, 0);
});

test("check-code-rules : les erreurs des règles sont listées et font échouer ; racine absente ignorée", () => {
  const erreurs = [];
  const { error } = console;
  console.error = (m) => erreurs.push(m);
  try {
    const regles = [() => ["a : interdit"], () => [], () => ["b : interdit"]];
    assert.equal(controler(".", regles), 1);
    assert.equal(controler("chemin/qui/n/existe/pas", regles), 0);
    assert.equal(controler("."), 0);
  } finally {
    console.error = error;
  }
  assert.deepEqual(erreurs, ["Règles d'hygiène du code :\n  a : interdit\n  b : interdit"]);
});
