import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { replay } from "./base-checks.mjs";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];
delete process.env.DRWIL_CI_REUSE;
for (const nom of Object.keys(process.env)) if (nom.startsWith("DRWIL_PR_")) delete process.env[nom];

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

test("QUA-288 : --shard i/N : ne joue que le contrôle découpé, laisse le verdict de sa tranche, aucun verdict de passe", () => {
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

test("QUA-288 : une tranche en échec laisse son verdict « fail » et fait échouer la passe", () => {
  const racine = projet();
  ecrire(racine, ".drwil/ia-first.json", JSON.stringify({ checks: [{ name: "e2e", run: "exit 3 # $DRWIL_SHARD_INDEX", shards: 2 }] }));
  const r = passe(racine, "--shard=1/2");
  assert.equal(r.status, 1);
  assert.equal(lire(racine, `${DOSSIER}/project_e2e.1-of-2.json`).status, "fail");
});

test("QUA-288 : les N tranches puis l'agrégation : « ok » entre dans le verdict de passe, le reste est joué une fois", () => {
  const racine = projet();
  for (const i of ["1/2", "2/2"]) assert.equal(passe(racine, "--shard", i).status, 0);
  const r = passe(racine, "--aggregate-shards", DOSSIER);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(trace(racine).toSorted(), ["e2e 1/2", "e2e 2/2", "lint"]);
  assert.equal(lire(racine, ".drwil/evidence/run-checks-verdicts.json").checks["project:e2e"].status, "ok");
});

test("QUA-288 : une tranche absente fait échouer l'agrégation, sans verdict « ok » du contrôle", () => {
  const racine = projet();
  assert.equal(passe(racine, "--shard", "1/2").status, 0);
  const r = passe(racine, "--aggregate-shards", DOSSIER);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /tranche 2\/2 absente/);
  assert.equal(lire(racine, ".drwil/evidence/run-checks-verdicts.json").checks["project:e2e"].status, "fail");
});

test("QUA-288 : un fichier du contrôle modifié après les tranches fait échouer l'agrégation", () => {
  const racine = projet();
  for (const i of ["1/2", "2/2"]) assert.equal(passe(racine, "--shard", i).status, 0);
  ecrire(racine, "e2e/test.txt", "deux\n");
  const r = passe(racine, "--aggregate-shards", DOSSIER);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /autres fichiers ou une autre déclaration/);
});

test("QUA-289 : --without-shards : le contrôle découpé est confié aux tranches, non passé ; le reste est joué", () => {
  const racine = projet();
  const r = passe(racine, "--without-shards");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(trace(racine), ["lint"]);
  assert.equal(readdirSync(join(racine, ".drwil/evidence")).includes("shards"), false);
});

test("QUA-289 : sans option : une seule passe locale, sans tranche (1/1)", () => {
  const racine = projet();
  assert.equal(passe(racine).status, 0);
  assert.deepEqual(trace(racine), ["e2e 1/1", "lint"]);
});

test("QUA-288 : une option de tranche mal formée : message d'usage et code 2, rien n'est joué", () => {
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

test("QUA-288 : --shard-plan : la matrice des tranches de la configuration, sans rien jouer", () => {
  const racine = projet({ shards: 3 });
  const r = passe(racine, "--shard-plan");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), { include: [1, 2, 3].map((index) => ({ index, total: 3 })) });
  assert.deepEqual(trace(racine), []);
  ecrire(racine, ".drwil/ia-first.json", JSON.stringify({ checks: [{ name: "lint", run: "x" }] }));
  assert.deepEqual(JSON.parse(passe(racine, "--shard-plan").stdout), { include: [] });
});

test("QUA-288 : --shard-plan refuse une déclaration invalide (code 1, rien sur la sortie), dans la langue du projet", () => {
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

// Reprise d'une PR à l'autre (QUA-250, D3 et D4) : le verdict du contrôle découpé est repris à la passe suivante de la même PR,
// sinon rejoué ; le plan de la CI ne joue alors aucune tranche.
const PR = ".drwil/evidence/pr-verdicts";
const PREC = ".drwil/evidence/pr-previous";
// La base de la PR : le premier commit du projet d'essai (un commit réel, comme celui que la CI donne).
const baseDe = (racine) => spawnSync("git", ["rev-list", "--max-parents=0", "HEAD"], { cwd: racine, encoding: "utf8" }).stdout.trim();
const tete = (racine) => spawnSync("git", ["rev-parse", "HEAD"], { cwd: racine, encoding: "utf8" }).stdout.trim();
function passePr(racine, { env = {}, args = [] } = {}) {
  const base = { ...process.env, HOME: tmp(), USERPROFILE: tmp(), TMPDIR: tmp(), DRWIL_HOOK: "", DRWIL_PUSH_REFS: "" };
  const pr = {
    CI: "true",
    DRWIL_CI_REUSE: "1",
    DRWIL_PR_ID: "o/d#7",
    DRWIL_PR_HEAD: tete(racine),
    DRWIL_PR_BASE: baseDe(racine),
    DRWIL_PR_RUN: "100",
  };
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: tmp(),
    encoding: "utf8",
    env: { ...base, ...pr, DRWIL_ROOT: racine, ...env },
  });
}
const commiter = (racine, fichier, contenu) => {
  ecrire(racine, fichier, contenu);
  spawnSync("git", ["add", "-A"], { cwd: racine });
  spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "suite"], { cwd: racine });
};
/** Une première passe de PR (tranches puis agrégation) ; l'artefact qu'elle laisse est posé comme « précédent », sur un commit suivant. */
function premierePasse({ env = {}, config } = {}) {
  const racine = projet();
  if (config) ecrire(racine, ".drwil/ia-first.json", JSON.stringify(config));
  for (const i of ["1/2", "2/2"]) assert.equal(passePr(racine, { args: ["--shard", i] }).status, 0);
  passePr(racine, { args: ["--aggregate-shards", DOSSIER], env });
  cpSync(join(racine, PR), join(racine, PREC), { recursive: true });
  rmSync(join(racine, DOSSIER), { recursive: true, force: true });
  // Seul l'artefact de la PR reste : la copie de travail de la passe suivante n'a pas le fichier de verdicts de la précédente.
  rmSync(join(racine, ".drwil/evidence/run-checks-verdicts.json"));
  commiter(racine, "docs/suite.md", "doc\n");
  return racine;
}
const tranches = (racine, env = {}) => JSON.parse(passePr(racine, { args: ["--shard-plan"], env }).stdout).include.length;

test("QUA-290 : la passe suivante de la même PR reprend le verdict du contrôle découpé : aucune tranche planifiée, aucun contrôle rejoué", () => {
  const racine = premierePasse();
  const ecrit = lire(racine, `${PREC}/pr-verdicts.json`);
  assert.deepEqual(Object.keys(ecrit.checks), ["project:e2e"]);
  assert.deepEqual(
    [ecrit.identity, ecrit.checks["project:e2e"].base, ecrit.checks["project:e2e"].run],
    [{ id: "o/d#7", run: "100" }, baseDe(racine), "100"],
  );
  assert.equal(tranches(racine), 0);
  rmSync(join(racine, "trace.txt"));
  const r = passePr(racine, { args: ["--aggregate-shards", DOSSIER], env: { DRWIL_PR_RUN: "101", DRWIL_PR_PREVIOUS_RUN: "100" } });
  assert.deepEqual(trace(racine), ["lint"], r.stdout);
  assert.match(readFileSync(join(racine, ".drwil/evidence/run-checks.log"), "utf8"), /e2e : repris \(.*PR run 100 du \d{4}-/);
  // Le verdict repris est reporté tel quel (commit et run d'origine), jamais réécrit comme joué à ce commit.
  const suivant = lire(racine, `${PR}/pr-verdicts.json`);
  assert.deepEqual(
    [suivant.identity.run, suivant.checks["project:e2e"].head, suivant.checks["project:e2e"].run],
    ["101", ecrit.checks["project:e2e"].head, "100"],
  );
  assert.equal(lire(racine, ".drwil/evidence/run-checks-verdicts.json").played.includes("project:e2e"), false);
});

test("QUA-291 : tout doute rejoue (somme fausse, autre PR, autre run, autre base, fichiers changés, historique réécrit, verdict non « ok », illisible, fork)", () => {
  const cas = {
    "somme fausse": [(r) => ecrire(r, `${PREC}/pr-verdicts.sum`, "0".repeat(64))],
    "somme absente": [(r) => rmSync(join(r, `${PREC}/pr-verdicts.sum`))],
    "verdict falsifié": [
      (r) => ecrire(r, `${PREC}/pr-verdicts.json`, readFileSync(join(r, `${PREC}/pr-verdicts.json`), "utf8").replace("100", "999")),
    ],
    "autre PR": [() => {}, { DRWIL_PR_ID: "o/d#8" }],
    "autre run": [() => {}, { DRWIL_PR_PREVIOUS_RUN: "99" }],
    "autre base": [() => {}, (r) => ({ DRWIL_PR_BASE: tete(r) })],
    "historique réécrit": [() => {}, { DRWIL_PR_HEAD: "a".repeat(40) }],
    "hors CI": [() => {}, { CI: "" }],
    "tête illisible": [() => {}, { DRWIL_PR_HEAD: "--exec" }],
    "fork : la CI ne pose pas l'identité": [() => {}, { DRWIL_PR_ID: "" }],
    "fichiers du contrôle changés": [(r) => commiter(r, "e2e/test.txt", "autre\n")],
  };
  for (const [nom, [preparer, env]] of Object.entries(cas)) {
    const racine = premierePasse();
    preparer(racine);
    assert.equal(tranches(racine, typeof env === "function" ? env(racine) : env), 2, nom);
  }
  // Fichier de verdicts qui ne se lit pas, même avec sa somme ; verdict d'un autre état.
  for (const [nom, texte] of [
    ["illisible", "pas du JSON"],
    ["verdict en échec", null],
    ["verdict sans contrôle", "{}"],
  ]) {
    const racine = premierePasse();
    let corps = texte;
    if (corps === null) {
      const f = lire(racine, `${PREC}/pr-verdicts.json`);
      f.checks["project:e2e"].status = "fail";
      corps = JSON.stringify(f);
    }
    ecrire(racine, `${PREC}/pr-verdicts.json`, corps);
    ecrire(racine, `${PREC}/pr-verdicts.sum`, createHash("sha256").update(corps).digest("hex"));
    assert.equal(tranches(racine), 2, nom);
  }
  // Rien d'artefact précédent, ou ni identité ni tête : aucune reprise.
  const sans = premierePasse();
  rmSync(join(sans, PREC), { recursive: true });
  assert.equal(tranches(sans), 2);
});

test("QUA-290 : un contrôle non découpé n'est repris d'une PR à l'autre que s'il est lent (seuil du projet), jamais autrement ; un verdict écrit sans lui ne l'ouvre pas", () => {
  const config = {
    checks: [
      { name: "e2e", run: "echo $DRWIL_SHARD_INDEX", shards: 2, paths: ["e2e/**"] },
      { id: "unit", run: "echo unit >> trace.txt", paths: ["e2e/**"] },
    ],
  };
  const rapide = premierePasse({ config });
  assert.deepEqual(Object.keys(lire(rapide, `${PREC}/pr-verdicts.json`).checks), ["project:e2e"]);
  const lent = premierePasse({ config, env: { DRWIL_PR_SLOW_MS: "0" } });
  assert.deepEqual(Object.keys(lire(lent, `${PREC}/pr-verdicts.json`).checks).toSorted(), ["project:e2e", "unit"]);
  // Le seuil par défaut (une minute) ne reprend pas ce contrôle de quelques millisecondes ; le contrôle découpé l'est toujours.
  rmSync(join(lent, "trace.txt"), { force: true });
  passePr(lent, { args: ["--aggregate-shards", DOSSIER] });
  assert.deepEqual(trace(lent), ["unit"]);
  // Seuil à 0 : repris à son tour.
  rmSync(join(lent, "trace.txt"));
  passePr(lent, { args: ["--aggregate-shards", DOSSIER], env: { DRWIL_PR_SLOW_MS: "0" } });
  assert.deepEqual(trace(lent), []);
});

test("QUA-291 : un dossier de verdicts de PR qui ne s'écrit pas ne change pas le verdict de la passe", () => {
  const racine = projet();
  ecrire(racine, PR, "un fichier, pas un dossier");
  for (const i of ["1/2", "2/2"]) assert.equal(passePr(racine, { args: ["--shard", i] }).status, 0);
  passePr(racine, { args: ["--aggregate-shards", DOSSIER] });
  assert.equal(readFileSync(join(racine, PR), "utf8"), "un fichier, pas un dossier");
  assert.equal(lire(racine, ".drwil/evidence/run-checks-verdicts.json").checks["project:e2e"].status, "ok");
});

test("QUA-290 : une PR qui change les hooks ou la configuration planifie toutes ses tranches (le rejeu avec les hooks de la base rejoue tout)", () => {
  const racine = premierePasse();
  assert.equal(tranches(racine), 0);
  commiter(racine, "docs/autre.md", "une doc\n");
  assert.equal(tranches(racine), 0);
  commiter(racine, ".githooks/autre.mjs", "un hook\n");
  assert.equal(tranches(racine), 2);
  const configuration = premierePasse();
  commiter(
    configuration,
    ".drwil/ia-first.json",
    readFileSync(join(configuration, ".drwil/ia-first.json"), "utf8").replace("echo lint", "echo lint2"),
  );
  assert.equal(tranches(configuration), 2);
});

test("QUA-291 : --pr-previous télécharge les verdicts du run précédent de la même PR et dit lequel (le run donné par le plan est pris tel quel, une valeur qui n'est pas un numéro est ignorée)", () => {
  if (process.platform === "win32") return;
  const racine = projet();
  const evenement = join(tmp(), "evenement.json");
  const refus = (nom) => ({
    id: 1,
    path: ".github/workflows/ia-first.yml",
    head_repository: { full_name: nom },
    repository: { full_name: "o/d" },
    pull_requests: [{ number: 7 }],
  });
  writeFileSync(
    evenement,
    JSON.stringify({ pull_request: { number: 7, head: { sha: tete(racine), repo: { full_name: "o/d" } }, base: { sha: baseDe(racine) } } }),
  );
  const runs = join(tmp(), "runs.json");
  writeFileSync(
    runs,
    JSON.stringify({
      workflow_runs: [
        { ...refus("o/d"), id: 555 },
        { ...refus("fork/d"), id: 777 },
      ],
    }),
  );
  const bin = tmp();
  ecrire(
    bin,
    "gh",
    '#!/bin/sh\n[ "$1" = api ] && { cat "$FAKE_RUNS"; exit 0; }\nwhile [ $# -gt 0 ]; do [ "$1" = --dir ] && dir=$2; shift; done\necho "{}" > "$dir/pr-verdicts.json"\n',
  );
  chmodSync(join(bin, "gh"), 0o755);
  const env = {
    PATH: `${bin}:${process.env.PATH}`,
    FAKE_RUNS: runs,
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "pull_request",
    GITHUB_EVENT_PATH: evenement,
    GITHUB_REPOSITORY: "o/d",
    GITHUB_HEAD_REF: "feature",
    GITHUB_RUN_ID: "900",
    DRWIL_PR_ID: "",
  };
  const cherche = passePr(racine, { args: ["--pr-previous"], env });
  assert.equal(cherche.status, 0, cherche.stderr);
  assert.equal(cherche.stdout, "previous=555\n");
  const impose = passePr(racine, { args: ["--pr-previous", "444"], env });
  assert.equal(impose.stdout, "previous=444\n");
  const invalide = passePr(racine, { args: ["--pr-previous", "--shard-plan"], env });
  assert.equal(invalide.stdout, "previous=555\n");
  const rien = passePr(racine, { args: ["--pr-previous"], env: { ...env, FAKE_RUNS: join(bin, "absent.json") } });
  assert.equal(rien.status, 0);
  assert.equal(rien.stdout, "");
  assert.match(rien.stderr, /No previous verdict/);
});
