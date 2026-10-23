import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lireCodeowners, verifier } from "./verifier-codeowners.mjs";

const SCRIPT = fileURLToPath(new URL("./verifier-codeowners.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

/** Un dépôt git factice, chaque fichier suivi (`git add`), sauf `nonSuivis`. */
function depot(fichiers, nonSuivis = {}) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-codeowners-"));
  dossiers.push(racine);
  const ecrire = (chemin, contenu) => {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  };
  for (const [chemin, contenu] of Object.entries(fichiers)) ecrire(chemin, contenu);
  for (const args of [
    ["init", "-q"],
    ["add", "-A"],
  ])
    assert.equal(spawnSync("git", args, { cwd: racine }).status, 0);
  for (const [chemin, contenu] of Object.entries(nonSuivis)) ecrire(chemin, contenu);
  return racine;
}
const lancer = (racine) => spawnSync(process.execPath, [SCRIPT, racine], { encoding: "utf8" });

const suivis = [".githooks/pre-commit", "docs/contracts.md", "docs/recipes/a.md", "src/app/index.mjs", "README.md"];
const juger = (texte) => verifier(lireCodeowners(texte), suivis);

test("QUA-112 : un fichier et un dossier suivis, ancrés par /, sont acceptés", () => {
  assert.deepEqual(juger("/docs/contracts.md @moi\n/.githooks/ @moi\n/docs/recipes/ @moi\n"), []);
});

test("QUA-112 : un chemin absent est refusé, avec sa ligne", () => {
  const problemes = juger("# commentaire\n\n/docs/contrats.md @moi\n/docs/contracts.md @moi\n");
  assert.equal(problemes.length, 1);
  assert.match(problemes[0], /ligne 3/);
  assert.match(problemes[0], /\/docs\/contrats\.md/);
});

test("QUA-112 : un dossier absent, ou un fichier cité comme dossier, est refusé", () => {
  assert.equal(juger("/absent/ @moi\n").length, 1);
  assert.equal(juger("/README.md/ @moi\n").length, 1);
});

test("QUA-112 : motifs GitHub — non ancré à toute profondeur, `*` dans un segment, `**` sur plusieurs", () => {
  assert.deepEqual(juger("contracts.md @moi\napp/ @moi\n*.md @moi\n/docs/*.md @moi\n/src/**/index.mjs @moi\n* @moi\n"), []);
  assert.equal(juger("/*.txt @moi\n").length, 1);
  assert.equal(juger("/src/*.mjs @moi\n").length, 1, "`*` ne traverse pas un dossier");
  assert.equal(juger("absent.md @moi\n").length, 1);
});

test("QUA-112 : un motif que le contrôle ne sait pas interpréter est une erreur, jamais un succès", () => {
  for (const motif of ["/docs/contract?.md", "/docs/[ab].md", "!/docs/contracts.md", "/docs/a\\ b.md"]) {
    const problemes = juger(`${motif} @moi\n`);
    assert.equal(problemes.length, 1, motif);
    assert.match(problemes[0], /non interprété/, motif);
  }
});

test("QUA-112 : un fichier présent mais non suivi par Git ne suffit pas", () => {
  const racine = depot({ ".github/CODEOWNERS": "/local.md @moi\n" }, { "local.md": "x\n" });
  const r = lancer(racine);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /\/local\.md/);
});

test("QUA-112 : en ligne de commande, CODEOWNERS juste passe, chemin absent échoue", () => {
  const bon = depot({ ".github/CODEOWNERS": "/docs/contracts.md @moi\n", "docs/contracts.md": "# C\n" });
  const ok = lancer(bon);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const mauvais = depot({ ".github/CODEOWNERS": "/docs/contrats.md @moi\n", "docs/contracts.md": "# C\n" });
  assert.equal(lancer(mauvais).status, 1);
});

test("QUA-112 : CODEOWNERS absent, ou dépôt git illisible, est une erreur (contrôle non exécuté)", () => {
  const sansFichier = depot({ "a.md": "a\n" });
  assert.equal(lancer(sansFichier).status, 1);
  const horsGit = mkdtempSync(join(tmpdir(), "drwil-codeowners-"));
  dossiers.push(horsGit);
  mkdirSync(join(horsGit, ".github"));
  writeFileSync(join(horsGit, ".github", "CODEOWNERS"), "/a.md @moi\n");
  writeFileSync(join(horsGit, "a.md"), "a\n");
  const r = lancer(horsGit);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /git/);
});

test("QUA-112 : le CODEOWNERS du dépôt cite le registre sous son nom actuel", () => {
  const racine = fileURLToPath(new URL("..", import.meta.url));
  const r = lancer(racine);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
