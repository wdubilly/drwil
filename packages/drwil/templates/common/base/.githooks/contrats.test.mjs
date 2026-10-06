import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONTROLES_SOCLE, controlesConnus, lireContrats, validerContrats } from "./contrats.mjs";

const SECTIONS = `# Contrats

## SEC-007 — Pas de secret
**Règle** : aucun secret.
**Contrôle** : \`secrets-fichiers\`

## QUA-015 — Chantiers exploitables
**Règle** : fiches reprenables.
**Contrôle** : \`docs-references\`, \`couverture-ci\`
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
  const k = lireContrats(SECTIONS);
  assert.deepEqual(k.map((c) => c.id), ["SEC-007", "QUA-015", "SEC-001", "QUA-099"]);
  const { texte, ...champs } = k[0];
  assert.deepEqual(champs, { id: "SEC-007", titre: "Pas de secret", ligne: 3, forme: "section", regle: "aucun secret.", controles: ["secrets-fichiers"], manuel: null, severite: "bloquant", severiteBrute: null });
  assert.equal(texte, "## SEC-007 — Pas de secret\n**Règle** : aucun secret.\n**Contrôle** : `secrets-fichiers`", "texte brut de la section, sans la suivante");
  assert.deepEqual(k[1].controles, ["docs-references", "couverture-ci"]);
  assert.equal(k[1].manuel, "justesse du contenu des fiches");
  assert.equal(k[2].controles, null);
  assert.equal(k[3].controles, null);
  assert.equal(k[3].manuel, null);
});

test("forme sections : « **Contrôle:** » et valeur à la ligne suivante", () => {
  const k = lireContrats(`## SEC-007 — Pas de secret

**Règle:**
Aucun secret.

**Contrôle:**
secrets-fichiers

**Manuel:** relecture
`);
  assert.deepEqual(k[0].controles, ["secrets-fichiers"]);
  assert.equal(k[0].manuel, "relecture");
});

test("forme tableau historique, avec ou sans colonnes Contrôle/Manuel", () => {
  const k = lireContrats(`| ID | Règle | Preuve |
|---|---|---|
| SEC-006 | Pas de faille | audit |

| ID | Règle | Contrôle | Manuel |
|---|---|---|---|
| QUA-004 | Couverture | \`couverture-tests\` | — |
| QUA-018 | Périmètre | — | appréciation humaine |
`);
  assert.deepEqual(k.map((c) => [c.id, c.forme, c.controles, c.manuel]), [
    ["SEC-006", "tableau", null, null],
    ["QUA-004", "tableau", ["couverture-tests"], null],
    ["QUA-018", "tableau", null, "appréciation humaine"],
  ]);
});

test("validation : contrôle inconnu, aucune preuve, doublon, Contrôle vide ; tableau historique toléré", () => {
  const k = lireContrats(`${SECTIONS}
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
  const messages = validerContrats(k, CONTROLES_SOCLE).map((e) => e.message);
  assert.deepEqual(messages, [
    "QUA-099 : aucune preuve déclarée (champ Contrôle ou Manuel)",
    "contrat SEC-007 défini plusieurs fois",
    `SEC-007 : contrôle inconnu « inexistant » (connus : ${CONTROLES_SOCLE.join(", ")})`,
    "QUA-100 : champ Contrôle vide",
    "QUA-101 : exigence absente (champ Règle)",
  ]);
});

test("contrôles connus : socle + id des contrôles du projet", () => {
  assert.deepEqual(controlesConnus({ checks: [{ id: "couverture-tests", run: "x" }, { run: "sans id" }] }), [...CONTROLES_SOCLE, "couverture-tests"]);
  assert.deepEqual(controlesConnus(undefined), CONTROLES_SOCLE);
});

test("les identifiants de SOCLE de check-control-coverage.mjs sont des contrôles connus", () => {
  const source = readFileSync(new URL("./check-control-coverage.mjs", import.meta.url), "utf8");
  const ids = [...source.matchAll(/^\s*\{?\s*id: "([^"]+)"/gm)].map((m) => m[1]);
  assert.ok(ids.length >= 3, "SOCLE introuvable");
  for (const id of ids) assert.ok(CONTROLES_SOCLE.includes(id), id);
});

test("sévérité : bloquant par défaut, synonymes anglais, valeur inconnue refusée", () => {
  const k = lireContrats(`## QUA-001 — a
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
  assert.deepEqual(k.map((c) => c.severite), ["avertissement", "indicatif", null]);
  assert.deepEqual(validerContrats(k, CONTROLES_SOCLE).map((e) => e.type), ["severite"]);
});
