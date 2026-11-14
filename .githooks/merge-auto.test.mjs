import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ghRun, mergeAuto, parseArgs } from "./merge-auto.mjs";
import { context, readState } from "./state.mjs";

// Un hook lancé par `git commit` reçoit GIT_INDEX_FILE, GIT_DIR… : hérités, ils feraient agir les dépôts de test
// (fin de cadrage) sur le dépôt qui lance les tests.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "merge-auto.mjs");
const RACINE = join(dirname(SCRIPT), "..");

/** Projet temporaire en CLOSING, avec ou sans la marque héritée `auto_merge` (sans effet) ; langue au choix. */
function projet({ auto = false, lang, etat: extra = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-merge-auto-"));
  mkdirSync(join(dir, ".drwil"));
  const etat = { version: 1, activity: "CLOSING", active_brief: "docs/projects/x.md", active_request: null, since: null, ...extra };
  writeFileSync(join(dir, ".drwil", "state.json"), JSON.stringify(auto ? { ...etat, auto_merge: true } : etat));
  if (lang) writeFileSync(join(dir, ".drwil", "ia-first.json"), JSON.stringify({ lang }));
  return dir;
}

const BRANCHE = "workstream/x";
const vue = (mergeStateStatus, extra = {}) => ({
  number: 7,
  state: "OPEN",
  headRefName: BRANCHE,
  mergeStateStatus,
  autoMergeRequest: null,
  ...extra,
});
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

const options = (dir, extra) => ({ pr: "7", root: dir, branch: BRANCHE, sleep: async () => {}, ...extra });

/** Fait de `dir` un dépôt git sur `branche` (branche courante lue par merge-auto). */
function depotGit(dir, branche = BRANCHE) {
  const git = (...a) => spawnSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q", "-b", "master");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "init");
  git("checkout", "-q", "-b", branche);
  return dir;
}

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
  const r2 = await mergeAuto({ root: dir, branch: BRANCHE, gh: direct.gh });
  assert.equal(r2.code, 0);
  // Minuterie et journal par défaut, langue française explicite.
  const defauts = faux({ vues: [ok(vue("BEHIND")), ok(vue("UNKNOWN")), ok(vue("CLEAN", { autoMergeRequest: {} }))] });
  const r3 = await mergeAuto({ root: projet({ lang: "fr" }), branch: BRANCHE, gh: defauts.gh, interval: 1 });
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
  // La PR d'une autre branche que la branche courante : refusée après une seule lecture, rien n'est programmé.
  const autre = faux({ vues: [ok(vue("CLEAN", { headRefName: "workstream/autre" }))] });
  let r = await mergeAuto(options(dir, { gh: autre.gh }));
  assert.deepEqual(
    [r.code, r.message, autre.appels],
    [
      1,
      "[merge-auto] refusé : la PR #7 est celle de la branche workstream/autre, pas de la branche courante workstream/x ; seule la PR de la branche courante se programme. La fusion n'est PAS programmée.",
      ["pr view"],
    ],
  );
  r = await mergeAuto(options(projet({ lang: "en" }), { gh: faux({ vues: [ok(vue("CLEAN", { headRefName: "y" }))] }).gh }));
  assert.match(r.message, /^\[merge-auto\] refused: PR #7 is the one of branch y, not of the current branch workstream\/x/);
  r = await mergeAuto(options(dir, { gh: faux({ vues: [ok({ number: 7, state: "OPEN", mergeStateStatus: "CLEAN" })] }).gh }));
  assert.match(r.message, /est celle de la branche \?, pas de la branche courante/, "branche de la PR illisible : refusée");
  // Branche courante inconnue (hors dépôt git, tête détachée) : refus sans appel à gh.
  let lance = false;
  for (const branche of [undefined, null]) {
    r = await mergeAuto({ pr: "7", root: dir, ...(branche === null ? { branch: null } : {}), gh: () => (lance = true) });
    assert.deepEqual([r.code, /branche git courante inconnue/.test(r.message)], [1, true]);
  }
  const detachee = depotGit(projet());
  spawnSync("git", ["checkout", "-q", "--detach"], { cwd: detachee });
  r = await mergeAuto({ pr: "7", root: detachee, gh: () => (lance = true) });
  assert.equal(r.code, 1);
  assert.match((await mergeAuto({ root: projet({ lang: "en" }), gh: () => (lance = true) })).message, /current git branch unknown/);
  assert.equal(lance, false);
  r = await mergeAuto(options(dir, { gh: faux({ vues: [ok(vue("DIRTY"))] }).gh }));
  assert.deepEqual(
    [r.code, r.message],
    [1, "[merge-auto] refusé : la PR #7 est en conflit avec la branche principale ; résoudre le conflit, puis relancer."],
  );
  r = await mergeAuto(options(dir, { gh: faux({ vues: [ok({ number: 7, state: "MERGED", headRefName: BRANCHE })] }).gh }));
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
  // CI déjà verte : `gh pr merge --auto` fusionne sur-le-champ ; succès dit « fusionnée », jamais « programmée ».
  const fusion = faux({ vues: [ok(vue("CLEAN")), ok(vue("CLEAN", { state: "MERGED" }))] });
  r = await mergeAuto(options(dir, { gh: fusion.gh }));
  assert.deepEqual(
    [r.code, r.message],
    [
      0,
      "[merge-auto] PR #7 fusionnée par la commande elle-même (toute sa CI était déjà verte). Suivre la CI de la branche principale : node .githooks/pr-watch.mjs 7",
    ],
  );
  assert.doesNotMatch(r.message, /programmée/);
  assert.deepEqual(fusion.appels, ["pr view", "pr merge", "pr view"]);
  r = await mergeAuto(
    options(projet({ lang: "en" }), { gh: faux({ vues: [ok(vue("CLEAN")), ok(vue("CLEAN", { state: "MERGED" }))] }).gh }),
  );
  assert.deepEqual([r.code, /^\[merge-auto\] PR #7 merged by the command itself/.test(r.message)], [0, true]);
  assert.doesNotMatch(r.message, /scheduled/);
  // Ni programmée ni fusionnée (fermée) : échec.
  r = await mergeAuto(options(dir, { gh: faux({ vues: [ok(vue("CLEAN")), ok(vue("CLEAN", { state: "CLOSED" }))] }).gh }));
  assert.equal(r.code, 1);
  assert.match(r.message, /PAS programmée/);
});

test("QUA-163 fusion automatique : sans autorisation, en CLOSING comme en SCOPING, la PR de la branche courante est programmée ; marques héritées sans effet ; messages en anglais", async () => {
  const sansEtat = mkdtempSync(join(tmpdir(), "drwil-merge-auto-vide-"));
  const cadrage = projet({ etat: { activity: "SCOPING", active_brief: null } });
  for (const dir of [projet(), sansEtat, cadrage, projet({ auto: true })]) {
    const programme = faux({ vues: [ok(vue("CLEAN")), ok(vue("CLEAN", { autoMergeRequest: {} }))] });
    const r = await mergeAuto(options(dir, { gh: programme.gh }));
    assert.deepEqual([r.code, programme.appels], [0, ["pr view", "pr merge", "pr view"]], dir);
    assert.match(r.message, /programmée et vérifiée/);
  }
  // Marque héritée de fin de cadrage pour une autre branche : sans effet, seule la branche courante compte.
  const herite = projet({ etat: { activity: "SCOPING", active_brief: null, scoping_merge: { branch: "cadrage/autre" } } });
  const r0 = await mergeAuto(options(herite, { gh: faux({ vues: [ok(vue("CLEAN", { autoMergeRequest: {} }))] }).gh }));
  assert.equal(r0.code, 0);
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
  let r = lancer(
    `echo '{"number":7,"state":"OPEN","headRefName":"workstream/x","mergeStateStatus":"CLEAN","autoMergeRequest":{"mergeMethod":"MERGE"}}'`,
    depotGit(projet()),
  );
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /fusion de la PR #7 programmée et vérifiée/);
  r = lancer(`exit 1`, depotGit(projet()), { DRWIL_MERGE_AUTO_INTERVAL: "1" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /non exécuté : gh injoignable/);
  // Hors dépôt git : branche courante inconnue, refus.
  r = lancer(`exit 1`, projet());
  assert.equal(r.status, 1);
  assert.match(r.stderr, /branche git courante inconnue/);
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
  // Sur GitLab, la consigne nomme les équivalents glab de chaque étape, sans laisser GitHub seul.
  for (const texte of [
    consigne.match(/autoMerge:\s*"Fusion automatique[^"]*"/)[0],
    consigne.match(/autoMerge:\s*"Automatic merge[^"]*"/)[0],
  ]) {
    assert.match(
      texte,
      /mergeStateStatus.*detailed_merge_status.*glab mr rebase.*glab mr merge --auto-merge.*merge_when_pipeline_succeeds/,
    );
    assert.match(texte, /`gh` (ou|or) `glab`/);
    assert.doesNotMatch(texte, /GitHub (ait|has) calculé|GitHub has computed/);
  }
  // Le suivi de la PR par la session principale (file, file parallèle) vaut aussi pour la MR, par glab.
  for (const phrase of ["sur GitLab la MR par `glab`", "on GitLab the MR with `glab`"])
    assert.equal(consigne.split(phrase).length - 1, 2, phrase);

  // Sans marque ni autorisation : la consigne est donnée à tout chantier, jamais en SCOPING ni après une fusion
  // annulée par une réouverture échouée (QUA-181 : la reprogrammation revient à l'humain).
  for (const [activite, extra, attendue] of [
    ["BUILD", {}, true],
    ["CLOSING", {}, true],
    ["SCOPING", { active_brief: null }, false],
    ["CLOSING", { merge_cancelled: { pr: 7 } }, false],
  ]) {
    const dir = projet({ etat: { activity: activite, ...extra } });
    mkdirSync(join(dir, "docs/projects"), { recursive: true });
    writeFileSync(join(dir, "docs/projects/x.md"), "# Projet : x\n");
    assert.equal(/Fusion automatique, comportement par défaut \(QUA-163\)/.test(context(readState(dir), dir)), attendue, activite);
  }
  const en = projet({ lang: "en" });
  assert.match(context(readState(en), en), /Automatic merge, the default behaviour \(QUA-163\), with no authorisation to ask for/);
});

/** Projet en SCOPING, dépôt git sur `branche`, avec (ou non) la marque héritée de fin de cadrage. */
function cadrage({ branche = "cadrage/essai", herite = false, lang } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-merge-auto-cadrage-"));
  mkdirSync(join(dir, ".drwil"));
  if (lang) writeFileSync(join(dir, ".drwil", "ia-first.json"), JSON.stringify({ lang }));
  const etat = { version: 1, activity: "SCOPING", active_brief: null, active_request: null, since: null };
  writeFileSync(join(dir, ".drwil", "state.json"), JSON.stringify(herite ? { ...etat, scoping_merge: { branch: branche } } : etat));
  return depotGit(dir, branche);
}

test("QUA-188 fusion automatique en SCOPING : la PR de cadrage de la branche courante est programmée sans réponse au sondage ; une autre branche refusée", async () => {
  const dir = cadrage();
  const programme = faux({
    vues: [ok(vue("CLEAN", { headRefName: "cadrage/essai" })), ok(vue("CLEAN", { headRefName: "cadrage/essai", autoMergeRequest: {} }))],
  });
  const r = await mergeAuto({ pr: "7", root: dir, sleep: async () => {}, gh: programme.gh });
  assert.deepEqual([r.code, programme.appels], [0, ["pr view", "pr merge", "pr view"]]);
  // La PR d'une autre branche : refusée, rien n'est programmé.
  const autre = faux({ vues: [ok(vue("CLEAN", { headRefName: "workstream/autre" }))] });
  const refus = await mergeAuto({ pr: "7", root: dir, gh: autre.gh });
  assert.equal(refus.code, 1);
  assert.match(refus.message, /la PR #7 est celle de la branche workstream\/autre, pas de la branche courante cadrage\/essai/);
  assert.deepEqual(autre.appels, ["pr view"]);
  const en = cadrage({ lang: "en" });
  assert.match(
    (await mergeAuto({ pr: "7", root: en, gh: faux({ vues: [ok(vue("CLEAN", { headRefName: "x" }))] }).gh })).message,
    /not of the current branch cadrage\/essai/,
  );
  // Une marque héritée reste lisible : l'état est valide et le rappel la dit encore, dans les deux langues.
  const herite = cadrage({ herite: true });
  assert.deepEqual(readState(herite).problems, []);
  assert.match(context(readState(herite), herite), /Fusion automatique de la PR de cadrage autorisée pour la branche cadrage\/essai/);
  const heriteEn = cadrage({ herite: true, lang: "en" });
  assert.match(context(readState(heriteEn), heriteEn), /Automatic merge of the scoping PR authorised for branch cadrage\/essai/);
});

test("QUA-181 : tant que la marque « fusion annulée » est dans l'état, merge-auto refuse sans appel à la forge, quelle que soit la PR ; la marque reste ; en anglais aussi", async () => {
  /** Projet marqué « fusion annulée » sur la PR 7, sa fiche présente pour un état sans problème. */
  const marque = (lang) => {
    const dir = projet({ lang, etat: { merge_cancelled: { pr: 7 } } });
    mkdirSync(join(dir, "docs", "projects"), { recursive: true });
    writeFileSync(join(dir, "docs/projects/x.md"), "# Projet : X\n\n<!-- scope\nfiles:\n  - a.mjs\n-->\n");
    return dir;
  };
  for (const [lang, attendu] of [
    [
      "fr",
      /^\[merge-auto\] refusé : la fusion automatique de la PR #7 a été annulée par une réouverture non aboutie.*c'est à l'humain de le faire\. La fusion n'est PAS programmée\.$/,
    ],
    [
      "en",
      /^\[merge-auto\] refused: the automatic merge of PR #7 was cancelled by a failed reopening.*the human does\. The merge is NOT scheduled\.$/,
    ],
  ]) {
    for (const pr of ["7", "8", undefined]) {
      const dir = marque(lang);
      let lance = false;
      const r = await mergeAuto({ pr, root: dir, branch: BRANCHE, gh: () => (lance = true) });
      assert.deepEqual([r.code, lance], [1, false], `${lang} ${pr}`);
      assert.match(r.message, attendu);
      assert.deepEqual(readState(dir).state.merge_cancelled, { pr: 7 });
    }
  }
});
