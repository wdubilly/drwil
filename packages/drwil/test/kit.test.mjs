// Tests de bout en bout du kit : installe dans des dossiers temporaires et lance les vrais contrôles.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, statSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init, apply } from "../dist/index.js";

const tmp = () => mkdtempSync(join(tmpdir(), "drwil-"));
const quiet = async (fn) => {
  const log = console.log, warn = console.warn;
  console.log = console.warn = () => {};
  try { return await fn(); } finally { console.log = log; console.warn = warn; }
};
const capture = async (fn) => {
  const log = console.log, lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  try { await fn(); return lines; } finally { console.log = log; }
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

test("init sans stack détectée : signale explicitement les couches par défaut", async () => {
  const dir = tmp();
  const lines = await capture(() => init({ targetDir: dir, name: "demo", git: false }));
  assert.ok(lines.some(l => l.includes("Couches par défaut écrites : backend, frontend")), lines.join("\n"));
  assert.ok(lines.some(l => l.includes("--layers")), lines.join("\n"));
});

test("init avec --layers explicite : pas de message de défaut", async () => {
  const dir = tmp();
  const lines = await capture(() => init({ targetDir: dir, name: "demo", git: false, layers: "admin" }));
  assert.ok(!lines.some(l => l.includes("Couches par défaut")), lines.join("\n"));
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

  // fiche suivant à la lettre le modèle fourni : sections numérotées (« ## 7. Reprise »)
  // et Statut avec date entre parenthèses — doit passer, pas seulement la forme minimale ci-dessus.
  writeFileSync(
    join(dir, "docs/projets/chantier-modele.md"),
    "# Projet : chantier\n\n**Statut** (2026-10-04) : cadré le 2026-10-04 — lot 1 en cours.\n\n## 6. Lots\n\nTexte.\n\n## 7. Reprise\n\n- **Dernier état** (2026-10-04) : rien à signaler.\n",
  );
  r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
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

test("QUA-016 : rappel de cadrage réglé sur bloquant, débloqué par le bloc cadrage", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir }));
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), cadrage: "bloquant" }));
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

test("QUA-016 : réglage par défaut (avertissement), jamais bloquant", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir }));
  assert.equal(config(dir).cadrage, "avertissement", "réglage par défaut écrit à l'installation");
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-qm", "init").status, 0);

  mkdirSync(join(dir, "scripts"));
  writeFileSync(join(dir, "scripts/tache.mjs"), "console.log('tache');\n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-qm", "tache non cadrée");
  assert.equal(r.status, 0, "jamais bloquant par défaut : " + r.stdout + r.stderr);
  const direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.match(direct.stdout, /scripts\/tache\.mjs.*hors de toute fiche/, "affiché quand même, en avertissement");
  assert.equal(direct.status, 0, "le contrôle reste vert malgré l'avertissement");
});

test("QUA-016 : réglage off, contrôle et rappel à l'agent silencieux", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, tools: "claude", git: false }));
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), cadrage: "off" }));

  mkdirSync(join(dir, "scripts"));
  writeFileSync(join(dir, "scripts/tache.mjs"), "console.log('tache');\n");
  const direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.doesNotMatch(direct.stdout, /hors de toute fiche/);
  assert.equal(direct.status, 0);

  const rappel = spawnSync(process.execPath, [".claude/hooks/rappel-cadrage.mjs"], {
    cwd: dir, encoding: "utf8",
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(dir, "scripts/tache.mjs") } }),
  });
  assert.equal(rappel.stdout.trim(), "", "le rappel à l'agent se tait aussi quand cadrage est désactivé");
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

test("QUA-013 : couverture CI (GitHub et GitLab) verte par défaut, pre-push et commit-msg livrés", async () => {
  for (const ci of ["github", "gitlab"]) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, ci, git: false }));
    const r = spawnSync(process.execPath, [".githooks/check-control-coverage.mjs"], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, `${ci} : ${r.stdout}${r.stderr}`);
  }
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, ci: "github" }));
  assert.ok(statSync(join(dir, ".githooks/pre-push")).mode & 0o100, "pre-push exécutable");
  assert.ok(!(statSync(join(dir, ".githooks/commit-msg")).mode & 0o100), "commit-msg livré désactivé");
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /couverture CI de chaque contrôle/);
});

test("QUA-013 : un job CI qui ne se déclenche plus sur les bons chemins est détecté", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, ci: "gitlab", git: false }));
  writeFileSync(join(dir, ".gitlab-ci.yml"), "checks:\n  image: node:20\n  rules:\n    - changes:\n        - frontend/**\n  script:\n    - node .githooks/run-checks.mjs\n");
  const r = spawnSync(process.execPath, [".githooks/check-control-coverage.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /secrets-fichiers/);
});

test("ci: none : pas de CI, la couverture QUA-013 est signalée non exécutée (pas d'échec silencieux)", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, ci: "none" }));
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /non exécuté : couverture CI de chaque contrôle.*aucune CI configurée/s);
});

test("lot 5 : check-file-size et check-code-rules livrés mais opt-in (pas lancés par défaut)", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  for (const f of ["check-file-size.mjs", "check-file-size.legacy.json", "check-code-rules.mjs"]) {
    assert.ok(existsSync(join(dir, ".githooks", f)), f);
  }
  assert.equal(checks(dir).status, 0, "aucun des deux ne tourne tant que le projet ne les déclare pas");
});

test("check-file-size.mjs détecte un fichier trop gros une fois déclaré par le projet", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
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
  await quiet(() => init({ targetDir: dir, git: false }));
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
  await quiet(() => init({ targetDir: dir, git: false }));
  const r = spawnSync(process.execPath, [".githooks/check-code-rules.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("lot 5 : le module qualité front optionnel n'est pas installé par init/apply", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  for (const f of ["check-colors.mjs", "check-contrast.mjs"]) {
    assert.ok(!existsSync(join(dir, ".githooks", f)), f);
  }
});

test("lot 6 : catalogue de contrats et recette d'adoption livrés, skill Claude présent", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  for (const f of ["docs/catalogue-contrats.md", "docs/recettes/adopter-le-kit.md", ".claude/skills/adopter-le-kit/SKILL.md"]) {
    assert.ok(existsSync(join(dir, f)), f);
  }
  assert.match(read(dir, "AGENTS.md"), /adopter-le-kit\.md/);
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("lot 6 : le skill adopter-le-kit n'est pas livré sans Claude Code", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, tools: "codex", git: false }));
  assert.ok(!existsSync(join(dir, ".claude")));
  assert.ok(existsSync(join(dir, "docs/catalogue-contrats.md")));
});

test("lot 7 : installation anglaise complète, contenu des lots 1 à 6 traduit, contrôles verts", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en", git: false }));
  for (const f of [
    "README.md", "INSTALL.md", "docs/security.md", "docs/features.md", "docs/style-guide.md",
    "docs/deployment.md", "docs/projects/routine-maintenance.md", "docs/projects/model-project-sheet.md",
    "docs/recipes/manage-access.md", "docs/recipes/run-locally.md", "docs/recipes/modify-permissions.md",
    "docs/recipes/backup-and-restore.md", "docs/contracts-catalog.md", "docs/recipes/adopt-the-kit.md",
    ".claude/skills/adopt-the-kit/SKILL.md", ".claude/skills/refactor-without-breaking/SKILL.md",
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
  await quiet(() => init({ targetDir: fr, git: false }));
  await quiet(() => init({ targetDir: en, lang: "en", git: false }));
  const compter = (base) => spawnSync("find", [base, "-type", "f"], { encoding: "utf8" }).stdout.trim().split("\n").length;
  assert.equal(compter(en), compter(fr));
});


test("module optionnel tableau de bord : génère un HTML lisant chantiers et contrats tels quels", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, name: "demo", git: false }));
  mkdirSync(join(dir, ".githooks"), { recursive: true });
  const src = join(new URL("../templates/common/optional/tableau-de-bord/tableau-de-bord.mjs", import.meta.url).pathname);
  writeFileSync(join(dir, ".githooks/tableau-de-bord.mjs"), readFileSync(src, "utf8"));
  writeFileSync(join(dir, "docs/projets/un-chantier.md"),
    "# Projet : un chantier\n\n**Statut** : cadré le 2026-10-04 — lot 1 en cours.\n\n" +
    "## 6. Lots\n\n- **Lot 1 — titre** [IA] : contenu. Critère de sortie : tests verts.\n\n" +
    "## Reprise\n\n- **Dernier état** (2026-10-04) : ...\n");
  const r = spawnSync(process.execPath, [".githooks/tableau-de-bord.mjs", "docs/tableau-de-bord.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const html = read(dir, "docs/tableau-de-bord.html");
  assert.match(html, /<html lang="fr">/);
  assert.match(html, /un chantier/);
  assert.match(html, /cadré le 2026-10-04 — lot 1 en cours\./);
  assert.match(html, /Lot 1 — titre/);
  assert.match(html, /SEC-006/);
  assert.match(html, /catalogue:SEC-001/);
});

test("module optionnel tableau de bord : agrège .drwil/usage.jsonl par chantier, sans régression si absent", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, name: "demo", git: false }));
  mkdirSync(join(dir, ".githooks"), { recursive: true });
  const src = join(new URL("../templates/common/optional/tableau-de-bord/tableau-de-bord.mjs", import.meta.url).pathname);
  writeFileSync(join(dir, ".githooks/tableau-de-bord.mjs"), readFileSync(src, "utf8"));

  // Sans fichier usage.jsonl : pas de régression, message d'absence explicite.
  let r = spawnSync(process.execPath, [".githooks/tableau-de-bord.mjs", "docs/tableau-de-bord.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(read(dir, "docs/tableau-de-bord.html"), /usage\.jsonl absent/);

  // Avec usage.jsonl : agrégation tokens/durée/modèles par chantier, lignes malformées ignorées.
  mkdirSync(join(dir, ".drwil"), { recursive: true });
  writeFileSync(join(dir, ".drwil/usage.jsonl"), [
    JSON.stringify({ chantier: "un-chantier", lot: "Lot 1", tokens: 1000, modele: "claude-sonnet-5", duree_min: 30, date: "2026-10-04" }),
    JSON.stringify({ chantier: "un-chantier", lot: "Lot 2", tokens: 2000, modele: "gpt-5.4", duree_min: 45, date: "2026-10-04" }),
    "pas du JSON valide",
  ].join("\n") + "\n");
  r = spawnSync(process.execPath, [".githooks/tableau-de-bord.mjs", "docs/tableau-de-bord.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const html = read(dir, "docs/tableau-de-bord.html");
  assert.match(html, /un-chantier/);
  assert.match(html, />3000</); // tokens cumulés
  assert.match(html, />75</); // minutes cumulées
  assert.match(html, /claude-sonnet-5, gpt-5\.4/);
});

test("module optionnel tableau de bord : affiche les derniers audits, sans régression si absents", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, name: "demo", git: false }));
  mkdirSync(join(dir, ".githooks"), { recursive: true });
  const src = join(new URL("../templates/common/optional/tableau-de-bord/tableau-de-bord.mjs", import.meta.url).pathname);
  writeFileSync(join(dir, ".githooks/tableau-de-bord.mjs"), readFileSync(src, "utf8"));

  // Sans rapport d'audit : pas de régression, message d'absence explicite.
  let r = spawnSync(process.execPath, [".githooks/tableau-de-bord.mjs", "docs/tableau-de-bord.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(read(dir, "docs/tableau-de-bord.html"), /audit-risques\.md absent/);

  // Avec les deux rapports : titre et méta-bloc (citation en tête) repris tels quels.
  writeFileSync(join(dir, "docs/audit-risques.md"),
    "# Audit de risques et dette technique\n\n> Dernier scan : 2026-10-04\n> Niveau de santé global : 🟠 Fragile\n\n## Synthèse\n");
  writeFileSync(join(dir, "docs/decouverte-valeur.md"),
    "# Découverte de valeur et opportunités produit\n\n> Dernier scan : 2026-10-04\n> État du projet : exemple.\n\n## Opportunités\n");
  r = spawnSync(process.execPath, [".githooks/tableau-de-bord.mjs", "docs/tableau-de-bord.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const html = read(dir, "docs/tableau-de-bord.html");
  assert.match(html, /Audit de risques et dette technique/);
  assert.match(html, /Niveau de santé global : 🟠 Fragile/);
  assert.match(html, /Découverte de valeur et opportunités produit/);
  assert.match(html, /État du projet : exemple\./);
});
