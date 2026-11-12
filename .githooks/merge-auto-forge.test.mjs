import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeAuto } from "./merge-auto.mjs";
import { forgeClient, glabRun, mergeStatus, normalizeMr } from "./merge-auto-forge.mjs";

// Un hook lancé par `git commit` reçoit GIT_INDEX_FILE, GIT_DIR… : hérités, ils feraient agir les dépôts de test
// sur le dépôt qui lance les tests.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "merge-auto.mjs");

/** Projet temporaire dont l'état autorise (ou non) la fusion automatique ; langue au choix. */
function projet({ auto = true, lang, etat: extra = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-merge-auto-gitlab-"));
  mkdirSync(join(dir, ".drwil"));
  const etat = { version: 1, activity: "CLOSING", active_brief: "docs/projects/x.md", active_request: null, since: null, ...extra };
  writeFileSync(join(dir, ".drwil", "state.json"), JSON.stringify(auto ? { ...etat, auto_merge: true } : etat));
  if (lang) writeFileSync(join(dir, ".drwil", "ia-first.json"), JSON.stringify({ lang }));
  return dir;
}

/** Une MR telle que la rend `glab mr view --output json`. */
const mr = (detailed_merge_status, extra = {}) => ({
  iid: 7,
  state: "opened",
  source_branch: "workstream/x",
  has_conflicts: false,
  detailed_merge_status,
  merge_when_pipeline_succeeds: false,
  ...extra,
});
const ok = (corps) => ({ status: 0, stdout: JSON.stringify(corps), stderr: "" });
const vide = { status: 0, stdout: "", stderr: "" };

/** glab simulé : `vues` se succèdent (la dernière se répète) ; `appels` garde l'ordre de tout ce qui est lancé. */
function faux({ vues, merge = vide, rebase = vide }) {
  const appels = [];
  const glab = (args) => {
    appels.push(args.join(" "));
    if (args[1] === "view") return vues.length > 1 ? vues.shift() : vues[0];
    return args[1] === "merge" ? merge : rebase;
  };
  return { glab, appels };
}

const options = (dir, extra) => ({ pr: "7", root: dir, forge: "gitlab", sleep: async () => {}, ...extra });
const programmee = { merge_when_pipeline_succeeds: true };

test("QUA-161 fusion automatique sur GitLab : MR en retard rebasée, fusion programmée, merge_when_pipeline_succeeds relu", async () => {
  const dir = projet();
  const { glab, appels } = faux({
    vues: [
      ok(mr("checking")),
      ok(mr("need_rebase")),
      ok(mr("checking")),
      ok(mr("ci_still_running")),
      ok(mr("ci_still_running", programmee)),
    ],
  });
  const journal = [];
  const r = await mergeAuto(options(dir, { glab, log: (m) => journal.push(m) }));
  assert.deepEqual(appels, [
    "mr view 7 --output json",
    "mr view 7 --output json",
    "mr rebase 7",
    "mr view 7 --output json",
    "mr view 7 --output json",
    "mr merge 7 --auto-merge --yes",
    "mr view 7 --output json",
  ]);
  assert.deepEqual(
    [r.code, r.message],
    [0, "[merge-auto] fusion de la MR !7 programmée et vérifiée. Suivre : node .githooks/pr-watch.mjs 7"],
  );
  assert.deepEqual(journal, ["[merge-auto] MR !7 en retard sur la branche principale : mise à jour."]);
  // MR de la branche courante, sans numéro ; champ récent auto_merge_enabled.
  const courante = faux({ vues: [ok(mr("mergeable", { merge_when_pipeline_succeeds: undefined, auto_merge_enabled: true }))] });
  assert.equal((await mergeAuto({ root: dir, forge: "gitlab", glab: courante.glab })).code, 0);
  assert.equal(courante.appels[0], "mr view --output json");
  const en = await mergeAuto(options(projet({ lang: "en" }), { glab: faux({ vues: [ok(mr("mergeable", programmee))] }).glab }));
  assert.equal(en.message, "[merge-auto] merge of MR !7 scheduled and checked. Follow it: node .githooks/pr-watch.mjs 7");
});

test("QUA-162 fusion automatique sur GitLab : jamais programmée sur un état inconnu, en retard ou en conflit, ni dite programmée sans relecture", async () => {
  const dir = projet();
  let t = 0;
  const attente = { now: () => t, sleep: async () => (t += 61_000), timeout: 1 };
  for (const statut of ["checking", "need_rebase", undefined]) {
    const { glab, appels } = faux({ vues: [ok(mr(statut))] });
    const r = await mergeAuto(options(dir, { glab, ...attente }));
    assert.equal(r.code, 2);
    assert.match(r.message, /^\[merge-auto\] non exécuté : état de la MR !7 non calculé ou pas à jour après 1 min/);
    assert.ok(!appels.some((a) => a.startsWith("mr merge")), "aucune programmation sans état à jour");
  }
  for (const conflit of [mr("mergeable", { has_conflicts: true }), mr("conflict")]) {
    const r = await mergeAuto(options(dir, { glab: faux({ vues: [ok(conflit)] }).glab }));
    assert.deepEqual(
      [r.code, r.message],
      [1, "[merge-auto] refusé : la MR !7 est en conflit avec la branche principale ; résoudre le conflit, puis relancer."],
    );
  }
  let r = await mergeAuto(options(dir, { glab: faux({ vues: [ok(mr("mergeable", { state: "closed" }))] }).glab }));
  assert.deepEqual([r.code, r.message], [1, "[merge-auto] refusé : la MR !7 n'est pas ouverte (CLOSED)."]);
  r = await mergeAuto(options(dir, { glab: faux({ vues: [ok(mr("need_rebase"))], rebase: { status: 1, stdout: "", stderr: "x" } }).glab }));
  assert.equal(r.code, 2);
  assert.match(r.message, /mise à jour de la MR !7 a échoué.*`glab mr rebase 7`/);
  // glab absent, non connecté, ou réponse illisible : « non exécuté », code 2.
  for (const lecture of [{ status: null, stdout: null, stderr: null }, { status: 1, stdout: "", stderr: "401" }, ok("texte"), ok({})]) {
    r = await mergeAuto(options(dir, { glab: () => lecture }));
    assert.deepEqual(
      [r.code, r.message],
      [2, "[merge-auto] non exécuté : glab injoignable ou non connecté (glab auth login), ou aucune MR pour cette branche"],
    );
  }
  // Auto-merge non permis par le projet, autre refus de glab, programmation non relue.
  for (const stderr of ["405 Method Not Allowed", "auto-merge is not allowed"]) {
    r = await mergeAuto(options(dir, { glab: faux({ vues: [ok(mr("mergeable"))], merge: { status: 1, stdout: "", stderr } }).glab }));
    assert.equal(r.code, 1);
    assert.match(r.message, /fusion automatique non permise pour la MR !7.*PAS programmée/);
  }
  r = await mergeAuto(options(dir, { glab: faux({ vues: [ok(mr("mergeable"))], merge: { status: 1, stdout: "", stderr: "boom" } }).glab }));
  assert.equal(r.message, "[merge-auto] refusé par glab pour la MR !7 : boom La fusion n'est PAS programmée.");
  r = await mergeAuto(options(dir, { glab: faux({ vues: [ok(mr("mergeable"))] }).glab }));
  assert.deepEqual(
    [r.code, r.message],
    [
      1,
      "[merge-auto] la fusion de la MR !7 n'apparaît pas programmée (merge_when_pipeline_succeeds faux) : la fusion n'est PAS programmée.",
    ],
  );
  // Pipeline déjà réussi : glab fusionne sur-le-champ ; dit « fusionnée », jamais « programmée ».
  for (const lang of ["fr", "en"]) {
    const fusion = faux({ vues: [ok(mr("mergeable")), ok(mr("mergeable", { state: "merged" }))] });
    r = await mergeAuto(options(projet({ lang }), { glab: fusion.glab }));
    assert.equal(r.code, 0);
    assert.match(
      r.message,
      lang === "fr" ? /^\[merge-auto\] MR !7 fusionnée par la commande elle-même/ : /^\[merge-auto\] MR !7 merged by the command/,
    );
    assert.doesNotMatch(r.message, /programmée|scheduled/);
  }
});

test("QUA-163 fusion automatique sur GitLab : sans autorisation, rien n'est lancé ; en SCOPING, seule la MR de la branche autorisée", async () => {
  let lance = false;
  const glab = () => (lance = true);
  const r = await mergeAuto({ pr: "7", root: projet({ auto: false }), forge: "gitlab", glab });
  assert.deepEqual([r.code, lance], [1, false]);
  const cadrage = projet({ auto: false, etat: { activity: "SCOPING", active_brief: null, scoping_merge: { branch: "cadrage/essai" } } });
  const autre = faux({ vues: [ok(mr("mergeable", { source_branch: "workstream/autre" }))] });
  const refus = await mergeAuto(options(cadrage, { glab: autre.glab }));
  assert.equal(refus.code, 1);
  assert.match(refus.message, /la MR !7 est celle de la branche workstream\/autre.*autorisée que pour la branche cadrage\/essai/);
  assert.equal(autre.appels.length, 1);
});

test("QUA-162 client GitLab : normalisation de la MR, état illisible jamais un succès (QUA-013)", () => {
  assert.equal(normalizeMr(null), null);
  assert.equal(normalizeMr("x"), null);
  assert.equal(normalizeMr({ state: "opened" }), null);
  assert.deepEqual(normalizeMr(mr("mergeable", { state: "locked" })), {
    number: 7,
    state: "CLOSED",
    headRefName: "workstream/x",
    mergeStateStatus: "MERGEABLE",
    autoMergeRequest: null,
  });
  assert.equal(normalizeMr({ iid: 1, state: "bizarre" }).state, "BIZARRE");
  assert.equal(normalizeMr({ iid: 1 }).mergeStateStatus, "UNKNOWN");
  assert.equal(mergeStatus({ merge_status: "cannot_be_merged" }), "DIRTY");
  assert.equal(mergeStatus({ merge_status: "cannot_be_merged_recheck" }), "UNKNOWN");
  assert.equal(mergeStatus({ merge_status: "can_be_merged" }), "CAN_BE_MERGED");
  assert.equal(mergeStatus({ detailed_merge_status: 3 }), "UNKNOWN");
  assert.equal(typeof glabRun, "function");
  const client = forgeClient("gitlab");
  assert.deepEqual([client.tool, client.updateHint(7)], ["glab", "glab mr rebase 7"]);
  assert.deepEqual([forgeClient("github").tool, forgeClient("github").updateHint(7)], ["gh", "gh pr update-branch 7"]);
});

test("QUA-161 fusion automatique sur GitLab : ligne de commande, forge lue sur le remote origin", {
  skip: process.platform === "win32" ? "glab factice en script sh" : false,
}, () => {
  const outils = mkdtempSync(join(tmpdir(), "drwil-merge-auto-glab-"));
  const node = spawnSync("which", ["node"], { encoding: "utf8" }).stdout.trim();
  const lancer = (corps, dir) => {
    writeFileSync(join(outils, "glab"), `#!/bin/sh\n${corps}\n`);
    chmodSync(join(outils, "glab"), 0o755);
    return spawnSync(node, [SCRIPT, "7"], { cwd: dir, encoding: "utf8", env: { ...process.env, PATH: `${outils}:${process.env.PATH}` } });
  };
  const depot = () => {
    const dir = projet();
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["remote", "add", "origin", "git@gitlab.com:groupe/projet.git"], { cwd: dir });
    return dir;
  };
  const json = JSON.stringify(mr("mergeable", programmee));
  let r = lancer(`echo '${json}'`, depot());
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /fusion de la MR !7 programmée et vérifiée/);
  r = lancer("exit 1", depot());
  assert.equal(r.status, 2);
  assert.match(r.stderr, /non exécuté : glab injoignable/);
});
