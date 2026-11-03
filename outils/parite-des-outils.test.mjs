import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RACINE = join(import.meta.dirname, "..");
const TPL = "packages/drwil/templates/common";
const lire = (f) => readFileSync(join(RACINE, f), "utf8");

// Un mécanisme nouveau s'inscrit ici dans le chantier qui le crée (QUA-222).
const MECANISMES = [{ nom: "attente bornée des commandes longues", marqueurs: [/wait-command\.mjs/, /while pgrep/] }];

const PORTES = [
  `${TPL}/base/AGENTS.md`,
  "AGENTS.md",
  `${TPL}/tools/copilot/.github/copilot-instructions.md`,
  `${TPL}/tools/cursor/.cursor/rules/ia-first.mdc`,
];

test("QUA-222 : chaque mécanisme déclaré atteint AGENTS.md et les fichiers d'entrée natifs, et la matrice déclare l'écart", () => {
  for (const m of MECANISMES) {
    for (const f of PORTES) {
      for (const re of m.marqueurs) assert.match(lire(f), re, `${m.nom} : ${re} manque dans ${f}`);
    }
  }
  const matrice = lire("docs/ia-first/6-limits-and-tool-compatibility.md");
  assert.match(matrice, /## Instructions reach every tool/);
  assert.match(matrice, /Declared gap/);
  assert.equal(matrice, lire(`${TPL}/base/docs/ia-first/6-limits-and-tool-compatibility.md`));
});

test("QUA-223 : la consigne d'attente bornée est lue au démarrage sous tout outil, pas seulement sous Claude Code", () => {
  for (const f of PORTES) {
    const texte = lire(f);
    assert.match(texte, /wait-command\.mjs/, f);
    assert.match(texte, /while pgrep/, f);
  }
  assert.match(lire(`${TPL}/tools/cursor/.cursor/rules/ia-first.mdc`), /alwaysApply: true/);
});
