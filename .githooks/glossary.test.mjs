import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { annotate, cited, glossary, main } from "./glossary.mjs";

const SCRIPT = fileURLToPath(new URL("./glossary.mjs", import.meta.url));

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
function projet(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-glossaire-"));
  dossiers.push(racine);
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  return racine;
}
const COMPLET = {
  "docs/contracts.md": "## QUA-015 — Chantiers exploitables à froid\n**Règle** : r.\n\n## QUA-016 — Rappel de cadrage\n**Règle** : r.\n",
  "docs/contracts-catalog.md": "| ID | Règle |\n|---|---|\n| catalogue:QUA-004 | La couverture ne descend pas sous le seuil. | x |\n",
  "docs/projects/essai.md":
    "# Essai\n\n## 6. Lots\n\n- **Lot 2 — à la source** [IA] : texte.\n\n## 5. Points\n\n12. **Élargissement du cadrage** : texte.\n",
  ".drwil/state.json": JSON.stringify({ active_brief: "docs/projects/essai.md" }),
};

test("QUA-039 : glossaire : registre, catalogue, lots et points de la fiche active ; projet vide : rien", () => {
  const g = glossary(projet(COMPLET));
  assert.deepEqual(Object.fromEntries(g), {
    "QUA-015": "Chantiers exploitables à froid",
    "QUA-016": "Rappel de cadrage",
    "catalogue:QUA-004": "La couverture ne descend pas sous le seuil.",
    "lot 2": "à la source",
    "point 12": "Élargissement du cadrage",
  });
  assert.equal(glossary(projet({})).size, 0, "registre, catalogue et état absents : rien, sans erreur");
  assert.equal(
    glossary(projet({ ".drwil/ia-first.json": "null", ".drwil/state.json": "{" })).size,
    0,
    "configuration nulle, état illisible",
  );
  const long = projet({ "docs/contracts.md": `## APP-001 — ${"mot ".repeat(40)}\n**Règle** : r.\n` });
  assert.ok(glossary(long).get("APP-001").endsWith("…"), "libellé court");
});

test("QUA-039 : cités et annotés : première mention, jamais deux fois, ni dans un ID plus long ou une ligne du catalogue", () => {
  const g = glossary(projet(COMPLET));
  assert.deepEqual(
    cited("QUA-015, catalogue:QUA-004, le Lot 2, point 12, QUA-0150 et APP-9", g).map((c) => c.id),
    ["QUA-015", "catalogue:QUA-004", "lot 2", "point 12"],
  );
  assert.equal(annotate("QUA-016 puis QUA-016", g), "QUA-016 (Rappel de cadrage) puis QUA-016");
  assert.equal(annotate("QUA-015 (Chantiers exploitables à froid)", g), "QUA-015 (Chantiers exploitables à froid)", "déjà annoté");
  assert.equal(annotate("increment 2 avance", g), "increment 2 (à la source) avance", "en anglais aussi");
  assert.equal(annotate("rien de connu ici", g), "rien de connu ici");
  assert.equal(annotate("couverture (QUA-016)", g), "couverture (QUA-016 — Rappel de cadrage)", "déjà entre parenthèses : un tiret");
  const beaucoup = new Map(Array.from({ length: 20 }, (_, i) => [`APP-${i + 1}`, `règle ${i + 1}`]));
  assert.equal(cited(Array.from({ length: 20 }, (_, i) => `APP-${i + 1}`).join(" "), beaucoup).length, 15, "au plus quinze");
});

test("QUA-039 : commande : arguments ou entrée standard, directe ou par un lien symbolique, dossiers réglés", () => {
  const racine = projet({
    ...COMPLET,
    ".drwil/ia-first.json": JSON.stringify({ dirs: { contracts: "regles.md", catalog: "menu.md" } }),
    "regles.md": "## SEC-007 — Pas de secret dans le dépôt\n**Règle** : r.\n",
  });
  const lignes = [];
  assert.equal(
    main(["voir", "SEC-007"], racine, (l) => lignes.push(l)),
    0,
  );
  assert.deepEqual(lignes, ["SEC-007 — Pas de secret dans le dépôt"]);
  const rien = [];
  const echec = () => {
    throw new Error("entrée standard illisible");
  };
  assert.equal(
    main([], racine, (l) => rien.push(l), echec),
    0,
    "entrée illisible : rien, jamais d'erreur",
  );
  assert.deepEqual(rien, []);
  const lien = join(racine, "lien.mjs");
  symlinkSync(SCRIPT, lien);
  const r = spawnSync(process.execPath, [lien], { cwd: racine, input: "SEC-007 et rien", encoding: "utf8" });
  assert.equal(r.stdout, "SEC-007 — Pas de secret dans le dépôt\n");
  assert.equal(
    spawnSync(process.execPath, [SCRIPT, "QUA-015"], { cwd: projet(COMPLET), encoding: "utf8" }).stdout,
    "QUA-015 — Chantiers exploitables à froid\n",
  );
});
