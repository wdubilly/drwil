// Tests du kit, thème modules : modules optionnels (taille de fichier, tableau de bord, release) et paquet npm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "../dist/index.js";
import { tmp, quiet, checks, git, read, config, enAvertissement, copierModule } from "./kit-commun.mjs";

test("lot 5 : check-file-size et check-code-rules livrés mais opt-in (pas lancés par défaut)", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  for (const f of ["check-file-size.mjs", "check-file-size.legacy.json", "check-code-rules.mjs"]) {
    assert.ok(existsSync(join(dir, ".githooks", f)), f);
  }
  assert.equal(checks(dir).status, 0, "aucun des deux ne tourne tant que le projet ne les déclare pas");
});

test("check-file-size.mjs détecte un fichier trop gros une fois déclaré par le projet", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const cfg = config(dir);
  cfg.checks = [{ name: "taille des fichiers", run: "node .githooks/check-file-size.mjs src 10 ts" }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src/gros.ts"), "x\n".repeat(20));
  const r = checks(dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /src\/gros\.ts : 20 lignes, maximum 10/);
});

test("check-file-size.mjs : un plafond hérité laisse passer un fichier déjà gros mais pas plus gros", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  writeFileSync(join(dir, ".githooks/check-file-size.legacy.json"), JSON.stringify({ "src/legacy.ts": 25 }));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src/legacy.ts"), "x\n".repeat(20));
  let r = spawnSync(process.execPath, [".githooks/check-file-size.mjs", "src", "10", "ts"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  writeFileSync(join(dir, "src/legacy.ts"), "x\n".repeat(30));
  r = spawnSync(process.execPath, [".githooks/check-file-size.mjs", "src", "10", "ts"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /plafond hérité 25/);
});

test("check-code-rules.mjs : vide par défaut, toujours vert", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const r = spawnSync(process.execPath, [".githooks/check-code-rules.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("lot 5 : le module qualité front optionnel n'est pas installé par init/apply", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  for (const f of ["check-colors.mjs", "check-contrast.mjs"]) {
    assert.ok(!existsSync(join(dir, ".githooks", f)), f);
  }
});

test("module optionnel tableau de bord : génère un HTML lisant chantiers et contrats tels quels", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  copierModule(dir, "dashboard");
  writeFileSync(
    join(dir, "docs/projects/un-chantier.md"),
    "# Projet : un chantier\n\n**Statut** : cadré le 2026-10-04 — lot 1 en cours.\n\n" +
      "## 6. Lots\n\n- **Lot 1 — titre** [IA] : contenu. Critère de sortie : tests verts.\n\n" +
      "## Reprise\n\n- **Dernier état** (2026-10-04) : ...\n",
  );
  const r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const html = read(dir, "docs/dashboard.html");
  assert.match(html, /<html lang="fr">/);
  assert.match(html, /un chantier/);
  assert.match(html, /cadré le 2026-10-04 — lot 1 en cours\./);
  assert.match(html, /Lot 1 — titre/);
  assert.match(html, /SEC-006/);
  assert.match(html, /catalog:SEC-001/);
});

test("module optionnel tableau de bord : agrège .drwil/usage.jsonl par chantier, sans régression si absent", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  copierModule(dir, "dashboard");

  // Sans fichier usage.jsonl : pas de régression, message d'absence explicite.
  let r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(read(dir, "docs/dashboard.html"), /usage\.jsonl absent/);

  // Avec usage.jsonl : agrégation tokens/durée/modèles par chantier, lignes malformées ignorées.
  mkdirSync(join(dir, ".drwil"), { recursive: true });
  writeFileSync(
    join(dir, ".drwil/usage.jsonl"),
    [
      JSON.stringify({
        workstream: "un-chantier",
        increment: "Lot 1",
        tokens: 1000,
        model: "claude-sonnet-5",
        duration_min: 30,
        date: "2026-10-04",
      }),
      JSON.stringify({
        workstream: "un-chantier",
        increment: "Lot 2",
        tokens: 2000,
        model: "gpt-5.4",
        duration_min: 45,
        date: "2026-10-04",
      }),
      "pas du JSON valide",
    ].join("\n") + "\n",
  );
  r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const html = read(dir, "docs/dashboard.html");
  assert.match(html, /un-chantier/);
  assert.match(html, />3000</); // tokens cumulés
  assert.match(html, />75</); // minutes cumulées
  assert.match(html, /claude-sonnet-5, gpt-5\.4/);
});

test("module optionnel tableau de bord : affiche les derniers audits, sans régression si absents", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  copierModule(dir, "dashboard");

  // Sans rapport d'audit : pas de régression, message d'absence explicite.
  let r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(read(dir, "docs/dashboard.html"), /audit-risques\.md absent/);

  // Avec les deux rapports : titre et méta-bloc (citation en tête) repris tels quels.
  writeFileSync(
    join(dir, "docs/audit-risques.md"),
    "# Audit de risques et dette technique\n\n> Dernier scan : 2026-10-04\n> Niveau de santé global : 🟠 Fragile\n\n## Synthèse\n",
  );
  writeFileSync(
    join(dir, "docs/decouverte-valeur.md"),
    "# Découverte de valeur et opportunités produit\n\n> Dernier scan : 2026-10-04\n> État du projet : exemple.\n\n## Opportunités\n",
  );
  r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const html = read(dir, "docs/dashboard.html");
  assert.match(html, /Audit de risques et dette technique/);
  assert.match(html, /Niveau de santé global : 🟠 Fragile/);
  assert.match(html, /Découverte de valeur et opportunités produit/);
  assert.match(html, /État du projet : exemple\./);
});

test("rappel de péremption des audits (> 30 jours) : tableau de bord et run-checks.mjs", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, name: "demo", git: false }));
  copierModule(dir, "dashboard");

  // rapport récent : pas d'avertissement. La date suit l'horloge : une date figée devient périmée seule.
  const hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  writeFileSync(join(dir, "docs/audit-risques.md"), `# Audit de risques et dette technique\n\n> Dernier scan : ${hier}\n\n## Synthèse\n`);
  let r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(read(dir, "docs/dashboard.html"), /à relancer/);
  let checkR = checks(dir);
  assert.doesNotMatch(checkR.stdout, /audit périmé/);

  // rapport vieux de plus de 30 jours : avertissement visuel dans le tableau de bord, et dans
  // run-checks.mjs (famille « non exécuté », jamais bloquant).
  writeFileSync(
    join(dir, "docs/audit-risques.md"),
    "# Audit de risques et dette technique\n\n> Dernier scan : 2020-01-01\n\n## Synthèse\n",
  );
  r = spawnSync(process.execPath, [".githooks/dashboard.mjs", "docs/dashboard.html"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(read(dir, "docs/dashboard.html"), /à relancer/);
  checkR = checks(dir);
  assert.equal(checkR.status, 0, "jamais bloquant : " + checkR.stdout + checkR.stderr);
  assert.match(checkR.stdout, /audit périmé.*docs\/audit-risques\.md/);
});

test("créer une release : détection du bump semver (Conventional Commits, best-effort)", async () => {
  // import() dynamique : passer l'URL file:// telle quelle (pas de conversion
  // en chemin OS) — un chemin Windows brut (d:\...) fait planter le loader ESM.
  const { detectBump, nextVersion } = await import(
    new URL("../templates/common/optional/create-release/create-release.mjs", import.meta.url)
  );

  assert.equal(detectBump([]), null, "aucun commit : rien à publier");
  assert.equal(
    detectBump([{ subject: "Manifeste des fichiers installés", body: "" }]),
    "patch",
    "aucun préfixe reconnu : patch par défaut",
  );
  assert.equal(detectBump([{ subject: "fix: corrige X", body: "" }]), "patch");
  assert.equal(
    detectBump([
      { subject: "feat: ajoute Y", body: "" },
      { subject: "fix: corrige X", body: "" },
    ]),
    "minor",
    "un feat l'emporte sur un simple fix",
  );
  assert.equal(detectBump([{ subject: "feat!: casse la compat", body: "" }]), "major", "rupture annoncée (!) prioritaire");
  assert.equal(
    detectBump([{ subject: "feat: ajoute Y", body: "BREAKING CHANGE: change le format" }]),
    "major",
    "rupture annoncée dans le corps aussi détectée",
  );

  assert.equal(nextVersion("v1.2.3", "patch"), "v1.2.4");
  assert.equal(nextVersion("v1.2.3", "minor"), "v1.3.0");
  assert.equal(nextVersion("v1.2.3", "major"), "v2.0.0");
});

/** Rédige la présentation livrée en squelette (README, fonctionnalités, carte) : la release l'exige (QUA-098). */
function presentationRedigee(dir) {
  for (const f of ["README.md", "docs/features.md", "docs/architecture.md"]) {
    const texte = readFileSync(join(dir, f), "utf8");
    writeFileSync(
      join(dir, f),
      texte.replace(/\((?:to describe|à décrire)[^)]*\)/g, "rédigé").replace(/template to fill in|gabarit à remplir/g, "rédigé"),
    );
  }
}

test("créer une release : module optionnel (pas copié par défaut), recette/skill livrés en FR et EN, --dry-run sans réseau", async () => {
  for (const lang of ["fr", "en"]) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, lang, git: false }));
    enAvertissement(dir);
    // Le script lui-même n'est jamais copié automatiquement.
    assert.ok(!existsSync(join(dir, ".githooks/create-release.mjs")), "le module optionnel ne doit pas être copié par défaut");
    // La recette (toujours livrée) documente l'activation du module.
    const recette = lang === "fr" ? "docs/recipes/create-a-release.md" : "docs/recipes/create-a-release.md";
    assert.match(read(dir, recette), /optionnel|optional/i);
    // Le skill générique drwil mentionne la capacité release.
    const menu = read(dir, ".claude/skills/drwil/SKILL.md");
    assert.match(menu, /release/);
  }

  // Script utilisable en pratique : --dry-run, sans toucher au réseau ni créer de tag.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: true }));
  enAvertissement(dir);
  presentationRedigee(dir); // QUA-098 : sans examen fait, la release est refusée
  copierModule(dir, "create-release");
  git(dir, "add", "-A");
  git(dir, "commit", "-m", "feat: premier chantier");
  const r = spawnSync(process.execPath, [".githooks/create-release.mjs", "--dry-run"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /v0\.1\.0/);
  assert.match(r.stdout, /dry-run/);
});

test("créer une release : repère les paquets npm publiables (package.json suivi, non private) pour le tarball de release", async () => {
  const { publicPackages } = await import(new URL("../templates/common/optional/create-release/create-release.mjs", import.meta.url));
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: true }));
  // racine privée (monorepo), un paquet publiable dans packages/truc, un paquet explicitement privé ailleurs.
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "racine", private: true }));
  mkdirSync(join(dir, "packages/truc"), { recursive: true });
  writeFileSync(join(dir, "packages/truc/package.json"), JSON.stringify({ name: "truc" }));
  mkdirSync(join(dir, "packages/prive"), { recursive: true });
  writeFileSync(join(dir, "packages/prive/package.json"), JSON.stringify({ name: "prive", private: true }));
  git(dir, "add", "-A");
  git(dir, "commit", "-m", "feat: ajoute des paquets de test");

  const cwdAvant = process.cwd();
  process.chdir(dir);
  try {
    const paquets = publicPackages();
    assert.deepEqual(paquets.sort(), ["packages/truc"], "seul le paquet non private avec un name est retenu");
  } finally {
    process.chdir(cwdAvant);
  }
});

test("créer une release : --dry-run liste le paquet npm à empaqueter quand il y en a un", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: true }));
  enAvertissement(dir);
  presentationRedigee(dir); // QUA-098 : sans examen fait, la release est refusée
  copierModule(dir, "create-release");
  mkdirSync(join(dir, "packages/truc"), { recursive: true });
  writeFileSync(join(dir, "packages/truc/package.json"), JSON.stringify({ name: "truc", version: "1.0.0" }));
  git(dir, "add", "-A");
  git(dir, "commit", "-m", "feat: ajoute un paquet publiable");
  const r = spawnSync(process.execPath, [".githooks/create-release.mjs", "--dry-run"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /tarball.*packages\/truc/);
});

test("QUA-051 : module de release livré avec la fiche, le verdict et la promotion ; --candidate --dry-run montre la fiche sans rien publier", async () => {
  const module = fileURLToPath(new URL("../templates/common/optional/create-release/", import.meta.url));
  const scripts = [
    "create-release.mjs",
    "acceptance-sheet.mjs",
    "release-verdict.mjs",
    "promote-release.mjs",
    "recette-note.mjs",
    "release-review.mjs",
  ];
  for (const lang of ["fr", "en"]) {
    const dir = tmp();
    await quiet(() => init({ lang, targetDir: dir, git: true }));
    enAvertissement(dir);
    presentationRedigee(dir); // QUA-098 : sans examen fait, la release est refusée
    for (const s of scripts) assert.ok(!existsSync(join(dir, ".githooks", s)), `${s} : module optionnel, jamais copié par défaut`);
    copierModule(dir, "create-release");
    git(dir, "add", "-A");
    const c = git(dir, "commit", "-m", "feat: premier chantier");
    assert.equal(c.status, 0, c.stdout + c.stderr);
    const r = spawnSync(process.execPath, [".githooks/create-release.mjs", "--candidate", "--dry-run"], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, lang === "fr" ? /# Fiche de recette — v0\.1\.0-rc\.1/ : /# Acceptance sheet — v0\.1\.0-rc\.1/);
    assert.match(r.stdout, /--dry-run/);
    assert.equal(git(dir, "tag", "-l").stdout.trim(), "", "aucun tag en --dry-run");
    for (const s of ["release-verdict.mjs", "promote-release.mjs", "recette-note.mjs"])
      assert.equal(spawnSync(process.execPath, [`.githooks/${s}`], { cwd: dir, encoding: "utf8" }).status, 2, `${s} sans argument : usage`);
  }
  const readme = readFileSync(join(module, "README.md"), "utf8");
  for (const s of scripts) assert.match(readme, new RegExp(s.replace(".", "\\.")));
});

test("paquet npm : aucun fichier du gabarit n'est retiré par npm, le .gitignore livré arrive dans le projet", async () => {
  const racine = fileURLToPath(new URL("../templates", import.meta.url));
  const retires = spawnSync("find", [racine, "-name", ".gitignore", "-o", "-name", ".npmignore"], { encoding: "utf8" }).stdout.trim();
  assert.equal(retires, "", "npm retire ces fichiers d'un paquet publié : les livrer sous un autre nom (NOMS_LIVRES)");
  const pack = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["pack", "--dry-run", "--json"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  assert.equal(pack.status, 0, pack.stderr);
  const fichiers = JSON.parse(pack.stdout)[0].files.map((f) => f.path);
  assert.ok(fichiers.includes("templates/common/base/gitignore"), "le .gitignore du gabarit est bien dans le paquet");
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.ok(existsSync(join(dir, ".gitignore")) && !existsSync(join(dir, "gitignore")), "installé sous son vrai nom");
  assert.match(read(dir, ".gitignore"), /!\.drwil\/evidence\/attestations\//);
});

// Un seul numéro de version (docs/projects/journal.md, 2026-10-06).
test("version unique : la release suit package.json et refuse un numéro déjà publié ou en recul ; --version lit package.json", async () => {
  const { decideVersion } = await import(new URL("../templates/common/optional/create-release/create-release.mjs", import.meta.url));
  const v = (version) => [{ dir: "packages/drwil", version }];
  assert.deepEqual(decideVersion({ latest: "v0.2.0", bump: "patch", versions: v("0.3.0"), existingTags: ["v0.2.0"] }), {
    next: "v0.3.0",
    source: "package.json (packages/drwil)",
  });
  assert.match(
    decideVersion({ latest: "v0.2.1", bump: "patch", versions: v("0.2.1"), existingTags: ["v0.2.1"] }).error,
    /v0\.2\.1 existe déjà/,
  );
  assert.match(
    decideVersion({ latest: "v0.2.1", bump: "patch", versions: v("0.2.0"), existingTags: [] }).error,
    /n'est pas supérieure au dernier tag/,
  );
  assert.match(
    decideVersion({
      latest: null,
      bump: "patch",
      versions: [
        { dir: "a", version: "1.0.0" },
        { dir: "b", version: "1.1.0" },
      ],
    }).error,
    /en désaccord/,
  );
  assert.match(decideVersion({ latest: null, bump: "patch", versions: v(undefined) }).error, /non semver/);
  assert.deepEqual(
    decideVersion({ latest: "v1.2.3", bump: "minor", versions: [] }),
    { next: "v1.3.0", source: "commits" },
    "sans paquet npm : calcul d'après les commits, inchangé",
  );
  assert.equal(decideVersion({ latest: "v1.2.3", bump: null, versions: v("9.9.9") }), null, "aucun commit : rien à publier");

  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: true }));
  enAvertissement(dir);
  copierModule(dir, "create-release", ["create-release.mjs", "create-release-texts.mjs", "create-release-version.mjs"]);
  mkdirSync(join(dir, "packages/truc"), { recursive: true });
  writeFileSync(join(dir, "packages/truc/package.json"), JSON.stringify({ name: "truc", version: "1.0.0" }));
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "ajoute un paquet");
  git(dir, "tag", "-a", "v1.0.0", "-m", "v1.0.0");
  writeFileSync(join(dir, "packages/truc/a.txt"), "x");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "change sans changer la version");
  const r = spawnSync(process.execPath, [".githooks/create-release.mjs", "--dry-run"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1, "version non changée : release refusée, même en --dry-run");
  assert.match(r.stderr, /v1\.0\.0 existe déjà/);

  const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"));
  const ver = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "--version"], { encoding: "utf8" });
  assert.equal(ver.stdout.trim(), pkg.version, "drwil --version = package.json");
});
