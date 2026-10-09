import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ajouterTrailer, controlerPerimetre, horsFiches, verifierIndex } from "./perimetre.mjs";

const FICHE = "docs/projets/exemple.md";
const fiche = (motifs) => `# Projet : Exemple\n\n**Statut** : cadré le 2026-10-09.\n\n<!-- cadrage\nfichiers:\n${motifs.map((m) => `  - ${m}`).join("\n")}\n-->\n`;

function git(racine, ...args) {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
}

function ecrire(racine, chemin, contenu) {
  mkdirSync(dirname(join(racine, chemin)), { recursive: true });
  writeFileSync(join(racine, chemin), contenu);
}

/** Dépôt dont le premier commit contient la barrière (marqueur) et la fiche cadrée. */
function depot(motifs = ["src/a.js"]) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-perimetre-"));
  git(racine, "init", "-q", "-b", "main");
  git(racine, "config", "user.email", "test@example.invalid");
  git(racine, "config", "user.name", "Test");
  ecrire(racine, ".githooks/perimetre.mjs", "// marqueur : barrière en vigueur\n");
  ecrire(racine, FICHE, fiche(motifs));
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "base");
  return racine;
}

const etat = (activite) => ({ version: 1, activite, attente_active: activite === "CADRAGE" ? null : FICHE, demande_active: null, depuis: null });
const ecrireEtat = (racine, activite) => ecrire(racine, ".drwil/state.json", JSON.stringify(etat(activite)));

test("hors fiches : seules les fiches et les attestations échappent au périmètre", () => {
  assert.deepEqual(horsFiches(["docs/projets/x.md", "docs/intentions/y.md", "docs/projects/z.md", ".drwil/evidence/attestations/QUA-013-2026-10-09T17-56-29-571Z.json", "README.md", "src/a.js"]), ["README.md", "src/a.js"]);
  // Seules les attestations : le reste de .drwil/ (réglages, évidences locales) reste soumis.
  assert.deepEqual(horsFiches([".drwil/ia-first.json", ".drwil/evidence/verify-x.json"]), [".drwil/ia-first.json", ".drwil/evidence/verify-x.json"]);
  assert.deepEqual(horsFiches(["docs/autre.md"], ["docs/*"]), [], "liste réglable");
});

test("index : fiches toujours acceptées, le reste seulement en REALISATION et dans le cadrage", () => {
  const motifs = ["src/a.js"];
  assert.deepEqual(verifierIndex({ fichiers: [FICHE], etat: etat("CADRAGE"), motifs: [] }), []);
  assert.match(verifierIndex({ fichiers: ["src/a.js"], etat: etat("CADRAGE"), motifs })[0], /CADRAGE/);
  assert.match(verifierIndex({ fichiers: ["src/a.js"], etat: etat("PREUVES"), motifs })[0], /REALISATION/);
  assert.deepEqual(verifierIndex({ fichiers: ["src/a.js", FICHE], etat: etat("REALISATION"), motifs }), []);
  const hors = verifierIndex({ fichiers: ["src/a.js", "src/b.js", "README.md"], etat: etat("REALISATION"), motifs });
  assert.equal(hors.length, 2);
  assert.match(hors.join("\n"), /src\/b\.js/);
  assert.match(hors.join("\n"), /README\.md/);
});

test("pre-commit : le cadrage est lu dans HEAD, pas dans l'index (élargir = commit séparé)", () => {
  const racine = depot();
  ecrireEtat(racine, "REALISATION");
  ecrire(racine, "src/a.js", "a\n");
  git(racine, "add", "src/a.js");
  assert.deepEqual(controlerPerimetre(racine, { cfg: { barriere: "bloquant" }, indexes: ["src/a.js"] }).problemes, []);
  // Élargir le cadrage et l'utiliser dans le même commit : refusé.
  ecrire(racine, FICHE, fiche(["src/a.js", "src/b.js"]));
  ecrire(racine, "src/b.js", "b\n");
  const r = controlerPerimetre(racine, { cfg: { barriere: "bloquant" }, indexes: [FICHE, "src/b.js"] });
  assert.equal(r.statut, "echec");
  assert.match(r.problemes.join("\n"), /src\/b\.js/);
});

test("pre-commit sans état : CADRAGE neutre, un fichier hors fiches est refusé", () => {
  const racine = depot();
  const r = controlerPerimetre(racine, { cfg: { barriere: "bloquant" }, indexes: ["src/a.js"] });
  assert.equal(r.statut, "echec");
  assert.match(r.problemes[0], /CADRAGE/);
});

test("sévérité : off ne contrôle rien, avertissement signale sans bloquer", () => {
  const racine = depot();
  assert.equal(controlerPerimetre(racine, { cfg: { barriere: "off" }, indexes: ["src/a.js"] }).statut, "non-applicable");
  const avert = controlerPerimetre(racine, { cfg: { barriere: "avertissement" }, indexes: ["src/a.js"] });
  assert.equal(avert.statut, "ok");
  assert.equal(avert.problemes.length, 1);
  assert.equal(controlerPerimetre(racine, { cfg: {}, indexes: ["src/a.js"] }).statut, "ok", "réglage absent : avertissement");
});

test("trailer : ajouté depuis l'état actif, rien en CADRAGE", () => {
  const racine = depot();
  const message = join(racine, "MSG");
  writeFileSync(message, "Un commit\n");
  ajouterTrailer(racine, message);
  assert.doesNotMatch(readFileSync(message, "utf8"), /Drwil-Attente/);
  ecrireEtat(racine, "REALISATION");
  ajouterTrailer(racine, message);
  ajouterTrailer(racine, message);
  const texte = readFileSync(message, "utf8");
  assert.match(texte, /^Drwil-Attente: docs\/projets\/exemple\.md$/m);
  assert.equal(texte.match(/Drwil-Attente/g).length, 1, "jamais en double");
});

test("branche (CI, pre-push, verify) : chaque commit rejoué contre le cadrage de son parent", () => {
  const racine = depot(["src/a.js"]);
  git(racine, "checkout", "-q", "-b", "chantier");
  ecrire(racine, "src/a.js", "a\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "couvert\n\nDrwil-Attente: docs/projets/exemple.md");
  ecrire(racine, "src/b.js", "b\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "hors cadrage\n\nDrwil-Attente: docs/projets/exemple.md");
  ecrire(racine, "README.md", "r\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "sans trailer");
  ecrire(racine, "docs/projets/autre.md", "# Projet : autre\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "fiche seule, sans trailer");

  const r = controlerPerimetre(racine, { cfg: { barriere: "bloquant" }, env: { DRWIL_BASE: "main" } });
  assert.equal(r.statut, "echec");
  const texte = r.problemes.join("\n");
  assert.equal(r.problemes.length, 2, texte);
  assert.match(texte, /src\/b\.js/);
  assert.match(texte, /sans trailer Drwil-Attente/);
  assert.doesNotMatch(texte, /src\/a\.js/);
});

test("branche : un commit dont le parent n'a pas encore la barrière n'est pas contrôlé", () => {
  const racine = mkdtempSync(join(tmpdir(), "drwil-perimetre-"));
  git(racine, "init", "-q", "-b", "main");
  git(racine, "config", "user.email", "test@example.invalid");
  git(racine, "config", "user.name", "Test");
  ecrire(racine, "README.md", "r\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "base sans barrière");
  git(racine, "checkout", "-q", "-b", "chantier");
  ecrire(racine, "src/a.js", "a\n");
  ecrire(racine, ".githooks/perimetre.mjs", "// la barrière arrive avec ce commit\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "introduit la barrière");
  assert.deepEqual(controlerPerimetre(racine, { cfg: { barriere: "bloquant" }, env: { DRWIL_BASE: "main" } }).problemes, []);
});

test("branche sans référence : non exécuté, jamais un succès (QUA-013)", () => {
  const racine = depot();
  git(racine, "branch", "-m", "travail");
  assert.equal(controlerPerimetre(racine, { cfg: { barriere: "bloquant" }, env: {} }).statut, "non-execute");
});
