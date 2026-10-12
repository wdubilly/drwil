import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, language } from "./check-code-rules.mjs";

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
    assert.equal(check(".", regles), 1);
    assert.equal(check("chemin/qui/n/existe/pas", regles), 0);
    assert.equal(check("."), 0);
  } finally {
    console.error = error;
  }
  assert.deepEqual(erreurs, ["Règles d'hygiène du code :\n  a : interdit\n  b : interdit"]);
});

test("check-code-rules : messages en anglais, langue lue dans .drwil/ia-first.json (français par défaut)", () => {
  const erreurs = [];
  const { error } = console;
  console.error = (m) => erreurs.push(m);
  try {
    assert.equal(check(".", [() => ["a: forbidden"]], "en"), 1);
  } finally {
    console.error = error;
  }
  assert.deepEqual(erreurs, ["Code hygiene rules:\n  a: forbidden"]);
  const dir = mkdtempSync(join(tmpdir(), "drwil-regles-"));
  const avant = process.cwd();
  try {
    process.chdir(dir);
    assert.equal(language(), "fr", "sans configuration");
    mkdirSync(".drwil");
    writeFileSync(join(".drwil", "ia-first.json"), JSON.stringify({ lang: "en" }));
    assert.equal(language(), "en");
  } finally {
    process.chdir(avant);
    rmSync(dir, { recursive: true, force: true });
  }
});
