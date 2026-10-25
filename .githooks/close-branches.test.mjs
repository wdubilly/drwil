import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { branchMerged, closingMerged, mainBranch, mergedPullRequests, pruneMergedBranches, prunedMessage } from "./close-branches.mjs";

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
