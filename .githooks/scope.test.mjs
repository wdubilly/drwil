// Tests livrés avec le contrôle (lot 4 : les contrôles s'auto-testent chez le
// projet, pas seulement dans le paquet du kit). Lancé par run-checks.mjs
// (tests des contrôles eux-mêmes), comme tout .githooks/*.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fnmatch, tooBroad, readBlock, isCode, briefsCovering, normalize } from "./scope.mjs";

test("fnmatch : * et ? traversent les séparateurs, le reste est littéral", () => {
  assert.equal(fnmatch("backend/app/x.py", "backend/app/x*"), true);
  // Le `*` peut avaler un `/` (traverse les séparateurs) tant que le reste du motif reste littéral.
  assert.equal(fnmatch("backend/app/x/sous.py", "backend/app/x*"), true);
  // Mais un chemin qui ne commence pas par la partie littérale du motif ne matche pas.
  assert.equal(fnmatch("backend/app/sous/x.py", "backend/app/x*"), false);
  assert.equal(fnmatch("backend/autre/x.py", "backend/app/x*"), false);
});

test("tooBroad : ** toujours trop large, moins de deux dossiers avant le premier joker aussi", () => {
  assert.equal(tooBroad("**"), true);
  assert.equal(tooBroad("backend/*"), true);
  assert.equal(tooBroad("backend/app/x*"), false);
});

test("readBlock : fiche sans bloc, bloc bien formé, en-tête manquante", () => {
  assert.deepEqual(readBlock("rien ici"), { patterns: [], problems: [] });
  const r = readBlock("<!-- scope\nfiles:\n  - backend/app/x.py\n-->");
  assert.deepEqual(r.patterns, ["backend/app/x.py"]);
  const mal = readBlock("<!-- scope\n  - backend/app/x.py\n-->");
  assert.equal(mal.problems.length > 0, true);
});

test("isCode : jamais docs/ ni .md, code sinon selon la config", () => {
  const cfg = { layers: ["backend"], codePrefixes: [".githooks"] };
  assert.equal(isCode("docs/projects/x.md", cfg), false);
  assert.equal(isCode("README.md", cfg), false);
  assert.equal(isCode("backend/app/x.py", cfg), true);
  assert.equal(isCode(".githooks/run-checks.mjs", cfg), true);
  assert.equal(isCode("ailleurs/x.py", cfg), false);
});

test("briefsCovering : une fiche qui matche, une qui ne matche pas", () => {
  const motifs = new Map([["docs/projects/a.md", ["backend/app/x*"]]]);
  assert.deepEqual(briefsCovering("backend/app/x.py", motifs), ["docs/projects/a.md"]);
  assert.deepEqual(briefsCovering("backend/autre/y.py", motifs), []);
});

test("normaliser, isCode et tooBroad : cas limites (./ répétés, configuration vide, joker en tête)", () => {
  assert.equal(normalize("././a\\b"), "a/b");
  assert.equal(isCode("z.txt", {}), false);
  assert.equal(isCode("x/a.js", { layers: ["x"] }), true);
  assert.equal(isCode("Makefile", { extraCodeFiles: ["Makefile"] }), true);
  assert.equal(isCode(".gitlab-ci.yml", { ciFiles: [".gitlab-ci.yml"] }), true);
  assert.equal(tooBroad("a*"), true);
});
