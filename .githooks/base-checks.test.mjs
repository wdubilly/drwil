// QUA-113 : rejeu des contrôles avec les hooks de la branche principale, sur des dépôts temporaires.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { baseRef, declaredIn, replay } from "./base-checks.mjs";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "base-checks.mjs");
// Sans les variables de la forge : en CI (GITHUB_BASE_REF sur une PR), elles désigneraient une base
// absente des dépôts temporaires.
const env = { ...process.env, CI: "", DRWIL_HOOK: "" };
for (const nom of ["DRWIL_BASE", "GITHUB_BASE_REF", "CI_MERGE_REQUEST_TARGET_BRANCH_NAME", "CI_DEFAULT_BRANCH"]) delete env[nom];
// run-checks de la branche principale : échoue sur un fichier `faute`, ou si son module a disparu.
const RUN_CHECKS =
  'import { existsSync } from "node:fs";\nprocess.exit(existsSync("faute") || !existsSync(".githooks/lib.mjs") ? 1 : 0);\n';
const AFFAIBLI = "process.exit(0);\n";
const CHECKS = [{ id: "a", run: "true" }, { name: "b", run: "true" }, { run: "c" }];

function depot({ lang = "fr", hooks = true, cfg = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-base-checks-"));
  const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8", env });
  const ecrire = (f, texte) => {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), texte);
  };
  const commit = (message) => {
    git("add", "-A");
    return git("commit", "-q", "--no-gpg-sign", "-m", message);
  };
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@exemple.invalid");
  git("config", "user.name", "Test");
  if (hooks) {
    ecrire(".githooks/run-checks.mjs", RUN_CHECKS);
    ecrire(".githooks/lib.mjs", "export const v = 1;\n");
    ecrire(".githooks/lib.test.mjs", "// test de lib\n");
  } else ecrire("README.md", "projet\n");
  if (cfg) ecrire(".drwil/ia-first.json", JSON.stringify({ lang, checks: CHECKS }));
  commit("base");
  git("checkout", "-q", "-b", "travail");
  ecrire(".drwil/ia-first.json", JSON.stringify({ lang, checks: CHECKS }));
  const rejouer = (argv = ["--base", "main"]) => replay(dir, { argv, env, stdio: "pipe" });
  return { dir, git, ecrire, commit, rejouer, lire: (f) => readFileSync(join(dir, f), "utf8") };
}

test("QUA-113 un hook affaibli par la PR échoue au rejeu ; le hook de la PR est remis en place après", () => {
  const d = depot();
  d.ecrire("src/ok.js", "ok\n");
  d.commit("travail sain");
  d.ecrire(".githooks/run-checks.mjs", `${RUN_CHECKS}// retouche\n`);
  d.commit("hook retouché");
  assert.deepEqual(d.rejouer(), { status: "ok", lines: ["contrôles rejoués avec les hooks de « main » : OK"] });

  d.ecrire(".githooks/run-checks.mjs", AFFAIBLI);
  d.ecrire("faute", "x\n");
  d.commit("hook affaibli");
  assert.equal(spawnSync(process.execPath, [".githooks/run-checks.mjs"], { cwd: d.dir }).status, 0, "le hook de la PR se valide lui-même");
  const r = d.rejouer();
  assert.equal(r.status, "fail");
  assert.deepEqual(r.lines, ["les contrôles échouent avec les hooks de « main » : un hook affaibli ou contourné par la PR ?"]);
  assert.equal(d.lire(".githooks/run-checks.mjs"), AFFAIBLI, "copie de travail rendue telle quelle");
  assert.equal(d.git("status", "--porcelain").stdout, "");
});

test("QUA-113 un hook supprimé par la PR est rejoué depuis la branche principale, puis de nouveau absent", () => {
  const d = depot();
  d.git("rm", "-q", ".githooks/lib.mjs");
  d.commit("module retiré");
  assert.equal(d.rejouer().status, "ok", "la branche principale a encore son module le temps du rejeu");
  assert.equal(existsSync(join(d.dir, ".githooks/lib.mjs")), false);
});

test("QUA-113 un contrôle retiré sans déclaration échoue, qu'il soit nommé par id, name ou run", () => {
  const d = depot();
  d.ecrire(".drwil/ia-first.json", JSON.stringify({ checks: [] }));
  d.commit("contrôles retirés");
  const r = d.rejouer();
  assert.equal(r.status, "fail");
  assert.deepEqual(
    r.lines.slice(0, 3).map((l) => /« (\w+) »/.exec(l)[1]),
    ["a", "b", "c"],
  );
  assert.match(r.lines[0], /retiré de \.drwil\/ia-first\.json sans déclaration.*« Contrats modifiés »/);
  assert.match(r.lines[3], /OK$/, "les hooks, eux, passent : seul le retrait fait échouer");
});

test("QUA-113 un contrôle retiré déclaré dans « Contrats modifiés » passe, même fiche supprimée à la clôture", () => {
  const d = depot();
  d.ecrire(".drwil/ia-first.json", JSON.stringify({ checks: [{ name: "b", run: "true" }, { run: "c" }] }));
  const fiche =
    "# Projet\n\n## Critères\n\n- `a` ici ne compte pas\n\n## Contrats modifiés\n\n- `a` — retiré, validé le 2026-10-24\n\n## 2. Hors périmètre\n";
  d.ecrire("docs/projects/x.md", fiche);
  d.ecrire("docs/projects/notes.txt", "- `rien`\n");
  d.commit("retrait déclaré");
  assert.equal(d.rejouer().status, "ok");
  d.ecrire("docs/projects/x.md", `${fiche}\nretouche\n`);
  d.commit("fiche retouchée");
  d.git("rm", "-q", "docs/projects/x.md");
  d.commit("clôture");
  assert.equal(d.rejouer().status, "ok", "la fiche est lue à sa dernière version, avant sa suppression");
});

test("QUA-113 un hook déclaré dans « Contrats modifiés » garde sa version de la PR, son test avec lui", () => {
  const d = depot();
  d.ecrire(".githooks/lib.mjs", "export const v = 2;\n");
  d.ecrire(".githooks/lib.test.mjs", "// test de la v2\n");
  d.ecrire(".githooks/run-checks.mjs", `${RUN_CHECKS}// correctif\n`);
  d.ecrire("docs/projects/x.md", "## Contrats modifiés\n\n- `.githooks/lib.mjs` — correctif d'un défaut du hook\n");
  d.commit("hook corrigé");
  const r = d.rejouer();
  assert.equal(r.status, "ok");
  assert.deepEqual(r.lines.slice(0, 2), [
    ".githooks/lib.mjs : version de la PR gardée, déclarée dans « Contrats modifiés »",
    ".githooks/lib.test.mjs : version de la PR gardée, déclarée dans « Contrats modifiés »",
  ]);
  assert.match(d.lire(".githooks/run-checks.mjs"), /correctif/, "non déclaré : rejoué depuis la base puis rendu");
});

test("QUA-113 branche principale introuvable : non exécuté, jamais un succès", () => {
  const d = depot();
  assert.deepEqual(d.rejouer(["--base", "absente"]).status, "not-run");
  assert.match(d.rejouer(["--base", "absente"]).lines[0], /^non exécuté : branche principale « absente » introuvable/);
  assert.match(d.rejouer([]).lines[0], /^non exécuté : branche principale inconnue/);
  assert.match(d.rejouer(["--base"]).lines[0], /^non exécuté : branche principale inconnue/);
  // Branche orpheline : HEAD sans commit, l'historique de la PR ne se lit pas.
  d.git("checkout", "-q", "--orphan", "orpheline");
  d.ecrire(".githooks/lib.mjs", "export const v = 3;\n");
  const r = d.rejouer();
  assert.equal(r.status, "not-run");
  assert.match(r.lines[0], /^non exécuté : git log /);
});

test("QUA-113 configuration illisible : non exécuté ; base sans configuration : rien de retiré", () => {
  const d = depot();
  d.ecrire(".drwil/ia-first.json", "{ pas du json");
  assert.equal(d.rejouer().status, "not-run");
  const sans = depot({ cfg: false });
  assert.equal(sans.rejouer().status, "ok");
});

test("QUA-113 base sans .githooks/ (adoption) : non applicable ; projet en anglais", () => {
  const d = depot({ hooks: false, lang: "en" });
  assert.deepEqual(d.rejouer(), {
    status: "not-applicable",
    lines: ['not applicable: "main" has no .githooks/ yet (kit adoption), nothing to replay'],
  });
  const en = depot({ lang: "en" });
  en.ecrire(".drwil/ia-first.json", JSON.stringify({ lang: "en", dirs: { projects: "briefs" }, checks: [] }));
  en.ecrire("briefs/x.md", "## 5. Modified contracts\n\n- `a`\n- `b`\n");
  en.commit("removed");
  const r = en.rejouer();
  assert.equal(r.status, "fail");
  assert.deepEqual(r.lines, [
    'check "c" removed from .drwil/ia-first.json without declaration: cite it in backticks in the « Modified contracts » section of the brief, approved by the requester',
    'checks replayed with the hooks of "main": OK',
  ]);
});

test("QUA-113 la branche principale vient de --base, DRWIL_BASE, puis des variables de la forge", () => {
  assert.equal(baseRef(["--base", "x"], { DRWIL_BASE: "y" }), "x");
  assert.equal(baseRef([], { DRWIL_BASE: "y", GITHUB_BASE_REF: "z" }), "y");
  assert.equal(baseRef([], { GITHUB_BASE_REF: "master" }), "origin/master");
  assert.equal(baseRef([], { CI_MERGE_REQUEST_TARGET_BRANCH_NAME: "dev", CI_DEFAULT_BRANCH: "main" }), "origin/dev");
  assert.equal(baseRef([], { CI_DEFAULT_BRANCH: "main" }), "origin/main");
  assert.equal(baseRef([], {}), null);
  assert.deepEqual(declaredIn("## Contrats modifiés\r\n\r\n- `QUA-001` — x\r\n  - `sous-puce` aussi\r\n## Suite\n- `hors`\n"), [
    "QUA-001",
    "sous-puce",
  ]);
});

test("QUA-113 en ligne de commande : code 0 si rejoué ou non applicable, 1 sinon", () => {
  const cli = (dir, ...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: "utf8", env });
  const d = depot();
  d.ecrire(".githooks/lib.mjs", "export const v = 4;\n");
  d.commit("hook modifié");
  let r = cli(d.dir, "--base", "main");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^\[ia-first\] contrôles rejoués avec les hooks de « main » : OK$/m);
  assert.equal(cli(depot({ hooks: false }).dir, "--base", "main").status, 0);
  r = cli(d.dir, "--base", "absente");
  assert.equal(r.status, 1);
  const intact = depot();
  r = cli(intact.dir, "--base", "main");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^\[ia-first\] rejeu sauté : /m);
  rmSync(intact.dir, { recursive: true, force: true });
  rmSync(d.dir, { recursive: true, force: true });
});

test("QUA-123 hooks et configuration identiques à la base : rejeu sauté, dit à voix haute", () => {
  const d = depot();
  d.ecrire("src/ok.js", "ok\n");
  d.ecrire("faute", "x\n");
  d.commit("travail hors hooks");
  assert.deepEqual(d.rejouer(), {
    status: "skipped",
    lines: [
      "rejeu sauté : .githooks/ et .drwil/ia-first.json sont identiques à ceux de « main », le rejeu serait strictement le passage déjà fait",
    ],
  });
  const en = depot({ lang: "en" });
  assert.match(en.rejouer().lines[0], /^replay skipped: .*identical to those of "main"/);
});

test("QUA-123 un hook ou la configuration modifiés (suivis ou non), un contrôle retiré : rejeu, jamais de saut", () => {
  const d = depot();
  d.ecrire(".githooks/lib.mjs", "export const v = 2;\n");
  d.commit("hook modifié");
  assert.equal(d.rejouer().status, "ok", "rejeu complet");
  const nouveau = depot();
  nouveau.ecrire(".githooks/nouveau.mjs", "export {};\n");
  assert.match(nouveau.rejouer().lines.at(-1), /OK$/, "fichier non suivi : rejeu");
  const cfg = depot();
  cfg.ecrire(".drwil/ia-first.json", JSON.stringify({ checks: [{ id: "a", run: "true" }] }));
  cfg.commit("deux contrôles retirés");
  const r = cfg.rejouer();
  assert.equal(r.status, "fail");
  assert.match(r.lines[0], /contrôle « b » retiré/);
});

test("QUA-123 lecture git en échec : rejeu, jamais de saut", () => {
  const d = depot();
  writeFileSync(join(d.dir, ".git", "index"), "pas un index");
  const r = d.rejouer();
  assert.notEqual(r.status, "skipped");
});
