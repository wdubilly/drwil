// Garanties obligatoires à l'adoption : couverture par couche, e2e, versionnement, présentation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COVERAGE_TOOLS,
  doctor,
  formatGuarantees,
  guaranteeFailures,
  guarantees,
  init,
  skeletonFiles,
  toolFor,
  verify,
} from "../dist/index.js";
import { bypassDiagnosis, forgeOf, inspectForge, protectBranch, rulesetBypass } from "../dist/guarantees-forge.js";
import { hasSources } from "../dist/guarantees-table.js";
import { renderBrief } from "../dist/guarantees-briefs.js";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), "..", "templates", "common");
const lire = (dir, f) => readFileSync(join(dir, f), "utf8");
const config = (dir) => JSON.parse(lire(dir, ".drwil/ia-first.json"));
const ecrireConfig = (dir, cfg) => writeFileSync(join(dir, ".drwil/ia-first.json"), `${JSON.stringify(cfg, null, 2)}\n`);
const ecrire = (dir, f, texte) => {
  mkdirSync(dirname(join(dir, f)), { recursive: true });
  writeFileSync(join(dir, f), texte);
};
const silence = async (fn) => {
  const { log, warn } = console;
  console.log = console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
    console.warn = warn;
  }
};

/** Exécuteur simulé : la première règle dont le motif reconnaît la commande répond ; sinon, échec. */
function faux(regles, appels = []) {
  return (cmd, cwd) => {
    appels.push(cmd);
    for (const [motif, reponse] of regles) if (motif.test(cmd)) return typeof reponse === "function" ? reponse(cmd, cwd) : reponse;
    return { status: 1, stdout: "" };
  };
}
const OK = { status: 0, stdout: "" };
const json = (o) => ({ status: 0, stdout: JSON.stringify(o) });
/** Forge GitHub complète : dépôt, origin, protection par ruleset. */
const FORGE_OK = [
  [/^git rev-parse --is-inside-work-tree/, OK],
  [/^git symbolic-ref/, { status: 0, stdout: "refs/remotes/origin/main\n" }],
  [/^git remote get-url origin/, { status: 0, stdout: "git@github.com:x/y.git\n" }],
  [/^gh auth status/, OK],
  [/rules\/branches\/main/, json([{ type: "pull_request" }, { type: "required_status_checks" }])],
];

/** Projet installé (français, CI GitHub), avec un package.json de pile Node. */
async function projet({ pile = true, lang = "fr" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-garanties-"));
  await silence(() => init({ lang, targetDir: dir, git: false, ci: "github", tools: "claude" }));
  if (pile) ecrire(dir, "package.json", JSON.stringify({ name: "p", scripts: { test: "node --test" } }));
  return dir;
}

/** Ajoute au registre un contrat qui cite ces contrôles (pour que verify les rejoue). */
function citer(dir, id, controles) {
  appendFileSync(
    join(dir, "docs/contracts.md"),
    `\n## ${id} — garantie\n**Rule** : x\n**Scope** : x\n**Source of truth** : x\n**Proof** : x\n**Reason** : x\n**Check** : ${controles.map((c) => `\`${c}\``).join(", ")}\n`,
  );
}

test("QUA-087 câblage : une couche de pile connue reçoit son contrôle à 100 % sur les quatre métriques", async () => {
  const dir = await projet();
  const r = guarantees({ targetDir: dir, exec: faux([[/c8 --version/, OK], ...FORGE_OK]) });
  const [couche] = r.layers;
  assert.deepEqual([couche.layer, couche.slug, couche.tool, couche.mode, couche.status], [".", "root", "c8", "new", "wired"]);
  const controle = config(dir).checks.find((c) => c.id === "coverage-root");
  assert.match(controle.run, /--check-coverage --lines 100 --branches 100 --functions 100 --statements 100 --all npm test/);
  assert.deepEqual(controle.paths, ["**"]);
  assert.equal(config(dir).guarantees.enforced, true);
  assert.equal(config(dir).guarantees.layers.root, "new");
  assert.match(formatGuarantees(r).join("\n"), /contrôle `coverage-root` câblé à 100 % \(lines, branches, functions, statements\) avec c8/);
  // Un contrôle déjà déclaré est signalé, jamais remplacé.
  const relance = guarantees({ targetDir: dir, exec: faux([[/c8 --version/, OK], ...FORGE_OK]) });
  assert.equal(relance.layers[0].status, "kept");
  assert.equal(config(dir).checks.filter((c) => c.id === "coverage-root").length, 1);
  // La table : une ligne par pile, l'outil dit ce qu'il mesure vraiment.
  assert.equal(toolFor(["Python (FastAPI)"]).tool, "coverage.py");
  assert.deepEqual(toolFor(["Go"]).metrics, ["statements"]);
  assert.match(toolFor(["Go"]).metricsNote, /statements only/);
  assert.equal(toolFor(["Java/Maven (Spring Boot)"]).run({}, []), "mvn -q verify");
  assert.match(toolFor(["JVM/Gradle"]).run({}, []), /jacocoTestCoverageVerification/);
  assert.equal(toolFor(["Rust"]), null);
  assert.match(toolFor(["Python"]).run({}, []), /--fail-under=100/);
  assert.match(toolFor(["Go"]).run({}, []), /\$3\+0 < 100/);
  assert.deepEqual(
    COVERAGE_TOOLS.map((t) => t.stack),
    ["Node.js", "Python", "Go", "Java/Maven", "JVM/Gradle"],
  );
});

test("QUA-088 pile hors table : fiche bloquante [P0], verify en FAIL sur la couche, levée quand le contrôle est câblé et cité", async () => {
  const dir = await projet({ pile: false });
  ecrire(dir, "Cargo.toml", "[package]\nname='p'\n");
  const r = guarantees({ targetDir: dir, exec: faux(FORGE_OK) });
  assert.equal(r.layers[0].status, "blocked");
  assert.ok(existsSync(join(dir, "docs/projects/couverture-root.md")));
  const fiche = lire(dir, "docs/projects/couverture-root.md");
  assert.match(fiche, /\*\*Garantie\*\* : bloquante/);
  assert.match(fiche, /pile `Rust` hors de la table des outils de couverture/);
  assert.match(
    lire(dir, "docs/projects/pending.md"),
    /- \[ \] \[humain\] \[P0\] Garantie : couverture de test de la couche `\.` — `docs\/projects\/couverture-root\.md`/,
  );
  let v = await verify({ targetDir: dir });
  assert.equal(v.status, "FAIL");
  assert.ok(v.errors.some((e) => /couverture non tenue sur la couche `\.` : contrôle `coverage-root` non déclaré/.test(e)));
  // Câblé à la main (outil choisi par le demandeur) mais cité par aucun contrat : toujours non tenu.
  const cfg = config(dir);
  cfg.checks.push({ id: "coverage-root", name: "couverture", run: "node -e 0" });
  ecrireConfig(dir, cfg);
  assert.ok(guaranteeFailures(dir, config(dir), []).some((e) => /coverage-root` cité par aucun contrat/.test(e)));
  citer(dir, "QUA-900", ["coverage-root"]);
  v = await verify({ targetDir: dir });
  assert.ok(!v.errors.some((e) => /coverage-root/.test(e)), v.errors.join("\n"));
  // Une fiche existante n'est jamais réécrite.
  writeFileSync(join(dir, "docs/projects/couverture-root.md"), "# commencée\n");
  guarantees({ targetDir: dir, exec: faux(FORGE_OK) });
  assert.equal(lire(dir, "docs/projects/couverture-root.md"), "# commencée\n");
  // Sans garanties imposées (projet jamais passé par la commande) : rien n'est jugé.
  assert.deepEqual(guaranteeFailures(dir, {}, []), []);
});

test("QUA-089 e2e exigé : fiche bloquante qui demande les chemins critiques, tenu quand le contrôle e2e est déclaré et cité", async () => {
  const dir = await projet();
  const r = guarantees({ targetDir: dir, exec: faux([[/c8 --version/, OK], ...FORGE_OK]) });
  assert.equal(r.e2e, false);
  const fiche = lire(dir, "docs/projects/e2e-chemins-critiques.md");
  assert.match(fiche, /\[décision\] Quels sont les chemins critiques/);
  assert.ok(guaranteeFailures(dir, config(dir), []).some((e) => /garantie e2e non tenue : contrôle `e2e` non déclaré/.test(e)));
  const cfg = config(dir);
  cfg.checks.push({ id: "e2e", name: "e2e", run: "node -e 0" });
  ecrireConfig(dir, cfg);
  assert.ok(guaranteeFailures(dir, config(dir), [{ checks: ["e2e"] }]).every((e) => !/e2e/.test(e)));
  assert.equal(guarantees({ targetDir: dir, dryRun: true, exec: faux([[/c8 --version/, OK], ...FORGE_OK]) }).e2e, true);
});

test("QUA-090 aucune dérogation : une exclusion justifiée passe au contrôle, une exclusion sans raison est refusée", async () => {
  const dir = await projet();
  const cfg = config(dir);
  cfg.guarantees = {
    exclusions: [
      { path: "src/main.js", reason: "point d'entrée, couvert par l'e2e" },
      { path: "vite.config.js" },
      { layer: "web", path: "x.js", reason: "autre couche" },
    ],
  };
  ecrireConfig(dir, cfg);
  const r = guarantees({ targetDir: dir, exec: faux([[/c8 --version/, OK], ...FORGE_OK]) });
  const run = config(dir).checks.find((c) => c.id === "coverage-root").run;
  assert.match(run, /--exclude="src\/main\.js"/);
  assert.doesNotMatch(run, /vite\.config|x\.js/);
  assert.match(r.layers[0].lines.join("\n"), /exclusion `vite\.config\.js` refusée : sans raison déclarée/);
  assert.ok(guaranteeFailures(dir, config(dir), []).some((e) => /exclusion `vite\.config\.js` refusée/.test(e)));
  assert.match(toolFor(["Python"]).run({}, ["a.py", "b.py"]), /--omit="a\.py,b\.py"/);
});

test("QUA-091 outil absent ou non lançable : jamais « passé », contrôle non câblé, fiche bloquante", async () => {
  const dir = await projet();
  const r = guarantees({ targetDir: dir, exec: faux(FORGE_OK) });
  assert.equal(r.layers[0].status, "blocked");
  assert.match(
    r.layers[0].lines.join("\n"),
    /outil c8 non installé ou non lançable \(`npx --no-install c8 --version`\) : contrôle non exécuté, jamais « passé »/,
  );
  assert.equal(
    config(dir).checks.some((c) => c.id === "coverage-root"),
    false,
  );
  assert.match(lire(dir, "docs/projects/couverture-root.md"), /non installé ou non lançable/);
  assert.match(formatGuarantees(r).join("\n"), /✗ outil c8/);
});

test("QUA-093 projet existant en dette : cliquet au niveau mesuré, diff à 100 %, fiche de montée [P1] non bloquante", async () => {
  const dir = await projet();
  ecrire(dir, "src/a.js", "export const a = 1;\n");
  const mesure = (_cmd, cwd) => {
    ecrire(
      cwd,
      ".drwil/coverage-root/coverage-summary.json",
      JSON.stringify({ total: { lines: { pct: 72.5 }, branches: { pct: 60 }, functions: { pct: 80 }, statements: { pct: 71.2 } } }),
    );
    return OK;
  };
  const r = guarantees({
    targetDir: dir,
    exec: faux([[/c8 --version/, OK], [/json-summary/, mesure], [/diff-cover --version/, OK], ...FORGE_OK]),
  });
  assert.equal(r.layers[0].mode, "existing");
  const checks = config(dir).checks;
  assert.match(checks.find((c) => c.id === "coverage-root").run, /--lines 72 --branches 60 --functions 80 --statements 71 /);
  assert.match(checks.find((c) => c.id === "coverage-diff-root").run, /diff-cover .* --fail-under=100/);
  const montee = lire(dir, "docs/projects/couverture-root-montee.md");
  assert.doesNotMatch(montee, /\*\*Garantie\*\* : bloquante/);
  assert.match(lire(dir, "docs/projects/pending.md"), /\[P1\] Montée de couverture de la couche `\.`/);
  assert.equal(config(dir).guarantees.layers.root, "existing");
  assert.ok(guaranteeFailures(dir, config(dir), [{ checks: ["coverage-root"] }]).some((e) => /coverage-diff-root/.test(e)));
});

test("QUA-093 projet existant : mesure à 100 % câblée à 100 %, mesure impossible ou outil de diff absent bloquent", async () => {
  const cas = async (regles, slug = "root") => {
    const dir = await projet();
    ecrire(dir, "src/a.ts", "export const a = 1;\n");
    return { dir, r: guarantees({ targetDir: dir, exec: faux([[/c8 --version/, OK], ...regles, ...FORGE_OK]) }), slug };
  };
  const plein = (_cmd, cwd) => {
    ecrire(
      cwd,
      ".drwil/coverage-root/coverage-summary.json",
      JSON.stringify({ total: Object.fromEntries(["lines", "branches", "functions", "statements"].map((m) => [m, { pct: 100 }])) }),
    );
    return OK;
  };
  let { dir, r } = await cas([[/json-summary/, plein]]);
  assert.match(config(dir).checks.find((c) => c.id === "coverage-root").run, /--lines 100 --branches 100/);
  ({ r } = await cas([[/json-summary/, { status: 1, stdout: "" }]]));
  assert.match(r.layers[0].lines.join("\n"), /mesure de la couverture actuelle impossible/);
  ({ r } = await cas([[/json-summary/, OK]]));
  assert.equal(r.layers[0].status, "blocked", "mesure sans rapport lisible");
  const partiel = (_cmd, cwd) => {
    ecrire(cwd, ".drwil/coverage-root/coverage-summary.json", JSON.stringify({ total: { lines: { pct: 50 } } }));
    return OK;
  };
  ({ r } = await cas([[/json-summary/, partiel]]));
  assert.match(r.layers[0].lines.join("\n"), /couverture du diff : outil absent ou inconnu pour c8 \(`diff-cover --version`\)/);
  // JVM : pas de mesure prise en charge, le seuil revient au demandeur.
  const jvm = mkdtempSync(join(tmpdir(), "drwil-garanties-jvm-"));
  await silence(() => init({ lang: "en", targetDir: jvm, git: false, ci: "github", tools: "claude" }));
  ecrire(jvm, "pom.xml", "<project><artifactId>jacoco</artifactId></project>");
  ecrire(jvm, "src/main/java/A.java", "class A {}");
  r = guarantees({ targetDir: jvm, exec: faux([[/grep -q jacoco/, OK], ...FORGE_OK]) });
  assert.match(r.layers[0].lines.join("\n"), /measure of the current coverage not supported for JaCoCo/);
  // Python et Go : lecture de leur mesure.
  const py = toolFor(["Python"]).measure;
  const pyDir = mkdtempSync(join(tmpdir(), "drwil-garanties-py-"));
  writeFileSync(join(pyDir, "rapport.json"), JSON.stringify({ totals: { percent_covered: 87.9 } }));
  assert.deepEqual(py.read(pyDir, "rapport", ""), { lines: 87, branches: 87 });
  assert.equal(py.read(pyDir, "absent", ""), null);
  assert.match(py.run("r"), /coverage json -o r\.json/);
  const go = toolFor(["Go"]).measure;
  assert.deepEqual(go.read("", "", "total:\t(statements)\t93.4%\n"), { statements: 93 });
  assert.equal(go.read("", "", "rien"), null);
  assert.match(go.run(), /go tool cover -func/);
});

test("QUA-093 sources : un fichier de la pile fait un projet existant, pas un fichier de configuration ni un dossier ignoré", () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-garanties-src-"));
  ecrire(dir, "node_modules/x/index.js", "x");
  ecrire(dir, "vite.config.ts", "x");
  ecrire(dir, ".eslintrc.js", "x");
  assert.equal(hasSources(dir, [".js", ".ts"]), false);
  ecrire(dir, "a/b/c/d.ts", "x");
  assert.equal(hasSources(dir, [".ts"]), true);
  assert.equal(hasSources(dir, [".ts"], 1), false, "profondeur bornée");
  assert.equal(hasSources(join(dir, "absent"), [".ts"]), false);
});

test("QUA-094 versionnement : dépôt, forge GitHub ou GitLab, CI ; sans accès à la forge, « non exécuté » et fiche ouverte", async () => {
  const dir = await projet();
  let f = inspectForge(dir, config(dir), faux([]), "fr");
  assert.deepEqual(f.missing, ["pas de dépôt Git (`git init`)"]);
  f = inspectForge(
    dir,
    { ci: "none" },
    faux([
      [/^git rev-parse --is-inside/, OK],
      [/^git rev-parse --verify/, OK],
    ]),
    "en",
  );
  assert.equal(f.branch, "master");
  assert.deepEqual(f.missing, ["no `origin` remote on GitHub or GitLab", "no CI declared (`npx drwil init --ci github` or `--ci gitlab`)"]);
  f = inspectForge(dir, config(dir), faux(FORGE_OK.filter(([m]) => !/gh auth/.test(String(m)))), "fr");
  assert.deepEqual(f.missing, []);
  assert.match(f.notRun, /protection de la branche non vérifiée \(non exécuté\) : gh injoignable/);
  const r = guarantees({ targetDir: dir, exec: faux([[/c8 --version/, OK], ...FORGE_OK.filter(([m]) => !/gh auth/.test(String(m)))]) });
  assert.match(lire(dir, "docs/projects/versionnement.md"), /non exécuté/);
  assert.equal(config(dir).guarantees.protection, undefined);
  assert.match(formatGuarantees(r).join("\n"), /✗ Versionnement : protection de la branche non vérifiée/);
  // Forge et protection complètes : enregistrées pour verify, qui ne joint pas la forge.
  guarantees({ targetDir: dir, exec: faux([[/c8 --version/, OK], ...FORGE_OK]) });
  assert.deepEqual(Object.keys(config(dir).guarantees.protection), ["forge", "branch", "verifiedAt"]);
  assert.equal(forgeOf("https://gitlab.example.com/a/b"), "gitlab");
  assert.equal(forgeOf("https://bitbucket.org/a/b"), null);
  // CI déclarée mais fichier absent.
  const sansCi = await projet();
  rmCi(sansCi);
  assert.ok(
    inspectForge(sansCi, config(sansCi), faux(FORGE_OK), "fr").missing.includes("fichier de CI absent : .github/workflows/ia-first.yml"),
  );
  // verify, hors ligne : dépôt réel sans origin.
  spawnSync("git", ["init", "-q"], { cwd: sansCi });
  const cfg = config(sansCi);
  cfg.guarantees = { enforced: true };
  ecrireConfig(sansCi, cfg);
  const echecs = guaranteeFailures(sansCi, config(sansCi), []);
  assert.ok(echecs.some((e) => /versionnement non tenue : pas de dépôt distant `origin`/.test(e)));
  assert.ok(echecs.some((e) => /protection de la branche principale jamais vérifiée/.test(e)));
});

function rmCi(dir) {
  writeFileSync(join(dir, ".drwil/.keep"), "");
  spawnSync(process.execPath, ["-e", `require("fs").rmSync(${JSON.stringify(join(dir, ".github"))}, { recursive: true, force: true })`]);
}

test("QUA-095 bonnes pratiques : PR, contrôles requis, sans contournement administrateur, CI qui rejoue le hook ; pose avec accord", async () => {
  const dir = await projet();
  const base = FORGE_OK.slice(0, 4);
  // Protection classique incomplète : les administrateurs contournent.
  let f = inspectForge(
    dir,
    config(dir),
    faux([
      ...base,
      [
        /branches\/main\/protection/,
        json({ required_pull_request_reviews: {}, required_status_checks: {}, enforce_admins: { enabled: false } }),
      ],
    ]),
    "fr",
  );
  assert.deepEqual(f.missing, ["protection de `main` incomplète : les administrateurs peuvent contourner"]);
  f = inspectForge(dir, config(dir), faux([...base, [/branches\/main\/protection/, json({})]]), "en");
  assert.deepEqual(f.missing, [
    "protection of `main` incomplete: merge through PR/MR not enforced, CI checks not required, administrators can bypass",
  ]);
  f = inspectForge(dir, config(dir), faux([...base, [/branches\/main\/protection/, { status: 0, stdout: "pas du json" }]]), "fr");
  assert.match(f.missing[0], /branche principale `main` non protégée/);
  assert.equal(f.protected, false);
  // Une CI qui ne rejoue pas run-checks laisserait passer un --no-verify.
  writeFileSync(join(dir, ".github/workflows/ia-first.yml"), "on: push\njobs: {}\n");
  assert.ok(inspectForge(dir, config(dir), faux(FORGE_OK), "fr").missing.some((m) => /--no-verify/.test(m)));
  // GitLab : push direct, pipeline non requis, force push.
  const gitlab = [
    [/^git rev-parse --is-inside/, OK],
    [/^git symbolic-ref/, { status: 1, stdout: "" }],
    [/^git remote get-url/, { status: 0, stdout: "https://gitlab.com/a/b.git" }],
    [/^glab auth status/, OK],
  ];
  f = inspectForge(
    dir,
    { ci: "gitlab" },
    faux([
      ...gitlab,
      [/protected_branches\/main/, json({ push_access_levels: [{ access_level: 40 }], allow_force_push: true })],
      [/projects\/:id$/, json({})],
    ]),
    "fr",
  );
  assert.equal(f.forge, "gitlab");
  assert.match(f.missing.at(-1), /push direct autorisé, contrôles de CI non requis, les administrateurs peuvent contourner/);
  f = inspectForge(
    dir,
    { ci: "gitlab" },
    faux([
      ...gitlab,
      [/protected_branches\/main/, json({ push_access_levels: [{ access_level: 0 }] })],
      [/projects\/:id$/, json({ only_allow_merge_if_pipeline_succeeds: true })],
    ]),
    "fr",
  );
  assert.equal(f.protected, true);
  f = inspectForge(dir, { ci: "gitlab" }, faux([...gitlab, [/protected_branches/, { status: 1, stdout: "" }]]), "fr");
  assert.match(f.missing.at(-1), /non protégée/);
  f = inspectForge(dir, { ci: "gitlab" }, faux(gitlab.slice(0, 3)), "fr");
  assert.match(f.notRun, /glab injoignable/);
  // Pose de la protection : seulement avec --protect (accord de l'humain), jamais en silence.
  writeFileSync(join(dir, ".github/workflows/ia-first.yml"), "jobs:\n  checks:\n    steps:\n      - run: node .githooks/run-checks.mjs\n");
  const appels = [];
  const sansProtection = [...base, [/branches\/main\/protection/, { status: 1, stdout: "" }]];
  guarantees({ targetDir: dir, exec: faux(sansProtection, appels) });
  assert.ok(!appels.some((c) => /-X PUT/.test(c)), "sans --protect, rien n'est posé");
  assert.match(
    formatGuarantees(guarantees({ targetDir: dir, dryRun: true, exec: faux(sansProtection) })).join("\n"),
    /npx drwil guarantees --protect/,
  );
  let pose = false;
  const r = guarantees({
    targetDir: dir,
    protect: true,
    exec: faux(
      [
        [
          /-X PUT .*branches\/main\/protection --input/,
          () => {
            pose = true;
            return OK;
          },
        ],
        ...base,
        [
          /branches\/main\/protection/,
          () =>
            pose
              ? json({ required_pull_request_reviews: {}, required_status_checks: {}, enforce_admins: { enabled: true } })
              : { status: 1, stdout: "" },
        ],
      ],
      appels,
    ),
  });
  assert.equal(r.protectedNow, true);
  assert.match(formatGuarantees(r).join("\n"), /Protection de `main` posée sur github/);
  assert.ok(config(dir).guarantees.protection);
  const gl = [];
  assert.equal(protectBranch(dir, "gitlab", "main", faux([[/glab api/, OK]], gl)), true);
  assert.equal(gl.length, 2);
});

test("QUA-115 bypass_actors : lu avec un jeton administrateur, une liste non vide est un manque ; sinon « non vérifié », jamais tenu", async () => {
  const dir = await projet();
  const regles = json([
    { type: "pull_request", ruleset_id: 7 },
    { type: "required_status_checks", ruleset_id: 7 },
    // Un ruleset_id qui n'est pas un entier n'entre jamais dans une commande.
    { type: "deletion", ruleset_id: "7; rm -rf ." },
  ]);
  const forge = (ruleset) => faux([...FORGE_OK.slice(0, 4), [/rules\/branches\/main/, regles], [/rulesets\/7/, ruleset]]);
  // Jeton administrateur, liste vide : tenu, rien de non vérifié.
  let f = inspectForge(dir, config(dir), forge(json({ bypass_actors: [] })), "fr");
  assert.deepEqual([f.missing, f.unverified, f.protected], [[], null, true]);
  // Jeton administrateur, un rôle contourne : manque bloquant.
  f = inspectForge(
    dir,
    config(dir),
    forge(json({ bypass_actors: [{ actor_type: "RepositoryRole", actor_id: 5 }, { actor_type: "OrganizationAdmin" }] })),
    "fr",
  );
  assert.deepEqual(f.missing, [
    "protection de `main` incomplète : le ruleset a des acteurs qui le contournent (bypass_actors : RepositoryRole 5, OrganizationAdmin)",
  ]);
  assert.equal(f.protected, false);
  // Jeton non administrateur (champ absent), ruleset illisible, ou règles sans ruleset : non vérifié, dit, non bloquant.
  for (const reponse of [json({ name: "master" }), { status: 1, stdout: "" }]) {
    f = inspectForge(dir, config(dir), forge(reponse), "fr");
    assert.deepEqual([f.missing, f.protected], [[], true]);
    assert.match(f.unverified, /contournement du ruleset \(bypass_actors\) non vérifié : lisible seulement avec un jeton administrateur/);
  }
  f = inspectForge(dir, config(dir), faux(FORGE_OK), "en");
  assert.match(f.unverified, /ruleset bypass \(bypass_actors\) not verified/);
  const r = guarantees({
    targetDir: dir,
    exec: faux([[/c8 --version/, OK], ...FORGE_OK.slice(0, 4), [/rules\/branches\/main/, regles], [/rulesets\/7/, json({})]]),
  });
  const sortie = formatGuarantees(r).join("\n");
  assert.match(sortie, /⚠ Versionnement : contournement du ruleset \(bypass_actors\) non vérifié/);
  assert.match(sortie, /✓ Versionnement : dépôt, forge github/, "non vérifié n'est ni un manque ni une protection tenue de plus");
  assert.deepEqual(rulesetBypass(faux([[/rules\/branches/, json("pas une liste")]]), dir, "main"), { state: "no-ruleset", actors: [] });

  // drwil doctor : le même constat, avec le jeton de l'humain.
  const github = [
    [/^git remote get-url/, { status: 0, stdout: "https://github.com/a/b.git" }],
    [/^git symbolic-ref/, { status: 1, stdout: "" }],
  ];
  const diag = (...regles) => bypassDiagnosis(dir, faux([...github, ...regles]), "fr");
  assert.equal(bypassDiagnosis(dir, faux([[/^git remote get-url/, { status: 0, stdout: "https://gitlab.com/a/b.git" }]]), "fr"), null);
  assert.equal(bypassDiagnosis(dir, faux([]), "fr"), null, "sans dépôt distant, rien à dire");
  assert.equal(diag().state, "warning", "gh absent ou non connecté : non vérifié");
  assert.equal(
    diag([/gh auth/, OK], [/rules\/branches/, json([])]),
    null,
    "sans ruleset, la protection classique est jugée par guarantees",
  );
  assert.deepEqual(diag([/gh auth/, OK], [/rules\/branches\/main/, regles], [/rulesets\/7/, json({})]), {
    state: "warning",
    detail:
      "contournement du ruleset (bypass_actors) non vérifié : lisible seulement avec un jeton administrateur du dépôt (`gh auth login` d'un administrateur, puis `drwil guarantees`)",
  });
  assert.deepEqual(diag([/gh auth/, OK], [/rules\/branches\/main/, regles], [/rulesets\/7/, json({ bypass_actors: [] })]), {
    state: "ok",
    detail: "aucun acteur ne contourne le ruleset de `main`",
  });
  assert.equal(
    diag(
      [/gh auth/, OK],
      [/rules\/branches\/main/, regles],
      [/rulesets\/7/, json({ bypass_actors: [{ actor_type: "Team", actor_id: 1 }] })],
    ).state,
    "problem",
  );
  const d = await doctor({
    targetDir: dir,
    exec: faux([...github, [/gh auth/, OK], [/rules\/branches\/main/, regles], [/rulesets\/7/, json({})]]),
  });
  const point = d.points.find((p) => p.id === "bypass");
  assert.deepEqual([point.label, point.state], ["Contournement du ruleset", "warning"]);
  assert.equal(
    (await doctor({ targetDir: dir, exec: faux([]) })).points.some((p) => p.id === "bypass"),
    false,
  );
});

test("QUA-096 le README livré présente d'abord le produit, l'outillage drwil en quelques lignes de renvoi", () => {
  const readme = readFileSync(join(TEMPLATES, "base", "README.md"), "utf8");
  const titres = [...readme.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(titres, ["What it does", "Getting started", "Documentation", "Working on the project"]);
  const outillage = readme.slice(readme.indexOf("## Working on the project")).trim().split("\n");
  assert.ok(outillage.length <= 6, "quelques lignes de renvoi");
  assert.match(outillage.join(" "), /`AGENTS\.md`/);
  assert.doesNotMatch(readme.slice(0, readme.indexOf("## Working on the project")), /drwil|recipes\/view-progress|audit-risks/);
});

test("QUA-097 présentation : le texte du squelette fait une fiche bloquante et un FAIL, levés une fois rédigé", async () => {
  const dir = await projet({ lang: "en" });
  assert.deepEqual(skeletonFiles(dir), ["README.md", "AGENTS.md", "docs/features.md"]);
  const r = guarantees({ targetDir: dir, exec: faux([[/c8 --version/, OK], ...FORGE_OK]) });
  const fiche = lire(dir, "docs/projects/presentation-du-projet.md");
  assert.match(fiche, /\*\*Guarantee\*\*: blocking/);
  assert.match(fiche, /- `README\.md`/);
  assert.match(formatGuarantees(r).join("\n"), /✗ Presentation: skeleton text in README\.md, AGENTS\.md, docs\/features\.md/);
  assert.ok(guaranteeFailures(dir, config(dir), []).some((e) => /presentation guarantee not held: skeleton text in README\.md/.test(e)));
  writeFileSync(join(dir, "README.md"), "# Shop\n\nSells things.\n");
  writeFileSync(join(dir, "docs/features.md"), "# Features\n\nCart.\n");
  writeFileSync(join(dir, "AGENTS.md"), lire(dir, "AGENTS.md").replace(/\(to describe[^)]*\)/g, "sells things"));
  assert.deepEqual(skeletonFiles(dir), []);
  assert.ok(!guaranteeFailures(dir, config(dir), []).some((e) => /presentation/.test(e)));
  // Rendu anglais d'une fiche non bloquante : pas de marqueur de garantie.
  assert.doesNotMatch(renderBrief({ kind: "climb", path: "x", title: "t", reasons: [], blocking: false }, "en"), /Guarantee/);
});

test("QUA-097 garanties tenues : verify ne signale rien, la commande le dit", async () => {
  const dir = await projet();
  spawnSync("git", ["init", "-q"], { cwd: dir });
  spawnSync("git", ["remote", "add", "origin", "https://github.com/a/b.git"], { cwd: dir });
  writeFileSync(join(dir, "README.md"), "# Boutique\n");
  writeFileSync(join(dir, "docs/features.md"), "# Fonctionnalités\n");
  writeFileSync(join(dir, "AGENTS.md"), lire(dir, "AGENTS.md").replace(/\(to describe[^)]*\)/g, "vend des choses"));
  const cfg = config(dir);
  cfg.checks.push({ id: "e2e", name: "e2e", run: "node -e 0" });
  ecrireConfig(dir, cfg);
  const r = guarantees({ targetDir: dir, exec: faux([[/c8 --version/, OK], ...FORGE_OK]) });
  assert.equal(r.briefs.length, 0);
  assert.match(formatGuarantees(r).join("\n"), /Toutes les garanties sont tenues\./);
  assert.deepEqual(guaranteeFailures(dir, config(dir), [{ checks: ["coverage-root", "e2e"] }]), []);
});

test("QUA-099 PR de documentation seule : fusion automatique sans la question drwil-merge, gardée pour le code", () => {
  const agents = readFileSync(join(TEMPLATES, "base", "AGENTS.md"), "utf8");
  assert.match(
    agents,
    /\*\*Documentation-only PR\*\*: a PR that touches only documentation[\s\S]*without asking the `drwil-merge` question[\s\S]*auto-merge not allowed by the\s+repository/,
  );
  const skill = readFileSync(join(TEMPLATES, "tools", "claude", ".claude", "skills", "start-a-workstream", "SKILL.md"), "utf8");
  assert.match(
    skill,
    /Only for briefs whose scope touches code: a brief whose scope is documentation only[\s\S]*gets no `drwil-merge` question/,
  );
});

test("QUA-100 suivi de la CI : la consigne de lancer pr-watch après un push est livrée", () => {
  const agents = readFileSync(join(TEMPLATES, "base", "AGENTS.md"), "utf8");
  assert.match(
    agents,
    /`node \.githooks\/pr-watch\.mjs \[<number>\]`[\s\S]*« green », « merged » or « red »[\s\S]*never bypassed \(QUA-019\)/,
  );
  assert.ok(existsSync(join(TEMPLATES, "base", ".githooks", "pr-watch.mjs")));
});
