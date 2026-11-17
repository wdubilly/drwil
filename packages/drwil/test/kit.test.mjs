// Tests de bout en bout du kit : installe dans des dossiers temporaires et lance les vrais contrôles.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, appendFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { init, verify, formatVerdict, verdictJson, doctor, attest } from "../dist/index.js";
import { criteriaTable, evaluateCriteria, redact, writeEvidence } from "../dist/verify.js";
import { verifyFailed } from "../dist/failed.js";
import { judgeDurable } from "../dist/closure.js";
import { tmp, quiet, envTest, git, read, config, projetVerify, contrat, cli } from "./kit-commun.mjs";

test("verify : PASS (exit 0) quand toutes les obligations sont prouvées par un contrôle", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  const v = await verify({ targetDir: dir });
  assert.equal(v.status, "PASS");
  assert.equal(v.code, 0);
  assert.deepEqual(
    v.contracts.map((k) => [k.id, k.status]),
    [["QUA-001", "PASS"]],
  );
  assert.match(formatVerdict(v), /GOVERNANCE: PASS/);
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
});

test("verify : FAIL (exit 1) dès qu'une obligation échoue, avec la cause visible", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `ko`"));
  const v = await verify({ targetDir: dir });
  assert.equal(v.status, "FAIL");
  assert.equal(v.code, 1);
  assert.equal(v.contracts.find((k) => k.id === "QUA-002").status, "FAIL");
  const sortie = formatVerdict(v);
  assert.match(sortie, /ko : échec/);
  assert.match(sortie, /cause du rouge/);
  assert.match(sortie, /GOVERNANCE: FAIL/);
});

test("verify : MANUAL (exit 1, jamais PASS) pour une preuve humaine, partie automatisée affichée à part", async () => {
  const dir = await projetVerify(
    contrat("QUA-001", "**Contrôle** : `ok`\n**Manuel** : relecture humaine") + contrat("QUA-002", "**Manuel** : appréciation"),
  );
  const v = await verify({ targetDir: dir });
  assert.equal(v.status, "MANUAL");
  assert.equal(v.code, 1, "MANUAL empêche le 0 sans être une erreur technique");
  assert.deepEqual(
    v.contracts.map((k) => k.status),
    ["MANUAL", "MANUAL"],
  );
  const sortie = formatVerdict(v);
  assert.match(sortie, /ok : ok \(automatisé\)/);
  assert.match(sortie, /humain requis : relecture humaine/);
  assert.match(sortie, /GOVERNANCE: MANUAL REVIEW REQUIRED/);
});

test("verify : contrat historique en tableau sans contrôle = MANUAL, jamais ignoré", async () => {
  const dir = await projetVerify(`| ID | Règle |\n|---|---|\n| SEC-006 | historique |\n\n${contrat("QUA-001", "**Contrôle** : `ok`")}`);
  const v = await verify({ targetDir: dir });
  assert.deepEqual(
    v.contracts.map((k) => [k.id, k.status]),
    [
      ["SEC-006", "MANUAL"],
      ["QUA-001", "PASS"],
    ],
  );
  assert.equal(v.status, "MANUAL");
});

test("QUA-298 : verify ne juge jamais un contrat retiré (ni PASS, ni attestable) ; un champ Retiré mal formé est une ERROR", async () => {
  const retire = contrat("QUA-002", "**Retiré** : 2026-11-13 — remplacé par QUA-001.");
  let v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + retire) });
  assert.deepEqual([v.status, v.contracts.map((k) => k.id)], ["PASS", ["QUA-001"]]);
  v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + retire), only: ["QUA-002"] });
  assert.deepEqual(v.contracts, [], "jamais listé, donc jamais attestable");
  v = await verify({ targetDir: await projetVerify(contrat("QUA-002", "**Retiré** : un jour.")) });
  assert.equal(v.status, "ERROR");
  assert.deepEqual(
    v.contracts.map((k) => [k.id, k.status]),
    [["QUA-002", "ERROR"]],
  );
  assert.match(v.contracts[0].reasons.join(), /champ Retiré mal formé « un jour\. »/);
});

test("QUA-298 : un critère d'une preuve de clôture lié à un contrat retiré est rapporté « retiré », ni succès ni échec, et verify le dit", async () => {
  const retire = contrat("QUA-002", "**Retiré** : 2026-11-13 — remplacé par QUA-001.");
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + retire);
  mkdirSync(join(dir, "docs/preuves"), { recursive: true });
  const ligne = (texte, id) => `| ${texte} | \`${id}\` | — | — |\n`;
  const tableau = `| Critère | Contrat | Contrôle | Empreinte |\n|---|---|---|---|\n`;
  writeFileSync(
    join(dir, "docs/preuves/ancien.md"),
    `# Preuve\n\n${tableau}${ligne("Règle retirée", "QUA-002")}${ligne("Règle vivante", "QUA-001")}`,
  );
  let v = await verify({ targetDir: dir });
  assert.deepEqual([v.status, v.proofs], ["PASS", []], "ni échec ni preuve disparue");
  assert.match((v.notices ?? []).join(), /contrat retiré \(QUA-298\), ni succès ni échec : ancien « Règle retirée » \(QUA-002\)/);
  assert.match(formatVerdict(v), /ancien « Règle retirée » \(QUA-002\)/);
  assert.doesNotMatch(formatVerdict(v), /Règle vivante/, "un critère prouvé n'est jamais signalé");
  const seul = { lang: "en", status: "PASS", code: 0, contracts: v.contracts, errors: [], unattached: [] };
  await judgeDurable(seul, {
    root: dir,
    registry: "docs/contracts.md",
    cfg: undefined,
    contracts: [{ id: "QUA-002", retired: "x" }],
    read: () => [],
  });
  assert.deepEqual(
    [seul.status, seul.notices],
    [
      "PASS",
      [
        "Criteria of closed workstreams linked to a retired contract (QUA-298), neither success nor failure: ancien « Règle retirée » (QUA-002)",
      ],
    ],
  );
  writeFileSync(join(dir, "docs/preuves/ancien.md"), `# Preuve\n\n${tableau}${ligne("Règle effacée", "QUA-009")}`);
  v = await verify({ targetDir: dir });
  assert.deepEqual(
    [v.status, v.proofs.map((c) => [c.link, c.status])],
    ["FAIL", [["QUA-009", "unknown-proof"]]],
    "absent du registre : toujours un échec",
  );
});

test("verify : ERROR (exit 2) pour un contrôle inconnu, une obligation invérifiable ou un doublon ; FAIL l'emporte", async () => {
  let v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `inexistant`")) });
  assert.equal(v.status, "ERROR");
  assert.equal(v.code, 2);
  assert.match(v.contracts[0].reasons.join(), /contrôle inconnu « inexistant »/);

  v = await verify({ targetDir: await projetVerify("## QUA-001 — sans rien\n**Raison** : intention seule.\n") });
  assert.equal(v.status, "ERROR", "une obligation sans exigence ni preuve n'est jamais acceptée en silence");
  assert.match(v.contracts[0].reasons.join(), /exigence absente/);
  assert.match(v.contracts[0].reasons.join(), /aucune preuve déclarée/);

  v = await verify({
    targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-001", "**Contrôle** : `ok`")),
  });
  assert.equal(v.status, "ERROR");
  assert.match(v.errors.join(), /défini plusieurs fois/);

  v = await verify({
    targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `inexistant`") + contrat("QUA-002", "**Contrôle** : `ko`")),
  });
  assert.equal(v.status, "FAIL", "un échec établi l'emporte sur une erreur");
});

test("verify : ERROR (exit 2) sans moteur installé ou sans registre, hooks indépendants de drwil", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  // Les hooks n'importent que .githooks/ : ils tournent sans drwil.
  assert.doesNotMatch(
    read(dir, ".githooks/run-checks.mjs") + read(dir, ".githooks/engine.mjs"),
    /from "drwil"|packages\/drwil|dist\/index/,
  );
  writeFileSync(join(dir, "docs/contracts.md"), "# Contrats\n");
  let v = await verify({ targetDir: dir });
  assert.equal(v.code, 2);
  assert.match(v.errors.join(), /aucun contrat/);
  const vide = tmp();
  v = await verify({ targetDir: vide });
  assert.equal(v.code, 2);
  assert.match(v.errors.join(), /check engine missing/);
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify"], {
    cwd: vide,
    encoding: "utf8",
    env: envTest,
  });
  assert.equal(cli.status, 2);
  assert.match(cli.stdout, /GOVERNANCE: VERIFY ERROR/);
});

const cliVerify = (dir) =>
  spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });

test("verify : exit 1 réel via la CLI pour FAIL et pour MANUAL, libellés distincts", async () => {
  const fail = cliVerify(await projetVerify(contrat("QUA-001", "**Contrôle** : `ko`")));
  assert.equal(fail.status, 1, fail.stdout + fail.stderr);
  assert.match(fail.stdout, /GOVERNANCE: FAIL/);
  const manuel = cliVerify(await projetVerify(contrat("QUA-001", "**Manuel** : relecture")));
  assert.equal(manuel.status, 1, manuel.stdout + manuel.stderr);
  assert.match(manuel.stdout, /GOVERNANCE: MANUAL REVIEW REQUIRED/);
  assert.doesNotMatch(manuel.stdout, /GOVERNANCE: (PASS|FAIL)/, "MANUAL n'est ni une réussite ni un échec");
});

test("verify : outil indisponible (contrôle non exécuté) → ERROR, jamais PASS", async () => {
  // Sans CI configurée, `ci-coverage` ne peut pas tourner : la preuve n'est pas établie.
  const v = await verify({ targetDir: await projetVerify(contrat("QUA-013", "**Contrôle** : `ci-coverage`")) });
  assert.equal(v.status, "ERROR");
  assert.equal(v.code, 2);
  assert.match(v.contracts[0].reasons.join(), /ci-coverage : non exécuté/);
});

test("QUA-013 : la sortie d'un contrôle non exécuté ne vaut jamais un succès — sortie humaine, --agent, JSON, verdict repris", async () => {
  // Ce que l'humain lisait à chaque attestation : dans chaque sortie, un contrôle non exécuté est dit tel, jamais « ok ».
  const contrats = contrat("QUA-013", "**Contrôle** : `ci-coverage`") + contrat("QUA-001", "**Contrôle** : `ok`");
  const dir = await projetVerify(contrats);
  const v = await verify({ targetDir: dir });
  assert.equal(v.status, "ERROR");
  assert.notEqual(v.code, 0);
  const k = v.contracts.find((c) => c.id === "QUA-013");
  assert.deepEqual(
    k.checks.map((c) => [c.id, c.status]),
    [["ci-coverage", "not-run"]],
  );
  const humain = formatVerdict(v);
  assert.match(humain, /! ERROR\s+QUA-013/);
  assert.match(humain, /ci-coverage : non exécuté/);
  assert.doesNotMatch(humain, /ci-coverage : (ok|repris)/);
  assert.doesNotMatch(humain, /GOVERNANCE: PASS/);
  const json = verdictJson(v);
  assert.equal(json.status, "error");
  assert.notEqual(json.label, "GOVERNANCE: PASS");
  const resultat = json.results.find((r) => r.id === "QUA-013");
  assert.equal(resultat.status, "error");
  assert.equal(resultat.attestable, false, "un contrôle non exécuté ne se remplace pas par une attestation");
  assert.deepEqual(
    resultat.checks.map((c) => c.status),
    ["not-run"],
  );
  const agent = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "verify", "--agent"], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });
  assert.equal(agent.status, 2, agent.stdout + agent.stderr);
  assert.doesNotMatch(agent.stdout, /GOVERNANCE: PASS/);
  assert.match(agent.stdout, /GOVERNANCE: VERIFY ERROR/);
  // Un verdict « non exécuté » consigné par run-checks n'est jamais repris comme un succès : le contrôle est rejoué.
  const repris = await verify({
    targetDir: await projetReprise(contrat("QUA-001", "**Contrôle** : `ko`"), { verdicts: { ko: { status: "not-run" } } }),
  });
  assert.equal(repris.status, "FAIL");
  assert.equal(repris.contracts[0].checks[0].reusedAt, undefined);
});

test("verify : critères d'acceptation de la fiche active jugés contre le registre, écrits dans l'évidence", async () => {
  const dir = await projetVerify(
    contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `ko`") + contrat("QUA-003", "**Manuel** : appréciation"),
  );
  assert.equal((await verify({ targetDir: dir })).criteria, undefined, "sans fiche active : rien à juger");
  writeFileSync(
    join(dir, "docs/projects/essai.md"),
    [
      "# Essai",
      "",
      "## Critères d'acceptation",
      "",
      "- Prouvé par un contrat — `QUA-001`",
      "- Sans lien",
      "- Lien inconnu — `QUA-999`",
      "- Contrat rouge — `QUA-002`",
      "- Contrat manuel pour un critère automatique — `QUA-003`",
      "- Jugement humain non attesté [humain] — `QUA-003`",
      "- Prouvé par un contrôle — `ok`",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(dir, ".drwil/state.json"),
    JSON.stringify({ version: 1, activity: "EVIDENCE", active_brief: "docs/projects/essai.md", active_request: null, since: null }),
  );
  const v = await verify({ targetDir: dir });
  assert.deepEqual(
    v.criteria.map((c) => [c.text, c.status]),
    [
      ["Prouvé par un contrat", "pass"],
      ["Sans lien", "no-proof"],
      ["Lien inconnu", "unknown-proof"],
      ["Contrat rouge", "not-pass"],
      ["Contrat manuel pour un critère automatique", "not-durable"],
      ["Jugement humain non attesté", "not-pass"],
      ["Prouvé par un contrôle", "no-contract"],
    ],
  );
  const ecrit = JSON.parse(readFileSync(join(dir, writeEvidence(dir, v)), "utf8"));
  assert.deepEqual(ecrit.criteria, v.criteria);
  assert.deepEqual((await verify({ targetDir: dir, only: ["QUA-001"] })).criteria, undefined, "attest ne juge pas les critères");
});

test("QUA-022 : critères d'acceptation : contrat créé, réutilisé ou modifié dans la branche, jugé contre la base ; sans contrat, refusé", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `ok`"));
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir, encoding: "utf8" });
  const fiche = "docs/projects/essai.md";
  const etat = { version: 1, activity: "EVIDENCE", active_brief: fiche, active_request: null, since: null };
  writeFileSync(join(dir, ".drwil/state.json"), JSON.stringify(etat));
  writeFileSync(join(dir, fiche), "# Essai\n\n## Critères d'acceptation\n\n- Réutilisé — `QUA-001`\n");
  assert.equal((await verify({ targetDir: dir })).criteria[0].change, null, "hors git : rien à comparer");
  git("init", "-q", "-b", "master");
  git("add", "-A");
  git("commit", "-qm", "base");
  git("checkout", "-qb", "chantier");
  writeFileSync(
    join(dir, "docs/contracts.md"),
    `# Contrats\n\n${contrat("QUA-001", "**Contrôle** : `ok`")}${contrat("QUA-002", "**Contrôle** : `ok`\nPrécisé.")}${contrat("QUA-003", "**Contrôle** : `ok`\n**Origine** : essai — « Créé »")}${contrat("QUA-004", "**Contrôle** : `ok`")}\n`,
  );
  writeFileSync(
    join(dir, fiche),
    [
      "# Essai",
      "",
      "## Critères d'acceptation",
      "",
      "- Réutilisé — `QUA-001`",
      "- Modifié — `QUA-002`",
      "- Créé — `QUA-003`",
      "- Créé sans Origine — `QUA-004`",
      "- Sans contrat — `QUA-404`",
      "- Par un contrôle — `ok`",
      "",
    ].join("\n"),
  );
  const v = await verify({ targetDir: dir });
  assert.deepEqual(
    v.criteria.map((c) => [c.text, c.status, c.change]),
    [
      ["Réutilisé", "pass", "reused"],
      ["Modifié", "pass", "modified"],
      ["Créé", "pass", "created"],
      ["Créé sans Origine", "no-origin", "created"],
      ["Sans contrat", "unknown-proof", null],
      ["Par un contrôle", "no-contract", null],
    ],
  );
  assert.match(criteriaTable(v.criteria, "fr"), /\| Créé \| `QUA-003` \(pass, créé\) \| ✅ prouvé \|/);
  assert.match(criteriaTable(v.criteria, "en"), /`QUA-001` \(pass, reused\)/);
  assert.match(
    criteriaTable(v.criteria, "fr"),
    /\| Créé sans Origine \| `QUA-004` \(pass, créé\) \| ❌ contrat créé sans champ Origine \|/,
  );
  assert.match(
    criteriaTable(v.criteria, "en"),
    /\| Par un contrôle \| `ok` \(ok\) \| ❌ check without a contract \(nothing in the registry\) \|/,
  );
});

test("QUA-023 : régression ou évolution : contrat modifié sans déclaration refusé, déclaré accepté ; l'origine d'un contrat en échec affichée", async () => {
  const origine = "**Origine** : export propre — « Un export vide est refusé »";
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", `**Contrôle** : \`ko\`\n${origine}`));
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir, encoding: "utf8" });
  const fiche = "docs/projects/essai.md";
  writeFileSync(
    join(dir, ".drwil/state.json"),
    JSON.stringify({ version: 1, activity: "EVIDENCE", active_brief: fiche, active_request: null, since: null }),
  );
  writeFileSync(join(dir, fiche), "# Essai\n\n## Critères d'acceptation\n\n- Réutilisé — `QUA-001`\n");
  git("init", "-q", "-b", "master");
  git("add", "-A");
  git("commit", "-qm", "base");
  git("checkout", "-qb", "chantier");

  let v = await verify({ targetDir: dir });
  assert.deepEqual(v.undeclared, []);
  const echec = v.contracts.find((k) => k.id === "QUA-002");
  assert.equal(echec.status, "FAIL");
  assert.match(echec.reasons.join("\n"), /protège export propre — « Un export vide est refusé » — régression/);
  assert.doesNotMatch(v.contracts.find((k) => k.id === "QUA-001").reasons.join("\n"), /protège/);

  // Régression : le contrat change sans que la fiche le déclare.
  writeFileSync(
    join(dir, "docs/contracts.md"),
    `# Contrats\n\n${contrat("QUA-001", "**Contrôle** : `ok`\nAssoupli.")}${contrat("QUA-002", `**Contrôle** : \`ko\`\n${origine}`)}\n`,
  );
  v = await verify({ targetDir: dir });
  assert.deepEqual(v.undeclared, ["QUA-001"]);
  assert.match(formatVerdict(v), /Contrats modifiés sans déclaration.*clôture refusée : QUA-001/);
  const ecrit = JSON.parse(readFileSync(join(dir, writeEvidence(dir, v)), "utf8"));
  assert.deepEqual(ecrit.undeclared, ["QUA-001"]);

  // Évolution : déclarée dans la fiche, validée au cadrage.
  writeFileSync(
    join(dir, fiche),
    "# Essai\n\n## Critères d'acceptation\n\n- Réutilisé — `QUA-001`\n\n## Contrats modifiés\n\n- `QUA-001` — ancien critère : « strict » — raison : assoupli (validé le 2026-10-15)\n",
  );
  v = await verify({ targetDir: dir });
  assert.deepEqual(v.undeclared, []);
  assert.doesNotMatch(formatVerdict(v), /sans déclaration/);
  assert.equal((await verify({ targetDir: dir, only: ["QUA-001"] })).undeclared, undefined, "attest ne juge pas la fiche");
});

test("critères d'acceptation : un contrat sans contrôle ni Manuel n'est pas une preuve durable ; un critère humain exige un contrat manuel", () => {
  const contrats = [
    { id: "A", status: "PASS", manual: null, checks: [{ id: "x", status: "ok" }] },
    { id: "B", status: "MANUAL", manual: null, checks: [] },
    { id: "C", status: "ATTESTED", manual: "relecture", checks: [] },
  ];
  const juge = (c) => evaluateCriteria([{ text: "t", ...c }], contrats)[0].status;
  assert.equal(juge({ link: "A", human: false }), "pass");
  assert.equal(juge({ link: "A", human: true }), "not-durable");
  assert.equal(juge({ link: "B", human: false }), "not-durable");
  assert.equal(juge({ link: "C", human: true }), "pass");
  assert.equal(juge({ link: "C", human: false }), "not-durable");
  assert.equal(juge({ link: "x", human: false }), "no-contract", "un contrôle seul ne laisse rien au registre (QUA-022)");
  assert.equal(juge({ link: "x", human: true }), "unknown-proof");
});

test("critères d'acceptation : tableau « critère → preuve → verdict » rendu pour la PR, écrit à côté de l'évidence", async () => {
  const c = (text, link, human, status, proof) => ({ text, link, human, status, proof });
  const criteres = [
    c("Un export vide est refusé", "QUA-001", false, "pass", "pass"),
    c("Total | exact", null, false, "no-proof", null),
    c("Le libellé est clair", "QUA-003", true, "not-pass", "manual"),
  ];
  assert.equal(
    criteriaTable(criteres, "fr"),
    [
      "| Critère | Preuve | Verdict |",
      "|---|---|---|",
      "| Un export vide est refusé | `QUA-001` (pass) | ✅ prouvé |",
      "| Total \\| exact | — | ❌ sans preuve |",
      "| Le libellé est clair [human] | `QUA-003` (manual) | ❌ preuve non passante |",
      "",
    ].join("\n"),
  );
  assert.match(criteriaTable(criteres, "en"), /^\| Criterion \| Proof \| Verdict \|\n/);
  assert.match(criteriaTable([], "fr"), /aucun critère d'acceptation/);
  assert.equal(
    criteriaTable([c("a\\|b", "X|Y\\Z", false, "pass", "p|q")], "en"),
    ["| Criterion | Proof | Verdict |", "|---|---|---|", "| a\\\\\\|b | `X\\|Y\\\\Z` (p\\|q) | ✅ proven |", ""].join("\n"),
  );
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  writeFileSync(join(dir, "docs/projects/essai.md"), "# Essai\n\n## Critères d'acceptation\n\n- Prouvé — `QUA-001`\n");
  writeFileSync(
    join(dir, ".drwil/state.json"),
    JSON.stringify({ version: 1, activity: "EVIDENCE", active_brief: "docs/projects/essai.md", active_request: null, since: null }),
  );
  const chemin = writeEvidence(dir, await verify({ targetDir: dir }));
  const table = readFileSync(join(dir, chemin.replace(/verify-(.+)\.json$/, "criteria-$1.md")), "utf8");
  assert.match(table, /\| Prouvé \| `QUA-001` \(pass\) \| ✅ (prouvé|proven) \|/);
});

test("verify : contrôle non applicable dans ce contexte → MANUAL, jamais PASS", async () => {
  // En mode minimal, la recherche de secrets est exclue par conception : rien n'est prouvé.
  const v = await verify({ targetDir: await projetVerify(contrat("SEC-007", "**Contrôle** : `secrets`"), { mode: "minimal" }) });
  assert.equal(v.status, "MANUAL");
  assert.equal(v.code, 1);
  assert.match(v.contracts[0].reasons.join(), /secrets : non applicable ici/);
});

test("verify : priorité déterministe du verdict global FAIL > ERROR > MANUAL > PASS", async () => {
  const ok = contrat("QUA-001", "**Contrôle** : `ok`");
  const manuel = contrat("QUA-002", "**Manuel** : relecture");
  const erreur = contrat("QUA-003", "**Contrôle** : `ci-coverage`");
  const echec = contrat("QUA-004", "**Contrôle** : `ko`");
  const cas = [
    [ok, "PASS", 0],
    [ok + manuel, "MANUAL", 1],
    [ok + manuel + erreur, "ERROR", 2],
    [ok + manuel + erreur + echec, "FAIL", 1],
  ];
  for (const [contrats, statut, code] of cas) {
    const v = await verify({ targetDir: await projetVerify(contrats) });
    assert.deepEqual([v.status, v.code], [statut, code], contrats);
  }
});

test("DRWIL-004 : verify --json, format stable, rien d'autre sur stdout, mêmes codes de sortie", async () => {
  const dir = await projetVerify(
    contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Manuel** : relecture") + contrat("QUA-003", "**Contrôle** : `ko`"),
  );
  const r = cli(dir, "verify", "--json");
  assert.equal(r.status, 1);
  const j = JSON.parse(r.stdout);
  assert.equal(j.version, 1);
  assert.equal(j.status, "fail");
  assert.equal(j.exitCode, 1);
  assert.deepEqual(j.contracts, { total: 3, passed: 1, failed: 1, manual: 1, error: 0, attested: 0 }, "ajout compatible v1 : attested");
  assert.deepEqual(
    j.results.map((k) => [k.id, k.status]),
    [
      ["QUA-001", "pass"],
      ["QUA-002", "manual"],
      ["QUA-003", "fail"],
    ],
  );
  assert.equal(j.results[2].checks[0].status, "fail");
  assert.doesNotMatch(r.stdout, /cause du rouge/, "la sortie brute des contrôles n'est pas exposée");
  const manuel = cli(await projetVerify(contrat("QUA-001", "**Manuel** : relecture")), "verify", "--json");
  assert.equal(manuel.status, 1);
  assert.equal(JSON.parse(manuel.stdout).status, "manual", "FAIL et MANUAL distincts en JSON");
  const erreur = cli(tmp(), "verify", "--json");
  assert.equal(erreur.status, 2);
  assert.equal(JSON.parse(erreur.stdout).status, "error");
});

test("caviardage des clés privées : bloc complet, clé chiffrée, temps linéaire sur une entrée piégée (ReDoS)", () => {
  // En-têtes construits à l'exécution : aucune chaîne en forme de clé dans le source (gitleaks).
  const borne = (cote, type = "") => `-----${cote} ${type}PRIVATE ${"KEY"}-----`;
  const cle = `${borne("BEGIN", "RSA ")}\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-128-CBC,AB12\n\nMIIEow\n${borne("END", "RSA ")}`;
  assert.equal(redact(`avant ${cle} après`), "avant [REDACTED] après");
  assert.equal(redact(`${cle}\n${cle}`), "[REDACTED]\n[REDACTED]");
  assert.equal(redact(`${borne("BEGIN")} sans fin`), `${borne("BEGIN")} sans fin`);
  // Quadratique avant correction : près de deux secondes pour 20 000 en-têtes sans fin de bloc.
  const piege = borne("BEGIN").repeat(20000);
  // Meilleur de trois passes : la charge de la machine allonge une passe, pas les trois ; un temps quadratique les allonge toutes.
  const durees = [1, 2, 3].map(() => {
    const debut = performance.now();
    redact(piege);
    return performance.now() - debut;
  });
  assert.ok(Math.min(...durees) < 1000, `caviardage trop lent : ${durees.map(Math.round).join(", ")} ms`);
});

test("QUA-136 : verify --evidence consigne la durée de chaque contrôle exécuté en millisecondes entières", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`"));
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "x");
  const r = cli(dir, "verify", "--json", "--evidence");
  const chemin = /évidence : (\S+)/.exec(r.stderr)?.[1];
  assert.ok(chemin, r.stderr);
  const e = JSON.parse(read(dir, chemin));
  const duree = e.evidence.find((k) => k.id === "QUA-001").checks[0];
  assert.equal(duree.status, "ok");
  assert.ok(Number.isInteger(duree.durationMs) && duree.durationMs >= 0, JSON.stringify(duree));
});

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

// QUA-140 : le verdict « ok » consigné pour `ko` est faux exprès : un contrôle rejoué rendrait FAIL, un contrôle repris rend PASS.
async function projetReprise(contrats, { verdicts = { ok: { status: "ok" }, ko: { status: "ok" } }, cfg: modifier } = {}) {
  const dir = await projetVerify(contrats);
  if (modifier) {
    const cfg = config(dir);
    modifier(cfg);
    writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  }
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "x");
  const moteur = await import(pathToFileURL(join(dir, ".githooks", "engine.mjs")).href);
  mkdirSync(join(dir, ".drwil/evidence"), { recursive: true });
  const ranAt = "2026-10-25T10:00:00.000Z";
  writeFileSync(
    join(dir, ".drwil/evidence/run-checks-verdicts.json"),
    JSON.stringify({ ranAt, fingerprint: moteur.treeFingerprint(dir), checks: verdicts }),
  );
  return dir;
}

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

test("DRWIL-013 : verify --evidence enregistre verdict, horodatage, commit et résumés caviardés", async () => {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `fuite`"));
  const cfg = config(dir);
  cfg.checks.push({
    id: "fuite",
    name: "bavard",
    run: "node -e \"console.log('password=hunter2-tres-secret'); console.log('jeton ghp_abcdefghijklmnopqrstuvwxyz0123'); process.exit(1)\"",
  });
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "x");
  const r = cli(dir, "verify", "--json", "--evidence");
  assert.equal(r.status, 1);
  JSON.parse(r.stdout);
  const chemin = /évidence : (\S+)/.exec(r.stderr)?.[1];
  assert.ok(chemin && existsSync(join(dir, chemin)), r.stderr);
  const brut = read(dir, chemin);
  const e = JSON.parse(brut);
  assert.equal(e.status, "fail");
  assert.match(e.verifiedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(e.commit, /^[0-9a-f]{40}$/);
  assert.equal(e.evidence.find((k) => k.id === "QUA-001").checks[0].summary, "ok");
  assert.match(e.evidence.find((k) => k.id === "QUA-002").checks[0].summary, /\[REDACTED\]/);
  assert.doesNotMatch(brut, /hunter2|ghp_abcdef/, "aucun secret dans l'évidence (SEC-007)");
  assert.match(read(dir, ".gitignore"), /\.drwil\/evidence\//);
});

test("DRWIL-020 : seuls les contrats bloquants décident du verdict ; avertissement et indicatif affichés", async () => {
  const avert = (id, ctl, sev) => contrat(id, `**Contrôle** : \`${ctl}\`\n**Sévérité** : ${sev}`);
  let v = await verify({
    targetDir: await projetVerify(
      contrat("QUA-001", "**Contrôle** : `ok`") +
        avert("QUA-002", "ko", "avertissement") +
        contrat("QUA-003", "**Manuel** : relecture\n**Sévérité** : indicatif"),
    ),
  });
  assert.equal(v.status, "PASS", "un avertissement en échec ne bloque pas le gate");
  assert.equal(v.code, 0);
  assert.deepEqual(
    v.contracts.map((k) => [k.status, k.severity]),
    [
      ["PASS", "blocking"],
      ["FAIL", "warning"],
      ["MANUAL", "advisory"],
    ],
  );
  assert.match(formatVerdict(v), /1 avertissement\(s\) non satisfait\(s\), 1 indicatif\(s\) non satisfait\(s\)/);
  const j = JSON.parse(cli(await projetVerify(avert("QUA-002", "ko", "avertissement")), "verify", "--json").stdout);
  assert.deepEqual(j.bySeverity.warning, { total: 1, passed: 0, notPassed: 1 });
  v = await verify({ targetDir: await projetVerify(contrat("QUA-001", "**Contrôle** : `ko`") + avert("QUA-002", "ok", "avertissement")) });
  assert.equal(v.status, "FAIL", "un bloquant en échec reste FAIL");
  v = await verify({ targetDir: await projetVerify(avert("QUA-002", "inexistant", "indicatif")) });
  assert.equal(v.status, "ERROR", "un registre mal formé reste une ERROR, même sur un contrat indicatif");
});

test("DRWIL-031 : l'exemple en 5 minutes du README est rejoué tel quel", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en", tools: "claude", ci: "github" }));
  const cfg = config(dir);
  cfg.checks = [{ id: "unit-tests", name: "unit tests", run: "node --test" }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg, null, 2));
  writeFileSync(
    join(dir, "docs/contracts.md"),
    read(dir, "docs/contracts.md") + "\n## QUA-020 — Unit tests pass\n**Rule**: every unit test passes.\n**Check**: `unit-tests`\n",
  );
  writeFileSync(
    join(dir, "sum.test.mjs"),
    'import { test } from "node:test";\nimport assert from "node:assert/strict";\ntest("sum", () => assert.equal(1 + 1, 2));\n',
  );
  let v = await verify({ targetDir: dir });
  assert.equal(v.contracts.find((k) => k.id === "QUA-020").status, "PASS", formatVerdict(v));
  assert.notEqual(v.status, "PASS", "un projet neuf garde des contrats de socle MANUAL : jamais PASS d'office");
  writeFileSync(join(dir, "sum.test.mjs"), read(dir, "sum.test.mjs").replace("1 + 1, 2", "1 + 1, 3"));
  v = await verify({ targetDir: dir });
  assert.equal(v.contracts.find((k) => k.id === "QUA-020").status, "FAIL");
  assert.equal(v.status, "FAIL");
  assert.equal(v.code, 1);
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

// Intégration agent (docs/projects/journal.md, 2026-10-10) : `verify --agent` présente le verdict
// sans recalculer de règle ; `attest` reste humain. Décision (a) : une attestation écrite à la main
// n'est pas détectée comme fausse, la frontière est la revue du changement (dossier versionné).
test("verify --agent : PASS sans action, FAIL à corriger, ERROR à résoudre, seul MANUAL demande une attestation humaine", async () => {
  let r = cli(await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`")), "verify", "--agent");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Contracts: 1 PASS · 0 ATTESTED · 0 FAIL · 0 ERROR · 0 MANUAL/);
  assert.match(r.stdout, /Verdict: GOVERNANCE: PASS \(exit 0\)/);
  assert.match(r.stdout, /Next step: Work is verified by drwil/);
  assert.doesNotMatch(r.stdout, /Human attestation required|drwil attest/, "PASS : aucune action humaine");
  r = cli(await projetVerify(contrat("QUA-001", "**Contrôle** : `ko`")), "verify", "--agent");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /GOVERNANCE: FAIL/);
  assert.match(r.stdout, /Failing contracts \(fix them\):\n {2}- QUA-001/);
  assert.match(r.stdout, /Do not claim the work is done/);
  assert.doesNotMatch(r.stdout, /Human attestation required|drwil attest/, "FAIL : l'agent corrige, pas d'attestation");
  r = cli(await projetVerify(contrat("QUA-001", "**Contrôle** : `inexistant`")), "verify", "--agent");
  assert.equal(r.status, 2, "ERROR reste ERROR");
  assert.match(r.stdout, /GOVERNANCE: VERIFY ERROR/);
  assert.match(r.stdout, /do not claim the work is verified/);
  assert.doesNotMatch(
    r.stdout,
    /Human attestation required|drwil attest/,
    "ERROR : problème de vérification à résoudre, pas d'attestation",
  );
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`\n**Manuel** : relecture"));
  r = cli(dir, "verify", "--agent");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Human attestation required\.\n {2}- QUA-001/);
  assert.match(
    r.stdout,
    /Fallback, for the human in their own interactive terminal; never run it yourself:\n {2}drwil attest <CONTRACT_ID>/,
  );
  assert.ok(!existsSync(join(dir, ".drwil/evidence")), "verify --agent n'écrit rien, n'atteste rien");
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

// Contrôle confié à la CI (`runAt: ["ci"]`, QUA-208) : verify ne le joue pas, ne le compte jamais passé et le nomme en attente.
// Par la CLI, CI vidée (envTest) : en CI, le moteur le jouerait.
async function projetConfieALaCi(rouge = false) {
  const dir = await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`") + contrat("QUA-002", "**Contrôle** : `lent`"));
  const cfg = config(dir);
  cfg.ciFiles = [".github/workflows/ia-first.yml"];
  cfg.checks = [
    { id: "ok", name: "toujours vert", run: 'node -e "process.exit(0)"' },
    { id: "lent", name: "lent", run: "node -e \"console.log('rouge en CI'); process.exit(1)\"", runAt: ["ci"] },
    ...(rouge ? [{ id: "ko", name: "toujours rouge", run: 'node -e "process.exit(1)"' }] : []),
  ];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  if (rouge) appendFileSync(join(dir, "docs/contracts.md"), `\n${contrat("QUA-003", "**Contrôle** : `ko`")}`);
  return dir;
}

test("QUA-260 : avec un contrôle confié à la CI et le reste vert, verify rend GOVERNANCE: PASS (CI pending) et nomme les contrôles en attente", async () => {
  const dir = await projetConfieALaCi();
  const humain = cli(dir, "verify");
  assert.equal(humain.status, 0, humain.stdout + humain.stderr);
  assert.match(humain.stdout, /lent : non applicable ici \(confié à la CI \(runAt \["ci"\]\) : pas joué ici, jamais compté passé/);
  assert.match(
    humain.stdout,
    /Contrôles confiés à la CI, non exécutés ici et jamais comptés passés — en attente de la CI de la PR ou MR : lent\n\nGOVERNANCE: PASS \(CI pending\)\n$/,
  );
  assert.doesNotMatch(humain.stdout, /lent : ok/, "jamais passé");
  const agent = cli(dir, "verify", "--agent");
  assert.equal(agent.status, 0, agent.stdout);
  assert.match(
    agent.stdout,
    /^Verdict: GOVERNANCE: PASS \(CI pending\) \(exit 0\)\nNote: Checks left to CI, not run here and never counted as passed — pending the PR or MR CI: lent$/m,
  );
  // Jamais « Work is verified » sous un PASS (CI pending).
  assert.doesNotMatch(agent.stdout, /Work is verified/);
  assert.match(agent.stdout, /^Next step: Work is NOT verified yet: the checks left to CI have not run here\./m);
  const json = JSON.parse(cli(dir, "verify", "--json").stdout);
  assert.deepEqual(
    [json.status, json.label, json.ciPending, json.withCiChecks],
    ["pass", "GOVERNANCE: PASS (CI pending)", ["lent"], undefined],
  );
  // La preuve écrite par --evidence le dit aussi : le verdict lui-même porte la réserve.
  const preuve = cli(dir, "verify", "--evidence");
  assert.equal(preuve.status, 0, preuve.stdout + preuve.stderr);
  const ecrite = readdirSync(join(dir, ".drwil/evidence")).filter((f) => /^verify-.*\.json$/.test(f));
  const ev = JSON.parse(readFileSync(join(dir, ".drwil/evidence", ecrite.at(-1)), "utf8"));
  assert.deepEqual([ev.status, ev.label, ev.ciPending], ["pass", "GOVERNANCE: PASS (CI pending)", ["lent"]]);
  // Le reste en échec : le verdict reste FAIL, jamais PASS (CI pending), et les contrôles en attente restent nommés.
  const rouge = cli(await projetConfieALaCi(true), "verify");
  assert.equal(rouge.status, 1);
  assert.match(rouge.stdout, /en attente de la CI de la PR ou MR : lent\n\nGOVERNANCE: FAIL\n$/);
  // Sans contrôle confié à la CI : PASS sans réserve, sans note.
  const sans = cli(await projetVerify(contrat("QUA-001", "**Contrôle** : `ok`")), "verify", "--agent");
  assert.match(sans.stdout, /^Verdict: GOVERNANCE: PASS \(exit 0\)$/m);
  assert.doesNotMatch(sans.stdout, /CI pending|left to CI/);
});

test("QUA-261 : verify --with-ci-checks joue aussi les contrôles confiés à la CI et dit que l'option est active", async () => {
  const dir = await projetConfieALaCi();
  const humain = cli(dir, "verify", "--with-ci-checks");
  assert.equal(humain.status, 1, "joué en local, son échec remonte");
  assert.match(humain.stdout, /lent : échec/);
  assert.match(humain.stdout, /rouge en CI/);
  assert.match(
    humain.stdout,
    /Option --with-ci-checks active : les contrôles confiés à la CI \(runAt \["ci"\]\) sont joués ici, en local\n\nGOVERNANCE: FAIL\n$/,
  );
  assert.doesNotMatch(humain.stdout, /CI pending|en attente de la CI/);
  const agent = cli(dir, "verify", "--agent", "--with-ci-checks");
  assert.match(agent.stdout, /^Note: Option --with-ci-checks active: the checks left to CI \(runAt \["ci"\]\) are played here, locally$/m);
  const json = JSON.parse(cli(dir, "verify", "--json", "--with-ci-checks").stdout);
  assert.deepEqual([json.status, json.ciPending, json.withCiChecks], ["fail", [], true]);
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
