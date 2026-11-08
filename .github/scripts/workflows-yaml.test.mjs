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
    // Aucun autre job ni aucune autre étape n'écrit les verdicts ; seule l'archive de gitleaks peut être cachée par une PR,
    // et sa somme est vérifiée à chaque passe : un cache empoisonné échoue, il ne valide rien.
    const ecritures = Object.values(ci.jobs).flatMap((j) => (j.steps ?? []).filter((e) => /^actions\/cache(\/save)?@/.test(e.uses ?? "")));
    assert.equal(ecritures.filter((e) => !String(e.with.key).startsWith("gitleaks-8.21.2-")).length, 1);
  });

for (const [fichier, preuve] of [
  [".github/workflows/ia-first.yml", "arbre-prouve"],
  ["packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml", "proven-tree"],
])
  test(`QUA-250 : ${fichier} saute les contrôles d'un push sur la branche principale dont l'arbre est celui que la dernière CI verte d'une PR a prouvé, et seule une CI de PR pose cette preuve`, () => {
    const ci = parseAllDocuments(readFileSync(join(RACINE, fichier), "utf8"))[0].toJS();
    const etapes = ci.jobs.checks.steps;
    const lit = etapes.findIndex((e) => /^(prouve|proven)$/.test(e.id ?? ""));
    const passe = etapes.findIndex((e) => e.run === "node .githooks/run-checks.mjs");
    assert.ok(lit >= 0 && lit < passe, `${fichier} : preuve lue avant la passe`);
    // Lue sur un push de la branche principale seulement, par l'empreinte de l'arbre, dans le run de PR vert, jamais un autre.
    assert.match(
      etapes[lit].if,
      /^github\.event_name == 'push' && github\.ref == format\('refs\/heads\/\{0\}', github\.event\.repository\.default_branch\)$/,
    );
    assert.ok(etapes[lit].run.includes("git rev-parse 'HEAD^{tree}'"));
    assert.ok(etapes[lit].run.includes("event=pull_request") && etapes[lit].run.includes('select(.conclusion == "success")'));
    assert.ok(etapes[lit].run.includes(`--name ${preuve}`));
    assert.match(etapes[lit].run, /= "\$(arbre|tree)" \]; then/);
    // Aucune preuve lue : tout est rejoué ; sauté, la passe, l'installation et gitleaks ne tournent pas.
    const saut = new RegExp(`steps\\.${etapes[lit].id}\\.outputs\\.(saute|skip) != 'true'`);
    assert.match(etapes[passe].if, saut);
    for (const e of etapes
      .slice(lit + 1, passe + 1)
      .filter((x) => /npm ci|gitleaks|run-checks|setup-node/.test(`${x.run ?? ""}${x.uses ?? ""}${x.name ?? ""}`)))
      assert.match(e.if ?? "", saut, `${fichier} : ${e.name ?? e.run ?? e.uses} doit être sauté`);
    // La preuve : arbre posé par une PR, en dernière étape du job, donc seulement si tout a réussi.
    const pose = etapes.findLastIndex((e) => /^actions\/upload-artifact@/.test(e.uses ?? ""));
    assert.equal(etapes[pose].with.name, preuve);
    assert.equal(etapes[pose].if, "github.event_name == 'pull_request'");
    assert.ok(etapes[pose - 1].run.includes("git rev-parse 'HEAD^{tree}'"));
    const apres = etapes.slice(pose + 1).filter((e) => !e.if?.includes("failure()"));
    assert.deepEqual(apres, [], "aucune étape de contrôle après la pose de la preuve");
    assert.ok(ci.jobs.checks.permissions === undefined || ci.jobs.checks.permissions.actions === "read", "lecture des artefacts autorisée");
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
  // Pas de cache GitLab des verdicts : une merge request pourrait l'écrire, ou ne pas le lire (caches protégés séparés) ; seule l'archive de gitleaks est cachée.
  assert.deepEqual(ci.checks.cache.paths, [".drwil/evidence/gitleaks.tar.gz"]);
});

test("gitleaks : les trois CI retentent le téléchargement (erreur HTTP comprise), cachent l'archive sous sa version épinglée et la vérifient à chaque passe", () => {
  const lire = (f) => readFileSync(join(RACINE, f), "utf8");
  const ci = {
    depot: lire(".github/workflows/ia-first.yml"),
    github: lire("packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml"),
    gitlab: lire("packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml"),
  };
  for (const [nom, texte] of Object.entries(ci)) {
    const curls = texte.split("\n").filter((l) => l.includes("curl") && l.includes("gitleaks"));
    assert.ok(curls.length >= 1, `${nom} : téléchargement de gitleaks introuvable`);
    // L'étape du dépôt est comparée mot pour mot à celle du banc (QUA-109) : ses tentatives passent par ~/.curlrc.
    if (nom === "depot") assert.match(texte, /printf .*'retry = 5' 'retry-all-errors'.*> ~\/\.curlrc/);
    else for (const l of curls) assert.match(l, /--retry 5 --retry-all-errors/, `${nom} : ${l.trim()}`);
    assert.match(texte, /gitleaks-8\.21\.2-/, `${nom} : cache de l'archive sous sa version épinglée`);
    assert.match(texte, /sha256sum -c -|shasum -a 256 -c -/, `${nom} : somme vérifiée`);
  }
});

test("QUA-252 : la protection de la branche principale n'exige plus qu'une PR soit à jour avec elle, et la CI vérifie que la forge tient le ruleset versionné", () => {
  const ruleset = JSON.parse(readFileSync(join(RACINE, ".github/ruleset-master.json"), "utf8"));
  const statuts = ruleset.rules.find((r) => r.type === "required_status_checks");
  assert.ok(statuts, "règle des contrôles requis absente");
  // Les contrôles restent exigés ; seule la mise à jour avec la branche principale est levée.
  assert.equal(statuts.parameters.strict_required_status_checks_policy, false);
  assert.ok(statuts.parameters.required_status_checks.some((c) => c.context === "checks"));
  assert.ok(
    ruleset.rules.some((r) => r.type === "pull_request"),
    "fusion par PR toujours exigée",
  );
  // Le job exigé compare la forge au fichier versionné, sans condition, avec le jeton de la CI.
  const ci = parseAllDocuments(readFileSync(join(RACINE, ".github/workflows/ia-first.yml"), "utf8"))[0].toJS();
  const etape = ci.jobs.checks.steps.find((e) => e.run === "node .github/scripts/verifier-ruleset.mjs");
  assert.ok(etape, "verifier-ruleset.mjs absent du job checks");
  assert.equal(etape.if, undefined);
  assert.match(etape.env?.GH_TOKEN ?? "", /^\$\{\{ github\.token \}\}$/);
});
