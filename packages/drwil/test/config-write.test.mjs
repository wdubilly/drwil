// Réglage `release.mode` de .drwil/ia-first.json : valeur par défaut et conservation (QUA-199).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init } from "../dist/index.js";
import { releaseSetting } from "../dist/config-write.js";
import { RELEASE_MODES } from "../dist/migration-table.js";

const dossiers = [];
after(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-config-write-"));
  dossiers.push(dir);
  return dir;
};
const config = (dir) => JSON.parse(readFileSync(join(dir, ".drwil/ia-first.json"), "utf8"));
const silencieux = async (f) => {
  const log = console.log;
  console.log = () => {};
  try {
    return await f();
  } finally {
    console.log = log;
  }
};

test("QUA-199 : les niveaux de garde sont solo puis team, solo par défaut", () => {
  assert.deepEqual([...RELEASE_MODES], ["solo", "team"]);
  assert.deepEqual(releaseSetting(undefined), { mode: "solo" });
  assert.deepEqual(releaseSetting("autre"), { mode: "solo" });
  assert.deepEqual(releaseSetting({ mode: 3 }), { mode: "solo" });
});

test("QUA-199 : une installation neuve déclare solo ; une réinstallation garde team, une autre valeur et les clés du projet", async () => {
  const dir = tmp();
  await silencieux(() => init({ lang: "fr", targetDir: dir }));
  assert.deepEqual(config(dir).release, { mode: "solo" });
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), release: { mode: "team", note: "x" } }));
  await silencieux(() => init({ lang: "fr", targetDir: dir }));
  assert.deepEqual(config(dir).release, { mode: "team", note: "x" });
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), release: { mode: "equipe" } }));
  await silencieux(() => init({ lang: "fr", targetDir: dir }));
  assert.equal(config(dir).release.mode, "equipe", "une valeur inconnue n'est pas corrigée en silence");
  const ancienne = { ...config(dir) };
  delete ancienne.release;
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(ancienne));
  await silencieux(() => init({ lang: "fr", targetDir: dir }));
  assert.equal(config(dir).release.mode, "solo", "projet antérieur au réglage : solo");
});
