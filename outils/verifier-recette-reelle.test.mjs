import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyser, aRappeler, principal, texteDuLot1 } from "./verifier-recette-reelle.mjs";

const RACINE = fileURLToPath(new URL("..", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true });
  dossiers = [];
});

/** Fiche minimale : bloc scope, statut et lot 1 au choix. */
const fiche = ({ scope = ["packages/drwil/src/kit-update.ts"], statut = "cadré le 2026-11-23", lot1 = "mesure de départ." } = {}) =>
  [
    "# Projet : essai",
    "",
    `**Statut** : ${statut}`,
    "",
    "<!-- scope",
    "files:",
    ...scope.map((f) => `  - ${f}`),
    "-->",
    "",
    "## 6. Increments",
    "",
    ...(lot1 === null ? [] : [`- **Lot 1 — Premier lot** [IA] : ${lot1}`, "  Critère de sortie : tests verts."]),
    "- **Lot 2 — Suite** [IA] : recette réelle plus tard.",
    "",
    "## 7. Reprise",
    "",
  ].join("\n");

function depot(fiches) {
  const d = mkdtempSync(join(tmpdir(), "drwil-recette-reelle-"));
  dossiers.push(d);
  mkdirSync(join(d, "docs", "projects"), { recursive: true });
  for (const [nom, texte] of Object.entries(fiches)) writeFileSync(join(d, "docs", "projects", nom), texte);
  return d;
}

test("QUA-330 : une fiche dont le scope touche la mise à jour, lot 1 sans recette réelle, est rappelée", () => {
  assert.match(aRappeler(fiche()), /lot 1/);
  assert.match(aRappeler(fiche({ scope: ["packages/drwil/src/kit-*"] })), /lot 1/, "un motif qui couvre la mise à jour compte");
  assert.match(aRappeler(fiche({ lot1: null })), /aucun lot 1/);
});

test("QUA-330 : rien à rappeler quand le lot 1 cite une recette réelle, hors installation, ou fiche close ou de référence", () => {
  assert.equal(aRappeler(fiche({ lot1: "recette réelle sur une copie d'un adoptant." })), null);
  assert.equal(aRappeler(fiche({ lot1: "rejouer `node outils/recette-adoptant.mjs`." })), null);
  assert.equal(aRappeler(fiche({ scope: ["packages/drwil/src/serve.ts", "docs/contracts.md"] })), null);
  assert.equal(aRappeler(fiche({ statut: "référence — mécanique du kit" })), null);
  assert.equal(aRappeler(fiche({ statut: "terminé le 2026-11-20" })), null);
  assert.equal(aRappeler("# Sans bloc scope\n"), null);
});

test("QUA-330 : le texte du lot 1 s'arrête au lot suivant", () => {
  const t = texteDuLot1(fiche());
  assert.match(t, /mesure de départ/);
  assert.doesNotMatch(t, /Lot 2|recette réelle plus tard/);
});

test("QUA-330 : l'avertissement ne refuse jamais — code 0, ligne [ia-first-warning], même sans dossier des fiches", () => {
  const d = depot({ "a.md": fiche(), "b.md": fiche({ lot1: "recette réelle d'abord." }), "model-brief.md": fiche() });
  assert.deepEqual(
    analyser(d).map((x) => x.fiche),
    ["docs/projects/a.md"],
  );
  const lignes = [];
  assert.equal(
    principal(d, (l) => lignes.push(l)),
    0,
  );
  assert.equal(lignes.length, 1);
  assert.match(lignes[0], /^\[ia-first-warning\] docs\/projects\/a\.md : .*recette réelle/);
  const vide = mkdtempSync(join(tmpdir(), "drwil-recette-reelle-"));
  dossiers.push(vide);
  assert.equal(
    principal(vide, (l) => lignes.push(l)),
    0,
  );
});

const lire = (p) => readFileSync(join(RACINE, p), "utf8");
const MODELE = "packages/drwil/templates/common/base/docs/projects/model-brief.md";
const SKILL = "packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md";

test("QUA-330 : le modèle de fiche et le skill de lancement livrés recommandent une recette réelle dès le premier lot", () => {
  assert.match(lire(MODELE), /real\s+acceptance\s+run[^.]*increment\s+1/i);
  assert.match(lire("docs/projects/model-brief.md"), /recette\s+réelle[^.]*lot\s+1/i);
  assert.match(lire(SKILL), /real\s+acceptance\s+run[^.]*first\s+increment/i);
  assert.equal(lire(".claude/skills/start-a-workstream/SKILL.md"), lire(SKILL), "copie du dépôt identique au gabarit");
  for (const p of [MODELE, SKILL]) {
    const t = lire(p);
    assert.doesNotMatch(t, /outils\/|QUA-33\d|marinade|drwil_walk/, `${p} : rien de propre au dépôt dans un texte livré`);
  }
});
