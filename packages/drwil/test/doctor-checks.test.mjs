// Points de `drwil doctor` sur les contrôles déclarés : contrôles de contrats non groupés, contrôles CI sans paths (QUA-318).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { doctor, init } from "../dist/index.js";
import { checksPoints, groupedForm } from "../dist/doctor-checks.js";

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
  assert.match(ci, /`e2e` .*la CI le rejoue .*"paths": \["\*\*"\]/);
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
