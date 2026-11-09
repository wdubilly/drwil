import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchPrevious, hooksChanged, prContext } from "./run-checks-pr.mjs";

const AVANT = process.cwd();
let dossiers = [];
afterEach(() => {
  process.chdir(AVANT);
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const git = (racine, ...args) =>
  spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: racine, encoding: "utf8" });
const ecrire = (chemin, contenu) => {
  mkdirSync(join(chemin, ".."), { recursive: true });
  writeFileSync(chemin, contenu);
};

/** Un dépôt d'essai dont `origin` est lui-même : la branche principale « main », puis la branche « feature » d'un commit de plus. */
function depot() {
  const racine = mkdtempSync(join(tmpdir(), "drwil-run-pr-"));
  dossiers.push(racine);
  git(racine, "init", "-q", "-b", "main");
  ecrire(join(racine, ".githooks/h.mjs"), "un\n");
  git(racine, "add", "-A");
  git(racine, "commit", "-qm", "base");
  git(racine, "remote", "add", "origin", racine);
  const base = git(racine, "rev-parse", "HEAD").stdout.trim();
  git(racine, "checkout", "-q", "-b", "feature");
  ecrire(join(racine, "a.txt"), "a\n");
  git(racine, "add", "-A");
  git(racine, "commit", "-qm", "suite");
  process.chdir(racine);
  return { racine, base, head: git(racine, "rev-parse", "HEAD").stdout.trim() };
}

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

test("QUA-291 : hors CI ou sans identité de PR, la CI ne décrit aucune PR : rien n'est écrit ni lu", () => {
  assert.equal(prContext({ DRWIL_PR_ID: "o/d#1", DRWIL_PR_HEAD: SHA_A, DRWIL_PR_BASE: SHA_B }), null);
  assert.equal(prContext({ CI: "true" }), null);
  // Identité dite par une autre CI : la tête et la base doivent être des empreintes lisibles.
  const dite = {
    CI: "true",
    DRWIL_PR_ID: "o/d#1",
    DRWIL_PR_HEAD: SHA_A,
    DRWIL_PR_BASE: SHA_B,
    DRWIL_PR_RUN: "5",
    DRWIL_PR_PREVIOUS_RUN: "4",
  };
  assert.deepEqual(prContext(dite), { id: "o/d#1", head: SHA_A, base: SHA_B, run: "5", previousRun: "4" });
  assert.equal(prContext({ ...dite, DRWIL_PR_HEAD: "--exec" }), null);
  assert.equal(prContext({ ...dite, DRWIL_PR_BASE: "x" }), null);
});

test("QUA-291 : GitHub — l'identité est celle d'une PR du dépôt, jamais celle d'une branche poussée, d'un fork ou d'un événement illisible", () => {
  const racine = mkdtempSync(join(tmpdir(), "drwil-run-pr-"));
  dossiers.push(racine);
  process.chdir(racine);
  const evenement = (pr) => {
    ecrire(join(racine, "event.json"), JSON.stringify(pr === undefined ? {} : { pull_request: pr }));
    return {
      CI: "true",
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_EVENT_PATH: join(racine, "event.json"),
      GITHUB_REPOSITORY: "o/d",
      GITHUB_RUN_ID: "42",
    };
  };
  const pr = { number: 7, head: { sha: SHA_A, repo: { full_name: "o/d" } }, base: { sha: SHA_B } };
  assert.deepEqual(prContext(evenement(pr)), { id: "o/d#7", head: SHA_A, base: SHA_B, run: "42", previousRun: undefined });
  assert.equal(prContext({ ...evenement(pr), GITHUB_EVENT_NAME: "push" }), null);
  assert.equal(prContext(evenement({ ...pr, head: { sha: SHA_A, repo: { full_name: "autre/d" } } })), null, "fork");
  assert.equal(prContext(evenement({ ...pr, head: { sha: SHA_A, repo: null } })), null, "dépôt supprimé");
  assert.equal(prContext(evenement(undefined)), null);
  assert.equal(prContext({ ...evenement(pr), GITHUB_EVENT_PATH: join(racine, "absent.json") }), null);
  // Le run que le téléchargement a lu est celui que la passe attend ; la CI peut aussi le dire.
  ecrire(join(racine, ".drwil/evidence/pr-previous/run"), "41\n");
  assert.equal(prContext(evenement(pr)).previousRun, "41");
  assert.equal(prContext({ ...evenement(pr), DRWIL_PR_PREVIOUS_RUN: "40" }).previousRun, "40");
});

test("QUA-291 : GitLab — la branche est l'identité de la merge request (une seule pipeline par push) ; la branche principale, une étiquette ou une branche sans base lisible n'en ont pas", () => {
  const { base, head } = depot();
  const gitlab = {
    CI: "true",
    GITLAB_CI: "true",
    CI_PROJECT_ID: "9",
    CI_COMMIT_BRANCH: "feature",
    CI_DEFAULT_BRANCH: "main",
    CI_COMMIT_SHA: head,
    CI_PIPELINE_ID: "300",
  };
  assert.deepEqual(prContext(gitlab), { id: "9:feature", head, base, run: "300", previousRun: undefined });
  assert.equal(prContext({ ...gitlab, CI_MERGE_REQUEST_TARGET_BRANCH_NAME: "main" }).base, base);
  assert.equal(prContext({ ...gitlab, CI_MERGE_REQUEST_TARGET_BRANCH_NAME: "absente" }), null, "base introuvable");
  assert.equal(prContext({ ...gitlab, CI_COMMIT_BRANCH: "main" }), null);
  assert.equal(prContext({ ...gitlab, CI_COMMIT_TAG: "v1" }), null);
  assert.equal(prContext({ ...gitlab, CI_COMMIT_BRANCH: "" }), null);
  // Ni GitHub ni GitLab : une autre CI doit dire l'identité elle-même.
  assert.equal(prContext({ CI: "true", CI_COMMIT_BRANCH: "feature" }), null);
});

test("QUA-290 : une PR qui change les hooks ou la configuration est reconnue (ou une base illisible : par prudence, changée)", () => {
  const { racine, base, head } = depot();
  assert.equal(hooksChanged({ base: head }), false);
  assert.equal(hooksChanged({ base }), false, "seul un fichier hors des hooks a changé");
  ecrire(join(racine, ".githooks/h.mjs"), "deux\n");
  assert.equal(hooksChanged({ base }), true);
  git(racine, "checkout", "-q", ".githooks");
  ecrire(join(racine, ".drwil/ia-first.json"), "{}\n");
  git(racine, "add", "-A");
  assert.equal(hooksChanged({ base }), true, "configuration");
  assert.equal(hooksChanged({ base: SHA_A }), true, "base inconnue");
});

const course = (id, { chemin = ".github/workflows/ia-first.yml", tete = "o/d", pr = 7 } = {}) => ({
  id,
  path: chemin,
  head_repository: { full_name: tete },
  repository: { full_name: "o/d" },
  pull_requests: [{ number: pr }],
});
function github(racine) {
  const evenement = join(racine, "event.json");
  ecrire(
    evenement,
    JSON.stringify({ pull_request: { number: 7, head: { sha: SHA_A, repo: { full_name: "o/d" } }, base: { sha: SHA_B } } }),
  );
  return {
    CI: "true",
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "pull_request",
    GITHUB_EVENT_PATH: evenement,
    GITHUB_REPOSITORY: "o/d",
    GITHUB_HEAD_REF: "ma/branche",
    GITHUB_RUN_ID: "42",
  };
}

test("QUA-291 : GitHub — seul le run précédent de cette même PR est téléchargé ; au moindre doute rien n'est repris", () => {
  const racine = mkdtempSync(join(tmpdir(), "drwil-run-pr-"));
  dossiers.push(racine);
  process.chdir(racine);
  const appels = [];
  const fabrique =
    ({ runs, echecs = [] }) =>
    (cmd, args) => {
      appels.push([cmd, ...args]);
      if (args[0] === "api") return { status: 0, stdout: runs };
      if (echecs.includes(args[2])) return { status: 1 };
      ecrire(join(racine, args[args.indexOf("--dir") + 1], "pr-verdicts.json"), "{}");
      return { status: 0 };
    };
  const runs = JSON.stringify({
    workflow_runs: [
      course(42),
      course(40, { pr: 8 }),
      course(39, { tete: "fork/d" }),
      course(38, { chemin: ".github/workflows/autre.yml" }),
      course(37),
      course(36),
    ],
  });
  // Les runs de la même PR (hors le run courant), du même dépôt, du même workflow : du plus récent au plus ancien, le premier qui a l'artefact.
  assert.equal(fetchPrevious(undefined, github(racine), fabrique({ runs, echecs: ["37"] })), "36");
  assert.deepEqual(appels[0].slice(0, 2), ["gh", "api"]);
  assert.match(appels[0][2], /^repos\/o\/d\/actions\/runs\?event=pull_request&branch=ma%2Fbranche&/);
  assert.deepEqual(
    appels.slice(1).map((a) => a[3]),
    ["37", "36"],
  );
  assert.equal(readFileSync(join(racine, ".drwil/evidence/pr-previous/run"), "utf8"), "36");
  // Le run désigné par le plan est pris tel quel, sans interroger l'API.
  appels.length = 0;
  assert.equal(fetchPrevious("37", github(racine), fabrique({ runs })), "37");
  assert.deepEqual(
    appels.map((a) => a[1]),
    ["run"],
  );
  assert.equal(readFileSync(join(racine, ".drwil/evidence/pr-previous/run"), "utf8"), "37");
  // Rien à lire : le dossier n'existe plus, la passe rejoue tout.
  for (const sans of [
    fabrique({ runs: "pas du JSON" }),
    fabrique({ runs: JSON.stringify({ workflow_runs: [course(42), course(40, { pr: 8 })] }) }),
    fabrique({ runs, echecs: ["37", "36"] }),
  ]) {
    assert.equal(fetchPrevious(undefined, github(racine), sans), null);
    assert.equal(existsSync(join(racine, ".drwil/evidence/pr-previous")), false);
  }
  // Pas de PR (un fork, un push) : aucun appel.
  appels.length = 0;
  assert.equal(fetchPrevious(undefined, { CI: "true" }, fabrique({ runs })), null);
  assert.deepEqual(appels, []);
});

test("QUA-291 : GitLab — les deux fichiers de verdicts viennent de l'artefact du job checks du dernier pipeline réussi de la branche ; l'un manque, rien n'est repris", () => {
  const { head } = depot();
  const env = {
    CI: "true",
    GITLAB_CI: "true",
    CI_PROJECT_ID: "9",
    CI_COMMIT_BRANCH: "feature",
    CI_DEFAULT_BRANCH: "main",
    CI_COMMIT_SHA: head,
    CI_PIPELINE_ID: "300",
    CI_API_V4_URL: "https://gl/api/v4",
    CI_JOB_TOKEN: "jeton",
  };
  const appels = [];
  const exec = (manque) => (cmd, args) => {
    appels.push([cmd, ...args]);
    return { status: args.at(-1).includes(manque) ? 22 : 0 };
  };
  assert.equal(fetchPrevious(undefined, { ...env, CI_COMMIT_BRANCH: "feature" }, exec("rien")), "");
  assert.deepEqual(
    appels.map((a) => a.at(-1)),
    [
      "https://gl/api/v4/projects/9/jobs/artifacts/feature/raw/.drwil/evidence/pr-verdicts/pr-verdicts.json?job=checks",
      "https://gl/api/v4/projects/9/jobs/artifacts/feature/raw/.drwil/evidence/pr-verdicts/pr-verdicts.sum?job=checks",
    ],
  );
  assert.ok(appels[0].includes("JOB-TOKEN: jeton"));
  assert.equal(fetchPrevious(undefined, env, exec(".sum")), null);
  assert.equal(existsSync(".drwil/evidence/pr-previous"), false);
});
