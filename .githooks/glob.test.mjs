import { test } from "node:test";
import assert from "node:assert/strict";
import { globEnRegex } from "./glob.mjs";

test("globEnRegex : ** traverse les /, * non, le reste est littéral", () => {
  const re = globEnRegex("docs/**/*.md");
  assert.ok(re.test("docs/a.md"));
  assert.ok(re.test("docs/x/y/a.md"));
  assert.ok(!re.test("docs/a.mdx"));
  assert.ok(globEnRegex("**").test("a/b/c"));
  assert.ok(globEnRegex("src/**").test("src/a/b"));
  assert.ok(!globEnRegex("src/*").test("src/a/b"));
  assert.ok(globEnRegex("a+b(1).js").test("a+b(1).js"));
  assert.ok(!globEnRegex("a.js").test("abjs"));
});
