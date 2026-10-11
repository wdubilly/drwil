import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { correspond, homologues, principal, verifier } from "./verifier-miroirs.mjs";

const SCRIPT = fileURLToPath(new URL("./verifier-miroirs.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

const G = "packages/drwil/templates";
/** Un dépôt factice : gabarit et copies installées. */
function depot(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-miroirs-"));
  dossiers.push(racine);
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  return racine;
}
const base = {
  [`${G}/common/base/.githooks/a.mjs`]: "a\n",
  [`${G}/common/base/gitignore`]: "node_modules/\n",
  [`${G}/fr/base/docs/recettes/r.md`]: "# R\n",
  [`${G}/en/base/docs/recipes/r.md`]: "# R (en)\n",
  [`${G}/common/tools/claude/.claude/settings.json`]: "{}\n",
  [`${G}/fr/tools/cursor/.cursor/rules/x.mdc`]: "x\n",
  [`${G}/common/ci/github/.github/workflows/ia-first.yml`]: "ci\n",
  [`${G}/common/optional/module/outil.mjs`]: "outil\n",
  [`${G}/common/optional/module/README.md`]: "pas installé\n",
  ".githooks/a.mjs": "a\n",
  ".gitignore": "node_modules/\n",
  "docs/recettes/r.md": "# R\n",
  ".claude/settings.json": "{}\n",
  ".github/workflows/ia-first.yml": "ci\n",
  ".githooks/outil.mjs": "outil\n",
};

test("homologues : chemins installés, dossier d'outil ou de CI retiré, gitignore renommé, modules optionnels dans .githooks/", () => {
  const carte = homologues(depot(base));
  assert.equal(carte.get(".githooks/a.mjs"), `${G}/common/base/.githooks/a.mjs`);
  assert.equal(carte.get(".gitignore"), `${G}/common/base/gitignore`);
  assert.equal(carte.get("docs/recettes/r.md"), `${G}/fr/base/docs/recettes/r.md`);
  assert.equal(carte.get(".claude/settings.json"), `${G}/common/tools/claude/.claude/settings.json`);
  assert.equal(carte.get(".cursor/rules/x.mdc"), `${G}/fr/tools/cursor/.cursor/rules/x.mdc`);
  assert.equal(carte.get(".github/workflows/ia-first.yml"), `${G}/common/ci/github/.github/workflows/ia-first.yml`);
  assert.equal(carte.get(".githooks/outil.mjs"), `${G}/common/optional/module/outil.mjs`);
  assert.equal(carte.has("README.md"), false);
  assert.equal(carte.has("docs/recipes/r.md"), false, "seule la langue du projet");
  assert.equal(homologues(depot(base), "en").get("docs/recipes/r.md"), `${G}/en/base/docs/recipes/r.md`);
  assert.equal(homologues(depot({})).size, 0, "sans gabarit, rien à comparer");
});

test("correspond : identique ; fins de ligne Windows tolérées ; gabarit à variables comparé dans sa forme", () => {
  assert.ok(correspond("a\nb\n", "a\nb\n"));
  assert.ok(correspond("a\r\nb\r\n", "a\nb\n"));
  assert.ok(!correspond("a\nc\n", "a\nb\n"));
  assert.ok(correspond("# Projet — drwil (v1.0)\n", "# Projet — {{projectName}} (v1.0)\n"));
  assert.ok(correspond("x\n- a\n- b\ny\n", "x\n{{liste}}\ny\n"), "une variable peut couvrir plusieurs lignes");
  assert.ok(!correspond("# Autre — drwil\n", "# Projet — {{projectName}}\n"), "le texte hors variables reste exigé");
});

test("verifier : tout identique, fichier non installé ignoré", () => {
  const r = verifier(depot(base));
  assert.deepEqual(r, { compares: 6, problemes: [] }, "x.mdc (Cursor non installé) n'est pas comparé");
});

test("verifier : un écart non déclaré échoue, un écart déclaré avec sa raison passe", () => {
  const racine = depot({ ...base, "docs/recettes/r.md": "# R modifiée\n" });
  const nonDeclare = verifier(racine);
  assert.equal(nonDeclare.problemes.length, 1);
  assert.match(nonDeclare.problemes[0], /^docs\/recettes\/r\.md : diffère de packages\/drwil\/templates\/fr\/base\/docs\/recettes\/r\.md/);
  assert.deepEqual(verifier(racine, { ecarts: { "docs/recettes/r.md": "propre au dépôt" } }).problemes, []);
});

test("verifier : la liste des écarts reste honnête (résolu, sans fichier, sans raison)", () => {
  const racine = depot(base);
  const { problemes } = verifier(racine, { ecarts: { ".githooks/a.mjs": "plus vrai", "inconnu.md": "x", ".gitignore": " " } });
  assert.deepEqual(problemes, [
    ".githooks/a.mjs : écart déclaré mais résolu (retirer sa ligne de outils/miroirs.json)",
    ".gitignore : écart déclaré mais résolu (retirer sa ligne de outils/miroirs.json)",
    "inconnu.md : écart déclaré sans fichier à comparer (retirer sa ligne de outils/miroirs.json)",
    ".gitignore : écart déclaré sans raison",
  ]);
});

test("principal : langue du projet, bilan affiché, liste illisible refusée", () => {
  const journal = { log: [], error: [] };
  const { log, error } = console;
  console.log = (m) => journal.log.push(m);
  console.error = (m) => journal.error.push(m);
  try {
    const ok = depot({ ...base, "outils/miroirs.json": JSON.stringify({ version: 1, ecarts: {} }) });
    assert.equal(principal(ok), 0);
    const en = depot({ ...base, ".drwil/ia-first.json": JSON.stringify({ lang: "en" }), "outils/miroirs.json": "{}", "docs/recipes/r.md": "autre\n" });
    assert.equal(principal(en), 1);
    assert.equal(principal(depot(base)), 1);
  } finally {
    Object.assign(console, { log, error });
  }
  assert.equal(journal.log[0], "miroirs : 6 fichier(s) comparé(s) au gabarit, 0 écart(s) déclaré(s), 0 problème(s)");
  assert.match(journal.error[0], /docs\/recipes\/r\.md : diffère/);
  assert.match(journal.error.at(-1), /^miroirs : outils\/miroirs\.json illisible/);
});

test("ligne de commande : racine en argument, code de sortie", () => {
  const racine = depot({ ...base, "outils/miroirs.json": "{\"ecarts\":{}}", ".githooks/a.mjs": "modifié\n" });
  const r = spawnSync(process.execPath, [SCRIPT, racine], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /✗ \.githooks\/a\.mjs : diffère/);
  // Sans argument : le dossier courant ; langue absente de la configuration : français.
  const ok = depot({ ...base, ".drwil/ia-first.json": "{}", "outils/miroirs.json": "{\"ecarts\":{}}" });
  assert.equal(spawnSync(process.execPath, [SCRIPT], { cwd: ok, encoding: "utf8" }).status, 0);
});
