// Point « Contrôle lent non découpé » de `drwil doctor` : un contrôle `e2e` d'un outil de la table du kit sans `"auto"` est signalé
// avec la déclaration à poser ; `--fix` la pose, qu'il soit écrit à la main ou par le kit. Contrats : QUA-322, QUA-323, QUA-324.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { doctor, init } from "../dist/index.js";
import { shardsPoints, shardsProposal } from "../dist/doctor-shards.js";
import { E2E_TOOLS, e2eDeclaration } from "../dist/guarantees-e2e-tools.js";
import { capture, config, git, tmp } from "./kit-commun.mjs";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const MOTEUR = join(dirname(fileURLToPath(import.meta.url)), "..", "templates", "common", "base", ".githooks");
const { shardProblem } = await import(pathToFileURL(join(MOTEUR, "engine-shards.mjs")).href);
const { texts } = await import(pathToFileURL(join(MOTEUR, "engine-texts.mjs")).href);

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

test('QUA-323 N figé : signalé avec `"auto"` et son comptage, la commande gardée, la déclaration à faire sur une PR', () => {
  const dir = dossier({ "playwright.config.ts": "export default {};\n" });
  const c = { id: "e2e", run: `npx playwright test ${SLICE}`, shards: 4 };
  const p = shardsProposal(dir, c);
  assert.deepEqual(Object.keys(p.fields), ["shards", "shardsCount"]);
  assert.equal(p.fields.shardsCount, e2eDeclaration(E2E_TOOLS[0], "playwright.config.ts", ".").shardsCount);
  accepte(c, p);
  const [point] = shardsPoints(dir, [c], "fr");
  assert.deepEqual([point.id, point.state, point.label], ["e2e-shards", "warning", "Contrôle lent non découpé"]);
  assert.match(point.detail, /^`e2e` \(Playwright, `playwright\.config\.ts`\) fige 4 tranches : poser "shards": "auto", "shardsCount": /);
  assert.match(point.detail, /`npx drwil doctor --fix` le corrige/);
  assert.match(point.detail, /citer `e2e` entre backticks dans « Contrats modifiés »/);
  const [en] = shardsPoints(dir, [c], "en");
  assert.match(en.detail, /fixes 4 slices: set "shards": "auto".*quote `e2e` in backticks under « Contrats modifiés »/);
});

test("QUA-324 sans `shards` : la commande de tranche du kit est proposée avec son setup ; un outil d'une couche par son cwd", () => {
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

test('QUA-322 déjà `"auto"`, outil hors table, contrôle absent : rien n\'est signalé', () => {
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

// Un projet installé, son contrôle `e2e` écrit à la main entre deux autres champs et contrôles qui ne doivent pas bouger.
async function projet(e2e) {
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
  cfg.checks = [...(cfg.checks ?? []), e2e, { id: "autre", run: "echo autre", paths: ["src/**"] }];
  writeFileSync(fichier, `${JSON.stringify(cfg, null, 2)}\n`);
  return { dir, fichier, cfg };
}

const diagnostic = (dir, fix) => doctor({ targetDir: dir, fix, exec: () => ({ status: 1, stdout: "" }) });
const relu = (fichier) => JSON.parse(readFileSync(fichier, "utf8"));

test('QUA-323 écrit à la main sans `shards` : `doctor` le signale sans rien écrire, `doctor --fix` le passe en `"auto"`', async () => {
  const e2e = { id: "e2e", name: "e2e maison", run: "npx playwright test", paths: ["**"], runAt: ["ci"], degradable: false };
  const { dir, fichier, cfg } = await projet(e2e);
  const avant = readFileSync(fichier, "utf8");
  const sans = await diagnostic(dir, false);
  assert.equal(sans.points.find((p) => p.id === "e2e-shards")?.state, "warning");
  assert.equal(readFileSync(fichier, "utf8"), avant, "sans --fix, rien n'est écrit");

  const d = await diagnostic(dir, true);
  const kit = e2eDeclaration(E2E_TOOLS[0], "playwright.config.ts", ".");
  const apres = relu(fichier);
  const corrige = apres.checks.find((c) => c.id === "e2e");
  assert.deepEqual(corrige, { ...e2e, run: kit.run, shards: "auto", shardsCount: kit.shardsCount }, "les autres champs sont gardés");
  assert.equal(shardProblem(corrige, "e2e", texts("fr")), null, "la déclaration écrite est acceptée par le moteur (QUA-013)");
  assert.deepEqual(
    { ...apres, checks: apres.checks.filter((c) => c.id !== "e2e") },
    { ...cfg, checks: cfg.checks.filter((c) => c.id !== "e2e") },
  );
  const point = d.points.find((p) => p.id === "e2e-shards");
  assert.deepEqual([point.state, point.label], ["ok", "Contrôle lent découpé par --fix"]);
  assert.match(
    point.detail,
    /^`e2e` \(Playwright, `playwright\.config\.ts`\) : "shards", "shardsCount", "run" posé\(s\), autres champs gardés ; remplacé : "run": "npx playwright test"$/,
  );
  // Relancé : déjà `"auto"`, plus rien à écrire ni à signaler.
  const fige = readFileSync(fichier, "utf8");
  assert.ok(!(await diagnostic(dir, true)).points.some((p) => p.id === "e2e-shards"));
  assert.equal(readFileSync(fichier, "utf8"), fige);
});

test('QUA-323 écrit à la main à N figé : `--fix` pose `"auto"`, garde la commande de tranche et rappelle la puce « Contrats modifiés »', async () => {
  const e2e = { id: "e2e", run: `npx playwright test ${SLICE}`, shards: 4, cwd: ".", timeout: 900 };
  const { dir, fichier } = await projet(e2e);
  const d = await diagnostic(dir, true);
  const corrige = relu(fichier).checks.find((c) => c.id === "e2e");
  assert.deepEqual(corrige, { ...e2e, shards: "auto", shardsCount: e2eDeclaration(E2E_TOOLS[0], "playwright.config.ts", ".").shardsCount });
  assert.equal(shardProblem(corrige, "e2e", texts("fr")), null);
  assert.deepEqual(relu(fichier).checks.at(-1), { id: "autre", run: "echo autre", paths: ["src/**"] });
  const point = d.points.find((p) => p.id === "e2e-shards");
  assert.equal(point.state, "warning", "une action reste à faire : la puce de la fiche");
  assert.match(
    point.detail,
    /"shards", "shardsCount" posé\(s\), autres champs gardés ; remplacé : "shards": 4 ; sur une PR, citer `e2e` entre backticks dans « Contrats modifiés »/,
  );
  const en = shardsPoints(dir, [], "en", { tool: "Playwright", config: "playwright.config.ts", fields: { shards: "auto" }, replaced: {} });
  assert.deepEqual(
    [en[0].state, en[0].detail],
    ["ok", '`e2e` (Playwright, `playwright.config.ts`): "shards" set, other fields kept; replaced: nothing (fields added)'],
  );
});

test('QUA-322 `--fix` sur un contrôle déjà `"auto"`, hors table ou absent : fichier inchangé', async () => {
  for (const e2e of [
    { id: "e2e", run: `npx playwright test ${SLICE}`, shards: "auto", shardsCount: "echo 3" },
    { id: "e2e", run: "npx cypress run", cwd: "front" },
    { id: "pas-e2e", run: "npx playwright test" },
  ]) {
    const { dir, fichier } = await projet(e2e);
    const avant = readFileSync(fichier, "utf8");
    assert.ok(!(await diagnostic(dir, true)).points.some((p) => p.id === "e2e-shards"), e2e.id);
    assert.equal(readFileSync(fichier, "utf8"), avant);
  }
});

// Projet équipé d'une version antérieure, contrôle `e2e` à la main en plus. Sous kit-mise-a-jour.test.mjs, l'inventaire
// figé de QUA-315 refuserait tout test ajouté : il vit ici. `paths` qu'aucun commit ne touche : non joué au pre-commit.
async function equipe(lang, e2e) {
  const dir = tmp();
  for (const args of [
    ["init", "-q", "-b", "master"],
    ["config", "core.autocrlf", "false"],
    ["config", "user.name", "t"],
    ["config", "user.email", "t@t"],
  ])
    git(dir, ...args);
  await capture(() => init({ lang, targetDir: dir, name: "demo", git: false }));
  writeFileSync(join(dir, ".drwil/install.json"), JSON.stringify({ format: 1, version: "0.0.1", firstVersion: "0.0.1" }));
  writeFileSync(join(dir, "playwright.config.ts"), "export default {};\n");
  const cfg = config(dir);
  if (e2e) writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...cfg, checks: [...cfg.checks, e2e] }, null, 2) + "\n");
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-q", "-m", "kit ancien").status, 0);
  const sortie = (await capture(() => init({ lang, targetDir: dir, name: "demo" }))).join("\n");
  assert.match(sortie, /(Fait : mise à jour du kit|Done: kit update) /, sortie);
  assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "", "commit de mise à jour accepté par la barrière");
  return { dir, sortie };
}

test("QUA-323 la mise à jour du kit n'écrit rien sur un contrôle e2e non découpé : son compte rendu invite à `doctor --fix` ; sans e2e, rien", async () => {
  const e2e = { id: "e2e", name: "e2e du projet", run: "npx playwright test", paths: ["e2e-absent/**"] };
  const { dir, sortie } = await equipe("fr", e2e);
  assert.match(
    sortie,
    /Reste à décider : Contrôle lent non découpé — `e2e` \(Playwright, `playwright\.config\.ts`\) joue toute la suite en une seule passe : poser "shards": "auto".*La mise à jour n'y écrit rien : lancer `npx drwil doctor --fix`\./,
  );
  assert.deepEqual(config(dir).checks.at(-1), e2e, "contrôle e2e inchangé");
  assert.deepEqual(JSON.parse(git(dir, "show", "HEAD:.drwil/ia-first.json").stdout).checks.at(-1), e2e, "commit sans réécriture");
  assert.ok(sortie.lastIndexOf("Commande suivante") > sortie.indexOf("Contrôle lent"), "la commande suivante reste en dernier");
  const fige = { ...e2e, run: `npx playwright test ${SLICE}`, shards: 4 };
  const en = (await equipe("en", fige)).sortie;
  assert.match(
    en,
    /Left to decide: Slow check not sliced — `e2e` .* fixes 4 slices.*The update writes nothing to it: run `npx drwil doctor --fix`\./,
  );
  assert.doesNotMatch((await equipe("fr", null)).sortie, /Contrôle lent|doctor --fix/);
});
