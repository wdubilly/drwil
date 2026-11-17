// Tests du kit, thème verify-reprise : verify en parallèle, reprise des verdicts de run-checks, --no-reuse et --failed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verify } from "../dist/index.js";
import { writeEvidence } from "../dist/verify.js";
import { verifyFailed } from "../dist/failed.js";
import { tmp, envTest, git, read, config, projetVerify, contrat, cli, projetReprise } from "./kit-commun.mjs";

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
