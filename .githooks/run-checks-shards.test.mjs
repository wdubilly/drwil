import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { replay } from "./base-checks.mjs";

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

test("--shard-plan : la matrice des tranches de la configuration, sans rien jouer", () => {
  const racine = projet({ shards: 3 });
  const r = passe(racine, "--shard-plan");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), { include: [1, 2, 3].map((index) => ({ index, total: 3 })) });
  assert.deepEqual(trace(racine), []);
  ecrire(racine, ".drwil/ia-first.json", JSON.stringify({ checks: [{ name: "lint", run: "x" }] }));
  assert.deepEqual(JSON.parse(passe(racine, "--shard-plan").stdout), { include: [] });
});

test("QUA-013 : --shard-plan refuse une déclaration invalide (code 1, rien sur la sortie), dans la langue du projet", () => {
  for (const [lang, attendu] of [
    ["fr", /doit être un entier de 2 à 16/],
    ["en", /must be an integer from 2 to 16/],
  ]) {
    const racine = projet({ shards: 1, lang });
    const r = passe(racine, "--shard-plan");
    assert.equal(r.status, 1);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, attendu);
  }
});

/** Dépôt d'essai du rejeu : le run-checks de chaque branche note ses arguments dans `args.txt` ; `base` pose ou non .githooks/ sur main. */
function depotRejeu({ base = true } = {}) {
  const racine = tmp();
  const git = (...a) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: racine, encoding: "utf8" });
  const stub = (marque) =>
    `import { appendFileSync } from "node:fs";\nappendFileSync("args.txt", ${JSON.stringify(marque)} + process.argv.slice(2).join(" ") + "\\n");\n`;
  ecrire(racine, ".drwil/ia-first.json", JSON.stringify({ checks: [{ name: "e2e", run: "echo $DRWIL_SHARD_INDEX", shards: 2 }] }));
  if (base) ecrire(racine, ".githooks/run-checks.mjs", stub("base:"));
  else ecrire(racine, "README.md", "projet\n");
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-qm", "base");
  git("checkout", "-q", "-b", "travail");
  return {
    racine,
    git,
    args: () => (existsSync(join(racine, "args.txt")) ? readFileSync(join(racine, "args.txt"), "utf8").trim().split("\n") : []),
    stub,
  };
}
const rejouer = (racine, ...argv) =>
  replay(racine, { argv: ["--base", "main", ...argv], env: { ...process.env, CI: "", DRWIL_CI_REUSE: "" }, stdio: "pipe" });

test("QUA-113 : une tranche est toujours jouée par le rejeu, avec les hooks de la base ou, sans eux, ceux de la branche ; jamais sautée", () => {
  const d = depotRejeu();
  // Hooks identiques à ceux de la base : sans option de tranche, le rejeu est sauté ; une tranche est jouée quand même.
  assert.equal(rejouer(d.racine).status, "skipped");
  assert.equal(rejouer(d.racine, "--shard", "1/2").status, "ok");
  assert.deepEqual(d.args(), ["base:--shard 1/2"]);
  // Un hook modifié par la branche : la tranche est jouée par la version de la base, `--base` n'étant pas transmis.
  rmSync(join(d.racine, "args.txt"), { force: true });
  ecrire(d.racine, ".githooks/run-checks.mjs", d.stub("branche:"));
  d.git("add", "-A");
  d.git("commit", "-qm", "hook de la branche");
  assert.equal(rejouer(d.racine, "--shard=2/2").status, "ok");
  assert.deepEqual(d.args(), ["base:--tout-rejouer --shard=2/2"]);
});

test("QUA-113 : l'agrégation passe par le rejeu avec les hooks de la base ; une base sans hooks ne rejoue que les tranches", () => {
  const d = depotRejeu();
  ecrire(d.racine, ".githooks/run-checks.mjs", d.stub("branche:"));
  d.git("add", "-A");
  d.git("commit", "-qm", "hook de la branche");
  assert.equal(rejouer(d.racine, "--aggregate-shards", ".drwil/evidence/shards").status, "ok");
  assert.deepEqual(d.args(), ["base:--tout-rejouer --aggregate-shards .drwil/evidence/shards"]);
  const sans = depotRejeu({ base: false });
  assert.equal(rejouer(sans.racine, "--aggregate-shards", "d").status, "not-applicable");
  ecrire(sans.racine, ".githooks/run-checks.mjs", sans.stub("branche:"));
  assert.equal(rejouer(sans.racine, "--shard", "1/2").status, "ok");
  assert.deepEqual(sans.args(), ["branche:--shard 1/2"]);
});
