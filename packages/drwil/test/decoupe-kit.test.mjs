// QUA-315 : la découpe par thème de kit.test.mjs ne perd ni ne change aucun test. L'inventaire figé avant la découpe
// (decoupe-kit.inventaire.json, noms triés) est comparé aux tests que déclarent, à cet instant, kit.test.mjs et les
// fichiers nés de sa découpe (kit-<thème>.test.mjs) : même nombre, mêmes noms, donc mêmes contrats cités.
// Lecture statique, jamais une exécution : jouer ces fichiers coûte plus d'une minute, et un test qui ne se charge
// plus est déjà un échec de son contrôle (QUA-033).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const DOSSIER = fileURLToPath(new URL(".", import.meta.url));
const INVENTAIRE = JSON.parse(readFileSync(join(DOSSIER, "decoupe-kit.inventaire.json"), "utf8"));
const DU_KIT = /^kit(-[a-z0-9-]+)?\.test\.mjs$/;
// Une déclaration de test commence sa ligne ; son nom est une chaîne entre guillemets doubles (forme du fichier découpé).
const DECLARATION = /^\s*test\s*\(/gm;
const NOMMEE = /^\s*test\s*\(\s*"((?:\\.|[^"\\])*)"/gm;
const ID = /\b[A-Z][A-Z0-9]*-\d+\b/g;

/** Textes des fichiers du kit, `{ fichier: texte }`. */
function fichiersDuKit() {
  return Object.fromEntries(
    readdirSync(DOSSIER)
      .filter((f) => DU_KIT.test(f))
      .sort()
      .map((f) => [f, readFileSync(join(DOSSIER, f), "utf8")]),
  );
}

/** Noms des tests déclarés par `textes`, triés, et déclarations qui n'ont pas pu être lues. */
export function inventaire(textes) {
  const noms = [];
  const illisibles = [];
  for (const [fichier, texte] of Object.entries(textes)) {
    const lus = [...texte.matchAll(NOMMEE)].map((m) => JSON.parse(`"${m[1]}"`));
    const declares = texte.match(DECLARATION)?.length ?? 0;
    if (declares !== lus.length) illisibles.push(`${fichier} : ${declares} déclaration(s), ${lus.length} lue(s)`);
    noms.push(...lus);
  }
  return { noms: noms.sort(), illisibles };
}

/** Nombre de tests par contrat cité dans les noms. */
export function parContrat(noms) {
  const compte = {};
  for (const n of noms) for (const id of new Set(n.match(ID) ?? [])) compte[id] = (compte[id] ?? 0) + 1;
  return Object.fromEntries(Object.entries(compte).sort(([a], [b]) => a.localeCompare(b)));
}

/** Écarts entre deux listes de noms : les absents de `apres`, les nouveaux, les doublés. */
export function ecarts(avant, apres) {
  const reste = [...apres];
  const perdus = [];
  for (const n of avant) {
    const i = reste.indexOf(n);
    if (i < 0) perdus.push(n);
    else reste.splice(i, 1);
  }
  return { perdus, ajoutes: reste };
}

test("QUA-315 : les fichiers du kit déclarent exactement les tests de l'inventaire figé avant la découpe, ni perdus, ni renommés, ni doublés", () => {
  const textes = fichiersDuKit();
  assert.ok(textes["kit.test.mjs"] || Object.keys(textes).length > 1, "aucun fichier de tests du kit trouvé");
  const { noms, illisibles } = inventaire(textes);
  assert.deepEqual(illisibles, [], "déclaration de test hors de la forme lue : le test de non-perte ne la verrait pas");
  assert.deepEqual(ecarts(INVENTAIRE.tests, noms), { perdus: [], ajoutes: [] });
  assert.equal(noms.length, INVENTAIRE.tests.length);
});

test("QUA-315 : chaque contrat cité par l'inventaire garde le même nombre de tests dans les fichiers du kit", () => {
  const { noms } = inventaire(fichiersDuKit());
  assert.deepEqual(parContrat(noms), parContrat(INVENTAIRE.tests));
});

test("QUA-315 : aucun test des fichiers du kit n'est sauté, réservé ni isolé par sa méthode (skip, todo, only)", () => {
  for (const [fichier, texte] of Object.entries(fichiersDuKit())) assert.doesNotMatch(texte, /^\s*test\.(skip|todo|only)\s*\(/m, fichier);
});

test("QUA-315 : un test perdu, renommé, doublé ou déclaré hors de la forme lue est détecté", () => {
  const avant = { "kit.test.mjs": 'test("QUA-1 : a", () => {});\ntest("QUA-2 : b", async () => {});\n' };
  const base = inventaire(avant).noms;
  assert.deepEqual(base, ["QUA-1 : a", "QUA-2 : b"]);
  const perdu = inventaire({ "kit-a.test.mjs": 'test("QUA-1 : a", () => {});\n' });
  assert.deepEqual(ecarts(base, perdu.noms), { perdus: ["QUA-2 : b"], ajoutes: [] });
  const renomme = inventaire({ "kit-a.test.mjs": 'test("QUA-1 : a", () => {});\ntest("QUA-3 : b", () => {});\n' });
  assert.deepEqual(ecarts(base, renomme.noms), { perdus: ["QUA-2 : b"], ajoutes: ["QUA-3 : b"] });
  assert.notDeepEqual(parContrat(renomme.noms), parContrat(base));
  const double = inventaire({ "kit-a.test.mjs": avant["kit.test.mjs"], "kit-b.test.mjs": 'test("QUA-2 : b", () => {});\n' });
  assert.deepEqual(ecarts(base, double.noms), { perdus: [], ajoutes: ["QUA-2 : b"] });
  const autreForme = inventaire({ "kit-a.test.mjs": "test(`QUA-1 : a`, () => {});\n" });
  assert.deepEqual(autreForme.illisibles, ["kit-a.test.mjs : 1 déclaration(s), 0 lue(s)"]);
});

test("QUA-315 : seuls kit.test.mjs et les fichiers kit-<thème>.test.mjs sont lus, jamais ce test ni son inventaire", () => {
  assert.ok(DU_KIT.test("kit.test.mjs"));
  assert.ok(DU_KIT.test("kit-installation.test.mjs"));
  for (const f of ["decoupe-kit.test.mjs", "decoupe-kit.inventaire.json", "kit-commun.mjs", "cycle.test.mjs"])
    assert.ok(!DU_KIT.test(f), f);
});
