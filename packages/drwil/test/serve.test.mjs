// `drwil serve` sur un projet d'essai installé depuis le paquet : lecture seule, jeton, masquage, un serveur par projet.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, test } from "node:test";
import { Script } from "node:vm";
import { fileURLToPath } from "node:url";
import { init } from "../dist/index.js";
import { chooseServeAutostart } from "../dist/cli-install.js";
import { accessToken, maskPersonal, ServeRefusal } from "../dist/serve-auth.js";
import { createBoard } from "../dist/serve-board.js";
import { createDetails, forgeLink } from "../dist/serve-details.js";
import { createForge, hostOf, natureOf } from "../dist/serve-forge.js";
import { measures, openJournal } from "../dist/serve-journal.js";
import { createReader } from "../dist/serve-read.js";
import { publish, welcomeCommand } from "../dist/serve-publish.js";
import { createReleases } from "../dist/serve-releases.js";
import { SERVE_TEXTS } from "../dist/serve-texts.js";
import { startWatch } from "../dist/serve-watch.js";
import { cacheRoot, hostForUrl, preferredPort, projectCacheDir, startServer } from "../dist/serve.js";

// Un hook lancé par `git commit` transmet GIT_DIR, GIT_INDEX_FILE… : hérités, ils feraient agir le projet d'essai sur ce dépôt.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const cli = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
const racinePaquet = fileURLToPath(new URL("..", import.meta.url));
const NOM_GIT = "Jeanne Testeuse";
let aNettoyer = [];
let aArreter = [];

const tmp = () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "drwil-serve-")));
  aNettoyer.push(dir);
  return dir;
};

afterEach(async () => {
  for (const arreter of aArreter) await arreter();
  aArreter = [];
  for (const dir of aNettoyer) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  aNettoyer = [];
});

const git = (dir, ...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" });

function ecrire(dir, chemin, texte) {
  mkdirSync(dirname(join(dir, chemin)), { recursive: true });
  writeFileSync(join(dir, chemin), texte);
}

async function projet(fichiers = {}) {
  const dir = tmp();
  const log = console.log;
  console.log = () => {};
  try {
    await init({ lang: "fr", targetDir: dir, tools: "claude", git: false, ci: "none" });
  } finally {
    console.log = log;
  }
  for (const [chemin, texte] of Object.entries(fichiers)) ecrire(dir, chemin, texte);
  git(dir, "init", "-q");
  git(dir, "config", "user.name", NOM_GIT);
  git(dir, "config", "user.email", "jeanne@example.invalid");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "Projet d'essai");
  return { dir, env: { ...process.env, XDG_CACHE_HOME: tmp() } };
}

const fichierServeur = (p, racine = p.dir) => join(projectCacheDir(racine, p.env), "server.json");

function empreintes(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && !join(e.parentPath, e.name).includes(`${join(dir, ".git")}`))
    .map((e) => {
      const f = join(e.parentPath, e.name);
      return `${f} ${createHash("sha256").update(readFileSync(f)).digest("hex")}`;
    })
    .sort();
}

const lancer = (p, args, env = {}, cwd = p.dir) =>
  spawnSync(process.execPath, [cli, "serve", ...args], { cwd, env: { ...p.env, ...env }, encoding: "utf8" });

function demarrer(p, args = ["--port", "0"], env = {}) {
  const enfant = spawn(process.execPath, [cli, "serve", ...args], { cwd: p.dir, env: { ...p.env, ...env } });
  let sortie = "";
  let erreurs = "";
  enfant.stderr.on("data", (d) => (erreurs += d));
  const fin = new Promise((r) => enfant.once("exit", r));
  const arreter = async () => {
    enfant.kill("SIGTERM");
    await fin;
  };
  aArreter.push(arreter);
  return new Promise((resolve, reject) => {
    enfant.once("exit", () => reject(new Error(`serveur arrêté : ${erreurs}`)));
    enfant.stdout.on("data", (d) => {
      sortie += d;
      const m = /http:\/\/[^\s]+:(\d+)\//.exec(sortie);
      if (m) resolve({ url: `http://127.0.0.1:${m[1]}/`, port: Number(m[1]), sortie: () => sortie, erreurs: () => erreurs, arreter });
    });
  });
}

function arreterDetache(p, racine = p.dir) {
  aArreter.push(async () => {
    const { pid } = JSON.parse(readFileSync(fichierServeur(p, racine), "utf8"));
    process.kill(pid, "SIGTERM");
    for (let i = 0; i < 100 && existsSync(fichierServeur(p, racine)); i++) await new Promise((r) => setTimeout(r, 50));
  });
}

/** `fetch` refuse d'écrire l'en-tête Host, et de lire un chemin qui n'est pas une URL valide. */
function brut(port, chemin, entetes = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path: chemin, headers: entetes }, (res) => {
      let corps = "";
      res.on("data", (d) => (corps += d));
      res.on("end", () => resolve({ status: res.statusCode, corps, entetes: res.headers }));
    });
    req.on("error", reject);
    req.end();
  });
}

const jsonDe = async (url, options) => (await fetch(url, options)).json();
const ROUTES = [
  "",
  "api/docs",
  "api/contracts",
  "api/usage",
  "api/file?path=docs/projects/pending.md",
  "api/ci",
  "api/board",
  "api/releases",
  "api/events",
  "api/measures",
  "api/audits",
  "api/detail?key=x",
  "api/workstream?name=x",
];

test("QUA-280 : drwil serve sert un projet installé sur 127.0.0.1, en lecture seule, sans rien y écrire", async () => {
  const p = await projet({
    "docs/intentions/idee.md":
      "# Intention : une idée\n\n**Statut** : ouverte\n\n## Questions à trancher\n\n- [décision] Quel port ?\n  Sur deux lignes.\n\n## Suite\n\n- pas une question\n",
    "docs/intentions/notes.md": "# Notes\n\n- 2026-11-08 — une note\n",
    "docs/projects/pending.md": "# Index\n\n## Thème\n\n- [ ] [P1] [décision] Une idée — `docs/intentions/idee.md`\n  suite.\n\nFin.\n",
    ".drwil/usage.jsonl":
      '{"workstream":"a","tokens":10,"date":"2026-01-01"}\npas du json\n{"workstream":"a","tokens":5,"date":"2026-02-01"}\n{"workstream":"b","date":"2026-03-01"}\n',
  });
  const avant = empreintes(p.dir);
  const s = await demarrer(p);
  assert.match(s.sortie(), /http:\/\/127\.0\.0\.1:\d+\//);

  const page = await fetch(s.url);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<html lang="fr">/);
  assert.equal(page.headers.get("cache-control"), "no-store");

  const docs = await jsonDe(`${s.url}api/docs`);
  assert.equal(docs.state.activity, null);
  assert.ok(Array.isArray(docs.briefs));
  assert.deepEqual(docs.notes, ["2026-11-08 — une note"]);
  assert.deepEqual(docs.intentions, [
    {
      file: "idee.md",
      title: "une idée",
      status: "ouverte",
      questions: ["[décision] Quel port ? Sur deux lignes."],
      marks: ["P1", "décision"],
      theme: "Thème",
      done: false,
    },
  ]);
  const usage = await jsonDe(`${s.url}api/usage`);
  assert.deepEqual(
    usage.workstreams.map((w) => [w.workstream, w.tokens, w.increments, w.date]),
    [
      ["b", 0, 1, "2026-03-01"],
      ["a", 15, 2, "2026-02-01"],
    ],
  );
  const contrats = await jsonDe(`${s.url}api/contracts`);
  assert.ok(contrats.contracts.length > 0);
  assert.equal(contrats.verify, null);
  assert.match((await jsonDe(`${s.url}api/file?path=docs/projects/pending.md`)).text, /Une idée/);
  assert.equal((await fetch(`${s.url}api/docs`, { method: "POST" })).status, 405);
  assert.equal((await fetch(`${s.url}api/inconnue`)).status, 404);
  assert.equal(s.erreurs(), "");
  await s.arreter();

  assert.deepEqual(empreintes(p.dir), avant, "aucun fichier du projet ne change");
  assert.equal(git(p.dir, "status", "--porcelain").stdout, "");
});

test("QUA-280 : le paquet publie la page et n'ajoute aucune dépendance d'exécution", () => {
  const pkg = JSON.parse(readFileSync(join(racinePaquet, "package.json"), "utf8"));
  assert.deepEqual(Object.keys(pkg.dependencies), ["commander"]);
  assert.ok(pkg.files.includes("serve"));
  assert.match(readFileSync(join(racinePaquet, "serve", "page.html"), "utf8"), /name="viewport"/);
});

test("QUA-280 : une lecture ne sort pas des fiches et des intentions, ni par un lien symbolique", async () => {
  const p = await projet({ "docs/intentions/vraie.md": "# Vraie\n" });
  ecrire(p.dir, "secret.txt", "contenu privé");
  symlinkSync(join(p.dir, "secret.txt"), join(p.dir, "docs/intentions/lien.md"));
  const lecteur = createReader(p.dir);
  for (const chemin of [
    "../secret.txt",
    "/etc/passwd",
    "docs/projects/../../secret.txt",
    "secret.txt",
    "docs/intentions/a b.md",
    "docs/intentions/x.txt",
    "",
  ])
    assert.deepEqual(lecteur.file(chemin), { error: "path refused" }, chemin);
  assert.equal(lecteur.file("docs/intentions/lien.md").text, "");
  assert.equal(lecteur.file("docs/intentions/absente.md").text, "");
  assert.match(lecteur.file("docs/intentions/vraie.md").text, /Vraie/);
  assert.deepEqual(
    lecteur
      .intentions()
      .map((i) => i.file)
      .sort(),
    ["lien.md", "vraie.md"],
  );
  assert.equal(lecteur.intentions().find((i) => i.file === "lien.md").title, "lien.md", "le lien n'est pas suivi");
});

test("QUA-280 : un dossier d'essai vide donne des vues vides, sans erreur", async () => {
  const dir = tmp();
  const lecteur = createReader(dir);
  assert.deepEqual(await lecteur.state(), { activity: null, brief: null, lot: null, branch: "" });
  assert.deepEqual(await lecteur.briefs(), []);
  assert.deepEqual(lecteur.intentions(), []);
  assert.deepEqual(lecteur.notes(), []);
  assert.deepEqual(await lecteur.contracts(), { verify: null, contracts: [] });
  assert.deepEqual(await lecteur.usage(), { workstreams: [], tags: [] });
});

test("QUA-280 : état, lot, statut des contrats et version d'un chantier sont lus du projet", async () => {
  const contrat = (texte) => `# Registre\n\n## ABC-001 — Un\n**Règle** : ${texte}\n## ABC-002 — Deux\n**Règle** : stable\n`;
  const p = await projet({ "docs/contracts.md": contrat("ancienne"), ".drwil/usage.jsonl": '{"workstream":"a","date":"2026-01-01"}\n' });
  git(p.dir, "update-ref", "refs/remotes/origin/main", "HEAD");
  git(p.dir, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main");
  git(p.dir, "tag", "v1.0.0");
  ecrire(p.dir, "docs/contracts.md", `${contrat("nouvelle")}## ABC-003 — Trois\n**Règle** : neuve\n# Fin\ntexte hors contrat\n`);
  ecrire(p.dir, ".drwil/state.json", JSON.stringify({ activity: "BUILD", active_brief: "docs/projects/x.md" }));
  ecrire(p.dir, ".drwil/lot.json", JSON.stringify({ brief: "docs/projects/x.md", current: 2, done: [1] }));
  ecrire(p.dir, ".drwil/evidence/verify-1.json", JSON.stringify({ results: [] }));
  ecrire(
    p.dir,
    ".drwil/evidence/verify-2.json",
    JSON.stringify({
      verifiedAt: "t",
      commit: "0123456789",
      label: "GOVERNANCE: PASS",
      contracts: { total: 1 },
      dirtyWorktree: false,
      results: [{ id: "ABC-001", status: "PASS", severity: "blocking", reasons: ["r"], actor: { name: "x" } }],
    }),
  );
  ecrire(p.dir, "docs/grand.md", "x");
  const lecteur = createReader(p.dir);

  const etat = await lecteur.state();
  assert.deepEqual({ ...etat, branch: "" }, { activity: "BUILD", brief: "docs/projects/x.md", lot: { current: 2, done: [1] }, branch: "" });
  assert.ok(etat.branch.length > 0);
  const { verify, contracts } = await lecteur.contracts();
  assert.deepEqual(verify, { at: "t", commit: "0123456", label: "GOVERNANCE: PASS", totals: { total: 1 }, dirty: false });
  assert.deepEqual(
    contracts.map((c) => [c.id, c.change, c.status]),
    [
      ["ABC-001", "changed", "PASS"],
      ["ABC-002", "", null],
      ["ABC-003", "new", null],
    ],
  );
  assert.deepEqual(contracts[0].reasons, ["r"]);
  assert.deepEqual(contracts[0].fields, { Règle: "nouvelle" });
  assert.equal((await lecteur.usage()).workstreams[0].version, "v1.0.0");
  ecrire(p.dir, ".drwil/lot.json", JSON.stringify({ brief: "docs/projects/autre.md", current: 9, done: [] }));
  assert.equal((await lecteur.state()).lot, null, "le lot d'une autre fiche n'est pas celui-ci");
});

test("QUA-280 : un en-tête Host étranger est refusé, une requête invalide ne révèle rien, la page échappe le nom du projet", async () => {
  const p = await projet({});
  const cfg = JSON.parse(readFileSync(join(p.dir, ".drwil/ia-first.json"), "utf8"));
  ecrire(p.dir, ".drwil/ia-first.json", JSON.stringify({ ...cfg, projectName: "<b>x</b>" }));
  const s = await demarrer(p);
  assert.equal((await brut(s.port, "/api/docs", { host: "attaquant.example" })).status, 403);
  assert.equal((await brut(s.port, "/", { host: `localhost:${s.port}` })).status, 200);
  const erreur = await brut(s.port, "//");
  assert.equal(erreur.status, 500);
  assert.deepEqual(JSON.parse(erreur.corps), { error: "internal error" });
  const page = await (await fetch(s.url)).text();
  assert.ok(page.includes("&#60;b&#62;x&#60;/b&#62;"));
  assert.ok(!page.includes("<b>x</b>"));
});

test("QUA-280 : hors d'un projet ou avec un port invalide, le refus est dit sans démarrer", async () => {
  const p = await projet({});
  const vide = tmp();
  const horsProjet = lancer(p, [], {}, vide);
  assert.equal(horsProjet.status, 1);
  assert.match(horsProjet.stderr, /project not initialised/);
  for (const port of ["abc", "70000"]) {
    const r = lancer(p, ["--port", port]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /attendu un entier/);
  }
});

test("QUA-281 : hors de 127.0.0.1, le serveur refuse de démarrer sans jeton valide, détaché ou non", async () => {
  const p = await projet({});
  for (const args of [
    ["--host", "0.0.0.0", "--port", "0"],
    ["--host", "0.0.0.0", "--port", "0", "--detach"],
  ]) {
    const sans = lancer(p, args);
    assert.equal(sans.status, 1);
    assert.match(sans.stderr, /DRWIL_SERVE_TOKEN/);
    assert.equal(sans.stdout, "");
    const court = lancer(p, args, { DRWIL_SERVE_TOKEN: "court" });
    assert.equal(court.status, 1);
    assert.match(court.stderr, /trop court/);
  }
  assert.equal(existsSync(fichierServeur(p)), false);
  assert.equal(accessToken("127.0.0.1", {}), null);
  assert.throws(
    () => accessToken("0.0.0.0", {}),
    (e) => e instanceof ServeRefusal && e.key === "tokenRequired",
  );
});

test("QUA-281 : toute requête sans jeton valide est refusée, le jeton n'apparaît dans aucune sortie", async () => {
  const jeton = randomBytes(24).toString("hex");
  const trace = join(tmp(), "env.txt");
  const p = await projet({
    ".githooks/state.mjs": `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(trace)}, process.env.DRWIL_SERVE_TOKEN ?? "absent");\nconsole.log("[]");\n`,
  });
  const s = await demarrer(p, ["--host", "0.0.0.0", "--port", "0"], { DRWIL_SERVE_TOKEN: jeton });
  for (const route of ROUTES) {
    assert.equal((await fetch(s.url + route)).status, 401, `sans jeton : /${route}`);
    assert.equal((await fetch(s.url + route, { headers: { authorization: "Bearer mauvais" } })).status, 401, `mauvais jeton : /${route}`);
    assert.equal((await fetch(s.url + route, { headers: { cookie: "drwil_serve=abc123" } })).status, 401, `mauvais cookie : /${route}`);
  }
  assert.equal((await fetch(`${s.url}api/docs?token=${jeton}`)).status, 401, "le jeton d'adresse ne vaut qu'à l'entrée");
  assert.equal((await fetch(`${s.url}?token=mauvais`)).status, 401);

  const entree = await fetch(`${s.url}?token=${jeton}`, { redirect: "manual" });
  assert.equal(entree.status, 303);
  assert.equal(entree.headers.get("location"), "/");
  const cookie = entree.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly; SameSite=Strict/);
  assert.ok(!cookie.includes(jeton), "le cookie porte l'empreinte");
  for (const headers of [{ authorization: `Bearer ${jeton}` }, { cookie: cookie.split(";")[0] }]) {
    for (const route of ROUTES) {
      const r = await fetch(s.url + route, { headers });
      assert.equal(r.status, 200, `/${route}`);
      assert.ok(!(await r.text()).includes(jeton));
    }
  }
  assert.equal(readFileSync(trace, "utf8"), "absent", "les commandes lancées n'héritent pas du jeton");
  assert.ok(!s.sortie().includes(jeton));
  assert.ok(!s.erreurs().includes(jeton));
  assert.ok(!readFileSync(fichierServeur(p), "utf8").includes(jeton));
});

test("QUA-281 : détaché, le jeton n'est ni dans la sortie, ni dans l'enregistrement, ni dans le journal", async () => {
  const jeton = randomBytes(24).toString("hex");
  const p = await projet({});
  const r = lancer(p, ["--host", "0.0.0.0", "--port", "0", "--detach"], { DRWIL_SERVE_TOKEN: jeton });
  assert.equal(r.status, 0, r.stderr);
  arreterDetache(p);
  const port = JSON.parse(readFileSync(fichierServeur(p), "utf8")).port;
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/docs`)).status, 401);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/docs`, { headers: { authorization: `Bearer ${jeton}` } })).status, 200);
  for (const texte of [
    r.stdout,
    r.stderr,
    readFileSync(fichierServeur(p), "utf8"),
    readFileSync(join(dirname(fichierServeur(p)), "serve.log"), "utf8"),
  ])
    assert.ok(!texte.includes(jeton));
});

test("QUA-271 : aucune réponse de l'API ne porte de donnée nominative ni de secret", async () => {
  const secret = `ghp_${"a1".repeat(18)}`;
  const texte = `# Intention : idée\n\nPar ${NOM_GIT}, jeanne@example.invalid, @jeanne-t et ${secret}.\nVoir @AGENTS.md, @types/node, docs/projects/un-chemin-de-fiche-vraiment-tres-long-et-lisible.md\n`;
  const p = await projet({
    "docs/intentions/idee.md": texte,
    "docs/projects/fiche.md": texte,
    ".drwil/usage.jsonl": `{"workstream":"a","date":"2026-01-01","author":"Jeanne","email":"jeanne@example.invalid"}\n`,
    "docs/audit-risques.md": `# Audit\n\n> Dernier scan : 2026-11-01\n> Auteur : ${NOM_GIT}\n> Auditeur : Une Personne\n> Note : revu par jeanne@example.invalid et ${secret}\n`,
  });
  ecrire(
    p.dir,
    ".drwil/evidence/verify-1.json",
    JSON.stringify({
      results: [{ id: "QUA-001", status: "MANUAL", reasons: ["vu par jeanne@example.invalid"], attestation: { actor: { name: NOM_GIT } } }],
    }),
  );
  const s = await demarrer(p);
  const corps = [];
  for (const route of [
    "api/docs",
    "api/contracts",
    "api/usage",
    "api/file?path=docs/intentions/idee.md",
    "api/file?path=docs/projects/fiche.md",
    "api/audits",
  ])
    corps.push(await (await fetch(s.url + route)).text());
  const tout = corps.join("\n");
  for (const interdit of [NOM_GIT, "jeanne@example.invalid", "@jeanne-t", secret, "Une Personne"])
    assert.ok(!tout.includes(interdit), interdit);
  assert.match(tout, /@AGENTS\.md/);
  assert.match(tout, /@types\/node/);
  assert.match(tout, /un-chemin-de-fiche-vraiment-tres-long-et-lisible\.md/);
});

test("QUA-271 : le filtre retire les clés nominatives à toute profondeur et masque secrets et courriels", () => {
  // Une fausse clé, assemblée pour que le contrôle des secrets (SEC-007) ne la prenne pas pour une vraie.
  const entete = ["RSA", "PRIVATE", "KEY-----"].join(" ");
  const cle = `-----BEGIN ${entete}\nabc+/=\n-----END ${entete}`;
  const aws = `AKIA${"A".repeat(16)}`;
  const sortie = maskPersonal(
    {
      author: "x",
      mergedBy: "y",
      n: 3,
      vide: null,
      ok: true,
      liste: [{ login: "z", titre: `a ${aws} ${cle}` }, "qui@ex.fr"],
      texte: "(@jean) fin @jean.",
    },
    ["Inconnu"],
  );
  assert.deepEqual(sortie, {
    n: 3,
    vide: null,
    ok: true,
    liste: [{ titre: "a [REDACTED] [REDACTED]" }, "[REDACTED]"],
    texte: "([REDACTED]) fin [REDACTED].",
  });
  assert.equal(maskPersonal("Inconnu ici", ["Inconnu"]), "[REDACTED] ici");
  assert.equal(maskPersonal(`empreinte ${"ab12".repeat(10)} fin`), "empreinte [REDACTED] fin");
  assert.equal(maskPersonal("texte normal sans rien"), "texte normal sans rien");
});

test("QUA-272 : --detach est idempotent, un seul serveur par projet", async () => {
  const p = await projet({});
  const un = lancer(p, ["--detach"]);
  assert.equal(un.status, 0, un.stderr);
  arreterDetache(p);
  assert.match(un.stdout, /démarré en arrière-plan : http:\/\/127\.0\.0\.1:\d+\//);
  const { pid, url } = JSON.parse(readFileSync(fichierServeur(p), "utf8"));
  const deux = lancer(p, ["--detach"]);
  assert.equal(deux.status, 0, deux.stderr);
  assert.ok(deux.stdout.includes(`déjà démarré pour ce projet : ${url}`));
  assert.equal(JSON.parse(readFileSync(fichierServeur(p), "utf8")).pid, pid);
  assert.equal((await fetch(`${url}api/docs`)).status, 200);
  const premierPlan = lancer(p, []);
  assert.equal(premierPlan.status, 0);
  assert.ok(premierPlan.stdout.includes(url), "un second serveur au premier plan ne démarre pas non plus");
  assert.equal(git(p.dir, "status", "--porcelain").stdout, "");
});

test("QUA-272 : deux worktrees d'un même dépôt ont chacun leur serveur", async () => {
  const p = await projet({});
  const arbre = join(tmp(), "arbre");
  assert.equal(git(p.dir, "worktree", "add", "-q", "-b", "autre", arbre).status, 0);
  const racine = realpathSync(arbre);
  assert.equal(lancer(p, ["--detach"]).status, 0);
  arreterDetache(p);
  assert.equal(lancer(p, ["--detach"], {}, racine).status, 0);
  arreterDetache(p, racine);
  const a = JSON.parse(readFileSync(fichierServeur(p), "utf8"));
  const b = JSON.parse(readFileSync(fichierServeur(p, racine), "utf8"));
  assert.notEqual(a.pid, b.pid);
  assert.notEqual(a.port, b.port);
});

test("QUA-272 : des --detach simultanés ne lancent qu'un serveur", async () => {
  const p = await projet({});
  const lancerAsync = () =>
    new Promise((resolve) => {
      const enfant = spawn(process.execPath, [cli, "serve", "--detach"], { cwd: p.dir, env: p.env });
      let sortie = "";
      enfant.stdout.on("data", (d) => (sortie += d));
      enfant.once("exit", (code) => resolve({ code, sortie }));
    });
  const resultats = await Promise.all([lancerAsync(), lancerAsync(), lancerAsync()]);
  arreterDetache(p);
  const urls = new Set(resultats.map((r) => /http:\S+/.exec(r.sortie)?.[0]));
  assert.deepEqual(
    resultats.map((r) => r.code),
    [0, 0, 0],
  );
  assert.equal(urls.size, 1, [...urls].join(" "));
});

test("QUA-272 : un enregistrement périmé est remplacé ; une réservation en cours est respectée ; l'arrêt efface l'enregistrement", async () => {
  const p = await projet({});
  const fichier = fichierServeur(p);
  mkdirSync(dirname(fichier), { recursive: true });

  writeFileSync(fichier, JSON.stringify({ pid: process.pid, at: Date.now() }));
  const enCours = lancer(p, []);
  assert.equal(enCours.status, 0);
  assert.match(enCours.stdout, /démarrage est déjà en cours/);

  for (const perime of [
    { pid: 999999999, at: Date.now(), host: "127.0.0.1", port: 1, url: "http://127.0.0.1:1/" },
    { pid: process.pid, at: Date.now(), host: "0.0.0.0", port: 1, url: "http://0.0.0.0:1/" },
    { pid: process.pid, at: Date.now() - 60000 },
  ]) {
    writeFileSync(fichier, JSON.stringify(perime));
    const s = await demarrer(p);
    assert.equal((await fetch(`${s.url}api/usage`)).status, 200);
    await s.arreter();
    // Sous Windows, kill() termine le processus sans lancer le gestionnaire de SIGTERM : l'enregistrement reste.
    if (process.platform !== "win32") assert.equal(existsSync(fichier), false, "l'arrêt efface l'enregistrement");
  }
  writeFileSync(fichier, "pas du json");
  const s = await demarrer(p);
  await s.arreter();
});

/**
 * Le port du projet dépend du dossier temporaire : sous charge parallèle un autre processus (un autre
 * rejeu du même fichier) peut déjà l'occuper, ce qui est exactement l'état voulu. EADDRINUSE n'est donc pas un échec.
 */
async function occuperLePortDuProjet(dir) {
  const prefere = createServer();
  await new Promise((res, rej) => {
    prefere.once("listening", res);
    prefere.once("error", (e) => (e.code === "EADDRINUSE" ? res() : rej(e)));
    prefere.listen(preferredPort(dir), "127.0.0.1");
  });
  aArreter.push(() => new Promise((res) => (prefere.listening ? prefere.close(res) : res())));
}

test("QUA-272 : port occupé : refus au port demandé, port suivant au port du projet ; détaché, l'échec renvoie au journal", async () => {
  const p = await projet({});
  const occupe = createServer().listen(0, "127.0.0.1");
  await new Promise((r) => occupe.once("listening", r));
  aArreter.push(() => new Promise((r) => occupe.close(r)));
  const port = String(occupe.address().port);
  const r = lancer(p, ["--port", port]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /déjà occupé/);
  assert.equal(existsSync(fichierServeur(p)), false, "un démarrage raté libère la réservation");
  const d = lancer(p, ["--port", port, "--detach"]);
  assert.equal(d.status, 1);
  assert.match(d.stderr, /n'a pas démarré\. Journal : .*serve\.log/);

  await occuperLePortDuProjet(p.dir);
  const s = await startServer({ root: p.dir, host: "127.0.0.1", port: null, token: null, cacheDir: tmp() });
  aArreter.push(() => s.stop());
  assert.ok(s.port > preferredPort(p.dir), "le port du projet est occupé : le suivant libre");
});

test("QUA-272 : port du projet déjà pris par un autre processus : le test qui l'occupe le tolère, le serveur passe au suivant", async () => {
  const p = await projet({});
  await occuperLePortDuProjet(p.dir); // l'autre processus
  await occuperLePortDuProjet(p.dir); // le test : EADDRINUSE attendu, toléré
  const s = await startServer({ root: p.dir, host: "127.0.0.1", port: null, token: null, cacheDir: tmp() });
  aArreter.push(() => s.stop());
  assert.ok(s.port > preferredPort(p.dir));
});

test("QUA-272 : l'état d'exécution vit dans le cache de l'utilisateur, un dossier par système", () => {
  assert.equal(cacheRoot({ XDG_CACHE_HOME: "/c" }, "linux", "/h"), "/c");
  assert.equal(cacheRoot({ LOCALAPPDATA: "C:/l" }, "win32", "/h"), "C:/l");
  assert.equal(cacheRoot({}, "win32", "/h"), join("/h", ".cache"));
  assert.equal(cacheRoot({}, "darwin", "/h"), join("/h", "Library", "Caches"));
  assert.equal(cacheRoot({}, "linux", "/h"), join("/h", ".cache"));
  assert.notEqual(projectCacheDir("/a", { XDG_CACHE_HOME: "/c" }), projectCacheDir("/b", { XDG_CACHE_HOME: "/c" }));
  assert.equal(hostForUrl("::1"), "[::1]");
  assert.equal(hostForUrl("0.0.0.0"), "0.0.0.0");
  assert.ok(preferredPort("/a") >= 4317 && preferredPort("/a") < 5017);
});

test("QUA-272 : le port propre au projet et ses essais restent sous 5060 et 5061, refusés par les navigateurs", () => {
  const ports = Array.from({ length: 20000 }, (_, i) => preferredPort(`/projet-${i}`));
  assert.ok(Math.min(...ports) >= 4317);
  assert.equal(Math.max(...ports), 5016, "plage entière parcourue : le plus haut port de départ");
  assert.ok(Math.max(...ports) + 19 < 5060, "vingt essais au plus depuis ce port");
});

// --- Forges (QUA-273), journal (QUA-274), vues vides (QUA-275) ---

const posix = { skip: process.platform === "win32" ? "outils de forge factices en script" : false };
const ORIGINE_HUB = "https://github.com/jeanne-owner/projet.git";
const ORIGINE_LAB = "git@gitlab.com:jeanne-owner/projet.git";
const GIT_MAIN = { "symbolic-ref": "origin/main\n" };
const VERSION = [/--version/, "1.0\n"];
const FICHIERS_DOC = ["docs/a.md", "README.md"];
const CREEE = "2026-01-01T10:00:00Z";
const SHA = "abcdef0123456789";

/** `sh` et `git` factices : la première expression qui reconnaît la commande donne la réponse ; sinon, échec. */
function forgeInjectee(reponses, { remote = ORIGINE_HUB, git: gitReponses = {} } = {}) {
  const appels = [];
  const sh = async (cmd, args) => {
    const ligne = `${cmd} ${args.join(" ")}`;
    appels.push(ligne);
    for (const [motif, r] of reponses) if (motif.test(ligne)) return typeof r === "string" ? r : JSON.stringify(r);
    return "";
  };
  const gitFaux = async (...args) => {
    const ligne = args.join(" ");
    if (ligne === "remote get-url origin") return `${remote}\n`;
    for (const [motif, r] of Object.entries(gitReponses)) if (ligne.includes(motif)) return r;
    return "";
  };
  return { forge: createForge(sh, gitFaux), appels };
}

const HUB_PR = (over = {}) => ({
  number: 7,
  title: "Une PR",
  state: "OPEN",
  headRefName: "ma-branche",
  createdAt: CREEE,
  mergedAt: null,
  closedAt: null,
  files: FICHIERS_DOC.map((path) => ({ path })),
  ...over,
});
const LAB_MR = (over = {}) => ({
  iid: 7,
  sha: SHA,
  title: "Une PR",
  description: "corps",
  state: "opened",
  source_branch: "ma-branche",
  target_branch: "main",
  created_at: CREEE,
  merged_at: null,
  closed_at: null,
  author: { username: "jeanne-t" },
  ...over,
});
const HUB_RUN = (over = {}) => ({
  databaseId: 11,
  name: "ci",
  status: "completed",
  conclusion: "success",
  event: "push",
  createdAt: CREEE,
  headSha: SHA,
  ...over,
});
const LAB_PIPE = (over = {}) => ({ id: 11, sha: SHA, status: "success", source: "push", created_at: CREEE, ...over });
const DEBUT = "2026-01-01T10:00:01Z";
const FIN = "2026-01-01T10:01:00Z";
const HUB_JOB = {
  name: "tests",
  status: "completed",
  conclusion: "success",
  started_at: DEBUT,
  completed_at: FIN,
  steps: [
    { name: "etape", status: "completed", conclusion: "success", started_at: DEBUT, completed_at: FIN },
    { name: "jamais lancee", status: "pending", conclusion: "", started_at: null, completed_at: null },
  ],
};
const LAB_JOB = { name: "tests", status: "success", started_at: DEBUT, finished_at: FIN, user: { username: "jeanne-t" } };
const HUB_VUE_PR = {
  number: 7,
  title: "Une PR",
  body: "corps",
  state: "OPEN",
  headRefName: "ma-branche",
  baseRefName: "main",
  additions: 4,
  deletions: 2,
  changedFiles: 2,
  commits: [{}, {}],
};
const LAB_API = [
  VERSION,
  [/merge_requests\?state=all/, [LAB_MR(), LAB_MR()]],
  [/merge_requests\/7\/diffs/, FICHIERS_DOC.map((new_path) => ({ new_path, diff: "@@ -1 +1 @@\n+a\n+b\n-c\n" }))],
  [/merge_requests\/7\/commits/, [{}, {}]],
  [/merge_requests\/7$/, LAB_MR()],
  [/pipelines\/11\/jobs/, [LAB_JOB]],
  [/pipelines\?ref=/, [LAB_PIPE(), LAB_PIPE({ id: 12, sha: "autre" })]],
  [
    /releases\?/,
    [
      { tag_name: "v1.0.0", released_at: CREEE, upcoming_release: false },
      { tag_name: "v0.9.0", released_at: null },
    ],
  ],
];
const HUB_API = [
  VERSION,
  [/pr list/, [HUB_PR()]],
  [/pr view 7/, HUB_VUE_PR],
  [/run list/, [HUB_RUN(), HUB_RUN({ databaseId: 12, headSha: "autre" })]],
  [/actions\/runs\/11\/jobs/, { jobs: [HUB_JOB] }],
  [
    /release list/,
    [
      { tagName: "v1.0.0", isLatest: true, isPrerelease: false, publishedAt: CREEE },
      { tagName: "v0.9.0", isLatest: false, isPrerelease: false, publishedAt: null },
    ],
  ],
];

test("QUA-273 : GitHub et GitLab rendent les mêmes vues, de même forme, forge détectée d'après origin", async () => {
  const hub = forgeInjectee(HUB_API, { git: GIT_MAIN });
  const lab = forgeInjectee(LAB_API, { remote: ORIGINE_LAB, git: GIT_MAIN });
  assert.deepEqual(await hub.forge.availability(), { forge: "github", cli: "gh", missing: null });
  assert.deepEqual(await lab.forge.availability(), { forge: "gitlab", cli: "glab", missing: null });

  const prsHub = (await hub.forge.prs()).prs;
  assert.deepEqual(prsHub, [
    {
      number: 7,
      title: "Une PR",
      state: "open",
      branch: "ma-branche",
      createdAt: CREEE,
      mergedAt: null,
      closedAt: null,
      paths: FICHIERS_DOC,
    },
  ]);
  assert.deepEqual((await lab.forge.prs()).prs.slice(0, 1), prsHub);

  const ciHub = await hub.forge.ci();
  const ciLab = await lab.forge.ci();
  const cibles = (ci) => ci.targets.map((t) => [t.kind, t.number, t.branch, t.sha]);
  assert.deepEqual(cibles(ciHub), [
    ["pr", 7, "ma-branche", "abcdef0"],
    ["main", null, "main", "abcdef0"],
  ]);
  assert.deepEqual(cibles(ciLab).at(-1), ["main", null, "main", "abcdef0"]);
  assert.equal(ciHub.targets[0].workflows.length, 1, "seules les exécutions du dernier commit");
  const [wHub] = ciHub.targets[0].workflows;
  const [wLab] = ciLab.targets[0].workflows;
  assert.deepEqual(Object.keys(wLab).sort(), Object.keys(wHub).sort());
  for (const w of [wHub, wLab])
    assert.deepEqual([w.id, w.event, w.status, w.conclusion, w.sha], ["11", "push", "completed", "success", "abcdef0"]);
  assert.deepEqual(
    wHub.jobs[0].steps.map((s) => s.name),
    ["etape"],
    "une étape jamais lancée n'a pas de durée",
  );
  assert.deepEqual(wLab.jobs[0], { name: "tests", status: "completed", conclusion: "success", started: DEBUT, completed: FIN, steps: [] });
  assert.deepEqual(await lab.forge.releases(), await hub.forge.releases());
  const detail = {
    number: 7,
    title: "Une PR",
    body: "corps",
    state: "open",
    branch: "ma-branche",
    base: "main",
    additions: 4,
    deletions: 2,
    changedFiles: 2,
    commits: 2,
  };
  assert.deepEqual(await hub.forge.pr(7), detail);
  assert.deepEqual(await lab.forge.pr(7), detail);
});

test("QUA-273 : les états de GitLab sont traduits vers ceux de GitHub ; ni auteur ni adresse ne sort d'un adapteur", async () => {
  const etats = {
    running: ["in_progress", null],
    pending: ["queued", null],
    manual: ["queued", null],
    failed: ["completed", "failure"],
    canceled: ["completed", "cancelled"],
    skipped: ["completed", "skipped"],
  };
  for (const [statut, attendu] of Object.entries(etats)) {
    const { forge } = forgeInjectee(
      [
        VERSION,
        [/merge_requests/, []],
        [/pipelines\/1\/jobs/, [{ ...LAB_JOB, status: statut }]],
        [/pipelines\?/, [LAB_PIPE({ id: 1, status: statut })]],
      ],
      { remote: ORIGINE_LAB, git: GIT_MAIN },
    );
    const [w] = (await forge.ci()).targets[0].workflows;
    assert.deepEqual([w.status, w.conclusion], attendu, statut);
    assert.deepEqual([w.jobs[0].status, w.jobs[0].conclusion], attendu, statut);
  }
  const fusionnee = LAB_MR({
    iid: 2,
    sha: "b",
    state: "merged",
    merged_at: CREEE,
    web_url: "https://gitlab.com/jeanne-owner/projet/-/merge_requests/2",
  });
  const fermee = LAB_MR({ iid: 3, sha: "c", state: "closed", closed_at: CREEE });
  const { forge } = forgeInjectee(
    [VERSION, [/merge_requests\?/, [fusionnee, fermee]], [/merge_requests\/2\/diffs/, [{ new_path: "src/a.ts" }]]],
    { remote: ORIGINE_LAB },
  );
  const { prs } = await forge.prs();
  assert.deepEqual(
    prs.map((p) => [p.number, p.state, p.mergedAt, p.closedAt, p.paths]),
    [
      [2, "merged", CREEE, null, ["src/a.ts"]],
      [3, "closed", null, CREEE, []],
    ],
  );
  assert.ok(!JSON.stringify(prs).includes("jeanne"), "ni auteur ni adresse");
  assert.equal(await forge.pr(2), null, "une MR illisible n'est pas une erreur");
});

test("QUA-273 : GitLab pagine jusqu'à la limite de GitHub, et ne demande les fichiers que des MR récentes", async () => {
  const page = (n, taille) => Array.from({ length: taille }, (_, i) => LAB_MR({ iid: n * 1000 + i, sha: `s${i}` }));
  const { forge, appels } = forgeInjectee(
    [VERSION, [/page=1$/, page(1, 100)], [/page=2$/, page(2, 40)], [/\/diffs/, [{ new_path: "x.ts" }]]],
    { remote: ORIGINE_LAB },
  );
  assert.equal((await forge.prs()).prs.length, 140);
  assert.equal(appels.filter((a) => a.includes("/diffs")).length, 30);
  const coupure = forgeInjectee([VERSION, [/page=1$/, page(1, 100)], [/\/diffs/, []]], { remote: ORIGINE_LAB });
  assert.equal((await coupure.forge.prs()).prs.length, 100, "une page 2 en échec laisse la première");
  const pauvre = forgeInjectee([VERSION, [/merge_requests\/9$/, LAB_MR({ iid: 9, description: null })]], { remote: ORIGINE_LAB });
  assert.deepEqual(await pauvre.forge.pr(9), {
    number: 9,
    title: "Une PR",
    body: "",
    state: "open",
    branch: "ma-branche",
    base: "main",
    additions: null,
    deletions: null,
    changedFiles: null,
    commits: 0,
  });
});

test("QUA-273 : aucune commande d'écriture ; un nom de branche ne devient ni option ni morceau d'adresse", async () => {
  const hub = forgeInjectee(
    [
      VERSION,
      [/pr list/, [HUB_PR({ headRefName: "-x;rm&y" })]],
      [/run list/, [HUB_RUN()]],
      [/\/jobs/, { jobs: [HUB_JOB] }],
      [/release/, []],
      [/pr view/, HUB_VUE_PR],
    ],
    { git: GIT_MAIN },
  );
  await hub.forge.ci();
  await hub.forge.releases();
  await hub.forge.pr(7);
  assert.ok(hub.appels.some((a) => a.startsWith("gh run list --branch=-x;rm&y --limit")));
  const lecturesGh =
    /^gh (--version|pr list |pr view \d+ |run list --branch=|release list |api repos\/\{owner\}\/\{repo\}\/actions\/runs\/\d+\/jobs)/;
  for (const a of hub.appels) assert.match(a, lecturesGh);

  const lab = forgeInjectee(
    [
      VERSION,
      [/merge_requests\?/, [LAB_MR({ source_branch: "a&b=c" })]],
      [/\/diffs/, []],
      [/pipelines\?/, [LAB_PIPE()]],
      [/\/jobs/, [LAB_JOB]],
      [/releases/, []],
      [/merge_requests\/7/, LAB_MR()],
    ],
    { remote: ORIGINE_LAB, git: GIT_MAIN },
  );
  await lab.forge.ci();
  await lab.forge.releases();
  await lab.forge.pr(7);
  assert.ok(lab.appels.some((a) => a.includes("pipelines?ref=a%26b%3Dc&")));
  for (const a of lab.appels) {
    assert.match(a, /^glab (--version|api projects\/:id\/)/);
    assert.doesNotMatch(a, / (-X|--method|-f|-F|--field|--raw-field)\b/);
  }
});

test("QUA-273 : la forge se lit sur l'hôte d'origin seul, la branche principale sans valeur en dur, les jobs finis une seule fois", async () => {
  assert.equal(hostOf("https://user:x@gitlab.example/x/github-miroir.git\n"), "gitlab.example");
  assert.equal(hostOf("git@github.com:a/gitlab-outils.git"), "github.com");
  assert.equal(hostOf("ssh://git@gitlab.com:22/a/b"), "gitlab.com");
  const miroir = forgeInjectee([VERSION], { remote: "https://gitlab.com/a/github-miroir.git" });
  assert.equal((await miroir.forge.availability()).forge, "gitlab");

  for (const [reponses, attendu] of [
    [{ "refs/remotes/origin/main": "abc\n" }, ["main"]],
    [{ "refs/remotes/origin/master": "abc\n" }, ["master"]],
    [{}, []],
  ]) {
    const { forge } = forgeInjectee([VERSION, [/pr list/, []]], { git: reponses });
    assert.deepEqual(
      (await forge.ci()).targets.map((t) => t.branch),
      attendu,
    );
  }
  const sansExecution = forgeInjectee([VERSION, [/pr list/, []], [/run list/, []]], { git: GIT_MAIN });
  assert.deepEqual((await sansExecution.forge.ci()).targets, [
    { kind: "main", number: null, title: null, branch: "main", sha: null, workflows: [] },
  ]);

  const nombreux = Array.from({ length: 205 }, (_, i) => HUB_RUN({ databaseId: i + 1 }));
  const beaucoup = forgeInjectee(
    [
      VERSION,
      [/pr list/, [HUB_PR()]],
      [/run list --branch=main/, nombreux.concat(nombreux[204])],
      [/run list/, [HUB_RUN({ status: "in_progress", conclusion: "" })]],
      [/\/jobs/, { jobs: [HUB_JOB] }],
    ],
    { git: GIT_MAIN },
  );
  const { targets } = await beaucoup.forge.ci();
  assert.equal(targets[0].workflows[0].conclusion, null);
  assert.equal(targets[1].workflows.length, 206);
  assert.equal(beaucoup.appels.filter((a) => a.includes("/runs/205/jobs")).length, 1, "une exécution finie n'est demandée qu'une fois");
});

/** Faux `gh` et `glab` sur le PATH : table de [expression, réponse], chaque appel noté. */
function outilsFactices(table) {
  const bin = tmp();
  const journal = join(bin, "appels.log");
  for (const outil of ["gh", "glab"]) {
    const script = `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const args = process.argv.slice(2).join(" ");
appendFileSync(${JSON.stringify(journal)}, ${JSON.stringify(outil)} + " " + args + "\\n");
if (args === "--version") { console.log("1.0"); process.exit(0); }
for (const [motif, r] of ${JSON.stringify(table)}) if (new RegExp(motif).test(args)) { process.stdout.write(typeof r === "string" ? r : JSON.stringify(r)); process.exit(0); }
process.exit(1);
`;
    writeFileSync(join(bin, outil), script);
    chmodSync(join(bin, outil), 0o755);
  }
  return {
    path: `${bin}:${process.env.PATH}`,
    appels: () => (existsSync(journal) ? readFileSync(journal, "utf8").trim().split("\n") : []),
  };
}

function brancher(p, origine) {
  git(p.dir, "remote", "add", "origin", origine);
  git(p.dir, "update-ref", "refs/remotes/origin/main", "HEAD");
  git(p.dir, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main");
}

const attendreVrai = async (condition, essais = 200) => {
  for (let i = 0; i < essais; i++) {
    if (await condition()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("condition jamais vraie");
};

test("QUA-273 : les vues CI et le tableau répondent de bout en bout par gh et par glab", posix, async () => {
  for (const [origine, table, outil] of [
    [
      ORIGINE_HUB,
      [
        ["pr list", [HUB_PR()]],
        ["run list", [HUB_RUN()]],
        ["runs/11/jobs", { jobs: [HUB_JOB] }],
        ["release list", []],
      ],
      "gh",
    ],
    [
      ORIGINE_LAB,
      [
        ["merge_requests\\?", [LAB_MR()]],
        ["merge_requests/7/diffs", [{ new_path: "x.ts" }]],
        ["pipelines/11/jobs", [LAB_JOB]],
        ["pipelines\\?", [LAB_PIPE()]],
        ["releases", []],
      ],
      "glab",
    ],
  ]) {
    const p = await projet({});
    brancher(p, origine);
    const faux = outilsFactices(table);
    const avant = empreintes(p.dir);
    const s = await demarrer(p, ["--port", "0"], { PATH: faux.path });
    const ci = await jsonDe(`${s.url}api/ci`);
    assert.equal(ci.missing, null);
    assert.equal(ci.forge, outil === "gh" ? "github" : "gitlab");
    assert.equal(ci.targets.at(-1).workflows[0].jobs[0].name, "tests");
    assert.equal((await jsonDe(`${s.url}api/board`)).cols.prs[0].number, 7);
    assert.ok(Array.isArray((await jsonDe(`${s.url}api/releases`)).releases));
    assert.equal(s.erreurs(), "");
    await s.arreter();
    assert.deepEqual(empreintes(p.dir), avant, "aucun fichier du projet ne change");
    assert.ok(
      faux.appels().every((a) => a.startsWith(`${outil} `)),
      "seul l'outil de la forge détectée est appelé",
    );
  }
});

test("QUA-280 : à l'arrêt du serveur, une commande de forge en cours ne survit pas", posix, async () => {
  const p = await projet({});
  git(p.dir, "remote", "add", "origin", ORIGINE_HUB);
  const bin = tmp();
  const trace = join(bin, "pid");
  writeFileSync(
    join(bin, "gh"),
    `#!/usr/bin/env node\nif (process.argv[2] === "--version") { console.log("1"); process.exit(0); }\nrequire("node:fs").writeFileSync(${JSON.stringify(trace)}, String(process.pid));\nsetTimeout(() => {}, 60000);\n`,
  );
  chmodSync(join(bin, "gh"), 0o755);
  const s = await demarrer(p, ["--port", "0"], { PATH: `${bin}:${process.env.PATH}` });
  await attendreVrai(() => existsSync(trace) && readFileSync(trace, "utf8") !== "");
  const pid = Number(readFileSync(trace, "utf8"));
  await s.arreter();
  await attendreVrai(() => {
    try {
      process.kill(pid, 0);
      return false;
    } catch {
      return true;
    }
  });
});

test(
  "QUA-271 : ni l'adresse de la forge, ni l'auteur, ni le login écrit par Git n'atteignent une réponse ni le journal",
  posix,
  async () => {
    const secret = `glpat-${"a1".repeat(12)}`;
    const adresse = "https://github.com/jeanne-owner/projet";
    const p = await projet({ "docs/intentions/idee.md": `# Intention : voir ${adresse}/releases\n` });
    brancher(p, ORIGINE_HUB);
    git(
      p.dir,
      "commit",
      "-q",
      "--allow-empty",
      "-m",
      "Merge pull request #3 from jeanne-owner/branche",
      "-m",
      "Corps du commit\n\nSigned-off-by: Paul Martin\nCo-Authored-By: Marie Curie <mc@ex.fr>\nDrwil-Lot: 2",
    );
    git(
      p.dir,
      "commit",
      "-q",
      "--allow-empty",
      "-m",
      "Merge branch 'x' of github.com:jeanne-owner/projet",
      "-m",
      "See merge request jeanne-owner/projet!4",
    );
    const sha = git(p.dir, "rev-parse", "HEAD~1").stdout.trim().slice(0, 12);
    const titre = `Titre @jeanne-t ${secret}`;
    const auteur = { login: "jeanne-t" };
    const faux = outilsFactices([
      ["pr list", [HUB_PR({ title: titre, author: auteur, url: `${adresse}/pull/7` })]],
      ["pr view", { ...HUB_VUE_PR, title: titre, body: "de @jeanne-t", author: auteur, url: `${adresse}/pull/7` }],
      ["run list", [HUB_RUN({ url: `${adresse}/actions/runs/11` })]],
      ["runs/11/jobs", { jobs: [{ ...HUB_JOB, html_url: `${adresse}/x`, runner_name: "jeanne-t" }] }],
      ["release list", [{ tagName: "v1", isLatest: true, isPrerelease: false, publishedAt: null, author: auteur }]],
    ]);
    const s = await demarrer(p, ["--port", "0"], { PATH: faux.path });
    await attendreVrai(async () => JSON.stringify(await jsonDe(`${s.url}api/events`)).includes("#7"));
    const corps = [];
    for (const route of [
      "api/ci",
      "api/board",
      "api/releases",
      "api/events",
      "api/detail?key=pr-7-open",
      "api/detail?key=ci-11-end",
      `api/detail?key=c-${sha}`,
      "api/file?path=docs/intentions/idee.md",
    ])
      corps.push(await (await fetch(s.url + route)).text());
    const tout = corps.join("\n");
    for (const interdit of ["jeanne-owner", "jeanne-t", secret, "Paul Martin", "Marie Curie", "mc@ex.fr", NOM_GIT])
      assert.ok(!tout.includes(interdit), interdit);
    assert.match(tout, /Corps du commit/);
    assert.equal((await jsonDe(`${s.url}api/detail?key=c-${sha}`)).type, "commit", "la clé d'un commit passe le masquage");
    const brut2 = readFileSync(join(projectCacheDir(p.dir, p.env), "events.jsonl"), "utf8");
    for (const interdit of ["jeanne-owner", "jeanne-t", secret, NOM_GIT]) assert.ok(!brut2.includes(interdit), `journal : ${interdit}`);
  },
);

test("QUA-271 : le filtre masque les logins des phrases de Git et des adresses de forge", () => {
  assert.equal(maskPersonal("Merge pull request #12 from jeanne/fix"), "Merge pull request #12 from [REDACTED]/fix");
  assert.equal(maskPersonal("Merge branch 'a' of git.ex:jeanne/p"), "Merge branch 'a' of [REDACTED]");
  assert.equal(maskPersonal("See merge request jeanne/p!1"), "See merge request [REDACTED]");
  assert.equal(maskPersonal("a\nCo-authored-by: Jeanne\nReviewed-By: Paul"), "a\nCo-authored-by: [REDACTED]\nReviewed-By: [REDACTED]");
  assert.equal(maskPersonal("voir https://gitlab.example.org/jeanne/p"), "voir https://gitlab.example.org/[REDACTED]/p");
  assert.equal(maskPersonal("voir https://www.github.com/jeanne"), "voir https://www.github.com/[REDACTED]");
  assert.equal(maskPersonal("Drwil-Lot: 2 et https://example.org/jeanne"), "Drwil-Lot: 2 et https://example.org/jeanne");
});

function observer(p, forge, dossier) {
  const journal = openJournal(dossier, (e) => maskPersonal(e, [NOM_GIT]));
  const veille = startWatch({ reader: createReader(p.dir), forge, journal, T: SERVE_TEXTS.fr });
  aArreter.push(async () => veille.stop());
  return { journal, veille };
}

const AUCUNE = { forge: null, cli: null, missing: "forgeNone" };
const FORGE_VIDE = {
  availability: async () => AUCUNE,
  prs: async () => ({ ...AUCUNE, prs: [] }),
  ci: async () => ({ ...AUCUNE, targets: [] }),
  releases: async () => [],
  pr: async () => null,
};

test("QUA-274 : le journal est propre à chaque projet, vit dans le cache de l'utilisateur et survit à un redémarrage sans doublon", async () => {
  const a = await projet({});
  const b = await projet({});
  git(a.dir, "commit", "--allow-empty", "-qm", "Clôture de quelque chose");
  git(a.dir, "commit", "--allow-empty", "-qm", "Commit avec lot", "-m", "Un corps\nsur deux lignes\n\nDrwil-Lot: 3");
  const avant = empreintes(a.dir);
  const av = await demarrer(a);
  const bv = await demarrer(b);
  const evA = (await jsonDe(`${av.url}api/events`)).events;
  const evB = (await jsonDe(`${bv.url}api/events`)).events;
  assert.ok(evA.some((e) => e.kind === "cloture"));
  const avecLot = evA.find((e) => e.text.startsWith("Commit avec lot"));
  assert.equal(avecLot.text, "Commit avec lot (lot 3)");
  assert.equal(avecLot.body, "Un corps sur deux lignes");
  assert.equal(avecLot.sha.length, 7);
  assert.ok(!evB.some((e) => e.kind === "cloture"), "le journal de l'un n'est pas celui de l'autre");
  await av.arreter();
  await bv.arreter();

  const dossierA = projectCacheDir(a.dir, a.env);
  assert.notEqual(dossierA, projectCacheDir(b.dir, a.env));
  assert.ok(existsSync(join(dossierA, "events.jsonl")));
  assert.equal(git(a.dir, "status", "--porcelain").stdout, "");
  assert.deepEqual(empreintes(a.dir), avant);
  const lignes = () => readFileSync(join(dossierA, "events.jsonl"), "utf8").trim().split("\n").length;
  const n = lignes();
  const encore = await demarrer(a);
  assert.equal((await jsonDe(`${encore.url}api/events`)).events.filter((e) => e.kind === "cloture").length, 1);
  await encore.arreter();
  assert.equal(lignes(), n, "un même fait n'est écrit qu'une fois");
});

test("QUA-274 : le journal relève état, lots, décisions, attestations, PR et CI", async () => {
  const p = await projet({});
  const dossier = tmp();
  const ecrireEtat = (etat, lot) => {
    ecrire(p.dir, ".drwil/state.json", JSON.stringify(etat));
    ecrire(p.dir, ".drwil/lot.json", JSON.stringify(lot));
  };
  const fiche = "docs/projects/x.md";
  ecrireEtat(
    {
      activity: "BUILD",
      since: "2026-03-01T10:00:00Z",
      active_brief: fiche,
      auto_merge: true,
      limits: [{ intent: "i", choice: "now" }],
      reopened: { pr: 5 },
      queue: ["y.md"],
    },
    { brief: fiche, current: 2, done: [1] },
  );
  ecrire(p.dir, ".drwil/evidence/attestations/QUA-001-2026-03-02T10-20-30-400Z.json", "{}");
  ecrire(p.dir, ".drwil/evidence/attestations/autre.json", "{}");
  const pr = (over) => ({
    number: 1,
    title: "t",
    state: "open",
    branch: "b",
    createdAt: CREEE,
    mergedAt: null,
    closedAt: null,
    paths: ["docs/a.md"],
    ...over,
  });
  const job = { name: "j", status: "completed", conclusion: "success", started: DEBUT, completed: FIN, steps: [] };
  const run = (over) => ({
    id: "9",
    name: "w",
    event: "push",
    status: "completed",
    conclusion: "success",
    created: CREEE,
    sha: "abc1234",
    jobs: [job],
    ...over,
  });
  const CIBLE = { forge: "gitlab", cli: "glab", missing: null };
  const forge = {
    ...FORGE_VIDE,
    prs: async () => ({
      ...CIBLE,
      prs: [pr({}), pr({ number: 2, mergedAt: CREEE, paths: ["src/a.ts"] }), pr({ number: 3, closedAt: CREEE })],
    }),
    ci: async () => ({
      ...CIBLE,
      targets: [
        {
          kind: "pr",
          number: 2,
          title: "t",
          branch: "b",
          sha: "abc1234",
          workflows: [
            run({}),
            run({ id: "10", conclusion: "failure", jobs: [] }),
            run({ id: "11", status: "in_progress", conclusion: null }),
          ],
        },
        {
          kind: "main",
          number: null,
          title: null,
          branch: "main",
          sha: "abc1234",
          workflows: [run({ id: "12", jobs: [{ ...job, started: null, completed: null }] })],
        },
      ],
    }),
  };
  const un = observer(p, forge, dossier);
  await attendreVrai(() => un.journal.list().some((e) => e.key === "ci-12-end"));
  un.veille.stop();
  const textes = un.journal.list().map((e) => e.text);
  for (const attendu of [
    "Activité BUILD (premier relevé)",
    "Relevé initial : Lot 1 fait",
    "Relevé initial : Lot courant : 2",
    "Relevé initial : Fusion automatique autorisée par l'humain",
    "Relevé initial : Limite hors cadre : i → « Traiter maintenant »",
    "Relevé initial : Chantier rouvert (PR #5)",
    "File de chantiers : y.md",
    "Attestation humaine de QUA-001",
    "MR #1 ouverte — t",
    "MR #2 fusionnée — t",
    "MR #3 fermée sans fusion — t",
    "CI démarrée : w sur MR #2 (abc1234)",
    "CI verte : w sur MR #2 (abc1234)",
    "CI rouge (failure) : w sur MR #2 (abc1234)",
    "CI verte : w sur main (abc1234)",
  ])
    assert.ok(textes.includes(attendu), attendu);
  const trouver = (cle) => un.journal.list().find((e) => e.key === cle);
  assert.equal(un.journal.list().find((e) => e.kind === "attestation").at, "2026-03-02T10:20:30.400Z");
  assert.equal(trouver("pr-2-merged").nature, "code");
  assert.equal(trouver("pr-1-open").nature, "doc");
  assert.equal(trouver("ci-11-end"), undefined, "une exécution en cours n'a pas de fin");
  assert.equal(trouver("ci-12-end").at, new Date(CREEE).toISOString(), "sans date de job, celle de l'exécution");

  ecrireEtat(
    {
      activity: "VERIFY",
      since: "2026-03-07T10:00:00Z",
      active_brief: "docs/projects/z.md",
      auto_merge: false,
      limits: [
        { intent: "i", choice: "note" },
        { intent: "j", choice: "maison" },
      ],
      reopened: { pr: 6 },
      queue: [],
    },
    { brief: "docs/projects/z.md", current: 3, done: [1, 2] },
  );
  const deux = observer(p, FORGE_VIDE, dossier);
  await deux.veille.localReady;
  deux.veille.stop();
  const apres = deux.journal.list().map((e) => e.text);
  for (const attendu of [
    "Activité BUILD → VERIFY",
    "Fiche active : docs/projects/z.md",
    "Lot 2 fait",
    "Lot courant : 3",
    "Fusion automatique retirée",
    "Limite hors cadre : i → « Noter en intention »",
    "Limite hors cadre : j → « maison »",
    "Chantier rouvert (PR #6)",
  ])
    assert.ok(apres.includes(attendu), attendu);
  assert.equal(apres.filter((t) => t === "Attestation humaine de QUA-001").length, 1, "pas de doublon");
});

test("QUA-274 : le journal est borné, tolère une ligne illisible, un état illisible et un cache inutilisable", async () => {
  const borne = tmp();
  const grosses = Array.from({ length: 5100 }, (_, i) => JSON.stringify({ at: "2026-01-01", kind: "k", key: `k${i}`, text: "x" }));
  writeFileSync(join(borne, "events.jsonl"), `pas du json\nnull\n${grosses.join("\n")}\n`);
  const grand = openJournal(borne, (e) => e);
  const lignes = () => readFileSync(join(borne, "events.jsonl"), "utf8").trim().split("\n").length;
  assert.equal(grand.list().length, 1000);
  assert.equal(lignes(), 5000);
  assert.equal(grand.empty, false);
  grand.add({ at: "pas une date", kind: "k", key: "k5099", text: "doublon" });
  grand.add({ at: "pas une date", kind: "k", key: "neuf", text: "n" });
  assert.equal(grand.list().filter((e) => e.key === "neuf").length, 1);
  assert.equal(lignes(), 5001);
  writeFileSync(join(borne, "state-last.json"), "pas du json");
  assert.equal(grand.snapshot(), null);

  const p = await projet({});
  const fichier = join(tmp(), "un-fichier");
  writeFileSync(fichier, "x");
  const s = await startServer({ root: p.dir, host: "127.0.0.1", port: 0, token: null, cacheDir: join(fichier, "sous-dossier") });
  aArreter.push(() => s.stop());
  const vue = await jsonDe(`${s.url}api/events`);
  assert.ok(
    vue.events.some((e) => e.kind === "commit"),
    "le journal reste en mémoire",
  );
});

test("QUA-275 : sans forge, sans preuve et sans consommation, les vues sont vides, sans erreur, et disent ce qui manque", async () => {
  const p = await projet({});
  const s = await demarrer(p);
  for (const route of ["api/ci", "api/board", "api/releases", "api/events"]) {
    const r = await fetch(s.url + route);
    assert.equal(r.status, 200, route);
    assert.match((await r.json()).missing, /Aucune forge détectée/, route);
  }
  const ci = await jsonDe(`${s.url}api/ci`);
  assert.deepEqual(ci.targets, []);
  assert.equal(ci.forge, null);
  assert.ok(!("cli" in ci), "le champ interne ne sort pas");
  assert.match((await jsonDe(`${s.url}api/usage`)).missing, /usage\.jsonl/);
  assert.match((await jsonDe(`${s.url}api/contracts`)).missing, /drwil verify/);
  const audits = await jsonDe(`${s.url}api/audits`);
  assert.deepEqual(audits.audits, []);
  assert.match(audits.missing, /docs\/audit-risques\.md absent/);
  assert.match(audits.missing, /docs\/decouverte-valeur\.md absent/);
  assert.deepEqual(await jsonDe(`${s.url}api/detail?key=pr-1-open`), { error: "forge unavailable" });
  assert.equal(s.erreurs(), "");
});

test("QUA-275 : outil absent ou forge injoignable sont distingués ; une réponse inattendue vaut injoignable", async () => {
  const sansOutil = forgeInjectee([]);
  assert.equal((await sansOutil.forge.prs()).missing, "forgeNoCli");
  assert.equal(await sansOutil.forge.pr(1), null);
  assert.deepEqual(await sansOutil.forge.releases(), []);
  for (const reponses of [[VERSION], [VERSION, [/pr list/, { message: "401" }]], [VERSION, [/pr list/, [{ number: 1 }]]]]) {
    const { forge } = forgeInjectee(reponses, { git: GIT_MAIN });
    assert.equal((await forge.prs()).missing, "forgeUnreachable");
    const ci = await forge.ci();
    assert.deepEqual([ci.missing, ci.targets], ["forgeUnreachable", []]);
  }
  assert.equal(natureOf([]), "code");
  assert.equal(natureOf(["a.md", ".drwil/usage.jsonl", ".drwil/evidence/v.json", "docs/x.png"]), "doc");
  assert.equal(natureOf(["a.md", "b.ts"]), "code");
  assert.deepEqual(Object.keys(SERVE_TEXTS.en).sort(), Object.keys(SERVE_TEXTS.fr).sort(), "mêmes messages dans les deux langues");
});

const LIGNE_INDEX = (titre, version, chemin, marques = "") => `- [ ] ${marques}${titre} (${version}) — \`${chemin}\`\n`;

async function projetTableau() {
  const index = (extra = "") =>
    `# Index\n\n## Thème\n\n${LIGNE_INDEX("Active", "1.2.0, 2", "docs/projects/active.md", "[P1] [IA] ")}${LIGNE_INDEX("Cadrée", "1.2.0, 1", "docs/projects/cadree.md")}${LIGNE_INDEX("Idée", "1.3.0", "docs/intentions/idee.md", "[décision] ")}  suite de la puce.\n${LIGNE_INDEX("Référence", "1.3.0", "docs/projects/reference.md")}${LIGNE_INDEX("Disparue", "1.3.0", "docs/projects/disparue.md")}${LIGNE_INDEX("Fusionnée", "1.2.0", "docs/projects/mergee.md")}${LIGNE_INDEX("Ouverte", "1.2.0", "docs/projects/ouverte.md")}${LIGNE_INDEX("Close", "1.3.0", "docs/projects/close.md")}${LIGNE_INDEX("Sur main", "1.3.0", "docs/projects/sur-main.md")}- [x] Faite (1.2.0) — \`docs/projects/faite.md\`\n${extra}\nFin.\n`;
  const BRIEFS = [
    { path: "docs/projects/cadree.md", title: "Cadrée", priority: "P1", decisions: 0, ready: true, maturity: "prêt" },
    { path: "docs/projects/active.md", title: "Active", priority: null, decisions: 0, ready: true, maturity: "prêt" },
  ];
  const p = await projet({
    "docs/projects/pending.md": index(`- [ ] Retirée (1.2.0) — \`docs/projects/retiree.md\`\n  sur deux lignes.\n`),
    ".githooks/state.mjs": `console.log(${JSON.stringify(JSON.stringify(BRIEFS))});\n`,
    "docs/projects/active.md": "# Projet : le chantier actif\n\n**Intention** : `docs/intentions/couverte.md`\n",
    "docs/projects/cadree.md": "# Cadrée\n\n**Intent**: `docs/intentions/couverte2.md`\n",
    "docs/projects/reference.md": "# Référence\n",
    "docs/projects/journal.md":
      "# Journal\n\n## Ancienne entrée\n\nsur workstream/close\n\n## Autre\n\n- **Clôturé par** : commit `abc`, workstream/close\n",
    "docs/intentions/idee.md": "# Intention : une idée\n\n## Questions à trancher\n\n- une\n",
    "docs/intentions/couverte.md": "# Intention : couverte\n",
    "docs/intentions/couverte2.md": "# Intention : couverte aussi\n",
    "docs/intentions/notes.md": "# Notes\n\n- 2026-11-08 — une note\n- sans date\n",
    "CHANGELOG.md": "# Changelog\n\n## Unreleased\n\nÀ venir.\n\n## [1.0.0] - date\n\nPremière.\n",
    ".drwil/usage.jsonl": '{"workstream":"a","tokens":5,"date":"2000-01-01"}\n{"workstream":"b","tokens":3,"date":"2999-01-01"}\n',
  });
  // Annotés et datés : sur un même commit, deux tags légers ont la même date et leur ordre n'est pas garanti.
  const etiqueter = (tag, date) =>
    spawnSync("git", ["tag", "-a", "-m", tag, tag], { cwd: p.dir, env: { ...process.env, GIT_COMMITTER_DATE: date } });
  etiqueter("v0.9.0-rc1", "2020-01-01T00:00:00Z");
  etiqueter("v1.0.0", "2020-06-01T00:00:00Z");
  const journalPrincipal = "# Journal\n\n## Clôturé\n\nworkstream/sur-main\n";
  ecrire(p.dir, "docs/projects/journal.md", journalPrincipal);
  git(p.dir, "add", "-A");
  git(p.dir, "commit", "-qm", "Journal principal");
  git(p.dir, "update-ref", "refs/remotes/origin/main", "HEAD");
  git(p.dir, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main");
  ecrire(p.dir, "docs/projects/pending.md", index());
  git(p.dir, "add", "-A");
  git(p.dir, "commit", "-qm", "Retirée de l'index");
  ecrire(p.dir, "docs/projects/journal.md", `${journalPrincipal}\n## Close\n\n- **Clôturé par** : commit \`abc\`, workstream/close\n`);
  ecrire(
    p.dir,
    ".drwil/state.json",
    JSON.stringify({ activity: "BUILD", active_brief: "docs/projects/active.md", auto_merge: true, reopened: { pr: 4 } }),
  );
  ecrire(p.dir, ".drwil/lot.json", JSON.stringify({ brief: "docs/projects/active.md", current: 2, done: [1] }));
  return p;
}

const PR_FAITE = (number, branch, state, over = {}) => ({
  number,
  title: `pr ${number}`,
  state,
  branch,
  createdAt: "2030-01-01T00:00:00Z",
  mergedAt: null,
  closedAt: null,
  paths: ["docs/a.md"],
  ...over,
});
const AVEC_PRS = (prs, ouverte = { forge: "github", cli: "gh", missing: null }) => ({
  ...FORGE_VIDE,
  prs: async () => ({ ...ouverte, prs }),
});

test("QUA-273 : le tableau se déduit des fichiers, de l'état, de Git et de la forge, sans carte déplacée à la main", async () => {
  const p = await projetTableau();
  const prs = [
    PR_FAITE(1, "workstream/active", "open"),
    PR_FAITE(2, "workstream/ouverte", "open", { paths: ["src/a.ts"] }),
    PR_FAITE(3, "workstream/mergee", "merged", { mergedAt: "2030-02-01T00:00:00Z" }),
    PR_FAITE(4, "x", "merged", { mergedAt: "2030-03-01T00:00:00Z", paths: ["src/b.ts"] }),
    PR_FAITE(5, "y", "merged", { mergedAt: "2000-01-01T00:00:00Z" }),
  ];
  const vue = await createBoard(createReader(p.dir), AVEC_PRS(prs))();
  assert.equal(vue.forge, "github");
  assert.equal(vue.missing, null);
  assert.equal(vue.lastRelease, "v1.0.0");
  const { cols, targets } = vue;
  assert.deepEqual(
    cols.notes.map((n) => [n.title, n.date]),
    [
      ["sans date", null],
      ["une note", "2026-11-08"],
    ],
  );
  assert.deepEqual(
    cols.intentions.map((i) => i.id),
    ["docs/intentions/idee.md"],
    "une intention couverte par une fiche n'y est plus",
  );
  assert.deepEqual(cols.intentions[0].marks, ["décision"]);
  assert.equal(cols.intentions[0].questions, 1);
  assert.equal(cols.intentions[0].version, "1.3.0");
  assert.deepEqual(
    cols.fiches.map((f) => [f.id, f.priority, f.version, f.order]),
    [["docs/projects/cadree.md", "P1", "1.2.0", 1]],
  );
  assert.equal(cols.chantier[0].title, "le chantier actif");
  assert.deepEqual(cols.chantier[0].lot, { current: 2, done: [1] });
  assert.deepEqual([cols.chantier[0].number, cols.chantier[0].reopened, cols.chantier[0].autoMerge], [1, 4, true]);
  assert.deepEqual(
    cols.prs.map((c) => [c.id, c.nature, c.branch]),
    [["pr-2", "code", "workstream/ouverte"]],
  );
  assert.deepEqual(
    cols.fusionnees.map((c) => c.number),
    [4, 3],
    "après la dernière release, la plus récente d'abord",
  );
  assert.deepEqual(cols.publiees[0], { id: "v1.0.0", title: "v1.0.0", date: cols.publiees[0].date, code: 0, doc: 0 });

  const v120 = targets.find((t) => t.version === "1.2.0");
  const stadeDe = (t, chemin) => t.items.find((i) => i.path === chemin);
  assert.deepEqual([stadeDe(v120, "docs/projects/active.md").stage, stadeDe(v120, "docs/projects/active.md").number], ["chantier", 1]);
  assert.equal(stadeDe(v120, "docs/projects/cadree.md").stage, "fiche");
  assert.deepEqual([stadeDe(v120, "docs/projects/mergee.md").stage, stadeDe(v120, "docs/projects/mergee.md").number], ["fusionnee", 3]);
  assert.deepEqual([stadeDe(v120, "docs/projects/ouverte.md").stage, stadeDe(v120, "docs/projects/ouverte.md").number], ["pr", 2]);
  const retiree = stadeDe(v120, "docs/projects/retiree.md");
  assert.equal(retiree.removed, true, "un élément retiré de l'index depuis la release reste compté");
  assert.equal(retiree.stage, "autre");
  assert.equal(v120.items[0].order, 1, "ordre du repère");
  assert.deepEqual([v120.done, v120.total], [1, v120.items.length]);
  const v130 = targets.find((t) => t.version === "1.3.0");
  assert.equal(stadeDe(v130, "docs/intentions/idee.md").stage, "intention");
  assert.equal(stadeDe(v130, "docs/projects/reference.md"), undefined, "un document de référence n'est pas un élément de version");
  assert.equal(stadeDe(v130, "docs/projects/disparue.md").stage, "autre");
  assert.deepEqual([stadeDe(v130, "docs/projects/close.md").stage, stadeDe(v130, "docs/projects/close.md").number], ["pr", null]);
  assert.deepEqual(
    [stadeDe(v130, "docs/projects/sur-main.md").stage, stadeDe(v130, "docs/projects/sur-main.md").number],
    ["fusionnee", null],
  );
});

test("QUA-273 : sans chantier ni release, le tableau reste complet ; un état en SCOPING n'a pas de carte active", async () => {
  const p = await projet({
    ".githooks/state.mjs": 'console.log("[]");\n',
    "docs/projects/pending.md": "- [ ] Sans version — `docs/intentions/x.md`\n",
  });
  ecrire(p.dir, ".drwil/state.json", JSON.stringify({ activity: "SCOPING", active_brief: "docs/projects/x.md" }));
  const vue = await createBoard(createReader(p.dir), FORGE_VIDE)();
  assert.deepEqual(vue.cols.chantier, []);
  assert.deepEqual(vue.targets, []);
  assert.equal(vue.lastRelease, null);
  assert.equal(vue.missing, "forgeNone");
  ecrire(p.dir, ".drwil/state.json", JSON.stringify({ activity: "BUILD", active_brief: "docs/projects/sans-titre.md" }));
  ecrire(p.dir, ".drwil/lot.json", JSON.stringify({ brief: "docs/projects/autre.md", current: 1, done: [] }));
  const actif = await createBoard(createReader(p.dir), AVEC_PRS([PR_FAITE(1, "x", "open")]))();
  assert.equal(actif.cols.chantier[0].title, "docs/projects/sans-titre.md");
  assert.equal(actif.cols.chantier[0].lot, null);
  assert.equal(actif.cols.chantier[0].number, null);
  assert.equal(actif.cols.fusionnees.length, 0);
  assert.equal(actif.cols.prs.length, 1);
});

test("QUA-273 : les releases croisent tags, journal des changements, PR et consommation ; le journal d'un paquet est trouvé", async () => {
  const p = await projetTableau();
  const prs = [
    PR_FAITE(1, "a", "merged", { mergedAt: "2000-01-02T00:00:00Z", paths: ["src/a.ts"] }),
    PR_FAITE(2, "b", "merged", { mergedAt: "2999-01-01T00:00:00Z" }),
    PR_FAITE(3, "c", "merged", { mergedAt: "2999-02-01T00:00:00Z" }),
    PR_FAITE(4, "d", "open"),
  ];
  const forge = { ...AVEC_PRS(prs), releases: async () => [{ tag: "v1.0.0", latest: true, prerelease: false, publishedAt: CREEE }] };
  const { releases, missing, forge: nom } = await createReleases(createReader(p.dir), forge)();
  assert.deepEqual([nom, missing], ["github", null]);
  const [avenir, v1, rc] = releases;
  assert.equal(avenir.tag, "Unreleased");
  assert.equal(avenir.changelog, "À venir.");
  assert.deepEqual(
    avenir.prs.map((x) => x.number),
    [3, 2],
  );
  assert.deepEqual(avenir.workstreams, [{ name: "b", tokens: 3 }]);
  assert.equal(avenir.tokens, 3);
  assert.equal(avenir.date, null);
  assert.deepEqual([v1.tag, v1.latest, v1.published, v1.prerelease, v1.changelog], ["v1.0.0", true, true, false, "Première."]);
  assert.deepEqual([rc.tag, rc.published, rc.prerelease, rc.latest], ["v0.9.0-rc1", false, true, false]);
  assert.deepEqual(
    v1.workstreams
      .map((w) => w.name)
      .concat(rc.workstreams.map((w) => w.name))
      .sort(),
    ["a"],
  );

  const paquet = await projet({ "packages/lib/README.md": "x", "packages/app/CHANGELOG.md": "## Unreleased\n\nDu paquet.\n" });
  const vue = await createReleases(createReader(paquet.dir), FORGE_VIDE)();
  assert.equal(vue.releases[0].changelog, "Du paquet.");
  assert.equal(vue.missing, "forgeNone");
  const sansJournal = await projet({});
  assert.equal((await createReleases(createReader(sansJournal.dir), FORGE_VIDE)()).releases[0].changelog, "");
});

test("QUA-280 : un détail n'accepte qu'une clé ou un nom valide, et se lit sans rien de nominatif", async () => {
  const p = await projet({
    "docs/projects/journal.md": "# J\n\n## Mention seule\n\nworkstream/mention\n\n## Vraie\n\n- **Closed by**: workstream/vrai\n",
    "docs/contracts.md": "# Registre\n\n## ABC-001 — Un contrat\n**Règle** : r\n",
  });
  git(p.dir, "commit", "--allow-empty", "-qm", "Commit du chantier", "-m", "Corps\n\nDrwil-Brief: docs/projects/vrai.md\nDrwil-Lot: 3");
  git(p.dir, "commit", "--allow-empty", "-qm", "Sans lot", "-m", "Drwil-Brief: docs/projects/vrai.md");
  const sha = git(p.dir, "rev-parse", "HEAD~1").stdout.trim();
  ecrire(
    p.dir,
    ".drwil/evidence/attestations/a.json",
    JSON.stringify({
      contract: "ABC-001",
      status: "ok",
      actor: { name: NOM_GIT, source: "terminal" },
      note: "vu",
      commit: "0123456789",
      covers: ["x"],
    }),
  );
  ecrire(p.dir, ".drwil/evidence/attestations/b.json", JSON.stringify({ contract: "ZZZ-999", status: "ok" }));
  const forge = {
    ...FORGE_VIDE,
    pr: async (n) => (n === 7 ? { number: 7, body: "b" } : null),
    ci: async () => ({ ...AUCUNE, targets: [{ workflows: [{ id: "11", jobs: [{ name: "j" }] }] }] }),
  };
  const { detail, workstream } = createDetails(createReader(p.dir), forge);

  for (const cle of ["", "c-xyz", "c-12", "pr-1", "pr-a-open", "ci-a-end", "att-../secret.json", "att-a b.json", "autre"])
    assert.deepEqual(await detail(cle), { error: "key refused" }, cle);
  const commit = await detail(`c-${sha}`);
  assert.equal(commit.type, "commit");
  assert.equal(commit.message.split("\n")[0], "Commit du chantier");
  assert.equal(commit.summary, "");
  assert.deepEqual(commit.files, []);
  assert.ok(commit.branches.length > 0);
  assert.ok(!("author" in commit));
  assert.deepEqual(await detail("c-0000000000"), { error: "not found" });
  assert.deepEqual(await detail("pr-7-open"), { type: "pr", number: 7, body: "b" });
  assert.deepEqual(await detail("pr-8-open"), { error: "forge unavailable" });
  assert.deepEqual(await detail("ci-11-end"), { type: "ci", jobs: [{ name: "j" }] });
  assert.deepEqual(await detail("ci-12-end"), { error: "run not found" });
  assert.deepEqual(await detail("att-a.json"), {
    type: "attestation",
    contract: "ABC-001",
    title: "Un contrat",
    status: "ok",
    source: "terminal",
    note: "vu",
    commit: "0123456",
    covers: ["x"],
  });
  assert.deepEqual(await detail("att-b.json"), {
    type: "attestation",
    contract: "ZZZ-999",
    title: "",
    status: "ok",
    source: null,
    note: "",
    commit: null,
    covers: [],
  });
  assert.deepEqual(await detail("att-absente.json"), { error: "attestation not found" });

  assert.deepEqual(await workstream("../x", []), { error: "name refused" });
  const decisions = [
    { brief: "docs/projects/vrai.md", kind: "lot", key: "1", at: "a", text: "t" },
    { brief: "docs/projects/vrai.md", kind: "commit", key: "2", at: "a", text: "t" },
    { brief: "autre", kind: "lot", key: "3", at: "a", text: "t" },
  ];
  const vue = await workstream("vrai", decisions);
  assert.equal(vue.commits, 2);
  assert.equal(vue.lots["3"][0].subject, "Commit du chantier");
  assert.equal(vue.lots[""][0].subject, "Sans lot");
  assert.match(vue.entry, /Closed by/);
  assert.deepEqual(
    vue.decisions.map((e) => e.key),
    ["1"],
  );
  assert.match((await workstream("mention", [])).entry, /Mention seule/);
  assert.equal((await workstream("rien", [])).entry, "");
  assert.equal((await workstream("rien", [])).commits, 0);
});

test("QUA-273 : un lien de PR ou MR se déduit d'origin seul, sans identifiant et vers cette forge seulement", () => {
  for (const [origine, attendu] of [
    ["https://github.com/acme/outil.git", "https://github.com/acme/outil/pull/12"],
    ["git@github.com:acme/outil.git", "https://github.com/acme/outil/pull/12"],
    ["https://jeton:secret@github.com/acme/outil", "https://github.com/acme/outil/pull/12"],
    ["git@gitlab.com:groupe/sous/outil.git\n", "https://gitlab.com/groupe/sous/outil/-/merge_requests/12"],
    ["ssh://git@gitlab.example.com:2222/groupe/outil.git", "https://gitlab.example.com/groupe/outil/-/merge_requests/12"],
    ["http://gitlab.interne:8080/groupe/outil.git/", "http://gitlab.interne:8080/groupe/outil/-/merge_requests/12"],
  ])
    assert.equal(forgeLink(origine, 12), attendu, origine);
  for (const refuse of [
    "",
    "git@github-perso:acme/outil.git",
    "github-perso:acme/outil.git",
    "https://ailleurs.example/acme/outil",
    "https://github.com/seul",
    "https://github.com/acme/../outil",
    "https://github.com/acme/outil?x=1",
    "https://github.com/acme/outil#f",
    "javascript://github.com/acme/outil",
  ])
    assert.equal(forgeLink(refuse, 12), null, refuse);
});

test("QUA-280 : la redirection vers une PR ou MR n'accepte qu'un numéro, en GET, et sans en-tête Host étranger", async () => {
  for (const [origine, attendu] of [
    [ORIGINE_HUB, /^https:\/\/github\.com\/.+\/pull\/12$/],
    [ORIGINE_LAB, /^https:\/\/gitlab\.com\/.+\/-\/merge_requests\/12$/],
  ]) {
    const p = await projet({});
    brancher(p, origine);
    const s = await demarrer(p);
    const lien = await brut(s.port, "/forge/pr/12");
    assert.equal(lien.status, 302);
    assert.match(lien.entetes.location, attendu);
    assert.equal(lien.corps, "", "aucune adresse dans un corps de réponse (QUA-271)");
    for (const mauvais of ["0", "abc", "12x", "1234567890", "12/13", "%31"]) {
      const r = await brut(s.port, `/forge/pr/${mauvais}`);
      assert.equal(r.status, 404, mauvais);
      assert.equal(r.entetes.location, undefined, mauvais);
    }
    assert.equal((await brut(s.port, "/forge/pr/12", { host: "attaquant.example" })).status, 403);
    const poste = await fetch(`${s.url}forge/pr/12`, { method: "POST", redirect: "manual" });
    assert.equal(poste.status, 405);
    assert.equal(poste.headers.get("location"), null);
    await s.arreter();
  }
});

test("QUA-271 : l'adresse de forge ne sort que par l'en-tête de la redirection, jamais dans un corps de réponse", posix, async () => {
  const p = await projet({});
  brancher(p, ORIGINE_HUB);
  const faux = outilsFactices([
    ["pr list", [HUB_PR()]],
    ["run list", [HUB_RUN()]],
    ["runs/11/jobs", { jobs: [HUB_JOB] }],
    ["release list", []],
  ]);
  const s = await demarrer(p, ["--port", "0"], { PATH: faux.path });
  for (const route of ROUTES.filter(Boolean)) {
    const { corps } = await brut(s.port, `/${route}`);
    assert.ok(!corps.includes("github.com/jeanne-owner"), route);
  }
  const lien = await brut(s.port, "/forge/pr/7");
  assert.equal(lien.corps, "");
  assert.ok(lien.entetes.location.includes("github.com/jeanne-owner/projet/pull/7"));
});

test("QUA-275 : sans forge reconnue, la redirection répond 404 sans adresse", async () => {
  const p = await projet({});
  const s = await demarrer(p);
  const r = await brut(s.port, "/forge/pr/12");
  assert.equal(r.status, 404);
  assert.deepEqual(JSON.parse(r.corps), { error: "no forge" });
  assert.equal(r.entetes.location, undefined);
});

test("QUA-281 : la redirection est refusée sans jeton valide", async () => {
  const p = await projet({});
  brancher(p, ORIGINE_HUB);
  const jeton = randomBytes(32).toString("hex");
  const s = await demarrer(p, ["--host", "0.0.0.0", "--port", "0"], { DRWIL_SERVE_TOKEN: jeton });
  const brutJeton = (entetes) =>
    new Promise((resolve, reject) => {
      const req = request({ host: "127.0.0.1", port: s.port, path: "/forge/pr/12", headers: entetes }, (res) => {
        res.resume();
        res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location }));
      });
      req.on("error", reject);
      req.end();
    });
  const refus = await brutJeton({});
  assert.equal(refus.status, 401);
  assert.equal(refus.location, undefined);
  const ok = await brutJeton({ authorization: `Bearer ${jeton}` });
  assert.equal(ok.status, 302);
  assert.match(ok.location, /\/pull\/12$/);
});

const PAGE = readFileSync(join(racinePaquet, "serve", "page.html"), "utf8");
const scriptDeLaPage = /<script>\n([\s\S]*?)<\/script>/.exec(PAGE)[1];
const textes = JSON.parse(/const I18N = (\{[\s\S]*?\n\});\n/.exec(scriptDeLaPage)[1]);

test("QUA-276 : la page tient sur 360 px par sa structure : pas de largeur fixe, de cellule de tableau ni de débordement masqué", () => {
  assert.match(PAGE, /name="viewport" content="width=device-width, initial-scale=1"/);
  const base = PAGE.slice(PAGE.indexOf("<style>"), PAGE.indexOf("@media (min-width:900px)"));
  for (const m of base.matchAll(/(?:^|[;{\s])(?:min-width|width|flex-basis)\s*:\s*(\d+)px/g))
    assert.ok(Number(m[1]) <= 360, `largeur fixe trop grande : ${m[0]}`);
  assert.ok(!/flex\s*:\s*0 0 \d{3,}px/.test(base), "colonne de largeur fixe hors du grand écran");
  assert.ok(!/nowrap/.test(base), "aucun texte insécable hors du grand écran");
  assert.ok(
    !/overflow(?:-x)?\s*:\s*(?:hidden|clip)/.test(
      PAGE.slice(PAGE.indexOf("<style>"), PAGE.indexOf("</style>")).replace(/\.prog \{[^}]*\}/, ""),
    ),
    "le débordement n'est pas masqué",
  );
  assert.ok(!/<table|<td/.test(PAGE), "pas de tableau, trop large sur téléphone");
  assert.match(base, /overflow-wrap:\s*anywhere/);
  const nav = base.match(/\n\s*nav \{[^}]*\}/)?.[0] ?? "";
  assert.match(nav, /flex-wrap:\s*wrap/, "les onglets passent à la ligne");
  assert.ok(!/overflow-x/.test(nav), "aucun onglet accessible seulement en faisant défiler la barre");
});

test("QUA-276 : français et anglais ont les mêmes libellés, chaque code rendu par l'API est traduit, le script se compile", () => {
  assert.deepEqual(Object.keys(textes.fr).sort(), Object.keys(textes.en).sort());
  for (const cles of Object.values(textes))
    for (const [cle, valeur] of Object.entries(cles)) assert.ok(typeof valeur === "string" && valeur.trim(), cle);
  for (const cle of [
    ...["fusionnee", "pr", "chantier", "fiche", "intention", "autre"].map((c) => `stage-${c}`),
    ...["ready", "refine", "in-progress", "unset"].map((c) => `mat-${c}`),
    ...["open", "merged", "closed"].map((c) => `state-${c}`),
    ...["pass", "attested", "manual", "fail", "error", "other"].map((c) => `st-${c}`),
    ...["new", "changed"].map((c) => `change-${c}`),
    ...[
      "activite",
      "decision",
      "attestation",
      "lot",
      "reouverture",
      "fiche",
      "file",
      "commit",
      "cloture",
      "pr",
      "fusion",
      "fusion-doc",
      "ci",
      "ci-ok",
      "ci-ko",
    ].map((c) => `kind-${c}`),
    ...["notes", "intentions", "fiches", "chantier", "prs", "fusionnees", "publiees"].map((c) => `col-${c}`),
    ...["ci", "kb", "tl", "rel", "ct", "us", "me", "au", "briefs", "int", "notes"].map((c) => `tab-${c}`),
    "ready",
    "notReady",
  ])
    assert.ok(textes.fr[cle] && textes.en[cle], cle);
  for (const m of scriptDeLaPage.matchAll(/\bt\("([\w-]+)"/g)) assert.ok(textes.fr[m[1]], `libellé inconnu : ${m[1]}`);
  assert.doesNotThrow(() => new Script(scriptDeLaPage));
});

test("QUA-276 : la page ne porte aucune adresse de forge et ne fait ses liens de PR que par la redirection", () => {
  assert.ok(!/(?:github|gitlab)\.com/.test(PAGE));
  assert.match(scriptDeLaPage, /href="\/forge\/pr\/\$\{Number\(n\)\}"/);
  assert.ok(!/href="\$\{(?!Number)/.test(scriptDeLaPage), "aucun lien bâti sur une valeur de l'API");
});

const AUJOURDHUI = new Date().toISOString().slice(0, 10);
const FICHE_SANS_STATUT = "# Projet : sans statut\n\nPas de ligne.\n";

test("QUA-276 : la page montre audits, index, statut des fiches, autres documents, catalogue et modèles", async () => {
  const p = await projet({
    "docs/audit-risques.md": `# Audit des risques\n\n> Dernier scan : ${AUJOURDHUI}\n> Niveau : fragile\n> suite de la ligne\n\n## Synthèse\n`,
    "docs/decouverte-valeur.md": "# Découverte\n\n> Dernier scan : 2020-01-01\n\nTexte.\n",
    "docs/projects/pending.md": "# Index\n\n- [ ] Un chantier — `docs/projects/x.md`\n  sur deux lignes.\n- [x] Fait\n\n- Pas une case\n",
    "docs/projects/journal.md": "# Journal\n",
    "docs/projects/model-brief.md": "# Modèle\n",
    "docs/projects/sans-statut.md": FICHE_SANS_STATUT,
    "docs/contracts-catalog.md":
      "# Catalogue\n\n| ID | Règle | Périmètre |\n|---|---|---|\n| catalogue:SEC-013 | Toute route déclare sa permission. | API |\n\nFin.\n",
    ".drwil/usage.jsonl":
      '{"workstream":"a","tokens":10,"model":"m1","date":"2026-01-01"}\n{"workstream":"a","tokens":"oups","model":"m2","date":"2026-01-02"}\n{"workstream":"sans-date","tokens":3}\n',
  });
  const s = await demarrer(p);

  const docs = await jsonDe(`${s.url}api/docs`);
  assert.deepEqual(docs.index, [
    { done: false, text: "Un chantier — `docs/projects/x.md` sur deux lignes." },
    { done: true, text: "Fait" },
  ]);
  const autres = Object.fromEntries(docs.others.map((o) => [o.path, o]));
  assert.ok(autres["docs/projects/journal.md"], "le journal figure parmi les autres documents");
  assert.equal(autres["docs/projects/sans-statut.md"]?.status, null);
  assert.equal(autres["docs/projects/model-brief.md"], undefined);
  assert.equal(autres["docs/projects/pending.md"], undefined);

  const contrats = await jsonDe(`${s.url}api/contracts`);
  assert.deepEqual(contrats.catalog, [{ id: "catalogue:SEC-013", rule: "Toute route déclare sa permission." }]);

  const audits = await jsonDe(`${s.url}api/audits`);
  assert.equal(audits.missing, null);
  const [risques, valeur] = audits.audits;
  assert.equal(risques.path, "docs/audit-risques.md");
  assert.equal(risques.title, "Audit des risques");
  assert.deepEqual(risques.entries[1], { key: "Niveau", value: "fragile suite de la ligne" });
  assert.equal(risques.staleDays, null);
  assert.ok(valeur.staleDays >= 30, "un scan de plus de 30 jours est signalé");

  const conso = await jsonDe(`${s.url}api/usage`);
  const parNom = Object.fromEntries(conso.workstreams.map((w) => [w.workstream, w]));
  assert.deepEqual(parNom.a.models, ["m1", "m2"]);
  assert.equal(parNom.a.tokens, 10, "un total illisible compte pour zéro");
  assert.equal(parNom["sans-date"].tokens, 3, "une ligne sans date reste comptée");
  assert.equal(parNom["sans-date"].version, null);
  assert.equal(s.erreurs(), "");
});

test("QUA-276 : un registre en tableau se lit comme un registre en titres, statut de fiche compris", async () => {
  const p = await projet({
    "docs/contracts.md":
      "# Registre\n\n| ID | Règle |\n|---|---|\n| QUA-900 | Une règle en tableau. |\n\n## QUA-901\n**Règle** : Une règle sans titre.\n",
    "docs/projects/une-fiche.md":
      "# Projet : une fiche\n\n**Statut** : cadré le 2026-11-08.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/x.mjs\n-->\n\n## Critères d'acceptation\n\n- un critère\n",
  });
  const s = await demarrer(p);
  const ids = Object.fromEntries((await jsonDe(`${s.url}api/contracts`)).contracts.map((c) => [c.id, c]));
  assert.equal(ids["QUA-900"].title, "Une règle en tableau.");
  assert.equal(ids["QUA-900"].fields.Règle, "Une règle en tableau.");
  assert.equal(ids["QUA-901"].title, "Une règle sans titre.");
  const { briefs } = await jsonDe(`${s.url}api/docs`);
  assert.equal(briefs.find((b) => b.path === "docs/projects/une-fiche.md")?.status, "cadré le 2026-11-08.");
});

test("QUA-276 : les audits d'un projet en anglais se lisent à leurs noms anglais, absents ils le disent en anglais", async () => {
  const p = await projet({ "docs/audit-risks.md": `# Risk audit\n\n> Last scan: ${AUJOURDHUI}\n` });
  const cfg = JSON.parse(readFileSync(join(p.dir, ".drwil/ia-first.json"), "utf8"));
  ecrire(p.dir, ".drwil/ia-first.json", JSON.stringify({ ...cfg, lang: "en" }));
  const s = await demarrer(p);
  const v = await jsonDe(`${s.url}api/audits`);
  assert.deepEqual(
    v.audits.map((a) => a.path),
    ["docs/audit-risks.md"],
  );
  assert.equal(v.audits[0].staleDays, null);
  assert.match(v.missing, /docs\/value-discovery\.md missing/);
});

test("QUA-276 : la page se sert dans la langue du projet", async () => {
  for (const lang of ["fr", "en"]) {
    const p = await projet({});
    const cfg = JSON.parse(readFileSync(join(p.dir, ".drwil/ia-first.json"), "utf8"));
    ecrire(p.dir, ".drwil/ia-first.json", JSON.stringify({ ...cfg, lang }));
    const s = await demarrer(p);
    const page = await (await fetch(s.url)).text();
    assert.ok(page.includes(`<html lang="${lang}">`), lang);
    assert.ok(!page.includes("__LANG__"));
    await s.arreter();
  }
});

const JOURNAL_MESURES = [
  "# Journal",
  "## 2026-10-01 — a",
  "- **Durée de CI (job checks)** : 3m02 — run — hooks inchangés",
  "## 2026-10-02 — b",
  "- **Durée de CI (job checks)** : 200 s — run — hooks unchanged",
  "## 2026-10-03 — c",
  "- **Durée de CI (job checks)** : 9m00 — run — hooks modifiés",
  "- **Durée de CI (job checks)** : non mesurée — hooks inchangés",
].join("\n");

test("QUA-276 : les mesures donnent relevés, moyenne, seuil et alerte, sans compter les lignes ignorées", () => {
  const vue = measures(
    [
      JSON.stringify({ workstream: "a", date: "2026-10-01", requests: 2, cache_read: 300000 }),
      JSON.stringify({ workstream: "b", date: "2026-10-02", requests: 0, cache_read: 5 }),
      "illisible",
    ].join("\n"),
    JOURNAL_MESURES,
  );
  assert.deepEqual(vue.ci.points, [
    { label: "2026-10-01", value: 182 },
    { label: "2026-10-02", value: 200 },
  ]);
  assert.equal(vue.ci.mean, 191);
  assert.equal(vue.ci.threshold, 235);
  assert.equal(vue.ci.alert, false);
  assert.deepEqual(vue.cache.points, [{ label: "a", value: 150000 }]);
  assert.equal(vue.cache.alert, false);
  const haute = measures("", ["## 2026-10-01", ...Array(7).fill("- **Durée de CI (job checks)** : 5m00 — hooks inchangés")].join("\n"));
  assert.equal(haute.ci.points.length, 5, "cinq derniers relevés");
  assert.equal(haute.ci.history.length, 7);
  assert.equal(haute.ci.alert, true);
});

test("QUA-275 : sans relevé, les mesures répondent vides et disent ce qui manque ; avec relevés, sans manque", async () => {
  const vide = await projet({});
  const s = await demarrer(vide);
  const r = await jsonDe(`${s.url}api/measures`);
  assert.equal(r.ci, null);
  assert.equal(r.cache, null);
  assert.equal(r.missing, SERVE_TEXTS.fr.noMeasures);
  await s.arreter();
  const plein = await projet({ "docs/projects/journal.md": JOURNAL_MESURES });
  const s2 = await demarrer(plein);
  const r2 = await jsonDe(`${s2.url}api/measures`);
  assert.equal(r2.missing, null);
  assert.equal(r2.ci.points.length, 2);
  assert.match((await jsonDe(`${s2.url}api/contracts`)).head, /^[0-9a-f]{7}$/);
});

const NOM_TAILNET = "poste.reseau-essai.ts.net";
const TAILSCALE_ACTIF = { BackendState: "Running", Self: { DNSName: `${NOM_TAILNET}.` }, CertDomains: [NOM_TAILNET] };

/** Un binaire `tailscale` factice, seul sur le PATH de ce nom : l'essai ne touche jamais au vrai réseau privé. */
function tailscaleFactice({ statut = JSON.stringify(TAILSCALE_ACTIF), publication = 0 } = {}) {
  const dossier = tmp();
  ecrire(dossier, "statut.json", statut);
  ecrire(
    dossier,
    "tailscale",
    `#!/bin/sh\necho "$@" >> "${dossier}/appels"\ncase "$1 $2" in\n  "status --json") cat "${dossier}/statut.json" ;;\n  "serve status") echo '{}' ;;\n  *) exit ${publication} ;;\nesac\n`,
  );
  chmodSync(join(dossier, "tailscale"), 0o755);
  return {
    env: { PATH: `${dossier}:${process.env.PATH}` },
    appels: () => (existsSync(join(dossier, "appels")) ? readFileSync(join(dossier, "appels"), "utf8") : ""),
  };
}

function reglerAccueil(p, reglage) {
  const cfg = JSON.parse(readFileSync(join(p.dir, ".drwil/ia-first.json"), "utf8"));
  ecrire(p.dir, ".drwil/ia-first.json", JSON.stringify({ ...cfg, ...reglage }));
  mkdirSync(join(p.dir, "node_modules"), { recursive: true });
  symlinkSync(racinePaquet, join(p.dir, "node_modules/drwil"), "junction");
}

const hookAccueil = (p, env, ...args) =>
  spawnSync(process.execPath, [join(p.dir, ".claude/hooks/serve-welcome.mjs"), ...args], {
    cwd: p.dir,
    env: { ...p.env, ...env },
    encoding: "utf8",
  });

test("QUA-277 : à l'ouverture d'une session choisie, le serveur démarre et le lien ne passe que par systemMessage", async () => {
  const p = await projet({});
  reglerAccueil(p, { serveAutostart: true });
  const ts = tailscaleFactice({ statut: "pas du JSON" });
  arreterDetache(p);
  const jeton = "j".repeat(40);
  const r = hookAccueil(p, { ...ts.env, DRWIL_SERVE_TOKEN: jeton });
  assert.deepEqual([r.status, r.stderr], [0, ""]);
  const sortie = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(sortie), ["systemMessage"], "aucun octet destiné au modèle");
  assert.equal(r.stdout.trim().split("\n").length, 1);
  assert.ok(!r.stdout.includes(jeton), "QUA-281 : le jeton n'apparaît pas");
  const lien = /http:\/\/127\.0\.0\.1:(\d+)\//.exec(sortie.systemMessage);
  assert.ok(lien, sortie.systemMessage);
  assert.equal((await fetch(`${lien[0]}api/docs`)).status, 200);
  const { pid } = JSON.parse(readFileSync(fichierServeur(p), "utf8"));

  const seconde = hookAccueil(p, ts.env);
  assert.deepEqual(JSON.parse(seconde.stdout), sortie, "une session suivante redonne le même lien");
  assert.equal(JSON.parse(readFileSync(fichierServeur(p), "utf8")).pid, pid, "pas de second serveur");
  const copilot = hookAccueil(p, ts.env, "copilot");
  assert.deepEqual([copilot.status, copilot.stdout, copilot.stderr], [0, "", ""], "Copilot CLI : rien sur stdout");
});

test("QUA-277 : sans réponse de l'humain, le hook ne démarre rien", async () => {
  const p = await projet({});
  reglerAccueil(p, {});
  const r = hookAccueil(p, tailscaleFactice().env);
  assert.deepEqual([r.status, r.stdout, r.stderr], [0, "", ""]);
  assert.equal(existsSync(fichierServeur(p)), false);
});

test("QUA-278 : avec Tailscale, le lien est celui du réseau privé et seul ce nom passe le contrôle de Host", posix, async () => {
  const p = await projet({});
  const ts = tailscaleFactice();
  arreterDetache(p);
  const r = lancer(p, ["--welcome"], ts.env);
  assert.equal(r.status, 0, r.stderr);
  const port = Number(/ts\.net:(\d+)\//.exec(r.stdout)[1]);
  assert.ok(r.stdout.includes(`https://${NOM_TAILNET}:${port}/`), r.stdout);
  assert.ok(r.stdout.includes(`http://127.0.0.1:${port}/`), r.stdout);
  assert.match(ts.appels(), new RegExp(`serve --bg --https=${port} http://127\\.0\\.0\\.1:${port}`));
  assert.equal(JSON.parse(readFileSync(fichierServeur(p), "utf8")).host, "127.0.0.1", "écoute locale seulement");
  assert.equal((await brut(port, "/api/docs", { host: `${NOM_TAILNET}:${port}` })).status, 200);
  assert.equal((await brut(port, "/api/docs", { host: NOM_TAILNET })).status, 200);
  assert.equal((await brut(port, "/api/docs", { host: "attaquant.example" })).status, 403);
  assert.equal((await brut(port, "/api/docs", { host: `${NOM_TAILNET}.attaquant.example:${port}` })).status, 403);
});

test(
  "QUA-278 : sans publication, tout marche en local, le message dit comment ouvrir l'accès et aucun nom n'est admis",
  posix,
  async () => {
    const p = await projet({});
    const ts = tailscaleFactice({ publication: 1 });
    arreterDetache(p);
    const r = lancer(p, ["--welcome"], ts.env);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /http:\/\/127\.0\.0\.1:\d+\/ \(sur cet ordinateur\)\. .*sudo tailscale set --operator/);
    const port = JSON.parse(readFileSync(fichierServeur(p), "utf8")).port;
    assert.equal(existsSync(join(dirname(fichierServeur(p)), "published.json")), false);
    assert.equal((await brut(port, "/api/docs")).status, 200);
    assert.equal((await brut(port, "/api/docs", { host: `${NOM_TAILNET}:${port}` })).status, 403);

    // Un enregistrement sans nom utilisable n'ouvre rien.
    const publie = join(dirname(fichierServeur(p)), "published.json");
    for (const contenu of ["{}", "pas du JSON"]) {
      writeFileSync(publie, contenu);
      assert.equal((await brut(port, "/api/docs", { host: `undefined:${port}` })).status, 403, contenu);
    }
  },
);

test("QUA-278 : chaque état de Tailscale donne son conseil, sans jamais remplacer une autre publication", () => {
  const cacheDir = tmp();
  const repond = (statut, publication = { TCP: {} }, ecriture = "") => {
    const appels = [];
    const run = (commande, args) => {
      appels.push(`${commande} ${args.join(" ")}`);
      if (args[0] === "status") return statut;
      return args[1] === "status" ? JSON.stringify(publication) : ecriture;
    };
    return { resultat: publish(4400, cacheDir, run), appels };
  };
  const actif = JSON.stringify(TAILSCALE_ACTIF);
  assert.deepEqual(repond(null).resultat, { advice: "phoneNoTailscale" });
  assert.deepEqual(repond("pas du JSON").resultat, { advice: "phoneNoTailscale" });
  assert.deepEqual(repond(JSON.stringify({ BackendState: "NeedsLogin" })).resultat, { advice: "phoneDown" });
  assert.deepEqual(repond(JSON.stringify({ ...TAILSCALE_ACTIF, CertDomains: [] })).resultat, { advice: "phoneNoHttps" });
  assert.deepEqual(repond(JSON.stringify({ ...TAILSCALE_ACTIF, CertDomains: undefined })).resultat, { advice: "phoneNoHttps" });
  assert.deepEqual(repond(JSON.stringify({ BackendState: "Running", CertDomains: [NOM_TAILNET] })).resultat, { advice: "phoneNoHttps" });

  const prise = {
    TCP: { 4400: { HTTPS: true } },
    Web: { [`${NOM_TAILNET}:4400`]: { Handlers: { "/": { Proxy: "http://127.0.0.1:9999" } } } },
  };
  const refus = repond(actif, prise);
  assert.deepEqual(refus.resultat, { advice: "phoneTaken" });
  assert.equal(
    refus.appels.some((a) => a.includes("--bg")),
    false,
    "aucune écriture sur un port pris",
  );
  assert.deepEqual(repond(actif, { TCP: { 4400: {} } }).resultat, { advice: "phoneTaken" }, "sans proxy lisible : pris");

  const deja = {
    TCP: { 4400: { HTTPS: true } },
    Web: { [`${NOM_TAILNET}:4400`]: { Handlers: { "/": { Proxy: "http://127.0.0.1:4400/" } } } },
  };
  const memeLien = repond(actif, deja);
  assert.deepEqual(memeLien.resultat, { url: `https://${NOM_TAILNET}:4400/` });
  assert.equal(
    memeLien.appels.some((a) => a.includes("--bg")),
    false,
    "déjà publié : rien à changer",
  );

  assert.deepEqual(
    repond(actif, null).resultat,
    { url: `https://${NOM_TAILNET}:4400/` },
    "statut de publication illisible : publication tentée",
  );
  assert.deepEqual(repond(actif, { TCP: {} }, null).resultat, { advice: "phoneDenied" });
  assert.deepEqual(JSON.parse(readFileSync(join(cacheDir, "published.json"), "utf8")), { host: NOM_TAILNET });
});

test("QUA-278 : le message d'accueil est dans la langue du projet, sans Tailscale comme avec", async () => {
  for (const [lang, sansLui, avecLui] of [
    ["fr", /Pour l'ouvrir depuis le téléphone : installer Tailscale/, /réseau privé Tailscale/],
    ["en", /To open it from your phone: install Tailscale/, /private Tailscale network/],
  ]) {
    const p = await projet({});
    reglerLangue(p, lang);
    const lignes = [];
    const log = console.log;
    console.log = (l) => lignes.push(l);
    const start = async (_o, report) => report("started", "http://127.0.0.1:4400/");
    try {
      await welcomeCommand(p.dir, undefined, start, () => null, p.env);
      await welcomeCommand(p.dir, undefined, start, (_c, a) => (a[0] === "status" ? JSON.stringify(TAILSCALE_ACTIF) : "{}"), p.env);
    } finally {
      console.log = log;
    }
    assert.match(lignes[0], sansLui);
    assert.match(lignes[1], avecLui);
  }
});

function reglerLangue(p, lang) {
  const cfg = JSON.parse(readFileSync(join(p.dir, ".drwil/ia-first.json"), "utf8"));
  ecrire(p.dir, ".drwil/ia-first.json", JSON.stringify({ ...cfg, lang }));
}

test("QUA-279 : l'accueil n'écoute que sur 127.0.0.1 et un serveur lancé à la main avec --host n'est pas publié", async () => {
  const p = await projet({});
  const lignes = [];
  const log = console.log;
  console.log = (l) => lignes.push(l);
  let demande;
  const appels = [];
  try {
    await welcomeCommand(
      p.dir,
      "4400",
      async (o, report) => {
        demande = o;
        report("already", "http://192.0.2.1:4400/");
      },
      (_c, a) => {
        appels.push(a);
        return null;
      },
      p.env,
    );
  } finally {
    console.log = log;
  }
  assert.deepEqual(demande, { root: p.dir, host: "127.0.0.1", port: "4400", detach: true });
  assert.deepEqual(appels, [], "rien de publié");
  assert.match(lignes[0], /déjà démarré .*192\.0\.2\.1/);
});

test("QUA-279 : le démarrage automatique n'est actif que sur la réponse de l'humain", async () => {
  const dir = tmp();
  const jamais = async () => assert.fail("aucune question attendue");
  assert.equal(await chooseServeAutostart(dir, true, "claude", false, jamais), true);
  assert.equal(await chooseServeAutostart(dir, false, "claude", true, jamais), false);
  assert.equal(await chooseServeAutostart(dir, undefined, "claude", false, jamais), undefined, "sans terminal : non répondu");
  assert.equal(await chooseServeAutostart(dir, undefined, "cursor", true, jamais), undefined, "Cursor seul : pas de hook");
  for (const [reponse, attendu] of [
    ["o", true],
    ["YES", true],
    [" oui ", true],
    ["y", true],
    ["", false],
    ["n", false],
    ["peut-être", false],
  ]) {
    assert.equal(await chooseServeAutostart(dir, undefined, "claude,cursor", true, async () => reponse), attendu, reponse);
  }
  ecrire(dir, ".drwil/ia-first.json", JSON.stringify({ tools: ["claude"], serveAutostart: false }));
  assert.equal(await chooseServeAutostart(dir, undefined, undefined, true, jamais), undefined, "déjà répondu : pas redemandé");
  ecrire(dir, ".drwil/ia-first.json", JSON.stringify({ tools: ["claude"] }));
  assert.equal(await chooseServeAutostart(dir, undefined, undefined, true, async () => "o"), true, "mise à jour : proposé une fois");

  // Installation et mise à jour réelles : absent sans réponse, écrit sur réponse, gardé ensuite.
  const clefs = async (options) => {
    const log = console.log;
    console.log = () => {};
    try {
      await init({ lang: "fr", targetDir: cible, tools: "claude", git: false, ci: "none", ...options });
    } finally {
      console.log = log;
    }
    return JSON.parse(readFileSync(join(cible, ".drwil/ia-first.json"), "utf8")).serveAutostart;
  };
  const cible = tmp();
  assert.equal(await clefs({}), undefined, "sans réponse, la clé n'existe pas");
  assert.equal(await clefs({ serveAutostart: true }), true);
  assert.equal(await clefs({}), true, "une mise à jour garde la réponse");
  assert.equal(await clefs({ serveAutostart: false }), false);

  const parCli = tmp();
  for (const [option, attendu] of [
    ["--serve-autostart", true],
    ["--no-serve-autostart", false],
  ]) {
    const r = spawnSync(process.execPath, [cli, "init", "--no-git", "--tools", "claude", "--ci", "none", "--lang", "fr", option], {
      cwd: parCli,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(readFileSync(join(parCli, ".drwil/ia-first.json"), "utf8")).serveAutostart, attendu, option);
  }
});
