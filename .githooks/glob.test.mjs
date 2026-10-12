import { test } from "node:test";
import assert from "node:assert/strict";
import { globToRegex } from "./glob.mjs";

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
