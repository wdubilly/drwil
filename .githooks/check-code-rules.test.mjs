import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { briefReferenceProblems, briefReferences, changedFiles, check, language } from "./check-code-rules.mjs";

const SCRIPT = fileURLToPath(new URL("./check-code-rules.mjs", import.meta.url));
const lancer = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });

test("check-code-rules : sans règle, toujours vert, racine existante ou non", () => {
  assert.equal(lancer().status, 0);
  assert.equal(lancer("chemin/qui/n/existe/pas").status, 0);
});

test("check-code-rules : les erreurs des règles sont listées et font échouer ; racine absente ignorée", () => {
  const erreurs = [];
  const { error } = console;
  console.error = (m) => erreurs.push(m);
  try {
    const regles = [() => ["a : interdit"], () => [], () => ["b : interdit"]];
    assert.equal(check(".", regles), 1);
    assert.equal(check("chemin/qui/n/existe/pas", regles), 0);
    assert.equal(check("."), 0);
  } finally {
    console.error = error;
  }
  assert.deepEqual(erreurs, ["Règles d'hygiène du code :\n  a : interdit\n  b : interdit"]);
});

test("check-code-rules : messages en anglais, langue lue dans .drwil/ia-first.json (français par défaut)", () => {
  const erreurs = [];
  const { error } = console;
  console.error = (m) => erreurs.push(m);
  try {
    assert.equal(check(".", [() => ["a: forbidden"]], "en"), 1);
  } finally {
    console.error = error;
  }
  assert.deepEqual(erreurs, ["Code hygiene rules:\n  a: forbidden"]);
  const dir = mkdtempSync(join(tmpdir(), "drwil-regles-"));
  const avant = process.cwd();
  try {
    process.chdir(dir);
    assert.equal(language(), "fr", "sans configuration");
    mkdirSync(".drwil");
    writeFileSync(join(".drwil", "ia-first.json"), JSON.stringify({ lang: "en" }));
    assert.equal(language(), "en");
  } finally {
    process.chdir(avant);
    rmSync(dir, { recursive: true, force: true });
  }
});

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

/** Dépôt git temporaire : `suivis` commités, puis `modifies` écrits par-dessus sans commit. */
function depotCode(suivis, modifies = {}) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-regles-fiches-"));
  const ecrire = (fichiers) => {
    for (const [chemin, contenu] of Object.entries(fichiers)) {
      mkdirSync(join(racine, chemin, ".."), { recursive: true });
      writeFileSync(join(racine, chemin), contenu);
    }
  };
  const git = (...args) =>
    spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", "-c", "core.hooksPath=/dev/null", ...args], { cwd: racine });
  git("init", "-q");
  ecrire(suivis);
  git("add", "-A");
  git("commit", "-q", "-m", "initial");
  ecrire(modifies);
  return racine;
}

test("QUA-049 : un commentaire de code qui cite une fiche de chantier est relevé ; une chaîne de test, une fiche permanente ou un document, non", () => {
  const racine = depotCode(
    {
      "src/a.mjs": '// Sert docs/projects/chantier.md\nconst x = "docs/projects/donnee.md";\x20// voir docs/projects/autre.md\n',
      "src/b.py": "# docs/projects/pending.md, docs/projects/journal.md, docs/projects/model-brief.md\n",
      "src/c.ts": "/**\n * docs/projects/routine-maintenance.md et docs/projects/suivi.md\n */\n",
      "docs/notes.mjs": "// docs/projects/chantier.md\n",
      "src/d.txt": "// docs/projects/chantier.md\n",
      "src/e.mjs": "// rien\n",
    },
    { "src/e.mjs": "// docs/projects/neuf.md\n", "src/f.yml": "# docs/projects/nouveau.md\n" },
  );
  try {
    const refs = briefReferences(racine).map((r) => `${r.file}:${r.line} ${r.brief} ${r.changed ? "modifié" : "inchangé"}`);
    assert.deepEqual(refs.sort(), [
      "src/a.mjs:1 docs/projects/chantier.md inchangé",
      "src/a.mjs:2 docs/projects/autre.md inchangé",
      "src/c.ts:2 docs/projects/suivi.md inchangé",
      "src/e.mjs:1 docs/projects/neuf.md modifié",
      "src/f.yml:1 docs/projects/nouveau.md modifié",
    ]);
    const reglage = briefReferences(racine, { dirs: { projects: "docs/projects/", index: "docs/projects/suivi.md" } });
    assert.ok(!reglage.some((r) => r.brief.endsWith("suivi.md")), "l'index réglé est une fiche permanente");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("QUA-049 : dans un fichier modifié, bloquant si newRequirements l'impose, averti sinon ; les fichiers inchangés résumés en un avertissement ; en anglais aussi", () => {
  const racine = depotCode(
    { "src/a.mjs": "// docs/projects/vieux.md\n", "src/b.mjs": "// docs/projects/vieux.md\n" },
    { "src/c.mjs": "// docs/projects/neuf.md\n" },
  );
  try {
    const bloquant = briefReferenceProblems(racine, { newRequirements: "blocking" });
    assert.deepEqual(bloquant.errors, [
      "src/c.mjs:1 : cite la fiche de chantier docs/projects/neuf.md, supprimée à la clôture — citer le contrat que ce code sert (son ID) (QUA-049)",
    ]);
    assert.deepEqual(bloquant.warnings, [
      "2 citation(s) de fiche de chantier dans du code non modifié (non bloquant ; à corriger quand le fichier change, QUA-049) : src/a.mjs, src/b.mjs",
    ]);
    const averti = briefReferenceProblems(racine, {}, "en");
    assert.deepEqual(averti.errors, []);
    assert.match(averti.warnings[0], /^src\/c\.mjs:1: cites the workstream brief docs\/projects\/neuf\.md/);
    assert.match(averti.warnings[1], /^2 workstream brief citation\(s\) in unchanged code/);
    const horsGit = mkdtempSync(join(tmpdir(), "drwil-hors-git-"));
    assert.deepEqual(briefReferenceProblems(horsGit), { errors: [], warnings: [] }, "hors git : rien");
    rmSync(horsGit, { recursive: true, force: true });
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("QUA-049 : check-docs refuse au commit une fiche citée par du code modifié, sans bloquer pour le code inchangé", () => {
  const racine = depotCode(
    {
      ".drwil/ia-first.json": JSON.stringify({ newRequirements: "blocking", scopeReminder: "off" }),
      "src/a.mjs": "// docs/projects/vieux.md\n",
    },
    { "src/b.mjs": "// docs/projects/neuf.md\n" },
  );
  try {
    const r = spawnSync(process.execPath, [fileURLToPath(new URL("./check-docs.mjs", import.meta.url))], { cwd: racine, encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /✗ src\/b\.mjs:1 : cite la fiche de chantier docs\/projects\/neuf\.md/);
    assert.match(r.stdout, /⚠ 1 citation\(s\) de fiche de chantier dans du code non modifié .*: src\/a\.mjs/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("QUA-049 : un fichier renommé compte comme modifié, sous son nouveau nom", () => {
  const racine = depotCode({ "src/a.mjs": "// docs/projects/vieux.md\n" });
  try {
    spawnSync("git", ["mv", "src/a.mjs", "src/b.mjs"], { cwd: racine });
    assert.deepEqual(changedFiles(racine), ["src/b.mjs"]);
    assert.deepEqual(
      briefReferences(racine).map((r) => [r.file, r.changed]),
      [["src/b.mjs", true]],
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});
