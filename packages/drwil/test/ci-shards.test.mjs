// CI GitLab livrée : les contrôles découpés (`shards: N`) — même règle que la CI GitHub (.github/scripts/workflows-yaml.test.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAllDocuments } from "yaml";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), "..", "templates", "common");
const GITLAB = join(TEMPLATES, "ci", "gitlab", ".gitlab-ci.yml");
const ci = parseAllDocuments(readFileSync(GITLAB, "utf8"))[0].toJS();
const PLAN = ".drwil/evidence/shard-plan.json";
const DOSSIER = ".drwil/evidence/shards";

test("QUA-251, QUA-013 : la CI GitLab livrée planifie, découpe (16 jobs au plus) et agrège dans le job exigé « checks », sans jamais réussir par défaut", () => {
  // Les étapes s'enchaînent : un job en échec arrête les suivantes, donc `checks` ne réussit pas sans plan ni tranches.
  assert.deepEqual(ci.stages, ["plan", "slices", "test", "alert"]);
  assert.equal(ci.checks.stage, "test");
  assert.equal(ci.checks.when, undefined, "checks ne tourne jamais malgré un échec amont");
  assert.deepEqual(ci.checks.needs, undefined);
  // Le plan lit la configuration et le dépose en artefact ; une déclaration refusée fait échouer le job.
  assert.equal(ci.plan.stage, "plan");
  assert.ok(ci.plan.script.some((l) => l.includes(`run-checks.mjs --shard-plan > ${PLAN}`)));
  assert.deepEqual(ci.plan.artifacts.paths, [PLAN]);
  // `parallel:` est statique : le plafond de `shards` (D1), les tranches au-delà de N ne jouent rien (D2).
  assert.equal(ci.shards.stage, "slices");
  assert.equal(ci.shards.parallel, 16);
  assert.equal(ci.shards.artifacts.when, "always", "une tranche en échec dépose aussi son verdict");
  assert.deepEqual(ci.shards.artifacts.paths, [DOSSIER]);
  // Un cache de verdicts reste interdit (QUA-250) : ni les tranches ni le plan n'en ont.
  assert.equal(ci.shards.cache, undefined);
  assert.equal(ci.plan.cache, undefined);
  // L'agrégation lit les verdicts de la même pipeline, dans les deux passes (celle de la PR et le rejeu avec les hooks de la base).
  const passes = ci.checks.script.filter((l) => l.includes("run-checks.mjs") || l.includes("base-checks.mjs"));
  assert.ok(passes.length >= 2);
  for (const l of passes) assert.match(l, /--aggregate-shards \.drwil\/evidence\/shards/);
  // L'alerte suit les étapes précédentes, tranches comprises.
  assert.equal(ci["alert-if-ci-broken"].stage, "alert");
  assert.deepEqual(ci["alert-if-ci-broken"].rules[0].when, "on_failure");
});

/** Projet d'essai : un contrôle e2e découpé, les hooks livrés, un dépôt git sur la branche principale. */
function projet(shards) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-ci-gitlab-"));
  cpSync(join(TEMPLATES, "base", ".githooks"), join(racine, ".githooks"), { recursive: true });
  const checks = [
    { name: "e2e", run: 'echo "e2e $DRWIL_SHARD_INDEX/$DRWIL_SHARD_TOTAL" >> trace.txt', paths: ["e2e/**"], ...(shards && { shards }) },
  ];
  mkdirSync(join(racine, "e2e"));
  writeFileSync(join(racine, "e2e", "t.txt"), "un\n");
  mkdirSync(join(racine, ".drwil"));
  writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ lang: "fr", checks }));
  for (const args of [
    ["init", "-q", "-b", "main"],
    ["add", "-A"],
    ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "x"],
  ])
    spawnSync("git", args, { cwd: racine });
  return racine;
}
const bash = (racine, script, env = {}) =>
  spawnSync("bash", ["-ec", script], {
    cwd: racine,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      HOME: racine,
      CI: "true",
      CI_DEFAULT_BRANCH: "main",
      CI_COMMIT_BRANCH: "main",
      DRWIL_ROOT: racine,
      ...env,
    },
  });

for (const [shards, indices, attendues] of [
  [3, [1, 2, 3, 4], ["e2e 1/3", "e2e 2/3", "e2e 3/3"]],
  [undefined, [1, 2], []],
])
  test(`QUA-251 : GitLab, ${shards ? `${shards} tranches` : "aucun contrôle découpé"} — chaque tranche joue la sienne, celles au-delà de N ne jouent rien et ne laissent aucun verdict`, (t) => {
    if (process.platform === "win32") return t.skip("bash");
    const racine = projet(shards);
    t.after(() => rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
    const plan = bash(racine, ci.plan.script.join("\n"));
    assert.equal(plan.status, 0, plan.stdout + plan.stderr);
    const script = ci.shards.script.join("\n");
    for (const i of indices) {
      const r = bash(racine, script, { CI_NODE_INDEX: String(i), CI_NODE_TOTAL: "16" });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.equal(/not applicable/.test(r.stdout), i > (shards ?? 0), `tranche ${i}`);
    }
    const jouees = existsSync(join(racine, "trace.txt")) ? readFileSync(join(racine, "trace.txt"), "utf8").trim().split("\n") : [];
    assert.deepEqual(jouees, attendues);
    const verdicts = existsSync(join(racine, DOSSIER)) ? readdirSync(join(racine, DOSSIER)) : [];
    assert.equal(verdicts.length, attendues.length, verdicts.join());
  });

test("QUA-013 : GitLab, sans plan lisible la tranche échoue, elle ne réussit jamais par défaut", (t) => {
  if (process.platform === "win32") return t.skip("bash");
  const racine = projet(2);
  t.after(() => rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const r = bash(racine, ci.shards.script.join("\n"), { CI_NODE_INDEX: "1", CI_NODE_TOTAL: "16" });
  assert.notEqual(r.status, 0);
  assert.equal(existsSync(join(racine, DOSSIER)), false);
});
