import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];
delete process.env.DRWIL_CI_REUSE;

const SCRIPT = fileURLToPath(new URL("./run-checks.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-run-tranches-"));
  dossiers.push(dir);
  return dir;
};
const ecrire = (racine, chemin, contenu) => {
  mkdirSync(dirname(join(racine, chemin)), { recursive: true });
  writeFileSync(join(racine, chemin), contenu);
};
const DOSSIER = ".drwil/evidence/shards";

/** Projet d'essai : un contrôle e2e découpé en `shards` tranches, un lint ordinaire, un dépôt git commité. */
function projet({ shards = 2, lang = "fr" } = {}) {
  const racine = tmp();
  const cfg = {
    lang,
    checks: [
      { name: "e2e", run: 'echo "e2e $DRWIL_SHARD_INDEX/$DRWIL_SHARD_TOTAL" >> trace.txt', shards, paths: ["e2e/**"] },
      { name: "lint", run: "echo lint >> trace.txt" },
    ],
  };
  ecrire(racine, ".drwil/ia-first.json", JSON.stringify(cfg));
  ecrire(racine, "e2e/test.txt", "un\n");
  for (const f of ["check-docs", "check-contract-tests", "check-architecture"]) ecrire(racine, `.githooks/${f}.mjs`, "process.exit(0);\n");
  spawnSync("git", ["init", "-q", "-b", "travail"], { cwd: racine });
  spawnSync("git", ["add", "-A"], { cwd: racine });
  spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "x"], { cwd: racine });
  return racine;
}
function passe(racine, ...args) {
  const base = { ...process.env, HOME: tmp(), USERPROFILE: tmp(), TMPDIR: tmp(), CI: "", DRWIL_HOOK: "", DRWIL_PUSH_REFS: "" };
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: tmp(), encoding: "utf8", env: { ...base, DRWIL_ROOT: racine } });
}
const lire = (racine, chemin) => JSON.parse(readFileSync(join(racine, chemin), "utf8"));
const trace = (racine) => (existsSync(join(racine, "trace.txt")) ? readFileSync(join(racine, "trace.txt"), "utf8").trim().split("\n") : []);

test("--shard i/N : ne joue que le contrôle découpé, laisse le verdict de sa tranche, aucun verdict de passe", () => {
  const racine = projet();
  const r = passe(racine, "--shard", "2/2");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(trace(racine), ["e2e 2/2"]);
  const v = lire(racine, `${DOSSIER}/project_e2e.2-of-2.json`);
  assert.deepEqual([v.check, v.index, v.total, v.status], ["project:e2e", 2, 2, "ok"]);
  assert.match(v.commit, /^[0-9a-f]{40}$/);
  assert.match(v.control, /^[0-9a-f]{64}$/);
  assert.equal(existsSync(join(racine, ".drwil/evidence/run-checks-verdicts.json")), false);
});

test("QUA-013 : une tranche en échec laisse son verdict « fail » et fait échouer la passe", () => {
  const racine = projet();
  ecrire(racine, ".drwil/ia-first.json", JSON.stringify({ checks: [{ name: "e2e", run: "exit 3 # $DRWIL_SHARD_INDEX", shards: 2 }] }));
  const r = passe(racine, "--shard=1/2");
  assert.equal(r.status, 1);
  assert.equal(lire(racine, `${DOSSIER}/project_e2e.1-of-2.json`).status, "fail");
});

test("les N tranches puis l'agrégation : « ok » entre dans le verdict de passe, le reste est joué une fois", () => {
  const racine = projet();
  for (const i of ["1/2", "2/2"]) assert.equal(passe(racine, "--shard", i).status, 0);
  const r = passe(racine, "--aggregate-shards", DOSSIER);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(trace(racine).toSorted(), ["e2e 1/2", "e2e 2/2", "lint"]);
  assert.equal(lire(racine, ".drwil/evidence/run-checks-verdicts.json").checks["project:e2e"].status, "ok");
});

test("QUA-013 : une tranche absente fait échouer l'agrégation, sans verdict « ok » du contrôle", () => {
  const racine = projet();
  assert.equal(passe(racine, "--shard", "1/2").status, 0);
  const r = passe(racine, "--aggregate-shards", DOSSIER);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /tranche 2\/2 absente/);
  assert.equal(lire(racine, ".drwil/evidence/run-checks-verdicts.json").checks["project:e2e"].status, "fail");
});

test("QUA-013 : un fichier du contrôle modifié après les tranches fait échouer l'agrégation", () => {
  const racine = projet();
  for (const i of ["1/2", "2/2"]) assert.equal(passe(racine, "--shard", i).status, 0);
  ecrire(racine, "e2e/test.txt", "deux\n");
  const r = passe(racine, "--aggregate-shards", DOSSIER);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /autres fichiers ou une autre déclaration/);
});

test("--without-shards : le contrôle découpé est confié aux tranches, non passé ; le reste est joué", () => {
  const racine = projet();
  const r = passe(racine, "--without-shards");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(trace(racine), ["lint"]);
  assert.equal(readdirSync(join(racine, ".drwil/evidence")).includes("shards"), false);
});

test("sans option : une seule passe locale, sans tranche (1/1)", () => {
  const racine = projet();
  assert.equal(passe(racine).status, 0);
  assert.deepEqual(trace(racine), ["e2e 1/1", "lint"]);
});

test("une option de tranche mal formée : message d'usage et code 2, rien n'est joué", () => {
  for (const [lang, attendu] of [
    ["fr", /options de tranche/],
    ["en", /slice options/],
  ]) {
    const racine = projet({ lang });
    const r = passe(racine, "--shard", "3/2");
    assert.equal(r.status, 2);
    assert.match(r.stderr, attendu);
    assert.deepEqual(trace(racine), []);
  }
});
