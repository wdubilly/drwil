// Tests livrés avec le contrôle (lot 4 : les contrôles s'auto-testent chez le
// projet, pas seulement dans le paquet du kit). Lancé par run-checks.mjs
// (tests des contrôles eux-mêmes), comme tout .githooks/*.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { undeclaredHooks } from "./base-checks.mjs";
import {
  briefsCovering,
  closedBriefPatterns,
  deliveredFiles,
  fnmatch,
  isCode,
  normalize,
  outsideBriefs,
  patternsByBrief,
  readBlock,
  tooBroad,
  withMirrors,
} from "./scope.mjs";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

test("fnmatch : * et ? traversent les séparateurs, le reste est littéral", () => {
  assert.equal(fnmatch("backend/app/x.py", "backend/app/x*"), true);
  // Le `*` peut avaler un `/` (traverse les séparateurs) tant que le reste du motif reste littéral.
  assert.equal(fnmatch("backend/app/x/sous.py", "backend/app/x*"), true);
  // Mais un chemin qui ne commence pas par la partie littérale du motif ne matche pas.
  assert.equal(fnmatch("backend/app/sous/x.py", "backend/app/x*"), false);
  assert.equal(fnmatch("backend/autre/x.py", "backend/app/x*"), false);
});

test("tooBroad : ** toujours trop large, moins de deux dossiers avant le premier joker aussi", () => {
  assert.equal(tooBroad("**"), true);
  assert.equal(tooBroad("backend/*"), true);
  assert.equal(tooBroad("backend/app/x*"), false);
});

test("readBlock : fiche sans bloc, bloc bien formé, en-tête manquante", () => {
  assert.deepEqual(readBlock("rien ici"), { patterns: [], problems: [] });
  const r = readBlock("<!-- scope\nfiles:\n  - backend/app/x.py\n-->");
  assert.deepEqual(r.patterns, ["backend/app/x.py"]);
  const mal = readBlock("<!-- scope\n  - backend/app/x.py\n-->");
  assert.equal(mal.problems.length > 0, true);
});

test("isCode : jamais docs/ ni .md, code sinon selon la config", () => {
  const cfg = { layers: ["backend"], codePrefixes: [".githooks"] };
  assert.equal(isCode("docs/projects/x.md", cfg), false);
  assert.equal(isCode("README.md", cfg), false);
  assert.equal(isCode("backend/app/x.py", cfg), true);
  assert.equal(isCode(".githooks/run-checks.mjs", cfg), true);
  assert.equal(isCode("ailleurs/x.py", cfg), false);
});

test("briefsCovering : une fiche qui matche, une qui ne matche pas", () => {
  const motifs = new Map([["docs/projects/a.md", ["backend/app/x*"]]]);
  assert.deepEqual(briefsCovering("backend/app/x.py", motifs), ["docs/projects/a.md"]);
  assert.deepEqual(briefsCovering("backend/autre/y.py", motifs), []);
});

test("normaliser, isCode et tooBroad : cas limites (./ répétés, configuration vide, joker en tête)", () => {
  assert.equal(normalize("././a\\b"), "a/b");
  assert.equal(isCode("z.txt", {}), false);
  assert.equal(isCode("x/a.js", { layers: ["x"] }), true);
  assert.equal(isCode("Makefile", { extraCodeFiles: ["Makefile"] }), true);
  assert.equal(isCode(".gitlab-ci.yml", { ciFiles: [".gitlab-ci.yml"] }), true);
  assert.equal(tooBroad("a*"), true);
});

test("QUA-035 : withMirrors : un motif sous une source couvre sa copie ; réglage absent, mal formé ou hors source : inchangé", () => {
  const cfg = {
    scopeMirrors: [
      { from: "tpl/base/", to: "" },
      { from: "tpl/claude/", to: "app/" },
    ],
  };
  assert.deepEqual(withMirrors(["tpl/base/.githooks/x.mjs", "src/y.js", "tpl/claude/hooks/*"], cfg), [
    "tpl/base/.githooks/x.mjs",
    "src/y.js",
    "tpl/claude/hooks/*",
    ".githooks/x.mjs",
    "app/hooks/*",
  ]);
  assert.deepEqual(withMirrors(["tpl/base/x.mjs"]), ["tpl/base/x.mjs"]);
  assert.deepEqual(withMirrors(["tpl/base/x.mjs"], { scopeMirrors: [{ from: "", to: "a/" }, { to: "b/" }, null, "c"] }), [
    "tpl/base/x.mjs",
  ]);
  assert.deepEqual(withMirrors(["tpl/base/x.mjs", "tpl/base/x.mjs"], { scopeMirrors: [{ from: "tpl/base/", to: "" }] }), [
    "tpl/base/x.mjs",
    "x.mjs",
  ]);
  const parFiche = patternsByBrief([["docs/projects/a.md", "<!-- scope\nfiles:\n  - tpl/base/.githooks/x.mjs\n-->\n"]], cfg);
  assert.deepEqual(briefsCovering(".githooks/x.mjs", parFiche), ["docs/projects/a.md"]);
});

/** Dépôt sur `main` avec un fichier livré (src/livre.js), puis une branche de chantier. */
function depotLivre() {
  const racine = mkdtempSync(join(tmpdir(), "drwil-livre-"));
  const git = (...args) => assert.equal(spawnSync("git", args, { cwd: racine, encoding: "utf8" }).status, 0, args.join(" "));
  const ecrire = (f, c) => {
    mkdirSync(dirname(join(racine, f)), { recursive: true });
    writeFileSync(join(racine, f), c);
  };
  git("init", "-q", "-b", "main");
  git("config", "user.email", "t@example.invalid");
  git("config", "user.name", "T");
  ecrire("src/livre.js", "a\n");
  ecrire("src/modifie.js", "a\n");
  ecrire("src/retire.js", "a\n");
  git("add", ".");
  git("commit", "-q", "-m", "base");
  git("checkout", "-q", "-b", "chantier");
  return { racine, git, ecrire };
}

test("QUA-173 : un fichier livré (identique sur la branche principale) reste couvert, un fichier nouveau, modifié ou retiré ne l'est pas", () => {
  const { racine, git, ecrire } = depotLivre();
  try {
    ecrire("src/modifie.js", "b\n");
    ecrire("src/neuf.js", "n\n");
    git("add", "src/neuf.js");
    git("rm", "-q", "src/retire.js");
    const livres = deliveredFiles(racine, { DRWIL_BASE: "main" });
    assert.deepEqual([...livres], ["src/livre.js"]);
    const cfg = { codePrefixes: ["src"] };
    const tous = ["src/livre.js", "src/modifie.js", "src/neuf.js", "src/inconnu.js"];
    assert.deepEqual(outsideBriefs(tous, new Map(), cfg, livres), ["src/inconnu.js", "src/modifie.js", "src/neuf.js"]);
    // Une fiche couvre toujours ce qu'elle cite, livré ou non ; sans ensemble donné, rien n'est livré.
    const fiche = patternsByBrief([["docs/projects/a.md", "<!-- scope\nfiles:\n  - src/modifie.js\n-->\n"]], cfg);
    assert.deepEqual(outsideBriefs(tous, fiche, cfg, livres), ["src/inconnu.js", "src/neuf.js"]);
    assert.deepEqual(outsideBriefs(tous, new Map(), cfg, new Set()).length, 4);
  } finally {
    rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("QUA-173 : sans branche principale lisible ou hors dépôt git, rien n'est livré (jamais un succès par défaut)", () => {
  const { racine, git } = depotLivre();
  try {
    git("branch", "-q", "-m", "chantier", "isolee");
    git("branch", "-q", "-D", "main");
    assert.equal(deliveredFiles(racine, {}).size, 0);
    assert.equal(deliveredFiles(join(racine, "src", "absent"), {}).size, 0);
    // Dépôt nu : l'arbre se lit, la comparaison à la copie de travail échoue — rien n'est livré.
    const nu = join(racine, "nu.git");
    git("clone", "-q", "--bare", ".", nu);
    assert.equal(deliveredFiles(nu, { DRWIL_BASE: "refs/heads/isolee" }).size, 0);
  } finally {
    rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("QUA-173 : la branche principale se lit aussi par origin/HEAD, quand le dépôt en a un", () => {
  const { racine, git } = depotLivre();
  try {
    git("branch", "-q", "-m", "chantier", "isolee");
    git("branch", "-q", "-D", "main");
    git("update-ref", "refs/remotes/origin/pivot", "HEAD");
    git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/pivot");
    assert.ok(deliveredFiles(racine, {}).has("src/livre.js"));
  } finally {
    rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("QUA-173 : sans ensemble donné, outsideBriefs lit le dépôt où le hook est installé", async () => {
  const { racine, ecrire } = depotLivre();
  try {
    mkdirSync(join(racine, ".githooks"));
    copyFileSync(new URL("./scope.mjs", import.meta.url), join(racine, ".githooks", "scope.mjs"));
    ecrire("src/neuf.js", "n\n");
    spawnSync("git", ["add", "src/neuf.js"], { cwd: racine });
    const installe = await import(pathToFileURL(join(racine, ".githooks", "scope.mjs")).href);
    const hors = installe.outsideBriefs(["src/livre.js", "src/neuf.js"], new Map(), { codePrefixes: ["src"] });
    assert.deepEqual(hors, ["src/neuf.js"]);
  } finally {
    rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

/** Dépôt de chantier : fichier neuf listé par une fiche, fiche supprimée par la clôture ; la base n'a pas le fichier. */
function depotCloture() {
  const d = depotLivre();
  d.ecrire("src/neuf.js", "n\n");
  d.ecrire("src/jamais.js", "j\n");
  d.ecrire("docs/projects/f.md", "<!-- scope\nfiles:\n  - src/neuf.js\n-->\n");
  d.git("add", ".");
  d.git("commit", "-q", "-m", "chantier");
  d.git("rm", "-q", "docs/projects/f.md");
  d.git("commit", "-q", "-m", "clôture");
  return d;
}

test("QUA-173 : un fichier neuf listé par la fiche que la branche a supprimée à la clôture reste couvert ; un fichier jamais listé reste refusé (QUA-016)", async () => {
  const { racine } = depotCloture();
  try {
    const cfg = { codePrefixes: ["src"] };
    const hors = outsideBriefs(
      ["src/livre.js", "src/neuf.js", "src/jamais.js"],
      new Map(),
      cfg,
      deliveredFiles(racine),
      closedBriefPatterns(racine, cfg),
    );
    assert.deepEqual(hors, ["src/jamais.js"]);
  } finally {
    rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("QUA-173 : la déclaration QUA-113 « Contrats modifiés » de la fiche supprimée à la clôture déclare scope.mjs et son test, qui passent le rejeu", () => {
  const { racine, git, ecrire } = depotLivre();
  try {
    mkdirSync(join(racine, ".githooks"));
    ecrire(".githooks/scope.mjs", "export const v = 1;\n");
    ecrire(".githooks/scope.test.mjs", "// test\n");
    git("add", ".");
    git("commit", "-q", "-m", "hooks");
    git("branch", "-q", "-f", "main", "HEAD");
    ecrire(".githooks/scope.mjs", "export const v = 2;\n");
    ecrire(".githooks/scope.test.mjs", "// test v2\n");
    ecrire("docs/projects/f.md", "## Contrats modifiés\n\n- `.githooks/scope.mjs` — correctif (validé le 2026-11-12)\n");
    git("add", ".");
    git("commit", "-q", "-m", "chantier");
    const env = { ...process.env, DRWIL_BASE: "main" };
    assert.deepEqual(undeclaredHooks(racine, "", { env }).files, [], "déclarée par la fiche commitée");
    git("rm", "-q", "docs/projects/f.md");
    git("commit", "-q", "-m", "clôture");
    assert.deepEqual(undeclaredHooks(racine, "", { env }).files, [], "fiche supprimée : lue à sa dernière version");
  } finally {
    rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("QUA-173 : historique illisible (clone superficiel, pas de branche principale) : aucune fiche supprimée n'est lue, rien n'est couvert (QUA-013)", async () => {
  const { racine, git } = depotCloture();
  try {
    const cfg = { codePrefixes: ["src"] };
    assert.equal(closedBriefPatterns(racine, cfg, { DRWIL_BASE: "main" }).size, 1, "base lisible : la fiche supprimée est lue");
    git("branch", "-q", "-m", "chantier", "isolee");
    git("branch", "-q", "-D", "main");
    assert.equal(closedBriefPatterns(racine, cfg, {}).size, 0, "pas de branche principale");
    assert.equal(closedBriefPatterns(join(racine, "src", "absent"), cfg, {}).size, 0, "hors dépôt git");
    assert.deepEqual(outsideBriefs(["src/neuf.js"], new Map(), cfg, deliveredFiles(racine), closedBriefPatterns(racine, cfg, {})), [
      "src/neuf.js",
    ]);
  } finally {
    rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("QUA-172 : le commit qui supprime la fiche active (la clôture) porte son trailer Drwil-Brief sans amendement", () => {
  const { racine, git, ecrire } = depotLivre();
  try {
    const hook = join(racine, ".githooks", "prepare-commit-msg");
    mkdirSync(join(racine, ".githooks"));
    copyFileSync(new URL("./prepare-commit-msg", import.meta.url), hook);
    // L'état invalide (fiche absente) ne donne aucun trailer à scope-gate : sa sortie est vide.
    writeFileSync(join(racine, ".githooks", "scope-gate.mjs"), "process.exit(0);\n");
    ecrire("docs/projects/f.md", "fiche\n");
    ecrire(".drwil/state.json", JSON.stringify({ activity: "BUILD", active_brief: "docs/projects/f.md" }));
    git("add", ".");
    git("commit", "-q", "-m", "fiche");
    const message = join(racine, "MSG");
    const lancer = () => assert.equal(spawnSync("sh", [hook, message], { cwd: racine }).status, 0);
    writeFileSync(message, "Clôture\n");
    lancer();
    assert.doesNotMatch(readFileSync(message, "utf8"), /Drwil-Brief/, "fiche encore présente : rien de plus que scope-gate");
    git("rm", "-q", "docs/projects/f.md");
    lancer();
    lancer();
    const texte = readFileSync(message, "utf8");
    assert.match(texte, /^Drwil-Brief: docs\/projects\/f\.md$/m);
    assert.equal(texte.match(/Drwil-Brief/g).length, 1, "jamais en double");
    writeFileSync(message, "Autre\n");
    ecrire(".drwil/ia-first.json", JSON.stringify({ scopeGate: "off" }));
    lancer();
    assert.doesNotMatch(readFileSync(message, "utf8"), /Drwil-Brief/, "gouvernance désactivée : aucun trailer");
  } finally {
    rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
