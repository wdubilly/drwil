// Tests de la matrice multi-OS de la CI du dépôt (QUA-045, Windows et macOS avant la fusion) : le calcul
// lui-même, puis le workflow qui doit s'en servir — un script juste mais non branché ne prouve rien.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { codeTouche, matrice } from "./ci-multi-os.mjs";

const WORKFLOW = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "workflows", "ia-first.yml"), "utf8");

/** Texte d'un job du workflow : de sa clé à la clé suivante de même niveau. */
const job = (nom) => {
  const debut = WORKFLOW.indexOf(`\n  ${nom}:\n`);
  assert.ok(debut >= 0, `job ${nom} absent du workflow`);
  const suite = WORKFLOW.slice(debut + 1).search(/\n {2}[a-z][\w-]*:\n/);
  return suite < 0 ? WORKFLOW.slice(debut + 1) : WORKFLOW.slice(debut + 1, debut + 1 + suite);
};
const lignes = (m) => m.map(({ os, tester }) => `${os}:${tester}`);

test("QUA-045 : un push sur une autre branche que master ne rapporte qu'Ubuntu", () => {
  assert.deepEqual(lignes(matrice({ evenement: "push", ref: "refs/heads/workstream/x", principale: "master" })), ["ubuntu-latest:true"]);
});

test("QUA-045 : un push sur master teste les trois OS", () => {
  assert.deepEqual(lignes(matrice({ evenement: "push", ref: "refs/heads/master", principale: "master" })), [
    "ubuntu-latest:true",
    "macos-latest:true",
    "windows-latest:true",
  ]);
});

test("QUA-045 : une PR de code teste les trois OS", () => {
  const m = matrice({ evenement: "pull_request", fichiers: ["docs/projects/x.md", ".githooks/state.mjs"] });
  assert.deepEqual(lignes(m), ["ubuntu-latest:true", "macos-latest:true", "windows-latest:true"]);
});

test("QUA-045 : une PR de documentation rapporte les trois OS, seul Ubuntu teste", () => {
  const m = matrice({ evenement: "pull_request", fichiers: ["docs/projects/x.md", "docs/intentions/y.md", ".drwil/usage.jsonl"] });
  assert.deepEqual(lignes(m), ["ubuntu-latest:true", "macos-latest:false", "windows-latest:false"]);
});

test("QUA-045 : chaque ligne garde l'archive gitleaks de son OS et sa somme", () => {
  for (const { os, gitleaks, sha256 } of matrice({ evenement: "push", ref: "refs/heads/master", principale: "master" })) {
    assert.match(gitleaks, os.startsWith("windows") ? /windows_x64\.zip$/ : os.startsWith("macos") ? /darwin_arm64/ : /linux_x64/);
    assert.match(sha256, /^[0-9a-f]{64}$/);
  }
});

test("QUA-045 : seuls docs/ et la ligne de consommation ne sont pas du code", () => {
  assert.equal(codeTouche(["docs/a.md", ".drwil/usage.jsonl"]), false);
  for (const f of ["README.md", "AGENTS.md", "packages/drwil/templates/common/base/AGENTS.md", ".drwil/ia-first.json", "docsx/a.md"])
    assert.equal(codeTouche(["docs/a.md", f]), true, f);
  // Rien ne prouve qu'une liste vide ne soit que de la documentation : on teste.
  assert.equal(codeTouche([]), true);
});

test("QUA-045 : un événement inattendu teste les trois OS", () => {
  assert.equal(matrice({ evenement: "workflow_dispatch" }).length, 3);
  assert.ok(matrice({ evenement: "workflow_dispatch" }).every((l) => l.tester));
});

test("QUA-045 : kit-tests tire sa matrice du calcul, sous le nom exigé par le ruleset", () => {
  const kit = job("kit-tests");
  assert.match(kit, /needs: matrice-os\n/);
  assert.match(kit, /include: \$\{\{ fromJSON\(needs\.matrice-os\.outputs\.matrice\) \}\}/);
  assert.match(kit, /name: kit-tests \(\$\{\{ matrix\.os \}\}\)/);
  // Un `if` de job sauterait le check exigé au lieu de le rapporter vert (fiche, section 3).
  assert.doesNotMatch(kit.split("steps:")[0], /^ {4}if:/m);
});

test("QUA-045 : sans tests, chaque étape de kit-tests est sautée et le saut est dit", () => {
  const etapes = job("kit-tests")
    .split("steps:")[1]
    .split(/\n {6}- /)
    .slice(1);
  assert.ok(etapes.length >= 5);
  const annonce = etapes.filter((e) => /if: \$\{\{ !matrix\.tester \}\}/.test(e));
  assert.equal(annonce.length, 1, "une étape annonce les tests non lancés");
  assert.match(annonce[0], /::notice::/);
  for (const e of etapes.filter((x) => !annonce.includes(x))) assert.match(e, /^(?: {8})?if: \$\{\{ matrix\.tester \}\}$/m, e);
});

test("QUA-045 : le calcul lit tout le diff de la PR, et l'alerte de master suit toujours kit-tests", () => {
  const calcul = job("matrice-os");
  assert.match(calcul, /fetch-depth: 0/);
  assert.match(calcul, /github\.event\.pull_request\.base\.sha/);
  assert.match(calcul, /github\.event\.pull_request\.head\.sha/);
  assert.match(calcul, /node \.github\/scripts\/ci-multi-os\.mjs/);
  assert.match(job("alert-if-ci-broken"), /needs: \[checks, kit-tests\]/);
  assert.match(WORKFLOW, /^on: \[push, pull_request\]$/m);
});

test("QUA-045 : les dépendances npm sont mises en cache partout où elles s'installent", () => {
  for (const nom of ["checks", "kit-tests"]) {
    const j = job(nom);
    const installe = j.indexOf("npm ci");
    assert.ok(installe > 0, nom);
    assert.match(j.slice(0, installe), /cache: npm/, nom);
  }
});
