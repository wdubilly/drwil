import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checks, texts } from "./engine.mjs";
import { aggregateShards, gitCommit, keepSharded, parseShardArgs, shardPlan, shardProblem } from "./engine-shards.mjs";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const T = texts("fr");
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-tranches-"));
  dossiers.push(dir);
  return dir;
};
const ecrire = (racine, chemin, contenu) => {
  mkdirSync(dirname(join(racine, chemin)), { recursive: true });
  writeFileSync(join(racine, chemin), contenu);
};
const E2E = { name: "e2e", run: 'echo "tranche $DRWIL_SHARD_INDEX/$DRWIL_SHARD_TOTAL"', shards: 3, paths: ["e2e/**"] };

test("QUA-013 : un réglage « shards » invalide est refusé, jamais joué", () => {
  const cas = [
    [{ shards: 1 }, /entier de 2 à 16/],
    [{ shards: 17 }, /entier de 2 à 16/],
    [{ shards: "3" }, /entier de 2 à 16/],
    [{ shards: 2, reuse: "tree" }, /reuse: "tree"/],
    [{ shards: 2, run: "npx playwright test" }, /DRWIL_SHARD_INDEX/],
    [{ shards: 2, run: undefined }, /DRWIL_SHARD_INDEX/],
  ];
  for (const [declaration, attendu] of cas) {
    const c = { name: "e2e", run: "echo $DRWIL_SHARD_INDEX", ...declaration };
    assert.match(shardProblem(c, "e2e", T), attendu);
  }
  assert.equal(shardProblem({ name: "x", run: "echo" }, "x", T), null);
  assert.equal(shardProblem(E2E, "e2e", T), null);
  const racine = tmp();
  const liste = checks(racine, { cfg: { checks: [{ ...E2E, shards: 1 }] }, env: { ...process.env, CI: "" } });
  const r = liste.find((c) => c.id === "project:e2e").run({ stdio: "pipe" });
  assert.equal(r.status, "fail");
  assert.match(r.message, /entier de 2 à 16/);
});

test("les options de tranche : forme, combinaisons refusées", () => {
  assert.equal(parseShardArgs(["--tout-rejouer"]), null);
  assert.deepEqual(parseShardArgs(["--shard", "2/3"]), { index: 2, total: 3 });
  assert.deepEqual(parseShardArgs(["--shard=1/16"]), { index: 1, total: 16 });
  assert.deepEqual(parseShardArgs(["--without-shards"]), { without: true, aggregate: null });
  assert.deepEqual(parseShardArgs(["--aggregate-shards", "d"]), { without: true, aggregate: "d" });
  assert.deepEqual(parseShardArgs(["--without-shards", "--aggregate-shards=d"]), { without: true, aggregate: "d" });
  for (const mauvais of [
    ["--shard"],
    ["--shard", "0/2"],
    ["--shard", "3/2"],
    ["--shard", "1/17"],
    ["--shard", "a/b"],
    ["--shard", "1/2", "--without-shards"],
    ["--shard", "1/2", "--aggregate-shards", "d"],
    ["--aggregate-shards"],
  ])
    assert.deepEqual(parseShardArgs(mauvais), { error: true }, mauvais.join(" "));
});

test("le moteur pose les variables au seul contrôle découpé ; sans option, une seule passe (1/1)", () => {
  const racine = tmp();
  const cfg = { checks: [E2E, { name: "lint", run: 'echo "lint:$DRWIL_SHARD_INDEX"' }] };
  const env = { ...process.env, CI: "" };
  const sortie = (liste, id) => liste.find((c) => c.id === id).run({ stdio: "pipe" });

  const seule = checks(racine, { cfg, env });
  assert.match(sortie(seule, "project:e2e").output, /tranche 1\/1/);
  assert.equal(sortie(seule, "project:lint").output.trim(), "lint:");

  const tranche = checks(racine, { cfg, env, shard: { index: 2, total: 3 } });
  assert.deepEqual(
    tranche.map((c) => c.id),
    ["project:e2e"],
  );
  assert.match(sortie(tranche, "project:e2e").output, /tranche 2\/3/);

  const mauvaisTotal = checks(racine, { cfg, env, shard: { index: 1, total: 2 } });
  const r = sortie(mauvaisTotal, "project:e2e");
  assert.equal(r.status, "fail");
  assert.match(r.message, /tranche demandée sur 2, « shards » en déclare 3/);

  const reste = checks(racine, { cfg, env, shard: { without: true, aggregate: null } });
  assert.equal(sortie(reste, "project:e2e").status, "not-applicable");
  assert.match(sortie(reste, "project:e2e").detail, /confié aux tranches/);
  assert.equal(sortie(reste, "project:lint").status, "ok");
});

test("shardPlan : un contrôle non découpé n'a pas de plan, keepSharded garde la liste et ses méthodes", () => {
  const liste = Object.assign([{ id: "a" }, { id: "b", sharded: true }], { finish: () => "fini" });
  keepSharded(liste);
  assert.deepEqual(
    liste.map((c) => c.id),
    ["b"],
  );
  assert.equal(liste.finish(), "fini");
  const plan = shardPlan(E2E, null, { env: { X: "1" }, root: ".", id: "i", name: "e2e", T, fingerprint: () => null });
  assert.equal(plan.env.X, "1");
  assert.equal(plan.skip, undefined);
});

const COMMIT = "c".repeat(40);
/** Dépose les verdicts de tranche (`fichiers` : nom → contenu brut) dans le dossier d'agrégation d'une racine neuve. */
function agreger(fichiers, { shards = 3, control = "empreinte", commit = COMMIT } = {}) {
  const racine = tmp();
  for (const [nom, contenu] of Object.entries(fichiers))
    ecrire(racine, `tranches/${nom}`, typeof contenu === "string" ? contenu : JSON.stringify(contenu));
  return aggregateShards({
    root: racine,
    dir: "tranches",
    c: { ...E2E, shards },
    id: "project:e2e",
    name: "e2e",
    fingerprint: () => control,
    T,
    commit,
  });
}
const v = (index, extra = {}) => ({ check: "project:e2e", control: "empreinte", commit: COMMIT, index, total: 3, status: "ok", ...extra });
const complet = () => ({ "a/1.json": v(1), "b/2.json": v(2), "c/3.json": v(3) });

test("QUA-013 : l'agrégation n'écrit « ok » que si les N tranches du même commit sont « ok »", () => {
  assert.deepEqual(agreger(complet()), { status: "ok" });
  // Un fichier étranger au contrôle, ou qui n'est pas un verdict, ne compte pas.
  assert.equal(agreger({ ...complet(), "autre.json": v(1, { check: "project:autre" }), "note.txt": "x", "nul.json": "null" }).status, "ok");
});

test("QUA-013 : tranche absente, dupliquée, en échec, d'un autre commit ou contrôle : l'agrégation échoue", () => {
  const sans3 = { "a/1.json": v(1), "b/2.json": v(2) };
  const cas = [
    [{}, /tranche 1\/3 absente.*tranche 2\/3 absente.*tranche 3\/3 absente/s],
    [sans3, /tranche 3\/3 absente/],
    [{ ...complet(), "d/2bis.json": v(2) }, /tranche 2\/3 jouée plusieurs fois/],
    [{ ...complet(), "b/2.json": v(2, { status: "fail" }) }, /tranche 2\/3 non « ok »/],
    [{ ...complet(), "b/2.json": v(2, { status: "not-run" }) }, /tranche 2\/3 non « ok »/],
    [{ ...complet(), "b/2.json": v(2, { commit: "d".repeat(40) }) }, /tranche 2\/3 jouée sur un autre commit/],
    [{ ...complet(), "b/2.json": v(2, { commit: null }) }, /autre commit/],
    [{ ...complet(), "b/2.json": v(2, { control: "autre" }) }, /autres fichiers ou une autre déclaration/],
    [{ ...complet(), "b/2.json": v(2, { total: 4 }) }, /tranche 2\/4 incohérente avec « shards » : 3/],
    [{ ...complet(), "b/2.json": v(7) }, /tranche 7\/3 incohérente/],
    [{ ...complet(), "b/2.json": v("x") }, /tranche x\/3 incohérente/],
    [{ ...complet(), "b/2.json": "pas du json" }, /verdict de tranche illisible/],
  ];
  for (const [fichiers, attendu] of cas) {
    const r = agreger(fichiers);
    assert.equal(r.status, "fail", String(attendu));
    assert.match(r.message, /e2e : les tranches ne sont pas toutes « ok »/);
    assert.match(r.output, attendu);
  }
});

test("QUA-013 : sans commit lisible, ou sans fingerprint des deux côtés, l'agrégation reste prudente", () => {
  assert.equal(agreger(complet(), { commit: null }).status, "fail");
  // Contrôle sans `paths` : pas d'empreinte (null) des deux côtés, les tranches du même commit suffisent.
  const sansPaths = Object.fromEntries(Object.entries(complet()).map(([k, x]) => [k, { ...x, control: null }]));
  assert.equal(agreger(sansPaths, { control: null }).status, "ok");
  assert.equal(agreger(complet(), { control: null }).status, "fail");
});

test("gitCommit : le commit courant, ou null hors dépôt ; l'agrégation le lit seule", () => {
  const racine = tmp();
  assert.equal(gitCommit(racine), null);
  spawnSync("git", ["init", "-q", "-b", "travail"], { cwd: racine });
  spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "x"], { cwd: racine });
  const commit = gitCommit(racine);
  assert.match(commit, /^[0-9a-f]{40}$/);
  ecrire(racine, "t/1.json", JSON.stringify({ check: "project:e2e", control: "e", commit, index: 1, total: 2, status: "ok" }));
  ecrire(racine, "t/2.json", JSON.stringify({ check: "project:e2e", control: "e", commit, index: 2, total: 2, status: "ok" }));
  const r = aggregateShards({ root: racine, dir: "t", c: { shards: 2 }, id: "project:e2e", name: "e2e", fingerprint: () => "e", T });
  assert.equal(r.status, "ok");
});

test("l'agrégation par le moteur : tout est joué sauf le contrôle découpé, jugé sur les tranches", () => {
  const racine = tmp();
  const cfg = { checks: [{ ...E2E, shards: 2 }] };
  const env = { ...process.env, CI: "" };
  const liste = checks(racine, { cfg, env, shard: { without: true, aggregate: "tranches" } });
  const r = liste.find((c) => c.id === "project:e2e").run({ stdio: "pipe" });
  assert.equal(r.status, "fail");
  assert.match(r.output, /tranche 1\/2 absente/);
});

test("en passe parallèle, le contrôle découpé reçoit aussi ses variables", async () => {
  const racine = tmp();
  const cfg = { parallel: true, checks: [E2E, { name: "lint", run: 'echo "lint:$DRWIL_SHARD_INDEX"' }] };
  const liste = checks(racine, { cfg, env: { ...process.env, CI: "" }, shard: { index: 3, total: 3 } });
  assert.match((await liste[0].runAsync()).output, /tranche 3\/3/);
  const seule = checks(racine, { cfg, env: { ...process.env, CI: "" } });
  assert.equal((await seule.find((c) => c.id === "project:lint").runAsync()).output.trim(), "lint:");
});

test("les messages de tranche existent en anglais comme en français", () => {
  const fr = texts("fr");
  const en = texts("en");
  const cles = Object.keys(fr).filter((k) => k.startsWith("shards"));
  assert.ok(cles.length >= 10);
  for (const k of cles) {
    assert.equal(typeof en[k], typeof fr[k], k);
    if (typeof en[k] === "function") assert.notEqual(en[k]("a", 1, 2), fr[k]("a", 1, 2), k);
  }
});
