import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./check-control-coverage.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
function projet(cfg, fichiers = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-ci-coverage-"));
  dossiers.push(dir);
  const tout = cfg === null ? fichiers : { ".drwil/ia-first.json": typeof cfg === "string" ? cfg : JSON.stringify(cfg), ...fichiers };
  for (const [chemin, contenu] of Object.entries(tout)) {
    mkdirSync(dirname(join(dir, chemin)), { recursive: true });
    writeFileSync(join(dir, chemin), contenu);
  }
  return spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8" });
}

const GITHUB = "name: ci\non: [push]\njobs:\n  checks:\n    runs-on: ubuntu-latest\n  autre:\n    runs-on: ubuntu-latest\nenv:\n  A: 1\n";

test("sans configuration, sans CI ou fichier CI absent : rien à vérifier", () => {
  assert.equal(projet(null).status, 0);
  assert.equal(projet("{illisible").status, 0);
  assert.equal(projet({ ciFiles: "pas une liste", checks: "non plus" }).status, 0);
  assert.equal(projet({ ciFiles: [".github/workflows/absent.yml"] }).status, 0);
});

test("GitHub sans filtre de chemins : chaque job couvre tout", () => {
  const r = projet(
    { ciFiles: [".github/workflows/ci.yml"], checks: [{ id: "tests", paths: ["src/**"], ciJob: "checks" }, { id: "sans-job" }] },
    { ".github/workflows/ci.yml": GITHUB },
  );
  assert.equal(r.status, 0, r.stdout);
});

test("GitHub : job absent, aucun chemin, filtre paths qui ne couvre pas (dégradable signalé)", () => {
  const workflow =
    "on:\n  push:\n    paths:\n      - 'src/**'\n      - \"docs/**\"\n    branches: [main]\nname: ci\njobs:\n  checks:\n    runs-on: x\n";
  const r = projet(
    {
      lang: "fr",
      ciFiles: [".github/workflows/ci.yml"],
      checks: [
        { id: "fantome", paths: ["a"], ciJob: "inexistant" },
        { id: "vide", paths: [], ciJob: "checks" },
        { id: "src", paths: ["src/*.js"], ciJob: "checks" },
      ],
    },
    { ".github/workflows/ci.yml": workflow },
  );
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Contrôles \(QUA-013\)/);
  assert.match(r.stdout, /fantome : job CI « inexistant » absent/);
  assert.match(r.stdout, /vide : aucun chemin déclaré/);
  assert.match(
    r.stdout,
    /secrets : le job CI « checks » .* ne se déclenche pas sur `\*\*` \(changes : src\/\*\*, docs\/\*\*\) ; dégradable/,
  );
  assert.doesNotMatch(r.stdout, /src : le job/);
});

test("GitLab : rules: changes par job, en anglais", () => {
  const gitlab = [
    "stages:",
    "  - test",
    "checks:",
    "  script: run",
    "  rules:",
    "    - changes:",
    '        - "src/**"',
    "      when: always",
    "toujours:",
    "  script: run",
    "# commentaire de fin",
    "",
  ].join("\n");
  const r = projet(
    {
      lang: "en",
      ciFiles: [".gitlab-ci.yml"],
      checks: [
        { id: "src", paths: ["src/**"], ciJob: "checks" },
        { id: "large", paths: ["**"], ciJob: "toujours" },
        { id: "vide", ciJob: "toujours" },
        { id: "fantome", paths: ["a"], ciJob: "inexistant" },
      ],
    },
    { ".gitlab-ci.yml": gitlab },
  );
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Checks \(QUA-013\)/);
  assert.match(r.stdout, /secrets: CI job "checks" \(\.gitlab-ci\.yml\) does not trigger on `\*\*` \(changes: src\/\*\*\); degradable/);
  assert.match(r.stdout, /vide: no path declared/);
  assert.match(r.stdout, /fantome: CI job "inexistant" missing from \.gitlab-ci\.yml/);
  assert.doesNotMatch(r.stdout, /src: CI job|large: CI job/);
});

test("GitLab : job à rules sans changes, en anglais : « none »", () => {
  const r = projet({ lang: "en", ciFiles: [".gitlab-ci.yml"] }, { ".gitlab-ci.yml": "checks:\n  rules:\n    - if: $CI\n" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\(changes: none\)/);
});

test("GitHub en français : « aucun » quand le job n'a aucun déclencheur connu", () => {
  const r = projet({ ciFiles: [".gitlab-ci.yml"] }, { ".gitlab-ci.yml": "checks:\n  rules:\n    - when: manual\n" });
  assert.match(r.stdout, /\(changes : aucun\)/);
});
