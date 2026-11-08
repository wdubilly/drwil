// Montée de version sûre : `init` refuse la mauvaise version, la montée ne laisse aucun `.bak` (QUA-282).
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "../dist/index.js";
import { engineVersion } from "../dist/install-record.js";
import { confirmCiWith } from "../dist/ci-zone.js";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];
const env = { ...process.env, CI: "", DRWIL_HOOK: "" };
const BIN = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));

let dossiers = [];
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-montee-"));
  dossiers.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dossiers) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

const silence = async (fn) => {
  const [log, warn] = [console.log, console.warn];
  console.log = console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
    console.warn = warn;
  }
};
const git = (dir, ...args) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, encoding: "utf8", env });
const cli = (dir, ...args) => spawnSync(process.execPath, [BIN, ...args], { cwd: dir, encoding: "utf8", env });
const enregistrer = (dir, version) =>
  writeFileSync(join(dir, ".drwil/install.json"), JSON.stringify({ format: 1, version, firstVersion: version }));

async function projetEquipe() {
  const dir = tmp();
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  return dir;
}

test("QUA-282 : init refuse une version plus ancienne que celle de .drwil/install.json, sans rien écrire", async () => {
  const dir = await projetEquipe();
  enregistrer(dir, "99.0.0");
  const avant = readFileSync(join(dir, ".drwil/install.json"), "utf8");
  const r = cli(dir, "init", "--no-git", "--tools", "claude");
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, /Montée refusée, rien n'a été modifié.*99\.0\.0.*plus ancienne.*npx drwil@99\.0\.0 init.*--allow-older/s);
  assert.equal(readFileSync(join(dir, ".drwil/install.json"), "utf8"), avant);
});

test("QUA-282 : l'option --allow-older passe outre ; sans enregistrement ou version égale ou plus récente, aucun refus", async () => {
  const dir = await projetEquipe();
  enregistrer(dir, "99.0.0");
  assert.equal(cli(dir, "init", "--no-git", "--tools", "claude", "--allow-older").status, 0);
  assert.equal(JSON.parse(readFileSync(join(dir, ".drwil/install.json"), "utf8")).version, engineVersion());
  assert.equal(cli(dir, "init", "--no-git", "--tools", "claude").status, 0, "version égale");
  enregistrer(dir, "0.0.1");
  assert.equal(cli(dir, "init", "--no-git", "--tools", "claude").status, 0, "version plus récente");
  rmSync(join(dir, ".drwil/install.json"));
  assert.equal(cli(dir, "init", "--no-git", "--tools", "claude").status, 0, "sans enregistrement");
});

test("QUA-282 : --target-version refuse une version différente de celle de la commande", async () => {
  const dir = await projetEquipe();
  const r = cli(dir, "init", "--no-git", "--tools", "claude", "--target-version", "99.0.0");
  assert.equal(r.status, 1);
  assert.match(r.stderr, new RegExp(`la version visée est 99\\.0\\.0 et cette commande est en ${engineVersion().replaceAll(".", "\\.")}`));
  assert.equal(cli(dir, "init", "--no-git", "--tools", "claude", "--target-version", engineVersion()).status, 0);
});

test("QUA-282 : la montée vers la version courante, commitée sur sa branche, ne laisse aucun .bak", async () => {
  const dir = tmp();
  git(dir, "init", "-q", "-b", "master");
  git(dir, "config", "core.autocrlf", "false");
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  enregistrer(dir, "0.0.1");
  assert.equal(git(dir, "add", "-A").status, 0);
  assert.equal(git(dir, "commit", "-q", "-m", "kit ancien").status, 0);
  const r = cli(dir, "init", "--tools", "claude");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(dir, "symbolic-ref", "--short", "HEAD").stdout.trim(), "workstream/kit-update");
  assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "");
  const suivis = git(dir, "ls-files").stdout.split("\n");
  assert.deepEqual(
    suivis.filter((f) => f.endsWith(".bak")),
    [],
  );
  assert.deepEqual(
    readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith(".bak")),
    [],
  );
});

// Zone du projet du CI (QUA-283) : jeu d'essai tiré de drwil_walk (étape et job ajoutés par le projet).
const FICHIER_CI = { github: ".github/workflows/ia-first.yml", gitlab: ".gitlab-ci.yml" };
const AJOUTS = {
  github: {
    steps: ["      - name: Étape du projet", "        run: npm run lint-projet"],
    jobs: ["  deploiement-projet:", "    runs-on: ubuntu-latest", "    steps:", "      - run: echo deploy"],
  },
  gitlab: {
    steps: ["    - npm run lint-projet"],
    jobs: ["deploiement-projet:", "  stage: test", "  script:", "    - echo deploy"],
  },
};
const poser = (texte, zone, lignes) => texte.replace(new RegExp(`(# drwil-project-begin ${zone}\\r?\\n)`), `$1${lignes.join("\n")}\n`);

async function avertissements(fn) {
  const [log, warn] = [console.log, console.warn];
  const vus = [];
  console.log = () => {};
  console.warn = (m) => vus.push(String(m));
  try {
    await fn();
  } finally {
    console.log = log;
    console.warn = warn;
  }
  return vus;
}

async function projetCi(ci, extra = {}) {
  const dir = tmp();
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci, tools: "claude", ...extra }));
  return dir;
}

for (const ci of ["github", "gitlab"]) {
  test(`QUA-283 : init garde la zone du projet du CI ${ci} et remet le reste au gabarit`, async () => {
    const dir = await projetCi(ci);
    const chemin = join(dir, FICHIER_CI[ci]);
    const gabarit = readFileSync(chemin, "utf8");
    assert.match(gabarit, /# drwil-project-begin steps[\s\S]*# drwil-project-end steps/);
    assert.match(gabarit, /# drwil-project-begin jobs[\s\S]*# drwil-project-end jobs/);
    const modifie = poser(poser(gabarit, "steps", AJOUTS[ci].steps), "jobs", AJOUTS[ci].jobs)
      .replace("node:24", "node:99")
      .replace("ubuntu-latest", "ubuntu-ancien");
    writeFileSync(chemin, modifie);
    const vus = await avertissements(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci, tools: "claude" }));
    const apres = readFileSync(chemin, "utf8");
    for (const l of [...AJOUTS[ci].steps, ...AJOUTS[ci].jobs]) assert.ok(apres.includes(l), l);
    assert.equal(apres, poser(poser(gabarit, "steps", AJOUTS[ci].steps), "jobs", AJOUTS[ci].jobs), "hors zone : conforme au gabarit");
    assert.match(vus.join("\n"), /réécrit hors de la zone du projet/);
    assert.deepEqual(await avertissements(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci, tools: "claude" })), []);
    assert.equal(readFileSync(chemin, "utf8"), apres, "rejouer ne change rien");
  });
}

test("QUA-283 : un CI sans marqueurs reste intact tant que rien n'est confirmé, et nomme ce qui disparaîtrait", async () => {
  const dir = await projetCi("github");
  const chemin = join(dir, FICHIER_CI.github);
  const sansMarqueurs = [
    ...readFileSync(chemin, "utf8")
      .split("\n")
      .filter((l) => !l.includes("drwil-project-")),
    "  mon-deploiement:",
    "    runs-on: x",
    "    steps:",
    "      - name: Publier",
    "        run: echo p",
    "",
  ].join("\n");
  writeFileSync(chemin, sansMarqueurs);
  const vus = await avertissements(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "github", tools: "claude" }));
  assert.equal(readFileSync(chemin, "utf8"), sansMarqueurs);
  assert.match(vus.join("\n"), /ia-first\.yml n'a pas de zone du projet.*supprimerait mon-deploiement, Publier/s);
  let demande = null;
  await silence(() =>
    init({
      lang: "fr",
      targetDir: dir,
      name: "demo",
      git: false,
      ci: "github",
      tools: "claude",
      confirmCi: async (rel, noms, lignes) => {
        demande = { rel, noms, lignes };
        return false;
      },
    }),
  );
  assert.equal(readFileSync(chemin, "utf8"), sansMarqueurs, "refus : rien ne change");
  assert.deepEqual(demande.noms, ["mon-deploiement", "Publier", "3"]);
  assert.ok(demande.lignes.includes("  mon-deploiement:"));
  await silence(() =>
    init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "github", tools: "claude", confirmCi: async () => true }),
  );
  const apres = readFileSync(chemin, "utf8");
  assert.ok(!apres.includes("mon-deploiement") && apres.includes("# drwil-project-begin jobs"), "confirmé : gabarit, zone vide");
});

test("QUA-283 : un CI sans marqueurs tel qu'installé est remis au gabarit sans question", async () => {
  const dir = await projetCi("gitlab");
  const chemin = join(dir, FICHIER_CI.gitlab);
  const ancien = readFileSync(chemin, "utf8")
    .split("\n")
    .filter((l) => !l.includes("drwil-project-"))
    .join("\n")
    .replace("node:24", "node:20");
  writeFileSync(chemin, ancien);
  const manifeste = join(dir, ".drwil/installed-files.json");
  const donnees = JSON.parse(readFileSync(manifeste, "utf8"));
  const cle = Object.keys(donnees.files ?? donnees).find((k) => k.endsWith(".gitlab-ci.yml"));
  assert.ok(cle, "le CI est enregistré dans le manifeste");
  (donnees.files ?? donnees)[cle] = createHash("sha256").update(ancien).digest("hex");
  writeFileSync(manifeste, JSON.stringify(donnees));
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "gitlab", tools: "claude" }));
  const apres = readFileSync(chemin, "utf8");
  assert.ok(apres.includes("node:24") && apres.includes("# drwil-project-begin steps"));
});

test("QUA-283 : la confirmation au terminal montre le diff et n'accepte que oui", async () => {
  const questions = [];
  const lignes = Array.from({ length: 45 }, (_, i) => `ligne ${i}`);
  const oui = await confirmCiWith(async (q) => {
    questions.push(q);
    return "o";
  })("ci.yml", ["a", "3"], lignes);
  const non = await confirmCiWith(async () => "")("ci.yml", [], []);
  assert.equal(oui, true);
  assert.equal(non, false);
  assert.match(questions[0], /ci\.yml.*\n- ligne 0\n[\s\S]*- ligne 39\n… \(5\)\n/);
});

test("QUA-283 : hors zone, une ligne modifiée à la main est réécrite et signalée", async () => {
  const dir = await projetCi("github");
  const chemin = join(dir, FICHIER_CI.github);
  writeFileSync(chemin, readFileSync(chemin, "utf8").replace("  checks:", "  checks-maison:"));
  const vus = await avertissements(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "github", tools: "claude" }));
  assert.match(vus.join("\n"), /réécrit hors de la zone du projet.*checks-maison/);
  assert.ok(readFileSync(chemin, "utf8").includes("  checks:"));
});
