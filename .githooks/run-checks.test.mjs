import { after, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = fileURLToPath(new URL("./run-checks.mjs", import.meta.url));
// Les dossiers gardés par un contrôle en échec (QUA-133) vont dans un temporaire propre à ce fichier, supprimé à la fin.
const racineTemp = mkdtempSync(join(tmpdir(), "drwil-run-checks-racine-"));
process.env.TMPDIR = racineTemp;
after(() => rmSync(racineTemp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
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
function lancer(fichiers, { depot = true, docsOk = true, env = {}, indexer = [], valider = false } = {}) {
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
    if (valider) {
      git(racine, "add", "-A");
      git(racine, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "x");
    }
  }
  const r = passe(racine, { env });
  return { ...r, racine, detail: detail(racine) };
}
/** Une passe de run-checks sur une racine déjà préparée (`args` : ses options). */
function passe(racine, { env = {}, args = [] } = {}) {
  const base = {
    ...process.env,
    HOME: tmp(),
    USERPROFILE: tmp(),
    CI: "",
    DRWIL_HOOK: "",
    DRWIL_PUSH_REFS: "",
    DRWIL_PUSH_TAGS_ONLY: "",
    DRWIL_PUSH_NO_BRANCH: "",
    TMPDIR: tmp(),
  };
  // DRWIL_ROOT : sans elle, run-checks jugerait le dépôt drwil (parent de son .githooks/).
  // Dossier courant ailleurs : seule la racine compte, comme pour un hook lancé depuis une couche.
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: tmp(), encoding: "utf8", env: { ...base, DRWIL_ROOT: racine, ...env } });
  return { ...r, detail: detail(racine) };
}
/** Le rapport complet que run-checks écrit à côté de sa sortie courte (QUA-126) ; vide s'il manque. */
const DETAIL = ".drwil/evidence/run-checks.log";
const detail = (racine) => (existsSync(join(racine, DETAIL)) ? readFileSync(join(racine, DETAIL), "utf8") : "");

test("racine du projet, pas le dossier courant : contrôles annoncés, non exécutés signalés, bilan OK", () => {
  const r = lancer(
    { ".drwil/ia-first.json": JSON.stringify({ checks: [{ name: "projet", run: "node -e 0" }] }) },
    { env: { DRWIL_HOOK: "pre-commit" } },
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.detail, /^\[ia-first\] chemins et contrats cités dans la doc…$/m);
  assert.match(r.detail, /^\[ia-first\] projet…$/m);
  assert.match(r.detail, /^\[ia-first\] ⚠ non exécuté : couverture CI de chaque contrôle \(QUA-013\) \(aucune CI configurée/m);
  assert.match(
    r.stdout,
    /^\[ia-first\] contrôles exécutés : OK \(1 avertissement\(s\), non exécutés compris — détail : \.drwil\/evidence\/run-checks\.log\) — les plus lents : [^\n]+\n$/,
    "réussite : la seule ligne de résumé",
  );
  assert.match(r.detail, /contrôles exécutés : OK \(1 avertissement/, "le rapport complet finit par le même résumé");
});

test("en anglais : échecs listés (message du contrôle ou son nom), aucun contrôle du projet déclaré", () => {
  const r = lancer(
    { ".drwil/ia-first.json": JSON.stringify({ lang: "en", scopeGate: "blocking", checks: [] }), "src/a.js": "" },
    { docsOk: false, env: { DRWIL_HOOK: "pre-commit" }, indexer: ["src/a.js"] },
  );
  assert.equal(r.status, 1);
  assert.match(
    r.detail,
    /^\[ia-first\] ⚠ not run: project checks \(lint, tests…\) \(none declared in \.drwil\/ia-first\.json → checks\)$/m,
  );
  assert.match(r.stdout, /^\[ia-first\] ✗ failed: paths and contracts cited in docs$/m);
  assert.match(r.stdout, /^\[ia-first\] ✗ failed: brief scope: 1 problem\(s\) \(blocking gate\)$/m);
  assert.doesNotMatch(r.stdout, /checks run: OK/);
});

test("sans configuration, hors dépôt git, au commit : rien d'indexé, contrôles du projet absents", () => {
  const r = lancer({}, { depot: false, env: { DRWIL_HOOK: "pre-commit" } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.detail, /⚠ non exécuté : contrôles du projet \(lint, tests…\) \(aucun déclaré/);
});

test("audits : périmé signalé (français), récent, sans date ou sans ligne de scan ignorés", () => {
  let r = lancer({
    "docs/audit-risques.md": "# Audit\n\n> Dernier scan : 2020-01-01\n",
    "docs/decouverte-valeur.md": "# Valeur\n\n> Dernier scan : 2999-01-01\n",
  });
  assert.match(r.detail, /⚠ non exécuté : audit périmé \(docs\/audit-risques\.md, vieux de \d+ jours\) : à relancer/);
  assert.doesNotMatch(r.detail, /decouverte-valeur/);
  r = lancer({
    ".drwil/ia-first.json": JSON.stringify({ lang: "en" }),
    "docs/audit-risks.md": "# Risks\n\nno scan line\n",
    "docs/value-discovery.md": "# Value\n\n> Last scan: never\n",
  });
  assert.doesNotMatch(r.detail, /stale audit/);
  r = lancer(
    { ".drwil/ia-first.json": JSON.stringify({ lang: "en" }), "docs/value-discovery.md": "> Last scan: 2020-01-01\n" },
    { env: { DRWIL_HOOK: "pre-commit" } },
  );
  assert.match(r.detail, /⚠ not run: stale audit \(docs\/value-discovery\.md, \d+ days old\): time to re-run/);
  assert.match(r.stdout, /checks run: OK/);
});

test("QUA-036 : rappels d'intentions : périmée signalée sans bloquer, en anglais aussi", () => {
  let r = lancer({
    "docs/intentions/vieille.md": "# I\n\n**Statut** : proposée le 2020-01-01.\n",
    "docs/intentions/neuve.md": "# I\n\n**Statut** : proposée le 2999-01-01.\n",
  });
  assert.match(r.detail, /\[ia-first\] ⚠ intention sans revue depuis \d+ jours \(docs\/intentions\/vieille\.md\) : la revoir/);
  assert.doesNotMatch(r.detail, /neuve\.md|non exécuté : intention/);
  r = lancer({ ".drwil/ia-first.json": JSON.stringify({ lang: "en" }), "docs/intentions/old.md": "**Status**: proposed on 2020-01-01.\n" });
  assert.match(r.detail, /⚠ intent not reviewed for \d+ days \(docs\/intentions\/old\.md\): review it/);
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
    spawnSync(process.execPath, [SCRIPT], { cwd: tmp(), encoding: "utf8", env });
    assert.match(detail(racine), motif, lang);
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
  assert.match(r.detail, /non exécuté : couverture \(QUA-004 — Seuil de couverture de test\)/);
});

test("QUA-013 : hors commit (push, CI), un contrôle non exécuté fait échouer ; au commit, simple avertissement", () => {
  const sansCi = { ".drwil/ia-first.json": JSON.stringify({ checks: [{ name: "projet", run: "node -e 0" }] }) };
  let r = lancer(sansCi, { env: { CI: "true" } });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^\[ia-first\] ✗ échec : non exécuté : couverture CI de chaque contrôle \(QUA-013\) \(aucune CI configurée/m);
  assert.doesNotMatch(r.stdout, /contrôles exécutés : OK/);
  r = lancer(sansCi, { env: { DRWIL_HOOK: "pre-commit" } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.detail, /⚠ non exécuté : couverture CI/);
});

test("QUA-013 : hors CI, un projet non configuré (pas de CI) reste un avertissement visible", () => {
  const r = lancer({ ".drwil/ia-first.json": JSON.stringify({ checks: [{ name: "projet", run: "node -e 0" }] }) });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.detail, /⚠ non exécuté : couverture CI/);
});

test("QUA-013 : hors commit, aucun contrôle du projet déclaré fait échouer, en anglais aussi ; l'audit périmé reste un avertissement", () => {
  let r = lancer({ ".drwil/ia-first.json": JSON.stringify({ lang: "en", checks: [] }) }, { env: { CI: "true" } });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^\[ia-first\] ✗ failed: not run: project checks \(lint, tests…\) \(none declared/m);
  r = lancer({ ".drwil/ia-first.json": JSON.stringify({ lang: "en" }), "docs/value-discovery.md": "> Last scan: 2020-01-01\n" });
  assert.match(r.detail, /⚠ not run: stale audit/);
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
  const lignes = r.detail.split("\n");
  const rang = (re) => lignes.findIndex((l) => re.test(l));
  assert.ok(rang(/^\[ia-first\] Lent…$/) < rang(/^sortie lente$/));
  assert.ok(rang(/^sortie lente$/) < rang(/^\[ia-first\] Cassé \(QUA-999\)…$/));
  assert.ok(rang(/^trace$/) > rang(/^\[ia-first\] Cassé/));
  assert.match(r.detail, /^\[ia-first\] ⚠ non exécuté : Reporté \(/m);
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

test("QUA-123 : le job checks joue la suite une seule fois sur Node 22, sans npm test séparé ; kit-tests garde Node 24", () => {
  const wf = readFileSync(join(dirname(SCRIPT), "..", ".github", "workflows", "ia-first.yml"), "utf8");
  const job = (nom) => wf.split(/^ {2}(?=[\w-]+:$)/m).find((b) => b.startsWith(`${nom}:`)) ?? "";
  const checks = job("checks");
  assert.equal(checks.match(/node-version: \d+/g)?.join(), "node-version: 22");
  assert.doesNotMatch(checks, /npm test/);
  assert.match(checks, /run: node \.githooks\/run-checks\.mjs/);
  assert.match(job("kit-tests"), /node-version: 24/);
});

test("QUA-126 : sortie limitée aux contrôles en échec (contrat nommé, fin de leur sortie) et au résumé ; détail complet dans un fichier", () => {
  const long = `node -e "for(let i=1;i<=50;i++)console.log('ligne '+i);process.exit(1)"`;
  const cfg = {
    checks: [
      { name: "bavard", run: "node -e \"console.log('sortie de réussite')\"" },
      { name: "couverture (QUA-004)", run: long },
    ],
  };
  const fichiers = {
    "docs/contracts.md": "## QUA-004 — Seuil de couverture de test\n**Règle** : r.\n",
    ".drwil/ia-first.json": JSON.stringify(cfg),
  };
  const r = lancer(fichiers);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const lignes = r.stdout.trimEnd().split("\n");
  assert.equal(lignes[0], "[ia-first] ✗ échec : couverture (QUA-004 — Seuil de couverture de test)", "le contrat fautif, avec son libellé");
  assert.equal(lignes[1], "    … 10 ligne(s) plus haut, dans .drwil/evidence/run-checks.log");
  assert.equal(lignes[2], "    ligne 11");
  assert.equal(lignes.at(-2), "    ligne 50");
  assert.match(
    lignes.at(-1),
    /^\[ia-first\] contrôles exécutés : 1 en échec, \d+ avertissement\(s\) — détail : \.drwil\/evidence\/run-checks\.log/,
  );
  assert.equal(lignes.length, 43, "ni annonce, ni avertissement, ni sortie d'un contrôle réussi");
  assert.doesNotMatch(
    lignes.slice(0, -1).join("\n"),
    /sortie de réussite|bavard|…$/m,
    "le résumé seul peut nommer un contrôle réussi, parmi les plus lents",
  );
  assert.match(r.detail, /^\[ia-first\] bavard…\nsortie de réussite$/m, "le détail garde tout, dans l'ordre");
  assert.match(r.detail, /^ligne 1$/m);
  assert.match(r.detail, /^\[ia-first\] ✗ échec : couverture/m);
  const ci = lancer(fichiers, { env: { CI: "true" } });
  assert.match(ci.stdout, /^ {4}ligne 1$/m, "en CI, toute la sortie : le fichier ne survit pas au job");
  assert.doesNotMatch(ci.stdout, /plus haut/);
  assert.match(
    ci.stdout,
    /^\[ia-first\] ✗ échec : non exécuté : couverture CI de chaque contrôle/m,
    "non exécuté hors commit : un échec visible (QUA-013)",
  );
});

test("QUA-126 : un rapport impossible à écrire ne change pas le verdict ; un échec sans sortie reste nommé", () => {
  const r = lancer(
    { ".drwil/evidence": "un fichier, pas un dossier", ".drwil/ia-first.json": JSON.stringify({ checks: [] }) },
    { docsOk: false },
  );
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^\[ia-first\] ✗ échec : chemins et contrats cités dans la doc$/m);
  assert.match(r.stdout, /^\[ia-first\] contrôles exécutés : 1 en échec/m);
  const ok = lancer({
    ".drwil/evidence": "fichier",
    ".drwil/ia-first.json": JSON.stringify({ checks: [{ name: "p", run: "node -e 0" }] }),
  });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /contrôles exécutés : OK/);
});

test("QUA-127 : le résumé compte chaque avertissement non bloquant et donne le chemin du détail, en anglais aussi", () => {
  const fichiers = {
    ".drwil/ia-first.json": JSON.stringify({ checks: [{ name: "p", run: "node -e 0", paths: ["src/**"] }] }),
    "docs/audit-risques.md": "> Dernier scan : 2020-01-01\n",
    "docs/intentions/vieille.md": "# I\n\n**Statut** : proposée le 2020-01-01.\n",
  };
  const r = lancer(fichiers, { env: { DRWIL_HOOK: "pre-commit" } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  // Reporté (p), couverture CI absente, audit périmé, intention sans revue : quatre, aucun tu.
  const avertissements = r.detail.split("\n").filter((l) => l.startsWith("[ia-first] ⚠"));
  assert.equal(avertissements.length, 4, r.detail);
  assert.match(
    r.stdout,
    /^\[ia-first\] contrôles exécutés : OK \(4 avertissement\(s\), non exécutés compris — détail : \.drwil\/evidence\/run-checks\.log\) — les plus lents : [^\n]+\n$/,
  );
  const en = lancer(
    { ...fichiers, ".drwil/ia-first.json": JSON.stringify({ lang: "en", checks: [{ name: "p", run: "node -e 0", paths: ["src/**"] }] }) },
    {
      docsOk: false,
      env: { DRWIL_HOOK: "pre-commit" },
    },
  );
  assert.match(en.stdout, /^\[ia-first\] checks run: 1 failed, 3 warning\(s\) — detail: \.drwil\/evidence\/run-checks\.log/m);
  const ok = lancer({ ".drwil/ia-first.json": JSON.stringify({ lang: "en", checks: [{ name: "p", run: "node -e 0" }] }) });
  assert.match(
    ok.stdout,
    /^\[ia-first\] checks run: OK \(\d+ warning\(s\), not run included — detail: \.drwil\/evidence\/run-checks\.log\)( — slowest: .+)?$/m,
  );
  const longue = lancer(
    {
      ".drwil/ia-first.json": JSON.stringify({
        lang: "en",
        checks: [{ name: "x", run: `node -e "for(let i=0;i<45;i++)console.log(i);process.exit(1)"` }],
      }),
    },
    {},
  );
  assert.match(longue.stdout, /^ {4}… 5 line\(s\) above, in \.drwil\/evidence\/run-checks\.log$/m);
});

test("QUA-134 : un contrôle qui laisse des fichiers dans son dossier temporaire est nommé et compté comme avertissement, sans faire échouer ; un échec dit où est gardé le dossier", () => {
  const base = tmp();
  const fuit = (code) =>
    `node -e "require('fs').writeFileSync(require('path').join(process.env.TMPDIR,'reste'),'x');process.exit(${code})"`;
  const config = (lang, code) => ({ ".drwil/ia-first.json": JSON.stringify({ lang, checks: [{ name: "fuyard", run: fuit(code) }] }) });
  const ok = lancer(config("fr", 0), { env: { TMPDIR: base } });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.detail, /^\[ia-first\] ⚠ fuyard laisse 1 élément\(s\) dans son dossier temporaire/m);
  assert.match(ok.stdout, /contrôles exécutés : OK \(3 avertissement\(s\)/, "la fuite est comptée avec les non exécutés");
  assert.equal(readdirSync(base).length, 0, "passe réussie : rien ne reste");
  const ko = lancer(config("en", 1), { env: { TMPDIR: base } });
  assert.equal(ko.status, 1);
  const gardes = readdirSync(base);
  assert.equal(gardes.length, 1);
  assert.ok(ko.stdout.includes(`temporary folders of the failed checks kept for diagnosis: ${join(base, gardes[0])}`), ko.stdout);
});

test("QUA-134 : une racine temporaire qu'on ne parvient pas à supprimer est un avertissement compté, jamais un échec", {
  skip: process.platform === "win32" || process.getuid?.() === 0,
}, () => {
  const base = tmp();
  const verrou = `node -e "require('fs').chmodSync(process.env.TMPDIR + '/..', 0o500)"`;
  const r = lancer({ ".drwil/ia-first.json": JSON.stringify({ checks: [{ name: "verrou", run: verrou }] }) }, { env: { TMPDIR: base } });
  chmodSync(join(base, readdirSync(base)[0]), 0o700);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.detail, /^\[ia-first\] ⚠ dossier temporaire de la passe non supprimé/m);
});

test("QUA-136 : chaque contrôle exécuté a sa durée au détail, du plus lent au plus rapide en fin de fichier ; le résumé nomme les trois plus lents", () => {
  const lent = (ms) => `node -e "setTimeout(()=>{},${ms})"`;
  const config = (lang) => ({
    ".drwil/ia-first.json": JSON.stringify({
      lang,
      checks: [
        { name: "rapide", run: lent(0) },
        { name: "moyen", run: lent(250) },
        { name: "lent", run: lent(600) },
        { name: "pas-si-rapide", run: lent(120) },
      ],
    }),
  });
  const fr = lancer(config("fr"));
  assert.equal(fr.status, 0, fr.stdout + fr.stderr);
  assert.match(fr.detail, /^\[ia-first\] lent : durée : \d+ ms$/m);
  assert.doesNotMatch(fr.detail, /^\[ia-first\] contrôles du projet \(lint, tests…\) : durée/m, "un contrôle non exécuté n'a pas de durée");
  const classe = fr.detail.split("contrôles du plus lent au plus rapide")[1].split("\n").slice(1).filter(Boolean);
  const noms = classe.map((l) => l.replace(/^\s*\d+ ms\s+/, ""));
  assert.deepEqual(noms.slice(0, 3), ["lent", "moyen", "pas-si-rapide"]);
  assert.ok(noms.length >= 4, "tous les contrôles exécutés y figurent");
  assert.match(fr.stdout, /— les plus lents : lent \d+ ms, moyen \d+ ms, pas-si-rapide \d+ ms\n$/);
  assert.match(fr.detail, /en passe parallèle, elles se recouvrent/);
  const en = lancer(config("en"));
  assert.match(en.detail, /^\[ia-first\] lent : duration: \d+ ms$/m);
  assert.match(en.stdout, /— slowest: lent \d+ ms, moyen \d+ ms, pas-si-rapide \d+ ms\n$/);
});

const VERDICTS = ".drwil/evidence/run-checks-verdicts.json";

test("QUA-140 : une passe hors hook consigne le verdict ok ou fail de chaque contrôle avec l'empreinte de l'arbre ; ni non exécuté, ni passe de hook", async () => {
  const fichiers = {
    ".drwil/ia-first.json": JSON.stringify({
      checks: [
        { id: "vert", run: "node -e 0" },
        { id: "rouge", run: "node -e \"console.log('cause');process.exit(1)\"" },
        { id: "reporte", run: "node -e 0", paths: ["src/**"] },
      ],
    }),
  };
  const r = lancer(fichiers, { valider: true });
  const consigne = JSON.parse(readFileSync(join(r.racine, VERDICTS), "utf8"));
  assert.equal(consigne.checks.vert.status, "ok");
  assert.equal(consigne.checks.rouge.status, "fail");
  assert.match(consigne.checks.rouge.output, /cause/);
  assert.ok(
    !("secrets" in consigne.checks) || consigne.checks.secrets.reusable === false,
    "secrets hors CI ne juge pas ce que verify juge",
  );
  assert.match(consigne.ranAt, /^\d{4}-\d{2}-\d{2}T/);
  const { treeFingerprint } = await import("./engine.mjs");
  assert.equal(consigne.fingerprint, treeFingerprint(r.racine));
  const hook = lancer(fichiers, { valider: true, env: { DRWIL_HOOK: "pre-commit" } });
  assert.ok(!existsSync(join(hook.racine, VERDICTS)), "une passe de hook ne laisse rien à reprendre");
  const push = lancer(fichiers, { valider: true, env: { DRWIL_PUSH_REFS: "refs/heads/travail" } });
  assert.ok(!existsSync(join(push.racine, VERDICTS)), "une passe de pre-push non plus");
});

test("QUA-140 : un arbre changé pendant la passe, ou sans commit, ne laisse aucun verdict", () => {
  const ecrivain = { id: "ecrit", run: "node -e \"require('fs').writeFileSync('intrus.txt','x')\"" };
  const change = lancer({ ".drwil/ia-first.json": JSON.stringify({ checks: [ecrivain] }) }, { valider: true });
  assert.ok(!existsSync(join(change.racine, VERDICTS)), "le verdict n'est pas pris sur un seul arbre");
  const sansCommit = lancer({ ".drwil/ia-first.json": JSON.stringify({ checks: [{ id: "vert", run: "node -e 0" }] }) });
  assert.ok(!existsSync(join(sansCommit.racine, VERDICTS)), "sans commit : pas d'empreinte, rien de repris");
  const bloque = lancer(
    { ".drwil/ia-first.json": JSON.stringify({ checks: [{ id: "vert", run: "node -e 0" }] }), ".drwil/evidence": "fichier" },
    { valider: true },
  );
  assert.equal(bloque.status, 0, "des verdicts qui ne s'écrivent pas ne changent pas le verdict de la passe");
});

const compte = (racine) => (existsSync(join(racine, "compteur.log")) ? readFileSync(join(racine, "compteur.log"), "utf8").length : 0);
const consigne = (racine) => JSON.parse(readFileSync(join(racine, VERDICTS), "utf8"));

test("QUA-141 : hors hook et hors CI, un contrôle « ok » dont les fichiers du paths n'ont pas changé est repris, le dit, et ne reçoit pas l'empreinte de l'arbre", () => {
  const joue = (nom) => `node -e "require('fs').appendFileSync('compteur.log','x')" ${nom}`;
  const config = (compteur) => ({
    checks: [
      { id: "compteur", run: compteur, paths: ["src/**"] },
      { id: "autre", run: "node -e 0", paths: ["autre/**"] },
      { id: "sans-chemin", run: "node -e 0" },
    ],
  });
  const r = lancer(
    {
      ".drwil/ia-first.json": JSON.stringify(config(joue("a"))),
      ".gitignore": "compteur.log\n",
      "src/a.txt": "a\n",
      "autre/b.txt": "b\n",
      "hors.txt": "h\n",
    },
    { valider: true },
  );
  const { racine } = r;
  assert.equal(compte(racine), 1);
  assert.doesNotMatch(r.stdout, /repris/, "première passe : rien à reprendre");
  const premiere = consigne(racine);
  assert.match(premiere.checks.compteur.control, /^[0-9a-f]{64}$/);
  assert.equal(premiere.checks["sans-chemin"].control, null, "sans paths : pas d'empreinte propre");
  assert.ok(premiere.played.includes("compteur") && premiere.played.includes("sans-chemin"));

  // Rien n'a changé, sauf un fichier hors de tout paths : repris, dit, et sans l'empreinte de l'arbre entier (invariant de QUA-141).
  writeFileSync(join(racine, "hors.txt"), "autre chose\n");
  const deuxieme = passe(racine);
  assert.equal(deuxieme.status, 0, deuxieme.stdout + deuxieme.stderr);
  assert.equal(compte(racine), 1, "le contrôle n'a pas rejoué");
  assert.match(deuxieme.detail, /^\[ia-first\] node -e "require.* a : repris \(fichiers du contrôle inchangés, run-checks du \d{4}-/m);
  assert.match(deuxieme.detail, /^\[ia-first\] node -e 0…$/m);
  assert.match(deuxieme.stdout, /— 2 repris \(fichiers du contrôle inchangés\), \d+ rejoué\(s\) — /);
  const reprise = consigne(racine);
  assert.equal(reprise.checks.compteur.ranAt, premiere.checks.compteur.ranAt, "le verdict repris garde sa date");
  assert.equal(reprise.checks.compteur.control, premiere.checks.compteur.control);
  assert.deepEqual(
    reprise.played.filter((id) => ["compteur", "autre", "sans-chemin"].includes(id)),
    ["sans-chemin"],
    "seul un contrôle joué dans la passe entre dans l'empreinte de l'arbre",
  );

  // Un octet d'un fichier du paths, la déclaration : rejoué ; l'autre contrôle reste repris.
  writeFileSync(join(racine, "src/a.txt"), "b\n");
  assert.match(passe(racine).stdout, /— 1 repris/);
  assert.equal(compte(racine), 2);
  writeFileSync(join(racine, ".drwil/ia-first.json"), JSON.stringify(config(joue("autre-declaration"))));
  passe(racine);
  assert.equal(compte(racine), 3, "déclaration changée : rejoué");

  // « Tout rejouer », CI, hook : tout rejoué.
  for (const [args, env] of [
    [["--tout-rejouer"], {}],
    [["--replay-all"], {}],
    [[], { CI: "1" }],
  ]) {
    const avant = compte(racine);
    const p = passe(racine, { args, env });
    assert.equal(compte(racine), avant + 1, `${args.join(" ")} ${JSON.stringify(env)} : rejoué`);
    assert.doesNotMatch(p.stdout, /repris/);
  }
  // Un hook choisit ses contrôles sur les fichiers indexés : il ne reprend jamais rien.
  assert.doesNotMatch(passe(racine, { env: { DRWIL_HOOK: "pre-commit" } }).stdout, /repris/);
});

test('QUA-141 : un contrôle en échec, sans paths, ou déclaré reuse: false ou reuse: "tree" est rejoué à chaque passe', () => {
  const joue = (sortie) => `node -e "require('fs').appendFileSync('compteur.log','x');process.exit(${sortie})"`;
  const r = lancer(
    {
      ".drwil/ia-first.json": JSON.stringify({
        checks: [
          { id: "rouge", run: joue(1), paths: ["src/**"] },
          { id: "reseau", run: joue(0), paths: ["src/**"], reuse: false },
          { id: "arbre", run: joue(0), paths: ["src/**"], reuse: "tree" },
          { id: "vide", run: joue(0), paths: ["rien/**"] },
        ],
      }),
      ".gitignore": "compteur.log\n",
      "src/a.txt": "a\n",
    },
    { valider: true },
  );
  assert.equal(r.status, 1, "le contrôle rouge échoue");
  assert.equal(compte(r.racine), 4);
  const p = passe(r.racine);
  assert.equal(compte(r.racine), 8, "tous rejoués");
  assert.equal(p.status, 1);
  assert.doesNotMatch(p.stdout, /repris/);
  const v = consigne(r.racine);
  assert.deepEqual(
    Object.entries(v.checks)
      .filter(([id]) => ["rouge", "reseau", "arbre", "vide"].includes(id))
      .map(([id, c]) => [id, c.control === null]),
    [
      ["rouge", false],
      ["reseau", true],
      ["arbre", true],
      ["vide", true],
    ],
    "reuse: false, reuse: \"tree\" et paths sans fichier n'ont pas d'empreinte propre ; un échec en a une mais n'est jamais repris",
  );
});

test("QUA-141 : un contrôle dont les fichiers changent pendant la passe ne laisse pas d'empreinte propre", () => {
  const r = lancer(
    {
      ".drwil/ia-first.json": JSON.stringify({
        checks: [{ id: "ecrit", run: "node -e \"require('fs').writeFileSync('src/intrus.txt','x')\"", paths: ["src/**"] }],
      }),
      "src/a.txt": "a\n",
    },
    { valider: true },
  );
  assert.ok(!existsSync(join(r.racine, VERDICTS)), "rien n'est consigné : le contrôle a modifié ce qu'il juge");
});

test("QUA-141 : en anglais, la reprise se dit en anglais", () => {
  const racine = lancer(
    {
      ".drwil/ia-first.json": JSON.stringify({ lang: "en", checks: [{ id: "un", run: "node -e 0", paths: ["src/**"] }] }),
      "src/a.txt": "a\n",
    },
    { valider: true },
  ).racine;
  const p = passe(racine);
  assert.match(p.detail, /^\[ia-first\] node -e 0 : reused \(check files unchanged, run-checks of \d{4}-/m);
  assert.match(p.stdout, /1 reused \(check files unchanged\), \d+ replayed/);
});

test("QUA-141 : un arbre changé hors des fichiers du contrôle garde son empreinte propre sans empreinte d'arbre ; un fichier de verdicts sans contrôles se lit", () => {
  const fichiers = {
    ".drwil/ia-first.json": JSON.stringify({
      checks: [{ id: "ecrit", run: "node -e \"require('fs').writeFileSync('autre.txt','x')\"", paths: ["src/**"] }],
    }),
    "src/a.txt": "a\n",
    [VERDICTS]: "{}",
  };
  const r = lancer(fichiers, { valider: true });
  const verdicts = consigne(r.racine);
  assert.equal(verdicts.fingerprint, null);
  assert.deepEqual(verdicts.played, []);
  assert.match(verdicts.checks.ecrit.control, /^[0-9a-f]{64}$/);
});
