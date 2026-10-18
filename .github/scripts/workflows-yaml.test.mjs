// Fichiers de CI du dépôt et du gabarit parsés comme du YAML (docs/projects/workflow-ci-yaml-valide.md) :
// GitHub rejette en bloc un workflow invalide, sans lancer aucun job ; un contrôle placé dans ce
// workflow ne tournerait donc jamais. Seul un test local attrape l'erreur avant le push.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseAllDocuments } from "yaml";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const YAML = /\.ya?ml$/;

/** Fichiers YAML d'un dossier, récursivement ou non ; lus par motif pour couvrir un nouveau workflow sans retoucher le test. */
const fichiersYaml = (dossier, recursive) =>
  readdirSync(join(RACINE, dossier), { recursive, withFileTypes: true })
    .filter((e) => e.isFile() && YAML.test(e.name))
    .map((e) => relative(RACINE, join(e.parentPath, e.name)).split("\\").join("/"))
    .sort();

const FICHIERS_CI = [...fichiersYaml(".github/workflows", false), ...fichiersYaml("packages/drwil/templates/common/ci", true)];

/** Erreurs de syntaxe d'un texte YAML, chacune avec sa ligne (1-based). */
const erreurs = (texte) =>
  parseAllDocuments(texte, { prettyErrors: true }).flatMap((doc) =>
    doc.errors.map((e) => ({ ligne: e.linePos?.[0]?.line, message: e.message.split("\n")[0] })),
  );

test("QUA-046 : les fichiers de CI du dépôt et du gabarit sont tous lus", () => {
  // Un motif qui ne trouverait plus rien rendrait le test vert sans rien vérifier (QUA-013).
  for (const attendu of [
    ".github/workflows/ia-first.yml",
    ".github/workflows/codeql.yml",
    "packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml",
    "packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml",
  ])
    assert.ok(FICHIERS_CI.includes(attendu), `${attendu} absent des fichiers couverts`);
});

for (const fichier of FICHIERS_CI)
  test(`QUA-046 : ${fichier} est du YAML valide`, () => {
    const trouvees = erreurs(readFileSync(join(RACINE, fichier), "utf8"));
    assert.deepEqual(
      trouvees.map(({ ligne, message }) => `${fichier}:${ligne} ${message}`),
      [],
      `${fichier} n'est pas du YAML valide`,
    );
  });

test("QUA-046 : le `run:` non cité de l'incident (« : » dans le message) est refusé, avec sa ligne", () => {
  // Étape d'avant le correctif 9b742a3 (.github/workflows/ia-first.yml, ligne 86 alors). `$\{` : les
  // expressions GitHub `${{ }}` restent du texte, sans placeholder JavaScript.
  const incident = [
    "jobs:",
    "  kit-tests:",
    "    steps:",
    `      - if: $\{{ !matrix.tester }}`,
    `        run: echo "::notice::$\{{ matrix.os }} non testé : la PR ne touche que la documentation (docs/, .drwil/usage.jsonl)."`,
    "",
  ].join("\n");
  assert.match(incident, /run: echo "::notice::\$\{\{ matrix\.os \}\} non testé : la PR/);
  const trouvees = erreurs(incident);
  assert.ok(trouvees.length > 0, "le run: non cité de l'incident devrait être refusé");
  assert.equal(trouvees[0].ligne, 5);
  // Le correctif de l'incident (commande entre apostrophes) passe.
  const corrige = incident.replace(/run: (.*)$/m, "run: '$1'");
  assert.deepEqual(erreurs(corrige), []);
});
