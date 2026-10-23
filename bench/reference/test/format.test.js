import assert from "node:assert/strict";
import { test } from "node:test";
import { euros } from "../src/format.js";

test("un montant s'affiche en euros avec une virgule", () => {
  assert.equal(euros(1250), "12,50 €");
});

test("les centimes gardent deux chiffres", () => {
  assert.equal(euros(705), "7,05 €");
});

test("un montant non entier est refusé", () => {
  assert.throws(() => euros(12.5), TypeError);
});
