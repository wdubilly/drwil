// Tests de bout en bout du kit : installe dans des dossiers temporaires et lance les vrais contrôles.
import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  appendFileSync,
  cpSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  init,
  uninstall,
  resolveDrift,
  verify,
  formatVerdict,
  verdictJson,
  doctor,
  previewInit,
  formatPreview,
  attest,
} from "../dist/index.js";
import { criteriaTable, evaluateCriteria, redact, writeEvidence } from "../dist/verify.js";
import { verifyFailed } from "../dist/failed.js";

// Un hook lancé par `git commit -a` ou depuis un worktree reçoit GIT_INDEX_FILE, GIT_DIR… :
// hérités, ils font agir les projets de test (et leurs hooks) sur le dépôt qui lance la suite.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

// Chaque dossier temporaire est supprimé après son test : sans ça, la suite (lancée à chaque
// commit par le hook) en laissait ~70 par passage et finissait par épuiser les inodes de /tmp.
// Ceux d'un test en échec sont gardés (et affichés) pour le diagnostic.
const tmpReel = tmpdir();
// Les hooks lancés par les projets de test gardent le dossier temporaire de leurs contrôles en échec (QUA-133) :
// dans une racine propre à ce fichier, supprimée à la fin, pour qu'ils ne s'accumulent pas dans /tmp.
const racineHooks = mkdtempSync(join(tmpReel, "drwil-kit-racine-"));
process.env.TMPDIR = racineHooks;
after(() => rmSync(racineHooks, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
let dossiersDuTest = [];
const tmp = () => {
  const dir = mkdtempSync(join(tmpReel, "drwil-"));
  dossiersDuTest.push(dir);
  return dir;
};
afterEach((t) => {
  if (t.passed === false) console.error(`dossiers gardés pour diagnostic (${t.name}) : ${dossiersDuTest.join(", ")}`);
  else {
    for (const dir of dossiersDuTest) {
      // macOS (CI) : ENOTEMPTY quand un fichier finit de s'écrire pendant la suppression ; rmSync
      // réessaie. Un dossier temporaire résiduel ne doit pas faire échouer un test réussi : signalé.
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch (e) {
        console.error(`dossier temporaire non supprimé (${t.name}) : ${dir} — ${e.code ?? e.message}`);
      }
    }
  }
  dossiersDuTest = [];
});
const quiet = async (fn) => {
  const log = console.log,
    warn = console.warn;
  console.log = console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
    console.warn = warn;
  }
};
const capture = async (fn) => {
  const log = console.log,
    lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  try {
    await fn();
    return lines;
  } finally {
    console.log = log;
  }
};
// CI et DRWIL_PUSH_TAGS_ONLY retirés explicitement : un commit/push simulé représente
// toujours un geste développeur local isolé, même quand la suite elle-même tourne
// dans une vraie CI (CI=true désactiverait à tort QUA-017) ou est déclenchée par le
// vrai hook pre-push lors d'un vrai push de tag (DRWIL_PUSH_TAGS_ONLY=1 fuirait sinon
// dans tous les commits/push simulés par les tests, qui doivent rester indépendants
// du contexte qui a lancé la suite). DRWIL_HOOK de même : le vrai pre-commit du dépôt
// drwil lance cette suite, ses contrôles ne doivent pas hériter du report au commit.
const envTest = { ...process.env, CI: "" };
delete envTest.DRWIL_PUSH_TAGS_ONLY;
delete envTest.DRWIL_PUSH_NO_BRANCH;
delete envTest.DRWIL_PUSH_REFS;
delete envTest.DRWIL_HOOK;
// run-checks n'affiche que ses échecs et un résumé (QUA-126) : le rapport complet, écrit à côté, s'y ajoute
// pour que les attentes sur un avertissement ou une annonce gardent leur sens.
const withDetail = (r, dir) => {
  const detail = join(dir, ".drwil/evidence/run-checks.log");
  return { ...r, stdout: r.stdout + (existsSync(detail) ? readFileSync(detail, "utf8") : "") };
};
const checks = (dir) =>
  withDetail(spawnSync(process.execPath, [".githooks/run-checks.mjs"], { cwd: dir, encoding: "utf8", env: envTest }), dir);
const git = (dir, ...args) =>
  spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, encoding: "utf8", env: envTest });
const read = (dir, f) => readFileSync(join(dir, f), "utf8");
// docs/ia-first.md est un sommaire : chaque section est un fichier de docs/ia-first/ qu'il cite. Une règle se
// cherche dans le sommaire et ses sections, jamais à une position fixe d'un seul fichier.
const sectionsIaFirst = (racine) => {
  const sommaire = readFileSync(join(racine, "docs/ia-first.md"), "utf8");
  const chemins = [...new Set([...sommaire.matchAll(/`(docs\/ia-first\/[^`]+\.md)`/g)].map((m) => m[1]))];
  return { sommaire, sections: chemins.map((chemin) => ({ chemin, texte: readFileSync(join(racine, chemin), "utf8") })) };
};
const iaFirst = (racine) => {
  const { sommaire, sections } = sectionsIaFirst(racine);
  return [sommaire, ...sections.map((s) => s.texte)].join("\n");
};
// La section du sommaire dont le titre (première ligne) correspond au motif.
const sectionIaFirst = (racine, titre) => sectionsIaFirst(racine).sections.find((s) => titre.test(s.texte.split("\n")[0]));
// AGENTS.md est un aiguillage court : le texte complet des règles est dans la section 8 de docs/ia-first.md.
const consignes = (dir) => `${read(dir, "AGENTS.md")}\n${iaFirst(dir)}`;
const config = (dir) => JSON.parse(read(dir, ".drwil/ia-first.json"));
// Une installation neuve a la barrière de périmètre bloquante, qui refuse le commit du kit en SCOPING : les tests
// qui commitent l'installation sans lancer de chantier la règlent en avertissement.
const enAvertissement = (dir) =>
  writeFileSync(join(dir, ".drwil/ia-first.json"), `${JSON.stringify({ ...config(dir), scopeGate: "warning" }, null, 2)}\n`);
// NTFS n'a pas de bit d'exécution : sous Windows chmod est un no-op, donc ce contrôle
// (déjà fait sur Linux/macOS par le test "lot 4 : commit-msg livré désactivé") n'a pas de sens.
const executable = (dir, f) => process.platform === "win32" || Boolean(statSync(join(dir, f)).mode & 0o100);

test("QUA-153 : AGENTS.md du gabarit tient en 100 lignes et chacune de ses règles de conduite a son détail en section 8 de docs/ia-first.md", () => {
  const base = fileURLToPath(new URL("../templates/common/base/", import.meta.url));
  const agents = readFileSync(join(base, "AGENTS.md"), "utf8");
  const lignes = agents.trimEnd().split("\n");
  assert.ok(lignes.length <= 100, `AGENTS.md du gabarit : ${lignes.length} lignes, plafond 100`);
  const section8 = sectionIaFirst(base, /^# 8\. Conduct rules, in detail$/);
  assert.ok(section8, "section 8 présente au sommaire");
  const detail = section8.texte;
  assert.ok(agents.includes(`\`${section8.chemin}\``), `AGENTS.md renvoie au fichier de la section 8 (${section8.chemin})`);
  const noms = (texte) => [...texte.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) => m[1]);
  const conduite = agents.slice(agents.indexOf("## Conduct"), agents.indexOf("## Contracts"));
  const regles = noms(conduite);
  assert.ok(regles.length >= 20, `règles de conduite relevées : ${regles.length}`);
  for (const nom of regles)
    assert.ok(
      noms(detail).some((d) => d.startsWith(nom)),
      `règle « ${nom} » sans détail en section 8`,
    );
});

const GABARIT = fileURLToPath(new URL("../templates/common/", import.meta.url));
const DEPOT = fileURLToPath(new URL("../../../", import.meta.url));
// Les renvois les plus lus visent le fichier de section exact (gabarit, puis copie du dépôt).
const RENVOIS_LES_PLUS_LUS = [
  "base/AGENTS.md",
  "tools/claude/.claude/skills/drwil/SKILL.md",
  "base/docs/projects/model-brief.md",
  "base/docs/projects/pending.md",
  "base/docs/projects/routine-maintenance.md",
].map((f) => join(GABARIT, f));
const RENVOIS_LES_PLUS_LUS_DEPOT = [
  "AGENTS.md",
  ".claude/skills/drwil/SKILL.md",
  "docs/projects/model-brief.md",
  "docs/projects/routine-maintenance.md",
].map((f) => join(DEPOT, f));
function* fichiersTexte(dossier) {
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) yield* fichiersTexte(chemin);
    else if (/\.(md|mdc|mjs|json|yml)$/.test(e.name)) yield chemin;
  }
}

test("QUA-190 : docs/ia-first.md est un sommaire court qui donne le fichier de chaque section, chacune sous le plafond et lisible seule", () => {
  const base = join(GABARIT, "base");
  const { sommaire, sections } = sectionsIaFirst(base);
  const lignes = sommaire.trimEnd().split("\n").length;
  assert.ok(lignes < 100, `sommaire : ${lignes} lignes, moins de 100 attendues`);
  for (let n = 1; n <= 8; n++)
    assert.match(
      sommaire,
      new RegExp(`^\\| ${n} \\| .+ \\| \`docs/ia-first/${n}-[^\`]+\\.md\` \\|`, "m"),
      `section ${n} au sommaire, avec son fichier`,
    );
  const livres = readdirSync(join(base, "docs/ia-first")).map((f) => `docs/ia-first/${f}`);
  assert.deepEqual(sections.map((s) => s.chemin).sort(), livres.sort(), "chaque fichier du dossier est au sommaire, et lui seul");
  for (const { chemin, texte } of sections) {
    const n = /^docs\/ia-first\/(\d+)-/.exec(chemin)[1];
    const taille = texte.split("\n").length - 1;
    assert.ok(taille <= 400, `${chemin} : ${taille} lignes, plafond 400`);
    assert.match(texte.split("\n")[0], new RegExp(`^# ${n}\\. `), `${chemin} : titre numéroté de sa section`);
    assert.ok(texte.includes("`docs/ia-first.md`"), `${chemin} : renvoie au sommaire`);
  }
  // La copie du dépôt suit le gabarit.
  assert.deepEqual(
    sectionsIaFirst(DEPOT).sections.map((s) => s.chemin),
    sections.map((s) => s.chemin),
    "le sommaire du dépôt donne les mêmes fichiers",
  );
});

// Paragraphes d'un texte (séparés par une ligne vide), espaces normalisés.
const paragraphesIaFirst = (texte) =>
  texte
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s+/g, " "))
    .filter(Boolean);

test("QUA-190 : le sommaire ne garde que l'introduction et la table des sections, aucun paragraphe de règle", () => {
  for (const base of [join(GABARIT, "base"), DEPOT]) {
    const { sommaire } = sectionsIaFirst(base);
    const i = sommaire.indexOf("\n## ");
    assert.ok(i > 0, "le sommaire a un titre « ## » après l'introduction");
    const introduction = sommaire.slice(0, i).trim().split("\n").length;
    assert.ok(introduction <= 15, `introduction : ${introduction} lignes, 15 au plus`);
    for (const p of paragraphesIaFirst(sommaire.slice(i))) {
      if (/^#{1,6} [^\n]*$/.test(p)) continue; // titre seul
      if (p.startsWith("|")) continue; // table des sections
      assert.match(p, /`docs\/ia-first(\.md|\/)/, `paragraphe de règle dans le sommaire : « ${p.slice(0, 60)}… »`);
      assert.ok(p.length < 400, `paragraphe trop long pour un renvoi : « ${p.slice(0, 60)}… »`);
    }
  }
});

test("QUA-190 : aucun paragraphe de règle n'apparaît dans deux fichiers, ni à la fois dans le sommaire et une section", () => {
  for (const base of [join(GABARIT, "base"), DEPOT]) {
    const { sommaire, sections } = sectionsIaFirst(base);
    const vus = new Map();
    for (const { chemin, texte } of [{ chemin: "docs/ia-first.md", texte: sommaire }, ...sections]) {
      const dansFichier = new Set();
      for (const p of paragraphesIaFirst(texte)) {
        if (p.length < 40 || /^#{1,6} [^|]*$/.test(p)) continue; // trivial ou titre
        if (/^Section \d+ of the "IA first" description, read on its own\./.test(p)) continue; // en-tête de renvoi
        if (dansFichier.has(p)) continue;
        dansFichier.add(p);
        assert.ok(!vus.has(p), `paragraphe en double entre ${vus.get(p)} et ${chemin} : « ${p.slice(0, 60)}… »`);
        vus.set(p, chemin);
      }
    }
  }
});

test("QUA-190 : chaque renvoi à docs/ia-first.md mène à une section existante, les plus lus au fichier exact", () => {
  const base = join(GABARIT, "base");
  const { sommaire, sections } = sectionsIaFirst(base);
  const titres = sections.flatMap((s) => [...s.texte.matchAll(/^#+ (?:\d+\. )?(.+)$/gm)].map((m) => m[1]));
  for (const fichier of fichiersTexte(GABARIT)) {
    const texte = readFileSync(fichier, "utf8");
    for (const [, n] of texte.matchAll(/docs\/ia-first\.md`?,? section (\d+)/g))
      assert.match(sommaire, new RegExp(`^\\| ${n} \\|`, "m"), `${fichier} : section ${n} absente du sommaire`);
    for (const [chemin] of texte.matchAll(/docs\/ia-first\/[\w.-]+\.md/g))
      assert.ok(existsSync(join(base, chemin)), `${fichier} : ${chemin} introuvable`);
    if (fichier.endsWith(".md"))
      for (const [, titre] of texte.matchAll(/docs\/ia-first\.md`?,? \(?"([^"]+)"/g))
        assert.ok(titres.includes(titre), `${fichier} : section « ${titre} » introuvable`);
  }
  for (const fichier of [...RENVOIS_LES_PLUS_LUS, ...RENVOIS_LES_PLUS_LUS_DEPOT]) {
    const texte = readFileSync(fichier, "utf8");
    assert.doesNotMatch(texte, /docs\/ia-first\.md`?,? (section \d|\(?")/, `${fichier} : renvoi à une section par le sommaire`);
    const cites = [...texte.matchAll(/`(docs\/ia-first\/[\w.-]+\.md)`/g)].map((m) => m[1]);
    assert.ok(cites.length, `${fichier} : aucun fichier de section cité`);
    for (const c of cites) assert.ok(existsSync(join(base, c)), `${fichier} : ${c} introuvable`);
  }
});

test("QUA-190 : le registre du dépôt et ses intentions visent le fichier de section, jamais le sommaire, et ce fichier existe", () => {
  const fichiers = [join(DEPOT, "docs/contracts.md"), join(DEPOT, "docs/intentions/compatibilite-des-outils.md")];
  for (const fichier of fichiers) {
    const texte = readFileSync(fichier, "utf8");
    assert.doesNotMatch(
      texte,
      /docs\/ia-first\.md`?,? \(?(section \d|matrice|réglage)/,
      `${fichier} : renvoi à une section par le sommaire`,
    );
    assert.doesNotMatch(texte, /matrice de `docs\/ia-first\.md`/, `${fichier} : matrice visée par le sommaire`);
    for (const [chemin] of texte.matchAll(/(?<![\w/])docs\/ia-first\/[\w.-]+\.md/g))
      assert.ok(existsSync(join(DEPOT, chemin)), `${fichier} : ${chemin} introuvable`);
  }
});

// Titres des sections de docs/ia-first/, sans leur numéro.
const titresIaFirst = (texte) => [...texte.matchAll(/^#+ (?:\d+\. )?(.+)$/gm)].map((m) => m[1]);

test("QUA-190 : chaque titre de section cité dans un commentaire d'un hook livré mène à un titre de docs/ia-first/", () => {
  const titres = sectionsIaFirst(join(GABARIT, "base")).sections.flatMap((s) => titresIaFirst(s.texte));
  let cites = 0;
  for (const fichier of fichiersTexte(GABARIT)) {
    if (!fichier.endsWith(".mjs")) continue;
    // Un renvoi peut courir sur plusieurs lignes de commentaire : elles sont recousues avant la lecture.
    const commentaires = readFileSync(fichier, "utf8")
      .split("\n")
      .filter((l) => /^\s*(\/\/|\/?\*)/.test(l))
      .map((l) => l.replace(/^\s*(\/\/+|\/?\*+)\s?/, ""))
      .join(" ");
    for (const [, titre] of commentaires.matchAll(/docs\/ia-first\.md`?,?\s+\(?"([^"]+)"/g)) {
      cites++;
      assert.ok(titres.includes(titre), `${fichier} : section « ${titre} » introuvable dans docs/ia-first/`);
    }
  }
  assert.ok(cites > 0, "aucun titre cité relevé dans les hooks livrés : le motif ne lit plus rien");
});

test("QUA-190 : aucun renvoi relatif d'une section de docs/ia-first/ ne sort de son fichier", () => {
  for (const base of [join(GABARIT, "base"), DEPOT]) {
    for (const { chemin, texte } of sectionsIaFirst(base).sections) {
      const lu = texte.replace(/\s+/g, " ");
      assert.doesNotMatch(lu, /this document/i, `${join(base, chemin)} : « this document » ne désigne plus le fichier lu seul`);
      const titres = titresIaFirst(texte);
      for (const [, titre, sens] of lu.matchAll(/"([^"]+)"\)? (below|above)\b/g))
        assert.ok(titres.includes(titre), `${join(base, chemin)} : « ${titre} » ${sens}, titre absent de ce fichier`);
    }
  }
});

test("QUA-179 : la recette livrée working-with-branches dit qu'un lancement en « This folder » crée workstream/<fiche> depuis la principale à jour, et quand il refuse", () => {
  const recette = readFileSync(join(GABARIT, "base/docs/recipes/working-with-branches.md"), "utf8");
  const puce = recette.split(/\n(?=- )/).find((p) => p.includes('"This folder"'));
  assert.ok(puce, "la recette livrée n'a pas de puce « This folder »");
  const lu = puce.replace(/\s+/g, " ");
  assert.match(lu, /creates `workstream\/<[^>]+>`/, "la puce dit que le lancement crée workstream/<fiche>");
  assert.match(lu, /up-to-date main branch/, "la puce dit que la branche part de la principale à jour");
  assert.match(lu, /refused/, "la puce dit quand le lancement refuse");
  for (const cas of [/not merged into the main branch/, /uncommitted changes/, /already exists/])
    assert.match(lu, cas, `la puce nomme le refus ${cas}`);
});

test("QUA-190 : init livre le dossier docs/ia-first/, une mise à jour en rafraîchit une section inchangée et garde une section adaptée", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false, ci: "none" }));
  const empreinte = (texte) => createHash("sha256").update(texte).digest("hex");
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  const livres = readdirSync(join(GABARIT, "base", "docs/ia-first"));
  for (const f of livres) {
    assert.ok(existsSync(join(dir, "docs/ia-first", f)), `docs/ia-first/${f} installé`);
    assert.ok(manifeste[`docs/ia-first/${f}`], `docs/ia-first/${f} au manifeste`);
  }
  const vieille = sectionIaFirst(dir, /^# 8\. /).chemin;
  writeFileSync(join(dir, vieille), "section de la version précédente\n");
  manifeste[vieille] = empreinte("section de la version précédente\n");
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2));
  const adaptee = sectionIaFirst(dir, /^# 2\. /).chemin;
  appendFileSync(join(dir, adaptee), "\nAdapté par le projet.\n");

  await quiet(() => init({ targetDir: dir, git: false, ci: "none" }));

  assert.match(read(dir, vieille), /^# 8\. Conduct rules, in detail$/m, "section inchangée depuis l'installation : rafraîchie");
  assert.match(read(dir, adaptee), /Adapté par le projet\./, "section adaptée par le projet : gardée");
});

test("init d'un projet en français : tous les outils, git et hooks, contrôles verts", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo", description: "Démo $& littéral", layers: "backend,frontend" }));
  for (const f of [
    "AGENTS.md",
    "CLAUDE.md",
    "GEMINI.md",
    ".claude/settings.json",
    ".cursor/rules/ia-first.mdc",
    ".github/copilot-instructions.md",
    ".github/instructions/add-an-api-route.instructions.md",
    ".github/instructions/add-a-frontend-screen.instructions.md",
    "backend/AGENTS.md",
    "frontend/CLAUDE.md",
    "docs/contracts.md",
    "docs/architecture.md",
  ]) {
    assert.ok(existsSync(join(dir, f)), f);
  }
  assert.ok(
    !existsSync(join(dir, ".githooks/run-checks.sh")) && !existsSync(join(dir, ".githooks/check-docs.py")),
    "plus de bash ni de python",
  );
  assert.ok(executable(dir, ".githooks/pre-commit"), "pre-commit exécutable");
  assert.equal(git(dir, "config", "core.hooksPath").stdout.trim(), ".githooks");
  assert.match(read(dir, "AGENTS.md"), /demo — Démo \$& littéral/);
  assert.match(read(dir, "docs/architecture.md"), /Not decided/);
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  // Le contrôle du kit (taille-kit, QUA-157) compte comme contrôle déclaré : l'alerte « aucun contrôle du projet »
  // n'apparaît plus (limite actée : docs/intentions/controle-du-kit-masque-l-alerte-sans-controle.md).
  assert.doesNotMatch(r.stdout, /non exécuté : contrôles du projet/);
  assert.match(r.stdout, /taille des fichiers du kit/);
});

test("QUA-038 : répertoire vide : aucune couche inventée, dit quoi faire ; la pile choisie, init --layers crée les couches", async () => {
  const dir = tmp();
  const lines = await capture(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  assert.ok(
    lines.some((l) => l.includes("Aucune couche écrite : le projet n'a pas encore de code. Le cadrer d'abord (/drwil-adopt")),
    lines.join("\n"),
  );
  for (const couche of ["backend", "frontend"]) assert.ok(!existsSync(join(dir, couche)), `pas de ${couche}/ inventé`);
  assert.match(read(dir, "docs/recipes/adopt-the-kit.md"), /\*\*A new project \(no code yet, no layer\): scope it first\.\*\*/);
  assert.match(read(dir, ".claude/skills/adopt-the-kit/SKILL.md"), /a new project is scoped first/);
  assert.match(read(dir, "AGENTS.md"), /A new project fills these five\s+lines in when it is scoped/);
  assert.deepEqual(config(dir).layers, []);
  // La pile choisie au cadrage : init relancé avec les couches les crée et les enregistre.
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, layers: "api,web" }));
  for (const f of ["api/AGENTS.md", "web/AGENTS.md"]) assert.ok(existsSync(join(dir, f)), f);
  assert.deepEqual(config(dir).layers, ["api", "web"]);
  const relance = await capture(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.ok(!relance.some((l) => l.includes("Aucune couche écrite")), "projet installé relancé : couches gardées");
  assert.deepEqual(config(dir).layers, ["api", "web"]);
  const anglais = await capture(() => init({ lang: "en", targetDir: tmp(), name: "demo", git: false }));
  assert.ok(
    anglais.some((l) => l.includes("No layer written: the project has no code yet.")),
    anglais.join("\n"),
  );
});

test("QUA-038 : un package.json qui n'installe que drwil (README, étape npm install) reste un projet neuf", async () => {
  const dir = tmp();
  writeFileSync(join(dir, "package.json"), JSON.stringify({ devDependencies: { drwil: "file:drwil-0.6.1.tgz" } }));
  const lines = await capture(() => init({ lang: "en", targetDir: dir }));
  assert.ok(
    lines.some((l) => l.includes("Stack not detected")),
    lines.join("\n"),
  );
  assert.ok(
    lines.some((l) => l.includes("Scope it first (/drwil-adopt")),
    lines.join("\n"),
  );
  assert.equal(git(dir, "symbolic-ref", "--short", "HEAD").stdout.trim(), "workstream/kit-installation");
  assert.match(read(dir, "docs/architecture.md"), /## Stack\s+Not decided\./);
  assert.deepEqual(config(dir).layers, []);
  // Un dossier passé par `npm init -y` : son script test par défaut ne fait pas une pile.
  const npmInit = tmp();
  writeFileSync(
    join(npmInit, "package.json"),
    JSON.stringify({
      name: "demo",
      scripts: { test: 'echo "Error: no test specified" && exit 1' },
      devDependencies: { drwil: "file:drwil.tgz" },
    }),
  );
  const npmInitLines = await capture(() => init({ lang: "en", targetDir: npmInit }));
  assert.ok(
    npmInitLines.some((l) => l.includes("Stack not detected")),
    npmInitLines.join("\n"),
  );
  assert.equal(git(npmInit, "symbolic-ref", "--short", "HEAD").stdout.trim(), "workstream/kit-installation");
  assert.match(read(npmInit, "docs/architecture.md"), /## Stack\s+Not decided\./);
  // Un vrai projet Node (une autre dépendance, un test réel, un autre script) reste une pile détectée.
  for (const pkg of [
    { dependencies: { express: "^4" }, devDependencies: { drwil: "file:drwil.tgz" } },
    { scripts: { test: "node --test" }, devDependencies: { drwil: "file:drwil.tgz" } },
    {
      scripts: { test: 'echo "Error: no test specified" && exit 1', start: "node index.js" },
      devDependencies: { drwil: "file:drwil.tgz" },
    },
  ]) {
    const reel = tmp();
    writeFileSync(join(reel, "package.json"), JSON.stringify(pkg));
    await quiet(() => init({ lang: "en", targetDir: reel, git: false }));
    assert.match(read(reel, "docs/architecture.md"), /`\.\/` : Node\.js/, JSON.stringify(pkg));
  }
});

test("init avec --layers explicite : pas de message de défaut", async () => {
  const dir = tmp();
  const lines = await capture(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, layers: "admin" }));
  assert.ok(!lines.some((l) => l.includes("Couches par défaut")), lines.join("\n"));
});

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

test("le hook refuse un commit dont la doc cite un chemin inexistant", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  enAvertissement(dir);
  assert.equal(git(dir, "add", "-A").status, 0);
  assert.equal(git(dir, "commit", "-qm", "init").status, 0, "premier commit accepté");
  appendFileSync(join(dir, "docs/ia-first.md"), "\nVoir `docs/inexistant.md` et SEC-999.\n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-qm", "casse");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /docs\/inexistant\.md/);
  assert.match(r.stdout + r.stderr, /SEC-999/);
  assert.equal(git(dir, "rev-list", "--count", "HEAD").stdout.trim(), "1");
});

test("chemin cité : un fichier ignoré par Git ne vaut pas preuve (local = CI) ; « (si présent) » aussi sur la ligne suivante", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  // Cas du 2026-10-09 : l'état local existe sur le poste, ignoré par Git, donc absent en CI.
  writeFileSync(join(dir, ".drwil/state.json"), "{}\n");
  const docsCheck = () => spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8", env: envTest });
  assert.equal(docsCheck().status, 0, "point de départ propre");
  appendFileSync(join(dir, "docs/ia-first.md"), "\nÉtat local : `.drwil/state.json`.\n");
  let r = docsCheck();
  assert.equal(r.status, 1, "ignoré par Git : refusé en local comme en CI");
  assert.match(r.stdout + r.stderr, /\.drwil\/state\.json/);
  // Un fichier suivi par Git reste une preuve valable.
  writeFileSync(join(dir, "docs/ia-first.md"), read(dir, "docs/ia-first.md").replace("`.drwil/state.json`.", "`.drwil/ia-first.json`."));
  assert.equal(docsCheck().status, 0, docsCheck().stdout);
  // « (si présent) » reconnu sur la ligne suivante, après un retour à la ligne.
  writeFileSync(
    join(dir, "docs/ia-first.md"),
    read(dir, "docs/ia-first.md").replace("`.drwil/ia-first.json`.", "`.drwil/state.json`\n(si présent)."),
  );
  r = docsCheck();
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("livrable léger : un projet équipé ne reçoit ni ne lance les tests des hooks (code de drwil)", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  const tests = readdirSync(join(dir, ".githooks")).filter((f) => f.endsWith(".test.mjs"));
  assert.deepEqual(tests, [], "les tests des hooks restent dans le dépôt drwil");
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  // « Non applicable » est muet : ni lancement, ni « non exécuté » à signaler au projet.
  assert.doesNotMatch(r.stdout + r.stderr, /tests des contrôles eux-mêmes/);
});

test("budget de temps : les contrôles au commit d'un projet équipé restent rapides (indicateur : un dépassement avertit, sans bloquer)", async (t) => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  const debut = performance.now();
  const r = checks(dir);
  const ms = Math.round(performance.now() - debut);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  console.log(`[budget-commit] ${process.platform} : ${ms} ms`);
  // Mesuré le 2026-10-11 : Linux 107 ms (CI) et 369 ms (poste), macOS 361 ms, Windows 342 ms ; 2237 ms sous la charge du
  // pre-push (contrôles en parallèle). La durée dépend de la charge, pas du code : un dépassement est un avertissement affiché,
  // jamais un échec, mais compté au résumé de run-checks (seul le statut des contrôles mesurés bloque, ci-dessus). Le seuil ne se relève que sur décision (cliquet).
  const BUDGET_COMMIT_MS = 1500;
  if (ms > BUDGET_COMMIT_MS) {
    const message = `budget de temps dépassé : contrôles au commit d'un projet équipé : ${ms} ms, budget ${BUDGET_COMMIT_MS} ms`;
    t.diagnostic(`⚠ ${message}`);
    // Repris et compté par run-checks (avertissement non bloquant du résumé).
    console.log(`[ia-first-warning] ${message}`);
  }
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

test("les contrôles déclarés par le projet tournent et survivent à une réinstallation", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const cfg = config(dir);
  cfg.checks = [{ name: "tests unitaires", run: 'node -e "process.exit(3)"' }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  const r = checks(dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /échec : tests unitaires/);
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.equal(config(dir).checks[0].name, "tests unitaires");
});

test("init en anglais, Codex seul, CI GitHub", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en", tools: "codex", ci: "github", git: false }));
  for (const f of ["CLAUDE.md", "GEMINI.md", ".claude", ".cursor", "docs/contrats.md"]) assert.ok(!existsSync(join(dir, f)), f);
  for (const f of [
    "AGENTS.md",
    "docs/contracts.md",
    "docs/recipes/add-an-api-route.md",
    ".github/workflows/ia-first.yml",
    "docs/projects/kit-mechanics.md",
  ]) {
    assert.ok(existsSync(join(dir, f)), f);
  }
  assert.match(read(dir, "docs/architecture.md"), /Not decided/);
  assert.match(read(dir, "docs/architecture.md"), /in CI \(`\.github\/workflows\/ia-first\.yml`\)/);
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /not run: secrets/);
});

test("installation anglaise : le cadrage (QUA-016) ne bloque pas le premier commit", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en" }));
  enAvertissement(dir);
  assert.equal(git(dir, "add", "-A").status, 0);
  assert.equal(git(dir, "commit", "-qm", "init").status, 0, "premier commit accepté");
});

test("init avec CI GitLab", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, ci: "gitlab", git: false }));
  assert.match(read(dir, ".gitlab-ci.yml"), /node \.githooks\/run-checks\.mjs/);
  assert.deepEqual(config(dir).ciFiles, [".gitlab-ci.yml"]);
});

test("QUA-015 : marqueur de chantier, statut daté, section Reprise, chemin « à créer »", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));

  // chemin « à créer » : accepté, pas une erreur.
  appendFileSync(join(dir, "docs/ia-first.md"), "\nÀ écrire : `docs/futur.md` (à créer).\n");
  let r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);

  // case ouverte sans marqueur [IA]/[humain]/[décision].
  appendFileSync(join(dir, "docs/projects/pending.md"), "\n## Test\n- [ ] sujet sans marqueur\n");
  r = checks(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /pending\.md.*marqueur/);
  // corrigé avant la suite, pour isoler chaque contrôle.
  writeFileSync(
    join(dir, "docs/projects/pending.md"),
    read(dir, "docs/projects/pending.md").replace("- [ ] sujet sans marqueur", "- [ ] [IA] sujet avec marqueur"),
  );

  // fiche de projet sans Statut daté ni section Reprise.
  writeFileSync(join(dir, "docs/projects/mon-chantier.md"), "# Mon chantier\n\nTexte.\n");
  r = checks(dir);
  assert.match(r.stdout, /mon-chantier\.md.*Statut/);
  assert.match(r.stdout, /mon-chantier\.md.*Reprise/);
  writeFileSync(
    join(dir, "docs/projects/mon-chantier.md"),
    "# Mon chantier\n\n**Statut** : 2026-10-04, fait.\n\n## Reprise\n\nRien à reprendre.\n",
  );
  r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);

  // modèle et fiche permanente exemptés du contrôle.
  writeFileSync(join(dir, "docs/projects/modele-exemple.md"), "# Modèle\n\nSans statut ni Reprise.\n");
  r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);

  // fiche suivant à la lettre le modèle fourni : sections numérotées (« ## 7. Reprise »)
  // et Statut avec date entre parenthèses — doit passer, pas seulement la forme minimale ci-dessus.
  writeFileSync(
    join(dir, "docs/projects/chantier-modele.md"),
    "# Projet : chantier\n\n**Statut** (2026-10-04) : cadré le 2026-10-04 — lot 1 en cours.\n\n## 6. Lots\n\nTexte.\n\n## 7. Reprise\n\n- **Dernier état** (2026-10-04) : rien à signaler.\n",
  );
  r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("QUA-015 (extension) : fiche terminée encore présente refusée ; case cochée vs fiche ouverte signalée", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));

  // « fait » dans le statut ne vaut pas terminée : seul le marqueur explicite compte.
  writeFileSync(
    join(dir, "docs/projects/mon-chantier.md"),
    "# Mon chantier\n\n**Statut** (2026-10-04) : cadré — essai réel fait, lot 2 ouvert.\n\n## Reprise\n\nRien à reprendre.\n",
  );
  appendFileSync(join(dir, "docs/projects/pending.md"), "\n## Test\n- [ ] [IA] sujet en cours `docs/projects/mon-chantier.md`.\n");
  let direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  assert.doesNotMatch(direct.stdout, /mon-chantier\.md/);

  // fiche marquée terminée mais encore là : erreur bloquante (la condenser dans le journal, la supprimer).
  writeFileSync(
    join(dir, "docs/projects/mon-chantier.md"),
    "# Mon chantier\n\n**Statut** : terminé le 2026-10-10.\n\n## Reprise\n\nRien à reprendre.\n",
  );
  direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 1, direct.stdout + direct.stderr);
  assert.match(direct.stdout + direct.stderr, /mon-chantier\.md.*terminée.*journal/);
  rmSync(join(dir, "docs/projects/mon-chantier.md"));
  writeFileSync(
    join(dir, "docs/projects/pending.md"),
    read(dir, "docs/projects/pending.md").replace("- [ ] [IA] sujet en cours `docs/projects/mon-chantier.md`.\n", ""),
  );
  direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);

  // cas inverse : case cochée mais fiche pas terminée.
  writeFileSync(
    join(dir, "docs/projects/autre-chantier.md"),
    "# Autre chantier\n\n**Statut** (2026-10-04) : cadré, lot 1 en cours.\n\n## Reprise\n\nRien.\n",
  );
  appendFileSync(join(dir, "docs/projects/pending.md"), "- [x] [IA] sujet pas fini `docs/projects/autre-chantier.md`.\n");
  direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 0);
  assert.match(direct.stdout, /autre-chantier\.md.*QUA-015|QUA-015.*autre-chantier\.md/);
});

test("QUA-021 : maturité : une fiche « prête » avec un point [décision] restant, sans lot ou sans critère est refusée ; « à affiner » et sans champ passent", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const critere = "## Critères d'acceptation\n\n- Un export vide est refusé [humain]\n\n";
  const fiche = (maturite, points, lots, criteres = critere) =>
    `# Chantier\n\n**Statut** (2026-10-04) : cadré.\n${maturite}\n\n${criteres}## 5. Points à trancher\n\n${points}\n\n## 6. Lots\n\n${lots}\n\n## Reprise\n\nRien.\n`;
  const lancer = () => spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  const ecrire = (texte) => writeFileSync(join(dir, "docs/projects/mon-chantier.md"), texte);
  const lot = "- **Lot 1 — modèle** [IA] : à faire.";

  ecrire(fiche("**Maturité** : prêt", "(aucun.)", lot));
  let r = lancer();
  assert.equal(r.status, 0, r.stdout + r.stderr);

  ecrire(fiche("**Maturité** : prêt", "- [décision] reste à trancher.", lot));
  r = lancer();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /mon-chantier\.md.*prête.*décision/);

  ecrire(fiche("**Maturité** : prêt", "(aucun.)", "(aucun.)"));
  r = lancer();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /mon-chantier\.md.*prête.*lot/);

  ecrire(fiche("**Maturité** : prêt", "(aucun.)", lot, ""));
  r = lancer();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /mon-chantier\.md.*prête.*critère d'acceptation/);
  ecrire(fiche("", "(aucun.)", lot, ""));
  assert.equal(lancer().status, 0);

  ecrire(fiche("**Maturité** : à affiner", "- [décision] reste à trancher.", "(aucun.)"));
  assert.equal(lancer().status, 0);
  ecrire(fiche("", "- [décision] reste à trancher.", "(aucun.)"));
  assert.equal(lancer().status, 0);
});

test("QUA-015 : l'index anglais (pending.md) vérifie aussi le marqueur de chantier", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en", git: false }));

  // case ouverte sans marqueur [AI]/[human]/[decision], côté anglais.
  appendFileSync(join(dir, "docs/projects/pending.md"), "\n## Test\n- [ ] topic without marker\n");
  let r = checks(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /pending\.md.*marker/);

  // corrigé : contrôle vert.
  writeFileSync(
    join(dir, "docs/projects/pending.md"),
    read(dir, "docs/projects/pending.md").replace("- [ ] topic without marker", "- [ ] [AI] topic with marker"),
  );
  r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("une alternative écrite avec une barre oblique n'est pas prise pour un chemin", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  appendFileSync(join(dir, "docs/ia-first.md"), "\nChoisir entre `minimal/complet` ou `init/apply` selon le cas.\n");
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("doublon d'ID dans le registre des contrats", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  appendFileSync(join(dir, "docs/contracts.md"), "\n| QUA-011 | doublon | — | — |\n");
  const r = checks(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /QUA-011.*plusieurs fois/);
});

test("QUA-016 : rappel de cadrage réglé sur bloquant, débloqué par le bloc cadrage", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  enAvertissement(dir);
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeReminder: "blocking" }));
  assert.equal(git(dir, "add", "-A").status, 0);
  const rInit = git(dir, "commit", "-qm", "init");
  assert.equal(rInit.status, 0, `premier commit accepté (kit-mechanics.md couvre .githooks/) :\n${rInit.stdout}${rInit.stderr}`);
  // QUA-017 ne tolère que le tout premier commit sur master : les commits suivants de
  // ce test (sans rapport avec le workflow branche/MR testé ailleurs) se font sur une branche.
  assert.equal(git(dir, "checkout", "-qb", "chantier/essai-cadrage").status, 0);

  // un nouveau fichier de code hors de toute fiche bloque le commit.
  mkdirSync(join(dir, "scripts"));
  writeFileSync(join(dir, "scripts/tache.mjs"), "console.log('tache');\n");
  // Le dossier de code figure sur la carte (QUA-040) : ce test éprouve le cadrage, pas la carte.
  appendFileSync(join(dir, "docs/architecture.md"), "\n- `scripts/` — tâches du projet\n");
  git(dir, "add", "-A");
  let r = git(dir, "commit", "-qm", "tache");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /scripts\/tache\.mjs.*hors de toute fiche/);

  // rattaché à la fiche « entretien courant », le commit passe.
  writeFileSync(
    join(dir, "docs/projects/routine-maintenance.md"),
    read(dir, "docs/projects/routine-maintenance.md").replace("files:\n-->", "files:\n  - scripts/tache.mjs\n-->"),
  );
  git(dir, "add", "-A");
  r = git(dir, "commit", "-qm", "tache rattachée");
  assert.equal(r.status, 0, r.stdout + r.stderr);

  // un motif de cadrage trop large reste refusé.
  writeFileSync(
    join(dir, "docs/projects/routine-maintenance.md"),
    read(dir, "docs/projects/routine-maintenance.md").replace("  - scripts/tache.mjs", "  - scripts/*"),
  );
  git(dir, "add", "-A");
  r = git(dir, "commit", "-qm", "motif trop large");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /motif de cadrage trop large/);
});

test("QUA-016 : réglage par défaut (bloquant) : premier commit accepté, code orphelin refusé ; avertissement toujours possible", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  enAvertissement(dir);
  assert.equal(config(dir).scopeReminder, "blocking", "réglage par défaut écrit à l'installation (docs/projects/journal.md, garde-fous)");
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-qm", "init").status, 0, "les fichiers du kit sont couverts : le premier commit passe");
  // QUA-017 : commit suivant hors du périmètre testé ici, donc sur une branche.
  assert.equal(git(dir, "checkout", "-qb", "chantier/essai-cadrage").status, 0);

  mkdirSync(join(dir, "scripts"));
  writeFileSync(join(dir, "scripts/tache.mjs"), "console.log('tache');\n");
  // Le dossier de code figure sur la carte (QUA-040) : ce test éprouve le cadrage, pas la carte.
  appendFileSync(join(dir, "docs/architecture.md"), "\n- `scripts/` — tâches du projet\n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-qm", "tache non cadrée");
  assert.notEqual(r.status, 0, "bloquant par défaut : code hors fiche refusé");
  assert.match(r.stdout + r.stderr, /scripts\/tache\.mjs.*hors de toute fiche/);

  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeReminder: "warning" }));
  const direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.match(direct.stdout, /scripts\/tache\.mjs.*hors de toute fiche/, "en avertissement : affiché quand même");
  assert.equal(direct.status, 0, "en avertissement : le contrôle reste vert");
});

test("QUA-016 : réglage off, contrôle et rappel à l'agent silencieux", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeReminder: "off" }));

  mkdirSync(join(dir, "scripts"));
  writeFileSync(join(dir, "scripts/tache.mjs"), "console.log('tache');\n");
  // Le dossier de code figure sur la carte (QUA-040) : ce test éprouve le cadrage, pas la carte.
  appendFileSync(join(dir, "docs/architecture.md"), "\n- `scripts/` — tâches du projet\n");
  const direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.doesNotMatch(direct.stdout, /hors de toute fiche/);
  assert.equal(direct.status, 0);

  const rappel = spawnSync(process.execPath, [".claude/hooks/scope-reminder.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(dir, "scripts/tache.mjs") } }),
  });
  assert.equal(rappel.stdout.trim(), "", "le rappel à l'agent se tait aussi quand cadrage est désactivé");
});

test("QUA-039 : fin de réponse : les identifiants cités sans libellé sont affichés sous la réponse ; le rappel ne cite un ID qu'une fois par session", async () => {
  // Constaté le 2026-10-17 : « OPT-6 à OPT-8 » écrits nus par l'agent, que le rappel après chaque outil ne voyait pas.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  assert.ok(
    reglages.hooks.Stop.some((h) => /reply-glossary\.mjs/.test(JSON.stringify(h.hooks))),
    "hook de fin de réponse déclaré",
  );
  assert.match(read(dir, ".gitignore"), /^\.drwil\/glossary\.json$/m, "mémoire du rappel ignorée par git");

  const fin = (message) =>
    spawnSync(process.execPath, [".claude/hooks/reply-glossary.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ hook_event_name: "Stop", stop_hook_active: false, last_assistant_message: message }),
    });
  let r = fin("La règle QUA-013 tombe, et SEC-007 (pas de secret) tient.");
  assert.equal(r.status, 0);
  const sortie = JSON.parse(r.stdout);
  assert.match(sortie.systemMessage, /^\[drwil\] Identifiants cités sans libellé : QUA-013 — A check that did not run has not passed$/);
  assert.doesNotMatch(sortie.systemMessage, /SEC-007/, "déjà libellé : pas répété");
  assert.equal(sortie.hookSpecificOutput, undefined, "rien d'injecté au modèle");
  assert.equal(sortie.decision, undefined, "jamais bloquant");
  assert.equal(fin("QUA-013 (contrôle non exécuté) : réglé.").stdout, "", "tout est libellé : rien");
  assert.equal(fin("").stdout, "");
  r = spawnSync(process.execPath, [".claude/hooks/reply-glossary.mjs"], { cwd: dir, input: "pas du JSON", encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.equal(r.stdout + r.stderr, "", "jamais d'erreur visible");

  // Rappel après chaque outil : un identifiant n'est rappelé qu'une fois par session.
  const outil = (session, texte) =>
    spawnSync(process.execPath, [".claude/hooks/id-glossary.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ session_id: session, hook_event_name: "PostToolUse", tool_name: "Bash", tool_response: texte }),
    }).stdout;
  const premier = outil("s1", "QUA-013 et SEC-007");
  assert.match(premier, /QUA-013 — /);
  assert.match(premier, /SEC-007 — /);
  assert.equal(outil("s1", "encore QUA-013"), "", "déjà rappelé dans cette session");
  assert.match(outil("s1", "QUA-013 puis QUA-016"), /QUA-016 — /);
  assert.doesNotMatch(outil("s1", "QUA-013 puis QUA-017"), /QUA-013/);
  assert.match(outil("s2", "QUA-013"), /QUA-013 — /, "nouvelle session : rappelé de nouveau");
});

test("QUA-039 : hook glossaire livré et branché sur tout outil ; injecte les libellés cités, rien sinon ; Copilot et Cursor ont la règle", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "en", targetDir: dir, git: false }));
  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  assert.ok(
    reglages.hooks.PostToolUse.some(
      (h) => h.matcher === "Bash|Read|Grep|Glob|WebFetch" && /id-glossary\.mjs/.test(JSON.stringify(h.hooks)),
    ),
  );
  const hook = (sortie) =>
    spawnSync(process.execPath, [".claude/hooks/id-glossary.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_response: sortie }),
    });
  const r = hook({ stdout: "QUA-013 failed, see catalog:QUA-004" });
  assert.equal(r.status, 0);
  const contexte = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(contexte, /^\[drwil\] Identifiers cited above: QUA-013 — A check that did not run has not passed ; catalog:QUA-004 — /);
  assert.match(contexte, /always the ID followed by what it designates/);
  assert.equal(hook("nothing known here").stdout, "", "rien de connu : rien d'injecté");
  assert.equal(
    spawnSync(process.execPath, [".claude/hooks/id-glossary.mjs"], { cwd: dir, input: "pas du JSON", encoding: "utf8" }).status,
    0,
    "jamais bloquant",
  );
  assert.match(read(dir, "AGENTS.md"), /\*\*Readable references\*\*[\s\S]*node \.githooks\/glossary\.mjs/);
  for (const f of [".github/copilot-instructions.md", ".cursor/rules/ia-first.mdc"])
    assert.match(read(dir, f), /node \.githooks\/glossary\.mjs/, f);
});

test("QUA-114 garde shell : refus, sans demander, de toute commande qui saute les hooks ou écrit core.hooksPath ; la lecture passe", async () => {
  const { skipsHooks, main } = await import(new URL("../templates/common/tools/claude/.claude/hooks/bash-guard.mjs", import.meta.url));
  const refusees = [
    "git commit --no-verify -m x",
    "git push --no-verify",
    "git commit --no-verif -m x",
    "git commit -n -m x",
    "git commit -anm x",
    "git -C sous commit -qn",
    "git -c core.hooksPath=/dev/null commit -m x",
    "git -c core.hookspath= commit -m x",
    "git -ccore.hooksPath=/dev/null commit",
    "git --config-env=core.hooksPath=VIDE commit",
    "git --config-env core.hooksPath=VIDE commit",
    "git config core.hooksPath /dev/null",
    'git config --local core.hooksPath ""',
    "git config set core.hooksPath x",
    "git config --unset core.hooksPath",
    "git config unset core.hooksPath",
    "git config --remove-section core",
    "git config --file .git/config core.hooksPath x",
    "GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/dev/null git commit -m x",
    "export GIT_CONFIG_PARAMETERS=\"'core.hooksPath'='/dev/null'\"",
    "sed -i 's/hooksPath = .githooks//' .git/config",
    "echo '[core] hooksPath = x' >> .git/config",
    "npm test && git commit --no-verify -m x",
    "true; /usr/bin/git commit -n",
    'bash -c "git config core.hooksPath /dev/null"',
    "sh -c 'cd a && git commit --no-verify'",
    'eval "git commit -n -m \\"x\\""',
    "(git commit -n)",
  ];
  for (const c of refusees) assert.equal(skipsHooks(c), true, c);
  const permises = [
    "git config core.hooksPath",
    "git config --get core.hooksPath",
    "git config get core.hooksPath",
    "git config --list",
    "git config user.name Test",
    "git commit -m 'retire -n et --no-verify du message'",
    "git commit -m -n",
    "git commit -F notes.txt",
    "git commit -mn",
    "git commit -- -n",
    "git log -n 3",
    "git push -n",
    "grep -rn hooksPath .githooks",
    "GIT_CONFIG_GLOBAL=/dev/null git status",
    "cat .git/config",
    "echo git",
    "ls",
  ];
  for (const c of permises) assert.equal(skipsHooks(c), false, c);

  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const garde = (command) =>
    spawnSync(process.execPath, [".claude/hooks/bash-guard.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
    }).stdout;
  const refus = JSON.parse(garde("git commit --no-verify -m x && cat .env"));
  assert.equal(refus.hookSpecificOutput.permissionDecision, "deny", "le refus l'emporte sur la demande d'accord");
  assert.match(refus.hookSpecificOutput.permissionDecisionReason, /refusé \(QUA-114\).*se corrige, il ne se contourne pas \(QUA-019\)/);
  assert.equal(garde("git config core.hooksPath"), "");
  assert.match(garde("cat .env"), /"permissionDecision":"ask"/, "les autres risques gardent la demande d'accord");
  assert.match(main(JSON.stringify({ tool_name: "Bash", tool_input: { command: "git commit -n" } })), /"permissionDecision":"deny"/);
});

test("QUA-132 lecture ciblée forcée : registre et journal refusés en entier (Read sans plage, cat/less/more), plage et recherche permises", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const lire = (tool_input, cwd = dir, script = join(dir, ".claude/hooks/read-guard.mjs")) =>
    spawnSync(process.execPath, [script], { cwd, encoding: "utf8", input: JSON.stringify({ tool_name: "Read", tool_input }) });
  const refuse = (r, quoi) => {
    const sortie = JSON.parse(r.stdout).hookSpecificOutput;
    assert.equal(sortie.permissionDecision, "deny", quoi);
    assert.match(sortie.permissionDecisionReason, /Lecture refusée \(QUA-132, lecture ciblée\)/, quoi);
    assert.match(sortie.permissionDecisionReason, /glossary\.mjs --contract <ID>.*--contracts.*--journal <chantier>/, quoi);
  };
  // Lecture entière : chemin absolu, relatif, avec ./ et .., depuis un sous-dossier.
  refuse(lire({ file_path: join(dir, "docs/contracts.md") }), "registre, chemin absolu");
  refuse(lire({ file_path: join(dir, "docs/projects/journal.md") }), "journal, chemin absolu");
  refuse(lire({ file_path: "docs/contracts.md" }), "chemin relatif");
  refuse(lire({ file_path: "./docs/projects/../contracts.md" }), "chemin normalisé");
  mkdirSync(join(dir, "src/profond"), { recursive: true });
  refuse(lire({ file_path: join(dir, "docs/contracts.md") }, join(dir, "src/profond")), "depuis un sous-dossier");
  const lien = join(tmp(), "projet-lien");
  symlinkSync(dir, lien, "junction");
  refuse(lire({ file_path: join(lien, "docs/contracts.md") }, lien, join(lien, ".claude/hooks/read-guard.mjs")), "par un lien");
  // Permis : une plage, un autre fichier, un fichier absent, une entrée inattendue.
  assert.equal(lire({ file_path: join(dir, "docs/contracts.md"), offset: 10, limit: 20 }).stdout, "", "plage permise");
  assert.equal(lire({ file_path: join(dir, "docs/projects/journal.md"), limit: 50 }).stdout, "", "limit seul permis");
  assert.equal(lire({ file_path: join(dir, "AGENTS.md") }).stdout, "", "autre fichier permis");
  assert.equal(lire({ file_path: join(tmp(), "docs/contracts.md") }).stdout, "", "hors du projet : permis");
  const absent = spawnSync(process.execPath, [join(dir, ".claude/hooks/read-guard.mjs")], {
    cwd: dir,
    encoding: "utf8",
    input: "pas du JSON",
  });
  assert.equal(absent.status, 0, "entrée invalide : jamais d'erreur");
  assert.equal(absent.stdout, "", "entrée invalide : la lecture passe");
  rmSync(join(dir, "docs/projects/journal.md"));
  assert.equal(lire({ file_path: join(dir, "docs/projects/journal.md") }).stdout, "", "fichier absent : la lecture passe");
  // Chemins lus dans la configuration, message dans la langue du projet.
  writeFileSync(join(dir, "registre.md"), "# Registre\n");
  writeFileSync(
    join(dir, ".drwil/ia-first.json"),
    JSON.stringify({ ...config(dir), lang: "en", dirs: { ...config(dir).dirs, contracts: "registre.md" } }),
  );
  assert.equal(lire({ file_path: join(dir, "docs/contracts.md") }).stdout, "", "l'ancien chemin n'est plus gardé");
  assert.match(
    JSON.parse(lire({ file_path: join(dir, "registre.md") }).stdout).hookSpecificOutput.permissionDecisionReason,
    /^Read refused \(QUA-132/,
  );
  writeFileSync(
    join(dir, ".drwil/ia-first.json"),
    JSON.stringify({ ...config(dir), lang: "fr", dirs: { ...config(dir).dirs, contracts: "docs/contracts.md" } }),
  );

  // Garde shell : cat, less, more refusés ; sed -n, grep, head permis.
  const shell = (command, cwd = dir) =>
    spawnSync(process.execPath, [join(dir, ".claude/hooks/bash-guard.mjs")], {
      cwd,
      encoding: "utf8",
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
    }).stdout;
  for (const c of [
    "cat docs/contracts.md",
    "cat -n ./docs/contracts.md | head -5",
    `less ${join(dir, "docs/contracts.md")}`,
    "npm test && more docs/contracts.md",
    "LANG=C /bin/cat ../../docs/contracts.md",
    // Constaté en CI Windows (2026-10-24, PR #223) : `\` lu comme échappement effaçait les séparateurs.
    `less ${join(dir, "docs/contracts.md").replace(/\//g, "\\")}`,
  ])
    assert.match(shell(c, join(dir, "src/profond")), /"permissionDecision":"deny".*QUA-132/, c);
  for (const c of [
    "sed -n 1,40p docs/contracts.md",
    "grep -n QUA-013 docs/contracts.md",
    "head -50 docs/contracts.md",
    "cat AGENTS.md",
    "echo docs/contracts.md",
  ])
    assert.equal(shell(c), "", c);
  assert.match(shell("cat .env"), /"permissionDecision":"ask"/, "les autres risques gardent la demande d'accord");

  // Les mêmes fonctions, appelées dans le processus (sur le gabarit, avec la racine du projet).
  const garde = await import(new URL("../templates/common/tools/claude/.claude/hooks/read-guard.mjs", import.meta.url));
  const { wholeRead } = await import(new URL("../templates/common/tools/claude/.claude/hooks/bash-guard.mjs", import.meta.url));
  const entree = (tool_input) => JSON.stringify({ tool_name: "Read", tool_input });
  assert.match(garde.main(entree({ file_path: "docs/contracts.md" }), dir), /"permissionDecision":"deny"/);
  assert.equal(garde.main(entree({ file_path: "docs/contracts.md", offset: 1 }), dir), "");
  assert.equal(garde.main(JSON.stringify({ tool_name: "Bash", tool_input: {} }), dir), "", "autre outil");
  assert.equal(garde.main("pas du JSON", dir), "");
  assert.equal(garde.guardedTarget(undefined, dir), null);
  assert.equal(wholeRead("cat docs/contracts.md", dir), "docs/contracts.md");
  assert.equal(wholeRead(`cat ${join(dir, "docs/contracts.md")}`, dir), "docs/contracts.md");
  assert.equal(wholeRead("cat -A AGENTS.md", dir), null);

  // Le gabarit branche le hook sur Read, avant l'outil ; AGENTS.md le dit.
  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  assert.ok(reglages.hooks.PreToolUse.some((h) => h.matcher === "Read" && h.hooks[0].command.includes(".claude/hooks/read-guard.mjs")));
  assert.match(consignes(dir), /reading the\s+registry or the journal whole \(without a range\) is refused/);
});

test("hooks Claude Code : garde-fou-bash demande l'accord, rappel-cadrage refuse avant écriture (bloquant) ou rappelle (avertissement)", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));

  const gardeFou = spawnSync(process.execPath, [".claude/hooks/bash-guard.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "cat .env" } }),
  });
  assert.match(gardeFou.stdout, /"permissionDecision":"ask"/);
  assert.match(gardeFou.stdout, /fichier \.env/);

  const inoffensif = spawnSync(process.execPath, [".claude/hooks/bash-guard.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "cat .env.example" } }),
  });
  assert.equal(inoffensif.stdout.trim(), "");

  const hook = (evenement, chemin) =>
    spawnSync(process.execPath, [".claude/hooks/scope-reminder.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ hook_event_name: evenement, tool_name: "Write", tool_input: { file_path: join(dir, chemin) } }),
    });
  // Défaut « bloquant » : refus AVANT l'écriture d'un fichier de code hors fiche (docs/projects/journal.md, garde-fous).
  const refus = hook("PreToolUse", "scripts/nouveau.mjs");
  assert.match(refus.stdout, /"permissionDecision":"deny"/);
  assert.match(refus.stdout, /Écriture refusée \(QUA-016, scopeReminder : blocking\).*scripts\/nouveau\.mjs/);
  // Copilot CLI envoie le fichier sous `path`, pas `file_path`.
  const copilote = spawnSync(process.execPath, [".claude/hooks/scope-reminder.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: { path: join(dir, "scripts/nouveau.mjs"), file_text: "x" },
    }),
  });
  assert.match(copilote.stdout, /"permissionDecision":"deny"/);
  assert.equal(hook("PreToolUse", "docs/notes.md").stdout.trim(), "", "la doc n'est jamais du code : jamais refusée");
  assert.equal(hook("PostToolUse", "scripts/nouveau.mjs").stdout.trim(), "", "en bloquant, pas de rappel en double après coup");
  // QUA-035 : une copie déclarée (scopeMirrors) d'un fichier cadré n'est pas refusée.
  writeFileSync(join(dir, "docs/projects/gabarit.md"), "# Gabarit\n\n<!-- scope\nfiles:\n  - modele/scripts/nouveau.mjs\n-->\n");
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeMirrors: [{ from: "modele/", to: "" }] }));
  assert.equal(hook("PreToolUse", "scripts/nouveau.mjs").stdout.trim(), "", "copie de modele/scripts/nouveau.mjs, cadré");
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeMirrors: [] }));
  // En « avertissement » : jamais de refus, un rappel après l'écriture.
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeReminder: "warning" }));
  assert.equal(hook("PreToolUse", "scripts/nouveau.mjs").stdout.trim(), "");
  const rappel = hook("PostToolUse", "scripts/nouveau.mjs");
  assert.match(rappel.stdout, /Rappel de cadrage/);
  assert.match(rappel.stdout, /scripts\/nouveau\.mjs/);
  // Le gabarit branche le hook avant l'écriture.
  const reglages = read(dir, ".claude/settings.json");
  assert.match(reglages, /"PreToolUse"[\s\S]*"Edit\|Write\|MultiEdit"[\s\S]*scope-reminder\.mjs[\s\S]*"PostToolUse"/);
});

test("état de gouvernance : lecteur livré, state.json ignoré par Git, contexte réinjecté au démarrage de Claude", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));

  assert.match(read(dir, ".gitignore"), /^\.drwil\/state\.json$/m);
  assert.match(read(dir, ".claude/settings.json"), /"SessionStart"[\s\S]*\.githooks\/state\.mjs/);
  // Sans state.json : SCOPING neutre, jamais d'état actif déduit.
  const neutre = spawnSync(process.execPath, [".githooks/state.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(neutre.status, 0);
  assert.match(neutre.stdout, /Activité : SCOPING/);
  // Un état invalide est signalé, sans faire échouer le démarrage de session.
  writeFileSync(join(dir, ".drwil/state.json"), "{ cassé");
  const invalide = spawnSync(process.execPath, [".githooks/state.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(invalide.status, 0);
  assert.match(invalide.stdout, /État invalide/);
});

test("rappel court : hook de saisie Claude livré, empreinte ignorée par Git, rien quand l'état n'a pas changé", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));

  assert.match(read(dir, ".gitignore"), /^\.drwil\/reminder\.json$/m);
  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  assert.match(JSON.stringify(reglages.hooks.UserPromptSubmit), /\.githooks\/state\.mjs\\" reminder/);
  const rappel = () => spawnSync(process.execPath, [".githooks/state.mjs", "reminder"], { cwd: dir, encoding: "utf8" });
  const premier = rappel();
  assert.equal(premier.status, 0);
  assert.match(premier.stdout, /\[drwil\] Rappel : SCOPING/);
  assert.equal(rappel().stdout, "", "état inchangé : rien n'est injecté");
});

test("QUA-037 : un sondage à choix multiple lance la première fiche et met les suivantes en file, avec la fusion", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = (nom) =>
    writeFileSync(
      join(dir, `docs/projects/${nom}.md`),
      `# Projet : ${nom}\n\n**Statut** : cadré le 2026-10-16.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/${nom}.ts\n-->\n\n## Critères d'acceptation\n\n- Critère — \`APP-001\`\n`,
    );
  fiche("un");
  fiche("deux");
  fiche("trois");
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const sondage = {
    questions: [
      {
        question: "Quelles fiches ?",
        header: "drwil-start",
        multiSelect: true,
        options: ["un", "deux", "trois"].map((n) => ({ label: `docs/projects/${n}.md`, description: n })),
      },
      {
        question: "Fusion ?",
        header: "drwil-merge",
        multiSelect: false,
        options: [
          { label: "Fusion automatique", description: "" },
          { label: "Fusion manuelle", description: "" },
        ],
      },
    ],
  };
  const r = spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: sondage,
      tool_response: {
        ...sondage,
        answers: { "Quelles fiches ?": "docs/projects/un.md, docs/projects/trois.md", "Fusion ?": "Fusion automatique" },
      },
    }),
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /file : ensuite docs\/projects\/trois\.md/);
  const etat = JSON.parse(read(dir, ".drwil/state.json"));
  assert.equal(etat.active_brief, "docs/projects/un.md");
  assert.deepEqual(etat.queue, ["docs/projects/trois.md"]);
  assert.equal(etat.queue_merge, true);
  assert.equal(etat.auto_merge, true);
});

test("QUA-037 : la file suit l'ordre des options du sondage, quel que soit l'ordre des clics", async () => {
  // Constaté le 2026-10-18 : Claude Code rend les choix multiples dans l'ordre des clics ; la file
  // suivait ces clics, pas l'ordre des options que range la skill de lancement.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  for (const nom of ["un", "deux", "trois", "quatre"])
    writeFileSync(
      join(dir, `docs/projects/${nom}.md`),
      `# Projet : ${nom}\n\n**Statut** : cadré le 2026-10-18.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/${nom}.ts\n-->\n\n## Critères d'acceptation\n\n- Critère — \`APP-001\`\n`,
    );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const sondage = {
    questions: [
      {
        question: "Quelles fiches ?",
        header: "drwil-start",
        multiSelect: true,
        options: ["un", "deux", "trois"].map((n) => ({ label: `docs/projects/${n}.md`, description: n })),
      },
    ],
  };
  // Clics : trois, une fiche saisie sous « Autre » (hors options : gardée après, dans l'ordre saisi), puis un.
  const r = spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: sondage,
      tool_response: {
        ...sondage,
        answers: { "Quelles fiches ?": "docs/projects/trois.md, docs/projects/quatre.md, docs/projects/un.md" },
      },
    }),
  });
  assert.equal(r.status, 0);
  const etat = JSON.parse(read(dir, ".drwil/state.json"));
  assert.equal(etat.active_brief, "docs/projects/un.md", "la première option cochée est lancée, pas le premier clic");
  assert.deepEqual(etat.queue, ["docs/projects/trois.md", "docs/projects/quatre.md"]);
});

test("QUA-037 : un seul brief : « Pas maintenant » ne lance rien et le dit ; sans réponse lue ou sur erreur, le hook le dit sans bloquer", async () => {
  // Constaté sur un projet neuf (2026-10-17) : un seul brief, sondage impossible à une option, puis
  // un hook muet qui laissait l'agent deviner pourquoi rien n'avait démarré.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projects/seule.md";
  writeFileSync(
    join(dir, fiche),
    "# Projet : Seule\n\n**Statut** : cadré le 2026-10-17.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/seule.ts\n-->\n\n## Critères d'acceptation\n\n- Critère — `APP-001`\n",
  );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const sondage = {
    questions: [
      {
        question: "Quelle fiche lancer ?",
        header: "drwil-start",
        multiSelect: false,
        options: [
          { label: fiche, description: "Seule" },
          { label: "Pas maintenant", description: "Ne rien lancer" },
        ],
      },
    ],
  };
  const hook = (reponse) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: "PostToolUse",
        tool_name: "AskUserQuestion",
        tool_input: sondage,
        tool_response: reponse === undefined ? { ...sondage } : { ...sondage, answers: { "Quelle fiche lancer ?": reponse } },
      }),
    });
  const etat = () => (existsSync(join(dir, ".drwil/state.json")) ? JSON.parse(read(dir, ".drwil/state.json")) : null);

  let r = hook("Pas maintenant");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /\[drwil\] .*rien n'est lancé.*Pas maintenant/);
  assert.equal(etat(), null, "« Pas maintenant » ne change pas l'état");

  r = hook(undefined);
  assert.equal(r.status, 0, "jamais bloquant");
  assert.match(r.stdout, /\[drwil\] .*aucune réponse lue.*node \.githooks\/state\.mjs start/);
  assert.equal(etat(), null);

  // Une erreur (ici, le moteur d'état illisible) est dite, l'état reste inchangé, l'outil n'est pas bloqué.
  const moteur = read(dir, ".githooks/state.mjs");
  writeFileSync(join(dir, ".githooks/state.mjs"), "throw new Error('moteur cassé');\n");
  r = hook(fiche);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /\[drwil\] .*erreur.*moteur cassé.*node \.githooks\/state\.mjs start/);
  assert.equal(etat(), null);
  writeFileSync(join(dir, ".githooks/state.mjs"), moteur);

  r = hook(fiche);
  assert.match(r.stdout, /BUILD \(lancé : docs\/projects\/seule\.md\)/);
  assert.equal(etat().active_brief, fiche);
});

test("QUA-044 : lancés depuis un sous-dossier, les hooks lisent la racine du projet et n'écrivent rien ailleurs", async () => {
  // Constaté le 2026-10-16 : après un `cd` de l'agent, le rappel lisait un état absent et créait un .drwil
  // parasite ; la garde de cadrage, ne trouvant pas .githooks/, ne refusait plus rien.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projects/racine.md";
  writeFileSync(
    join(dir, fiche),
    "# Projet : Racine\n\n**Statut** : cadré le 2026-10-17.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/couvert.ts\n-->\n\n## Critères d'acceptation\n\n- Critère — `APP-001`\n",
  );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const sous = join(dir, "src", "profond");
  mkdirSync(sous, { recursive: true });
  const lancer = (script, args, entree) =>
    spawnSync(process.execPath, [join(dir, script), ...args], { cwd: sous, encoding: "utf8", input: entree });

  // Sondage : la fiche est lancée à la racine.
  const sondage = {
    questions: [
      {
        question: "Quelle fiche ?",
        header: "drwil-start",
        multiSelect: false,
        options: [
          { label: fiche, description: "Racine" },
          { label: "Pas maintenant", description: "" },
        ],
      },
    ],
  };
  const r = lancer(
    ".claude/hooks/prompt-hook.mjs",
    [],
    JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: sondage,
      tool_response: { ...sondage, answers: { "Quelle fiche ?": fiche } },
    }),
  );
  assert.match(r.stdout, /BUILD \(lancé : docs\/projects\/racine\.md\)/);
  assert.equal(JSON.parse(read(dir, ".drwil/state.json")).activity, "BUILD");

  // Rappel d'état : l'état réel (BUILD), pas un état absent.
  rmSync(join(dir, ".drwil/reminder.json"), { force: true });
  assert.match(lancer(".githooks/state.mjs", ["reminder"]).stdout, /BUILD/);

  // Garde de cadrage : un fichier de code hors fiche reste refusé, un fichier couvert passe.
  const ecrire = (fichier) =>
    lancer(
      ".claude/hooks/scope-reminder.mjs",
      [],
      JSON.stringify({
        hook_event_name: "PreToolUse",
        tool_name: "Write",
        tool_input: { file_path: join(dir, fichier) },
      }),
    ).stdout;
  assert.match(ecrire("src/hors.ts"), /"permissionDecision":"deny"/);
  assert.equal(ecrire("src/couvert.ts").trim(), "");

  // Glossaire : le hook et la commande lisent le registre de la racine.
  const glose = lancer(
    ".claude/hooks/id-glossary.mjs",
    [],
    JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_response: "voir SEC-007",
    }),
  );
  assert.match(glose.stdout, /SEC-007 — /);
  assert.match(lancer(".githooks/glossary.mjs", ["SEC-007"]).stdout, /^SEC-007 — /);

  assert.ok(!existsSync(join(sous, ".drwil")), "aucun .drwil parasite dans le sous-dossier");
});

test("QUA-044 : par un chemin qui passe par un lien symbolique, les hooks se lancent quand même", async () => {
  // Constaté en CI macOS (2026-10-17) : le dossier temporaire /var y est un lien vers /private/var ; un
  // hook appelé par ce chemin se croyait importé (chemin appelé ≠ chemin réel) et ne faisait rien.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const lien = join(tmp(), "projet-lien");
  symlinkSync(dir, lien, "junction");
  const lancer = (script, args, entree) =>
    spawnSync(process.execPath, [join(lien, script), ...args], { cwd: lien, encoding: "utf8", input: entree });

  assert.match(lancer(".githooks/state.mjs", []).stdout, /SCOPING/);
  const sondage = { questions: [{ question: "Quelle fiche ?", header: "drwil-start", multiSelect: false, options: [] }] };
  const r = lancer(
    ".claude/hooks/prompt-hook.mjs",
    [],
    JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: sondage,
      tool_response: { ...sondage },
    }),
  );
  assert.match(r.stdout, /aucune réponse lue/, "le hook du sondage s'est lancé");
  const glose = lancer(
    ".claude/hooks/id-glossary.mjs",
    [],
    JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_response: "voir SEC-007",
    }),
  );
  assert.match(glose.stdout, /SEC-007 — /, "le hook du glossaire s'est lancé");
  const garde = lancer(
    ".claude/hooks/scope-reminder.mjs",
    [],
    JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: { file_path: join(lien, "src/hors.ts") },
    }),
  );
  assert.match(garde.stdout, /"permissionDecision":"deny"/, "la garde de cadrage s'est lancée");
  // Constaté en CI macOS (2026-10-24, PR #223) : le garde shell comparait encore des URL.
  const shell = lancer(
    ".claude/hooks/bash-guard.mjs",
    [],
    JSON.stringify({ tool_name: "Bash", tool_input: { command: "cat docs/contracts.md" } }),
  );
  assert.match(shell.stdout, /"permissionDecision":"deny"/, "le garde shell s'est lancé");
});

test("QUA-044 : tout point d'entrée livré compare les chemins réels, jamais une URL de process.argv[1]", () => {
  // Récidive constatée le 2026-10-24 (PR #223) : la correction de 2026-10-17 n'avait pas été appliquée
  // partout. Un point d'entrée qui compare des URL, ou un chemin réel à un chemin non résolu, ne se
  // lance pas par un lien symbolique (/var → /private/var sur macOS) : il ne fait rien, sans erreur.
  const entree = (ligne) => /process\.argv\[1\]/.test(ligne) && /import\.meta\.url/.test(ligne);
  const sain = (ligne) =>
    ligne.includes("realpathSync(process.argv[1])") &&
    ligne.includes("realpathSync(fileURLToPath(import.meta.url))") &&
    !/pathToFileURL\(process\.argv\[1\]\)/.test(ligne);
  assert.ok(!sain("if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {"), "le détecteur voit les URL");
  assert.ok(!sain("if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {"), "et un seul côté résolu");
  const racine = fileURLToPath(new URL("../templates/", import.meta.url));
  const fautifs = [];
  let points = 0;
  const parcourir = (dossier) => {
    for (const e of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, e.name);
      if (e.isDirectory()) parcourir(chemin);
      else if (e.name.endsWith(".mjs"))
        readFileSync(chemin, "utf8")
          .split("\n")
          .forEach((ligne, i) => {
            if (!entree(ligne)) return;
            points++;
            if (!sain(ligne)) fautifs.push(`${chemin.slice(racine.length)}:${i + 1}`);
          });
    }
  };
  parcourir(racine);
  assert.ok(points >= 20, `points d'entrée trouvés : ${points}`);
  assert.deepEqual(fautifs, [], "points d'entrée qui ne comparent pas les chemins réels des deux côtés");
});

test("QUA-037 : la skill de lancement dit un auto-merge refusé par le dépôt, reste en CLOSING et ne le dit jamais programmé", async () => {
  // Retour de drwil_com (2026-10-17) : sans « Allow auto-merge » dans les réglages du dépôt GitHub,
  // `gh pr merge --auto` échoue ; rien ne doit laisser croire que la fusion est programmée.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const skill = read(dir, ".claude/skills/start-a-workstream/SKILL.md");
  assert.match(skill, /auto-merge not allowed by the repository/);
  assert.match(skill, /Allow auto-merge/, "la marche à suivre : le réglage du dépôt");
  assert.match(skill, /stay in CLOSING/);
  assert.match(skill, /never say the merge is scheduled/);
});

test("QUA-037 : la skill et l'AGENTS.md livrés mènent une file un sous-agent par chantier, suivi de fusion borné, reprise confirmée", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  // Blancs ramenés à un espace : les phrases cherchées passent à la ligne dans le Markdown.
  const skill = read(dir, ".claude/skills/start-a-workstream/SKILL.md").replace(/\s+/g, " ");
  assert.match(skill, /each workstream in a subagent \(fresh context\)/);
  assert.match(skill, /its instructions start by reading the state: `node \.githooks\/state\.mjs`/);
  assert.match(skill, /never `isolation: "worktree"`/, "l'état ignoré par Git n'est pas dans une copie isolée");
  assert.match(skill, /One subagent at a time/);
  assert.match(skill, /The main session keeps only the reports/);
  assert.match(skill, /follows the PR with `gh` until it is merged, 30 minutes at most/);
  assert.match(skill, /never start the next one on a merge not done/);
  assert.match(skill, /« the queue resumes with <brief>: shall I start it\? »/);
  assert.match(skill, /only on an explicit yes/);
  const agents = consignes(dir).replace(/\s+/g, " ");
  assert.match(agents, /with Claude Code, each one in a subagent \(fresh context\)/);
  assert.match(agents, /30 minutes at most/);
  assert.match(agents, /explicit yes/);
});

test("QUA-050 : un projet installé reçoit la commande de détour, cadrée par la fiche de mécanique, la recette « corriger un défaut » et la consigne d'AGENTS.md", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  assert.ok(existsSync(join(dir, ".githooks/detour.mjs")));
  assert.match(read(dir, "docs/projects/kit-mechanics.md"), /^ {2}- \.githooks\/detour\.mjs$/m);
  const recette = read(dir, "docs/recipes/corriger-un-defaut.md").replace(/\s+/g, " ");
  assert.match(recette, /`node \.githooks\/detour\.mjs open <name> --title <defect> \[--files <a,b>\]`/);
  assert.match(recette, /Once the PR is merged: `node \.githooks\/detour\.mjs resume`/);
  assert.match(recette, /needs the human's yes/);
  const agents = consignes(dir).replace(/\s+/g, " ");
  assert.match(
    agents,
    /\*\*Detour for a prior defect\*\*: mid-workstream, a defect outside the active brief's scope is fixed by a detour the agent opens alone/,
  );
  assert.match(
    agents,
    /\| a defect to fix \| `node \.githooks\/glossary\.mjs --contract <ID>` \| `docs\/recipes\/corriger-un-defaut\.md` \|/,
  );
});

test("lancer par sondage : la réponse humaine lance (formats Claude Code et Copilot CLI), un sondage pré-rempli est refusé", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projects/essai.md";
  // Une fiche de chantier sans critère d'acceptation ne se lance pas (QUA-021).
  writeFileSync(
    join(dir, fiche),
    "# Projet : Essai\n\n**Statut** : cadré le 2026-10-10.\n\n<!-- scope\nfiles:\n  - src/essai.ts\n-->\n\n## Critères d'acceptation\n\n- Essai — `APP-001`\n",
  );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");

  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  for (const evenement of ["PreToolUse", "PostToolUse"]) {
    assert.ok(
      reglages.hooks[evenement].some((h) => h.matcher === "AskUserQuestion" && /prompt-hook\.mjs/.test(JSON.stringify(h.hooks))),
      evenement,
    );
  }
  assert.ok(reglages.permissions.deny.includes("Bash(*prompt-hook*)"), "l'agent ne peut pas appeler le hook lui-même par le shell");
  assert.ok(existsSync(join(dir, ".claude/skills/start-a-workstream/SKILL.md")));

  const hook = (entree) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], { cwd: dir, encoding: "utf8", input: JSON.stringify(entree) });
  const etat = () => (existsSync(join(dir, ".drwil/state.json")) ? JSON.parse(read(dir, ".drwil/state.json")) : null);
  const claude = {
    questions: [
      {
        question: "Quelle fiche lancer ?",
        header: "drwil-start",
        options: [
          { label: fiche, description: "Essai" },
          { label: "docs/projects/autre.md", description: "Autre" },
        ],
        multiSelect: false,
      },
    ],
  };
  const copilot = {
    message: "drwil-start : quelle fiche lancer ?",
    requestedSchema: { properties: { choix: { type: "string", enum: [fiche, "docs/projects/autre.md"] } } },
  };

  // Le modèle ne répond pas à la place de l'humain et ne présélectionne rien : refusé avant l'affichage.
  assert.equal(
    hook({
      hook_event_name: "PreToolUse",
      tool_name: "AskUserQuestion",
      tool_input: { ...claude, answers: { "Quelle fiche lancer ?": fiche } },
    }).status,
    2,
  );
  const avecDefaut = structuredClone(copilot);
  avecDefaut.requestedSchema.properties.choix.default = fiche;
  assert.equal(hook({ hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input: avecDefaut }).status, 2);
  assert.equal(
    hook({ hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input: claude }).status,
    0,
    "un vrai sondage passe",
  );
  assert.equal(etat(), null, "rien n'est lancé avant la réponse");

  // Un sondage qui n'est pas celui de drwil ne lance rien, même avec une fiche en réponse.
  const autre = { questions: [{ ...claude.questions[0], header: "Autre" }] };
  hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: autre,
    tool_response: { ...autre, answers: { "Quelle fiche lancer ?": fiche } },
  });
  assert.equal(etat(), null);

  // Claude Code : la réponse humaine arrive dans tool_response.answers.
  const r = hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: claude,
    tool_response: { ...claude, answers: { "Quelle fiche lancer ?": fiche } },
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /BUILD \(lancé : docs\/projects\/essai\.md\)/);
  assert.equal(etat().activity, "BUILD");
  assert.equal(etat().active_brief, fiche);
  assert.equal(etat().auto_merge, undefined, "sans seconde question, la fusion reste manuelle");

  // Seconde question (en-tête drwil-merge) : seule la réponse humaine autorise la fusion automatique.
  rmSync(join(dir, ".drwil/state.json"));
  const fusion = {
    question: "Fusion à la fin du chantier ?",
    header: "drwil-merge",
    options: [
      { label: "Fusion automatique", description: "…" },
      { label: "Fusion manuelle", description: "…" },
    ],
    multiSelect: false,
  };
  const claudeFusion = { questions: [...claude.questions, fusion] };
  assert.equal(
    hook({
      hook_event_name: "PreToolUse",
      tool_name: "AskUserQuestion",
      tool_input: { ...claudeFusion, answers: { "Fusion à la fin du chantier ?": "Fusion automatique" } },
    }).status,
    2,
  );
  hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: claudeFusion,
    tool_response: { ...claudeFusion, answers: { "Quelle fiche lancer ?": fiche, "Fusion à la fin du chantier ?": "Fusion manuelle" } },
  });
  assert.equal(etat().auto_merge, undefined);
  rmSync(join(dir, ".drwil/state.json"));
  const rf = hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: claudeFusion,
    tool_response: { ...claudeFusion, answers: { "Quelle fiche lancer ?": fiche, "Fusion à la fin du chantier ?": "Fusion automatique" } },
  });
  assert.match(rf.stdout, /fusion automatique autorisée/i);
  assert.equal(etat().auto_merge, true);

  // Copilot CLI : même hook, réponse en texte libre ; une fiche non cadrée est refusée.
  rmSync(join(dir, ".drwil/state.json"));
  const refus = hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: copilot,
    tool_result: { result_type: "success", text_result_for_llm: "User responded: docs/projects/autre.md" },
  });
  assert.match(refus.stdout, /n'est pas une fiche cadrée/);
  assert.equal(etat(), null);
  hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: copilot,
    tool_result: { result_type: "success", text_result_for_llm: `User responded: ${fiche}` },
  });
  assert.equal(etat().activity, "BUILD");
  assert.equal(etat().auto_merge, undefined);

  // Copilot CLI, champ `drwil-merge` : seule la réponse humaine autorise la fusion automatique, quel que soit l'ordre des champs.
  const copilotFusion = {
    message: copilot.message,
    requestedSchema: {
      properties: {
        choix: copilot.requestedSchema.properties.choix,
        "drwil-merge": { type: "string", enum: ["Automatic merge", "Manual merge"] },
      },
    },
  };
  assert.equal(
    hook({
      hook_event_name: "PreToolUse",
      tool_name: "AskUserQuestion",
      tool_input: {
        ...copilotFusion,
        requestedSchema: {
          properties: {
            ...copilotFusion.requestedSchema.properties,
            "drwil-merge": { enum: ["Automatic merge"], default: "Automatic merge" },
          },
        },
      },
    }).status,
    2,
  );
  for (const [reponse, auto] of [
    [`choix=${fiche}, drwil-merge=Automatic merge`, true],
    [`drwil-merge=Automatic merge, choix=${fiche}`, true],
    [`choix=${fiche}, drwil-merge=Manual merge`, false],
    [`choix=${fiche}`, false],
  ]) {
    rmSync(join(dir, ".drwil/state.json"));
    hook({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: copilotFusion,
      tool_result: { result_type: "success", text_result_for_llm: `User responded: ${reponse}` },
    });
    assert.equal(etat().activity, "BUILD", reponse);
    assert.equal(etat().auto_merge, auto ? true : undefined, reponse);
  }
});

test("QUA-142 : la réponse « Nouveau worktree » du sondage lance le chantier dans un worktree frère, « Ce dossier » dans le dossier d'origine", async () => {
  const parent = tmp();
  const dir = join(parent, "projet");
  mkdirSync(dir);
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projects/essai.md";
  writeFileSync(
    join(dir, fiche),
    "# Projet : Essai\n\n**Statut** : cadré le 2026-10-26.\n\n<!-- scope\nfiles:\n  - src/essai.ts\n-->\n\n## Critères d'acceptation\n\n- Essai — `APP-001`\n",
  );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const voisin = join(parent, "projet-essai");
  const hook = (entree) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify(entree),
    });
  const etatDe = (d) => (existsSync(join(d, ".drwil/state.json")) ? JSON.parse(read(d, ".drwil/state.json")) : null);
  const rejouer = (sondage, reponse) => {
    const r = hook({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: sondage,
      ...reponse,
    });
    assert.equal(r.status, 0);
    return r;
  };
  const choix = {
    question: "Quelle fiche lancer ?",
    header: "drwil-start",
    multiSelect: false,
    options: [{ label: fiche }, { label: "docs/projects/autre.md" }],
  };
  const lieu = {
    question: "Où mener le chantier ?",
    header: "drwil-worktree",
    multiSelect: false,
    options: [{ label: "Nouveau worktree" }, { label: "Ce dossier" }],
  };
  const claude = { questions: [choix, lieu] };
  const reponse = (r) => ({
    tool_response: {
      ...claude,
      answers: { "Quelle fiche lancer ?": fiche, "Où mener le chantier ?": r },
    },
  });

  // Un sondage avec la question du lieu et une réponse déjà remplie est refusé comme les autres.
  assert.equal(
    hook({
      hook_event_name: "PreToolUse",
      tool_name: "AskUserQuestion",
      tool_input: {
        ...claude,
        answers: { "Où mener le chantier ?": "Nouveau worktree" },
      },
    }).status,
    2,
  );
  rejouer(claude, reponse("Ce dossier"));
  assert.equal(etatDe(dir).activity, "BUILD", "« Ce dossier » : lancé là");
  assert.equal(existsSync(voisin), false);
  assert.equal(git(dir, "branch", "--show-current").stdout.trim(), "workstream/essai", "« Ce dossier » crée la branche du chantier");
  rmSync(join(dir, ".drwil/state.json"));
  git(dir, "switch", "-q", "-");
  git(dir, "branch", "-D", "workstream/essai");

  const r = rejouer(claude, reponse("Nouveau worktree"));
  assert.match(r.stdout, /Worktree créé/);
  assert.equal(etatDe(dir), null, "l'état du dossier d'origine ne change pas");
  assert.equal(etatDe(voisin).active_brief, fiche);
  assert.equal(etatDe(voisin).activity, "BUILD");

  // Copilot CLI : champ `drwil-worktree`, réponse `clé=valeur`, quel que soit l'ordre.
  git(dir, "worktree", "remove", "--force", voisin);
  git(dir, "branch", "-D", "workstream/essai");
  const copilot = {
    message: "drwil-start : quelle fiche lancer ?",
    requestedSchema: {
      properties: {
        choix: { type: "string", enum: [fiche, "docs/projects/autre.md"] },
        "drwil-worktree": {
          type: "string",
          enum: ["New worktree", "This folder"],
        },
      },
    },
  };
  rejouer(copilot, {
    tool_result: {
      result_type: "success",
      text_result_for_llm: `User responded: drwil-worktree=New worktree, choix=${fiche}`,
    },
  });
  assert.equal(etatDe(dir), null);
  assert.equal(etatDe(voisin).activity, "BUILD");
});

test("QUA-147 : la réponse « File en parallèle » du sondage lance chaque fiche cochée dans son worktree, « File séquentielle » garde la file du dossier", async () => {
  const parent = tmp();
  const dir = join(parent, "projet");
  mkdirSync(dir);
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiches = ["docs/projects/un.md", "docs/projects/deux.md"];
  for (const [i, f] of fiches.entries())
    writeFileSync(
      join(dir, f),
      `# Projet : Essai ${i}\n\n**Statut** : cadré le 2026-10-26.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/essai${i}.ts\n-->\n\n## Critères d'acceptation\n\n- Essai — \`APP-001\`\n\n## Incréments\n\n- **Lot 1** : essai\n`,
    );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const etatDe = (d) => (existsSync(join(d, ".drwil/state.json")) ? JSON.parse(read(d, ".drwil/state.json")) : null);
  const choix = {
    question: "Quelles fiches lancer ?",
    header: "drwil-start",
    multiSelect: true,
    options: fiches.map((label) => ({ label })),
  };
  const mode = {
    question: "Quel mode pour la file ?",
    header: "drwil-parallel",
    multiSelect: false,
    options: [{ label: "File en parallèle" }, { label: "File séquentielle" }],
  };
  const sondage = { questions: [choix, mode] };
  const rejouer = (evenement, reponse) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: evenement,
        tool_name: "AskUserQuestion",
        tool_input: sondage,
        tool_response: { ...sondage, answers: reponse },
      }),
    });

  // Une réponse déjà remplie dans le sondage est refusée comme pour les autres questions.
  assert.equal(
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: "PreToolUse",
        tool_name: "AskUserQuestion",
        tool_input: { ...sondage, answers: { "Quel mode pour la file ?": "File en parallèle" } },
      }),
    }).status,
    2,
  );
  rejouer("PostToolUse", { "Quelles fiches lancer ?": fiches.join(", "), "Quel mode pour la file ?": "File séquentielle" });
  assert.equal(etatDe(dir).active_brief, fiches[0]);
  assert.deepEqual(etatDe(dir).queue, [fiches[1]]);
  assert.equal(etatDe(dir).parallel, undefined);
  rmSync(join(dir, ".drwil/state.json"));
  git(dir, "switch", "-q", "-");
  git(dir, "branch", "-D", "workstream/un");

  // Cochées dans le désordre : l'ordre du sondage prévaut.
  const r = rejouer("PostToolUse", {
    "Quelles fiches lancer ?": `${fiches[1]}, ${fiches[0]}`,
    "Quel mode pour la file ?": "File en parallèle",
  });
  assert.match(r.stdout, /File en parallèle : 2 chantier\(s\) lancé\(s\) sur 2/);
  assert.deepEqual(etatDe(dir).parallel, fiches);
  assert.equal(etatDe(dir).activity, "SCOPING");
  assert.equal(etatDe(join(parent, "projet-un")).active_brief, fiches[0]);
  assert.equal(etatDe(join(parent, "projet-deux")).active_brief, fiches[1]);
});

test("QUA-165 : sous Copilot CLI, le champ des fiches à choix multiple (array, items.enum) est lu comme une file dans l'ordre des options, le choix unique reste lu", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiches = ["docs/projects/un.md", "docs/projects/deux.md"];
  for (const [i, f] of fiches.entries())
    writeFileSync(
      join(dir, f),
      `# Projet : Essai ${i}\n\n**Statut** : cadré le 2026-10-26.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/essai${i}.ts\n-->\n\n## Critères d'acceptation\n\n- Essai — \`APP-001\`\n\n## Incréments\n\n- **Lot 1** : essai\n`,
    );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const etat = () => (existsSync(join(dir, ".drwil/state.json")) ? JSON.parse(read(dir, ".drwil/state.json")) : null);
  const schema = {
    properties: {
      fiche: { type: "array", items: { type: "string", enum: fiches } },
      "drwil-merge": { type: "string", enum: ["Automatic merge", "Manual merge"] },
      "drwil-parallel": { type: "string", enum: ["Parallel queue", "Sequential queue"] },
    },
  };
  const rejouer = (evenement, reponse, requestedSchema = schema) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: evenement,
        tool_name: "ask_user",
        tool_input: { message: "drwil-start : quelles fiches lancer ?", requestedSchema },
        tool_result: { result_type: "success", text_result_for_llm: `User responded: ${reponse}` },
      }),
    });

  // Cochées dans le désordre : la file suit l'ordre des options, la fusion reste lue.
  rejouer("PostToolUse", `fiche=${fiches[1]}, ${fiches[0]}, drwil-merge=Automatic merge, drwil-parallel=Sequential queue`);
  assert.equal(etat().active_brief, fiches[0]);
  assert.deepEqual(etat().queue, [fiches[1]]);
  assert.equal(etat().auto_merge, true);
  rmSync(join(dir, ".drwil/state.json"));

  // Liste entre crochets : mêmes valeurs ; une seule fiche cochée est un lancement simple.
  rejouer("PostToolUse", `fiche=["${fiches[1]}"], drwil-merge=Manual merge, drwil-parallel=Sequential queue`);
  assert.equal(etat().active_brief, fiches[1]);
  assert.deepEqual(etat().queue ?? [], []);
  rmSync(join(dir, ".drwil/state.json"));

  // Le hook ne remplit jamais la réponse : une valeur par défaut est refusée.
  const avecDefaut = structuredClone(schema);
  avecDefaut.properties.fiche.default = [fiches[0]];
  assert.equal(rejouer("PreToolUse", "", avecDefaut).status, 2);
  assert.equal(rejouer("PreToolUse", "").status, 0);
});

test("QUA-180 : le skill prescrit à Copilot CLI le champ des fiches en choix unique, et le hook lit une fiche en enum seul comme un tableau", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const skill = read(dir, ".claude/skills/start-a-workstream/SKILL.md").replace(/\s+/g, " ");
  assert.match(skill, /a first field `fiche` with \*\*single choice\*\*: `type: "string"` and `enum`/);
  assert.match(skill, /\*\*never\*\* `type: "array"`/);
  assert.doesNotMatch(skill, /`type: "array"` and `items\.enum`/);

  const fiche = "docs/projects/un.md";
  writeFileSync(
    join(dir, fiche),
    "# Projet : Essai\n\n**Statut** : cadré le 2026-10-26.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/essai.ts\n-->\n\n## Critères d'acceptation\n\n- Essai — `APP-001`\n\n## Incréments\n\n- **Lot 1** : essai\n",
  );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const etat = () => JSON.parse(read(dir, ".drwil/state.json"));
  const rejouer = (fichesSchema, reponse) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: "PostToolUse",
        tool_name: "ask_user",
        tool_input: {
          message: "drwil-start : quelle fiche lancer ?",
          requestedSchema: {
            properties: { fiche: fichesSchema, "drwil-merge": { type: "string", enum: ["Automatic merge", "Manual merge"] } },
          },
        },
        tool_result: { result_type: "success", text_result_for_llm: `User responded: ${reponse}` },
      }),
    });

  rejouer({ type: "string", enum: [fiche] }, `fiche=${fiche}, drwil-merge=Automatic merge`);
  assert.equal(etat().active_brief, fiche);
  assert.equal(etat().auto_merge, true);
  rmSync(join(dir, ".drwil/state.json"));

  rejouer({ type: "array", items: { type: "string", enum: [fiche] } }, `fiche=["${fiche}"], drwil-merge=Manual merge`);
  assert.equal(etat().active_brief, fiche);
});

test("transitions : humain par défaut, façade drwil etat, blocages Claude sur l'état et le saut des hooks", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projects/kit-mechanics.md";
  const drwilEtat = (...args) =>
    spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "state", ...args], {
      cwd: dir,
      encoding: "utf8",
      env: envTest,
    });

  assert.equal(config(dir).transitions, "human");
  // Sans terminal interactif, ouvrir une attente est refusé en mode humain.
  const refus = drwilEtat("move", "EXPECTATION", "--brief", fiche);
  assert.equal(refus.status, 1);
  assert.match(refus.stderr, /terminal interactif/);
  assert.ok(!existsSync(join(dir, ".drwil/state.json")), "état inchangé");
  // En mode agent, la façade transmet --brief au module du projet.
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), transitions: "agent" }));
  const ok = drwilEtat("move", "EXPECTATION", "--brief", fiche);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(drwilEtat().stdout, /Activité : EXPECTATION/);

  // Barrière de périmètre : livrée bloquante à l'installation neuve, hook du trailer exécutable, couverte par la fiche mécanique.
  assert.equal(config(dir).scopeGate, "blocking");
  if (process.platform !== "win32")
    assert.ok(statSync(join(dir, ".githooks/prepare-commit-msg")).mode & 0o111, "prepare-commit-msg exécutable");
  assert.match(read(dir, "docs/projects/kit-mechanics.md"), /\.githooks\/scope-gate\.mjs/);

  const deny = JSON.parse(read(dir, ".claude/settings.json")).permissions.deny;
  for (const regle of ["Edit(**/.drwil/state.json)", "Write(**/.drwil/state.json)", "Bash(git commit -n*)"])
    assert.ok(deny.includes(regle), regle);
  assert.ok(deny.some((r) => r.includes("no-verify")));
  // L'option globale `git -c clé=valeur` (exécution arbitraire) est refusée en tête ; le motif large
  // qui refusait aussi les options `-c` des sous-commandes (création de branche…) ne revient pas.
  assert.ok(deny.includes("Bash(git -c *)"));
  assert.ok(!deny.some((r) => /^Bash\(git \*.*-c \*\)$/.test(r)), "aucun refus de -c n'importe où dans une commande git");
  // Ce que deviendrait un `-c` placé après une autre option globale : aucune autorisation git ne le couvre.
  const allow = JSON.parse(read(dir, ".claude/settings.json")).permissions.allow;
  assert.ok(
    allow.filter((r) => r.startsWith("Bash(git ")).every((r) => /^Bash\(git [a-z-]+(:\*)?\)$/.test(r)),
    "allow git = préfixes de sous-commande",
  );
});

test("apply sur un projet existant : stack et couches découvertes, rien d'écrasé, pas de git init", async () => {
  const dir = tmp();
  mkdirSync(join(dir, "api"));
  mkdirSync(join(dir, "web"));
  writeFileSync(join(dir, "api/pyproject.toml"), '[project]\ndependencies = ["fastapi"]\n');
  writeFileSync(join(dir, "web/package.json"), JSON.stringify({ dependencies: { react: "18" }, devDependencies: { vite: "5" } }));
  writeFileSync(join(dir, "README.md"), "# existant\n");
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  assert.equal(read(dir, "README.md"), "# existant\n");
  assert.ok(!existsSync(join(dir, ".git")));
  assert.ok(!existsSync(join(dir, "backend")), "pas de couche inventée");
  const cfg = config(dir);
  assert.deepEqual(cfg.layers, ["api", "web"]);
  assert.deepEqual(cfg.stack, [
    { path: "api", technos: ["Python (FastAPI)"] },
    { path: "web", technos: ["Node.js (React, Vite)"] },
  ]);
  assert.match(read(dir, "docs/architecture.md"), /`web\/` : Node\.js \(React, Vite\)/);
  assert.match(read(dir, "api/AGENTS.md"), /api layer context/);
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout);
});

// Projet déjà outillé : chaque fichier que drwil garde tel quel manque de ce dont drwil a besoin.
function projetOutille() {
  const dir = tmp();
  git(dir, "init", "-q", "-b", "main");
  const fichiers = {
    ".gitignore": "/node_modules\r\n/build\r\n",
    "AGENTS.md": "# Mon projet\nRègles maison.\n",
    "CLAUDE.md": "mes consignes à moi\n",
    ".claude/settings.json": JSON.stringify({ permissions: { allow: ["Bash(npm test)"] }, model: "opus" }, null, 2) + "\n",
    ".gitlab-ci.yml": "test:\n  script: npm test\n",
    ".gitleaks.toml": "[allowlist]\npaths = ['''fixtures/''']\n",
    ".github/copilot-instructions.md": "Conventions maison.\n",
    ".husky/pre-commit": "npm test\n",
    "package.json": JSON.stringify({ dependencies: { react: "18" } }),
  };
  for (const [f, contenu] of Object.entries(fichiers)) {
    mkdirSync(join(dir, f, ".."), { recursive: true });
    writeFileSync(join(dir, f), contenu);
  }
  git(dir, "config", "core.hooksPath", ".husky/_");
  return { dir, fichiers };
}

const instantane = (dir) => {
  const liste = git(dir, "ls-files", "-co", "--exclude-standard").stdout.trim().split("\n");
  return Object.fromEntries(liste.map((f) => [f, read(dir, f)]));
};

test("projet existant : init complète sans écraser, l'aperçu l'annonce, un second init ne change rien", async () => {
  const { dir, fichiers } = projetOutille();
  const a = await previewInit({ lang: "fr", targetDir: dir });
  assert.deepEqual(a.added.map((x) => x.file).sort(), [
    ".claude/settings.json",
    ".drwil/AGENTS.md",
    ".github/copilot-instructions.md",
    ".gitignore",
    ".gitleaks.toml",
    "AGENTS.md",
    "CLAUDE.md",
  ]);
  assert.deepEqual(a.gaps.map((g) => g.kind).sort(), ["ci", "hooksPath"], "CI et hooks : laissés à l'humain");
  assert.equal(read(dir, "AGENTS.md"), fichiers["AGENTS.md"], "l'aperçu n'écrit rien");

  const lignes = await capture(() => init({ lang: "fr", targetDir: dir }));
  const sortie = lignes.join("\n");
  // settings.json est fusionné, .gitleaks.toml complété dans sa table : vérifiés à part.
  for (const [f, contenu] of Object.entries(fichiers))
    if (![".claude/settings.json", ".gitleaks.toml"].includes(f))
      assert.ok(read(dir, f).startsWith(contenu.replace(/\s*$/, "")), `contenu du projet gardé : ${f}`);
  assert.match(read(dir, ".gitignore"), /\/build\r\n\r\n# >>> drwil\r\n\.env\r\n/, "bloc ajouté, fins de ligne du projet respectées");
  for (const l of [".drwil/state.json", ".drwil/reminder.json", ".claude/settings.local.json"])
    assert.ok(read(dir, ".gitignore").includes(l), l);
  assert.match(read(dir, "CLAUDE.md"), /@AGENTS\.md\n@\.drwil\/AGENTS\.md\n<!-- <<< drwil -->/);
  assert.match(read(dir, ".drwil/AGENTS.md"), /node \.githooks\/state\.mjs/, "consignes drwil mises à part");
  assert.match(read(dir, ".github/copilot-instructions.md"), /Read and apply `AGENTS\.md`/);
  assert.match(read(dir, ".gitleaks.toml"), /paths = \[\n {2}'''.*installed-files.*''', # drwil\n {2}'''fixtures\/''']/);
  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  assert.equal(reglages.model, "opus", "clé du projet gardée");
  assert.equal(reglages.permissions.allow[0], "Bash(npm test)", "permission du projet gardée, en tête");
  assert.ok(reglages.permissions.deny.includes("Bash(git *--no-verify*)"));
  assert.ok(reglages.hooks.SessionStart[0].hooks[0].command.includes(".githooks/state.mjs"));
  assert.equal(config(dir).ci, "gitlab", "CI existante détectée");
  assert.equal(read(dir, ".gitlab-ci.yml"), fichiers[".gitlab-ci.yml"], "fichier CI jamais réécrit");
  assert.equal(git(dir, "config", "core.hooksPath").stdout.trim(), ".husky/_", "gestionnaire de hooks du projet gardé");
  assert.match(sortie, /\.gitlab-ci\.yml: .*job `checks` absent[\s\S]*- node \.githooks\/run-checks\.mjs/);
  assert.match(sortie, /\.husky\/pre-commit: \.githooks\/pre-commit "\$@" \|\| exit \$\?/);

  const avant = instantane(dir);
  const encore = await capture(() => init({ lang: "fr", targetDir: dir }));
  assert.ok(!encore.some((l) => l.includes("Ajouté aux fichiers du projet")), encore.join("\n"));
  assert.deepEqual(instantane(dir), avant, "un second init ne change rien");
});

test("projet existant : doctor signale ce qui manque avec le correctif ; hooks chaînés acceptés", async () => {
  const { dir } = projetOutille();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  let d = await doctor({ targetDir: dir });
  assert.equal(d.code, 1);
  assert.match(
    d.points.find((p) => p.id === "hooks").detail,
    /jamais appelés \(pre-commit, pre-push, prepare-commit-msg\) — les appeler depuis \.husky,/,
  );
  assert.match(d.points.find((p) => p.id === "essentials:.gitlab-ci.yml").detail, /correctif : checks:/);
  for (const h of ["pre-commit", "pre-push", "prepare-commit-msg"])
    appendFileSync(join(dir, ".husky", h), `.githooks/${h} "$@" || exit $?\n`);
  writeFileSync(join(dir, ".gitignore"), "/node_modules\n");
  d = await doctor({ targetDir: dir });
  assert.equal(d.points.find((p) => p.id === "hooks").state, "ok", "hooks drwil appelés depuis husky");
  assert.match(d.points.find((p) => p.id === "essentials:.gitignore").detail, /\.drwil\/state\.json.*correctif : npx drwil init/);
});

test("projet existant : uninstall retire ce que drwil a ajouté, rien d'autre", async () => {
  const { dir, fichiers } = projetOutille();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  const apercu = await uninstall({ targetDir: dir });
  assert.ok(apercu.cleaned.includes("AGENTS.md") && read(dir, "AGENTS.md").includes(">>> drwil"), "dry-run : listé, rien retiré");
  const r = await uninstall({ targetDir: dir, dryRun: false });
  assert.deepEqual(r.cleaned.sort(), [
    ".claude/settings.json",
    ".github/copilot-instructions.md",
    ".gitignore",
    ".gitleaks.toml",
    "AGENTS.md",
    "CLAUDE.md",
  ]);
  for (const f of [".gitignore", "AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"])
    assert.equal(read(dir, f), fichiers[f], `rendu à l'identique : ${f}`);
  // Un tableau sur une ligne a été ouvert pour y mettre la ligne drwil : il revient équivalent, sur deux lignes.
  assert.equal(read(dir, ".gitleaks.toml").replace(/\s+/g, ""), fichiers[".gitleaks.toml"].replace(/\s+/g, ""));
  assert.ok(!existsSync(join(dir, ".drwil/AGENTS.md")));
  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  assert.equal(reglages.hooks, undefined, "hooks du kit retirés : leurs scripts n'existent plus");
  assert.equal(reglages.model, "opus");
});

test("ajouts sans écraser : liste blanche gitleaks sous ses deux formes, bloc complété en place", async () => {
  const { mergeGitleaks, addToBlock } = await import("../dist/complete.js");
  const { stripAdditions } = await import("../dist/complete-strip.js");
  const nouveau = mergeGitleaks("[[allowlists]]\npaths = ['''a''']\n");
  assert.match(nouveau, /# >>> drwil\n\[\[allowlists\]\]\npaths = \[/, "forme récente : une table de plus, pas [allowlist]");
  assert.equal(stripAdditions(nouveau), "[[allowlists]]\npaths = ['''a''']\n");
  const sansChemins = mergeGitleaks("[allowlist]\ndescription = 'x'\n");
  assert.match(sansChemins, /\[allowlist\]\npaths = \['''.*installed-files.*'''\] # drwil\ndescription/);
  assert.equal(stripAdditions(sansChemins), "[allowlist]\ndescription = 'x'\n");
  const multi = mergeGitleaks("[allowlist]\npaths = [\n  '''a''',\n]\n");
  assert.match(multi, /paths = \[\n {2}'''.*installed-files.*''', # drwil\n {2}'''a''',\n\]/);
  const bloc = addToBlock("x\n\n# >>> drwil\n.env\n# <<< drwil\n", [".drwil/state.json"], { begin: "# >>> drwil", end: "# <<< drwil" });
  assert.equal(bloc, "x\n\n# >>> drwil\n.env\n.drwil/state.json\n# <<< drwil\n", "ligne ajoutée dans le bloc existant");
  assert.equal(stripAdditions("rien de drwil\n"), null);
});

test("mécanique Claude : .claude/hooks/ rafraîchi comme .githooks/, une modification à la main signalée", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const ancienne = "// version précédente du kit\n";
  writeFileSync(join(dir, ".claude/hooks/bash-guard.mjs"), ancienne);
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  manifeste[".claude/hooks/bash-guard.mjs"] = createHash("sha256").update(ancienne).digest("hex");
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2));
  appendFileSync(join(dir, ".claude/hooks/scope-reminder.mjs"), "\n// modifié à la main\n");
  const lignes = await capture(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.notEqual(read(dir, ".claude/hooks/bash-guard.mjs"), ancienne, "inchangé depuis l'installation : rafraîchi");
  assert.ok(read(dir, ".claude/hooks/scope-reminder.mjs").includes("modifié à la main"), "modifié à la main : gardé");
  assert.ok(
    lignes.some((l) => l.includes(".claude/hooks/scope-reminder.mjs")),
    "et signalé comme dérive",
  );
});

test("init() signale (sans réécrire) un fichier déjà présent qui a dérivé du template", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, layers: "backend,frontend" }));

  // fichier identique au template (mêmes couches entre init et apply) : pas signalé.
  let lignes = await capture(() => init({ lang: "fr", targetDir: dir, git: false, layers: "backend,frontend" }));
  assert.ok(!lignes.some((l) => l.includes("dérivés")), lignes.join("\n"));

  // une recette dérive (contenu raccourci, une section en moins) : signalée, jamais réécrite.
  const avant = read(dir, "docs/recipes/refactor-without-breaking.md");
  writeFileSync(join(dir, "docs/recipes/refactor-without-breaking.md"), "# Refactorer\n\nTexte raccourci, une seule section.\n");
  lignes = await capture(() => init({ lang: "fr", targetDir: dir, git: false, layers: "backend,frontend" }));
  assert.ok(
    lignes.some((l) => l.includes("dérivés")),
    lignes.join("\n"),
  );
  assert.ok(
    lignes.some((l) => l.includes("docs/recipes/refactor-without-breaking.md")),
    lignes.join("\n"),
  );
  assert.equal(
    read(dir, "docs/recipes/refactor-without-breaking.md"),
    "# Refactorer\n\nTexte raccourci, une seule section.\n",
    "jamais réécrit automatiquement",
  );
  assert.notEqual(read(dir, "docs/recipes/refactor-without-breaking.md"), avant);
});

test("init écrit un manifeste des fichiers installés (chemin + sha256), fusionné sans perte entre deux init()", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, layers: "backend,frontend" }));
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  assert.ok(Object.keys(manifeste).length > 10, "plusieurs fichiers enregistrés");
  assert.ok("AGENTS.md" in manifeste, "AGENTS.md présent");
  assert.equal(manifeste["AGENTS.md"], createHash("sha256").update(read(dir, "AGENTS.md")).digest("hex"));

  // init() une 2ᵉ fois sans rien changer : le manifeste existant est conservé à l'identique (fusion, pas d'écrasement).
  const avant = read(dir, ".drwil/installed-files.json");
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, layers: "backend,frontend" }));
  assert.equal(read(dir, ".drwil/installed-files.json"), avant);
});

test("lot 2 (désinstallation) : dry-run par défaut, --yes supprime, fichier modifié conservé, docs/projets jamais touché", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.ok(existsSync(join(dir, ".githooks/check-docs.mjs")));

  // dry-run (défaut) : rien n'est supprimé, juste rapporté.
  let rapport = await uninstall({ targetDir: dir });
  assert.ok(rapport.removed.includes(".githooks/check-docs.mjs"));
  assert.ok(existsSync(join(dir, ".githooks/check-docs.mjs")), "dry-run ne supprime rien");
  assert.ok(existsSync(join(dir, "AGENTS.md")));

  // un fichier modifié depuis l'installation : jamais supprimé, listé à part.
  writeFileSync(join(dir, "AGENTS.md"), read(dir, "AGENTS.md") + "\nLigne ajoutée par le projet.\n");
  const empreinteModifiee = read(dir, "AGENTS.md");

  // suppression réelle.
  rapport = await uninstall({ targetDir: dir, dryRun: false });
  assert.ok(!existsSync(join(dir, ".githooks/check-docs.mjs")), "fichier intact supprimé");
  assert.ok(rapport.modified.includes("AGENTS.md"), "fichier modifié signalé");
  assert.ok(existsSync(join(dir, "AGENTS.md")), "fichier modifié jamais supprimé");
  assert.equal(read(dir, "AGENTS.md"), empreinteModifiee);

  // docs/projects/, docs/intentions/, docs/recipes/ jamais touchés, même présents au manifeste.
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  assert.ok(Object.keys(manifeste).some((p) => p.startsWith("docs/projects/")));
  assert.ok(existsSync(join(dir, "docs/projects/pending.md")), "docs/projects/ jamais supprimé par uninstall");

  // le manifeste ne garde plus les entrées des fichiers réellement supprimés.
  const manifesteApres = JSON.parse(read(dir, ".drwil/installed-files.json"));
  assert.ok(!(".githooks/check-docs.mjs" in manifesteApres));
});

test("lot 6 (gouvernance) : uninstall liste l'état local, ne le supprime qu'avec --yes", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const etat = join(dir, ".drwil", "state.json");
  writeFileSync(etat, JSON.stringify({ version: 1, activity: "SCOPING", active_brief: null, active_request: null, since: null }));
  assert.ok((await uninstall({ targetDir: dir })).removed.includes(".drwil/state.json"));
  assert.ok(existsSync(etat), "dry-run ne supprime pas l'état");
  assert.ok((await uninstall({ targetDir: dir, dryRun: false })).removed.includes(".drwil/state.json"));
  assert.ok(!existsSync(etat), "--yes supprime l'état local");
  assert.ok(!(await uninstall({ targetDir: dir })).removed.includes(".drwil/state.json"), "absent : rien à lister");
});

test("lot 2 (résolution de dérive) : diff affiché, confirmation respectée, .bak créé, --forcer fonctionnel", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));

  const cible = ".githooks/check-docs.mjs";
  const original = read(dir, cible);
  writeFileSync(join(dir, cible), "// personnalisé par le projet\n" + original);

  // rien à résoudre si pas de dérive (autre fichier, comparé au modèle exact).

  // confirmation refusée : le fichier n'est jamais réécrit, pas de .bak, signalé dans `ignores`.
  let rapport = await quiet(() => resolveDrift({ targetDir: dir }, () => false));
  assert.ok(rapport.ignored.includes(cible), rapport.ignored.join(","));
  assert.ok(!rapport.resolved.length);
  assert.equal(read(dir, cible), "// personnalisé par le projet\n" + original, "jamais réécrit sans confirmation");
  assert.ok(!existsSync(join(dir, `${cible}.bak`)));

  // confirmation acceptée : réécrit, .bak créé avec l'ancien contenu, diff transmis au confirmateur.
  let diffRecu = "";
  rapport = await quiet(() =>
    resolveDrift({ targetDir: dir }, (rel, diff) => {
      diffRecu = diff;
      return rel === cible;
    }),
  );
  assert.ok(rapport.resolved.includes(cible), rapport.resolved.join(","));
  assert.match(diffRecu, /personnalisé par le projet/);
  assert.equal(read(dir, cible), original, "réécrit avec le contenu du modèle");
  assert.equal(read(dir, `${cible}.bak`), "// personnalisé par le projet\n" + original, ".bak garde l'ancien contenu");

  // plus rien à résoudre une fois réécrit (confirmateur jamais appelé).
  let appele = false;
  rapport = await quiet(() =>
    resolveDrift({ targetDir: dir }, () => {
      appele = true;
      return true;
    }),
  );
  assert.ok(!appele);
  assert.ok(!rapport.resolved.length && !rapport.ignored.length);

  // --forcer : écrase sans passer par le confirmateur (dérive réintroduite pour le test).
  writeFileSync(join(dir, cible), "// re-personnalisé\n" + original);
  appele = false;
  rapport = await quiet(() =>
    resolveDrift({ targetDir: dir, force: true }, () => {
      appele = true;
      return true;
    }),
  );
  assert.ok(!appele, "--forcer n'appelle jamais le confirmateur");
  assert.ok(rapport.resolved.includes(cible));
  assert.equal(read(dir, cible), original);
});

test("lot 2 (résolution de dérive) : jamais appliquée automatiquement par init()/init(), ne crée aucun fichier absent", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));

  // rien n'a dérivé juste après init() : aucune résolution nécessaire.
  let rapport = await quiet(() => resolveDrift({ targetDir: dir, force: true }));
  assert.ok(!rapport.resolved.length && !rapport.ignored.length);

  // un fichier mécanique absent (supprimé par le projet) n'est jamais recréé par resolveDrift.
  const absent = join(dir, ".githooks/check-docs.mjs");
  const fs = await import("node:fs/promises");
  await fs.rm(absent);
  rapport = await quiet(() => resolveDrift({ targetDir: dir, force: true }));
  assert.ok(!rapport.resolved.includes(".githooks/check-docs.mjs"));
  assert.ok(!existsSync(absent), "jamais recréé par resolveDrift");
});

test("point 3 (suites-kit-portable) : un fichier obsolète d'une ancienne version du kit, jamais modifié, est supprimé par init()/init()", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));

  // simule un fichier d'une ancienne version du kit, plus présent dans le template actuel,
  // mais déjà enregistré dans le manifeste (comme s'il avait été écrit par une version antérieure).
  const obsolete = ".githooks/ancien-script.py";
  const contenuObsolete = "# ancien script Python, retiré du kit depuis\n";
  writeFileSync(join(dir, obsolete), contenuObsolete);
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  manifeste[obsolete] = createHash("sha256").update(contenuObsolete).digest("hex");
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2) + "\n");

  // un fichier obsolète mais modifié depuis par le projet : jamais supprimé.
  const obsoleteModifie = ".githooks/autre-ancien.sh";
  const contenuInitial = "#!/bin/sh\n# ancien hook\n";
  writeFileSync(join(dir, obsoleteModifie), contenuInitial);
  manifeste[obsoleteModifie] = createHash("sha256").update(contenuInitial).digest("hex");
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2) + "\n");
  writeFileSync(join(dir, obsoleteModifie), contenuInitial + "# modifié par le projet\n");

  const lignes = await capture(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.ok(!existsSync(join(dir, obsolete)), "fichier obsolète non modifié supprimé");
  assert.ok(existsSync(join(dir, obsoleteModifie)), "fichier obsolète mais modifié conservé");
  assert.ok(
    lignes.some((l) => l.includes(obsolete)),
    lignes.join("\n"),
  );

  const manifesteApres = JSON.parse(read(dir, ".drwil/installed-files.json"));
  assert.ok(!(obsolete in manifesteApres), "entrée retirée du manifeste");
  assert.ok(obsoleteModifie in manifesteApres, "entrée du fichier modifié conservée");
});

test("un contrat préfixé par un autre dépôt n'est pas cherché dans le registre local", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  appendFileSync(join(dir, "docs/ia-first.md"), "\nVoir run-box-v2:SEC-777, mais SEC-888 doit exister.\n");
  const r = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stdout, /SEC-777/);
  assert.match(r.stdout, /SEC-888/);
});

test("une couche imbriquée renvoie au bon AGENTS.md racine", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, layers: "packages/api", git: false }));
  assert.match(read(dir, "packages/api/AGENTS.md"), /`\.\.\/\.\.\/AGENTS\.md`/);
  assert.equal(checks(dir).status, 0);
});

test("QUA-064 : choisir copilot installe aussi l'arbre .claude (hooks, réglages, skills) que Copilot lit, et ses hooks natifs", async () => {
  const dir = tmp();
  await init({ lang: "fr", targetDir: dir, tools: "copilot", git: false });
  for (const f of [
    ".claude/settings.json",
    ".claude/hooks/scope-reminder.mjs",
    ".claude/skills/start-a-workstream/SKILL.md",
    ".github/hooks/drwil.json",
  ])
    assert.ok(existsSync(join(dir, f)), f);
  assert.ok(!existsSync(join(dir, "CLAUDE.md")), "le pointeur CLAUDE.md reste lié à l'outil claude");
  const natifs = JSON.parse(read(dir, ".github/hooks/drwil.json")).hooks;
  assert.match(natifs.sessionStart[0].command, /state\.mjs copilot-start/);
  assert.match(natifs.userPromptTransformed[0].command, /state\.mjs copilot-message/);
});

test("QUA-066 : choisir gemini installe aussi les hooks partagés et ses réglages natifs, sans les skills ni CLAUDE.md propres à Claude", async () => {
  const dir = tmp();
  await init({ lang: "fr", targetDir: dir, tools: "gemini", git: false });
  for (const f of [".claude/hooks/scope-reminder.mjs", ".gemini/settings.json", "GEMINI.md"]) assert.ok(existsSync(join(dir, f)), f);
  assert.ok(!existsSync(join(dir, "CLAUDE.md")), "le pointeur CLAUDE.md reste lié à l'outil claude");
  const hooks = JSON.parse(read(dir, ".gemini/settings.json")).hooks;
  assert.match(hooks.SessionStart[0].hooks[0].command, /state\.mjs" gemini-start/);
  assert.match(hooks.BeforeAgent[0].hooks[0].command, /state\.mjs" gemini-message/);
  for (const evenement of ["BeforeTool", "AfterTool"]) {
    assert.equal(hooks[evenement][0].matcher, "write_file|replace");
    assert.match(hooks[evenement][0].hooks[0].command, /\.claude\/hooks\/scope-reminder\.mjs/);
  }
});

test("QUA-067 : scope-reminder refuse write_file et replace sous Gemini avec un decision deny, et rappelle après coup en avertissement", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "gemini", git: false }));
  const hook = (evenement, outil, chemin) =>
    spawnSync(process.execPath, [".claude/hooks/scope-reminder.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ hook_event_name: evenement, tool_name: outil, tool_input: { file_path: join(dir, chemin) } }),
    });
  for (const outil of ["write_file", "replace"]) {
    const refus = JSON.parse(hook("BeforeTool", outil, "scripts/nouveau.mjs").stdout);
    assert.equal(refus.decision, "deny");
    assert.match(refus.reason, /Écriture refusée \(QUA-016.*scripts\/nouveau\.mjs/);
  }
  assert.equal(hook("BeforeTool", "write_file", "docs/notes.md").stdout.trim(), "", "la doc n'est jamais refusée");
  assert.equal(hook("AfterTool", "write_file", "scripts/nouveau.mjs").stdout.trim(), "", "en bloquant, pas de rappel après coup");
  writeFileSync(
    join(dir, ".drwil/ia-first.json"),
    JSON.stringify({ ...JSON.parse(read(dir, ".drwil/ia-first.json")), scopeReminder: "warning" }),
  );
  assert.equal(hook("BeforeTool", "write_file", "scripts/nouveau.mjs").stdout.trim(), "");
  const rappel = JSON.parse(hook("AfterTool", "write_file", "scripts/nouveau.mjs").stdout).hookSpecificOutput;
  assert.equal(rappel.hookEventName, "AfterTool");
  assert.match(rappel.additionalContext, /Rappel de cadrage/);
});

test("une valeur d'option inconnue est refusée", async () => {
  await assert.rejects(() => init({ targetDir: tmp(), lang: "de" }), /--lang/);
  await assert.rejects(() => init({ lang: "fr", targetDir: tmp(), tools: "claude,vim" }), /--tools/);
  await assert.rejects(() => init({ lang: "fr", targetDir: tmp(), ci: "jenkins" }), /--ci/);
});

test("QUA-017 : pas de travail direct sur la branche principale, même pour le tout premier commit", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  enAvertissement(dir);
  // init() bascule déjà sur une branche de travail avant tout commit (plus jamais sur master/main).
  const branche = git(dir, "symbolic-ref", "--short", "HEAD");
  assert.equal(
    branche.stdout.trim(),
    "workstream/kit-installation",
    "init() laisse l'utilisateur sur une branche de travail, jamais master",
  );

  git(dir, "add", "-A");
  const premier = git(dir, "commit", "-qm", "premier commit");
  assert.equal(premier.status, 0, "le premier commit sur la branche de travail passe : " + premier.stdout + premier.stderr);

  // même le tout premier commit d'un dépôt est refusé s'il atterrit directement sur master (plus d'exception de bootstrap).
  const autreDir = tmp();
  git(autreDir, "init", "-qb", "master");
  cpSync(join(dir, ".githooks"), join(autreDir, ".githooks"), { recursive: true });
  git(autreDir, "config", "core.hooksPath", ".githooks");
  writeFileSync(join(autreDir, "fichier.txt"), "contenu");
  git(autreDir, "add", "-A");
  const toutPremier = git(autreDir, "commit", "-qm", "tout premier commit direct sur master");
  assert.notEqual(toutPremier.status, 0, "même le tout premier commit sur master est refusé (QUA-017, plus d'exception de bootstrap)");
  assert.match(toutPremier.stdout + toutPremier.stderr, /travail direct sur la branche principale/);

  // master n'existe même pas encore dans `dir` (jamais créé localement) : on simule le cas où
  // il apparaît malgré tout (ex. remote déjà pourvu d'un master), pour vérifier qu'y commiter reste refusé.
  git(dir, "checkout", "-qb", "master");
  writeFileSync(join(dir, "docs/projects/routine-maintenance.md"), read(dir, "docs/projects/routine-maintenance.md") + "\n");
  git(dir, "add", "-A");
  const second = git(dir, "commit", "-qm", "commit direct sur master");
  assert.notEqual(second.status, 0, "un commit direct sur master est refusé (QUA-017)");
  assert.match(second.stdout + second.stderr, /travail direct sur la branche principale/);

  // en CI, le contrôle ne tourne jamais (sinon un merge légitime sur master casserait la CI après coup).
  const enCi = spawnSync(process.execPath, [".githooks/run-checks.mjs"], { cwd: dir, encoding: "utf8", env: { ...process.env, CI: "1" } });
  assert.doesNotMatch(enCi.stdout, /travail direct sur la branche principale/, "jamais vérifié en CI");

  // sur une branche, un nouveau commit passe.
  git(dir, "checkout", "-qb", "chantier/essai");
  writeFileSync(join(dir, "docs/projects/routine-maintenance.md"), read(dir, "docs/projects/routine-maintenance.md") + "\n");
  git(dir, "add", "-A");
  const surBranche = git(dir, "commit", "-qm", "commit sur une branche");
  assert.equal(
    surBranche.status,
    0,
    "un commit sur une branche non principale n'est jamais bloqué : " + surBranche.stdout + surBranche.stderr,
  );
});

test("QUA-017 : un push ne contenant que des tags ou des suppressions de branches n'est jamais bloqué, un push de la branche principale continue de l'être", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  enAvertissement(dir);
  git(dir, "add", "-A");
  const premier = git(dir, "commit", "-qm", "premier commit");
  assert.equal(premier.status, 0, premier.stdout + premier.stderr);

  // scénario réel de `create-release.mjs` : un tag posé puis poussé depuis master, après un merge légitime.
  git(dir, "checkout", "-qb", "master");
  git(dir, "tag", "v1.0.0");
  git(dir, "tag", "v1.0.1");

  const remote = tmp();
  assert.equal(spawnSync("git", ["init", "-q", "--bare", remote]).status, 0);
  git(dir, "remote", "add", "origin", remote);

  const pousseTag = git(dir, "push", "-q", "origin", "v1.0.0");
  assert.equal(pousseTag.status, 0, "un push ne poussant qu'un tag n'est plus bloqué par QUA-017 : " + pousseTag.stdout + pousseTag.stderr);
  assert.doesNotMatch(pousseTag.stdout + pousseTag.stderr, /travail direct sur la branche principale/);

  const pousseMaster = git(dir, "push", "-q", "origin", "master");
  assert.notEqual(pousseMaster.status, 0, "un push direct de la branche principale reste refusé");
  assert.match(pousseMaster.stdout + pousseMaster.stderr, /travail direct sur la branche principale/);

  const pousseMixte = git(dir, "push", "-q", "origin", "v1.0.1", "master");
  assert.notEqual(pousseMixte.status, 0, "un push mixte tag + branche principale reste refusé, par prudence");
  assert.match(pousseMixte.stdout + pousseMixte.stderr, /travail direct sur la branche principale/);

  // Cas du 2026-10-09 : depuis master, supprimer une branche distante (déjà fusionnée) ne touche
  // pas la branche principale. Les branches sont poussées depuis elles-mêmes, puis on revient sur master.
  for (const b of ["chantier/fini", "chantier/autre"]) {
    git(dir, "checkout", "-qb", b);
    assert.equal(git(dir, "push", "-q", "origin", b).status, 0, b);
    git(dir, "checkout", "-q", "master");
  }
  const suppression = git(dir, "push", "-q", "origin", "--delete", "chantier/fini");
  assert.equal(
    suppression.status,
    0,
    "une suppression de branche distante n'est plus bloquée : " + suppression.stdout + suppression.stderr,
  );
  // « :branche » supprime, « master » pousse la branche principale (`--delete` supprimerait les deux).
  const suppressionMixte = git(dir, "push", "-q", "origin", ":chantier/autre", "master");
  assert.notEqual(suppressionMixte.status, 0, "suppression + branche principale : contrôlé, par prudence");
  assert.match(suppressionMixte.stdout + suppressionMixte.stderr, /travail direct sur la branche principale/);
});

// Cas du 2026-10-25 (note de recette v0.8.0) : au push, la référence distante poussée est jugée,
// pas la branche courante — `recette-note.mjs` pousse `recette/vX.Y.Z` depuis master.
test("QUA-017 : au push, la référence distante poussée est jugée, pas la branche courante", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  enAvertissement(dir);
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-qm", "premier commit").status, 0);
  const remote = tmp();
  assert.equal(spawnSync("git", ["init", "-q", "--bare", remote]).status, 0);
  git(dir, "remote", "add", "origin", remote);
  git(dir, "checkout", "-qb", "master");

  const depuisMaster = git(dir, "push", "-q", "origin", "HEAD:refs/heads/recette/v1.0.0");
  assert.equal(
    depuisMaster.status,
    0,
    "pousser recette/x depuis master ne touche pas master : " + depuisMaster.stdout + depuisMaster.stderr,
  );
  assert.doesNotMatch(depuisMaster.stdout + depuisMaster.stderr, /travail direct sur la branche principale/);

  git(dir, "checkout", "-qb", "travail");
  for (const cible of ["master", "main"]) {
    const versPrincipale = git(dir, "push", "-q", "origin", `travail:refs/heads/${cible}`);
    assert.notEqual(versPrincipale.status, 0, `pousser vers ${cible} depuis une autre branche reste refusé`);
    assert.match(versPrincipale.stdout + versPrincipale.stderr, new RegExp(`travail direct sur la branche principale \\(${cible}\\)`));
  }
  const versTravail = git(dir, "push", "-q", "origin", "travail");
  assert.equal(versTravail.status, 0, versTravail.stdout + versTravail.stderr);
});

test("QUA-013 : couverture CI (GitHub et GitLab) verte par défaut, pre-push et commit-msg livrés", async () => {
  for (const ci of ["github", "gitlab"]) {
    const dir = tmp();
    await quiet(() => init({ lang: "fr", targetDir: dir, ci, git: false }));
    const r = spawnSync(process.execPath, [".githooks/check-control-coverage.mjs"], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, `${ci} : ${r.stdout}${r.stderr}`);
  }
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, ci: "github" }));
  assert.ok(executable(dir, ".githooks/pre-push"), "pre-push exécutable");
  assert.ok(!(statSync(join(dir, ".githooks/commit-msg")).mode & 0o100), "commit-msg livré désactivé");
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /couverture CI de chaque contrôle/);
});

test("alerte CI cassée sur la branche principale : job dédié livré, GitHub et GitLab", async () => {
  // GitHub : se déclenche seulement sur push vers la branche par défaut,
  // seulement si checks (ou kit-tests) échoue, sans recréer de doublon.
  const dirGh = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dirGh, ci: "github", git: false }));
  const gh = read(dirGh, ".github/workflows/ia-first.yml");
  assert.match(gh, /alert-if-ci-broken:/);
  assert.match(gh, /needs:\s*checks/);
  assert.match(gh, /github\.event_name == 'push'/);
  assert.match(gh, /github\.event\.repository\.default_branch/);
  assert.match(gh, /needs\.checks\.result == 'failure'/);
  assert.match(gh, /gh issue create/);
  assert.match(gh, /no duplicate/);

  // GitLab : stage dédiée après `test`, déclenchée seulement sur la branche
  // par défaut et seulement en cas d'échec d'un job de la stage `test`.
  const dirGl = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dirGl, ci: "gitlab", git: false }));
  const gl = read(dirGl, ".gitlab-ci.yml");
  assert.match(gl, /alert-if-ci-broken:/);
  assert.match(gl, /stage: alert$/m);
  assert.match(gl, /CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH/);
  assert.match(gl, /when: on_failure/);
  assert.match(gl, /no duplicate/);

  // Les deux restent couverts par QUA-013 (le nouveau job n'y casse rien).
  for (const dir of [dirGh, dirGl]) {
    const r = spawnSync(process.execPath, [".githooks/check-control-coverage.mjs"], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  }
});

test("gabarits de pull/merge request : livrés selon le ci, un seul gabarit en anglais quelle que soit la langue", async () => {
  const cas = [
    { lang: "fr", ci: "github", chemin: ".github/pull_request_template.md", motif: /Related brief/ },
    { lang: "fr", ci: "gitlab", chemin: ".gitlab/merge_request_templates/Default.md", motif: /Related brief/ },
    { lang: "en", ci: "github", chemin: ".github/pull_request_template.md", motif: /Related brief/ },
    { lang: "en", ci: "gitlab", chemin: ".gitlab/merge_request_templates/Default.md", motif: /Related brief/ },
  ];
  for (const { lang, ci, chemin, motif } of cas) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, lang, ci, git: false }));
    assert.ok(existsSync(join(dir, chemin)), `${lang}/${ci} : ${chemin} absent`);
    assert.match(read(dir, chemin), motif, `${lang}/${ci} : contenu inattendu`);
  }
  // ci: none n'installe aucun gabarit (rien à proposer sans plateforme de MR).
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, ci: "none", git: false }));
  assert.ok(!existsSync(join(dir, ".github/pull_request_template.md")));
  assert.ok(!existsSync(join(dir, ".gitlab/merge_request_templates/Default.md")));
});

test("QUA-013 : un job CI qui ne se déclenche plus sur les bons chemins est détecté", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, ci: "gitlab", git: false }));
  writeFileSync(
    join(dir, ".gitlab-ci.yml"),
    "checks:\n  image: node:20\n  rules:\n    - changes:\n        - frontend/**\n  script:\n    - node .githooks/run-checks.mjs\n",
  );
  const r = spawnSync(process.execPath, [".githooks/check-control-coverage.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /secrets/);
});

test("QUA-013 : ci: none : pas de CI, la couverture est signalée non exécutée (pas d'échec silencieux)", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, ci: "none" }));
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /non exécuté : couverture CI de chaque contrôle.*aucune CI configurée/s);
});

test("QUA-043 : sans CI, run-checks et doctor disent comment en déclarer une, en français et en anglais", async () => {
  // Le premier verify d'un projet neuf finit sur ce non exécuté : le message dit comment en sortir.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, ci: "none" }));
  assert.match(checks(dir).stdout, /aucune CI configurée.*npx drwil init --ci github/s);
  const fr = (await doctor({ targetDir: dir })).points.find((p) => p.id === "ci");
  assert.equal(fr.state, "warning");
  assert.match(fr.detail, /npx drwil init --ci github.*--ci gitlab/);

  const en = tmp();
  await quiet(() => init({ lang: "en", targetDir: en, ci: "none" }));
  assert.match(checks(en).stdout, /no CI configured.*npx drwil init --ci github/s);
  assert.match((await doctor({ targetDir: en })).points.find((p) => p.id === "ci").detail, /npx drwil init --ci github.*--ci gitlab/);
});

test("pre-commit : un contrôle du projet hors de ses chemins est reporté (visible), rejoué au push et en direct", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  enAvertissement(dir);
  const cfg = config(dir);
  cfg.checks = [{ name: "suite lourde", run: 'node -e "process.exit(1)"', paths: ["src/**"] }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  git(dir, "add", "-A");
  const horsChemins = git(dir, "commit", "-qm", "rien sous src/");
  assert.equal(horsChemins.status, 0, "aucun fichier indexé sous src/ : reporté, pas lancé : " + horsChemins.stdout + horsChemins.stderr);
  // Visible dans le rapport complet, compté dans le résumé (QUA-127).
  assert.match(horsChemins.stdout + horsChemins.stderr, /contrôles exécutés : OK \(\d+ avertissement\(s\)/);
  assert.match(read(dir, ".drwil/evidence/run-checks.log"), /non exécuté : suite lourde \(aucun fichier indexé sous ses chemins/);

  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src/a.ts"), "export const a = 1;\n");
  git(dir, "add", "-A");
  const sousChemins = git(dir, "commit", "-qm", "touche src/");
  assert.notEqual(sousChemins.status, 0, "un fichier indexé sous src/ : le contrôle tourne et échoue");
  assert.match(sousChemins.stdout + sousChemins.stderr, /échec : suite lourde/);

  // hors pre-commit (pre-push, CI, lancement manuel), jamais de report.
  git(dir, "reset", "-q");
  const direct = checks(dir);
  assert.notEqual(direct.status, 0);
  assert.match(direct.stdout, /échec : suite lourde/);
});

test("lot 5 : check-file-size et check-code-rules livrés mais opt-in (pas lancés par défaut)", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  for (const f of ["check-file-size.mjs", "check-file-size.legacy.json", "check-code-rules.mjs"]) {
    assert.ok(existsSync(join(dir, ".githooks", f)), f);
  }
  assert.equal(checks(dir).status, 0, "aucun des deux ne tourne tant que le projet ne les déclare pas");
});

test("check-file-size.mjs détecte un fichier trop gros une fois déclaré par le projet", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const cfg = config(dir);
  cfg.checks = [{ name: "taille des fichiers", run: "node .githooks/check-file-size.mjs src 10 ts" }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src/gros.ts"), "x\n".repeat(20));
  const r = checks(dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /src\/gros\.ts : 20 lignes, maximum 10/);
});

test("check-file-size.mjs : un plafond hérité laisse passer un fichier déjà gros mais pas plus gros", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  writeFileSync(join(dir, ".githooks/check-file-size.legacy.json"), JSON.stringify({ "src/legacy.ts": 25 }));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src/legacy.ts"), "x\n".repeat(20));
  let r = spawnSync(process.execPath, [".githooks/check-file-size.mjs", "src", "10", "ts"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  writeFileSync(join(dir, "src/legacy.ts"), "x\n".repeat(30));
  r = spawnSync(process.execPath, [".githooks/check-file-size.mjs", "src", "10", "ts"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /plafond hérité 25/);
});

test("check-code-rules.mjs : vide par défaut, toujours vert", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const r = spawnSync(process.execPath, [".githooks/check-code-rules.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("lot 5 : le module qualité front optionnel n'est pas installé par init/apply", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  for (const f of ["check-colors.mjs", "check-contrast.mjs"]) {
    assert.ok(!existsSync(join(dir, ".githooks", f)), f);
  }
});

test("lot 6 : catalogue de contrats et recette d'adoption livrés, skill Claude présent", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  for (const f of ["docs/contracts-catalog.md", "docs/recipes/adopt-the-kit.md", ".claude/skills/adopt-the-kit/SKILL.md"]) {
    assert.ok(existsSync(join(dir, f)), f);
  }
  assert.match(read(dir, "AGENTS.md"), /adopt-the-kit\.md/);
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("lot 6 : le skill adopter-le-kit n'est pas livré sans Claude Code", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "codex", git: false }));
  assert.ok(!existsSync(join(dir, ".claude")));
  assert.ok(existsSync(join(dir, "docs/contracts-catalog.md")));
});

test("commande /drwil : skill générique et alias par capacité livrés avec Claude Code", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.ok(existsSync(join(dir, ".claude/skills/drwil/SKILL.md")));
  assert.match(read(dir, ".claude/skills/drwil/SKILL.md"), /disable-model-invocation: true/);
  const alias = {
    "adopt-the-kit": "drwil-adopt",
    "audit-risks-and-debt": "drwil-audit",
    "discover-product-value": "drwil-value",
    "track-consumption-per-increment": "drwil-usage",
    "view-progress": "drwil-progress",
  };
  for (const [skill, name] of Object.entries(alias)) {
    assert.match(read(dir, `.claude/skills/${skill}/SKILL.md`), new RegExp(`^name: ${name}$`, "m"), skill);
  }
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("commande /drwil : pas livrée sans Claude Code", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "codex", git: false }));
  assert.ok(!existsSync(join(dir, ".claude")));
});

test("skills Copilot CLI (applyTo) : parité fonctionnelle sur les 2 recettes qui s'y prêtent, FR et EN", async () => {
  for (const lang of ["fr", "en"]) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, lang, git: false }));
    // Un seul gabarit, en anglais : mêmes fichiers quelle que soit la langue du projet.
    const api = "add-an-api-route";
    const ecran = "add-a-frontend-screen";
    const apiContent = read(dir, `.github/instructions/${api}.instructions.md`);
    assert.match(apiContent, /applyTo:\s*"backend\/\*\*"/);
    const ecranContent = read(dir, `.github/instructions/${ecran}.instructions.md`);
    assert.match(ecranContent, /applyTo:\s*"frontend\/\*\*"/);
  }
  // Pas livré si Copilot n'est pas sélectionné.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "codex", git: false }));
  assert.ok(!existsSync(join(dir, ".github", "instructions")));
});

test("lot 7 : installation anglaise complète, contenu des lots 1 à 6 traduit, contrôles verts", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en", git: false }));
  for (const f of [
    "README.md",
    "INSTALL.md",
    "docs/security.md",
    "docs/features.md",
    "docs/style-guide.md",
    "docs/deployment.md",
    "docs/projects/routine-maintenance.md",
    "docs/projects/model-brief.md",
    "docs/recipes/manage-access.md",
    "docs/recipes/run-locally.md",
    "docs/recipes/modify-permissions.md",
    "docs/recipes/backup-and-restore.md",
    "docs/contracts-catalog.md",
    "docs/recipes/adopt-the-kit.md",
    ".claude/skills/adopt-the-kit/SKILL.md",
    ".claude/skills/refactor-without-breaking/SKILL.md",
  ]) {
    assert.ok(existsSync(join(dir, f)), f);
  }
  assert.match(read(dir, "docs/contracts-catalog.md"), /catalog:/);
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("lot 7 : même nombre de fichiers livrés en français et en anglais", async () => {
  const fr = tmp();
  const en = tmp();
  await quiet(() => init({ lang: "fr", targetDir: fr, git: false }));
  await quiet(() => init({ targetDir: en, lang: "en", git: false }));
  const compter = (base) => spawnSync("find", [base, "-type", "f"], { encoding: "utf8" }).stdout.trim().split("\n").length;
  assert.equal(compter(en), compter(fr));
});

// Copie tous les scripts d'un module optionnel dans .githooks/ (un module tient en plusieurs fichiers, QUA-001).
// `fichiers` restreint la copie aux scripts d'un seul chantier de test (le reste du module n'est pas cadré).
const copierModule = (dir, nom, fichiers = null) => {
  const src = fileURLToPath(new URL(`../templates/common/optional/${nom}/`, import.meta.url));
  mkdirSync(join(dir, ".githooks"), { recursive: true });
  for (const f of readdirSync(src).filter((x) => x.endsWith(".mjs") && (!fichiers || fichiers.includes(x))))
    writeFileSync(join(dir, ".githooks", f), readFileSync(join(src, f), "utf8"));
};

test("module optionnel tableau de bord : génère un HTML lisant chantiers et contrats tels quels", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  copierModule(dir, "dashboard");
  writeFileSync(
    join(dir, "docs/projects/un-chantier.md"),
    "# Projet : un chantier\n\n**Statut** : cadré le 2026-10-04 — lot 1 en cours.\n\n" +
      "## 6. Lots\n\n- **Lot 1 — titre** [IA] : contenu. Critère de sortie : tests verts.\n\n" +
      "## Reprise\n\n- **Dernier état** (2026-10-04) : ...\n",
  );
  const r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const html = read(dir, "docs/dashboard.html");
  assert.match(html, /<html lang="fr">/);
  assert.match(html, /un chantier/);
  assert.match(html, /cadré le 2026-10-04 — lot 1 en cours\./);
  assert.match(html, /Lot 1 — titre/);
  assert.match(html, /SEC-006/);
  assert.match(html, /catalog:SEC-001/);
});

test("module optionnel tableau de bord : agrège .drwil/usage.jsonl par chantier, sans régression si absent", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  copierModule(dir, "dashboard");

  // Sans fichier usage.jsonl : pas de régression, message d'absence explicite.
  let r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(read(dir, "docs/dashboard.html"), /usage\.jsonl absent/);

  // Avec usage.jsonl : agrégation tokens/durée/modèles par chantier, lignes malformées ignorées.
  mkdirSync(join(dir, ".drwil"), { recursive: true });
  writeFileSync(
    join(dir, ".drwil/usage.jsonl"),
    [
      JSON.stringify({
        workstream: "un-chantier",
        increment: "Lot 1",
        tokens: 1000,
        model: "claude-sonnet-5",
        duration_min: 30,
        date: "2026-10-04",
      }),
      JSON.stringify({
        workstream: "un-chantier",
        increment: "Lot 2",
        tokens: 2000,
        model: "gpt-5.4",
        duration_min: 45,
        date: "2026-10-04",
      }),
      "pas du JSON valide",
    ].join("\n") + "\n",
  );
  r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const html = read(dir, "docs/dashboard.html");
  assert.match(html, /un-chantier/);
  assert.match(html, />3000</); // tokens cumulés
  assert.match(html, />75</); // minutes cumulées
  assert.match(html, /claude-sonnet-5, gpt-5\.4/);
});

test("module optionnel tableau de bord : affiche les derniers audits, sans régression si absents", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  copierModule(dir, "dashboard");

  // Sans rapport d'audit : pas de régression, message d'absence explicite.
  let r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(read(dir, "docs/dashboard.html"), /audit-risques\.md absent/);

  // Avec les deux rapports : titre et méta-bloc (citation en tête) repris tels quels.
  writeFileSync(
    join(dir, "docs/audit-risques.md"),
    "# Audit de risques et dette technique\n\n> Dernier scan : 2026-10-04\n> Niveau de santé global : 🟠 Fragile\n\n## Synthèse\n",
  );
  writeFileSync(
    join(dir, "docs/decouverte-valeur.md"),
    "# Découverte de valeur et opportunités produit\n\n> Dernier scan : 2026-10-04\n> État du projet : exemple.\n\n## Opportunités\n",
  );
  r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const html = read(dir, "docs/dashboard.html");
  assert.match(html, /Audit de risques et dette technique/);
  assert.match(html, /Niveau de santé global : 🟠 Fragile/);
  assert.match(html, /Découverte de valeur et opportunités produit/);
  assert.match(html, /État du projet : exemple\./);
});

test("rappel de péremption des audits (> 30 jours) : tableau de bord et run-checks.mjs", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  copierModule(dir, "dashboard");

  // rapport récent : pas d'avertissement.
  writeFileSync(
    join(dir, "docs/audit-risques.md"),
    "# Audit de risques et dette technique\n\n> Dernier scan : 2026-10-04\n\n## Synthèse\n",
  );
  let r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(read(dir, "docs/dashboard.html"), /à relancer/);
  let checkR = checks(dir);
  assert.doesNotMatch(checkR.stdout, /audit périmé/);

  // rapport vieux de plus de 30 jours : avertissement visuel dans le tableau de bord, et dans
  // run-checks.mjs (famille « non exécuté », jamais bloquant).
  writeFileSync(
    join(dir, "docs/audit-risques.md"),
    "# Audit de risques et dette technique\n\n> Dernier scan : 2020-01-01\n\n## Synthèse\n",
  );
  r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(read(dir, "docs/dashboard.html"), /à relancer/);
  checkR = checks(dir);
  assert.equal(checkR.status, 0, "jamais bloquant : " + checkR.stdout + checkR.stderr);
  assert.match(checkR.stdout, /audit périmé.*docs\/audit-risques\.md/);
});

test("créer une release : détection du bump semver (Conventional Commits, best-effort)", async () => {
  // import() dynamique : passer l'URL file:// telle quelle (pas de conversion
  // en chemin OS) — un chemin Windows brut (d:\...) fait planter le loader ESM.
  const { detectBump, nextVersion } = await import(
    new URL("../templates/common/optional/create-release/create-release.mjs", import.meta.url)
  );

  assert.equal(detectBump([]), null, "aucun commit : rien à publier");
  assert.equal(
    detectBump([{ subject: "Manifeste des fichiers installés", body: "" }]),
    "patch",
    "aucun préfixe reconnu : patch par défaut",
  );
  assert.equal(detectBump([{ subject: "fix: corrige X", body: "" }]), "patch");
  assert.equal(
    detectBump([
      { subject: "feat: ajoute Y", body: "" },
      { subject: "fix: corrige X", body: "" },
    ]),
    "minor",
    "un feat l'emporte sur un simple fix",
  );
  assert.equal(detectBump([{ subject: "feat!: casse la compat", body: "" }]), "major", "rupture annoncée (!) prioritaire");
  assert.equal(
    detectBump([{ subject: "feat: ajoute Y", body: "BREAKING CHANGE: change le format" }]),
    "major",
    "rupture annoncée dans le corps aussi détectée",
  );

  assert.equal(nextVersion("v1.2.3", "patch"), "v1.2.4");
  assert.equal(nextVersion("v1.2.3", "minor"), "v1.3.0");
  assert.equal(nextVersion("v1.2.3", "major"), "v2.0.0");
});

/** Rédige la présentation livrée en squelette (README, fonctionnalités, carte) : la release l'exige (QUA-098). */
function presentationRedigee(dir) {
  for (const f of ["README.md", "docs/features.md", "docs/architecture.md"]) {
    const texte = readFileSync(join(dir, f), "utf8");
    writeFileSync(
      join(dir, f),
      texte.replace(/\((?:to describe|à décrire)[^)]*\)/g, "rédigé").replace(/template to fill in|gabarit à remplir/g, "rédigé"),
    );
  }
}

test("créer une release : module optionnel (pas copié par défaut), recette/skill livrés en FR et EN, --dry-run sans réseau", async () => {
  for (const lang of ["fr", "en"]) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, lang, git: false }));
    enAvertissement(dir);
    // Le script lui-même n'est jamais copié automatiquement.
    assert.ok(!existsSync(join(dir, ".githooks/create-release.mjs")), "le module optionnel ne doit pas être copié par défaut");
    // La recette (toujours livrée) documente l'activation du module.
    const recette = lang === "fr" ? "docs/recipes/create-a-release.md" : "docs/recipes/create-a-release.md";
    assert.match(read(dir, recette), /optionnel|optional/i);
    // Le skill générique drwil mentionne la capacité release.
    const menu = read(dir, ".claude/skills/drwil/SKILL.md");
    assert.match(menu, /release/);
  }

  // Script utilisable en pratique : --dry-run, sans toucher au réseau ni créer de tag.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: true }));
  enAvertissement(dir);
  presentationRedigee(dir); // QUA-098 : sans examen fait, la release est refusée
  copierModule(dir, "create-release");
  git(dir, "add", "-A");
  git(dir, "commit", "-m", "feat: premier chantier");
  const r = spawnSync(process.execPath, [".githooks/create-release.mjs", "--dry-run"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /v0\.1\.0/);
  assert.match(r.stdout, /dry-run/);
});

test("créer une release : repère les paquets npm publiables (package.json suivi, non private) pour le tarball de release", async () => {
  const { publicPackages } = await import(new URL("../templates/common/optional/create-release/create-release.mjs", import.meta.url));
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: true }));
  // racine privée (monorepo), un paquet publiable dans packages/truc, un paquet explicitement privé ailleurs.
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "racine", private: true }));
  mkdirSync(join(dir, "packages/truc"), { recursive: true });
  writeFileSync(join(dir, "packages/truc/package.json"), JSON.stringify({ name: "truc" }));
  mkdirSync(join(dir, "packages/prive"), { recursive: true });
  writeFileSync(join(dir, "packages/prive/package.json"), JSON.stringify({ name: "prive", private: true }));
  git(dir, "add", "-A");
  git(dir, "commit", "-m", "feat: ajoute des paquets de test");

  const cwdAvant = process.cwd();
  process.chdir(dir);
  try {
    const paquets = publicPackages();
    assert.deepEqual(paquets.sort(), ["packages/truc"], "seul le paquet non private avec un name est retenu");
  } finally {
    process.chdir(cwdAvant);
  }
});

test("créer une release : --dry-run liste le paquet npm à empaqueter quand il y en a un", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: true }));
  enAvertissement(dir);
  presentationRedigee(dir); // QUA-098 : sans examen fait, la release est refusée
  copierModule(dir, "create-release");
  mkdirSync(join(dir, "packages/truc"), { recursive: true });
  writeFileSync(join(dir, "packages/truc/package.json"), JSON.stringify({ name: "truc", version: "1.0.0" }));
  git(dir, "add", "-A");
  git(dir, "commit", "-m", "feat: ajoute un paquet publiable");
  const r = spawnSync(process.execPath, [".githooks/create-release.mjs", "--dry-run"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /tarball.*packages\/truc/);
});

test("QUA-051 : module de release livré avec la fiche, le verdict et la promotion ; --candidate --dry-run montre la fiche sans rien publier", async () => {
  const module = fileURLToPath(new URL("../templates/common/optional/create-release/", import.meta.url));
  const scripts = [
    "create-release.mjs",
    "acceptance-sheet.mjs",
    "release-verdict.mjs",
    "promote-release.mjs",
    "recette-note.mjs",
    "release-review.mjs",
  ];
  for (const lang of ["fr", "en"]) {
    const dir = tmp();
    await quiet(() => init({ lang, targetDir: dir, git: true }));
    enAvertissement(dir);
    presentationRedigee(dir); // QUA-098 : sans examen fait, la release est refusée
    for (const s of scripts) assert.ok(!existsSync(join(dir, ".githooks", s)), `${s} : module optionnel, jamais copié par défaut`);
    copierModule(dir, "create-release");
    git(dir, "add", "-A");
    const c = git(dir, "commit", "-m", "feat: premier chantier");
    assert.equal(c.status, 0, c.stdout + c.stderr);
    const r = spawnSync(process.execPath, [".githooks/create-release.mjs", "--candidate", "--dry-run"], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, lang === "fr" ? /# Fiche de recette — v0\.1\.0-rc\.1/ : /# Acceptance sheet — v0\.1\.0-rc\.1/);
    assert.match(r.stdout, /--dry-run/);
    assert.equal(git(dir, "tag", "-l").stdout.trim(), "", "aucun tag en --dry-run");
    for (const s of ["release-verdict.mjs", "promote-release.mjs", "recette-note.mjs"])
      assert.equal(spawnSync(process.execPath, [`.githooks/${s}`], { cwd: dir, encoding: "utf8" }).status, 2, `${s} sans argument : usage`);
  }
  const readme = readFileSync(join(module, "README.md"), "utf8");
  for (const s of scripts) assert.match(readme, new RegExp(s.replace(".", "\\.")));
});

test("QUA-055 : les README pointent vers la dernière version validée par un lien fixe, sans numéro de version à recommiter", () => {
  for (const chemin of ["../../../README.md", "../README.md"]) {
    const texte = readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
    assert.match(texte, /https:\/\/github\.com\/wdubilly\/drwil\/releases\/latest/, `${chemin} : lien releases/latest`);
    assert.doesNotMatch(texte, /drwil\/releases\/download\/v\d/, `${chemin} : aucun lien vers une version précise`);
  }
});

// DRWIL-003 : verify = primitive de validation du travail. Contrôles déterministes `ok`/`ko`
// (pas de gitleaks, absent de certains postes) : seul le verdict est testé, pas les outils.
async function projetVerify(contrats, reglages = {}) {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, ci: "none" }));
  const cfg = { ...config(dir), ...reglages };
  cfg.checks = [
    { id: "ok", name: "toujours vert", run: 'node -e "process.exit(0)"' },
    { id: "ko", name: "toujours rouge", run: "node -e \"console.log('cause du rouge'); process.exit(1)\"" },
  ];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  writeFileSync(join(dir, "docs/contracts.md"), `# Contrats\n\n${contrats}\n`);
  return dir;
}
const contrat = (id, champs) => `## ${id} — titre ${id}\n**Règle** : exigence ${id}.\n${champs}\n`;

test("verify : PASS (exit 0) quand toutes les obligations sont prouvées par un contrôle", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  const v = await verify({ targetDir: dir });
  assert.equal(v.status, "PASS");
  assert.equal(v.code, 0);
  assert.deepEqual(
    v.contracts.map((k) => [k.id, k.status]),
    [["QUA-001", "PASS"]],
  );
  assert.match(formatVerdict(v), /GOVERNANCE: PASS/);
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
});

test("verify : FAIL (exit 1) dès qu'une obligation échoue, avec la cause visible", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `ko`"));
  const v = await verify({ targetDir: dir });
  assert.equal(v.status, "FAIL");
  assert.equal(v.code, 1);
  assert.equal(v.contracts.find((k) => k.id === "QUA-002").status, "FAIL");
  const sortie = formatVerdict(v);
  assert.match(sortie, /ko : échec/);
  assert.match(sortie, /cause du rouge/);
  assert.match(sortie, /GOVERNANCE: FAIL/);
});

test("verify : MANUAL (exit 1, jamais PASS) pour une preuve humaine, partie automatisée affichée à part", async () => {
  const dir = await projetVerify(
    contrat("QUA-001", "**Contrôle** : `ok`\n**Manuel** : relecture humaine") + contrat("QUA-002", "**Manuel** : appréciation"),
  );
  const v = await verify({ targetDir: dir });
  assert.equal(v.status, "MANUAL");
  assert.equal(v.code, 1, "MANUAL empêche le 0 sans être une erreur technique");
  assert.deepEqual(
    v.contracts.map((k) => k.status),
    ["MANUAL", "MANUAL"],
  );
  const sortie = formatVerdict(v);
  assert.match(sortie, /ok : ok \(automatisé\)/);
  assert.match(sortie, /humain requis : relecture humaine/);
  assert.match(sortie, /GOVERNANCE: MANUAL REVIEW REQUIRED/);
});

test("verify : contrat historique en tableau sans contrôle = MANUAL, jamais ignoré", async () => {
  const dir = await projetVerify(`| ID | Règle |\n|---|---|\n| SEC-006 | historique |\n\n${contrat("QUA-001", "**Contrôle** : `ok`")}`);
  const v = await verify({ targetDir: dir });
  assert.deepEqual(
    v.contracts.map((k) => [k.id, k.status]),
    [
      ["SEC-006", "MANUAL"],
      ["QUA-001", "PASS"],
    ],
  );
  assert.equal(v.status, "MANUAL");
});

test("verify : ERROR (exit 2) pour un contrôle inconnu, une obligation invérifiable ou un doublon ; FAIL l'emporte", async () => {
  let v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `inexistant`")) });
  assert.equal(v.status, "ERROR");
  assert.equal(v.code, 2);
  assert.match(v.contracts[0].reasons.join(), /contrôle inconnu « inexistant »/);

  v = await verify({ targetDir: await projetVerify("## QUA-001 — sans rien\n**Raison** : intention seule.\n") });
  assert.equal(v.status, "ERROR", "une obligation sans exigence ni preuve n'est jamais acceptée en silence");
  assert.match(v.contracts[0].reasons.join(), /exigence absente/);
  assert.match(v.contracts[0].reasons.join(), /aucune preuve déclarée/);

  v = await verify({
    targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-001", "**Contrôle** : `ok`")),
  });
  assert.equal(v.status, "ERROR");
  assert.match(v.errors.join(), /défini plusieurs fois/);

  v = await verify({
    targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `inexistant`") + contrat("QUA-002", "**Contrôle** : `ko`")),
  });
  assert.equal(v.status, "FAIL", "un échec établi l'emporte sur une erreur");
});

test("verify : ERROR (exit 2) sans moteur installé ou sans registre, hooks indépendants de drwil", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  // Les hooks n'importent que .githooks/ : ils tournent sans drwil.
  assert.doesNotMatch(
    read(dir, ".githooks/run-checks.mjs") + read(dir, ".githooks/engine.mjs"),
    /from "drwil"|packages\/drwil|dist\/index/,
  );
  writeFileSync(join(dir, "docs/contracts.md"), "# Contrats\n");
  let v = await verify({ targetDir: dir });
  assert.equal(v.code, 2);
  assert.match(v.errors.join(), /aucun contrat/);
  const vide = tmp();
  v = await verify({ targetDir: vide });
  assert.equal(v.code, 2);
  assert.match(v.errors.join(), /check engine missing/);
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify"], {
    cwd: vide,
    encoding: "utf8",
    env: envTest,
  });
  assert.equal(cli.status, 2);
  assert.match(cli.stdout, /GOVERNANCE: VERIFY ERROR/);
});

const cliVerify = (dir) =>
  spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });

test("verify : exit 1 réel via la CLI pour FAIL et pour MANUAL, libellés distincts", async () => {
  const fail = cliVerify(await projetVerify(contrat("QUA-001", "**Contrôle** : `ko`")));
  assert.equal(fail.status, 1, fail.stdout + fail.stderr);
  assert.match(fail.stdout, /GOVERNANCE: FAIL/);
  const manuel = cliVerify(await projetVerify(contrat("QUA-001", "**Manuel** : relecture")));
  assert.equal(manuel.status, 1, manuel.stdout + manuel.stderr);
  assert.match(manuel.stdout, /GOVERNANCE: MANUAL REVIEW REQUIRED/);
  assert.doesNotMatch(manuel.stdout, /GOVERNANCE: (PASS|FAIL)/, "MANUAL n'est ni une réussite ni un échec");
});

test("verify : outil indisponible (contrôle non exécuté) → ERROR, jamais PASS", async () => {
  // Sans CI configurée, `ci-coverage` ne peut pas tourner : la preuve n'est pas établie.
  const v = await verify({ targetDir: await projetVerify(contrat("QUA-013", "**Contrôle** : `ci-coverage`")) });
  assert.equal(v.status, "ERROR");
  assert.equal(v.code, 2);
  assert.match(v.contracts[0].reasons.join(), /ci-coverage : non exécuté/);
});

test("verify : critères d'acceptation de la fiche active jugés contre le registre, écrits dans l'évidence", async () => {
  const dir = await projetVerify(
    contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `ko`") + contrat("QUA-003", "**Manuel** : appréciation"),
  );
  assert.equal((await verify({ targetDir: dir })).criteria, undefined, "sans fiche active : rien à juger");
  writeFileSync(
    join(dir, "docs/projects/essai.md"),
    [
      "# Essai",
      "",
      "## Critères d'acceptation",
      "",
      "- Prouvé par un contrat — `QUA-001`",
      "- Sans lien",
      "- Lien inconnu — `QUA-999`",
      "- Contrat rouge — `QUA-002`",
      "- Contrat manuel pour un critère automatique — `QUA-003`",
      "- Jugement humain non attesté [humain] — `QUA-003`",
      "- Prouvé par un contrôle — `ok`",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(dir, ".drwil/state.json"),
    JSON.stringify({ version: 1, activity: "EVIDENCE", active_brief: "docs/projects/essai.md", active_request: null, since: null }),
  );
  const v = await verify({ targetDir: dir });
  assert.deepEqual(
    v.criteria.map((c) => [c.text, c.status]),
    [
      ["Prouvé par un contrat", "pass"],
      ["Sans lien", "no-proof"],
      ["Lien inconnu", "unknown-proof"],
      ["Contrat rouge", "not-pass"],
      ["Contrat manuel pour un critère automatique", "not-durable"],
      ["Jugement humain non attesté", "not-pass"],
      ["Prouvé par un contrôle", "no-contract"],
    ],
  );
  const ecrit = JSON.parse(readFileSync(join(dir, writeEvidence(dir, v)), "utf8"));
  assert.deepEqual(ecrit.criteria, v.criteria);
  assert.deepEqual((await verify({ targetDir: dir, only: ["QUA-001"] })).criteria, undefined, "attest ne juge pas les critères");
});

test("QUA-022 : critères d'acceptation : contrat créé, réutilisé ou modifié dans la branche, jugé contre la base ; sans contrat, refusé", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `ok`"));
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir, encoding: "utf8" });
  const fiche = "docs/projects/essai.md";
  const etat = { version: 1, activity: "EVIDENCE", active_brief: fiche, active_request: null, since: null };
  writeFileSync(join(dir, ".drwil/state.json"), JSON.stringify(etat));
  writeFileSync(join(dir, fiche), "# Essai\n\n## Critères d'acceptation\n\n- Réutilisé — `QUA-001`\n");
  assert.equal((await verify({ targetDir: dir })).criteria[0].change, null, "hors git : rien à comparer");
  git("init", "-q", "-b", "master");
  git("add", "-A");
  git("commit", "-qm", "base");
  git("checkout", "-qb", "chantier");
  writeFileSync(
    join(dir, "docs/contracts.md"),
    `# Contrats\n\n${contrat("QUA-001", "**Contrôle** : `ok`")}${contrat("QUA-002", "**Contrôle** : `ok`\nPrécisé.")}${contrat("QUA-003", "**Contrôle** : `ok`\n**Origine** : essai — « Créé »")}${contrat("QUA-004", "**Contrôle** : `ok`")}\n`,
  );
  writeFileSync(
    join(dir, fiche),
    [
      "# Essai",
      "",
      "## Critères d'acceptation",
      "",
      "- Réutilisé — `QUA-001`",
      "- Modifié — `QUA-002`",
      "- Créé — `QUA-003`",
      "- Créé sans Origine — `QUA-004`",
      "- Sans contrat — `QUA-404`",
      "- Par un contrôle — `ok`",
      "",
    ].join("\n"),
  );
  const v = await verify({ targetDir: dir });
  assert.deepEqual(
    v.criteria.map((c) => [c.text, c.status, c.change]),
    [
      ["Réutilisé", "pass", "reused"],
      ["Modifié", "pass", "modified"],
      ["Créé", "pass", "created"],
      ["Créé sans Origine", "no-origin", "created"],
      ["Sans contrat", "unknown-proof", null],
      ["Par un contrôle", "no-contract", null],
    ],
  );
  assert.match(criteriaTable(v.criteria, "fr"), /\| Créé \| `QUA-003` \(pass, créé\) \| ✅ prouvé \|/);
  assert.match(criteriaTable(v.criteria, "en"), /`QUA-001` \(pass, reused\)/);
  assert.match(
    criteriaTable(v.criteria, "fr"),
    /\| Créé sans Origine \| `QUA-004` \(pass, créé\) \| ❌ contrat créé sans champ Origine \|/,
  );
  assert.match(
    criteriaTable(v.criteria, "en"),
    /\| Par un contrôle \| `ok` \(ok\) \| ❌ check without a contract \(nothing in the registry\) \|/,
  );
});

test("QUA-023 : régression ou évolution : contrat modifié sans déclaration refusé, déclaré accepté ; l'origine d'un contrat en échec affichée", async () => {
  const origine = "**Origine** : export propre — « Un export vide est refusé »";
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", `**Contrôle** : \`ko\`\n${origine}`));
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir, encoding: "utf8" });
  const fiche = "docs/projects/essai.md";
  writeFileSync(
    join(dir, ".drwil/state.json"),
    JSON.stringify({ version: 1, activity: "EVIDENCE", active_brief: fiche, active_request: null, since: null }),
  );
  writeFileSync(join(dir, fiche), "# Essai\n\n## Critères d'acceptation\n\n- Réutilisé — `QUA-001`\n");
  git("init", "-q", "-b", "master");
  git("add", "-A");
  git("commit", "-qm", "base");
  git("checkout", "-qb", "chantier");

  let v = await verify({ targetDir: dir });
  assert.deepEqual(v.undeclared, []);
  const echec = v.contracts.find((k) => k.id === "QUA-002");
  assert.equal(echec.status, "FAIL");
  assert.match(echec.reasons.join("\n"), /protège export propre — « Un export vide est refusé » — régression/);
  assert.doesNotMatch(v.contracts.find((k) => k.id === "QUA-001").reasons.join("\n"), /protège/);

  // Régression : le contrat change sans que la fiche le déclare.
  writeFileSync(
    join(dir, "docs/contracts.md"),
    `# Contrats\n\n${contrat("QUA-001", "**Contrôle** : `ok`\nAssoupli.")}${contrat("QUA-002", `**Contrôle** : \`ko\`\n${origine}`)}\n`,
  );
  v = await verify({ targetDir: dir });
  assert.deepEqual(v.undeclared, ["QUA-001"]);
  assert.match(formatVerdict(v), /Contrats modifiés sans déclaration.*clôture refusée : QUA-001/);
  const ecrit = JSON.parse(readFileSync(join(dir, writeEvidence(dir, v)), "utf8"));
  assert.deepEqual(ecrit.undeclared, ["QUA-001"]);

  // Évolution : déclarée dans la fiche, validée au cadrage.
  writeFileSync(
    join(dir, fiche),
    "# Essai\n\n## Critères d'acceptation\n\n- Réutilisé — `QUA-001`\n\n## Contrats modifiés\n\n- `QUA-001` — ancien critère : « strict » — raison : assoupli (validé le 2026-10-15)\n",
  );
  v = await verify({ targetDir: dir });
  assert.deepEqual(v.undeclared, []);
  assert.doesNotMatch(formatVerdict(v), /sans déclaration/);
  assert.equal((await verify({ targetDir: dir, only: ["QUA-001"] })).undeclared, undefined, "attest ne juge pas la fiche");
});

test("QUA-024 : dépôt neuf : init fournit un contrat métier d'exemple, contrôle à compléter, et le guide pour écrire le premier", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, ci: "none" }));
  const registre = readFileSync(join(dir, "docs/contracts.md"), "utf8");
  assert.match(registre, /^## APP-001 — Example business contract/m);
  assert.match(registre, /\*\*Manual\*\* : check to complete .*cite it here as \*\*Check\*\*/);
  assert.match(readFileSync(join(dir, "docs/recipes/adopt-the-kit.md"), "utf8"), /first business contract.*\n.*APP-001/);
  const exemple = (await verify({ targetDir: dir })).contracts.find((k) => k.id === "APP-001");
  assert.equal(exemple.status, "MANUAL", "à compléter : jamais prouvé tant que son contrôle manque");
  assert.match(exemple.reasons.join("\n"), /check to complete/);
});

test("QUA-030 : le registre livré et la recette d'adoption enseignent un contrôle par règle métier, filtré par l'ID, et le champ Tests", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "en", targetDir: dir, git: false, ci: "none" }));
  const registre = readFileSync(join(dir, "docs/contracts.md"), "utf8");
  assert.match(registre, /\*\*Proof\*\* : .*its own check .*`npm test -- -t "APP-001"`/);
  assert.match(registre, /list its file as \*\*Tests\*\*/);
  assert.match(registre, /^## QUA-029 — .*\n(.*\n)*\*\*Check\*\* : `contract-tests`/m);
  const recette = readFileSync(join(dir, "docs/recipes/adopt-the-kit.md"), "utf8");
  assert.match(recette, /\*\*One check per business rule\*\*/);
  assert.match(recette, /`pytest -k APP_001`, `go test -run APP001`/);
  assert.match(recette, /reports it as not\n\s+attributable/);
});

test("critères d'acceptation : un contrat sans contrôle ni Manuel n'est pas une preuve durable ; un critère humain exige un contrat manuel", () => {
  const contrats = [
    { id: "A", status: "PASS", manual: null, checks: [{ id: "x", status: "ok" }] },
    { id: "B", status: "MANUAL", manual: null, checks: [] },
    { id: "C", status: "ATTESTED", manual: "relecture", checks: [] },
  ];
  const juge = (c) => evaluateCriteria([{ text: "t", ...c }], contrats)[0].status;
  assert.equal(juge({ link: "A", human: false }), "pass");
  assert.equal(juge({ link: "A", human: true }), "not-durable");
  assert.equal(juge({ link: "B", human: false }), "not-durable");
  assert.equal(juge({ link: "C", human: true }), "pass");
  assert.equal(juge({ link: "C", human: false }), "not-durable");
  assert.equal(juge({ link: "x", human: false }), "no-contract", "un contrôle seul ne laisse rien au registre (QUA-022)");
  assert.equal(juge({ link: "x", human: true }), "unknown-proof");
});

test("critères d'acceptation : tableau « critère → preuve → verdict » rendu pour la PR, écrit à côté de l'évidence", async () => {
  const c = (text, link, human, status, proof) => ({ text, link, human, status, proof });
  const criteres = [
    c("Un export vide est refusé", "QUA-001", false, "pass", "pass"),
    c("Total | exact", null, false, "no-proof", null),
    c("Le libellé est clair", "QUA-003", true, "not-pass", "manual"),
  ];
  assert.equal(
    criteriaTable(criteres, "fr"),
    [
      "| Critère | Preuve | Verdict |",
      "|---|---|---|",
      "| Un export vide est refusé | `QUA-001` (pass) | ✅ prouvé |",
      "| Total \\| exact | — | ❌ sans preuve |",
      "| Le libellé est clair [human] | `QUA-003` (manual) | ❌ preuve non passante |",
      "",
    ].join("\n"),
  );
  assert.match(criteriaTable(criteres, "en"), /^\| Criterion \| Proof \| Verdict \|\n/);
  assert.match(criteriaTable([], "fr"), /aucun critère d'acceptation/);
  assert.equal(
    criteriaTable([c("a\\|b", "X|Y\\Z", false, "pass", "p|q")], "en"),
    ["| Criterion | Proof | Verdict |", "|---|---|---|", "| a\\\\\\|b | `X\\|Y\\\\Z` (p\\|q) | ✅ proven |", ""].join("\n"),
  );
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  writeFileSync(join(dir, "docs/projects/essai.md"), "# Essai\n\n## Critères d'acceptation\n\n- Prouvé — `QUA-001`\n");
  writeFileSync(
    join(dir, ".drwil/state.json"),
    JSON.stringify({ version: 1, activity: "EVIDENCE", active_brief: "docs/projects/essai.md", active_request: null, since: null }),
  );
  const chemin = writeEvidence(dir, await verify({ targetDir: dir }));
  const table = readFileSync(join(dir, chemin.replace(/verify-(.+)\.json$/, "criteria-$1.md")), "utf8");
  assert.match(table, /\| Prouvé \| `QUA-001` \(pass\) \| ✅ (prouvé|proven) \|/);
});

test("verify : contrôle non applicable dans ce contexte → MANUAL, jamais PASS", async () => {
  // En mode minimal, la recherche de secrets est exclue par conception : rien n'est prouvé.
  const v = await verify({ targetDir: await projetVerify(contrat("SEC-007", "**Contrôle** : `secrets`"), { mode: "minimal" }) });
  assert.equal(v.status, "MANUAL");
  assert.equal(v.code, 1);
  assert.match(v.contracts[0].reasons.join(), /secrets : non applicable ici/);
});

test("verify : priorité déterministe du verdict global FAIL > ERROR > MANUAL > PASS", async () => {
  const ok = contrat("QUA-001", "**Contrôle** : `ok`");
  const manuel = contrat("QUA-002", "**Manuel** : relecture");
  const erreur = contrat("QUA-003", "**Contrôle** : `ci-coverage`");
  const echec = contrat("QUA-004", "**Contrôle** : `ko`");
  const cas = [
    [ok, "PASS", 0],
    [ok + manuel, "MANUAL", 1],
    [ok + manuel + erreur, "ERROR", 2],
    [ok + manuel + erreur + echec, "FAIL", 1],
  ];
  for (const [contrats, statut, code] of cas) {
    const v = await verify({ targetDir: await projetVerify(contrats) });
    assert.deepEqual([v.status, v.code], [statut, code], contrats);
  }
});

test("DRWIL-002 : check-docs refuse un contrat mal formé dès le commit (contrôle inconnu, Règle absente)", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const base = read(dir, "docs/contracts.md");
  assert.equal(
    spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" }).status,
    0,
    "le registre livré est valide",
  );
  writeFileSync(join(dir, "docs/contracts.md"), `${base}\n## QUA-020 — mal formé\n**Contrôle** : \`inexistant\`\n`);
  const r = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /QUA-020 : contrôle inconnu « inexistant »/);
  assert.match(r.stdout + r.stderr, /QUA-020 : exigence absente/);
});

const cli = (dir, ...args) =>
  spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), ...args], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });

test("DRWIL-004 : verify --json, format stable, rien d'autre sur stdout, mêmes codes de sortie", async () => {
  const dir = await projetVerify(
    contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Manuel** : relecture") + contrat("QUA-003", "**Contrôle** : `ko`"),
  );
  const r = cli(dir, "verify", "--json");
  assert.equal(r.status, 1);
  const j = JSON.parse(r.stdout);
  assert.equal(j.version, 1);
  assert.equal(j.status, "fail");
  assert.equal(j.exitCode, 1);
  assert.deepEqual(j.contracts, { total: 3, passed: 1, failed: 1, manual: 1, error: 0, attested: 0 }, "ajout compatible v1 : attested");
  assert.deepEqual(
    j.results.map((k) => [k.id, k.status]),
    [
      ["QUA-001", "pass"],
      ["QUA-002", "manual"],
      ["QUA-003", "fail"],
    ],
  );
  assert.equal(j.results[2].checks[0].status, "fail");
  assert.doesNotMatch(r.stdout, /cause du rouge/, "la sortie brute des contrôles n'est pas exposée");
  const manuel = cli(await projetVerify(contrat("QUA-001", "**Manuel** : relecture")), "verify", "--json");
  assert.equal(manuel.status, 1);
  assert.equal(JSON.parse(manuel.stdout).status, "manual", "FAIL et MANUAL distincts en JSON");
  const erreur = cli(tmp(), "verify", "--json");
  assert.equal(erreur.status, 2);
  assert.equal(JSON.parse(erreur.stdout).status, "error");
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
  assert.ok(
    lignes.some((l) => l.includes(recette)),
    "et signalée comme dérive",
  );
  const apres = JSON.parse(read(dir, ".drwil/installed-files.json"));
  assert.equal(apres[skill], empreinte(read(dir, skill)), "le manifeste suit la prose rafraîchie");

  // resolve-drift propose la prose modifiée installée par le kit, jamais celle du projet.
  const proposes = [];
  await quiet(() =>
    resolveDrift({ targetDir: dir }, (rel) => {
      proposes.push(rel);
      return false;
    }),
  );
  assert.ok(proposes.includes(recette), "prose modifiée : diff proposé");
  assert.ok(!proposes.includes("AGENTS.md"), "prose du projet : jamais proposée");
  const r = await quiet(() => resolveDrift({ targetDir: dir }, (rel) => rel === recette));
  assert.ok(r.resolved.includes(recette));
  assert.match(read(dir, `${recette}.bak`), /Adapté par le projet/, "sauvegarde .bak");
  assert.doesNotMatch(read(dir, recette), /Adapté par le projet/);
});

test("DRWIL-010 : doctor diagnostique sans exécuter de contrôle ; --json ; contracts liste le registre", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, ci: "github" }));
  let d = await doctor({ targetDir: dir });
  assert.equal(d.code, 0, JSON.stringify(d.points));
  assert.ok(d.points.find((p) => p.id === "hooks").state === "ok");
  assert.match(d.points.find((p) => p.id === "contracts").detail, /11 contrat\(s\) valide\(s\)/);
  git(dir, "config", "core.hooksPath", "ailleurs");
  spawnSync(process.execPath, ["-e", "require('fs').unlinkSync('CLAUDE.md')"], { cwd: dir });
  d = await doctor({ targetDir: dir });
  assert.equal(d.code, 1);
  assert.equal(d.points.find((p) => p.id === "hooks").state, "problem");
  assert.match(d.points.find((p) => p.id === "integrations").detail, /manquant : CLAUDE\.md/);
  const j = cli(dir, "doctor", "--json");
  assert.equal(j.status, 1);
  assert.equal(JSON.parse(j.stdout).status, "problems");
  assert.equal(cli(tmp(), "doctor").status, 2);
  const c = cli(dir, "contracts", "--json");
  assert.equal(c.status, 0, c.stdout);
  assert.ok(JSON.parse(c.stdout).contracts.some((k) => k.id === "SEC-007" && k.checks.includes("secrets")));
});

test("DRWIL-011 : apply audite et prévisualise sans rien écrire ; l'aperçu correspond exactement à l'installation", async () => {
  const dir = tmp();
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", scripts: { test: "node --test", lint: "eslint ." } }));
  writeFileSync(join(dir, ".eslintrc.json"), "{}");
  writeFileSync(join(dir, "CLAUDE.md"), "mes consignes à moi\n");
  const a = await previewInit({ lang: "fr", targetDir: dir, git: false });
  assert.ok(a.protections.includes("eslint") && a.protections.includes("script npm « test »"), a.protections.join());
  assert.ok(a.aiTools.includes("CLAUDE.md"));
  assert.ok(a.created.includes("AGENTS.md") && a.created.includes(".githooks/engine.mjs") && a.created.includes(".drwil/ia-first.json"));
  assert.ok(a.kept.includes("CLAUDE.md") && !a.created.includes("CLAUDE.md"));
  assert.ok(!existsSync(join(dir, "AGENTS.md")) && !existsSync(join(dir, ".drwil")), "l'aperçu n'écrit rien");
  assert.match(formatPreview(a), /Rien d.autre ne sera écrasé/);
  const dry = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "init", "--dry-run", "--no-git"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });
  assert.equal(dry.status, 0, dry.stderr);
  assert.ok(!existsSync(join(dir, "AGENTS.md")), "--dry-run n'écrit rien");
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  for (const f of a.created) assert.ok(existsSync(join(dir, f)), `annoncé et créé : ${f}`);
  assert.ok(read(dir, "CLAUDE.md").startsWith("mes consignes à moi\n"), "fichier existant jamais écrasé");
  assert.ok(
    a.added.some((x) => x.file === "CLAUDE.md" && x.items.includes("@AGENTS.md")),
    "l'aperçu annonce l'import ajouté",
  );
  assert.match(read(dir, "CLAUDE.md"), /<!-- >>> drwil -->\n@AGENTS\.md\n<!-- <<< drwil -->/);
});

test("DRWIL-012 : installation neuve sans bruit ; un risque déclaré trop bas est refusé au commit", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const propre = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(propre.status, 0, propre.stdout);
  assert.doesNotMatch(propre.stdout, /niveau de risque/, "aucun avertissement de risque à l'installation");
  writeFileSync(
    join(dir, "docs/projects/toucher-hooks.md"),
    "# Projet : x\n\n**Statut** : cadré le 2026-10-06.\n**Risque** : LOW\n\n<!-- scope\nfiles:\n  - .githooks/engine.mjs\n-->\n\n## 7. Reprise\n\n- rien\n",
  );
  const r = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /risque LOW déclaré.*HIGH au minimum/);
});

test("caviardage des clés privées : bloc complet, clé chiffrée, temps linéaire sur une entrée piégée (ReDoS)", () => {
  // En-têtes construits à l'exécution : aucune chaîne en forme de clé dans le source (gitleaks).
  const borne = (cote, type = "") => `-----${cote} ${type}PRIVATE ${"KEY"}-----`;
  const cle = `${borne("BEGIN", "RSA ")}\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-128-CBC,AB12\n\nMIIEow\n${borne("END", "RSA ")}`;
  assert.equal(redact(`avant ${cle} après`), "avant [REDACTED] après");
  assert.equal(redact(`${cle}\n${cle}`), "[REDACTED]\n[REDACTED]");
  assert.equal(redact(`${borne("BEGIN")} sans fin`), `${borne("BEGIN")} sans fin`);
  // Quadratique avant correction : près de deux secondes pour 20 000 en-têtes sans fin de bloc.
  const piege = borne("BEGIN").repeat(20000);
  // Meilleur de trois passes : la charge de la machine allonge une passe, pas les trois ; un temps quadratique les allonge toutes.
  const durees = [1, 2, 3].map(() => {
    const debut = performance.now();
    redact(piege);
    return performance.now() - debut;
  });
  assert.ok(Math.min(...durees) < 1000, `caviardage trop lent : ${durees.map(Math.round).join(", ")} ms`);
});

test("QUA-136 : verify --evidence consigne la durée de chaque contrôle exécuté en millisecondes entières", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "x");
  const r = cli(dir, "verify", "--json", "--evidence");
  const chemin = /évidence : (\S+)/.exec(r.stderr)?.[1];
  assert.ok(chemin, r.stderr);
  const e = JSON.parse(read(dir, chemin));
  const duree = e.evidence.find((k) => k.id === "QUA-001").checks[0];
  assert.equal(duree.status, "ok");
  assert.ok(Number.isInteger(duree.durationMs) && duree.durationMs >= 0, JSON.stringify(duree));
});

test("QUA-139 : avec parallel, verify rend le même verdict contrat par contrat qu'en série, dans l'ordre du registre", async () => {
  const contrats =
    contrat("QUA-001", "**Contrôle** : `ko`") +
    contrat("QUA-002", "**Contrôle** : `ok`") +
    contrat("QUA-003", "**Contrôle** : `ko`, `ok`\n**Manuel** : relecture") +
    contrat("QUA-004", "**Contrôle** : `absent`");
  const lire = async (reglages) => {
    const dir = await projetVerify(contrats, reglages);
    const cfg = config(dir);
    cfg.checks.push({ id: "absent", name: "introuvable", run: "commande-qui-n-existe-pas-139" });
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
    const v = await verify({ targetDir: dir });
    return {
      status: v.status,
      contrats: v.contracts.map((k) => [k.id, k.status, k.reasons, k.checks.map((c) => [c.id, c.status])]),
    };
  };
  const serie = await lire({ parallel: false });
  const parallele = await lire({ parallel: true });
  assert.equal(serie.status, "FAIL");
  assert.deepEqual(parallele, serie);
});

test("QUA-139 : avec parallel, les contrôles cités se jouent en même temps ; sans le réglage, en série", async () => {
  const rdv = (moi, autre) =>
    `node -e "const f=require('fs');f.writeFileSync('${moi}','');const t=Date.now();while(!f.existsSync('${autre}')){if(Date.now()-t>4000)process.exit(1)}"`;
  const contrats = contrat("QUA-001", "**Contrôle** : `a`") + contrat("QUA-002", "**Contrôle** : `b`");
  const jouer = async (parallel) => {
    const dir = await projetVerify(contrats, { parallel });
    const cfg = config(dir);
    cfg.checks.push({ id: "a", name: "a", run: rdv("a.flag", "b.flag") }, { id: "b", name: "b", run: rdv("b.flag", "a.flag") });
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
    return verify({ targetDir: dir });
  };
  assert.equal((await jouer(true)).status, "PASS", "chacun attend que l'autre ait démarré : impossible en série");
  assert.equal((await jouer(false)).status, "FAIL");
});

// QUA-140 : le verdict « ok » consigné pour `ko` est faux exprès : un contrôle rejoué rendrait FAIL, un contrôle repris rend PASS.
async function projetReprise(contrats, { verdicts = { ok: { status: "ok" }, ko: { status: "ok" } }, cfg: modifier } = {}) {
  const dir = await projetVerify(contrats);
  if (modifier) {
    const cfg = config(dir);
    modifier(cfg);
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  }
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "x");
  const moteur = await import(pathToFileURL(join(dir, ".githooks", "engine.mjs")).href);
  mkdirSync(join(dir, ".drwil/evidence"), { recursive: true });
  const ranAt = "2026-10-25T10:00:00.000Z";
  writeFileSync(
    join(dir, ".drwil/evidence/run-checks-verdicts.json"),
    JSON.stringify({ ranAt, fingerprint: moteur.treeFingerprint(dir), checks: verdicts }),
  );
  return dir;
}
const origines = (v) => Object.fromEntries(v.contracts.flatMap((k) => k.checks.map((c) => [c.id, c.reusedAt ?? "rejoué"])));

test("QUA-140 : verify reprend le verdict de run-checks sur un arbre identique, le dit contrat par contrat, et garde son échec", async () => {
  const dir = await projetReprise(contrat("QUA-001", "**Contrôle** : `ko`") + contrat("QUA-002", "**Contrôle** : `ok`"), {
    verdicts: { ko: { status: "fail", output: "cause venue de run-checks" }, ok: { status: "ok" } },
  });
  const v = await verify({ targetDir: dir });
  assert.deepEqual(origines(v), { ko: "2026-10-25T10:00:00.000Z", ok: "2026-10-25T10:00:00.000Z" });
  assert.deepEqual(
    v.contracts.map((k) => k.status),
    ["FAIL", "PASS"],
  );
  const raisons = v.contracts[0].reasons.join("\n");
  assert.match(raisons, /ko : repris \(arbre identique\) de run-checks du 2026-10-25T10:00:00.000Z/);
  assert.match(raisons, /cause venue de run-checks/, "un échec repris garde sa cause");
  const e = JSON.parse(read(dir, writeEvidence(dir, v)));
  assert.deepEqual(e.evidence[1].checks[0].reusedFrom, "run-checks");
  const agent = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify", "--agent"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });
  assert.match(agent.stdout, /Checks \(per contract\): 2 reused from run-checks on an identical tree, 0 replayed/);
  assert.doesNotMatch(agent.stdout, /reused \(|repris \(/, "les raisons d'origine ne noient pas la sortie");
});

test("QUA-140 : verify rejoue tout contrôle dont l'empreinte diffère (un octet, un fichier non suivi, la configuration)", async () => {
  const contrats = contrat("QUA-001", "**Contrôle** : `ko`");
  const rejoue = async (altere) => {
    const dir = await projetReprise(contrats);
    writeFileSync(join(dir, "docs", "note.md"), "a\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "y");
    const moteur = await import(pathToFileURL(join(dir, ".githooks", "engine.mjs")).href);
    const fichier = join(dir, ".drwil/evidence/run-checks-verdicts.json");
    writeFileSync(
      fichier,
      JSON.stringify({ ...JSON.parse(read(dir, ".drwil/evidence/run-checks-verdicts.json")), fingerprint: moteur.treeFingerprint(dir) }),
    );
    assert.equal((await verify({ targetDir: dir })).status, "PASS", "arbre identique : repris");
    altere(dir);
    return verify({ targetDir: dir });
  };
  for (const [nom, altere] of [
    ["un octet d'un fichier suivi", (dir) => writeFileSync(join(dir, "docs", "note.md"), "b\n")],
    ["un fichier non suivi", (dir) => writeFileSync(join(dir, "nouveau.txt"), "")],
    ["la configuration", (dir) => writeFileSync(join(dir, ".drwil/ia-first.json"), `${read(dir, ".drwil/ia-first.json")}\n`)],
  ]) {
    const v = await rejoue(altere);
    assert.equal(v.status, "FAIL", `${nom} : rejoué, donc rouge`);
    assert.deepEqual(origines(v), { ko: "rejoué" }, nom);
  }
});

test("QUA-140 : verify rejoue un contrôle sans verdict, non exécuté, déclaré reuse: false, ou avec reuse: false", async () => {
  const contrats = contrat("QUA-001", "**Contrôle** : `ko`") + contrat("QUA-002", "**Contrôle** : `ok`");
  const tous = { ok: { status: "ok" }, ko: { status: "ok" } };
  const sansVerdict = await verify({ targetDir: await projetReprise(contrats, { verdicts: { ok: { status: "ok" } } }) });
  assert.deepEqual(origines(sansVerdict), { ko: "rejoué", ok: "2026-10-25T10:00:00.000Z" });
  assert.equal(sansVerdict.status, "FAIL");
  const nonExecute = await verify({
    targetDir: await projetReprise(contrats, { verdicts: { ok: { status: "ok" }, ko: { status: "not-run" } } }),
  });
  assert.equal(origines(nonExecute).ko, "rejoué", "seuls « ok » et « fail » sont repris");
  const exterieur = await verify({
    targetDir: await projetReprise(contrats, { verdicts: tous, cfg: (cfg) => (cfg.checks[1].reuse = false) }),
  });
  assert.deepEqual(origines(exterieur), { ko: "rejoué", ok: "2026-10-25T10:00:00.000Z" }, "reuse: false : toujours rejoué");
  const dir = await projetReprise(contrats, { verdicts: tous });
  assert.equal((await verify({ targetDir: dir })).status, "PASS");
  const sans = await verify({ targetDir: dir, reuse: false });
  assert.deepEqual(origines(sans), { ko: "rejoué", ok: "rejoué" });
  assert.equal(sans.status, "FAIL");
});

test("QUA-140 : l'option --no-reuse de la commande verify rejoue tout, sans elle les verdicts sont repris", async () => {
  const dir = await projetReprise(contrat("QUA-001", "**Contrôle** : `ok`"), { verdicts: { ok: { status: "ok" } } });
  const cli = (...args) =>
    spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify", ...args], {
      cwd: dir,
      encoding: "utf8",
    });
  assert.match(cli().stdout, /repris \(arbre identique\) de run-checks du 2026-10-25T10:00:00.000Z/);
  assert.doesNotMatch(cli("--no-reuse").stdout, /repris \(/);
});

// QUA-141 : un verdict consigné par run-checks avec l'empreinte propre du contrôle (`control`), l'arbre ayant changé depuis (ou jamais pris).
async function projetParControle(contrats, { tree = false, played = [] } = {}) {
  const dir = await projetReprise(contrats, {
    cfg: (cfg) => {
      for (const c of cfg.checks) c.paths = ["src/**"];
    },
  });
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "a.txt"), "a\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "src");
  const moteur = await import(pathToFileURL(join(dir, ".githooks", "engine.mjs")).href);
  const controles = moteur.controlFingerprints(dir, moteur.checks(dir, { cfg: config(dir) }));
  const verdict = (id) => ({ status: "ok", ranAt: "2026-10-25T09:00:00.000Z", control: controles.get(id) });
  writeFileSync(
    join(dir, ".drwil/evidence/run-checks-verdicts.json"),
    JSON.stringify({
      ranAt: "2026-10-25T10:00:00.000Z",
      fingerprint: tree ? moteur.treeFingerprint(dir) : null,
      played,
      checks: { ok: verdict("ok"), ko: verdict("ko") },
    }),
  );
  return dir;
}
const bases = (v) => Object.fromEntries(v.contracts.flatMap((k) => k.checks.map((c) => [c.id, c.reusedBasis ?? "rejoué"])));

test("QUA-141 : verify reprend le verdict d'un contrôle dont les fichiers du paths et la déclaration sont inchangés, même si l'arbre a changé ailleurs, et le dit", async () => {
  const dir = await projetParControle(contrat("QUA-001", "**Contrôle** : `ko`") + contrat("QUA-002", "**Contrôle** : `ok`"));
  writeFileSync(join(dir, "ailleurs.txt"), "changé\n");
  const v = await verify({ targetDir: dir });
  assert.deepEqual(bases(v), { ko: "control", ok: "control" });
  assert.equal(v.status, "PASS", "le verdict « ok » consigné est repris : rien n'est rejoué");
  assert.match(
    v.contracts[0].reasons.join("\n"),
    /ko : repris \(fichiers du contrôle inchangés\) de run-checks du 2026-10-25T09:00:00.000Z — reprise par contrôle : ne vaut pas preuve de clôture/,
  );
  const agent = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify", "--agent"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });
  assert.match(agent.stdout, /GOVERNANCE: PASS/);
  assert.match(
    agent.stdout,
    /0 reused from run-checks on an identical tree, 0 replayed, 2 reused from run-checks on unchanged check files \(per-check reuse: not a closing proof/,
  );
  const e = JSON.parse(read(dir, writeEvidence(dir, v)));
  assert.equal(e.evidence[0].checks[0].reusedBasis, "control");
});

test("QUA-141 : verify rejoue un contrôle dont un octet de son paths ou la déclaration a changé, ou sans empreinte propre", async () => {
  const contrats = contrat("QUA-001", "**Contrôle** : `ko`") + contrat("QUA-002", "**Contrôle** : `ok`");
  const octet = await projetParControle(contrats);
  writeFileSync(join(octet, "src", "a.txt"), "b\n");
  const v1 = await verify({ targetDir: octet });
  assert.deepEqual(bases(v1), { ko: "rejoué", ok: "rejoué" });
  assert.equal(v1.status, "FAIL");
  const declaration = await projetParControle(contrats);
  const cfg = config(declaration);
  cfg.checks[0].name = "autre nom";
  writeFileSync(join(declaration, ".drwil/ia-first.json"), JSON.stringify(cfg));
  assert.deepEqual(
    bases(await verify({ targetDir: declaration })),
    { ko: "control", ok: "rejoué" },
    "seul le contrôle dont la déclaration change est rejoué",
  );
  const sans = await projetParControle(contrats);
  const fichier = join(sans, ".drwil/evidence/run-checks-verdicts.json");
  const consigne = JSON.parse(read(sans, ".drwil/evidence/run-checks-verdicts.json"));
  consigne.checks.ko.control = null;
  writeFileSync(fichier, JSON.stringify(consigne));
  assert.deepEqual(bases(await verify({ targetDir: sans })), { ko: "rejoué", ok: "control" });
});

test("QUA-141 : la preuve de clôture (evidence) et --no-reuse ne reprennent rien par contrôle ; l'arbre identique ne reprend que les contrôles joués dans la passe", async () => {
  const contrats = contrat("QUA-001", "**Contrôle** : `ko`") + contrat("QUA-002", "**Contrôle** : `ok`");
  const dir = await projetParControle(contrats, { tree: true, played: ["ok"] });
  assert.deepEqual(bases(await verify({ targetDir: dir })), { ko: "control", ok: "tree" });
  assert.deepEqual(
    bases(await verify({ targetDir: dir, evidence: true })),
    { ko: "rejoué", ok: "tree" },
    "ko n'a pas été joué dans la passe de l'arbre",
  );
  assert.deepEqual(bases(await verify({ targetDir: dir, reuse: false })), { ko: "rejoué", ok: "rejoué" });
  writeFileSync(join(dir, "ailleurs.txt"), "x\n");
  assert.deepEqual(
    bases(await verify({ targetDir: dir, evidence: true })),
    { ko: "rejoué", ok: "rejoué" },
    "arbre changé : la clôture rejoue tout",
  );
  const cli = (...args) =>
    spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify", "--json", ...args], {
      cwd: dir,
      encoding: "utf8",
      env: envTest,
    });
  assert.equal(JSON.parse(cli().stdout).status, "pass", "sans --evidence : repris par contrôle");
  assert.equal(JSON.parse(cli("--evidence").stdout).status, "fail", "--evidence : rejoué sur l'arbre entier, ko est rouge");
});

// QUA-159 : une preuve écrite à la main, pour fixer ce que `--failed` rejoue.
function avecPreuve(dir, resultats, nom = "verify-2026-10-26T10-00-00-000Z.json") {
  mkdirSync(join(dir, ".drwil/evidence"), { recursive: true });
  writeFileSync(join(dir, ".drwil/evidence", nom), typeof resultats === "string" ? resultats : JSON.stringify({ results: resultats }));
}
const preuves = (dir) => readdirSync(join(dir, ".drwil/evidence")).filter((f) => /^verify-/.test(f));

test("QUA-159 : verify --failed rejoue les seuls contrats ni PASS ni ATTESTED, nomme le MANUAL sans le rejouer, ne rend jamais PASS ni ne signe de preuve", async () => {
  const dir = await projetVerify(
    contrat("QUA-001", "**Contrôle** : `ko`") +
      contrat("QUA-002", "**Contrôle** : `ko`") +
      contrat("QUA-003", "**Manuel** : appréciation") +
      contrat("QUA-004", "**Contrôle** : `ok`") +
      contrat("QUA-005", "**Contrôle** : `ko`"),
  );
  avecPreuve(dir, [
    { id: "QUA-001", status: "pass" },
    { id: "QUA-002", status: "attested" },
    { id: "QUA-003", status: "manual" },
    { id: "QUA-004", status: "fail" },
  ]);
  // Une preuve plus récente illisible, puis sans contrat : ignorées, la dernière lisible fait foi.
  avecPreuve(dir, "pas du JSON", "verify-2026-10-27T10-00-00-000Z.json");
  avecPreuve(dir, [], "verify-2026-10-28T10-00-00-000Z.json");
  const avant = preuves(dir);
  const j = JSON.parse(cli(dir, "verify", "--failed", "--json").stdout);
  assert.equal(j.status, "partial");
  assert.equal(j.exitCode, 1);
  assert.deepEqual(j.partial, {
    previous: ".drwil/evidence/verify-2026-10-26T10-00-00-000Z.json",
    replayed: ["QUA-004", "QUA-005"],
    manual: ["QUA-003"],
    skipped: 2,
    outcome: "fail",
  });
  assert.deepEqual(
    j.results.map((r) => [r.id, r.status]),
    [
      ["QUA-004", "pass"],
      ["QUA-005", "fail"],
    ],
    "QUA-001 (ko, PASS à la preuve) n'est pas rejoué : il serait FAIL",
  );
  const humain = cli(dir, "verify", "--failed");
  assert.equal(humain.status, 1);
  assert.match(humain.stdout, /Verdict partiel \(--failed\), jamais une preuve de clôture : 2 contrat\(s\) rejoué\(s\)/);
  assert.match(humain.stdout, /En attente d'attestation, pas en échec, non rejoué\(s\) : QUA-003/);
  assert.match(humain.stdout, /GOVERNANCE: PARTIAL \(--failed\) — NOT A VERDICT/);
  const agent = cli(dir, "verify", "--failed", "--agent").stdout;
  assert.match(agent, /Verdict: GOVERNANCE: PARTIAL \(--failed\) — NOT A VERDICT \(exit 1\)/);
  assert.match(
    agent,
    /2 contract\(s\) replayed .* 2 PASS or ATTESTED at \.drwil\/evidence\/verify-2026-10-26.* not replayed, so not judged/,
  );
  assert.match(agent, /Awaiting attestation, not failing, not replayed: QUA-003 — HUMAN ACTION/);
  assert.match(agent, /then run the full pass `drwil verify --evidence`/);
  assert.doesNotMatch(humain.stdout + agent, /GOVERNANCE: PASS/);
  assert.deepEqual(preuves(dir), avant, "un verdict partiel n'écrit aucune preuve");
});

test("QUA-159 : verify --failed rendu vert reste partiel (exit 1, jamais PASS) ; sans preuve lisible il le dit et ne rejoue rien ; avec --evidence il refuse", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  const sans = cli(dir, "verify", "--failed");
  assert.equal(sans.status, 1);
  assert.match(sans.stdout, /Aucune preuve précédente lisible dans \.drwil\/evidence\/ : rien n'est rejoué/);
  assert.doesNotMatch(sans.stdout, /GOVERNANCE: PASS|QUA-001/);
  assert.match(cli(dir, "verify", "--failed", "--agent").stdout, /no readable previous evidence.*nothing replayed/);
  avecPreuve(dir, "[]");
  assert.equal(JSON.parse(cli(dir, "verify", "--failed", "--json").stdout).partial.previous, null, "preuve sans résultats : illisible");
  avecPreuve(dir, [{ id: "QUA-001", status: "fail" }]);
  const vert = JSON.parse(cli(dir, "verify", "--failed", "--json").stdout);
  assert.deepEqual([vert.status, vert.exitCode, vert.partial.outcome], ["partial", 1, "pass"]);
  const double = cli(dir, "verify", "--failed", "--evidence");
  assert.notEqual(double.status, 0);
  assert.match(double.stderr, /--failed.*--evidence|--evidence.*--failed/);
  assert.equal(preuves(dir).length, 1);
  const horsProjet = await verifyFailed({ targetDir: tmp() });
  assert.equal(horsProjet.status, "ERROR", "un projet que verify ne charge pas : verify dit pourquoi");
  assert.equal(horsProjet.partial, undefined);
});

test("DRWIL-013 : verify --evidence enregistre verdict, horodatage, commit et résumés caviardés", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `fuite`"));
  const cfg = config(dir);
  cfg.checks.push({
    id: "fuite",
    name: "bavard",
    run: "node -e \"console.log('password=hunter2-tres-secret'); console.log('jeton ghp_abcdefghijklmnopqrstuvwxyz0123'); process.exit(1)\"",
  });
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "x");
  const r = cli(dir, "verify", "--json", "--evidence");
  assert.equal(r.status, 1);
  JSON.parse(r.stdout);
  const chemin = /évidence : (\S+)/.exec(r.stderr)?.[1];
  assert.ok(chemin && existsSync(join(dir, chemin)), r.stderr);
  const brut = read(dir, chemin);
  const e = JSON.parse(brut);
  assert.equal(e.status, "fail");
  assert.match(e.verifiedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(e.commit, /^[0-9a-f]{40}$/);
  assert.equal(e.evidence.find((k) => k.id === "QUA-001").checks[0].summary, "ok");
  assert.match(e.evidence.find((k) => k.id === "QUA-002").checks[0].summary, /\[REDACTED\]/);
  assert.doesNotMatch(brut, /hunter2|ghp_abcdef/, "aucun secret dans l'évidence (SEC-007)");
  assert.match(read(dir, ".gitignore"), /\.drwil\/evidence\//);
});

test("DRWIL-020 : seuls les contrats bloquants décident du verdict ; avertissement et indicatif affichés", async () => {
  const avert = (id, ctl, sev) => contrat(id, `**Contrôle** : \`${ctl}\`\n**Sévérité** : ${sev}`);
  let v = await verify({
    targetDir: await projetVerify(
      contrat("QUA-001", "**Contrôle** : `ok`") +
        avert("QUA-002", "ko", "avertissement") +
        contrat("QUA-003", "**Manuel** : relecture\n**Sévérité** : indicatif"),
    ),
  });
  assert.equal(v.status, "PASS", "un avertissement en échec ne bloque pas le gate");
  assert.equal(v.code, 0);
  assert.deepEqual(
    v.contracts.map((k) => [k.status, k.severity]),
    [
      ["PASS", "blocking"],
      ["FAIL", "warning"],
      ["MANUAL", "advisory"],
    ],
  );
  assert.match(formatVerdict(v), /1 avertissement\(s\) non satisfait\(s\), 1 indicatif\(s\) non satisfait\(s\)/);
  const j = JSON.parse(cli(await projetVerify(avert("QUA-002", "ko", "avertissement")), "verify", "--json").stdout);
  assert.deepEqual(j.bySeverity.warning, { total: 1, passed: 0, notPassed: 1 });
  v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `ko`") + avert("QUA-002", "ok", "avertissement")) });
  assert.equal(v.status, "FAIL", "un bloquant en échec reste FAIL");
  v = await verify({ targetDir: await projetVerify(avert("QUA-002", "inexistant", "indicatif")) });
  assert.equal(v.status, "ERROR", "un registre mal formé reste une ERROR, même sur un contrat indicatif");
});

test("DRWIL-031 : l'exemple en 5 minutes du README est rejoué tel quel", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en", tools: "claude", ci: "github" }));
  const cfg = config(dir);
  cfg.checks = [{ id: "unit-tests", name: "unit tests", run: "node --test" }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg, null, 2));
  writeFileSync(
    join(dir, "docs/contracts.md"),
    read(dir, "docs/contracts.md") + "\n## QUA-020 — Unit tests pass\n**Rule**: every unit test passes.\n**Check**: `unit-tests`\n",
  );
  writeFileSync(
    join(dir, "sum.test.mjs"),
    'import { test } from "node:test";\nimport assert from "node:assert/strict";\ntest("sum", () => assert.equal(1 + 1, 2));\n',
  );
  let v = await verify({ targetDir: dir });
  assert.equal(v.contracts.find((k) => k.id === "QUA-020").status, "PASS", formatVerdict(v));
  assert.notEqual(v.status, "PASS", "un projet neuf garde des contrats de socle MANUAL : jamais PASS d'office");
  writeFileSync(join(dir, "sum.test.mjs"), read(dir, "sum.test.mjs").replace("1 + 1, 2", "1 + 1, 3"));
  v = await verify({ targetDir: dir });
  assert.equal(v.contracts.find((k) => k.id === "QUA-020").status, "FAIL");
  assert.equal(v.status, "FAIL");
  assert.equal(v.code, 1);
});

// DRWIL-013 (suite) : attestation humaine d'un contrat MANUAL. `confirmer` simule l'humain ;
// la CLI, elle, exige un vrai terminal (testé à part).
const oui = async () => true;
const non = async () => false;
async function projetAtteste(contrats) {
  const dir = await projetVerify(contrats);
  git(dir, "init", "-q");
  spawnSync("git", ["config", "user.name", "Testeuse"], { cwd: dir });
  return dir;
}
const attestations = (dir) =>
  existsSync(join(dir, ".drwil/evidence/attestations"))
    ? spawnSync("ls", [join(dir, ".drwil/evidence/attestations")], { encoding: "utf8" })
        .stdout.split("\n")
        .filter(Boolean)
    : [];
const MANUEL = contrat("QUA-001", "**Contrôle** : `ok`\n**Manuel** : relecture des fiches");

test("attest : un MANUAL devient ATTESTED, verify le compte comme satisfait sans le confondre avec PASS", async () => {
  const dir = await projetAtteste(MANUEL);
  assert.equal((await verify({ targetDir: dir })).status, "MANUAL");
  const r = await attest({ targetDir: dir, id: "QUA-001", note: "fiches relues", confirm: oui });
  assert.equal(r.code, 0, r.message);
  const a = JSON.parse(read(dir, r.file));
  assert.equal(a.contract, "QUA-001");
  assert.equal(a.status, "ATTESTED");
  assert.match(a.attestedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(a.actor, { name: "Testeuse", source: "git config user.name, déclaratif" });
  assert.equal(a.note, "fiches relues");
  assert.match(a.fingerprint, /^[0-9a-f]{64}$/);
  assert.deepEqual(a.automated, [{ id: "ok", status: "ok" }]);
  const v = await verify({ targetDir: dir });
  assert.equal(v.contracts[0].status, "ATTESTED", "jamais PASS : la preuve humaine reste visible");
  assert.equal(v.status, "PASS");
  assert.equal(v.code, 0);
  assert.match(formatVerdict(v), /1 ATTESTED.*\n.*validée\(s\) par attestation humaine/);
  const j = verdictJson(v);
  assert.equal(j.version, 1);
  assert.equal(j.contracts.attested, 1);
  assert.equal(j.results[0].status, "attested");
  assert.equal(j.results[0].attestation.note, "fiches relues");
});

test("attest : refus, contrat inconnu, contrat déjà PASS, contrat en échec", async () => {
  const dir = await projetAtteste(
    MANUEL + contrat("QUA-002", "**Contrôle** : `ok`") + contrat("QUA-003", "**Contrôle** : `ko`\n**Manuel** : relecture"),
  );
  let r = await attest({ targetDir: dir, id: "QUA-001", confirm: non });
  assert.equal(r.code, 1);
  assert.match(r.message, /refusée/);
  assert.deepEqual(attestations(dir), [], "rien d'enregistré après un refus");
  assert.equal((await verify({ targetDir: dir })).contracts[0].status, "MANUAL");
  r = await attest({ targetDir: dir, id: "QUA-999", confirm: oui });
  assert.equal(r.code, 2);
  assert.match(r.message, /contrat inconnu/);
  r = await attest({ targetDir: dir, id: "QUA-002", confirm: oui });
  assert.equal(r.code, 1);
  assert.match(r.message, /déjà prouvé automatiquement/);
  r = await attest({ targetDir: dir, id: "QUA-003", confirm: oui });
  assert.equal(r.code, 1, "un contrôle en échec ne s'atteste jamais");
  assert.match(r.message, /n'est pas attestable \(FAIL\)/);
  assert.deepEqual(attestations(dir), []);
});

test("attest : obsolète si le contrat ou sa preuve change ; plusieurs attestations, la dernière valide compte", async () => {
  const dir = await projetAtteste(MANUEL);
  assert.equal((await attest({ targetDir: dir, id: "QUA-001", confirm: oui, now: new Date("2026-10-06T08:00:00Z") })).code, 0);
  assert.equal((await attest({ targetDir: dir, id: "QUA-001", confirm: oui })).code, 1, "déjà attesté : pas de doublon");
  writeFileSync(
    join(dir, "docs/contracts.md"),
    read(dir, "docs/contracts.md").replace("relecture des fiches", "relecture des fiches et des recettes"),
  );
  let v = await verify({ targetDir: dir });
  assert.equal(v.contracts[0].status, "MANUAL", "contrat modifié : attestation obsolète, jamais une validation");
  assert.match(v.contracts[0].reasons.join(), /obsolète/);
  assert.equal((await attest({ targetDir: dir, id: "QUA-001", confirm: oui, now: new Date("2026-10-06T09:00:00Z") })).code, 0);
  assert.equal(attestations(dir).length, 2, "l'historique est conservé");
  v = await verify({ targetDir: dir });
  assert.equal(v.contracts[0].status, "ATTESTED");
  assert.equal(v.contracts[0].attestation.attestedAt, "2026-10-06T09:00:00.000Z");
  const cfg = config(dir);
  cfg.checks.find((c) => c.id === "ok").run = 'node -e "process.exit(0)" # autre preuve';
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  assert.equal((await verify({ targetDir: dir })).contracts[0].status, "MANUAL", "preuve modifiée : attestation obsolète");
});

test("attest : sévérités — seule une attestation de contrat bloquant pèse sur le verdict", async () => {
  const sev = (id, champs, s) => contrat(id, `${champs}\n**Sévérité** : ${s}`);
  const dir = await projetAtteste(
    MANUEL + sev("QUA-002", "**Manuel** : relecture", "avertissement") + sev("QUA-003", "**Manuel** : relecture", "indicatif"),
  );
  let v = await verify({ targetDir: dir });
  assert.equal(v.status, "MANUAL", "le bloquant MANUAL décide");
  await attest({ targetDir: dir, id: "QUA-001", confirm: oui });
  v = await verify({ targetDir: dir });
  assert.equal(v.status, "PASS", "bloquant attesté ; avertissement et indicatif MANUAL restent informatifs");
  assert.deepEqual(
    v.contracts.map((k) => k.status),
    ["ATTESTED", "MANUAL", "MANUAL"],
  );
  await attest({ targetDir: dir, id: "QUA-003", confirm: oui });
  v = await verify({ targetDir: dir });
  assert.equal(v.contracts[2].status, "ATTESTED");
  assert.deepEqual(verdictJson(v).bySeverity.advisory, { total: 1, passed: 0, notPassed: 0 });
});

test("attest : aucun contournement (CLI sans terminal, attestation forgée, échec postérieur, non applicable)", async () => {
  const dir = await projetAtteste(MANUEL);
  const cliAttest = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "attest", "QUA-001"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
    input: "QUA-001\n",
  });
  assert.equal(cliAttest.status, 1, "sans terminal interactif, pas d'attestation (agent, script, stdin redirigé)");
  assert.match(cliAttest.stderr, /terminal interactif est requis/);
  assert.deepEqual(attestations(dir), []);
  mkdirSync(join(dir, ".drwil/evidence/attestations"), { recursive: true });
  writeFileSync(
    join(dir, ".drwil/evidence/attestations/QUA-001-forgee.json"),
    JSON.stringify({
      version: 1,
      contract: "QUA-001",
      status: "ATTESTED",
      attestedAt: "2030-01-01T00:00:00.000Z",
      fingerprint: "0".repeat(64),
    }),
  );
  let v = await verify({ targetDir: dir });
  assert.equal(v.contracts[0].status, "MANUAL", "une empreinte qui ne correspond pas n'est jamais acceptée");
  await attest({ targetDir: dir, id: "QUA-001", confirm: oui });
  const cfg = config(dir);
  cfg.checks.find((c) => c.id === "ok").run = cfg.checks.find((c) => c.id === "ko").run;
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  v = await verify({ targetDir: dir });
  assert.equal(v.contracts[0].status, "FAIL", "une attestation ne masque jamais un contrôle en échec");
  const minimal = await projetVerify(contrat("SEC-007", "**Contrôle** : `secrets`\n**Manuel** : relecture"), { mode: "minimal" });
  const r = await attest({ targetDir: minimal, id: "SEC-007", confirm: oui });
  assert.equal(r.code, 1, "un contrôle non applicable ne se remplace pas par une attestation");
});

test("attest : aucune donnée sensible dans l'attestation (note caviardée, pas d'e-mail)", async () => {
  const dir = await projetAtteste(MANUEL);
  spawnSync("git", ["config", "user.email", "testeuse@exemple.invalid"], { cwd: dir });
  const r = await attest({
    targetDir: dir,
    id: "QUA-001",
    note: "ok avec password=hunter2 et ghp_abcdefghijklmnopqrstuvwxyz0123 " + "x".repeat(800),
    confirm: oui,
  });
  assert.equal(r.code, 0);
  const brut = read(dir, r.file);
  assert.doesNotMatch(brut, /hunter2|ghp_abcdef|testeuse@exemple/);
  assert.match(JSON.parse(brut).note, /\[REDACTED\]/);
  assert.ok(JSON.parse(brut).note.length <= 500);
});

// Intégration agent (docs/projects/journal.md, 2026-10-10) : `verify --agent` présente le verdict
// sans recalculer de règle ; `attest` reste humain. Décision (a) : une attestation écrite à la main
// n'est pas détectée comme fausse, la frontière est la revue du changement (dossier versionné).
test("verify --agent : PASS sans action, FAIL à corriger, ERROR à résoudre, seul MANUAL demande une attestation humaine", async () => {
  let r = cli(await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`")), "verify", "--agent");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Contracts: 1 PASS · 0 ATTESTED · 0 FAIL · 0 ERROR · 0 MANUAL/);
  assert.match(r.stdout, /Verdict: GOVERNANCE: PASS \(exit 0\)/);
  assert.match(r.stdout, /Next step: Work is verified by drwil/);
  assert.doesNotMatch(r.stdout, /Human attestation required|drwil attest/, "PASS : aucune action humaine");
  r = cli(await projetVerify(contrat("QUA-001", "**Contrôle** : `ko`")), "verify", "--agent");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /GOVERNANCE: FAIL/);
  assert.match(r.stdout, /Failing contracts \(fix them\):\n {2}- QUA-001/);
  assert.match(r.stdout, /Do not claim the work is done/);
  assert.doesNotMatch(r.stdout, /Human attestation required|drwil attest/, "FAIL : l'agent corrige, pas d'attestation");
  r = cli(await projetVerify(contrat("QUA-001", "**Contrôle** : `inexistant`")), "verify", "--agent");
  assert.equal(r.status, 2, "ERROR reste ERROR");
  assert.match(r.stdout, /GOVERNANCE: VERIFY ERROR/);
  assert.match(r.stdout, /do not claim the work is verified/);
  assert.doesNotMatch(
    r.stdout,
    /Human attestation required|drwil attest/,
    "ERROR : problème de vérification à résoudre, pas d'attestation",
  );
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`\n**Manuel** : relecture"));
  r = cli(dir, "verify", "--agent");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Human attestation required\.\n {2}- QUA-001/);
  assert.match(
    r.stdout,
    /HUMAN ACTION — for the human, in their own interactive terminal; never run it yourself:\n {2}drwil attest <CONTRACT_ID>/,
  );
  assert.ok(!existsSync(join(dir, ".drwil/evidence")), "verify --agent n'écrit rien, n'atteste rien");
});

test("/drwil verify (Claude) : adaptateur de la CLI, jamais d'attestation par l'agent ; consigne dans AGENTS.md", async () => {
  for (const lang of ["fr", "en"]) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, lang, tools: "claude", git: false }));
    const skill = read(dir, ".claude/skills/drwil/SKILL.md");
    assert.match(skill, /argument-hint: "\[verify\|/);
    assert.match(skill, /npx drwil verify --agent/);
    assert.doesNotMatch(
      skill.split("\n").find((l) => l.startsWith("argument-hint")),
      /attest/,
      "aucun argument attest",
    );
    assert.match(skill, /Never run `drwil attest`/);
    assert.match(read(dir, "AGENTS.md"), /drwil verify --agent/);
    assert.match(consignes(dir), /an agent never runs it/);
  }
});

test("frontière d'attestation : --yes, stdin redirigé, script, leurres refusés ; attestation manuelle visible en revue ; vraie attestation reconnue", async () => {
  const dir = await projetAtteste(MANUEL);
  const bin = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
  const yes = cli(dir, "attest", "QUA-001", "--yes");
  assert.notEqual(yes.status, 0, "aucun --yes");
  const pipe = spawnSync(process.execPath, [bin, "attest", "QUA-001"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
    input: "QUA-001\nQUA-001\n",
  });
  assert.equal(pipe.status, 1);
  writeFileSync(
    join(dir, "script.mjs"),
    `import { spawnSync } from "node:child_process";\nconst r = spawnSync(process.execPath, [${JSON.stringify(bin)}, "attest", "QUA-001"], { stdio: "pipe" });\nprocess.exit(r.status);\n`,
  );
  assert.equal(spawnSync(process.execPath, ["script.mjs"], { cwd: dir, env: envTest }).status, 1, "invocation depuis un script refusée");
  assert.deepEqual(attestations(dir), [], "aucune attestation créée par ces tentatives");
  // Leurres : une « attestation » hors du dossier versionné, ou sans statut ATTESTED, n'est jamais lue.
  mkdirSync(join(dir, ".drwil/evidence/attestations"), { recursive: true });
  const k = (await verify({ targetDir: dir })).contracts[0];
  writeFileSync(
    join(dir, ".drwil/evidence/QUA-001.json"),
    JSON.stringify({ contract: "QUA-001", status: "ATTESTED", fingerprint: k.fingerprint }),
  );
  writeFileSync(
    join(dir, ".drwil/evidence/attestations/QUA-001-pass.json"),
    JSON.stringify({ contract: "QUA-001", status: "PASS", fingerprint: k.fingerprint }),
  );
  assert.equal((await verify({ targetDir: dir })).contracts[0].status, "MANUAL");
  // Décision (a) assumée : une attestation écrite à la main avec la bonne empreinte est acceptée ;
  // elle n'échappe pas à la revue car son dossier est versionné (visible dans git status / la PR).
  writeFileSync(
    join(dir, ".drwil/evidence/attestations/QUA-001-main.json"),
    JSON.stringify({
      version: 4,
      contract: "QUA-001",
      status: "ATTESTED",
      attestedAt: "2026-10-06T10:00:00.000Z",
      fingerprint: k.fingerprint,
      proof: k.proof,
    }),
  );
  assert.equal((await verify({ targetDir: dir })).contracts[0].status, "ATTESTED");
  assert.match(
    git(dir, "status", "--porcelain", "--untracked-files=all").stdout,
    /\.drwil\/evidence\/attestations\/QUA-001-main\.json/,
    "visible en revue, jamais ignorée par git",
  );
  assert.doesNotMatch(
    git(dir, "status", "--porcelain", "--untracked-files=all").stdout,
    /\.drwil\/evidence\/QUA-001\.json/,
    "les évidences locales restent hors git",
  );
  // Vraie attestation humaine (confirmation simulée par l'API, la CLI exigeant un terminal) : reconnue.
  const dir2 = await projetAtteste(MANUEL);
  assert.equal((await attest({ targetDir: dir2, id: "QUA-001", confirm: oui })).code, 0);
  const r = cli(dir2, "verify", "--agent");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /0 PASS · 1 ATTESTED/);
  assert.match(r.stdout, /satisfied by a human attestation, not by an automated proof/);
});

test("paquet npm : aucun fichier du gabarit n'est retiré par npm, le .gitignore livré arrive dans le projet", async () => {
  const racine = fileURLToPath(new URL("../templates", import.meta.url));
  const retires = spawnSync("find", [racine, "-name", ".gitignore", "-o", "-name", ".npmignore"], { encoding: "utf8" }).stdout.trim();
  assert.equal(retires, "", "npm retire ces fichiers d'un paquet publié : les livrer sous un autre nom (NOMS_LIVRES)");
  const pack = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["pack", "--dry-run", "--json"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  assert.equal(pack.status, 0, pack.stderr);
  const fichiers = JSON.parse(pack.stdout)[0].files.map((f) => f.path);
  assert.ok(fichiers.includes("templates/common/base/gitignore"), "le .gitignore du gabarit est bien dans le paquet");
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.ok(existsSync(join(dir, ".gitignore")) && !existsSync(join(dir, "gitignore")), "installé sous son vrai nom");
  assert.match(read(dir, ".gitignore"), /!\.drwil\/evidence\/attestations\//);
});

// Un seul numéro de version (docs/projects/journal.md, 2026-10-06).
test("version unique : la release suit package.json et refuse un numéro déjà publié ou en recul ; --version lit package.json", async () => {
  const { decideVersion } = await import(new URL("../templates/common/optional/create-release/create-release.mjs", import.meta.url));
  const v = (version) => [{ dir: "packages/drwil", version }];
  assert.deepEqual(decideVersion({ latest: "v0.2.0", bump: "patch", versions: v("0.3.0"), existingTags: ["v0.2.0"] }), {
    next: "v0.3.0",
    source: "package.json (packages/drwil)",
  });
  assert.match(
    decideVersion({ latest: "v0.2.1", bump: "patch", versions: v("0.2.1"), existingTags: ["v0.2.1"] }).error,
    /v0\.2\.1 existe déjà/,
  );
  assert.match(
    decideVersion({ latest: "v0.2.1", bump: "patch", versions: v("0.2.0"), existingTags: [] }).error,
    /n'est pas supérieure au dernier tag/,
  );
  assert.match(
    decideVersion({
      latest: null,
      bump: "patch",
      versions: [
        { dir: "a", version: "1.0.0" },
        { dir: "b", version: "1.1.0" },
      ],
    }).error,
    /en désaccord/,
  );
  assert.match(decideVersion({ latest: null, bump: "patch", versions: v(undefined) }).error, /non semver/);
  assert.deepEqual(
    decideVersion({ latest: "v1.2.3", bump: "minor", versions: [] }),
    { next: "v1.3.0", source: "commits" },
    "sans paquet npm : calcul d'après les commits, inchangé",
  );
  assert.equal(decideVersion({ latest: "v1.2.3", bump: null, versions: v("9.9.9") }), null, "aucun commit : rien à publier");

  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: true }));
  enAvertissement(dir);
  copierModule(dir, "create-release", ["create-release.mjs", "create-release-texts.mjs", "create-release-version.mjs"]);
  mkdirSync(join(dir, "packages/truc"), { recursive: true });
  writeFileSync(join(dir, "packages/truc/package.json"), JSON.stringify({ name: "truc", version: "1.0.0" }));
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "ajoute un paquet");
  git(dir, "tag", "-a", "v1.0.0", "-m", "v1.0.0");
  writeFileSync(join(dir, "packages/truc/a.txt"), "x");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "change sans changer la version");
  const r = spawnSync(process.execPath, [".githooks/create-release.mjs", "--dry-run"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1, "version non changée : release refusée, même en --dry-run");
  assert.match(r.stderr, /v1\.0\.0 existe déjà/);

  const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"));
  const ver = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "--version"], { encoding: "utf8" });
  assert.equal(ver.stdout.trim(), pkg.version, "drwil --version = package.json");
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

// Caractérisation avant découpage d'index.ts (QUA-001, fichier de code plafonné ; journal du 2026-10-12) :
// comportements actuels sans test, figés tels quels.
test("caractérisation : resolveDrift sur un dossier sans installation refuse, avec la commande à lancer", async () => {
  await assert.rejects(
    resolveDrift({ targetDir: tmp() }, () => true),
    /project not initialised .*run "drwil init" first/,
  );
});

test("caractérisation : dérive du fichier de CI, diff ligne à ligne (ajouts, retraits, fins de fichier)", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, ci: "github", git: false }));
  const ci = ".github/workflows/ia-first.yml";
  const original = read(dir, ci);
  const lignes = original.split("\n");
  // Première ligne remplacée, une ligne insérée au milieu, la fin tronquée puis rallongée.
  const modifie = ["# modifié", ...lignes.slice(1, 3), "# inséré", ...lignes.slice(3, -3), "# fin 1", "# fin 2", "# fin 3", "# fin 4"].join(
    "\n",
  );
  writeFileSync(join(dir, ci), modifie);
  let diff = "";
  const rapport = await quiet(() =>
    resolveDrift({ targetDir: dir }, (rel, d) => {
      if (rel === ci) diff = d;
      return false;
    }),
  );
  assert.ok(rapport.ignored.includes(ci));
  assert.match(diff, /^- /m);
  assert.match(diff, /^- # modifié$/m);
  assert.match(diff, /^- # inséré$/m);
  assert.match(diff, /^- # fin 4$/m);
  assert.match(diff, new RegExp(`^\\+ ${lignes[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
});

test("caractérisation : sans confirmateur ni terminal, la dérive est montrée et jamais écrasée", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const cible = ".githooks/check-docs.mjs";
  writeFileSync(join(dir, cible), "// personnalisé\n");
  let rapport;
  const lignes = await capture(async () => {
    rapport = await resolveDrift({ targetDir: dir });
  });
  assert.ok(rapport.ignored.includes(cible));
  assert.ok(
    lignes.some((l) => l.includes("--- .githooks/check-docs.mjs ---")),
    lignes.join("\n"),
  );
  assert.equal(read(dir, cible), "// personnalisé\n");
});

test("caractérisation : git introuvable, l'installation se fait et le dit, sans dépôt ni hooks", () => {
  const dir = tmp();
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "init"], {
    cwd: dir,
    encoding: "utf8",
    env: { ...envTest, PATH: "" },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /git not found: repository and hooks not configured/);
  assert.ok(existsSync(join(dir, "AGENTS.md")));
  assert.ok(!existsSync(join(dir, ".git")));
});

test("QUA-015 : une fiche écrite d'après le modèle livré a la section de passation que le contrôle attend", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en", git: false }));
  writeFileSync(join(dir, "docs/projects/une-fiche.md"), read(dir, "docs/projects/model-brief.md").replaceAll("YYYY-MM-DD", "2026-10-12"));
  const r = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8", env: envTest });
  assert.doesNotMatch(r.stdout + r.stderr, /Hand-off/);
});

test("langue du projet : anglais par défaut ; --lang fr garde le gabarit anglais et demande à l'agent d'écrire en français", async () => {
  const defaut = tmp();
  await quiet(() => init({ targetDir: defaut, git: false }));
  assert.equal(config(defaut).lang, "en");
  assert.match(read(defaut, "AGENTS.md"), /\*\*Project language: English\*\*/);
  const fr = tmp();
  await quiet(() => init({ targetDir: fr, lang: "fr", git: false }));
  assert.equal(config(fr).lang, "fr");
  assert.match(read(fr, "AGENTS.md"), /\*\*Project language: French\*\*/);
  assert.match(read(fr, "AGENTS.md"), /\*\*Commits\*\*: in French/);
  assert.ok(existsSync(join(fr, "docs/recipes/add-an-api-route.md")) && !existsSync(join(fr, "docs/recettes")));
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

// Un manifeste forgé (empreinte concordante) ne doit jamais faire supprimer un fichier hors du dépôt.
const empreinte = (contenu) => createHash("sha256").update(contenu).digest("hex");
async function projetAvecManifesteForge(chemins) {
  const dossier = tmp();
  const dir = join(dossier, "projet");
  mkdirSync(dir);
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const dehors = join(dossier, "hors-depot.txt");
  writeFileSync(dehors, "à ne jamais supprimer\n");
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  for (const chemin of chemins(dossier)) manifeste[chemin] = empreinte("à ne jamais supprimer\n");
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2) + "\n");
  return { dir, dehors, avant: read(dir, ".drwil/installed-files.json") };
}

test("désinstallation : chemin relatif sortant (../) ou absolu du manifeste refusé, rien n'est supprimé, même avec --yes", async () => {
  for (const chemin of [() => "../hors-depot.txt", (dossier) => join(dossier, "hors-depot.txt"), () => "docs/../../hors-depot.txt"]) {
    const { dir, dehors, avant } = await projetAvecManifesteForge((dossier) => [chemin(dossier)]);
    await assert.rejects(() => uninstall({ targetDir: dir }), /Chemin refusé/);
    await assert.rejects(() => uninstall({ targetDir: dir, dryRun: false }), /Chemin refusé/);
    assert.ok(existsSync(dehors), "fichier hors du dépôt conservé");
    assert.ok(existsSync(join(dir, ".githooks/engine.mjs")), "rien d'installé n'a été retiré : refus avant toute action");
    assert.equal(read(dir, ".drwil/installed-files.json"), avant, "manifeste inchangé");
  }
});

test("désinstallation : lien symbolique (fichier ou dossier parent) sortant du dépôt refusé", {
  skip: process.platform === "win32",
}, async () => {
  const { dir, dehors } = await projetAvecManifesteForge(() => []);
  const dossierHors = join(dir, "..", "dossier-hors");
  mkdirSync(dossierHors);
  writeFileSync(join(dossierHors, "cible.txt"), "à ne jamais supprimer\n");
  symlinkSync(dehors, join(dir, ".githooks/lien-fichier.mjs"));
  symlinkSync(dossierHors, join(dir, ".githooks/lien-dossier"));
  for (const chemin of [".githooks/lien-fichier.mjs", ".githooks/lien-dossier/cible.txt"]) {
    const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
    manifeste[chemin] = empreinte("à ne jamais supprimer\n");
    writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste));
    await assert.rejects(() => uninstall({ targetDir: dir, dryRun: false }), /Chemin refusé/, chemin);
    delete manifeste[chemin];
    writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste));
  }
  assert.ok(existsSync(dehors) && existsSync(join(dossierHors, "cible.txt")));
});

test("init : un manifeste forgé est refusé avant toute écriture, removeObsolete ne supprime rien hors du dépôt", async () => {
  const { dir, dehors } = await projetAvecManifesteForge(() => ["../hors-depot.txt", ".githooks/../../hors-depot.txt"]);
  const marqueur = join(dir, ".githooks/engine.mjs");
  writeFileSync(marqueur, "// modifié par le projet\n");
  await assert.rejects(() => quiet(() => init({ lang: "fr", targetDir: dir, git: false })), /Chemin refusé/);
  assert.ok(existsSync(dehors), "fichier hors du dépôt conservé");
  assert.equal(readFileSync(marqueur, "utf8"), "// modifié par le projet\n", "init a refusé avant d'écrire");
});

test("désinstallation : un manifeste sain (chemins relatifs du dépôt) fonctionne toujours", async () => {
  const { dir } = await projetAvecManifesteForge(() => []);
  const r = await uninstall({ targetDir: dir, dryRun: false });
  assert.ok(r.removed.includes(".githooks/engine.mjs"));
  assert.ok(!existsSync(join(dir, ".githooks/engine.mjs")));
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

test("QUA-061 : AGENTS.md livré distingue une intention d'une demande de réalisation en SCOPING", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const agents = consignes(dir).replace(/\s+/g, " ");
  assert.match(
    agents,
    /\*\*Intention or request\*\*: in SCOPING, a need the human expresses is framed \(an intention or a brief\), never coded/,
  );
  assert.match(agents, /ask "intention or implementation request\?" before acting/);
});

test("QUA-062 : un projet installé refuse au commit un en-tête de skill invalide en YAML strict, et nomme le fichier", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, tools: "claude" }));
  assert.ok(existsSync(join(dir, ".githooks/skill-headers.mjs")), "le module de contrôle est livré");
  const lancer = () => spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(lancer().status, 0, "les skills livrés se lisent en YAML strict");

  const skill = ".claude/skills/start-a-workstream/SKILL.md";
  const bon = read(dir, skill);
  writeFileSync(
    join(dir, skill),
    bon.replace(/^description: .*$/m, "description: Lance un chantier (plusieurs fiches: la file) puis la suite."),
  );
  const r = lancer();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`${skill.replaceAll(".", "\\.")} : .*ligne 3.*description.*entre guillemets`));
});

test("QUA-072 : le skill /drwil-note a la forme des autres skills /drwil-*, et les hooks de Claude Code rejoués donnent leur sortie d'avant", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const enTete = (f) => /^---\nname: (drwil-[\w-]+)\ndescription: (.+)\n(?:[\w-]+: .+\n)*---\n\n/.exec(read(dir, f));
  for (const skill of ["start-a-workstream", "view-progress", "drwil-note"]) {
    const m = enTete(`.claude/skills/${skill}/SKILL.md`);
    assert.ok(m, `${skill} : en-tête name / description comme les autres skills /drwil-*`);
    assert.match(m[2], /\. Use /, `${skill} : la description dit quand l'utiliser`);
  }
  assert.equal(enTete(".claude/skills/drwil-note/SKILL.md")[1], "drwil-note");
  // Le sous-agent des contrôles (QUA-129) s'ajoute à l'arbre sans changer les hooks ni les skills : même en-tête.
  const agent = enTete(".claude/agents/drwil-checks.md");
  assert.equal(agent?.[1], "drwil-checks");
  assert.match(agent[2], /\. Use /);

  const rejouer = (script, entree) => spawnSync(process.execPath, [script], { cwd: dir, encoding: "utf8", input: JSON.stringify(entree) });
  const ecriture = { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(dir, "src/a.ts") } };
  const refus = rejouer(".claude/hooks/scope-reminder.mjs", ecriture);
  assert.equal(refus.status, 0);
  assert.deepEqual(JSON.parse(refus.stdout), {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        "Écriture refusée (QUA-016, scopeReminder : blocking) : aucune fiche de docs/projects/ ne couvre src/a.ts. Rattacher d'abord ce chemin, ou un motif qui le couvre, au bloc « scope » de la fiche du chantier en cours (ou à docs/projects/routine-maintenance.md pour une petite tâche), puis réessayer.",
    },
  });
  const sondage = { questions: [{ question: "Fiches ?", header: "drwil-start", multiSelect: false, options: [] }] };
  const vide = rejouer(".claude/hooks/prompt-hook.mjs", {
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: sondage,
    tool_response: { ...sondage, answers: { "Fiches ?": "docs/projects/absente.md" } },
  });
  assert.equal(vide.status, 0);
  assert.deepEqual(JSON.parse(vide.stdout), {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        "[drwil] ✗ lancement refusé : « docs/projects/absente.md » n'est pas une fiche cadrée (bloc scope commité, fiche non terminée)",
    },
  });
});

test("QUA-129 : sous-agent drwil-checks livré avec Claude Code pour les contrôles longs ; consigne « si l'outil le permet » pour les autres", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const agent = read(dir, ".claude/agents/drwil-checks.md").replace(/\s+/g, " ");
  assert.match(agent, /Run `node \.githooks\/run-checks\.mjs` from the project root/);
  assert.match(agent, /Run `npx drwil verify --agent`/);
  assert.match(agent, /report their verdict/);
  const consigne =
    /Long checks in a subagent, if the tool allows it: with Claude Code, the `drwil-checks` subagent .* runs `run-checks` and `drwil verify --agent` and returns only the verdict and the failures.* Another tool: the same if it allows a subagent without write access, otherwise run them directly\./;
  assert.match(consignes(dir).replace(/\s+/g, " "), consigne);
  const codex = tmp();
  await quiet(() => init({ lang: "en", targetDir: codex, tools: "codex", git: false }));
  assert.equal(existsSync(join(codex, ".claude/agents/drwil-checks.md")), false, "sans Claude Code, pas d'arbre .claude");
  assert.match(consignes(codex).replace(/\s+/g, " "), consigne, "la consigne reste, pour tout outil");
});

test("QUA-130 : le sous-agent recopie mot pour mot verdict et contrats, sans accès à l'attestation ni à l'écriture ; « vérifié » sur cette seule ligne", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const texte = read(dir, ".claude/agents/drwil-checks.md");
  const outils = /^tools: (.+)$/m.exec(texte)?.[1].split(/,\s*/);
  assert.deepEqual(outils, ["Bash", "Read", "Grep", "Glob"], "liste fermée : aucun outil d'écriture");
  for (const ecriture of ["Write", "Edit", "MultiEdit", "NotebookEdit"]) assert.ok(!outils.includes(ecriture), ecriture);
  const corps = texte.replace(/\s+/g, " ");
  assert.match(corps, /no file written or edited, no commit, no push, no fix attempted/);
  assert.match(corps, /You never run `drwil attest` nor `\.githooks\/release-verdict\.mjs`/);
  assert.match(corps, /every line copied word for word from the outputs, never rephrased, summarised, translated or completed/);
  assert.match(corps, /<the line containing "GOVERNANCE:">/);
  assert.match(corps, /failing contracts, contracts not verified, unproven criteria, attestation required, registry errors/);
  assert.match(corps, /reported as « not run » with its error: never as passed/);
  assert.match(corps, /The main session says « verified » only on the `GOVERNANCE: PASS` line you copied/);
  assert.match(consignes(dir).replace(/\s+/g, " "), /the main session says « verified » only on that copied line/);
});

test("QUA-061 : le skill /drwil-note appelle la commande de note et ne code rien — une note est toujours une intention", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const skill = read(dir, ".claude/skills/drwil-note/SKILL.md").replace(/\s+/g, " ");
  assert.match(skill, /node \.githooks\/note\.mjs "\$text"/);
  assert.match(skill, /always an intent, never an order to code\*\*/);
  assert.match(skill, /Do not code it, do not frame it, do not open a brief, do not move the activity/);
  assert.ok(existsSync(join(dir, ".githooks/note.mjs")), "la commande appelée est livrée avec le skill");
});

test("QUA-154 : installation neuve : barrière de périmètre bloquante ; projet déjà installé : son réglage gardé, avertissement s'il n'en a pas", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.equal(config(dir).scopeGate, "blocking");
  const sans = { ...config(dir) };
  delete sans.scopeGate;
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(sans, null, 2));
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.equal(config(dir).scopeGate, "warning", "une mise à jour ne bloque pas des commits du jour au lendemain");
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeGate: "off" }, null, 2));
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.equal(config(dir).scopeGate, "off", "le réglage choisi est gardé");
});

// Projet temporaire avec un contrat à partie humaine qui cite un contrôle, attesté en version 4.
async function projetAttesteSurEffet() {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const base = read(dir, "docs/contracts.md");
  writeFileSync(
    join(dir, "docs/contracts.md"),
    `${base}\n## APP-009 — Revue humaine\n**Règle** : relu.\n**Contrôle** : \`c1\`\n**Manuel** : relecture.\n`,
  );
  const regler = (c1) => writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), checks: [c1] }, null, 2));
  const contrat = async () => (await verify({ targetDir: dir, only: ["APP-009"] })).contracts[0];
  const c1 = { id: "c1", run: "node -e 0 --test-name-pattern=APP-009", paths: ["src/**", "t.test.mjs"] };
  regler(c1);
  const r = await attest({ targetDir: dir, id: "APP-009", confirm: async () => true });
  assert.equal(r.code, 0);
  return { dir, c1, regler, contrat, fichier: r.file };
}

test("QUA-183 : l'attestation porte sur l'effet du contrôle ; un champ d'exécution ajouté ou retiré ne la fait pas tomber, une version 3 reste lue", async () => {
  const { dir, c1, regler, contrat, fichier } = await projetAttesteSurEffet();
  assert.equal(JSON.parse(read(dir, fichier)).version, 4);
  assert.equal((await contrat()).status, "ATTESTED");
  regler({ ...c1, needsBuild: false, parallel: true, paths: [...c1.paths].reverse() });
  assert.equal((await contrat()).status, "ATTESTED", "champs d'exécution et ordre des paths : l'effet est le même");
  regler(c1);

  // Version 3, écrite avant ce chantier : jugée par la définition (commande, dossier), sans les paths.
  const sha = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
  const v4 = JSON.parse(read(dir, fichier));
  rmSync(join(dir, fichier));
  const v3 = { ...v4, version: 3, proof: { c1: sha({ id: "c1", run: c1.run, cwd: null }) } };
  writeFileSync(join(dir, ".drwil/evidence/attestations/APP-009-v3.json"), JSON.stringify(v3));
  assert.equal((await contrat()).status, "ATTESTED", "version 3 : lue par son ancienne empreinte");
  regler({ ...c1, run: `${c1.run} autre` });
  const k = await contrat();
  assert.equal(k.status, "MANUAL");
  assert.ok(
    k.reasons.some((l) => /attestation de version 3/.test(l) && /version 4/.test(l)),
    "dit laquelle est lue par l'ancienne empreinte",
  );
});

test("QUA-184 : l'attestation tombe quand la commande, le test visé ou les paths d'un contrôle changent, et le dit", async () => {
  const { c1, regler, contrat } = await projetAttesteSurEffet();
  for (const [cas, variante, attendu] of [
    ["commande", { run: "node -e 1-1" }, /l'effet du contrôle c1 a changé/],
    ["test visé", { run: c1.run.replace("APP-009", "APP-010") }, /l'effet du contrôle c1 a changé/],
    ["paths", { paths: ["src/**"] }, /l'effet du contrôle c1 a changé/],
  ]) {
    regler({ ...c1, ...variante });
    const k = await contrat();
    assert.equal(k.status, "MANUAL", cas);
    assert.ok(
      k.reasons.some((l) => attendu.test(l)),
      `${cas} : la raison est dite`,
    );
  }
  regler(c1);
  assert.equal((await contrat()).status, "ATTESTED", "effet rétabli : attestation de nouveau valable");
});

test("QUA-185 : `Couvre : aucun` justifié compte comme déclaré, sans fichier couvert ; chaque contrat attesté de ce dépôt déclare ce qu'il couvre", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  writeFileSync(
    join(dir, "docs/contracts.md"),
    `${read(dir, "docs/contracts.md")}\n## APP-009 — Conduite\n**Règle** : relue.\n**Manuel** : relecture.\n**Couvre** : \`aucun\` — contrat de conduite, aucun fichier ne le juge\n`,
  );
  writeFileSync(join(dir, "aucun"), "un fichier nommé comme le mot réservé\n");
  const contrat = async () => (await verify({ targetDir: dir, only: ["APP-009"] })).contracts[0];
  const avant = await contrat();
  assert.deepEqual(avant.coverage, {}, "aucun n'est pas un motif de chemin");
  assert.ok(!avant.reasons.some((l) => l.includes("aucune couverture déclarée")), "déclaré : pas de signalement");
  assert.equal((await attest({ targetDir: dir, id: "APP-009", confirm: async () => true })).code, 0);
  writeFileSync(join(dir, "aucun"), "modifié\n");
  assert.equal((await contrat()).status, "ATTESTED");
  const point = (await doctor({ targetDir: dir })).points.find((p) => p.id === "coverage");
  assert.doesNotMatch(point.detail, /APP-009/);

  const depot = fileURLToPath(new URL("../../../", import.meta.url));
  const reel = (await doctor({ targetDir: depot })).points.find((p) => p.id === "coverage");
  assert.equal(reel.state, "ok", `contrats attestés sans Couvre : ${reel.detail}`);
});

test("QUA-194 : ce dépôt déclare le contrôle de couverture du diff, avec exclusions justifiées, et sa copie est celle du gabarit", () => {
  const depot = fileURLToPath(new URL("../../../", import.meta.url));
  const cfg = JSON.parse(readFileSync(join(depot, ".drwil/ia-first.json"), "utf8"));
  const controle = cfg.checks.find((c) => c.id === "couverture-diff");
  assert.ok(controle, "contrôle couverture-diff déclaré");
  assert.equal(controle.ciJob, "checks");
  assert.match(controle.run, /check-diff-coverage\.mjs/);
  assert.ok(cfg.diffCoverage.lcov && cfg.diffCoverage.produce, "rapport et commande de production déclarés");
  assert.ok(
    cfg.diffCoverage.exclusions.every((e) => String(e.reason).trim()),
    "chaque exclusion est justifiée",
  );
  const copie = "check-diff-coverage.mjs";
  assert.equal(
    readFileSync(join(depot, ".githooks", copie), "utf8"),
    readFileSync(join(depot, "packages/drwil/templates/common/base/.githooks", copie), "utf8"),
    "la copie du dépôt est le gabarit",
  );
});

// QUA-195 à QUA-197 : la définition de l'e2e par forme et les niveaux de garantie de l'attestation.
const CATALOGUE_GABARIT = join(GABARIT, "base/docs/contracts-catalog.md");
const RECETTE_ADOPTION_GABARIT = join(GABARIT, "base/docs/recipes/adopt-the-kit.md");
const PREUVES_GABARIT = join(GABARIT, "base/docs/ia-first/5-proving-the-work.md");

test("QUA-195 : le catalogue définit l'e2e une seule fois, avec une ligne par forme de projet, sans exception", () => {
  const gabarit = readFileSync(CATALOGUE_GABARIT, "utf8");
  assert.match(gabarit, /^## What "end to end" means \(`catalog:QUA-020`\)$/m);
  const section = gabarit.split(/^## What "end to end" means/m)[1];
  assert.match(section, /no stand-in/);
  assert.match(section, /no exception or waiver/);
  for (const forme of ["Library", "Service", "Web application"])
    assert.match(section, new RegExp(`^\\| ${forme} \\|`, "m"), `ligne « ${forme} »`);
  assert.match(section, /installs the package as a client would/);
  const depot = readFileSync(join(DEPOT, "docs/contracts-catalog.md"), "utf8");
  assert.match(depot, /^## Ce que « de bout en bout » veut dire \(`catalogue:QUA-020`\)$/m);
  const sectionDepot = depot.split(/^## Ce que « de bout en bout » veut dire/m)[1];
  for (const forme of ["Bibliothèque", "Service", "Application web"])
    assert.match(sectionDepot, new RegExp(`^\\| ${forme} \\|`, "m"), `ligne « ${forme} » du dépôt`);
  assert.match(sectionDepot, /ni exception ni dérogation/);
});

test("QUA-196 : la recette d'adoption renvoie à la définition de l'e2e sans la recopier, gabarit et copie identiques", () => {
  const recette = readFileSync(RECETTE_ADOPTION_GABARIT, "utf8");
  assert.match(recette, /What "end to end" means/);
  const section = readFileSync(CATALOGUE_GABARIT, "utf8").split(/^## What "end to end" means/m)[1];
  const lignes = section.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Project shape"));
  assert.ok(lignes.length >= 3, "le tableau de formes existe au catalogue");
  for (const ligne of lignes) assert.ok(!recette.includes(ligne), `la recette ne recopie pas : ${ligne.slice(0, 40)}`);
  assert.ok(!recette.includes("installs the package as a client"), "la recette ne recopie pas la définition");
  assert.equal(readFileSync(join(DEPOT, "docs/recipes/adopt-the-kit.md"), "utf8"), recette);
});

test("QUA-197 : la doc des preuves distingue identité, approbation et preuve d'exécution de l'attestation, gabarit et copie identiques", () => {
  const texte = readFileSync(PREUVES_GABARIT, "utf8");
  assert.match(texte, /^## What an attestation guarantees: identity, approval, proof of execution$/m);
  const section = texte.split(/^## What an attestation guarantees/m)[1].split(/^## /m)[0];
  for (const niveau of ["Proof of execution", "Approval", "Identity"])
    assert.match(section, new RegExp(`\\*\\*${niveau}\\*\\* \\(`), `niveau « ${niveau} »`);
  assert.match(section, /\*\*Identity\*\* \(not guaranteed\)/);
  assert.match(section, /git\s+configuration/);
  assert.match(section, /no exception\s+or waiver/);
  assert.equal(readFileSync(join(DEPOT, "docs/ia-first/5-proving-the-work.md"), "utf8"), texte);
});
