import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ghRun, mergeAuto, parseArgs } from "./merge-auto.mjs";
import { context, readState, scopingMerge } from "./state.mjs";

// Un hook lancé par `git commit` reçoit GIT_INDEX_FILE, GIT_DIR… : hérités, ils feraient agir les dépôts de test
// (fin de cadrage) sur le dépôt qui lance les tests.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "merge-auto.mjs");
const RACINE = join(dirname(SCRIPT), "..");

/** Projet temporaire dont l'état autorise (ou non) la fusion automatique ; langue au choix. */
function projet({ auto = true, lang } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-merge-auto-"));
  mkdirSync(join(dir, ".drwil"));
  const etat = { version: 1, activity: "CLOSING", active_brief: "docs/projects/x.md", active_request: null, since: null };
  writeFileSync(join(dir, ".drwil", "state.json"), JSON.stringify(auto ? { ...etat, auto_merge: true } : etat));
  if (lang) writeFileSync(join(dir, ".drwil", "ia-first.json"), JSON.stringify({ lang }));
  return dir;
}

const vue = (mergeStateStatus, extra = {}) => ({ number: 7, state: "OPEN", mergeStateStatus, autoMergeRequest: null, ...extra });
const ok = (corps) => ({ status: 0, stdout: JSON.stringify(corps), stderr: "" });

/**
 * gh simulé : `vues` se succèdent (la dernière se répète), `merge` et `update` sont les réponses
 * aux commandes d'écriture ; `appels` garde l'ordre de tout ce qui est lancé.
 */
function faux({ vues, merge = { status: 0, stdout: "", stderr: "" }, update = { status: 0, stdout: "", stderr: "" } }) {
  const appels = [];
  const gh = (args) => {
    appels.push(args.slice(0, 2).join(" "));
    if (args[1] === "view") return vues.length > 1 ? vues.shift() : vues[0];
    return args[1] === "merge" ? merge : update;
  };
  return { gh, appels };
}

const options = (dir, extra) => ({ pr: "7", root: dir, sleep: async () => {}, ...extra });

test("QUA-161 fusion automatique : attend l'état, met à jour si BEHIND, programme, vérifie — dans cet ordre", async () => {
  const dir = projet();
  const { gh, appels } = faux({
    vues: [
      ok(vue("UNKNOWN")),
      ok(vue("BEHIND")),
      ok(vue("UNKNOWN")),
      ok(vue("BLOCKED")),
      ok(vue("BLOCKED", { autoMergeRequest: { mergeMethod: "MERGE" } })),
    ],
  });
  const journal = [];
  const r = await mergeAuto(options(dir, { gh, log: (m) => journal.push(m) }));
  assert.deepEqual(appels, ["pr view", "pr view", "pr update-branch", "pr view", "pr view", "pr merge", "pr view"]);
  assert.deepEqual(
    [r.code, r.message],
    [0, "[merge-auto] fusion de la PR #7 programmée et vérifiée. Suivre : node .githooks/pr-watch.mjs 7"],
  );
  assert.match(journal[0], /en retard sur la branche principale : mise à jour/);
  // Déjà à jour : aucune mise à jour ; PR de la branche courante sans numéro.
  const direct = faux({ vues: [ok(vue("CLEAN", { autoMergeRequest: {} }))] });
  const r2 = await mergeAuto({ root: dir, gh: direct.gh });
  assert.equal(r2.code, 0);
  // Minuterie et journal par défaut, langue française explicite.
  const defauts = faux({ vues: [ok(vue("BEHIND")), ok(vue("UNKNOWN")), ok(vue("CLEAN", { autoMergeRequest: {} }))] });
  const r3 = await mergeAuto({ root: projet({ lang: "fr" }), gh: defauts.gh, interval: 1 });
  assert.equal(r3.code, 0);
  assert.deepEqual(direct.appels, ["pr view", "pr merge", "pr view"]);
});

test("QUA-162 fusion automatique : jamais programmée sur un état inconnu, pas à jour ou en conflit, et jamais dite programmée sans l'avoir vue (QUA-013)", async () => {
  const dir = projet();
  let t = 0;
  const attente = { now: () => t, sleep: async () => (t += 61_000), timeout: 1 };
  for (const statut of ["UNKNOWN", "BEHIND", undefined]) {
    const { gh, appels } = faux({ vues: [ok(vue(statut))] });
    const r = await mergeAuto(options(dir, { gh, ...attente }));
    assert.equal(r.code, 2);
    assert.match(r.message, /^\[merge-auto\] non exécuté : état de la PR #7 non calculé ou pas à jour après 1 min/);
    assert.ok(!appels.includes("pr merge"), "aucune programmation sans état à jour");
  }
  let r = await mergeAuto(options(dir, { gh: faux({ vues: [ok(vue("DIRTY"))] }).gh }));
  assert.deepEqual(
    [r.code, r.message],
    [1, "[merge-auto] refusé : la PR #7 est en conflit avec la branche principale ; résoudre le conflit, puis relancer."],
  );
  r = await mergeAuto(options(dir, { gh: faux({ vues: [ok({ number: 7, state: "MERGED" })] }).gh }));
  assert.deepEqual([r.code, r.message], [1, "[merge-auto] refusé : la PR #7 n'est pas ouverte (MERGED)."]);
  r = await mergeAuto(options(dir, { gh: faux({ vues: [ok(vue("BEHIND"))], update: { status: 1, stdout: "", stderr: "boom" } }).gh }));
  assert.equal(r.code, 2);
  assert.match(r.message, /mise à jour de la PR #7 a échoué.*gh pr update-branch 7/);
  // gh absent, illisible ou en échec : « non exécuté », jamais programmée.
  for (const lecture of [
    { status: null, stdout: null, stderr: null },
    { status: 0, stdout: "pas du json", stderr: "" },
    { status: 1, stdout: "", stderr: "" },
  ]) {
    r = await mergeAuto(options(dir, { gh: () => lecture }));
    assert.deepEqual(
      [r.code, r.message],
      [2, "[merge-auto] non exécuté : gh injoignable ou non connecté (gh auth login), ou aucune PR pour cette branche"],
    );
  }
  // Refus du dépôt, autre refus de gh (sortie vide ou non), programmation non vue.
  r = await mergeAuto(
    options(dir, {
      gh: faux({ vues: [ok(vue("CLEAN"))], merge: { status: 1, stdout: "", stderr: "Auto merge is not allowed for this repository" } }).gh,
    }),
  );
  assert.equal(r.code, 1);
  assert.match(r.message, /auto-merge non autorisé par le dépôt.*Allow auto-merge.*PAS programmée/);
  r = await mergeAuto(
    options(dir, {
      gh: faux({ vues: [ok(vue("CLEAN"))], merge: { status: 1, stdout: "", stderr: "pull request is in clean status" } }).gh,
    }),
  );
  assert.match(r.message, /refusé par gh pour la PR #7 : pull request is in clean status La fusion n'est PAS programmée/);
  r = await mergeAuto(options(dir, { gh: faux({ vues: [ok(vue("CLEAN"))], merge: { status: null, stdout: null, stderr: null } }).gh }));
  assert.match(r.message, /refusé par gh pour la PR #7 : \(\?\)/);
  r = await mergeAuto(options(dir, { gh: faux({ vues: [ok(vue("CLEAN"))] }).gh }));
  assert.deepEqual(
    [r.code, r.message],
    [1, "[merge-auto] la fusion de la PR #7 n'apparaît pas programmée (autoMergeRequest vide) : la fusion n'est PAS programmée."],
  );
  r = await mergeAuto(options(dir, { gh: faux({ vues: [ok(vue("CLEAN")), { status: 1, stdout: "", stderr: "" }] }).gh }));
  assert.equal(r.code, 1);
});

test("QUA-163 fusion automatique : sans l'autorisation du lancement, l'outil refuse sans rien lancer ; messages en anglais", async () => {
  let lance = false;
  const gh = () => {
    lance = true;
  };
  for (const dir of [projet({ auto: false }), mkdtempSync(join(tmpdir(), "drwil-merge-auto-vide-"))]) {
    const r = await mergeAuto({ pr: "7", root: dir, gh });
    assert.equal(r.code, 1);
    assert.match(r.message, /la fusion automatique n'a pas été autorisée au lancement/);
  }
  assert.equal(lance, false);
  const en = projet({ auto: false, lang: "en" });
  assert.match((await mergeAuto({ root: en, gh })).message, /automatic merge was not authorised at start/);
  const enOk = projet({ lang: "en" });
  const r = await mergeAuto(options(enOk, { gh: faux({ vues: [ok(vue("CLEAN", { autoMergeRequest: {} }))] }).gh }));
  assert.equal(r.message, "[merge-auto] merge of PR #7 scheduled and checked. Follow it: node .githooks/pr-watch.mjs 7");
  const mauvais = projet({ lang: "en" });
  writeFileSync(join(mauvais, ".drwil", "ia-first.json"), "{ pas du json");
  const ill = await mergeAuto(options(mauvais, { gh: faux({ vues: [ok(vue("CLEAN", { autoMergeRequest: {} }))] }).gh }));
  assert.match(ill.message, /programmée et vérifiée/, "réglage de langue illisible : français");
});

test("QUA-163 fusion automatique : ligne de commande et arguments", {
  skip: process.platform === "win32" ? "gh factice en script sh" : false,
}, () => {
  assert.deepEqual(parseArgs([]), { pr: undefined, timeout: 5 });
  assert.deepEqual(parseArgs(["12", "--timeout", "2"]), { pr: "12", timeout: 2 });
  assert.deepEqual(parseArgs(["--timeout", "abc"]), { pr: undefined, timeout: 5 });
  assert.equal(typeof ghRun, "function");
  const outils = mkdtempSync(join(tmpdir(), "drwil-merge-auto-bin-"));
  const node = spawnSync("which", ["node"], { encoding: "utf8" }).stdout.trim();
  const lancer = (corps, dir, env = {}) => {
    writeFileSync(join(outils, "gh"), `#!/bin/sh\n${corps}\n`);
    chmodSync(join(outils, "gh"), 0o755);
    return spawnSync(node, [SCRIPT, "7"], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, ...env, PATH: `${outils}:${process.env.PATH}` },
    });
  };
  let r = lancer(`echo '{"number":7,"state":"OPEN","mergeStateStatus":"CLEAN","autoMergeRequest":{"mergeMethod":"MERGE"}}'`, projet());
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /fusion de la PR #7 programmée et vérifiée/);
  r = lancer(`exit 1`, projet(), { DRWIL_MERGE_AUTO_INTERVAL: "1" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /non exécuté : gh injoignable/);
  r = lancer(`exit 1`, projet({ auto: false }));
  assert.equal(r.status, 1);
});

test("QUA-164 fusion automatique : la consigne de l'état et le skill appellent l'outil, le suivi et le retour en SCOPING restent", () => {
  const gabarit = (...p) => readFileSync(join(RACINE, "packages/drwil/templates/common", ...p), "utf8").replace(/\s+/g, " ");
  const consigne = gabarit("base/.githooks/state-context-texts.mjs");
  const skill = gabarit("tools/claude/.claude/skills/start-a-workstream/SKILL.md");
  for (const texte of [
    consigne.match(/autoMerge:\s*"Fusion automatique[^"]*"/)[0],
    consigne.match(/autoMerge:\s*"Automatic merge[^"]*"/)[0],
    skill,
  ]) {
    assert.match(texte, /`node \.githooks\/merge-auto\.mjs <(numéro|number)>`/);
    assert.doesNotMatch(texte, /gh pr update-branch/);
    assert.match(texte, /pr-watch\.mjs <(numéro|number)>/);
    assert.match(texte, /reopen/);
  }
  assert.ok(consigne.indexOf("merge-auto.mjs") < consigne.indexOf("pr-watch.mjs"));
});

/** Projet en SCOPING, dépôt git sur `branche`, avec (ou non) l'autorisation de fin de cadrage. */
function cadrage({ branche = "cadrage/essai", autorise = true, lang } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-merge-auto-cadrage-"));
  mkdirSync(join(dir, ".drwil"));
  if (lang) writeFileSync(join(dir, ".drwil", "ia-first.json"), JSON.stringify({ lang }));
  const git = (...a) => spawnSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q", "-b", "master");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "init");
  git("checkout", "-q", "-b", branche);
  if (autorise) assert.equal(scopingMerge(dir, "auto").code, 0);
  return dir;
}

test("QUA-188 fusion automatique en SCOPING : la réponse « Automatic merge » ouvre l'outil pour la PR de sa branche seulement", async () => {
  const dir = cadrage();
  const programme = faux({
    vues: [ok(vue("CLEAN", { headRefName: "cadrage/essai" })), ok(vue("CLEAN", { headRefName: "cadrage/essai", autoMergeRequest: {} }))],
  });
  const r = await mergeAuto(options(dir, { gh: programme.gh }));
  assert.deepEqual([r.code, programme.appels], [0, ["pr view", "pr merge", "pr view"]]);
  // La PR d'une autre branche : refusée, rien n'est programmé.
  const autre = faux({ vues: [ok(vue("CLEAN", { headRefName: "workstream/autre" }))] });
  const refus = await mergeAuto(options(dir, { gh: autre.gh }));
  assert.equal(refus.code, 1);
  assert.match(refus.message, /la PR #7 est celle de la branche workstream\/autre.*autorisée que pour la branche cadrage\/essai/);
  assert.deepEqual(autre.appels, ["pr view"]);
  const en = cadrage({ lang: "en" });
  assert.match(
    (await mergeAuto(options(en, { gh: faux({ vues: [ok(vue("CLEAN", { headRefName: "x" }))] }).gh }))).message,
    /authorised for branch cadrage\/essai only/,
  );
  // Le rappel d'état le dit, dans les deux langues.
  assert.match(
    context(readState(dir), dir),
    /Fusion automatique de la PR de cadrage autorisée pour la branche cadrage\/essai.*merge-auto\.mjs <numéro>.*pr-watch\.mjs <numéro>/s,
  );
  assert.match(context(readState(en), en), /Automatic merge of the scoping PR authorised for branch cadrage\/essai/);
  // Sans la réponse, en SCOPING : refus comme avant, sans aucun appel à gh.
  let lance = false;
  const sans = await mergeAuto({ pr: "7", root: cadrage({ autorise: false }), gh: () => (lance = true) });
  assert.equal(sans.code, 1);
  assert.match(sans.message, /ni en fin de cadrage/);
  assert.equal(lance, false);
});

test("QUA-189 « Manual merge » et « Continue scoping » ne programment rien ; « Continue scoping » garde la même branche", async () => {
  for (const reponse of ["manual", "continue"]) {
    const dir = cadrage();
    const r = scopingMerge(dir, reponse);
    assert.equal(r.code, 0);
    assert.equal(readState(dir).state.scoping_merge, undefined, reponse);
    let lance = false;
    const refus = await mergeAuto({ pr: "7", root: dir, gh: () => (lance = true) });
    assert.deepEqual([refus.code, lance], [1, false], reponse);
    if (reponse === "continue")
      assert.match(r.message, /la PR reste ouverte et les cadrages suivants se commitent sur la même branche \(cadrage\/essai\)/);
    else assert.match(r.message, /reste un geste humain/);
  }
  const skill = readFileSync(
    join(RACINE, "packages/drwil/templates/common/tools/claude/.claude/skills/scope-a-workstream/SKILL.md"),
    "utf8",
  ).replace(/\s+/g, " ");
  assert.match(
    skill,
    /\*\*Continue scoping\*\*: nothing is scheduled; the PR stays open and the next scopings are committed on \*\*the same branch\*\* \(one branch, one PR, no new branch\)/,
  );
  assert.match(skill, /\*\*Manual merge\*\*: nothing is scheduled/);
});
