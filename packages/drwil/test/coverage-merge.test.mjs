// Fusion des contrôles de couverture de série d'une couche en dette en un seul run (QUA-302).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { guaranteeFailures, guarantees, init, toolFor } from "../dist/index.js";
import { mergeSeriesPair, seriesThresholds, thresholdsOf } from "../dist/guarantees-merge.js";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const NODE = toolFor(["Node.js"]);
const SEUIL = { lines: 72, branches: 60, functions: 80, statements: 71 };
const OK = { status: 0, stdout: "" };
const lire = (dir, f) => readFileSync(join(dir, f), "utf8");
const config = (dir) => JSON.parse(lire(dir, ".drwil/ia-first.json"));
const ecrire = (dir, f, texte) => {
  mkdirSync(dirname(join(dir, f)), { recursive: true });
  writeFileSync(join(dir, f), texte);
};
const ecrireConfig = (dir, cfg) => ecrire(dir, ".drwil/ia-first.json", `${JSON.stringify(cfg, null, 2)}\n`);

/** Exécuteur simulé : c8 et diff-cover présents ; tout le reste échoue (rien n'est mesuré). */
const exec = (appels) => (cmd) => {
  appels.push(cmd);
  return /c8 --version|diff-cover --version/.test(cmd) ? OK : { status: 1, stdout: "" };
};

/** Paire telle que le kit la câblait avant QUA-301 (seuil à part, diff à part). */
const paire = (ex = []) => [
  { id: "coverage-root", name: "coverage ratchet of . (c8)", run: NODE.run(SEUIL, ex), paths: ["**"], degradable: false },
  { id: "coverage-diff-root", name: "diff coverage of .", run: NODE.diff.run, paths: ["**"], degradable: false, ciJob: "checks" },
];

/** Projet Node existant installé, dont `.drwil/ia-first.json` déclare `checks` (et `exclusions` éventuelles). */
async function projet(checks, exclusions) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-fusion-"));
  ecrire(dir, "src/ancien.js", "export const ancien = 1;\n");
  const { log, warn } = console;
  console.log = console.warn = () => {};
  try {
    await init({ lang: "fr", targetDir: dir, git: false, ci: "github", tools: "claude" });
  } finally {
    console.log = log;
    console.warn = warn;
  }
  ecrire(dir, "package.json", JSON.stringify({ name: "p", scripts: { test: "node --test" } }));
  const cfg = config(dir);
  cfg.checks = [...(cfg.checks ?? []), ...checks];
  if (exclusions) cfg.guarantees = { ...cfg.guarantees, exclusions };
  ecrireConfig(dir, cfg);
  return dir;
}

const couverture = (dir) => config(dir).checks.filter((c) => /^coverage-/.test(c.id));

test("QUA-302 paire de série : remplacée par le seul coverage-diff, seuil gardé, sans rien mesurer", async () => {
  for (const ex of [[], ["src/genere/**"]]) {
    const dir = await projet(paire(ex), ex.length ? [{ path: ex[0], reason: "code généré" }] : undefined);
    const appels = [];
    const r = guarantees({ targetDir: dir, exec: exec(appels) });
    assert.ok(!appels.some((c) => /npm test/.test(c)), "rien mesuré ni joué");
    const checks = couverture(dir);
    assert.deepEqual(
      checks.map((c) => c.id),
      ["coverage-diff-root"],
    );
    assert.equal(checks[0].run, NODE.single(SEUIL, ex));
    assert.equal(checks[0].run.match(/npm test/g).length, 1, "un seul run de tests");
    assert.equal(checks[0].ciJob, "checks", "les autres champs du contrôle de diff sont gardés");
    assert.equal(r.layers[0].status, "kept");
    assert.equal(r.layers[0].mode, "existing");
    assert.match(r.layers[0].lines.join("\n"), /`coverage-root` et `coverage-diff-root` fusionnés en `coverage-diff-root`.*lines 72 %/);
    assert.equal(config(dir).guarantees.layers.root, "existing");
    assert.ok(!guaranteeFailures(dir, config(dir), [{ checks: ["coverage-diff-root"] }]).some((e) => /coverage-/.test(e)));
  }
});

test("QUA-302 paire personnalisée : jamais réécrite (option ajoutée au diff ou au seuil, exclusion changée)", async () => {
  const cas = [
    (p) => (p[1].run = `${NODE.diff.run} --compare-branch=origin/dev`),
    (p) => (p[0].run = p[0].run.replace(" --all", " --reporter=text --all")),
    (p) => (p[0].run = p[0].run.replace(" npm test", ' --exclude="x/**" npm test')),
  ];
  for (const modifie of cas) {
    const p = paire();
    modifie(p);
    const dir = await projet(p);
    const r = guarantees({ targetDir: dir, exec: exec([]) });
    assert.deepEqual(couverture(dir), p, "paire laissée intacte");
    assert.equal(r.layers[0].status, "kept");
    assert.doesNotMatch(r.layers[0].lines.join("\n"), /fusionnés/);
  }
});

test("QUA-302 déjà fusionné ou couche à 100 % : rien ne change", async () => {
  const unique = { id: "coverage-diff-root", name: "n", run: NODE.single(SEUIL, []), paths: ["**"], degradable: false };
  const cent = { id: "coverage-root", name: "n", run: NODE.run({}, []), paths: ["**"], degradable: false };
  for (const checks of [[unique], [cent]]) {
    const dir = await projet(checks);
    const r = guarantees({ targetDir: dir, exec: exec([]) });
    assert.deepEqual(couverture(dir), checks);
    assert.equal(r.layers[0].status, "kept");
  }
});

test("QUA-302 Python : la paire coverage.py reste deux contrôles", () => {
  const py = toolFor(["Python"]);
  const checks = [
    { id: "coverage-api", run: py.run({ lines: 70, branches: 70 }, []) },
    { id: "coverage-diff-api", run: py.diff.run },
  ];
  const avant = structuredClone(checks);
  assert.equal(mergeSeriesPair(checks, py, "api", "api", []), null);
  assert.deepEqual(checks, avant);
  assert.equal(seriesThresholds(py, { threshold: checks[0], diff: checks[1] }, []), null);
  assert.equal(thresholdsOf("npm test"), null);
  const go = toolFor(["Go"]);
  const pairNode = { threshold: { id: "coverage-api", run: NODE.run(SEUIL, []) }, diff: { id: "coverage-diff-api", run: NODE.diff.run } };
  assert.equal(seriesThresholds(go, pairNode, []), null, "outil sans diff ni run unique");
  assert.equal(seriesThresholds(NODE, { ...pairNode, threshold: { id: "coverage-api" } }, []), null, "commande absente");
  assert.equal(seriesThresholds(NODE, pairNode, []).single, NODE.single(SEUIL, []));
  assert.equal(mergeSeriesPair([{ id: "coverage-diff-api", run: "x" }], NODE, "api", "api", []), null, "paire incomplète");
});
