// Tests de bout en bout du kit : installe dans des dossiers temporaires et lance les vrais contrôles.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, statSync, appendFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { init, apply, uninstall, resoudreDerive, verify, formaterVerdict, verdictJson, doctor, auditerApply, formaterAudit, attester } from "../dist/index.js";

// Un hook lancé par `git commit -a` ou depuis un worktree reçoit GIT_INDEX_FILE, GIT_DIR… :
// hérités, ils font agir les projets de test (et leurs hooks) sur le dépôt qui lance la suite.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

// Chaque dossier temporaire est supprimé après son test : sans ça, la suite (lancée à chaque
// commit par le hook) en laissait ~70 par passage et finissait par épuiser les inodes de /tmp.
// Ceux d'un test en échec sont gardés (et affichés) pour le diagnostic.
let dossiersDuTest = [];
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-"));
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
  const log = console.log, warn = console.warn;
  console.log = console.warn = () => {};
  try { return await fn(); } finally { console.log = log; console.warn = warn; }
};
const capture = async (fn) => {
  const log = console.log, lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  try { await fn(); return lines; } finally { console.log = log; }
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
delete envTest.DRWIL_HOOK;
// Le test « variables GIT_* du lanceur » relance les tests des contrôles dans un enfant (~1 s) :
// déjà exécuté sur ces mêmes fichiers dans le dépôt, il est sauté dans chaque projet généré ici.
envTest.DRWIL_TESTS_ENFANT = "1";
const checks = (dir) => spawnSync(process.execPath, [".githooks/run-checks.mjs"], { cwd: dir, encoding: "utf8", env: envTest });
const git = (dir, ...args) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, encoding: "utf8", env: envTest });
const read = (dir, f) => readFileSync(join(dir, f), "utf8");
const config = (dir) => JSON.parse(read(dir, ".drwil/ia-first.json"));
// NTFS n'a pas de bit d'exécution : sous Windows chmod est un no-op, donc ce contrôle
// (déjà fait sur Linux/macOS par le test "lot 4 : commit-msg livré désactivé") n'a pas de sens.
const executable = (dir, f) => process.platform === "win32" || Boolean(statSync(join(dir, f)).mode & 0o100);

test("init par défaut : fr, tous les outils, git et hooks, contrôles verts", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, name: "demo", description: "Démo $& littéral" }));
  for (const f of ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".claude/settings.json", ".cursor/rules/ia-first.mdc",
    ".github/copilot-instructions.md", ".github/instructions/ajouter-une-route-api.instructions.md",
    ".github/instructions/ajouter-un-ecran-front.instructions.md",
    "backend/AGENTS.md", "frontend/CLAUDE.md", "docs/contrats.md", "docs/architecture.md"]) {
    assert.ok(existsSync(join(dir, f)), f);
  }
  assert.ok(!existsSync(join(dir, ".githooks/run-checks.sh")) && !existsSync(join(dir, ".githooks/check-docs.py")), "plus de bash ni de python");
  assert.ok(executable(dir, ".githooks/pre-commit"), "pre-commit exécutable");
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

test("chemin cité : un fichier ignoré par Git ne vaut pas preuve (local = CI) ; « (si présent) » aussi sur la ligne suivante", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir }));
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
  writeFileSync(join(dir, "docs/ia-first.md"), read(dir, "docs/ia-first.md").replace("`.drwil/ia-first.json`.", "`.drwil/state.json`\n(si présent)."));
  r = docsCheck();
  assert.equal(r.status, 0, r.stdout + r.stderr);
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

test("QUA-015 (extension) : fiche terminée encore présente refusée ; case cochée vs fiche ouverte signalée", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));

  // « fait » dans le statut ne vaut pas terminée : seul le marqueur explicite compte.
  writeFileSync(join(dir, "docs/projets/mon-chantier.md"),
    "# Mon chantier\n\n**Statut** (2026-10-04) : cadré — essai réel fait, lot 2 ouvert.\n\n## Reprise\n\nRien à reprendre.\n");
  appendFileSync(join(dir, "docs/projets/en-attente.md"),
    "\n## Test\n- [ ] [IA] sujet en cours `docs/projets/mon-chantier.md`.\n");
  let direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  assert.doesNotMatch(direct.stdout, /mon-chantier\.md/);

  // fiche marquée terminée mais encore là : erreur bloquante (la condenser dans le journal, la supprimer).
  writeFileSync(join(dir, "docs/projets/mon-chantier.md"),
    "# Mon chantier\n\n**Statut** : terminé le 2026-10-10.\n\n## Reprise\n\nRien à reprendre.\n");
  direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 1, direct.stdout + direct.stderr);
  assert.match(direct.stdout + direct.stderr, /mon-chantier\.md.*terminée.*journal/);
  rmSync(join(dir, "docs/projets/mon-chantier.md"));
  writeFileSync(join(dir, "docs/projets/en-attente.md"),
    read(dir, "docs/projets/en-attente.md").replace("- [ ] [IA] sujet en cours `docs/projets/mon-chantier.md`.\n", ""));
  direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);

  // cas inverse : case cochée mais fiche pas terminée.
  writeFileSync(join(dir, "docs/projets/autre-chantier.md"),
    "# Autre chantier\n\n**Statut** (2026-10-04) : cadré, lot 1 en cours.\n\n## Reprise\n\nRien.\n");
  appendFileSync(join(dir, "docs/projets/en-attente.md"),
    "- [x] [IA] sujet pas fini `docs/projets/autre-chantier.md`.\n");
  direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 0);
  assert.match(direct.stdout, /autre-chantier\.md.*QUA-015|QUA-015.*autre-chantier\.md/);
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
  let rInit = git(dir, "commit", "-qm", "init");
  assert.equal(rInit.status, 0, `premier commit accepté (mecanique-ia-first.md couvre .githooks/) :\n${rInit.stdout}${rInit.stderr}`);
  // QUA-017 ne tolère que le tout premier commit sur master : les commits suivants de
  // ce test (sans rapport avec le workflow branche/MR testé ailleurs) se font sur une branche.
  assert.equal(git(dir, "checkout", "-qb", "chantier/essai-cadrage").status, 0);

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

test("QUA-016 : réglage par défaut (bloquant) : premier commit accepté, code orphelin refusé ; avertissement toujours possible", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir }));
  assert.equal(config(dir).cadrage, "bloquant", "réglage par défaut écrit à l'installation (docs/projets/garde-fous-depot.md)");
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-qm", "init").status, 0, "les fichiers du kit sont couverts : le premier commit passe");
  // QUA-017 : commit suivant hors du périmètre testé ici, donc sur une branche.
  assert.equal(git(dir, "checkout", "-qb", "chantier/essai-cadrage").status, 0);

  mkdirSync(join(dir, "scripts"));
  writeFileSync(join(dir, "scripts/tache.mjs"), "console.log('tache');\n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-qm", "tache non cadrée");
  assert.notEqual(r.status, 0, "bloquant par défaut : code hors fiche refusé");
  assert.match(r.stdout + r.stderr, /scripts\/tache\.mjs.*hors de toute fiche/);

  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), cadrage: "avertissement" }));
  const direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.match(direct.stdout, /scripts\/tache\.mjs.*hors de toute fiche/, "en avertissement : affiché quand même");
  assert.equal(direct.status, 0, "en avertissement : le contrôle reste vert");
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

test("hooks Claude Code : garde-fou-bash demande l'accord, rappel-cadrage refuse avant écriture (bloquant) ou rappelle (avertissement)", async () => {
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

  const hook = (evenement, chemin) => spawnSync(process.execPath, [".claude/hooks/rappel-cadrage.mjs"], {
    cwd: dir, encoding: "utf8",
    input: JSON.stringify({ hook_event_name: evenement, tool_name: "Write", tool_input: { file_path: join(dir, chemin) } }),
  });
  // Défaut « bloquant » : refus AVANT l'écriture d'un fichier de code hors fiche (docs/projets/garde-fous-depot.md).
  const refus = hook("PreToolUse", "scripts/nouveau.mjs");
  assert.match(refus.stdout, /"permissionDecision":"deny"/);
  assert.match(refus.stdout, /Écriture refusée \(QUA-016, cadrage bloquant\).*scripts\/nouveau\.mjs/);
  assert.equal(hook("PreToolUse", "docs/notes.md").stdout.trim(), "", "la doc n'est jamais du code : jamais refusée");
  assert.equal(hook("PostToolUse", "scripts/nouveau.mjs").stdout.trim(), "", "en bloquant, pas de rappel en double après coup");
  // En « avertissement » : jamais de refus, un rappel après l'écriture.
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), cadrage: "avertissement" }));
  assert.equal(hook("PreToolUse", "scripts/nouveau.mjs").stdout.trim(), "");
  const rappel = hook("PostToolUse", "scripts/nouveau.mjs");
  assert.match(rappel.stdout, /Rappel de cadrage/);
  assert.match(rappel.stdout, /scripts\/nouveau\.mjs/);
  // Le gabarit branche le hook avant l'écriture.
  const reglages = read(dir, ".claude/settings.json");
  assert.match(reglages, /"PreToolUse"[\s\S]*"Edit\|Write\|MultiEdit"[\s\S]*rappel-cadrage\.mjs[\s\S]*"PostToolUse"/);
});

test("état de gouvernance : lecteur livré, state.json ignoré par Git, contexte réinjecté au démarrage de Claude", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, tools: "claude", git: false }));

  assert.match(read(dir, ".gitignore"), /^\.drwil\/state\.json$/m);
  assert.match(read(dir, ".claude/settings.json"), /"SessionStart"[\s\S]*\.githooks\/etat\.mjs/);
  // Sans state.json : CADRAGE neutre, jamais d'état actif déduit.
  const neutre = spawnSync(process.execPath, [".githooks/etat.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(neutre.status, 0);
  assert.match(neutre.stdout, /Activité : CADRAGE/);
  // Un état invalide est signalé, sans faire échouer le démarrage de session.
  writeFileSync(join(dir, ".drwil/state.json"), "{ cassé");
  const invalide = spawnSync(process.execPath, [".githooks/etat.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(invalide.status, 0);
  assert.match(invalide.stdout, /État invalide/);
});

test("rappel court : hook de saisie Claude livré, empreinte ignorée par Git, rien quand l'état n'a pas changé", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, tools: "claude", git: false }));

  assert.match(read(dir, ".gitignore"), /^\.drwil\/rappel\.json$/m);
  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  assert.match(JSON.stringify(reglages.hooks.UserPromptSubmit), /\.githooks\/etat\.mjs\\" rappel/);
  const rappel = () => spawnSync(process.execPath, [".githooks/etat.mjs", "rappel"], { cwd: dir, encoding: "utf8" });
  const premier = rappel();
  assert.equal(premier.status, 0);
  assert.match(premier.stdout, /\[drwil\] Rappel : CADRAGE/);
  assert.equal(rappel().stdout, "", "état inchangé : rien n'est injecté");
});

test("lancer par sondage : la réponse humaine lance (formats Claude Code et Copilot CLI), un sondage pré-rempli est refusé", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projets/essai.md";
  writeFileSync(join(dir, fiche), "# Projet : Essai\n\n**Statut** : cadré le 2026-10-10.\n\n<!-- cadrage\nfichiers:\n  - src/essai.ts\n-->\n");
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");

  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  for (const evenement of ["PreToolUse", "PostToolUse"]) {
    assert.ok(reglages.hooks[evenement].some((h) => h.matcher === "AskUserQuestion" && /saisie-drwil\.mjs/.test(JSON.stringify(h.hooks))), evenement);
  }
  assert.ok(reglages.permissions.deny.includes("Bash(*saisie-drwil*)"), "l'agent ne peut pas appeler le hook lui-même par le shell");
  assert.ok(existsSync(join(dir, ".claude/skills/lancer-un-chantier/SKILL.md")));

  const hook = (entree) => spawnSync(process.execPath, [".claude/hooks/saisie-drwil.mjs"], { cwd: dir, encoding: "utf8", input: JSON.stringify(entree) });
  const etat = () => (existsSync(join(dir, ".drwil/state.json")) ? JSON.parse(read(dir, ".drwil/state.json")) : null);
  const claude = { questions: [{ question: "Quelle fiche lancer ?", header: "drwil-lancer", options: [{ label: fiche, description: "Essai" }, { label: "docs/projets/autre.md", description: "Autre" }], multiSelect: false }] };
  const copilot = { message: "drwil-lancer : quelle fiche lancer ?", requestedSchema: { properties: { choix: { type: "string", enum: [fiche, "docs/projets/autre.md"] } } } };

  // Le modèle ne répond pas à la place de l'humain et ne présélectionne rien : refusé avant l'affichage.
  assert.equal(hook({ hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input: { ...claude, answers: { "Quelle fiche lancer ?": fiche } } }).status, 2);
  const avecDefaut = structuredClone(copilot);
  avecDefaut.requestedSchema.properties.choix.default = fiche;
  assert.equal(hook({ hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input: avecDefaut }).status, 2);
  assert.equal(hook({ hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input: claude }).status, 0, "un vrai sondage passe");
  assert.equal(etat(), null, "rien n'est lancé avant la réponse");

  // Un sondage qui n'est pas celui de drwil ne lance rien, même avec une fiche en réponse.
  const autre = { questions: [{ ...claude.questions[0], header: "Autre" }] };
  hook({ hook_event_name: "PostToolUse", tool_name: "AskUserQuestion", tool_input: autre, tool_response: { ...autre, answers: { "Quelle fiche lancer ?": fiche } } });
  assert.equal(etat(), null);

  // Claude Code : la réponse humaine arrive dans tool_response.answers.
  const r = hook({ hook_event_name: "PostToolUse", tool_name: "AskUserQuestion", tool_input: claude, tool_response: { ...claude, answers: { "Quelle fiche lancer ?": fiche } } });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /REALISATION \(lancé : docs\/projets\/essai\.md\)/);
  assert.equal(etat().activite, "REALISATION");
  assert.equal(etat().attente_active, fiche);
  assert.equal(etat().fusion_autorisee, undefined, "sans seconde question, la fusion reste manuelle");

  // Seconde question (en-tête drwil-fusion) : seule la réponse humaine autorise la fusion automatique.
  rmSync(join(dir, ".drwil/state.json"));
  const fusion = { question: "Fusion à la fin du chantier ?", header: "drwil-fusion", options: [{ label: "Fusion automatique", description: "…" }, { label: "Fusion manuelle", description: "…" }], multiSelect: false };
  const claudeFusion = { questions: [...claude.questions, fusion] };
  assert.equal(hook({ hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input: { ...claudeFusion, answers: { "Fusion à la fin du chantier ?": "Fusion automatique" } } }).status, 2);
  hook({ hook_event_name: "PostToolUse", tool_name: "AskUserQuestion", tool_input: claudeFusion, tool_response: { ...claudeFusion, answers: { "Quelle fiche lancer ?": fiche, "Fusion à la fin du chantier ?": "Fusion manuelle" } } });
  assert.equal(etat().fusion_autorisee, undefined);
  rmSync(join(dir, ".drwil/state.json"));
  const rf = hook({ hook_event_name: "PostToolUse", tool_name: "AskUserQuestion", tool_input: claudeFusion, tool_response: { ...claudeFusion, answers: { "Quelle fiche lancer ?": fiche, "Fusion à la fin du chantier ?": "Fusion automatique" } } });
  assert.match(rf.stdout, /fusion automatique autorisée/i);
  assert.equal(etat().fusion_autorisee, true);

  // Copilot CLI : même hook, réponse en texte libre ; une fiche non cadrée est refusée.
  rmSync(join(dir, ".drwil/state.json"));
  const refus = hook({ hook_event_name: "PostToolUse", tool_name: "AskUserQuestion", tool_input: copilot, tool_result: { result_type: "success", text_result_for_llm: "User responded: docs/projets/autre.md" } });
  assert.match(refus.stdout, /n'est pas une fiche cadrée/);
  assert.equal(etat(), null);
  hook({ hook_event_name: "PostToolUse", tool_name: "AskUserQuestion", tool_input: copilot, tool_result: { result_type: "success", text_result_for_llm: `User responded: ${fiche}` } });
  assert.equal(etat().activite, "REALISATION");
});

test("transitions : humain par défaut, façade drwil etat, blocages Claude sur l'état et le saut des hooks", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projets/mecanique-ia-first.md";
  const drwilEtat = (...args) => spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "etat", ...args], { cwd: dir, encoding: "utf8", env: envTest });

  assert.equal(config(dir).transitions, "humain");
  // Sans terminal interactif, ouvrir une attente est refusé en mode humain.
  const refus = drwilEtat("passer", "ATTENTE", "--fiche", fiche);
  assert.equal(refus.status, 1);
  assert.match(refus.stderr, /terminal interactif/);
  assert.ok(!existsSync(join(dir, ".drwil/state.json")), "état inchangé");
  // En mode agent, la façade transmet --fiche au module du projet.
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), transitions: "agent" }));
  const ok = drwilEtat("passer", "ATTENTE", "--fiche", fiche);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(drwilEtat().stdout, /Activité : ATTENTE/);

  // Barrière de périmètre : livrée en avertissement, hook du trailer exécutable, couverte par la fiche mécanique.
  assert.equal(config(dir).barriere, "avertissement");
  if (process.platform !== "win32") assert.ok(statSync(join(dir, ".githooks/prepare-commit-msg")).mode & 0o111, "prepare-commit-msg exécutable");
  assert.match(read(dir, "docs/projets/mecanique-ia-first.md"), /\.githooks\/perimetre\.mjs/);

  const deny = JSON.parse(read(dir, ".claude/settings.json")).permissions.deny;
  for (const regle of ["Edit(**/.drwil/state.json)", "Write(**/.drwil/state.json)", "Bash(git commit -n*)"]) assert.ok(deny.includes(regle), regle);
  assert.ok(deny.some((r) => r.includes("no-verify")));
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

test("apply() signale (sans réécrire) un fichier déjà présent qui a dérivé du template", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false, layers: "backend,frontend" }));

  // fichier identique au template (mêmes couches entre init et apply) : pas signalé.
  let lignes = await capture(() => apply({ targetDir: dir, git: false, layers: "backend,frontend" }));
  assert.ok(!lignes.some((l) => l.includes("dérivés")), lignes.join("\n"));

  // une recette dérive (contenu raccourci, une section en moins) : signalée, jamais réécrite.
  const avant = read(dir, "docs/recettes/refactorer-sans-casser.md");
  writeFileSync(join(dir, "docs/recettes/refactorer-sans-casser.md"), "# Refactorer\n\nTexte raccourci, une seule section.\n");
  lignes = await capture(() => apply({ targetDir: dir, git: false, layers: "backend,frontend" }));
  assert.ok(lignes.some((l) => l.includes("dérivés")), lignes.join("\n"));
  assert.ok(lignes.some((l) => l.includes("docs/recettes/refactorer-sans-casser.md")), lignes.join("\n"));
  assert.equal(read(dir, "docs/recettes/refactorer-sans-casser.md"), "# Refactorer\n\nTexte raccourci, une seule section.\n", "jamais réécrit automatiquement");
  assert.notEqual(read(dir, "docs/recettes/refactorer-sans-casser.md"), avant);
});

test("init écrit un manifeste des fichiers installés (chemin + sha256), fusionné sans perte entre deux apply()", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  const manifeste = JSON.parse(read(dir, ".drwil/fichiers-installes.json"));
  assert.ok(Object.keys(manifeste).length > 10, "plusieurs fichiers enregistrés");
  assert.ok("AGENTS.md" in manifeste, "AGENTS.md présent");
  assert.equal(manifeste["AGENTS.md"], createHash("sha256").update(read(dir, "AGENTS.md")).digest("hex"));

  // apply() une 2ᵉ fois sans rien changer : le manifeste existant est conservé à l'identique (fusion, pas d'écrasement).
  const avant = read(dir, ".drwil/fichiers-installes.json");
  await quiet(() => apply({ targetDir: dir, git: false, layers: "backend,frontend" }));
  assert.equal(read(dir, ".drwil/fichiers-installes.json"), avant);
});

test("lot 2 (désinstallation) : dry-run par défaut, --yes supprime, fichier modifié conservé, docs/projets jamais touché", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
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

  // docs/projets/, docs/intentions/, docs/recettes/ jamais touchés, même présents au manifeste.
  const manifeste = JSON.parse(read(dir, ".drwil/fichiers-installes.json"));
  assert.ok(Object.keys(manifeste).some((p) => p.startsWith("docs/projets/")));
  assert.ok(existsSync(join(dir, "docs/projets/en-attente.md")), "docs/projets/ jamais supprimé par uninstall");

  // le manifeste ne garde plus les entrées des fichiers réellement supprimés.
  const manifesteApres = JSON.parse(read(dir, ".drwil/fichiers-installes.json"));
  assert.ok(!(".githooks/check-docs.mjs" in manifesteApres));
});

test("lot 6 (gouvernance) : uninstall liste l'état local, ne le supprime qu'avec --yes", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  const etat = join(dir, ".drwil", "state.json");
  writeFileSync(etat, JSON.stringify({ version: 1, activite: "CADRAGE", attente_active: null, demande_active: null, depuis: null }));
  assert.ok((await uninstall({ targetDir: dir })).removed.includes(".drwil/state.json"));
  assert.ok(existsSync(etat), "dry-run ne supprime pas l'état");
  assert.ok((await uninstall({ targetDir: dir, dryRun: false })).removed.includes(".drwil/state.json"));
  assert.ok(!existsSync(etat), "--yes supprime l'état local");
  assert.ok(!(await uninstall({ targetDir: dir })).removed.includes(".drwil/state.json"), "absent : rien à lister");
});

test("lot 2 (résolution de dérive) : diff affiché, confirmation respectée, .bak créé, --forcer fonctionnel", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));

  const cible = ".githooks/check-docs.mjs";
  const original = read(dir, cible);
  writeFileSync(join(dir, cible), "// personnalisé par le projet\n" + original);

  // rien à résoudre si pas de dérive (autre fichier, comparé au modèle exact).

  // confirmation refusée : le fichier n'est jamais réécrit, pas de .bak, signalé dans `ignores`.
  let rapport = await quiet(() => resoudreDerive({ targetDir: dir }, () => false));
  assert.ok(rapport.ignores.includes(cible), rapport.ignores.join(","));
  assert.ok(!rapport.resolus.length);
  assert.equal(read(dir, cible), "// personnalisé par le projet\n" + original, "jamais réécrit sans confirmation");
  assert.ok(!existsSync(join(dir, `${cible}.bak`)));

  // confirmation acceptée : réécrit, .bak créé avec l'ancien contenu, diff transmis au confirmateur.
  let diffRecu = "";
  rapport = await quiet(() => resoudreDerive({ targetDir: dir }, (rel, diff) => { diffRecu = diff; return rel === cible; }));
  assert.ok(rapport.resolus.includes(cible), rapport.resolus.join(","));
  assert.match(diffRecu, /personnalisé par le projet/);
  assert.equal(read(dir, cible), original, "réécrit avec le contenu du modèle");
  assert.equal(read(dir, `${cible}.bak`), "// personnalisé par le projet\n" + original, ".bak garde l'ancien contenu");

  // plus rien à résoudre une fois réécrit (confirmateur jamais appelé).
  let appele = false;
  rapport = await quiet(() => resoudreDerive({ targetDir: dir }, () => { appele = true; return true; }));
  assert.ok(!appele);
  assert.ok(!rapport.resolus.length && !rapport.ignores.length);

  // --forcer : écrase sans passer par le confirmateur (dérive réintroduite pour le test).
  writeFileSync(join(dir, cible), "// re-personnalisé\n" + original);
  appele = false;
  rapport = await quiet(() => resoudreDerive({ targetDir: dir, forcer: true }, () => { appele = true; return true; }));
  assert.ok(!appele, "--forcer n'appelle jamais le confirmateur");
  assert.ok(rapport.resolus.includes(cible));
  assert.equal(read(dir, cible), original);
});

test("lot 2 (résolution de dérive) : jamais appliquée automatiquement par init()/apply(), ne crée aucun fichier absent", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));

  // rien n'a dérivé juste après init() : aucune résolution nécessaire.
  let rapport = await quiet(() => resoudreDerive({ targetDir: dir, forcer: true }));
  assert.ok(!rapport.resolus.length && !rapport.ignores.length);

  // un fichier mécanique absent (supprimé par le projet) n'est jamais recréé par resoudreDerive.
  const absent = join(dir, ".githooks/check-docs.mjs");
  const fs = await import("node:fs/promises");
  await fs.rm(absent);
  rapport = await quiet(() => resoudreDerive({ targetDir: dir, forcer: true }));
  assert.ok(!rapport.resolus.includes(".githooks/check-docs.mjs"));
  assert.ok(!existsSync(absent), "jamais recréé par resoudreDerive");
});

test("point 3 (suites-kit-portable) : un fichier obsolète d'une ancienne version du kit, jamais modifié, est supprimé par init()/apply()", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));

  // simule un fichier d'une ancienne version du kit, plus présent dans le template actuel,
  // mais déjà enregistré dans le manifeste (comme s'il avait été écrit par une version antérieure).
  const obsolete = ".githooks/ancien-script.py";
  const contenuObsolete = "# ancien script Python, retiré du kit depuis\n";
  writeFileSync(join(dir, obsolete), contenuObsolete);
  const manifeste = JSON.parse(read(dir, ".drwil/fichiers-installes.json"));
  manifeste[obsolete] = createHash("sha256").update(contenuObsolete).digest("hex");
  writeFileSync(join(dir, ".drwil/fichiers-installes.json"), JSON.stringify(manifeste, null, 2) + "\n");

  // un fichier obsolète mais modifié depuis par le projet : jamais supprimé.
  const obsoleteModifie = ".githooks/autre-ancien.sh";
  const contenuInitial = "#!/bin/sh\n# ancien hook\n";
  writeFileSync(join(dir, obsoleteModifie), contenuInitial);
  manifeste[obsoleteModifie] = createHash("sha256").update(contenuInitial).digest("hex");
  writeFileSync(join(dir, ".drwil/fichiers-installes.json"), JSON.stringify(manifeste, null, 2) + "\n");
  writeFileSync(join(dir, obsoleteModifie), contenuInitial + "# modifié par le projet\n");

  const lignes = await capture(() => init({ targetDir: dir, git: false }));
  assert.ok(!existsSync(join(dir, obsolete)), "fichier obsolète non modifié supprimé");
  assert.ok(existsSync(join(dir, obsoleteModifie)), "fichier obsolète mais modifié conservé");
  assert.ok(lignes.some((l) => l.includes(obsolete)), lignes.join("\n"));

  const manifesteApres = JSON.parse(read(dir, ".drwil/fichiers-installes.json"));
  assert.ok(!(obsolete in manifesteApres), "entrée retirée du manifeste");
  assert.ok(obsoleteModifie in manifesteApres, "entrée du fichier modifié conservée");
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

test("QUA-017 : pas de travail direct sur la branche principale, même pour le tout premier commit", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir }));
  // init() bascule déjà sur une branche de travail avant tout commit (plus jamais sur master/main).
  const branche = git(dir, "symbolic-ref", "--short", "HEAD");
  assert.equal(branche.stdout.trim(), "chantier/installation-kit", "init() laisse l'utilisateur sur une branche de travail, jamais master");

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
  writeFileSync(join(dir, "docs/projets/entretien-courant.md"), read(dir, "docs/projets/entretien-courant.md") + "\n");
  git(dir, "add", "-A");
  const second = git(dir, "commit", "-qm", "commit direct sur master");
  assert.notEqual(second.status, 0, "un commit direct sur master est refusé (QUA-017)");
  assert.match(second.stdout + second.stderr, /travail direct sur la branche principale/);

  // en CI, le contrôle ne tourne jamais (sinon un merge légitime sur master casserait la CI après coup).
  const enCi = spawnSync(process.execPath, [".githooks/run-checks.mjs"], { cwd: dir, encoding: "utf8", env: { ...process.env, CI: "1" } });
  assert.doesNotMatch(enCi.stdout, /travail direct sur la branche principale/, "jamais vérifié en CI");

  // sur une branche, un nouveau commit passe.
  git(dir, "checkout", "-qb", "chantier/essai");
  writeFileSync(join(dir, "docs/projets/entretien-courant.md"), read(dir, "docs/projets/entretien-courant.md") + "\n");
  git(dir, "add", "-A");
  const surBranche = git(dir, "commit", "-qm", "commit sur une branche");
  assert.equal(surBranche.status, 0, "un commit sur une branche non principale n'est jamais bloqué : " + surBranche.stdout + surBranche.stderr);
});

test("QUA-017 : un push ne contenant que des tags n'est jamais bloqué, un push de la branche principale continue de l'être", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir }));
  git(dir, "add", "-A");
  const premier = git(dir, "commit", "-qm", "premier commit");
  assert.equal(premier.status, 0, premier.stdout + premier.stderr);

  // scénario réel de `creer-release.mjs` : un tag posé puis poussé depuis master, après un merge légitime.
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
  await quiet(() => init({ targetDir: dirGh, ci: "github", git: false }));
  const gh = read(dirGh, ".github/workflows/ia-first.yml");
  assert.match(gh, /alerter-si-ci-cassee:/);
  assert.match(gh, /needs:\s*checks/);
  assert.match(gh, /github\.event_name == 'push'/);
  assert.match(gh, /github\.event\.repository\.default_branch/);
  assert.match(gh, /needs\.checks\.result == 'failure'/);
  assert.match(gh, /gh issue create/);
  assert.match(gh, /pas de doublon/);

  // GitLab : stage dédiée après `test`, déclenchée seulement sur la branche
  // par défaut et seulement en cas d'échec d'un job de la stage `test`.
  const dirGl = tmp();
  await quiet(() => init({ targetDir: dirGl, ci: "gitlab", git: false }));
  const gl = read(dirGl, ".gitlab-ci.yml");
  assert.match(gl, /alerter-si-ci-cassee:/);
  assert.match(gl, /stage: alerte/);
  assert.match(gl, /CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH/);
  assert.match(gl, /when: on_failure/);
  assert.match(gl, /pas de doublon/);

  // Les deux restent couverts par QUA-013 (le nouveau job n'y casse rien).
  for (const dir of [dirGh, dirGl]) {
    const r = spawnSync(process.execPath, [".githooks/check-control-coverage.mjs"], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  }
});

test("gabarits de pull/merge request : livrés selon le ci et la langue choisis", async () => {
  const cas = [
    { lang: "fr", ci: "github", chemin: ".github/pull_request_template.md", motif: /Fiche concernée/ },
    { lang: "fr", ci: "gitlab", chemin: ".gitlab/merge_request_templates/Default.md", motif: /Fiche concernée/ },
    { lang: "en", ci: "github", chemin: ".github/pull_request_template.md", motif: /Related card/ },
    { lang: "en", ci: "gitlab", chemin: ".gitlab/merge_request_templates/Default.md", motif: /Related card/ },
  ];
  for (const { lang, ci, chemin, motif } of cas) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, lang, ci, git: false }));
    assert.ok(existsSync(join(dir, chemin)), `${lang}/${ci} : ${chemin} absent`);
    assert.match(read(dir, chemin), motif, `${lang}/${ci} : contenu inattendu`);
  }
  // ci: none n'installe aucun gabarit (rien à proposer sans plateforme de MR).
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, ci: "none", git: false }));
  assert.ok(!existsSync(join(dir, ".github/pull_request_template.md")));
  assert.ok(!existsSync(join(dir, ".gitlab/merge_request_templates/Default.md")));
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

test("pre-commit : un contrôle du projet hors de ses chemins est reporté (visible), rejoué au push et en direct", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir }));
  const cfg = config(dir);
  cfg.checks = [{ name: "suite lourde", run: "node -e \"process.exit(1)\"", chemins: ["src/**"] }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  git(dir, "add", "-A");
  const horsChemins = git(dir, "commit", "-qm", "rien sous src/");
  assert.equal(horsChemins.status, 0, "aucun fichier indexé sous src/ : reporté, pas lancé : " + horsChemins.stdout + horsChemins.stderr);
  assert.match(horsChemins.stdout + horsChemins.stderr, /non exécuté : suite lourde \(aucun fichier indexé sous ses chemins/);

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

test("commande /drwil : skill générique et alias par capacité livrés avec Claude Code", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  assert.ok(existsSync(join(dir, ".claude/skills/drwil/SKILL.md")));
  assert.match(read(dir, ".claude/skills/drwil/SKILL.md"), /disable-model-invocation: true/);
  const alias = {
    "adopter-le-kit": "drwil-adopter",
    "auditer-risques-et-dette": "drwil-audit",
    "decouvrir-valeur-produit": "drwil-valeur",
    "suivre-consommation-par-lot": "drwil-conso",
    "visualiser-avancement": "drwil-avancement",
  };
  for (const [skill, name] of Object.entries(alias)) {
    assert.match(read(dir, `.claude/skills/${skill}/SKILL.md`), new RegExp(`^name: ${name}$`, "m"), skill);
  }
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("commande /drwil : pas livrée sans Claude Code", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, tools: "codex", git: false }));
  assert.ok(!existsSync(join(dir, ".claude")));
});

test("skills Copilot CLI (applyTo) : parité fonctionnelle sur les 2 recettes qui s'y prêtent, FR et EN", async () => {
  for (const lang of ["fr", "en"]) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, lang, git: false }));
    const api = lang === "fr" ? "ajouter-une-route-api" : "add-an-api-route";
    const ecran = lang === "fr" ? "ajouter-un-ecran-front" : "add-a-frontend-screen";
    const apiContent = read(dir, `.github/instructions/${api}.instructions.md`);
    assert.match(apiContent, /applyTo:\s*"backend\/\*\*"/);
    const ecranContent = read(dir, `.github/instructions/${ecran}.instructions.md`);
    assert.match(ecranContent, /applyTo:\s*"frontend\/\*\*"/);
  }
  // Pas livré si Copilot n'est pas sélectionné.
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, tools: "codex", git: false }));
  assert.ok(!existsSync(join(dir, ".github", "instructions")));
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
  const src = fileURLToPath(new URL("../templates/common/optional/tableau-de-bord/tableau-de-bord.mjs", import.meta.url));
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
  const src = fileURLToPath(new URL("../templates/common/optional/tableau-de-bord/tableau-de-bord.mjs", import.meta.url));
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
  const src = fileURLToPath(new URL("../templates/common/optional/tableau-de-bord/tableau-de-bord.mjs", import.meta.url));
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

test("rappel de péremption des audits (> 30 jours) : tableau de bord et run-checks.mjs", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, name: "demo", git: false }));
  mkdirSync(join(dir, ".githooks"), { recursive: true });
  const src = fileURLToPath(new URL("../templates/common/optional/tableau-de-bord/tableau-de-bord.mjs", import.meta.url));
  writeFileSync(join(dir, ".githooks/tableau-de-bord.mjs"), readFileSync(src, "utf8"));

  // rapport récent : pas d'avertissement.
  writeFileSync(join(dir, "docs/audit-risques.md"), "# Audit de risques et dette technique\n\n> Dernier scan : 2026-10-04\n\n## Synthèse\n");
  let r = spawnSync(process.execPath, [".githooks/tableau-de-bord.mjs", "docs/tableau-de-bord.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(read(dir, "docs/tableau-de-bord.html"), /à relancer/);
  let checkR = checks(dir);
  assert.doesNotMatch(checkR.stdout, /audit périmé/);

  // rapport vieux de plus de 30 jours : avertissement visuel dans le tableau de bord, et dans
  // run-checks.mjs (famille « non exécuté », jamais bloquant).
  writeFileSync(join(dir, "docs/audit-risques.md"), "# Audit de risques et dette technique\n\n> Dernier scan : 2020-01-01\n\n## Synthèse\n");
  r = spawnSync(process.execPath, [".githooks/tableau-de-bord.mjs", "docs/tableau-de-bord.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(read(dir, "docs/tableau-de-bord.html"), /à relancer/);
  checkR = checks(dir);
  assert.equal(checkR.status, 0, "jamais bloquant : " + checkR.stdout + checkR.stderr);
  assert.match(checkR.stdout, /audit périmé.*docs\/audit-risques\.md/);
});

test("créer une release : détection du bump semver (Conventional Commits, best-effort)", async () => {
  // import() dynamique : passer l'URL file:// telle quelle (pas de conversion
  // en chemin OS) — un chemin Windows brut (d:\...) fait planter le loader ESM.
  const { detecterBump, versionSuivante } = await import(new URL("../templates/common/optional/creer-une-release/creer-release.mjs", import.meta.url));

  assert.equal(detecterBump([]), null, "aucun commit : rien à publier");
  assert.equal(detecterBump([{ sujet: "Manifeste des fichiers installés", corps: "" }]), "patch", "aucun préfixe reconnu : patch par défaut");
  assert.equal(detecterBump([{ sujet: "fix: corrige X", corps: "" }]), "patch");
  assert.equal(detecterBump([{ sujet: "feat: ajoute Y", corps: "" }, { sujet: "fix: corrige X", corps: "" }]), "minor", "un feat l'emporte sur un simple fix");
  assert.equal(detecterBump([{ sujet: "feat!: casse la compat", corps: "" }]), "major", "rupture annoncée (!) prioritaire");
  assert.equal(detecterBump([{ sujet: "feat: ajoute Y", corps: "BREAKING CHANGE: change le format" }]), "major", "rupture annoncée dans le corps aussi détectée");

  assert.equal(versionSuivante("v1.2.3", "patch"), "v1.2.4");
  assert.equal(versionSuivante("v1.2.3", "minor"), "v1.3.0");
  assert.equal(versionSuivante("v1.2.3", "major"), "v2.0.0");
});

test("créer une release : module optionnel (pas copié par défaut), recette/skill livrés en FR et EN, --dry-run sans réseau", async () => {
  for (const lang of ["fr", "en"]) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, lang, git: false }));
    // Le script lui-même n'est jamais copié automatiquement.
    assert.ok(!existsSync(join(dir, ".githooks/creer-release.mjs")), "le module optionnel ne doit pas être copié par défaut");
    // La recette (toujours livrée) documente l'activation du module.
    const recette = lang === "fr" ? "docs/recettes/creer-une-release.md" : "docs/recipes/create-a-release.md";
    assert.match(read(dir, recette), /optionnel|optional/i);
    // Le skill générique drwil mentionne la capacité release.
    const menu = read(dir, ".claude/skills/drwil/SKILL.md");
    assert.match(menu, /release/);
  }

  // Script utilisable en pratique : --dry-run, sans toucher au réseau ni créer de tag.
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: true }));
  mkdirSync(join(dir, ".githooks"), { recursive: true });
  const src = fileURLToPath(new URL("../templates/common/optional/creer-une-release/creer-release.mjs", import.meta.url));
  writeFileSync(join(dir, ".githooks/creer-release.mjs"), readFileSync(src, "utf8"));
  git(dir, "add", "-A");
  git(dir, "commit", "-m", "feat: premier chantier");
  const r = spawnSync(process.execPath, [".githooks/creer-release.mjs", "--dry-run"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /v0\.1\.0/);
  assert.match(r.stdout, /dry-run/);
});

test("créer une release : repère les paquets npm publiables (package.json suivi, non private) pour le tarball de release", async () => {
  const { paquetsPublics } = await import(new URL("../templates/common/optional/creer-une-release/creer-release.mjs", import.meta.url));
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: true }));
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
    const paquets = paquetsPublics();
    assert.deepEqual(paquets.sort(), ["packages/truc"], "seul le paquet non private avec un name est retenu");
  } finally {
    process.chdir(cwdAvant);
  }
});

test("créer une release : --dry-run liste le paquet npm à empaqueter quand il y en a un", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: true }));
  mkdirSync(join(dir, ".githooks"), { recursive: true });
  const src = fileURLToPath(new URL("../templates/common/optional/creer-une-release/creer-release.mjs", import.meta.url));
  writeFileSync(join(dir, ".githooks/creer-release.mjs"), readFileSync(src, "utf8"));
  mkdirSync(join(dir, "packages/truc"), { recursive: true });
  writeFileSync(join(dir, "packages/truc/package.json"), JSON.stringify({ name: "truc", version: "1.0.0" }));
  git(dir, "add", "-A");
  git(dir, "commit", "-m", "feat: ajoute un paquet publiable");
  const r = spawnSync(process.execPath, [".githooks/creer-release.mjs", "--dry-run"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /tarball.*packages\/truc/);
});

// DRWIL-003 : verify = primitive de validation du travail. Contrôles déterministes `ok`/`ko`
// (pas de gitleaks, absent de certains postes) : seul le verdict est testé, pas les outils.
async function projetVerify(contrats, reglages = {}) {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false, ci: "none" }));
  const cfg = { ...config(dir), ...reglages };
  cfg.checks = [
    { id: "ok", name: "toujours vert", run: 'node -e "process.exit(0)"' },
    { id: "ko", name: "toujours rouge", run: 'node -e "console.log(\'cause du rouge\'); process.exit(1)"' },
  ];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  writeFileSync(join(dir, "docs/contrats.md"), `# Contrats\n\n${contrats}\n`);
  return dir;
}
const contrat = (id, champs) => `## ${id} — titre ${id}\n**Règle** : exigence ${id}.\n${champs}\n`;

test("verify : PASS (exit 0) quand toutes les obligations sont prouvées par un contrôle", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  const v = await verify({ targetDir: dir });
  assert.equal(v.statut, "PASS");
  assert.equal(v.code, 0);
  assert.deepEqual(v.contrats.map((k) => [k.id, k.statut]), [["QUA-001", "PASS"]]);
  assert.match(formaterVerdict(v), /GOVERNANCE: PASS/);
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify"], { cwd: dir, encoding: "utf8", env: envTest });
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
});

test("verify : FAIL (exit 1) dès qu'une obligation échoue, avec la cause visible", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `ko`"));
  const v = await verify({ targetDir: dir });
  assert.equal(v.statut, "FAIL");
  assert.equal(v.code, 1);
  assert.equal(v.contrats.find((k) => k.id === "QUA-002").statut, "FAIL");
  const sortie = formaterVerdict(v);
  assert.match(sortie, /ko : échec/);
  assert.match(sortie, /cause du rouge/);
  assert.match(sortie, /GOVERNANCE: FAIL/);
});

test("verify : MANUAL (exit 1, jamais PASS) pour une preuve humaine, partie automatisée affichée à part", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`\n**Manuel** : relecture humaine") + contrat("QUA-002", "**Manuel** : appréciation"));
  const v = await verify({ targetDir: dir });
  assert.equal(v.statut, "MANUAL");
  assert.equal(v.code, 1, "MANUAL empêche le 0 sans être une erreur technique");
  assert.deepEqual(v.contrats.map((k) => k.statut), ["MANUAL", "MANUAL"]);
  const sortie = formaterVerdict(v);
  assert.match(sortie, /ok : ok \(automatisé\)/);
  assert.match(sortie, /humain requis : relecture humaine/);
  assert.match(sortie, /GOVERNANCE: MANUAL REVIEW REQUIRED/);
});

test("verify : contrat historique en tableau sans contrôle = MANUAL, jamais ignoré", async () => {
  const dir = await projetVerify(`| ID | Règle |\n|---|---|\n| SEC-006 | historique |\n\n${contrat("QUA-001", "**Contrôle** : `ok`")}`);
  const v = await verify({ targetDir: dir });
  assert.deepEqual(v.contrats.map((k) => [k.id, k.statut]), [["SEC-006", "MANUAL"], ["QUA-001", "PASS"]]);
  assert.equal(v.statut, "MANUAL");
});

test("verify : ERROR (exit 2) pour un contrôle inconnu, une obligation invérifiable ou un doublon ; FAIL l'emporte", async () => {
  let v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `inexistant`")) });
  assert.equal(v.statut, "ERROR");
  assert.equal(v.code, 2);
  assert.match(v.contrats[0].raisons.join(), /contrôle inconnu « inexistant »/);

  v = await verify({ targetDir: await projetVerify("## QUA-001 — sans rien\n**Raison** : intention seule.\n") });
  assert.equal(v.statut, "ERROR", "une obligation sans exigence ni preuve n'est jamais acceptée en silence");
  assert.match(v.contrats[0].raisons.join(), /exigence absente/);
  assert.match(v.contrats[0].raisons.join(), /aucune preuve déclarée/);

  v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-001", "**Contrôle** : `ok`")) });
  assert.equal(v.statut, "ERROR");
  assert.match(v.erreurs.join(), /défini plusieurs fois/);

  v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `inexistant`") + contrat("QUA-002", "**Contrôle** : `ko`")) });
  assert.equal(v.statut, "FAIL", "un échec établi l'emporte sur une erreur");
});

test("verify : ERROR (exit 2) sans moteur installé ou sans registre, hooks indépendants de drwil", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  // Les hooks n'importent que .githooks/ : ils tournent sans drwil.
  assert.doesNotMatch(read(dir, ".githooks/run-checks.mjs") + read(dir, ".githooks/moteur.mjs"), /from "drwil"|packages\/drwil|dist\/index/);
  writeFileSync(join(dir, "docs/contrats.md"), "# Contrats\n");
  let v = await verify({ targetDir: dir });
  assert.equal(v.code, 2);
  assert.match(v.erreurs.join(), /aucun contrat/);
  const vide = tmp();
  v = await verify({ targetDir: vide });
  assert.equal(v.code, 2);
  assert.match(v.erreurs.join(), /moteur de contrôles absent/);
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify"], { cwd: vide, encoding: "utf8", env: envTest });
  assert.equal(cli.status, 2);
  assert.match(cli.stdout, /GOVERNANCE: VERIFY ERROR/);
});

const cliVerify = (dir) => spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify"], { cwd: dir, encoding: "utf8", env: envTest });

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
  // Sans CI configurée, `couverture-ci` ne peut pas tourner : la preuve n'est pas établie.
  const v = await verify({ targetDir: await projetVerify(contrat("QUA-013", "**Contrôle** : `couverture-ci`")) });
  assert.equal(v.statut, "ERROR");
  assert.equal(v.code, 2);
  assert.match(v.contrats[0].raisons.join(), /couverture-ci : non exécuté/);
});

test("verify : contrôle non applicable dans ce contexte → MANUAL, jamais PASS", async () => {
  // En mode minimal, la recherche de secrets est exclue par conception : rien n'est prouvé.
  const v = await verify({ targetDir: await projetVerify(contrat("SEC-007", "**Contrôle** : `secrets-fichiers`"), { mode: "minimal" }) });
  assert.equal(v.statut, "MANUAL");
  assert.equal(v.code, 1);
  assert.match(v.contrats[0].raisons.join(), /secrets-fichiers : non applicable ici/);
});

test("verify : priorité déterministe du verdict global FAIL > ERROR > MANUAL > PASS", async () => {
  const ok = contrat("QUA-001", "**Contrôle** : `ok`");
  const manuel = contrat("QUA-002", "**Manuel** : relecture");
  const erreur = contrat("QUA-003", "**Contrôle** : `couverture-ci`");
  const echec = contrat("QUA-004", "**Contrôle** : `ko`");
  const cas = [
    [ok, "PASS", 0],
    [ok + manuel, "MANUAL", 1],
    [ok + manuel + erreur, "ERROR", 2],
    [ok + manuel + erreur + echec, "FAIL", 1],
  ];
  for (const [contrats, statut, code] of cas) {
    const v = await verify({ targetDir: await projetVerify(contrats) });
    assert.deepEqual([v.statut, v.code], [statut, code], contrats);
  }
});

test("DRWIL-002 : check-docs refuse un contrat mal formé dès le commit (contrôle inconnu, Règle absente)", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  const base = read(dir, "docs/contrats.md");
  assert.equal(spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" }).status, 0, "le registre livré est valide");
  writeFileSync(join(dir, "docs/contrats.md"), `${base}\n## QUA-020 — mal formé\n**Contrôle** : \`inexistant\`\n`);
  const r = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /QUA-020 : contrôle inconnu « inexistant »/);
  assert.match(r.stdout + r.stderr, /QUA-020 : exigence absente/);
});

const cli = (dir, ...args) => spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), ...args], { cwd: dir, encoding: "utf8", env: envTest });

test("DRWIL-004 : verify --json, format stable, rien d'autre sur stdout, mêmes codes de sortie", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Manuel** : relecture") + contrat("QUA-003", "**Contrôle** : `ko`"));
  const r = cli(dir, "verify", "--json");
  assert.equal(r.status, 1);
  const j = JSON.parse(r.stdout);
  assert.equal(j.version, 1);
  assert.equal(j.status, "fail");
  assert.equal(j.exitCode, 1);
  assert.deepEqual(j.contracts, { total: 3, passed: 1, failed: 1, manual: 1, error: 0, attested: 0 }, "ajout compatible v1 : attested");
  assert.deepEqual(j.results.map((k) => [k.id, k.status]), [["QUA-001", "pass"], ["QUA-002", "manual"], ["QUA-003", "fail"]]);
  assert.equal(j.results[2].checks[0].status, "echec");
  assert.doesNotMatch(r.stdout, /cause du rouge/, "la sortie brute des contrôles n'est pas exposée");
  const manuel = cli(await projetVerify(contrat("QUA-001", "**Manuel** : relecture")), "verify", "--json");
  assert.equal(manuel.status, 1);
  assert.equal(JSON.parse(manuel.stdout).status, "manual", "FAIL et MANUAL distincts en JSON");
  const erreur = cli(tmp(), "verify", "--json");
  assert.equal(erreur.status, 2);
  assert.equal(JSON.parse(erreur.stdout).status, "error");
});

test("DRWIL-010 : doctor diagnostique sans exécuter de contrôle ; --json ; contracts liste le registre", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, ci: "github" }));
  let d = await doctor({ targetDir: dir });
  assert.equal(d.code, 0, JSON.stringify(d.points));
  assert.ok(d.points.find((p) => p.id === "hooks").etat === "ok");
  assert.match(d.points.find((p) => p.id === "contrats").detail, /8 contrat\(s\) valide\(s\)/);
  git(dir, "config", "core.hooksPath", "ailleurs");
  spawnSync(process.execPath, ["-e", "require('fs').unlinkSync('CLAUDE.md')"], { cwd: dir });
  d = await doctor({ targetDir: dir });
  assert.equal(d.code, 1);
  assert.equal(d.points.find((p) => p.id === "hooks").etat, "probleme");
  assert.match(d.points.find((p) => p.id === "integrations").detail, /manquant : CLAUDE\.md/);
  const j = cli(dir, "doctor", "--json");
  assert.equal(j.status, 1);
  assert.equal(JSON.parse(j.stdout).status, "problems");
  assert.equal(cli(tmp(), "doctor").status, 2);
  const c = cli(dir, "contracts", "--json");
  assert.equal(c.status, 0, c.stdout);
  assert.ok(JSON.parse(c.stdout).contracts.some((k) => k.id === "SEC-007" && k.checks.includes("secrets-fichiers")));
});

test("DRWIL-011 : apply audite et prévisualise sans rien écrire ; l'aperçu correspond exactement à l'installation", async () => {
  const dir = tmp();
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", scripts: { test: "node --test", lint: "eslint ." } }));
  writeFileSync(join(dir, ".eslintrc.json"), "{}");
  writeFileSync(join(dir, "CLAUDE.md"), "mes consignes à moi\n");
  const a = await auditerApply({ targetDir: dir, git: false });
  assert.ok(a.protections.includes("eslint") && a.protections.includes("script npm « test »"), a.protections.join());
  assert.ok(a.outilsPresents.includes("CLAUDE.md"));
  assert.ok(a.crees.includes("AGENTS.md") && a.crees.includes(".githooks/moteur.mjs") && a.crees.includes(".drwil/ia-first.json"));
  assert.ok(a.conserves.includes("CLAUDE.md") && !a.crees.includes("CLAUDE.md"));
  assert.ok(!existsSync(join(dir, "AGENTS.md")) && !existsSync(join(dir, ".drwil")), "l'aperçu n'écrit rien");
  assert.match(formaterAudit(a), /Rien ne sera écrasé/);
  const dry = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "apply", "--dry-run", "--no-git"], { cwd: dir, encoding: "utf8", env: envTest });
  assert.equal(dry.status, 0, dry.stderr);
  assert.ok(!existsSync(join(dir, "AGENTS.md")), "--dry-run n'écrit rien");
  await quiet(() => apply({ targetDir: dir, git: false }));
  for (const f of a.crees) assert.ok(existsSync(join(dir, f)), `annoncé et créé : ${f}`);
  assert.equal(read(dir, "CLAUDE.md"), "mes consignes à moi\n", "fichier existant jamais écrasé");
});

test("DRWIL-012 : installation neuve sans bruit ; un risque déclaré trop bas est refusé au commit", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  const propre = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(propre.status, 0, propre.stdout);
  assert.doesNotMatch(propre.stdout, /niveau de risque/, "aucun avertissement de risque à l'installation");
  writeFileSync(join(dir, "docs/projets/toucher-hooks.md"), "# Projet : x\n\n**Statut** : cadré le 2026-10-06.\n**Risque** : LOW\n\n<!-- cadrage\nfichiers:\n  - .githooks/moteur.mjs\n-->\n\n## 7. Reprise\n\n- rien\n");
  const r = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /risque LOW déclaré.*HIGH au minimum/);
});

test("DRWIL-013 : verify --evidence enregistre verdict, horodatage, commit et résumés caviardés", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `fuite`"));
  const cfg = config(dir);
  cfg.checks.push({ id: "fuite", name: "bavard", run: 'node -e "console.log(\'password=hunter2-tres-secret\'); console.log(\'jeton ghp_abcdefghijklmnopqrstuvwxyz0123\'); process.exit(1)"' });
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  git(dir, "init", "-q"); git(dir, "add", "-A"); git(dir, "commit", "-qm", "x");
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
  assert.match(e.evidence.find((k) => k.id === "QUA-002").checks[0].summary, /\[CAVIARDÉ\]/);
  assert.doesNotMatch(brut, /hunter2|ghp_abcdef/, "aucun secret dans l'évidence (SEC-007)");
  assert.match(read(dir, ".gitignore"), /\.drwil\/evidence\//);
});

test("DRWIL-020 : seuls les contrats bloquants décident du verdict ; avertissement et indicatif affichés", async () => {
  const avert = (id, ctl, sev) => contrat(id, `**Contrôle** : \`${ctl}\`\n**Sévérité** : ${sev}`);
  let v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + avert("QUA-002", "ko", "avertissement") + contrat("QUA-003", "**Manuel** : relecture\n**Sévérité** : indicatif")) });
  assert.equal(v.statut, "PASS", "un avertissement en échec ne bloque pas le gate");
  assert.equal(v.code, 0);
  assert.deepEqual(v.contrats.map((k) => [k.statut, k.severite]), [["PASS", "bloquant"], ["FAIL", "avertissement"], ["MANUAL", "indicatif"]]);
  assert.match(formaterVerdict(v), /1 avertissement\(s\) non satisfait\(s\), 1 indicatif\(s\) non satisfait\(s\)/);
  const j = JSON.parse(cli(await projetVerify(avert("QUA-002", "ko", "warning")), "verify", "--json").stdout);
  assert.deepEqual(j.bySeverity.warning, { total: 1, passed: 0, notPassed: 1 });
  v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `ko`") + avert("QUA-002", "ok", "avertissement")) });
  assert.equal(v.statut, "FAIL", "un bloquant en échec reste FAIL");
  v = await verify({ targetDir: await projetVerify(avert("QUA-002", "inexistant", "indicatif")) });
  assert.equal(v.statut, "ERROR", "un registre mal formé reste une ERROR, même sur un contrat indicatif");
});

test("DRWIL-031 : l'exemple en 5 minutes du README est rejoué tel quel", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en", tools: "claude", ci: "github" }));
  const cfg = config(dir);
  cfg.checks = [{ id: "unit-tests", name: "unit tests", run: "node --test" }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg, null, 2));
  writeFileSync(join(dir, "docs/contracts.md"), read(dir, "docs/contracts.md") + "\n## QUA-020 — Unit tests pass\n**Rule**: every unit test passes.\n**Check**: `unit-tests`\n");
  writeFileSync(join(dir, "sum.test.mjs"), 'import { test } from "node:test";\nimport assert from "node:assert/strict";\ntest("sum", () => assert.equal(1 + 1, 2));\n');
  let v = await verify({ targetDir: dir });
  assert.equal(v.contrats.find((k) => k.id === "QUA-020").statut, "PASS", formaterVerdict(v));
  assert.notEqual(v.statut, "PASS", "un projet neuf garde des contrats de socle MANUAL : jamais PASS d'office");
  writeFileSync(join(dir, "sum.test.mjs"), read(dir, "sum.test.mjs").replace("1 + 1, 2", "1 + 1, 3"));
  v = await verify({ targetDir: dir });
  assert.equal(v.contrats.find((k) => k.id === "QUA-020").statut, "FAIL");
  assert.equal(v.statut, "FAIL");
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
const attestations = (dir) => (existsSync(join(dir, ".drwil/evidence/attestations")) ? spawnSync("ls", [join(dir, ".drwil/evidence/attestations")], { encoding: "utf8" }).stdout.split("\n").filter(Boolean) : []);
const MANUEL = contrat("QUA-001", "**Contrôle** : `ok`\n**Manuel** : relecture des fiches");

test("attest : un MANUAL devient ATTESTED, verify le compte comme satisfait sans le confondre avec PASS", async () => {
  const dir = await projetAtteste(MANUEL);
  assert.equal((await verify({ targetDir: dir })).statut, "MANUAL");
  const r = await attester({ targetDir: dir, id: "QUA-001", note: "fiches relues", confirmer: oui });
  assert.equal(r.code, 0, r.message);
  const a = JSON.parse(read(dir, r.fichier));
  assert.equal(a.contract, "QUA-001");
  assert.equal(a.status, "ATTESTED");
  assert.match(a.attestedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(a.actor, { name: "Testeuse", source: "git config user.name, déclaratif" });
  assert.equal(a.note, "fiches relues");
  assert.match(a.fingerprint, /^[0-9a-f]{64}$/);
  assert.deepEqual(a.automated, [{ id: "ok", status: "ok" }]);
  const v = await verify({ targetDir: dir });
  assert.equal(v.contrats[0].statut, "ATTESTED", "jamais PASS : la preuve humaine reste visible");
  assert.equal(v.statut, "PASS");
  assert.equal(v.code, 0);
  assert.match(formaterVerdict(v), /1 ATTESTED.*\n.*validée\(s\) par attestation humaine/);
  const j = verdictJson(v);
  assert.equal(j.version, 1);
  assert.equal(j.contracts.attested, 1);
  assert.equal(j.results[0].status, "attested");
  assert.equal(j.results[0].attestation.note, "fiches relues");
});

test("attest : refus, contrat inconnu, contrat déjà PASS, contrat en échec", async () => {
  const dir = await projetAtteste(MANUEL + contrat("QUA-002", "**Contrôle** : `ok`") + contrat("QUA-003", "**Contrôle** : `ko`\n**Manuel** : relecture"));
  let r = await attester({ targetDir: dir, id: "QUA-001", confirmer: non });
  assert.equal(r.code, 1);
  assert.match(r.message, /refusée/);
  assert.deepEqual(attestations(dir), [], "rien d'enregistré après un refus");
  assert.equal((await verify({ targetDir: dir })).contrats[0].statut, "MANUAL");
  r = await attester({ targetDir: dir, id: "QUA-999", confirmer: oui });
  assert.equal(r.code, 2);
  assert.match(r.message, /contrat inconnu/);
  r = await attester({ targetDir: dir, id: "QUA-002", confirmer: oui });
  assert.equal(r.code, 1);
  assert.match(r.message, /déjà prouvé automatiquement/);
  r = await attester({ targetDir: dir, id: "QUA-003", confirmer: oui });
  assert.equal(r.code, 1, "un contrôle en échec ne s'atteste jamais");
  assert.match(r.message, /n'est pas attestable \(FAIL\)/);
  assert.deepEqual(attestations(dir), []);
});

test("attest : obsolète si le contrat ou sa preuve change ; plusieurs attestations, la dernière valide compte", async () => {
  const dir = await projetAtteste(MANUEL);
  assert.equal((await attester({ targetDir: dir, id: "QUA-001", confirmer: oui, maintenant: new Date("2026-10-06T08:00:00Z") })).code, 0);
  assert.equal((await attester({ targetDir: dir, id: "QUA-001", confirmer: oui })).code, 1, "déjà attesté : pas de doublon");
  writeFileSync(join(dir, "docs/contrats.md"), read(dir, "docs/contrats.md").replace("relecture des fiches", "relecture des fiches et des recettes"));
  let v = await verify({ targetDir: dir });
  assert.equal(v.contrats[0].statut, "MANUAL", "contrat modifié : attestation obsolète, jamais une validation");
  assert.match(v.contrats[0].raisons.join(), /obsolète/);
  assert.equal((await attester({ targetDir: dir, id: "QUA-001", confirmer: oui, maintenant: new Date("2026-10-06T09:00:00Z") })).code, 0);
  assert.equal(attestations(dir).length, 2, "l'historique est conservé");
  v = await verify({ targetDir: dir });
  assert.equal(v.contrats[0].statut, "ATTESTED");
  assert.equal(v.contrats[0].attestation.attestedAt, "2026-10-06T09:00:00.000Z");
  const cfg = config(dir);
  cfg.checks.find((c) => c.id === "ok").run = 'node -e "process.exit(0)" # autre preuve';
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  assert.equal((await verify({ targetDir: dir })).contrats[0].statut, "MANUAL", "preuve modifiée : attestation obsolète");
});

test("attest : sévérités — seule une attestation de contrat bloquant pèse sur le verdict", async () => {
  const sev = (id, champs, s) => contrat(id, `${champs}\n**Sévérité** : ${s}`);
  const dir = await projetAtteste(MANUEL + sev("QUA-002", "**Manuel** : relecture", "avertissement") + sev("QUA-003", "**Manuel** : relecture", "indicatif"));
  let v = await verify({ targetDir: dir });
  assert.equal(v.statut, "MANUAL", "le bloquant MANUAL décide");
  await attester({ targetDir: dir, id: "QUA-001", confirmer: oui });
  v = await verify({ targetDir: dir });
  assert.equal(v.statut, "PASS", "bloquant attesté ; avertissement et indicatif MANUAL restent informatifs");
  assert.deepEqual(v.contrats.map((k) => k.statut), ["ATTESTED", "MANUAL", "MANUAL"]);
  await attester({ targetDir: dir, id: "QUA-003", confirmer: oui });
  v = await verify({ targetDir: dir });
  assert.equal(v.contrats[2].statut, "ATTESTED");
  assert.deepEqual(verdictJson(v).bySeverity.advisory, { total: 1, passed: 0, notPassed: 0 });
});

test("attest : aucun contournement (CLI sans terminal, attestation forgée, échec postérieur, non applicable)", async () => {
  const dir = await projetAtteste(MANUEL);
  const cliAttest = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "attest", "QUA-001"], { cwd: dir, encoding: "utf8", env: envTest, input: "QUA-001\n" });
  assert.equal(cliAttest.status, 1, "sans terminal interactif, pas d'attestation (agent, script, stdin redirigé)");
  assert.match(cliAttest.stderr, /terminal interactif est requis/);
  assert.deepEqual(attestations(dir), []);
  mkdirSync(join(dir, ".drwil/evidence/attestations"), { recursive: true });
  writeFileSync(join(dir, ".drwil/evidence/attestations/QUA-001-forgee.json"), JSON.stringify({ version: 1, contract: "QUA-001", status: "ATTESTED", attestedAt: "2030-01-01T00:00:00.000Z", fingerprint: "0".repeat(64) }));
  let v = await verify({ targetDir: dir });
  assert.equal(v.contrats[0].statut, "MANUAL", "une empreinte qui ne correspond pas n'est jamais acceptée");
  await attester({ targetDir: dir, id: "QUA-001", confirmer: oui });
  const cfg = config(dir);
  cfg.checks.find((c) => c.id === "ok").run = cfg.checks.find((c) => c.id === "ko").run;
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  v = await verify({ targetDir: dir });
  assert.equal(v.contrats[0].statut, "FAIL", "une attestation ne masque jamais un contrôle en échec");
  const minimal = await projetVerify(contrat("SEC-007", "**Contrôle** : `secrets-fichiers`\n**Manuel** : relecture"), { mode: "minimal" });
  const r = await attester({ targetDir: minimal, id: "SEC-007", confirmer: oui });
  assert.equal(r.code, 1, "un contrôle non applicable ne se remplace pas par une attestation");
});

test("attest : aucune donnée sensible dans l'attestation (note caviardée, pas d'e-mail)", async () => {
  const dir = await projetAtteste(MANUEL);
  spawnSync("git", ["config", "user.email", "testeuse@exemple.invalid"], { cwd: dir });
  const r = await attester({ targetDir: dir, id: "QUA-001", note: "ok avec password=hunter2 et ghp_abcdefghijklmnopqrstuvwxyz0123 " + "x".repeat(800), confirmer: oui });
  assert.equal(r.code, 0);
  const brut = read(dir, r.fichier);
  assert.doesNotMatch(brut, /hunter2|ghp_abcdef|testeuse@exemple/);
  assert.match(JSON.parse(brut).note, /\[CAVIARDÉ\]/);
  assert.ok(JSON.parse(brut).note.length <= 500);
});

// Intégration agent (docs/projets/journal.md, 2026-10-10) : `verify --agent` présente le verdict
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
  assert.match(r.stdout, /Failing contracts \(fix them\):\n  - QUA-001/);
  assert.match(r.stdout, /Do not claim the work is done/);
  assert.doesNotMatch(r.stdout, /Human attestation required|drwil attest/, "FAIL : l'agent corrige, pas d'attestation");
  r = cli(await projetVerify(contrat("QUA-001", "**Contrôle** : `inexistant`")), "verify", "--agent");
  assert.equal(r.status, 2, "ERROR reste ERROR");
  assert.match(r.stdout, /GOVERNANCE: VERIFY ERROR/);
  assert.match(r.stdout, /do not claim the work is verified/);
  assert.doesNotMatch(r.stdout, /Human attestation required|drwil attest/, "ERROR : problème de vérification à résoudre, pas d'attestation");
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`\n**Manuel** : relecture"));
  r = cli(dir, "verify", "--agent");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Human attestation required\.\n  - QUA-001/);
  assert.match(r.stdout, /HUMAN ACTION — for the human, in their own interactive terminal; never run it yourself:\n  drwil attest <CONTRACT_ID>/);
  assert.ok(!existsSync(join(dir, ".drwil/evidence")), "verify --agent n'écrit rien, n'atteste rien");
});

test("/drwil verify (Claude) : adaptateur de la CLI, jamais d'attestation par l'agent ; consigne dans AGENTS.md", async () => {
  for (const lang of ["fr", "en"]) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, lang, tools: "claude", git: false }));
    const skill = read(dir, ".claude/skills/drwil/SKILL.md");
    assert.match(skill, /argument-hint: "\[verify\|/);
    assert.match(skill, /npx drwil verify --agent/);
    assert.doesNotMatch(skill.split("\n").find((l) => l.startsWith("argument-hint")), /attest/, "aucun argument attest");
    assert.match(skill, lang === "fr" ? /Ne jamais exécuter `drwil attest`/ : /Never run `drwil attest`/);
    assert.match(read(dir, "AGENTS.md"), /drwil verify --agent/);
    assert.match(read(dir, "AGENTS.md"), lang === "fr" ? /un agent ne l'exécute jamais/ : /an agent never runs it/);
  }
});

test("frontière d'attestation : --yes, stdin redirigé, script, leurres refusés ; attestation manuelle visible en revue ; vraie attestation reconnue", async () => {
  const dir = await projetAtteste(MANUEL);
  const bin = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
  const yes = cli(dir, "attest", "QUA-001", "--yes");
  assert.notEqual(yes.status, 0, "aucun --yes");
  const pipe = spawnSync(process.execPath, [bin, "attest", "QUA-001"], { cwd: dir, encoding: "utf8", env: envTest, input: "QUA-001\nQUA-001\n" });
  assert.equal(pipe.status, 1);
  writeFileSync(join(dir, "script.mjs"), `import { spawnSync } from "node:child_process";\nconst r = spawnSync(process.execPath, [${JSON.stringify(bin)}, "attest", "QUA-001"], { stdio: "pipe" });\nprocess.exit(r.status);\n`);
  assert.equal(spawnSync(process.execPath, ["script.mjs"], { cwd: dir, env: envTest }).status, 1, "invocation depuis un script refusée");
  assert.deepEqual(attestations(dir), [], "aucune attestation créée par ces tentatives");
  // Leurres : une « attestation » hors du dossier versionné, ou sans statut ATTESTED, n'est jamais lue.
  mkdirSync(join(dir, ".drwil/evidence/attestations"), { recursive: true });
  const k = (await verify({ targetDir: dir })).contrats[0];
  writeFileSync(join(dir, ".drwil/evidence/QUA-001.json"), JSON.stringify({ contract: "QUA-001", status: "ATTESTED", fingerprint: k.empreinte }));
  writeFileSync(join(dir, ".drwil/evidence/attestations/QUA-001-pass.json"), JSON.stringify({ contract: "QUA-001", status: "PASS", fingerprint: k.empreinte }));
  assert.equal((await verify({ targetDir: dir })).contrats[0].statut, "MANUAL");
  // Décision (a) assumée : une attestation écrite à la main avec la bonne empreinte est acceptée ;
  // elle n'échappe pas à la revue car son dossier est versionné (visible dans git status / la PR).
  writeFileSync(join(dir, ".drwil/evidence/attestations/QUA-001-main.json"), JSON.stringify({ version: 1, contract: "QUA-001", status: "ATTESTED", attestedAt: "2026-10-06T10:00:00.000Z", fingerprint: k.empreinte }));
  assert.equal((await verify({ targetDir: dir })).contrats[0].statut, "ATTESTED");
  assert.match(git(dir, "status", "--porcelain", "--untracked-files=all").stdout, /\.drwil\/evidence\/attestations\/QUA-001-main\.json/, "visible en revue, jamais ignorée par git");
  assert.doesNotMatch(git(dir, "status", "--porcelain", "--untracked-files=all").stdout, /\.drwil\/evidence\/QUA-001\.json/, "les évidences locales restent hors git");
  // Vraie attestation humaine (confirmation simulée par l'API, la CLI exigeant un terminal) : reconnue.
  const dir2 = await projetAtteste(MANUEL);
  assert.equal((await attester({ targetDir: dir2, id: "QUA-001", confirmer: oui })).code, 0);
  const r = cli(dir2, "verify", "--agent");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /0 PASS · 1 ATTESTED/);
  assert.match(r.stdout, /satisfied by a human attestation, not by an automated proof/);
});

test("paquet npm : aucun fichier du gabarit n'est retiré par npm, le .gitignore livré arrive dans le projet", async () => {
  const racine = fileURLToPath(new URL("../templates", import.meta.url));
  const retires = spawnSync("find", [racine, "-name", ".gitignore", "-o", "-name", ".npmignore"], { encoding: "utf8" }).stdout.trim();
  assert.equal(retires, "", "npm retire ces fichiers d'un paquet publié : les livrer sous un autre nom (NOMS_LIVRES)");
  const pack = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["pack", "--dry-run", "--json"], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8", shell: process.platform === "win32" });
  assert.equal(pack.status, 0, pack.stderr);
  const fichiers = JSON.parse(pack.stdout)[0].files.map((f) => f.path);
  assert.ok(fichiers.includes("templates/common/base/gitignore"), "le .gitignore du gabarit est bien dans le paquet");
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: false }));
  assert.ok(existsSync(join(dir, ".gitignore")) && !existsSync(join(dir, "gitignore")), "installé sous son vrai nom");
  assert.match(read(dir, ".gitignore"), /!\.drwil\/evidence\/attestations\//);
});

// Un seul numéro de version (docs/projets/journal.md, 2026-10-06).
test("version unique : la release suit package.json et refuse un numéro déjà publié ou en recul ; --version lit package.json", async () => {
  const { deciderVersion } = await import(new URL("../templates/common/optional/creer-une-release/creer-release.mjs", import.meta.url));
  const v = (version) => [{ dossier: "packages/drwil", version }];
  assert.deepEqual(deciderVersion({ dernier: "v0.2.0", bump: "patch", versions: v("0.3.0"), tagsExistants: ["v0.2.0"] }), { prochain: "v0.3.0", source: "package.json (packages/drwil)" });
  assert.match(deciderVersion({ dernier: "v0.2.1", bump: "patch", versions: v("0.2.1"), tagsExistants: ["v0.2.1"] }).erreur, /v0\.2\.1 existe déjà/);
  assert.match(deciderVersion({ dernier: "v0.2.1", bump: "patch", versions: v("0.2.0"), tagsExistants: [] }).erreur, /n'est pas supérieure au dernier tag/);
  assert.match(deciderVersion({ dernier: null, bump: "patch", versions: [{ dossier: "a", version: "1.0.0" }, { dossier: "b", version: "1.1.0" }] }).erreur, /en désaccord/);
  assert.match(deciderVersion({ dernier: null, bump: "patch", versions: v(undefined) }).erreur, /non semver/);
  assert.deepEqual(deciderVersion({ dernier: "v1.2.3", bump: "minor", versions: [] }), { prochain: "v1.3.0", source: "commits" }, "sans paquet npm : calcul d'après les commits, inchangé");
  assert.equal(deciderVersion({ dernier: "v1.2.3", bump: null, versions: v("9.9.9") }), null, "aucun commit : rien à publier");

  const dir = tmp();
  await quiet(() => init({ targetDir: dir, git: true }));
  mkdirSync(join(dir, ".githooks"), { recursive: true });
  writeFileSync(join(dir, ".githooks/creer-release.mjs"), readFileSync(fileURLToPath(new URL("../templates/common/optional/creer-une-release/creer-release.mjs", import.meta.url)), "utf8"));
  mkdirSync(join(dir, "packages/truc"), { recursive: true });
  writeFileSync(join(dir, "packages/truc/package.json"), JSON.stringify({ name: "truc", version: "1.0.0" }));
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "ajoute un paquet");
  git(dir, "tag", "-a", "v1.0.0", "-m", "v1.0.0");
  writeFileSync(join(dir, "packages/truc/a.txt"), "x");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "change sans changer la version");
  const r = spawnSync(process.execPath, [".githooks/creer-release.mjs", "--dry-run"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1, "version non changée : release refusée, même en --dry-run");
  assert.match(r.stderr, /v1\.0\.0 existe déjà/);

  const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"));
  const ver = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "--version"], { encoding: "utf8" });
  assert.equal(ver.stdout.trim(), pkg.version, "drwil --version = package.json");
});
