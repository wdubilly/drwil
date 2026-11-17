// Tests du kit, thème attestation : drwil attest, frontière d'attestation, attestation sur l'effet du contrôle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { init, verify, formatVerdict, verdictJson, doctor, attest } from "../dist/index.js";
import { tmp, quiet, envTest, git, read, config, projetVerify, contrat, cli } from "./kit-commun.mjs";

// DRWIL-013 (suite) : attestation humaine d'un contrat MANUAL. `confirmer` simule l'humain ;
// la CLI, elle, exige un vrai terminal (testé à part).
const oui = async () => true;

const non = async () => false;

async function projetAtteste(contrats) {
  const dir = await projetVerify(contrats);
  git(dir, "init", "-q");
  spawnSync("git", ["config", "user.name", "Testeuse"], { cwd: dir });
  return dir;
}

const attestations = (dir) =>
  existsSync(join(dir, ".drwil/evidence/attestations"))
    ? spawnSync("ls", [join(dir, ".drwil/evidence/attestations")], { encoding: "utf8" })
        .stdout.split("\n")
        .filter(Boolean)
    : [];

const MANUEL = contrat("QUA-001", "**Contrôle** : `ok`\n**Manuel** : relecture des fiches");

test("attest : un MANUAL devient ATTESTED, verify le compte comme satisfait sans le confondre avec PASS", async () => {
  const dir = await projetAtteste(MANUEL);
  assert.equal((await verify({ targetDir: dir })).status, "MANUAL");
  const r = await attest({ targetDir: dir, id: "QUA-001", note: "fiches relues", confirm: oui });
  assert.equal(r.code, 0, r.message);
  const a = JSON.parse(read(dir, r.file));
  assert.equal(a.contract, "QUA-001");
  assert.equal(a.status, "ATTESTED");
  assert.match(a.attestedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(a.actor, { name: "Testeuse", source: "git config user.name, déclaratif" });
  assert.equal(a.note, "fiches relues");
  assert.match(a.fingerprint, /^[0-9a-f]{64}$/);
  assert.deepEqual(a.automated, [{ id: "ok", status: "ok" }]);
  const v = await verify({ targetDir: dir });
  assert.equal(v.contracts[0].status, "ATTESTED", "jamais PASS : la preuve humaine reste visible");
  assert.equal(v.status, "PASS");
  assert.equal(v.code, 0);
  assert.match(formatVerdict(v), /1 ATTESTED.*\n.*validée\(s\) par attestation humaine/);
  const j = verdictJson(v);
  assert.equal(j.version, 1);
  assert.equal(j.contracts.attested, 1);
  assert.equal(j.results[0].status, "attested");
  assert.equal(j.results[0].attestation.note, "fiches relues");
});

test("attest : refus, contrat inconnu, contrat déjà PASS, contrat en échec", async () => {
  const dir = await projetAtteste(
    MANUEL + contrat("QUA-002", "**Contrôle** : `ok`") + contrat("QUA-003", "**Contrôle** : `ko`\n**Manuel** : relecture"),
  );
  let r = await attest({ targetDir: dir, id: "QUA-001", confirm: non });
  assert.equal(r.code, 1);
  assert.match(r.message, /refusée/);
  assert.deepEqual(attestations(dir), [], "rien d'enregistré après un refus");
  assert.equal((await verify({ targetDir: dir })).contracts[0].status, "MANUAL");
  r = await attest({ targetDir: dir, id: "QUA-999", confirm: oui });
  assert.equal(r.code, 2);
  assert.match(r.message, /contrat inconnu/);
  r = await attest({ targetDir: dir, id: "QUA-002", confirm: oui });
  assert.equal(r.code, 1);
  assert.match(r.message, /déjà prouvé automatiquement/);
  r = await attest({ targetDir: dir, id: "QUA-003", confirm: oui });
  assert.equal(r.code, 1, "un contrôle en échec ne s'atteste jamais");
  assert.match(r.message, /n'est pas attestable \(FAIL\)/);
  assert.deepEqual(attestations(dir), []);
});

test("attest : obsolète si le contrat ou sa preuve change ; plusieurs attestations, la dernière valide compte", async () => {
  const dir = await projetAtteste(MANUEL);
  assert.equal((await attest({ targetDir: dir, id: "QUA-001", confirm: oui, now: new Date("2026-10-06T08:00:00Z") })).code, 0);
  assert.equal((await attest({ targetDir: dir, id: "QUA-001", confirm: oui })).code, 1, "déjà attesté : pas de doublon");
  writeFileSync(
    join(dir, "docs/contracts.md"),
    read(dir, "docs/contracts.md").replace("relecture des fiches", "relecture des fiches et des recettes"),
  );
  let v = await verify({ targetDir: dir });
  assert.equal(v.contracts[0].status, "MANUAL", "contrat modifié : attestation obsolète, jamais une validation");
  assert.match(v.contracts[0].reasons.join(), /obsolète/);
  assert.equal((await attest({ targetDir: dir, id: "QUA-001", confirm: oui, now: new Date("2026-10-06T09:00:00Z") })).code, 0);
  assert.equal(attestations(dir).length, 2, "l'historique est conservé");
  v = await verify({ targetDir: dir });
  assert.equal(v.contracts[0].status, "ATTESTED");
  assert.equal(v.contracts[0].attestation.attestedAt, "2026-10-06T09:00:00.000Z");
  const cfg = config(dir);
  cfg.checks.find((c) => c.id === "ok").run = 'node -e "process.exit(0)" # autre preuve';
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  assert.equal((await verify({ targetDir: dir })).contracts[0].status, "MANUAL", "preuve modifiée : attestation obsolète");
});

test("attest : sévérités — seule une attestation de contrat bloquant pèse sur le verdict", async () => {
  const sev = (id, champs, s) => contrat(id, `${champs}\n**Sévérité** : ${s}`);
  const dir = await projetAtteste(
    MANUEL + sev("QUA-002", "**Manuel** : relecture", "avertissement") + sev("QUA-003", "**Manuel** : relecture", "indicatif"),
  );
  let v = await verify({ targetDir: dir });
  assert.equal(v.status, "MANUAL", "le bloquant MANUAL décide");
  await attest({ targetDir: dir, id: "QUA-001", confirm: oui });
  v = await verify({ targetDir: dir });
  assert.equal(v.status, "PASS", "bloquant attesté ; avertissement et indicatif MANUAL restent informatifs");
  assert.deepEqual(
    v.contracts.map((k) => k.status),
    ["ATTESTED", "MANUAL", "MANUAL"],
  );
  await attest({ targetDir: dir, id: "QUA-003", confirm: oui });
  v = await verify({ targetDir: dir });
  assert.equal(v.contracts[2].status, "ATTESTED");
  assert.deepEqual(verdictJson(v).bySeverity.advisory, { total: 1, passed: 0, notPassed: 0 });
});

test("attest : aucun contournement (CLI sans terminal, attestation forgée, échec postérieur, non applicable)", async () => {
  const dir = await projetAtteste(MANUEL);
  const cliAttest = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "attest", "QUA-001"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
    input: "QUA-001\n",
  });
  assert.equal(cliAttest.status, 1, "sans terminal interactif, pas d'attestation (agent, script, stdin redirigé)");
  assert.match(cliAttest.stderr, /terminal interactif est requis/);
  assert.deepEqual(attestations(dir), []);
  mkdirSync(join(dir, ".drwil/evidence/attestations"), { recursive: true });
  writeFileSync(
    join(dir, ".drwil/evidence/attestations/QUA-001-forgee.json"),
    JSON.stringify({
      version: 1,
      contract: "QUA-001",
      status: "ATTESTED",
      attestedAt: "2030-01-01T00:00:00.000Z",
      fingerprint: "0".repeat(64),
    }),
  );
  let v = await verify({ targetDir: dir });
  assert.equal(v.contracts[0].status, "MANUAL", "une empreinte qui ne correspond pas n'est jamais acceptée");
  await attest({ targetDir: dir, id: "QUA-001", confirm: oui });
  const cfg = config(dir);
  cfg.checks.find((c) => c.id === "ok").run = cfg.checks.find((c) => c.id === "ko").run;
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  v = await verify({ targetDir: dir });
  assert.equal(v.contracts[0].status, "FAIL", "une attestation ne masque jamais un contrôle en échec");
  const minimal = await projetVerify(contrat("SEC-007", "**Contrôle** : `secrets`\n**Manuel** : relecture"), { mode: "minimal" });
  const r = await attest({ targetDir: minimal, id: "SEC-007", confirm: oui });
  assert.equal(r.code, 1, "un contrôle non applicable ne se remplace pas par une attestation");
});

test("attest : aucune donnée sensible dans l'attestation (note caviardée, pas d'e-mail)", async () => {
  const dir = await projetAtteste(MANUEL);
  spawnSync("git", ["config", "user.email", "testeuse@exemple.invalid"], { cwd: dir });
  const r = await attest({
    targetDir: dir,
    id: "QUA-001",
    note: "ok avec password=hunter2 et ghp_abcdefghijklmnopqrstuvwxyz0123 " + "x".repeat(800),
    confirm: oui,
  });
  assert.equal(r.code, 0);
  const brut = read(dir, r.file);
  assert.doesNotMatch(brut, /hunter2|ghp_abcdef|testeuse@exemple/);
  assert.match(JSON.parse(brut).note, /\[REDACTED\]/);
  assert.ok(JSON.parse(brut).note.length <= 500);
});

test("frontière d'attestation : --yes, stdin redirigé, script, leurres refusés ; attestation manuelle visible en revue ; vraie attestation reconnue", async () => {
  const dir = await projetAtteste(MANUEL);
  const bin = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
  const yes = cli(dir, "attest", "QUA-001", "--yes");
  assert.notEqual(yes.status, 0, "aucun --yes");
  const pipe = spawnSync(process.execPath, [bin, "attest", "QUA-001"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
    input: "QUA-001\nQUA-001\n",
  });
  assert.equal(pipe.status, 1);
  writeFileSync(
    join(dir, "script.mjs"),
    `import { spawnSync } from "node:child_process";\nconst r = spawnSync(process.execPath, [${JSON.stringify(bin)}, "attest", "QUA-001"], { stdio: "pipe" });\nprocess.exit(r.status);\n`,
  );
  assert.equal(spawnSync(process.execPath, ["script.mjs"], { cwd: dir, env: envTest }).status, 1, "invocation depuis un script refusée");
  assert.deepEqual(attestations(dir), [], "aucune attestation créée par ces tentatives");
  // Leurres : une « attestation » hors du dossier versionné, ou sans statut ATTESTED, n'est jamais lue.
  mkdirSync(join(dir, ".drwil/evidence/attestations"), { recursive: true });
  const k = (await verify({ targetDir: dir })).contracts[0];
  writeFileSync(
    join(dir, ".drwil/evidence/QUA-001.json"),
    JSON.stringify({ contract: "QUA-001", status: "ATTESTED", fingerprint: k.fingerprint }),
  );
  writeFileSync(
    join(dir, ".drwil/evidence/attestations/QUA-001-pass.json"),
    JSON.stringify({ contract: "QUA-001", status: "PASS", fingerprint: k.fingerprint }),
  );
  assert.equal((await verify({ targetDir: dir })).contracts[0].status, "MANUAL");
  // Décision (a) assumée : une attestation écrite à la main avec la bonne empreinte est acceptée ;
  // elle n'échappe pas à la revue car son dossier est versionné (visible dans git status / la PR).
  writeFileSync(
    join(dir, ".drwil/evidence/attestations/QUA-001-main.json"),
    JSON.stringify({
      version: 4,
      contract: "QUA-001",
      status: "ATTESTED",
      attestedAt: "2026-10-06T10:00:00.000Z",
      fingerprint: k.fingerprint,
      proof: k.proof,
    }),
  );
  assert.equal((await verify({ targetDir: dir })).contracts[0].status, "ATTESTED");
  assert.match(
    git(dir, "status", "--porcelain", "--untracked-files=all").stdout,
    /\.drwil\/evidence\/attestations\/QUA-001-main\.json/,
    "visible en revue, jamais ignorée par git",
  );
  assert.doesNotMatch(
    git(dir, "status", "--porcelain", "--untracked-files=all").stdout,
    /\.drwil\/evidence\/QUA-001\.json/,
    "les évidences locales restent hors git",
  );
  // Vraie attestation humaine (confirmation simulée par l'API, la CLI exigeant un terminal) : reconnue.
  const dir2 = await projetAtteste(MANUEL);
  assert.equal((await attest({ targetDir: dir2, id: "QUA-001", confirm: oui })).code, 0);
  const r = cli(dir2, "verify", "--agent");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /0 PASS · 1 ATTESTED/);
  assert.match(r.stdout, /satisfied by a human attestation, not by an automated proof/);
});

// Projet temporaire avec un contrat à partie humaine qui cite un contrôle, attesté en version 4.
async function projetAttesteSurEffet() {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const base = read(dir, "docs/contracts.md");
  writeFileSync(
    join(dir, "docs/contracts.md"),
    `${base}\n## APP-009 — Revue humaine\n**Règle** : relu.\n**Contrôle** : \`c1\`\n**Manuel** : relecture.\n`,
  );
  const regler = (c1) => writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), checks: [c1] }, null, 2));
  const contrat = async () => (await verify({ targetDir: dir, only: ["APP-009"] })).contracts[0];
  const c1 = { id: "c1", run: "node -e 0 --test-name-pattern=APP-009", paths: ["src/**", "t.test.mjs"] };
  regler(c1);
  const r = await attest({ targetDir: dir, id: "APP-009", confirm: async () => true });
  assert.equal(r.code, 0);
  return { dir, c1, regler, contrat, fichier: r.file };
}

test("QUA-183 : l'attestation porte sur l'effet du contrôle ; un champ d'exécution ajouté ou retiré ne la fait pas tomber, une version 3 reste lue", async () => {
  const { dir, c1, regler, contrat, fichier } = await projetAttesteSurEffet();
  assert.equal(JSON.parse(read(dir, fichier)).version, 4);
  assert.equal((await contrat()).status, "ATTESTED");
  regler({ ...c1, needsBuild: false, parallel: true, paths: [...c1.paths].reverse() });
  assert.equal((await contrat()).status, "ATTESTED", "champs d'exécution et ordre des paths : l'effet est le même");
  regler(c1);

  // Version 3, écrite avant ce chantier : jugée par la définition (commande, dossier), sans les paths.
  const sha = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
  const v4 = JSON.parse(read(dir, fichier));
  rmSync(join(dir, fichier));
  const v3 = { ...v4, version: 3, proof: { c1: sha({ id: "c1", run: c1.run, cwd: null }) } };
  writeFileSync(join(dir, ".drwil/evidence/attestations/APP-009-v3.json"), JSON.stringify(v3));
  assert.equal((await contrat()).status, "ATTESTED", "version 3 : lue par son ancienne empreinte");
  regler({ ...c1, run: `${c1.run} autre` });
  const k = await contrat();
  assert.equal(k.status, "MANUAL");
  assert.ok(
    k.reasons.some((l) => /attestation de version 3/.test(l) && /version 4/.test(l)),
    "dit laquelle est lue par l'ancienne empreinte",
  );
});

test("QUA-184 : l'attestation tombe quand la commande, le test visé ou les paths d'un contrôle changent, et le dit", async () => {
  const { c1, regler, contrat } = await projetAttesteSurEffet();
  for (const [cas, variante, attendu] of [
    ["commande", { run: "node -e 1-1" }, /l'effet du contrôle c1 a changé/],
    ["test visé", { run: c1.run.replace("APP-009", "APP-010") }, /l'effet du contrôle c1 a changé/],
    ["paths", { paths: ["src/**"] }, /l'effet du contrôle c1 a changé/],
  ]) {
    regler({ ...c1, ...variante });
    const k = await contrat();
    assert.equal(k.status, "MANUAL", cas);
    assert.ok(
      k.reasons.some((l) => attendu.test(l)),
      `${cas} : la raison est dite`,
    );
  }
  regler(c1);
  assert.equal((await contrat()).status, "ATTESTED", "effet rétabli : attestation de nouveau valable");
});

test("QUA-185 : `Couvre : aucun` justifié compte comme déclaré, sans fichier couvert ; chaque contrat attesté de ce dépôt déclare ce qu'il couvre", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  writeFileSync(
    join(dir, "docs/contracts.md"),
    `${read(dir, "docs/contracts.md")}\n## APP-009 — Conduite\n**Règle** : relue.\n**Manuel** : relecture.\n**Couvre** : \`aucun\` — contrat de conduite, aucun fichier ne le juge\n`,
  );
  writeFileSync(join(dir, "aucun"), "un fichier nommé comme le mot réservé\n");
  const contrat = async () => (await verify({ targetDir: dir, only: ["APP-009"] })).contracts[0];
  const avant = await contrat();
  assert.deepEqual(avant.coverage, {}, "aucun n'est pas un motif de chemin");
  assert.ok(!avant.reasons.some((l) => l.includes("aucune couverture déclarée")), "déclaré : pas de signalement");
  assert.equal((await attest({ targetDir: dir, id: "APP-009", confirm: async () => true })).code, 0);
  writeFileSync(join(dir, "aucun"), "modifié\n");
  assert.equal((await contrat()).status, "ATTESTED");
  const point = (await doctor({ targetDir: dir })).points.find((p) => p.id === "coverage");
  assert.doesNotMatch(point.detail, /APP-009/);

  const depot = fileURLToPath(new URL("../../../", import.meta.url));
  const reel = (await doctor({ targetDir: depot })).points.find((p) => p.id === "coverage");
  assert.equal(reel.state, "ok", `contrats attestés sans Couvre : ${reel.detail}`);
});

test("QUA-211 : un contrôle réservé par runAt garde son attestation (champ d'exécution) ; la page des contrôles décrit le réglage", async () => {
  const { c1, regler, contrat } = await projetAttesteSurEffet();
  regler({ ...c1, runAt: ["verify", "ci"] });
  assert.equal((await contrat()).status, "ATTESTED", "réserver le contrôle ne change pas son effet");
  regler({ ...c1, runAt: ["verify", "ci"], paths: ["src/**"] });
  assert.equal((await contrat()).status, "MANUAL", "ses paths changés, l'attestation tombe comme pour tout contrôle");
  const depot = fileURLToPath(new URL("../../../", import.meta.url));
  for (const page of [
    join(depot, "packages/drwil/templates/common/base/docs/ia-first/4-checks-in-git.md"),
    join(depot, "docs/ia-first/4-checks-in-git.md"),
  ]) {
    const texte = readFileSync(page, "utf8").replace(/\s+/g, " ");
    for (const attendu of [
      /`runAt`/,
      /\["verify", "ci"\]/,
      /"not run" there \(a warning that blocks neither the commit nor the push\), never "passed"/,
      /`verify` and `ci` must both be listed/,
      /reuse of its last verdict/,
      /attestation citing the check untouched/,
    ])
      assert.match(texte, attendu, page);
  }
});
