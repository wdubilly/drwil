import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./tableau-de-bord.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

/** Génère le tableau de bord du projet `fichiers` ; rend le HTML produit à `sortie`. */
function generer(fichiers, args = [], sortie = "docs/tableau-de-bord.html") {
  const racine = mkdtempSync(join(tmpdir(), "drwil-tableau-"));
  dossiers.push(racine);
  mkdirSync(join(racine, "docs"));
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, `Tableau de bord généré : ${sortie}\n`);
  return readFileSync(join(racine, sortie), "utf8");
}

test("projet complet en français : index, fiches et lots, contrats, audits, consommation", () => {
  const html = generer(
    {
      ".drwil/ia-first.json": JSON.stringify({ projectName: "Démo <x>" }),
      "docs/projets/en-attente.md": "# Index\n\n- [ ] [IA] ouvert & à faire\n- [x] [IA] fait\ntexte\n",
      "docs/projets/a.md": [
        "# Fiche A",
        "",
        "**Statut** (2026-01-01) : en cours.",
        "",
        "## 6. Lots",
        "",
        "- **Lot 1** [IA] : premier",
        "- **Lot 2** [à voir] second",
        "texte libre",
        "## Reprise",
        "- **Hors lots** [IA] : ignoré",
      ].join("\n"),
      "docs/projets/b.md": "sans titre ni statut\n",
      "docs/projets/modele-fiche.md": "# Gabarit exclu\n",
      "docs/projets/sous/c.md": "# Ignorée (sous-dossier)\n",
      "docs/contrats.md": [
        "## QUA-001 — un",
        "",
        "**Règle** : règle un",
        "## QUA-002 — sans règle",
        "## Pas un identifiant",
        "| ID | Règle |",
        "|---|---|",
        "| SEC-001 | règle tableau |",
        "| SEC-002 |",
        "| texte | libre |",
      ].join("\n"),
      "docs/catalogue-contrats.md": "| catalogue:QUA-004 | seuil |\n",
      ".drwil/usage.jsonl": [
        JSON.stringify({ chantier: "a", tokens: 10, duree_min: 2, modele: "m1" }),
        "",
        "pas du json",
        JSON.stringify({ tokens: 5 }),
        JSON.stringify({ chantier: "a", tokens: "x", modele: "m2" }),
        JSON.stringify({ chantier: "b" }),
      ].join("\n"),
      "docs/audit-risques.md":
        "# Audit risques\n\n> Dernier scan : 2020-01-01\n> suite de la valeur\n> Périmètre : tout\n\n> hors du premier bloc : x\n",
      "docs/decouverte-valeur.md": "> sans deux-points\n> Dernier scan : jamais\n",
    },
    ["docs/sortie.html"],
    "docs/sortie.html",
  );
  assert.match(html, /<html lang="fr">/);
  assert.match(html, /Tableau de bord — Démo &lt;x&gt;/);
  assert.match(html, /☐ \[IA\] ouvert &amp; à faire/);
  assert.match(html, /class="fait">☑ \[IA\] fait/);
  assert.match(html, /Fiche A <small>\(<code>docs\/projets\/a\.md<\/code>/);
  assert.match(html, /Statut : en cours\./);
  assert.match(html, /\[IA\]<\/span> <strong>Lot 1<\/strong> — premier/);
  assert.match(html, /\[à voir\]<\/span> <strong>Lot 2<\/strong> — second/);
  assert.doesNotMatch(html, /Hors lots|Gabarit exclu|Ignorée|Pas un identifiant|>texte</);
  assert.match(html, /<h3>\? <small>\(<code>docs\/projets\/b\.md/);
  assert.match(html, /\(pas de ligne Statut\)/);
  assert.match(html, /<code>QUA-001<\/code><\/td><td>règle un</);
  assert.match(html, /<code>QUA-002<\/code><\/td><td><\/td>/);
  assert.match(html, /<code>SEC-001<\/code><\/td><td>règle tableau</);
  assert.match(html, /<code>SEC-002<\/code><\/td><td><\/td>/);
  assert.match(html, /Au catalogue, non installés \(docs\/catalogue-contrats\.md\)<\/h3><table>.*catalogue:QUA-004/s);
  assert.match(html, /Dernier scan : 2020-01-01 suite de la valeur<br>Périmètre : tout <strong>⚠ scan vieux de \d+ jours/);
  assert.doesNotMatch(html, /hors du premier bloc/);
  assert.match(html, /<h3> <small>\(<code>docs\/decouverte-valeur\.md<\/code>\)<\/small><\/h3><p>Dernier scan : jamais<\/p>/);
  assert.match(html, /<code>a<\/code><\/td><td>10<\/td><td>2<\/td><td>m1, m2</);
  assert.match(html, /<code>b<\/code><\/td><td>0<\/td><td>0<\/td><td><\/td>/);
});

test("projet vide en anglais, dossiers réglés : chaque section dit son absence", () => {
  const html = generer({
    ".drwil/ia-first.json": JSON.stringify({ lang: "en", dirs: { projects: "suivi", index: "suivi/index.md", contracts: "regles.md" } }),
    "suivi/index.md": "# Index\n\nnothing yet\n",
    "docs/audit-risks.md": "# Risks\n\n> Last scan : 2999-01-01\n",
    "docs/value-discovery.md": "# Value\n\n> Scope : all\n",
  });
  assert.match(html, /<html lang="en">/);
  assert.match(html, /Dashboard — /);
  assert.match(html, /\(no checkbox found\)/);
  assert.match(html, /\(no fiche\)/);
  assert.match(html, /Installed \(regles\.md — project baseline\)<\/h3><p>\(none\)/);
  assert.match(html, /In the catalogue, not installed \(docs\/contracts-catalog\.md\)<\/h3><p>\(none\)/);
  assert.match(html, /Last scan : 2999-01-01<\/p>/);
  assert.match(html, /Scope : all<\/p>/);
  assert.match(html, /\(\.drwil\/usage\.jsonl missing/);
});

test("sans configuration ni index : index absent, audits pas encore générés", () => {
  const html = generer({ "docs/projets/a.md": "# A\n\nStatut : ouvert\n" });
  assert.match(html, /Chantiers en attente<\/h2>\n<p>\(absent\)<\/p>/);
  assert.match(html, /Statut : ouvert/);
  assert.match(html, /\(docs\/audit-risques\.md absent — pas encore généré/);
  assert.match(html, /\(\.drwil\/usage\.jsonl absent/);
});

test("sans dossier de fiches : aucune fiche, en français", () => {
  assert.match(generer({}), /\(aucune fiche\)/);
});

test("en anglais : statut d'une fiche, audit périmé, audit pas encore généré", () => {
  const html = generer({
    ".drwil/ia-first.json": JSON.stringify({ lang: "en" }),
    "docs/projets/a.md": "# A\n\n**Status**: open\n",
    "docs/audit-risks.md": "# Risks\n\n> Last scan: 2020-01-01\n",
  });
  assert.match(html, /Status: open/);
  assert.match(html, /⚠ scan \d+ days old, time to re-run/);
  assert.match(html, /\(docs\/value-discovery\.md missing — not generated yet/);
});
