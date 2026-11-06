// Fichiers de CI du dépôt et du gabarit parsés comme du YAML (QUA-046, fichiers de CI en YAML valide) :
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

test("QUA-113 : les trois CI rejouent, dans le job checks, les contrôles avec la copie de base-checks.mjs de la branche principale", () => {
  for (const fichier of [
    ".github/workflows/ia-first.yml",
    "packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml",
    "packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml",
  ]) {
    const ci = parseAllDocuments(readFileSync(join(RACINE, fichier), "utf8"))[0].toJS();
    // Le job exigé par la protection (checks) : un job à part ne bloquerait pas la fusion.
    const job = JSON.stringify(ci.jobs?.checks ?? ci.checks);
    assert.match(job, /git show \\"\$base:\.githooks\/base-checks\.mjs\\" > /, `${fichier} : copie lue sur la branche principale`);
    assert.match(job, /base-checks\.mjs(?:\\")? --base \\"\$base\\"/, `${fichier} : rejeu lancé`);
  }
});

const VERDICTS = ".drwil/evidence/run-checks-verdicts.json";

for (const fichier of [".github/workflows/ia-first.yml", "packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml"])
  test(`QUA-250 : sur une PR, ${fichier} restaure les verdicts de la branche principale et demande leur reprise ; seul le push sur la branche principale les sauvegarde`, () => {
    const ci = parseAllDocuments(readFileSync(join(RACINE, fichier), "utf8"))[0].toJS();
    const etapes = ci.jobs.checks.steps;
    const indice = (pred, quoi) => {
      const i = etapes.findIndex(pred);
      assert.ok(i >= 0, `${fichier} : ${quoi} absent du job checks`);
      return i;
    };
    const restaure = indice((e) => /^actions\/cache\/restore@/.test(e.uses ?? ""), "restauration des verdicts");
    const passe = indice((e) => e.run === "node .githooks/run-checks.mjs", "run-checks");
    const sauve = indice((e) => /^actions\/cache\/save@/.test(e.uses ?? ""), "sauvegarde des verdicts");
    assert.ok(restaure < passe && passe < sauve, "restaurés avant la passe, sauvegardés après");
    // Restauration : sur une PR seulement, le fichier de verdicts, depuis les clés de la branche principale.
    assert.equal(etapes[restaure].if, "github.event_name == 'pull_request'");
    assert.equal(etapes[restaure].with.path, VERDICTS);
    assert.equal(etapes[restaure].with["restore-keys"], "run-checks-verdicts-");
    // La reprise n'est demandée qu'à la passe de la PR : ni au niveau du job, ni au rejeu avec les hooks de la branche principale (QUA-113).
    assert.match(etapes[passe].env?.DRWIL_CI_REUSE ?? "", /^\$\{\{ github\.event_name == 'pull_request' && '1' \|\| '' \}\}$/);
    assert.equal(etapes.filter((e) => JSON.stringify(e).includes("DRWIL_CI_REUSE")).length, 1);
    assert.ok(
      !JSON.stringify(ci.jobs.checks.env ?? {}).includes("DRWIL_CI_REUSE") && !JSON.stringify(ci.env ?? {}).includes("DRWIL_CI_REUSE"),
    );
    // Sauvegarde : push sur la branche principale seulement, même si un contrôle a échoué (un « ok » reste vrai), clé par commit.
    const garde = etapes[sauve].if;
    assert.match(
      garde,
      /^always\(\) && github\.event_name == 'push' && github\.ref == format\('refs\/heads\/\{0\}', github\.event\.repository\.default_branch\)/,
    );
    assert.equal(etapes[sauve].with.path, VERDICTS);
    assert.match(etapes[sauve].with.key, /^run-checks-verdicts-\$\{\{ github\.sha \}\}$/);
    // Aucun autre job ni aucune autre étape n'écrit de cache.
    const sauvegardes = Object.values(ci.jobs).flatMap((j) =>
      (j.steps ?? []).filter((e) => /^actions\/cache(\/save)?@/.test(e.uses ?? "")),
    );
    assert.equal(sauvegardes.length, 1);
  });

test("QUA-250 : hors de la branche principale, la CI GitLab livrée télécharge les verdicts de la branche principale et demande leur reprise ; seule la branche principale les garde", () => {
  const ci = parseAllDocuments(readFileSync(join(RACINE, "packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml"), "utf8"))[0].toJS();
  const script = ci.checks.script;
  const passe = script.findIndex((l) => l.includes("DRWIL_CI_REUSE"));
  assert.ok(passe >= 0, "reprise jamais demandée");
  const bloc = script[passe];
  // Hors de la branche principale (ni tag) : l'artefact du job checks de la branche principale, jamais un autre ref.
  assert.match(bloc, /if \[ -z "\$CI_COMMIT_TAG" \] && \[ "\$CI_COMMIT_BRANCH" != "\$CI_DEFAULT_BRANCH" \]; then/);
  assert.match(bloc, /\/jobs\/artifacts\/\$CI_DEFAULT_BRANCH\/raw\/\$verdicts\?job=checks/);
  assert.ok(bloc.includes(`verdicts=${VERDICTS}`));
  // Téléchargement manqué : fichier effacé, tout rejoué (QUA-013) ; la reprise n'est demandée qu'à cette passe.
  assert.match(bloc, /\|\| \{ rm -f "\$verdicts";/);
  assert.match(bloc, /DRWIL_CI_REUSE=1 node \.githooks\/run-checks\.mjs\n\s*else\n\s*node \.githooks\/run-checks\.mjs\n\s*fi/);
  assert.equal(script.filter((l) => l.includes("DRWIL_CI_REUSE")).length, 1);
  assert.ok(
    !JSON.stringify(ci.checks.variables ?? {}).includes("DRWIL_CI_REUSE") && !JSON.stringify(ci.variables ?? {}).includes("DRWIL_CI_REUSE"),
  );
  // Sauvegarde : l'artefact du fichier de verdicts, même en échec, effacé avant l'envoi hors de la branche principale.
  assert.equal(ci.checks.artifacts.when, "always");
  assert.deepEqual(ci.checks.artifacts.paths, [VERDICTS]);
  const apres = ci.checks.after_script.join("\n");
  assert.match(
    apres,
    /if \[ -n "\$CI_COMMIT_TAG" \] \|\| \[ "\$CI_COMMIT_BRANCH" != "\$CI_DEFAULT_BRANCH" \]; then\n\s*rm -f \.drwil\/evidence\/run-checks-verdicts\.json/,
  );
  // Pas de cache GitLab : une merge request pourrait l'écrire, ou ne pas le lire (caches protégés séparés).
  assert.ok(!JSON.stringify(ci).includes('"cache"'));
});
