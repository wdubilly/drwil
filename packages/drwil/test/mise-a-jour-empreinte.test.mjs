// Tests du paquet, mise à jour et reprise après le calcul de l'empreinte par contrôle (QUA-141) : hors des fichiers
// `kit-*.test.mjs`, dont QUA-315 fige la liste des tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { init, verify } from "../dist/index.js";
import { E2E_TOOLS, e2eDeclaration } from "../dist/guarantees-e2e-tools.js";
import { tmp, capture, git, read, config, contrat, projetReprise } from "./kit-commun.mjs";

const IDENTITE = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };

async function avecIdentite(fn) {
  const avant = Object.fromEntries(Object.keys(IDENTITE).map((k) => [k, process.env[k]]));
  Object.assign(process.env, IDENTITE);
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(avant)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

/** Un projet équipé, commité sur `master`, dont l'installation se dit plus ancienne ; `empreinte` : contenu de son fingerprints.mjs. */
async function projetInstalle(lang, empreinte, avant = () => {}) {
  const dir = tmp();
  git(dir, "init", "-q", "-b", "master");
  git(dir, "config", "core.autocrlf", "false");
  await capture(() => init({ lang, targetDir: dir, name: "demo", git: false }));
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  // Une mécanique d'une version précédente, jamais modifiée depuis : la mise à jour la rafraîchit et a donc un commit à faire.
  appendFileSync(join(dir, ".githooks/pre-push"), "\n# ancienne version\n");
  if (empreinte !== undefined) writeFileSync(join(dir, ".githooks/fingerprints.mjs"), empreinte);
  for (const f of [".githooks/pre-push", ".githooks/fingerprints.mjs"])
    manifeste[f] = createHash("sha256").update(read(dir, f)).digest("hex");
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2) + "\n");
  writeFileSync(join(dir, ".drwil/install.json"), JSON.stringify({ format: 1, version: "0.0.1", firstVersion: "0.0.1" }));
  avant(dir);
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-q", "-m", "kit ancien").status, 0);
  return dir;
}

const ANCIENNE = "// version précédente du moteur, sans empreinte par contrôle\nexport const treeFingerprint = () => null;\n";
const FR = /^Première passe complète, puis reprise des verdicts : l'empreinte de chaque contrôle a changé de calcul/m;
const EN = /^First full pass, then reuse of verdicts: each check's fingerprint is computed differently/m;

test("QUA-141 : une mise à jour depuis un kit antérieur au calcul de l'empreinte par contrôle le dit en une ligne, en français et en anglais ; depuis un kit qui le connaît, rien", async () => {
  await avecIdentite(async () => {
    const ancien = await projetInstalle("fr", ANCIENNE);
    const sortie = (await capture(() => init({ lang: "fr", targetDir: ancien, name: "demo" }))).join("\n");
    assert.match(sortie, FR, sortie);
    assert.match(sortie, /Fait : mise à jour du kit vers/, "la mise à jour est commitée");
    assert.ok(sortie.indexOf("Première passe complète") < sortie.indexOf("Commande suivante"), "avant la commande suivante");
    assert.match(read(ancien, ".githooks/fingerprints.mjs"), /FINGERPRINT_SCHEME = \d+/, "le moteur est rafraîchi");

    const anglais = await projetInstalle("en", ANCIENNE);
    const en = (await capture(() => init({ lang: "en", targetDir: anglais, name: "demo" }))).join("\n");
    assert.match(en, EN, en);
    assert.doesNotMatch(en, FR);

    const recent = await projetInstalle("fr");
    const sansLigne = (await capture(() => init({ lang: "fr", targetDir: recent, name: "demo" }))).join("\n");
    assert.match(sansLigne, /Fait : mise à jour du kit vers/);
    assert.doesNotMatch(sansLigne, /Première passe complète/, "le moteur installé connaît déjà ce calcul");
  });
});

test("QUA-141 : verify reprend le verdict d'un contrôle qui lit .drwil/ia-first.json quand seul un autre contrôle y est ajouté ; un réglage changé le rejoue", async () => {
  const contrats = contrat("QUA-001", "**Contrôle** : `ko`") + contrat("QUA-002", "**Contrôle** : `ok`");
  const dir = await projetReprise(contrats, {
    cfg: (cfg) => {
      for (const c of cfg.checks) c.paths = ["src/**", ".drwil/ia-first.json"];
    },
  });
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "a.txt"), "a\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "src");
  const moteur = await import(pathToFileURL(join(dir, ".githooks", "engine.mjs")).href);
  const controles = moteur.controlFingerprints(dir, moteur.checks(dir, { cfg: config(dir) }));
  const verdict = (id) => ({ status: "ok", ranAt: "2026-10-25T09:00:00.000Z", control: controles.get(id) });
  const fichier = join(dir, ".drwil/evidence/run-checks-verdicts.json");
  writeFileSync(
    fichier,
    JSON.stringify({ ranAt: "2026-10-25T10:00:00.000Z", fingerprint: null, checks: { ok: verdict("ok"), ko: verdict("ko") } }),
  );
  const bases = (v) => Object.fromEntries(v.contracts.flatMap((k) => k.checks.map((c) => [c.id, c.reusedBasis ?? "rejoué"])));

  const cfg = config(dir);
  cfg.checks.push({ id: "tests-nouveau", name: "contrat ajouté", run: 'node -e "process.exit(0)"', paths: ["src/**"] });
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  const ajoute = await verify({ targetDir: dir });
  assert.deepEqual(bases(ajoute), { ko: "control", ok: "control" }, "un contrôle ajouté ne rejoue pas les autres");
  assert.equal(ajoute.status, "PASS");

  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...cfg, projectShort: "autre" }));
  assert.deepEqual(bases(await verify({ targetDir: dir })), { ko: "rejoué", ok: "rejoué" }, "un réglage changé : rejoués");
});

/** Contrôles d'un projet d'un kit antérieur aux chemins calculés : la paire de couverture Vitest écrite à la main, `e2e` du kit. */
const surToutLeDepot = (e2e) => (dir) => {
  for (const f of ["src/a.js", "src/a.test.js", "vite.config.js", "playwright.config.ts", "package-lock.json"])
    writeFileSync(join(mkdir(dir, f), f.split("/").pop()), "x\n");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }));
  appendFileSync(join(dir, "docs/architecture.md"), "\n- `src/` — le code de l'application.\n");
  const cfg = config(dir);
  cfg.checks = [
    ...(cfg.checks ?? []),
    { id: "coverage-root", run: "npx vitest run --coverage --coverage.thresholds.lines=100", paths: ["**"], degradable: false },
    { id: "coverage-diff-root", run: "npx vitest run --coverage && diff-cover coverage/cobertura-coverage.xml", paths: ["**"] },
    e2e,
    { id: "lint", run: "npx biome check", paths: ["**"] },
  ];
  writeFileSync(join(dir, ".drwil/ia-first.json"), `${JSON.stringify(cfg, null, 2)}\n`);
};
const mkdir = (dir, f) => {
  const d = join(dir, f.split("/").slice(0, -1).join("/"));
  mkdirSync(d, { recursive: true });
  return d;
};
const KIT_E2E = e2eDeclaration(E2E_TOOLS[0], "playwright.config.ts", ".");
const CALCULES = ["*.example", "*.js", "*.json", "*.ts", "src/**"];

test('QUA-141 : la mise à jour réécrit les `paths: ["**"]` de la paire de couverture, même retouchée, et de l\'e2e intact du kit, et les nomme', async () => {
  await avecIdentite(async () => {
    const dir = await projetInstalle("fr", undefined, surToutLeDepot({ ...KIT_E2E }));
    const sortie = (await capture(() => init({ lang: "fr", targetDir: dir, name: "demo" }))).join("\n");
    assert.match(sortie, /Chemins posés par le kit sur `coverage-root`, `coverage-diff-root`, `e2e`/, sortie);
    assert.doesNotMatch(sortie, /Reste à décider : `e2e`/);
    const commite = JSON.parse(git(dir, "show", "HEAD:.drwil/ia-first.json").stdout).checks;
    const par = (id) => commite.find((c) => c.id === id);
    for (const id of ["coverage-root", "coverage-diff-root", "e2e"]) assert.deepEqual(par(id).paths, CALCULES, id);
    assert.deepEqual(par("e2e"), { ...KIT_E2E, paths: CALCULES }, "seuls les paths changent");
    assert.deepEqual(par("lint").paths, ["**"], "un contrôle du projet n'est jamais réécrit");
  });
});

test("QUA-238 : le commit d'une mise à jour qui réécrit les chemins des contrôles du kit passe la barrière, hooks actifs", async () => {
  await avecIdentite(async () => {
    const dir = await projetInstalle("fr", undefined, surToutLeDepot({ ...KIT_E2E }));
    git(dir, "config", "core.hooksPath", ".githooks");
    const warn = console.warn;
    const avert = [];
    console.warn = (...a) => avert.push(a.join(" "));
    let sortie;
    try {
      sortie = [...(await capture(() => init({ lang: "fr", targetDir: dir, name: "demo" }))), ...avert].join("\n");
    } finally {
      console.warn = warn;
    }
    assert.match(sortie, /Fait : mise à jour du kit vers/, sortie);
    assert.match(git(dir, "log", "-1", "--format=%B").stdout, /Drwil-Kit-Update/);
    const e2e = JSON.parse(git(dir, "show", "HEAD:.drwil/ia-first.json").stdout).checks.find((c) => c.id === "e2e");
    assert.deepEqual(e2e.paths, CALCULES, "les chemins réécrits sont dans le commit admis");
    assert.equal(git(dir, "status", "--porcelain").stdout, "", "arbre propre");
  });
});

test('QUA-141 : un `e2e` retouché à la main reste sur `["**"]` et n\'est que signalé, en français et en anglais', async () => {
  await avecIdentite(async () => {
    for (const [lang, motif] of [
      ["fr", /Reste à décider : `e2e` retouché à la main reste sur `paths: \["\*\*"\]`/],
      ["en", /Left to decide: `e2e`, modified by hand, stays on `paths: \["\*\*"\]`/],
    ]) {
      const dir = await projetInstalle(lang, undefined, surToutLeDepot({ ...KIT_E2E, run: "npm run build && npx playwright test" }));
      const sortie = (await capture(() => init({ lang, targetDir: dir, name: "demo" }))).join("\n");
      assert.match(sortie, motif, sortie);
      assert.match(
        sortie,
        lang === "fr" ? /sur `coverage-root`, `coverage-diff-root` :/ : /Paths set by the kit on `coverage-root`, `coverage-diff-root`:/,
      );
      const commite = JSON.parse(git(dir, "show", "HEAD:.drwil/ia-first.json").stdout).checks;
      assert.deepEqual(commite.find((c) => c.id === "e2e").paths, ["**"]);
    }
  });
});
