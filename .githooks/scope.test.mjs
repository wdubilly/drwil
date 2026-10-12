// Tests livrés avec le contrôle (lot 4 : les contrôles s'auto-testent chez le
// projet, pas seulement dans le paquet du kit). Lancé par run-checks.mjs
// (tests des contrôles eux-mêmes), comme tout .githooks/*.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fnmatch, tropLarge, lireBloc, estDuCode, fichesCouvrant, normaliser } from "./scope.mjs";

test("fnmatch : * et ? traversent les séparateurs, le reste est littéral", () => {
  assert.equal(fnmatch("backend/app/x.py", "backend/app/x*"), true);
  // Le `*` peut avaler un `/` (traverse les séparateurs) tant que le reste du motif reste littéral.
  assert.equal(fnmatch("backend/app/x/sous.py", "backend/app/x*"), true);
  // Mais un chemin qui ne commence pas par la partie littérale du motif ne matche pas.
  assert.equal(fnmatch("backend/app/sous/x.py", "backend/app/x*"), false);
  assert.equal(fnmatch("backend/autre/x.py", "backend/app/x*"), false);
});

test("tropLarge : ** toujours trop large, moins de deux dossiers avant le premier joker aussi", () => {
  assert.equal(tropLarge("**"), true);
  assert.equal(tropLarge("backend/*"), true);
  assert.equal(tropLarge("backend/app/x*"), false);
});

test("lireBloc : fiche sans bloc, bloc bien formé, en-tête manquante", () => {
  assert.deepEqual(lireBloc("rien ici"), { motifs: [], problemes: [] });
  const r = lireBloc("<!-- scope\nfiles:\n  - backend/app/x.py\n-->");
  assert.deepEqual(r.motifs, ["backend/app/x.py"]);
  const mal = lireBloc("<!-- scope\n  - backend/app/x.py\n-->");
  assert.equal(mal.problemes.length > 0, true);
});

test("estDuCode : jamais docs/ ni .md, code sinon selon la config", () => {
  const cfg = { layers: ["backend"], codePrefixes: [".githooks"] };
  assert.equal(estDuCode("docs/projects/x.md", cfg), false);
  assert.equal(estDuCode("README.md", cfg), false);
  assert.equal(estDuCode("backend/app/x.py", cfg), true);
  assert.equal(estDuCode(".githooks/run-checks.mjs", cfg), true);
  assert.equal(estDuCode("ailleurs/x.py", cfg), false);
});

test("fichesCouvrant : une fiche qui matche, une qui ne matche pas", () => {
  const motifs = new Map([["docs/projects/a.md", ["backend/app/x*"]]]);
  assert.deepEqual(fichesCouvrant("backend/app/x.py", motifs), ["docs/projects/a.md"]);
  assert.deepEqual(fichesCouvrant("backend/autre/y.py", motifs), []);
});

test("normaliser, estDuCode et tropLarge : cas limites (./ répétés, configuration vide, joker en tête)", () => {
  assert.equal(normaliser("././a\\b"), "a/b");
  assert.equal(estDuCode("z.txt", {}), false);
  assert.equal(estDuCode("x/a.js", { layers: ["x"] }), true);
  assert.equal(estDuCode("Makefile", { extraCodeFiles: ["Makefile"] }), true);
  assert.equal(estDuCode(".gitlab-ci.yml", { ciFiles: [".gitlab-ci.yml"] }), true);
  assert.equal(tropLarge("a*"), true);
});
