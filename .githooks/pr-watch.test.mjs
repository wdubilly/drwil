import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ghJson, look, parseArgs, texts, watch } from "./pr-watch.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "pr-watch.mjs");
const tmp = () => mkdtempSync(join(tmpdir(), "drwil-pr-watch-"));

/** gh simulé : réponses successives de `pr view` et `pr checks`. */
function faux({ view = [], checks = [] }) {
  const appels = [];
  const gh = (args) => {
    appels.push(args.join(" "));
    const file = args[1] === "view" ? view : checks;
    return file.length > 1 ? file.shift() : file[0];
  };
  return { gh, appels };
}

const OUVERTE = { number: 7, state: "OPEN" };

test("QUA-100 suivi de PR : verte, rouge, fusionnée, fermée", async () => {
  const T = texts(tmp());
  let r = await watch({
    gh: faux({
      view: [OUVERTE],
      checks: [
        [
          { name: "checks", bucket: "pass" },
          { name: "x", bucket: "skipping" },
        ],
      ],
    }).gh,
    T,
  });
  assert.deepEqual([r.code, r.message], [0, "[pr-watch] PR #7 : CI verte (2 contrôle(s))."]);
  r = await watch({
    gh: faux({
      view: [OUVERTE],
      checks: [
        [
          { name: "checks", bucket: "fail" },
          { name: "e2e", bucket: "cancel" },
        ],
      ],
    }).gh,
    T,
  });
  assert.equal(r.code, 1);
  assert.match(r.message, /CI rouge — en échec : checks, e2e\. Corriger la cause, jamais contourner \(QUA-019\)/);
  r = await watch({ gh: faux({ view: [{ number: 7, state: "MERGED" }] }).gh, T });
  assert.deepEqual([r.code, r.message], [0, "[pr-watch] PR #7 fusionnée."]);
  r = await watch({ gh: faux({ view: [{ number: 7, state: "CLOSED" }] }).gh, T });
  assert.equal(r.code, 1);
});

test("QUA-100 suivi de PR : attend la fin des contrôles en cours, puis la fusion programmée", async () => {
  const { gh, appels } = faux({
    view: [OUVERTE, OUVERTE, { number: 7, state: "MERGED" }],
    checks: [[{ name: "checks", bucket: "pending" }], [{ name: "checks", bucket: "pending" }]],
  });
  const attentes = [];
  const journal = [];
  const r = await watch({ pr: "7", gh, sleep: async (ms) => attentes.push(ms), interval: 5, log: (m) => journal.push(m), T: texts(tmp()) });
  assert.equal(r.code, 0);
  assert.match(r.message, /fusionnée/);
  assert.deepEqual(attentes, [5, 5]);
  assert.match(journal[0], /PR #7 : 1 contrôle\(s\) en cours/);
  assert.equal(appels[0], "pr view 7 --json number,state");
  // Attente réelle (minuterie par défaut) et journal par défaut.
  const r2 = await watch({
    gh: faux({ view: [OUVERTE], checks: [[{ name: "c", bucket: "pending" }], [{ name: "c", bucket: "pass" }]] }).gh,
    interval: 1,
    T: texts(tmp()),
  });
  assert.equal(r2.code, 0);
});

test("QUA-100 suivi de PR : sans gh, sans contrôle ou après le délai, « non exécuté », jamais « verte » (QUA-013)", async () => {
  const T = texts(tmp());
  let r = await watch({ gh: () => null, T });
  assert.deepEqual(
    [r.code, r.message],
    [2, "[pr-watch] suivi non exécuté : gh injoignable ou non connecté (gh auth login), ou aucune PR pour cette branche"],
  );
  r = await watch({ gh: faux({ view: [OUVERTE], checks: [null] }).gh, T });
  assert.equal(r.code, 2);
  r = await watch({ gh: faux({ view: [OUVERTE], checks: [[]] }).gh, T });
  assert.deepEqual([r.code, r.message], [2, "[pr-watch] suivi non exécuté : aucun contrôle de CI sur la PR #7"]);
  let t = 0;
  r = await watch({
    gh: faux({ view: [OUVERTE], checks: [[{ name: "c", bucket: "pending" }]] }).gh,
    timeout: 1,
    now: () => t,
    sleep: async () => {
      t += 61_000;
    },
    T,
  });
  assert.deepEqual(
    [r.code, r.message],
    [2, "[pr-watch] suivi non exécuté : délai de 1 min dépassé, contrôles encore en cours sur la PR #7"],
  );
});

test("QUA-100 suivi de PR : lecture de gh, langue, arguments", () => {
  const run =
    (out, status = 0) =>
    () => ({ status, stdout: out });
  assert.deepEqual(ghJson(["x"], run('{"a":1}')), { a: 1 });
  assert.deepEqual(
    ghJson(["x"], run('[{"bucket":"pending"}]', 8)),
    [{ bucket: "pending" }],
    "gh pr checks sort en 8 tant que c'est en cours",
  );
  assert.equal(ghJson(["x"], run("", 1)), null);
  assert.equal(ghJson(["x"], run("pas du json")), null);
  const en = tmp();
  mkdirSync(join(en, ".drwil"));
  writeFileSync(join(en, ".drwil", "ia-first.json"), JSON.stringify({ lang: "en" }));
  assert.match(texts(en).green, /CI green/);
  const fr = tmp();
  mkdirSync(join(fr, ".drwil"));
  writeFileSync(join(fr, ".drwil", "ia-first.json"), JSON.stringify({ lang: "fr" }));
  assert.match(texts(fr).green, /CI verte/);
  assert.deepEqual(parseArgs([]), { pr: undefined, timeout: 30 });
  assert.deepEqual(parseArgs(["12", "--timeout", "5"]), { pr: "12", timeout: 5 });
  assert.deepEqual(parseArgs(["--timeout", "abc"]), { pr: undefined, timeout: 30 });
  assert.deepEqual(
    look(undefined, () => null),
    { state: "not-run" },
  );
});

const posix = { skip: process.platform === "win32" ? "gh factice en script sh" : false };

test("QUA-100 suivi de PR : en ligne de commande, code de sortie 0 fusionnée, 1 rouge", posix, () => {
  const outils = tmp();
  const node = spawnSync("which", ["node"], { encoding: "utf8" }).stdout.trim();
  const lancer = (corps, env = {}) => {
    writeFileSync(join(outils, "gh"), `#!/bin/sh\n${corps}\n`);
    chmodSync(join(outils, "gh"), 0o755);
    return spawnSync(node, [SCRIPT, "7"], {
      cwd: tmp(),
      encoding: "utf8",
      env: { ...process.env, ...env, PATH: `${outils}:${process.env.PATH}` },
    });
  };
  let r = lancer(`echo '{"number":7,"state":"MERGED"}'`);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /PR #7 fusionnée/);
  r = lancer(`case "$2" in view) echo '{"number":7,"state":"OPEN"}' ;; *) echo '[{"name":"checks","bucket":"fail"}]' ;; esac`, {
    DRWIL_PR_WATCH_INTERVAL: "1",
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /CI rouge — en échec : checks/);
});
