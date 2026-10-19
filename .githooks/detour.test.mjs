import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { allow, main, open, resume, rulesFiles } from "./detour.mjs";
import { checkScope } from "./scope-gate.mjs";
import { readState } from "./state.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = fileURLToPath(new URL("./detour.mjs", import.meta.url));
const BARRIERE = fileURLToPath(new URL("./scope-gate.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-detour-"));
  dossiers.push(d);
  return d;
};

const ORIGINE = "docs/projects/chantier.md";
const FICHE = "docs/projects/detour-date-mal-lue.md";
const BRANCHE = "detour/date-mal-lue";
const MAINTENANT = "2026-10-18T10:00:00.000Z";
const git = (racine, ...args) => {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", ...args], { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
};
const ecrire = (racine, fichiers) => {
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
};
const lire = (racine, chemin) => readFileSync(join(racine, chemin), "utf8");
const branche = (racine) => git(racine, "symbolic-ref", "--short", "HEAD");
const etat = (racine) => readState(racine).state;
const fiche = (titre, motifs) =>
  `# ${titre}\n\n**Statut** : cadré le 2026-10-18.\n\n<!-- scope\nfiles:\n${motifs.map((m) => `  - ${m}`).join("\n")}\n-->\n\n## 7. Reprise\n\nRien.\n`;

/**
 * Dépôt git temporaire : master (journal, fiche du chantier, src/a.txt), branche chantier/x avec un
 * commit de travail (src/b.txt), état BUILD sur la fiche du chantier. Rend la racine.
 */
function depot({ lang, journal = true, config = {}, principale = "master", autoMerge = false } = {}) {
  const racine = dossier();
  git(racine, "init", "-q", "-b", principale);
  git(racine, "config", "core.hooksPath", "/dev/null");
  // La commande lance elle-même rebase et stash, qui exigent une identité : la CI n'en a pas de globale.
  git(racine, "config", "user.name", "t");
  git(racine, "config", "user.email", "t@t.invalid");
  ecrire(racine, {
    ".drwil/ia-first.json": JSON.stringify({ ...(lang ? { lang } : {}), ...config }),
    ".gitignore": ".drwil/state.json\n.drwil/evidence/\n.drwil/reminder.json\n",
    [ORIGINE]: fiche("Projet : Chantier", ["src/b.txt"]),
    "src/a.txt": "ligne 1\nligne 2\n",
    ...(journal ? { "docs/projects/journal.md": "# Journal\n" } : {}),
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "initial");
  git(racine, "switch", "-q", "-c", "chantier/x");
  ecrire(racine, { "src/b.txt": "travail commité\n" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "travail\n\nDrwil-Brief: docs/projects/chantier.md");
  const e = {
    version: 1,
    activity: "BUILD",
    active_brief: ORIGINE,
    active_request: null,
    since: null,
    ...(autoMerge ? { auto_merge: true } : {}),
  };
  ecrire(racine, { ".drwil/state.json": JSON.stringify(e) });
  return racine;
}

/** Ce que fait l'agent sur la branche du détour, puis la fusion de sa PR dans la branche principale. */
function corrigerEtFusionner(racine, { principale = "master", journal = true, supprimer = true, fusionner = true, squash = false } = {}) {
  ecrire(racine, { [FICHE]: lire(racine, FICHE).replace("files:\n", "files:\n  - src/a.txt\n") });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "cadrage du détour");
  ecrire(racine, { "src/a.txt": "ligne 1 corrigée\nligne 2\n" });
  git(racine, "commit", "-q", "-am", "correction");
  if (journal)
    ecrire(racine, { "docs/projects/journal.md": `# Journal\n\n## 2026-10-18 — Détour de ${ORIGINE}\n\n- Branche ${BRANCHE}.\n` });
  if (supprimer) git(racine, "rm", "-q", FICHE);
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "clôture du détour");
  if (!fusionner) return;
  git(racine, "switch", "-q", principale);
  if (squash) {
    git(racine, "merge", "-q", "--squash", BRANCHE);
    git(racine, "commit", "-q", "-m", "Détour (#2)");
  } else git(racine, "merge", "-q", "--no-ff", "-m", "fusion du détour", BRANCHE);
  git(racine, "switch", "-q", BRANCHE);
}

test("QUA-050 : ouvrir met le travail en cours de côté, part de la branche principale, crée la fiche courte et pointe l'état sur elle", () => {
  const racine = depot();
  ecrire(racine, { "src/b.txt": "travail en cours\n", "src/neuf.txt": "non suivi\n" });
  const r = open(racine, "date-mal-lue", { title: "La date est mal lue", files: ["src/a.txt", "test/a.test.mjs"], now: MAINTENANT });
  assert.equal(r.code, 0, r.message);
  assert.equal(branche(racine), BRANCHE);
  assert.equal(git(racine, "rev-parse", "HEAD"), git(racine, "rev-parse", "master"), "partie de la branche principale");
  assert.ok(!existsSync(join(racine, "src/b.txt")) && !existsSync(join(racine, "src/neuf.txt")), "travail en cours mis de côté");
  const texte = lire(racine, FICHE);
  assert.match(texte, /^# Détour : La date est mal lue \(détour de docs\/projects\/chantier\.md\)/);
  assert.match(texte, /\*\*Statut\*\* : ouvert le 2026-10-18/);
  assert.match(texte, /\*\*Risque\*\* : MEDIUM/);
  assert.match(texte, /files:\n {2}- src\/a\.txt\n {2}- test\/a\.test\.mjs\n-->/);
  assert.match(texte, /QUA-017 .*QUA-019/);
  const e = etat(racine);
  assert.equal(e.activity, "BUILD");
  assert.equal(e.active_brief, FICHE);
  assert.equal(e.since, MAINTENANT);
  assert.deepEqual(e.detour, {
    origin_brief: ORIGINE,
    origin_branch: "chantier/x",
    branch: BRANCHE,
    stash: git(racine, "rev-parse", "stash@{0}"),
  });
  assert.match(
    r.message,
    /détour ouvert : branche detour\/date-mal-lue depuis master, fiche docs\/projects\/detour-date-mal-lue\.md, travail en cours mis de côté/,
  );
  assert.match(r.message, /PR intitulée « Détour de docs\/projects\/chantier\.md : … », fusion laissée à l'humain/);
  assert.doesNotMatch(r.message, /règles du jeu/);

  corrigerEtFusionner(racine);
  const fin = resume(racine, { now: MAINTENANT });
  assert.equal(fin.code, 0, fin.message);
  assert.equal(branche(racine), "chantier/x");
  assert.equal(lire(racine, "src/a.txt"), "ligne 1 corrigée\nligne 2\n", "la branche du chantier part de la branche principale corrigée");
  assert.equal(git(racine, "merge-base", "HEAD", "master"), git(racine, "rev-parse", "master"));
  assert.equal(lire(racine, "src/b.txt"), "travail en cours\n", "travail en cours restauré");
  assert.equal(lire(racine, "src/neuf.txt"), "non suivi\n");
  assert.equal(git(racine, "stash", "list"), "", "mise de côté consommée");
  assert.deepEqual(etat(racine), { version: 1, activity: "BUILD", active_brief: ORIGINE, active_request: null, since: MAINTENANT });
  assert.equal(
    fin.message,
    "détour clos : retour sur chantier/x, rebasée sur master, travail restauré ; BUILD sur docs/projects/chantier.md.",
  );
});

test("QUA-050 : un rebase de reprise garde le trailer de chaque commit du chantier ; branche poussée : push forcé indiqué", () => {
  const racine = depot({ autoMerge: true });
  const origine = dossier();
  git(origine, "init", "-q", "--bare");
  git(racine, "remote", "add", "origin", origine);
  git(racine, "push", "-q", "origin", "master");
  git(racine, "push", "-q", "-u", "origin", "chantier/x");
  // Le vrai hook prepare-commit-msg : il ajoute le trailer de la fiche active, sauf pendant un rebase.
  ecrire(racine, { "hooks/prepare-commit-msg": `#!/bin/sh\nexec node "${BARRIERE}" --trailer "$1"\n` });
  chmodSync(join(racine, "hooks/prepare-commit-msg"), 0o755);
  ecrire(racine, { ".gitignore": `${lire(racine, ".gitignore")}hooks/\n` });
  git(racine, "commit", "-q", "-am", "ignore hooks");
  git(racine, "config", "core.hooksPath", "hooks");
  const r = open(racine, "date-mal-lue", { title: "Date", files: [".githooks/x.mjs"] });
  assert.equal(r.code, 0, r.message);
  assert.equal(etat(racine).detour.stash, null, "arbre propre : rien à mettre de côté");
  assert.match(r.message, /depuis origin\/master/);
  assert.match(r.message, /fusion automatique programmée/);
  assert.match(r.message, /ces fichiers changent les règles du jeu .* \.githooks\/x\.mjs/);
  assert.match(lire(racine, FICHE), /\*\*Risque\*\* : HIGH/);
  corrigerEtFusionner(racine);
  git(racine, "push", "-q", "origin", "master");
  const fin = resume(racine);
  assert.equal(fin.code, 0, fin.message);
  assert.match(fin.message, /rebasée sur origin\/master/);
  assert.match(fin.message, /git push --force-with-lease/);
  const trailers = (plage) => git(racine, "log", "--format=%s|%(trailers:key=Drwil-Brief,valueonly,separator=)", plage).split("\n");
  assert.ok(trailers("master").includes(`cadrage du détour|${FICHE}`), "le hook est actif : les commits du détour portent sa fiche");
  assert.deepEqual(
    trailers("origin/master..HEAD"),
    ["ignore hooks|", `travail|${ORIGINE}`],
    "aucun commit du chantier ne prend la fiche du détour",
  );
});

test("QUA-050 : ouvrir refusé hors BUILD, en plein détour, sans nom ou titre, sur la branche principale ou sans elle, nom déjà pris", () => {
  const vide = dossier();
  assert.match(open(vide, "x", { title: "t" }).message, /activité SCOPING/);
  const racine = depot();
  assert.match(open(racine, "Nom Invalide", { title: "t" }).message, /nom attendu/);
  assert.match(open(racine, undefined, { title: "t" }).message, /nom attendu/);
  assert.match(open(racine, "x").message, /nom attendu/);
  git(racine, "branch", "detour/pris");
  assert.match(open(racine, "pris", { title: "t" }).message, /detour\/pris ou docs\/projects\/detour-pris\.md existe déjà/);
  ecrire(racine, { "docs/projects/detour-fiche.md": "x" });
  assert.match(open(racine, "fiche", { title: "t" }).message, /existe déjà/);
  unlinkSync(join(racine, "docs/projects/detour-fiche.md"));
  git(racine, "switch", "-q", "master");
  assert.match(open(racine, "x", { title: "t" }).message, /une branche de chantier et une branche principale/);
  git(racine, "switch", "-q", "--detach", "chantier/x");
  assert.match(open(racine, "x", { title: "t" }).message, /une branche de chantier/);
  const tronc = depot({ principale: "tronc" });
  assert.match(open(tronc, "x", { title: "t" }).message, /une branche de chantier et une branche principale/);
  git(racine, "switch", "-q", "chantier/x");
  assert.equal(open(racine, "a", { title: "t" }).code, 0);
  assert.match(open(racine, "b", { title: "t" }).message, /un détour est déjà en cours \(detour\/a\)/);
});

test("QUA-050 : ouvrir refusé sans rien perdre quand la mise de côté ou la branche échoue", () => {
  const racine = depot();
  // Une branche « detour » interdit de créer detour/<nom> : la création échoue avant toute mise de côté.
  git(racine, "branch", "detour");
  ecrire(racine, { "src/b.txt": "travail en cours\n" });
  const r = open(racine, "x", { title: "t" });
  assert.equal(r.code, 1);
  assert.match(r.message, /création de la branche impossible .* rien n'a changé/);
  assert.equal(lire(racine, "src/b.txt"), "travail en cours\n");
  assert.equal(git(racine, "stash", "list"), "");
  assert.equal(etat(racine).active_brief, ORIGINE);
  // Un conflit non résolu empêche la mise de côté.
  git(racine, "branch", "-D", "detour");
  git(racine, "commit", "-q", "-am", "b chantier");
  git(racine, "switch", "-q", "-c", "autre", "master");
  ecrire(racine, { "src/b.txt": "autre\n" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "b autre");
  git(racine, "switch", "-q", "chantier/x");
  spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", "merge", "-q", "autre"], { cwd: racine });
  const s = open(racine, "y", { title: "t" });
  assert.match(s.message, /ne peut pas être mis de côté/);
  assert.equal(branche(racine), "chantier/x");
  assert.equal(git(racine, "branch", "--list", "detour/y"), "", "la branche créée est retirée");
});

test("QUA-050 : reprendre refusé sans détour, arbre modifié, PR non fusionnée, fiche ou journal manquants — rien n'est touché", () => {
  assert.match(resume(depot()).message, /aucun détour en cours/);
  const racine = depot();
  open(racine, "date-mal-lue", { title: "t" });
  ecrire(racine, { "src/c.txt": "x" });
  assert.match(resume(racine).message, /arbre modifié/);
  unlinkSync(join(racine, "src/c.txt"));
  corrigerEtFusionner(racine, { fusionner: false });
  assert.match(resume(racine).message, /detour\/date-mal-lue n'est pas encore fusionnée dans master/);
  const sansSuppression = depot();
  open(sansSuppression, "date-mal-lue", { title: "t" });
  corrigerEtFusionner(sansSuppression, { supprimer: false });
  assert.match(resume(sansSuppression).message, /la fiche docs\/projects\/detour-date-mal-lue\.md est encore dans master/);
  const sansEntree = depot();
  open(sansEntree, "date-mal-lue", { title: "t" });
  corrigerEtFusionner(sansEntree, { journal: false });
  assert.match(resume(sansEntree).message, /aucune entrée de docs\/projects\/journal\.md ne cite detour\/date-mal-lue dans master/);
  const sansJournal = depot({ journal: false });
  open(sansJournal, "date-mal-lue", { title: "t" });
  corrigerEtFusionner(sansJournal, { journal: false });
  assert.match(resume(sansJournal).message, /aucune entrée/);
  for (const r of [racine, sansSuppression, sansEntree, sansJournal]) {
    assert.equal(branche(r), BRANCHE);
    assert.equal(etat(r).active_brief, FICHE);
  }
  // Branche principale renommée : la reprise ne trouve pas de base, refusée.
  git(racine, "branch", "-m", "master", "tronc");
  assert.match(resume(racine).message, /pas encore fusionnée dans main/);
});

test("QUA-050 : reprendre refusé si la branche du chantier a disparu, se rebase mal ou si la restauration échoue — mise de côté intacte", () => {
  const disparue = depot();
  open(disparue, "date-mal-lue", { title: "t" });
  corrigerEtFusionner(disparue);
  git(disparue, "branch", "-D", "chantier/x");
  assert.match(resume(disparue).message, /retour sur chantier\/x impossible/);

  const conflit = depot();
  ecrire(conflit, { "src/a.txt": "ligne 1 du chantier\nligne 2\n" });
  git(conflit, "commit", "-q", "-am", "le chantier touche aussi a");
  open(conflit, "date-mal-lue", { title: "t" });
  corrigerEtFusionner(conflit);
  const r = resume(conflit);
  assert.match(r.message, /chantier\/x ne se rebase pas sur master sans conflit \(rebase annulé\)/);
  assert.equal(git(conflit, "status", "--porcelain"), "");
  assert.equal(etat(conflit).active_brief, FICHE);

  const perdue = depot();
  ecrire(perdue, { "src/b.txt": "travail en cours\n" });
  open(perdue, "date-mal-lue", { title: "t" });
  corrigerEtFusionner(perdue);
  const stash = etat(perdue).detour.stash;
  git(perdue, "stash", "drop", "-q");
  assert.match(resume(perdue).message, new RegExp(`mise de côté ${stash.slice(0, 7)} est introuvable`));
  assert.equal(etat(perdue).active_brief, FICHE);

  const restauration = depot();
  ecrire(restauration, { "src/a.txt": "ligne 1 en cours\nligne 2\n", "src/neuf.txt": "non suivi\n" });
  open(restauration, "date-mal-lue", { title: "t" });
  corrigerEtFusionner(restauration);
  const s = resume(restauration);
  assert.match(s.message, /la restauration du travail entre en conflit — arbre remis propre/);
  assert.equal(git(restauration, "status", "--porcelain"), "");
  assert.equal(etat(restauration).active_brief, FICHE);
  assert.equal(git(restauration, "stash", "list", "--format=%H"), etat(restauration).detour.stash, "mise de côté intacte");
});

test("QUA-050 : un détour qui change les règles du jeu attend le oui de l'humain, donné dans un terminal seulement", async () => {
  assert.match((await allow(depot())).message, /aucun détour en cours/);
  const racine = depot();
  open(racine, "date-mal-lue", { title: "t", files: [".githooks/x.mjs", "src/a.txt"] });
  git(racine, "add", FICHE);
  git(racine, "commit", "-q", "-m", "cadrage du détour");
  const cfg = { scopeGate: "blocking" };
  const avant = checkScope(racine, { cfg, staged: [".githooks/x.mjs", "src/a.txt"] });
  assert.equal(avant.status, "fail");
  assert.equal(avant.problems.length, 1);
  assert.match(avant.problems[0], /^\.githooks\/x\.mjs : un détour qui change les règles du jeu .* demande le oui de l'humain/);
  assert.equal(checkScope(racine, { cfg, staged: ["src/a.txt"] }).status, "ok", "un détour ordinaire passe sans personne");
  assert.match((await allow(racine)).message, /terminal interactif/);
  assert.match((await allow(racine, { tty: true })).message, /terminal interactif/);
  const questions = [];
  const non = await allow(racine, {
    tty: true,
    confirm: async (q) => {
      questions.push(q);
      return false;
    },
  });
  assert.match(non.message, /oui non donné/);
  assert.match(questions[0], /Le détour detour\/date-mal-lue change les règles du jeu/);
  assert.equal(etat(racine).detour.human, undefined);
  const oui = await allow(racine, { tty: true, confirm: async () => true });
  assert.equal(oui.code, 0);
  assert.equal(etat(racine).detour.human, true);
  assert.equal(checkScope(racine, { cfg, staged: [".githooks/x.mjs"] }).status, "ok");
});

test("QUA-050 : les règles du jeu — registre des contrats, hooks, seuils, CI, et leurs sources du gabarit", () => {
  const fichiers = [
    "docs/contracts.md",
    ".githooks/a.mjs",
    ".drwil/ia-first.json",
    ".github/workflows/ci.yml",
    ".gitlab-ci.yml",
    "src/a.js",
    "./ci/x.yml",
  ];
  assert.deepEqual(rulesFiles(fichiers), fichiers.slice(0, 5));
  assert.deepEqual(
    rulesFiles(["docs/contracts.md", "regles.md", "ci/x.yml"], { dirs: { contracts: "regles.md" }, ciFiles: ["ci/x.yml"] }),
    ["regles.md", "ci/x.yml"],
  );
  assert.deepEqual(rulesFiles(["ci/x.yml"], { ciFiles: "ci/x.yml" }), []);
  const scopeMirrors = [null, { from: "", to: "" }, { from: "x/" }, { from: "tpl/", to: "" }];
  assert.deepEqual(rulesFiles(["tpl/.githooks/a.mjs", "tpl/src/a.js", "x/.githooks/a.mjs"], { scopeMirrors }), ["tpl/.githooks/a.mjs"]);
  assert.deepEqual(rulesFiles(["tpl/.githooks/a.mjs"], { scopeMirrors: "tpl/" }), []);
});

/** Capture console.log et console.error pendant `fn`. */
async function capturer(fn) {
  const { log, error } = console;
  const sortie = [];
  const erreurs = [];
  Object.assign(console, { log: (m) => sortie.push(m), error: (m) => erreurs.push(m) });
  try {
    return { code: await fn(), sortie: sortie.join("\n"), erreurs: erreurs.join("\n") };
  } finally {
    Object.assign(console, { log, error });
  }
}

/** Simule un terminal interactif : chaque invite (écriture se terminant par « : ») reçoit la réponse suivante. */
async function avecTerminal(reponses, fn) {
  const entree = new PassThrough();
  entree.isTTY = true;
  const descripteur = Object.getOwnPropertyDescriptor(process, "stdin");
  Object.defineProperty(process, "stdin", { value: entree, configurable: true });
  const { isTTY } = process.stdout;
  const ecrireSortie = process.stdout.write;
  process.stdout.isTTY = true;
  process.stdout.write = (morceau, ...reste) => {
    if (/: $/.test(String(morceau))) {
      setImmediate(() => entree.write(`${reponses.shift() ?? ""}\n`));
      return true;
    }
    return ecrireSortie.call(process.stdout, morceau, ...reste);
  };
  try {
    return await fn();
  } finally {
    process.stdout.write = ecrireSortie;
    process.stdout.isTTY = isTTY;
    Object.defineProperty(process, "stdin", descripteur);
  }
}

test("QUA-050 : ligne de commande — open, resume, allow (terminal), usage ; en anglais aussi", async () => {
  const racine = depot({ lang: "en", config: { risk: { sensitivePaths: ["src/*"] } } });
  let r = await capturer(() => main(["open", "date-mal-lue", "--title", "Date misread", "--files", "src/a.txt,test/a.test.mjs"], racine));
  assert.equal(r.code, 0, r.erreurs);
  assert.match(r.sortie, /^✓ detour opened: branch detour\/date-mal-lue from master/);
  assert.match(r.sortie, /merge left to the human/);
  const texte = lire(racine, FICHE);
  assert.match(texte, /^# Detour: Date misread \(detour of docs\/projects\/chantier\.md\)/);
  assert.match(texte, /\*\*Risk\*\*: HIGH/, "chemins sensibles du projet");
  assert.match(texte, /## 7\. Hand-off/);
  r = await capturer(() => main(["open", "autre", "--title", "x"], racine));
  assert.match(r.erreurs, /^✗ detour refused: a detour is already in progress/);
  r = await capturer(() => main(["allow"], racine));
  assert.match(r.erreurs, /interactive terminal/);
  r = await avecTerminal(["non"], () => capturer(() => main(["allow"], racine)));
  assert.match(r.erreurs, /yes not given/);
  r = await avecTerminal(["DETOUR"], () => capturer(() => main(["allow"], racine)));
  assert.match(r.sortie, /detour detour\/date-mal-lue allowed to change the rules/);
  r = await capturer(() => main(["resume"], racine));
  assert.match(r.erreurs, /^✗ resume refused: worktree modified/);
  r = await capturer(() => main([], racine));
  assert.equal(r.code, 2);
  assert.match(r.erreurs, /^usage: node \.githooks\/detour\.mjs open/);

  const fr = depot();
  r = await capturer(() => main(["open", "sans-fichiers", "--title", "t"], fr));
  assert.equal(r.code, 0);
  assert.match(lire(fr, "docs/projects/detour-sans-fichiers.md"), /files:\n\n-->/);
  const lance = spawnSync(process.execPath, [SCRIPT, "inconnu"], {
    cwd: tmpdir(),
    encoding: "utf8",
    env: { ...process.env, DRWIL_ROOT: fr },
  });
  assert.equal(lance.status, 2);
  assert.match(lance.stderr, /^usage : node \.githooks\/detour\.mjs open/);
});

test("QUA-058 : la reprise accepte un détour dont la PR est fusionnée par squash, prouvée par gh", () => {
  const racine = depot();
  open(racine, "date-mal-lue", { title: "t" });
  corrigerEtFusionner(racine, { squash: true });
  const pointe = git(racine, "rev-parse", BRANCHE);
  const appels = [];
  const gh = (_racine, args) => {
    appels.push(args.join(" "));
    return JSON.stringify([{ headRefName: BRANCHE, headRefOid: pointe }]);
  };
  const r = resume(racine, { now: MAINTENANT, gh });
  assert.equal(r.code, 0, r.message);
  assert.match(appels[0], /^pr list --state merged --json headRefName,headRefOid --limit \d+ --head detour\/date-mal-lue$/);
  assert.equal(branche(racine), "chantier/x");
  assert.equal(lire(racine, "src/a.txt"), "ligne 1 corrigée\nligne 2\n");
  assert.equal(etat(racine).active_brief, ORIGINE);
});

test("QUA-059 : sans gh joignable, la reprise d'un détour fusionné par squash est refusée et dit pourquoi — rien n'est touché", () => {
  const racine = depot();
  open(racine, "date-mal-lue", { title: "t" });
  corrigerEtFusionner(racine, { squash: true });
  const r = resume(racine, { gh: () => null });
  assert.equal(r.code, 1);
  assert.match(
    r.message,
    /detour\/date-mal-lue n'est pas encore fusionnée dans master .*gh injoignable : seule la fusion classique est reconnue/,
  );
  const sansPreuve = resume(racine, { gh: () => "[]" });
  assert.doesNotMatch(sansPreuve.message, /gh injoignable/, "gh a répondu : aucune PR fusionnée");
  assert.equal(branche(racine), BRANCHE);
  assert.equal(etat(racine).active_brief, FICHE);
});
