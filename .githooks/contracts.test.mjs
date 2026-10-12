import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BASE_CHECKS, knownChecks, readContracts, validateContracts } from "./contracts.mjs";

const SECTIONS = `# Contrats

## SEC-007 — Pas de secret
**Règle** : aucun secret.
**Contrôle** : \`secrets\`

## QUA-015 — Chantiers exploitables
**Règle** : fiches reprenables.
**Contrôle** : \`docs-references\`, \`ci-coverage\`
**Manuel** : justesse du contenu des fiches

## SEC-001 — Portée des droits
**Règle** : droits côté serveur.
**Manuel** : tests d'autorisation du projet

## QUA-099 — Sans preuve
**Règle** : rien de déclaré.

## Autre section
**Contrôle** : \`ignoré-hors-contrat\`
`;

test("forme sections : Contrôle, Manuel, contrats sans champ", () => {
  const k = readContracts(SECTIONS);
  assert.deepEqual(
    k.map((c) => c.id),
    ["SEC-007", "QUA-015", "SEC-001", "QUA-099"],
  );
  const { text: texte, ...champs } = k[0];
  assert.deepEqual(champs, {
    id: "SEC-007",
    title: "Pas de secret",
    line: 3,
    form: "section",
    rule: "aucun secret.",
    checks: ["secrets"],
    manual: null,
    severity: "blocking",
    rawSeverity: null,
  });
  assert.equal(
    texte,
    "## SEC-007 — Pas de secret\n**Règle** : aucun secret.\n**Contrôle** : `secrets`",
    "texte brut de la section, sans la suivante",
  );
  assert.deepEqual(k[1].checks, ["docs-references", "ci-coverage"]);
  assert.equal(k[1].manual, "justesse du contenu des fiches");
  assert.equal(k[2].checks, null);
  assert.equal(k[3].checks, null);
  assert.equal(k[3].manual, null);
});

test("forme sections : « **Contrôle:** » et valeur à la ligne suivante", () => {
  const k = readContracts(`## SEC-007 — Pas de secret

**Règle:**
Aucun secret.

**Contrôle:**
secrets

**Manuel:** relecture
`);
  assert.deepEqual(k[0].checks, ["secrets"]);
  assert.equal(k[0].manual, "relecture");
});

test("forme tableau historique, avec ou sans colonnes Contrôle/Manuel", () => {
  const k = readContracts(`| ID | Règle | Preuve |
|---|---|---|
| SEC-006 | Pas de faille | audit |

| ID | Règle | Contrôle | Manuel |
|---|---|---|---|
| QUA-004 | Couverture | \`couverture-tests\` | — |
| QUA-018 | Périmètre | — | appréciation humaine |
`);
  assert.deepEqual(
    k.map((c) => [c.id, c.form, c.checks, c.manual]),
    [
      ["SEC-006", "table", null, null],
      ["QUA-004", "table", ["couverture-tests"], null],
      ["QUA-018", "table", null, "appréciation humaine"],
    ],
  );
});

test("validation : contrôle inconnu, aucune preuve, doublon, Contrôle vide ; tableau historique toléré", () => {
  const k = readContracts(`${SECTIONS}
## SEC-007 — Doublon
**Règle** : x.
**Contrôle** : \`inexistant\`

## QUA-100 — Vide
**Règle** : x.
**Contrôle** :

## QUA-101 — Sans exigence
**Manuel** : relecture

| ID | Règle |
|---|---|
| SEC-006 | historique |
`);
  const messages = validateContracts(k, BASE_CHECKS).map((e) => e.message);
  assert.deepEqual(messages, [
    "QUA-099 : aucune preuve déclarée (champ Contrôle ou Manuel)",
    "contrat SEC-007 défini plusieurs fois",
    `SEC-007 : contrôle inconnu « inexistant » (connus : ${BASE_CHECKS.join(", ")})`,
    "QUA-100 : champ Contrôle vide",
    "QUA-101 : exigence absente (champ Règle)",
  ]);
});

test("contrôles connus : socle + id des contrôles du projet", () => {
  assert.deepEqual(knownChecks({ checks: [{ id: "couverture-tests", run: "x" }, { run: "sans id" }] }), [
    ...BASE_CHECKS,
    "couverture-tests",
  ]);
  assert.deepEqual(knownChecks(undefined), BASE_CHECKS);
});

test("les identifiants de SOCLE de check-control-coverage.mjs sont des contrôles connus", () => {
  const source = readFileSync(new URL("./check-control-coverage.mjs", import.meta.url), "utf8");
  const ids = [...source.matchAll(/^\s*\{?\s*id: "([^"]+)"/gm)].map((m) => m[1]);
  assert.ok(ids.length >= 3, "SOCLE introuvable");
  for (const id of ids) assert.ok(BASE_CHECKS.includes(id), id);
});

test("sévérité : bloquant par défaut, synonymes anglais, valeur inconnue refusée", () => {
  const k = readContracts(`## QUA-001 — a
**Règle** : x.
**Contrôle** : \`docs-references\`
**Sévérité** : avertissement

## QUA-002 — b
**Règle** : x.
**Contrôle** : \`docs-references\`
**Severity** : advisory

## QUA-003 — c
**Règle** : x.
**Contrôle** : \`docs-references\`
**Sévérité** : énorme
`);
  assert.deepEqual(
    k.map((c) => c.severity),
    ["warning", "advisory", null],
  );
  assert.deepEqual(
    validateContracts(k, BASE_CHECKS).map((e) => e.type),
    ["severity"],
  );
});

test("messages en anglais ; titre sans tiret, tableau sans règle", () => {
  const contrats = readContracts(
    [
      "## QUA-001",
      "**Rule**: r",
      "**Check**:",
      "",
      "**Severity**: bizarre",
      "## QUA-002 — sans preuve",
      "**Rule**: r",
      "## QUA-003 — inconnu",
      "**Rule**: r",
      "**Check**: `fantome`",
      "",
      "| ID | Règle |",
      "|---|---|",
      "| QUA-004 | |",
      "| QUA-005 |",
    ].join("\n"),
  );
  assert.equal(contrats[0].title, "");
  assert.deepEqual(
    contrats.slice(3).map((k) => [k.id, k.title, k.rule]),
    [
      ["QUA-004", "", null],
      ["QUA-005", "", null],
    ],
  );
  const messages = validateContracts(contrats, ["docs-references"], "en").map((e) => e.message);
  assert.deepEqual(messages, [
    "QUA-001: empty Check field",
    'QUA-001: unknown severity "bizarre" (blocking, warning or advisory)',
    "QUA-002: no declared proof (Check or Manual field)",
    'QUA-003: unknown check "fantome" (known: docs-references)',
  ]);
});
