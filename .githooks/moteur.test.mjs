import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { controles, racineDuProjet, textes } from "./moteur.mjs";
import { pathToFileURL } from "node:url";

// Voir perimetre.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-moteur-"));
  dossiers.push(dir);
  return dir;
};
function ecrire(racine, chemin, contenu) {
  mkdirSync(dirname(join(racine, chemin)), { recursive: true });
  writeFileSync(join(racine, chemin), contenu);
}
function git(racine, ...args) {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
}
function depot(branche = "travail") {
  const racine = tmp();
  git(racine, "init", "-q", "-b", branche);
  return racine;
}
const parId = (liste) => Object.fromEntries(liste.map((c) => [c.id, c]));
const executer = (racine, id, options = {}, o = { stdio: "pipe" }) => parId(controles(racine, options))[id].executer(o);

/** Exécute `fn` avec PATH et HOME remplacés (gitleaks introuvable ou factice), puis les rétablit. */
function avecEnv(valeurs, fn) {
  const avant = { PATH: process.env.PATH, HOME: process.env.HOME };
  Object.assign(process.env, valeurs);
  try {
    return fn();
  } finally {
    Object.assign(process.env, avant);
  }
}
const dossierGit = dirname(
  spawnSync(process.platform === "win32" ? "where" : "which", ["git"], { encoding: "utf8" }).stdout.split(/\r?\n/)[0],
);
/** gitleaks factice : note ses arguments et réussit. */
function fauxGitleaks(dossier) {
  const chemin = join(dossier, "gitleaks");
  ecrire(dossier, "gitleaks", `#!/bin/sh\necho "$@" >> "${join(dossier, "appels")}"\nexit 0\n`);
  chmodSync(chemin, 0o755);
  return chemin;
}
const posix = { skip: process.platform === "win32" ? "gitleaks factice en script sh" : false };

test("textes : anglais sur demande, français sinon", () => {
  assert.equal(textes("en").pasDeGit, "not a git repository");
  assert.equal(textes("fr").pasDeGit, "pas de dépôt git");
  assert.equal(textes(undefined).pasDeGit, "pas de dépôt git");
});

test("mode minimal : seuls les contrôles du socle hors mode sont applicables", () => {
  const racine = depot();
  const cfg = { mode: "minimal", ciFiles: ["ci.yml"] };
  for (const id of ["secrets-fichiers", "controles-autotest", "couverture-ci"]) {
    assert.deepEqual(executer(racine, id, { cfg }), { statut: "non-applicable", detail: "mode minimal" });
  }
});

test("secrets : gitleaks absent du PATH comme de ~/.local/bin → non exécuté", () => {
  const racine = depot();
  const vide = tmp();
  const r = avecEnv({ PATH: vide, HOME: vide }, () => executer(racine, "secrets-fichiers", { cfg: { lang: "en" } }));
  assert.deepEqual(r, { statut: "non-execute", detail: "gitleaks not installed" });
});

test("secrets : gitleaks trouvé hors dépôt git → non exécuté", posix, () => {
  const outils = tmp();
  fauxGitleaks(outils);
  const r = avecEnv({ PATH: [outils, dossierGit].join(delimiter) }, () => executer(tmp(), "secrets-fichiers"));
  assert.deepEqual(r, { statut: "non-execute", detail: "pas de dépôt git" });
});

test("secrets : indexés seulement au commit, tout l'historique en CI ; ~/.local/bin aussi cherché", posix, () => {
  const racine = depot();
  const maison = tmp();
  const outils = join(maison, ".local", "bin");
  mkdirSync(outils, { recursive: true });
  fauxGitleaks(outils);
  avecEnv({ PATH: dossierGit, HOME: maison }, () => {
    assert.equal(executer(racine, "secrets-fichiers", { env: {} }).statut, "ok");
    assert.equal(executer(racine, "secrets-fichiers", { env: { CI: "true" } }).statut, "ok");
  });
  const appels = spawnSync("cat", [join(outils, "appels")], { encoding: "utf8" })
    .stdout.trim()
    .split("\n")
    .filter((l) => l !== "version");
  assert.match(appels[0], /--pre-commit --staged/);
  assert.doesNotMatch(appels[1], /--staged/);
});

test("lancer : commande impossible à lancer = échec ; sortie capturée seulement en pipe", () => {
  const racine = depot();
  // Dossier de travail absent : le processus ne démarre même pas (r.error).
  const cfg = { checks: [{ id: "x", run: "node -e 0", cwd: "absent" }] };
  const r = parId(controles(racine, { cfg })).x.executer({ stdio: "pipe" });
  assert.equal(r.statut, "echec");
  assert.ok(r.detail);
  // Sans options : stdio hérité, rien de capturé.
  const ok = parId(controles(racine, { cfg: { checks: [{ run: "node -e 0" }] } }))["projet:node -e 0"].executer();
  assert.deepEqual(ok, { statut: "ok", sortie: undefined });
});

test("docs-references : lance check-docs du projet ; son échec remonte", () => {
  const racine = depot();
  ecrire(racine, ".githooks/check-docs.mjs", "process.exit(3)\n");
  assert.equal(executer(racine, "docs-references").statut, "echec");
  ecrire(racine, ".githooks/check-docs.mjs", "console.log('vu')\n");
  const annonces = [];
  assert.deepEqual(executer(racine, "docs-references", {}, { stdio: "pipe", avantLancement: (n) => annonces.push(n) }), {
    statut: "ok",
    sortie: "vu\n",
  });
  assert.deepEqual(annonces, ["chemins et contrats cités dans la doc"]);
});

test("périmètre : bloquant = échec marqué ✗, avertissement = ok marqué ⚠ ; affiché hors pipe", () => {
  const racine = depot();
  const indexes = ["src/a.js"];
  const annonces = [];
  const bloque = executer(
    racine,
    "perimetre-attente",
    { cfg: { barriere: "bloquant" }, indexes },
    { stdio: "pipe", avantLancement: (n) => annonces.push(n) },
  );
  assert.equal(bloque.statut, "echec");
  assert.match(bloque.sortie, /^ {2}✗ /);
  assert.deepEqual(annonces, ["périmètre de l'attente"]);
  const journal = [];
  const log = console.log;
  console.log = (m) => journal.push(m);
  try {
    const averti = executer(racine, "perimetre-attente", { indexes }, {});
    assert.equal(averti.statut, "ok");
    assert.match(averti.sortie, /^ {2}⚠ /);
  } finally {
    console.log = log;
  }
  assert.equal(journal.length, 1);
  // Sans problème : rien d'affiché.
  assert.equal(executer(racine, "perimetre-attente", { indexes: ["docs/projets/a.md"] }, {}).sortie, "");
});

test("branche principale : refusée hors CI, tolérée pour un push sans branche, hors dépôt git", () => {
  assert.equal(executer(depot("master"), "branche-principale", { env: {} }).statut, "echec");
  assert.match(
    executer(depot("main"), "branche-principale", { env: {}, cfg: { lang: "en" } }).message,
    /^direct work on the main branch \(main\)/,
  );
  assert.deepEqual(executer(depot("travail"), "branche-principale", { env: {} }), { statut: "ok" });
  assert.deepEqual(executer(tmp(), "branche-principale", { env: {} }), { statut: "ok" });
  const maitre = depot("master");
  assert.equal(executer(maitre, "branche-principale", { env: { CI: "1" } }).statut, "non-applicable");
  assert.equal(executer(maitre, "branche-principale", { env: { DRWIL_PUSH_TAGS_ONLY: "1" } }).detail, "push de tags uniquement");
  assert.equal(executer(maitre, "branche-principale", { env: { DRWIL_PUSH_SANS_BRANCHE: "1" } }).statut, "non-applicable");
});

test("autotest : sans dossier ou sans test non applicable ; sinon les tests du dépôt tournent (même sous node --test)", () => {
  const racine = depot();
  assert.equal(executer(racine, "controles-autotest").detail, "tests propres au dépôt drwil, non livrés");
  ecrire(racine, ".githooks/a.mjs", "");
  assert.equal(executer(racine, "controles-autotest").statut, "non-applicable");
  ecrire(racine, ".githooks/a.test.mjs", "import { test } from 'node:test';\ntest('échoue', () => { throw new Error('x'); });\n");
  assert.equal(executer(racine, "controles-autotest").statut, "echec");
});

test("couverture CI : sans CI non exécuté, sinon check-control-coverage du projet", () => {
  const racine = depot();
  assert.equal(executer(racine, "couverture-ci").statut, "non-execute");
  assert.equal(executer(racine, "couverture-ci", { cfg: { ciFiles: "pas une liste" } }).statut, "non-execute");
  ecrire(racine, ".githooks/check-control-coverage.mjs", "");
  assert.equal(executer(racine, "couverture-ci", { cfg: { ciFiles: ["ci.yml"] } }).statut, "ok");
});

test("contrôles du projet : identifiant, nom, report au commit hors chemins, cwd", () => {
  const racine = depot();
  ecrire(racine, "sous/marque.js", "");
  const cfg = {
    checks: [
      {
        id: "nomme",
        name: "Nommé",
        run: "node -e \"process.exit(require('fs').existsSync('marque.js') ? 0 : 1)\"",
        cwd: "sous",
        chemins: ["src/**"],
      },
      { run: "node -e 0", chemins: [] },
    ],
  };
  const sans = parId(controles(racine, { cfg }));
  assert.equal(sans.nomme.nom, "Nommé");
  assert.equal(sans.nomme.executer({ stdio: "pipe" }).statut, "ok");
  const reporte = parId(controles(racine, { cfg, indexes: ["docs/a.md"] }));
  assert.deepEqual(reporte.nomme.executer(), {
    statut: "non-execute",
    detail: "aucun fichier indexé sous ses chemins : rejoué au push et en CI",
  });
  assert.equal(reporte["projet:node -e 0"].executer({ stdio: "pipe" }).statut, "ok");
  const touche = parId(controles(racine, { cfg, indexes: ["src/x/y.js"] }));
  assert.equal(touche.nomme.executer({ stdio: "pipe" }).statut, "ok");
  // checks absent ou mal formé : seuls les contrôles du socle.
  assert.equal(controles(racine, { cfg: { checks: {} } }).length, 6);
  assert.equal(controles(racine).length, 6);
});

test("racineDuProjet : dossier parent de .githooks/ quel que soit le dossier courant ; DRWIL_RACINE la remplace", () => {
  const url = pathToFileURL(join(tmpdir(), "projet", ".githooks", "run-checks.mjs")).href;
  assert.equal(racineDuProjet(url, {}), join(tmpdir(), "projet"));
  assert.equal(racineDuProjet(url, { DRWIL_RACINE: "/ailleurs" }), "/ailleurs");
  const avant = process.env.DRWIL_RACINE;
  delete process.env.DRWIL_RACINE;
  try {
    assert.equal(racineDuProjet(url), join(tmpdir(), "projet"));
  } finally {
    if (avant !== undefined) process.env.DRWIL_RACINE = avant;
  }
});
