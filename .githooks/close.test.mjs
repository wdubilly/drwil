import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  branchMerged,
  close,
  closingMerged,
  closingSignals,
  main,
  mainBranch,
  mergedPullRequests,
  pruneMergedBranches,
  prunedMessage,
} from "./close.mjs";
import { move, start } from "./state.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = fileURLToPath(new URL("./close.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-cloture-"));
  dossiers.push(d);
  return d;
};

const FICHE = "docs/projects/exemple.md";
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
const fiche = (criteres) =>
  `# Projet : Exemple\n\n**Statut** : cadré le 2026-10-18.\n\n<!-- scope\nfiles:\n  - src/a.mjs\n-->\n\n## Critères d'acceptation\n\n${criteres}\n\n## 6. Increments\n\n- **Lot 1** [IA] : tout.\n\n## 7. Reprise\n\nRien.\n`;
const INDEX = [
  "# Index",
  "",
  "- [ ] [IA] Autre chantier — `docs/projects/autre.md`.",
  "- [ ] [IA] Exemple, sur deux lignes",
  "  — `docs/projects/exemple.md`.",
  "- [ ] [IA] Fin.",
  "",
].join("\n");

/**
 * Dépôt git temporaire : master avec un contrat, branche chantier/exemple avec la fiche, l'index et
 * l'état `activite`. Rend la racine.
 */
function depot({ activite = "CLOSING", criteres = "- Un critère — `QUA-001`", lang, index = INDEX } = {}) {
  const racine = dossier();
  git(racine, "init", "-q", "-b", "master");
  ecrire(racine, {
    ".drwil/ia-first.json": JSON.stringify({ ...(lang ? { lang } : {}), contractPrefixes: ["QUA"] }),
    ".gitignore": ".drwil/state.json\n.drwil/evidence/\n",
    "docs/contracts.md": "# Contrats\n\n## QUA-001 — Un\n",
    "docs/projects/autre.md": "# Autre\n",
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "initial");
  git(racine, "checkout", "-q", "-b", "chantier/exemple");
  ecrire(racine, { [FICHE]: fiche(criteres), "docs/projects/pending.md": index });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "cadrage");
  const etat = { version: 1, activity: activite, active_brief: FICHE, active_request: null, since: null };
  ecrire(racine, { ".drwil/state.json": JSON.stringify(etat) });
  return racine;
}

/** Dossier de journaux de Claude Code avec une réponse sur la branche du chantier. */
function journaux() {
  const d = dossier();
  const usage = { input_tokens: 10, output_tokens: 100, cache_read_input_tokens: 1000, cache_creation_input_tokens: 50 };
  const ligne = { type: "assistant", requestId: "r1", timestamp: "2026-10-18T10:00:00Z", gitBranch: "chantier/exemple" };
  writeFileSync(join(d, "s.jsonl"), `${JSON.stringify({ ...ligne, message: { model: "claude-opus-5-5", usage } })}\n`);
  return d;
}

test("QUA-048 : en CLOSING, la commande fait la mécanique d'un geste — fiche supprimée, ligne d'index retirée, consommation consignée — sans rien commiter", () => {
  const racine = depot();
  const r = close(racine, { logs: journaux() });
  assert.equal(r.code, 0, r.message);
  assert.ok(!existsSync(join(racine, FICHE)), "fiche supprimée");
  const index = readFileSync(join(racine, "docs/projects/pending.md"), "utf8");
  assert.doesNotMatch(index, /exemple/, "l'élément d'index et sa ligne de suite retirés");
  assert.match(index, /autre\.md`\.\n- \[ \] \[IA\] Fin\./, "les autres éléments restent");
  const usage = readFileSync(join(racine, ".drwil/usage.jsonl"), "utf8");
  assert.match(usage, /"workstream":"exemple"/);
  assert.match(r.message, /fiche supprimée : docs\/projects\/exemple\.md/);
  assert.match(r.message, /ligne d'index retirée/);
  assert.match(r.message, /Rien ne ferait échouer la clôture\.\nReste à l'agent : l'entrée du journal/);
  assert.equal(git(racine, "log", "--oneline").split("\n").length, 2, "aucun commit");
  assert.equal(git(racine, "diff", "--cached", "--name-only"), "", "rien d'indexé");
  // Relancée : rien à refaire, la consommation n'est jamais consignée deux fois.
  const encore = close(racine, { logs: journaux() });
  assert.match(encore.message, /aucune ligne d'index à retirer/);
  assert.match(encore.message, /déjà une ligne pour « exemple »/);
});

test("QUA-048 : hors CLOSING, la mécanique est refusée ; --check signale sans rien écrire ; sans fiche, refus", () => {
  const racine = depot({ activite: "BUILD" });
  const refus = close(racine);
  assert.equal(refus.code, 1);
  assert.match(refus.message, /clôture refusée : activité BUILD/);
  assert.ok(existsSync(join(racine, FICHE)));
  const verif = close(racine, { check: true });
  assert.equal(verif.code, 0, verif.message);
  assert.equal(verif.message, "Rien ne ferait échouer la clôture.");
  assert.ok(existsSync(join(racine, FICHE)));
  ecrire(racine, {
    ".drwil/state.json": JSON.stringify({ version: 1, activity: "SCOPING", active_brief: null, active_request: null, since: null }),
  });
  assert.match(close(racine).message, /aucune fiche active ni fiche donnée/);
  assert.equal(close(racine, { brief: FICHE, check: true }).code, 0, "une fiche donnée se vérifie hors chantier");
});

test("QUA-048 : critère encore « contrat à créer » signalé avec l'ID à écrire — contrat créé sur la branche, plusieurs candidats ou aucun", () => {
  const criteres = "- Un export vide est refusé — contrat à créer\n- Déjà prouvé — contrat à créer `QUA-001`";
  const racine = depot({ activite: "BUILD", criteres });
  let r = close(racine, { check: true });
  assert.equal(r.code, 1);
  assert.match(r.message, /critère « Un export vide est refusé » encore « contrat à créer » : .*l'ID du contrat, une fois créé/);
  assert.doesNotMatch(r.message, /Déjà prouvé/, "un critère déjà lié n'est plus à créer");
  ecrire(racine, { "docs/contracts.md": "# Contrats\n\n## QUA-001 — Un\n\n## QUA-002 — Deux\n" });
  r = close(racine, { check: true });
  assert.match(r.message, /\(docs\/projects\/exemple\.md\), `QUA-002`/);
  ecrire(racine, { "docs/contracts.md": "# Contrats\n\n## QUA-001 — Un\n\n## QUA-002 — Deux\n\n## QUA-003 — Trois\n" });
  assert.match(close(racine, { check: true }).message, /l'ID du contrat créé \(QUA-002 ou QUA-003\)/);
  const long = depot({ activite: "BUILD", criteres: `- ${"x".repeat(80)} — contrat à créer` });
  assert.match(close(long, { check: true }).message, /« x{69}… » encore/, "un critère long est abrégé");
});

test("QUA-048 : références qui deviendraient mortes et noms de fichiers sans chemin signalés avant le commit", () => {
  const racine = depot({ activite: "BUILD" });
  ecrire(racine, {
    "docs/projects/autre.md": "# Autre\n\nVoir `docs/projects/exemple.md`.\n",
    "docs/projects/journal.md": [
      "Nom nu : `close.mjs` ; présent : `README.md` ; relatif : `autre.md` ; prévu : `neuf.mjs` (à créer) ;",
      "pas un nom : `-x.md`.",
      "facultatif : `option.md` (si présent).",
    ].join("\n"),
    "README.md": "x\n",
  });
  const r = close(racine, { check: true });
  assert.equal(r.code, 1);
  assert.match(r.message, /docs\/projects\/autre\.md:3 cite docs\/projects\/exemple\.md, qui sera supprimée/);
  assert.doesNotMatch(r.message, /pending\.md:\d+ cite/, "l'élément d'index est retiré par la commande");
  assert.match(r.message, /docs\/projects\/journal\.md:1 : `close\.mjs` sans chemin/);
  assert.doesNotMatch(r.message, /`(README|autre|neuf|option|-x)\./);
  assert.deepEqual(closingSignals(racine, "docs/projects/absente.md"), [
    "docs/projects/journal.md:1 : `close.mjs` sans chemin, refusé par check-docs — écrire son chemin depuis la racine",
  ]);
});

test("QUA-048 : un élément d'index commun à plusieurs fiches n'est pas retiré, il est signalé", () => {
  const index = "# Index\n\n- [ ] [IA] Deux fiches — `docs/projects/exemple.md`, `docs/projects/autre.md`.\n";
  const racine = depot({ index });
  const r = close(racine, { logs: dossier() });
  assert.match(r.message, /aucune ligne d'index à retirer pour docs\/projects\/exemple\.md .*commune à plusieurs fiches/);
  assert.match(r.message, /pending\.md:3 cite docs\/projects\/exemple\.md/);
  assert.equal(readFileSync(join(racine, "docs/projects/pending.md"), "utf8"), index);
});

test("QUA-048 : au lancement suivant, les branches locales déjà fusionnées sont supprimées — jamais une non fusionnée, la courante ni la principale", () => {
  const racine = depot({ activite: "SCOPING" });
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

test("QUA-048 : start supprime les branches fusionnées et le dit ; move vers EVIDENCE signale les pièges de la clôture", async () => {
  const racine = depot({ activite: "SCOPING", criteres: "- Refusé — contrat à créer" });
  git(racine, "checkout", "-q", "master");
  git(racine, "merge", "-q", "--no-ff", "-m", "fusion", "chantier/exemple");
  git(racine, "checkout", "-q", "-b", "fini");
  ecrire(racine, { "y.txt": "y" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "fini");
  git(racine, "checkout", "-q", "master");
  git(racine, "merge", "-q", "--no-ff", "-m", "fusion", "fini");
  const r = start(racine, FICHE, { human: true });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /branches locales fusionnées supprimées : chantier\/exemple, fini/);
  const m = await move(racine, { to: "EVIDENCE" });
  assert.equal(m.code, 0, m.message);
  assert.match(m.message, /BUILD → EVIDENCE\nCe qui ferait échouer la clôture.*move BUILD`\) :\n {2}⚠ critère « Refusé »/);
  assert.doesNotMatch((await move(racine, { to: "VERIFY" })).message, /ferait échouer/, "seulement en quittant BUILD");
});

test("QUA-048 : ligne de commande — usage, --check, refus et racine du projet ; messages en anglais", () => {
  const racine = depot({ activite: "BUILD", lang: "en" });
  const lancer = (...args) =>
    spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", env: { ...process.env, DRWIL_ROOT: racine } });
  assert.match(lancer("--inconnu").stderr, /^usage: node \.githooks\/close\.mjs/);
  assert.equal(lancer("a.md", "b.md").status, 2);
  const verif = lancer("--check");
  assert.equal(verif.status, 0);
  assert.equal(verif.stdout.trim(), "Nothing would make the closing fail.");
  const refus = lancer();
  assert.equal(refus.status, 1);
  assert.match(refus.stderr, /closing refused: activity BUILD/);
  ecrire(racine, {
    ".drwil/state.json": JSON.stringify({ version: 1, activity: "CLOSING", active_brief: FICHE, active_request: null, since: null }),
  });
  const fin = lancer("--logs", journaux());
  assert.equal(fin.status, 0, fin.stderr);
  assert.match(
    fin.stdout,
    /^brief deleted: docs\/projects\/exemple\.md\nindex line removed: docs\/projects\/pending\.md\nconsumption: "exemple" recorded/,
  );
  assert.match(fin.stdout, /Left to the agent: the journal entry/);
  const sortie = [];
  const { log } = console;
  console.log = (m) => sortie.push(m);
  try {
    assert.equal(main(["--check", FICHE], racine), 0);
  } finally {
    console.log = log;
  }
  assert.deepEqual(sortie, ["Nothing would make the closing fail."]);
});

test("QUA-048 : en anglais, dossiers réglés, sans branche principale ni registre ni index ; journaux lus selon l'environnement", () => {
  const racine = dossier();
  git(racine, "init", "-q", "-b", "tronc");
  const reglage = { lang: "en", dirs: { index: "docs/idx.md", contracts: "docs/reg.md" } };
  ecrire(racine, { ".drwil/ia-first.json": JSON.stringify(reglage), [FICHE]: fiche("- Refused — contract to create") });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "initial");
  ecrire(racine, {
    "docs/notes.md": "See `docs/projects/exemple.md` and `nu.mjs`.\n",
    ".drwil/state.json": JSON.stringify({ version: 1, activity: "CLOSING", active_brief: FICHE, active_request: null, since: null }),
  });
  assert.equal(mainBranch(racine), null);
  let r = close(racine, { check: true });
  assert.match(
    r.message,
    /^Before the commit, what would make the closing fail:\n {2}⚠ criterion « Refused » still « contract to create »: write, in backticks at the end of this criterion \(docs\/projects\/exemple\.md\), the contract's ID, once created in the registry/,
  );
  assert.match(r.message, /docs\/notes\.md:1 cites docs\/projects\/exemple\.md, which will be deleted/);
  assert.match(r.message, /docs\/notes\.md:1: `nu\.mjs` without a path, refused by check-docs/);
  ecrire(racine, { "docs/reg.md": "# Contracts\n\n## QUA-001 — One\n\n## SEC-001 — Two\n" });
  assert.match(close(racine, { check: true }).message, /the ID of the contract created \(QUA-001 or SEC-001\)/, "préfixes par défaut");
  r = close(racine, { env: { ...process.env, CLAUDE_CONFIG_DIR: dossier() } });
  assert.match(
    r.message,
    /^brief deleted: docs\/projects\/exemple\.md\nno index line to remove for docs\/projects\/exemple\.md in docs\/idx\.md/,
  );
  assert.match(r.message, /consumption: no readable session log/);
  assert.equal(prunedMessage(racine, { deleted: ["a", "b"], unproven: [] }), "\nmerged local branches deleted: a, b");
  assert.match(prunedMessage(racine, { deleted: [], unproven: ["c"] }), /^\ngh unreachable: .*classic merge only.*kept: c/);
});

/** Dépôt où trois branches ont été fusionnées par squash (contenu repris, aucun lien de parenté). */
function depotSquash() {
  const racine = depot({ activite: "SCOPING" });
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
