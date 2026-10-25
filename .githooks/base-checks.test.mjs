// QUA-113 : rejeu des contrôles avec les hooks de la branche principale, sur des dépôts temporaires.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { baseRef, declaredIn, replay, undeclaredHooks } from "./base-checks.mjs";

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

// QUA-137 : avant la clôture, les fichiers de .githooks/ modifiés par la branche et non déclarés.
const nonDeclares = (d, texte = "") => undeclaredHooks(d.dir, texte, { env });

test("QUA-137 un hook modifié ou supprimé sans déclaration est nommé, avec la puce à écrire et le oui du demandeur", () => {
  const d = depot();
  assert.deepEqual(nonDeclares(d), { files: [], lines: [] }, "rien de modifié : rien à signaler");
  d.ecrire(".githooks/lib.mjs", "export const v = 2;\n");
  d.ecrire(".githooks/nouveau.mjs", "// ajouté par la branche, rien à remettre\n");
  d.commit("hook modifié");
  d.git("rm", "-q", ".githooks/run-checks.mjs");
  const r = nonDeclares(d);
  assert.deepEqual(
    r.files,
    [".githooks/lib.mjs", ".githooks/run-checks.mjs"],
    "modifié commité et supprimé non commité ; l'ajout ne compte pas",
  );
  assert.equal(
    r.lines[0],
    "`.githooks/lib.mjs` modifié par la branche sans être déclaré : en CI, le rejeu par la branche principale (QUA-113) remettrait sa version et ferait échouer les contrôles — ajouter à la section « Contrats modifiés » de la fiche la puce « - `.githooks/lib.mjs` — <ce qui change> (validé par le demandeur le <date>) » ; déclarer un hook change les règles du jeu : la puce s'écrit sur le oui du demandeur, jamais sans",
  );
});

test("QUA-137 un hook déclaré n'est plus signalé, son test avec lui, fiche commitée, supprimée à la clôture ou pas encore commitée", () => {
  const d = depot();
  d.ecrire(".githooks/lib.mjs", "export const v = 2;\n");
  d.ecrire(".githooks/lib.test.mjs", "// test de la v2\n");
  d.commit("hook et test modifiés");
  assert.deepEqual(nonDeclares(d).files, [".githooks/lib.mjs", ".githooks/lib.test.mjs"]);
  const fiche = "# Projet\n\n## Contrats modifiés\n\n- `.githooks/lib.mjs` — correctif (validé par le demandeur)\n";
  assert.deepEqual(nonDeclares(d, fiche).files, [], "la fiche telle qu'elle est, déclaration pas encore commitée");
  d.ecrire("docs/projects/x.md", fiche);
  d.commit("déclaration");
  assert.deepEqual(nonDeclares(d).files, [], "le test suit la déclaration de son module");
  d.git("rm", "-q", "docs/projects/x.md");
  d.commit("clôture");
  assert.deepEqual(nonDeclares(d).files, [], "la fiche supprimée se lit à sa version d'avant suppression");
  d.ecrire(".githooks/lib.test.mjs", "// seul le test change\n");
  d.ecrire("docs/projects/y.md", "## Contrats modifiés\n\n- `.githooks/autre.mjs` — sans rapport\n");
  d.commit("autre fiche");
  assert.deepEqual(nonDeclares(d).files, [], "déclaré par une fiche de la branche, quelle qu'elle soit");
});

test("QUA-137 branche principale introuvable ou historique illisible : non exécuté, jamais un succès ; sans .githooks/ : rien à comparer ; en anglais", () => {
  const d = depot();
  d.git("branch", "-m", "main", "tronc");
  d.ecrire(".githooks/lib.mjs", "export const v = 2;\n");
  const r = nonDeclares(d);
  assert.deepEqual(r.files, []);
  assert.deepEqual(r.lines, [
    "hooks non déclarés : non exécuté — branche principale introuvable (DRWIL_BASE, origin/HEAD, origin/master, origin/main, master ou main) : les fichiers de .githooks/ modifiés par la branche ne sont pas comparés à « Contrats modifiés », ce n'est pas un succès",
  ]);
  assert.deepEqual(undeclaredHooks(d.dir, "", { env: { ...env, DRWIL_BASE: "tronc" } }).files, [".githooks/lib.mjs"], "DRWIL_BASE d'abord");
  d.git("checkout", "-q", "--orphan", "orpheline");
  const orpheline = undeclaredHooks(d.dir, "", { env: { ...env, DRWIL_BASE: "tronc" } });
  assert.deepEqual(orpheline.files, []);
  assert.match(orpheline.lines[0], /^hooks non déclarés : non exécuté — git merge-base /);
  const sans = depot({ hooks: false });
  assert.deepEqual(nonDeclares(sans), { files: [], lines: [] });
  const en = depot({ lang: "en" });
  en.ecrire(".githooks/lib.mjs", "export const v = 2;\n");
  assert.match(
    nonDeclares(en).lines[0],
    /^`\.githooks\/lib\.mjs` modified by the branch without being declared: .* on the requester's yes, never without$/,
  );
  en.git("branch", "-m", "main", "trunk");
  assert.match(nonDeclares(en).lines[0], /^undeclared hooks: not run — main branch not found .*this is not a success$/);
});

test("QUA-137 la branche principale vient d'origin/HEAD avant les noms usuels ; dossier des fiches réglé ; sans configuration, en français", () => {
  const d = depot({ lang: "en" });
  d.ecrire(".drwil/ia-first.json", JSON.stringify({ lang: "en", dirs: { projects: "briefs" }, checks: CHECKS }));
  d.ecrire(".githooks/lib.mjs", "export const v = 2;\n");
  d.ecrire("briefs/x.md", "## Modified contracts\n\n- `.githooks/lib.mjs` — v2\n");
  d.commit("declared");
  d.git("update-ref", "refs/remotes/origin/tronc", "main");
  d.git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/tronc");
  d.git("branch", "-m", "main", "ancienne");
  assert.deepEqual(nonDeclares(d), { files: [], lines: [] }, "origin/HEAD trouvé, fiche lue dans briefs/");
  d.ecrire(".githooks/run-checks.mjs", AFFAIBLI);
  assert.deepEqual(nonDeclares(d).files, [".githooks/run-checks.mjs"]);
  rmSync(join(d.dir, ".drwil/ia-first.json"));
  const sans = nonDeclares(d);
  assert.deepEqual(sans.files, [".githooks/lib.mjs", ".githooks/run-checks.mjs"], "sans configuration : fiches lues dans docs/projects/");
  assert.match(sans.lines[0], /^`\.githooks\/lib\.mjs` modifié par la branche sans être déclaré/);
});
