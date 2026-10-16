import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lireRegistre, principal, testsDuFichier, verifier } from "./verifier-tests-contrats.mjs";

const SCRIPT = fileURLToPath(new URL("./verifier-tests-contrats.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

function depot(fichiers, { git = true } = {}) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-tests-contrats-"));
  dossiers.push(racine);
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  if (git)
    for (const args of [
      ["init", "-q"],
      ["add", "-A"],
    ])
      assert.equal(spawnSync("git", args, { cwd: racine }).status, 0);
  return racine;
}

const REGISTRE = [
  "## QUA-001 — un",
  "**Règle** : r",
  "**Contrôle** : `tests-qua-001`",
  "**Tests** : `a.test.mjs`, `b.test.mjs`",
  "## QUA-002 — sans tests",
  "**Règle** : r",
  "## Autre section",
  "**Tests** : `ignore.test.mjs`",
].join("\n");

test("lireRegistre : champ Tests par contrat, vide sinon ; une section hors contrat est ignorée", () => {
  const r = lireRegistre(REGISTRE);
  assert.deepEqual(
    [...r],
    [
      ["QUA-001", { tests: ["a.test.mjs", "b.test.mjs"], controles: ["tests-qua-001"] }],
      ["QUA-002", { tests: [], controles: [] }],
    ],
  );
});

test("testsDuFichier : nom et ID en tête, quel que soit le guillemet ; seulement un appel en début de ligne", () => {
  const t = testsDuFichier(
    'test("QUA-001 : a", () => {});\ntest(\'QUA-002 (extension) : b\', () => {});\n  test(`sans id`, () => {});\nobjet.test("QUA-003 : pas en début de ligne")',
  );
  assert.deepEqual(t, [
    { nom: "QUA-001 : a", id: "QUA-001" },
    { nom: "QUA-002 (extension) : b", id: "QUA-002" },
    { nom: "sans id", id: null },
  ]);
});

test("verifier : cohérent dans les deux sens ; un préfixe hors contrats est ignoré", () => {
  const fichiers = new Map([
    ["a.test.mjs", 'test("QUA-001 : x", () => {});\ntest("DRWIL-012 : exigence de fiche", () => {});'],
    ["b.test.mjs", 'test("QUA-001 : y", () => {});'],
  ]);
  assert.deepEqual(verifier({ registre: lireRegistre(REGISTRE), fichiers, prefixes: ["SEC", "QUA"], existe: () => true }), []);
});

test("verifier : fichier introuvable, fichier sans test rattaché, test non cité, ID absent du registre", () => {
  const fichiers = new Map([
    ["b.test.mjs", 'test("sans rattachement", () => {});'],
    ["c.test.mjs", 'test("QUA-001 : oublié", () => {});\ntest("QUA-009 : inconnu", () => {});\ntest("QUA-009 : inconnu", () => {});'],
  ]);
  const existe = (c) => c !== "a.test.mjs";
  assert.deepEqual(verifier({ registre: lireRegistre(REGISTRE), fichiers, prefixes: ["QUA"], existe }), [
    "QUA-001 : le champ Tests cite a.test.mjs, introuvable",
    "QUA-001 : b.test.mjs ne contient aucun test dont le nom commence par QUA-001",
    "c.test.mjs : « QUA-001 : oublié » protège QUA-001, mais QUA-001 ne cite pas ce fichier dans son champ Tests",
    "c.test.mjs : « QUA-009 : inconnu » cite QUA-009, absent du registre des contrats",
  ]);
});

test("QUA-033 : un contrat qui a des tests cite son propre contrôle tests-<id> ; sans tests, aucune exigence", () => {
  const registre = lireRegistre(
    [
      "## QUA-004 — partagé",
      "**Contrôle** : `couverture-tests`, `docs-references`",
      "**Tests** : `a.test.mjs`",
      "## QUA-005 — le sien",
      "**Contrôle** : `docs-references`, `tests-qua-005`",
      "**Tests** : `a.test.mjs`",
      "## QUA-006 — sans tests",
      "**Contrôle** : `couverture-tests`",
    ].join("\n"),
  );
  const fichiers = new Map([["a.test.mjs", 'test("QUA-004 : x", () => {});\ntest("QUA-005 : y", () => {});']]);
  assert.deepEqual(verifier({ registre, fichiers, prefixes: ["QUA"], existe: () => true }), [
    "QUA-004 : a des tests mais ne cite pas son propre contrôle tests-qua-004 (un contrôle par règle)",
  ]);
});

test("principal : registre et préfixes de la configuration, fichiers de tests suivis par git", () => {
  const journal = { log: [], error: [] };
  const { log, error } = console;
  console.log = (m) => journal.log.push(m);
  console.error = (m) => journal.error.push(m);
  try {
    const ok = depot({
      ".drwil/ia-first.json": JSON.stringify({ contractPrefixes: ["REG"], dirs: { contracts: "regles.md" } }),
      "regles.md": "## REG-001 — r\n**Contrôle** : `tests-reg-001`\n**Tests** : `packages/drwil/test/kit.mjs`\n",
      "packages/drwil/test/kit.mjs": 'test("REG-001 : x", () => {});',
      "src/a.test.mjs": 'test("QUA-001 : préfixe hors contrats du projet", () => {});',
      "src/non-teste.mjs": 'test("REG-002 : pas un fichier de tests", () => {});',
    });
    assert.equal(principal(ok), 0);
    const ko = depot({ "docs/contrats.md": "## QUA-001 — r\n", "x.test.mjs": 'test("QUA-001 : x", () => {});' });
    assert.equal(principal(ko), 1);
    assert.equal(principal(depot({ "docs/contrats.md": "" }, { git: false })), 1, "hors dépôt git : non exécuté");
    assert.equal(principal(depot({})), 1, "registre absent : non exécuté");
  } finally {
    Object.assign(console, { log, error });
  }
  assert.equal(journal.log[0], "tests et contrats : 1 test(s) rattaché(s) à un contrat, 0 problème(s)");
  assert.match(journal.error[0], /x\.test\.mjs : « QUA-001 : x » protège QUA-001/);
  assert.match(journal.error.at(-2), /fichiers suivis illisibles \(git ls-files\) — contrôle non exécuté$/);
  assert.match(journal.error.at(-1), /registre docs\/contrats\.md introuvable — contrôle non exécuté$/);
});

test("ligne de commande : racine en argument ou dossier courant", () => {
  const racine = depot({ "docs/contrats.md": "## QUA-001 — r\n" });
  assert.equal(spawnSync(process.execPath, [SCRIPT, racine]).status, 0);
  assert.equal(spawnSync(process.execPath, [SCRIPT], { cwd: racine }).status, 0);
});

test("verifier : un fichier cité qui existe mais n'est pas un fichier de tests suivi ne compte pas", () => {
  const registre = lireRegistre("## QUA-001 — r\n**Contrôle** : `tests-qua-001`\n**Tests** : `non-suivi.test.mjs`\n");
  assert.deepEqual(verifier({ registre, fichiers: new Map(), prefixes: ["QUA"], existe: () => true }), [
    "QUA-001 : non-suivi.test.mjs ne contient aucun test dont le nom commence par QUA-001",
  ]);
});

test("testsDuFichier : un exemple de test cité dans une chaîne n'est pas un test", () => {
  const source = [
    "const exemples = new Map([",
    '  ["a.test.mjs", \'test("QUA-001 : dans une chaîne", () => {});\'],',
    "]);",
    'test("vrai test", () => {});',
  ].join("\n");
  assert.deepEqual(testsDuFichier(source), [{ nom: "vrai test", id: null }]);
});
