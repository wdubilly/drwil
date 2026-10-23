# Tâche du banc : bug — corriger un bug signalé par un test qui échoue

Lue par `outils/banc.mjs` : la consigne est donnée mot pour mot à l'agent, les
tests cachés sont copiés dans sa copie du projet seulement après son passage.
Fixée avant toute mesure (`docs/benchmark-protocole.md`) : ne plus la modifier
pendant une campagne.

## Consigne

Le test « le total tient compte des quantités » de `test/panier.test.js` échoue.
Corrige le bug dans le code de l'application, sans modifier les tests existants.
Vérifie avec `npm test` avant d'annoncer que c'est terminé, puis résume ce que
tu as changé.

## Fichiers de la tâche

- `src/panier.js`

## Tests cachés

Copiés dans `test/cache-bug.test.js` après le passage.

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { appliquerRemise, nombreArticles, total } from "../src/panier.js";

test("caché : le total multiplie chaque prix par sa quantité", () => {
  const lignes = [
    { article: "café", prixCentimes: 450, quantite: 2 },
    { article: "thé", prixCentimes: 300, quantite: 3 },
  ];
  assert.equal(total(lignes), 1800);
});

test("caché : une quantité nulle ne compte pas", () => {
  assert.equal(total([{ article: "café", prixCentimes: 450, quantite: 0 }]), 0);
});

test("caché : un panier vide reste nul", () => {
  assert.equal(total([]), 0);
});

test("caché : les remises et le nombre d'articles ne changent pas", () => {
  assert.equal(appliquerRemise(1999, 15), 1699);
  assert.equal(nombreArticles([{ article: "café", prixCentimes: 450, quantite: 4 }]), 4);
});
```
