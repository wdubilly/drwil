import { test } from "node:test";
import assert from "node:assert/strict";
import { globToRegex, matchPaths } from "./glob.mjs";

test("globToRegex : ** traverse les /, * non, le reste est littéral", () => {
  const re = globToRegex("docs/**/*.md");
  assert.ok(re.test("docs/a.md"));
  assert.ok(re.test("docs/x/y/a.md"));
  assert.ok(!re.test("docs/a.mdx"));
  assert.ok(globToRegex("**").test("a/b/c"));
  assert.ok(globToRegex("src/**").test("src/a/b"));
  assert.ok(!globToRegex("src/*").test("src/a/b"));
  assert.ok(globToRegex("a+b(1).js").test("a+b(1).js"));
  assert.ok(!globToRegex("a.js").test("abjs"));
});

test("matchPaths : un motif `!` retire les fichiers déjà pris, le dernier motif qui correspond décide", () => {
  const sans = matchPaths([".githooks/**", "!.githooks/*.test.mjs"]);
  assert.ok(sans(".githooks/engine.mjs"));
  assert.ok(sans(".githooks/sous/a.test.mjs"));
  assert.ok(!sans(".githooks/engine.test.mjs"));
  assert.ok(!sans("docs/a.md"));
  const reprise = matchPaths([".githooks/**", "!.githooks/*.test.mjs", ".githooks/engine.test.mjs"]);
  assert.ok(reprise(".githooks/engine.test.mjs"), "un motif positif plus loin reprend le fichier");
  assert.ok(!reprise(".githooks/state.test.mjs"));
  const avant = matchPaths(["!.githooks/*.test.mjs", ".githooks/**"]);
  assert.ok(avant(".githooks/engine.test.mjs"), "l'ordre compte : l'exclusion placée avant ne retire rien");
});

test("matchPaths : sans motif positif rien ne correspond, sans `!` le résultat est celui de globToRegex", () => {
  assert.ok(!matchPaths(["!a/**"])("a/b"));
  assert.ok(!matchPaths([])("a"));
  const simple = matchPaths(["src/**", "*.json"]);
  assert.ok(simple("src/a/b.ts") && simple("package.json") && !simple("docs/x.json"));
});
