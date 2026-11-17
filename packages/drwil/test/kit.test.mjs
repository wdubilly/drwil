// Tests de bout en bout du kit : installe dans des dossiers temporaires et lance les vrais contrôles.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  appendFileSync,
  cpSync,
  rmSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { init, uninstall, verify, formatVerdict, verdictJson, doctor, previewInit, formatPreview, attest } from "../dist/index.js";
import { criteriaTable, evaluateCriteria, redact, writeEvidence } from "../dist/verify.js";
import { verifyFailed } from "../dist/failed.js";
import { judgeDurable } from "../dist/closure.js";
import {
  tmp,
  quiet,
  capture,
  envTest,
  checks,
  git,
  read,
  config,
  enAvertissement,
  executable,
  DEPOT,
  copierModule,
  projetVerify,
  contrat,
  cli,
} from "./kit-commun.mjs";

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

  // Un distant sans aucune branche accepte le tout premier envoi de la principale (exception unique) ; on le dote d'abord d'une branche.
  git(dir, "checkout", "-qb", "chantier/amorce");
  assert.equal(git(dir, "push", "-q", "origin", "chantier/amorce").status, 0);
  git(dir, "checkout", "-q", "master");

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

test("QUA-017 : le tout premier envoi de la branche principale passe sur un distant vide, le second est refusé", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  enAvertissement(dir);
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-qm", "premier commit").status, 0);
  git(dir, "checkout", "-qb", "master");
  const remote = tmp();
  assert.equal(spawnSync("git", ["init", "-q", "--bare", remote]).status, 0);
  git(dir, "remote", "add", "origin", remote);

  const premier = git(dir, "push", "-q", "origin", "master");
  assert.equal(premier.status, 0, "premier envoi vers un distant vide : " + premier.stdout + premier.stderr);
  git(dir, "commit", "-q", "--allow-empty", "-m", "suite");
  const second = git(dir, "push", "-q", "origin", "master");
  assert.notEqual(second.status, 0, "dès que le distant a une branche, l'envoi direct est refusé");
  assert.match(second.stdout + second.stderr, /travail direct sur la branche principale/);
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

test("QUA-250 : la CI livrée (GitHub, GitLab) reprend sur une PR les verdicts de la branche principale, que seule la branche principale garde", async () => {
  // Le détail des étapes est testé sur le gabarit (.github/scripts/workflows-yaml.test.mjs) ; ici, ce qu'init installe.
  const dirGh = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dirGh, ci: "github", git: false }));
  const gh = read(dirGh, ".github/workflows/ia-first.yml");
  assert.match(
    gh,
    /uses: actions\/cache\/restore@v\d+[\s\S]*DRWIL_CI_REUSE: \$\{\{ github\.event_name == 'pull_request' && '1' \|\| '' \}\}/,
  );
  assert.match(
    gh,
    /github\.event_name == 'push' && github\.ref == format\('refs\/heads\/\{0\}', github\.event\.repository\.default_branch\)[^\n]*\n\s*uses: actions\/cache\/save@/,
  );
  const dirGl = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dirGl, ci: "gitlab", git: false }));
  const gl = read(dirGl, ".gitlab-ci.yml");
  assert.match(
    gl,
    /jobs\/artifacts\/\$CI_DEFAULT_BRANCH\/raw\/\$verdicts\?job=checks[\s\S]*DRWIL_CI_REUSE=1 node \.githooks\/run-checks\.mjs/,
  );
  assert.match(gl, /after_script:[\s\S]*rm -f \.drwil\/evidence\/run-checks-verdicts\.json[\s\S]*artifacts:\n\s*when: always/);
  // Le moteur livré lit la demande de la CI (même fichier que celui du dépôt, testé par .githooks/run-checks.test.mjs).
  assert.match(read(dirGh, ".githooks/run-checks-verdicts.mjs"), /process\.env\.DRWIL_CI_REUSE === "1"/);
  for (const dir of [dirGh, dirGl]) {
    const r = spawnSync(process.execPath, [".githooks/check-control-coverage.mjs"], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  }
});

test("QUA-270 : un projet d'essai installé depuis le paquet reçoit les mécanismes de CI rapide du dépôt, GitHub et GitLab", async () => {
  const dirGh = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dirGh, ci: "github", git: false }));
  const dirGl = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dirGl, ci: "gitlab", git: false }));
  const gh = read(dirGh, ".github/workflows/ia-first.yml");
  const gl = read(dirGl, ".gitlab-ci.yml");
  for (const [nom, ci] of [
    ["GitHub", gh],
    ["GitLab", gl],
  ]) {
    // gitleaks : nouvelles tentatives sur toute erreur, archive cachée sous la version épinglée et vérifiée par sa somme.
    assert.match(ci, /curl [^\n]*--retry 5 --retry-all-errors/, nom);
    assert.match(ci, /gitleaks-\d+\.\d+\.\d+-linux-x64/, nom);
    assert.match(ci, /sha256sum -c -/, nom);
    // Rejeu avec les hooks de la branche principale (QUA-113) : la copie de base-checks.mjs de la base, lue par Git.
    assert.match(ci, /git show "\$base:\.githooks\/base-checks\.mjs"/, nom);
    assert.match(ci, /DRWIL_CI_REUSE/, nom);
  }
  // Un push sur la branche principale lit la preuve d'arbre de la PR verte (GitHub seulement, GitLab rejoue tout).
  assert.match(gh, /gh run download[^\n]*--name proven-tree/);
  assert.match(gh, /git rev-parse 'HEAD\^\{tree\}' > "\$RUNNER_TEMP\/proven-tree\.txt"/);
  assert.doesNotMatch(gl, /proven-tree/);
  // Le moteur livré est celui du dépôt : reprise des verdicts, rejeu QUA-113 et classement des durées.
  for (const f of ["base-checks", "run-checks", "run-checks-verdicts", "engine"])
    assert.equal(read(dirGh, `.githooks/${f}.mjs`), readFileSync(join(DEPOT, `.githooks/${f}.mjs`), "utf8"), `${f}.mjs`);
  assert.match(read(dirGh, ".githooks/base-checks.mjs"), /DRWIL_CI_REUSE/);
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

  // rapport récent : pas d'avertissement. La date suit l'horloge : une date figée devient périmée seule.
  const hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  writeFileSync(join(dir, "docs/audit-risques.md"), `# Audit de risques et dette technique\n\n> Dernier scan : ${hier}\n\n## Synthèse\n`);
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

test("QUA-298 : verify ne juge jamais un contrat retiré (ni PASS, ni attestable) ; un champ Retiré mal formé est une ERROR", async () => {
  const retire = contrat("QUA-002", "**Retiré** : 2026-11-13 — remplacé par QUA-001.");
  let v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + retire) });
  assert.deepEqual([v.status, v.contracts.map((k) => k.id)], ["PASS", ["QUA-001"]]);
  v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + retire), only: ["QUA-002"] });
  assert.deepEqual(v.contracts, [], "jamais listé, donc jamais attestable");
  v = await verify({ targetDir: await projetVerify(contrat("QUA-002", "**Retiré** : un jour.")) });
  assert.equal(v.status, "ERROR");
  assert.deepEqual(
    v.contracts.map((k) => [k.id, k.status]),
    [["QUA-002", "ERROR"]],
  );
  assert.match(v.contracts[0].reasons.join(), /champ Retiré mal formé « un jour\. »/);
});

test("QUA-298 : un critère d'une preuve de clôture lié à un contrat retiré est rapporté « retiré », ni succès ni échec, et verify le dit", async () => {
  const retire = contrat("QUA-002", "**Retiré** : 2026-11-13 — remplacé par QUA-001.");
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + retire);
  mkdirSync(join(dir, "docs/preuves"), { recursive: true });
  const ligne = (texte, id) => `| ${texte} | \`${id}\` | — | — |\n`;
  const tableau = `| Critère | Contrat | Contrôle | Empreinte |\n|---|---|---|---|\n`;
  writeFileSync(
    join(dir, "docs/preuves/ancien.md"),
    `# Preuve\n\n${tableau}${ligne("Règle retirée", "QUA-002")}${ligne("Règle vivante", "QUA-001")}`,
  );
  let v = await verify({ targetDir: dir });
  assert.deepEqual([v.status, v.proofs], ["PASS", []], "ni échec ni preuve disparue");
  assert.match((v.notices ?? []).join(), /contrat retiré \(QUA-298\), ni succès ni échec : ancien « Règle retirée » \(QUA-002\)/);
  assert.match(formatVerdict(v), /ancien « Règle retirée » \(QUA-002\)/);
  assert.doesNotMatch(formatVerdict(v), /Règle vivante/, "un critère prouvé n'est jamais signalé");
  const seul = { lang: "en", status: "PASS", code: 0, contracts: v.contracts, errors: [], unattached: [] };
  await judgeDurable(seul, {
    root: dir,
    registry: "docs/contracts.md",
    cfg: undefined,
    contracts: [{ id: "QUA-002", retired: "x" }],
    read: () => [],
  });
  assert.deepEqual(
    [seul.status, seul.notices],
    [
      "PASS",
      [
        "Criteria of closed workstreams linked to a retired contract (QUA-298), neither success nor failure: ancien « Règle retirée » (QUA-002)",
      ],
    ],
  );
  writeFileSync(join(dir, "docs/preuves/ancien.md"), `# Preuve\n\n${tableau}${ligne("Règle effacée", "QUA-009")}`);
  v = await verify({ targetDir: dir });
  assert.deepEqual(
    [v.status, v.proofs.map((c) => [c.link, c.status])],
    ["FAIL", [["QUA-009", "unknown-proof"]]],
    "absent du registre : toujours un échec",
  );
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

test("QUA-013 : la sortie d'un contrôle non exécuté ne vaut jamais un succès — sortie humaine, --agent, JSON, verdict repris", async () => {
  // Ce que l'humain lisait à chaque attestation : dans chaque sortie, un contrôle non exécuté est dit tel, jamais « ok ».
  const contrats = contrat("QUA-013", "**Contrôle** : `ci-coverage`") + contrat("QUA-001", "**Contrôle** : `ok`");
  const dir = await projetVerify(contrats);
  const v = await verify({ targetDir: dir });
  assert.equal(v.status, "ERROR");
  assert.notEqual(v.code, 0);
  const k = v.contracts.find((c) => c.id === "QUA-013");
  assert.deepEqual(
    k.checks.map((c) => [c.id, c.status]),
    [["ci-coverage", "not-run"]],
  );
  const humain = formatVerdict(v);
  assert.match(humain, /! ERROR\s+QUA-013/);
  assert.match(humain, /ci-coverage : non exécuté/);
  assert.doesNotMatch(humain, /ci-coverage : (ok|repris)/);
  assert.doesNotMatch(humain, /GOVERNANCE: PASS/);
  const json = verdictJson(v);
  assert.equal(json.status, "error");
  assert.notEqual(json.label, "GOVERNANCE: PASS");
  const resultat = json.results.find((r) => r.id === "QUA-013");
  assert.equal(resultat.status, "error");
  assert.equal(resultat.attestable, false, "un contrôle non exécuté ne se remplace pas par une attestation");
  assert.deepEqual(
    resultat.checks.map((c) => c.status),
    ["not-run"],
  );
  const agent = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify", "--agent"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });
  assert.equal(agent.status, 2, agent.stdout + agent.stderr);
  assert.doesNotMatch(agent.stdout, /GOVERNANCE: PASS/);
  assert.match(agent.stdout, /GOVERNANCE: VERIFY ERROR/);
  // Un verdict « non exécuté » consigné par run-checks n'est jamais repris comme un succès : le contrôle est rejoué.
  const repris = await verify({
    targetDir: await projetReprise(contrat("QUA-001", "**Contrôle** : `ko`"), { verdicts: { ko: { status: "not-run" } } }),
  });
  assert.equal(repris.status, "FAIL");
  assert.equal(repris.contracts[0].checks[0].reusedAt, undefined);
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
    /Fallback, for the human in their own interactive terminal; never run it yourself:\n {2}drwil attest <CONTRACT_ID>/,
  );
  assert.ok(!existsSync(join(dir, ".drwil/evidence")), "verify --agent n'écrit rien, n'atteste rien");
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

// Contrôle confié à la CI (`runAt: ["ci"]`, QUA-208) : verify ne le joue pas, ne le compte jamais passé et le nomme en attente.
// Par la CLI, CI vidée (envTest) : en CI, le moteur le jouerait.
async function projetConfieALaCi(rouge = false) {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `lent`"));
  const cfg = config(dir);
  cfg.ciFiles = [".github/workflows/ia-first.yml"];
  cfg.checks = [
    { id: "ok", name: "toujours vert", run: 'node -e "process.exit(0)"' },
    { id: "lent", name: "lent", run: "node -e \"console.log('rouge en CI'); process.exit(1)\"", runAt: ["ci"] },
    ...(rouge ? [{ id: "ko", name: "toujours rouge", run: 'node -e "process.exit(1)"' }] : []),
  ];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  if (rouge) appendFileSync(join(dir, "docs/contracts.md"), `\n${contrat("QUA-003", "**Contrôle** : `ko`")}`);
  return dir;
}

test("QUA-260 : avec un contrôle confié à la CI et le reste vert, verify rend GOVERNANCE: PASS (CI pending) et nomme les contrôles en attente", async () => {
  const dir = await projetConfieALaCi();
  const humain = cli(dir, "verify");
  assert.equal(humain.status, 0, humain.stdout + humain.stderr);
  assert.match(humain.stdout, /lent : non applicable ici \(confié à la CI \(runAt \["ci"\]\) : pas joué ici, jamais compté passé/);
  assert.match(
    humain.stdout,
    /Contrôles confiés à la CI, non exécutés ici et jamais comptés passés — en attente de la CI de la PR ou MR : lent\n\nGOVERNANCE: PASS \(CI pending\)\n$/,
  );
  assert.doesNotMatch(humain.stdout, /lent : ok/, "jamais passé");
  const agent = cli(dir, "verify", "--agent");
  assert.equal(agent.status, 0, agent.stdout);
  assert.match(
    agent.stdout,
    /^Verdict: GOVERNANCE: PASS \(CI pending\) \(exit 0\)\nNote: Checks left to CI, not run here and never counted as passed — pending the PR or MR CI: lent$/m,
  );
  // Jamais « Work is verified » sous un PASS (CI pending).
  assert.doesNotMatch(agent.stdout, /Work is verified/);
  assert.match(agent.stdout, /^Next step: Work is NOT verified yet: the checks left to CI have not run here\./m);
  const json = JSON.parse(cli(dir, "verify", "--json").stdout);
  assert.deepEqual(
    [json.status, json.label, json.ciPending, json.withCiChecks],
    ["pass", "GOVERNANCE: PASS (CI pending)", ["lent"], undefined],
  );
  // La preuve écrite par --evidence le dit aussi : le verdict lui-même porte la réserve.
  const preuve = cli(dir, "verify", "--evidence");
  assert.equal(preuve.status, 0, preuve.stdout + preuve.stderr);
  const ecrite = readdirSync(join(dir, ".drwil/evidence")).filter((f) => /^verify-.*\.json$/.test(f));
  const ev = JSON.parse(readFileSync(join(dir, ".drwil/evidence", ecrite.at(-1)), "utf8"));
  assert.deepEqual([ev.status, ev.label, ev.ciPending], ["pass", "GOVERNANCE: PASS (CI pending)", ["lent"]]);
  // Le reste en échec : le verdict reste FAIL, jamais PASS (CI pending), et les contrôles en attente restent nommés.
  const rouge = cli(await projetConfieALaCi(true), "verify");
  assert.equal(rouge.status, 1);
  assert.match(rouge.stdout, /en attente de la CI de la PR ou MR : lent\n\nGOVERNANCE: FAIL\n$/);
  // Sans contrôle confié à la CI : PASS sans réserve, sans note.
  const sans = cli(await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`")), "verify", "--agent");
  assert.match(sans.stdout, /^Verdict: GOVERNANCE: PASS \(exit 0\)$/m);
  assert.doesNotMatch(sans.stdout, /CI pending|left to CI/);
});

test("QUA-261 : verify --with-ci-checks joue aussi les contrôles confiés à la CI et dit que l'option est active", async () => {
  const dir = await projetConfieALaCi();
  const humain = cli(dir, "verify", "--with-ci-checks");
  assert.equal(humain.status, 1, "joué en local, son échec remonte");
  assert.match(humain.stdout, /lent : échec/);
  assert.match(humain.stdout, /rouge en CI/);
  assert.match(
    humain.stdout,
    /Option --with-ci-checks active : les contrôles confiés à la CI \(runAt \["ci"\]\) sont joués ici, en local\n\nGOVERNANCE: FAIL\n$/,
  );
  assert.doesNotMatch(humain.stdout, /CI pending|en attente de la CI/);
  const agent = cli(dir, "verify", "--agent", "--with-ci-checks");
  assert.match(agent.stdout, /^Note: Option --with-ci-checks active: the checks left to CI \(runAt \["ci"\]\) are played here, locally$/m);
  const json = JSON.parse(cli(dir, "verify", "--json", "--with-ci-checks").stdout);
  assert.deepEqual([json.status, json.ciPending, json.withCiChecks], ["fail", [], true]);
});

test("QUA-211 : un contrôle réservé par runAt garde son attestation (champ d'exécution) ; la page des contrôles décrit le réglage", async () => {
  const { c1, regler, contrat } = await projetAttesteSurEffet();
  regler({ ...c1, runAt: ["verify", "ci"] });
  assert.equal((await contrat()).status, "ATTESTED", "réserver le contrôle ne change pas son effet");
  regler({ ...c1, runAt: ["verify", "ci"], paths: ["src/**"] });
  assert.equal((await contrat()).status, "MANUAL", "ses paths changés, l'attestation tombe comme pour tout contrôle");
  const depot = fileURLToPath(new URL("../../../", import.meta.url));
  for (const page of [
    join(depot, "packages/drwil/templates/common/base/docs/ia-first/4-checks-in-git.md"),
    join(depot, "docs/ia-first/4-checks-in-git.md"),
  ]) {
    const texte = readFileSync(page, "utf8").replace(/\s+/g, " ");
    for (const attendu of [
      /`runAt`/,
      /\["verify", "ci"\]/,
      /"not run" there \(a warning that blocks neither the commit nor the push\), never "passed"/,
      /`verify` and `ci` must both be listed/,
      /reuse of its last verdict/,
      /attestation citing the check untouched/,
    ])
      assert.match(texte, attendu, page);
  }
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

// QUA-263 : la CI livrée ne rejoue pas deux fois le même commit d'une branche dont la PR ou MR est ouverte, et joue les
// contrôles confiés à la CI (`runAt: ["ci"]`, QUA-208).
test("QUA-263 : CI GitHub livrée — le push d'une branche à PR ouverte saute ses étapes et le dit ; PR, branche principale, branche sans PR ou gh muet : tout est joué", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, ci: "github", git: false }));
  const gh = read(dir, ".github/workflows/ia-first.yml");
  assert.match(gh, /^on: \[push, pull_request\]$/m);
  // La décision de sauter vit dans le job plan, que lit le job exigé `checks` : ni l'un ni l'autre n'est sauté au niveau du job
  // (un job sauté n'est pas rapporté sous son nom) ; `always()` seul tient `checks` en vie quand une tranche échoue.
  const plan = gh.slice(gh.indexOf("\n  plan:\n"), gh.indexOf("\n  shards:\n"));
  const checks = gh.slice(gh.indexOf("\n  checks:\n"), gh.indexOf("\n  alert-if-ci-broken:"));
  assert.doesNotMatch(plan, /^ {4}if:/m, "pas de `if` de job : un job sauté n'est pas rapporté sous son nom");
  assert.equal(/^ {4}if: (.*)$/m.exec(checks)?.[1], "always()");
  assert.match(plan, /permissions:\n\s+contents: read\n\s+pull-requests: read/);
  assert.match(checks, /permissions:\n\s+contents: read\n\s+pull-requests: read/);
  // Chaque étape après la décision est sautée sur un tel push, sauf celles qui ne tournent jamais sur un push de branche.
  const etapes = [...plan.split(/\n {6}- /).slice(2), ...checks.split(/\n {6}- /).slice(2)];
  for (const e of etapes) {
    const jamaisSurPushDeBranche =
      /if: (github\.event_name == 'pull_request'|(always\(\) && )?github\.event_name == 'push' && github\.ref == format)/.test(e);
    assert.ok(
      jamaisSurPushDeBranche || /if: (steps\.pr|needs\.plan)\.outputs\.skip != 'true'/.test(e),
      `étape non sautée : ${e.split("\n")[0]}`,
    );
  }
  assert.ok(
    etapes.some((e) => /run: node \.githooks\/run-checks\.mjs --aggregate-shards/.test(e)),
    "run-checks joué",
  );
  // Le script de décision, joué par bash avec un gh factice.
  const script = /- id: pr\n[\s\S]*?run: \|\n([\s\S]*?)\n {6}- /.exec(plan)[1].replace(/^ {10}/gm, "");
  if (process.platform === "win32") return;
  const outils = tmp();
  const decider = (env, ouvertes) => {
    writeFileSync(join(outils, "gh"), ouvertes === null ? "#!/bin/sh\nexit 1\n" : `#!/bin/sh\necho ${ouvertes}\n`);
    chmodSync(join(outils, "gh"), 0o755);
    const sortie = join(tmp(), "sortie");
    const r = spawnSync("bash", ["-c", script.replace(/\$\{\{ github\.repository \}\}/g, "o/r")], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${outils}:${process.env.PATH}`, GITHUB_OUTPUT: sortie, MAIN: "main", BRANCH: "travail", ...env },
    });
    assert.equal(r.status, 0, r.stderr);
    return { skip: readFileSync(sortie, "utf8").trim(), notice: r.stdout };
  };
  const push = { EVENT: "push", REF: "refs/heads/travail" };
  const saute = decider(push, 1);
  assert.equal(saute.skip, "skip=true");
  assert.match(saute.notice, /::notice::Push skipped: the open pull request of travail already runs these checks\./);
  assert.equal(decider(push, 0).skip, "skip=false", "sans PR : le push teste");
  assert.equal(decider(push, null).skip, "skip=false", "gh muet : le push teste, jamais un saut à l'aveugle");
  assert.equal(decider({ EVENT: "pull_request", REF: "refs/pull/7/merge" }, 1).skip, "skip=false", "la PR joue tout");
  assert.equal(decider({ EVENT: "push", REF: "refs/heads/main", BRANCH: "main" }, 1).skip, "skip=false", "branche principale");
  assert.equal(decider({ EVENT: "push", REF: "refs/tags/v1" }, 1).skip, "skip=false", "tag");
});

test("QUA-263 : CI GitLab livrée — une seule pipeline par push (aucune pipeline de MR), et la CI joue les contrôles confiés à la CI", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, ci: "gitlab", git: false }));
  const gl = read(dir, ".gitlab-ci.yml");
  assert.match(
    gl,
    /^workflow:\n {2}rules:\n {4}- if: \$CI_PIPELINE_SOURCE == "merge_request_event"\n {6}when: never\n {4}- when: always\n/m,
  );
  // Aucun job ne se réclame d'une pipeline de MR, que `workflow: rules` refuse.
  const jobs = gl.slice(gl.indexOf("\nstages:"));
  assert.doesNotMatch(jobs, /merge_request_event|merge_requests/);
  assert.match(jobs, /^checks:\n[\s\S]*node \.githooks\/run-checks\.mjs/m);
  // La CI pose la variable CI (GitHub et GitLab) : le moteur livré y joue un contrôle `["ci"]`, qu'il ne joue pas ailleurs.
  const { runAtVerdict, runContext } = await import(pathToFileURL(join(dir, ".githooks/engine-runat.mjs")).href);
  const confie = { runAt: ["ci"] };
  const options = { ciFiles: [".gitlab-ci.yml"] };
  assert.equal(runContext(null, { CI: "true", DRWIL_CI_REUSE: "1" }), "ci");
  assert.equal(runAtVerdict(confie, "e2e", "ci", options), null, "joué en CI");
  assert.equal(runAtVerdict(confie, "e2e", "verify", options).status, "not-run");
  const couverture = spawnSync(process.execPath, [".githooks/check-control-coverage.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(couverture.status, 0, couverture.stdout + couverture.stderr);
});
