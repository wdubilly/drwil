import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { correspond, homologues, jobs, principal, verifier } from "./verifier-miroirs.mjs";

const SCRIPT = fileURLToPath(new URL("./verifier-miroirs.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

const G = "packages/drwil/templates";
/** Un dépôt factice : gabarit et copies installées (dépôt git, tout suivi, si `git`). */
function depot(fichiers, { git = false } = {}) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-miroirs-"));
  dossiers.push(racine);
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  if (git) for (const args of [["init", "-q"], ["add", "-A"]]) assert.equal(spawnSync("git", args, { cwd: racine }).status, 0);
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
  const h = (f) => carte.get(f);
  assert.deepEqual(h(".githooks/a.mjs"), { source: `${G}/common/base/.githooks/a.mjs`, unite: "base" });
  assert.deepEqual(h(".gitignore"), { source: `${G}/common/base/gitignore`, unite: "base" });
  assert.deepEqual(h("docs/recettes/r.md"), { source: `${G}/fr/base/docs/recettes/r.md`, unite: "base" });
  assert.deepEqual(h(".claude/settings.json"), { source: `${G}/common/tools/claude/.claude/settings.json`, unite: "tools/claude" });
  assert.deepEqual(h(".cursor/rules/x.mdc"), { source: `${G}/fr/tools/cursor/.cursor/rules/x.mdc`, unite: "tools/cursor" });
  assert.deepEqual(h(".github/workflows/ia-first.yml"), { source: `${G}/common/ci/github/.github/workflows/ia-first.yml`, unite: "ci/github" });
  assert.deepEqual(h(".githooks/outil.mjs"), { source: `${G}/common/optional/module/outil.mjs`, unite: "optional/module" });
  assert.equal(carte.has("README.md"), false);
  assert.equal(carte.has("docs/recipes/r.md"), false, "seule la langue du projet");
  assert.equal(homologues(depot(base), "en").get("docs/recipes/r.md").source, `${G}/en/base/docs/recipes/r.md`);
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
    const ok = depot({ ...base, "outils/miroirs.json": JSON.stringify({ version: 2, ecarts: {}, propresAuDepot: { "outils/": "contrôle" } }) }, { git: true });
    assert.equal(principal(ok), 0);
    const en = depot({ ...base, ".drwil/ia-first.json": JSON.stringify({ lang: "en" }), "outils/miroirs.json": "{}", "docs/recipes/r.md": "autre\n" }, { git: true });
    assert.equal(principal(en), 1);
    assert.equal(principal(depot(base)), 1);
    assert.equal(principal(depot({ ...base, "outils/miroirs.json": "{}" })), 1, "hors dépôt git : non exécuté, jamais vert");
  } finally {
    Object.assign(console, { log, error });
  }
  assert.equal(journal.log[0], "miroirs : 6 fichier(s) comparé(s) au gabarit, 0 écart(s) déclaré(s), 0 problème(s)");
  assert.match(journal.error[0], /docs\/recipes\/r\.md : diffère/);
  assert.ok(journal.error.some((m) => /^miroirs : outils\/miroirs\.json illisible/.test(m)));
  assert.match(journal.error.at(-1), /^miroirs : fichiers suivis illisibles \(git ls-files\) — contrôle non exécuté$/);
});

test("ligne de commande : racine en argument, code de sortie", () => {
  const racine = depot({ ...base, "outils/miroirs.json": "{\"ecarts\":{},\"propresAuDepot\":{\"outils/\":\"contrôle\"}}", ".githooks/a.mjs": "modifié\n" }, { git: true });
  const r = spawnSync(process.execPath, [SCRIPT, racine], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /✗ \.githooks\/a\.mjs : diffère/);
  // Sans argument : le dossier courant ; langue absente de la configuration : français.
  const ok = depot({ ...base, ".drwil/ia-first.json": "{}", "outils/miroirs.json": "{\"ecarts\":{},\"propresAuDepot\":{\"outils/\":\"contrôle\"}}" }, { git: true });
  assert.equal(spawnSync(process.execPath, [SCRIPT], { cwd: ok, encoding: "utf8" }).status, 0);
});

const suivis = (racine) => spawnSync("git", ["ls-files", "-z"], { cwd: racine, encoding: "utf8" }).stdout.split("\0").filter(Boolean);

test("un seul côté : fichier du dépôt sans homologue dans un dossier miroir, ou d'une partie installée absente du dépôt", () => {
  const racine = depot({ ...base, ".githooks/nouveau.mjs": "x\n", ".githooks/a.test.mjs": "t\n", "src/app.js": "hors miroirs\n", "docs/projets/f.md": "fiche\n" }, { git: true });
  rmSync(join(racine, "docs/recettes/r.md"));
  const { problemes } = verifier(racine, { suivis: suivis(racine), propresAuDepot: { ".githooks/*.test.mjs": "tests non livrés", "docs/projets/": "fiches" } });
  assert.deepEqual(problemes, [
    "docs/recettes/r.md : présent dans le gabarit (packages/drwil/templates/fr/base/docs/recettes/r.md) mais absent du dépôt (le copier, ou le déclarer propre au gabarit dans outils/miroirs.json)",
    ".githooks/nouveau.mjs : présent dans le dépôt seulement (le livrer dans le gabarit, ou le déclarer propre au dépôt dans outils/miroirs.json)",
  ], "docs/recettes/r.md était suivi : il n'est pas signalé comme propre au dépôt, seulement comme manquant ; src/ n'est pas un dossier miroir ; Cursor non installé n'est pas exigé");
  assert.deepEqual(verifier(racine, { suivis: suivis(racine), propresAuDepot: { ".githooks/*.test.mjs": "t", ".githooks/nouveau.mjs": "local", "docs/projets/": "f" }, propresAuGabarit: { "docs/recettes/r.md": "pas utile ici" } }).problemes, []);
});

test("déclarations honnêtes : propres au dépôt ou au gabarit inutiles ou sans raison", () => {
  const racine = depot(base, { git: true });
  const { problemes } = verifier(racine, { suivis: suivis(racine), propresAuDepot: { "docs/vide/": " " }, propresAuGabarit: { ".githooks/a.mjs": "présent", "inconnu.md": "" } });
  assert.deepEqual(problemes, [
    "docs/vide/ : déclaré propre au dépôt, mais ne couvre aucun fichier sans homologue (retirer sa ligne de outils/miroirs.json)",
    "docs/vide/ : déclaré propre au dépôt sans raison",
    ".githooks/a.mjs : déclaré propre au gabarit, mais absent du gabarit ou présent dans le dépôt (retirer sa ligne de outils/miroirs.json)",
    "inconnu.md : déclaré propre au gabarit, mais absent du gabarit ou présent dans le dépôt (retirer sa ligne de outils/miroirs.json)",
    "inconnu.md : déclaré propre au gabarit sans raison",
  ]);
});

test("jobs : clés à deux espaces sous jobs:, fin de bloc à la clé suivante", () => {
  assert.deepEqual(jobs("name: x\njobs:\n  a:\n    runs-on: y\n    steps:\n  b-c:\nenv:\n  pas_un_job:\n"), ["a", "b-c"]);
});

test("CI : jobs du gabarit présents, jobs propres déclarés, fuite d'un job propre vers le gabarit refusée", () => {
  const ci = (d, g) => depot({ ...base, [`${G}/common/ci/github/.github/workflows/ia-first.yml`]: g, ".github/workflows/ia-first.yml": d });
  const verif = (racine, jobsPropresAuDepot) => verifier(racine, { ecarts: { ".github/workflows/ia-first.yml": "jobs vérifiés à part" }, ci: { fichier: ".github/workflows/ia-first.yml", jobsPropresAuDepot } }).problemes;
  const ok = ci("jobs:\n  checks:\n  kit:\n", "jobs:\n  checks:\n");
  assert.deepEqual(verif(ok, { kit: "propre" }), []);
  assert.deepEqual(verif(ok, {}), [".github/workflows/ia-first.yml : job « kit » propre au dépôt non déclaré (jobsPropresAuDepot dans outils/miroirs.json)"]);
  const fuite = ci("jobs:\n  checks:\n  kit:\n", "jobs:\n  checks:\n  kit:\n  alerte:\n");
  assert.deepEqual(verif(fuite, { kit: "propre", absent: "" }), [
    ".github/workflows/ia-first.yml : job « kit » déclaré propre au dépôt mais présent dans le gabarit — fuite du dépôt vers le livrable (QUA-018)",
    ".github/workflows/ia-first.yml : job « alerte » du gabarit absent de la CI du dépôt",
    ".github/workflows/ia-first.yml : job « absent » déclaré propre au dépôt mais absent de sa CI",
    ".github/workflows/ia-first.yml : job « absent » déclaré propre au dépôt sans raison",
  ]);
  assert.deepEqual(verifier(depot(base), { ci: { fichier: ".gitlab-ci.yml" } }).problemes, [".gitlab-ci.yml : CI déclarée dans outils/miroirs.json sans homologue à comparer"]);
});

test("frontière du livrable : historique interne de drwil refusé dans tout le gabarit, fiches du gabarit permises", () => {
  const racine = depot({
    [`${G}/fr/base/docs/projets/modele.md`]: "# Modèle\n",
    [`${G}/fr/base/docs/recettes/ok.md`]: "Voir `docs/projets/modele.md`. Exemple daté (2026-10-04). DRWIL et décision sans date.\n",
    [`${G}/en/base/docs/recipes/x.md`]: "See PR #26.\nDecision of the requester, 2026-10-03.\n",
    [`${G}/common/base/.githooks/y.mjs`]: "// ADR-003, Lot 4 a ajouté, port de run-box-v2\n// voir docs/projets/proteger-master.md\n",
  });
  assert.deepEqual(verifier(racine).problemes.filter((p) => p.includes("QUA-018")), [
    `${G}/common/base/.githooks/y.mjs:1 : historique interne de drwil dans le livrable « ADR-003 » (QUA-018)`,
    `${G}/common/base/.githooks/y.mjs:1 : historique interne de drwil dans le livrable « Lot 4 a ajouté » (QUA-018)`,
    `${G}/common/base/.githooks/y.mjs:1 : historique interne de drwil dans le livrable « run-box » (QUA-018)`,
    `${G}/common/base/.githooks/y.mjs:2 : fiche propre au dépôt citée dans le livrable « proteger-master.md » (QUA-018)`,
    `${G}/en/base/docs/recipes/x.md:1 : historique interne de drwil dans le livrable « PR #26 » (QUA-018)`,
    `${G}/en/base/docs/recipes/x.md:2 : historique interne de drwil dans le livrable « Decision of the requester, 2026-10-03 » (QUA-018)`,
  ]);
});
