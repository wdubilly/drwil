import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ACTIVITES, ETAT_NEUTRE, contexte, lireEtat, transitionAutorisee, validerEtat } from "./etat.mjs";

const FICHE = "docs/projets/exemple.md";

function depot({ etat, fiche = true, lang } = {}) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-etat-"));
  mkdirSync(join(racine, ".drwil"));
  mkdirSync(join(racine, "docs", "projets"), { recursive: true });
  if (lang) writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ lang }));
  if (fiche) {
    writeFileSync(join(racine, FICHE), `# Projet : Exemple

**Statut** : cadré le 2026-10-09.

<!-- cadrage
fichiers:
  - src/auth/login.ts
  - tests/auth/login.test.ts
-->
`);
  }
  if (etat !== undefined) {
    writeFileSync(join(racine, ".drwil", "state.json"), typeof etat === "string" ? etat : JSON.stringify(etat));
  }
  return racine;
}

const actif = (activite, extra = {}) => ({ version: 1, activite, attente_active: FICHE, demande_active: null, depuis: "2026-10-09T10:00:00Z", ...extra });

test("sans state.json : CADRAGE neutre, jamais d'état actif implicite", () => {
  const lu = lireEtat(depot());
  assert.equal(lu.source, "absent");
  assert.deepEqual(lu.etat, ETAT_NEUTRE);
  assert.deepEqual(lu.problemes, []);
});

test("état actif valide : activité et attente lues depuis le disque", () => {
  const lu = lireEtat(depot({ etat: actif("REALISATION") }));
  assert.equal(lu.source, "fichier");
  assert.deepEqual(lu.problemes, []);
  assert.equal(lu.etat.activite, "REALISATION");
  assert.equal(lu.etat.attente_active, FICHE);
});

test("JSON illisible : état invalide, ramené au neutre, problème signalé", () => {
  const lu = lireEtat(depot({ etat: "{ pas du json" }));
  assert.equal(lu.source, "fichier");
  assert.deepEqual(lu.etat, ETAT_NEUTRE);
  assert.match(lu.problemes[0], /illisible/);
});

test("validation : activité inconnue, champ inconnu, version absente", () => {
  const racine = depot();
  assert.match(validerEtat({ ...actif("CODAGE") }, racine)[0], /activité inconnue/);
  // Le périmètre vit dans la fiche versionnée, jamais dans l'état local.
  assert.match(validerEtat({ ...actif("REALISATION"), perimetre_actif: ["src/"] }, racine)[0], /champ inconnu « perimetre_actif »/);
  const { version, ...sansVersion } = actif("REALISATION");
  assert.match(validerEtat(sansVersion, racine)[0], /version/);
  assert.match(validerEtat([], racine)[0], /objet/);
});

test("validation : CADRAGE sans attente ni demande, les autres activités exigent une attente", () => {
  const racine = depot();
  assert.deepEqual(validerEtat(ETAT_NEUTRE, racine), []);
  assert.match(validerEtat(actif("CADRAGE"), racine)[0], /CADRAGE.*aucune attente/);
  assert.match(validerEtat({ ...actif("REALISATION"), attente_active: null }, racine)[0], /attente active requise/);
});

test("validation : l'attente active est une fiche existante de docs/projets/, hors modèle", () => {
  const racine = depot();
  assert.match(validerEtat(actif("REALISATION", { attente_active: "docs/projets/absente.md" }), racine)[0], /introuvable/);
  assert.match(validerEtat(actif("REALISATION", { attente_active: "src/auth/login.ts" }), racine)[0], /docs\/projets\//);
  assert.match(validerEtat(actif("REALISATION", { attente_active: "docs/projets/../../etc/passwd.md" }), racine)[0], /docs\/projets\//);
  assert.match(validerEtat(actif("REALISATION", { attente_active: "docs/projets/modele-fiche-projet.md" }), racine)[0], /modèle/);
});

test("validation : demande_active et depuis bien typés", () => {
  const racine = depot();
  assert.match(validerEtat(actif("DEMANDE", { demande_active: 42 }), racine)[0], /demande_active/);
  assert.match(validerEtat(actif("DEMANDE", { depuis: "hier" }), racine)[0], /depuis/);
  assert.deepEqual(validerEtat(actif("DEMANDE", { demande_active: "Lot 1" }), racine), []);
});

test("transitions : une activité à la fois, retours vers REALISATION, abandon vers CADRAGE", () => {
  assert.equal(transitionAutorisee("CADRAGE", "ATTENTE"), true);
  assert.equal(transitionAutorisee("CADRAGE", "REALISATION"), false, "pas de saut en avant");
  assert.equal(transitionAutorisee("VERIFY", "REALISATION"), true, "retour après échec");
  assert.equal(transitionAutorisee("PREUVES", "REALISATION"), true);
  assert.equal(transitionAutorisee("VERIFY", "CLOTURE"), true);
  assert.equal(transitionAutorisee("CLOTURE", "CADRAGE"), true);
  for (const a of ACTIVITES) if (a !== "CADRAGE") assert.equal(transitionAutorisee(a, "CADRAGE"), true, `abandon depuis ${a}`);
  assert.equal(transitionAutorisee("REALISATION", "REALISATION"), false);
  assert.equal(transitionAutorisee("INCONNUE", "CADRAGE"), false);
});

test("contexte : CADRAGE interdit la réalisation", () => {
  const racine = depot();
  const texte = contexte(lireEtat(racine), racine);
  assert.match(texte, /Activité : CADRAGE/);
  assert.match(texte, /aucune attente active/);
  assert.match(texte, /aucun fichier de code/);
});

test("contexte : REALISATION rappelle la fiche, son titre et son périmètre", () => {
  const racine = depot({ etat: actif("REALISATION") });
  const texte = contexte(lireEtat(racine), racine);
  assert.match(texte, /Activité : REALISATION/);
  assert.match(texte, /docs\/projets\/exemple\.md — Projet : Exemple/);
  assert.match(texte, /- src\/auth\/login\.ts/);
  assert.match(texte, /- tests\/auth\/login\.test\.ts/);
});

test("contexte : un état invalide est signalé, pas masqué", () => {
  const racine = depot({ etat: actif("CODAGE") });
  const texte = contexte(lireEtat(racine), racine);
  assert.match(texte, /état invalide/i);
  assert.match(texte, /activité inconnue/);
});

test("contexte en anglais selon .drwil/ia-first.json", () => {
  const racine = depot({ lang: "en" });
  assert.match(contexte(lireEtat(racine), racine), /Activity: CADRAGE/);
});
