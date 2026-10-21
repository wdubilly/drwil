import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runner } from "./acceptance-sheet.mjs";
import { main, promote, promoteTexts, releaseNote } from "./promote-release.mjs";
import { sheetAsset, VERDICT_ASSET } from "./release-verdict.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = fileURLToPath(new URL("./promote-release.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-promotion-"));
  dossiers.push(d);
  return d;
};
function git(racine, ...args) {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
}
const TAG = "v1.1.0-rc.1";
const TGZ = "a-1.1.0.tgz";
/** Dépôt avec un origin nu local, un tag définitif v1.0.0 et la candidate ; identité locale (la CI n'en a pas). */
function depot({ origine = true, poussee = true } = {}) {
  const racine = tmp();
  git(racine, "init", "-q", "-b", "master");
  git(racine, "config", "user.email", "test@example.invalid");
  git(racine, "config", "user.name", "Test");
  git(racine, "config", "core.hooksPath", "/dev/null");
  if (origine) {
    const nu = tmp();
    git(nu, "init", "-q", "--bare");
    git(racine, "remote", "add", "origin", nu);
  }
  writeFileSync(join(racine, "a.txt"), "a");
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "a");
  if (origine && poussee) git(racine, "push", "-q", "origin", "master");
  git(racine, "tag", "v1.0.0");
  writeFileSync(join(racine, "b.txt"), "b");
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "b");
  git(racine, "tag", "-a", TAG, "-m", "candidate");
  return racine;
}
const sha = () => createHash("sha256").update("tarball\n").digest("hex");
const fiche = (empreinte) => `# Fiche\n\n- Empreinte du tarball :\n  - \`${TGZ}\` — sha256 \`${empreinte}\`\n`;
const VERDICT = {
  version: 1,
  tag: TAG,
  verdict: "reserved",
  points: [
    { type: "reserve", id: "v1.1.0-P1", what: "Lisible", issue: "https://exemple.invalid/i/1" },
    { type: "reserve", id: "v1.1.0-P2", what: "Lente", issue: null },
    { type: "refusal", id: "v1.1.0-P3", what: "jamais là", issue: null },
  ],
  note: null,
  by: "recetteuse",
  at: "2026-10-19T10:00:00.000Z",
};

/** Exécuteur : git réel dans le dépôt, gh simulé (vue de la release, assets, création). */
function exec(
  racine,
  {
    view = { isPrerelease: true, url: "https://exemple.invalid/r", assets: [{ name: TGZ }, { name: "x.md" }] },
    assets = {},
    create = true,
    pr = true,
  } = {},
) {
  const vrai = runner(racine);
  const appels = [];
  const run = (cmd, args, o) => {
    if (cmd !== "gh") return vrai(cmd, args, o);
    appels.push(args);
    if (args[0] === "pr") return pr ? "https://exemple.invalid/pull/9\n" : null;
    if (args[1] === "view") return view ? JSON.stringify(view) : null;
    if (args[1] === "download") {
      const nom = args[args.indexOf("--pattern") + 1];
      if (!(nom in assets)) return null;
      writeFileSync(join(args[args.indexOf("--dir") + 1], nom), assets[nom]);
      return "";
    }
    appels.notes = readFileSync(args[args.indexOf("--notes-file") + 1], "utf8");
    return create ? "" : null;
  };
  return { run, appels };
}

test("QUA-054 : promotion refusée — pas une candidate, absente, pas pré-release, sans verdict, refusée, version existante, tag absent, fiche absente", () => {
  const racine = depot();
  const empreinte = sha();
  const complet = { [VERDICT_ASSET]: JSON.stringify(VERDICT), [sheetAsset(TAG)]: fiche(empreinte), [TGZ]: "tarball\n" };
  const essai = (opts, tag = TAG) => promote(racine, { tag }, exec(racine, opts)).message;
  assert.match(essai({}, "v1.1.0"), /n'est pas une candidate/);
  assert.match(promote(racine, {}).message, /undefined n'est pas une candidate/);
  assert.match(essai({ view: null }), /pré-release introuvable/);
  assert.match(essai({ view: { isPrerelease: false } }), /seule une candidate se promeut/);
  assert.match(essai({}), /n'a pas de verdict de recette : promotion refusée/);
  assert.match(essai({ assets: { [VERDICT_ASSET]: "pas du json" } }), /n'a pas de verdict/);
  assert.match(
    essai({ assets: { [VERDICT_ASSET]: JSON.stringify({ ...VERDICT, verdict: "refused" }) } }),
    /refusée par la recette : promotion refusée/,
  );
  assert.match(essai({ assets: complet }, "v1.1.0-rc.9"), /tag v1\.1\.0-rc\.9 introuvable/);
  assert.match(essai({ assets: { [VERDICT_ASSET]: JSON.stringify(VERDICT) } }), /fiche de recette introuvable/);
  assert.match(essai({ assets: { ...complet, [TGZ]: "autre\n" } }), /a-1\.1\.0\.tgz : empreinte différente/);
  assert.match(essai({ assets: { ...complet, [sheetAsset(TAG)]: fiche("0".repeat(64)) } }), /empreinte différente/);
  const sansAsset = { ...complet };
  delete sansAsset[TGZ];
  assert.match(essai({ assets: sansAsset }), /empreinte différente/);
  const horsGit = tmp();
  assert.match(promote(horsGit, { tag: TAG }, exec(horsGit, { assets: complet })).message, /tag v1\.1\.0-rc\.1 introuvable/);
  git(racine, "tag", "v1.1.0", "HEAD");
  assert.match(essai({ assets: complet }), /v1\.1\.0 existe déjà/);
});

test("QUA-054 : --dry-run — même commit, même tarball, réserves et issues dans la note ; rien de publié", () => {
  const racine = depot();
  git(racine, "remote", "add", "github", "x");
  const empreinte = sha();
  const { run, appels } = exec(racine, {
    assets: { [VERDICT_ASSET]: JSON.stringify(VERDICT), [sheetAsset(TAG)]: fiche(empreinte), [TGZ]: "tarball\n" },
  });
  const r = promote(racine, { tag: TAG, dryRun: true }, { run });
  assert.equal(r.code, 0, r.message);
  const commit = git(racine, "rev-parse", `${TAG}^{commit}`).slice(0, 7);
  assert.match(
    r.message,
    new RegExp(`v1\\.1\\.0-rc\\.1 \\(approuvée avec réserves\\) → v1\\.1\\.0, sur le commit ${commit}, avec : a-1\\.1\\.0\\.tgz`),
  );
  assert.match(r.message, /- v1\.1\.0-P1 : Lisible \(https:\/\/exemple\.invalid\/i\/1\)\n- v1\.1\.0-P2 : Lente\n/);
  assert.doesNotMatch(r.message, /jamais là/);
  assert.match(r.message, new RegExp(`\`a-1\\.1\\.0\\.tgz\` — sha256 \`${empreinte}\``));
  assert.doesNotMatch(r.message, /Installer/);
  assert.match(r.message, /--dry-run : aucun tag ni release créé/);
  assert.match(r.message, /note de recette : docs\/recettes\/v1\.1\.0\.md\n\n# Note de recette de v1\.1\.0\n/);
  assert.match(r.message, /--dry-run : aucune branche ni PR créée/);
  assert.ok(!appels.some((a) => a[1] === "create" || a[0] === "pr"));
  assert.equal(git(racine, "ls-remote", "--heads", "origin", "recette/*"), "");
  assert.equal(git(racine, "tag", "-l", "v1.1.0"), "");
});

test("QUA-054 : promotion — tag définitif poussé sur le commit de la candidate, release « latest » du même tarball", () => {
  const racine = depot();
  const empreinte = sha();
  const assets = { [VERDICT_ASSET]: JSON.stringify(VERDICT), [sheetAsset(TAG)]: fiche(empreinte), [TGZ]: "tarball\n" };
  const { run, appels } = exec(racine, { assets });
  const r = promote(racine, { tag: TAG }, { run });
  assert.equal(r.code, 0, r.message);
  assert.equal(git(racine, "rev-parse", "v1.1.0^{commit}"), git(racine, "rev-parse", `${TAG}^{commit}`));
  assert.equal(git(racine, "ls-remote", "--tags", "origin", "v1.1.0").length > 0, true);
  const cree = appels.find((a) => a[1] === "create");
  assert.deepEqual(cree.slice(0, 3), ["release", "create", "v1.1.0"]);
  assert.ok(cree[3].endsWith(TGZ));
  assert.ok(cree.includes("--latest") && cree.includes("--verify-tag") && !cree.includes("--prerelease"));
  assert.deepEqual(cree.slice(-3), ["--generate-notes", "--notes-start-tag", "v1.0.0"]);
  assert.match(
    appels.notes,
    /^## Recette\n\nCandidate \[v1\.1\.0-rc\.1\]\(https:\/\/exemple\.invalid\/r\) approuvée avec réserves par @recetteuse/,
  );
  assert.match(r.message, /release v1\.1\.0 publiée \(releases\/latest\)/);
});

test("QUA-054 : première version sans tag précédent, approuvée sans tarball ; gh en échec ; push impossible", () => {
  const racine = depot();
  git(racine, "tag", "-d", "v1.0.0");
  const approuvee = JSON.stringify({ ...VERDICT, verdict: "approved", points: [] });
  const assets = { [VERDICT_ASSET]: approuvee, [sheetAsset(TAG)]: "# Fiche\n" };
  const view = { isPrerelease: true, url: "u" };
  let { run, appels } = exec(racine, { assets, view });
  let r = promote(racine, { tag: TAG }, { run });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /avec : aucun tarball/);
  assert.equal(appels.find((a) => a[1] === "create").at(-1), "--generate-notes");
  git(racine, "tag", "-d", "v1.1.0");
  ({ run } = exec(racine, { assets, view, create: false }));
  git(racine, "push", "-q", "origin", ":refs/tags/v1.1.0");
  r = promote(racine, { tag: TAG }, { run });
  assert.equal(r.code, 1);
  assert.match(r.message, /tag v1\.1\.0 poussé, mais la release GitHub a échoué ; rattraper à la main : gh release create v1\.1\.0/);
  const sansOrigine = depot({ origine: false });
  r = promote(sansOrigine, { tag: TAG }, exec(sansOrigine, { assets, view }));
  assert.equal(r.code, 1);
  assert.match(r.message, /tag v1\.1\.0 non créé ou non poussé : rien n'est publié/);
});

test("QUA-054 : note de release — commande d'installation depuis l'URL du dépôt GitHub", () => {
  const T = promoteTexts(tmp());
  const note = releaseNote(
    {
      tag: TAG,
      url: "u",
      verdict: { ...VERDICT, verdict: "approved", points: [] },
      tarballs: [{ name: TGZ, sha256: "f".repeat(64) }],
      repo: "https://github.com/o/r",
      final: "v1.1.0",
    },
    T,
  );
  assert.match(note, /approuvée par @recetteuse/);
  assert.doesNotMatch(note, /Réserves/);
  assert.match(note, /### Installer\n\n- `npm install -D https:\/\/github\.com\/o\/r\/releases\/download\/v1\.1\.0\/a-1\.1\.0\.tgz`\n$/);
});

const PUBLIEE = (racine, opts = {}) => {
  const assets = { [VERDICT_ASSET]: JSON.stringify(VERDICT), [sheetAsset(TAG)]: fiche(sha()), [TGZ]: "tarball\n" };
  return exec(racine, { assets, ...opts });
};

test("QUA-078 : promotion — la note de la version arrive par la branche recette/<version> et une PR, jamais sur master ni dans l'arbre", () => {
  const { racine } = { racine: depot() };
  const origine = git(racine, "remote", "get-url", "origin");
  const master = git(racine, "rev-parse", "master");
  const masterDistante = git(origine, "rev-parse", "master");
  const { run, appels } = PUBLIEE(racine);
  const r = promote(racine, { tag: TAG }, { run });
  assert.equal(r.code, 0, r.message);
  assert.match(
    r.message,
    /release v1\.1\.0 publiée \(releases\/latest\)\.\n.*note de v1\.1\.0 proposée par la PR https:\/\/exemple\.invalid\/pull\/9/,
  );
  const note = git(origine, "show", "recette/v1.1.0:docs/recettes/v1.1.0.md");
  assert.match(note, /^# Note de recette de v1\.1\.0\n/);
  assert.match(note, /Candidate : \[v1\.1\.0-rc\.1\]\(https:\/\/exemple\.invalid\/r\)/);
  assert.match(note, /Verdict : approuvée avec réserves, donné par @recetteuse le 2026-10-19T10:00:00\.000Z/);
  assert.match(note, /- v1\.1\.0-P1 : Lisible \(https:\/\/exemple\.invalid\/i\/1\)/);
  assert.match(note, new RegExp(`- \`a-1\\.1\\.0\\.tgz\` — sha256 \`${sha()}\``));
  assert.match(note, /## Fiche de recette — v1\.1\.0-rc\.1/);
  assert.equal(git(racine, "rev-parse", "master"), master);
  assert.equal(git(origine, "rev-parse", "master"), masterDistante);
  assert.equal(git(origine, "rev-parse", "recette/v1.1.0~1"), masterDistante);
  assert.equal(git(racine, "status", "--porcelain"), "");
  assert.ok(appels.findIndex((a) => a[0] === "pr") > appels.findIndex((a) => a[1] === "create"), "la note vient après la release");
});

test("QUA-080 : la PR de la note en échec ne défait pas le tag ni la release, et la commande de rattrapage est dite", () => {
  const racine = depot();
  const { run, appels } = PUBLIEE(racine, { pr: false });
  const r = promote(racine, { tag: TAG }, { run });
  assert.equal(r.code, 1);
  assert.match(r.message, /release v1\.1\.0 publiée \(releases\/latest\)/);
  assert.match(
    r.message,
    /branche recette\/v1\.1\.0 poussée, mais la PR a échoué ; rattraper : gh pr create --base master --head recette\/v1\.1\.0/,
  );
  assert.match(r.message, /la release publiée n'est pas défaite/);
  assert.equal(git(racine, "tag", "-l", "v1.1.0"), "v1.1.0");
  assert.ok(git(racine, "ls-remote", "--tags", "origin", "v1.1.0").length > 0);
  assert.ok(appels.some((a) => a[1] === "create"));

  const sansMaster = depot({ poussee: false });
  const bis = promote(sansMaster, { tag: TAG }, PUBLIEE(sansMaster));
  assert.equal(bis.code, 1);
  assert.match(bis.message, /release v1\.1\.0 publiée/);
  assert.match(bis.message, /branche principale de origin introuvable/);
  assert.match(bis.message, /recette-note\.mjs v1\.1\.0 \S+\.md/);
});

function capturer(fn) {
  const { log, error } = console;
  const sortie = [];
  const erreurs = [];
  Object.assign(console, { log: (m) => sortie.push(m), error: (m) => erreurs.push(m) });
  try {
    return { code: fn(), sortie: sortie.join("\n"), erreurs: erreurs.join("\n") };
  } finally {
    Object.assign(console, { log, error });
  }
}

test("QUA-054 : ligne de commande — usage, --dry-run, refus, en anglais ; lancé sans option", () => {
  const racine = depot();
  let r = capturer(() => main([], racine));
  assert.equal(r.code, 2);
  assert.match(r.erreurs, /^usage : node \.githooks\/promote-release\.mjs/);
  assert.equal(capturer(() => main([TAG, "--autre"], racine)).code, 2);
  mkdirSync(join(racine, ".drwil"));
  writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ lang: "en" }));
  r = capturer(() => main([TAG, "--dry-run"], racine, exec(racine)));
  assert.equal(r.code, 1);
  assert.match(r.erreurs, /^✗ v1\.1\.0-rc\.1 has no acceptance verdict/);
  const assets = { [VERDICT_ASSET]: JSON.stringify(VERDICT), [sheetAsset(TAG)]: fiche(sha()), [TGZ]: "tarball\n" };
  r = capturer(() => main([TAG, "--dry-run"], racine, exec(racine, { assets })));
  assert.equal(r.code, 0, r.erreurs);
  assert.match(r.sortie, /^✓ \[promote-release\] v1\.1\.0-rc\.1 \(approved with reserves\)/);
  const lance = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
  assert.equal(lance.status, 2);
});
