import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appliquer, argumentsInit, installerAvecCli, planifier, principal } from "./installer-depot.mjs";
import { verifier } from "./verifier-miroirs.mjs";

const DEPOT = fileURLToPath(new URL("..", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

function dossier(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-installer-"));
  dossiers.push(racine);
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  return racine;
}

const G = "packages/drwil/templates";
// Gabarit : un hook à jour d'un côté seulement, un écart déclaré, un outil et un module non installés.
const depot = {
  [`${G}/common/base/.githooks/a.mjs`]: "a v2\n",
  [`${G}/common/base/.githooks/nouveau.mjs`]: "nouveau\n",
  [`${G}/fr/base/AGENTS.md`]: "# {{projectName}}\n\nModèle.\n",
  [`${G}/common/tools/claude/.claude/settings.json`]: "{}\n",
  [`${G}/fr/tools/cursor/.cursor/rules/x.mdc`]: "x\n",
  [`${G}/common/optional/module/outil.mjs`]: "outil v2\n",
  [`${G}/common/optional/autre/autre.mjs`]: "autre\n",
  ".githooks/a.mjs": "a v1\n",
  "AGENTS.md": "# drwil, consignes propres\n",
  ".claude/settings.json": "{}\n",
  ".githooks/outil.mjs": "outil v1\n",
  ".githooks/a.test.mjs": "propre au dépôt\n",
  ".drwil/ia-first.json": JSON.stringify({ projectName: "drwil", lang: "fr", layers: [], contractPrefixes: ["SEC", "QUA"] }),
  "outils/miroirs.json": JSON.stringify({ ecarts: { "AGENTS.md": "consignes propres" } }),
};
// Ce que `drwil init` produirait (variables rendues, mais AGENTS.md écrasé : écart déclaré).
const installe = {
  ".githooks/a.mjs": "a v2\n",
  ".githooks/nouveau.mjs": "nouveau\n",
  "AGENTS.md": "# drwil\n\nModèle.\n",
  ".claude/settings.json": "{}\n",
  ".drwil/ia-first.json": "{}",
};

test("argumentsInit : nom, langue, couches, préfixes, outils et CI repris de la config et des unités installées", () => {
  const args = argumentsInit(
    { projectName: "drwil", lang: "fr", layers: ["api"], contractPrefixes: ["SEC"], mode: "minimal" },
    new Set(["base", "tools/claude", "ci/github", "optional/module"]),
  );
  const valeur = (o) => args[args.indexOf(o) + 1];
  assert.deepEqual(args.slice(0, 3), ["init", "--force", "--no-git"]);
  assert.equal(valeur("--name"), "drwil");
  assert.equal(valeur("--short"), "drwil");
  assert.equal(valeur("--layers"), "api");
  assert.equal(valeur("--contract-prefixes"), "SEC");
  assert.equal(valeur("--tools"), "claude");
  assert.equal(valeur("--ci"), "github");
  assert.equal(valeur("--mode"), "minimal");
  const defauts = argumentsInit({ projectName: "p" }, new Set(["base"]));
  assert.equal(defauts[defauts.indexOf("--ci") + 1], "none");
  assert.equal(defauts[defauts.indexOf("--lang") + 1], "fr");
  assert.equal(defauts[defauts.indexOf("--contract-prefixes") + 1], "SEC,QUA");
});

test("planifier : rafraîchit et crée les fichiers du gabarit, jamais un écart déclaré, la config, une unité absente", () => {
  const racine = dossier(depot);
  const { plan, problemes } = planifier(racine, dossier(installe), { ecarts: { "AGENTS.md": "x" } });
  assert.deepEqual(problemes, []);
  assert.deepEqual(
    plan.map(({ chemin, action }) => `${action} ${chemin}`),
    ["remplace .githooks/a.mjs", "cree .githooks/nouveau.mjs", "remplace .githooks/outil.mjs"],
  );
  assert.equal(plan.find((p) => p.chemin === ".githooks/outil.mjs").depuis, join(racine, `${G}/common/optional/module/outil.mjs`));
});

test("planifier : un fichier attendu que l'installation n'a pas produit est un problème, jamais un oubli silencieux", () => {
  const { plan, problemes } = planifier(dossier(depot), dossier({}), { ecarts: { "AGENTS.md": "x" } });
  assert.deepEqual(
    plan.map((p) => p.chemin),
    [".githooks/outil.mjs"],
  );
  assert.equal(problemes.length, 3);
  assert.match(problemes[0], /^\.claude\/settings\.json : attendu de l'installation/);
});

test("appliquer puis verifier : le dépôt redevient identique à son gabarit, un fichier créé garde ses droits", () => {
  const racine = dossier(depot);
  const rendu = dossier(installe);
  if (process.platform !== "win32") chmodSync(join(rendu, ".githooks/nouveau.mjs"), 0o755);
  appliquer(racine, planifier(racine, rendu, { ecarts: { "AGENTS.md": "x" } }).plan);
  assert.equal(readFileSync(join(racine, ".githooks/a.mjs"), "utf8"), "a v2\n");
  assert.equal(readFileSync(join(racine, ".githooks/outil.mjs"), "utf8"), "outil v2\n");
  assert.equal(readFileSync(join(racine, "AGENTS.md"), "utf8"), "# drwil, consignes propres\n");
  assert.equal(readFileSync(join(racine, ".githooks/a.test.mjs"), "utf8"), "propre au dépôt\n");
  assert.ok(!existsSync(join(racine, ".cursor")));
  assert.ok(!existsSync(join(racine, ".githooks/autre.mjs")));
  if (process.platform !== "win32") assert.equal(statSync(join(racine, ".githooks/nouveau.mjs")).mode & 0o111, 0o111);
  const { problemes } = verifier(racine, {
    ecarts: { "AGENTS.md": "x" },
    propresAuDepot: { ".githooks/*.test.mjs": "x" },
    suivis: [".githooks/a.test.mjs"],
  });
  assert.deepEqual(problemes, []);
});

/** Capture console.log et console.error pendant `fn` ; rend { code, sortie }. */
function capturer(fn) {
  const lignes = [];
  const [log, error] = [console.log, console.error];
  console.log = console.error = (l) => lignes.push(l);
  try {
    return { code: fn(), sortie: lignes.join("\n") };
  } finally {
    [console.log, console.error] = [log, error];
  }
}

test("principal : simulation sans écriture, puis installation ; l'installateur reçoit les arguments d'init", () => {
  const racine = dossier(depot);
  let recus;
  const installer = (_, args) => {
    recus = args;
    return { dossier: dossier(installe) };
  };
  const simule = capturer(() => principal(racine, { simulation: true, installer }));
  assert.equal(simule.code, 0);
  assert.match(simule.sortie, /3 fichier\(s\) à écrire \(simulation, rien d'écrit\)/);
  assert.equal(readFileSync(join(racine, ".githooks/a.mjs"), "utf8"), "a v1\n");
  assert.equal(recus[recus.indexOf("--tools") + 1], "claude");
  const reel = capturer(() => principal(racine, { installer }));
  assert.equal(reel.code, 0);
  assert.match(reel.sortie, /~ \.githooks\/a\.mjs/);
  assert.match(reel.sortie, /\+ \.githooks\/nouveau\.mjs/);
  assert.equal(readFileSync(join(racine, ".githooks/a.mjs"), "utf8"), "a v2\n");
});

test("principal : config illisible, installation en échec ou fichier non produit → code 1, rien d'écrit", () => {
  const sansConfig = capturer(() => principal(dossier({})));
  assert.equal(sansConfig.code, 1);
  assert.match(sansConfig.sortie, /config illisible/);
  const racine = dossier(depot);
  const echec = capturer(() => principal(racine, { installer: () => ({ erreur: "drwil init en échec" }) }));
  assert.equal(echec.code, 1);
  assert.match(echec.sortie, /installer-depot : drwil init en échec/);
  const incomplet = capturer(() => principal(racine, { installer: () => ({ dossier: dossier({ ".githooks/a.mjs": "a v2\n" }) }) }));
  assert.equal(incomplet.code, 1);
  assert.match(incomplet.sortie, /attendu de l'installation/);
  assert.equal(readFileSync(join(racine, ".githooks/a.mjs"), "utf8"), "a v1\n");
});

test("installerAvecCli : sans projet à construire, l'échec est rendu, jamais une installation vide", () => {
  const { erreur, dossier: d } = installerAvecCli(dossier({}), ["init"]);
  assert.equal(d, undefined);
  assert.match(erreur, /construction de la CLI en échec/);
});

test("installerAvecCli : la vraie CLI installe le dépôt dans une copie temporaire, le dépôt reste intact", () => {
  const config = JSON.parse(readFileSync(join(DEPOT, ".drwil", "ia-first.json"), "utf8"));
  const { erreur, dossier: d } = installerAvecCli(DEPOT, argumentsInit(config, new Set(["base", "tools/claude", "ci/github"])));
  assert.equal(erreur, undefined);
  dossiers.push(d);
  for (const f of [".githooks/run-checks.mjs", ".claude/settings.json", ".github/workflows/ia-first.yml", "AGENTS.md"])
    assert.ok(existsSync(join(d, f)), f);
  assert.equal(readFileSync(join(d, "CLAUDE.md"), "utf8"), "@AGENTS.md\n");
  assert.ok(!existsSync(join(DEPOT, ".drwil", "fichiers-installes.json")));
  const echec = installerAvecCli(DEPOT, ["init", "--lang", "xx"]);
  assert.match(echec.erreur, /drwil init en échec/);
});
