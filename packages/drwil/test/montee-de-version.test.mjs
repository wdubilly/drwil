// Montée de version sûre : `init` refuse la mauvaise version, la montée ne laisse aucun `.bak` (QUA-282).
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "../dist/index.js";
import { engineVersion } from "../dist/install-record.js";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];
const env = { ...process.env, CI: "", DRWIL_HOOK: "" };
const BIN = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));

let dossiers = [];
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-montee-"));
  dossiers.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dossiers) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

const silence = async (fn) => {
  const [log, warn] = [console.log, console.warn];
  console.log = console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
    console.warn = warn;
  }
};
const git = (dir, ...args) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, encoding: "utf8", env });
const cli = (dir, ...args) => spawnSync(process.execPath, [BIN, ...args], { cwd: dir, encoding: "utf8", env });
const enregistrer = (dir, version) =>
  writeFileSync(join(dir, ".drwil/install.json"), JSON.stringify({ format: 1, version, firstVersion: version }));

async function projetEquipe() {
  const dir = tmp();
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  return dir;
}

test("QUA-282 : init refuse une version plus ancienne que celle de .drwil/install.json, sans rien écrire", async () => {
  const dir = await projetEquipe();
  enregistrer(dir, "99.0.0");
  const avant = readFileSync(join(dir, ".drwil/install.json"), "utf8");
  const r = cli(dir, "init", "--no-git", "--tools", "claude");
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, /Montée refusée, rien n'a été modifié.*99\.0\.0.*plus ancienne.*npx drwil@99\.0\.0 init.*--allow-older/s);
  assert.equal(readFileSync(join(dir, ".drwil/install.json"), "utf8"), avant);
});

test("QUA-282 : l'option --allow-older passe outre ; sans enregistrement ou version égale ou plus récente, aucun refus", async () => {
  const dir = await projetEquipe();
  enregistrer(dir, "99.0.0");
  assert.equal(cli(dir, "init", "--no-git", "--tools", "claude", "--allow-older").status, 0);
  assert.equal(JSON.parse(readFileSync(join(dir, ".drwil/install.json"), "utf8")).version, engineVersion());
  assert.equal(cli(dir, "init", "--no-git", "--tools", "claude").status, 0, "version égale");
  enregistrer(dir, "0.0.1");
  assert.equal(cli(dir, "init", "--no-git", "--tools", "claude").status, 0, "version plus récente");
  rmSync(join(dir, ".drwil/install.json"));
  assert.equal(cli(dir, "init", "--no-git", "--tools", "claude").status, 0, "sans enregistrement");
});

test("QUA-282 : --target-version refuse une version différente de celle de la commande", async () => {
  const dir = await projetEquipe();
  const r = cli(dir, "init", "--no-git", "--tools", "claude", "--target-version", "99.0.0");
  assert.equal(r.status, 1);
  assert.match(r.stderr, new RegExp(`la version visée est 99\\.0\\.0 et cette commande est en ${engineVersion().replaceAll(".", "\\.")}`));
  assert.equal(cli(dir, "init", "--no-git", "--tools", "claude", "--target-version", engineVersion()).status, 0);
});

test("QUA-282 : la montée vers la version courante, commitée sur sa branche, ne laisse aucun .bak", async () => {
  const dir = tmp();
  git(dir, "init", "-q", "-b", "master");
  git(dir, "config", "core.autocrlf", "false");
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  enregistrer(dir, "0.0.1");
  assert.equal(git(dir, "add", "-A").status, 0);
  assert.equal(git(dir, "commit", "-q", "-m", "kit ancien").status, 0);
  const r = cli(dir, "init", "--tools", "claude");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(dir, "symbolic-ref", "--short", "HEAD").stdout.trim(), "workstream/kit-update");
  assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "");
  const suivis = git(dir, "ls-files").stdout.split("\n");
  assert.deepEqual(
    suivis.filter((f) => f.endsWith(".bak")),
    [],
  );
  assert.deepEqual(
    readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith(".bak")),
    [],
  );
});
