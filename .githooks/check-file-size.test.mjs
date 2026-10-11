import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./check-file-size.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
function racine(fichiers) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-taille-"));
  dossiers.push(dir);
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(dir, chemin)), { recursive: true });
    writeFileSync(join(dir, chemin), contenu);
  }
  return dir;
}
const lignes = (n) => "x\n".repeat(n);
const lancer = (cwd, ...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8" });

test("check-file-size : plafond par défaut, extensions, tests et dossiers ignorés", () => {
  const dir = racine({
    "src/ok.js": lignes(400),
    "src/sous/ok.py": lignes(10),
    "src/gros.ts": lignes(401),
    "src/gros.test.ts": lignes(900),
    "src/gros.md": lignes(900),
    "src/node_modules/x.js": lignes(900),
    "src/__pycache__/x.py": lignes(900),
    "src/.cache/x.js": lignes(900),
  });
  const r = lancer(dir, "src");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /src\/gros\.ts : 401 lignes, maximum 400/);
  assert.doesNotMatch(r.stderr, /ok\.js|test\.ts|gros\.md|node_modules|__pycache__|\.cache/);
});

test("check-file-size : plafond et extensions en arguments ; racine absente ou par défaut", () => {
  const dir = racine({ "a.py": lignes(11), "b.js": lignes(5) });
  assert.equal(lancer(dir, ".", "10", "js").status, 0);
  assert.match(lancer(dir, ".", "10", "py").stderr, /a\.py : 11 lignes, maximum 10/);
  assert.equal(lancer(dir, "absent").status, 0);
  assert.equal(lancer(dir).status, 0);
});
