import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expected, gaps, main } from "./check-architecture.mjs";

const SCRIPT = fileURLToPath(new URL("./check-architecture.mjs", import.meta.url));

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
function projet(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-carte-"));
  dossiers.push(racine);
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  spawnSync("git", ["init", "-q"], { cwd: racine });
  spawnSync("git", ["add", "-A"], { cwd: racine });
  return racine;
}
const lancer = (racine) => {
  const lignes = [];
  return { code: main(racine, (l) => lignes.push(l)), lignes };
};

test("QUA-040 : attendus : dossiers de code sur deux niveaux ; fichiers sous les chemins réglés, tests exclus", () => {
  const suivis = [
    "src/paiement/stripe.ts",
    "src/paiement/stripe.test.ts",
    "src/a/b/c.ts",
    "docs/x.md",
    "outils/x.mjs",
    "outils/x.test.mjs",
    "outils/notes.txt",
  ];
  assert.deepEqual(expected(suivis, { codePrefixes: ["src"] }), ["src/a/", "src/paiement/"]);
  assert.deepEqual(expected(suivis, { codePrefixes: ["src"], architectureMap: { files: ["outils/"] } }), [
    "outils/x.mjs",
    "src/a/",
    "src/paiement/",
  ]);
  assert.deepEqual(expected(["racine.ts"], { extraCodeFiles: ["racine.ts"] }), [], "un fichier à la racine : pas de dossier à citer");
});

test("QUA-040 : cités : un dossier avec ou sans sa barre, un fichier par son chemin ou son nom entre accents graves", () => {
  const carte = "- `src/paiement/` — Stripe\n- `src/a` — module a\n- `x.mjs` — outil\n";
  assert.deepEqual(gaps(carte, ["src/paiement/", "src/a/", "outils/x.mjs", "src/b/", "outils/y.mjs"]), ["src/b/", "outils/y.mjs"]);
});

test("QUA-040 : contrôle : bloquant si newRequirements l'impose, avertissement sinon ; carte absente : rien ; en anglais aussi", () => {
  const fichiers = { "src/paiement/stripe.ts": "", "docs/architecture.md": "# Carte\n" };
  const bloquant = projet({ ...fichiers, ".drwil/ia-first.json": JSON.stringify({ codePrefixes: ["src"], newRequirements: "blocking" }) });
  assert.deepEqual(lancer(bloquant), {
    code: 1,
    lignes: [
      "  ✗ `src/paiement/` absent de la carte docs/architecture.md : l'y ajouter avec son rôle (« `src/paiement/` — … »)",
      "carte d'architecture : 1 élément(s) attendu(s), 1 absent(s)",
    ],
  });
  const anglais = projet({ ...fichiers, ".drwil/ia-first.json": JSON.stringify({ codePrefixes: ["src"], lang: "en" }) });
  const r = lancer(anglais);
  assert.equal(r.code, 0);
  assert.match(r.lignes[0], /^ {2}⚠ `src\/paiement\/` missing from the map docs\/architecture\.md: add it with its role/);
  assert.match(r.lignes[2], /recent requirement, not blocking/);
  assert.deepEqual(lancer(projet({ "src/a.ts": "" })), {
    code: 0,
    lignes: ["carte d'architecture : docs/architecture.md absente, rien à vérifier"],
  });
  assert.deepEqual(lancer(projet({ ".drwil/ia-first.json": JSON.stringify({ lang: "en" }) })).lignes, [
    "architecture map: docs/architecture.md missing, nothing to check",
  ]);
  const reglee = projet({
    "src/a/b.ts": "",
    "carte.md": "`src/a/`",
    ".drwil/ia-first.json": JSON.stringify({ codePrefixes: ["src"], newRequirements: "blocking", architectureMap: { file: "carte.md" } }),
  });
  assert.equal(lancer(reglee).code, 0, "carte réglée et complète");
  assert.equal(lancer(projet({ "docs/architecture.md": "", ".drwil/ia-first.json": "null" })).code, 0, "configuration nulle");
});

test("QUA-040 : ligne de commande, directe ou par un lien symbolique ; hors dépôt git, rien d'attendu", () => {
  const racine = projet({
    "src/a/b.ts": "",
    "docs/architecture.md": "",
    ".drwil/ia-first.json": JSON.stringify({ codePrefixes: ["src"], newRequirements: "blocking" }),
  });
  assert.equal(spawnSync(process.execPath, [SCRIPT], { cwd: racine }).status, 1);
  const lien = join(racine, "lien.mjs");
  symlinkSync(SCRIPT, lien);
  assert.equal(spawnSync(process.execPath, [lien], { cwd: racine }).status, 1);
  const horsGit = mkdtempSync(join(tmpdir(), "drwil-carte-"));
  dossiers.push(horsGit);
  writeFileSync(join(horsGit, "architecture.md"), "");
  mkdirSync(join(horsGit, "docs"));
  writeFileSync(join(horsGit, "docs", "architecture.md"), "");
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: horsGit, encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /0 élément\(s\) attendu\(s\)/);
});
