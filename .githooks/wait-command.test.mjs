import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exec, launch, parseArgs, read, texts, waitFor } from "./wait-command.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "wait-command.mjs");
const tmp = () => mkdtempSync(join(tmpdir(), "drwil-wait-"));
const dormir = (s) => `node -e "setTimeout(() => {}, ${s * 1000})"`;
const T = texts(tmp());

test("QUA-219 : la commande tourne en fond et son verdict est lu, réussite comme échec", async () => {
  const root = tmp();
  const ok = await waitFor({ root, command: `${dormir(1)} && echo fini`, wait: 15, interval: 50 });
  assert.equal(ok.code, 0);
  assert.match(ok.message, /réussie/);
  const ko = await waitFor({ root, command: "echo secret-affiché && exit 4", wait: 15, interval: 50 });
  assert.equal(ko.code, 1);
  assert.match(ko.message, /code 4/);
  const [, log] = ko.message.match(/Sortie : (.+)$/);
  assert.match(readFileSync(log, "utf8"), /secret-affiché/);
  assert.doesNotMatch(ko.message, /secret-affiché/);
});

test("QUA-219 : le verdict ne contient que le code de sortie, jamais la sortie", async () => {
  const root = tmp();
  const command = "echo sortie-longue && exit 0";
  await waitFor({ root, command, wait: 15, interval: 50, status: true }); // rien à lire encore
  launch(root, command);
  for (let i = 0; i < 100 && read(root, command).state !== "done"; i++) await new Promise((r) => setTimeout(r, 50));
  const dossier = join(root, ".drwil", "evidence", "wait");
  const verdict = readdirSync(dossier).find((f) => f.endsWith(".json"));
  assert.deepEqual(JSON.parse(readFileSync(join(dossier, verdict), "utf8")), { exit: 0 });
});

test("QUA-219 : un verdict livré est consommé : l'appel suivant rejoue la commande", async () => {
  const root = tmp();
  const trace = join(root, "trace");
  const command = `echo x >> "${trace}"`;
  for (let i = 0; i < 2; i++) assert.equal((await waitFor({ root, command, wait: 15, interval: 50 })).code, 0);
  assert.equal(readFileSync(trace, "utf8"), "x\nx\n");
});

test("QUA-219 : une commande tuée par un signal est un échec, pas une réussite", async () => {
  const r = await waitFor({ root: tmp(), command: "kill -9 $$", wait: 15, interval: 50 });
  assert.equal(r.code, 1);
});

test("QUA-220 : l'attente trop courte dit « toujours en cours » sans tuer la commande", async () => {
  const root = tmp();
  const command = `${dormir(3)} && echo x > "${join(root, "fin")}"`;
  const debut = Date.now();
  const r = await waitFor({ root, command, wait: 1, interval: 50 });
  assert.equal(r.code, 3);
  assert.match(r.message, /toujours en cours/);
  assert.ok(Date.now() - debut < 2500);
  assert.equal((await waitFor({ root, command, wait: 0, status: true })).code, 3);
  assert.equal((await waitFor({ root, command, wait: 15, interval: 50 })).code, 0);
  assert.ok(existsSync(join(root, "fin")));
});

test("QUA-220 : un second lancement ne duplique pas la commande en cours", async () => {
  const root = tmp();
  const trace = join(root, "trace");
  const command = `echo x >> "${trace}" && ${dormir(2)}`;
  assert.equal((await waitFor({ root, command, wait: 0 })).code, 3);
  assert.equal((await waitFor({ root, command, wait: 0 })).code, 3);
  assert.equal((await waitFor({ root, command, wait: 15, interval: 50 })).code, 0);
  assert.equal(readFileSync(trace, "utf8"), "x\n");
});

test("QUA-220 : plusieurs appels rattachés à la même commande reçoivent tous son verdict, sans planter", async () => {
  for (const [fin, code, motif] of [
    ["exit 0", 0, /réussie/],
    ["exit 4", 1, /code 4/],
  ]) {
    const root = tmp();
    const trace = join(root, "trace");
    const command = `echo x >> "${trace}" && ${dormir(1)} && ${fin}`;
    assert.equal((await waitFor({ root, command, wait: 0 })).code, 3);
    // Le premier consomme le verdict ; les suivants, rattachés pendant l'exécution, le lisent quand même.
    const [a, b] = await Promise.all([
      waitFor({ root, command, wait: 15, interval: 50 }),
      waitFor({ root, command, wait: 15, interval: 80 }),
    ]);
    for (const r of [a, b]) {
      assert.equal(r.code, code, r.message);
      assert.match(r.message, motif);
    }
    assert.equal(readFileSync(trace, "utf8"), "x\n");
    // Le verdict reste consommé : l'appel suivant rejoue la commande.
    assert.equal((await waitFor({ root, command, wait: 15, interval: 50 })).code, code);
    assert.equal(readFileSync(trace, "utf8"), "x\nx\n");
  }
});

test("QUA-220 : une exécution dont toute trace disparaît pendant l'attente est dite interrompue, pas réussie ni échouée", async () => {
  const root = tmp();
  const command = dormir(2);
  const attente = waitFor({ root, command, wait: 15, interval: 50 });
  await new Promise((r) => setTimeout(r, 300));
  rmSync(join(root, ".drwil", "evidence", "wait"), { recursive: true, force: true });
  const r = await attente;
  assert.equal(r.code, 2, r.message);
  assert.match(r.message, /interrompue/);
});

test("QUA-220 : --status ne lance rien et lit sans consommer ; une exécution morte sans verdict est dite interrompue", async () => {
  const root = tmp();
  const command = "echo x";
  assert.equal((await waitFor({ root, command, wait: 0, status: true })).code, 2);
  assert.match((await waitFor({ root, command, wait: 0, status: true })).message, /aucune exécution/);
  await waitFor({ root, command, wait: 15, interval: 50 });
  launch(root, command);
  for (let i = 0; i < 100 && read(root, command).state !== "done"; i++) await new Promise((r) => setTimeout(r, 50));
  for (let i = 0; i < 2; i++) assert.equal((await waitFor({ root, command, wait: 0, status: true })).code, 0);
  const dossier = join(root, ".drwil", "evidence", "wait");
  const verdict = readdirSync(dossier).find((f) => f.endsWith(".json"));
  const pid = join(dossier, verdict.replace(".json", ".pid"));
  const rmVerdict = spawnSync(process.execPath, ["-e", `require("fs").rmSync(${JSON.stringify(join(dossier, verdict))})`]);
  assert.equal(rmVerdict.status, 0);
  writeFileSync(pid, "999999999");
  const r = await waitFor({ root, command, wait: 0, status: true });
  assert.equal(r.code, 2);
  assert.match(r.message, /interrompue/);
  const relance = await waitFor({ root, command, wait: 15, interval: 50 });
  assert.equal(relance.code, 0);
});

test("QUA-220 : sans commande, l'usage est dit (code 2)", async () => {
  const r = await waitFor({ root: tmp(), command: "", wait: 1 });
  assert.equal(r.code, 2);
  assert.match(r.message, /usage/);
});

test("QUA-220 : la ligne de commande : attente, statut, repli de l'attente invalide", () => {
  assert.deepEqual(parseArgs(["npm", "test"]), { wait: 100, status: false, command: "npm test" });
  assert.deepEqual(parseArgs(["--wait", "5", "--status", "a", "b"]), { wait: 5, status: true, command: "a b" });
  assert.equal(parseArgs(["--wait", "abc", "a"]).wait, 100);
  assert.equal(parseArgs(["--wait", "-3", "a"]).wait, 100);
});

test("QUA-220 : la commande du kit rend le verdict par ses codes de sortie", () => {
  const root = tmp();
  const lance = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: "utf8" });
  const ok = lance("--wait", "15", "echo", "ok");
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /réussie/);
  const ko = lance("--wait", "15", "exit 5");
  assert.equal(ko.status, 1);
  assert.match(ko.stderr, /code 5/);
  assert.equal(lance().status, 2);
});

test("QUA-220 : les messages suivent la langue du projet", () => {
  const root = tmp();
  mkdirSync(join(root, ".drwil"));
  writeFileSync(join(root, ".drwil", "ia-first.json"), JSON.stringify({ lang: "en" }));
  assert.match(texts(root).passed, /finished/);
  writeFileSync(join(root, ".drwil", "ia-first.json"), JSON.stringify({ lang: "fr" }));
  assert.match(texts(root).passed, /terminée/);
  assert.match(T.passed, /terminée/);
});

test("QUA-221 : la consigne du sous-agent impose le script et run_in_background, et interdit la boucle pgrep", () => {
  for (const f of [
    join(HERE, "..", ".claude", "agents", "drwil-checks.md"),
    join(HERE, "..", "packages", "drwil", "templates", "common", "tools", "claude", ".claude", "agents", "drwil-checks.md"),
  ]) {
    const texte = readFileSync(f, "utf8");
    assert.match(texte, /wait-command\.mjs/);
    assert.match(texte, /run_in_background/);
    assert.match(texte, /Never wait[^`]*`while pgrep/);
  }
});

test("QUA-219 : le runner écrit son verdict à l'appel direct", async () => {
  const root = tmp();
  mkdirSync(join(root, ".drwil", "evidence", "wait"), { recursive: true });
  exec(root, "exit 0");
  for (let i = 0; i < 100 && read(root, "exit 0").state !== "done"; i++) await new Promise((r) => setTimeout(r, 50));
  assert.equal(read(root, "exit 0").state, "done");
});
