import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bucket, ghJson, look, parseArgs, texts, watch } from "./pr-watch.mjs";
import { changeForge, ciChecks } from "./close-checks.mjs";
import { lookMain, mainCiGate, mainCiRefusal, mainTip, originForge, PROOF } from "./pr-watch-main.mjs";
import { MESSAGES_EN } from "./state-messages-en.mjs";
import { MESSAGES_FR } from "./state-messages-fr.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "pr-watch.mjs");
const tmp = () => mkdtempSync(join(tmpdir(), "drwil-pr-watch-"));

/** gh simulé : réponses successives de `pr view` (la dernière se répète). */
function faux(vues) {
  const appels = [];
  const gh = (args) => {
    appels.push(args.join(" "));
    return vues.length > 1 ? vues.shift() : vues[0];
  };
  return { gh, appels };
}

/**
 * gh simulé par commande : `pr view` (réponses successives, la dernière se répète), puis `run list` et `issue list`
 * de la branche principale (QUA-251), réponses successives elles aussi.
 */
function routeur({ vues, runs = [[{ databaseId: 9, status: "completed", conclusion: "success", url: "u/9" }]], issues = [[]] }) {
  const appels = [];
  const suivant = (liste) => (liste.length > 1 ? liste.shift() : liste[0]);
  const gh = (args) => {
    appels.push(args.join(" "));
    return suivant({ pr: vues, run: runs, issue: issues }[args[0]]);
  };
  return { gh, appels };
}
const SHA = "abcdef0123456789abcdef0123456789abcdef01";
const fusionnee = { number: 7, state: "MERGED", mergeCommit: { oid: SHA } };

const run = (name, status, conclusion = "") => ({ __typename: "CheckRun", name, status, conclusion });
const ouverte = (...controles) => ({ number: 7, state: "OPEN", statusCheckRollup: controles });

test("QUA-100 suivi de PR : verte, rouge, fusionnée, fermée", async () => {
  const T = texts(tmp());
  let r = await watch({
    gh: faux([ouverte(run("checks", "COMPLETED", "SUCCESS"), run("x", "COMPLETED", "SKIPPED"), { context: "ci/ext", state: "SUCCESS" })])
      .gh,
    T,
  });
  assert.deepEqual([r.code, r.message], [0, "[pr-watch] PR #7 : CI verte (3 contrôle(s))."]);
  r = await watch({
    gh: faux([ouverte(run("checks", "COMPLETED", "FAILURE"), run("e2e", "COMPLETED", "CANCELLED"), { context: "ci/ext", state: "ERROR" })])
      .gh,
    T,
  });
  assert.equal(r.code, 1);
  assert.match(r.message, /CI rouge — en échec : checks, e2e, ci\/ext\. Corriger la cause, jamais contourner \(QUA-019\)/);
  r = await watch({ gh: routeur({ vues: [fusionnee] }).gh, T, root: tmp() });
  assert.equal(r.code, 0);
  assert.match(r.message, /^\[pr-watch\] PR #7 fusionnée\.\n/);
  r = await watch({ gh: faux([{ number: 7, state: "CLOSED" }]).gh, T });
  assert.equal(r.code, 1);
});

test("QUA-100 suivi de PR : attend la fin des contrôles en cours, puis la fusion programmée", async () => {
  const { gh, appels } = routeur({ vues: [ouverte(run("checks", "QUEUED")), ouverte({ context: "ci/ext", state: "PENDING" }), fusionnee] });
  const attentes = [];
  const journal = [];
  const r = await watch({
    pr: "7",
    gh,
    sleep: async (ms) => attentes.push(ms),
    interval: 5,
    log: (m) => journal.push(m),
    T: texts(tmp()),
    root: tmp(),
  });
  assert.equal(r.code, 0);
  assert.match(r.message, /fusionnée/);
  assert.deepEqual(attentes, [5, 5]);
  assert.match(journal[0], /PR #7 : 1 contrôle\(s\) en cours/);
  assert.equal(appels[0], "pr view 7 --json number,state,statusCheckRollup,mergeCommit,headRefOid");
  // Attente réelle (minuterie par défaut) et journal par défaut.
  const r2 = await watch({
    gh: faux([ouverte(run("c", "IN_PROGRESS")), ouverte(run("c", "COMPLETED", "NEUTRAL"))]).gh,
    interval: 1,
    T: texts(tmp()),
  });
  assert.equal(r2.code, 0);
});

test("QUA-100 suivi de PR : sans gh, sans contrôle ou après le délai, « non exécuté », jamais « verte » (QUA-013)", async () => {
  const T = texts(tmp());
  let r = await watch({ gh: () => null, T });
  assert.deepEqual(
    [r.code, r.message],
    [2, "[pr-watch] suivi non exécuté : gh injoignable ou non connecté (gh auth login), ou aucune PR pour cette branche"],
  );
  r = await watch({ gh: faux([{ number: 7, state: "OPEN" }]).gh, T });
  assert.deepEqual([r.code, r.message], [2, "[pr-watch] suivi non exécuté : aucun contrôle de CI sur la PR #7"]);
  let t = 0;
  r = await watch({
    gh: faux([ouverte(run("c", "QUEUED"))]).gh,
    timeout: 1,
    now: () => t,
    sleep: async () => {
      t += 61_000;
    },
    T,
  });
  assert.deepEqual(
    [r.code, r.message],
    [2, "[pr-watch] suivi non exécuté : délai de 1 min dépassé, contrôles encore en cours sur la PR #7"],
  );
  assert.equal(bucket({ state: "EXPECTED" }), "pending");
});

test("QUA-100 suivi de PR : lecture de gh, langue, arguments", () => {
  const run =
    (out, status = 0) =>
    () => ({ status, stdout: out });
  assert.deepEqual(ghJson(["x"], run('{"a":1}')), { a: 1 });
  assert.deepEqual(
    ghJson(["x"], run('[{"bucket":"pending"}]', 8)),
    [{ bucket: "pending" }],
    "gh pr checks sort en 8 tant que c'est en cours",
  );
  assert.equal(ghJson(["x"], run("", 1)), null);
  assert.equal(ghJson(["x"], run("pas du json")), null);
  const en = tmp();
  mkdirSync(join(en, ".drwil"));
  writeFileSync(join(en, ".drwil", "ia-first.json"), JSON.stringify({ lang: "en" }));
  assert.match(texts(en).green, /CI green/);
  const fr = tmp();
  mkdirSync(join(fr, ".drwil"));
  writeFileSync(join(fr, ".drwil", "ia-first.json"), JSON.stringify({ lang: "fr" }));
  assert.match(texts(fr).green, /CI verte/);
  assert.deepEqual(parseArgs([]), { pr: undefined, timeout: 30 });
  assert.deepEqual(parseArgs(["12", "--timeout", "5"]), { pr: "12", timeout: 5 });
  assert.deepEqual(parseArgs(["--timeout", "abc"]), { pr: undefined, timeout: 30 });
  assert.deepEqual(
    look(undefined, () => null),
    { state: "not-run" },
  );
});

const posix = { skip: process.platform === "win32" ? "gh factice en script sh" : false };

test("QUA-100 suivi de PR : en ligne de commande, code de sortie 0 fusionnée (CI de la branche principale verte), 1 rouge", posix, () => {
  const outils = tmp();
  const node = spawnSync("which", ["node"], { encoding: "utf8" }).stdout.trim();
  const lancer = (corps, env = {}, cwd = tmp()) => {
    writeFileSync(join(outils, "gh"), `#!/bin/sh\n${corps}\n`);
    chmodSync(join(outils, "gh"), 0o755);
    return spawnSync(node, [SCRIPT, "7"], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, ...env, PATH: `${outils}:${process.env.PATH}` },
    });
  };
  let r = lancer(
    `case "$1" in pr) echo '{"number":7,"state":"MERGED","mergeCommit":{"oid":"${SHA}"}}';; run) echo '[{"databaseId":9,"status":"completed","conclusion":"success","url":"u"}]';; *) echo '[]';; esac`,
  );
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /PR #7 fusionnée/);
  // Lancé d'un sous-dossier d'un dépôt Git : la preuve va à sa racine (QUA-251).
  const depot = tmp();
  spawnSync("git", ["init", "-q", depot]);
  mkdirSync(join(depot, "sous"));
  const vert = `case "$1" in pr) echo '{"number":7,"state":"MERGED","mergeCommit":{"oid":"${SHA}"}}';; run) echo '[{"databaseId":9,"status":"completed","conclusion":"success","url":"u"}]';; *) echo '[]';; esac`;
  assert.equal(lancer(vert, {}, join(depot, "sous")).status, 0);
  assert.equal(JSON.parse(readFileSync(join(depot, ".drwil", "evidence", "main-ci.json"), "utf8")).mergeCommit, SHA);
  r = lancer(`echo '{"number":7,"state":"OPEN","statusCheckRollup":[{"name":"checks","status":"COMPLETED","conclusion":"FAILURE"}]}'`, {
    DRWIL_PR_WATCH_INTERVAL: "1",
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /CI rouge — en échec : checks/);
});

// --- Après la fusion, la CI de la branche principale et sa preuve (QUA-251) ---

const preuve = (racine) => join(racine, ...PROOF);
const vert = { databaseId: 9, status: "completed", conclusion: "success", url: "u/9" };
const lue = (racine) => JSON.parse(readFileSync(preuve(racine), "utf8"));

test("QUA-251 CI de la branche principale verte sur le commit de fusion, aucune issue ouverte : preuve écrite, liée au SHA", async () => {
  const racine = tmp();
  const { gh, appels } = routeur({ vues: [fusionnee], issues: [[{ number: 3, title: "Autre chose : CI broken on the main branch" }]] });
  const r = await watch({ pr: "7", gh, T: texts(racine), root: racine });
  assert.equal(r.code, 0);
  assert.match(r.message, /PR #7 fusionnée\.\n.*CI de la branche principale verte sur le commit de fusion abcdef0, aucune issue/);
  assert.match(r.message, /preuve écrite \(\.drwil\/evidence\/main-ci\.json\)/);
  const ecrite = JSON.parse(readFileSync(preuve(racine), "utf8"));
  assert.deepEqual([ecrite.pr, ecrite.mergeCommit, ecrite.ci, ecrite.run], [7, SHA, "green", 9]);
  assert.ok(appels.includes(`run list --commit ${SHA} --workflow ia-first.yml --event push --json databaseId,status,conclusion,url`));
  assert.ok(appels.some((a) => a.startsWith("issue list --state open --search CI broken on the main branch in:title")));
});

test("QUA-251 CI de la branche principale rouge : dit, code 1, consignée rouge, jamais une preuve", async () => {
  const racine = tmp();
  const runs = [[{ databaseId: 9, status: "completed", conclusion: "failure", url: "u/9" }]];
  const r = await watch({ pr: "7", gh: routeur({ vues: [fusionnee], runs }).gh, T: texts(racine), root: racine });
  assert.equal(r.code, 1);
  assert.match(r.message, /CI de la branche principale ROUGE sur le commit de fusion abcdef0 \(u\/9\) : ne pas lancer la suivante/);
  assert.deepEqual([lue(racine).ci, lue(racine).mergeCommit], ["red", SHA]);
});

test("QUA-251 CI de la branche principale en cours : attend, puis verte ; encore en cours au délai : code 2, aucune preuve", async () => {
  let racine = tmp();
  const journal = [];
  const runs = [[], [{ databaseId: 9, status: "in_progress", conclusion: "" }], [vert]];
  let r = await watch({
    pr: "7",
    gh: routeur({ vues: [fusionnee], runs }).gh,
    sleep: async () => {},
    log: (m) => journal.push(m),
    T: texts(racine),
    root: racine,
  });
  assert.equal(r.code, 0);
  assert.equal(journal.length, 2, "pas encore de run, puis run en cours : deux attentes");
  assert.match(journal[0], /CI de la branche principale en cours sur le commit de fusion abcdef0/);
  racine = tmp();
  let t = 0;
  const enCours = [[{ databaseId: 9, status: "queued", conclusion: "" }]];
  r = await watch({
    pr: "7",
    gh: routeur({ vues: [fusionnee], runs: enCours }).gh,
    timeout: 1,
    now: () => t,
    sleep: async () => {
      t += 61_000;
    },
    T: texts(racine),
    root: racine,
  });
  assert.equal(r.code, 2);
  assert.match(
    r.message,
    /encore en cours sur le commit de fusion abcdef0 au délai : aucune preuve écrite ; relancer `node \.githooks\/pr-watch\.mjs 7`/,
  );
  assert.equal(lue(racine).ci, "pending");
});

test("QUA-251 issue « CI broken on the main branch » ouverte : dit, code 1, aucune preuve, même CI verte", async () => {
  const racine = tmp();
  const issues = [[{ number: 253, title: "CI broken on the main branch (run 1)" }]];
  const r = await watch({ pr: "7", gh: routeur({ vues: [fusionnee], issues }).gh, T: texts(racine), root: racine });
  assert.equal(r.code, 1);
  assert.match(r.message, /issue #253 ouverte \(« CI broken on the main branch \(run 1\) »\)/);
  assert.deepEqual([lue(racine).ci, lue(racine).issue], ["issue", 253]);
  // Issue ouverte pendant que la CI tourne : dit sans attendre.
  const encore = await watch({
    pr: "7",
    gh: routeur({ vues: [fusionnee], runs: [[]], issues }).gh,
    T: texts(racine),
    root: racine,
  });
  assert.equal(encore.code, 1);
});

test("QUA-251 CI de la branche principale non suivie (gh muet, commit de fusion inconnu) : code 2, jamais « verte » (QUA-013)", async () => {
  const racine = tmp();
  let r = await watch({ pr: "7", gh: routeur({ vues: [fusionnee], runs: [null] }).gh, T: texts(racine), root: racine });
  assert.equal(r.code, 2);
  assert.match(r.message, /CI de la branche principale non suivie : gh injoignable/);
  r = await watch({ pr: "7", gh: routeur({ vues: [fusionnee], issues: [null] }).gh, T: texts(racine), root: racine });
  assert.equal(r.code, 2);
  r = await watch({ pr: "7", gh: routeur({ vues: [{ number: 7, state: "MERGED" }] }).gh, T: texts(racine), root: racine });
  assert.equal(r.code, 2);
  assert.match(r.message, /non suivie : commit de fusion inconnu/);
  assert.equal(existsSync(preuve(racine)), false);
  assert.deepEqual(
    lookMain(SHA, () => ({})),
    { state: "not-run" },
  );
  const en = tmp();
  mkdirSync(join(en, ".drwil"));
  writeFileSync(join(en, ".drwil", "ia-first.json"), JSON.stringify({ lang: "en" }));
  r = await watch({ pr: "7", gh: routeur({ vues: [fusionnee] }).gh, T: texts(en), root: en });
  assert.match(r.message, /main branch CI green on merge commit abcdef0, no « CI broken on the main branch » issue open: proof written/);
});

test("QUA-251 refus de la suivante : sans preuve, preuve d'une autre fusion, CI rouge, en cours, issue ouverte, branche principale introuvable ; preuve du sommet : accepté", () => {
  const racine = tmp();
  assert.match(
    mainCiRefusal(racine, MESSAGES_FR, SHA),
    /^next refusé : aucune preuve que la CI de la branche principale est verte sur sa dernière fusion \(abcdef0\) — lancer `node \.githooks\/pr-watch\.mjs/,
  );
  mkdirSync(join(racine, ".drwil", "evidence"), { recursive: true });
  writeFileSync(preuve(racine), JSON.stringify({ pr: 6, mergeCommit: "1234567890", ci: "green" }));
  assert.match(
    mainCiRefusal(racine, MESSAGES_FR, SHA),
    /^next refusé : la CI de la branche principale suivie par pr-watch porte sur le commit 1234567 \(PR #6\), la branche principale à jour est à abcdef0/,
  );
  assert.match(
    mainCiRefusal(racine, MESSAGES_EN, SHA),
    /^next refused: the main branch CI followed by pr-watch is for commit 1234567 \(PR #6\)/,
  );
  writeFileSync(preuve(racine), JSON.stringify({ pr: 7, mergeCommit: SHA, ci: "red" }));
  assert.match(
    mainCiRefusal(racine, MESSAGES_FR, SHA),
    /^next refusé : la CI de la branche principale est ROUGE sur sa dernière fusion \(abcdef0, PR #7\)/,
  );
  writeFileSync(preuve(racine), JSON.stringify({ pr: 7, mergeCommit: SHA, ci: "pending" }));
  assert.match(mainCiRefusal(racine, MESSAGES_FR, SHA), /^next refusé : .*encore en cours.*relancer `node \.githooks\/pr-watch\.mjs 7`/);
  writeFileSync(preuve(racine), JSON.stringify({ pr: 7, mergeCommit: SHA, ci: "issue", issue: 253 }));
  assert.match(mainCiRefusal(racine, MESSAGES_FR, SHA), /^next refusé : l'issue #253 « CI broken on the main branch » est ouverte/);
  assert.match(mainCiRefusal(racine, MESSAGES_EN, SHA), /^next refused: issue #253 « CI broken on the main branch » is open/);
  writeFileSync(preuve(racine), JSON.stringify({ pr: 7, mergeCommit: SHA, ci: "inconnu" }));
  assert.match(mainCiRefusal(racine, MESSAGES_FR, SHA), /aucune preuve/);
  writeFileSync(preuve(racine), "{ illisible");
  assert.match(mainCiRefusal(racine, MESSAGES_FR, SHA), /aucune preuve/);
  writeFileSync(preuve(racine), JSON.stringify({ pr: 7, mergeCommit: SHA, ci: "green" }));
  assert.equal(mainCiRefusal(racine, MESSAGES_FR, SHA), null);
  assert.match(mainCiRefusal(racine, MESSAGES_FR, null), /^next refusé : branche principale introuvable/);
});

test("QUA-251 consignation impossible : CI verte non prouvée (code 2), rouge dite quand même ; run sans adresse", async () => {
  // Un fichier à la place du dossier du dépôt : rien ne peut s'écrire dessous.
  const fichier = join(tmp(), "pas-un-dossier");
  writeFileSync(fichier, "x");
  const T = texts(tmp());
  let r = await watch({ pr: "7", gh: routeur({ vues: [fusionnee] }).gh, T, root: fichier });
  assert.equal(r.code, 2);
  assert.match(r.message, /non suivie : preuve non écrite/);
  const rouge = [[{ databaseId: 9, status: "completed", conclusion: "cancelled" }]];
  r = await watch({ pr: "7", gh: routeur({ vues: [fusionnee], runs: rouge }).gh, T, root: fichier });
  assert.equal(r.code, 1);
  assert.match(r.message, /ROUGE sur le commit de fusion abcdef0 \(9\)/);
});

test("QUA-251 sommet de la branche principale à jour : origin après fetch s'il contient la locale, sinon la locale ; sans branche principale, aucun", () => {
  const git = (cwd, ...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf8" });
  const distant = tmp();
  git(distant, "init", "-q", "-b", "main");
  git(distant, "commit", "-q", "--allow-empty", "-m", "un");
  const local = tmp();
  git(local, "clone", "-q", distant, ".");
  git(distant, "commit", "-q", "--allow-empty", "-m", "deux");
  const sommet = git(distant, "rev-parse", "HEAD").stdout.trim();
  assert.equal(mainTip(local), sommet, "la locale en retard : le sommet est celui d'origin");
  git(local, "reset", "-q", "--hard", "origin/main");
  git(local, "commit", "-q", "--allow-empty", "-m", "locale divergente");
  git(distant, "commit", "-q", "--allow-empty", "-m", "trois");
  assert.equal(mainTip(local), git(local, "rev-parse", "main").stdout.trim(), "divergente : la locale");
  const sans = tmp();
  git(sans, "init", "-q", "-b", "tronc");
  assert.equal(mainTip(sans), null);
});

test("QUA-251 forge non GitHub : jamais de refus, une ligne dit la CI de la branche principale à vérifier à la main ; GitHub ou sans origin : le verrou tient", () => {
  const git = (cwd, ...args) => spawnSync("git", args, { cwd, encoding: "utf8" });
  const racine = tmp();
  git(racine, "init", "-q", "-b", "main");
  assert.equal(originForge(racine), null, "sans origin : aucune forge");
  git(racine, "remote", "add", "origin", "git@github.com:o/r.git");
  assert.equal(originForge(racine), "github");
  git(racine, "remote", "set-url", "origin", "https://gitlab.example.com/o/r.git");
  assert.equal(originForge(racine), "other");
  const fr = mainCiGate(racine, MESSAGES_FR);
  assert.equal(fr.refusal, null, "aucune preuve, et pourtant pas de refus");
  assert.match(
    fr.note,
    /^\nfile : la forge d'origin n'est pas GitHub — pas de preuve possible de la CI de la branche principale sur cette forge, la vérifier à la main/,
  );
  assert.equal(fr.note.trim().split("\n").length, 1, "une seule ligne");
  assert.match(
    mainCiGate(racine, MESSAGES_EN).note,
    /^\nqueue: the origin forge is not GitHub — no proof of the main branch's CI possible on this forge, check it by hand/,
  );
  const sans = tmp();
  git(sans, "init", "-q", "-b", "tronc");
  assert.match(mainCiGate(sans, MESSAGES_FR).refusal, /^next refusé : branche principale introuvable/, "sans origin : le verrou tient");
});

// --- GitLab et contrôles confiés à la CI (QUA-255) ---

/** glab simulé : `mr view` (réponses successives, la dernière se répète), puis `api` (jobs de la pipeline). */
function glabFaux({ vues, jobs = [[]] }) {
  const appels = [];
  const suivant = (liste) => (liste.length > 1 ? liste.shift() : liste[0]);
  const glab = (args) => {
    appels.push(args.join(" "));
    return suivant({ mr: vues, api: jobs }[args[0]]);
  };
  return { glab, appels };
}
const mr = (statut, extra = {}) => ({
  iid: 7,
  state: "opened",
  sha: SHA,
  head_pipeline: statut ? { id: 42, status: statut } : null,
  ...extra,
});
const job = (name, status, allow_failure = false) => ({ name, status, allow_failure });

test("QUA-255 GitLab : la pipeline de la MR verte, rouge (job autorisé à échouer ignoré), absente ou sautée, glab muet ; jamais « verte » sans l'avoir vue", async () => {
  const T = texts(tmp());
  let f = glabFaux({ vues: [mr("success")], jobs: [[job("checks", "success"), job("alert-if-ci-broken", "skipped")]] });
  let r = await watch({ forge: "gitlab", glab: f.glab, pr: "7", T });
  assert.deepEqual([r.code, r.message], [0, "[pr-watch] MR !7 : CI verte (2 contrôle(s))."]);
  assert.deepEqual(f.appels, ["mr view 7 --output json", "api projects/:id/pipelines/42/jobs?per_page=100"]);
  f = glabFaux({ vues: [mr("failed")], jobs: [[job("checks", "failed"), job("optionnel", "failed", true), job("autre", "success")]] });
  r = await watch({ forge: "gitlab", glab: f.glab, T });
  assert.equal(r.code, 1);
  assert.match(r.message, /^\[pr-watch\] MR !7 : CI rouge — en échec : checks\. Corriger la cause/);
  assert.equal(f.appels[0], "mr view --output json", "sans numéro : la MR de la branche");
  r = await watch({ forge: "gitlab", glab: glabFaux({ vues: [mr("canceled")], jobs: [null] }).glab, T });
  assert.match(r.message, /CI rouge — en échec : pipeline #42/, "jobs illisibles : la pipeline nommée");
  r = await watch({ forge: "gitlab", glab: glabFaux({ vues: [mr(null)] }).glab, T });
  assert.deepEqual([r.code, r.message], [2, "[pr-watch] suivi non exécuté : aucun contrôle de CI sur la MR !7"]);
  r = await watch({ forge: "gitlab", glab: glabFaux({ vues: [mr("skipped")] }).glab, T });
  assert.equal(r.code, 2, "sautée : rien n'a tourné, jamais verte (QUA-013)");
  r = await watch({ forge: "gitlab", glab: () => null, T });
  assert.deepEqual(
    [r.code, r.message],
    [2, "[pr-watch] suivi non exécuté : glab injoignable ou non connecté (glab auth login), ou aucune MR pour cette branche"],
  );
  r = await watch({ forge: "gitlab", glab: glabFaux({ vues: [mr("success", { state: "closed" })] }).glab, T });
  assert.deepEqual([r.code, r.message], [1, "[pr-watch] MR !7 fermée sans fusion."]);
});

test("QUA-255 GitLab : attend la pipeline en cours (manuelle comprise) puis verte ; au délai, « non exécuté » ; fusionnée : CI de la MR dite, branche principale à vérifier à la main", async () => {
  const T = texts(tmp());
  const attentes = [];
  const f = glabFaux({
    vues: [mr("running"), mr("manual"), mr("success")],
    jobs: [[job("checks", "running"), job("alert-if-ci-broken", "created")]],
  });
  let r = await watch({ forge: "gitlab", glab: f.glab, sleep: async () => {}, log: (l) => attentes.push(l), T });
  assert.equal(r.code, 0);
  assert.deepEqual(attentes, ["[pr-watch] MR !7 : 2 contrôle(s) en cours…", "[pr-watch] MR !7 : 2 contrôle(s) en cours…"]);
  let t = 0;
  r = await watch({
    forge: "gitlab",
    glab: glabFaux({ vues: [mr("pending")], jobs: [[]] }).glab,
    timeout: 1,
    now: () => t,
    sleep: async () => {
      t += 61_000;
    },
    T,
  });
  assert.deepEqual(
    [r.code, r.message],
    [2, "[pr-watch] suivi non exécuté : délai de 1 min dépassé, contrôles encore en cours sur la MR !7"],
  );
  const fusion = (statut) => mr(statut, { state: "merged", merge_commit_sha: SHA });
  r = await watch({ forge: "gitlab", glab: glabFaux({ vues: [fusion("success")] }).glab, T, root: tmp() });
  assert.equal(r.code, 0);
  assert.equal(
    r.message,
    "[pr-watch] MR !7 fusionnée.\n[pr-watch] CI de la MR à la fusion : verte ; CI de la branche principale non suivie hors GitHub, à vérifier à la main.",
  );
  assert.equal((await watch({ forge: "gitlab", glab: glabFaux({ vues: [fusion("failed")] }).glab, T })).code, 1);
  assert.equal((await watch({ forge: "gitlab", glab: glabFaux({ vues: [fusion(null)] }).glab, T })).code, 2);
});

test("QUA-255 contrôles confiés à la CI : verte les dit prouvés ; rouge, absente, muette ou au délai : le chantier reste en CLOSING (GitHub et GitLab, en anglais)", async () => {
  const T = texts(tmp());
  const ci = ["e2e", "couverture"];
  let r = await watch({ gh: faux([ouverte(run("checks", "COMPLETED", "SUCCESS"))]).gh, ci, T });
  assert.deepEqual(
    [r.code, r.message],
    [0, "[pr-watch] PR #7 : CI verte (1 contrôle(s)). Contrôles confiés à la CI joués par cette CI : e2e, couverture."],
  );
  const reste =
    /\n\[pr-watch\] contrôles confiés à la CI non prouvés \(e2e, couverture\) : la clôture n'est pas acquise, le chantier reste en CLOSING\.$/;
  r = await watch({ gh: faux([ouverte(run("checks", "COMPLETED", "FAILURE"))]).gh, ci, T });
  assert.equal(r.code, 1);
  assert.match(r.message, reste);
  r = await watch({ gh: faux([{ number: 7, state: "OPEN" }]).gh, ci, T });
  assert.match(r.message, reste, "absente");
  r = await watch({ gh: () => null, ci, T });
  assert.match(r.message, reste, "gh muet");
  r = await watch({ forge: "gitlab", glab: glabFaux({ vues: [mr("failed")] }).glab, ci, T });
  assert.match(r.message, reste, "MR rouge");
  r = await watch({ forge: "gitlab", glab: glabFaux({ vues: [mr("success")] }).glab, ci, T });
  assert.match(r.message, /MR !7 : CI verte \(1 contrôle\(s\)\)\. Contrôles confiés à la CI joués par cette CI : e2e, couverture\.$/);
  // Sans contrôle confié à la CI : rien n'est ajouté (QUA-100 inchangé).
  r = await watch({ gh: faux([ouverte(run("checks", "COMPLETED", "FAILURE"))]).gh, T });
  assert.doesNotMatch(r.message, /confiés à la CI/);
  const en = tmp();
  mkdirSync(join(en, ".drwil"));
  writeFileSync(join(en, ".drwil", "ia-first.json"), JSON.stringify({ lang: "en" }));
  r = await watch({ forge: "gitlab", glab: glabFaux({ vues: [mr("failed")] }).glab, ci, T: texts(en) });
  assert.match(r.message, /^\[pr-watch\] MR !7: CI red — failing: pipeline #42\./);
  assert.match(
    r.message,
    /checks left to CI not proven \(e2e, couverture\): the closing is not acquired, the workstream stays in CLOSING\.$/,
  );
});

test("QUA-255 forge du changement (origin GitHub, GitLab, autre avec .gitlab-ci.yml) et contrôles confiés à la CI lus dans la configuration", () => {
  const git = (cwd, ...args) => spawnSync("git", args, { cwd, encoding: "utf8" });
  const racine = tmp();
  git(racine, "init", "-q", "-b", "main");
  assert.equal(changeForge(racine), "github", "sans origin ni .gitlab-ci.yml : gh, comme avant");
  git(racine, "remote", "add", "origin", "https://gitlab.example.com/o/r.git");
  assert.equal(changeForge(racine), "gitlab");
  git(racine, "remote", "set-url", "origin", "git@github.com:o/r.git");
  assert.equal(changeForge(racine), "github");
  git(racine, "remote", "set-url", "origin", "git@forge.interne:o/r.git");
  writeFileSync(join(racine, ".gitlab-ci.yml"), "checks:\n  script: x\n");
  assert.equal(changeForge(racine), "gitlab", "GitLab auto-hébergé : reconnu par sa CI");
  mkdirSync(join(racine, ".drwil"));
  writeFileSync(
    join(racine, ".drwil", "ia-first.json"),
    JSON.stringify({ checks: [{ id: "e2e", runAt: ["ci"] }, { id: "lent", runAt: ["verify", "ci"] }, { id: "vite" }] }),
  );
  assert.deepEqual(ciChecks(racine), ["e2e"]);
});

test(
  "QUA-255 en ligne de commande sur GitLab (origin GitLab, glab factice) : verte 0, rouge 1 et le chantier reste en CLOSING",
  posix,
  () => {
    const outils = tmp();
    const node = spawnSync("which", ["node"], { encoding: "utf8" }).stdout.trim();
    const depot = tmp();
    spawnSync("git", ["init", "-q", depot]);
    spawnSync("git", ["remote", "add", "origin", "https://gitlab.com/o/r.git"], { cwd: depot });
    mkdirSync(join(depot, ".drwil"));
    writeFileSync(join(depot, ".drwil", "ia-first.json"), JSON.stringify({ checks: [{ id: "e2e", runAt: ["ci"] }] }));
    const lancer = (statut) => {
      writeFileSync(
        join(outils, "glab"),
        `#!/bin/sh\ncase "$1" in mr) echo '{"iid":7,"state":"opened","head_pipeline":{"id":42,"status":"${statut}"}}';; *) echo '[{"name":"checks","status":"${statut}"}]';; esac\n`,
      );
      chmodSync(join(outils, "glab"), 0o755);
      return spawnSync(node, [SCRIPT, "7"], {
        cwd: depot,
        encoding: "utf8",
        env: { ...process.env, PATH: `${outils}:${process.env.PATH}` },
      });
    };
    let r = lancer("success");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /MR !7 : CI verte \(1 contrôle\(s\)\)\. Contrôles confiés à la CI joués par cette CI : e2e\./);
    r = lancer("failed");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /MR !7 : CI rouge — en échec : checks[\s\S]*le chantier reste en CLOSING/);
  },
);

test("QUA-255 GitLab : réponses de glab inattendues — vue illisible, jobs illisibles sur une pipeline verte, fusion par squash", async () => {
  const T = texts(tmp());
  assert.equal((await watch({ forge: "gitlab", glab: () => 42, T })).code, 2, "réponse qui n'est pas un objet : non exécuté");
  const r = await watch({ forge: "gitlab", glab: glabFaux({ vues: [mr("success")], jobs: [null] }).glab, T });
  assert.deepEqual([r.code, r.message], [0, "[pr-watch] MR !7 : CI verte (1 contrôle(s))."]);
  const { lookMr } = await import("./close-checks.mjs");
  const squash = mr("success", { state: "merged", squash_commit_sha: SHA });
  assert.deepEqual(lookMr("7", glabFaux({ vues: [squash], jobs: [[]] }).glab), {
    state: "merged",
    number: 7,
    mergeCommit: SHA,
    ci: "green",
    head: SHA,
  });
});
