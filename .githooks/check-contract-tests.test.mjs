import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { linkProblems, main } from "./check-contract-tests.mjs";

const SCRIPT = fileURLToPath(new URL("./check-contract-tests.mjs", import.meta.url));

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
function projet(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-contrat-tests-"));
  dossiers.push(racine);
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  return racine;
}
const REGISTRE = `## APP-001 — Commande vide refusée
**Règle** : refusée.
**Contrôle** : \`app-001\`
**Tests** : \`test/commande.test.js\`

## APP-002 — Code promo expiré refusé
**Règle** : refusé.
**Contrôle** : \`app-002\`
**Tests** : \`test/promo.test.js\`, \`test/absent.test.js\`
`;
const lancer = (racine) => {
  const lignes = [];
  return { code: main(racine, (l) => lignes.push(l)), lignes };
};

test("QUA-029 : linkProblems : fichier absent, fichier sans l'ID, ID préfixe d'un autre ; contrats sans Tests ignorés", () => {
  const textes = { "a.test.js": 'test("APP-002 : refusé")', "b.test.js": 'test("APP-0021 : autre")', "c.test.js": "rien" };
  const lire = (f) => textes[f] ?? null;
  const contrats = [
    { id: "APP-002", tests: ["a.test.js", "b.test.js", "absent.test.js"] },
    { id: "APP-003", tests: ["c.test.js"] },
    { id: "APP-004", tests: null },
  ];
  assert.deepEqual(linkProblems(contrats, lire), {
    links: 4,
    problems: [
      "APP-002 : `b.test.js` ne porte pas l'ID APP-002 (le citer dans le nom du test qui le protège)",
      "APP-002 : test cité introuvable `absent.test.js`",
      "APP-003 : `c.test.js` ne porte pas l'ID APP-003 (le citer dans le nom du test qui le protège)",
    ],
  });
  assert.deepEqual(linkProblems([{ id: "APP-003", tests: ["x", "c.test.js"] }], lire, "en").problems, [
    "APP-003: cited test not found `x`",
    "APP-003: `c.test.js` does not carry the ID APP-003 (cite it in the name of the test that protects it)",
  ]);
  assert.deepEqual(linkProblems([], lire), { links: 0, problems: [] });
});

test("QUA-029 : bloquant si newRequirements l'impose, avertissement sinon ; un dossier n'est pas un test", () => {
  const fichiers = {
    "docs/contracts.md": REGISTRE,
    "test/commande.test.js": 'test("APP-001 : commande vide refusée", () => {});',
    "test/promo.test.js": 'test("APP-002 : code expiré refusé", () => {});',
    "test/absent.test.js/.gitkeep": "",
  };
  const bloquant = projet({ ...fichiers, ".drwil/ia-first.json": '{"newRequirements":"blocking"}' });
  assert.deepEqual(lancer(bloquant), {
    code: 1,
    lignes: [
      "  ✗ APP-002 : test cité introuvable `test/absent.test.js`",
      "contract-tests : 3 lien(s) contrat ↔ test vérifié(s), 1 problème(s)",
    ],
  });
  const ancien = projet({ ...fichiers, ".drwil/ia-first.json": '{"lang":"en"}' });
  const r = lancer(ancien);
  assert.equal(r.code, 0);
  assert.equal(r.lignes[0], "  ⚠ APP-002: cited test not found `test/absent.test.js`");
  assert.match(r.lignes[2], /recent requirement, not blocking/);
});

test("QUA-029 : sans configuration ni registre, ou registre réglé et liens sains : vert", () => {
  assert.deepEqual(lancer(projet({})), { code: 0, lignes: ["contract-tests : 0 lien(s) contrat ↔ test vérifié(s), 0 problème(s)"] });
  const racine = projet({
    ".drwil/ia-first.json": '{"newRequirements":"blocking","dirs":{"contracts":"regles.md"}}',
    "regles.md": REGISTRE.replace(", `test/absent.test.js`", ""),
    "test/commande.test.js": "APP-001",
    "test/promo.test.js": "APP-002",
  });
  assert.equal(lancer(racine).code, 0);
});

test("QUA-029 : ligne de commande, directe ou par un lien symbolique : code de sortie du contrôle", () => {
  const racine = projet({ ".drwil/ia-first.json": '{"newRequirements":"blocking"}', "docs/contracts.md": REGISTRE });
  assert.equal(spawnSync(process.execPath, [SCRIPT], { cwd: racine }).status, 1);
  const lien = join(racine, "lien.mjs");
  symlinkSync(SCRIPT, lien);
  const r = spawnSync(process.execPath, [lien], { cwd: projet({}), encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /0 lien\(s\)/);
});
