import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./check-kit-size.mjs", import.meta.url));
const CLI = fileURLToPath(new URL("../packages/drwil/bin/drwil.js", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
function racine(fichiers) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-taille-kit-"));
  dossiers.push(dir);
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(dir, chemin)), { recursive: true });
    writeFileSync(join(dir, chemin), contenu);
  }
  return dir;
}
const lignes = (n) => "x\n".repeat(n);
const lancer = (cwd) => spawnSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8" });
const manifeste = (...fichiers) => JSON.stringify(Object.fromEntries(fichiers.map((f) => [f, "empreinte"])));
const TPL = "packages/drwil/templates/common/base";

test("QUA-157 gabarit : chaque sorte a son plafond, un dépassement bloque et nomme le fichier", () => {
  const dir = racine({
    [`${TPL}/.githooks/ok.mjs`]: lignes(200),
    [`${TPL}/.githooks/gros.mjs`]: lignes(201),
    [`${TPL}/AGENTS.md`]: lignes(101),
    [`${TPL}/docs/recipes/ok.md`]: lignes(250),
    [`${TPL}/docs/recipes/grosse.md`]: lignes(251),
    [`${TPL}/docs/doc-ok.md`]: lignes(800),
    [`${TPL}/docs/doc-gros.md`]: lignes(801),
    "packages/drwil/templates/common/layers/backend.md": lignes(101),
    [`${TPL}/node_modules/x.mjs`]: lignes(900),
    [`${TPL}/__pycache__/x.mjs`]: lignes(900),
  });
  const r = lancer(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Fichiers du kit trop gros/);
  for (const [fichier, n, plafond, sorte] of [
    [`${TPL}/.githooks/gros.mjs`, 201, 200, "code, hooks, réglages"],
    [`${TPL}/AGENTS.md`, 101, 100, "AGENTS.md"],
    [`${TPL}/docs/recipes/grosse.md`, 251, 250, "recette"],
    [`${TPL}/docs/doc-gros.md`, 801, 800, "document"],
    ["packages/drwil/templates/common/layers/backend.md", 101, 100, "AGENTS.md"],
  ])
    assert.ok(r.stderr.includes(`${fichier} : ${n} lignes, plafond ${plafond} (${sorte})`), fichier);
  assert.doesNotMatch(r.stderr, /ok\.|doc-ok|node_modules|__pycache__/);
});

test("QUA-157 gabarit : sous les plafonds, rien n'est dit ; un plafond hérité tolère sa taille, pas davantage", () => {
  const propre = racine({ [`${TPL}/AGENTS.md`]: lignes(100) });
  const r = lancer(propre);
  assert.deepEqual([r.status, r.stdout, r.stderr], [0, "", ""]);
  const config = (cap) => JSON.stringify({ lang: "en", kitSizeLegacy: { "docs/ia-first.md": cap } });
  const dir = racine({ [`${TPL}/docs/ia-first.md`]: lignes(900), ".drwil/ia-first.json": config(900) });
  assert.equal(lancer(dir).status, 0);
  writeFileSync(join(dir, ".drwil/ia-first.json"), config(850));
  const grossi = lancer(dir);
  assert.equal(grossi.status, 1);
  assert.match(grossi.stderr, /docs\/ia-first\.md: 900 lines, legacy cap 850 \(must not grow any more\)/);
});

test("QUA-157 projet adopté : un dépassement avertit sans bloquer, le code et les fichiers du projet ne sont pas mesurés", () => {
  const dir = racine({
    ".drwil/ia-first.json": JSON.stringify({ lang: "en", dirs: { projects: "docs/projects", recipes: "docs/guides" } }),
    ".drwil/installed-files.json": manifeste(
      "AGENTS.md",
      ".githooks/gros.mjs",
      "docs/guides/longue.md",
      "docs/guides/absente.md",
      "docs/projects/journal.md",
      "README.md",
    ),
    "AGENTS.md": lignes(120),
    ".githooks/gros.mjs": lignes(300),
    "docs/guides/longue.md": lignes(260),
    "docs/projects/journal.md": lignes(2000),
    "README.md": lignes(2000),
    "src/app.js": lignes(5000),
  });
  const r = lancer(dir);
  assert.equal(r.status, 0);
  assert.equal(
    r.stdout,
    [
      "[ia-first-warning] AGENTS.md: 120 lines, ceiling 100 (AGENTS.md) — reduce it",
      "[ia-first-warning] .githooks/gros.mjs: 300 lines, ceiling 200 (code, hooks, settings) — reduce it",
      "[ia-first-warning] docs/guides/longue.md: 260 lines, ceiling 250 (recipe) — reduce it",
      "",
    ].join("\n"),
  );
  assert.equal(r.stderr, "");
});

test("QUA-157 projet adopté : dossiers par défaut, plafond hérité et fichier du kit sous son plafond sans bruit", () => {
  const dir = racine({
    ".drwil/installed-files.json": manifeste("docs/recipes/r.md", "docs/ia-first.md", "docs/intentions/x.md"),
    ".drwil/ia-first.json": JSON.stringify({ kitSizeLegacy: { "docs/ia-first.md": 900 }, dirs: { intentions: "docs/intentions" } }),
    "docs/recipes/r.md": lignes(251),
    "docs/ia-first.md": lignes(901),
    "docs/intentions/x.md": lignes(900),
  });
  const r = lancer(dir);
  assert.equal(r.status, 0);
  assert.equal(
    r.stdout,
    [
      "[ia-first-warning] docs/recipes/r.md : 251 lignes, plafond 250 (recette) — le réduire",
      "[ia-first-warning] docs/ia-first.md : 901 lignes, plafond hérité 900 (ne doit plus grossir)",
      "",
    ].join("\n"),
  );
});

test("QUA-157 projet adopté : liste d'installation absente, illisible ou vide, c'est un échec qui le dit (QUA-013)", () => {
  const sans = lancer(racine({}));
  assert.equal(sans.status, 1);
  assert.match(sans.stderr, /Liste des fichiers installés absente, illisible ou vide \(\.drwil[\\/]installed-files\.json\)/);
  const illisible = lancer(racine({ ".drwil/installed-files.json": "{pas du json" }));
  assert.equal(illisible.status, 1);
  const vide = lancer(racine({ ".drwil/installed-files.json": "{}", ".drwil/ia-first.json": JSON.stringify({ lang: "en" }) }));
  assert.equal(vide.status, 1);
  assert.match(vide.stderr, /List of installed files missing, unreadable or empty/);
});

test("QUA-157 installation : drwil init déclare le contrôle sans effacer ceux du projet, une seule fois", () => {
  const dir = racine({ ".drwil/ia-first.json": JSON.stringify({ checks: [{ id: "mien", name: "mien", run: "node -e 0" }] }) });
  const init = () =>
    spawnSync(process.execPath, [CLI, "init", "--no-git", "--lang", "en", "--tools", "claude"], { cwd: dir, encoding: "utf8" });
  assert.equal(init().status, 0);
  assert.equal(init().status, 0);
  const { checks } = JSON.parse(readFileSync(join(dir, ".drwil/ia-first.json"), "utf8"));
  assert.deepEqual(
    checks.map((c) => c.id),
    ["mien", "taille-kit"],
  );
  assert.equal(checks[1].run, "node .githooks/check-kit-size.mjs");
  const mesure = lancer(dir);
  assert.equal(mesure.status, 0, mesure.stderr);
});
