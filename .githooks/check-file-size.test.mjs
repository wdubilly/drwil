import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacy, check } from "./check-file-size.mjs";

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

test("check-file-size : un plafond hérité tolère sa taille actuelle, pas davantage", () => {
  const dir = racine({ "src/vieux.js": lignes(500), "src/gros.js": lignes(600) });
  const avant = process.cwd();
  try {
    process.chdir(dir);
    const erreurs = check({ root: "src", maxLines: 400, extensions: ["js"], legacy: { "src/vieux.js": 500, "src/gros.js": 550 } });
    assert.deepEqual(erreurs, ["src/gros.js : 600 lignes, plafond hérité 550 (ne doit plus grossir, extraire plutôt)"]);
  } finally {
    process.chdir(avant);
  }
});

test("check-file-size : plafonds hérités lus, absents ou illisibles = aucun", () => {
  const dir = racine({ "ok.json": JSON.stringify({ "a.js": 3 }), "ko.json": "{ illisible" });
  assert.deepEqual(readLegacy(join(dir, "ok.json")), { "a.js": 3 });
  assert.deepEqual(readLegacy(join(dir, "ko.json")), {});
  assert.deepEqual(readLegacy(join(dir, "absent.json")), {});
});

test("check-file-size : lancé via un lien symbolique, le contrôle tourne quand même", {
  skip: process.platform === "win32" ? "liens symboliques" : false,
}, () => {
  const dir = racine({ "src/gros.js": lignes(401) });
  symlinkSync(dirname(SCRIPT), join(dir, "hooks"));
  const r = spawnSync(process.execPath, [join(dir, "hooks", "check-file-size.mjs"), "src"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /src\/gros\.js : 401 lignes/);
});

test("check-file-size : messages en anglais selon .drwil/ia-first.json", () => {
  const dir = racine({ ".drwil/ia-first.json": JSON.stringify({ lang: "en" }), "src/a.py": lignes(11), "src/vieux.js": lignes(9) });
  assert.match(lancer(dir, "src", "10", "py").stderr, /^Files too big:\n {2}src\/a\.py: 11 lines, maximum 10 \(split it\)/);
  const avant = process.cwd();
  try {
    process.chdir(dir);
    assert.deepEqual(check({ root: "src", maxLines: 5, extensions: ["js"], legacy: { "src/vieux.js": 8 }, lang: "en" }), [
      "src/vieux.js: 9 lines, legacy cap 8 (must not grow any more, extract instead)",
    ]);
  } finally {
    process.chdir(avant);
  }
});

test("QUA-001 : 200 lignes acceptées, 201 refusées", () => {
  const dir = racine({ "src/ok.js": lignes(200), "src/gros.js": lignes(201) });
  const r = lancer(dir, "src", "200", "js");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /src\/gros\.js : 201 lignes, maximum 200/);
  assert.doesNotMatch(r.stderr, /ok\.js/);
});

test("QUA-001 : un fichier plafonné qui grossit est refusé", () => {
  const dir = racine({ "src/vieux.js": lignes(301) });
  const avant = process.cwd();
  try {
    process.chdir(dir);
    assert.deepEqual(check({ root: "src", maxLines: 200, extensions: ["js"], legacy: { "src/vieux.js": 300 } }), [
      "src/vieux.js : 301 lignes, plafond hérité 300 (ne doit plus grossir, extraire plutôt)",
    ]);
  } finally {
    process.chdir(avant);
  }
});

test("QUA-001 : le livrable propose 200 lignes, son défaut reste 400", () => {
  const base = join(dirname(SCRIPT), "..", "packages", "drwil", "templates", "common", "base");
  const lire = (chemin) => readFileSync(join(base, chemin), "utf8");
  assert.match(lire(".githooks/check-file-size.mjs"), /check-file-size\.mjs frontend\/src 200 ts,tsx,js,jsx,py/);
  assert.match(lire("docs/recipes/adopt-the-kit.md"), /proposes 200 lines/);
  assert.match(lire("docs/recipes/refactor-without-breaking.md"), /proposes 200 lines/);
  assert.match(lire("docs/contracts-catalog.md"), /catalog:QUA-001 \| [^|]*proposes 200 lines/);
  const dir = racine({ "src/a.js": lignes(400), "src/b.js": lignes(401) });
  assert.match(lancer(dir, "src").stderr, /b\.js : 401 lignes, maximum 400/);
  assert.doesNotMatch(lancer(dir, "src").stderr, /a\.js/);
});

test("QUA-001 : le contrôle du dépôt couvre les hooks d'agent, de ce dépôt et du gabarit", () => {
  const racineDepot = join(dirname(SCRIPT), "..");
  const controle = JSON.parse(readFileSync(join(racineDepot, ".drwil", "ia-first.json"), "utf8")).checks.find(
    (c) => c.id === "taille-fichiers",
  );
  for (const dossier of [".claude/hooks", "packages/drwil/templates/common/tools/claude/.claude/hooks"]) {
    assert.ok(controle.run.includes(`check-file-size.mjs ${dossier} 200 mjs`), dossier);
    assert.ok(controle.paths.includes(`${dossier}/**`), dossier);
  }
});
