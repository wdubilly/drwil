// Cycle de vie complet, dans un dépôt temporaire : installer, modifier, vérifier, mettre à jour, désinstaller.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { rulesLine } from "../dist/rules.js";
import { labelIds } from "../dist/verdict.js";
import {
  attest,
  doctor,
  fingerprint,
  formatForAgent,
  formatVerdict,
  init,
  uninstall,
  verdictJson,
  verify,
  writeEvidence,
} from "../dist/index.js";

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

test("QUA-113 contournements : une branche qui affaiblit un hook se valide elle-même, le rejeu avec les hooks de la branche principale la refuse", async () => {
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
    git("checkout", "-b", "travail");

    // La PR affaiblit le contrôle des références de la doc, puis glisse une référence cassée.
    writeFileSync(join(dir, ".githooks/check-docs.mjs"), "process.exit(0);\n");
    writeFileSync(join(dir, "docs/ia-first.md"), `${lire(dir, "docs/ia-first.md")}\nVoir \`docs/absent.md\`.\n`);
    git("add", "-A");
    git("commit", "--no-verify", "-m", "hook affaibli");
    assert.doesNotMatch(controles(dir).stdout, /docs\/absent\.md/, "le hook de la branche ne voit plus la référence cassée");

    const rejeu = spawnSync(process.execPath, [".githooks/base-checks.mjs", "--base", "main"], { cwd: dir, encoding: "utf8", env });
    assert.equal(rejeu.status, 1, rejeu.stdout + rejeu.stderr);
    assert.match(rejeu.stdout, /docs\/absent\.md/, "le hook de la branche principale la voit");
    assert.match(rejeu.stdout, /les contrôles échouent avec les hooks de « main »/);
    assert.equal(lire(dir, ".githooks/check-docs.mjs"), "process.exit(0);\n", "la copie de travail est rendue telle quelle");
    assert.equal(git("status", "--porcelain").stdout, "");
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

    // Tous les contrats passent, mais le critère n'a pas de preuve : le verdict tombe (QUA-034).
    let r = verifier();
    assert.equal(r.status, 1, "critère non prouvé : verdict FAIL, pas seulement à la clôture");
    assert.match(r.stdout, /Critères d'acceptation non prouvés de la fiche active.*« Un export vide est refusé » \(no-proof\)/);
    assert.match(r.stdout, /GOVERNANCE: FAIL/);
    r = cloturer();
    assert.notEqual(r.status, 0, "clôture refusée : le verdict n'est pas PASS");
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
    assert.equal(JSON.parse(lire(dir, r.file)).version, 3);
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

test("QUA-034 : un critère non prouvé fait tomber le verdict (FAIL), un critère humain non attesté le met en MANUAL ; sans fiche active, rien ne change", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-cycle-"));
  try {
    await silence(() => init({ lang: "fr", targetDir: dir, git: false }));
    const cfg = JSON.parse(lire(dir, ".drwil/ia-first.json"));
    cfg.checks = [{ id: "ok", run: "node -e 0" }];
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
    writeFileSync(
      join(dir, "docs/contracts.md"),
      "# Contrats\n\n## QUA-001 — automatique\n**Règle** : r.\n**Contrôle** : `ok`\n\n## QUA-002 — humain\n**Règle** : r.\n**Contrôle** : `ok`\n**Manuel** : relecture.\n",
    );
    const fiche = "docs/projects/essai.md";
    const criteres = (...lignes) =>
      writeFileSync(join(dir, fiche), `# Essai\n\n## Critères d'acceptation\n\n${lignes.map((l) => `- ${l}`).join("\n")}\n`);
    const actif = () =>
      writeFileSync(
        join(dir, ".drwil/state.json"),
        JSON.stringify({ version: 1, activity: "VERIFY", active_brief: fiche, active_request: null, since: null }),
      );
    const statut = async () => (await verify({ targetDir: dir, only: undefined })).status;
    // Sans fiche active : le contrat humain non attesté donne déjà MANUAL, rien de plus.
    assert.equal(await statut(), "MANUAL");

    criteres("Prouvé — `QUA-001`");
    actif();
    writeFileSync(join(dir, "docs/contracts.md"), lire(dir, "docs/contracts.md").replace(/\n## QUA-002[\s\S]*$/, "\n"));
    assert.equal(await statut(), "PASS", "tout prouvé : PASS");

    criteres("Prouvé — `QUA-001`", "Par un contrôle seul — `ok`");
    const v = await verify({ targetDir: dir });
    assert.equal(v.status, "FAIL", "critère automatique non prouvé : FAIL");
    assert.equal(v.code, 1);
    assert.match(
      formatVerdict(v),
      /Critères d'acceptation non prouvés de la fiche active \(verdict et clôture\) : « Par un contrôle seul » \(no-contract\)/,
    );
    const json = verdictJson(v);
    assert.equal(json.status, "fail");
    assert.deepEqual(
      json.criteria.map((c) => [c.text, c.status]),
      [
        ["Prouvé", "pass"],
        ["Par un contrôle seul", "no-contract"],
      ],
    );
    assert.match(
      formatForAgent(json),
      /Unproven acceptance criteria of the active brief[^\n]*\n {2}- « Par un contrôle seul » — ok: no-contract/,
    );

    writeFileSync(
      join(dir, "docs/contracts.md"),
      `${lire(dir, "docs/contracts.md")}\n## QUA-002 — humain\n**Règle** : r.\n**Contrôle** : \`ok\`\n**Manuel** : relecture.\n`,
    );
    criteres("Prouvé — `QUA-001`", "Relu [humain] — `QUA-002`");
    assert.equal(await statut(), "MANUAL", "seul manque un jugement humain à attester : MANUAL");
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("QUA-039 : les sorties de verify font suivre un ID de son titre, une fois, jamais deux ; humaine et agent", async () => {
  const titres = [
    { id: "APP-001", title: "Commande vide refusée" },
    { id: "APP-002", title: "Code promo expiré refusé" },
  ];
  assert.equal(
    labelIds("partagé par APP-001, APP-002 ; APP-001 encore", titres),
    "partagé par APP-001 (Commande vide refusée), APP-002 (Code promo expiré refusé) ; APP-001 encore",
  );
  assert.equal(labelIds("✓ PASS APP-001 Commande vide refusée", titres), "✓ PASS APP-001 Commande vide refusée", "déjà suivi de son titre");
  assert.equal(labelIds("APP-0011 et APP-9", titres), "APP-0011 et APP-9", "ni un ID plus long, ni un inconnu");
  const dir = mkdtempSync(join(tmpdir(), "drwil-cycle-"));
  try {
    await silence(() => init({ lang: "fr", targetDir: dir, git: false }));
    const v = await verify({ targetDir: dir });
    // Le libellé est donné une fois, à la première mention ; il n'est jamais répété en double.
    for (const sortie of [formatForAgent(verdictJson(v)), formatVerdict(v)]) {
      assert.match(sortie, /APP-001[^\n]*Example business contract/);
      assert.equal(sortie.split("(Example business contract").length - 1, 0, "pas d'annotation après un titre déjà donné");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

// Projet temporaire avec un contrat humain APP-009 qui couvre `src/` et `package.json` (QUA-081).
async function projetCouvert(couvre = "`src/**`, `package.json`") {
  const dir = mkdtempSync(join(tmpdir(), "drwil-cycle-"));
  await silence(() => init({ lang: "fr", targetDir: dir, git: false }));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src/a.js"), "export const a = 1;\n");
  writeFileSync(join(dir, "src/b.js"), "export const b = 2;\n");
  writeFileSync(join(dir, "package.json"), '{ "dependencies": {} }\n');
  writeFileSync(join(dir, "hors.txt"), "hors couverture\n");
  const base = lire(dir, "docs/contracts.md");
  const ligne = couvre ? `**Couvre** : ${couvre}\n` : "";
  writeFileSync(
    join(dir, "docs/contracts.md"),
    `${base}\n## APP-009 — Dépendances relues\n**Règle** : relues.\n**Manuel** : relecture.\n${ligne}`,
  );
  const contrat = async () => (await verify({ targetDir: dir, only: ["APP-009"] })).contracts[0];
  const oui = async () => true;
  return { dir, contrat, oui };
}
const nettoyer = (dir) => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });

test("QUA-081 : un fichier couvert modifié, ajouté, supprimé ou renommé fait tomber l'attestation et est nommé ; un fichier hors couverture, non", async () => {
  const { dir, contrat, oui } = await projetCouvert();
  try {
    const r = await attest({ targetDir: dir, id: "APP-009", confirm: oui });
    assert.equal(r.code, 0);
    const a = JSON.parse(lire(dir, r.file));
    assert.equal(a.version, 3);
    assert.deepEqual(Object.keys(a.coverage), ["package.json", "src/a.js", "src/b.js"], "fichiers couverts, par chemin");
    assert.equal((await contrat()).status, "ATTESTED");

    writeFileSync(join(dir, "hors.txt"), "autre contenu\n");
    assert.equal((await contrat()).status, "ATTESTED", "fichier hors couverture : attestation intacte");
    writeFileSync(join(dir, "src/a.js"), lire(dir, "src/a.js").replace(/\n/g, "\r\n"));
    assert.equal((await contrat()).status, "ATTESTED", "fins de ligne : sans effet");

    const tombe = async (cas, attendu) => {
      const k = await contrat();
      assert.equal(k.status, "MANUAL", cas);
      assert.ok(
        k.reasons.some((l) => l.includes(attendu)),
        `${cas} : ${k.reasons.join(" | ")}`,
      );
      const v = await verify({ targetDir: dir, only: ["APP-009"] });
      assert.notEqual(v.status, "PASS", `${cas} : verify ne rend plus PASS`);
    };
    writeFileSync(join(dir, "package.json"), '{ "dependencies": { "x": "1" } }\n');
    await tombe("fichier modifié (scénario S6 : une dépendance ajoutée)", "modifié : package.json");
    writeFileSync(join(dir, "package.json"), '{ "dependencies": {} }\n');
    assert.equal((await contrat()).status, "ATTESTED", "contenu rétabli : de nouveau valide");

    writeFileSync(join(dir, "src/c.js"), "export const c = 3;\n");
    await tombe("fichier ajouté", "ajouté : src/c.js");
    rmSync(join(dir, "src/c.js"));
    rmSync(join(dir, "src/b.js"));
    await tombe("fichier supprimé", "supprimé : src/b.js");
    writeFileSync(join(dir, "src/b.js"), "export const b = 2;\n");
    renameSync(join(dir, "src/b.js"), join(dir, "src/renomme.js"));
    await tombe("fichier renommé", "renommé : src/b.js → src/renomme.js");
  } finally {
    nettoyer(dir);
  }
});

test("QUA-081 : l'ordre des motifs ne change pas l'empreinte ; changer la couverture touche le contrat", async () => {
  const { dir, contrat, oui } = await projetCouvert();
  try {
    await attest({ targetDir: dir, id: "APP-009", confirm: oui });
    const registre = lire(dir, "docs/contracts.md");
    writeFileSync(join(dir, "docs/contracts.md"), registre.replace("`src/**`, `package.json`", "`package.json`, `src/**`"));
    assert.equal((await contrat()).status, "ATTESTED", "motifs dans un autre ordre");
    writeFileSync(join(dir, "docs/contracts.md"), registre.replace("`src/**`, `package.json`", "`src/**`"));
    assert.equal((await contrat()).status, "MANUAL", "motif retiré : le contrat a changé, à attester de nouveau");
  } finally {
    nettoyer(dir);
  }
});

test("QUA-082 : sans Couvre, l'attestation tient mais verify et doctor le signalent ; les versions 1 et 2 restent valables, la réattestation passe en version 3", async () => {
  const { dir, contrat, oui } = await projetCouvert("");
  try {
    const avant = await contrat();
    assert.ok(
      avant.reasons.some((l) => l.includes("aucune couverture déclarée")),
      "contrat attestable sans couverture : signalé",
    );
    const r = await attest({ targetDir: dir, id: "APP-009", confirm: oui });
    assert.equal(r.code, 0);
    writeFileSync(join(dir, "src/a.js"), "changé\n");
    let k = await contrat();
    assert.equal(k.status, "ATTESTED", "sans couverture, un fichier modifié ne fait pas tomber l'attestation");
    assert.ok(
      k.reasons.some((l) => l.includes("aucune couverture déclarée")),
      "signalé aussi quand il est attesté",
    );
    const point = (await doctor({ targetDir: dir })).points.find((p) => p.id === "coverage");
    assert.equal(point.state, "warning");
    assert.match(point.detail, /APP-009/);

    // Version 2 (empreinte de la partie humaine, sans couverture) : lue telle quelle.
    const registre = lire(dir, "docs/contracts.md");
    rmSync(join(dir, r.file));
    const lecteur = await import(pathToFileURL(join(dir, ".githooks/contracts.mjs")).href);
    const c = lecteur.readContracts(registre).find((x) => x.id === "APP-009");
    const humaine = sha(JSON.stringify({ regle: c.rule, manuel: c.manual, severite: c.severity }));
    writeFileSync(
      join(dir, ".drwil/evidence/attestations/APP-009-v2.json"),
      JSON.stringify({
        version: 2,
        contract: "APP-009",
        status: "ATTESTED",
        attestedAt: "2026-10-01T00:00:00.000Z",
        fingerprint: humaine,
        proof: {},
      }),
    );
    assert.equal((await contrat()).status, "ATTESTED", "version 2 valable telle quelle");
    writeFileSync(join(dir, "docs/contracts.md"), `${registre}**Couvre** : \`src/**\`\n`);
    assert.equal((await contrat()).status, "ATTESTED", "version 2 : jugée sans couverture, aucune réattestation forcée");
    const renouvelee = await attest({ targetDir: dir, id: "APP-009", confirm: oui, renew: true });
    assert.equal(renouvelee.code, 0);
    assert.equal(JSON.parse(lire(dir, renouvelee.file)).version, 3, "la première réattestation passe au nouveau format");
    k = await contrat();
    assert.equal(k.status, "ATTESTED");
    assert.ok(!k.reasons.some((l) => l.includes("aucune couverture déclarée")), "couverture déclarée : plus de signalement");
  } finally {
    nettoyer(dir);
  }
});

test("QUA-083 : drwil attest --renew remplace une attestation encore valide, après la même confirmation ; sans l'option, rien n'est renouvelé", async () => {
  const { dir, contrat, oui } = await projetCouvert();
  try {
    assert.equal((await attest({ targetDir: dir, id: "APP-009", confirm: oui, now: new Date("2026-10-06T08:00:00Z") })).code, 0);
    const sans = await attest({ targetDir: dir, id: "APP-009", confirm: oui });
    assert.equal(sans.code, 1);
    assert.match(sans.message, /--renew/, "le message indique l'option");
    const resumes = [];
    const refus = await attest({ targetDir: dir, id: "APP-009", renew: true, confirm: async (r) => resumes.push(r) && false });
    assert.equal(refus.code, 1, "sans confirmation, rien n'est renouvelé");
    assert.match(resumes[0], /Renouvellement : l'attestation du 2026-10-06/);
    assert.equal(readdirSync(join(dir, ".drwil/evidence/attestations")).length, 1);
    const ok = await attest({ targetDir: dir, id: "APP-009", renew: true, confirm: oui, now: new Date("2026-10-07T08:00:00Z") });
    assert.equal(ok.code, 0);
    assert.equal(readdirSync(join(dir, ".drwil/evidence/attestations")).length, 2, "l'historique est conservé");
    assert.equal((await contrat()).attestation.attestedAt, "2026-10-07T08:00:00.000Z");

    // Rien à renouveler : un contrat sans attestation valide s'atteste sans l'option.
    writeFileSync(join(dir, "src/a.js"), "changé\n");
    const inutile = await attest({ targetDir: dir, id: "APP-009", renew: true, confirm: oui });
    assert.equal(inutile.code, 1);
    assert.match(inutile.message, /rien à renouveler/);

    const bin = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
    const cli = spawnSync(process.execPath, [bin, "attest", "APP-009", "--renew"], { cwd: dir, encoding: "utf8", input: "APP-009\n", env });
    assert.equal(cli.status, 1, "sans terminal interactif, aucun renouvellement (pas de --yes, identifiant non lu sur stdin)");
    assert.equal(readdirSync(join(dir, ".drwil/evidence/attestations")).length, 2);
  } finally {
    nettoyer(dir);
  }
});

// Projet installé avec un seul contrôle vert et un registre minimal : base des preuves de clôture.
async function projetPreuve(contrats = "# Contrats\n\n## QUA-001 — automatique\n**Règle** : r.\n**Contrôle** : `ok`\n") {
  const dir = mkdtempSync(join(tmpdir(), "drwil-preuve-"));
  await silence(() => init({ lang: "fr", targetDir: dir, git: false }));
  const cfg = JSON.parse(lire(dir, ".drwil/ia-first.json"));
  cfg.checks = [{ id: "ok", run: "node -e 0" }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  writeFileSync(join(dir, "docs/contracts.md"), contrats);
  return dir;
}

const preuve = (dir, chantier, ...lignes) => {
  mkdirSync(join(dir, "docs/preuves"), { recursive: true });
  writeFileSync(
    join(dir, `docs/preuves/${chantier}.md`),
    `# Preuve de clôture — ${chantier}\n\n**Clos le** : 2026-10-21\n**Commit vérifié** : \`abc1234567\` — verdict \`drwil verify\` : PASS\n\n` +
      `| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |\n|---|---|---|---|\n${lignes.join("\n")}\n`,
  );
};

test("QUA-085 : après la clôture, les critères du fichier de preuve sont rejoués ; une preuve disparue fait échouer verify en nommant le critère", async () => {
  const dir = await projetPreuve();
  try {
    preuve(dir, "essai", "| Le registre garde la règle | `QUA-001` | `ok` | `sha256:1f3ac07b` (2 fichier(s)) |");
    let v = await verify({ targetDir: dir });
    assert.equal(v.status, "PASS", "preuve encore tenue : le verdict ne change pas");
    assert.deepEqual(v.proofs, [], "aucun critère de chantier clos en défaut");

    // Contrôle retiré du contrat : la preuve n'est plus durable, et le chantier est clos depuis longtemps.
    writeFileSync(join(dir, "docs/contracts.md"), "# Contrats\n\n## QUA-001 — automatique\n**Règle** : r.\n**Manuel** : relecture.\n");
    v = await verify({ targetDir: dir });
    assert.equal(v.status, "FAIL", "preuve disparue : FAIL franc, jamais un avertissement");
    assert.equal(v.code, 1);
    assert.deepEqual(
      v.proofs.map((c) => [c.workstream, c.text, c.status]),
      [["essai", "Le registre garde la règle", "not-durable"]],
    );
    assert.match(
      formatVerdict(v),
      /Critères de chantiers clos dont la preuve a disparu \(fichier[^)]*\) : essai « Le registre garde la règle »/,
    );
    const json = verdictJson(v);
    assert.equal(json.closureProofs.length, 1);
    assert.match(
      formatForAgent(json),
      /proof has disappeared \(closing proof replayed\)[^\n]*\n {2}- essai « Le registre garde la règle » — QUA-001/,
    );

    // Contrat abandonné : le lien ne désigne plus rien au registre.
    writeFileSync(join(dir, "docs/contracts.md"), "# Contrats\n\n## QUA-009 — autre\n**Règle** : r.\n**Contrôle** : `ok`\n");
    v = await verify({ targetDir: dir });
    assert.equal(v.status, "FAIL");
    assert.deepEqual(
      v.proofs.map((c) => c.status),
      ["unknown-proof"],
    );
  } finally {
    nettoyer(dir);
  }
});

test("QUA-084 : l'évidence de verify porte la couverture des contrats, que la clôture recopie sans la recalculer", async () => {
  const { dir } = await projetCouvert();
  try {
    const v = await verify({ targetDir: dir });
    const fichier = writeEvidence(dir, v);
    const ev = JSON.parse(lire(dir, fichier));
    const couvert = ev.evidence.find((k) => k.id === "APP-009");
    assert.deepEqual(couvert.covers, ["src/**", "package.json"]);
    assert.deepEqual(Object.keys(couvert.coverage).sort(), ["package.json", "src/a.js", "src/b.js"]);
    assert.ok(
      ev.evidence.every((k) => k.id === "APP-009" || !("coverage" in k)),
      "un contrat sans Couvre n'invente aucune couverture",
    );
  } finally {
    nettoyer(dir);
  }
});

test("QUA-086 : sans état local, la fiche jugée est lue depuis le trailer Drwil-Brief des commits de la branche", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drwil-preuve-"));
  const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8", env });
  try {
    await silence(() => init({ lang: "fr", targetDir: dir, git: true }));
    const cfg = JSON.parse(lire(dir, ".drwil/ia-first.json"));
    cfg.checks = [{ id: "ok", run: "node -e 0" }];
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
    writeFileSync(join(dir, "docs/contracts.md"), "# Contrats\n\n## QUA-001 — automatique\n**Règle** : r.\n**Contrôle** : `ok`\n");
    git("config", "user.email", "test@exemple.invalid");
    git("config", "user.name", "Test");
    git("config", "commit.gpgsign", "false");
    git("branch", "-M", "main");
    git("add", "-A");
    git("commit", "--no-verify", "-m", "installation");
    git("checkout", "-b", "travail");

    const fiche = "docs/projects/essai.md";
    writeFileSync(join(dir, fiche), "# Essai\n\n## Critères d'acceptation\n\n- Par un contrôle seul — `ok`\n");
    git("add", "-A");
    git("commit", "--no-verify", "-m", `travail\n\nDrwil-Brief: ${fiche}`);

    assert.ok(!existsSync(join(dir, ".drwil/state.json")), "aucun état local, comme en CI");
    const v = await verify({ targetDir: dir });
    assert.equal(v.status, "FAIL", "les critères de la fiche du trailer sont jugés sans état local");
    assert.deepEqual(
      (v.criteria ?? []).map((c) => [c.text, c.status]),
      [["Par un contrôle seul", "no-contract"]],
    );

    // Sur la branche principale, aucun commit ne porte le trailer : rien n'est jugé.
    git("checkout", "main");
    assert.equal((await verify({ targetDir: dir })).criteria, undefined);
  } finally {
    nettoyer(dir);
  }
});
