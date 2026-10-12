// Migration d'un projet équipé par une version française du kit (docs/projects/coeur-en-anglais.md).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { migrer } from "../dist/index.js";

const dossiers = [];
after(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true });
});

const sha = (s) => createHash("sha256").update(s).digest("hex");
const ecrire = (racine, rel, contenu) => {
  mkdirSync(dirname(join(racine, rel)), { recursive: true });
  writeFileSync(join(racine, rel), contenu);
};
const lire = (racine, rel) => readFileSync(join(racine, rel), "utf8");
const json = (racine, rel) => JSON.parse(lire(racine, rel));

function arbre(racine, rel = "") {
  const sortie = {};
  for (const e of readdirSync(join(racine, rel), { withFileTypes: true })) {
    const chemin = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) Object.assign(sortie, arbre(racine, chemin));
    else sortie[chemin] = lire(racine, chemin);
  }
  return sortie;
}

const FICHE = `# Projet : ma fiche

**Statut** : lot 1 en cours.

<!-- cadrage
fichiers:
  - src/app.js
-->

Voir \`docs/recettes/travailler-en-branche.md\`, puis \`node .githooks/etat.mjs passer CLOTURE\`.
Le bloc \`<!-- cadrage\` cité dans la prose n'est pas un bloc.

## 6. Lots

- **Lot 1** : faire.
`;

/** Projet à l'ancien format : installé en français, puis mis à jour avant le chantier A. */
function projetFrancais() {
  const r = mkdtempSync(join(tmpdir(), "drwil-migration-"));
  dossiers.push(r);
  const installes = {
    // Inchangés depuis l'installation.
    "docs/recettes/travailler-en-branche.md": "# Travailler en branche\n",
    ".githooks/etat.mjs": "// ancien lecteur d'état\n",
    ".githooks/pre-commit": '#!/bin/sh\nexec node "$(dirname "$0")/perimetre.mjs"\n',
    ".claude/hooks/garde-fou-bash.mjs": "// garde-fou\n",
    "docs/projets/en-attente.md": "# En attente\n\n- [ ] [P1] Ma fiche — `docs/projets/ma-fiche.md`.\n",
    "docs/projects/pending.md": "# Pending\n",
    // Modifiés ensuite : la version installée diffère.
    "docs/recettes/lancer-en-local.md": "# Lancer en local\n",
    ".githooks/check-docs.mjs": 'import { lire } from "./fiches.mjs";\n',
    ".claude/settings.json": "{}\n",
  };
  for (const [rel, contenu] of Object.entries(installes)) ecrire(r, rel, contenu);
  ecrire(r, ".drwil/fichiers-installes.json", JSON.stringify(Object.fromEntries(Object.entries(installes).map(([k, v]) => [k, sha(v)]))));
  ecrire(r, "docs/recettes/lancer-en-local.md", "# Lancer en local\n\nÉtape propre au projet.\n");
  ecrire(r, ".githooks/check-docs.mjs", 'import { lire } from "./fiches.mjs";\n// réglage local\n');
  ecrire(
    r,
    ".claude/settings.json",
    JSON.stringify({ hooks: { SessionStart: [{ command: 'node "$CLAUDE_PROJECT_DIR/.githooks/etat.mjs" rappel' }] } }, null, 2),
  );
  ecrire(r, "docs/projets/ma-fiche.md", FICHE);
  ecrire(r, "docs/projets/autre.md", "# Autre\n");
  ecrire(r, "docs/projects/autre.md", "# Autre, déjà réécrite à la main\n");
  ecrire(r, "docs/contrats.md", "# Contrats\n");
  ecrire(
    r,
    "AGENTS.md",
    "Index : `docs/projets/en-attente.md` ; contrats : `docs/contrats.md` ; état : `node .githooks/etat.mjs lancer`.\n",
  );
  ecrire(r, ".gitignore", ".drwil/state.json\n.drwil/rappel.json\n");
  ecrire(r, "src/app.js", 'const dossier = "docs/projets/";\n');
  ecrire(
    r,
    ".drwil/ia-first.json",
    JSON.stringify({
      lang: "fr",
      dirs: { projects: "docs/projets", recettes: "docs/recettes", contracts: "docs/contrats.md", index: "docs/projets/en-attente.md" },
      checks: [{ id: "tests", run: "npm test", chemins: ["src/**"] }],
      cadrage: "bloquant",
      barriere: "avertissement",
      nouvellesExigences: "bloquant",
      transitions: "humain",
      horsPerimetre: ["docs/projets/*"],
      risque: { cheminsSensibles: ["infra/*"] },
      projetPropre: "gardé",
    }),
  );
  ecrire(
    r,
    ".drwil/state.json",
    JSON.stringify({
      version: 1,
      activite: "REALISATION",
      attente_active: "docs/projets/ma-fiche.md",
      demande_active: null,
      depuis: null,
      fusion_autorisee: true,
    }),
  );
  ecrire(r, ".drwil/rappel.json", '{"empreinte":"x"}\n');
  ecrire(
    r,
    ".drwil/usage.jsonl",
    '{ "chantier": "ma-fiche", "lot": "Lot 1", "tokens": 10, "modele": "m", "duree_min": 5, "date": "2026-10-12" }\nligne illisible\n',
  );
  return r;
}

test("simulation : le plan complet, rien d'écrit", async () => {
  const r = projetFrancais();
  const avant = arbre(r);
  const plan = await migrer(r, { simulation: true });
  assert.deepEqual(arbre(r), avant);
  assert.ok(plan.deplaces.some((d) => d.de === "docs/projets/en-attente.md" && d.vers === "docs/projects/pending.md"));
  assert.deepEqual(plan.conflits, [{ de: "docs/projets/autre.md", vers: "docs/projects/autre.md" }]);
  assert.ok(plan.supprimes.includes("docs/recettes/travailler-en-branche.md"));
  assert.deepEqual(plan.gardes.sort(), ["docs/recettes/lancer-en-local.md"]);
});

test("migration : contenu déplacé, anciens fichiers du kit retirés, références, bloc, config, état et journal en anglais", async () => {
  const r = projetFrancais();
  await migrer(r);

  // Contenu du projet déplacé, jamais perdu ; une cible modifiée n'est pas écrasée.
  assert.equal(lire(r, "docs/projects/pending.md"), "# En attente\n\n- [ ] [P1] Ma fiche — `docs/projects/ma-fiche.md`.\n");
  assert.equal(lire(r, "docs/contracts.md"), "# Contrats\n");
  assert.equal(lire(r, "docs/projets/autre.md"), "# Autre\n");
  assert.equal(lire(r, "docs/projects/autre.md"), "# Autre, déjà réécrite à la main\n");
  assert.ok(!existsSync(join(r, "docs/contrats.md")));

  // Bloc et section des lots ; la prose garde sa citation.
  const fiche = lire(r, "docs/projects/ma-fiche.md");
  assert.match(fiche, /^<!-- scope\nfiles:\n {2}- src\/app\.js\n-->$/m);
  assert.match(fiche, /^## 6\. Increments$/m);
  assert.match(fiche, /Le bloc `<!-- cadrage` cité/);
  assert.match(fiche, /`docs\/recipes\/working-with-branches\.md`, puis `node \.githooks\/state\.mjs move CLOTURE`/);

  // Kit inchangé retiré (l'installation le réécrit), kit modifié gardé et réécrit, code du projet intact.
  for (const f of [
    "docs/recettes/travailler-en-branche.md",
    ".githooks/etat.mjs",
    ".githooks/pre-commit",
    ".claude/hooks/garde-fou-bash.mjs",
  ])
    assert.ok(!existsSync(join(r, f)), f);
  assert.equal(lire(r, "docs/recettes/lancer-en-local.md"), "# Lancer en local\n\nÉtape propre au projet.\n");
  assert.match(lire(r, ".githooks/check-docs.mjs"), /from "\.\/briefs\.mjs"/);
  assert.match(lire(r, ".claude/settings.json"), /\.githooks\/state\.mjs\\" reminder/);
  assert.equal(lire(r, "src/app.js"), 'const dossier = "docs/projets/";\n');
  assert.equal(
    lire(r, "AGENTS.md"),
    "Index : `docs/projects/pending.md` ; contrats : `docs/contracts.md` ; état : `node .githooks/state.mjs start`.\n",
  );
  assert.equal(lire(r, ".gitignore"), ".drwil/state.json\n.drwil/reminder.json\n");

  assert.deepEqual(json(r, ".drwil/ia-first.json"), {
    lang: "fr",
    dirs: { projects: "docs/projects", recipes: "docs/recipes", contracts: "docs/contracts.md", index: "docs/projects/pending.md" },
    checks: [{ id: "tests", run: "npm test", paths: ["src/**"] }],
    scopeReminder: "blocking",
    scopeGate: "warning",
    newRequirements: "blocking",
    transitions: "human",
    outOfScope: ["docs/projects/*"],
    risk: { sensitivePaths: ["infra/*"] },
    projetPropre: "gardé",
  });
  assert.deepEqual(json(r, ".drwil/state.json"), {
    version: 1,
    activity: "BUILD",
    active_brief: "docs/projects/ma-fiche.md",
    active_request: null,
    since: null,
    auto_merge: true,
  });
  assert.equal(
    lire(r, ".drwil/usage.jsonl"),
    '{"workstream":"ma-fiche","increment":"Lot 1","tokens":10,"model":"m","duration_min":5,"date":"2026-10-12"}\nligne illisible\n',
  );
  assert.ok(existsSync(join(r, ".drwil/reminder.json")) && !existsSync(join(r, ".drwil/rappel.json")));

  // Manifeste renommé : entrées retirées ou déplacées.
  assert.ok(!existsSync(join(r, ".drwil/fichiers-installes.json")));
  const manifeste = json(r, ".drwil/installed-files.json");
  assert.equal(manifeste["docs/projects/pending.md"], sha("# En attente\n\n- [ ] [P1] Ma fiche — `docs/projets/ma-fiche.md`.\n"));
  for (const f of ["docs/projets/en-attente.md", ".githooks/etat.mjs", ".githooks/pre-commit"]) assert.equal(manifeste[f], undefined, f);
  assert.ok(".githooks/check-docs.mjs" in manifeste);
});

test("idempotente : un projet déjà migré n'a plus rien à migrer", async () => {
  const r = projetFrancais();
  await migrer(r);
  const avant = arbre(r);
  const plan = await migrer(r);
  // Seuls restent signalés ce que la migration ne tranche jamais seule.
  assert.deepEqual(plan.deplaces, []);
  assert.deepEqual(plan.conflits, [{ de: "docs/projets/autre.md", vers: "docs/projects/autre.md" }]);
  assert.deepEqual(plan.gardes, ["docs/recettes/lancer-en-local.md"]);
  assert.deepEqual(plan.supprimes, []);
  assert.deepEqual(plan.reecrits, []);
  assert.deepEqual(arbre(r), avant);
});

test("projet sans ancien format : rien à migrer, rien d'écrit", async () => {
  const r = mkdtempSync(join(tmpdir(), "drwil-migration-"));
  dossiers.push(r);
  ecrire(r, ".drwil/ia-first.json", JSON.stringify({ lang: "en", scopeGate: "blocking", dirs: { projects: "docs/projects" } }));
  ecrire(r, "docs/projects/pending.md", "# Pending\n");
  const avant = arbre(r);
  assert.deepEqual(await migrer(r), { deplaces: [], supprimes: [], gardes: [], conflits: [], reecrits: [] });
  assert.deepEqual(arbre(r), avant);
});

test("mécanique : seuls les scripts sont réécrits, un binaire sous .githooks/ n'est jamais touché", async () => {
  const r = mkdtempSync(join(tmpdir(), "drwil-migration-"));
  dossiers.push(r);
  const binaire = Buffer.from([0xc3, 0x28, 0x2f, 0x65, 0x74, 0x61, 0x74, 0x2e, 0x6d, 0x6a, 0x73, 0x00, 0xff]); // « /etat.mjs » dans un binaire
  ecrire(r, ".githooks/__pycache__/check-docs.pyc", binaire);
  ecrire(r, ".githooks/pre-push", '#!/bin/sh\nexec node "$(dirname "$0")/perimetre.mjs"\n');
  ecrire(r, ".githooks/check-docs.test.mjs", 'import "./etat.mjs";\n');
  ecrire(
    r,
    ".drwil/state.json",
    JSON.stringify({ version: 1, activite: "CADRAGE", attente_active: null, demande_active: null, depuis: null }),
  );
  const plan = await migrer(r);
  assert.ok(readFileSync(join(r, ".githooks/__pycache__/check-docs.pyc")).equals(binaire));
  assert.ok(!plan.reecrits.includes(".githooks/__pycache__/check-docs.pyc"));
  assert.match(lire(r, ".githooks/pre-push"), /\/scope-gate\.mjs/);
  assert.match(lire(r, ".githooks/check-docs.test.mjs"), /\.\/state\.mjs/);
});

test("projet au nouveau format : les anciens noms cités dans sa prose ne sont jamais réécrits", async () => {
  const r = mkdtempSync(join(tmpdir(), "drwil-migration-"));
  dossiers.push(r);
  const note =
    "| Avant | Après |\n|---|---|\n| `docs/projets/`, `.githooks/etat.mjs passer` | `docs/projects/`, `.githooks/state.mjs move` |\n";
  ecrire(r, "CHANGELOG.md", note);
  ecrire(r, "docs/projects/journal.md", "Ancien bloc cité : `<!-- cadrage`, trailer `Drwil-Attente`.\n");
  ecrire(r, ".drwil/ia-first.json", JSON.stringify({ scopeGate: "blocking", dirs: { recipes: "docs/recipes" } }));
  ecrire(
    r,
    ".drwil/state.json",
    JSON.stringify({ version: 1, activity: "SCOPING", active_brief: null, active_request: null, since: null }),
  );
  const plan = await migrer(r);
  assert.deepEqual(plan, { deplaces: [], supprimes: [], gardes: [], conflits: [], reecrits: [] });
  assert.equal(lire(r, "CHANGELOG.md"), note);
});
