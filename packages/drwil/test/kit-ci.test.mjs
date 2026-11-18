// Tests du kit, thème ci : branche principale et push, CI livrée (GitHub, GitLab) et couverture des contrôles.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, cpSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { init, doctor } from "../dist/index.js";
import { tmp, quiet, checks, git, read, config, enAvertissement, executable, DEPOT } from "./kit-commun.mjs";

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
