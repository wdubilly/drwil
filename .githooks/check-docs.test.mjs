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

test("aucune citation trouvée, dossiers réglés, cadrage désactivé : vert", () => {
  const r = verifier({
    ".drwil/ia-first.json": JSON.stringify({
      codePrefixes: ["src"],
      dirs: { projects: "suivi", intentions: "idees", contracts: "regles.md", index: "suivi/index.md" },
    }),
    "AGENTS.md": "Voir `docs/futur.md` (à créer). Contrat SEC-001.\n",
    "regles.md": "| SEC-001 | r |\n",
    "suivi/a.md": `# A\n\n**Statut** : cadré le 2026-01-01.\n\n<!-- scope\nfiles:\n  - src/a.js\n-->\n${reprise}`,
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
