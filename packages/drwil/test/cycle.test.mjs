// Cycle de vie complet, dans un dépôt temporaire : installer, modifier, vérifier, mettre à jour, désinstaller.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { init, uninstall, verify } from "../dist/index.js";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const env = { ...process.env, CI: "", DRWIL_HOOK: "" };
const sha = (texte) => createHash("sha256").update(texte).digest("hex");
const lire = (dir, f) => readFileSync(join(dir, f), "utf8");
const manifeste = (dir) => JSON.parse(lire(dir, ".drwil/installed-files.json"));
const silence = async (fn) => {
  const log = console.log;
  const warn = console.warn;
  console.log = console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
    console.warn = warn;
  }
};
const controles = (dir) => spawnSync(process.execPath, [".githooks/run-checks.mjs"], { cwd: dir, encoding: "utf8", env });

test("cycle complet : installer, modifier, vérifier, mettre à jour, désinstaller", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-cycle-"));
  try {
    await silence(() => init({ lang: "fr", targetDir: dir, git: false }));
    const fichiers = Object.keys(manifeste(dir));
    assert.ok(fichiers.includes(".githooks/check-docs.mjs") && fichiers.includes(".githooks/engine.mjs"));

    // Modification du client : un fichier de la mécanique retouché, une ligne ajoutée à un fichier du projet.
    const retouche = `${lire(dir, ".githooks/engine.mjs")}\n// retouche du client\n`;
    writeFileSync(join(dir, ".githooks/engine.mjs"), retouche);
    writeFileSync(join(dir, "AGENTS.md"), `${lire(dir, "AGENTS.md")}\nRègle propre au projet.\n`);

    // Vérification : la suite des contrôles et le verdict tournent sur le projet installé.
    const v = await verify({ targetDir: dir });
    const docs = v.contracts.find((k) => k.id === "QUA-011");
    assert.equal(docs?.status, "PASS", "QUA-011 (docs) prouvé par son contrôle sur le projet installé et retouché");

    // Mise à jour : un fichier intact d'une ancienne version est rafraîchi, la retouche du client est gardée.
    const courant = lire(dir, ".githooks/check-docs.mjs");
    const ancien = "// ancienne version du kit\n";
    writeFileSync(join(dir, ".githooks/check-docs.mjs"), ancien);
    writeFileSync(
      join(dir, ".drwil/installed-files.json"),
      JSON.stringify({ ...manifeste(dir), ".githooks/check-docs.mjs": sha(ancien) }, null, 2),
    );
    await silence(() => init({ lang: "fr", targetDir: dir, git: false }));
    assert.equal(lire(dir, ".githooks/check-docs.mjs"), courant, "fichier intact : remis à la version courante");
    assert.equal(lire(dir, ".githooks/engine.mjs"), retouche, "fichier retouché par le client : conservé");
    assert.match(lire(dir, "AGENTS.md"), /Règle propre au projet/, "fichier du projet : jamais écrasé");

    // Désinstallation : l'intact part, le retouché est signalé et reste.
    const rapport = await uninstall({ targetDir: dir, dryRun: false });
    assert.ok(rapport.removed.includes(".githooks/check-docs.mjs"));
    assert.ok(!existsSync(join(dir, ".githooks/check-docs.mjs")));
    assert.ok(rapport.modified.includes(".githooks/engine.mjs"));
    assert.equal(lire(dir, ".githooks/engine.mjs"), retouche);
    assert.ok(existsSync(join(dir, "docs/projects/pending.md")), "les fiches du client ne sont jamais supprimées");
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("cycle complet : les contrôles du projet installé tournent avant et après la modification", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-cycle-"));
  try {
    await silence(() => init({ lang: "fr", targetDir: dir, git: false }));
    let r = controles(dir);
    assert.match(r.stdout, /contrôles exécutés|échec/, "run-checks rend un bilan lisible");
    writeFileSync(join(dir, "docs/ia-first.md"), `${lire(dir, "docs/ia-first.md")}\nVoir \`docs/chemin-inexistant.md\`.\n`);
    r = controles(dir);
    assert.notEqual(r.status, 0, "un chemin cité introuvable est détecté après la modification");
    assert.match(r.stdout, /chemin-inexistant/);
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("contournements : un commit passé avec --no-verify ou sans hooks est repris par les contrôles du push et de la CI", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-cycle-"));
  const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8", env });
  try {
    await silence(() => init({ lang: "fr", targetDir: dir, git: true }));
    git("config", "user.email", "test@exemple.invalid");
    git("config", "user.name", "Test");
    git("config", "commit.gpgsign", "false");
    git("checkout", "-b", "travail");
    git("add", "-A");
    git("commit", "--no-verify", "-m", "installation");

    const fautif = (suffixe) => {
      writeFileSync(join(dir, "docs/ia-first.md"), `${lire(dir, "docs/ia-first.md")}\nVoir \`docs/absent-${suffixe}.md\`.\n`);
      git("add", "-A");
    };

    fautif("hook");
    const refuse = git("commit", "-m", "doc fautive");
    assert.notEqual(refuse.status, 0, "le hook pre-commit refuse la doc fautive");

    git("commit", "--no-verify", "-m", "doc fautive, hook sauté");
    assert.equal(git("log", "--format=%s", "-1").stdout.trim(), "doc fautive, hook sauté", "le contournement passe localement");
    assert.notEqual(controles(dir).status, 0, "mais run-checks (pre-push, CI) le détecte");

    git("config", "core.hooksPath", "/dev/null");
    fautif("sans-hooks");
    assert.equal(git("commit", "-m", "hooks désactivés").status, 0, "sans hooks, rien ne bloque le commit");
    assert.notEqual(controles(dir).status, 0, "le contrôle rejoué à la demande détecte encore l'écart");
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("contournements : un état local falsifié n'empêche pas le rejeu du cadrage sur la branche (CI, pre-push)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-cycle-"));
  const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8", env });
  try {
    await silence(() => init({ lang: "fr", targetDir: dir, git: true }));
    git("config", "user.email", "test@exemple.invalid");
    git("config", "user.name", "Test");
    git("config", "commit.gpgsign", "false");
    git("branch", "-M", "main");
    git("add", "-A");
    git("commit", "--no-verify", "-m", "installation");

    // Fiche cadrée (périmètre : src/a.js seulement), commitée avant le travail.
    const fiche = "docs/projects/exemple.md";
    writeFileSync(join(dir, fiche), "# Projet : exemple\n\n**Statut** : cadré le 2026-10-14.\n\n<!-- scope\nfiles:\n  - src/a.js\n-->\n");
    git("add", "-A");
    git("commit", "--no-verify", "-m", "fiche cadrée");
    git("checkout", "-b", "travail");

    // État local réécrit à la main : BUILD sur cette fiche. Ignoré par Git, il ne prouve rien côté branche.
    mkdirSync(join(dir, ".drwil"), { recursive: true });
    writeFileSync(join(dir, ".drwil/state.json"), JSON.stringify({ activity: "BUILD", brief: fiche }, null, 2));
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src/a.js"), "a\n");
    writeFileSync(join(dir, "src/hors-cadrage.js"), "b\n");
    git("add", "-A");
    git("commit", "--no-verify", "-m", `hors cadrage\n\nDrwil-Brief: ${fiche}`);

    const r = spawnSync(process.execPath, [".githooks/run-checks.mjs"], {
      cwd: dir,
      encoding: "utf8",
      env: { ...env, DRWIL_BASE: "main" },
    });
    assert.notEqual(r.status, 0, "le rejeu par commit refuse le fichier hors du cadrage, malgré l'état falsifié");
    assert.match(r.stdout + r.stderr, /src\/hors-cadrage\.js/);
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
