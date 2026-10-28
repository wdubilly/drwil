import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyProposals,
  checkboxProblems,
  codeCitations,
  deadReferences,
  indexItem,
  intentLeft,
  proposals,
  twinIntents,
} from "./doc-coherence.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const HOOKS = dirname(fileURLToPath(import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

const git = (racine, ...args) => {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", "-c", "core.hooksPath=/dev/null", ...args], {
    cwd: racine,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
};
const ecrire = (racine, fichiers) => {
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
};
/** Dépôt git temporaire sur master avec `fichiers` commités ; la branche `chantier` est créée si `branche`. */
function depot(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-coherence-"));
  dossiers.push(racine);
  git(racine, "init", "-q", "-b", "master");
  ecrire(racine, fichiers);
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "initial");
  git(racine, "checkout", "-q", "-b", "chantier");
  return racine;
}
const fiche = (statut) => `# Projet\n\n**Statut** : ${statut}\n`;
const FINIE = fiche("terminé le 2026-10-01");
const EN_COURS = fiche("en cours (2026-10-01)");

test("QUA-074 : case et statut : case ouverte d'une fiche finie, cochée d'une fiche en cours — corrigeables seulement sans ambiguïté", () => {
  const racine = depot({
    "docs/projects/finie.md": FINIE,
    "docs/projects/ouverte.md": EN_COURS,
    "docs/projects/pending.md": [
      "- [ ] [IA] finie — `docs/projects/finie.md`",
      "- [x] [IA] en cours — `docs/projects/ouverte.md`",
      "- [x] sans marqueur — `docs/projects/ouverte.md`",
      "- [ ] [IA] deux avis — `docs/projects/finie.md`, `docs/projects/ouverte.md`",
      "- [x] [IA] écartée — `docs/projects/finie.md`",
      "",
    ].join("\n"),
  });
  const p = checkboxProblems(racine, {}, "fr", { except: "docs/projects/finie.md" });
  assert.deepEqual(
    p.map((x) => [x.place, x.fixTo]),
    [
      ["docs/projects/pending.md:2", " "],
      ["docs/projects/pending.md:3", null],
    ],
  );
  const tout = checkboxProblems(racine, {}, "fr");
  assert.deepEqual(
    tout.map((x) => [x.line, x.fixTo]),
    [
      [1, "x"],
      [2, " "],
      [3, null],
      [4, null],
    ],
  );
  assert.match(tout[0].message, /case ouverte mais la fiche docs\/projects\/finie\.md se dit déjà terminée \(QUA-015\)/);
  assert.match(checkboxProblems(racine, {}, "en")[0].message, /item unchecked but .* already says it is done/);
});

test("QUA-076 : référence morte : la fiche qui se clôt est réorientée vers le journal, toute autre est supprimée — placeholders et lignes facultatives épargnés", () => {
  const racine = depot({
    "docs/projects/ferme.md": EN_COURS,
    "docs/projects/journal.md": "# Journal\n",
    "docs/intentions/vivante.md": "# Vivante\n",
    "docs/recipes/a.md": [
      "Voir `docs/projects/ferme.md` et `docs/intentions/vivante.md`.",
      "Retirée : (voir `docs/intentions/partie.md`) fin.",
      "Tiret — `docs/projects/vieille.md`.",
      "Seule : `docs/projects/seule.md` ici.",
      "",
      "Prévue : `docs/projects/neuve.md` (à créer).",
      "Modèle : `docs/projects/<nom>.md`.",
      "Facultative : `docs/projects/opt.md` (si présent).",
    ].join("\n"),
    "docs/projects/pending.md": "- [ ] [IA] Elle — `docs/projects/ferme.md`.\n  suite\n",
  });
  const mortes = deadReferences(racine, {}, "fr", "docs/projects/ferme.md");
  assert.deepEqual(
    mortes.map((m) => m.place),
    ["docs/recipes/a.md:1", "docs/recipes/a.md:2", "docs/recipes/a.md:3", "docs/recipes/a.md:4"],
    "l'élément d'index de la fiche qui se clôt est retiré par la clôture, pas corrigé",
  );
  assert.match(mortes[0].message, /a\.md:1 cite docs\/projects\/ferme\.md, qui sera supprimée : à réorienter vers le journal/);
  assert.match(mortes[1].message, /déjà retirée : citation à supprimer/);
  assert.deepEqual(
    proposals(racine, mortes).map((p) => p.to),
    ["Voir `docs/projects/journal.md` et `docs/intentions/vivante.md`.", "Retirée : fin.", "Tiret.", "Seule : ici."],
  );
});

test("QUA-076 : corrections : fusionnées par ligne, écrites seulement par applyProposals, jamais sur une ligne qui a changé", () => {
  const racine = depot({
    "docs/projects/finie.md": FINIE,
    "docs/projects/pending.md": "- [ ] [IA] finie, `docs/projects/finie.md`, `docs/projects/morte.md`\r\n- fin\r\n",
  });
  const trouvees = [...checkboxProblems(racine, {}, "fr"), ...deadReferences(racine, {}, "fr", null)];
  const p = proposals(racine, trouvees);
  assert.deepEqual(p, [
    {
      file: "docs/projects/pending.md",
      line: 1,
      from: "- [ ] [IA] finie, `docs/projects/finie.md`, `docs/projects/morte.md`",
      to: "- [x] [IA] finie, `docs/projects/finie.md`,",
    },
  ]);
  const avant = readFileSync(join(racine, "docs/projects/pending.md"), "utf8");
  assert.equal(avant.includes("[ ]"), true, "proposer n'écrit rien");
  ecrire(racine, { "docs/projects/pending.md": avant.replace("finie,", "FINIE,") });
  assert.equal(applyProposals(racine, p), 0, "ligne modifiée entre-temps : laissée");
  ecrire(racine, { "docs/projects/pending.md": avant });
  assert.equal(applyProposals(racine, p), 1);
  assert.equal(
    readFileSync(join(racine, "docs/projects/pending.md"), "utf8"),
    "- [x] [IA] finie, `docs/projects/finie.md`,\r\n- fin\r\n",
    "fins de ligne conservées",
  );
});

test("QUA-074 : citation de fiche dans le code : refusée dans un fichier modifié ou non, commentaires seulement", () => {
  const racine = depot({
    "src/a.mjs": "// voir docs/projects/ancienne.md\nconst chemin = 'docs/projects/donnee.md';\n",
    "src/b.mjs": "// rien\n",
  });
  ecrire(racine, { "src/b.mjs": "// voir docs/projects/autre.md\n" });
  const c = codeCitations(racine, {}, "fr");
  assert.deepEqual(
    c.map((x) => x.place),
    ["src/a.mjs:1", "src/b.mjs:1"],
  );
  assert.match(c[0].message, /réécrire ce commentaire en citant le contrat/);
});

test("QUA-074 : intention de la fiche : touchée par la branche ou le dossier de travail, sinon signalée ; absente ou sans champ : rien", () => {
  const racine = depot({ "docs/intentions/x.md": "# X\n", "docs/projects/f.md": "# F\n" });
  const texte = "**Intention** : `docs/intentions/x.md`\n";
  assert.equal(intentLeft(racine, "fr", "docs/projects/f.md", texte).length, 1);
  assert.match(intentLeft(racine, "en", "docs/projects/f.md", texte)[0], /deleted without touching its intent/);
  assert.deepEqual(intentLeft(racine, "fr", "docs/projects/f.md", "pas de champ"), []);
  assert.deepEqual(intentLeft(racine, "fr", "docs/projects/f.md", "**Intention** : `docs/intentions/absente.md`\n"), []);
  ecrire(racine, { "docs/intentions/x.md": "# X mis à jour\n" });
  assert.deepEqual(intentLeft(racine, "fr", "docs/projects/f.md", texte), [], "touchée dans le dossier de travail");
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "x");
  assert.deepEqual(intentLeft(racine, "fr", "docs/projects/f.md", texte), [], "touchée par un commit de la branche");
});

test("QUA-077 : doublon d'intention : une intention nouvelle citant un chemin déjà cité est signalée, par chemin seulement", () => {
  const racine = depot({
    "docs/intentions/ancienne.md": "# Ancienne\n\nCite `.githooks/close.mjs` et `docs/contracts.md`.\n",
    "docs/intentions/README.md": "`.githooks/close.mjs`\n",
  });
  ecrire(racine, {
    "docs/intentions/neuve.md": "# Neuve\n\nCite `.githooks/close.mjs`, `docs/contracts.md` et `src/autre.mjs`.\n",
    "docs/intentions/notes.md": "- `.githooks/close.mjs`\n",
  });
  assert.deepEqual(twinIntents(racine, {}, "fr"), [
    ".githooks/close.mjs : cité par docs/intentions/neuve.md, déjà cité par docs/intentions/ancienne.md — doublon possible, à vérifier",
  ]);
  git(racine, "add", "docs/intentions/neuve.md");
  git(racine, "commit", "-q", "-m", "neuve");
  assert.equal(twinIntents(racine, {}, "en").length, 1, "ajoutée par un commit de la branche : encore nouvelle");
  git(racine, "checkout", "-q", "master");
  git(racine, "merge", "-q", "chantier");
  git(racine, "checkout", "-q", "-b", "suite");
  assert.deepEqual(twinIntents(racine, {}, "fr"), [], "déjà sur la branche principale : plus nouvelle");
});

test("QUA-075 : check-docs et la clôture lisent la même règle, dans le même module — une incohérence vue par les deux", () => {
  const racine = depot({
    "docs/projects/finie.md": FINIE,
    "docs/projects/pending.md": "- [ ] [IA] finie — `docs/projects/finie.md`\n",
    ".drwil/ia-first.json": "{}",
  });
  const pourCheckDocs = spawnSync(process.execPath, [join(HOOKS, "check-docs.mjs")], { cwd: racine, encoding: "utf8" }).stdout;
  const message = checkboxProblems(racine, {}, "fr")[0].message;
  assert.ok(pourCheckDocs.includes(`pending.md:1 : ${message}`), pourCheckDocs);
  for (const lecteur of ["check-docs.mjs", "close.mjs"]) {
    assert.match(readFileSync(join(HOOKS, lecteur), "utf8"), /from "\.\/doc-coherence\.mjs"/, `${lecteur} lit le module partagé`);
  }
});

test("QUA-074 : élément d'index : seule une fiche de docs/projects/ compte comme fiche, un autre document cité n'empêche pas de le retirer", () => {
  const brief = "docs/projects/exemple.md";
  const mixte = ["- [ ] [IA] Une fiche — `docs/projects/exemple.md`, voir `docs/ia-first.md`.", "- [ ] Autre — `docs/projects/autre.md`."];
  assert.deepEqual(indexItem(mixte, brief), [0, 1]);
  assert.deepEqual(indexItem(["- [ ] Suite", "  `docs/projects/exemple.md` et `docs/architecture.md`"], brief), [0, 2]);
  assert.equal(indexItem(["- [ ] Deux — `docs/projects/exemple.md`, `docs/projects/autre.md`."], brief), null);
  assert.equal(indexItem(["- [ ] Seulement un document — `docs/ia-first.md`."], brief), null);
});
