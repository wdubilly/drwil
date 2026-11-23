// Tests du paquet, formatage vérifié avant commit (QUA-328, QUA-329) : ce que livre `drwil init`, ce que garde une
// mise à jour, ce que propose l'adoption. Hors des fichiers `kit-*.test.mjs`, dont QUA-315 fige la liste des tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { init } from "../dist/index.js";
import { tmp, quiet, git, read, config, envTest, GABARIT, DEPOT } from "./kit-commun.mjs";

const FORMATEUR = `let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>process.stdout.write(s.replace(/[ \\t]+$/gm,"")));`;
const ecrireConfig = (dir, cfg) => writeFileSync(join(dir, ".drwil/ia-first.json"), `${JSON.stringify(cfg, null, 2)}\n`);

async function projet(lang = "fr") {
  const dir = tmp();
  git(dir, "init", "-q", "-b", "master");
  git(dir, "config", "core.autocrlf", "false");
  await quiet(() => init({ lang, targetDir: dir, name: "demo", git: false }));
  return dir;
}

test("QUA-328 : le pre-commit livré refuse un fichier indexé non formaté, avec la commande et le fichier, sans rien modifier", async () => {
  const dir = await projet();
  assert.ok(existsSync(join(dir, ".githooks/format-staged.mjs")));
  assert.match(read(dir, ".githooks/pre-commit"), /format-staged\.mjs/);
  writeFileSync(join(dir, "fmt.cjs"), FORMATEUR);
  ecrireConfig(dir, { ...config(dir), format: { stdin: "node fmt.cjs {file}", write: "npx fmt --write", paths: ["src/**"] } });
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src/a.js"), "const a = 1;  \n");
  git(dir, "add", "src/a.js");
  const r = spawnSync("sh", [".githooks/pre-commit"], { cwd: dir, encoding: "utf8", env: envTest });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /npx fmt --write "src\/a\.js" && git add "src\/a\.js"/);
  assert.equal(read(dir, "src/a.js"), "const a = 1;  \n");
  assert.equal(git(dir, "show", ":src/a.js").stdout, "const a = 1;  \n");
});

test("QUA-329 : une installation neuve n'a pas de clé format, et une mise à jour ne l'ajoute jamais ni ne retire celle de l'adoptant", async () => {
  const dir = await projet();
  assert.equal("format" in config(dir), false);
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-q", "-m", "kit").status, 0);
  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo" }));
  assert.equal("format" in config(dir), false);
  // Un adoptant qui a déclaré son formateur : la mise à jour le garde tel quel.
  const adoptant = await projet();
  const reglage = { stdin: "npx --no-install prettier --stdin-filepath {file}", write: "npx prettier --write", paths: ["src/**"] };
  ecrireConfig(adoptant, { ...config(adoptant), format: reglage });
  git(adoptant, "add", "-A");
  assert.equal(git(adoptant, "commit", "-q", "-m", "kit et clé format").status, 0);
  await quiet(() => init({ lang: "fr", targetDir: adoptant, name: "demo" }));
  assert.deepEqual(config(adoptant).format, reglage);
});

test("QUA-329 : l'adoption propose la clé format (commande sur l'entrée standard, commande d'écriture, chemins), gabarit et copie du dépôt", () => {
  for (const chemin of [
    join(GABARIT, "tools/claude/.claude/skills/adopt-the-kit/SKILL.md"),
    join(DEPOT, ".claude/skills/adopt-the-kit/SKILL.md"),
  ]) {
    const texte = readFileSync(chemin, "utf8");
    assert.match(texte, /"format"/, chemin);
    assert.match(texte, /stdin/, chemin);
    assert.match(texte, /write/, chemin);
    assert.match(texte, /never (added|enabled) by an update/i, chemin);
  }
});
