import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { checks, projectRoot, startParallel, texts } from "./engine.mjs";
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

test("QUA-040 : architecture-map lance check-architecture du projet ; son échec remonte", () => {
  const racine = depot();
  ecrire(racine, ".githooks/check-architecture.mjs", "process.exit(1)\n");
  assert.equal(executer(racine, "architecture-map").status, "fail");
  ecrire(racine, ".githooks/check-architecture.mjs", "console.log('carte')\n");
  assert.deepEqual(executer(racine, "architecture-map"), { status: "ok", output: "carte\n" });
  assert.match(texts("en").architecture, /QUA-040/);
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
  // Au push, les références distantes poussées sont jugées, pas la branche courante.
  assert.deepEqual(executer(maitre, "main-branch", { env: { DRWIL_PUSH_REFS: " refs/heads/recette/v1.0.0" } }), { status: "ok" });
  const versMain = executer(depot("travail"), "main-branch", { env: { DRWIL_PUSH_REFS: "refs/heads/travail refs/heads/main" } });
  assert.equal(versMain.status, "fail");
  assert.match(versMain.message, /branche principale \(main\)/);
  // Vide (lancement sans entrée standard) : retour à la branche courante.
  assert.equal(executer(maitre, "main-branch", { env: { DRWIL_PUSH_REFS: "" } }).status, "fail");
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

test("QUA-043 : sans CI, le détail de la couverture CI dit comment en déclarer une", () => {
  const racine = depot();
  const r = executer(racine, "ci-coverage");
  assert.equal(r.status, "not-run");
  assert.match(r.detail, /npx drwil init --ci github.*--ci gitlab/);
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
  const reporte = parId(checks(racine, { cfg, staged: ["autre/a.json"] }));
  assert.deepEqual(reporte.nomme.run(), {
    status: "not-run",
    detail: "aucun fichier indexé sous ses chemins : rejoué au push et en CI",
  });
  assert.equal(reporte["project:node -e 0"].run({ stdio: "pipe" }).status, "ok");
  const touche = parId(checks(racine, { cfg, staged: ["src/x/y.js"] }));
  assert.equal(touche.nomme.run({ stdio: "pipe" }).status, "ok");
  // checks absent ou mal formé : seuls les contrôles du socle.
  assert.equal(checks(racine, { cfg: { checks: {} } }).length, 8);
  assert.equal(checks(racine).length, 8);
});

test("QUA-035 : commit de documentation seule : tests des contrôles et contrôles du projet non exécutés, signalés ; avec du code, rejoués", () => {
  const racine = depot();
  ecrire(racine, ".githooks/x.test.mjs", "import { test } from 'node:test'; test('t', () => {});\n");
  const cfg = { checks: [{ id: "lint", run: "node -e 0" }] };
  const doc = parId(checks(racine, { cfg, staged: ["docs/projects/fiche.md", "README.md"] }));
  for (const id of ["checks-self-test", "lint"])
    assert.deepEqual(
      doc[id].run({ stdio: "pipe" }),
      { status: "not-run", detail: "commit de documentation seule : rejoué au push et en CI" },
      id,
    );
  assert.match(texts("en").docsOnly, /documentation-only commit/);
  const code = parId(checks(racine, { cfg, staged: ["docs/projects/fiche.md", "src/a.js"] }));
  assert.equal(code.lint.run({ stdio: "pipe" }).status, "ok");
  assert.equal(code["checks-self-test"].run({ stdio: "pipe" }).status, "ok");
  const pousse = parId(checks(racine, { cfg }));
  assert.equal(pousse.lint.run({ stdio: "pipe" }).status, "ok", "au push et en CI (rien d'indexé) : toujours rejoué");
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

// Un worktree, `git commit -a` : le hook reçoit GIT_DIR, GIT_INDEX_FILE… Un contrôle lancé qui fait
// `git init` ailleurs les hériterait et agirait sur le dépôt qui le lance, quel que soit le fichier de test.
test("QUA-057 : le lanceur retire les GIT_* de l'environnement de chaque contrôle qu'il lance", () => {
  const racine = depot();
  const herite = "Object.keys(process.env).some((k) => k.startsWith('GIT_'))";
  ecrire(racine, ".githooks/check-docs.mjs", `process.exit(${herite} ? 1 : 0);\n`);
  ecrire(racine, ".githooks/check-control-coverage.mjs", `process.exit(${herite} ? 1 : 0);\n`);
  ecrire(
    racine,
    ".githooks/a.test.mjs",
    `import { test } from 'node:test';\ntest('sans GIT_*', () => { if (${herite}) throw new Error('GIT_* hérité'); });\n`,
  );
  const env = {
    ...process.env,
    GIT_DIR: join(racine, ".git"),
    GIT_INDEX_FILE: join(racine, ".git", "index-du-hook"),
    GIT_WORK_TREE: racine,
  };
  const cfg = { ciFiles: ["ci.yml"], checks: [{ id: "projet", run: `node -e "process.exit(${herite} ? 1 : 0)"` }] };
  for (const id of ["docs-references", "checks-self-test", "ci-coverage", "projet"]) {
    assert.equal(executer(racine, id, { cfg, env }).status, "ok", id);
  }
});

// L'analyse des secrets indexés lit l'index du commit en cours : sous `git commit -a`, c'est
// GIT_INDEX_FILE qui le désigne, pas .git/index.
test("QUA-057 : seul gitleaks garde les GIT_* du hook, pour lire l'index du commit en cours", posix, () => {
  const racine = depot();
  const outils = tmp();
  const chemin = join(outils, "gitleaks");
  ecrire(outils, "gitleaks", `#!/bin/sh\necho "$GIT_INDEX_FILE" >> "${join(outils, "appels")}"\nexit 0\n`);
  chmodSync(chemin, 0o755);
  avecEnv({ PATH: `${outils}${delimiter}${dossierGit}`, HOME: tmp() }, () => {
    assert.equal(executer(racine, "secrets", { env: { PATH: process.env.PATH, GIT_INDEX_FILE: "index-du-hook" } }).status, "ok");
  });
  assert.match(readFileSync(join(outils, "appels"), "utf8"), /^index-du-hook$/m);
});

const compte = (racine) => readFileSync(join(racine, "builds"), "utf8").trim().split("\n").length;
const cmdBuild = (sortie = 0) =>
  `node -e "require('fs').appendFileSync('builds','x\\n');console.log('sortie du build');process.exit(${sortie})"`;

test("QUA-120 : la compilation n'est faite qu'une fois par passage, par le premier contrôle qui en dépend", async () => {
  const racine = depot();
  const cfg = {
    build: cmdBuild(),
    parallel: true,
    checks: [
      { id: "a", run: "node -e 0", needsBuild: true },
      { id: "b", run: "node -e 0", needsBuild: true },
      { id: "c", run: "node -e 0" },
    ],
  };
  const liste = parId(checks(racine, { cfg }));
  assert.equal(liste.c.run({ stdio: "pipe" }).status, "ok");
  assert.throws(() => readFileSync(join(racine, "builds")), "rien ne dépend du build : pas compilé");
  assert.equal(liste.a.run({ stdio: "pipe" }).status, "ok");
  assert.equal(liste.b.run({ stdio: "pipe" }).status, "ok");
  assert.equal(compte(racine), 1);
  assert.equal((await liste.b.runAsync()).status, "ok", "compilé en série, relu en parallèle");
  assert.equal(compte(racine), 1);
  const parallele = parId(checks(racine, { cfg }));
  assert.equal((await parallele.a.runAsync()).status, "ok");
  assert.equal(compte(racine), 2, "autre passage, autre compilation");
  assert.equal((await parallele.b.runAsync()).status, "ok");
  assert.equal(compte(racine), 2);
});

test("QUA-120 : une compilation en échec fait échouer chaque contrôle qui en dépend, nommé, sa sortie dite une fois", async () => {
  const racine = depot();
  const cfg = {
    build: cmdBuild(1),
    parallel: true,
    checks: [
      { id: "a", name: "Alpha", run: "node -e 0", needsBuild: true },
      { id: "b", name: "Bravo", run: "node -e 0", needsBuild: true },
      { id: "c", run: "node -e 0", needsBuild: true },
    ],
  };
  const liste = parId(checks(racine, { cfg }));
  const a = liste.a.run({ stdio: "pipe" });
  assert.equal(a.status, "fail");
  assert.equal(a.message, "Alpha : la compilation du projet (build) est en échec");
  assert.match(a.output, /sortie du build/);
  const b = liste.b.run({ stdio: "pipe" });
  assert.deepEqual([b.status, b.message, b.output], ["fail", "Bravo : la compilation du projet (build) est en échec", undefined]);
  const asynchrone = parId(checks(racine, { cfg }));
  const [x, y] = await Promise.all([asynchrone.a.runAsync(), asynchrone.c.runAsync()]);
  assert.deepEqual([x.status, y.status], ["fail", "fail"]);
  assert.equal([x, y].filter((r) => r.output !== undefined).length, 1, "sortie du build dite une fois");
  assert.equal(compte(racine), 2);
  const sans = parId(
    checks(racine, { cfg: { lang: "en", parallel: true, checks: [{ id: "a", name: "Alpha", run: "node -e 0", needsBuild: true }] } }),
  );
  const manque = 'Alpha declares needsBuild without a "build" in .drwil/ia-first.json';
  assert.equal(sans.a.run({ stdio: "pipe" }).message, manque);
  assert.equal((await sans.a.runAsync()).message, manque);
  const fr = parId(checks(racine, { cfg: { checks: [{ id: "a", name: "Alpha", run: "node -e 0", needsBuild: true }] } }));
  assert.match(fr.a.run({ stdio: "pipe" }).message, /^Alpha déclare needsBuild sans « build »/);
  const en = parId(
    checks(racine, { cfg: { lang: "en", build: cmdBuild(1), checks: [{ id: "a", name: "Alpha", run: "node -e 0", needsBuild: true }] } }),
  );
  assert.equal(en.a.run({ stdio: "pipe" }).message, "Alpha: the project build failed");
});

test("QUA-120 : un contrôle reporté (hors chemins, doc seule) ne déclenche pas la compilation", async () => {
  const racine = depot();
  const cfg = { build: cmdBuild(), parallel: true, checks: [{ id: "a", run: "node -e 0", needsBuild: true, paths: ["src/**"] }] };
  const liste = parId(checks(racine, { cfg, staged: ["autre/a.json"] }));
  assert.equal(liste.a.run().status, "not-run");
  assert.equal((await liste.a.runAsync()).status, "not-run");
  assert.throws(() => readFileSync(join(racine, "builds")));
});

test("QUA-119 : en parallèle, mêmes verdicts qu'en série, un échec nomme son contrôle, un contrôle non lancé reste non exécuté", async () => {
  const racine = depot();
  ecrire(racine, ".githooks/a.test.mjs", "import { test } from 'node:test';\ntest('échoue', () => { throw new Error('x'); });\n");
  const cfg = {
    parallel: true,
    checks: [
      { id: "bon", run: "node -e \"console.log('bonjour')\"" },
      { id: "mauvais", name: "Mauvais", run: 'node -e "process.exit(3)"' },
      { id: "seul", run: "node -e 0", parallel: false },
      { id: "inexistant", run: "node -e 0", cwd: "absent" },
    ],
  };
  const liste = parId(checks(racine, { cfg }));
  assert.equal(liste.seul.runAsync, undefined, "opt-out");
  assert.equal(
    checks(racine, { cfg: { checks: cfg.checks } }).some((c) => c.runAsync),
    false,
    "sans parallel, tout reste en série",
  );
  const lancee = startParallel(Object.values(liste), 2);
  assert.deepEqual([...lancee.keys()].sort(), ["bon", "checks-self-test", "inexistant", "mauvais"].sort());
  const bon = await lancee.get("bon");
  assert.deepEqual([bon.status, bon.launched, bon.output.trim()], ["ok", true, "bonjour"]);
  assert.equal((await lancee.get("mauvais")).status, "fail");
  assert.equal((await lancee.get("inexistant")).status, "fail", "ne pas pouvoir lancer est un échec");
  assert.equal((await lancee.get("checks-self-test")).status, "fail");
  assert.equal(liste.mauvais.run({ stdio: "pipe" }).status, "fail");
});

test("QUA-119 : l'autotest en parallèle suit les mêmes cas qu'en série ; sans limite, au plus la moitié des cœurs", async () => {
  const racine = depot();
  const liste = parId(checks(racine, { cfg: { parallel: true } }));
  assert.equal((await liste["checks-self-test"].runAsync()).detail, "tests propres au dépôt drwil, non livrés");
  ecrire(racine, ".githooks/a.test.mjs", "import { test } from 'node:test';\ntest('ok', () => {});\n");
  const r = await liste["checks-self-test"].runAsync();
  assert.deepEqual([r.status, r.launched], ["ok", true]);
  const vide = startParallel([{ id: "x", runAsync: async () => ({ status: "ok" }) }]);
  assert.equal((await vide.get("x")).status, "ok");
  assert.equal(startParallel([]).size, 0);
});
