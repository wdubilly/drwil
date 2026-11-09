// Montée de version sûre : `init` refuse la mauvaise version, la montée ne laisse aucun `.bak` (QUA-282), garde le CI (QUA-283), les fichiers du projet (QUA-284) et les réglages (QUA-285), traite les fichiers modifiés (QUA-286) ; `doctor` signale après coup ce qu'une montée a supprimé (QUA-287).
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { doctor, init } from "../dist/index.js";
import { engineVersion } from "../dist/install-record.js";
import { confirmCiWith } from "../dist/ci-zone.js";
import { confirmDriftWith } from "../dist/drift.js";

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
  git(dir, "config", "user.email", "t@t");
  git(dir, "config", "user.name", "t");
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

const PROJET = ["AGENTS.md", "docs/recipes/run-locally.md", "docs/intentions/README.md", "docs/contracts-catalog.md"];
const sorties = async (fn) => {
  const [log, warn, lignes] = [console.log, console.warn, []];
  console.log = console.warn = (...a) => lignes.push(a.join(" "));
  try {
    await fn();
    return lignes;
  } finally {
    console.log = log;
    console.warn = warn;
  }
};

test("QUA-284 : AGENTS.md, une recette, l'index des intentions et le catalogue modifiés sont identiques après init, même sur oui", async () => {
  const dir = await projetEquipe();
  for (const f of PROJET) appendFileSync(join(dir, f), "\nPropre au projet.\n");
  const avant = PROJET.map((f) => readFileSync(join(dir, f), "utf8"));
  const proposes = [];
  const vus = await sorties(() =>
    init({ lang: "fr", targetDir: dir, name: "demo", git: false, confirmDrift: (rel) => !!proposes.push(rel) }),
  );
  assert.deepEqual(proposes, []);
  assert.deepEqual(
    PROJET.map((f) => readFileSync(join(dir, f), "utf8")),
    avant,
  );
  assert.ok(!vus.some((l) => PROJET.some((f) => l.includes(`- ${f}`))), "ni proposés ni signalés comme à décider");
});

test("QUA-285 : init garde les clés du projet de .drwil/ia-first.json, remet à jour celles du kit et ne touche pas .drwil/state.json", async () => {
  const dir = await projetEquipe();
  const chemin = join(dir, ".drwil/ia-first.json");
  const config = JSON.parse(readFileSync(chemin, "utf8"));
  const propres = {
    risk: "HIGH",
    extraCodeGlobs: ["*.sql"],
    checks: [{ id: "mien", name: "le mien", run: "node -v" }],
    cleInconnue: { a: 1 },
  };
  writeFileSync(chemin, JSON.stringify({ ...config, ...propres, tools: ["codex"], projectName: "autre" }));
  const etat = JSON.stringify({ activity: "BUILD" });
  writeFileSync(join(dir, ".drwil/state.json"), etat);
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, tools: "claude" }));
  const apres = JSON.parse(readFileSync(chemin, "utf8"));
  assert.equal(apres.risk, "HIGH");
  assert.deepEqual(apres.extraCodeGlobs, ["*.sql"]);
  assert.deepEqual(apres.cleInconnue, { a: 1 });
  assert.ok(apres.checks.some((c) => c.id === "mien"));
  assert.deepEqual(apres.tools, ["claude"]);
  assert.equal(apres.projectName, "demo");
  assert.equal(readFileSync(join(dir, ".drwil/state.json"), "utf8"), etat);
});

test("QUA-285 : une clé que le projet n'a pas encore reçoit une valeur sûre, jamais bloquante", async () => {
  const dir = await projetEquipe();
  const chemin = join(dir, ".drwil/ia-first.json");
  const config = JSON.parse(readFileSync(chemin, "utf8"));
  delete config.scopeGate;
  delete config.newRequirements;
  writeFileSync(chemin, JSON.stringify(config));
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  const apres = JSON.parse(readFileSync(chemin, "utf8"));
  assert.equal(apres.scopeGate, "warning");
  assert.equal(apres.newRequirements, "warning");
});

test("QUA-286 : resolve-drift n'existe plus, ni dans l'aide ni en commande", async () => {
  const dir = await projetEquipe();
  const aide = cli(dir, "--help");
  assert.doesNotMatch(aide.stdout, /resolve-drift/);
  const r = cli(dir, "resolve-drift");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /unknown command/);
});

test("QUA-286 : un fichier du kit modifié à la main est montré en diff et remplacé sur le oui, sans .bak ; sans oui il reste intact et est signalé", async () => {
  const dir = await projetEquipe();
  const cible = ".githooks/check-docs.mjs";
  const original = readFileSync(join(dir, cible), "utf8");
  const modifie = `// personnalisé par le projet\n${original}`;
  writeFileSync(join(dir, cible), modifie);
  const relance = (confirmDrift) => sorties(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, confirmDrift }));

  const sansTerminal = await relance(undefined);
  assert.equal(readFileSync(join(dir, cible), "utf8"), modifie);
  assert.ok(sansTerminal.some((l) => l.includes(`- ${cible}`)) && sansTerminal.some((l) => l.includes("npx drwil init")));
  await relance(() => false);
  assert.equal(readFileSync(join(dir, cible), "utf8"), modifie, "refusé : intact");

  const vus = [];
  let diff = "";
  await relance((rel, d) => {
    vus.push(rel);
    diff = d;
    return true;
  });
  assert.deepEqual(vus, [cible]);
  assert.match(diff, /^- \/\/ personnalisé par le projet$/m);
  assert.equal(readFileSync(join(dir, cible), "utf8"), original);
  assert.ok(!existsSync(join(dir, `${cible}.bak`)), "aucun .bak");

  writeFileSync(join(dir, cible), modifie);
  let appele = false;
  await sorties(() =>
    init({
      lang: "fr",
      targetDir: dir,
      name: "demo",
      git: false,
      force: true,
      confirmDrift: () => {
        appele = true;
        return true;
      },
    }),
  );
  assert.ok(!appele, "--force ne demande rien");
  assert.equal(readFileSync(join(dir, cible), "utf8"), original);
});

test("QUA-286 : la confirmation au terminal montre le diff (coupé au-delà de 60 lignes) et n'accepte que oui", async () => {
  const questions = [];
  const diff = Array.from({ length: 65 }, (_, i) => `- ligne ${i}`).join("\n");
  assert.equal(
    await confirmDriftWith(async (q) => {
      questions.push(q);
      return "oui";
    })("a.mjs", diff),
    true,
  );
  assert.equal(await confirmDriftWith(async () => "")("a.mjs", "- x"), false);
  assert.match(questions[0], /a\.mjs.*\n- ligne 0\n[\s\S]*- ligne 59\n… \(5\)\n/);
});

const traces = async (dir) => (await doctor({ targetDir: dir })).points.find((p) => p.id === "upgrade");

test("QUA-287 : doctor signale un fichier du kit disparu, un .bak laissé, une stack vide et un CI sans zone du projet", async () => {
  const dir = tmp();
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "github" }));
  assert.equal((await traces(dir)).state, "ok");
  const manifeste = Object.keys(JSON.parse(readFileSync(join(dir, ".drwil/installed-files.json"), "utf8")));
  const kit = manifeste.find((f) => f.startsWith(".githooks/") && f.endsWith(".mjs"));
  rmSync(join(dir, kit));
  writeFileSync(join(dir, "docs/contracts-catalog.md.bak"), "ancien");
  const config = JSON.parse(readFileSync(join(dir, ".drwil/ia-first.json"), "utf8"));
  const ci = config.ciFiles[0];
  writeFileSync(join(dir, ci), readFileSync(join(dir, ci), "utf8").replaceAll("drwil-project-", "x-"));
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config, stack: [], layers: ["app"] }));
  const point = await traces(dir);
  assert.equal(point.state, "warning");
  for (const attendu of [kit, "docs/contracts-catalog.md.bak", "stack vide", ci]) assert.ok(point.detail.includes(attendu), attendu);
});

test("QUA-287 : doctor nomme au plus cinq fichiers du kit disparus et reste sain (avertissement seul)", async () => {
  const dir = await projetEquipe();
  const manifeste = Object.keys(JSON.parse(readFileSync(join(dir, ".drwil/installed-files.json"), "utf8")));
  for (const f of manifeste.filter((f) => f.startsWith("docs/recipes/")).slice(0, 7)) rmSync(join(dir, f));
  const point = await traces(dir);
  assert.match(point.detail, /7 fichier\(s\) du kit .*…/);
});

test("QUA-287 : scénario de montée dans un dépôt git : les données du projet survivent, le point de doctor reste sain", async () => {
  const dir = tmp();
  git(dir, "init", "-q", "-b", "master");
  git(dir, "config", "core.autocrlf", "false");
  git(dir, "config", "user.email", "t@t");
  git(dir, "config", "user.name", "t");
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  enregistrer(dir, "0.10.0");
  const config = JSON.parse(readFileSync(join(dir, ".drwil/ia-first.json"), "utf8"));
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config, risk: "HIGH", scopeGate: undefined }));
  appendFileSync(join(dir, "AGENTS.md"), "\nPropre au projet.\n");
  assert.equal(git(dir, "add", "-A").status, 0);
  assert.equal(git(dir, "commit", "-q", "-m", "kit 0.10.0").status, 0);
  const r = cli(dir, "init", "--tools", "claude");
  assert.equal(r.status, 0, r.stderr);
  const apres = JSON.parse(readFileSync(join(dir, ".drwil/ia-first.json"), "utf8"));
  assert.equal(apres.risk, "HIGH");
  assert.equal(apres.scopeGate, "warning");
  assert.match(readFileSync(join(dir, "AGENTS.md"), "utf8"), /Propre au projet\./);
  assert.equal((await traces(dir)).state, "ok");
});
