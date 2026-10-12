import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

test("hors fiches : seules les fiches et les attestations échappent au périmètre", () => {
  assert.deepEqual(
    outsideBriefFiles([
      "docs/projects/x.md",
      "docs/intentions/y.md",
      "docs/projects/z.md",
      ".drwil/evidence/attestations/QUA-013-2026-10-09T17-56-29-571Z.json",
      "README.md",
      "src/a.js",
    ]),
    ["README.md", "src/a.js"],
  );
  // Seules les attestations : le reste de .drwil/ (réglages, évidences locales) reste soumis.
  assert.deepEqual(outsideBriefFiles([".drwil/ia-first.json", ".drwil/evidence/verify-x.json"]), [
    ".drwil/ia-first.json",
    ".drwil/evidence/verify-x.json",
  ]);
  assert.deepEqual(outsideBriefFiles(["docs/autre.md"], ["docs/*"]), [], "liste réglable");
});

test("index : fiches toujours acceptées, le reste seulement en BUILD et dans le cadrage", () => {
  const motifs = ["src/a.js"];
  assert.deepEqual(checkIndex({ files: [FICHE], state: etat("SCOPING"), patterns: [] }), []);
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
  assert.equal(r.status, "echec");
  assert.match(r.problems.join("\n"), /src\/b\.js/);
});

test("pre-commit sans état : SCOPING neutre, un fichier hors fiches est refusé", () => {
  const racine = depot();
  const r = checkScope(racine, { cfg: { scopeGate: "blocking" }, staged: ["src/a.js"] });
  assert.equal(r.status, "echec");
  assert.match(r.problems[0], /SCOPING/);
});

test("sévérité : off ne contrôle rien, avertissement signale sans bloquer", () => {
  const racine = depot();
  assert.equal(checkScope(racine, { cfg: { scopeGate: "off" }, staged: ["src/a.js"] }).status, "non-applicable");
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
  assert.equal(r.status, "echec");
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
  assert.equal(checkScope(racine, { cfg: { scopeGate: "blocking" }, env: {} }).status, "non-execute");
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
