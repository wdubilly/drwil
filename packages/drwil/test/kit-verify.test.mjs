// Tests du kit, thème verify : verdicts de drwil verify, critères d'acceptation, sortie JSON et preuve.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { init, verify, formatVerdict, verdictJson } from "../dist/index.js";
import { criteriaTable, evaluateCriteria, redact, writeEvidence } from "../dist/verify.js";
import { judgeDurable } from "../dist/closure.js";
import { tmp, quiet, envTest, git, read, config, projetVerify, contrat, cli, projetReprise } from "./kit-commun.mjs";

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
