import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { candidateTag, decideVersion, detectBump, publicPackages, packageVersions, nextVersion } from "./create-release.mjs";
import { sha256 } from "./acceptance-sheet.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = fileURLToPath(new URL("./create-release.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-release-"));
  dossiers.push(dir);
  return dir;
};
function ecrire(racine, chemin, contenu) {
  mkdirSync(dirname(join(racine, chemin)), { recursive: true });
  writeFileSync(join(racine, chemin), contenu);
}
function git(racine, ...args) {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
}
/** Dépôt avec un origin nu local (le push du tag n'en sort pas) et un commit par sujet. */
function depot(fichiers = {}, sujets = ["fix: a"]) {
  const racine = tmp();
  const origine = tmp();
  git(origine, "init", "-q", "--bare");
  git(racine, "init", "-q", "-b", "master");
  git(racine, "config", "user.email", "test@example.invalid");
  git(racine, "config", "user.name", "Test");
  git(racine, "remote", "add", "origin", origine);
  for (const [chemin, contenu] of Object.entries(fichiers)) ecrire(racine, chemin, contenu);
  sujets.forEach((s, i) => {
    ecrire(racine, `f${i}.txt`, s);
    git(racine, "add", "-A");
    git(racine, "commit", "-q", "-m", s);
  });
  git(racine, "push", "-q", "origin", "master");
  return { racine, origine };
}

const posix = { skip: process.platform === "win32" ? "outils factices en scripts sh" : false };
/** PATH réduit : git, node, et les outils factices demandés (gh, npm) ; jamais les vrais. */
function chemin({ gh = null, npm = null } = {}) {
  const outils = tmp();
  for (const nom of ["git", "node"]) {
    const r = spawnSync("which", [nom], { encoding: "utf8" });
    symlinkSync(r.stdout.trim(), join(outils, nom));
  }
  for (const [nom, corps] of Object.entries({ gh, npm })) {
    if (corps === null) continue;
    writeFileSync(join(outils, nom), `#!/bin/sh\n${corps}\n`);
    chmodSync(join(outils, nom), 0o755);
  }
  return outils;
}
const lancer = (racine, args, PATH) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { cwd: racine, encoding: "utf8", env: { ...process.env, PATH } });

test("detectBump : rien sans commit, patch par défaut, minor sur feat, major sur rupture", () => {
  assert.equal(detectBump([]), null);
  assert.equal(detectBump([{ subject: "divers", body: "" }]), "patch");
  assert.equal(
    detectBump([
      { subject: "feat(x): a", body: "" },
      { subject: "fix: b", body: "" },
    ]),
    "minor",
  );
  assert.equal(detectBump([{ subject: "fix!: a", body: "" }]), "major");
  assert.equal(detectBump([{ subject: "fix: a", body: "BREAKING CHANGE: b" }]), "major");
  assert.equal(detectBump([{ subject: "BREAKING CHANGE partout", body: "" }]), "major");
});

test("nextVersion : depuis rien ou un tag, chaque bump ; numéros illisibles à zéro", () => {
  assert.equal(nextVersion(null, "patch"), "v0.0.1");
  assert.equal(nextVersion("v1.2.3", "major"), "v2.0.0");
  assert.equal(nextVersion("v1.2.3", "minor"), "v1.3.0");
  assert.equal(nextVersion("v1.2.x", "patch"), "v1.2.1");
});

test("decideVersion : commits seuls, paquets en désaccord, non semver, tag existant ou pas supérieur", () => {
  assert.equal(decideVersion({ latest: null, bump: null }), null);
  assert.deepEqual(decideVersion({ latest: null, bump: "minor" }), { next: "v0.1.0", source: "commits" });
  assert.deepEqual(decideVersion({ latest: "v1.0.0", bump: "minor" }), { next: "v1.1.0", source: "commits" });
  const v = (version, dossier = "p") => ({ dir: dossier, version });
  assert.match(decideVersion({ bump: "patch", versions: [v("1.0.0", "a"), v("2.0.0", "b")] }).error, /désaccord.*a@1\.0\.0, b@2\.0\.0/);
  assert.match(decideVersion({ bump: "patch", versions: [v(null)] }).error, /non semver \(null\) dans p\/package\.json/);
  assert.match(decideVersion({ bump: "patch", versions: [v("1.0.0")], existingTags: ["v1.0.0"] }).error, /v1\.0\.0 existe déjà/);
  assert.match(
    decideVersion({ latest: "v1.0.1", bump: "patch", versions: [v("1.0.0")] }).error,
    /n'est pas supérieure au dernier tag v1\.0\.1/,
  );
  assert.match(decideVersion({ latest: "v1.0.0", bump: "patch", versions: [v("1.0.0")] }).error, /n'est pas supérieure/);
  assert.deepEqual(decideVersion({ latest: "v0.9.9", bump: "patch", versions: [v("1.0.0", "a"), v("1.0.0", "b")] }), {
    next: "v1.0.0",
    source: "package.json (a, b)",
  });
  assert.deepEqual(decideVersion({ latest: "vx", bump: "patch", versions: [v("1.0.0")] }).next, "v1.0.0");
});

test("publicPackages et packageVersions : privés, sans nom, illisibles ignorés ; hors dépôt git, aucun", () => {
  const { racine } = depot({
    "package.json": JSON.stringify({ name: "racine", private: true }),
    "a/package.json": JSON.stringify({ name: "a", version: "1.0.0" }),
    "b/c/package.json": JSON.stringify({ version: "1.0.0" }),
    "d/package.json": "{ illisible",
    "e/package.json": JSON.stringify({ name: "e" }),
  });
  const avant = process.cwd();
  try {
    process.chdir(racine);
    assert.deepEqual(publicPackages(), ["a", "e"]);
    assert.deepEqual(packageVersions(["a", "e", "absent"]), [
      { dir: "a", version: "1.0.0" },
      { dir: "e", version: null },
      { dir: "absent", version: null },
    ]);
    process.chdir(tmp());
    assert.deepEqual(publicPackages(), []);
  } finally {
    process.chdir(avant);
  }
});

test("importé, le script ne lance rien ; lancé sans commit depuis le dernier tag : rien à publier", () => {
  const { racine } = depot();
  git(racine, "tag", "v1.0.0");
  const r = lancer(racine, [], process.env.PATH);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, "[create-release] rien à publier depuis v1.0.0 (aucun commit).\n");
});

test("release refusée : paquets en désaccord", () => {
  const { racine } = depot({
    "a/package.json": JSON.stringify({ name: "a", version: "1.0.0" }),
    "b/package.json": JSON.stringify({ name: "b", version: "2.0.0" }),
  });
  const r = lancer(racine, ["--dry-run"], process.env.PATH);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /dernier tag : \(aucun\)/);
  assert.match(r.stderr, /✗ release refusée : paquets en désaccord/);
});

test("--dry-run : version calculée, rien créé (avec et sans paquet)", () => {
  const sans = depot({}, ["feat: a"]);
  git(sans.racine, "tag", "v1.0.0", "HEAD");
  ecrire(sans.racine, "x.txt", "x");
  git(sans.racine, "add", "-A");
  git(sans.racine, "commit", "-q", "-m", "fix: b", "-m", "corps");
  let r = lancer(sans.racine, ["--dry-run"], process.env.PATH);
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    r.stdout,
    /dernier tag : v1\.0\.0\n.*bump détecté : patch \(1 commit\(s\) analysé\(s\)\)\n.*prochaine version : v1\.0\.1 \(source : commits\)\n[\s\S]*--dry-run/,
  );
  assert.equal(git(sans.racine, "tag", "-l"), "v1.0.0");
  const avec = depot({ "a/package.json": JSON.stringify({ name: "a", version: "0.2.0" }) });
  r = lancer(avec.racine, ["--dry-run"], process.env.PATH);
  assert.match(r.stdout, /suggestion d'après les commits : patch/);
  assert.match(r.stdout, /source : package\.json \(a\)/);
  assert.match(r.stdout, /tarball\(s\) à construire et attacher à la release : a/);
});

test("release : tag poussé, tarballs construits (un échec signalé) puis attachés par gh", posix, () => {
  const { racine, origine } = depot({
    "a/package.json": JSON.stringify({ name: "a", version: "0.3.0" }),
    "b/package.json": JSON.stringify({ name: "b", version: "0.3.0" }),
  });
  const PATH = chemin({
    npm: 'case "$PWD" in */a) echo "notice"; echo "a-0.3.0.tgz" ;; *) echo "pack impossible" >&2; exit 1 ;; esac',
    gh: `echo "$@" > "${join(racine, "..", "gh-appel")}"`,
  });
  const r = lancer(racine, [], PATH);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /tag v0\.3\.0 créé et poussé/);
  assert.equal(git(origine, "tag", "-l"), "v0.3.0");
  assert.match(git(racine, "tag", "-l", "-n9", "v0.3.0"), /Release v0\.3\.0\s+- fix: a/);
  assert.match(r.stderr, /"npm pack" a échoué pour b, tarball non attaché/);
  assert.match(r.stdout, /tarball\(s\) attaché\(s\) à la release : .*a-0\.3\.0\.tgz/);
});

test("release sans paquet : gh appelé sans tarball", posix, () => {
  const { racine, origine } = depot();
  const PATH = chemin({ gh: "exit 0" });
  const r = lancer(racine, [], PATH);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(origine, "tag", "-l"), "v0.1.0");
  assert.doesNotMatch(r.stdout, /attaché/);
});

test("gh indisponible : le tag reste, la commande de rattrapage est donnée (avec ou sans tarball)", posix, () => {
  const sans = depot();
  let r = lancer(sans.racine, [], chemin());
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /la release GitHub a échoué/);
  assert.match(r.stderr, /rattraper à la main : gh release create v0\.1\.0 --generate-notes\n/);
  const avec = depot({ "a/package.json": JSON.stringify({ name: "a", version: "1.0.0" }) });
  r = lancer(avec.racine, [], chemin({ npm: 'echo "a-1.0.0.tgz"' }));
  assert.match(r.stderr, /gh release create v1\.0\.0 --generate-notes .*a-1\.0\.0\.tgz/);
});

test("--dry-run en anglais : messages selon .drwil/ia-first.json", () => {
  const { racine } = depot({ ".drwil/ia-first.json": JSON.stringify({ lang: "en" }) }, ["feat: a"]);
  const r = lancer(racine, ["--dry-run"], process.env.PATH);
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    r.stdout,
    /latest tag: \(none\)\n.*detected bump: minor \(1 commit\(s\) analysed\)\n.*next version: v0\.1\.0 \(source: commits\)\n[\s\S]*--dry-run: no tag nor release created/,
  );
});

const GH_PR_OK = (appel) => `echo "$@" >> "${appel}"; case "$1" in pr) echo "https://exemple.invalid/pull/3" ;; esac`;

test(
  "QUA-079 : release directe — la note « sans verdict » (changements, empreinte du tarball) arrive par la branche recette/<version> et une PR",
  posix,
  () => {
    const { racine, origine } = depotCandidat();
    const appel = join(racine, "..", `gh-directe-${Date.now()}`);
    dossiers.push(appel);
    const masterAvant = git(origine, "rev-parse", "master");
    const r = lancer(racine, [], chemin({ npm: NPM_PACK, gh: GH_PR_OK(appel) }));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(git(origine, "tag", "-l"), "v1.1.0");
    const note = git(origine, "show", "recette/v1.1.0:docs/recettes/v1.1.0.md");
    assert.match(note, /^# Note de recette de v1\.1\.0\n/);
    assert.match(note, /Verdict : sans verdict — version publiée sans candidate ni verdict de recette ; à compléter par l'humain/);
    assert.match(note, /- `a-1\.1\.0\.tgz` — sha256 `[0-9a-f]{64}`/);
    assert.match(note, /## À compléter/);
    assert.match(note, /## Changements\n\n- feat: b$/);
    assert.doesNotMatch(note, /Candidate/);
    assert.match(r.stdout, /note de v1\.1\.0 proposée par la PR https:\/\/exemple\.invalid\/pull\/3/);
    assert.match(readFileSync(appel, "utf8"), /pr create --base master --head recette\/v1\.1\.0/);
    assert.equal(git(racine, "status", "--porcelain"), "");
    assert.equal(git(origine, "rev-parse", "master"), masterAvant, "master distante intacte");
  },
);

test("QUA-079 : release directe --dry-run — la note est montrée, sans branche ni PR ni tag", posix, () => {
  const { racine, origine } = depotCandidat();
  const r = lancer(racine, ["--dry-run"], chemin());
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /note de recette : docs\/recettes\/v1\.1\.0\.md\n\n# Note de recette de v1\.1\.0\n/);
  assert.match(r.stdout, /sans verdict/);
  assert.match(r.stdout, /Empreintes des tarballs\n\n- calculées à la publication/);
  assert.match(r.stdout, /--dry-run : aucune branche ni PR créée/);
  assert.match(r.stdout, /--dry-run : aucun tag ni release créé/);
  assert.equal(git(origine, "tag", "-l"), "");
  assert.equal(git(origine, "branch", "--list", "recette/*"), "");
});

test("QUA-080 : release directe — la PR de la note en échec ne défait ni le tag ni la release ; rattrapage dit", posix, () => {
  const { racine, origine } = depotCandidat();
  const appel = join(racine, "..", `gh-echec-${Date.now()}`);
  dossiers.push(appel);
  const r = lancer(racine, [], chemin({ npm: NPM_PACK, gh: `echo "$@" >> "${appel}"; case "$1" in pr) exit 1 ;; esac` }));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(origine, "tag", "-l"), "v1.1.0");
  assert.match(readFileSync(appel, "utf8"), /^release create v1\.1\.0 /);
  assert.match(
    r.stderr,
    /branche recette\/v1\.1\.0 poussée, mais la PR a échoué ; rattraper : gh pr create --base master --head recette\/v1\.1\.0/,
  );
  assert.match(
    r.stderr,
    /la release publiée n'est pas défaite ; rattraper la note : node \.githooks\/recette-note\.mjs v1\.1\.0 \S+v1\.1\.0\.md/,
  );
});

test("QUA-051 : candidateTag — rc.1 d'abord, puis un de plus que la plus haute candidate de la version", () => {
  assert.equal(candidateTag("v1.1.0", []), "v1.1.0-rc.1");
  assert.equal(candidateTag("v1.1.0", ["v1.1.0-rc.1", "v1.1.0-rc.3", "v1.2.0-rc.9", "v1.1.0-rc.x"]), "v1.1.0-rc.4");
});

test("QUA-051 : une candidate n'est jamais le dernier tag définitif", () => {
  const { racine } = depot({}, ["feat: a"]);
  git(racine, "tag", "v1.0.0");
  ecrire(racine, "y.txt", "y");
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "fix: b");
  git(racine, "tag", "v1.0.1-rc.1");
  const r = lancer(racine, ["--dry-run"], process.env.PATH);
  assert.match(r.stdout, /dernier tag : v1\.0\.0\n/);
});

/** Dépôt avec un tag définitif v1.0.0 puis un paquet a@1.1.0 : la prochaine candidate est v1.1.0-rc.N. */
function depotCandidat() {
  const d = depot({}, ["feat: a"]);
  git(d.racine, "tag", "v1.0.0");
  ecrire(d.racine, "a/package.json", JSON.stringify({ name: "a", version: "1.1.0" }));
  git(d.racine, "add", "-A");
  git(d.racine, "commit", "-q", "-m", "feat: b");
  return d;
}
const NPM_PACK = 'echo "tarball" > "$4/a-1.1.0.tgz"; echo "a-1.1.0.tgz"';

test("QUA-051 : --candidate --dry-run montre la fiche de recette de la candidate sans rien publier", posix, () => {
  const { racine, origine } = depotCandidat();
  git(racine, "tag", "v1.1.0-rc.1");
  const r = lancer(racine, ["--candidate", "--dry-run"], chemin());
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /candidate : v1\.1\.0-rc\.2 \(pré-release/);
  assert.match(r.stdout, /fiche de recette de v1\.1\.0-rc\.2 :\n\n# Fiche de recette — v1\.1\.0-rc\.2/);
  assert.match(r.stdout, /du dernier tag définitif v1\.0\.0/);
  assert.match(r.stdout, /Empreinte du tarball : calculée à la création du tarball/);
  assert.match(r.stdout, /--dry-run : aucun tag ni release créé/);
  assert.equal(git(origine, "tag", "-l"), "");
});

test("QUA-051 : --candidate publie une pré-release avec tarball et fiche de recette (empreinte du tarball)", posix, () => {
  const { racine, origine } = depotCandidat();
  const appel = join(racine, "..", `gh-candidate-${Date.now()}`);
  dossiers.push(appel);
  const PATH = chemin({ npm: NPM_PACK, gh: `case "$1" in release) echo "$@" > "${appel}" ;; *) exit 1 ;; esac` });
  const r = lancer(racine, ["--candidate"], PATH);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(origine, "tag", "-l"), "v1.1.0-rc.1");
  const args = readFileSync(appel, "utf8").trim().split(" ");
  assert.deepEqual(args.slice(0, 3), ["release", "create", "v1.1.0-rc.1"]);
  assert.ok(args.includes("--prerelease"));
  const tgz = args.find((a) => a.endsWith("a-1.1.0.tgz"));
  const fiche = args.at(-1);
  assert.match(fiche, /recette-v1\.1\.0-rc\.1\.md$/);
  assert.ok(args.includes(fiche) && args.indexOf(fiche) < args.indexOf("--prerelease"));
  assert.match(readFileSync(fiche, "utf8"), new RegExp(`\`a-1\\.1\\.0\\.tgz\` — sha256 \`${sha256(tgz)}\``));
  assert.match(r.stdout, /pré-release v1\.1\.0-rc\.1 publiée avec sa fiche de recette/);
});

test("QUA-051 : --candidate, gh indisponible : le tag reste, la commande de rattrapage est donnée", posix, () => {
  const { racine } = depotCandidat();
  const r = lancer(racine, ["--candidate"], chemin({ npm: NPM_PACK }));
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    r.stderr,
    /rattraper à la main : gh release create v1\.1\.0-rc\.1 .*a-1\.1\.0\.tgz .*recette-v1\.1\.0-rc\.1\.md --prerelease/,
  );
});

test("QUA-051 : --candidate sans paquet npm : la fiche dit qu'il n'y a pas de tarball", () => {
  const { racine } = depot({}, ["feat: a"]);
  const r = lancer(racine, ["--candidate", "--dry-run"], process.env.PATH);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /candidate : v0\.1\.0-rc\.1/);
  assert.match(r.stdout, /Empreinte du tarball : aucun paquet npm publiable : pas de tarball/);
});

test("QUA-098 release refusée tant que l'examen des documents n'est pas fait (aperçu compris)", () => {
  const { racine } = depot({ "README.md": "# Produit\n" }, ["feat: a"]);
  git(racine, "tag", "v1.0.0", "HEAD");
  ecrire(racine, "x.txt", "x");
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "fix: b");
  let r = lancer(racine, ["--dry-run"], process.env.PATH);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /✗ README\.md : inchangé depuis le dernier tag, sans raison enregistrée/);
  assert.match(r.stderr, /✗ release refusée : examen des documents non fait : v1\.0\.1/);
  ecrire(racine, "docs/release-review.md", "- v1.0.1 — `README.md` — inchangé : correctif interne\n");
  r = lancer(racine, ["--dry-run"], process.env.PATH);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /✓ README\.md : inchangé — correctif interne/);
});
