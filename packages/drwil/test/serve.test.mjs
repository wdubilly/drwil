// `drwil serve` sur un projet d'essai installé depuis le paquet : lecture seule, jeton, masquage, un serveur par projet.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { init } from "../dist/index.js";
import { accessToken, maskPersonal, ServeRefusal } from "../dist/serve-auth.js";
import { createReader } from "../dist/serve-read.js";
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
      res.on("end", () => resolve({ status: res.statusCode, corps }));
    });
    req.on("error", reject);
    req.end();
  });
}

const jsonDe = async (url, options) => (await fetch(url, options)).json();
const ROUTES = ["", "api/docs", "api/contracts", "api/usage", "api/file?path=docs/projects/pending.md"];

test("QUA-269 : drwil serve sert un projet installé sur 127.0.0.1, en lecture seule, sans rien y écrire", async () => {
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

test("QUA-269 : le paquet publie la page et n'ajoute aucune dépendance d'exécution", () => {
  const pkg = JSON.parse(readFileSync(join(racinePaquet, "package.json"), "utf8"));
  assert.deepEqual(Object.keys(pkg.dependencies), ["commander"]);
  assert.ok(pkg.files.includes("serve"));
  assert.match(readFileSync(join(racinePaquet, "serve", "page.html"), "utf8"), /name="viewport"/);
});

test("QUA-269 : une lecture ne sort pas des fiches et des intentions, ni par un lien symbolique", async () => {
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

test("QUA-269 : un dossier d'essai vide donne des vues vides, sans erreur", async () => {
  const dir = tmp();
  const lecteur = createReader(dir);
  assert.deepEqual(await lecteur.state(), { activity: null, brief: null, lot: null, branch: "" });
  assert.deepEqual(await lecteur.briefs(), []);
  assert.deepEqual(lecteur.intentions(), []);
  assert.deepEqual(lecteur.notes(), []);
  assert.deepEqual(await lecteur.contracts(), { verify: null, contracts: [] });
  assert.deepEqual(await lecteur.usage(), { workstreams: [], tags: [] });
});

test("QUA-269 : état, lot, statut des contrats et version d'un chantier sont lus du projet", async () => {
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

test("QUA-269 : un en-tête Host étranger est refusé, une requête invalide ne révèle rien, la page échappe le nom du projet", async () => {
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

test("QUA-269 : hors d'un projet ou avec un port invalide, le refus est dit sans démarrer", async () => {
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

test("QUA-270 : hors de 127.0.0.1, le serveur refuse de démarrer sans jeton valide, détaché ou non", async () => {
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

test("QUA-270 : toute requête sans jeton valide est refusée, le jeton n'apparaît dans aucune sortie", async () => {
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

test("QUA-270 : détaché, le jeton n'est ni dans la sortie, ni dans l'enregistrement, ni dans le journal", async () => {
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
  ])
    corps.push(await (await fetch(s.url + route)).text());
  const tout = corps.join("\n");
  for (const interdit of [NOM_GIT, "jeanne@example.invalid", "@jeanne-t", secret]) assert.ok(!tout.includes(interdit), interdit);
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
    assert.equal(existsSync(fichier), false, "l'arrêt efface l'enregistrement");
  }
  writeFileSync(fichier, "pas du json");
  const s = await demarrer(p);
  await s.arreter();
});

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

  const prefere = createServer().listen(preferredPort(p.dir), "127.0.0.1");
  await new Promise((res) => prefere.once("listening", res));
  aArreter.push(() => new Promise((res) => prefere.close(res)));
  const s = await startServer({ root: p.dir, host: "127.0.0.1", port: null, token: null });
  aArreter.push(() => s.stop());
  assert.equal(s.port, preferredPort(p.dir) + 1);
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
  assert.ok(preferredPort("/a") >= 4317 && preferredPort("/a") < 5317);
});
