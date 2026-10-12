import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decideVersion, detectBump, publicPackages, packageVersions, nextVersion } from "./create-release.mjs";

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
  git(racine, "init", "-q", "-b", "travail");
  git(racine, "config", "user.email", "test@example.invalid");
  git(racine, "config", "user.name", "Test");
  git(racine, "remote", "add", "origin", origine);
  for (const [chemin, contenu] of Object.entries(fichiers)) ecrire(racine, chemin, contenu);
  sujets.forEach((s, i) => {
    ecrire(racine, `f${i}.txt`, s);
    git(racine, "add", "-A");
    git(racine, "commit", "-q", "-m", s);
  });
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
    /dernier tag : v1\.0\.0\n.*bump détecté : patch \(1 commit\(s\) analysé\(s\)\)\n.*prochaine version : v1\.0\.1 \(source : commits\)\n.*--dry-run/,
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
    /latest tag: \(none\)\n.*detected bump: minor \(1 commit\(s\) analysed\)\n.*next version: v0\.1\.0 \(source: commits\)\n.*--dry-run: no tag nor release created/,
  );
});
