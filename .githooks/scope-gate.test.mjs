import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allow, contractsAddedOnly } from "./detour.mjs";
import { readState } from "./state.mjs";
import { addTrailer, checkScope, outsideBriefFiles, checkIndex } from "./scope-gate.mjs";

// Un hook lancé par `git commit -a` ou depuis un worktree reçoit GIT_INDEX_FILE, GIT_DIR… :
// hérités, ils font agir les dépôts de test, et le code testé, sur le dépôt qui lance les tests.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

// Chaque dossier temporaire est supprimé après son test : ces tests tournent à chaque commit,
// et aussi dans chaque projet que génèrent les tests du kit ; sans ça, ils épuisaient les
// inodes de /tmp. Ceux d'un test en échec sont gardés
// (et affichés) pour le diagnostic.
let dossiersDuTest = [];
const tmp = (prefixe) => {
  const dir = mkdtempSync(join(tmpdir(), prefixe));
  dossiersDuTest.push(dir);
  return dir;
};
afterEach((t) => {
  if (t.passed === false) console.error(`dossiers gardés pour diagnostic (${t.name}) : ${dossiersDuTest.join(", ")}`);
  else {
    for (const dir of dossiersDuTest) {
      // macOS (CI) : ENOTEMPTY possible pendant la suppression ; rmSync réessaie. Un dossier
      // résiduel ne doit pas faire échouer un test réussi : signalé.
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch (e) {
        console.error(`dossier temporaire non supprimé (${t.name}) : ${dir} — ${e.code ?? e.message}`);
      }
    }
  }
  dossiersDuTest = [];
});

const FICHE = "docs/projects/exemple.md";
const fiche = (motifs) =>
  `# Projet : Exemple\n\n**Statut** : cadré le 2026-10-09.\n\n<!-- scope\nfiles:\n${motifs.map((m) => `  - ${m}`).join("\n")}\n-->\n`;

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
  const racine = tmp("drwil-perimetre-");
  git(racine, "init", "-q", "-b", "main");
  git(racine, "config", "user.email", "test@example.invalid");
  git(racine, "config", "user.name", "Test");
  ecrire(racine, ".githooks/scope-gate.mjs", "// marqueur : barrière en vigueur\n");
  ecrire(racine, FICHE, fiche(motifs));
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "base");
  return racine;
}

const etat = (activite) => ({
  version: 1,
  activity: activite,
  active_brief: activite === "SCOPING" ? null : FICHE,
  active_request: null,
  since: null,
});
const ecrireEtat = (racine, activite) => ecrire(racine, ".drwil/state.json", JSON.stringify(etat(activite)));

test("hors fiches : seules les fiches, les attestations et le journal de consommation échappent au périmètre", () => {
  assert.deepEqual(
    outsideBriefFiles([
      "docs/projects/x.md",
      "docs/intentions/y.md",
      "docs/projects/z.md",
      ".drwil/evidence/attestations/QUA-013-2026-10-09T17-56-29-571Z.json",
      ".drwil/usage.jsonl",
      "README.md",
      "src/a.js",
    ]),
    ["README.md", "src/a.js"],
  );
  // Attestations et consommation seulement : le reste de .drwil/ (réglages, évidences locales) reste soumis.
  assert.deepEqual(outsideBriefFiles([".drwil/ia-first.json", ".drwil/evidence/verify-x.json"]), [
    ".drwil/ia-first.json",
    ".drwil/evidence/verify-x.json",
  ]);
  assert.deepEqual(outsideBriefFiles(["docs/autre.md"], ["docs/*"]), [], "liste réglable");
});

test("QUA-035 : hors fiches : les sorties des recettes de cadrage (valeur, risques, en français et en anglais) aussi, rien d'autre de docs/", () => {
  // Constaté le 2026-10-17 : la découverte de valeur, faite en SCOPING, y était refusée au commit.
  assert.deepEqual(
    outsideBriefFiles([
      "docs/decouverte-valeur.md",
      "docs/value-discovery.md",
      "docs/audit-risques.md",
      "docs/audit-risks.md",
      "docs/architecture.md",
      "docs/decouverte-valeur-bis.md",
    ]),
    ["docs/architecture.md", "docs/decouverte-valeur-bis.md"],
  );
});

test("QUA-035 : hors fiches : la note de recette d'une version, commitée par plomberie sans trailer, rien d'autre de docs/", () => {
  // Constaté le 2026-10-22 : la CI refusait le commit de la note de recette de la v0.6.10 (PR #199).
  assert.deepEqual(outsideBriefFiles(["docs/recettes/v0.6.10.md", "docs/recettes-bis.md"]), ["docs/recettes-bis.md"]);
});

test("QUA-084 : hors fiches : la preuve de clôture, écrite en CLOSING pour le commit de clôture", () => {
  // Constaté le 2026-10-21 : la clôture écrivait sa preuve, puis la barrière refusait de la commiter.
  assert.deepEqual(outsideBriefFiles(["docs/preuves/x.md", "docs/preuves/README.md", "docs/preuve.md"]), ["docs/preuve.md"]);
  assert.deepEqual(checkIndex({ files: [FICHE, "docs/preuves/x.md"], state: etat("CLOSING"), patterns: [] }), []);
});

test("index : fiches toujours acceptées, le reste seulement en BUILD et dans le cadrage", () => {
  const motifs = ["src/a.js"];
  assert.deepEqual(checkIndex({ files: [FICHE], state: etat("SCOPING"), patterns: [] }), []);
  // La ligne de consommation s'écrit en CLOSING, pour le commit de clôture.
  assert.deepEqual(checkIndex({ files: [FICHE, ".drwil/usage.jsonl"], state: etat("CLOSING"), patterns: [] }), []);
  assert.match(checkIndex({ files: ["src/a.js"], state: etat("SCOPING"), patterns: motifs })[0], /SCOPING/);
  assert.match(checkIndex({ files: ["src/a.js"], state: etat("EVIDENCE"), patterns: motifs })[0], /BUILD/);
  assert.deepEqual(checkIndex({ files: ["src/a.js", FICHE], state: etat("BUILD"), patterns: motifs }), []);
  const hors = checkIndex({ files: ["src/a.js", "src/b.js", "README.md"], state: etat("BUILD"), patterns: motifs });
  assert.equal(hors.length, 2);
  assert.match(hors.join("\n"), /src\/b\.js/);
  assert.match(hors.join("\n"), /README\.md/);
});

test("pre-commit : le cadrage est lu dans HEAD, pas dans l'index (élargir = commit séparé)", () => {
  const racine = depot();
  ecrireEtat(racine, "BUILD");
  ecrire(racine, "src/a.js", "a\n");
  git(racine, "add", "src/a.js");
  assert.deepEqual(checkScope(racine, { cfg: { scopeGate: "blocking" }, staged: ["src/a.js"] }).problems, []);
  // Élargir le cadrage et l'utiliser dans le même commit : refusé.
  ecrire(racine, FICHE, fiche(["src/a.js", "src/b.js"]));
  ecrire(racine, "src/b.js", "b\n");
  const r = checkScope(racine, { cfg: { scopeGate: "blocking" }, staged: [FICHE, "src/b.js"] });
  assert.equal(r.status, "fail");
  assert.match(r.problems.join("\n"), /src\/b\.js/);
});

test("QUA-035 : pre-commit : un fichier du gabarit cadré couvre sa copie déclarée (scopeMirrors), pas une autre", () => {
  const racine = depot();
  ecrireEtat(racine, "BUILD");
  const cfg = { scopeGate: "blocking", scopeMirrors: [{ from: "src/", to: "copie/" }] };
  assert.deepEqual(checkScope(racine, { cfg, staged: ["copie/a.js"] }).problems, [], "copie de src/a.js, cadré");
  assert.match(checkScope(racine, { cfg, staged: ["copie/b.js"] }).problems.join("\n"), /copie\/b\.js/, "copie d'un fichier non cadré");
  assert.match(
    checkScope(racine, { cfg: { scopeGate: "blocking" }, staged: ["copie/a.js"] }).problems.join("\n"),
    /copie\/a\.js/,
    "sans réglage",
  );
});

test("pre-commit sans état : SCOPING neutre, un fichier hors fiches est refusé", () => {
  const racine = depot();
  const r = checkScope(racine, { cfg: { scopeGate: "blocking" }, staged: ["src/a.js"] });
  assert.equal(r.status, "fail");
  assert.match(r.problems[0], /SCOPING/);
});

test("sévérité : off ne contrôle rien, avertissement signale sans bloquer", () => {
  const racine = depot();
  assert.equal(checkScope(racine, { cfg: { scopeGate: "off" }, staged: ["src/a.js"] }).status, "not-applicable");
  const avert = checkScope(racine, { cfg: { scopeGate: "warning" }, staged: ["src/a.js"] });
  assert.equal(avert.status, "ok");
  assert.equal(avert.problems.length, 1);
  assert.equal(checkScope(racine, { cfg: {}, staged: ["src/a.js"] }).status, "ok", "réglage absent : avertissement");
});

test("trailer : ajouté depuis l'état actif, rien en SCOPING", () => {
  const racine = depot();
  const message = join(racine, "MSG");
  writeFileSync(message, "Un commit\n");
  addTrailer(racine, message);
  assert.doesNotMatch(readFileSync(message, "utf8"), /Drwil-Brief/);
  ecrireEtat(racine, "BUILD");
  addTrailer(racine, message);
  addTrailer(racine, message);
  const texte = readFileSync(message, "utf8");
  assert.match(texte, /^Drwil-Brief: docs\/projects\/exemple\.md$/m);
  assert.equal(texte.match(/Drwil-Brief/g).length, 1, "jamais en double");
});

test("trailer : jamais ajouté quand la gouvernance est désactivée (scopeGate: off)", () => {
  const racine = depot();
  ecrireEtat(racine, "BUILD");
  ecrire(racine, ".drwil/ia-first.json", JSON.stringify({ scopeGate: "off" }));
  const message = join(racine, "MSG");
  writeFileSync(message, "Un commit\n");
  addTrailer(racine, message);
  assert.doesNotMatch(readFileSync(message, "utf8"), /Drwil-Brief/);
});

test("branche (CI, pre-push, verify) : chaque commit rejoué contre le cadrage de son parent", () => {
  const racine = depot(["src/a.js"]);
  git(racine, "checkout", "-q", "-b", "chantier");
  ecrire(racine, "src/a.js", "a\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "couvert\n\nDrwil-Brief: docs/projects/exemple.md");
  ecrire(racine, "src/b.js", "b\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "hors cadrage\n\nDrwil-Brief: docs/projects/exemple.md");
  ecrire(racine, "README.md", "r\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "sans trailer");
  ecrire(racine, "docs/projects/autre.md", "# Projet : autre\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "fiche seule, sans trailer");

  const r = checkScope(racine, { cfg: { scopeGate: "blocking" }, env: { DRWIL_BASE: "main" } });
  assert.equal(r.status, "fail");
  const texte = r.problems.join("\n");
  assert.equal(r.problems.length, 2, texte);
  assert.match(texte, /src\/b\.js/);
  assert.match(texte, /sans trailer Drwil-Brief/);
  assert.doesNotMatch(texte, /src\/a\.js/);
});

test("branche : un commit dont le parent n'a pas encore la barrière n'est pas contrôlé", () => {
  const racine = tmp("drwil-perimetre-");
  git(racine, "init", "-q", "-b", "main");
  git(racine, "config", "user.email", "test@example.invalid");
  git(racine, "config", "user.name", "Test");
  ecrire(racine, "README.md", "r\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "base sans barrière");
  git(racine, "checkout", "-q", "-b", "chantier");
  ecrire(racine, "src/a.js", "a\n");
  ecrire(racine, ".githooks/scope-gate.mjs", "// la barrière arrive avec ce commit\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "introduit la barrière");
  assert.deepEqual(checkScope(racine, { cfg: { scopeGate: "blocking" }, env: { DRWIL_BASE: "main" } }).problems, []);
});

test("branche sans référence : non exécuté, jamais un succès (QUA-013)", () => {
  const racine = depot();
  git(racine, "branch", "-m", "travail");
  assert.equal(checkScope(racine, { cfg: { scopeGate: "blocking" }, env: {} }).status, "not-run");
});

test("branche : trailer vers une fiche sans bloc scope ou inexistante, chaque fichier est signalé", () => {
  const racine = depot(["src/a.js"]);
  ecrire(racine, "docs/projects/sans-scope.md", "# Projet : sans scope\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "fiche sans scope");
  git(racine, "checkout", "-q", "-b", "chantier");
  ecrire(racine, "src/a.js", "a\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "sans scope\n\nDrwil-Brief: docs/projects/sans-scope.md");
  ecrire(racine, "src/b.js", "b\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "fiche inexistante\n\nDrwil-Brief: docs/projects/fantome.md");
  const r = checkScope(racine, { cfg: { scopeGate: "blocking" }, env: { DRWIL_BASE: "main" } });
  assert.equal(r.status, "fail");
  const texte = r.problems.join("\n");
  assert.match(texte, /src\/a\.js outside the scope of docs\/projects\/sans-scope\.md|src\/a\.js.*sans-scope\.md/);
  assert.match(texte, /src\/b\.js.*fantome\.md/);
});

test("hors dépôt git : non exécuté, avec un détail explicite, jamais un succès", () => {
  const r = checkScope(tmp("drwil-perimetre-"), { cfg: { scopeGate: "blocking" }, env: {} });
  assert.equal(r.status, "not-run");
  assert.match(r.detail, /aucune branche de référence/);
  assert.equal(r.configured, true);
});

test("référence DRWIL_BASE inconnue : repli sur master ou main, sinon non exécuté", () => {
  const racine = depot();
  assert.equal(checkScope(racine, { cfg: { scopeGate: "blocking" }, env: { DRWIL_BASE: "inconnue" } }).status, "ok");
  git(racine, "branch", "-m", "travail");
  assert.equal(checkScope(racine, { cfg: { scopeGate: "blocking" }, env: { DRWIL_BASE: "inconnue" } }).status, "not-run");
});

test("messages en anglais : activité, hors cadrage, commits sans trailer ou hors cadrage, échec", () => {
  const cfg = { lang: "en" };
  assert.match(
    checkIndex({ files: ["src/a.js"], state: etat("SCOPING"), patterns: [], cfg })[0],
    /^1 file\(s\) outside briefs committed in SCOPING/,
  );
  assert.match(
    checkIndex({ files: ["src/b.js"], state: etat("BUILD"), patterns: ["src/a.js"], cfg })[0],
    /^src\/b\.js: outside the scope of docs\/projects\/exemple\.md/,
  );
  const racine = depot(["src/a.js"]);
  git(racine, "checkout", "-q", "-b", "chantier");
  ecrire(racine, "src/a.js", "a\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "fiche absente du parent\n\nDrwil-Brief: docs/projects/absente.md");
  ecrire(racine, "README.md", "r\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "sans trailer");
  const r = checkScope(racine, { cfg: { ...cfg, scopeGate: "blocking" }, env: { DRWIL_BASE: "main" } });
  assert.equal(r.message, "brief scope: 2 problem(s) (blocking gate)");
  assert.match(r.problems[0], /: src\/a\.js outside the scope of docs\/projects\/absente\.md \(in the parent\)$/);
  assert.match(r.problems[1], /: 1 file\(s\) outside briefs without a Drwil-Brief trailer$/);
});

test("liste hors périmètre réglable par la configuration", () => {
  const racine = depot();
  const r = checkScope(racine, { cfg: { scopeGate: "blocking", outOfScope: ["src/*"] }, staged: ["src/a.js"] });
  assert.deepEqual(r, { status: "ok", problems: [] });
});

test("ligne de commande (prepare-commit-msg) : --trailer ajoute le trailer, sans fichier rien", () => {
  const racine = depot();
  ecrireEtat(racine, "BUILD");
  const message = join(racine, "MSG");
  writeFileSync(message, "Un commit\n");
  const script = fileURLToPath(new URL("./scope-gate.mjs", import.meta.url));
  assert.equal(spawnSync(process.execPath, [script, "--trailer"], { cwd: racine }).status, 0);
  assert.equal(spawnSync(process.execPath, [script], { cwd: racine }).status, 0);
  assert.doesNotMatch(readFileSync(message, "utf8"), /Drwil-Brief/);
  assert.equal(spawnSync(process.execPath, [script, "--trailer", message], { cwd: racine }).status, 0);
  assert.match(readFileSync(message, "utf8"), /^Drwil-Brief: docs\/projects\/exemple\.md$/m);
});

test("branche d'un clone : la référence est origin/HEAD", () => {
  const racine = depot(["src/a.js"]);
  git(racine, "update-ref", "refs/remotes/origin/principale", "HEAD");
  git(racine, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/principale");
  git(racine, "checkout", "-q", "-b", "chantier");
  ecrire(racine, "src/b.js", "b\n");
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "hors cadrage\n\nDrwil-Brief: docs/projects/exemple.md");
  const r = checkScope(racine, { cfg: { scopeGate: "blocking" }, env: {} });
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /src\/b\.js/);
});

test("QUA-050 : en détour, un fichier qui change les règles du jeu attend le oui de l'humain ; un détour ordinaire passe — en anglais aussi", () => {
  const detour = { origin_brief: "docs/projects/chantier.md", origin_branch: "chantier/x", branch: "detour/d", stash: null };
  const state = { ...etat("BUILD"), detour };
  const patterns = [".githooks/x.mjs", "src/a.js", "docs/contracts.md"];
  const files = [".githooks/x.mjs", "src/a.js", "docs/contracts.md"];
  const fr = checkIndex({ files, state, patterns, cfg: {} });
  assert.deepEqual(
    fr.map((p) => p.split(" : ")[0]),
    [".githooks/x.mjs", "docs/contracts.md"],
  );
  assert.match(
    fr[0],
    /demande le oui de l'humain — `node \.githooks\/detour\.mjs allow` dans un terminal ; en file, le sous-agent s'arrête/,
  );
  const en = checkIndex({ files, state, patterns, cfg: { lang: "en" } });
  assert.match(en[0], /^\.githooks\/x\.mjs: a detour that changes the rules .* needs the human's yes/);
  assert.deepEqual(checkIndex({ files, state: { ...state, detour: { ...detour, human: true } }, patterns, cfg: {} }), []);
  assert.deepEqual(checkIndex({ files, state: etat("BUILD"), patterns, cfg: {} }), [], "hors détour, la règle ne s'applique pas");
});

test("QUA-050 : pendant un rebase, un commit rejoué garde son trailer ; hors dépôt git, rien ne casse", () => {
  const racine = depot();
  ecrireEtat(racine, "BUILD");
  const message = join(racine, "message.txt");
  for (const dossier of ["rebase-merge", "rebase-apply"]) {
    writeFileSync(message, "Travail\n\nDrwil-Brief: docs/projects/autre.md\n");
    mkdirSync(join(racine, ".git", dossier));
    addTrailer(racine, message);
    assert.equal(readFileSync(message, "utf8"), "Travail\n\nDrwil-Brief: docs/projects/autre.md\n", dossier);
    rmdirSync(join(racine, ".git", dossier));
  }
  addTrailer(racine, message);
  assert.match(readFileSync(message, "utf8"), new RegExp(`Drwil-Brief: ${FICHE}`), "hors rebase, le trailer suit l'état");
  const horsGit = tmp("drwil-hors-git-");
  ecrireEtat(horsGit, "BUILD");
  writeFileSync(join(horsGit, "m.txt"), "Travail\n");
  assert.doesNotThrow(() => addTrailer(horsGit, join(horsGit, "m.txt")));
});

const REGISTRE = "docs/contracts.md";
const contrat = (id, regle) => `## ${id} — Titre de ${id}\n**Règle** : ${regle}\n**Contrôle** : \`tests-${id.toLowerCase()}\`\n`;
const registre = (...contrats) => `# Contrats\n\nPréambule.\n\n${contrats.join("\n")}`;

/** Dépôt en détour (sans le oui) dont HEAD porte un registre d'un contrat, cadré par la fiche. */
function depotEnDetour(chemin = REGISTRE) {
  const racine = depot([chemin, "src/a.js"]);
  ecrire(racine, chemin, registre(contrat("QUA-001", "une règle.")));
  git(racine, "add", ".");
  git(racine, "commit", "-q", "-m", "registre");
  const detour = { origin_brief: "docs/projects/chantier.md", origin_branch: "chantier/x", branch: "detour/d", stash: null };
  ecrire(racine, ".drwil/state.json", JSON.stringify({ ...etat("BUILD"), detour }));
  return racine;
}

/** Problèmes du commit qui indexerait `contenu` comme registre (`null` : supprimé). */
function indexer(racine, contenu, chemin = REGISTRE, cfg = {}) {
  if (contenu === null) git(racine, "rm", "-q", chemin);
  else {
    ecrire(racine, chemin, contenu);
    git(racine, "add", chemin);
  }
  return checkScope(racine, { cfg: { scopeGate: "blocking", ...cfg }, staged: [chemin] }).problems;
}

test("QUA-050 : en détour, un ajout pur au registre passe sans le oui ; modifier ou retirer un contrat l'attend", () => {
  const ajout = registre(contrat("QUA-001", "une règle."), contrat("QUA-002", "une nouvelle règle."));
  assert.deepEqual(indexer(depotEnDetour(), ajout), [], "nouveau contrat ajouté à la fin");
  const auMilieu = registre(contrat("QUA-003", "insérée avant."), contrat("QUA-001", "une règle."));
  assert.deepEqual(indexer(depotEnDetour(), auMilieu), [], "nouveau contrat inséré avant un existant");
  const refus = {
    "règle existante modifiée": registre(contrat("QUA-001", "une règle changée."), contrat("QUA-002", "nouvelle.")),
    "titre existant changé": registre(contrat("QUA-001", "une règle.").replace("Titre de", "Autre titre de")),
    "contrat retiré": registre(contrat("QUA-002", "remplaçante.")),
    "préambule modifié": registre(contrat("QUA-001", "une règle.")).replace("Préambule.", "Préambule changé."),
    "section ajoutée qui n'est pas un contrat": registre(contrat("QUA-001", "une règle."), "## Annexe\nTexte.\n"),
    "ID déjà défini sous un autre titre": registre(contrat("QUA-001", "une règle."), "## QUA-001 — Doublon\n**Règle** : x.\n"),
    "titre répété, suivi d'un autre contrat": registre(
      contrat("QUA-001", "une règle."),
      contrat("QUA-001", "une règle."),
      contrat("QUA-002", "n."),
    ),
    "registre retiré": null,
  };
  for (const [cas, contenu] of Object.entries(refus)) {
    const problemes = indexer(depotEnDetour(), contenu);
    assert.equal(problemes.length, 1, cas);
    assert.match(problemes[0], /^docs\/contracts\.md : un détour qui change les règles du jeu/, cas);
  }
});

test("QUA-050 : un registre absent de HEAD ou ailleurs (dirs.contracts) se juge de même ; dans le doute, le oui reste demandé", () => {
  const racine = depot(["docs/autre.md"]);
  const detour = { origin_brief: "docs/projects/chantier.md", origin_branch: "chantier/x", branch: "detour/d", stash: null };
  ecrire(racine, ".drwil/state.json", JSON.stringify({ ...etat("BUILD"), detour }));
  const cfg = { dirs: { contracts: "docs/autre.md" } };
  assert.equal(indexer(racine, registre(contrat("QUA-001", "r.")), "docs/autre.md", cfg).length, 1, "registre créé : doute");
  const ailleurs = depotEnDetour("docs/autre.md");
  assert.deepEqual(indexer(ailleurs, registre(contrat("QUA-001", "une règle."), contrat("QUA-002", "n.")), "docs/autre.md", cfg), []);
  // Fins de ligne Windows : un ajout reste un ajout.
  const crlf = depotEnDetour();
  assert.deepEqual(indexer(crlf, registre(contrat("QUA-001", "une règle."), contrat("QUA-002", "n.")).replace(/\n/g, "\r\n")), []);
});

test("QUA-050 : contractsAddedOnly, pur — ajout seul de contrats nouveaux, rien d'autre", () => {
  const avant = registre(contrat("QUA-001", "r."));
  assert.equal(contractsAddedOnly(avant, registre(contrat("QUA-001", "r."), contrat("QUA-002", "n."))), true);
  assert.equal(contractsAddedOnly(avant, avant), true, "rien de changé");
  assert.equal(contractsAddedOnly(null, avant), false);
  assert.equal(contractsAddedOnly(avant, null), false);
  assert.equal(contractsAddedOnly(`${avant}\n${contrat("QUA-001", "r.")}`, avant), false, "doublon dans l'ancien registre : doute");
  assert.equal(
    contractsAddedOnly("| QUA-009 | tableau |\n", "| QUA-009 | tableau |\n\n## QUA-009 — Doublon\n"),
    false,
    "ID déjà défini en tableau",
  );
});

/** Branche `chantier` née de `main`, `main` avancée par `surMain`, puis fusion de `main` sans commit (MERGE_HEAD posé). */
function fusion(racine, { surChantier = () => {}, surMain }) {
  git(racine, "checkout", "-q", "-b", "chantier");
  surChantier();
  git(racine, "checkout", "-q", "main");
  surMain();
  git(racine, "checkout", "-q", "chantier");
  spawnSync("git", ["merge", "--no-commit", "--no-ff", "-q", "main"], { cwd: racine, encoding: "utf8" });
}
const indexes = (racine) => git(racine, "diff", "--cached", "--name-only").split("\n").filter(Boolean);
const commiter = (racine, message) => {
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", message);
};

test("QUA-111 : fusion de la branche principale en SCOPING : les fichiers apportés tels quels passent", () => {
  // Constaté le 2026-10-23 (PR #213) : la fusion de master apportait un fichier déjà fusionné, refusé « hors fiches ».
  const racine = depot();
  fusion(racine, {
    surMain: () => {
      ecrire(racine, "outils/banc.test.mjs", "t\n");
      ecrire(racine, "src/a.js", "a\n");
      commiter(racine, "travail fusionné");
    },
  });
  assert.deepEqual(indexes(racine).sort(), ["outils/banc.test.mjs", "src/a.js"]);
  for (const activite of ["SCOPING", "CLOSING", "BUILD"]) {
    ecrireEtat(racine, activite);
    assert.deepEqual(
      checkScope(racine, { cfg: { scopeGate: "blocking" }, staged: indexes(racine) }),
      { status: "ok", problems: [] },
      activite,
    );
  }
});

test("QUA-111 : fusion : un conflit résolu sur un fichier de code hors cadrage reste jugé, le reste apporté passe", () => {
  const racine = depot(["src/a.js"]);
  ecrire(racine, "src/c.js", "base\n");
  commiter(racine, "c");
  fusion(racine, {
    surChantier: () => {
      ecrire(racine, "src/c.js", "chantier\n");
      commiter(racine, "côté chantier");
    },
    surMain: () => {
      ecrire(racine, "src/c.js", "principale\n");
      ecrire(racine, "outils/x.js", "x\n");
      commiter(racine, "côté principale");
    },
  });
  ecrire(racine, "src/c.js", "chantier\nprincipale\n");
  git(racine, "add", "src/c.js");
  const staged = indexes(racine);
  assert.deepEqual(staged.sort(), ["outils/x.js", "src/c.js"]);
  ecrireEtat(racine, "SCOPING");
  const enCadrage = checkScope(racine, { cfg: { scopeGate: "blocking" }, staged });
  assert.equal(enCadrage.status, "fail");
  assert.match(enCadrage.problems[0], /^1 fichier\(s\) hors fiches commité\(s\) en SCOPING/);
  ecrireEtat(racine, "BUILD");
  const enBuild = checkScope(racine, { cfg: { scopeGate: "blocking" }, staged });
  assert.equal(enBuild.problems.length, 1, enBuild.problems.join("\n"));
  assert.match(enBuild.problems[0], /^src\/c\.js : hors du cadrage/);
});

test("QUA-111 : fusion : un fichier supprimé par la branche principale passe comme apporté", () => {
  const racine = depot();
  ecrire(racine, "src/d.js", "d\n");
  commiter(racine, "d");
  fusion(racine, {
    surMain: () => {
      git(racine, "rm", "-q", "src/d.js");
      git(racine, "commit", "-q", "-m", "retire d");
    },
  });
  assert.deepEqual(indexes(racine), ["src/d.js"]);
  ecrireEtat(racine, "SCOPING");
  assert.deepEqual(checkScope(racine, { cfg: { scopeGate: "blocking" }, staged: ["src/d.js"] }).problems, []);
  // Un chemin que git refuse de lire (hors du dépôt) : la comparaison échoue, le fichier reste jugé (QUA-013).
  const illisible = checkScope(racine, { cfg: { scopeGate: "blocking" }, staged: ["src/d.js", "../dehors.js"] });
  assert.match(illisible.problems[0], /^1 fichier\(s\) hors fiches/);
});

test("QUA-111 : hors fusion, rien ne change ; un parent illisible juge le fichier, jamais ne le laisse passer (QUA-013)", () => {
  const racine = depot();
  ecrire(racine, "src/a.js", "a\n");
  git(racine, "add", "src/a.js");
  ecrireEtat(racine, "SCOPING");
  const ordinaire = checkScope(racine, { cfg: { scopeGate: "blocking" }, staged: ["src/a.js"] });
  assert.equal(ordinaire.status, "fail");
  assert.match(ordinaire.problems[0], /SCOPING/);
  // MERGE_HEAD vers un commit inexistant : la comparaison échoue, le fichier reste jugé.
  writeFileSync(join(racine, ".git", "MERGE_HEAD"), `${"0".repeat(40)}\n`);
  assert.equal(checkScope(racine, { cfg: { scopeGate: "blocking" }, staged: ["src/a.js"] }).status, "fail");
});

test("QUA-117 : chantier rouvert, un correctif qui change les règles du jeu attend le oui de l'humain ; un correctif ordinaire passe — en anglais aussi", () => {
  const state = { ...etat("BUILD"), reopened: { pr: 42 } };
  const patterns = [".githooks/x.mjs", "src/a.js", "docs/contracts.md", ".github/workflows/ci.yml", ".drwil/ia-first.json"];
  const files = [".githooks/x.mjs", "src/a.js", "docs/contracts.md", ".github/workflows/ci.yml", ".drwil/ia-first.json"];
  const fr = checkIndex({ files, state, patterns, cfg: {} });
  assert.deepEqual(
    fr.map((p) => p.split(" : ")[0]),
    [".githooks/x.mjs", "docs/contracts.md", ".github/workflows/ci.yml", ".drwil/ia-first.json"],
  );
  assert.match(
    fr[0],
    /un correctif de réouverture qui change les règles du jeu \(contrat existant modifié ou retiré, hook, seuil, barrière, CI\) demande le oui de l'humain — `node \.githooks\/detour\.mjs allow`/,
  );
  // La source du gabarit d'une copie déclarée change les règles comme la copie.
  const miroirs = { scopeMirrors: [{ from: "gabarit/", to: "" }] };
  assert.equal(checkIndex({ files: ["gabarit/.githooks/y.mjs"], state, patterns: ["gabarit/**"], cfg: miroirs }).length, 1);
  assert.deepEqual(checkIndex({ files: ["src/a.js"], state, patterns, cfg: {} }), [], "correctif ordinaire : personne");
  const en = checkIndex({ files, state, patterns, cfg: { lang: "en" } });
  assert.match(en[0], /^\.githooks\/x\.mjs: a reopening fix that changes the rules .* needs the human's yes/);
  assert.deepEqual(checkIndex({ files, state: { ...state, reopened: { pr: 42, human: true } }, patterns, cfg: {} }), []);
});

test("QUA-117 : chantier rouvert, un ajout pur au registre passe sans le oui ; modifier un contrat l'attend ; le oui se donne dans un terminal", async () => {
  const rouvert = () => {
    const racine = depotEnDetour();
    ecrire(racine, ".drwil/state.json", JSON.stringify({ ...etat("BUILD"), reopened: { pr: 42 } }));
    return racine;
  };
  assert.deepEqual(indexer(rouvert(), registre(contrat("QUA-001", "une règle."), contrat("QUA-002", "nouvelle."))), []);
  const refus = indexer(rouvert(), registre(contrat("QUA-001", "une règle changée.")));
  assert.equal(refus.length, 1);
  assert.match(refus[0], /^docs\/contracts\.md : un correctif de réouverture qui change les règles du jeu/);

  const racine = rouvert();
  assert.match((await allow(racine)).message, /terminal interactif/, "sans terminal, aucun oui");
  const questions = [];
  const non = await allow(racine, {
    tty: true,
    confirm: async (q) => {
      questions.push(q);
      return false;
    },
  });
  assert.equal(non.code, 1);
  assert.match(
    questions[0],
    /Le correctif de la réouverture de docs\/projects\/exemple\.md change les règles du jeu\. L'autoriser \? Retapez DETOUR/,
  );
  assert.deepEqual(readState(racine).state.reopened, { pr: 42 }, "refus : rien d'écrit");
  const oui = await allow(racine, { tty: true, confirm: async () => true });
  assert.equal(oui.code, 0);
  assert.match(oui.message, /réouverture de docs\/projects\/exemple\.md autorisée à changer les règles du jeu/);
  assert.deepEqual(readState(racine).state.reopened, { pr: 42, human: true });
  assert.deepEqual(indexer(racine, registre(contrat("QUA-001", "une règle changée."))), [], "après le oui, le correctif passe");
});
