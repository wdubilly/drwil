// QUA-110 : `init` rattache le code indexé avant le kit (fiche de référence « code existant » et carte).
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { init, uninstall } from "../dist/index.js";

// Un hook qui lance la suite transmet GIT_DIR, GIT_INDEX_FILE… : hérités, ils feraient agir les
// projets de test sur le dépôt qui lance la suite.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];
const env = { ...process.env, CI: "" };
for (const nom of ["DRWIL_PUSH_TAGS_ONLY", "DRWIL_PUSH_NO_BRANCH", "DRWIL_HOOK"]) delete env[nom];

let dossiers = [];
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-existant-"));
  dossiers.push(dir);
  return dir;
};
afterEach((t) => {
  if (t.passed === false) console.error(`dossiers gardés pour diagnostic (${t.name}) : ${dossiers.join(", ")}`);
  else for (const dir of dossiers) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

const git = (dir, ...args) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, encoding: "utf8", env });
const read = (dir, f) => readFileSync(join(dir, f), "utf8");
const BRIEF = "docs/projects/existing-code.md";
const capture = async (fn) => {
  const log = console.log,
    warn = console.warn,
    lines = [];
  console.log = console.warn = (...a) => lines.push(a.join(" "));
  try {
    await fn();
    return lines.join("\n");
  } finally {
    console.log = log;
    console.warn = warn;
  }
};
const write = (dir, f, content) => {
  mkdirSync(dirname(join(dir, f)), { recursive: true });
  writeFileSync(join(dir, f), content);
};

/** Un projet qui a déjà du code commité, sur une branche de travail (QUA-017), sans le kit. */
function projetExistant(fichiers = ["src/lib/calcul.js", "src/index.js", "app/models/user.py"]) {
  const dir = tmp();
  git(dir, "init", "-q");
  git(dir, "checkout", "-qb", "travail");
  for (const f of fichiers) write(dir, f, "// code\n");
  write(dir, "README.md", "# projet\n");
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-qm", "code existant").status, 0);
  return dir;
}

test("QUA-110 : un vrai projet installé, hooks actifs et réglages bloquants : le commit d'une fiche seule passe", async () => {
  // Un fichier indexé que le kit installe aussi reste à la fiche de mécanique du kit.
  const dir = projetExistant(["src/lib/calcul.js", "src/index.js", "app/models/user.py", ".githooks/pre-commit"]);
  await capture(() => init({ lang: "fr", targetDir: dir }));
  const cfg = JSON.parse(read(dir, ".drwil/ia-first.json"));
  assert.equal(cfg.scopeReminder, "blocking");
  assert.equal(cfg.newRequirements, "blocking");
  assert.equal(git(dir, "config", "core.hooksPath").stdout.trim(), ".githooks", "hooks actifs");

  const fiche = read(dir, BRIEF);
  assert.match(fiche, /^\*\*Statut\*\* : référence — /m, "fiche de référence, jamais proposée au lancement");
  for (const f of ["src/lib/calcul.js", "src/index.js", "app/models/user.py"]) assert.match(fiche, new RegExp(`^  - ${f}$`, "m"), f);
  assert.doesNotMatch(/<!-- scope[\s\S]*?-->/.exec(fiche)[0], /\.githooks\//, "les fichiers du kit restent à la fiche de mécanique");
  const carte = read(dir, "docs/architecture.md");
  for (const d of ["src/lib/", "src/", "app/models/"]) assert.ok(carte.includes(`- \`${d}\` — à décrire à l'adoption`), d);

  const verif = spawnSync(process.execPath, [".githooks/run-checks.mjs"], { cwd: dir, encoding: "utf8", env });
  // Sortie courte (QUA-126) : les avertissements sont dans le rapport complet, écrit à côté.
  verif.stdout += readFileSync(join(dir, ".drwil/evidence/run-checks.log"), "utf8");
  assert.doesNotMatch(verif.stdout, /hors de toute fiche/, verif.stdout);
  assert.doesNotMatch(verif.stdout, /absent de la carte/, verif.stdout);

  git(dir, "add", "-A");
  const kit = git(dir, "commit", "-qm", "installation du kit");
  assert.equal(kit.status, 0, kit.stdout + kit.stderr);
  write(
    dir,
    "docs/projects/premier-chantier.md",
    "# Projet : premier chantier\n\n**Statut** : cadré le 2026-10-23.\n\n## Reprise\n\n- rien\n",
  );
  git(dir, "add", "docs/projects/premier-chantier.md");
  const seule = git(dir, "commit", "-qm", "fiche seule");
  assert.equal(seule.status, 0, seule.stdout + seule.stderr);
});

test("QUA-110 : un projet neuf n'a aucune fiche « code existant »", async () => {
  const neuf = tmp();
  await capture(() => init({ lang: "fr", targetDir: neuf }));
  assert.ok(!existsSync(join(neuf, BRIEF)), "dossier vide");
  assert.doesNotMatch(read(neuf, "docs/architecture.md"), /Code existant/);

  // Du code présent mais jamais indexé suit le rappel de cadrage habituel.
  const nonIndexe = tmp();
  git(nonIndexe, "init", "-q");
  write(nonIndexe, "src/a.js", "// a\n");
  await capture(() => init({ lang: "fr", targetDir: nonIndexe }));
  assert.ok(!existsSync(join(nonIndexe, BRIEF)), "code non indexé");
});

test("QUA-110 : la mise à jour ne crée ni ne réécrit la fiche ou la carte", async () => {
  const dir = projetExistant(["src/a.js"]);
  await capture(() => init({ lang: "fr", targetDir: dir }));
  const fiche = read(dir, BRIEF);
  const carte = read(dir, "docs/architecture.md");
  write(dir, "src/nouveau/b.js", "// b\n");
  git(dir, "add", "-A");
  await capture(() => init({ lang: "fr", targetDir: dir }));
  assert.equal(read(dir, BRIEF), fiche, "fiche jamais réécrite");
  assert.equal(read(dir, "docs/architecture.md"), carte, "carte jamais réécrite");

  // Déjà installé, sans fiche : la mise à jour n'en crée pas.
  rmSync(join(dir, BRIEF));
  await capture(() => init({ lang: "fr", targetDir: dir }));
  assert.ok(!existsSync(join(dir, BRIEF)));
});

test("QUA-110 : une fiche ou une carte présente avant l'installation est gardée telle quelle", async () => {
  const dir = projetExistant(["src/a.js"]);
  write(dir, BRIEF, "# ma fiche\n");
  write(dir, "docs/architecture.md", "# ma carte\n");
  const sortie = await capture(() => init({ lang: "fr", targetDir: dir }));
  assert.equal(read(dir, BRIEF), "# ma fiche\n");
  assert.equal(read(dir, "docs/architecture.md"), "# ma carte\n");
  assert.match(sortie, /existe déjà : gardée telle quelle/);
  assert.match(sortie, /existait avant l'installation[^\n]*\n {2}- src\//, "les dossiers à citer sont dits");
});

test("QUA-110 : uninstall laisse la fiche « code existant » en place", async () => {
  const dir = projetExistant(["src/a.js"]);
  await capture(() => init({ lang: "fr", targetDir: dir }));
  const fiche = read(dir, BRIEF);
  const rapport = await uninstall({ targetDir: dir, dryRun: false });
  assert.ok(!rapport.removed.includes(BRIEF));
  assert.equal(read(dir, BRIEF), fiche);
});

test("QUA-110 : textes en anglais, et un chemin qu'aucun bloc cadrage ne peut nommer est signalé", async () => {
  const dir = projetExistant(["src/lib/with space.js", "app/x y.py"]);
  const sortie = await capture(() => init({ lang: "en", targetDir: dir }));
  const fiche = read(dir, BRIEF);
  assert.match(fiche, /^\*\*Status\*\*: reference — /m);
  assert.match(fiche, /^## Hand-off$/m);
  assert.match(fiche, /^ {2}- src\/lib\/with\?space\.js$/m, "un blanc devient « ? », la grammaire n'en admet aucun");
  assert.ok(read(dir, "docs/architecture.md").includes("- `src/lib/` — to describe at adoption"));
  assert.match(sortie, /Code files not attached[^\n]*\n {2}- app\/x y\.py/, "motif trop large : signalé, jamais écrit");
  assert.doesNotMatch(fiche, /app\/x/);
});
