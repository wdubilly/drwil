// `drwil doctor --fix` : la déclaration réécrite seulement quand la forme est sûre et déterministe (QUA-318, QUA-303).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { doctor, init } from "../dist/index.js";
import { fixChecks, fixedPoints, safeGrouped } from "../dist/doctor-fix.js";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const ecrire = (dir, f, texte) => {
  mkdirSync(dirname(join(dir, f)), { recursive: true });
  writeFileSync(join(dir, f), texte);
};
const BIN = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
const point = (points, id) => points.find((p) => p.id === id);
const NE_JOUE_RIEN = () => ({ status: 1, stdout: "" });

async function projet() {
  const dir = mkdtempSync(join(tmpdir(), "drwil-doctor-fix-"));
  const { log, warn } = console;
  console.log = console.warn = () => {};
  try {
    await init({ lang: "fr", targetDir: dir, git: false, ci: "github", tools: "claude" });
  } finally {
    console.log = log;
    console.warn = warn;
  }
  return dir;
}

test("QUA-318 forme sûre : le lanceur seul, ses fichiers existants et un filtre sur un seul ID ; npm test seulement sur un script nu", () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-doctor-fix-"));
  ecrire(dir, "src/a.test.ts", "");
  const g = (run, script) => safeGrouped(run, dir, script);
  assert.equal(g('npx vitest run -t "APP-001"'), "node .githooks/contract-tests.mjs --runner vitest APP-001");
  assert.equal(g("jest src/a.test.ts --testNamePattern=APP-002"), "node .githooks/contract-tests.mjs --runner jest APP-002 src/a.test.ts");
  assert.equal(g("npm test -- -t 'APP-003'", "vitest run"), "node .githooks/contract-tests.mjs --runner vitest APP-003");
  assert.equal(g("npm run test -- --testNamePattern APP-004", " jest "), "node .githooks/contract-tests.mjs --runner jest APP-004");
  for (const [run, script] of [
    ['npx vitest run --config v.config.ts -t "APP-001"'],
    ['npx vitest run -t "APP-001 cas"'],
    ['npx vitest run -t "APP-001" && echo fin'],
    ['npx jest absent.test.ts -t "APP-001"'],
    ["npm test -- -t APP-001", "vitest --coverage"],
    ["npm test -- -t APP-001", undefined],
    ["npm test -- -t APP-001 src/a.test.ts", "vitest"],
    ["pytest -k APP_001"],
  ])
    assert.equal(g(run, script), null, run);
});

test("QUA-318 fixChecks : contrôles groupés et paths posés, le reste intact ; rien sans le module livré", () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-doctor-fix-"));
  const checks = () => [
    { id: "app-001", run: 'npx vitest run -t "APP-001"' },
    { id: "app-002", run: 'npx vitest run --config x.ts -t "APP-002"' },
    { id: "app-003", run: 'npx vitest run -t "APP-003"', cwd: "web" },
    { id: "e2e", run: "npx playwright test", runAt: ["ci"] },
    { id: "e2e-vide", run: "npx playwright test", runAt: ["ci"], paths: [] },
    { run: "npx playwright test --project x", runAt: ["ci"] },
    null,
  ];
  const ctx = { root: dir, cited: new Set(), testScript: undefined };
  const sans = checks();
  assert.deepEqual(
    fixChecks(sans, ctx).map((f) => f.kind),
    ["paths", "paths"],
    "sans .githooks/contract-tests.mjs, aucun contrôle groupé",
  );
  ecrire(dir, ".githooks/contract-tests.mjs", "");
  const liste = checks();
  const fixes = fixChecks(liste, ctx);
  assert.deepEqual(
    fixes.map((f) => `${f.kind}:${f.id}`),
    ["grouped:app-001", "paths:e2e", "paths:npx playwright test --project x"],
  );
  assert.equal(liste[0].run, "node .githooks/contract-tests.mjs --runner vitest APP-001");
  assert.deepEqual(liste.slice(1, 3), checks().slice(1, 3), "option ajoutée ou sous-dossier : jamais réécrit");
  assert.deepEqual(liste[3].paths, ["**"]);
  assert.deepEqual(liste[4].paths, [], "une liste vide peut être voulue : gardée");
  assert.deepEqual(fixChecks(liste, ctx), [], "idempotent");
  assert.match(fixedPoints(fixes, "fr")[0].detail, /`app-001` groupé ; `e2e` : "paths": \["\*\*"\]/);
  assert.match(fixedPoints(fixes, "en")[0].label, /Fixed by --fix/);
  assert.deepEqual(fixedPoints([], "fr"), []);
});

test("QUA-303 fixChecks : la paire de couverture fusionnée en une commande, sauf citée, ou de champs différents", () => {
  const seuil = (slug, extra = {}) => ({
    id: `coverage-${slug}`,
    run: "npx vitest run --coverage --coverage.thresholds.lines=100",
    paths: ["**"],
    ...extra,
  });
  const diff = (slug, extra = {}) => ({
    id: `coverage-diff-${slug}`,
    run: "diff-cover coverage/cobertura-coverage.xml --fail-under=100",
    paths: ["**"],
    ...extra,
  });
  const liste = [
    seuil("root"),
    diff("root"),
    seuil("web"),
    diff("web"),
    seuil("api", { cwd: "api" }),
    diff("api"),
    seuil("py"),
    diff("py"),
  ];
  liste[6].run = "pytest --cov --cov-fail-under=100";
  // Un dossier vide : rien ne délimite les chemins, la paire garde les siens (la fusion seule est jugée ici).
  const ctx = { root: mkdtempSync(join(tmpdir(), "drwil-doctor-fix-")), cited: new Set(["coverage-web"]), testScript: undefined };
  const fixes = fixChecks(liste, ctx);
  assert.deepEqual(fixes, [
    { kind: "paths", id: "coverage-api", paths: ["api/**"] },
    { kind: "merged", id: "coverage-root", into: "coverage-diff-root" },
  ]);
  assert.equal(
    liste.find((c) => c.id === "coverage-root"),
    undefined,
  );
  assert.match(
    liste.find((c) => c.id === "coverage-diff-root").run,
    /^rm -f coverage\/cobertura-coverage\.xml && npx vitest run --coverage --coverage\.reporter=cobertura .* && diff-cover /,
  );
  for (const gardé of ["coverage-web", "coverage-api", "coverage-py"])
    assert.ok(
      liste.some((c) => c.id === gardé),
      gardé,
    );
  assert.deepEqual(fixChecks(liste, ctx), [], "idempotent");
  assert.match(fixedPoints(fixes, "fr")[0].detail, /`coverage-root` fusionné dans `coverage-diff-root`/);
});

test("QUA-318 et QUA-303 doctor --fix : écrit la forme sûre, garde le reste signalé ; sans --fix rien n'est écrit ; idempotent", async () => {
  const dir = await projet();
  const fichier = join(dir, ".drwil/ia-first.json");
  const cfg = JSON.parse(readFileSync(fichier, "utf8"));
  cfg.checks = [
    ...(cfg.checks ?? []),
    { id: "app-001", run: 'npx vitest run -t "APP-001"' },
    { id: "app-002", run: 'npx vitest run --config x.ts -t "APP-002"' },
    { id: "e2e", run: "npx playwright test", runAt: ["ci"] },
    { id: "coverage-root", run: "npx vitest run --coverage", paths: ["**"] },
    { id: "coverage-diff-root", run: "diff-cover coverage/cobertura-coverage.xml --fail-under=100", paths: ["**"] },
  ];
  writeFileSync(fichier, `${JSON.stringify(cfg, null, 2)}\n`);
  ecrire(dir, "package.json", JSON.stringify({ scripts: { test: "node --test" } }));
  const avant = readFileSync(fichier, "utf8");
  const signal = await doctor({ targetDir: dir, exec: NE_JOUE_RIEN });
  assert.equal(readFileSync(fichier, "utf8"), avant, "sans --fix, rien n'est écrit");
  assert.equal(point(signal.points, "fixed"), undefined);
  const d = await doctor({ targetDir: dir, exec: NE_JOUE_RIEN, fix: true });
  const apres = JSON.parse(readFileSync(fichier, "utf8")).checks;
  const par = (id) => apres.find((c) => c.id === id);
  assert.equal(par("app-001").run, "node .githooks/contract-tests.mjs --runner vitest APP-001");
  assert.equal(par("app-002").run, 'npx vitest run --config x.ts -t "APP-002"');
  assert.deepEqual(par("e2e").paths, ["*.example", "*.json"], "les chemins que le kit calcule, jamais tout le dépôt");
  assert.deepEqual(par("coverage-diff-root").paths, ["*.example", "*.json"]);
  assert.equal(par("coverage-root"), undefined);
  assert.match(par("coverage-diff-root").run, /--coverage\.reporter=cobertura/);
  assert.match(point(d.points, "fixed").detail, /`app-001` groupé ; `e2e` .* ; `coverage-root` fusionné dans `coverage-diff-root`/);
  assert.match(point(d.points, "contract-checks").detail, /app-002/, "la forme non sûre reste signalée, avec sa ligne");
  assert.doesNotMatch(point(d.points, "contract-checks").detail, /app-001/);
  assert.equal(point(d.points, "ci-paths"), undefined);
  assert.equal(point(d.points, "coverage-twice"), undefined);
  const ecrit = readFileSync(fichier, "utf8");
  const encore = await doctor({ targetDir: dir, exec: NE_JOUE_RIEN, fix: true });
  assert.equal(readFileSync(fichier, "utf8"), ecrit, "idempotent : un second --fix n'écrit rien");
  assert.equal(point(encore.points, "fixed"), undefined);
  // Sans liste de contrôles, liste vide avec un package.json sans scripts, puis sans package.json : rien à écrire.
  for (const [texte, paquet] of [
    ["{}\n", "{}"],
    ['{"checks":[]}\n', "{}"],
    ['{"checks":[]}\n', null],
  ]) {
    if (paquet) ecrire(dir, "package.json", paquet);
    else rmSync(join(dir, "package.json"));
    writeFileSync(fichier, texte);
    await doctor({ targetDir: dir, exec: NE_JOUE_RIEN, fix: true });
    assert.equal(readFileSync(fichier, "utf8"), texte, "rien à corriger : rien écrit");
  }
  // La commande : `npx drwil doctor --fix` écrit, la même sans `--fix` jamais.
  const cli = (...args) => spawnSync(process.execPath, [BIN, "doctor", ...args], { cwd: dir, encoding: "utf8" });
  const brut = JSON.parse(readFileSync(fichier, "utf8"));
  brut.checks.push({ id: "e2e-bis", run: "npx playwright test", runAt: ["ci"] });
  writeFileSync(fichier, `${JSON.stringify(brut, null, 2)}\n`);
  assert.doesNotMatch(cli().stdout, /Fixed by --fix/, "le projet est passé en anglais : sa configuration a été réécrite plus haut");
  assert.match(cli("--fix").stdout, /Fixed by --fix +`e2e-bis`: "paths": \["\*\.example"\]/, "les chemins calculés, jamais tout le dépôt");
  const ailleurs = mkdtempSync(join(tmpdir(), "drwil-doctor-fix-"));
  assert.equal((await doctor({ targetDir: ailleurs, fix: true })).code, 2, "hors projet drwil : rien écrit");
});

test('QUA-303 fixChecks : un contrôle du kit sur `["**"]` reçoit les chemins calculés — la paire de couverture même retouchée, l\'e2e intact seulement', async () => {
  const { e2eDeclaration, E2E_TOOLS } = await import("../dist/guarantees-e2e-tools.js");
  const dir = mkdtempSync(join(tmpdir(), "drwil-doctor-fix-"));
  for (const f of ["src/a.js", "package.json", "playwright.config.ts", "README.md", "docs/x.md", ".githooks/h.mjs"]) ecrire(dir, f, "x\n");
  const kit = e2eDeclaration(E2E_TOOLS[0], "playwright.config.ts", ".");
  assert.deepEqual(kit.paths, ["**"], "la déclaration des kits précédents");
  const liste = [
    { id: "coverage-root", run: "npx vitest run --coverage --coverage.thresholds.lines=100", paths: ["**"] },
    { id: "coverage-diff-root", run: "npx vitest run --coverage && diff-cover x --fail-under=100", paths: ["**"] },
    { id: "coverage-web", run: "npx c8 npm test", cwd: "web", paths: ["**"] },
    { ...kit },
    { id: "lint", run: "npx biome check", paths: ["**"] },
  ];
  const ctx = { root: dir, cited: new Set(["coverage-root"]), testScript: undefined };
  const fixes = fixChecks(liste, ctx);
  const attendu = ["*.json", "*.ts", "src/**"];
  assert.deepEqual(
    fixes.map((f) => `${f.kind}:${f.id}`),
    ["paths:coverage-root", "paths:coverage-diff-root", "paths:coverage-web", "paths:e2e"],
  );
  assert.deepEqual(liste[0].paths, attendu);
  assert.deepEqual(liste[1].paths, attendu);
  assert.deepEqual(liste[2].paths, ["web/**"], "une couche sous la racine : son dossier");
  assert.deepEqual(liste[3], { ...kit, paths: attendu }, "seuls les paths changent");
  assert.deepEqual(liste[4].paths, ["**"], "un contrôle du projet n'est jamais réécrit");
  assert.match(fixedPoints(fixes, "fr")[0].detail, /`coverage-root` : "paths": \["\*\.json","\*\.ts","src\/\*\*"\]/);
  assert.deepEqual(fixChecks(liste, ctx), [], "idempotent");
  // Un e2e retouché à la main reste sur tout le dépôt (signalé par doctor).
  const retouche = [{ ...kit, run: `${kit.run} --project chromium` }];
  assert.deepEqual(fixChecks(retouche, ctx), []);
  assert.deepEqual(retouche[0].paths, ["**"]);
});
