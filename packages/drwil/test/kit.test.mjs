// Tests de bout en bout du kit : installe dans des dossiers temporaires et lance les vrais contrôles.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { init, verify, formatVerdict, verdictJson, doctor, attest } from "../dist/index.js";
import { writeEvidence } from "../dist/verify.js";
import { verifyFailed } from "../dist/failed.js";
import { tmp, quiet, envTest, git, read, config, projetVerify, contrat, cli, projetReprise } from "./kit-commun.mjs";

test("QUA-139 : avec parallel, verify rend le même verdict contrat par contrat qu'en série, dans l'ordre du registre", async () => {
  const contrats =
    contrat("QUA-001", "**Contrôle** : `ko`") +
    contrat("QUA-002", "**Contrôle** : `ok`") +
    contrat("QUA-003", "**Contrôle** : `ko`, `ok`\n**Manuel** : relecture") +
    contrat("QUA-004", "**Contrôle** : `absent`");
  const lire = async (reglages) => {
    const dir = await projetVerify(contrats, reglages);
    const cfg = config(dir);
    cfg.checks.push({ id: "absent", name: "introuvable", run: "commande-qui-n-existe-pas-139" });
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
    const v = await verify({ targetDir: dir });
    return {
      status: v.status,
      contrats: v.contracts.map((k) => [k.id, k.status, k.reasons, k.checks.map((c) => [c.id, c.status])]),
    };
  };
  const serie = await lire({ parallel: false });
  const parallele = await lire({ parallel: true });
  assert.equal(serie.status, "FAIL");
  assert.deepEqual(parallele, serie);
});

test("QUA-139 : avec parallel, les contrôles cités se jouent en même temps ; sans le réglage, en série", async () => {
  const rdv = (moi, autre) =>
    `node -e "const f=require('fs');f.writeFileSync('${moi}','');const t=Date.now();while(!f.existsSync('${autre}')){if(Date.now()-t>4000)process.exit(1)}"`;
  const contrats = contrat("QUA-001", "**Contrôle** : `a`") + contrat("QUA-002", "**Contrôle** : `b`");
  const jouer = async (parallel) => {
    const dir = await projetVerify(contrats, { parallel });
    const cfg = config(dir);
    cfg.checks.push({ id: "a", name: "a", run: rdv("a.flag", "b.flag") }, { id: "b", name: "b", run: rdv("b.flag", "a.flag") });
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
    return verify({ targetDir: dir });
  };
  assert.equal((await jouer(true)).status, "PASS", "chacun attend que l'autre ait démarré : impossible en série");
  assert.equal((await jouer(false)).status, "FAIL");
});

const origines = (v) => Object.fromEntries(v.contracts.flatMap((k) => k.checks.map((c) => [c.id, c.reusedAt ?? "rejoué"])));

test("QUA-140 : verify reprend le verdict de run-checks sur un arbre identique, le dit contrat par contrat, et garde son échec", async () => {
  const dir = await projetReprise(contrat("QUA-001", "**Contrôle** : `ko`") + contrat("QUA-002", "**Contrôle** : `ok`"), {
    verdicts: { ko: { status: "fail", output: "cause venue de run-checks" }, ok: { status: "ok" } },
  });
  const v = await verify({ targetDir: dir });
  assert.deepEqual(origines(v), { ko: "2026-10-25T10:00:00.000Z", ok: "2026-10-25T10:00:00.000Z" });
  assert.deepEqual(
    v.contracts.map((k) => k.status),
    ["FAIL", "PASS"],
  );
  const raisons = v.contracts[0].reasons.join("\n");
  assert.match(raisons, /ko : repris \(arbre identique\) de run-checks du 2026-10-25T10:00:00.000Z/);
  assert.match(raisons, /cause venue de run-checks/, "un échec repris garde sa cause");
  const e = JSON.parse(read(dir, writeEvidence(dir, v)));
  assert.deepEqual(e.evidence[1].checks[0].reusedFrom, "run-checks");
  const agent = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify", "--agent"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });
  assert.match(agent.stdout, /Checks \(per contract\): 2 reused from run-checks on an identical tree, 0 replayed/);
  assert.doesNotMatch(agent.stdout, /reused \(|repris \(/, "les raisons d'origine ne noient pas la sortie");
});

test("QUA-140 : verify rejoue tout contrôle dont l'empreinte diffère (un octet, un fichier non suivi, la configuration)", async () => {
  const contrats = contrat("QUA-001", "**Contrôle** : `ko`");
  const rejoue = async (altere) => {
    const dir = await projetReprise(contrats);
    writeFileSync(join(dir, "docs", "note.md"), "a\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "y");
    const moteur = await import(pathToFileURL(join(dir, ".githooks", "engine.mjs")).href);
    const fichier = join(dir, ".drwil/evidence/run-checks-verdicts.json");
    writeFileSync(
      fichier,
      JSON.stringify({ ...JSON.parse(read(dir, ".drwil/evidence/run-checks-verdicts.json")), fingerprint: moteur.treeFingerprint(dir) }),
    );
    assert.equal((await verify({ targetDir: dir })).status, "PASS", "arbre identique : repris");
    altere(dir);
    return verify({ targetDir: dir });
  };
  for (const [nom, altere] of [
    ["un octet d'un fichier suivi", (dir) => writeFileSync(join(dir, "docs", "note.md"), "b\n")],
    ["un fichier non suivi", (dir) => writeFileSync(join(dir, "nouveau.txt"), "")],
    ["la configuration", (dir) => writeFileSync(join(dir, ".drwil/ia-first.json"), `${read(dir, ".drwil/ia-first.json")}\n`)],
  ]) {
    const v = await rejoue(altere);
    assert.equal(v.status, "FAIL", `${nom} : rejoué, donc rouge`);
    assert.deepEqual(origines(v), { ko: "rejoué" }, nom);
  }
});

test("QUA-140 : verify rejoue un contrôle sans verdict, non exécuté, déclaré reuse: false, ou avec reuse: false", async () => {
  const contrats = contrat("QUA-001", "**Contrôle** : `ko`") + contrat("QUA-002", "**Contrôle** : `ok`");
  const tous = { ok: { status: "ok" }, ko: { status: "ok" } };
  const sansVerdict = await verify({ targetDir: await projetReprise(contrats, { verdicts: { ok: { status: "ok" } } }) });
  assert.deepEqual(origines(sansVerdict), { ko: "rejoué", ok: "2026-10-25T10:00:00.000Z" });
  assert.equal(sansVerdict.status, "FAIL");
  const nonExecute = await verify({
    targetDir: await projetReprise(contrats, { verdicts: { ok: { status: "ok" }, ko: { status: "not-run" } } }),
  });
  assert.equal(origines(nonExecute).ko, "rejoué", "seuls « ok » et « fail » sont repris");
  const exterieur = await verify({
    targetDir: await projetReprise(contrats, { verdicts: tous, cfg: (cfg) => (cfg.checks[1].reuse = false) }),
  });
  assert.deepEqual(origines(exterieur), { ko: "rejoué", ok: "2026-10-25T10:00:00.000Z" }, "reuse: false : toujours rejoué");
  const dir = await projetReprise(contrats, { verdicts: tous });
  assert.equal((await verify({ targetDir: dir })).status, "PASS");
  const sans = await verify({ targetDir: dir, reuse: false });
  assert.deepEqual(origines(sans), { ko: "rejoué", ok: "rejoué" });
  assert.equal(sans.status, "FAIL");
});

test("QUA-140 : l'option --no-reuse de la commande verify rejoue tout, sans elle les verdicts sont repris", async () => {
  const dir = await projetReprise(contrat("QUA-001", "**Contrôle** : `ok`"), { verdicts: { ok: { status: "ok" } } });
  const cli = (...args) =>
    spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify", ...args], {
      cwd: dir,
      encoding: "utf8",
    });
  assert.match(cli().stdout, /repris \(arbre identique\) de run-checks du 2026-10-25T10:00:00.000Z/);
  assert.doesNotMatch(cli("--no-reuse").stdout, /repris \(/);
});

// QUA-141 : un verdict consigné par run-checks avec l'empreinte propre du contrôle (`control`), l'arbre ayant changé depuis (ou jamais pris).
async function projetParControle(contrats, { tree = false, played = [] } = {}) {
  const dir = await projetReprise(contrats, {
    cfg: (cfg) => {
      for (const c of cfg.checks) c.paths = ["src/**"];
    },
  });
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "a.txt"), "a\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "src");
  const moteur = await import(pathToFileURL(join(dir, ".githooks", "engine.mjs")).href);
  const controles = moteur.controlFingerprints(dir, moteur.checks(dir, { cfg: config(dir) }));
  const verdict = (id) => ({ status: "ok", ranAt: "2026-10-25T09:00:00.000Z", control: controles.get(id) });
  writeFileSync(
    join(dir, ".drwil/evidence/run-checks-verdicts.json"),
    JSON.stringify({
      ranAt: "2026-10-25T10:00:00.000Z",
      fingerprint: tree ? moteur.treeFingerprint(dir) : null,
      played,
      checks: { ok: verdict("ok"), ko: verdict("ko") },
    }),
  );
  return dir;
}

const bases = (v) => Object.fromEntries(v.contracts.flatMap((k) => k.checks.map((c) => [c.id, c.reusedBasis ?? "rejoué"])));

test("QUA-141 : verify reprend le verdict d'un contrôle dont les fichiers du paths et la déclaration sont inchangés, même si l'arbre a changé ailleurs, et le dit", async () => {
  const dir = await projetParControle(contrat("QUA-001", "**Contrôle** : `ko`") + contrat("QUA-002", "**Contrôle** : `ok`"));
  writeFileSync(join(dir, "ailleurs.txt"), "changé\n");
  const v = await verify({ targetDir: dir });
  assert.deepEqual(bases(v), { ko: "control", ok: "control" });
  assert.equal(v.status, "PASS", "le verdict « ok » consigné est repris : rien n'est rejoué");
  assert.match(
    v.contracts[0].reasons.join("\n"),
    /ko : repris \(fichiers du contrôle inchangés\) de run-checks du 2026-10-25T09:00:00.000Z — reprise par contrôle : ne vaut pas preuve de clôture/,
  );
  const agent = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify", "--agent"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });
  assert.match(agent.stdout, /GOVERNANCE: PASS/);
  assert.match(
    agent.stdout,
    /0 reused from run-checks on an identical tree, 0 replayed, 2 reused from run-checks on unchanged check files \(per-check reuse: not a closing proof/,
  );
  const e = JSON.parse(read(dir, writeEvidence(dir, v)));
  assert.equal(e.evidence[0].checks[0].reusedBasis, "control");
});

test("QUA-141 : verify rejoue un contrôle dont un octet de son paths ou la déclaration a changé, ou sans empreinte propre", async () => {
  const contrats = contrat("QUA-001", "**Contrôle** : `ko`") + contrat("QUA-002", "**Contrôle** : `ok`");
  const octet = await projetParControle(contrats);
  writeFileSync(join(octet, "src", "a.txt"), "b\n");
  const v1 = await verify({ targetDir: octet });
  assert.deepEqual(bases(v1), { ko: "rejoué", ok: "rejoué" });
  assert.equal(v1.status, "FAIL");
  const declaration = await projetParControle(contrats);
  const cfg = config(declaration);
  cfg.checks[0].name = "autre nom";
  writeFileSync(join(declaration, ".drwil/ia-first.json"), JSON.stringify(cfg));
  assert.deepEqual(
    bases(await verify({ targetDir: declaration })),
    { ko: "control", ok: "rejoué" },
    "seul le contrôle dont la déclaration change est rejoué",
  );
  const sans = await projetParControle(contrats);
  const fichier = join(sans, ".drwil/evidence/run-checks-verdicts.json");
  const consigne = JSON.parse(read(sans, ".drwil/evidence/run-checks-verdicts.json"));
  consigne.checks.ko.control = null;
  writeFileSync(fichier, JSON.stringify(consigne));
  assert.deepEqual(bases(await verify({ targetDir: sans })), { ko: "rejoué", ok: "control" });
});

test("QUA-141 : la preuve de clôture (evidence) et --no-reuse ne reprennent rien par contrôle ; l'arbre identique ne reprend que les contrôles joués dans la passe", async () => {
  const contrats = contrat("QUA-001", "**Contrôle** : `ko`") + contrat("QUA-002", "**Contrôle** : `ok`");
  const dir = await projetParControle(contrats, { tree: true, played: ["ok"] });
  assert.deepEqual(bases(await verify({ targetDir: dir })), { ko: "control", ok: "tree" });
  assert.deepEqual(
    bases(await verify({ targetDir: dir, evidence: true })),
    { ko: "rejoué", ok: "tree" },
    "ko n'a pas été joué dans la passe de l'arbre",
  );
  assert.deepEqual(bases(await verify({ targetDir: dir, reuse: false })), { ko: "rejoué", ok: "rejoué" });
  writeFileSync(join(dir, "ailleurs.txt"), "x\n");
  assert.deepEqual(
    bases(await verify({ targetDir: dir, evidence: true })),
    { ko: "rejoué", ok: "rejoué" },
    "arbre changé : la clôture rejoue tout",
  );
  const cli = (...args) =>
    spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify", "--json", ...args], {
      cwd: dir,
      encoding: "utf8",
      env: envTest,
    });
  assert.equal(JSON.parse(cli().stdout).status, "pass", "sans --evidence : repris par contrôle");
  assert.equal(JSON.parse(cli("--evidence").stdout).status, "fail", "--evidence : rejoué sur l'arbre entier, ko est rouge");
});

// QUA-159 : une preuve écrite à la main, pour fixer ce que `--failed` rejoue.
function avecPreuve(dir, resultats, nom = "verify-2026-10-26T10-00-00-000Z.json") {
  mkdirSync(join(dir, ".drwil/evidence"), { recursive: true });
  writeFileSync(join(dir, ".drwil/evidence", nom), typeof resultats === "string" ? resultats : JSON.stringify({ results: resultats }));
}

const preuves = (dir) => readdirSync(join(dir, ".drwil/evidence")).filter((f) => /^verify-/.test(f));

test("QUA-159 : verify --failed rejoue les seuls contrats ni PASS ni ATTESTED, nomme le MANUAL sans le rejouer, ne rend jamais PASS ni ne signe de preuve", async () => {
  const dir = await projetVerify(
    contrat("QUA-001", "**Contrôle** : `ko`") +
      contrat("QUA-002", "**Contrôle** : `ko`") +
      contrat("QUA-003", "**Manuel** : appréciation") +
      contrat("QUA-004", "**Contrôle** : `ok`") +
      contrat("QUA-005", "**Contrôle** : `ko`"),
  );
  avecPreuve(dir, [
    { id: "QUA-001", status: "pass" },
    { id: "QUA-002", status: "attested" },
    { id: "QUA-003", status: "manual" },
    { id: "QUA-004", status: "fail" },
  ]);
  // Une preuve plus récente illisible, puis sans contrat : ignorées, la dernière lisible fait foi.
  avecPreuve(dir, "pas du JSON", "verify-2026-10-27T10-00-00-000Z.json");
  avecPreuve(dir, [], "verify-2026-10-28T10-00-00-000Z.json");
  const avant = preuves(dir);
  const j = JSON.parse(cli(dir, "verify", "--failed", "--json").stdout);
  assert.equal(j.status, "partial");
  assert.equal(j.exitCode, 1);
  assert.deepEqual(j.partial, {
    previous: ".drwil/evidence/verify-2026-10-26T10-00-00-000Z.json",
    replayed: ["QUA-004", "QUA-005"],
    manual: ["QUA-003"],
    skipped: 2,
    outcome: "fail",
  });
  assert.deepEqual(
    j.results.map((r) => [r.id, r.status]),
    [
      ["QUA-004", "pass"],
      ["QUA-005", "fail"],
    ],
    "QUA-001 (ko, PASS à la preuve) n'est pas rejoué : il serait FAIL",
  );
  const humain = cli(dir, "verify", "--failed");
  assert.equal(humain.status, 1);
  assert.match(humain.stdout, /Verdict partiel \(--failed\), jamais une preuve de clôture : 2 contrat\(s\) rejoué\(s\)/);
  assert.match(humain.stdout, /En attente d'attestation, pas en échec, non rejoué\(s\) : QUA-003/);
  assert.match(humain.stdout, /GOVERNANCE: PARTIAL \(--failed\) — NOT A VERDICT/);
  const agent = cli(dir, "verify", "--failed", "--agent").stdout;
  assert.match(agent, /Verdict: GOVERNANCE: PARTIAL \(--failed\) — NOT A VERDICT \(exit 1\)/);
  assert.match(
    agent,
    /2 contract\(s\) replayed .* 2 PASS or ATTESTED at \.drwil\/evidence\/verify-2026-10-26.* not replayed, so not judged/,
  );
  assert.match(agent, /Awaiting attestation, not failing, not replayed: QUA-003 — HUMAN ACTION/);
  assert.match(agent, /then run the full pass `drwil verify --evidence`/);
  assert.doesNotMatch(humain.stdout + agent, /GOVERNANCE: PASS/);
  assert.deepEqual(preuves(dir), avant, "un verdict partiel n'écrit aucune preuve");
});

test("QUA-159 : verify --failed rendu vert reste partiel (exit 1, jamais PASS) ; sans preuve lisible il le dit et ne rejoue rien ; avec --evidence il refuse", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  const sans = cli(dir, "verify", "--failed");
  assert.equal(sans.status, 1);
  assert.match(sans.stdout, /Aucune preuve précédente lisible dans \.drwil\/evidence\/ : rien n'est rejoué/);
  assert.doesNotMatch(sans.stdout, /GOVERNANCE: PASS|QUA-001/);
  assert.match(cli(dir, "verify", "--failed", "--agent").stdout, /no readable previous evidence.*nothing replayed/);
  avecPreuve(dir, "[]");
  assert.equal(JSON.parse(cli(dir, "verify", "--failed", "--json").stdout).partial.previous, null, "preuve sans résultats : illisible");
  avecPreuve(dir, [{ id: "QUA-001", status: "fail" }]);
  const vert = JSON.parse(cli(dir, "verify", "--failed", "--json").stdout);
  assert.deepEqual([vert.status, vert.exitCode, vert.partial.outcome], ["partial", 1, "pass"]);
  const double = cli(dir, "verify", "--failed", "--evidence");
  assert.notEqual(double.status, 0);
  assert.match(double.stderr, /--failed.*--evidence|--evidence.*--failed/);
  assert.equal(preuves(dir).length, 1);
  const horsProjet = await verifyFailed({ targetDir: tmp() });
  assert.equal(horsProjet.status, "ERROR", "un projet que verify ne charge pas : verify dit pourquoi");
  assert.equal(horsProjet.partial, undefined);
});

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
