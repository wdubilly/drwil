// Fichiers de CI du dépôt et du gabarit parsés comme du YAML (QUA-046, fichiers de CI en YAML valide) :
// GitHub rejette en bloc un workflow invalide, sans lancer aucun job ; un contrôle placé dans ce
// workflow ne tournerait donc jamais. Seul un test local attrape l'erreur avant le push.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
    const passe = indice((e) => e.run === "node .githooks/run-checks.mjs --aggregate-shards .drwil/evidence/shards", "run-checks");
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
    // Gabarit : la décision vit dans le job plan, que lit `checks` (needs.plan.outputs.skip) ; dépôt : tout dans checks.
    const gabarit = Boolean(ci.jobs.plan?.outputs?.skip);
    const lecteur = gabarit ? ci.jobs.plan.steps : etapes;
    const lit = lecteur.findIndex((e) => /^(prouve|proven)$/.test(e.id ?? ""));
    const passe = etapes.findIndex((e) => e.run?.startsWith("node .githooks/run-checks.mjs"));
    assert.ok(lit >= 0 && passe >= 0 && (gabarit || lit < passe), `${fichier} : preuve lue avant la passe`);
    // Lue sur un push de la branche principale seulement, par l'empreinte de l'arbre, dans le run de PR vert, jamais un autre.
    assert.match(
      lecteur[lit].if,
      /^github\.event_name == 'push' && github\.ref == format\('refs\/heads\/\{0\}', github\.event\.repository\.default_branch\)$/,
    );
    assert.ok(lecteur[lit].run.includes("git rev-parse 'HEAD^{tree}'"));
    assert.ok(lecteur[lit].run.includes("event=pull_request") && lecteur[lit].run.includes('select(.conclusion == "success")'));
    assert.ok(lecteur[lit].run.includes(`--name ${preuve}`));
    assert.match(lecteur[lit].run, /= "\$(arbre|tree)" \]; then/);
    // Aucune preuve lue : tout est rejoué ; sautée, la passe, l'installation et gitleaks ne tournent pas.
    const saut = gabarit ? /needs\.plan\.outputs\.skip != 'true'/ : new RegExp(`steps\\.${lecteur[lit].id}\\.outputs\\.saute != 'true'`);
    assert.match(etapes[passe].if, saut);
    for (const e of etapes
      .slice(gabarit ? 0 : lit + 1, passe + 1)
      .filter(
        (x) =>
          /npm ci|gitleaks|run-checks|setup-node/.test(`${x.run ?? ""}${x.uses ?? ""}${x.name ?? ""}`) && !/^Refuse/.test(x.name ?? ""),
      ))
      assert.match(e.if ?? "", saut, `${fichier} : ${e.name ?? e.run ?? e.uses} doit être sauté`);
    if (gabarit) {
      // Le plan lui-même, la tranche et l'agrégation ne tournent pas non plus : rien n'est joué pour rien.
      assert.match(ci.jobs.plan.outputs.skip, /steps\.pr\.outputs\.skip == 'true' \|\| steps\.proven\.outputs\.skip == 'true'/);
      assert.match(ci.jobs.plan.steps.find((e) => e.id === "plan").if, /steps\.proven\.outputs\.skip != 'true'/);
      assert.match(ci.jobs.shards.if, /needs\.plan\.outputs\.skip != 'true'/);
    }
    // La preuve : arbre posé par une PR, en dernière étape du job, donc seulement si tout a réussi.
    const pose = etapes.findLastIndex((e) => /^actions\/upload-artifact@/.test(e.uses ?? ""));
    assert.equal(etapes[pose].with.name, preuve);
    assert.equal(etapes[pose].if, "github.event_name == 'pull_request'");
    assert.ok(etapes[pose - 1].run.includes("git rev-parse 'HEAD^{tree}'"));
    const apres = etapes.slice(pose + 1).filter((e) => !e.if?.includes("failure()"));
    assert.deepEqual(apres, [], "aucune étape de contrôle après la pose de la preuve");
    assert.ok(ci.jobs.checks.permissions === undefined || ci.jobs.checks.permissions.actions === "read", "lecture des artefacts autorisée");
  });

// Lot 1 : la CI du dépôt ; le gabarit livré suit au lot 3 de la même fiche.
for (const [fichier, preuve] of [[".github/workflows/ia-first.yml", "arbre-prouve"]])
  test(`QUA-296 : ${fichier} sauvegarde le cache de verdicts d'un push sauté, avec les verdicts de la PR joints à la preuve, après la comparaison des arbres`, () => {
    const ci = parseAllDocuments(readFileSync(join(RACINE, fichier), "utf8"))[0].toJS();
    const etapes = ci.jobs.checks.steps;
    const passe = etapes.findIndex((e) => e.run === "node .githooks/run-checks.mjs --aggregate-shards .drwil/evidence/shards");
    const rejeu = etapes.findIndex((e) => e.run?.includes("base-checks.mjs") && e.run.includes("--aggregate-shards"));
    const pose = etapes.findLastIndex((e) => /^actions\/upload-artifact@/.test(e.uses ?? ""));
    const dossier = etapes[pose].with.path;
    assert.equal(etapes[pose].with.name, preuve);
    // PR : les verdicts de sa passe sont mis de côté avant le rejeu avec les hooks de la branche principale (qui réécrit le
    // fichier), dans le dossier de la preuve, posé en dernier : seulement si tout le job a réussi.
    const garde = etapes.findIndex((e) => e.run?.includes(`cp ${VERDICTS} `));
    assert.ok(passe >= 0 && passe < garde && garde < rejeu && rejeu < pose, `${fichier} : verdicts gardés entre la passe et le rejeu`);
    assert.match(
      etapes[garde].if,
      /^github\.event_name == 'pull_request' && hashFiles\('\.drwil\/evidence\/run-checks-verdicts\.json'\) != ''$/,
    );
    assert.ok(
      etapes[garde].run.endsWith(`"$RUNNER_TEMP/${preuve}/"`) && dossier === `\${{ runner.temp }}/${preuve}`,
      "verdicts dans la preuve",
    );
    assert.ok(etapes[pose - 1].run.includes(`"$RUNNER_TEMP/${preuve}/${preuve}.txt"`), "arbre dans le même dossier");
    // Push : les verdicts de la preuve ne sont posés qu'une fois l'arbre comparé, et seulement s'ils sont lisibles.
    const lit = etapes.findIndex((e) => e.id === "prouve");
    const run = etapes[lit].run;
    const compare = run.search(/= "\$arbre" \]; then/);
    const copie = run.indexOf(`cp "$RUNNER_TEMP/preuve/run-checks-verdicts.json" ${VERDICTS}`);
    const lisible = run.indexOf('jq -e \'.checks | type == "object"\' "$RUNNER_TEMP/preuve/run-checks-verdicts.json"');
    assert.ok(compare >= 0 && compare < lisible && lisible < copie, `${fichier} : arbres comparés, puis verdicts lus, puis copiés`);
    assert.match(run, /::warning::Aucun verdict lisible/, "une sauvegarde impossible est dite");
    // La sauvegarde n'est pas sautée avec les contrôles : elle suit la seule présence du fichier, clé = sha du push.
    const sauve = etapes.findIndex((e) => /^actions\/cache\/save@/.test(e.uses ?? ""));
    assert.ok(lit < sauve && !etapes[sauve].if.includes("saute"));
    assert.match(etapes[sauve].if, /hashFiles\('\.drwil\/evidence\/run-checks-verdicts\.json'\) != ''$/);
    assert.match(etapes[sauve].with.key, /^run-checks-verdicts-\$\{\{ github\.sha \}\}$/);
    // La preuve n'est lue que par le push de la branche principale : une PR ne relit jamais ces verdicts (QUA-250).
    const lecteurs = Object.values(ci.jobs).flatMap((j) => (j.steps ?? []).filter((e) => (e.run ?? "").includes(`--name ${preuve}`)));
    assert.deepEqual(
      lecteurs.map((e) => e.id),
      ["prouve"],
    );
    assert.match(etapes[lit].if, /^github\.event_name == 'push'/);
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
  assert.match(
    bloc,
    /DRWIL_CI_REUSE=1 node \.githooks\/run-checks\.mjs --aggregate-shards \.drwil\/evidence\/shards\n\s*else\n\s*node \.githooks\/run-checks\.mjs --aggregate-shards \.drwil\/evidence\/shards\n\s*fi/,
  );
  assert.equal(script.filter((l) => l.includes("DRWIL_CI_REUSE")).length, 1);
  assert.ok(
    !JSON.stringify(ci.checks.variables ?? {}).includes("DRWIL_CI_REUSE") && !JSON.stringify(ci.variables ?? {}).includes("DRWIL_CI_REUSE"),
  );
  // Sauvegarde : l'artefact du fichier de verdicts, même en échec, effacé avant l'envoi hors de la branche principale.
  assert.equal(ci.checks.artifacts.when, "always");
  assert.deepEqual(ci.checks.artifacts.paths, [VERDICTS, ".drwil/evidence/pr-verdicts"]);
  const apres = ci.checks.after_script.join("\n");
  assert.match(
    apres,
    /if \[ -n "\$CI_COMMIT_TAG" \] \|\| \[ "\$CI_COMMIT_BRANCH" != "\$CI_DEFAULT_BRANCH" \]; then\n\s*rm -f \.drwil\/evidence\/run-checks-verdicts\.json/,
  );
  // Pas de cache GitLab des verdicts : une merge request pourrait l'écrire, ou ne pas le lire (caches protégés séparés) ; seule l'archive de gitleaks est cachée.
  assert.deepEqual(ci.checks.cache.paths, [".drwil/evidence/gitleaks.tar.gz"]);
});

test("QUA-269 : les trois CI retentent le téléchargement de gitleaks (erreur HTTP comprise), cachent l'archive sous sa version épinglée et la vérifient à chaque passe", () => {
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

for (const fichier of [".github/workflows/ia-first.yml", "packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml"])
  test(`QUA-251, QUA-013 : ${fichier} découpe les contrôles lents en tranches, et le job exigé « checks » les agrège sans jamais réussir par défaut`, () => {
    const ci = parseAllDocuments(readFileSync(join(RACINE, fichier), "utf8"))[0].toJS();
    const { plan, shards, checks } = ci.jobs;
    // Le plan lit la configuration : la matrice des tranches ne vient jamais du YAML.
    assert.ok(
      plan.steps.some((e) => e.run?.includes("run-checks.mjs --shard-plan")),
      "plan : tranches lues de la configuration",
    );
    // Un job de tranche par indice, sans interrompre les autres, et seulement s'il y a des tranches.
    assert.match(shards.strategy.matrix, /^\$\{\{ fromJSON\(needs\.plan\.outputs\.matrix\) \}\}$/);
    assert.equal(shards.strategy["fail-fast"], false);
    assert.match(shards.if, /needs\.plan\.outputs\.count != '0'/);
    const jouee = shards.steps.find((e) => e.run?.includes("--shard"));
    assert.match(
      jouee.run,
      /base-checks\.mjs" --base "\$base" --shard "\$SLICE"/,
      "pull request : tranche jouée avec les hooks de la base (QUA-113)",
    );
    assert.match(jouee.run, /else\n\s+node \.githooks\/run-checks\.mjs --shard "\$SLICE"/);
    const depot = shards.steps.find((e) => /^actions\/upload-artifact@/.test(e.uses ?? ""));
    assert.equal(depot.if, "always()", "une tranche en échec dépose aussi son verdict");
    assert.match(depot.with.name, /^shard-\$\{\{ matrix\.index \}\}-of-\$\{\{ matrix\.total \}\}$/);
    assert.equal(depot.with.path, ".drwil/evidence/shards");
    // Le job exigé garde son nom (aucun `name:`), dépend du plan et des tranches, et tourne même si elles échouent.
    assert.equal(checks.name, undefined);
    assert.deepEqual(
      checks.needs.filter((n) => n === "plan" || n === "shards"),
      ["plan", "shards"],
    );
    assert.match(checks.if, /^always\(\)/);
    const telecharge = checks.steps.findIndex((e) => /^actions\/download-artifact@/.test(e.uses ?? ""));
    const passe = checks.steps.findIndex((e) => e.run === "node .githooks/run-checks.mjs --aggregate-shards .drwil/evidence/shards");
    assert.ok(telecharge >= 0 && telecharge < passe, "verdicts des tranches téléchargés avant l'agrégation");
    assert.equal(checks.steps[telecharge].with.pattern, "shard-*");
    assert.equal(checks.steps[telecharge].with.path, ".drwil/evidence/shards");
    // Le rejeu avec les hooks de la base agrège aussi (N comparé à celui de la base, D6 iv).
    const rejeu = checks.steps.find((e) => e.run?.includes("base-checks.mjs"));
    assert.ok(rejeu.run.match(/--aggregate-shards \.drwil\/evidence\/shards/g).length >= 1);
    // L'alerte suit `checks`, donc le plan, les tranches et l'agrégation (QUA-251).
    assert.ok([ci.jobs["alert-if-ci-broken"].needs].flat().includes("checks"));
    // Aucune combinaison de résultats ne donne un succès par défaut : le premier pas du job le prouve, joué par bash.
    const garde = checks.steps.find((e) => /^(Refuse|Refuser)/.test(e.name ?? ""));
    assert.equal(garde, checks.steps[0], "la garde est la première étape");
    if (process.platform === "win32") return;
    const juger = (env) =>
      spawnSync("bash", ["-ec", garde.run], { encoding: "utf8", env: { PATH: process.env.PATH, SKIP: "false", ...env } }).status;
    assert.equal(juger({ PLAN: "success", SHARDS: "skipped", COUNT: "0" }), 0, "aucun contrôle découpé : rien à refuser");
    assert.equal(juger({ PLAN: "success", SHARDS: "success", COUNT: "4" }), 0);
    for (const shards of ["failure", "skipped", "cancelled"])
      assert.equal(juger({ PLAN: "success", SHARDS: shards, COUNT: "4" }), 1, `tranches « ${shards} » refusées`);
    for (const plan of ["failure", "skipped", "cancelled"])
      assert.equal(juger({ PLAN: plan, SHARDS: "skipped", COUNT: "" }), 1, `plan « ${plan} » refusé`);
  });

// D3 et D4 (reprise d'une PR à l'autre) : la décision et l'identité vivent dans run-checks (run-checks-pr.mjs) ; la CI ne fait que l'appeler et acheminer l'artefact.
for (const fichier of [".github/workflows/ia-first.yml", "packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml"])
  test(`QUA-291 : ${fichier} lit le run précédent de la PR dans le plan, le même dans checks, et ne garde les verdicts que par artefact (jamais par cache)`, () => {
    const texte = readFileSync(join(RACINE, fichier), "utf8");
    const ci = parseAllDocuments(texte)[0].toJS();
    assert.doesNotMatch(texte, /pull_request_target|DRWIL_PR_/);
    const plan = ci.jobs.plan.steps.find((e) => e.id === "plan");
    assert.match(plan.run, /^node \.githooks\/run-checks\.mjs --pr-previous >> "\$GITHUB_OUTPUT"\n/);
    assert.ok(plan.run.indexOf("--pr-previous") < plan.run.indexOf("--shard-plan"), "le run précédent est lu avant le plan");
    assert.equal(plan.env.GH_TOKEN, `$${"{{ github.token }}"}`);
    assert.match(ci.jobs.plan.outputs.previous ?? ci.jobs.plan.outputs.precedent, /^\$\{\{ steps\.plan\.outputs\.previous \}\}$/);
    // Le job checks télécharge exactement le run que le plan a lu, avant la passe, le rejeu et le dépôt de l'artefact.
    const etapes = ci.jobs.checks.steps;
    const lecture = etapes.findIndex((e) => /--pr-previous "\$(PREVIOUS|PRECEDENT)"$/.test(e.run ?? ""));
    const passe = etapes.findIndex((e) => e.run === "node .githooks/run-checks.mjs --aggregate-shards .drwil/evidence/shards");
    const rejeu = etapes.findIndex((e) => e.run?.includes("base-checks.mjs") && e.run.includes("--aggregate-shards"));
    const depose = etapes.findIndex((e) => e.with?.name === "pr-verdicts");
    const preuve = etapes.findIndex((e) => e.with?.name === "proven-tree" || e.with?.name === "arbre-prouve");
    assert.ok(lecture >= 0 && lecture < passe && passe < rejeu && rejeu < depose && depose < preuve);
    assert.match(Object.values(etapes[lecture].env).join(" "), /needs\.plan\.outputs\.(previous|precedent)/);
    assert.match(etapes[lecture].if, /needs\.plan\.outputs\.(previous|precedent) != ''/);
    // Dépôt : sur une PR seulement, même après un échec, et seulement si la passe a écrit quelque chose.
    assert.equal(
      etapes[depose].if,
      "github.event_name == 'pull_request' && always() && hashFiles('.drwil/evidence/pr-verdicts/pr-verdicts.json') != ''",
    );
    assert.equal(etapes[depose].with.path, ".drwil/evidence/pr-verdicts");
    const caches = Object.values(ci.jobs).flatMap((j) => (j.steps ?? []).filter((e) => /^actions\/cache/.test(e.uses ?? "")));
    assert.equal(JSON.stringify(caches).includes("pr-verdicts"), false);
  });

test("QUA-291 : la CI GitLab livrée reprend d'un push à l'autre d'une branche par l'artefact du dernier pipeline réussi, dans le plan et dans checks, jamais sur la branche principale ni par cache", () => {
  const ci = parseAllDocuments(readFileSync(join(RACINE, "packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml"), "utf8"))[0].toJS();
  assert.ok(JSON.stringify(ci).includes("DRWIL_PR_") === false, "l'identité n'est pas dite par le YAML");
  for (const [nom, job] of [
    ["plan", ci.plan],
    ["checks", ci.checks],
  ]) {
    assert.ok(job.script.includes("node .githooks/run-checks.mjs --pr-previous"), `${nom} : reprise absente`);
    assert.equal(job.variables.GIT_DEPTH, "0", `${nom} : historique complet (la base, les hooks)`);
  }
  assert.ok(
    ci.plan.script.indexOf("node .githooks/run-checks.mjs --pr-previous") < ci.plan.script.findIndex((l) => l.includes("--shard-plan")),
  );
  const lit = ci.checks.script.indexOf("node .githooks/run-checks.mjs --pr-previous");
  assert.ok(lit < ci.checks.script.findIndex((l) => l.includes("DRWIL_CI_REUSE")));
  assert.ok(lit < ci.checks.script.findIndex((l) => l.includes("base-checks.mjs --base")));
  assert.match(ci.checks.after_script.join("\n"), /else\n\s*rm -rf \.drwil\/evidence\/pr-verdicts\n\s*fi/);
  assert.deepEqual(ci.checks.cache.paths, [".drwil/evidence/gitleaks.tar.gz"]);
});
