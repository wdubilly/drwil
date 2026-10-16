import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
