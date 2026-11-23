// Tests de la vérification du formatage au commit (QUA-328, QUA-329) : le vrai hook pre-commit, son module
// format-staged.mjs, et un run-checks.mjs factice (le moteur est éprouvé ailleurs) dans un dépôt temporaire.
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];
const ENV = { ...process.env };
delete ENV.DRWIL_HOOK;

const ICI = fileURLToPath(new URL(".", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

// Formateur factice : lit le contenu sur l'entrée standard et le rend sans espaces en fin de ligne.
const FORMATEUR = `let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>process.stdout.write(s.replace(/[ \\t]+$/gm,"")));`;
const FORMAT = { stdin: "node fmt.cjs {file}", write: "npx fmt --write", paths: ["src/**"] };

/** Dépôt git temporaire équipé du vrai pre-commit et du module ; run-checks.mjs factice qui laisse une trace. */
function depot(reglages = {}) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-format-"));
  dossiers.push(racine);
  mkdirSync(join(racine, ".githooks"));
  mkdirSync(join(racine, ".drwil"));
  mkdirSync(join(racine, "src"));
  for (const f of ["pre-commit", "format-staged.mjs", "glob.mjs"]) copyFileSync(join(ICI, f), join(racine, ".githooks", f));
  writeFileSync(
    join(racine, ".githooks/run-checks.mjs"),
    'import { writeFileSync } from "node:fs";\nwriteFileSync("checks-lances", "oui");\n',
  );
  writeFileSync(join(racine, ".drwil/ia-first.json"), JSON.stringify({ lang: "fr", ...reglages }));
  writeFileSync(join(racine, "fmt.cjs"), FORMATEUR);
  writeFileSync(join(racine, ".gitignore"), "checks-lances\n");
  git(racine, "init", "-q", "-b", "master");
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "base");
  git(racine, "config", "core.hooksPath", ".githooks");
  return racine;
}
function git(dir, ...args) {
  return spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, encoding: "utf8", env: ENV });
}
const lire = (dir, f) => readFileSync(join(dir, f), "utf8");
const indexe = (dir, f) => git(dir, "show", `:${f}`).stdout;
const tete = (dir) => git(dir, "rev-parse", "HEAD").stdout.trim();

test("QUA-328 : un fichier indexé non formaté refuse le commit, nomme la commande exacte et les fichiers, ne modifie rien", () => {
  const dir = depot({ format: FORMAT });
  writeFileSync(join(dir, "src/a.js"), "const a = 1;   \n");
  writeFileSync(join(dir, "src/b.js"), "const b = 2;\n");
  git(dir, "add", "-A");
  const avant = tete(dir);
  const r = git(dir, "commit", "-m", "essai");
  assert.notEqual(r.status, 0);
  const sortie = r.stdout + r.stderr;
  assert.match(sortie, /npx fmt --write "src\/a\.js"/);
  assert.match(sortie, /src\/a\.js/);
  assert.doesNotMatch(sortie, /src\/b\.js/);
  assert.match(sortie, /rien n'a été modifié/);
  assert.equal(tete(dir), avant);
  assert.equal(lire(dir, "src/a.js"), "const a = 1;   \n");
  assert.equal(indexe(dir, "src/a.js"), "const a = 1;   \n");
  assert.equal(git(dir, "status", "--porcelain").stdout.includes("?? src"), false);
});

test("QUA-328 : un fichier indexé formaté laisse passer le commit, et les contrôles du projet sont lancés", () => {
  const dir = depot({ format: FORMAT });
  writeFileSync(join(dir, "src/a.js"), "const a = 1;\n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-m", "essai");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(lire(dir, "checks-lances"), "oui");
});

test("QUA-328 : seul l'index est jugé — copie de travail formatée mais index non formaté : refusé ; l'inverse : accepté", () => {
  const dir = depot({ format: FORMAT });
  writeFileSync(join(dir, "src/a.js"), "const a = 1;   \n");
  git(dir, "add", "-A");
  writeFileSync(join(dir, "src/a.js"), "const a = 1;\n");
  assert.notEqual(git(dir, "commit", "-m", "essai").status, 0);
  assert.equal(lire(dir, "src/a.js"), "const a = 1;\n");
  git(dir, "add", "-A");
  writeFileSync(join(dir, "src/a.js"), "const a = 1;   \n");
  const r = git(dir, "commit", "-m", "essai");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(lire(dir, "src/a.js"), "const a = 1;   \n");
});

test("QUA-328 : un fichier hors des chemins déclarés ou supprimé n'est pas jugé", () => {
  const dir = depot({ format: FORMAT });
  writeFileSync(join(dir, "src/a.js"), "const a = 1;\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "a");
  writeFileSync(join(dir, "notes.txt"), "fin de ligne   \n");
  git(dir, "rm", "-q", "src/a.js");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-m", "essai");
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("QUA-328 : formateur absent : commit refusé, avec la commande introuvable", () => {
  const dir = depot({ format: { ...FORMAT, stdin: "formateur-inexistant-drwil {file}" } });
  writeFileSync(join(dir, "src/a.js"), "const a = 1;\n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-m", "essai");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /Formateur absent ou en échec.*formateur-inexistant-drwil/s);
});

test("QUA-328 : un formateur qui sort sans rien écrire (npx sans le paquet) refuse le commit comme absent, jamais comme non formaté", () => {
  const dir = depot({ format: { ...FORMAT, stdin: "node -e 0 {file}" } });
  writeFileSync(join(dir, "src/a.js"), "const a = 1;\n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-m", "essai");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /Formateur absent ou en échec/);
  assert.doesNotMatch(r.stdout + r.stderr, /non formaté/);
});

test("QUA-328 : une clé format incomplète refuse le commit et dit ce qui manque ; en anglais si le projet l'est", () => {
  const dir = depot({ lang: "en", format: { stdin: "node fmt.cjs {file}" } });
  writeFileSync(join(dir, "src/a.js"), "const a = 1;\n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-m", "essai");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /"format" key.*write.*paths/s);
});

test("QUA-329 : sans clé format, le commit est inchangé : rien n'est jugé, aucun message, les contrôles sont lancés", () => {
  const dir = depot();
  writeFileSync(join(dir, "src/a.js"), "const a = 1;   \n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-m", "essai");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.stderr.includes("Format"), false);
  assert.equal(lire(dir, "checks-lances"), "oui");
});

// Vérificateur factice en un appel (`check`) : note ses fichiers dans .git/appels, sort en 1 si l'un n'est pas formaté.
const VERIFICATEUR = `const fs=require("fs");const f=process.argv.slice(2);fs.appendFileSync(".git/appels",f.join(" ")+"\\n");console.log("Checked "+f.length);process.exit(f.some((x)=>/[ \\t]$/m.test(fs.readFileSync(x,"utf8")))?1:0);`;
const appels = (dir) => lire(dir, ".git/appels").trim().split("\n");

test("QUA-328 : avec `check`, les fichiers indexés formatés sont jugés en un seul appel, sans un appel par fichier", () => {
  const dir = depot({ format: { ...FORMAT, stdin: "formateur-inexistant-drwil {file}", check: "node chk.cjs" } });
  writeFileSync(join(dir, "chk.cjs"), VERIFICATEUR);
  for (const n of ["a", "b", "c"]) writeFileSync(join(dir, `src/${n}.js`), `const ${n} = 1;\n`);
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-m", "essai");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(appels(dir), ["src/a.js src/b.js src/c.js"]);
});

test("QUA-328 : avec `check`, un fichier non formaté est nommé seul par le jugement fichier par fichier, rien n'est modifié", () => {
  const dir = depot({ format: { ...FORMAT, check: "node chk.cjs" } });
  writeFileSync(join(dir, "chk.cjs"), VERIFICATEUR);
  writeFileSync(join(dir, "src/a.js"), "const a = 1;   \n");
  writeFileSync(join(dir, "src/b.js"), "const b = 2;\n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-m", "essai");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /npx fmt --write "src\/a\.js" && git add "src\/a\.js"/);
  assert.doesNotMatch(r.stdout + r.stderr, /src\/b\.js/);
  assert.equal(lire(dir, "src/a.js"), "const a = 1;   \n");
});

test("QUA-328 : un `check` muet (npx sans le paquet) ne vaut pas accord, et un fichier dont la copie diffère de l'index est jugé dans l'index", () => {
  const dir = depot({ format: { ...FORMAT, check: "node -e 0" } });
  writeFileSync(join(dir, "src/a.js"), "const a = 1;   \n");
  git(dir, "add", "-A");
  assert.match(git(dir, "commit", "-m", "essai").stderr, /src\/a\.js/, "check muet : jugé fichier par fichier");
  writeFileSync(join(dir, "chk.cjs"), VERIFICATEUR);
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ lang: "fr", format: { ...FORMAT, check: "node chk.cjs" } }));
  writeFileSync(join(dir, "src/a.js"), "const a = 1;\n"); // copie formatée, index non formaté
  assert.notEqual(git(dir, "commit", "-m", "essai").status, 0);
  assert.equal(lire(dir, "src/a.js"), "const a = 1;\n");
});

test("QUA-328 : une clé `check` qui n'est pas une chaîne rend la clé format incomplète", () => {
  const dir = depot({ format: { ...FORMAT, check: ["node", "chk.cjs"] } });
  writeFileSync(join(dir, "src/a.js"), "const a = 1;\n");
  git(dir, "add", "-A");
  assert.match(git(dir, "commit", "-m", "essai").stderr, /incomplète/);
});
