import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { checks, projectRoot, texts } from "./engine.mjs";
import { pathToFileURL } from "node:url";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-moteur-"));
  dossiers.push(dir);
  return dir;
};
function ecrire(racine, chemin, contenu) {
  mkdirSync(dirname(join(racine, chemin)), { recursive: true });
  writeFileSync(join(racine, chemin), contenu);
}
function git(racine, ...args) {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
}
function depot(branche = "travail") {
  const racine = tmp();
  git(racine, "init", "-q", "-b", branche);
  return racine;
}
const parId = (liste) => Object.fromEntries(liste.map((c) => [c.id, c]));
const executer = (racine, id, options = {}, o = { stdio: "pipe" }) => parId(checks(racine, options))[id].run(o);

/** Exécute `fn` avec PATH et HOME remplacés (gitleaks introuvable ou factice), puis les rétablit. */
function avecEnv(valeurs, fn) {
  const avant = { PATH: process.env.PATH, HOME: process.env.HOME };
  Object.assign(process.env, valeurs);
  try {
    return fn();
  } finally {
    Object.assign(process.env, avant);
  }
}
const dossierGit = dirname(
  spawnSync(process.platform === "win32" ? "where" : "which", ["git"], { encoding: "utf8" }).stdout.split(/\r?\n/)[0],
);
/** gitleaks factice : note ses arguments et réussit. */
function fauxGitleaks(dossier) {
  const chemin = join(dossier, "gitleaks");
  ecrire(dossier, "gitleaks", `#!/bin/sh\necho "$@" >> "${join(dossier, "appels")}"\nexit 0\n`);
  chmodSync(chemin, 0o755);
  return chemin;
}
const posix = { skip: process.platform === "win32" ? "gitleaks factice en script sh" : false };

test("textes : anglais sur demande, français sinon", () => {
  assert.equal(texts("en").noGit, "not a git repository");
  assert.equal(texts("fr").noGit, "pas de dépôt git");
  assert.equal(texts(undefined).noGit, "pas de dépôt git");
});

test("mode minimal : seuls les contrôles du socle hors mode sont applicables", () => {
  const racine = depot();
  const cfg = { mode: "minimal", ciFiles: ["ci.yml"] };
  for (const id of ["secrets", "checks-self-test", "ci-coverage"]) {
    assert.deepEqual(executer(racine, id, { cfg }), { status: "not-applicable", detail: "mode minimal" });
  }
});

test("secrets : gitleaks absent du PATH comme de ~/.local/bin → non exécuté", () => {
  const racine = depot();
  const vide = tmp();
  const r = avecEnv({ PATH: vide, HOME: vide }, () => executer(racine, "secrets", { cfg: { lang: "en" } }));
  assert.deepEqual(r, { status: "not-run", detail: "gitleaks not installed" });
});

test("secrets : gitleaks trouvé hors dépôt git → non exécuté", posix, () => {
  const outils = tmp();
  fauxGitleaks(outils);
  const r = avecEnv({ PATH: [outils, dossierGit].join(delimiter) }, () => executer(tmp(), "secrets"));
  assert.deepEqual(r, { status: "not-run", detail: "pas de dépôt git", configured: true });
});

test("secrets : indexés seulement au commit, tout l'historique en CI ; ~/.local/bin aussi cherché", posix, () => {
  const racine = depot();
  const maison = tmp();
  const outils = join(maison, ".local", "bin");
  mkdirSync(outils, { recursive: true });
  fauxGitleaks(outils);
  avecEnv({ PATH: dossierGit, HOME: maison }, () => {
    assert.equal(executer(racine, "secrets", { env: {} }).status, "ok");
    assert.equal(executer(racine, "secrets", { env: { CI: "true" } }).status, "ok");
  });
  const appels = spawnSync("cat", [join(outils, "appels")], { encoding: "utf8" })
    .stdout.trim()
    .split("\n")
    .filter((l) => l !== "version");
  assert.match(appels[0], /--pre-commit --staged/);
  assert.doesNotMatch(appels[1], /--staged/);
});

test("lancer : commande impossible à lancer = échec ; sortie capturée seulement en pipe", () => {
  const racine = depot();
  // Dossier de travail absent : le processus ne démarre même pas (r.error).
  const cfg = { checks: [{ id: "x", run: "node -e 0", cwd: "absent" }] };
  const r = parId(checks(racine, { cfg })).x.run({ stdio: "pipe" });
  assert.equal(r.status, "fail");
  assert.ok(r.detail);
  // Sans options : stdio hérité, rien de capturé.
  const ok = parId(checks(racine, { cfg: { checks: [{ run: "node -e 0" }] } }))["project:node -e 0"].run();
  assert.deepEqual(ok, { status: "ok", output: undefined });
});

test("docs-references : lance check-docs du projet ; son échec remonte", () => {
  const racine = depot();
  ecrire(racine, ".githooks/check-docs.mjs", "process.exit(3)\n");
  assert.equal(executer(racine, "docs-references").status, "fail");
  ecrire(racine, ".githooks/check-docs.mjs", "console.log('vu')\n");
  const annonces = [];
  assert.deepEqual(executer(racine, "docs-references", {}, { stdio: "pipe", beforeRun: (n) => annonces.push(n) }), {
    status: "ok",
    output: "vu\n",
  });
  assert.deepEqual(annonces, ["chemins et contrats cités dans la doc"]);
});

test("QUA-029 : contract-tests lance check-contract-tests du projet ; son échec remonte", () => {
  const racine = depot();
  ecrire(racine, ".githooks/check-contract-tests.mjs", "process.exit(1)\n");
  assert.equal(executer(racine, "contract-tests").status, "fail");
  ecrire(racine, ".githooks/check-contract-tests.mjs", "console.log('lié')\n");
  assert.deepEqual(executer(racine, "contract-tests"), { status: "ok", output: "lié\n" });
  assert.match(texts("en").contractTests, /QUA-029/);
});

test("périmètre : bloquant = échec marqué ✗, avertissement = ok marqué ⚠ ; affiché hors pipe", () => {
  const racine = depot();
  const indexes = ["src/a.js"];
  const annonces = [];
  const bloque = executer(
    racine,
    "scope-gate",
    { cfg: { scopeGate: "blocking" }, staged: indexes },
    { stdio: "pipe", beforeRun: (n) => annonces.push(n) },
  );
  assert.equal(bloque.status, "fail");
  assert.match(bloque.output, /^ {2}✗ /);
  assert.deepEqual(annonces, ["périmètre de l'attente"]);
  const journal = [];
  const log = console.log;
  console.log = (m) => journal.push(m);
  try {
    const averti = executer(racine, "scope-gate", { staged: indexes }, {});
    assert.equal(averti.status, "ok");
    assert.match(averti.output, /^ {2}⚠ /);
  } finally {
    console.log = log;
  }
  assert.equal(journal.length, 1);
  // Sans problème : rien d'affiché.
  assert.equal(executer(racine, "scope-gate", { staged: ["docs/projects/a.md"] }, {}).output, "");
});

test("branche principale : refusée hors CI, tolérée pour un push sans branche, hors dépôt git", () => {
  assert.equal(executer(depot("master"), "main-branch", { env: {} }).status, "fail");
  assert.match(
    executer(depot("main"), "main-branch", { env: {}, cfg: { lang: "en" } }).message,
    /^direct work on the main branch \(main\)/,
  );
  assert.deepEqual(executer(depot("travail"), "main-branch", { env: {} }), { status: "ok" });
  assert.deepEqual(executer(tmp(), "main-branch", { env: {} }), { status: "ok" });
  const maitre = depot("master");
  assert.equal(executer(maitre, "main-branch", { env: { CI: "1" } }).status, "not-applicable");
  assert.equal(executer(maitre, "main-branch", { env: { DRWIL_PUSH_TAGS_ONLY: "1" } }).detail, "push de tags uniquement");
  assert.equal(executer(maitre, "main-branch", { env: { DRWIL_PUSH_NO_BRANCH: "1" } }).status, "not-applicable");
});

test("autotest : sans dossier ou sans test non applicable ; sinon les tests du dépôt tournent (même sous node --test)", () => {
  const racine = depot();
  assert.equal(executer(racine, "checks-self-test").detail, "tests propres au dépôt drwil, non livrés");
  ecrire(racine, ".githooks/a.mjs", "");
  assert.equal(executer(racine, "checks-self-test").status, "not-applicable");
  ecrire(racine, ".githooks/a.test.mjs", "import { test } from 'node:test';\ntest('échoue', () => { throw new Error('x'); });\n");
  assert.equal(executer(racine, "checks-self-test").status, "fail");
});

test("couverture CI : sans CI non exécuté, sinon check-control-coverage du projet", () => {
  const racine = depot();
  assert.equal(executer(racine, "ci-coverage").status, "not-run");
  assert.equal(executer(racine, "ci-coverage", { cfg: { ciFiles: "pas une liste" } }).status, "not-run");
  ecrire(racine, ".githooks/check-control-coverage.mjs", "");
  assert.equal(executer(racine, "ci-coverage", { cfg: { ciFiles: ["ci.yml"] } }).status, "ok");
});

test("contrôles du projet : identifiant, name: nom, report au commit hors chemins, cwd", () => {
  const racine = depot();
  ecrire(racine, "sous/marque.js", "");
  const cfg = {
    checks: [
      {
        id: "nomme",
        name: "Nommé",
        run: "node -e \"process.exit(require('fs').existsSync('marque.js') ? 0 : 1)\"",
        cwd: "sous",
        paths: ["src/**"],
      },
      { run: "node -e 0", paths: [] },
    ],
  };
  const sans = parId(checks(racine, { cfg }));
  assert.equal(sans.nomme.name, "Nommé");
  assert.equal(sans.nomme.run({ stdio: "pipe" }).status, "ok");
  const reporte = parId(checks(racine, { cfg, staged: ["docs/a.md"] }));
  assert.deepEqual(reporte.nomme.run(), {
    status: "not-run",
    detail: "aucun fichier indexé sous ses chemins : rejoué au push et en CI",
  });
  assert.equal(reporte["project:node -e 0"].run({ stdio: "pipe" }).status, "ok");
  const touche = parId(checks(racine, { cfg, staged: ["src/x/y.js"] }));
  assert.equal(touche.nomme.run({ stdio: "pipe" }).status, "ok");
  // checks absent ou mal formé : seuls les contrôles du socle.
  assert.equal(checks(racine, { cfg: { checks: {} } }).length, 7);
  assert.equal(checks(racine).length, 7);
});

test("projectRoot : dossier parent de .githooks/ quel que soit le dossier courant ; DRWIL_ROOT la remplace", () => {
  const url = pathToFileURL(join(tmpdir(), "projet", ".githooks", "run-checks.mjs")).href;
  assert.equal(projectRoot(url, {}), join(tmpdir(), "projet"));
  assert.equal(projectRoot(url, { DRWIL_ROOT: "/ailleurs" }), "/ailleurs");
  const avant = process.env.DRWIL_ROOT;
  delete process.env.DRWIL_ROOT;
  try {
    assert.equal(projectRoot(url), join(tmpdir(), "projet"));
  } finally {
    if (avant !== undefined) process.env.DRWIL_ROOT = avant;
  }
});
