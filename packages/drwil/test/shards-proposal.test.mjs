// Point « Contrôle lent non découpé » de `drwil doctor` : un contrôle `e2e` d'un outil de la table du kit sans `"auto"` est signalé
// avec la déclaration à poser, jamais réécrit (le kit n'a jamais écrit que `"auto"`). Rattaché à QUA-089 en attendant les contrats
// du chantier « contrôles lents découpés dès le départ ».
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { doctor, init } from "../dist/index.js";
import { shardsPoints, shardsProposal } from "../dist/doctor-shards.js";
import { E2E_TOOLS, e2eDeclaration } from "../dist/guarantees-e2e-tools.js";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const MOTEUR = join(dirname(fileURLToPath(import.meta.url)), "..", "templates", "common", "base", ".githooks");
const { shardProblem } = await import(join(MOTEUR, "engine-shards.mjs"));
const { texts } = await import(join(MOTEUR, "engine-texts.mjs"));

const SLICE = "--shard=$DRWIL_SHARD_INDEX/$DRWIL_SHARD_TOTAL";

function dossier(fichiers = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-shards-"));
  for (const [f, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), contenu);
  }
  return dir;
}

// La proposition posée sur le contrôle doit être acceptée par le moteur (QUA-013) : jamais une déclaration refusée.
const accepte = (c, p) => assert.equal(shardProblem({ ...c, ...p.fields }, "e2e", texts("fr")), null);

test('QUA-089 N figé : signalé avec `"auto"` et son comptage, la commande gardée, la déclaration à faire sur une PR', () => {
  const dir = dossier({ "playwright.config.ts": "export default {};\n" });
  const c = { id: "e2e", run: `npx playwright test ${SLICE}`, shards: 4 };
  const p = shardsProposal(dir, c);
  assert.deepEqual(Object.keys(p.fields), ["shards", "shardsCount"]);
  assert.equal(p.fields.shardsCount, e2eDeclaration(E2E_TOOLS[0], "playwright.config.ts", ".").shardsCount);
  accepte(c, p);
  const [point] = shardsPoints(dir, [c], "fr");
  assert.deepEqual([point.id, point.state, point.label], ["e2e-shards", "warning", "Contrôle lent non découpé"]);
  assert.match(point.detail, /^`e2e` \(Playwright, `playwright\.config\.ts`\) fige 4 tranches : poser "shards": "auto", "shardsCount": /);
  assert.match(point.detail, /`--fix` ne le réécrit pas/);
  assert.match(point.detail, /citer `e2e` entre backticks dans « Contrats modifiés »/);
  const [en] = shardsPoints(dir, [c], "en");
  assert.match(en.detail, /fixes 4 slices: set "shards": "auto".*quote `e2e` in backticks under « Contrats modifiés »/);
});

test("QUA-089 sans `shards` : la commande de tranche du kit est proposée avec son setup ; un outil d'une couche par son cwd", () => {
  const dir = dossier({ "front/vitest.e2e.config.ts": "export default {};\n" });
  const c = { id: "e2e", run: "npx vitest run --config vitest.e2e.config.ts", cwd: "front" };
  const p = shardsProposal(dir, c);
  const kit = e2eDeclaration(E2E_TOOLS[1], "vitest.e2e.config.ts", "front");
  assert.deepEqual(p, {
    tool: "Vitest",
    config: "front/vitest.e2e.config.ts",
    fields: { shards: "auto", shardsCount: kit.shardsCount, run: kit.run },
  });
  accepte(c, p);
  const [fr] = shardsPoints(dir, [null, "x", c], "fr");
  assert.match(fr.detail, /^`e2e` \(Vitest, `front\/vitest\.e2e\.config\.ts`\) joue toute la suite en une seule passe : poser /);
  assert.doesNotMatch(fr.detail, /Contrats modifiés/, "sans tranches sur la branche principale, l'agrégation n'a rien à comparer");
  assert.match(shardsPoints(dir, [c], "en")[0].detail, /runs the whole suite in a single pass: set "shards": "auto"/);
});

test('QUA-089 déjà `"auto"`, outil hors table, contrôle absent : rien n\'est signalé', () => {
  const dir = dossier({ "jest.e2e.config.js": "module.exports = {};\n", "front/cypress.config.js": "export default {};\n" });
  const kit = e2eDeclaration(E2E_TOOLS[2], "jest.e2e.config.js", ".");
  assert.equal(shardsProposal(dir, kit), null);
  assert.deepEqual(shardsPoints(dir, [kit], "fr"), []);
  // Un `"auto"` écrit à la main est découpé lui aussi : rien à proposer.
  assert.deepEqual(shardsPoints(dir, [{ id: "e2e", run: `npx jest ${SLICE}`, shards: "auto", shardsCount: "echo 3" }], "fr"), []);
  const hors = { id: "e2e", run: "npx cypress run", cwd: "front" };
  assert.equal(shardsProposal(dir, hors), null, "le kit ne devine pas la commande de tranche d'un outil hors table");
  assert.deepEqual(shardsPoints(dir, [hors], "fr"), []);
  for (const rien of [undefined, [], [{ id: "unit", run: "npx jest" }]]) assert.deepEqual(shardsPoints(dir, rien, "fr"), []);
});

test("QUA-089 écrit à la main : `doctor --fix` le signale et ne réécrit jamais la configuration", async () => {
  const dir = dossier({ "playwright.config.ts": "export default {};\n" });
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
  cfg.checks = [...(cfg.checks ?? []), { id: "e2e", name: "e2e", run: "npx playwright test", paths: ["**"] }];
  writeFileSync(fichier, `${JSON.stringify(cfg, null, 2)}\n`);
  const avant = readFileSync(fichier, "utf8");
  for (const fix of [false, true]) {
    const d = await doctor({ targetDir: dir, fix, exec: () => ({ status: 1, stdout: "" }) });
    const point = d.points.find((p) => p.id === "e2e-shards");
    assert.equal(point?.state, "warning", `fix: ${fix}`);
    assert.ok(!d.points.some((p) => p.id === "fixed" && /e2e/.test(p.detail)));
    assert.equal(readFileSync(fichier, "utf8"), avant);
  }
});
