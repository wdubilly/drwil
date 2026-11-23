// Points de `drwil doctor` sur les contrôles déclarés : contrôles de contrats non groupés, contrôles CI sans paths (QUA-318).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { doctor, init } from "../dist/index.js";
import { checksPoints, groupedForm, parallelPoints } from "../dist/doctor-checks.js";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const point = (points, id) => points.find((p) => p.id === id);

test("QUA-318 forme groupée : vitest, jest, npm test, fichiers gardés ; rien hors d'un filtre par ID", () => {
  assert.equal(groupedForm('npx vitest run -t "APP-001"'), "node .githooks/contract-tests.mjs --runner vitest APP-001");
  assert.equal(
    groupedForm("npx jest --testNamePattern=APP-002 src/a.test.ts"),
    "node .githooks/contract-tests.mjs --runner jest APP-002 src/a.test.ts",
  );
  assert.equal(groupedForm("npm test -- -t 'APP-003' 'src/b.spec.js'"), "node .githooks/contract-tests.mjs APP-003 src/b.spec.js");
  assert.equal(groupedForm("npm run test -- --testNamePattern APP-004"), "node .githooks/contract-tests.mjs APP-004");
  for (const run of [
    "npx vitest run",
    "pytest -k APP_001",
    "go test -run APP001",
    'make -t "APP-001"',
    "node .githooks/contract-tests.mjs APP-001",
  ])
    assert.equal(groupedForm(run), null, run);
});

test("QUA-318 points : un contrôle non groupé et un contrôle CI sans paths signalés, textes français et anglais", () => {
  const checks = [
    { id: "app-001", run: 'npx vitest run -t "APP-001"' },
    { id: "app-002", run: "node .githooks/contract-tests.mjs APP-002" },
    { id: "e2e", run: "npx playwright test", runAt: ["ci"] },
    { id: "e2e-vide", run: "npx playwright test", runAt: ["ci"], paths: [] },
    { id: "e2e-ok", run: "npx playwright test", runAt: ["ci"], paths: ["**"] },
    { run: "npx jest -t APP-003", runAt: ["verify", "ci"] },
    null,
  ];
  const fr = checksPoints(checks, "fr");
  assert.deepEqual(
    fr.map((p) => [p.id, p.state]),
    [
      ["contract-checks", "warning"],
      ["ci-paths", "warning"],
    ],
  );
  assert.match(
    point(fr, "contract-checks").detail,
    /`app-001` relance .*"run": "node \.githooks\/contract-tests\.mjs --runner vitest APP-001"/,
  );
  assert.match(point(fr, "contract-checks").detail, /`npx jest -t APP-003` .*--runner jest APP-003/);
  assert.doesNotMatch(point(fr, "contract-checks").detail, /app-002/);
  const ci = point(fr, "ci-paths").detail;
  assert.match(ci, /`e2e` .*la CI le rejoue .*poser ses `paths` .*`npx drwil doctor --fix` pose ceux que le kit calcule/);
  assert.doesNotMatch(ci, /"paths": \["\*\*"\]/, "le conseil ne pose plus tout le dépôt");
  assert.match(ci, /`e2e-vide`/);
  assert.doesNotMatch(ci, /APP-003/);
  assert.doesNotMatch(ci, /e2e-ok/);
  const en = checksPoints(checks, "en");
  assert.match(point(en, "contract-checks").detail, /relaunches the test runner/);
  assert.match(point(en, "ci-paths").detail, /the CI replays it on a commit it just passed/);
  for (const rien of [
    undefined,
    "x",
    [],
    [
      { id: "a", run: "npm test" },
      { id: "b", runAt: ["local"] },
    ],
  ])
    assert.deepEqual(checksPoints(rien, "fr"), []);
});

test("QUA-318 doctor : signale sans rien écrire dans la configuration", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-doctor-checks-"));
  const { log, warn } = console;
  console.log = console.warn = () => {};
  try {
    await init({ lang: "fr", targetDir: dir, git: false, ci: "github", tools: "claude" });
  } finally {
    console.log = log;
    console.warn = warn;
  }
  const fichier = join(dir, ".drwil/ia-first.json");
  const cfg = JSON.parse(readFileSync(fichier, "utf8"));
  cfg.checks = [
    ...(cfg.checks ?? []),
    { id: "app-001", run: 'npx vitest run -t "APP-001"' },
    { id: "e2e", run: "npx playwright test", runAt: ["ci"] },
  ];
  writeFileSync(fichier, `${JSON.stringify(cfg, null, 2)}\n`);
  const avant = readFileSync(fichier, "utf8");
  const d = await doctor({ targetDir: dir, exec: () => ({ status: 1, stdout: "" }) });
  assert.equal(point(d.points, "contract-checks").state, "warning");
  assert.equal(point(d.points, "ci-paths").state, "warning");
  assert.equal(readFileSync(fichier, "utf8"), avant);
});

test('QUA-303 point kit-paths : un contrôle généré par le kit encore sur `paths: ["**"]` est signalé, en français et en anglais ; les autres non', () => {
  const checks = [
    { id: "coverage-root", run: "npx c8 npm test", paths: ["**"] },
    { id: "coverage-diff-api", run: "diff-cover x", cwd: "api", paths: ["**"] },
    { id: "e2e", run: "npx playwright test", paths: ["**"] },
    { id: "coverage-web", run: "npx c8 npm test", cwd: "web", paths: ["web/**"] },
    { id: "lint", run: "npx biome check", paths: ["**"] },
    { id: "e2e-ci", run: "npx playwright test", paths: ["**"] },
  ];
  const fr = point(checksPoints(checks, "fr"), "kit-paths");
  assert.equal(fr.state, "warning");
  for (const id of ["coverage-root", "coverage-diff-api", "e2e"]) assert.match(fr.detail, new RegExp(`\`${id}\` est sur`), id);
  for (const id of ["coverage-web", "lint", "e2e-ci"]) assert.doesNotMatch(fr.detail, new RegExp(`\`${id}\``), id);
  assert.match(fr.detail, /`npx drwil doctor --fix` pose les chemins du code et de sa configuration/);
  assert.match(point(checksPoints(checks, "en"), "kit-paths").detail, /`coverage-root` is on `"paths": \["\*\*"\]`/);
  assert.equal(point(checksPoints(checks.slice(3), "fr"), "kit-paths"), undefined);
});

test("QUA-303 point kit-paths : avec la racine, se tait quand rien ne se délimite sous elle, parle sinon", () => {
  const checks = [{ id: "coverage-root", run: "npx c8 npm test", paths: ["**"] }];
  const vide = mkdtempSync(join(tmpdir(), "drwil-doctor-kit-paths-"));
  writeFileSync(join(vide, "README.md"), "# x\n");
  assert.equal(point(checksPoints(checks, "fr", vide), "kit-paths"), undefined, "rien que du Markdown : rien à délimiter");
  const code = mkdtempSync(join(tmpdir(), "drwil-doctor-kit-paths-"));
  writeFileSync(join(code, "package.json"), "{}\n");
  assert.match(point(checksPoints(checks, "fr", code), "kit-paths").detail, /`coverage-root` est sur/);
});

const projet = async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-doctor-empreinte-"));
  const { log, warn } = console;
  console.log = console.warn = () => {};
  try {
    await init({ lang: "fr", targetDir: dir, git: false, ci: "github", tools: "claude" });
  } finally {
    console.log = log;
    console.warn = warn;
  }
  return dir;
};

test("QUA-303 doctor transmet la racine : un contrôle du kit sur tout le dépôt se tait quand rien ne se délimite", async () => {
  const dir = await projet();
  const fichier = join(dir, ".drwil/ia-first.json");
  const cfg = JSON.parse(readFileSync(fichier, "utf8"));
  cfg.checks = [...(cfg.checks ?? []), { id: "coverage-root", run: "npx c8 npm test", paths: ["**"] }];
  writeFileSync(fichier, `${JSON.stringify(cfg, null, 2)}\n`);
  const exec = () => ({ status: 1, stdout: "" });
  rmSync(join(dir, ".env.example")); // seul fichier hors du kit qu'écrit init : il délimiterait `*.example`
  assert.deepEqual(checksPoints(cfg.checks, "fr", dir), [], "le projet neuf ne délimite rien");
  assert.equal(point((await doctor({ targetDir: dir, exec })).points, "kit-paths"), undefined);
  writeFileSync(join(dir, "index.js"), "\n");
  assert.equal(point((await doctor({ targetDir: dir, exec })).points, "kit-paths").state, "warning");
});

test("QUA-026 doctor signale un kit antérieur à l'empreinte par contrôle et renvoie à la mise à jour", async () => {
  const dir = await projet();
  const exec = () => ({ status: 1, stdout: "" });
  assert.equal(point((await doctor({ targetDir: dir, exec })).points, "fingerprint"), undefined, "kit à jour : rien");
  const empreintes = join(dir, ".githooks/fingerprints.mjs");
  writeFileSync(empreintes, readFileSync(empreintes, "utf8").replace(/FINGERPRINT_SCHEME = \d+/, "FINGERPRINT_SCHEME = 1"));
  const fr = point((await doctor({ targetDir: dir, exec })).points, "fingerprint");
  assert.equal(fr.state, "warning");
  assert.match(fr.detail, /aucun verdict n'est repris.*`npx drwil init`/);
  rmSync(empreintes);
  assert.equal(point((await doctor({ targetDir: dir, exec })).points, "fingerprint").state, "warning", "sans calcul d'empreinte du tout");
  const cfg = JSON.parse(readFileSync(join(dir, ".drwil/ia-first.json"), "utf8"));
  writeFileSync(join(dir, ".drwil/ia-first.json"), `${JSON.stringify({ ...cfg, lang: "en" }, null, 2)}\n`);
  assert.match(point((await doctor({ targetDir: dir, exec })).points, "fingerprint").detail, /no verdict is reused.*`npx drwil init`/);
});

test("QUA-333 la page livrée des contrôles décrit les clés `format`, `readsChecks` et `parallel`, copie du dépôt comprise", () => {
  const page = "docs/ia-first/4-checks-in-git.md";
  for (const fichier of [new URL(`../templates/common/base/${page}`, import.meta.url), new URL(`../../../${page}`, import.meta.url)]) {
    const texte = readFileSync(fichier, "utf8");
    assert.match(texte, /`readsChecks: true`/, fichier.pathname);
    assert.match(texte, /`"parallel": true`[\s\S]*`parallel: false`/, fichier.pathname);
    assert.match(texte, /The `format` setting[\s\S]*"stdin"[\s\S]*"write"[\s\S]*"paths"/, fichier.pathname);
    assert.doesNotMatch(texte, /QUA-3\d\d/, "la page livrée ne cite aucun contrat propre au dépôt");
  }
});

test("QUA-334 doctor signale plusieurs contrôles de commande sans `parallel`, se tait sur un choix posé ; l'adoption le propose", async () => {
  const checks = [
    { id: "a", run: "npm test" },
    { id: "b", run: "npm run lint" },
    { id: "e2e", run: "npx playwright test", runAt: ["ci"] },
  ];
  assert.match(point(parallelPoints({ checks }, "fr"), "parallel").detail, /2 contrôles.*`"parallel": true`.*`"parallel": false`/);
  assert.match(point(parallelPoints({ checks }, "en"), "parallel").detail, /2 command checks.*`"parallel": true`/);
  for (const cfg of [{ checks, parallel: false }, { checks, parallel: true }, { checks: checks.slice(1) }])
    assert.deepEqual(parallelPoints(cfg, "fr"), []);
  const dir = await projet();
  const fichier = join(dir, ".drwil/ia-first.json");
  writeFileSync(fichier, JSON.stringify({ ...JSON.parse(readFileSync(fichier, "utf8")), checks }));
  assert.equal(point((await doctor({ targetDir: dir, exec: () => ({ status: 1, stdout: "" }) })).points, "parallel").state, "warning");
  assert.equal("parallel" in JSON.parse(readFileSync(fichier, "utf8")), false, "doctor n'écrit rien");
  for (const skill of [
    "../templates/common/tools/claude/.claude/skills/adopt-the-kit/SKILL.md",
    "../../../.claude/skills/adopt-the-kit/SKILL.md",
  ])
    assert.match(
      readFileSync(new URL(skill, import.meta.url), "utf8"),
      /several checks[\s\S]*"parallel": true[\s\S]*"parallel": false[\s\S]*fixed port[\s\S]*output folder[\s\S]*end-to-end/,
      skill,
    );
});
