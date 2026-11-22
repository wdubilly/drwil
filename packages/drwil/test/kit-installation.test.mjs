// Tests du kit, thème installation : init, projet existant, désinstallation, langue et manifeste.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, appendFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { init, uninstall, doctor, previewInit, formatPreview } from "../dist/index.js";
import { tmp, quiet, capture, envTest, checks, git, read, config, enAvertissement, executable, cli, empreinte } from "./kit-commun.mjs";

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
  for (const f of ["CLAUDE.md", "GEMINI.md", ".claude/settings.json", ".claude/agents", ".claude/skills", ".cursor", "docs/contrats.md"])
    assert.ok(!existsSync(join(dir, f)), f);
  assert.ok(existsSync(join(dir, ".claude/hooks/portable-attest.mjs")));
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
  const hooks = JSON.parse(read(dir, ".codex/hooks.json")).hooks;
  assert.deepEqual(
    Object.keys(hooks).sort(),
    ["PostToolUse", "PreToolUse", "SessionStart", "UserPromptSubmit"],
    "état, rappel et canal d'attestation ; aucun blocage d'écriture prétendu",
  );
  assert.match(hooks.SessionStart[0].hooks[0].command, /\.githooks\/state\.mjs"$/);
  assert.match(hooks.UserPromptSubmit[0].hooks[0].command, /\.githooks\/state\.mjs" reminder$/);
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
  assert.deepEqual(
    a.gaps.map((g) => g.kind).sort(),
    ["hooksPath"],
    "hooks laissés à l'humain ; le CI, init le réécrit (jobs du projet replacés)",
  );
  assert.equal(read(dir, "AGENTS.md"), fichiers["AGENTS.md"], "l'aperçu n'écrit rien");

  const lignes = await capture(() => init({ lang: "fr", targetDir: dir }));
  const sortie = lignes.join("\n");
  // settings.json fusionné, .gitleaks.toml complété dans sa table, CI réécrit avec le job du projet dans sa zone (QUA-283) : vérifiés à part.
  for (const [f, contenu] of Object.entries(fichiers))
    if (![".claude/settings.json", ".gitleaks.toml", ".gitlab-ci.yml"].includes(f))
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
  assert.match(
    read(dir, ".gitlab-ci.yml"),
    /# drwil-project-begin jobs\n[\s\S]*\ntest:\n {2}script: npm test\n# drwil-project-end jobs/,
    "job du projet dans sa zone",
  );
  assert.match(read(dir, ".gitlab-ci.yml"), /node \.githooks\/run-checks\.mjs/, "job checks du kit écrit");
  assert.equal(git(dir, "config", "core.hooksPath").stdout.trim(), ".husky/_", "gestionnaire de hooks du projet gardé");
  assert.match(sortie, /\.gitlab-ci\.yml : replacé\(s\) dans la zone du projet : test\./);
  assert.match(sortie, /\.husky\/pre-commit: \.githooks\/pre-commit "\$@" \|\| exit \$\?/);

  const avant = instantane(dir);
  const encore = await capture(() => init({ lang: "fr", targetDir: dir }));
  assert.ok(!encore.some((l) => l.includes("Ajouté aux fichiers du projet")), encore.join("\n"));
  assert.deepEqual(instantane(dir), avant, "un second init ne change rien");
});

test("projet existant : doctor signale ce qui manque avec le correctif ; hooks chaînés acceptés", async () => {
  const { dir } = projetOutille();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  // Un CI ramené à la main sans le job du kit : doctor dit le correctif.
  writeFileSync(join(dir, ".gitlab-ci.yml"), "test:\n  script: npm test\n");
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
  assert.ok(!lignes.some((l) => l.includes("modifiés à la main")), lignes.join("\n"));

  // une mécanique dérive (contenu raccourci, une section en moins) : signalée, jamais réécrite.
  const avant = read(dir, ".githooks/check-docs.mjs");
  writeFileSync(join(dir, ".githooks/check-docs.mjs"), "# Refactorer\n\nTexte raccourci, une seule section.\n");
  lignes = await capture(() => init({ lang: "fr", targetDir: dir, git: false, layers: "backend,frontend" }));
  assert.ok(
    lignes.some((l) => l.includes("modifiés à la main")),
    lignes.join("\n"),
  );
  assert.ok(
    lignes.some((l) => l.includes(".githooks/check-docs.mjs")),
    lignes.join("\n"),
  );
  assert.equal(
    read(dir, ".githooks/check-docs.mjs"),
    "# Refactorer\n\nTexte raccourci, une seule section.\n",
    "jamais réécrit automatiquement",
  );
  assert.notEqual(read(dir, ".githooks/check-docs.mjs"), avant);
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

test("une valeur d'option inconnue est refusée", async () => {
  await assert.rejects(() => init({ targetDir: tmp(), lang: "de" }), /--lang/);
  await assert.rejects(() => init({ lang: "fr", targetDir: tmp(), tools: "claude,vim" }), /--tools/);
  await assert.rejects(() => init({ lang: "fr", targetDir: tmp(), ci: "jenkins" }), /--ci/);
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

// Caractérisation avant découpage d'index.ts (QUA-001, fichier de code plafonné ; journal du 2026-10-12) :
// comportements actuels sans test, figés tels quels.
test("caractérisation : diff ligne à ligne montré à la confirmation (ajouts, retraits, fins de fichier)", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const cible = ".githooks/check-docs.mjs";
  const original = read(dir, cible);
  const lignes = original.split("\n");
  // Première ligne remplacée, une ligne insérée au milieu, la fin tronquée puis rallongée.
  const modifie = ["# modifié", ...lignes.slice(1, 3), "# inséré", ...lignes.slice(3, -3), "# fin 1", "# fin 2", "# fin 3", "# fin 4"].join(
    "\n",
  );
  writeFileSync(join(dir, cible), modifie);
  let diff = "";
  await quiet(() =>
    init({
      lang: "fr",
      targetDir: dir,
      git: false,
      confirmDrift: (rel, d) => {
        if (rel === cible) diff = d;
        return false;
      },
    }),
  );
  assert.match(diff, /^- # modifié$/m);
  assert.match(diff, /^- # inséré$/m);
  assert.match(diff, /^- # fin 4$/m);
  assert.match(diff, new RegExp(`^\\+ ${lignes[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  writeFileSync(join(dir, cible), `${original}// ajout 1\n\n// ajout 2`);
  await quiet(() =>
    init({
      lang: "fr",
      targetDir: dir,
      git: false,
      confirmDrift: (rel, d) => {
        if (rel === cible) diff = d;
        return false;
      },
    }),
  );
  assert.match(diff, /^- \/\/ ajout 2$/m);
  writeFileSync(join(dir, cible), `${lignes.slice(0, -2).join("\n")}\n`);
  await quiet(() =>
    init({
      lang: "fr",
      targetDir: dir,
      git: false,
      confirmDrift: (rel, d) => {
        if (rel === cible) diff = d;
        return false;
      },
    }),
  );
  assert.match(diff, /^\+ /m);
});

test("caractérisation : git introuvable, l'installation se fait et le dit, sans dépôt ni hooks", () => {
  const dir = tmp();
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "init", "--tools", "claude"], {
    cwd: dir,
    encoding: "utf8",
    env: { ...envTest, PATH: "" },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /git not found: repository and hooks not configured/);
  assert.ok(existsSync(join(dir, "AGENTS.md")));
  assert.ok(!existsSync(join(dir, ".git")));
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

// Un manifeste forgé (empreinte concordante) ne doit jamais faire supprimer un fichier hors du dépôt.
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

test("QUA-206 : init sur un dossier neuf commite le kit sur la branche d'installation, avant les hooks", async () => {
  const id = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
  const avant = Object.fromEntries(Object.keys(id).map((k) => [k, process.env[k]]));
  Object.assign(process.env, id);
  try {
    const dir = tmp();
    const lignes = await capture(() => init({ lang: "fr", targetDir: dir, name: "demo" }));
    assert.ok(
      lignes.some((l) => l.includes("Kit commité sur la branche « workstream/kit-installation »")),
      lignes.join("\n"),
    );
    assert.equal(git(dir, "symbolic-ref", "--short", "HEAD").stdout.trim(), "workstream/kit-installation");
    assert.equal(git(dir, "rev-list", "--count", "HEAD").stdout.trim(), "1");
    assert.equal(git(dir, "log", "-1", "--format=%s").stdout.trim(), "Installation du kit drwil");
    assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "", "rien à commiter : le premier chantier se lance");
    assert.ok(git(dir, "ls-files", ".githooks/state.mjs").stdout.includes("state.mjs"));
    // Un dépôt déjà commité n'est jamais touché : seul un dépôt créé par init reçoit le commit initial.
    const relance = await capture(() => init({ lang: "en", targetDir: dir, name: "demo" }));
    assert.ok(!relance.some((l) => l.includes("Kit committed")), relance.join("\n"));
    assert.equal(git(dir, "rev-list", "--count", "HEAD").stdout.trim(), "1");
    // Sans identité git : l'échec est dit, l'installation ne casse pas.
    for (const k of Object.keys(id)) delete process.env[k];
    const home = tmp();
    const sauve = {
      HOME: process.env.HOME,
      XDG: process.env.XDG_CONFIG_HOME,
      GC: process.env.GIT_CONFIG_GLOBAL,
      GS: process.env.GIT_CONFIG_NOSYSTEM,
      CC: process.env.GIT_CONFIG_COUNT,
      CK: process.env.GIT_CONFIG_KEY_0,
      CV: process.env.GIT_CONFIG_VALUE_0,
    };
    // useConfigOnly : git ne déduit pas d'identité du nom d'utilisateur ni de la machine (macOS, Windows), sinon le commit passerait.
    Object.assign(process.env, {
      HOME: home,
      XDG_CONFIG_HOME: home,
      GIT_CONFIG_GLOBAL: join(home, "none"),
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "user.useConfigOnly",
      GIT_CONFIG_VALUE_0: "true",
    });
    try {
      const sans = [];
      const warn = console.warn;
      console.warn = (...a) => sans.push(a.join(" "));
      try {
        await capture(() => init({ lang: "en", targetDir: tmp(), name: "demo" }));
      } finally {
        console.warn = warn;
      }
      assert.ok(
        sans.some((l) => l.includes("initial kit commit not made")),
        sans.join("\n"),
      );
    } finally {
      process.env.HOME = sauve.HOME;
      for (const [k, v] of [
        ["XDG_CONFIG_HOME", sauve.XDG],
        ["GIT_CONFIG_GLOBAL", sauve.GC],
        ["GIT_CONFIG_NOSYSTEM", sauve.GS],
        ["GIT_CONFIG_COUNT", sauve.CC],
        ["GIT_CONFIG_KEY_0", sauve.CK],
        ["GIT_CONFIG_VALUE_0", sauve.CV],
      ]) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  } finally {
    for (const [k, v] of Object.entries(avant)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
