import { test } from "node:test";
import assert from "node:assert/strict";
import { niveauMinimum, verifierRisque } from "./risque.mjs";

const fiche = (risque, cadrage, extra = "") => `# Projet : x

**Statut** : cadré le 2026-10-06.
${risque ? `**Risque** : ${risque}\n` : ""}
<!-- cadrage
fichiers:
${cadrage.map((c) => `  - ${c}`).join("\n")}
-->
${extra}
## 7. Reprise
`;

test("niveau minimum : la mécanique de gouvernance impose HIGH", () => {
  assert.equal(niveauMinimum(["src/app.ts"]), "LOW");
  assert.equal(niveauMinimum([".githooks/run-checks.mjs"]), "HIGH");
  assert.equal(niveauMinimum([".github/workflows/ia-first.yml"]), "HIGH");
});

test("sans champ Risque : jamais d'erreur, avertissement si HIGH est imposé", () => {
  assert.deepEqual(verifierRisque(fiche(null, ["src/app.ts"])), { erreurs: [], avertissements: [] });
  const r = verifierRisque(fiche(null, [".githooks/moteur.mjs"]));
  assert.equal(r.erreurs.length, 0);
  assert.match(r.avertissements[0], /impose HIGH/);
});

test("forçable vers le haut seulement ; niveau inconnu refusé", () => {
  assert.match(verifierRisque(fiche("LOW", [".githooks/moteur.mjs"])).erreurs[0], /HIGH au minimum/);
  assert.deepEqual(verifierRisque(fiche("MEDIUM", ["src/app.ts"])).erreurs, []);
  assert.match(verifierRisque(fiche("ÉNORME", ["src/app.ts"])).erreurs[0], /inconnu/);
});

test("HIGH exige une section Décisions et un contrat cité", () => {
  const r = verifierRisque(fiche("HIGH", ["src/app.ts"]));
  assert.deepEqual(r.erreurs, ["risque HIGH sans section « Décisions »", "risque HIGH sans contrat concerné cité (ID du registre)"]);
  assert.deepEqual(verifierRisque(fiche("HIGH", [".githooks/moteur.mjs"], "## 4. Décisions\n\n- touche QUA-013.\n")).erreurs, []);
});
