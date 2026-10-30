import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { excluder, parseDiff, parseLcov, run, verdict } from "./check-diff-coverage.mjs";

const SCRIPT = fileURLToPath(new URL("./check-diff-coverage.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const git = (cwd, ...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf8" });
function ecrire(dir, fichiers) {
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(dir, chemin)), { recursive: true });
    writeFileSync(join(dir, chemin), contenu);
  }
}
/** Dépôt avec une base `master` (a.js : 3 lignes), puis une branche qui réécrit a.js et ajoute b.js. */
function depot({ cfg = {}, lcov, apres = { "a.js": "1\n2\n3\n4\n", "b.js": "x\n" } } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-couv-diff-"));
  dossiers.push(dir);
  git(dir, "init", "-q", "-b", "master");
  ecrire(dir, { "a.js": "1\n2\n3\n" });
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  git(dir, "checkout", "-q", "-b", "branche");
  ecrire(dir, apres);
  ecrire(dir, { ".drwil/ia-first.json": JSON.stringify({ diffCoverage: { lcov: "lcov.info", ...cfg } }) });
  if (lcov !== undefined) ecrire(dir, { "lcov.info": lcov });
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "travail");
  return dir;
}
const lancer = (cwd, ...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8" });
const COUVERT = "SF:a.js\nDA:4,1\nBRDA:4,0,0,1\nBRDA:4,0,1,3\nend_of_record\nSF:b.js\nDA:1,2\nend_of_record\n";

test("QUA-191 : lcov : lignes et branches lues, chemins absolus ramenés à la racine, lignes étrangères ignorées", () => {
  const racine = join(tmpdir(), "racine");
  const lcov = parseLcov(
    `DA:9,9\nSF:${join(racine, "src", "a.js")}\nDA:1,0\nDA:2,5\nBRDA:2,0,0,-\nBRDA:2,0,1,0\nBRDA:3,0,0,2\nSF:b.js\nend_of_record\n`,
    racine,
  );
  const a = lcov.get("src/a.js");
  assert.deepEqual(
    [...a.lines],
    [
      [1, 0],
      [2, 5],
    ],
  );
  assert.deepEqual(
    [...a.branches],
    [
      [2, 2],
      [3, 0],
    ],
  );
  assert.ok(lcov.has("b.js"));
});

test("QUA-191 : diff : lignes ajoutées ou modifiées, fichier supprimé ignoré", () => {
  const diff = parseDiff(
    "--- a/a.js\n+++ b/a.js\n@@ -1,2 +1,3 @@\n+x\n@@ -9 +10 @@\n+y\n--- a/old.js\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-z\n",
  );
  assert.deepEqual([...diff.keys()], ["a.js"]);
  assert.deepEqual([...diff.get("a.js")], [1, 2, 3, 10]);
});

test("QUA-192 : exclusions : sans justification refusée, avec justification elle écarte le fichier ou les lignes", () => {
  const { skips, refused } = excluder([
    { path: "gen/**", reason: "code généré" },
    { path: "a.js", lines: "2-3", reason: "non testable" },
    { path: "b.js", lines: 5, reason: "une ligne" },
    { path: "c.js", reason: "  " },
    { path: "d.js" },
  ]);
  assert.deepEqual(refused, ["c.js", "d.js"]);
  assert.ok(skips("gen/x/y.js", 1) && skips("a.js", 2) && skips("b.js", 5));
  assert.ok(!skips("a.js", 1) && !skips("a.js", 4) && !skips("c.js", 1) && !skips("b.js", 6));
});

test("QUA-191 : verdict : ligne et branche non couvertes, fichier inclus absent du rapport, exclusion respectée", () => {
  const lcov = parseLcov("SF:a.js\nDA:1,0\nDA:2,1\nBRDA:2,0,0,0\nDA:3,0\nend_of_record\n");
  const diff = new Map([
    ["a.js", new Set([3, 1, 2, 7])],
    ["src/n.js", new Set([1])],
    ["src/gen.js", new Set([1])],
    ["hors.js", new Set([1])],
  ]);
  const v = verdict(lcov, diff, {
    include: ["src/**"],
    exclusions: [{ path: "a.js", lines: 3, reason: "r" }, { path: "src/gen.js", reason: "r" }, { path: "x" }],
  });
  assert.deepEqual(v.holes, [
    { file: "a.js", n: 1, kind: "line" },
    { file: "a.js", n: 2, kind: "branch" },
  ]);
  assert.deepEqual(v.unmeasured, ["src/n.js"]);
  assert.deepEqual(v.refused, ["x"]);
});

test("QUA-191 : contrôle : tout le code modifié couvert, le CLI passe sans rien dire", () => {
  const r = lancer(depot({ lcov: COUVERT }));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, "");
});

test("QUA-191 : contrôle : une ligne ou une branche modifiée non couverte fait échouer et nomme fichier et ligne", () => {
  const ligne = lancer(depot({ lcov: "SF:a.js\nDA:4,0\nend_of_record\nSF:b.js\nDA:1,1\nend_of_record\n" }));
  assert.equal(ligne.status, 1);
  assert.match(ligne.stderr, /diff contre master/);
  assert.match(ligne.stderr, /a\.js:4 : ligne non couverte/);
  const branche = lancer(depot({ lcov: "SF:a.js\nDA:4,1\nBRDA:4,0,0,-\nend_of_record\n" }));
  assert.equal(branche.status, 1);
  assert.match(branche.stderr, /a\.js:4 : branche non couverte/);
});

test("QUA-191 : contrôle : une ligne non couverte mais non modifiée par la branche est ignorée", () => {
  const dir = depot({ lcov: "SF:a.js\nDA:1,0\nDA:2,0\nDA:3,0\nDA:4,1\nend_of_record\n", apres: { "a.js": "1\n2\n3\n4\n" } });
  assert.equal(lancer(dir).status, 0);
});

test("QUA-191 : contrôle : fichier inclus absent du rapport échoue, en anglais si la langue du projet l'est", () => {
  const dir = depot({ cfg: { include: ["b.js"] }, lcov: "SF:a.js\nDA:4,1\nend_of_record\n" });
  assert.match(lancer(dir).stderr, /b\.js : modifié mais absent du rapport lcov/);
  ecrire(dir, { ".drwil/ia-first.json": JSON.stringify({ lang: "en", diffCoverage: { lcov: "lcov.info", include: ["b.js"] } }) });
  assert.match(lancer(dir).stderr, /b\.js: changed but absent from the lcov report/);
});

test("QUA-192 : contrôle : une exclusion justifiée écarte le trou, la même sans raison est refusée", () => {
  const lcov = "SF:a.js\nDA:4,0\nend_of_record\nSF:b.js\nDA:1,1\nend_of_record\n";
  assert.equal(
    lancer(depot({ lcov, cfg: { exclusions: [{ path: "a.js", lines: "4", reason: "non testable : chemin d'erreur système" }] } })).status,
    0,
  );
  const sans = lancer(depot({ lcov, cfg: { exclusions: [{ path: "a.js", lines: "4" }] } }));
  assert.equal(sans.status, 1);
  assert.match(sans.stderr, /Exclusion a\.js sans justification/);
  assert.match(sans.stderr, /a\.js:4 : ligne non couverte/);
});

test("QUA-193 : contrôle : sans rapport lcov, déclaré ou non, le contrôle est non exécuté, jamais passé", () => {
  const absent = lancer(depot({}));
  assert.equal(absent.status, 1);
  assert.match(absent.stderr, /non exécutée : rapport lcov absent ou vide \(lcov\.info\)/);
  assert.equal(lancer(depot({ lcov: "  \n" })).status, 1);
  const dir = depot({ lcov: COUVERT });
  ecrire(dir, { ".drwil/ia-first.json": "{}" });
  assert.match(lancer(dir).stderr, /diffCoverage\.lcov n'est pas déclaré/);
  ecrire(dir, { ".drwil/ia-first.json": "pas du json" });
  assert.equal(lancer(dir).status, 1);
});

test("QUA-193 : contrôle : la commande de production du rapport est lancée, son échec est un non exécuté", () => {
  const ok = depot({ cfg: { produce: "node -e \"require('fs').writeFileSync('lcov.info','SF:a.js\\nDA:4,1\\nend_of_record\\n')\"" } });
  assert.equal(lancer(ok).status, 0);
  const ko = depot({ lcov: COUVERT, cfg: { produce: 'node -e "process.exit(3)"' } });
  const r = lancer(ko);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /commande de production du rapport a échoué/);
});

test("QUA-191 : contrôle : la base se lit en option, dans la config, ou à défaut parmi master/main ; aucune base trouvée est non exécuté", () => {
  const dir = depot({ lcov: COUVERT, cfg: { base: "n-existe-pas" } });
  assert.equal(lancer(dir).status, 0);
  assert.equal(lancer(dir, "--base", "master").status, 0);
  assert.equal(lancer(dir, "--base", "inconnue").status, 0, "option inconnue : repli sur master");
  const sans = depot({ lcov: COUVERT, cfg: { base: "autre" } });
  git(sans, "branch", "-m", "master", "tronc");
  const r = lancer(sans);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /base du diff introuvable \(autre\)/);
});

test("QUA-191 : run : utilisable depuis un autre module, sans sortie quand tout est couvert", () => {
  assert.deepEqual(run(depot({ lcov: COUVERT }), []), { code: 0, out: [] });
});
