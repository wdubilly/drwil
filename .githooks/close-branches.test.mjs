import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  branchMerged,
  closingMerged,
  mainBranch,
  mergedPullRequests,
  noGhText,
  pruneMergedBranches,
  prunedMessage,
} from "./close-branches.mjs";
import { context, readState, shortReminder, writeState } from "./state.mjs";
import { reopen } from "./state-reopen.mjs";
import { resume } from "./state-resume.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-branches-"));
  dossiers.push(d);
  return d;
};
const git = (racine, ...args) => {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", "-c", "core.hooksPath=/dev/null", ...args], {
    cwd: racine,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
};
const ecrire = (racine, fichiers) => {
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
};

/** Dépôt git temporaire : master, et la branche chantier/exemple avec un commit. Rend la racine. */
function depot() {
  const racine = dossier();
  git(racine, "init", "-q", "-b", "master");
  ecrire(racine, { "base.txt": "base" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "initial");
  git(racine, "checkout", "-q", "-b", "chantier/exemple");
  ecrire(racine, { "chantier.txt": "chantier" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "cadrage");
  return racine;
}

test("QUA-048 : au lancement suivant, les branches locales déjà fusionnées sont supprimées — jamais une non fusionnée, la courante ni la principale", () => {
  const racine = depot();
  git(racine, "checkout", "-q", "master");
  git(racine, "merge", "-q", "--no-ff", "-m", "fusion", "chantier/exemple");
  git(racine, "branch", "neuve");
  git(racine, "checkout", "-q", "-b", "en-cours");
  ecrire(racine, { "x.txt": "x" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "travail");
  git(racine, "checkout", "-q", "master");
  assert.equal(mainBranch(racine), "master");
  assert.deepEqual(pruneMergedBranches(racine, { gh: () => "[]" }), { deleted: ["chantier/exemple"], unproven: [] });
  const restantes = git(racine, "branch", "--format=%(refname:short)").split("\n");
  assert.deepEqual(restantes.sort(), ["en-cours", "master", "neuve"], "non fusionnée et branche au sommet de la principale gardées");
  assert.deepEqual(pruneMergedBranches(dossier()), { deleted: [], unproven: [] }, "hors dépôt git : rien");
  assert.equal(prunedMessage(racine, { deleted: [], unproven: [] }), "");
});

/** Dépôt où trois branches ont été fusionnées par squash (contenu repris, aucun lien de parenté). */
function depotSquash() {
  const racine = depot();
  const branches = {};
  for (const nom of ["squash", "plus-loin", "autre-pr"]) {
    git(racine, "checkout", "-q", "-b", nom, "master");
    ecrire(racine, { [`${nom}.txt`]: nom });
    git(racine, "add", "-A");
    git(racine, "commit", "-q", "-m", nom);
    branches[nom] = git(racine, "rev-parse", "HEAD");
    git(racine, "checkout", "-q", "master");
    git(racine, "merge", "-q", "--squash", nom);
    git(racine, "commit", "-q", "-m", `${nom} (#1)`);
  }
  // Du travail commité après la fusion de la PR : la branche n'est pas « fusionnée ».
  git(racine, "checkout", "-q", "plus-loin");
  ecrire(racine, { "apres.txt": "x" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "après la PR");
  git(racine, "checkout", "-q", "master");
  return { racine, branches };
}

test("QUA-058 : la PR de clôture est fusionnée sur la branche principale, ou selon git puis gh pour une autre branche ; HEAD détaché ou sans branche principale : inconnu", () => {
  const { racine, branches } = depotSquash();
  const pr = (oid) => () => JSON.stringify([{ headRefName: "squash", headRefOid: oid }]);
  assert.equal(closingMerged(racine, { gh: () => assert.fail("gh inutile sur la branche principale") }), "git");
  git(racine, "checkout", "-q", "squash");
  assert.equal(closingMerged(racine, { gh: pr(branches.squash) }), "gh");
  assert.equal(closingMerged(racine, { gh: pr("0".repeat(40)) }), "no");
  assert.equal(closingMerged(racine, { gh: () => null }), "unknown");
  git(racine, "checkout", "-q", "--detach");
  assert.equal(closingMerged(racine), "unknown");
  const vide = mkdtempSync(join(tmpdir(), "drwil-clot-"));
  dossiers.push(vide);
  git(vide, "init", "-q");
  assert.equal(closingMerged(vide), "unknown");
});

test("QUA-058 : une branche dont la PR est fusionnée sur GitHub, par squash compris, est supprimée au lancement — pas une branche allée plus loin", () => {
  const { racine, branches } = depotSquash();
  const appels = [];
  const gh = (_racine, args) => {
    appels.push(args.join(" "));
    return JSON.stringify([
      { headRefName: "squash", headRefOid: branches.squash },
      { headRefName: "plus-loin", headRefOid: branches["plus-loin"] },
      { headRefName: "autre-pr", headRefOid: "0".repeat(40) },
    ]);
  };
  const r = pruneMergedBranches(racine, { gh });
  assert.deepEqual(r, { deleted: ["squash"], unproven: [] });
  assert.equal(appels.length, 1, "une seule question à gh pour toutes les branches");
  assert.match(appels[0], /^pr list --state merged --json headRefName,headRefOid/);
  const restantes = git(racine, "branch", "--format=%(refname:short)").split("\n").sort();
  assert.deepEqual(restantes, ["autre-pr", "chantier/exemple", "master", "plus-loin"], "fusion non prouvée : gardée");
  assert.equal(branchMerged(racine, "autre-pr", "master", null), "unknown");
  assert.equal(branchMerged(racine, "absente", "master", []), "no");
  assert.equal(branchMerged(racine, "absente", "master", null), "unknown");
  assert.equal(mergedPullRequests(racine, { gh: () => "pas du json" }), null);
  assert.equal(mergedPullRequests(racine, { gh: () => "{}" }), null);
  assert.deepEqual(
    mergedPullRequests(racine, { branch: "squash", gh: (_r, a) => (a.includes("--head") && a.includes("squash") ? "[]" : null) }),
    [],
  );
});

test("QUA-059 : sans gh joignable, seule la fusion classique est reconnue, et le lancement le dit sans supprimer de branche non fusionnée", () => {
  const { racine } = depotSquash();
  git(racine, "merge", "-q", "--no-ff", "-m", "fusion", "chantier/exemple");
  const r = pruneMergedBranches(racine, { gh: () => null });
  assert.deepEqual(r, { deleted: ["chantier/exemple"], unproven: ["autre-pr", "plus-loin", "squash"] });
  const restantes = git(racine, "branch", "--format=%(refname:short)").split("\n").sort();
  assert.deepEqual(restantes, ["autre-pr", "master", "plus-loin", "squash"]);
  assert.equal(
    prunedMessage(racine, r),
    "\nbranches locales fusionnées supprimées : chantier/exemple" +
      "\ngh injoignable : seule la fusion classique est reconnue, une PR fusionnée par squash ne l'est pas — branches gardées : autre-pr, plus-loin, squash",
  );
  assert.deepEqual(
    pruneMergedBranches(racine),
    { deleted: [], unproven: ["autre-pr", "plus-loin", "squash"] },
    "le vrai gh, hors GitHub : repli",
  );
});

test("QUA-058 : sans simulation injectée, la commande gh du PATH est interrogée", () => {
  const { racine, branches } = depotSquash();
  const outils = dossier();
  const reponse = JSON.stringify([{ headRefName: "squash", headRefOid: branches.squash }]);
  writeFileSync(join(outils, "gh"), `#!/bin/sh\necho '${reponse}'\n`, { mode: 0o755 });
  const chemin = process.env.PATH;
  process.env.PATH = `${outils}:${chemin}`;
  try {
    assert.deepEqual(pruneMergedBranches(racine).deleted, ["squash"]);
  } finally {
    process.env.PATH = chemin;
  }
});

const GITLAB = "https://gitlab.example.com/o/r.git";

test("QUA-058 : sur GitLab, la branche d'une MR fusionnée en squash est reconnue par glab et supprimée au lancement — pas une branche allée plus loin", () => {
  const { racine, branches } = depotSquash();
  git(racine, "remote", "add", "origin", GITLAB);
  const appels = [];
  const glab = (_racine, args) => {
    appels.push(args.join(" "));
    return JSON.stringify([
      { iid: 1, source_branch: "squash", sha: branches.squash },
      { iid: 2, source_branch: "plus-loin", sha: branches["plus-loin"] },
      { iid: 3, source_branch: "autre-pr", sha: "0".repeat(40) },
    ]);
  };
  const r = pruneMergedBranches(racine, { gh: () => assert.fail("gh jamais interrogé sur GitLab"), glab });
  assert.deepEqual(r, { deleted: ["squash"], unproven: [] });
  assert.deepEqual(appels, ["mr list --merged --output json --per-page 100"], "une seule question à glab pour toutes les branches");
  const restantes = git(racine, "branch", "--format=%(refname:short)").split("\n").sort();
  assert.deepEqual(restantes, ["autre-pr", "chantier/exemple", "master", "plus-loin"]);
  const seule = [];
  mergedPullRequests(racine, {
    branch: "plus-loin",
    glab: (_r, a) => {
      seule.push(a.join(" "));
      return "[]";
    },
  });
  assert.deepEqual(seule, ["mr list --merged --output json --per-page 20 --source-branch plus-loin"]);
  assert.equal(mergedPullRequests(racine, { glab: () => "pas du json" }), null);
  assert.equal(mergedPullRequests(racine, { glab: () => "{}" }), null);
  git(racine, "checkout", "-q", "plus-loin");
  assert.equal(closingMerged(racine, { glab: () => "[]" }), "no");
});

test("QUA-059 : sur GitLab, sans glab joignable, seule la fusion classique est reconnue et le message nomme glab et la MR", () => {
  const { racine } = depotSquash();
  git(racine, "remote", "add", "origin", GITLAB);
  git(racine, "merge", "-q", "--no-ff", "-m", "fusion", "chantier/exemple");
  const r = pruneMergedBranches(racine, { glab: () => null });
  assert.deepEqual(r, { deleted: ["chantier/exemple"], unproven: ["autre-pr", "plus-loin", "squash"] });
  assert.equal(
    prunedMessage(racine, r),
    "\nbranches locales fusionnées supprimées : chantier/exemple" +
      "\nglab injoignable : seule la fusion classique est reconnue, une MR fusionnée par squash ne l'est pas — branches gardées : autre-pr, plus-loin, squash",
  );
  ecrire(racine, { ".drwil/ia-first.json": JSON.stringify({ lang: "en" }) });
  assert.equal(noGhText(racine), "glab unreachable: classic merge only is recognised, a merge request merged by squash is not");
});

/** Dépôt GitLab sur workstream/x : la fiche, puis sa suppression (clôture) si `clos`. Rend la racine et la pointe. */
function depotChantier({ clos = true } = {}) {
  const racine = dossier();
  git(racine, "init", "-q", "-b", "master");
  ecrire(racine, { ".gitignore": ".drwil/\n", "docs/projects/x.md": "# Projet : X\n" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "cadrage");
  git(racine, "remote", "add", "origin", GITLAB);
  git(racine, "checkout", "-q", "-b", "workstream/x");
  ecrire(racine, { "a.txt": "a" });
  if (clos) rmSync(join(racine, "docs/projects/x.md"));
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "clôture");
  return { racine, pointe: git(racine, "rev-parse", "HEAD") };
}

test("QUA-247 : sur GitLab, la reprise d'un chantier clos interroge glab — muet : refus qui le nomme ; MR fusionnée : refus ; aucune : CLOSING", () => {
  const { racine, pointe } = depotChantier();
  let r = resume(racine, { gh: () => assert.fail("gh jamais interrogé sur GitLab"), glab: () => null });
  assert.equal(r.code, 1);
  assert.match(r.message, /^reprise refusée : glab n'a pas dit si la MR de workstream\/x est fusionnée/);
  r = resume(racine, { glab: () => JSON.stringify([{ source_branch: "workstream/x", sha: pointe }]) });
  assert.match(r.message, /^reprise refusée : la MR de workstream\/x est fusionnée/);
  r = resume(racine, { glab: (_r, a) => (a.includes("--source-branch") ? "[]" : null) });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /^état repris en CLOSING sur docs\/projects\/x\.md/);
});

test("QUA-116 : sur GitLab, la réouverture lit la MR par glab, annule sa fusion automatique et le dit en MR ; MR fermée, inconnue ou annulation ratée : refus", () => {
  const preparer = () => {
    const { racine } = depotChantier({ clos: false });
    writeState(racine, { version: 1, activity: "CLOSING", active_brief: "docs/projects/x.md", active_request: null, since: null });
    return racine;
  };
  const mr = (extra) =>
    JSON.stringify({ iid: 4, state: "opened", source_branch: "workstream/x", detailed_merge_status: "mergeable", ...extra });
  let racine = preparer();
  assert.match(
    reopen(racine, { glab: () => null }).message,
    /^réouverture refusée : l'état de la MR de workstream\/x est inconnu \(glab absent/,
  );
  assert.match(reopen(racine, { glab: () => mr({ state: "merged" }) }).message, /^réouverture refusée : la MR !4 est MERGED, pas ouverte/);
  assert.match(
    reopen(racine, { glab: (_r, a) => (a[0] === "api" ? null : mr({ merge_when_pipeline_succeeds: true })) }).message,
    /^réouverture refusée : la fusion automatique de la MR !4 n'a pas pu être annulée \(`glab api --method POST projects\/:id\/merge_requests\/4\/cancel_merge_when_pipeline_succeeds`\)/,
  );
  const appels = [];
  let programmee = true;
  const glab = (_r, a) => {
    appels.push(a.join(" "));
    if (a[0] === "api") {
      programmee = false;
      return "{}";
    }
    return mr({ merge_when_pipeline_succeeds: programmee });
  };
  const r = reopen(racine, { gh: () => assert.fail("gh jamais interrogé sur GitLab"), glab, now: "2026-11-12T10:00:00Z" });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /^CLOSING → BUILD \(réouverture de docs\/projects\/x\.md, MR !4 ouverte\)\nfusion automatique annulée/);
  assert.deepEqual(appels, [
    "mr view workstream/x --output json",
    "api --method POST projects/:id/merge_requests/4/cancel_merge_when_pipeline_succeeds",
    "mr view workstream/x --output json",
  ]);
  // Le rappel d'état nomme la MR comme GitLab (« MR !4 »), jamais « PR #4 ».
  assert.match(context(readState(racine), racine), /Chantier rouvert après sa clôture \(QUA-116\), MR !4 ouverte/);
  assert.doesNotMatch(context(readState(racine), racine), /PR #4/);
  writeState(racine, { ...readState(racine).state, activity: "CLOSING", merge_cancelled: { pr: 4 } });
  assert.match(shortReminder(readState(racine), racine), /Fusion automatique de la MR !4 ANNULÉE/);
  racine = preparer();
  ecrire(racine, { ".drwil/ia-first.json": JSON.stringify({ lang: "en" }) });
  assert.match(reopen(racine, { glab: () => mr({ state: "closed" }) }).message, /^reopening refused: MR !4 is CLOSED, not open/);
});
