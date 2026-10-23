import assert from "node:assert/strict";
import { test } from "node:test";
import { appliquerRemise, nombreArticles, total } from "../src/panier.js";

const panier = [
  { article: "café", prixCentimes: 450, quantite: 2 },
  { article: "thé", prixCentimes: 300, quantite: 1 },
];

test("le total d'un panier vide est nul", () => {
  assert.equal(total([]), 0);
});

test("le total tient compte des quantités", () => {
  assert.equal(total(panier), 1200);
});

test("une remise de 10 % sur 1200 centimes donne 1080", () => {
  assert.equal(appliquerRemise(1200, 10), 1080);
});

test("une remise hors de 0 à 100 % est refusée", () => {
  assert.throws(() => appliquerRemise(1200, 120), RangeError);
});

test("le nombre d'articles additionne les quantités", () => {
  assert.equal(nombreArticles(panier), 3);
});
