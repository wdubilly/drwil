import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./check-code-rules.mjs", import.meta.url));
const lancer = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });

test("check-code-rules : sans règle, toujours vert, racine existante ou non", () => {
  assert.equal(lancer().status, 0);
  assert.equal(lancer("chemin/qui/n/existe/pas").status, 0);
});
