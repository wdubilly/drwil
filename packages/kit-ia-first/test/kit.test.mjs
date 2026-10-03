// Tests de bout en bout du kit : installe dans des dossiers temporaires et lance les vrais contrôles.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, statSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init, apply } from "../dist/index.js";

const tmp = () => mkdtempSync(join(tmpdir(), "kit-ia-first-"));
const quiet = async (fn) => {
  const log = console.log, warn = console.warn;
  console.log = console.warn = () => {};
  try { return await fn(); } finally { console.log = log; console.warn = warn; }
};
const checks = (dir) => spawnSync(process.execPath, [".githooks/run-checks.mjs"], { cwd: dir, encoding: "utf8", env: { ...process.env, CI: "" } });
const git = (dir, ...args) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, encoding: "utf8" });
const read = (dir, f) => readFileSync(join(dir, f), "utf8");
const config = (dir) => JSON.parse(read(dir, ".drwil/ia-first.json"));

test("init par défaut : fr, tous les outils, git et hooks, contrôles verts", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, name: "demo", description: "Démo $& littéral" }));
  for (const f of ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".claude/settings.json", ".cursor/rules/ia-first.mdc",
    ".github/copilot-instructions.md", "backend/AGENTS.md", "frontend/CLAUDE.md", "docs/contrats.md", "docs/architecture.md"]) {
    assert.ok(existsSync(join(dir, f)), f);
  }
  assert.ok(!existsSync(join(dir, ".githooks/run-checks.sh")) && !existsSync(join(dir, ".githooks/check-docs.py")), "plus de bash ni de python");
  assert.ok(statSync(join(dir, ".githooks/pre-commit")).mode & 0o100, "pre-commit exécutable");
  assert.equal(git(dir, "config", "core.hooksPath").stdout.trim(), ".githooks");
  assert.match(read(dir, "AGENTS.md"), /demo — Démo \$& littéral/);
  assert.match(read(dir, "docs/architecture.md"), /Non décidée/);
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /non exécuté : contrôles du projet/);
});

test("un second init ne réécrase que .githooks/, --force réécrit tout", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, name: "demo" }));
  writeFileSync(join(dir, "AGENTS.md"), "contenu du projet, ajouté après coup\n");
  appendFileSync(join(dir, ".githooks", "run-checks.mjs"), "\n// marque pour vérifier l'écrasement\n");

  await quiet(() => init({ targetDir: dir, name: "demo" }));
  assert.equal(read(dir, "AGENTS.md"), "contenu du projet, ajouté après coup\n", "docs du projet préservées sans --force");
  assert.ok(!read(dir, ".githooks/run-checks.mjs").includes("marque pour vérifier"), ".githooks/ réécrit par défaut");

  writeFileSync(join(dir, "AGENTS.md"), "contenu du projet, ajouté après coup\n");
  await quiet(() => init({ targetDir: dir, name: "demo", force: true }));
  assert.notEqual(read(dir, "AGENTS.md"), "contenu du projet, ajouté après coup\n", "--force réécrit aussi les docs");
});

test("le hook refuse un commit dont la doc cite un chemin inexistant", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir }));
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

test("les contrôles déclarés par le projet tournent et survivent à une réinstallation", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  const cfg = config(dir);
  cfg.checks = [{ name: "tests unitaires", run: "node -e \"process.exit(3)\"" }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  const r = checks(dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /échec : tests unitaires/);
  await quiet(() => init({ targetDir: dir, git: false }));
  assert.equal(config(dir).checks[0].name, "tests unitaires");
});

test("init en anglais, Codex seul, CI GitHub", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en", tools: "codex", ci: "github", git: false }));
  for (const f of ["CLAUDE.md", "GEMINI.md", ".claude", ".cursor", "docs/contrats.md"]) assert.ok(!existsSync(join(dir, f)), f);
  for (const f of ["AGENTS.md", "docs/contracts.md", "docs/recipes/add-an-api-route.md", ".github/workflows/ia-first.yml",
    "docs/projects/kit-mechanics.md"]) {
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
  assert.equal(git(dir, "add", "-A").status, 0);
  assert.equal(git(dir, "commit", "-qm", "init").status, 0, "premier commit accepté");
});

test("init avec CI GitLab", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, ci: "gitlab", git: false }));
  assert.match(read(dir, ".gitlab-ci.yml"), /node \.githooks\/run-checks\.mjs/);
  assert.deepEqual(config(dir).ciFiles, [".gitlab-ci.yml"]);
});

test("QUA-015 : marqueur de chantier, statut daté, section Reprise, chemin « à créer »", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));

  // chemin « à créer » : accepté, pas une erreur.
  appendFileSync(join(dir, "docs/ia-first.md"), "\nÀ écrire : `docs/futur.md` (à créer).\n");
  let r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);

  // case ouverte sans marqueur [IA]/[humain]/[décision].
  appendFileSync(join(dir, "docs/projets/en-attente.md"), "\n## Test\n- [ ] sujet sans marqueur\n");
  r = checks(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /en-attente\.md.*marqueur/);
  // corrigé avant la suite, pour isoler chaque contrôle.
  writeFileSync(
    join(dir, "docs/projets/en-attente.md"),
    read(dir, "docs/projets/en-attente.md").replace("- [ ] sujet sans marqueur", "- [ ] [IA] sujet avec marqueur"),
  );

  // fiche de projet sans Statut daté ni section Reprise.
  writeFileSync(join(dir, "docs/projets/mon-chantier.md"), "# Mon chantier\n\nTexte.\n");
  r = checks(dir);
  assert.match(r.stdout, /mon-chantier\.md.*Statut/);
  assert.match(r.stdout, /mon-chantier\.md.*Reprise/);
  writeFileSync(join(dir, "docs/projets/mon-chantier.md"), "# Mon chantier\n\n**Statut** : 2026-10-04, fait.\n\n## Reprise\n\nRien à reprendre.\n");
  r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);

  // modèle et fiche permanente exemptés du contrôle.
  writeFileSync(join(dir, "docs/projets/modele-exemple.md"), "# Modèle\n\nSans statut ni Reprise.\n");
  r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("une alternative écrite avec une barre oblique n'est pas prise pour un chemin", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  appendFileSync(join(dir, "docs/ia-first.md"), "\nChoisir entre `minimal/complet` ou `init/apply` selon le cas.\n");
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("doublon d'ID dans le registre des contrats", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  appendFileSync(join(dir, "docs/contrats.md"), "\n| QUA-011 | doublon | — | — |\n");
  const r = checks(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /QUA-011.*plusieurs fois/);
});

test("QUA-016 : rappel de cadrage, bloquant au commit, débloqué par le bloc cadrage", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir }));
  assert.equal(git(dir, "add", "-A").status, 0);
  assert.equal(git(dir, "commit", "-qm", "init").status, 0, "premier commit accepté (mecanique-ia-first.md couvre .githooks/)");

  // un nouveau fichier de code hors de toute fiche bloque le commit.
  mkdirSync(join(dir, "scripts"));
  writeFileSync(join(dir, "scripts/tache.mjs"), "console.log('tache');\n");
  git(dir, "add", "-A");
  let r = git(dir, "commit", "-qm", "tache");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /scripts\/tache\.mjs.*hors de toute fiche/);

  // rattaché à la fiche « entretien courant », le commit passe.
  writeFileSync(
    join(dir, "docs/projets/entretien-courant.md"),
    read(dir, "docs/projets/entretien-courant.md").replace("fichiers:\n-->", "fichiers:\n  - scripts/tache.mjs\n-->"),
  );
  git(dir, "add", "-A");
  r = git(dir, "commit", "-qm", "tache rattachée");
  assert.equal(r.status, 0, r.stdout + r.stderr);

  // un motif de cadrage trop large reste refusé.
  writeFileSync(
    join(dir, "docs/projets/entretien-courant.md"),
    read(dir, "docs/projets/entretien-courant.md").replace("  - scripts/tache.mjs", "  - scripts/*"),
  );
  git(dir, "add", "-A");
  r = git(dir, "commit", "-qm", "motif trop large");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /motif de cadrage trop large/);
});

test("hooks Claude Code : garde-fou-bash demande l'accord, rappel-cadrage glisse un message à l'agent", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, tools: "claude", git: false }));

  const gardeFou = spawnSync(process.execPath, [".claude/hooks/garde-fou-bash.mjs"], {
    cwd: dir, encoding: "utf8", input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "cat .env" } }),
  });
  assert.match(gardeFou.stdout, /"permissionDecision":"ask"/);
  assert.match(gardeFou.stdout, /fichier \.env/);

  const inoffensif = spawnSync(process.execPath, [".claude/hooks/garde-fou-bash.mjs"], {
    cwd: dir, encoding: "utf8", input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "cat .env.example" } }),
  });
  assert.equal(inoffensif.stdout.trim(), "");

  const rappel = spawnSync(process.execPath, [".claude/hooks/rappel-cadrage.mjs"], {
    cwd: dir, encoding: "utf8",
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(dir, "scripts/nouveau.mjs") } }),
  });
  assert.match(rappel.stdout, /Rappel de cadrage/);
  assert.match(rappel.stdout, /scripts\/nouveau\.mjs/);

  const docIgnoree = spawnSync(process.execPath, [".claude/hooks/rappel-cadrage.mjs"], {
    cwd: dir, encoding: "utf8",
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(dir, "docs/notes.md") } }),
  });
  assert.equal(docIgnoree.stdout.trim(), "");
});

test("apply sur un projet existant : stack et couches découvertes, rien d'écrasé, pas de git init", async () => {
  const dir = tmp();
  mkdirSync(join(dir, "api")); mkdirSync(join(dir, "web"));
  writeFileSync(join(dir, "api/pyproject.toml"), "[project]\ndependencies = [\"fastapi\"]\n");
  writeFileSync(join(dir, "web/package.json"), JSON.stringify({ dependencies: { react: "18" }, devDependencies: { vite: "5" } }));
  writeFileSync(join(dir, "README.md"), "# existant\n");
  await quiet(() => apply({ targetDir: dir }));
  assert.equal(read(dir, "README.md"), "# existant\n");
  assert.ok(!existsSync(join(dir, ".git")));
  assert.ok(!existsSync(join(dir, "backend")), "pas de couche inventée");
  const cfg = config(dir);
  assert.deepEqual(cfg.layers, ["api", "web"]);
  assert.deepEqual(cfg.stack, [{ path: "api", technos: ["Python (FastAPI)"] }, { path: "web", technos: ["Node.js (React, Vite)"] }]);
  assert.match(read(dir, "docs/architecture.md"), /`web\/` : Node\.js \(React, Vite\)/);
  assert.match(read(dir, "api/AGENTS.md"), /couche api/);
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout);
});

test("un contrat préfixé par un autre dépôt n'est pas cherché dans le registre local", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  appendFileSync(join(dir, "docs/ia-first.md"), "\nVoir run-box-v2:SEC-777, mais SEC-888 doit exister.\n");
  const r = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stdout, /SEC-777/);
  assert.match(r.stdout, /SEC-888/);
});

test("une couche imbriquée renvoie au bon AGENTS.md racine", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, layers: "packages/api", git: false }));
  assert.match(read(dir, "packages/api/AGENTS.md"), /`\.\.\/\.\.\/AGENTS\.md`/);
  assert.equal(checks(dir).status, 0);
});

test("une valeur d'option inconnue est refusée", async () => {
  await assert.rejects(() => init({ targetDir: tmp(), lang: "de" }), /--lang/);
  await assert.rejects(() => init({ targetDir: tmp(), tools: "claude,vim" }), /--tools/);
  await assert.rejects(() => init({ targetDir: tmp(), ci: "jenkins" }), /--ci/);
});
