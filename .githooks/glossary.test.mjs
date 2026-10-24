import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { annotate, cited, contractList, contractText, glossary, journalEntries, main, unlabelled } from "./glossary.mjs";

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

test("QUA-039 : glossaire : opportunités de la découverte de valeur et repères déclarés par une intention ou une fiche", () => {
  const g = glossary(
    projet({
      "docs/decouverte-valeur.md":
        "| ID | Fonctionnalité | Pourquoi |\n|---|---|---|\n| OPT-1 | Mise à jour de la prose | x |\n| OPT-10 | Identifiant rattrapé | y |\n",
      "docs/value-discovery.md": "| ID | Feature | Why |\n|---|---|---|\n| OPT-3 | Release URL | z |\n",
      "docs/intentions/rapport.md":
        "# Intention\n\n## Repères\n\n- `S6` — Dépendance ajoutée sous un contrat attesté\n- `S7` — PR réelle sur GitHub\n\n## Besoin\n\n- `S8` — hors section, ignoré\n",
      "docs/projects/fiche.md": "# Fiche\n\n## Markers\n\n- `R1` — Premier repère\n",
    }),
  );
  assert.equal(g.get("OPT-1"), "Mise à jour de la prose");
  assert.equal(g.get("OPT-10"), "Identifiant rattrapé");
  assert.equal(g.get("OPT-3"), "Release URL", "nom anglais de la découverte de valeur");
  assert.equal(g.get("S6"), "Dépendance ajoutée sous un contrat attesté");
  assert.equal(g.get("S7"), "PR réelle sur GitHub");
  assert.equal(g.get("R1"), "Premier repère", "section en anglais");
  assert.equal(g.has("S8"), false, "seule la section « Repères » compte");
});

test("QUA-039 : sans libellé : un identifiant cité sans glose, avant toute mention libellée", () => {
  const g = new Map([
    ["QUA-039", "Un identifiant cité vient avec ce qu'il désigne"],
    ["OPT-6", "Attestation liée à son objet"],
    ["OPT-8", "Barrière vérifiée"],
    ["lot 2", "à la source"],
  ]);
  const ids = (texte) => unlabelled(texte, g).map((c) => c.id);
  assert.deepEqual(ids("OPT-6 à OPT-8, puis le lot 2."), ["OPT-6", "OPT-8", "lot 2"]);
  assert.deepEqual(ids("QUA-039 (un identifiant…) ; OPT-6 — attestation ; OPT-8 : barrière ; lot 2 (source)"), []);
  assert.deepEqual(ids("`QUA-039` (règle) puis QUA-039 seul"), [], "déjà libellé plus haut");
  assert.deepEqual(ids("QUA-039 seul, puis QUA-039 (règle)"), ["QUA-039"], "nu avant d'être libellé");
  assert.deepEqual(ids("| OPT-6 | Attestation | x |"), [], "cellule de tableau suivie de son libellé");
  assert.deepEqual(ids("**OPT-6** — attestation"), [], "en gras, puis tiret");
  assert.deepEqual(ids("rien de connu"), []);
  assert.deepEqual(unlabelled("OPT-6 seul", g)[0], { id: "OPT-6", label: "Attestation liée à son objet" });
  const beaucoup = new Map(Array.from({ length: 20 }, (_, i) => [`APP-${i + 1}`, `règle ${i + 1}`]));
  assert.equal(unlabelled(Array.from({ length: 20 }, (_, i) => `APP-${i + 1}`).join(" "), beaucoup).length, 15, "au plus quinze");
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

const JOURNAL = [
  "# Journal\n\nIntroduction.\n",
  "## 2026-10-04 — Ancien chantier sans preuve\n\n- **Clôturé par** : commit `b2751b4`.\n",
  "## 2026-10-24 — Accélérer la CI\n\n- **Preuve de clôture** : `docs/preuves/acceleration-ci.md`.\n",
  "## 2026-10-25 — Chantier d'une branche\n\n- **Clôturé par** : la branche `workstream/essai` (PR #3).\n",
  "## 2026-10-26 — Branche voisine\n\n- **Clôturé par** : la branche `workstream/essai-bis`.\n",
].join("\n");

test("QUA-124 : lecture ciblée : texte complet d'un contrat par son ID, entrée du journal par son chantier, sans lire tout le fichier", () => {
  const racine = projet({ ...COMPLET, "docs/projects/journal.md": JOURNAL });
  assert.equal(contractText(racine, "QUA-016"), "## QUA-016 — Rappel de cadrage\n**Règle** : r.");
  assert.equal(contractText(racine, "QUA-999"), null);
  assert.deepEqual(journalEntries(racine, "acceleration-ci"), [
    "## 2026-10-24 — Accélérer la CI\n\n- **Preuve de clôture** : `docs/preuves/acceleration-ci.md`.",
  ]);
  assert.equal(journalEntries(racine, "essai").length, 1, "par sa branche, jamais la branche voisine");
  assert.match(journalEntries(racine, "essai")[0], /Chantier d'une branche/);
  assert.match(journalEntries(racine, "ANCIEN chantier")[0], /^## 2026-10-04/, "sans preuve ni branche : par son titre");
  assert.deepEqual(journalEntries(racine, "absent"), []);
  assert.deepEqual(journalEntries(projet({}), "x"), [], "pas de journal : rien");
  const reglee = projet({
    ".drwil/ia-first.json": JSON.stringify({ lang: "en", dirs: { projects: "suivi", proofs: "preuves" } }),
    "suivi/journal.md": "## 2026-10-24 — Réglé\n\n- **Proof**: `preuves/regle.md`.\n",
  });
  assert.equal(journalEntries(reglee, "regle").length, 1, "dossiers réglés");
  const lignes = [];
  const log = (l) => lignes.push(l);
  assert.equal(main(["--contract", "QUA-015"], racine, log), 0);
  assert.equal(main(["--journal", "acceleration-ci"], racine, log), 0);
  assert.equal(main(["--contract", "QUA-999"], racine, log), 1);
  assert.equal(main(["--journal", "absent"], racine, log), 1);
  assert.equal(main(["--contract"], racine, log), 2, "ID manquant : l'usage");
  assert.equal(main(["--journal", "x"], reglee, log), 1);
  assert.equal(main(["--contract", "X-1"], reglee, log), 1);
  assert.deepEqual(lignes, [
    "## QUA-015 — Chantiers exploitables à froid\n**Règle** : r.",
    "## 2026-10-24 — Accélérer la CI\n\n- **Preuve de clôture** : `docs/preuves/acceleration-ci.md`.",
    "contrat QUA-999 absent du registre (liste : node .githooks/glossary.mjs --contracts)",
    "aucune entrée du journal pour « absent » (ni sa preuve, ni sa branche, ni son titre)",
    "usage : node .githooks/glossary.mjs [<texte>] | --contract <ID> | --contracts | --journal <chantier>",
    'no journal entry for "x" (neither its proof, nor its branch, nor its title)',
    "contract X-1 not in the registry (list: node .githooks/glossary.mjs --contracts)",
  ]);
  const lien = join(racine, "lien.mjs");
  symlinkSync(SCRIPT, lien);
  const r = spawnSync(process.execPath, [lien, "--contract", "QUA-016"], { cwd: racine, encoding: "utf8" });
  assert.equal(r.stdout, "## QUA-016 — Rappel de cadrage\n**Règle** : r.\n");
});

test("QUA-125 : liste courte de tous les contrats : ID et titre complet, aucun omis", () => {
  const long = `Titre ${"long ".repeat(30)}`.trim();
  const racine = projet({
    "docs/contracts.md": `## QUA-001 — ${long}\n**Règle** : r.\n\n## Section libre\n\n## APP-002\n**Règle** : sans titre.\n\n## SEC-003 — Secret\n`,
  });
  assert.deepEqual(contractList(racine), [`QUA-001 — ${long}`, "APP-002", "SEC-003 — Secret"], "titre jamais raccourci");
  const lignes = [];
  assert.equal(
    main(["--contracts"], racine, (l) => lignes.push(l)),
    0,
  );
  assert.equal(lignes.length, 3);
  assert.deepEqual(contractList(projet({})), [], "registre absent : liste vide");
});
