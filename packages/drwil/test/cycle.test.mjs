// Cycle de vie complet, dans un dépôt temporaire : installer, modifier, vérifier, mettre à jour, désinstaller.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { rulesLine } from "../dist/rules.js";
import { attest, fingerprint, formatForAgent, formatVerdict, init, uninstall, verdictJson, verify } from "../dist/index.js";

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

test("critères d'acceptation : la clôture est refusée tant qu'un critère n'est pas prouvé, puis acceptée une fois lié à un contrat", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-cycle-"));
  const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8", env });
  const cli = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
  const verifier = () => spawnSync(process.execPath, [cli, "verify", "--evidence"], { cwd: dir, encoding: "utf8", env });
  const cloturer = () => spawnSync(process.execPath, [".githooks/state.mjs", "move", "CLOSING"], { cwd: dir, encoding: "utf8", env });
  try {
    await silence(() => init({ lang: "fr", targetDir: dir, git: true }));
    git("config", "user.email", "test@exemple.invalid");
    git("config", "user.name", "Test");
    git("config", "commit.gpgsign", "false");
    git("branch", "-M", "main");

    const cfg = JSON.parse(lire(dir, ".drwil/ia-first.json"));
    cfg.checks = [{ id: "ok", name: "toujours vert", run: 'node -e "process.exit(0)"' }];
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
    writeFileSync(join(dir, "docs/contracts.md"), "# Contrats\n\n## QUA-001 — titre\n**Règle** : exigence.\n**Contrôle** : `ok`\n");

    const fiche = "docs/projects/essai.md";
    const ecrireFiche = (critere) =>
      writeFileSync(
        join(dir, fiche),
        `# Projet : essai\n\n**Statut** : cadré le 2026-10-15.\n\n<!-- scope\nfiles:\n  - src/a.js\n-->\n\n## Critères d'acceptation\n\n- ${critere}\n`,
      );
    ecrireFiche("Un export vide est refusé");
    writeFileSync(
      join(dir, ".drwil/state.json"),
      JSON.stringify({ version: 1, activity: "VERIFY", active_brief: fiche, active_request: null, since: null }),
    );
    git("add", "-A");
    git("commit", "--no-verify", "-m", "installation et fiche");

    let r = verifier();
    assert.equal(r.status, 0, "le verdict global des contrats est PASS : seul le critère manque de preuve");
    r = cloturer();
    assert.notEqual(r.status, 0, "clôture refusée : le critère n'a pas de preuve");
    assert.match(r.stdout + r.stderr, /Un export vide est refusé.*no-proof/);
    assert.equal(JSON.parse(lire(dir, ".drwil/state.json")).activity, "VERIFY", "l'état n'a pas bougé");

    ecrireFiche("Un export vide est refusé — `QUA-001`");
    git("add", "-A");
    git("commit", "--no-verify", "-m", "critère lié à son contrat");
    assert.equal(verifier().status, 0);
    r = cloturer();
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(JSON.parse(lire(dir, ".drwil/state.json")).activity, "CLOSING");
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("QUA-030 : un contrôle partagé qui échoue est signalé non attribuable ; QUA-029 : un test cité absent fait échouer le lien", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-cycle-"));
  try {
    await silence(() => init({ lang: "fr", targetDir: dir, git: false }));
    const cfg = JSON.parse(lire(dir, ".drwil/ia-first.json"));
    cfg.checks = [
      { id: "tests", run: 'node -e "process.exit(1)"' },
      { id: "app-004", run: "node -e 0" },
    ];
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg, null, 2));
    const regles = [
      "## APP-002 — Code promo expiré refusé\n**Règle** : refusé.\n**Contrôle** : `tests`\n**Tests** : `test/promo.test.js`",
      "## APP-003 — Panier plafonné\n**Règle** : plafonné.\n**Contrôle** : `tests`",
      "## APP-004 — Commande vide refusée\n**Règle** : refusée.\n**Contrôle** : `app-004`",
    ];
    writeFileSync(join(dir, "docs/contracts.md"), `${lire(dir, "docs/contracts.md")}\n${regles.join("\n\n")}\n`);

    const contrat = (v, id) => v.contracts.find((k) => k.id === id);
    const v = await verify({ targetDir: dir });
    for (const id of ["APP-002", "APP-003"]) {
      assert.equal(contrat(v, id).status, "FAIL", id);
      assert.ok(
        contrat(v, id).reasons.some((r) => r.includes("tests est partagé par APP-002, APP-003 : échec non attribuable")),
        id,
      );
    }
    assert.equal(contrat(v, "APP-004").status, "PASS");
    assert.ok(!contrat(v, "APP-004").reasons.some((r) => r.includes("partagé")));
    assert.equal(contrat(v, "QUA-029").status, "FAIL", "test cité introuvable : lien rompu");

    mkdirSync(join(dir, "test"));
    writeFileSync(join(dir, "test/promo.test.js"), 'test("APP-002 : code expiré refusé", () => {});\n');
    assert.equal(contrat(await verify({ targetDir: dir }), "QUA-029").status, "PASS", "test présent, porteur de l'ID");
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("QUA-031 : verify termine par le bilan des règles métier ; le détail est dans le JSON ; préfixe métier réglable", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-cycle-"));
  try {
    await silence(() => init({ lang: "fr", targetDir: dir, git: false }));
    const cfg = JSON.parse(lire(dir, ".drwil/ia-first.json"));
    cfg.checks = [
      { id: "app-002", run: "node -e 0" },
      { id: "app-003", run: 'node -e "process.exit(1)"' },
      { id: "met-001", run: "node -e 0" },
    ];
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg, null, 2));
    mkdirSync(join(dir, "test"));
    writeFileSync(join(dir, "test/promo.test.js"), 'test("APP-002 : code expiré refusé", () => {});\n');
    const regles = [
      "## APP-002 — Code promo expiré refusé\n**Règle** : refusé.\n**Contrôle** : `app-002`\n**Tests** : `test/promo.test.js`\n**Origine** : codes promo — « Un code expiré est refusé »",
      "## APP-003 — Panier plafonné\n**Règle** : plafonné.\n**Contrôle** : `app-003`\n**Origine** : refonte du panier — « Le panier est plafonné »",
      "## MET-001 — Remise fidélité\n**Règle** : appliquée.\n**Contrôle** : `met-001`",
    ];
    writeFileSync(join(dir, "docs/contracts.md"), `${lire(dir, "docs/contracts.md")}\n${regles.join("\n\n")}\n`);

    const v = await verify({ targetDir: dir });
    assert.deepEqual(
      v.rules.map((r) => [r.id, r.state]),
      [
        ["APP-001", "to-complete"],
        ["APP-002", "tested"],
        ["APP-003", "broken"],
      ],
      "APP par défaut ; MET-001, sans origine, n'est pas une règle métier",
    );
    const ligne =
      "Règles métier : 1 prouvée(s) par un test, 1 à compléter (APP-001), 1 cassée(s) (APP-003, chantier « refonte du panier »)";
    assert.ok(formatVerdict(v).split("\n").includes(ligne), "sortie humaine");
    const json = verdictJson(v);
    assert.deepEqual(json.businessRules[1], {
      id: "APP-002",
      title: "Code promo expiré refusé",
      state: "tested",
      tests: ["test/promo.test.js"],
      origin: "codes promo — « Un code expiré est refusé »",
    });
    assert.match(
      formatForAgent(json),
      /^Business rules: 1 proven by a test, 1 to complete \(APP-001\), 1 broken \(APP-003, workstream « refonte du panier »\)$/m,
    );

    cfg.businessPrefixes = ["MET"];
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg, null, 2));
    const reglee = await verify({ targetDir: dir });
    assert.deepEqual(
      reglee.rules.map((r) => [r.id, r.state]),
      [
        ["APP-002", "tested"],
        ["APP-003", "broken"],
        ["MET-001", "untested"],
      ],
      "préfixe réglé : MET-001 compte, APP-001 (sans origine) non ; une origine compte toujours",
    );
    assert.match(formatVerdict(reglee), /1 prouvée\(s\) sans test cité \(MET-001\)/);
    assert.equal(rulesLine([], "fr"), null, "aucune règle métier : aucune ligne de bilan");
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("QUA-032 : une attestation tolère un contrôle ajouté ; règle, Manuel, sévérité, contrôle retiré ou redéfini la rendent obsolète ; une version 1 reste valable", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-cycle-"));
  try {
    await silence(() => init({ lang: "fr", targetDir: dir, git: false }));
    const base = lire(dir, "docs/contracts.md");
    const cfg = JSON.parse(lire(dir, ".drwil/ia-first.json"));
    const regler = (checks) => writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...cfg, checks }, null, 2));
    const ecrire = ({ regle = "relu.", controle = "`c1`", manuel = "relecture.", severite = "" } = {}) =>
      writeFileSync(
        join(dir, "docs/contracts.md"),
        `${base}\n## APP-009 — Revue humaine\n**Règle** : ${regle}\n**Contrôle** : ${controle}\n**Manuel** : ${manuel}\n${severite}`,
      );
    const statut = async () => (await verify({ targetDir: dir, only: ["APP-009"] })).contracts[0].status;
    const c1 = { id: "c1", run: "node -e 0" };
    const c2 = { id: "c2", run: "node -e 0" };
    regler([c1, c2]);
    ecrire();
    const sortie = [];
    const r = await attest({
      targetDir: dir,
      id: "APP-009",
      log: (l) => sortie.push(l),
      confirm: async () => sortie.push("question") > 0,
    });
    assert.equal(r.code, 0);
    assert.deepEqual(sortie, ["relance de c1…", "  c1 : ok", "question"], "chaque contrôle annoncé, puis son résultat, avant la question");
    assert.equal(JSON.parse(lire(dir, r.file)).version, 2);
    assert.equal(await statut(), "ATTESTED");

    ecrire({ controle: "`c1`, `c2`" });
    assert.equal(await statut(), "ATTESTED", "contrôle ajouté (qui passe) : attestation toujours valable");
    for (const [cas, variante] of [
      ["règle changée", { regle: "relu deux fois." }],
      ["Manuel changé", { manuel: "relecture à deux." }],
      ["sévérité changée", { severite: "**Sévérité** : avertissement\n" }],
      ["contrôle attesté retiré", { controle: "`c2`" }],
    ]) {
      ecrire(variante);
      assert.equal(await statut(), "MANUAL", cas);
    }
    ecrire();
    regler([{ ...c1, run: "node -e 1-1" }, c2]);
    assert.equal(await statut(), "MANUAL", "contrôle attesté redéfini");

    // Version 1, écrite avant ce chantier : jugée par l'ancienne empreinte, valable tant que rien ne change.
    regler([c1, c2]);
    rmSync(join(dir, r.file));
    const lecteur = await import(pathToFileURL(join(dir, ".githooks/contracts.mjs")).href);
    const k = lecteur.readContracts(lire(dir, "docs/contracts.md")).find((c) => c.id === "APP-009");
    writeFileSync(
      join(dir, ".drwil/evidence/attestations/APP-009-v1.json"),
      JSON.stringify({
        version: 1,
        contract: "APP-009",
        status: "ATTESTED",
        attestedAt: "2026-10-01T00:00:00.000Z",
        fingerprint: fingerprint(k, { ...cfg, checks: [c1, c2] }),
      }),
    );
    assert.equal(await statut(), "ATTESTED", "version 1, contrat inchangé");
    ecrire({ controle: "`c1`, `c2`" });
    assert.equal(await statut(), "MANUAL", "version 1 : tout changement l'invalide, comme avant");
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
