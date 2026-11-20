// Paire de couverture Vitest réglée à la main : signalée par doctor avec sa commande unique, jamais réécrite (QUA-303).
// Séparé de coverage-merge.test.mjs, à son plafond de lignes (QUA-001).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { doctor, guarantees, init } from "../dist/index.js";
import { singleFromPair } from "../dist/guarantees-merge.js";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const CENT = "--coverage.thresholds.lines=100 --coverage.thresholds.branches=100";
/** Paire telle que la pose un projet Vitest à la main (forme relevée chez un adoptant, 2026-11-20). */
const paire = () => [
  {
    id: "coverage-root",
    name: "coverage ratchet of . (vitest, v8)",
    run: `npx vitest run --silent --coverage --coverage.reporter=text ${CENT}`,
    paths: ["**"],
    degradable: false,
  },
  {
    id: "coverage-diff-root",
    name: "diff coverage of .",
    run: "npx vitest run --silent --coverage --coverage.reporter=cobertura --coverage.reportsDirectory=coverage && diff-cover coverage/cobertura-coverage.xml --fail-under=100",
    paths: ["**"],
    degradable: false,
  },
];
const unique = (threshold, diff = paire()[1].run) =>
  singleFromPair({ threshold: { id: "coverage-a", run: threshold }, diff: { id: "coverage-diff-a", run: diff } });

async function projet(checks) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-vitest-"));
  const { log, warn } = console;
  console.log = console.warn = () => {};
  try {
    await init({ lang: "fr", targetDir: dir, git: false, ci: "github", tools: "claude" });
  } finally {
    console.log = log;
    console.warn = warn;
  }
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "p", scripts: { test: "vitest run" } }));
  const f = join(dir, ".drwil/ia-first.json");
  const cfg = JSON.parse(readFileSync(f, "utf8"));
  cfg.checks = [...(cfg.checks ?? []), ...checks];
  writeFileSync(f, `${JSON.stringify(cfg, null, 2)}\n`);
  return { dir, f };
}

test("QUA-303 doctor : une paire Vitest réglée à la main est signalée avec un seul run Vitest, rien écrit", async () => {
  const { dir, f } = await projet(paire());
  const avant = readFileSync(f, "utf8");
  const point = (await doctor({ targetDir: dir, exec: () => ({ status: 1, stdout: "" }) })).points.find((p) => p.id === "coverage-twice");
  const single = unique(paire()[0].run);
  assert.equal(
    single,
    `rm -f coverage/cobertura-coverage.xml && npx vitest run --silent --coverage --coverage.reporter=cobertura --coverage.reportsDirectory=coverage --coverage.reporter=text ${CENT} && diff-cover coverage/cobertura-coverage.xml --fail-under=100`,
  );
  assert.equal(single.match(/vitest run/g).length, 1, "un seul run de tests");
  assert.equal(point.state, "warning");
  assert.ok(point.detail.includes(`\`${single}\``));
  assert.equal(readFileSync(f, "utf8"), avant, "rien écrit");
});

test("QUA-303 guarantees : une paire Vitest n'est jamais réécrite (hors table du kit, signalée seulement)", async () => {
  const { dir, f } = await projet(paire());
  guarantees({
    targetDir: dir,
    exec: (cmd) => (/diff-cover --version|vitest/.test(cmd) ? { status: 0, stdout: "" } : { status: 1, stdout: "" }),
  });
  const ids = JSON.parse(readFileSync(f, "utf8")).checks.filter((c) => /^coverage-/.test(c.id));
  assert.deepEqual(
    ids.filter((c) => c.id.endsWith("-root")).map((c) => c.run),
    paire().map((c) => c.run),
  );
});

test("QUA-303 composition Vitest : cobertura ou dossier déjà demandés, --coverage.enabled, sans --coverage", () => {
  assert.equal(
    unique("vitest run --coverage.enabled=true", "diff-cover out/c.xml"),
    "rm -f out/c.xml && vitest run --coverage.enabled=true --coverage.reporter=cobertura --coverage.reportsDirectory=out && diff-cover out/c.xml",
  );
  const deja = "npx vitest run --coverage --coverage.reporter=cobertura --coverage.reportsDirectory=coverage";
  assert.equal(
    unique(deja, "diff-cover coverage/cobertura-coverage.xml"),
    `rm -f coverage/cobertura-coverage.xml && ${deja} && diff-cover coverage/cobertura-coverage.xml`,
  );
  assert.equal(unique("npx vitest run --coverage.reporter=text"), null, "couverture non demandée");
  assert.equal(unique("npx jest --coverage"), null, "autre lanceur");
});
