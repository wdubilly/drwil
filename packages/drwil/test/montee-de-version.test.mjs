// Montée de version sûre : `init` refuse la mauvaise version, la montée ne laisse aucun `.bak` (QUA-282), garde le CI (QUA-283), les fichiers du projet (QUA-284) et les réglages (QUA-285), traite les fichiers modifiés (QUA-286) ; `doctor` signale après coup ce qu'une montée a supprimé (QUA-287) ; l'installation dans un dépôt existant, commitée sur sa branche (QUA-206).
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { doctor, formatPreview, init, previewInit } from "../dist/index.js";
import { engineVersion } from "../dist/install-record.js";
import { placeProject, shippedPrints } from "../dist/ci-zone-move.js";
import { SHIPPED_CI } from "../dist/ci-zone.js";
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
// Lignes d'une zone du projet (entre ses marqueurs), null sans zone.
const zone = (texte, nom) => {
  const l = texte.split("\n");
  const [de, a] = [
    l.findIndex((x) => x.trim() === `# drwil-project-begin ${nom}`),
    l.findIndex((x) => x.trim() === `# drwil-project-end ${nom}`),
  ];
  return de < 0 || a < de ? null : l.slice(de + 1, a);
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

test("QUA-283 : un CI sans marqueurs modifié : ses jobs du projet sont replacés dans la zone et nommés, sans question", async () => {
  const dir = await projetCi("github");
  const chemin = join(dir, FICHIER_CI.github);
  const job = ["  mon-deploiement:", "    runs-on: x", "    steps:", "      - name: Publier", "        run: echo p"];
  const sansMarqueurs = [
    ...readFileSync(chemin, "utf8")
      .split("\n")
      .filter((l) => !l.includes("drwil-project-")),
    ...job,
    "",
  ].join("\n");
  writeFileSync(chemin, sansMarqueurs);
  const sortie = await sortieDe(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "github", tools: "claude" }));
  const apres = readFileSync(chemin, "utf8");
  assert.deepEqual(
    zone(apres, "jobs").filter((l) => !l.trim().startsWith("#")),
    ["", ...job],
    "replacé dans la zone jobs",
  );
  assert.match(sortie, /ia-first\.yml : replacé\(s\) dans la zone du projet : mon-deploiement/);
  assert.doesNotMatch(sortie, /n'a pas de zone|branche de mise à jour/);
  assert.doesNotMatch(
    await sortieDe(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "github", tools: "claude" })),
    /replacé|réécrit hors/,
  );
  assert.equal(readFileSync(chemin, "utf8"), apres, "rejouer ne change rien");
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

test("QUA-283 : hors zone, un job du kit renommé à la main devient un job du projet, replacé dans la zone ; le job du kit est remis", async () => {
  const dir = await projetCi("github");
  const chemin = join(dir, FICHIER_CI.github);
  writeFileSync(chemin, readFileSync(chemin, "utf8").replace("  checks:", "  checks-maison:"));
  const sortie = await sortieDe(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "github", tools: "claude" }));
  assert.match(sortie, /replacé\(s\) dans la zone du projet : checks-maison/);
  const apres = readFileSync(chemin, "utf8");
  assert.ok(apres.includes("\n  checks:\n") && zone(apres, "jobs").includes("  checks-maison:"));
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

// Dépôt d'un projet existant (commits sur main, sans kit) : init y coupe sa branche et commite le kit (QUA-206, D-a).
function depotExistant() {
  const dir = tmp();
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "core.autocrlf", "false");
  git(dir, "config", "user.email", "t@t");
  git(dir, "config", "user.name", "t");
  writeFileSync(join(dir, "README.md"), "# projet existant\n");
  // Fichiers du projet que init complète sans les écraser : hors manifeste, notés à part pour la barrière (QUA-238).
  writeFileSync(join(dir, ".gitignore"), "/node_modules\n");
  writeFileSync(join(dir, "AGENTS.md"), "# Mon projet\nRègles maison.\n");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "app", dependencies: { react: "18" } }, null, 2));
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-q", "-m", "projet").status, 0);
  return dir;
}

const sortieDe = async (fn) => {
  const [log, warn] = [console.log, console.warn];
  const lignes = [];
  console.log = console.warn = (...a) => lignes.push(a.join(" "));
  try {
    await fn();
    return lignes.join("\n");
  } finally {
    console.log = log;
    console.warn = warn;
  }
};

test("QUA-206 : init sur un dépôt existant sans kit coupe workstream/kit-installation depuis la principale et y commite le kit ; la barrière l'accepte en SCOPING", async () => {
  const dir = depotExistant();
  const principale = git(dir, "rev-parse", "main").stdout;
  const sortie = await sortieDe(() => init({ lang: "fr", targetDir: dir, name: "demo" }));
  assert.equal(git(dir, "symbolic-ref", "--short", "HEAD").stdout.trim(), "workstream/kit-installation", sortie);
  assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "", `arbre propre : la barrière a accepté le commit\n${sortie}`);
  assert.equal(git(dir, "rev-parse", "HEAD^").stdout, principale, "coupée depuis la branche principale");
  assert.equal(git(dir, "rev-parse", "main").stdout, principale, "la principale reste intacte");
  assert.match(git(dir, "log", "-1", "--format=%B").stdout, /^Drwil-Kit-Update: \d+\.\d+\.\d+$/m);
  assert.ok(git(dir, "ls-files", ".githooks/state.mjs").stdout.includes("state.mjs"), "kit suivi");
  assert.match(sortie, /Fait : kit .* installé et commité sur la branche « workstream\/kit-installation »/);
  assert.match(sortie, /pull request.*\n.*gh pr create --base main/, "dit de fusionner par une PR");
  const barriere = await import(`${pathToFileURL(join(dir, ".githooks/scope-gate.mjs")).href}?${Date.now()}`);
  const cfg = JSON.parse(readFileSync(join(dir, ".drwil/ia-first.json"), "utf8"));
  const rejeu = barriere.checkScope(dir, { cfg, env: { DRWIL_BASE: "main" } });
  assert.deepEqual([rejeu.status, rejeu.problems], ["ok", []]);
});

test("QUA-206 : installation sur un dépôt existant refusée avant d'écrire : arbre sale, branche d'installation déjà là", async () => {
  const dir = depotExistant();
  const etat = () =>
    [git(dir, "rev-parse", "HEAD").stdout, git(dir, "status", "--porcelain").stdout, existsSync(join(dir, ".drwil"))].join("|");
  const refus = async () => {
    try {
      await silence(() => init({ lang: "fr", targetDir: dir, name: "demo" }));
    } catch (e) {
      return e.message;
    }
    return assert.fail("refus attendu");
  };
  writeFileSync(join(dir, "notes.txt"), "à moi\n");
  const sale = etat();
  assert.match(await refus(), /Installation refusée.*arbre de travail n'est pas propre.*git stash/);
  assert.equal(etat(), sale, "rien n'a été écrit");
  rmSync(join(dir, "notes.txt"));
  git(dir, "branch", "workstream/kit-installation");
  const avant = etat();
  assert.match(await refus(), /« workstream\/kit-installation » existe déjà.*git branch -D/);
  assert.equal(etat(), avant, "rien n'a été écrit");
  git(dir, "branch", "-q", "-D", "workstream/kit-installation");
  // Une branche « workstream » empêche git de créer « workstream/kit-installation » : refus dit, rien d'écrit.
  git(dir, "branch", "workstream");
  assert.match(await refus(), /« workstream\/kit-installation » n'a pas pu être créée/);
  assert.equal(etat(), avant, "rien n'a été écrit");
  assert.equal(git(dir, "symbolic-ref", "--short", "HEAD").stdout.trim(), "main");
  // La cause levée, l'installation passe ; en anglais, son sujet aussi.
  git(dir, "branch", "-q", "-D", "workstream");
  await silence(() => init({ lang: "en", targetDir: dir, name: "demo" }));
  assert.match(git(dir, "log", "-1", "--format=%s").stdout, /^Install the drwil kit \d+\.\d+\.\d+/);
  assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "");
});

// Jobs et stages du projet hors zone (QUA-283, D-c) : cas réel de marinade-poulet (kit 0.11.1, fichier balisé, sans zone
// `stages`), son job `build`, ses stages `build`/`deploy` et ses clés globales posées dans la zone `jobs`.
const BUILD = [
  "build:",
  "  stage: build",
  "  image: node:24",
  "  script:",
  "    - npm ci",
  "    - npm run build",
  '    - echo "Build successful"',
];
const BUILD_FIN = ["  artifacts:", "    expire_in: 1 hour", "    paths:", "      - build", "  only:", "    - main"];
const GLOBALES = ["variables:", '  ONNXRUNTIME_NODE_INSTALL: "skip"', "", "default:", "  before_script:", "    - npm ci"];
const marinade = (kit) =>
  poser(kit, "jobs", GLOBALES).replace(
    /^stages:\n(?:.*\n)*?\n/m,
    ["stages:", "  - test", "  - build", "  - deploy", "", ...BUILD, ...BUILD_FIN, "", ""].join("\n"),
  );

test("QUA-283 : GitLab balisé, job et stages du projet hors zone (cas marinade-poulet) : replacés et nommés, rien perdu, rejeu sans effet", async () => {
  const dir = await projetCi("gitlab");
  const chemin = join(dir, FICHIER_CI.gitlab);
  const kit = readFileSync(chemin, "utf8");
  assert.ok(zone(kit, "stages"), "le gabarit GitLab a une zone stages");
  writeFileSync(chemin, marinade(kit));
  const sortie = await sortieDe(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "gitlab", tools: "claude" }));
  const apres = readFileSync(chemin, "utf8");
  assert.deepEqual(
    zone(apres, "stages").filter((l) => !l.trim().startsWith("#")),
    ["  - build", "  - deploy"],
  );
  const jobs = zone(apres, "jobs").join("\n");
  for (const l of [...GLOBALES, ...BUILD, ...BUILD_FIN]) assert.ok(jobs.includes(l), `perdue : ${l}`);
  assert.equal(apres.match(/^ {2}- test$/gm).length, 1, "le stage test du kit n'est pas doublé");
  assert.match(sortie, /\.gitlab-ci\.yml : replacé\(s\) dans la zone du projet : build, stage build, stage deploy\./);
  assert.doesNotMatch(sortie, /branche de mise à jour/, "aucune branche : le message n'en cite pas");
  assert.doesNotMatch(
    await sortieDe(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "gitlab", tools: "claude" })),
    /replacé|réécrit hors/,
  );
  assert.equal(readFileSync(chemin, "utf8"), apres, "rejouer ne change rien");
});

test("QUA-283 : GitHub balisé, un job du projet hors zone est replacé dans la zone jobs", async () => {
  const dir = await projetCi("github");
  const chemin = join(dir, FICHIER_CI.github);
  const job = ["  deploiement-hors-zone:", "    runs-on: ubuntu-latest", "    steps:", "      - run: echo d"];
  writeFileSync(chemin, `${readFileSync(chemin, "utf8").trimEnd()}\n${job.join("\n")}\n`);
  const sortie = await sortieDe(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "github", tools: "claude" }));
  assert.match(sortie, /replacé\(s\) dans la zone du projet : deploiement-hors-zone/);
  assert.ok(zone(readFileSync(chemin, "utf8"), "jobs").join("\n").includes(job.join("\n")));
});

// Dépôt minimal (constat c) : son propre .gitlab-ci.yml, sans balises ; avant, l'installation refusait d'y toucher.
const CI_PROJET = [
  "stages:",
  "  - build",
  "  - test",
  "",
  "image: node:20",
  "",
  ...BUILD.slice(0, 2),
  "  script:",
  "    - npm run build",
  "",
  "unit:",
  "  stage: test",
  "  script:",
  "    - npm test",
  "",
];

test("QUA-283 : installation sur un dépôt existant au CI GitLab sans balises : kit installé, jobs et stages du projet dans la zone, commit sur la branche d'installation", async () => {
  const dir = depotExistant();
  writeFileSync(join(dir, ".gitlab-ci.yml"), CI_PROJET.join("\n"));
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-q", "-m", "ci du projet").status, 0);
  const sortie = await sortieDe(() => init({ lang: "fr", targetDir: dir, name: "demo", ci: "gitlab", tools: "claude" }));
  const apres = readFileSync(join(dir, ".gitlab-ci.yml"), "utf8");
  assert.match(apres, /^checks:$/m, sortie);
  assert.deepEqual(
    zone(apres, "stages").filter((l) => !l.trim().startsWith("#")),
    ["  - build"],
  );
  const jobs = zone(apres, "jobs").join("\n");
  for (const l of ["image: node:20", "build:", "    - npm run build", "unit:", "    - npm test"])
    assert.ok(jobs.includes(l), `perdue : ${l}`);
  assert.match(sortie, /replacé\(s\) dans la zone du projet : image, build, unit, stage build\./);
  assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "", sortie);
});

test("QUA-283 : l'aperçu (init --dry-run) n'annonce plus le job checks manquant d'un CI qu'init réécrit ; il l'annonce si une clé en conflit garde le fichier", async () => {
  const dir = tmp();
  const chemin = join(dir, ".gitlab-ci.yml");
  const manqueCi = async () => {
    const a = await previewInit({ lang: "fr", targetDir: dir, ci: "gitlab", tools: "claude", git: false });
    return { gap: a.gaps.some((g) => g.kind === "ci"), texte: formatPreview(a) };
  };
  writeFileSync(chemin, CI_PROJET.join("\n"));
  const reecrit = await manqueCi();
  assert.equal(reecrit.gap, false, reecrit.texte);
  assert.doesNotMatch(reecrit.texte, /job `checks` absent/);
  writeFileSync(chemin, [...CI_PROJET, "", "workflow:", "  name: projet"].join("\n"));
  const garde = await manqueCi();
  assert.equal(garde.gap, true, garde.texte);
  assert.match(garde.texte, /job `checks` absent/);
});

// D-f : une clé globale définie par le projet et par le gabarit, de contenu différent : rien n'est réécrit.
const conflit = async (ci, avant) => {
  const dir = await projetCi(ci);
  const chemin = join(dir, FICHIER_CI[ci]);
  const texte = avant(readFileSync(chemin, "utf8"));
  writeFileSync(chemin, texte);
  const vus = await avertissements(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci, tools: "claude" }));
  assert.equal(readFileSync(chemin, "utf8"), texte, "fichier laissé tel quel");
  return vus.join("\n");
};

test("QUA-283 : clé globale en conflit (D-f), GitLab et GitHub, fichier balisé ou non : fichier tel quel, clé nommée et quoi faire", async () => {
  const sansBalises = (t) =>
    t
      .split("\n")
      .filter((l) => !l.includes("drwil-project-"))
      .join("\n");
  const workflow = (t) => t.replace("      when: never\n", "      when: always\n");
  assert.match(
    await conflit("gitlab", (t) => sansBalises(workflow(t))),
    /\.gitlab-ci\.yml : clé\(s\) workflow .*Rien n'a été changé.*relancer `npx drwil init`/s,
  );
  assert.match(await conflit("gitlab", (t) => poser(t, "jobs", ["workflow:", "  name: projet"])), /clé\(s\) workflow /);
  assert.match(
    await conflit("github", (t) => sansBalises(t).replace("on: [push, pull_request]", "on: push")),
    /ia-first\.yml : clé\(s\) on /,
  );
  assert.match(await conflit("github", (t) => t.replace("jobs:\n", "env:\n  A: b\njobs:\n")), /clé\(s\) env /);
});

test("QUA-283 : mise à jour dans un dépôt git : le message nomme la branche principale qui garde l'ancienne version", async () => {
  const dir = tmp();
  git(dir, "init", "-q", "-b", "master");
  git(dir, "config", "core.autocrlf", "false");
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "gitlab", tools: "claude" }));
  enregistrer(dir, "0.0.1");
  const chemin = join(dir, FICHIER_CI.gitlab);
  writeFileSync(chemin, marinade(readFileSync(chemin, "utf8").replace("node:24", "node:99")));
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-q", "-m", "kit ancien").status, 0);
  const sortie = await sortieDe(() => init({ lang: "fr", targetDir: dir, name: "demo", ci: "gitlab", tools: "claude" }));
  assert.match(sortie, /réécrit hors de la zone du projet.*la branche « master » garde l'ancienne version/s);
  assert.match(sortie, /replacé\(s\) dans la zone du projet : build, stage build, stage deploy/);
  assert.equal(git(dir, "symbolic-ref", "--short", "HEAD").stdout.trim(), "workstream/kit-update");
  assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "", sortie);
});

test("QUA-283 : stages en liste en ligne, guillemets, doublons et fins de ligne CRLF : chaque stage du projet une fois, fichier en CRLF", () => {
  const gabarit = [
    "stages:",
    "  - test",
    "  # drwil-project-begin stages",
    "  # drwil-project-end stages",
    "",
    "checks:",
    "  script:",
    "    - x",
    "    # drwil-project-begin steps",
    "    # drwil-project-end steps",
    "",
    "# drwil-project-begin jobs",
    "# drwil-project-end jobs",
    "",
  ].join("\n");
  const projet = ['stages: [test, "build", build, deploy]', "", "build:", "  script: [b]", ""].join("\r\n");
  const r = placeProject("gitlab", gabarit, projet);
  assert.deepEqual(r.moved, ["build", "stage build", "stage deploy"]);
  assert.match(r.content, /# drwil-project-begin stages\r\n {2}- build\r\n {2}- deploy\r\n {2}# drwil-project-end stages/);
  assert.deepEqual(placeProject("github", "name: x\non: push\n", "name: x\non: push\n"), {
    content: "name: x\non: push\n",
    moved: [],
    conflicts: [],
  });
});

test("QUA-237 : le commit de la mise à jour va au bout et montre la sortie des hooks ; un contrôle du projet à paths y est différé (QUA-325)", async () => {
  const dir = tmp();
  git(dir, "init", "-q", "-b", "master");
  git(dir, "config", "core.autocrlf", "false");
  git(dir, "config", "user.email", "t@t");
  git(dir, "config", "user.name", "t");
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  enregistrer(dir, "0.0.1");
  // Contrôle du projet en échec à `paths: ["**"]` : rejoué sur le commit du kit, il le refusait (cliquet de couverture de marinade-poulet).
  const cfg = JSON.parse(readFileSync(join(dir, ".drwil/ia-first.json"), "utf8"));
  cfg.checks = [...(cfg.checks ?? []), { id: "lent", name: "lent", run: 'node -e "process.exit(1)"', paths: ["**"] }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg, null, 2));
  assert.equal(git(dir, "add", "-A").status, 0);
  assert.equal(git(dir, "commit", "-q", "-m", "kit ancien").status, 0);
  const r = cli(dir, "init", "--tools", "claude");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Commit de la mise à jour en cours : les hooks du projet jouent leurs contrôles/);
  // Git envoie la sortie des hooks sur stderr : elle passe par celle d'init, plus capturée.
  assert.match(r.stderr, /^\[ia-first\] contrôles exécutés : OK/m, `sortie des hooks montrée\n${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /Fait : mise à jour du kit vers .* commitée/);
  assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "", r.stdout);
  const journal = readFileSync(join(dir, ".drwil/evidence/run-checks.log"), "utf8");
  assert.match(journal, /non exécuté : lent \(commit du kit, reconnu par son manifeste/);
});

test("QUA-237 : un contrôle du projet sans paths en échec refuse le commit de la mise à jour : sortie des hooks montrée, mise à jour laissée dans l'arbre", async () => {
  const dir = tmp();
  git(dir, "init", "-q", "-b", "master");
  git(dir, "config", "core.autocrlf", "false");
  git(dir, "config", "user.email", "t@t");
  git(dir, "config", "user.name", "t");
  await silence(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  enregistrer(dir, "0.0.1");
  const cfg = JSON.parse(readFileSync(join(dir, ".drwil/ia-first.json"), "utf8"));
  cfg.checks = [...(cfg.checks ?? []), { id: "rouge", name: "rouge", run: 'node -e "process.exit(1)"' }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg, null, 2));
  assert.equal(git(dir, "add", "-A").status, 0);
  assert.equal(git(dir, "commit", "-q", "-m", "kit ancien").status, 0);
  const r = cli(dir, "init", "--tools", "claude");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /✗ échec : rouge/, "un contrôle sans paths joue, sa sortie est montrée");
  assert.match(r.stderr, /Mise à jour appliquée sur la branche « workstream\/kit-update » mais commit non fait/);
  assert.notEqual(git(dir, "status", "--porcelain").stdout.trim(), "");
});
// Workflow réel de drwil_walk (kit 0.10.0, sans balises), branche master le 2026-11-22 : quatre étapes du projet
// ajoutées dans le job checks du kit (D-c étendue). `\u0024` : le `$` des expressions GitHub, que le lint prendrait pour un
// gabarit de chaîne mal écrit.
const WALK = [
  "name: ia-first",
  "on: [push, pull_request]",
  "jobs:",
  "  checks:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - uses: actions/checkout@v7",
  "        with:",
  "          fetch-depth: 0",
  "      - uses: actions/setup-node@v7",
  "        with:",
  "          node-version: 24",
  '      # Without gitleaks the secrets check is "not run", which fails run-checks in CI (QUA-013).',
  "      # Pinned version, archive checked against its published sum; installed where the engine looks (~/.local/bin).",
  "      - name: Install gitleaks 8.21.2",
  "        run: |",
  "          curl -sSfL -o gitleaks.tar.gz https://github.com/gitleaks/gitleaks/releases/download/v8.21.2/gitleaks_8.21.2_linux_x64.tar.gz",
  '          echo "5bc41815076e6ed6ef8fbecc9d9b75bcae31f39029ceb55da08086315316e3ba  gitleaks.tar.gz" | sha256sum -c -',
  "          mkdir -p ~/.local/bin && tar -xzf gitleaks.tar.gz -C ~/.local/bin gitleaks && rm gitleaks.tar.gz",
  "          ~/.local/bin/gitleaks version",
  "      # Le contrôle coverage-diff-app (QUA-004) lit le rapport de c8 avec diff-cover, outil Python : sans lui,",
  "      # le contrôle serait « non exécuté » (QUA-013). Version épinglée ; pipx est fourni par ubuntu-latest.",
  "      # Il compare à origin/master : l'historique complet vient de fetch-depth: 0 ci-dessus.",
  "      - name: Install diff-cover 10.6.0",
  "        run: |",
  "          pipx install diff-cover==10.6.0",
  "          diff-cover --version",
  "      # Les contrôles de la couche app (coverage-app, typecheck-app, lint-app, licenses-app) tournent",
  "      # depuis app/ : sans ses dépendances, ils seraient « non exécutés », ce qui fait échouer",
  "      # run-checks en CI (QUA-013). npm ci : versions verrouillées par app/package-lock.json.",
  "      - name: Install the app layer's dependencies",
  "        run: npm ci",
  "        working-directory: app",
  "      # Le contrôle e2e (QUA-020) lance Playwright : sans navigateur, il serait « non exécuté » (QUA-013).",
  "      # Chromium seul, à la version épinglée par @playwright/test (app/package-lock.json), avec ses dépendances système.",
  "      - name: Install the e2e browser (Playwright Chromium)",
  "        run: npx playwright install --with-deps chromium",
  "        working-directory: app",
  "      - run: node .githooks/run-checks.mjs",
  "      # Les captures de l'accueil prises par l'e2e (QUA-020), à télécharger : le demandeur n'a pas de casque",
  "      # et juge le rendu dessus. Publiées même si un contrôle échoue, pour voir ce qui a été rendu.",
  "      - name: Publish the home screen captures",
  "        if: always()",
  "        uses: actions/upload-artifact@v4",
  "        with:",
  "          name: captures-accueil",
  "          path: dist/e2e-captures/",
  "          if-no-files-found: warn",
  "      # QUA-113: on a pull request, the checks are replayed with the main branch's hooks (its",
  "      # .githooks/, read through Git) and the PR's list of checks: a PR that weakens a hook or",
  "      # removes a check does not validate itself. The main branch's copy of base-checks.mjs runs;",
  "      # the PR's only while the main branch has none yet (kit adoption).",
  "      - name: Replay the checks with the main branch's hooks",
  "        if: github.event_name == 'pull_request'",
  "        env:",
  "          BASE_REF: \u0024{{ github.base_ref }}",
  "        run: |",
  '          base="origin/$BASE_REF"',
  '          if git cat-file -e "$base:.githooks/base-checks.mjs" 2>/dev/null; then',
  '            git show "$base:.githooks/base-checks.mjs" > "$RUNNER_TEMP/base-checks.mjs"',
  '            node "$RUNNER_TEMP/base-checks.mjs" --base "$base"',
  "          else",
  '            node .githooks/base-checks.mjs --base "$base"',
  "          fi",
  "  # No branch protection is possible on a private repository on the free plan",
  '  # (GitHub.com\'s "Merge" button stays unconditional): only an after-the-fact',
  "  # alert is possible. Triggers only on a push to the main branch (not on",
  "  # pull/merge requests) and only if `checks` failed; opens no duplicate if an",
  "  # equivalent issue is already open.",
  "  alert-if-ci-broken:",
  "    needs: checks",
  "    if: always() && github.event_name == 'push' && github.ref == format('refs/heads/{0}', github.event.repository.default_branch) && needs.checks.result == 'failure'",
  "    runs-on: ubuntu-latest",
  "    permissions:",
  "      issues: write",
  "    steps:",
  "      - name: Open an issue if CI breaks on the main branch",
  "        env:",
  "          GH_TOKEN: \u0024{{ github.token }}",
  "        run: |",
  '          title="CI broken on the main branch (run \u0024{{ github.run_id }})"',
  '          open=$(gh issue list --repo "\u0024{{ github.repository }}" --search "CI broken on the main branch in:title" --state open --json number --jq \'length\')',
  '          if [ "$open" = "0" ]; then',
  '            gh issue create --repo "\u0024{{ github.repository }}" --title "$title" \\',
  '              --body "The \\`checks\\` job failed on the main branch (\u0024{{ github.event.repository.default_branch }}). See \u0024{{ github.server_url }}/\u0024{{ github.repository }}/actions/runs/\u0024{{ github.run_id }}. To fix before any new workstream."',
  "          else",
  '            echo "A broken-CI issue is already open, no duplicate."',
  "          fi",
];
// Étapes du projet avant le pas du kit qui lance les contrôles (installations) et après (publication des captures).
const PREPA_WALK = WALK.slice(20, 38);
const FIN_WALK = WALK.slice(39, 48);
const avantFin = (texte, zone, lignes) => texte.replace(new RegExp(`(\\n\\s*# drwil-project-end ${zone}\\n)`), `\n${lignes.join("\n")}$1`);
const avantFinSteps = (texte, lignes) => avantFin(texte, "steps", lignes);

test("QUA-283 : CI GitHub sans balises du kit 0.10.0 (workflow réel de drwil_walk) : étapes du projet du job checks replacées à l'identique, installations dans les zones de préparation de checks et de shards avant les contrôles, publication dans la zone steps, jobs du kit remis au gabarit, rejeu sans effet", async () => {
  const dir = await projetCi("github");
  const chemin = join(dir, FICHIER_CI.github);
  const gabarit = readFileSync(chemin, "utf8");
  writeFileSync(chemin, `${WALK.join("\n")}\n`);
  const sortie = await sortieDe(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "github", tools: "claude" }));
  const apres = readFileSync(chemin, "utf8");
  assert.doesNotMatch(sortie, /Rien n'a été changé/);
  assert.equal(
    apres,
    avantFin(avantFin(avantFin(gabarit, "setup", PREPA_WALK), "shard-setup", PREPA_WALK), "steps", FIN_WALK),
    "kit au gabarit (plan, tranches, checks, alerte), installations du projet dans les zones de préparation, publication dans la zone steps",
  );
  // Dans checks comme dans shards, les installations du projet passent avant le pas du kit qui lance les contrôles.
  const l = apres.split("\n");
  const [shards, checks] = ["  shards:", "  checks:"].map((j) => l.indexOf(j));
  const pas = (de, motif) => l.findIndex((x, i) => i > de && motif.test(x));
  for (const etape of ["Install diff-cover", "Install the app layer's dependencies", "Install the e2e browser"]) {
    const i = pas(checks, new RegExp(etape.replace(/[()]/g, "\\$&")));
    assert.ok(i > checks && i < pas(checks, /run-checks\.mjs --aggregate-shards/), `${etape} avant les contrôles de checks`);
    const j = pas(shards, new RegExp(etape));
    assert.ok(j > shards && j < pas(shards, /- name: Play the slice/) && j < checks, `${etape} avant la tranche de shards`);
  }
  const publier = pas(checks, /Publish the home screen captures/);
  assert.ok(publier > pas(checks, /run-checks\.mjs --aggregate-shards/), "la publication des captures reste après les contrôles");
  assert.match(
    sortie,
    /ia-first\.yml : replacé\(s\) dans la zone du projet : step Install diff-cover 10\.6\.0, step Install the app layer's dependencies, step Install the e2e browser \(Playwright Chromium\), step Publish the home screen captures\./,
  );
  assert.doesNotMatch(
    await sortieDe(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false, ci: "github", tools: "claude" })),
    /replacé|réécrit hors/,
  );
  assert.equal(readFileSync(chemin, "utf8"), apres, "rejouer ne change rien");
});

test("QUA-283 : une étape d'un job du kit qu'on ne peut établir (ni d'une version livrée ni ajoutée) laisse le fichier tel quel et est nommée", async () => {
  const change = {
    "          fetch-depth: 0": "          fetch-depth: 1",
    "          ~/.local/bin/gitleaks version": "          ~/.local/bin/gitleaks version --verbose",
    "      - run: node .githooks/run-checks.mjs": "      - run: node .githooks/run-checks.mjs --verbose",
  };
  const vus = await conflit("github", () => `${WALK.map((l) => change[l] ?? l).join("\n")}\n`);
  assert.match(
    vus,
    /ia-first\.yml : clé\(s\) checks \(actions\/checkout@v7, Install gitleaks 8\.21\.2, Install diff-cover 10\.6\.0, .*node \.githooks\/run-checks\.mjs --verbose, Publish the home screen captures\) .*Rien n'a été changé/s,
  );
});

// Chaque version livrée sans balises (GitHub et GitLab, lues dans les étiquettes git) : ses empreintes sont dans la table,
// son fichier tel qu'installé est remis au gabarit sans conflit, et une étape ajoutée au job checks va dans la zone steps.
const RACINE = fileURLToPath(new URL("../../..", import.meta.url));
const LIVREES = ["v0.1.0", "v0.4.0", "v0.6.0", "v0.8.0"];
const GABARITS = { github: "common/ci/github/.github/workflows/ia-first.yml", gitlab: "common/ci/gitlab/.gitlab-ci.yml" };
const AJOUT_CHECKS = {
  github: ["      - name: Étape du projet", "        run: npm run e2e"],
  gitlab: ["    - npm run e2e"],
};

test("QUA-283 : le CI de chaque version livrée sans balises est du kit ; une étape ajoutée au job checks va dans la zone steps", () => {
  for (const [forge, rel] of Object.entries(GABARITS)) {
    const gabarit = readFileSync(join(RACINE, "packages/drwil/templates", rel), "utf8");
    for (const version of LIVREES) {
      const ancien = git(RACINE, "show", `${version}:packages/drwil/templates/${rel}`);
      assert.equal(ancien.status, 0, `${version} : étiquette lisible (${ancien.stderr})`);
      for (const p of shippedPrints(forge, ancien.stdout))
        assert.ok(SHIPPED_CI[forge].includes(p), `${forge} ${version} : empreinte absente de SHIPPED_CI : ${p}`);
      const place = (texte) => placeProject(forge, gabarit, texte, SHIPPED_CI[forge]);
      assert.deepEqual(place(ancien.stdout), { content: gabarit, moved: [], conflicts: [] }, `${forge} ${version}`);
      const lignes = ancien.stdout.split("\n");
      const apres = lignes.findIndex((l) => /^\s+- (run: )?node \.githooks\/run-checks\.mjs$/.test(l));
      lignes.splice(apres + 1, 0, ...AJOUT_CHECKS[forge]);
      const r = place(lignes.join("\n"));
      assert.equal(r.content, avantFinSteps(gabarit, AJOUT_CHECKS[forge]), `${forge} ${version} avec une étape`);
      assert.deepEqual(r.moved, [forge === "github" ? "step Étape du projet" : "step npm run e2e"]);
    }
  }
});

// Zone de préparation (QUA-283) : un fichier balisé avant elle (zone `steps` de fin seule) garde sa zone `steps` telle
// quelle, jamais perdue ; dans un fichier sans balises, une étape ajoutée avant le pas du kit qui lance les contrôles va
// dans la préparation de checks et de shards, une étape d'après dans la zone de fin.
const sansZone = (texte, zone) =>
  texte.replace(new RegExp(`\\n\\s*# drwil-project-begin ${zone}\\n[\\s\\S]*?# drwil-project-end ${zone}`), "");

test("QUA-283 : un CI balisé sans zone de préparation (zone steps de fin seule) garde sa zone steps telle quelle et reçoit les zones de préparation", () => {
  for (const [forge, rel] of Object.entries(GABARITS)) {
    const gabarit = readFileSync(join(RACINE, "packages/drwil/templates", rel), "utf8");
    const ancien = avantFinSteps(["setup", "shard-setup", "shard-steps"].reduce(sansZone, gabarit), AJOUT_CHECKS[forge]);
    assert.doesNotMatch(ancien, /drwil-project-begin (setup|shard-)/);
    const r = placeProject(forge, gabarit, ancien, SHIPPED_CI[forge]);
    assert.deepEqual(r, { content: avantFinSteps(gabarit, AJOUT_CHECKS[forge]), moved: [], conflicts: [] }, forge);
    assert.deepEqual(placeProject(forge, gabarit, r.content, SHIPPED_CI[forge]).content, r.content, `${forge} : rejeu sans effet`);
  }
});

test("QUA-283 : sans balises, une étape ajoutée avant le pas du kit qui lance les contrôles va dans la préparation de checks et de shards", () => {
  for (const [forge, rel] of Object.entries(GABARITS)) {
    const gabarit = readFileSync(join(RACINE, "packages/drwil/templates", rel), "utf8");
    const lignes = git(RACINE, "show", `v0.8.0:packages/drwil/templates/${rel}`).stdout.split("\n");
    const avant = lignes.findIndex((l) => /^\s+- (run: )?node \.githooks\/run-checks\.mjs$/.test(l));
    const prepa = forge === "github" ? ["      - name: Préparer", "        run: npm ci"] : ["    - npm ci"];
    lignes.splice(avant + 1, 0, ...AJOUT_CHECKS[forge]);
    lignes.splice(avant, 0, ...prepa);
    const r = placeProject(forge, gabarit, lignes.join("\n"), SHIPPED_CI[forge]);
    assert.equal(r.content, avantFin(avantFin(avantFinSteps(gabarit, AJOUT_CHECKS[forge]), "setup", prepa), "shard-setup", prepa), forge);
    assert.equal(r.moved.length, 2, forge);
  }
});
