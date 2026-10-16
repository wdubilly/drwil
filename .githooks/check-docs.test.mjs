import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = fileURLToPath(new URL("./check-docs.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

/** Projet `fichiers` dans <tmp>/projet (un fichier frère, hors du projet, reste citable), lancé par check-docs. */
function verifier(fichiers, { depot = true } = {}) {
  const parent = mkdtempSync(join(tmpdir(), "drwil-check-docs-"));
  dossiers.push(parent);
  writeFileSync(join(parent, "dehors.txt"), "");
  const racine = join(parent, "projet");
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  if (depot) {
    for (const args of [
      ["init", "-q"],
      ["add", "-A"],
    ])
      assert.equal(spawnSync("git", args, { cwd: racine }).status, 0);
  }
  return spawnSync(process.execPath, [SCRIPT], { cwd: racine, encoding: "utf8" });
}

const reprise = "\n## Reprise\n\nrien\n";
/** Un projet où chaque règle de check-docs est enfreinte au moins une fois. */
function projetFautif(cfg) {
  return {
    ".drwil/ia-first.json": JSON.stringify(cfg),
    ".gitignore": "ignore.txt\n",
    "ignore.txt": "",
    "AGENTS.md": [
      "Absent : `docs/absent.md`, couche : `lib/x`, contrat : QUA-999, autre dépôt : autre:QUA-998.",
      "Présent mais ignoré : `ignore.txt` ; hors du projet : `../dehors.txt` ; racine : `docs/..`.",
      "Pas des chemins : `https://exemple.invalid/a.md`, `-x.md`, `minimal/complet`, `a*.md`.",
      "",
      "Prévu : `docs/futur.md` (à créer), oublié : `docs/futur2.md`.",
      "",
      "Facultatif : `docs/option.md` (si présent).",
      "Facultatif, mention à la ligne suivante : `docs/option2.md`",
      "(si présent).",
      "Relatif au fichier : `app/AGENTS.md`.",
    ].join("\n"),
    "app/AGENTS.md": "Relatif au fichier : `AGENTS.md`.\n",
    "docs/contracts.md": [
      "## QUA-001 — un",
      "**Règle** : r",
      "**Manuel** : m",
      "## QUA-001 — doublon",
      "**Règle** : r",
      "**Manuel** : m",
      "## QUA-002 — sans règle",
      "**Manuel** : m",
      "",
      "| ID | Règle |",
      "|---|---|",
      "| QUA-003 | r |",
    ].join("\n"),
    "docs/projects/pending.md": [
      "# Index",
      "",
      "- [ ] sans marqueur",
      "- [ ] [IA] déjà finie : `docs/projects/finie.md`",
      "- [x] [IA] cochée mais ouverte :",
      "  `docs/projects/ouverte.md`",
      "- [x] [IA] sans statut : `docs/projects/sans-statut.md`",
      "- [x] [IA] cochée et finie : `docs/projects/finie.md`",
      "- [ ] [IA] ouverte et ouverte : `docs/projects/cadrage.md`",
      "- [x] [IA] inexistante : `docs/projects/inexistante.md`",
      "texte libre",
      "  indenté après une ligne libre",
    ].join("\n"),
    "docs/projects/finie.md": `# Finie\n\n**Statut** : terminé le 2026-01-01.\n${reprise}`,
    "docs/projects/ouverte.md": "# Ouverte\n\n**Statut** : cadré le 2026-01-01.\n\n<!-- scope\npas une en-tête\n-->\n",
    "docs/projects/vide.md": `# Vide\n\n**Statut** (2026-01-01) : cadré.\n\n<!-- scope\n-->\n${reprise}`,
    "docs/projects/cadrage.md": [
      "# Cadrage",
      "",
      "**Statut** :",
      "cadré le 2026-01-01.",
      "**Risque** : HIGH",
      "",
      "<!-- scope",
      "files:",
      "pas une entrée",
      "  - src/**",
      "  - src/ok/a/b.js",
      "-->",
      reprise,
    ].join("\n"),
    "docs/projects/sensible.md": `# Sensible\n\n**Statut** : cadré le 2026-01-01.\n\n<!-- scope\nfiles:\n  - src/sensible/x.js\n  - .drwil/x.json\n-->\n${reprise}`,
    "docs/projects/sans-statut.md": `# Sans statut\n${reprise}`,
    "docs/projects/modele-fiche.md": "# Modèle, exempté\n\n<!-- scope\nfiles:\n  - src/**\n-->\n",
    "docs/projects/kit-mechanics.md": `# Mécanique\n\n**Statut** : référence (2026-01-01).\n\n<!-- scope\nfiles:\n  - .githooks/a.mjs\n-->\n${reprise}`,
    "docs/intentions/README.md": "# Exempté\n",
    "docs/intentions/i.md": "# Intention\n\n**Statut** : 2026-01-01\n",
    ".claude/skills/s/SKILL.md": "Voir `docs/absent-skill.md`.\n",
    "src/hors.js": "",
    "src/ok/a/b.js": "",
  };
}

test("projet fautif en français : chaque règle bloque, cadrage et ignorés bloquants", () => {
  const r = verifier(
    projetFautif({
      lang: "fr",
      layers: ["app"],
      layerPrefixes: ["lib"],
      codePrefixes: ["src"],
      contractPrefixes: ["QUA"],
      scopeReminder: "blocking",
      newRequirements: "blocking",
      risk: { sensitivePaths: ["src/sensible/*"] },
    }),
  );
  assert.equal(r.status, 1, r.stdout);
  const attendus = [
    "AGENTS.md:1 : chemin cité introuvable `docs/absent.md`",
    "AGENTS.md:1 : chemin cité introuvable `lib/x`",
    "AGENTS.md:1 : contrat QUA-999 absent de docs/contracts.md",
    "AGENTS.md:2 : chemin cité introuvable `ignore.txt` — fichier ignoré par Git",
    "AGENTS.md:5 : chemin cité introuvable `docs/futur2.md`",
    ".claude/skills/s/SKILL.md:1 : chemin cité introuvable `docs/absent-skill.md`",
    "docs/contracts.md : contrat QUA-001 défini plusieurs fois",
    "docs/contracts.md:7 : QUA-002 : exigence absente (champ Règle)",
    "docs/projects/pending.md:3 : case ouverte sans marqueur",
    "docs/projects/finie.md : fiche terminée encore présente",
    "docs/projects/ouverte.md : section « Reprise » absente",
    "docs/projects/sans-statut.md : pas de ligne « Statut » datée",
    "docs/intentions/i.md : section « Besoin » absente",
    "docs/intentions/i.md : section « Questions à trancher » absente",
    "docs/projects/cadrage.md : risque HIGH sans section « Décisions »",
    "docs/projects/ouverte.md : bloc scope sans ligne « files: »",
    "docs/projects/vide.md : bloc scope sans ligne « files: »",
    "docs/projects/cadrage.md : ligne de cadrage non comprise « pas une entrée »",
    "docs/projects/cadrage.md : motif de cadrage trop large « src/** »",
    "`src/hors.js` : fichier de code hors de toute fiche",
    "case ouverte mais la fiche docs/projects/finie.md se dit déjà terminée",
    "pending.md:5 : case cochée mais la fiche docs/projects/ouverte.md ne se dit pas terminée",
    "docs/projects/sensible.md : pas de champ « Risque » alors que le cadrage impose HIGH",
    "avertissement(s) de cohérence case/statut",
    "avertissement(s) de niveau de risque",
  ];
  for (const a of attendus) assert.ok(r.stdout.includes(a), `attendu : ${a}\n${r.stdout}`);
  for (const absent of [
    "dehors.txt",
    "futur.md",
    "option.md",
    "option2.md",
    "https",
    "minimal",
    "QUA-998",
    "QUA-003",
    "`AGENTS.md`",
    "app/AGENTS.md",
    "src/ok/a/b.js",
    "modele-fiche",
    "mecanique-ia-first.md : pas de champ",
    "sans-statut.md ne se dit",
    "inexistante.md ne se dit",
    "cadrage.md ne se dit",
    "README.md",
    "⚠ AGENTS.md",
  ]) {
    assert.ok(!r.stdout.includes(absent), `inattendu : ${absent}\n${r.stdout}`);
  }
});

test("projet fautif en anglais : cadrage et fichiers ignorés en avertissement", () => {
  const fichiers = projetFautif({ lang: "en", layers: ["app"], layerPrefixes: ["lib"], codePrefixes: ["src"] });
  fichiers["docs/intentions/i.md"] = "# Intention\n\n**Status**: 2026-01-01\n\n## Need\n";
  const r = verifier(fichiers);
  assert.equal(r.status, 1, r.stdout);
  const attendus = [
    "AGENTS.md:1 : cited path not found `docs/absent.md`",
    "AGENTS.md:1 : contract QUA-999 missing from docs/contracts.md",
    "docs/contracts.md: contract QUA-001 defined more than once",
    "QUA-002: missing requirement (Rule field)",
    "open item without an [AI], [human] or [decision] marker",
    "docs/projects/finie.md: finished card still present",
    "docs/projects/ouverte.md: missing « Hand-off » section",
    "docs/projects/sans-statut.md: no dated « Status » line",
    "docs/intentions/i.md: missing « Open questions » section",
    "check-docs:",
    "error(s)",
    "⚠ docs/projects/ouverte.md: scope block without a « files: » line",
    "⚠ docs/projects/cadrage.md: scope line not understood « pas une entrée »",
    "⚠ docs/projects/cadrage.md: scope pattern too broad « src/** »",
    "⚠ `src/hors.js`: code file outside any docs/projects/ brief",
    "scope warning(s) (QUA-016",
    "item unchecked but docs/projects/finie.md already says it is done",
    "item checked but docs/projects/ouverte.md does not say it is done",
    "checkbox/status consistency warning(s)",
    'docs/projects/sensible.md : no "Risk" field although the scope requires HIGH',
    "risk level warning(s)",
    "⚠ AGENTS.md:2 : cited path not found `ignore.txt` — file ignored by Git",
    "recent-requirement warning(s)",
  ];
  for (const a of attendus) assert.ok(r.stdout.includes(a), `attendu : ${a}\n${r.stdout}`);
  assert.ok(!r.stdout.includes("missing « Need »"));
});

test("hors dépôt git, sans configuration ni registre : rien d'ignoré, pas de rappel de cadrage", () => {
  const r = verifier({ "AGENTS.md": "Voir `README.md`.\n", "README.md": "", "src/a.js": "" }, { depot: false });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /check-docs : 2 fichiers scannés, 0 erreur\(s\)\n$/);
});

test("QUA-021 : fiche « prête » : point [décision] restant, aucun lot ou aucun critère refusés, dans les deux langues ; non prête ou sans champ : passe", () => {
  const critere = "## Critères d'acceptation\n\n- Un export vide est refusé [humain]\n\n";
  const fiche = (champ, points, lots, criteres) =>
    `# Chantier\n\n**Statut** : cadré le 2026-10-15.\n${champ}\n\n${criteres}## 5. Points à trancher\n\n${points}\n\n## 6. Lots\n\n${lots}\n${reprise}`;
  const lot = "- **Lot 1** [IA] : à faire.";
  const cas = (lang, champ, points, lots, criteres = critere) =>
    verifier({
      ".drwil/ia-first.json": JSON.stringify({ lang }),
      "docs/projects/c.md": fiche(champ, points, lots, criteres),
    });
  const fr = cas("fr", "**Maturité** : prêt", "- [décision] ouvert", "(aucun.)");
  assert.equal(fr.status, 1, fr.stdout);
  assert.match(fr.stdout, /c\.md : fiche « prête » mais un point \[décision\]/);
  assert.match(fr.stdout, /c\.md : fiche « prête » mais sans aucun lot/);
  const en = cas("en", "**Maturity**: ready", "- [decision] open", "(none.)");
  assert.equal(en.status, 1, en.stdout);
  assert.match(en.stdout, /c\.md: brief marked "ready" but a \[decision\] point is still open/);
  assert.match(en.stdout, /c\.md: brief marked "ready" but has no increment/);
  const sansCritere = cas("fr", "**Maturité** : prêt", "(aucun.)", lot, "");
  assert.equal(sansCritere.status, 1, sansCritere.stdout);
  assert.match(sansCritere.stdout, /c\.md : fiche « prête » mais sans critère d'acceptation/);
  const withoutCriteria = cas("en", "**Maturity**: ready", "(none.)", lot, "");
  assert.equal(withoutCriteria.status, 1, withoutCriteria.stdout);
  assert.match(withoutCriteria.stdout, /c\.md: brief marked "ready" but has no acceptance criterion/);
  assert.equal(cas("fr", "**Maturité** : prêt", "(aucun.)", lot).status, 0);
  assert.equal(cas("fr", "", "(aucun.)", lot, "").status, 0);
  assert.equal(cas("fr", "**Maturité** : à affiner", "- [décision] ouvert", "(aucun.)").status, 0);
  assert.equal(cas("fr", "", "- [décision] ouvert", "(aucun.)").status, 0);
});

test("QUA-028 : un ID à la fois au registre et au catalogue, ou deux fois au catalogue : bloquant si newRequirements l'impose, avertissement sinon", () => {
  const fichiers = (cfg) => ({
    ".drwil/ia-first.json": JSON.stringify(cfg),
    "docs/contracts.md": "# Contrats\n\n## SEC-001 — Portée\n**Règle** : r.\n**Manuel** : m.\n",
    "docs/contracts-catalog.md":
      "| ID | Règle |\n|---|---|\n| catalogue:SEC-001 | autre règle |\n| catalogue:QUA-002 | a |\n| catalogue:QUA-002 | b |\n",
  });
  const bloquant = verifier(fichiers({ newRequirements: "blocking" }));
  assert.equal(bloquant.status, 1, bloquant.stdout);
  assert.match(bloquant.stdout, /docs\/contracts-catalog\.md : ID QUA-002 défini plusieurs fois dans le catalogue/);
  assert.match(bloquant.stdout, /docs\/contracts-catalog\.md : ID SEC-001 défini à la fois dans le catalogue et dans docs\/contracts\.md/);
  const averti = verifier(fichiers({ lang: "en" }));
  assert.equal(averti.status, 0, averti.stdout);
  assert.match(averti.stdout, /⚠ docs\/contracts-catalog\.md : ID SEC-001 defined both in the catalog and in docs\/contracts\.md/);
  const ailleurs = verifier({
    ".drwil/ia-first.json": JSON.stringify({ newRequirements: "blocking", dirs: { contracts: "regles.md", catalog: "catalogue.md" } }),
    "regles.md": "## QUA-001 — r\n**Règle** : r.\n**Manuel** : m.\n",
    "catalogue.md": "| catalog:QUA-001 | r |\n",
  });
  assert.match(ailleurs.stdout, /catalogue\.md : ID QUA-001 défini à la fois dans le catalogue et dans regles\.md/);
});

test("aucune citation trouvée, dossiers réglés, cadrage désactivé : vert", () => {
  const r = verifier({
    ".drwil/ia-first.json": JSON.stringify({
      codePrefixes: ["src"],
      dirs: { projects: "suivi", intentions: "idees", contracts: "regles.md", index: "suivi/index.md" },
    }),
    "AGENTS.md": "Voir `docs/futur.md` (à créer). Contrat SEC-001.\n",
    "regles.md": "| SEC-001 | r |\n",
    "suivi/a.md": `# A\n\n**Statut** : cadré le 2026-01-01.\n\n<!-- scope\nfiles:\n  - src/a.js\n  - src/a.test.js\n-->\n${reprise}`,
    "src/a.js": "",
  });
  assert.equal(r.status, 0, r.stdout);
  assert.doesNotMatch(r.stdout, /⚠/);
});

test("dans un dépôt git, citations suivies : aucune n'est ignorée", () => {
  const r = verifier({ "AGENTS.md": "Voir `README.md`.\n", "README.md": "", "docs/image.png": "" });
  assert.equal(r.status, 0, r.stdout);
});

test("en français, cadrage et fichiers ignorés en avertissement : signalés sans bloquer", () => {
  const r = verifier({
    ".drwil/ia-first.json": JSON.stringify({ codePrefixes: ["src"] }),
    ".gitignore": "ignore.txt\n",
    "ignore.txt": "",
    "AGENTS.md": "Voir `ignore.txt`.\n",
    "src/hors.js": "",
  });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /⚠ `src\/hors\.js` : fichier de code hors de toute fiche/);
  assert.match(r.stdout, /1 avertissement\(s\) de cadrage \(QUA-016/);
  assert.match(r.stdout, /⚠ AGENTS\.md:1 : chemin cité introuvable `ignore\.txt` — fichier ignoré par Git/);
  assert.match(r.stdout, /1 avertissement\(s\) d'exigence récente/);
});

test("cadrage désactivé : aucun rappel, même pour du code hors fiche", () => {
  const r = verifier({ ".drwil/ia-first.json": JSON.stringify({ scopeReminder: "off", codePrefixes: ["src"] }), "src/hors.js": "" });
  assert.equal(r.status, 0, r.stdout);
  assert.doesNotMatch(r.stdout, /⚠/);
});

test("intention : intitulés acceptés dans les deux langues, l'absent nommé dans la langue du projet", () => {
  const r = verifier({
    "docs/intentions/mixte.md": "# Intention\n\n**Statut** : 2026-01-01\n\n## Need\n\n## Existant\n",
  });
  assert.equal(r.status, 1, r.stdout);
  assert.doesNotMatch(r.stdout, /« (Besoin|Need|Existant|Current state) »/);
  assert.match(r.stdout, /docs\/intentions\/mixte\.md : section « Questions à trancher » absente/);
});
