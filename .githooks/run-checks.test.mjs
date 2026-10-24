import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = fileURLToPath(new URL("./run-checks.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-run-checks-"));
  dossiers.push(dir);
  return dir;
};
function git(racine, ...args) {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
}

/**
 * Lance run-checks sur un projet temporaire (dépôt git sur une branche de travail si `depot`).
 * check-docs y est un bouchon : ce test éprouve l'adaptateur, pas les contrôles (engine.test.mjs).
 * HOME temporaire : un gitleaks de ~/.local/bin ne s'invite pas ; DRWIL_HOOK et CI fixés par le test.
 */
function lancer(fichiers, { depot = true, docsOk = true, env = {}, indexer = [] } = {}) {
  const racine = tmp();
  const tout = {
    ".githooks/check-docs.mjs": `process.exit(${docsOk ? 0 : 1});\n`,
    ".githooks/check-contract-tests.mjs": "process.exit(0);\n",
    ".githooks/check-architecture.mjs": "process.exit(0);\n",
    ...fichiers,
  };
  for (const [chemin, contenu] of Object.entries(tout)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  if (depot) {
    git(racine, "init", "-q", "-b", "travail");
    if (indexer.length) git(racine, "add", ...indexer);
  }
  const base = { ...process.env, HOME: tmp(), USERPROFILE: tmp(), CI: "", DRWIL_HOOK: "" };
  // DRWIL_ROOT : sans elle, run-checks jugerait le dépôt drwil (parent de son .githooks/).
  // Dossier courant ailleurs : seule la racine compte, comme pour un hook lancé depuis une couche.
  return spawnSync(process.execPath, [SCRIPT], { cwd: tmp(), encoding: "utf8", env: { ...base, DRWIL_ROOT: racine, ...env } });
}

test("racine du projet, pas le dossier courant : contrôles annoncés, non exécutés signalés, bilan OK", () => {
  const r = lancer(
    { ".drwil/ia-first.json": JSON.stringify({ checks: [{ name: "projet", run: "node -e 0" }] }) },
    { env: { DRWIL_HOOK: "pre-commit" } },
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^\[ia-first\] chemins et contrats cités dans la doc…$/m);
  assert.match(r.stdout, /^\[ia-first\] projet…$/m);
  assert.match(r.stdout, /^\[ia-first\] ⚠ non exécuté : couverture CI de chaque contrôle \(QUA-013\) \(aucune CI configurée/m);
  assert.match(r.stdout, /^\[ia-first\] contrôles exécutés : OK \(\d+ non exécuté\(s\), voir ci-dessus\)\n$/m);
});

test("en anglais : échecs listés (message du contrôle ou son nom), aucun contrôle du projet déclaré", () => {
  const r = lancer(
    { ".drwil/ia-first.json": JSON.stringify({ lang: "en", scopeGate: "blocking", checks: [] }), "src/a.js": "" },
    { docsOk: false, env: { DRWIL_HOOK: "pre-commit" }, indexer: ["src/a.js"] },
  );
  assert.equal(r.status, 1);
  assert.match(
    r.stdout,
    /^\[ia-first\] ⚠ not run: project checks \(lint, tests…\) \(none declared in \.drwil\/ia-first\.json → checks\)$/m,
  );
  assert.match(r.stdout, /^\[ia-first\] ✗ failed: paths and contracts cited in docs$/m);
  assert.match(r.stdout, /^\[ia-first\] ✗ failed: brief scope: 1 problem\(s\) \(blocking gate\)$/m);
  assert.doesNotMatch(r.stdout, /checks run: OK/);
});

test("sans configuration, hors dépôt git, au commit : rien d'indexé, contrôles du projet absents", () => {
  const r = lancer({}, { depot: false, env: { DRWIL_HOOK: "pre-commit" } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /⚠ non exécuté : contrôles du projet \(lint, tests…\) \(aucun déclaré/);
});

test("audits : périmé signalé (français), récent, sans date ou sans ligne de scan ignorés", () => {
  let r = lancer({
    "docs/audit-risques.md": "# Audit\n\n> Dernier scan : 2020-01-01\n",
    "docs/decouverte-valeur.md": "# Valeur\n\n> Dernier scan : 2999-01-01\n",
  });
  assert.match(r.stdout, /⚠ non exécuté : audit périmé \(docs\/audit-risques\.md, vieux de \d+ jours\) : à relancer/);
  assert.doesNotMatch(r.stdout, /decouverte-valeur/);
  r = lancer({
    ".drwil/ia-first.json": JSON.stringify({ lang: "en" }),
    "docs/audit-risks.md": "# Risks\n\nno scan line\n",
    "docs/value-discovery.md": "# Value\n\n> Last scan: never\n",
  });
  assert.doesNotMatch(r.stdout, /stale audit/);
  r = lancer(
    { ".drwil/ia-first.json": JSON.stringify({ lang: "en" }), "docs/value-discovery.md": "> Last scan: 2020-01-01\n" },
    { env: { DRWIL_HOOK: "pre-commit" } },
  );
  assert.match(r.stdout, /⚠ not run: stale audit \(docs\/value-discovery\.md, \d+ days old\): time to re-run/);
  assert.match(r.stdout, /checks run: OK/);
});

test("QUA-036 : rappels d'intentions : périmée signalée sans bloquer, en anglais aussi", () => {
  let r = lancer({
    "docs/intentions/vieille.md": "# I\n\n**Statut** : proposée le 2020-01-01.\n",
    "docs/intentions/neuve.md": "# I\n\n**Statut** : proposée le 2999-01-01.\n",
  });
  assert.match(r.stdout, /\[ia-first\] ⚠ intention sans revue depuis \d+ jours \(docs\/intentions\/vieille\.md\) : la revoir/);
  assert.doesNotMatch(r.stdout, /neuve\.md|non exécuté : intention/);
  r = lancer({ ".drwil/ia-first.json": JSON.stringify({ lang: "en" }), "docs/intentions/old.md": "**Status**: proposed on 2020-01-01.\n" });
  assert.match(r.stdout, /⚠ intent not reviewed for \d+ days \(docs\/intentions\/old\.md\): review it/);
});

test("QUA-036 : au commit, une fiche supprimée sans que son intention soit touchée est signalée, en anglais aussi", () => {
  for (const [lang, motif] of [
    ["fr", /⚠ la fiche docs\/projects\/a\.md est supprimée sans que son intention docs\/intentions\/i\.md soit touchée/],
    ["en", /⚠ brief docs\/projects\/a\.md is deleted without touching its intent docs\/intentions\/i\.md/],
  ]) {
    const racine = tmp();
    const ecrire = (chemin, contenu) => {
      mkdirSync(dirname(join(racine, chemin)), { recursive: true });
      writeFileSync(join(racine, chemin), contenu);
    };
    ecrire(".githooks/check-docs.mjs", "process.exit(0);\n");
    ecrire(".githooks/check-contract-tests.mjs", "process.exit(0);\n");
    ecrire(".drwil/ia-first.json", JSON.stringify({ lang }));
    ecrire("docs/intentions/i.md", "# I\n\n**Statut** : proposée le 2999-01-01.\n");
    ecrire("docs/projects/a.md", "# A\n\n**Intention** : `docs/intentions/i.md`\n");
    const g = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: racine, encoding: "utf8" });
    g("init", "-q", "-b", "travail");
    g("add", "-A");
    g("commit", "-qm", "base");
    g("rm", "-q", "docs/projects/a.md");
    const env = { ...process.env, HOME: tmp(), USERPROFILE: tmp(), CI: "", DRWIL_HOOK: "pre-commit", DRWIL_ROOT: racine };
    const r = spawnSync(process.execPath, [SCRIPT], { cwd: tmp(), encoding: "utf8", env });
    assert.match(r.stdout, motif, lang);
  }
});

test("QUA-039 : un ID cité dans un message est suivi de son titre, lu dans le registre", () => {
  const r = lancer(
    {
      "docs/contracts.md": "## QUA-004 — Seuil de couverture de test\n**Règle** : r.\n",
      ".drwil/ia-first.json": JSON.stringify({ checks: [{ name: "couverture (QUA-004)", run: "node -e 0", paths: ["src/**"] }] }),
    },
    { env: { DRWIL_HOOK: "pre-commit" }, indexer: ["docs/contracts.md"] },
  );
  assert.match(r.stdout, /non exécuté : couverture \(QUA-004 — Seuil de couverture de test\)/);
});

test("QUA-013 : hors commit (push, CI), un contrôle non exécuté fait échouer ; au commit, simple avertissement", () => {
  const sansCi = { ".drwil/ia-first.json": JSON.stringify({ checks: [{ name: "projet", run: "node -e 0" }] }) };
  let r = lancer(sansCi, { env: { CI: "true" } });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^\[ia-first\] ✗ échec : non exécuté : couverture CI de chaque contrôle \(QUA-013\) \(aucune CI configurée/m);
  assert.doesNotMatch(r.stdout, /contrôles exécutés : OK/);
  r = lancer(sansCi, { env: { DRWIL_HOOK: "pre-commit" } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /⚠ non exécuté : couverture CI/);
});

test("QUA-013 : hors CI, un projet non configuré (pas de CI) reste un avertissement visible", () => {
  const r = lancer({ ".drwil/ia-first.json": JSON.stringify({ checks: [{ name: "projet", run: "node -e 0" }] }) });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /⚠ non exécuté : couverture CI/);
});

test("QUA-013 : hors commit, aucun contrôle du projet déclaré fait échouer, en anglais aussi ; l'audit périmé reste un avertissement", () => {
  let r = lancer({ ".drwil/ia-first.json": JSON.stringify({ lang: "en", checks: [] }) }, { env: { CI: "true" } });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^\[ia-first\] ✗ failed: not run: project checks \(lint, tests…\) \(none declared/m);
  r = lancer({ ".drwil/ia-first.json": JSON.stringify({ lang: "en" }), "docs/value-discovery.md": "> Last scan: 2020-01-01\n" });
  assert.match(r.stdout, /⚠ not run: stale audit/);
  assert.doesNotMatch(r.stdout, /✗ failed: not run: stale audit/);
});

// Rejoue l'incident du 2026-10-18 : un pre-push lancé depuis un worktree reçoit GIT_DIR (le dossier
// du worktree dans .git/worktrees/) ; un test qui fait `git init` ailleurs sans le retirer
// réinitialisait ce dossier et écrivait core.bare=true dans la configuration commune.
test("QUA-056 : un push depuis un worktree laisse le dépôt principal identique (configuration, branches, index, arbre)", () => {
  const principal = tmp();
  const distant = tmp();
  const worktree = join(tmp(), "wt");
  const marque = join(tmp(), "lance");
  const ailleurs = tmp();
  git(principal, "init", "-q", "-b", "main");
  git(principal, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "a");
  git(distant, "init", "-q", "--bare");
  git(principal, "config", "core.hooksPath", dirname(SCRIPT));
  git(principal, "worktree", "add", "-q", worktree, "-b", "travail");
  // Un contrôle « hostile », comme un fichier de test qui ne retire pas les GIT_* hérités.
  const hostile = [
    'import { spawnSync } from "node:child_process";',
    'import { writeFileSync } from "node:fs";',
    'import { join } from "node:path";',
    "const d = process.argv[3];",
    'spawnSync("git", ["init", "-q", "-b", "workstream/kit-installation", d]);',
    'writeFileSync(join(d, "f.txt"), "x");',
    'spawnSync("git", ["add", "f.txt"], { cwd: d });',
    'writeFileSync(process.argv[2], "oui");',
  ].join("\n");
  for (const [chemin, contenu] of Object.entries({
    ".githooks/check-docs.mjs": "process.exit(0);\n",
    ".githooks/check-contract-tests.mjs": "process.exit(0);\n",
    ".githooks/check-architecture.mjs": "process.exit(0);\n",
    "hostile.mjs": hostile,
    ".drwil/ia-first.json": JSON.stringify({
      mode: "minimal",
      checks: [{ name: "hostile", run: `node hostile.mjs "${marque}" "${ailleurs}"` }],
    }),
  })) {
    mkdirSync(dirname(join(worktree, chemin)), { recursive: true });
    writeFileSync(join(worktree, chemin), contenu);
  }
  const photo = () =>
    [
      readFileSync(join(principal, ".git", "config"), "utf8"),
      ...[
        ["branch", "-a"],
        ["status", "--porcelain"],
        ["worktree", "list", "--porcelain"],
      ].map((args) => spawnSync("git", args, { cwd: principal, encoding: "utf8" }).stdout),
      spawnSync("git", ["status", "--porcelain"], { cwd: worktree, encoding: "utf8" }).stdout,
    ].join("\n--\n");
  const avant = photo();
  const r = spawnSync("git", ["push", "-q", distant, "travail"], {
    cwd: worktree,
    encoding: "utf8",
    env: { ...process.env, DRWIL_ROOT: worktree, HOME: tmp(), USERPROFILE: tmp(), CI: "", DRWIL_HOOK: "" },
  });
  assert.equal(existsSync(marque), true, `le pre-push n'a pas lancé le contrôle : ${r.stdout}${r.stderr}`);
  assert.equal(photo(), avant);
});

test("QUA-119 : avec `parallel`, rapport dans l'ordre de la liste, sorties groupées par contrôle, verdict d'une exécution en série", () => {
  const lent = "node -e \"setTimeout(()=>console.log('sortie lente'),400)\"";
  const r = lancer(
    {
      ".drwil/ia-first.json": JSON.stringify({
        parallel: true,
        build: "node -e \"console.log('compilé')\"",
        checks: [
          { id: "lent", name: "Lent", run: lent, needsBuild: true },
          { id: "casse", name: "Cassé (QUA-999)", run: "node -e \"console.log('trace');process.exit(1)\"" },
          { id: "reporte", name: "Reporté", run: "node -e 0", paths: ["src/**"] },
        ],
      }),
    },
    { env: { DRWIL_HOOK: "pre-commit" } },
  );
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const lignes = r.stdout.split("\n");
  const rang = (re) => lignes.findIndex((l) => re.test(l));
  assert.ok(rang(/^\[ia-first\] Lent…$/) < rang(/^sortie lente$/));
  assert.ok(rang(/^sortie lente$/) < rang(/^\[ia-first\] Cassé \(QUA-999\)…$/));
  assert.ok(rang(/^trace$/) > rang(/^\[ia-first\] Cassé/));
  assert.match(r.stdout, /^\[ia-first\] ⚠ non exécuté : Reporté \(/m);
  assert.match(r.stdout, /^\[ia-first\] ✗ échec : Cassé \(QUA-999\)/m);
  assert.doesNotMatch(r.stdout, /✗ échec : Lent/);
});

test("QUA-121 : le workflow saute le push d'une branche à PR ouverte, jamais master, et garde noms exigés et alerte", () => {
  const wf = readFileSync(join(dirname(SCRIPT), "..", ".github", "workflows", "ia-first.yml"), "utf8");
  const job = (nom) => wf.split(/^ {2}(?=[\w-]+:$)/m).find((b) => b.startsWith(`${nom}:`)) ?? "";
  assert.match(wf, /^on: \[push, pull_request\]$/m);
  const calcul = job("matrice-os");
  assert.match(calcul, /gh pr list .*--head "\$BRANCHE" --state open/);
  assert.match(calcul, /\|\| ouvertes=0/, "GitHub muet : le push teste");
  assert.match(calcul, /\[ "\$REF" != "refs\/heads\/\$PRINCIPALE" \]/, "master jamais sauté");
  assert.match(calcul, /"tester":false/, "push sauté : kit-tests ne teste pas");
  assert.match(job("checks"), /needs: matrice-os\n\s+if: needs\.matrice-os\.outputs\.saute != 'true'/);
  assert.match(job("kit-tests"), /needs: matrice-os/);
  assert.match(job("kit-tests"), /name: kit-tests \(\$\{\{ matrix\.os \}\}\)/);
  assert.match(job("alert-if-ci-broken"), /needs: \[checks, kit-tests\]/);
  assert.match(job("alert-if-ci-broken"), /github\.event_name == 'push'/);
});
