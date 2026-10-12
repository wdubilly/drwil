import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ATTENDUS, causeInstallation, comparerContenu, derouler, lireVerdict, principal } from "./tester-tarball.mjs";

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-tarball-test-"));
  dossiers.push(d);
  return d;
};

const LIVRES = ["LICENSE", "README.md", "package.json", "bin/drwil.js", "dist/index.js", "dist/index.d.ts.map", "templates/common/a"];
const VERDICT = {
  version: 1,
  status: "manual",
  exitCode: 1,
  contracts: { total: 8, passed: 5, failed: 0, manual: 3, error: 0 },
  results: [],
  errors: [],
};

/** Simule npm et la CLI installée ; `remplacer[etape]` change le résultat d'une étape. */
function simulateur(remplacer = {}) {
  const appels = [];
  const lancer = (cmd, args, { cwd }) => {
    const etape = cmd === "npm" ? args[0] : args[0].replace(/^--/, "");
    appels.push(etape);
    if (remplacer[etape]) return remplacer[etape]({ cwd });
    if (etape === "pack") {
      const info = [{ filename: "drwil-0.3.0.tgz", version: "0.3.0", files: LIVRES.map((path) => ({ path })) }];
      return { status: 0, stdout: `> drwil@0.3.0 prepack\n> tsc --build\n${JSON.stringify(info)}` };
    }
    if (etape === "install") {
      mkdirSync(join(cwd, "node_modules", ".bin"), { recursive: true });
      for (const f of ["drwil", "drwil.cmd"]) writeFileSync(join(cwd, "node_modules", ".bin", f), "");
      return { status: 0, stdout: "added 2 packages" };
    }
    if (etape === "version") return { status: 0, stdout: "0.3.0\n" };
    if (etape === "init") return { status: 0, stdout: "IA-first scaffolding applied" };
    return { status: 1, stdout: JSON.stringify(VERDICT) };
  };
  return { lancer, appels };
}

test("comparerContenu : le paquet réel attendu passe ; fichier inattendu et motif sans fichier signalés", () => {
  assert.deepEqual(comparerContenu(LIVRES), []);
  assert.deepEqual(comparerContenu([...LIVRES.filter((f) => !f.startsWith("bin/")), "outils/x.mjs"]), [
    "fichier inattendu dans le paquet : outils/x.mjs",
    `aucun fichier du paquet ne correspond à ${ATTENDUS[3]}`,
  ]);
  assert.match(comparerContenu(["dist/sous/x.js", ...LIVRES])[0], /inattendu.*dist\/sous\/x\.js/);
});

test("causeInstallation : registre injoignable = non exécuté, autre échec = échec", () => {
  assert.equal(causeInstallation("npm error code ECONNREFUSED"), "non-execute");
  assert.equal(causeInstallation("npm error getaddrinfo EAI_AGAIN registry.npmjs.org"), "non-execute");
  assert.equal(causeInstallation("npm error code ENOENT"), "echec");
});

test("lireVerdict : MANUAL sur un projet neuf est attendu ; FAIL, ERROR, sortie illisible ou vide ne le sont pas", () => {
  assert.equal(lireVerdict({ status: 1, stdout: JSON.stringify(VERDICT) }), null);
  const echec = {
    ...VERDICT,
    status: "fail",
    contracts: { ...VERDICT.contracts, failed: 1 },
    results: [{ id: "QUA-013", status: "fail" }],
  };
  assert.equal(lireVerdict({ status: 1, stdout: JSON.stringify(echec) }), "drwil verify : fail sur un projet neuf — QUA-013");
  const erreurs = { ...VERDICT, errors: ["registre illisible"] };
  assert.match(lireVerdict({ status: 1, stdout: JSON.stringify(erreurs) }), /registre illisible/);
  assert.match(lireVerdict({ status: 2, stdout: "", stderr: "boom" }), /JSON illisible \(code 2\) boom/);
  assert.match(lireVerdict({ status: 0, stdout: JSON.stringify(VERDICT) }), /pas de verdict \(code 0\)/);
  const vide = { ...VERDICT, contracts: { total: 0 } };
  assert.match(lireVerdict({ status: 1, stdout: JSON.stringify(vide) }), /aucun contrat/);
});

test("derouler : pack, contenu, installation, --version, init (CI GitHub) puis verify", () => {
  const { lancer, appels } = simulateur();
  const r = derouler({ paquet: "p", temp: dossier(), lancer });
  assert.deepEqual(r, {
    statut: "ok",
    message: "tarball drwil-0.3.0.tgz : 7 fichier(s) attendus, installé, --version, init et verify OK",
  });
  assert.deepEqual(appels, ["pack", "install", "version", "init", "verify"]);
});

test("derouler : chaque étape qui casse arrête le contrôle, avec sa cause", () => {
  const cas = {
    "npm introuvable": [{ pack: () => ({ error: new Error("ENOENT") }) }, "non-execute", /npm introuvable/],
    "pack en échec": [{ pack: () => ({ status: 1, stderr: "tsc: erreur" }) }, "echec", /npm pack a échoué : tsc/],
    "pack illisible": [{ pack: () => ({ status: 0, stdout: "pas de json" }) }, "echec", /JSON illisible/],
    "paquet incomplet": [
      { pack: () => ({ status: 0, stdout: '[{"filename":"t.tgz","files":[{"path":"x"}]}]' }) },
      "echec",
      /inattendu dans le paquet : x/,
    ],
    "sans réseau": [
      { install: () => ({ status: 1, stderr: "npm error code ECONNREFUSED\nligne\nligne\nligne\npile" }) },
      "non-execute",
      /ECONNREFUSED\nligne\nligne\nligne$/,
    ],
    "bin absent": [{ install: () => ({ status: 0 }) }, "echec", /champ bin du manifeste/],
    "mauvaise version": [{ version: () => ({ status: 0, stdout: "0.2.0" }) }, "echec", /« 0\.2\.0 », attendu 0\.3\.0/],
    "init en échec": [{ init: () => ({ status: 1, stderr: "boom" }) }, "echec", /drwil init a échoué \(code 1\) : boom/],
    "verify sans verdict": [{ verify: () => ({ status: 2, stdout: "" }) }, "echec", /JSON illisible/],
  };
  for (const [nom, [remplacer, statut, message]] of Object.entries(cas)) {
    const { lancer } = simulateur(remplacer);
    const r = derouler({ paquet: "p", temp: dossier(), lancer });
    assert.equal(r.statut, statut, nom);
    assert.match(r.message, message, nom);
  }
});

test("principal : dossier temporaire supprimé, même en échec ; non exécuté sans paquet", () => {
  const journal = { log: [], error: [] };
  const { log, error } = console;
  console.log = (m) => journal.log.push(m);
  console.error = (m) => journal.error.push(m);
  const temps = [];
  const suivre = (lancer) => (cmd, args, opts) => {
    temps.push(opts.cwd);
    return lancer(cmd, args, opts);
  };
  const racine = dossier();
  try {
    mkdirSync(join(racine, "packages", "drwil"), { recursive: true });
    writeFileSync(join(racine, "packages", "drwil", "package.json"), "{}");
    assert.equal(principal(racine, suivre(simulateur().lancer)), 0);
    assert.equal(principal(racine, suivre(simulateur({ install: () => ({ status: 1, stderr: "EAI_AGAIN" }) }).lancer)), 1);
    assert.equal(principal(dossier()), 1);
  } finally {
    Object.assign(console, { log, error });
  }
  const hors = temps.filter((d) => !d.startsWith(racine));
  assert.ok(hors.length > 0 && hors.every((d) => !existsSync(d)), "dossiers temporaires supprimés");
  assert.match(journal.log[0], /^tarball drwil-0\.3\.0\.tgz/);
  assert.equal(journal.error[0], "✗ tarball : installation du tarball impossible : EAI_AGAIN — contrôle non exécuté");
  assert.match(journal.error[1], /paquet .* introuvable — contrôle non exécuté$/);
});

test("ligne de commande : racine en argument, non exécuté sans paquet", () => {
  const script = fileURLToPath(new URL("./tester-tarball.mjs", import.meta.url));
  const r = spawnSync(process.execPath, [script, dossier()], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /introuvable — contrôle non exécuté/);
});
