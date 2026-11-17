// Tests du kit, thème mise à jour : version installée, mise à jour du kit, réglages gardés, ancien format.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, appendFileSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { init, uninstall, doctor, previewInit, formatPreview } from "../dist/index.js";
import { tmp, quiet, capture, envTest, checks, git, read, config, cli } from "./kit-commun.mjs";

test("un second init rafraîchit la mécanique inchangée, signale celle modifiée à la main ; --force réécrit tout", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo" }));
  writeFileSync(join(dir, "AGENTS.md"), "contenu du projet, ajouté après coup\n");
  appendFileSync(join(dir, ".githooks", "run-checks.mjs"), "\n// marque pour vérifier l'écrasement\n");
  // Une ancienne version du kit, jamais modifiée depuis : son empreinte est celle du manifeste.
  const ancienne = "// version précédente du kit\n";
  writeFileSync(join(dir, ".githooks", "glob.mjs"), ancienne);
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  manifeste[".githooks/glob.mjs"] = createHash("sha256").update(ancienne).digest("hex");
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2));

  const lignes = await capture(() => init({ lang: "fr", targetDir: dir, name: "demo" }));
  assert.ok(read(dir, "AGENTS.md").startsWith("contenu du projet, ajouté après coup\n"), "docs du projet préservées sans --force");
  assert.match(
    read(dir, "AGENTS.md"),
    /<!-- >>> drwil -->\nRead and apply `\.drwil\/AGENTS\.md` too/,
    "consignes drwil mises à part, renvoi ajouté",
  );
  assert.ok(read(dir, ".githooks/run-checks.mjs").includes("marque pour vérifier"), "mécanique modifiée à la main : jamais écrasée");
  assert.ok(
    lignes.some((l) => l.includes(".githooks/run-checks.mjs")),
    "mais signalée comme dérive",
  );
  assert.notEqual(read(dir, ".githooks/glob.mjs"), ancienne, "mécanique inchangée depuis l'installation : rafraîchie");

  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo", force: true }));
  assert.ok(!read(dir, "AGENTS.md").startsWith("contenu du projet"), "--force réécrit aussi les docs");
  assert.ok(!read(dir, ".githooks/run-checks.mjs").includes("marque pour vérifier"), "--force réécrit aussi la mécanique modifiée");
});

test("mise à jour sans casse : une exigence ajoutée après l'installation avertit un projet existant, bloque une installation neuve", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  assert.equal(config(dir).newRequirements, "blocking", "installation neuve : sévère d'emblée");
  // Projet installé avant ce réglage (v0.3.0) : la clé n'existe pas.
  const ancienne = { ...config(dir) };
  delete ancienne.newRequirements;
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(ancienne, null, 2));
  writeFileSync(join(dir, ".drwil/state.json"), "{}\n");
  appendFileSync(join(dir, "docs/ia-first.md"), "\nÉtat local : `.drwil/state.json`.\n");
  const docsCheck = () => spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8", env: envTest });
  const r = docsCheck();
  assert.equal(r.status, 0, "projet existant : le commit qui passait passe encore\n" + r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /\.drwil\/state\.json/, "mais l'écart est signalé");
  // La mise à jour pose « avertissement » pour ce projet, sans jamais durcir.
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  assert.equal(config(dir).newRequirements, "warning");
  assert.equal(docsCheck().status, 0);
  // Le projet choisit de durcir : la même citation devient bloquante, et une mise à jour garde ce choix.
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), newRequirements: "blocking" }, null, 2));
  assert.equal(docsCheck().status, 1);
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  assert.equal(config(dir).newRequirements, "blocking");
});

test("QUA-025 : init enregistre la version du moteur dans .drwil/install.json sans toucher au manifeste ; uninstall le retire", async () => {
  const dir = tmp();
  const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
  const installation = () => JSON.parse(readFileSync(join(dir, ".drwil/install.json"), "utf8"));
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, ci: "none" }));
  assert.deepEqual(installation(), { format: 1, version, firstVersion: version });
  const manifeste = readFileSync(join(dir, ".drwil/installed-files.json"), "utf8");
  assert.equal(".drwil/install.json" in JSON.parse(manifeste), false, "le manifeste ne liste pas l'enregistrement de version");

  // Mise à jour depuis une version antérieure : la version suit, la première installation reste.
  writeFileSync(join(dir, ".drwil/install.json"), JSON.stringify({ format: 1, version: "0.4.0", firstVersion: "0.3.0" }));
  await quiet(() => init({ targetDir: dir, git: false, ci: "none" }));
  assert.deepEqual(installation(), { format: 1, version, firstVersion: "0.3.0" });
  assert.equal(readFileSync(join(dir, ".drwil/installed-files.json"), "utf8"), manifeste, "manifeste inchangé");

  // Enregistrement illisible : réécrit, la version courante devient la première connue.
  writeFileSync(join(dir, ".drwil/install.json"), "{ cassé");
  await quiet(() => init({ targetDir: dir, git: false, ci: "none" }));
  assert.deepEqual(installation(), { format: 1, version, firstVersion: version });

  // Installé avant l'enregistrement de version (manifeste, pas d'install.json) : origine inconnue, pas fausse.
  rmSync(join(dir, ".drwil/install.json"));
  await quiet(() => init({ targetDir: dir, git: false, ci: "none" }));
  assert.deepEqual(installation(), { format: 1, version, firstVersion: null });
  await quiet(() => init({ targetDir: dir, git: false, ci: "none" }));
  assert.deepEqual(installation(), { format: 1, version, firstVersion: null }, "l'origine inconnue le reste");

  assert.ok((await uninstall({ targetDir: dir })).removed.includes(".drwil/install.json"), "listé en simulation");
  assert.ok(existsSync(join(dir, ".drwil/install.json")), "rien retiré en simulation");
  await uninstall({ targetDir: dir, dryRun: false });
  assert.equal(existsSync(join(dir, ".drwil/install.json")), false);
});

test("QUA-027 : mise à jour d'une version antérieure : fichiers du client préservés, obsolètes non modifiés retirés, version suivie", async () => {
  const dir = tmp();
  const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
  const empreinte = (texte) => createHash("sha256").update(texte).digest("hex");
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, ci: "none" }));

  // L'installation vieillie : ce qu'aurait laissé une version antérieure, puis le travail du client.
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  writeFileSync(join(dir, ".drwil/install.json"), JSON.stringify({ format: 1, version: "0.4.0", firstVersion: "0.4.0" }));
  const ancienne = "// mécanique de la version 0.4.0\n";
  writeFileSync(join(dir, ".githooks/glob.mjs"), ancienne);
  manifeste[".githooks/glob.mjs"] = empreinte(ancienne);
  for (const f of ["ancien-controle.mjs", "ancien-adapte.mjs"]) {
    writeFileSync(join(dir, ".githooks", f), `// ${f}, retiré du gabarit depuis\n`);
    manifeste[`.githooks/${f}`] = empreinte(`// ${f}, retiré du gabarit depuis\n`);
  }
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2));
  appendFileSync(join(dir, ".githooks/ancien-adapte.mjs"), "// adapté par le client\n");
  appendFileSync(join(dir, ".githooks/run-checks.mjs"), "\n// réglage du client\n");
  appendFileSync(join(dir, "docs/contracts.md"), "\n## APP-002 — Contrat du client\n**Règle** : r.\n**Manuel** : m.\n");

  const lignes = await capture(() => init({ targetDir: dir, git: false, ci: "none" }));

  assert.deepEqual(JSON.parse(read(dir, ".drwil/install.json")), { format: 1, version, firstVersion: "0.4.0" });
  assert.notEqual(read(dir, ".githooks/glob.mjs"), ancienne, "mécanique jamais modifiée : rafraîchie");
  assert.equal(existsSync(join(dir, ".githooks/ancien-controle.mjs")), false, "obsolète jamais modifié : retiré");
  assert.ok(existsSync(join(dir, ".githooks/ancien-adapte.mjs")), "obsolète modifié par le client : gardé");
  assert.match(read(dir, ".githooks/run-checks.mjs"), /réglage du client/, "mécanique modifiée : jamais écrasée");
  assert.ok(
    lignes.some((l) => l.includes(".githooks/run-checks.mjs")),
    "mais signalée comme dérive",
  );
  assert.match(read(dir, "docs/contracts.md"), /APP-002 — Contrat du client/, "fichier du projet préservé");
  const apres = JSON.parse(read(dir, ".drwil/installed-files.json"));
  assert.equal(".githooks/ancien-controle.mjs" in apres, false, "le manifeste oublie l'obsolète retiré");
  assert.equal(apres[".githooks/glob.mjs"], empreinte(read(dir, ".githooks/glob.mjs")), "et suit la mécanique rafraîchie");
});

test("QUA-026 : doctor affiche la version installée et signale un écart avec la CLI", async () => {
  const dir = tmp();
  const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, ci: "none" }));
  const point = async () => (await doctor({ targetDir: dir })).points.find((p) => p.id === "version");
  let p = await point();
  assert.equal(p.state, "ok");
  assert.equal(p.detail, `${version} (première installation : ${version})`);
  const ecrire = (v) => writeFileSync(join(dir, ".drwil/install.json"), JSON.stringify({ format: 1, version: v, firstVersion: v }));
  ecrire("0.0.1");
  p = await point();
  assert.equal(p.state, "warning");
  assert.ok(p.detail.startsWith(`0.0.1 installée, CLI ${version} plus récente : `), p.detail);
  assert.match(p.detail, /npx drwil init/);
  ecrire("99.0.0-beta.1");
  assert.match((await point()).detail, /99\.0\.0-beta\.1 installée, CLI .* plus ancienne/);
  ecrire(`${version}-rc.1`);
  assert.equal((await point()).state, "ok", "un suffixe de pré-version est ignoré");
  rmSync(join(dir, ".drwil/install.json"));
  p = await point();
  assert.equal(p.state, "warning");
  assert.match(p.detail, /inconnue \(installation antérieure/);
  // Un écart de version avertit, ne fait jamais échouer doctor à lui seul.
  assert.notEqual(p.state, "problem");
  // Première version inconnue (projet installé avant l'enregistrement) : dit, pas inventé.
  writeFileSync(join(dir, ".drwil/install.json"), JSON.stringify({ format: 1, version, firstVersion: null }));
  p = await point();
  assert.equal(p.state, "ok");
  assert.equal(p.detail, `${version} (version d'origine inconnue, antérieure à 0.6.0)`);
});

test("QUA-027 : mise à jour : un fichier de mécanique ajouté par la version est couvert par la fiche des mécaniques, le reste de la fiche intact", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false, ci: "none" }));
  const fiche = "docs/projects/kit-mechanics.md";
  // Fiche d'une version antérieure : sans le fichier ajouté depuis, avec une ligne propre au projet.
  const lignes = read(dir, fiche)
    .split("\n")
    .filter((l) => l !== "  - .githooks/skill-headers.mjs");
  lignes.splice(lignes.indexOf("-->"), 0, "  - outils/propre-au-projet.mjs");
  const ancienne = lignes.join("\n");
  writeFileSync(join(dir, fiche), ancienne);
  assert.doesNotMatch(ancienne, /skill-headers/);

  await quiet(() => init({ targetDir: dir, git: false, ci: "none" }));

  const apres = read(dir, fiche);
  assert.match(apres, /^ {2}- \.githooks\/skill-headers\.mjs$/m, "fichier ajouté par la version : couvert");
  assert.match(apres, /^ {2}- outils\/propre-au-projet\.mjs$/m, "ligne du projet : gardée");
  assert.equal(apres.match(/^ {2}- \.githooks\/run-checks\.mjs$/gm).length, 1, "aucun doublon");
  await quiet(() => init({ targetDir: dir, git: false, ci: "none" }));
  assert.equal(read(dir, fiche), apres, "idempotent");
});

test("QUA-027 : mise à jour : la prose du kit inchangée est rafraîchie, modifiée gardée et signalée ; jamais les documents du projet ni une prose hors manifeste", async () => {
  const dir = tmp();
  const empreinte = (texte) => createHash("sha256").update(texte).digest("hex");
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false, ci: "none" }));
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  const vieillir = (rel, texte) => {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), texte);
    manifeste[rel] = empreinte(texte);
  };
  const skill = ".claude/skills/start-a-workstream/SKILL.md";
  vieillir(skill, "skill de la version précédente\n");
  vieillir(".claude/settings.json", "{}\n");
  vieillir("docs/ia-first.md", "doc du kit de la version précédente\n");
  vieillir(".claude/skills/ancienne/SKILL.md", "skill retirée du gabarit depuis\n");
  vieillir("docs/architecture.md", "carte de la version précédente\n");
  // AGENTS.md écrit par le projet, jamais installé par le kit : hors manifeste.
  writeFileSync(join(dir, "AGENTS.md"), "AGENTS du projet\n");
  delete manifeste["AGENTS.md"];
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2));
  const recette = "docs/recipes/working-with-branches.md";
  appendFileSync(join(dir, recette), "\nAdapté par le projet.\n");

  const lignes = await capture(() => init({ targetDir: dir, git: false, ci: "none" }));

  assert.notEqual(read(dir, skill), "skill de la version précédente\n", "skill inchangée : rafraîchie");
  assert.match(read(dir, skill), /Not now/);
  assert.match(read(dir, ".claude/settings.json"), /hooks/, "réglages inchangés : rafraîchis");
  assert.notEqual(read(dir, "docs/ia-first.md"), "doc du kit de la version précédente\n");
  assert.equal(existsSync(join(dir, ".claude/skills/ancienne/SKILL.md")), false, "prose obsolète inchangée : retirée");
  assert.equal(read(dir, "docs/architecture.md"), "carte de la version précédente\n", "document du projet : jamais rafraîchi");
  assert.match(read(dir, "AGENTS.md"), /^AGENTS du projet/, "prose hors manifeste : jamais écrasée");
  assert.match(read(dir, recette), /Adapté par le projet/, "prose modifiée : gardée");
  assert.ok(!lignes.some((l) => l.includes(`- ${recette}`)), "fichier du projet : pas une dérive à décider");
  const apres = JSON.parse(read(dir, ".drwil/installed-files.json"));
  assert.equal(apres[skill], empreinte(read(dir, skill)), "le manifeste suit la prose rafraîchie");

  // Un fichier du kit (hors fichiers du projet) modifié à la main : diff proposé ; la recette du projet, jamais.
  const proposes = [];
  writeFileSync(join(dir, ".claude/skills/start-a-workstream/SKILL.md"), "skill adaptée\n");
  await quiet(() =>
    init({
      targetDir: dir,
      git: false,
      ci: "none",
      confirmDrift: (rel) => {
        proposes.push(rel);
        return rel === skill;
      },
    }),
  );
  assert.ok(proposes.includes(skill), "prose du kit modifiée : diff proposé");
  assert.ok(!proposes.includes(recette) && !proposes.includes("AGENTS.md"), "fichiers du projet : jamais proposés");
  assert.notEqual(read(dir, skill), "skill adaptée\n");
  assert.match(read(dir, recette), /Adapté par le projet/, "recette du projet : intacte");
  assert.ok(!existsSync(join(dir, `${skill}.bak`)), "aucun .bak");
});

// Projet déjà installé avec des réglages choisis, différents de chaque défaut : relancer
// l'installation ne doit en effacer aucun (journal du 2026-10-12, « init et apply gardent les réglages »).
const fichiersDe = (dir, sous = "") =>
  readdirSync(join(dir, sous), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? fichiersDe(dir, join(sous, e.name)) : [join(sous, e.name).replace(/\\/g, "/")]))
    .sort();

async function projetRegle() {
  const dir = tmp();
  await quiet(() =>
    init({
      targetDir: dir,
      name: "demo",
      lang: "en",
      tools: "claude",
      layers: "api",
      ci: "github",
      mode: "minimal",
      contractPrefixes: "SEC",
      git: false,
    }),
  );
  const cfg = config(dir);
  cfg.layerPrefixes = ["app", "lib"];
  cfg.codePrefixes = [...cfg.codePrefixes, "tools"];
  cfg.extraCodeFiles = ["Makefile"];
  cfg.extraCodeGlobs = ["*.sql"];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg, null, 2) + "\n");
  return { dir, cfg, fichiers: fichiersDe(dir) };
}

test("QUA-016 : init relancé sans option, puis avec --force, garde les réglages et n'ajoute aucun fichier", async () => {
  const { dir, cfg, fichiers } = await projetRegle();
  await quiet(() => init({ targetDir: dir, git: false }));
  assert.deepEqual(config(dir), cfg);
  assert.deepEqual(fichiersDe(dir), fichiers);
  await quiet(() => init({ targetDir: dir, force: true, git: false }));
  assert.deepEqual(config(dir), cfg);
  assert.deepEqual(fichiersDe(dir), fichiers);
});

test("QUA-016 : apply relancé sans option garde les réglages et n'ajoute aucun fichier", async () => {
  const { dir, cfg, fichiers } = await projetRegle();
  await quiet(() => init({ targetDir: dir, git: false }));
  assert.deepEqual(config(dir), cfg);
  assert.deepEqual(fichiersDe(dir), fichiers);
});

test("QUA-016 : la CLI, init et apply sans option, garde les réglages d'un projet installé", async () => {
  const { dir, cfg, fichiers } = await projetRegle();
  for (const commande of ["init"]) {
    const r = cli(dir, commande, "--no-git");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(config(dir), cfg, commande);
    assert.deepEqual(fichiersDe(dir), fichiers, commande);
  }
});

test("init sur un projet installé : une option passée remplace sa valeur, les autres réglages restent", async () => {
  const { dir, cfg } = await projetRegle();
  await quiet(() => init({ targetDir: dir, ci: "none", mode: "full", git: false }));
  assert.deepEqual(config(dir), { ...cfg, ci: "none", ciFiles: [], mode: "full" });
});

/** Ramène un projet fraîchement installé à l'ancien format français (avant « Le cœur en anglais », journal du 2026-10-12). */
function versAncienFormat(dir) {
  const deplacer = (de, vers) => {
    mkdirSync(join(dir, vers, ".."), { recursive: true });
    cpSync(join(dir, de), join(dir, vers), { recursive: true });
    rmSync(join(dir, de), { recursive: true });
  };
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  const hooks = { "state.mjs": "etat.mjs", "scope-gate.mjs": "perimetre.mjs", "scope.mjs": "cadrage.mjs", "engine.mjs": "moteur.mjs" };
  for (const [nouveau, ancien] of Object.entries(hooks)) {
    deplacer(`.githooks/${nouveau}`, `.githooks/${ancien}`);
    manifeste[`.githooks/${ancien}`] = manifeste[`.githooks/${nouveau}`];
    delete manifeste[`.githooks/${nouveau}`];
  }
  rmSync(join(dir, ".drwil/installed-files.json"));
  writeFileSync(join(dir, ".drwil/fichiers-installes.json"), JSON.stringify(manifeste, null, 2));
  deplacer("docs/projects", "docs/projets");
  deplacer("docs/projets/pending.md", "docs/projets/en-attente.md");
  deplacer("docs/contracts.md", "docs/contrats.md");
  writeFileSync(
    join(dir, "docs/projets/ma-fiche.md"),
    "# Projet : ma fiche\n\n**Statut** : cadré le 2026-10-12.\n\n<!-- cadrage\nfichiers:\n  - src/app.js\n-->\n\n## 6. Lots\n\n- **Lot 1** [IA] : faire.\n\n## 7. Reprise\n\n- rien\n",
  );
  const { scopeGate, scopeReminder, newRequirements, ...reste } = config(dir);
  writeFileSync(
    join(dir, ".drwil/ia-first.json"),
    JSON.stringify({
      ...reste,
      barriere: "bloquant",
      cadrage: "bloquant",
      nouvellesExigences: "bloquant",
      transitions: "humain",
      dirs: { projects: "docs/projets", index: "docs/projets/en-attente.md", recettes: "docs/recipes", contracts: "docs/contrats.md" },
    }),
  );
  writeFileSync(
    join(dir, ".drwil/state.json"),
    JSON.stringify({ version: 1, activite: "REALISATION", attente_active: "docs/projets/ma-fiche.md", demande_active: null, depuis: null }),
  );
}

test("projet à l'ancien format : apply --dry-run annonce la migration sans rien écrire ; apply migre, les contrôles passent, rejouer ne change rien", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  versAncienFormat(dir);
  const avant = read(dir, ".drwil/ia-first.json");

  const apercu = formatPreview(await previewInit({ lang: "fr", targetDir: dir }));
  assert.match(apercu, /Migration de l'ancien format \(simulation, rien d'écrit\)/);
  assert.match(apercu, /docs\/projets\/ma-fiche\.md → docs\/projects\/ma-fiche\.md/);
  assert.equal(read(dir, ".drwil/ia-first.json"), avant, "l'aperçu n'écrit rien");

  await quiet(() => init({ lang: "fr", targetDir: dir }));
  const cfg = config(dir);
  assert.deepEqual(
    [cfg.scopeGate, cfg.scopeReminder, cfg.newRequirements, cfg.transitions, cfg.dirs.recipes, cfg.dirs.contracts],
    ["blocking", "blocking", "blocking", "human", "docs/recipes", "docs/contracts.md"],
  );
  for (const ancien of ["barriere", "cadrage", "nouvellesExigences"]) assert.ok(!(ancien in cfg), ancien);
  assert.deepEqual(JSON.parse(read(dir, ".drwil/state.json")), {
    version: 1,
    activity: "BUILD",
    active_brief: "docs/projects/ma-fiche.md",
    active_request: null,
    since: null,
  });
  for (const f of [
    ".githooks/state.mjs",
    ".githooks/scope-gate.mjs",
    ".githooks/scope.mjs",
    ".githooks/engine.mjs",
    "docs/projects/pending.md",
  ])
    assert.ok(existsSync(join(dir, f)), f);
  for (const f of [".githooks/etat.mjs", ".githooks/perimetre.mjs", "docs/projets", ".drwil/fichiers-installes.json"])
    assert.ok(!existsSync(join(dir, f)), f);
  assert.match(read(dir, "docs/projects/ma-fiche.md"), /^<!-- scope\nfiles:\n {2}- src\/app\.js\n-->$/m);
  assert.match(read(dir, "docs/projects/ma-fiche.md"), /^## 6\. Increments$/m);
  assert.match(spawnSync(process.execPath, [".githooks/state.mjs"], { cwd: dir, encoding: "utf8" }).stdout, /BUILD/);

  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);

  const migre = read(dir, ".drwil/ia-first.json");
  const lignes = await capture(() => init({ lang: "fr", targetDir: dir }));
  assert.ok(!lignes.some((l) => /Migration de l'ancien format/.test(l)), "rejouer apply ne migre plus rien");
  assert.equal(read(dir, ".drwil/ia-first.json"), migre);
});

test("QUA-047 : installer ou mettre à jour garde la date d'origine d'un document dont seule la date changerait", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const jour = new Date().toISOString().slice(0, 10);
  const fichier = "docs/ia-first.md";
  const empreinte = (texte) => createHash("sha256").update(texte).digest("hex");
  // Installé par une version précédente, un autre jour : enregistré au manifeste tel quel.
  const installerCommeAvant = (contenu) => {
    writeFileSync(join(dir, fichier), contenu);
    const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
    manifeste[fichier] = empreinte(contenu);
    writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2));
  };
  // Seule la date du rendu (première occurrence, en tête) : une date d'essai écrite en dur dans le document n'en est pas une.
  const ancien = read(dir, fichier).replace(jour, "2020-01-02");
  assert.notEqual(ancien, read(dir, fichier), "le document porte une date");
  installerCommeAvant(ancien);

  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.equal(read(dir, fichier), ancien, "mise à jour : seule la date changerait, la date d'origine est gardée");
  assert.equal(JSON.parse(read(dir, ".drwil/installed-files.json"))[fichier], empreinte(ancien), "le manifeste suit le fichier gardé");
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, force: true }));
  assert.equal(read(dir, fichier), ancien, "--force non plus ne réécrit pas une date seule");

  // Le reste du document change : réécrit, avec la date du jour.
  const lignes = ancien.split("\n");
  lignes.splice(1, 0, "Ligne d'une version précédente.");
  installerCommeAvant(lignes.join("\n"));
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const rafraichi = read(dir, fichier);
  assert.ok(!rafraichi.includes("Ligne d'une version précédente.") && !rafraichi.includes("2020-01-02"), rafraichi.slice(0, 200));
  assert.ok(rafraichi.includes(jour), "nouvelle date écrite avec le nouveau contenu");
});

// Projet équipé par une version antérieure (mécanique d'une version « 0.0.1 » simulée), commité sur master sans hooks,
// puis mis à jour par `init` : même gestes qu'un utilisateur, sans réseau.
async function projetAMettreAJour(lang = "fr") {
  const dir = tmp();
  git(dir, "init", "-q", "-b", "master");
  // Sous Windows, git du système met core.autocrlf=true : un checkout réécrirait les fichiers en CRLF et fausserait empreintes et arbre propre.
  git(dir, "config", "core.autocrlf", "false");
  await capture(() => init({ lang, targetDir: dir, name: "demo", git: false }));
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  for (const f of [".githooks/pre-push", "docs/recipes/adopt-the-kit.md"]) {
    appendFileSync(join(dir, f), f.endsWith(".md") ? "\nancienne version\n" : "\n# ancienne version\n");
    manifeste[f] = createHash("sha256").update(read(dir, f)).digest("hex");
  }
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2) + "\n");
  writeFileSync(join(dir, ".drwil/install.json"), JSON.stringify({ format: 1, version: "0.0.1", firstVersion: "0.0.1" }));
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-q", "-m", "kit ancien").status, 0);
  return dir;
}

async function avecIdentite(identite, fn) {
  const id = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
  const avant = Object.fromEntries(Object.keys(id).map((k) => [k, process.env[k]]));
  const reglages = {
    GIT_CONFIG_GLOBAL: join(tmp(), "none"),
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "user.useConfigOnly",
    GIT_CONFIG_VALUE_0: "true",
  };
  const sauve = Object.fromEntries(Object.keys(reglages).map((k) => [k, process.env[k]]));
  Object.assign(process.env, identite ? id : reglages);
  if (!identite) for (const k of Object.keys(id)) delete process.env[k];
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries({ ...avant, ...sauve })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const refuse = async (dir) => {
  try {
    await init({ lang: "fr", targetDir: dir, name: "demo" });
  } catch (e) {
    return e;
  }
  return assert.fail("refus attendu");
};

const etatDuDepot = (dir) =>
  [git(dir, "rev-parse", "HEAD").stdout, git(dir, "status", "--porcelain").stdout, read(dir, ".drwil/install.json")].join("|");

test("QUA-237 : init sur un projet équipé en SCOPING commite la mise à jour sur workstream/kit-update, la branche principale reste intacte", async () => {
  await avecIdentite(true, async () => {
    const dir = await projetAMettreAJour();
    const principale = git(dir, "rev-parse", "master").stdout;
    await capture(() => init({ lang: "fr", targetDir: dir, name: "demo" }));
    assert.equal(git(dir, "symbolic-ref", "--short", "HEAD").stdout.trim(), "workstream/kit-update");
    assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "", "arbre propre : rien de bloqué par la barrière");
    assert.equal(git(dir, "rev-parse", "HEAD^").stdout, principale, "coupée depuis la branche principale");
    assert.equal(git(dir, "rev-parse", "master").stdout, principale);
    const message = git(dir, "log", "-1", "--format=%B").stdout;
    assert.match(message, /^Mise à jour du kit drwil: 0\.0\.1 → \d+\.\d+\.\d+/);
    assert.match(message, /^Drwil-Kit-Update: \d+\.\d+\.\d+$/m);
    assert.ok(!read(dir, ".githooks/pre-push").includes("ancienne version"), "la mécanique est rafraîchie");
    assert.equal(git(dir, "config", "core.hooksPath").stdout.trim(), ".githooks");
    // Rien à commiter la fois suivante : retour sur la branche d'origine, branche supprimée.
    git(dir, "checkout", "-q", "master");
    git(dir, "merge", "-q", "--ff-only", "workstream/kit-update");
    git(dir, "branch", "-q", "-d", "workstream/kit-update");
    const relance = await capture(() => init({ lang: "fr", targetDir: dir, name: "demo" }));
    assert.ok(
      relance.some((l) => l.includes("Kit déjà à jour")),
      relance.join("\n"),
    );
    assert.equal(git(dir, "branch", "--list", "workstream/kit-update").stdout.trim(), "");
    assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "");
  });
});

test("QUA-237 : init refuse avant d'écrire, en disant quoi faire : arbre sale, branche principale en retard, branche de mise à jour déjà là, sans identité git", async () => {
  await avecIdentite(true, async () => {
    const dir = await projetAMettreAJour();
    const avant = etatDuDepot(dir);
    writeFileSync(join(dir, "notes.txt"), "à moi\n");
    await refuse(dir).then((e) => assert.match(e.message, /arbre de travail n'est pas propre.*git stash/));
    rmSync(join(dir, "notes.txt"));
    git(dir, "branch", "workstream/kit-update");
    await refuse(dir).then((e) => assert.match(e.message, /« workstream\/kit-update » existe déjà.*git branch -D/));
    git(dir, "branch", "-q", "-D", "workstream/kit-update");
    // Principale en retard : un clone pousse un commit que le projet n'a pas encore récupéré.
    const distant = tmp();
    git(distant, "init", "-q", "--bare", "-b", "master");
    git(dir, "remote", "add", "origin", distant);
    assert.equal(git(dir, "push", "-q", "origin", "master").status, 0);
    const clone = join(tmp(), "c");
    assert.equal(git(distant, "clone", "-q", distant, clone).status, 0);
    writeFileSync(join(clone, "autre.txt"), "autre\n");
    git(clone, "add", "-A");
    git(clone, "commit", "-q", "-m", "avance du distant");
    assert.equal(git(clone, "push", "-q", "origin", "master").status, 0);
    await refuse(dir).then((e) =>
      assert.match(
        e.message,
        /« master » est en retard sur le distant.*git fetch origin && git checkout master && git merge --ff-only origin\/master/,
      ),
    );
    assert.equal(etatDuDepot(dir), avant, "rien n'a été écrit ni changé de branche");
    assert.equal(git(dir, "symbolic-ref", "--short", "HEAD").stdout.trim(), "master");
    await avecIdentite(false, async () => {
      git(dir, "merge", "-q", "--ff-only", "origin/master");
      const apres = etatDuDepot(dir);
      await refuse(dir).then((e) => assert.match(e.message, /aucune identité git.*git config user\.name/));
      assert.equal(etatDuDepot(dir), apres);
    });
  });
});

test("QUA-238 : de bout en bout, la mise à jour de init passe la barrière du projet au rejeu ; une mécanique modifiée à la main reste refusée par le vrai hook", async () => {
  await avecIdentite(true, async () => {
    const dir = await projetAMettreAJour();
    await capture(() => init({ lang: "fr", targetDir: dir, name: "demo" }));
    const barriere = await import(`${pathToFileURL(join(dir, ".githooks/scope-gate.mjs")).href}?${Date.now()}`);
    const rejeu = barriere.checkScope(dir, { cfg: JSON.parse(read(dir, ".drwil/ia-first.json")), env: { DRWIL_BASE: "master" } });
    assert.deepEqual([rejeu.status, rejeu.problems], ["ok", []]);
    // La barrière est bloquante (installation neuve, QUA-154) : une édition à la main d'un hook, commitée par le vrai pre-commit.
    appendFileSync(join(dir, ".githooks/pre-push"), "\n# à la main\n");
    git(dir, "add", "-A");
    const refus = git(dir, "commit", "-q", "-m", "retouche d'un hook");
    assert.notEqual(refus.status, 0);
    assert.match(refus.stdout + refus.stderr, /hors fiches commité\(s\) en SCOPING/);
  });
});

// Projet équipé par une version qui n'avait ni la ligne `.drwil/lot.json` du .gitignore ni la dernière ligne du bloc scope
// de la fiche de mécanique : `init` les complète. `aLaMain` : le projet a retouché ces deux fichiers depuis l'installation.
async function projetACompleter(aLaMain) {
  const dir = await projetAMettreAJour();
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  const empreinte = (f) => createHash("sha256").update(read(dir, f)).digest("hex");
  const mecanique = "docs/projects/kit-mechanics.md";
  writeFileSync(join(dir, ".gitignore"), read(dir, ".gitignore").replace(".drwil/lot.json\n", ""));
  const lignes = read(dir, mecanique).split("\n");
  lignes.splice(lignes.indexOf("-->") - 1, 1);
  writeFileSync(join(dir, mecanique), lignes.join("\n"));
  for (const f of [".gitignore", mecanique]) manifeste[f] = empreinte(f);
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2) + "\n");
  if (aLaMain) {
    appendFileSync(join(dir, ".gitignore"), "\n# du projet\nsorties/\n");
    appendFileSync(join(dir, mecanique), "\nNote du projet.\n");
  }
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-q", "-m", "version sans les lignes").status, 0);
  return { dir, avant: { ".gitignore": manifeste[".gitignore"], [mecanique]: manifeste[mecanique] } };
}

test("QUA-244 : une mise à jour qui complète un fichier du manifeste, intact ou retouché, commite sans refus de la barrière", async () => {
  await avecIdentite(true, async () => {
    const mecanique = "docs/projects/kit-mechanics.md";
    for (const aLaMain of [false, true]) {
      const { dir, avant } = await projetACompleter(aLaMain);
      const sortie = (await capture(() => init({ lang: "fr", targetDir: dir, name: "demo" }))).join("\n");
      assert.match(sortie, /Fait : mise à jour du kit vers .* commitée sur la branche « workstream\/kit-update »/, sortie);
      assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "", "commit fait, rien de refusé");
      assert.match(read(dir, ".gitignore"), /^\.drwil\/lot\.json$/m, "le fichier est bien complété");
      assert.match(git(dir, "show", "--name-only", "--format=", "HEAD").stdout, /^\.gitignore$/m);
      const barriere = await import(`${pathToFileURL(join(dir, ".githooks/scope-gate.mjs")).href}?${Date.now()}`);
      const rejeu = barriere.checkScope(dir, { cfg: JSON.parse(read(dir, ".drwil/ia-first.json")), env: { DRWIL_BASE: "master" } });
      assert.deepEqual([rejeu.status, rejeu.problems], ["ok", []], `rejeu, retouché : ${aLaMain}`);
      const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
      const empreinte = (f) => createHash("sha256").update(read(dir, f)).digest("hex");
      const aPart = join(dir, ".drwil/completed-files.json");
      if (!aLaMain) {
        for (const f of [".gitignore", mecanique]) assert.equal(manifeste[f], empreinte(f), `${f} : nouvelle empreinte au manifeste`);
        assert.ok(!existsSync(aPart), "rien de noté à part");
        continue;
      }
      for (const f of [".gitignore", mecanique]) assert.equal(manifeste[f], avant[f], `${f} : empreinte d'installation gardée`);
      const notees = JSON.parse(read(dir, ".drwil/completed-files.json")).files;
      assert.deepEqual(
        notees.sort((a, b) => a.file.localeCompare(b.file)),
        [".gitignore", mecanique].map((f) => ({ file: f, sha256: empreinte(f) })),
      );
      const retrait = await uninstall({ targetDir: dir });
      assert.ok(retrait.modified.includes(".gitignore") && !retrait.removed.includes(".gitignore"), "jamais supprimé par uninstall");
      assert.ok(retrait.removed.includes(".drwil/completed-files.json"));
      // Admise pour ce seul contenu : une retouche suivante reste refusée, même sous le signal de init.
      appendFileSync(join(dir, ".gitignore"), "autre/\n");
      git(dir, "add", "-A");
      const args = ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "retouche", "-m", "Drwil-Kit-Update: 9.9.9"];
      const refus = spawnSync("git", args, {
        cwd: dir,
        encoding: "utf8",
        env: { ...envTest, DRWIL_KIT_UPDATE: "9.9.9" },
      });
      assert.notEqual(refus.status, 0, refus.stdout + refus.stderr);
      assert.match(refus.stdout + refus.stderr, /1 fichier\(s\) hors fiches commité\(s\) en SCOPING/);
    }
  });
});

test("QUA-239 : init dit, en fin de mise à jour, ce qu'il a fait, ce qui reste à décider et la commande suivante ; fichiers modifiés à la main et hooks d'un autre outil signalés", async () => {
  await avecIdentite(true, async () => {
    const dir = await projetAMettreAJour();
    // Un hook modifié à la main depuis l'installation : dérive, jamais réécrit.
    appendFileSync(join(dir, ".githooks/pre-commit"), "\n# du projet\n");
    git(dir, "commit", "-q", "-am", "hook du projet");
    git(dir, "config", "core.hooksPath", ".husky");
    const lignes = await capture(() => init({ lang: "fr", targetDir: dir, name: "demo" }));
    const sortie = lignes.join("\n");
    assert.match(
      sortie,
      /Fait : mise à jour du kit vers \d+\.\d+\.\d+ commitée sur la branche « workstream\/kit-update » \(créée depuis « master »\), \d+ fichier\(s\)\./,
    );
    assert.match(sortie, /core\.hooksPath = \.husky\) : ils jugent ce commit à leur façon/);
    assert.match(
      sortie,
      /Reste à décider : 1 fichier\(s\) modifié\(s\) à la main n'ont pas été réécrits — `npx drwil init` dans un terminal/,
    );
    assert.match(sortie, /Reste à décider : relire la mise à jour, puis la fusionner par une pull request\./);
    assert.match(
      sortie,
      /Commande suivante : `git push -u origin workstream\/kit-update`, puis `gh pr create --base master` ; une fois fusionnée, `git checkout master`\./,
    );
    assert.ok(sortie.lastIndexOf("Commande suivante") > sortie.indexOf("Fait :"), "le compte rendu vient en dernier");
    assert.equal(git(dir, "config", "core.hooksPath").stdout.trim(), ".husky", "le réglage d'un autre outil n'est pas cassé");
    const en = await projetAMettreAJour("en");
    const anglais = (await capture(() => init({ lang: "en", targetDir: en, name: "demo" }))).join("\n");
    assert.match(anglais, /Done: kit update to \d+\.\d+\.\d+ committed on branch "workstream\/kit-update" \(created from "master"\)/);
    assert.match(anglais, /Left to decide: review the update, then merge it through a pull request\./);
    assert.match(anglais, /Next command: `git push -u origin workstream\/kit-update`, then `gh pr create --base master`/);
  });
});
