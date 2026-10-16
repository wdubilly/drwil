import { test } from "node:test";
import assert from "node:assert/strict";
import { minimumLevel, checkRisk } from "./risk.mjs";

const fiche = (risque, cadrage, extra = "") => `# Projet : x

**Statut** : cadré le 2026-10-06.
${risque ? `**Risque** : ${risque}\n` : ""}
<!-- scope
files:
${cadrage.map((c) => `  - ${c}`).join("\n")}
-->
${extra}
## 7. Reprise
`;

test("niveau minimum : la mécanique de gouvernance impose HIGH", () => {
  assert.equal(minimumLevel(["src/app.ts"]), "LOW");
  assert.equal(minimumLevel([".githooks/run-checks.mjs"]), "HIGH");
  assert.equal(minimumLevel([".github/workflows/ia-first.yml"]), "HIGH");
});

test("sans champ Risque : jamais d'erreur, avertissement si HIGH est imposé", () => {
  assert.deepEqual(checkRisk(fiche(null, ["src/app.ts", "test/app.test.ts"])), { errors: [], warnings: [] });
  const r = checkRisk(fiche(null, [".githooks/engine.mjs"]));
  assert.equal(r.errors.length, 0);
  assert.match(r.warnings[0], /impose HIGH/);
});

test("QUA-035 : oublis au cadrage : code sans aucun test, contrat à créer sans la configuration des contrôles ; en anglais aussi", () => {
  const sansTest = checkRisk(fiche("MEDIUM", ["src/app.ts", "docs/x.md"]));
  assert.deepEqual(sansTest.warnings, [
    "le cadrage cite du code mais aucun fichier de test : les lister dès le cadrage évite un élargissement en plein chantier",
  ]);
  for (const test of ["test/app.test.ts", "src/app.spec.ts", "pkg/tests/a.py", "a_test.go", "src/__tests__/a.js"])
    assert.deepEqual(checkRisk(fiche("MEDIUM", ["src/app.ts", test])).warnings, [], test);
  assert.deepEqual(checkRisk(fiche("MEDIUM", ["docs/recettes/a.md", "README.md"])).warnings, [], "documentation seule : rien à tester");
  const critere = "\n## Critères d'acceptation\n\n- Un export vide est refusé — contrat à créer\n";
  assert.match(
    checkRisk(fiche("MEDIUM", ["src/app.ts", "test/a.test.ts"], critere)).warnings.join(),
    /ne cite pas \.drwil\/ia-first\.json/,
  );
  assert.deepEqual(checkRisk(fiche("MEDIUM", ["src/app.ts", "test/a.test.ts", ".drwil/ia-first.json"], critere)).warnings, []);
  const anglais = checkRisk(fiche("MEDIUM", ["src/app.ts"], "\n## Acceptance criteria\n\n- Refused — contract to create\n"), {
    lang: "en",
  });
  assert.deepEqual(anglais.warnings, [
    "the scope cites code but no test file: listing them when scoping avoids widening it mid-workstream",
    "a criterion creates a contract, but the scope does not cite .drwil/ia-first.json, where its check is declared: add it when scoping",
  ]);
});

test("forçable vers le haut seulement ; niveau inconnu refusé", () => {
  assert.match(checkRisk(fiche("LOW", [".githooks/engine.mjs"])).errors[0], /HIGH au minimum/);
  assert.deepEqual(checkRisk(fiche("MEDIUM", ["src/app.ts"])).errors, []);
  assert.match(checkRisk(fiche("ÉNORME", ["src/app.ts"])).errors[0], /inconnu/);
});

test("HIGH exige une section Décisions et un contrat cité", () => {
  const r = checkRisk(fiche("HIGH", ["src/app.ts"]));
  assert.deepEqual(r.errors, ["risque HIGH sans section « Décisions »", "risque HIGH sans contrat concerné cité (ID du registre)"]);
  assert.deepEqual(checkRisk(fiche("HIGH", [".githooks/engine.mjs"], "## 4. Décisions\n\n- touche QUA-013.\n")).errors, []);
});

test("messages en anglais : niveau inconnu, niveau trop bas", () => {
  const cadre = "<!-- scope\nfiles:\n  - .githooks/a.mjs\n-->\n";
  assert.deepEqual(checkRisk(`**Risk**: HUGE\n${cadre}`, { lang: "en" }).errors, ['unknown risk level "HUGE" (LOW, MEDIUM or HIGH)']);
  assert.match(
    checkRisk(`**Risk**: LOW\n${cadre}`, { lang: "en" }).errors[0],
    /^risk LOW declared, but the scope touches governance mechanics: HIGH at least/,
  );
});
