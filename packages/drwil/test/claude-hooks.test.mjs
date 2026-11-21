// Hooks Claude livrés (gabarit `.claude/hooks/`) : un test du chemin principal de chacun, mesurés par
// `npm run test:claude:coverage` (QUA-004). Les copies installées sont les mêmes fichiers (scopeMirrors).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { cli, contrat, projetVerify } from "./kit-commun.mjs";
// Import statique : un `await` au niveau du module laisserait la racine temporaire de kit-commun se fermer trop tôt.
import { claudeEvent, copilotArgs, copilotPollHook } from "../templates/common/tools/claude/.claude/hooks/copilot-polls.mjs";

const HOOKS = fileURLToPath(new URL("../templates/common/tools/claude/.claude/hooks/", import.meta.url));
const GITHOOKS = fileURLToPath(new URL("../../../.githooks/", import.meta.url));
const load = (name) => import(pathToFileURL(join(HOOKS, name)).href);

async function projetAttestation(lang = "fr") {
  const { init, prepareAttestationPoll, verify } = await import("../dist/index.js");
  const dir = projet();
  const log = console.log;
  const warn = console.warn;
  try {
    console.log = console.warn = () => {};
    await init({ targetDir: dir, lang, git: false });
  } finally {
    console.log = log;
    console.warn = warn;
  }
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src/objet.js"), "export const valeur = 1;\n");
  writeFileSync(
    join(dir, "docs/contracts.md"),
    `${readFileSync(join(dir, "docs/contracts.md"), "utf8")}\n## APP-009 — Jugement fictif\n**Règle** : règle fictive.\n**Manuel** : lisibilité fictive.\n**Couvre** : \`src/**\`\n`,
  );
  const { attestationHook } = await load("prompt-hook.mjs");
  const output = [];
  const hook = (input) => attestationHook(input, { root: dir, tell: (text) => output.push(text) });
  const prepare = async (extra = {}) => {
    const r = await prepareAttestationPoll({ targetDir: dir, id: "APP-009", tried: "Essai fictif du sondage.", ...extra });
    assert.equal(r.code, 0, r.message);
    return {
      hook_event_name: "PreToolUse",
      tool_name: "AskUserQuestion",
      session_id: "session-fictive",
      tool_use_id: "appel-fictif",
      tool_input: r.poll,
    };
  };
  // Forme réelle du PostToolUse (Claude Code 2.1, refus du 2026-11-05) : le composant de permission
  // ajoute `answers` et `annotations` à tool_input après l'affichage ; tool_response les répète.
  const post = (input, label = input.tool_input.questions[0].options[0].label) => {
    const answers = { [input.tool_input.questions[0].question]: label };
    return {
      ...input,
      hook_event_name: "PostToolUse",
      tool_input: { ...input.tool_input, answers: { ...answers }, annotations: {} },
      tool_response: { questions: input.tool_input.questions, answers, annotations: {} },
    };
  };
  const contract = async () => (await verify({ targetDir: dir, only: ["APP-009"] })).contracts[0];
  return { dir, hook, prepare, post, contract, output };
}

test("QUA-235 : seul le retour du sondage humain attesté, corrélé et consommé une fois écrit une preuve liée à sa couverture", async () => {
  const { dir, hook, prepare, post, contract, output } = await projetAttestation();
  try {
    const input = await prepare();
    assert.equal(await hook(input), 0);
    assert.equal((await contract()).status, "MANUAL");
    assert.equal(await hook(post(input)), 0);
    let k = await contract();
    assert.equal(k.status, "ATTESTED");
    assert.equal(k.attestation.version, 4);
    assert.equal(k.attestation.note, "Essai fictif du sondage.");
    assert.equal(k.attestation.origin.source, "claude-poll");
    assert.equal(k.attestation.origin.sessionId, "session-fictive");
    assert.equal(k.attestation.origin.toolUseId, "appel-fictif");
    assert.ok(Date.parse(k.attestation.origin.askedAt));
    const first = k.attestation.attestedAt;
    await hook(post(input));
    assert.equal((await contract()).attestation.attestedAt, first, "rejeu sans préparation refusé");
    const renewal = await prepare({ renew: true });
    assert.equal(await hook(renewal), 0);
    await hook(post(renewal));
    assert.equal((await contract()).status, "ATTESTED");
    writeFileSync(join(dir, "hors.txt"), "sans effet");
    assert.equal((await contract()).status, "ATTESTED");
    writeFileSync(join(dir, "src/objet.js"), "export const valeur = 2;\n");
    k = await contract();
    assert.equal(k.status, "MANUAL");
    assert.match(k.reasons.join(" "), /src\/objet\.js/);
    assert.match(output.join("\n"), /APP-009 attesté/);
    const copied = join(dir, ".claude/hooks");
    for (const name of [
      "prompt-hook.mjs",
      "start-poll.mjs",
      "queue-poll.mjs",
      "attest-poll.mjs",
      "attest-batch.mjs",
      "portable-attest.mjs",
      "attest-adapters.mjs",
    ])
      copyFileSync(join(HOOKS, name), join(copied, name));
    mkdirSync(join(dir, "node_modules"), { recursive: true });
    symlinkSync(fileURLToPath(new URL("..", import.meta.url)), join(dir, "node_modules/drwil"), "dir");
    const cliInput = await prepare();
    const invoke = (event) =>
      spawnSync(process.execPath, [join(copied, "prompt-hook.mjs")], { input: JSON.stringify(event), encoding: "utf8" });
    assert.equal(invoke(cliInput).status, 0);
    assert.match(invoke(post(cliInput)).stdout, /APP-009 attesté/);
    assert.equal((await contract()).status, "ATTESTED");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("QUA-235 : le hook refuse réponse agent, défaut, recommandation, faux outil, refus humain et preuve changée", async () => {
  const { dir, hook, prepare, post, contract, output } = await projetAttestation();
  try {
    const base = await prepare();
    const changes = [
      (x) => {
        x.tool_input.answers = { [x.tool_input.questions[0].question]: "Attester" };
      },
      (x) => {
        x.tool_input.annotations = {};
      },
      (x) => {
        x.tool_input.questions[0].default = "Attester";
      },
      (x) => {
        x.tool_input.questions[0].options[0].label += " (Recommended)";
      },
      (x) => {
        x.tool_input.questions[0].options[0].description += " (recommandé)";
      },
      (x) => {
        x.tool_input.questions[0].multiSelect = true;
      },
      (x) => {
        x.tool_input.questions[0].question = x.tool_input.questions[0].question.replace("lisibilité fictive", "faux critère");
      },
      (x) => {
        x.tool_name = "Bash";
      },
      (x) => {
        delete x.session_id;
      },
      (x) => {
        delete x.tool_use_id;
      },
      (x) => {
        x.tool_input.questions.push({ header: "autre" });
      },
      (x) => {
        x.tool_input.questions[0].options.reverse();
      },
    ];
    for (const change of changes) {
      const input = structuredClone(base);
      change(input);
      assert.equal(await hook(input), 2);
      await hook(post(input));
      assert.equal((await contract()).status, "MANUAL");
    }
    for (const change of [
      (x) => {
        x.tool_response.answers = {};
      },
      (x) => {
        x.tool_response.answers[x.tool_input.questions[0].question] = "Refuser";
      },
      (x) => {
        x.tool_response = {};
        x.tool_result = { text_result_for_llm: "User responded: Attester" };
      },
      (x) => {
        x.session_id = "autre-session";
      },
      (x) => {
        x.tool_use_id = "autre-appel";
      },
      (x) => {
        x.tool_input.questions[0].question += "modifié";
      },
      (x) => {
        x.tool_input.metadata = { source: "agent" };
      },
      (x) => {
        x.tool_input.response = "Attester";
      },
      (x) => {
        delete x.tool_response.answers;
      },
    ]) {
      assert.equal(await hook(base), 0);
      const response = post(base);
      change(response);
      await hook(response);
      assert.equal((await contract()).status, "MANUAL");
    }
    assert.equal(await hook(base), 0);
    writeFileSync(join(dir, "src/objet.js"), "export const valeur = 3;\n");
    await hook(post(base));
    assert.equal((await contract()).status, "MANUAL", "empreinte couverte changée pendant la question");
    assert.equal(await hook(post(base)), 0);
    const fresh = await prepare();
    assert.equal(await hook(fresh), 0);
    const pendingFile = join(dir, ".drwil/evidence/attest-polls", readdirSync(join(dir, ".drwil/evidence/attest-polls"))[0]);
    const pending = JSON.parse(readFileSync(pendingFile, "utf8"));
    for (const askedAt of ["date invalide", "2000-01-01T00:00:00Z", "2099-01-01T00:00:00Z"]) {
      writeFileSync(pendingFile, JSON.stringify({ ...pending, askedAt }));
      await hook(post(fresh));
      assert.equal((await contract()).status, "MANUAL", "préparation expirée ou date invalide");
    }
    assert.equal(await hook(fresh), 0);
    const registry = join(dir, "docs/contracts.md");
    writeFileSync(registry, readFileSync(registry, "utf8").replace("règle fictive.", "règle modifiée."));
    await hook(post(fresh));
    assert.equal((await contract()).status, "MANUAL", "contrat changé pendant le sondage");
    assert.equal(await hook({ ...base, hook_event_name: "Autre" }), 0);
    assert.equal(await hook({}), null);
    const parse = (await load("attest-poll.mjs")).attestationPoll;
    assert.equal(parse({ tool_input: { questions: [{ header: "drwil-attest" }] } }).valid, false);
    assert.ok(output.some((text) => /aucune attestation/.test(text)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const en = await projetAttestation("en");
  try {
    const input = await en.prepare();
    assert.equal(await en.hook(input), 0);
    await en.hook(en.post(input, "Decline"));
    assert.match(en.output.join("\n"), /no attestation recorded/);
    assert.equal((await en.contract()).status, "MANUAL");
  } finally {
    rmSync(en.dir, { recursive: true, force: true });
  }
});

test("QUA-235 : attestation par lot — un sondage à choix multiple, une attestation par ID coché, avec sa propre empreinte", async () => {
  const { dir, hook, output } = await projetAttestation();
  const { prepareAttestationPoll, verify } = await import("../dist/index.js");
  const registry = join(dir, "docs/contracts.md");
  let text = readFileSync(registry, "utf8");
  for (const [id, where] of [
    ["APP-010", "lib"],
    ["APP-011", "outil"],
    ["APP-012", "page"],
  ]) {
    mkdirSync(join(dir, where), { recursive: true });
    writeFileSync(join(dir, where, "objet.js"), "export const valeur = 1;\n");
    text += `\n## ${id} — Jugement ${where}\n**Règle** : règle ${where}.\n**Manuel** : lisibilité ${where}.\n**Couvre** : \`${where}/**\`\n`;
  }
  writeFileSync(registry, text);
  const statusOf = async (id) => (await verify({ targetDir: dir, only: [id] })).contracts[0];
  const ask = async (ids, call) => {
    const r = await prepareAttestationPoll({ targetDir: dir, ids, tried: "Essai fictif par lot." });
    assert.equal(r.code, 0, r.message);
    const input = {
      hook_event_name: "PreToolUse",
      tool_name: "AskUserQuestion",
      session_id: "session-lot",
      tool_use_id: call,
      tool_input: r.poll,
    };
    assert.equal(await hook(input), 0);
    return input;
  };
  const answer = (input, label) => {
    const answers = { [input.tool_input.questions[0].question]: label };
    return {
      ...input,
      hook_event_name: "PostToolUse",
      tool_input: { ...input.tool_input, answers, annotations: {} },
      tool_response: { answers },
    };
  };
  const said = () => output.splice(0).join("\n");
  try {
    const q = (await ask(["APP-009", "APP-010"], "appel-forme")).tool_input.questions[0];
    assert.equal(q.multiSelect, true);
    assert.deepEqual(
      q.options.map((o) => o.label),
      ["APP-009", "APP-010"],
    );
    assert.match(q.options[1].description, /^Jugement lib — Essai de l'agent : Essai fictif par lot\.$/);
    assert.match(
      q.question,
      /^drwil-attest APP-009 APP-010\n[\s\S]*lisibilité fictive[\s\S]*lisibilité lib[\s\S]*non coché n'est pas attesté/,
    );

    await hook(answer(await ask(["APP-009", "APP-010"], "appel-rien"), ""));
    assert.match(said(), /refus choisi par l'humain \(« aucun contrat coché »\)/);
    await hook(answer(await ask(["APP-009", "APP-010"], "appel-autre"), "APP-009, Autre chose"));
    assert.match(said(), /réponse illisible \(« Autre chose » ∉ options\)/);
    await hook(answer(await ask(["APP-009", "APP-010"], "appel-nombre"), 42));
    assert.match(said(), /réponse illisible \(« 42 » ∉ options\)/);
    for (const id of ["APP-009", "APP-010"]) assert.equal((await statusOf(id)).status, "MANUAL", "rien coché ou illisible : rien attesté");

    const changed = await ask(["APP-009", "APP-010"], "appel-preuve");
    writeFileSync(join(dir, "lib/objet.js"), "export const valeur = 2;\n");
    await hook(answer(changed, "APP-010, APP-009"));
    assert.equal((await statusOf("APP-009")).status, "ATTESTED", "la preuve changée d'un autre ID ne le refuse pas");
    assert.equal((await statusOf("APP-010")).status, "MANUAL");
    assert.match(said(), /✓ APP-009 attesté[\s\S]*✗ APP-010 : preuve ou couverture changée.*relancer `drwil attest-poll APP-010/);

    await hook(answer(await ask(["APP-010", "APP-011"], "appel-partie"), "APP-011"));
    assert.equal((await statusOf("APP-010")).status, "MANUAL", "non coché : non attesté");
    assert.equal((await statusOf("APP-011")).status, "ATTESTED");
    assert.match(said(), /APP-010 non coché : non attesté[\s\S]*✓ APP-011 attesté/);

    await hook(answer(await ask(["APP-010", "APP-012"], "appel-tout"), "APP-012, APP-010"));
    const [k10, k12] = [await statusOf("APP-010"), await statusOf("APP-012")];
    assert.equal(k10.status, "ATTESTED");
    assert.equal(k12.status, "ATTESTED");
    assert.notEqual(k10.attestation.fingerprint, k12.attestation.fingerprint, "chaque ID a sa propre empreinte");
    assert.equal(k10.attestation.origin.toolUseId, "appel-tout");
    assert.match(said(), /✓ APP-010 attesté[\s\S]*✓ APP-012 attesté/, "dans l'ordre du sondage, pas des clics");

    const five = await prepareAttestationPoll({ targetDir: dir, ids: ["APP-009", "APP-010", "APP-011", "APP-012", "APP-013"], tried: "x" });
    assert.equal(five.code, 2);
    assert.match(five.message, /de 1 à 4 contrats/);
    assert.equal((await prepareAttestationPoll({ targetDir: dir, tried: "x" })).code, 2, "aucun ID");
    const done = await prepareAttestationPoll({ targetDir: dir, ids: ["APP-009", "APP-010"], tried: "x" });
    assert.equal(done.code, 1);
    assert.match(done.message, /^APP-009 : APP-009 a déjà une attestation valide/);

    writeFileSync(join(dir, "lib/objet.js"), "export const valeur = 3;\n");
    writeFileSync(join(dir, "outil/objet.js"), "export const valeur = 3;\n");
    const r = await prepareAttestationPoll({ targetDir: dir, ids: ["APP-010", "APP-011"], tried: "Essai fictif par lot." });
    const altered = { hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", session_id: "s", tool_use_id: "a", tool_input: r.poll };
    altered.tool_input.questions[0].options.pop();
    assert.equal(await hook(altered), 2, "une option retirée : sondage différent de la préparation");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const en = await projetAttestation("en");
  try {
    const registry = join(en.dir, "docs/contracts.md");
    mkdirSync(join(en.dir, "lib"), { recursive: true });
    writeFileSync(join(en.dir, "lib/objet.js"), "export const valeur = 1;\n");
    writeFileSync(
      registry,
      `${readFileSync(registry, "utf8")}\n## APP-010 — Lib\n**Règle** : lib.\n**Manuel** : lib.\n**Couvre** : \`lib/**\`\n`,
    );
    const r = await prepareAttestationPoll({ targetDir: en.dir, ids: ["APP-009", "APP-010"], tried: "Trial." });
    assert.equal(r.code, 0, r.message);
    const input = { hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", session_id: "s", tool_use_id: "en", tool_input: r.poll };
    assert.equal(await en.hook(input), 0);
    const answers = { [r.poll.questions[0].question]: "APP-009" };
    await en.hook({ ...input, hook_event_name: "PostToolUse", tool_response: { answers } });
    assert.match(en.output.join("\n"), /APP-009 attested[\s\S]*APP-010 not ticked: not attested/);
  } finally {
    rmSync(en.dir, { recursive: true, force: true });
  }
});

test("QUA-235 : `drwil attest` à plusieurs ID pose la question contrat par contrat, un refus n'empêche pas les suivants", async () => {
  const { attestEach } = await import("../dist/cli-attest.js");
  const asked = [];
  const printed = [];
  const one = async (id) => {
    asked.push(id);
    if (id === "QUA-002") return { code: 1, message: "attestation refusée : rien n'a été enregistré" };
    if (id === "QUA-003") throw new Error("panne fictive");
    return { code: 0, message: `${id} attesté`, file: `.drwil/evidence/attestations/${id}.json` };
  };
  const code = await attestEach(["QUA-001", "QUA-002", "QUA-003", "QUA-004", "QUA-001"], one, (l) => printed.push(l));
  assert.deepEqual(asked, ["QUA-001", "QUA-002", "QUA-003", "QUA-004"], "chaque ID une fois, dans l'ordre donné");
  assert.equal(code, 2, "le pire des codes");
  assert.match(printed[0], /^✓ QUA-001 attesté/);
  assert.match(printed[1], /^✗ attestation refusée/);
  assert.match(printed[2], /^✗ QUA-003 : panne fictive/);
  assert.match(printed[3], /^✓ QUA-004 attesté/);
  assert.equal(await attestEach(["QUA-001"], one, () => {}), 0);

  const dir = await projetVerify(
    contrat("QUA-001", "**Contrôle** : `ok`\n**Manuel** : relecture des fiches") +
      contrat("QUA-002", "**Contrôle** : `ok`\n**Manuel** : relecture du guide"),
  );
  const drwil = (...args) => cli(dir, ...args);
  const sansTerminal = drwil("attest", "QUA-001", "QUA-002");
  assert.equal(sansTerminal.status, 1);
  assert.match(sansTerminal.stderr, /ne peut pas attester QUA-001 QUA-002/);
  const portable = drwil("attest-poll", "QUA-001", "QUA-002", "--tried", "essai", "--tool", "copilot");
  assert.equal(portable.status, 2, "le choix multiple n'est lu que sous Claude Code");
  const lot = drwil("attest-poll", "QUA-001", "QUA-002", "--tried", "essai");
  assert.equal(lot.status, 0, lot.stderr);
  const q = JSON.parse(lot.stdout).questions[0];
  assert.equal(q.multiSelect, true);
  assert.deepEqual(
    q.options.map((o) => o.label),
    ["QUA-001", "QUA-002"],
  );
  assert.equal(existsSync(join(dir, ".drwil/evidence/attestations")), false, "préparer n'atteste rien");
});

test("QUA-235 : chaque refus nomme sa cause et ce qu'il faut refaire, et garde sa charge pour la rejouer", async () => {
  const { dir, hook, prepare, post, contract, output } = await projetAttestation();
  const errors = [];
  const error = console.error;
  console.error = (text) => errors.push(String(text));
  const last = () => {
    const said = [...errors, ...output].at(-1) ?? "";
    errors.length = output.length = 0;
    return said;
  };
  const kept = join(dir, ".drwil/evidence/attest-poll-refused.json");
  try {
    const base = await prepare();
    const form = /sondage d'attestation refusé — .* ; aucune attestation enregistrée\. relancer `drwil attest-poll APP-009/;
    for (const [change, cause] of [
      [(x) => (x.tool_input.metadata = { source: "agent" }), /champ inattendu \(tool_input\.metadata\)/],
      [(x) => (x.tool_input.questions[0].default = "Attester"), /champ inattendu \(questions\[0\]\.default\)/],
      [(x) => x.tool_input.questions.push({ header: "autre" }), /plusieurs questions \(2\)/],
      [
        (x) => (x.tool_input.questions[0].options[0].label += " (Recommended)"),
        /recommandation dans l'option « Attester \(Recommended\) »/,
      ],
      [
        (x) => (x.tool_input.questions[0].question = x.tool_input.questions[0].question.replace("lisibilité fictive", "faux critère")),
        /résumé différent de la préparation — première ligne qui diffère : .*faux critère/,
      ],
      [(x) => (x.tool_name = "Bash"), /appel non corrélable/],
    ]) {
      const input = structuredClone(base);
      change(input);
      assert.equal(await hook(input), 2);
      const said = last();
      assert.match(said, cause);
      assert.match(said, form);
      // La charge gardée se rejoue telle quelle et redonne la même cause, sans chemin local.
      const trace = JSON.parse(readFileSync(kept, "utf8"));
      assert.ok(trace.cause && !("cwd" in trace.input) && !("transcript_path" in trace.input));
      assert.equal(await hook(trace.input), 2);
      assert.match(last(), cause);
    }
    await hook(post(base));
    assert.match(last(), /préparation absente/);
    for (const [change, cause] of [
      [(x) => (x.tool_response.answers = {}), /réponse illisible/],
      [(x) => (x.tool_response.answers[x.tool_input.questions[0].question] = "Autre chose"), /réponse illisible/],
    ]) {
      assert.equal(await hook(base), 0);
      const response = post(base);
      change(response);
      await hook(response);
      assert.match(last(), cause);
    }
    assert.equal(await hook(base), 0);
    await hook(post(base, "Refuser"));
    const human = last();
    assert.match(human, /refus choisi par l'humain \(« Refuser »\)/);
    assert.doesNotMatch(human, /sondage d'attestation refusé/, "le refus humain n'est pas un refus de forme");
    assert.equal(await hook(base), 0);
    const pendingFile = join(dir, ".drwil/evidence/attest-polls", readdirSync(join(dir, ".drwil/evidence/attest-polls"))[0]);
    writeFileSync(pendingFile, JSON.stringify({ ...JSON.parse(readFileSync(pendingFile, "utf8")), askedAt: "2000-01-01T00:00:00Z" }));
    await hook(post(base));
    assert.match(last(), /préparation expirée/);
    assert.equal(await hook(base), 0);
    writeFileSync(join(dir, "src/objet.js"), "export const valeur = 4;\n");
    await hook(post(base));
    assert.match(last(), /preuve ou couverture changée/);
    assert.equal((await contract()).status, "MANUAL");
  } finally {
    console.error = error;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("QUA-235 : un résumé qui cite « (recommandé) » est accepté ; une charge PostToolUse réelle se rejoue", async () => {
  const { dir, hook, prepare, contract, output } = await projetAttestation();
  try {
    const registry = join(dir, "docs/contracts.md");
    writeFileSync(registry, readFileSync(registry, "utf8").replace("règle fictive.", "règle fictive, réglage (recommandé)."));
    const input = await prepare();
    assert.match(input.tool_input.questions[0].question, /\(recommandé\)/);
    assert.equal(await hook(input), 0);
    const question = input.tool_input.questions[0];
    // Forme relevée sur Claude Code 2.1 : chemins de session, mode de permission, réponses répétées dans tool_input.
    const real = {
      session_id: "session-fictive",
      transcript_path: "/home/fictif/.claude/projects/projet/session-fictive.jsonl",
      cwd: dir,
      permission_mode: "default",
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: { questions: [question], answers: { [question.question]: "Attester" }, annotations: {} },
      tool_response: { questions: [question], answers: { [question.question]: "Attester" }, annotations: {} },
      tool_use_id: "appel-fictif",
    };
    assert.equal(await hook(JSON.parse(JSON.stringify(real))), 0);
    assert.match(output.join("\n"), /APP-009 attesté/);
    assert.equal((await contract()).status, "ATTESTED");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("QUA-235 : les entrées AskUserQuestion du hook déclarent un délai pour la relance de verify", () => {
  for (const file of [join(HOOKS, "../settings.json"), fileURLToPath(new URL("../../../.claude/settings.json", import.meta.url))]) {
    const settings = JSON.parse(readFileSync(file, "utf8").replace("{{stackAllowJson}}", ""));
    for (const event of ["PreToolUse", "PostToolUse"]) {
      const entry = settings.hooks[event].find((h) => h.matcher === "AskUserQuestion");
      for (const h of entry.hooks) assert.ok(h.timeout >= 300, `${file} ${event} : timeout ${h.timeout}`);
    }
  }
});

test("QUA-235 : un contrôle devenu rouge pendant la réponse ne peut pas être attesté", async () => {
  const { dir, hook, prepare, post, contract, output } = await projetAttestation();
  try {
    const registry = join(dir, "docs/contracts.md");
    writeFileSync(registry, `${readFileSync(registry, "utf8")}\n**Contrôle** : \`essai\`\n`);
    const config = join(dir, ".drwil/ia-first.json");
    const cfg = JSON.parse(readFileSync(config, "utf8"));
    const setCheck = (run) => writeFileSync(config, JSON.stringify({ ...cfg, checks: [{ id: "essai", run }] }));
    setCheck('node -e "process.exit(0)"');
    const input = await prepare();
    assert.equal(await hook(input), 0);
    setCheck('node -e "process.exit(1)"');
    await hook(post(input));
    assert.equal((await contract()).status, "FAIL");
    assert.match(output.join("\n"), /n'est pas attestable/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const BASE_GITHOOKS = fileURLToPath(new URL("../templates/common/base/.githooks/", import.meta.url));
const FICHE_ACCEPT = "docs/projects/exemple.md";
const CRITERES_ACCEPT = "# Projet : Exemple\n\n## Critères d'acceptation\n\n- Un export vide est refusé — contrat à créer\n";

/** Projet en BUILD sur une fiche à critères, avec les hooks git du gabarit : le hook du sondage drwil-accept s'y joue. */
async function projetAcceptation(lang = "fr") {
  const etat = { version: 1, activity: "BUILD", active_brief: FICHE_ACCEPT, active_request: null, since: "2026-11-18T10:00:00Z" };
  const dir = projet({ lang }, { [FICHE_ACCEPT]: CRITERES_ACCEPT, ".drwil/state.json": JSON.stringify(etat) });
  cpSync(BASE_GITHOOKS, join(dir, ".githooks"), { recursive: true });
  const { acceptanceHook } = await load("prompt-hook.mjs");
  const { acceptancePoll } = await import(pathToFileURL(join(dir, ".githooks/state-acceptance.mjs")).href);
  const output = [];
  const hook = (input) => acceptanceHook(input, { root: dir, tell: (text) => output.push(text) });
  const prepare = () => ({
    hook_event_name: "PreToolUse",
    tool_name: "AskUserQuestion",
    session_id: "session-fictive",
    tool_use_id: "appel-fictif",
    tool_input: acceptancePoll(dir).poll,
  });
  const post = (input, label = input.tool_input.questions[0].options[0].label) => {
    const answers = { [input.tool_input.questions[0].question]: label };
    return {
      ...input,
      hook_event_name: "PostToolUse",
      tool_input: { ...input.tool_input, answers: { ...answers }, annotations: {} },
      tool_response: { questions: input.tool_input.questions, answers, annotations: {} },
    };
  };
  const accepted = () => {
    try {
      return JSON.parse(readFileSync(join(dir, ".drwil/evidence/acceptance.json"), "utf8"))[FICHE_ACCEPT] ?? null;
    } catch {
      return null;
    }
  };
  return { dir, hook, prepare, post, accepted, output };
}

test("QUA-235 : sondage drwil-accept (QUA-175) — seule la réponse de l'humain au sondage préparé enregistre l'acceptation, une fois", async () => {
  const { dir, hook, prepare, post, accepted, output } = await projetAcceptation();
  try {
    const input = prepare();
    assert.match(input.tool_input.questions[0].question, /^drwil-accept docs\/projects\/exemple\.md\n/);
    assert.equal(await hook(input), 0);
    assert.equal(accepted(), null, "la question posée n'enregistre rien");
    assert.equal(await hook(post(input)), 0);
    assert.match(output.at(-1), /^✓ critères de docs\/projects\/exemple\.md acceptés \(empreinte sha256:[0-9a-f]{16}\)$/);
    const first = accepted();
    assert.match(first.fingerprint, /^sha256:/);
    await hook(post(input));
    assert.match(output.at(-1), /préparation absente/, "rejeu sans préparation refusé");
    assert.deepEqual(accepted(), first);
    assert.equal(await hook({ ...input, hook_event_name: "Autre" }), 0);
    assert.equal(await hook({}), null, "un autre sondage n'est pas le sien");
    assert.equal(await hook({ tool_input: { questions: [{ header: "drwil-attest" }] } }), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("QUA-235 : sondage drwil-accept (QUA-175) — refusé, cause dite, comme celui de l'attestation ; refus humain et critères changés", async () => {
  const { dir, hook, prepare, post, accepted, output } = await projetAcceptation();
  const errors = [];
  const error = console.error;
  console.error = (text) => errors.push(String(text));
  const last = () => {
    const said = [...errors, ...output].at(-1) ?? "";
    errors.length = output.length = 0;
    return said;
  };
  try {
    const base = prepare();
    const form = /sondage d'acceptation refusé — .* ; aucune acceptation enregistrée\. relancer `node \.githooks\/state\.mjs poll accept`/;
    for (const [change, cause] of [
      [(x) => (x.tool_input.metadata = { source: "agent" }), /champ inattendu \(tool_input\.metadata\)/],
      [(x) => (x.tool_input.answers = { [x.tool_input.questions[0].question]: "Accepter" }), /champ inattendu \(tool_input\.answers\)/],
      [(x) => (x.tool_input.questions[0].default = "Accepter"), /champ inattendu \(questions\[0\]\.default\)/],
      [(x) => x.tool_input.questions.push({ header: "autre" }), /plusieurs questions \(2\)/],
      [
        (x) => (x.tool_input.questions[0].options[0].label += " (Recommended)"),
        /recommandation dans l'option « Accepter \(Recommended\) »/,
      ],
      [(x) => (x.tool_input.questions[0].options[1].description += " (recommandé)"), /recommandation dans l'option « Ne pas accepter »/],
      [
        (x) => (x.tool_input.questions[0].question = x.tool_input.questions[0].question.replace("vide", "plein")),
        /résumé différent .*plein/,
      ],
      [(x) => (x.tool_input.questions[0].question = "drwil-accept"), /résumé différent .*drwil-accept/],
      [(x) => (x.tool_input.questions[0].multiSelect = true), /résumé différent .*multiSelect/],
      [(x) => (x.tool_name = "Bash"), /appel non corrélable/],
      [(x) => delete x.session_id, /appel non corrélable/],
    ]) {
      const input = structuredClone(base);
      change(input);
      assert.equal(await hook(input), 2);
      const said = last();
      assert.match(said, cause);
      assert.match(said, form);
      await hook(post(input));
      last();
      assert.equal(accepted(), null);
    }
    const kept = JSON.parse(readFileSync(join(dir, ".drwil/evidence/accept-poll-refused.json"), "utf8"));
    assert.equal(kept.cause, "appel", "la dernière charge refusée est gardée");
    await hook(post(base));
    assert.match(last(), /préparation absente/);
    for (const [change, cause] of [
      [(x) => (x.tool_response.answers = {}), /réponse illisible/],
      [(x) => delete x.tool_response, /réponse illisible/],
      [(x) => (x.tool_response.answers[x.tool_input.questions[0].question] = "Oui"), /réponse illisible \(« Oui » ∉ options\)/],
      [(x) => (x.session_id = "autre-session"), /préparation absente/],
      [(x) => (x.tool_input.questions[0].question += "\nmodifié"), /résumé différent/],
    ]) {
      assert.equal(await hook(base), 0);
      const response = structuredClone(post(base));
      change(response);
      await hook(response);
      assert.match(last(), cause);
      assert.equal(accepted(), null);
    }
    assert.equal(await hook(base), 0);
    await hook(post(base, "Ne pas accepter"));
    const human = last();
    assert.match(human, /refus choisi par l'humain \(« Ne pas accepter »\) : aucune acceptation enregistrée/);
    assert.doesNotMatch(human, /sondage d'acceptation refusé/, "le refus humain n'est pas un refus de forme");
    assert.equal(await hook(base), 0);
    const pendingFile = join(dir, ".drwil/evidence/accept-polls", readdirSync(join(dir, ".drwil/evidence/accept-polls"))[0]);
    writeFileSync(pendingFile, JSON.stringify({ ...JSON.parse(readFileSync(pendingFile, "utf8")), askedAt: "2000-01-01T00:00:00Z" }));
    await hook(post(base));
    assert.match(last(), /préparation expirée/);
    // Critères changés pendant la question : le sondage posé n'est plus celui de la fiche.
    assert.equal(await hook(base), 0);
    writeFileSync(join(dir, FICHE_ACCEPT), CRITERES_ACCEPT.replace("vide", "plein"));
    await hook(post(base));
    assert.match(last(), /critères ou chantier actif changés pendant la question/);
    assert.equal(accepted(), null);
    // Sans chantier actif, la préparation refaite échoue : son message est dit tel quel.
    rmSync(join(dir, ".drwil/state.json"));
    assert.equal(await hook(base), 2);
    assert.match(last(), /sondage d'acceptation refusé — acceptation impossible : aucun chantier actif/);
    assert.equal(accepted(), null);
  } finally {
    console.error = error;
    rmSync(dir, { recursive: true, force: true });
  }
  const en = await projetAcceptation("en");
  try {
    const input = en.prepare();
    assert.deepEqual(
      input.tool_input.questions[0].options.map((o) => o.label),
      ["Accept", "Do not accept"],
    );
    assert.equal(await en.hook(input), 0);
    await en.hook(en.post(input, "Do not accept"));
    assert.match(en.output.join("\n"), /refusal chosen by the human \(« Do not accept »\): no acceptance recorded/);
    assert.equal(en.accepted(), null);
    assert.equal(await en.hook(input), 0);
    await en.hook(en.post(input));
    assert.match(en.output.at(-1), /^✓ criteria of docs\/projects\/exemple\.md accepted/);
  } finally {
    rmSync(en.dir, { recursive: true, force: true });
  }
});

/**
 * Projet aux hooks git du gabarit où se joue le hook d'un sondage préparé de l'état (drwil-move, drwil-detour, QUA-117) :
 * `preparer(githook, dir)` rend le sondage préparé par le moteur, `hookName` le hook exporté par prompt-hook.mjs.
 */
async function projetSondage({ lang = "fr", etat, hookName, preparer }) {
  const fichiers = { [FICHE_ACCEPT]: CRITERES_ACCEPT, ...(etat ? { ".drwil/state.json": JSON.stringify(etat) } : {}) };
  const dir = projet({ lang }, fichiers);
  cpSync(BASE_GITHOOKS, join(dir, ".githooks"), { recursive: true });
  const hooks = await load("prompt-hook.mjs");
  const githook = (name) => import(pathToFileURL(join(dir, ".githooks", name)).href);
  const poll = await preparer(githook, dir);
  const output = [];
  const errors = [];
  const hook = (input) => hooks[hookName](input, { root: dir, tell: (text) => output.push(text) });
  const prepare = () => ({
    hook_event_name: "PreToolUse",
    tool_name: "AskUserQuestion",
    session_id: "session-fictive",
    tool_use_id: "appel-fictif",
    tool_input: structuredClone(poll),
  });
  const post = (input, label = input.tool_input.questions[0].options[0].label) => {
    const answers = { [input.tool_input.questions[0].question]: label };
    return {
      ...input,
      hook_event_name: "PostToolUse",
      tool_input: { ...input.tool_input, answers: { ...answers }, annotations: {} },
      tool_response: { questions: input.tool_input.questions, answers, annotations: {} },
    };
  };
  const state = () => {
    try {
      return JSON.parse(readFileSync(join(dir, ".drwil/state.json"), "utf8"));
    } catch {
      return null;
    }
  };
  const last = () => {
    const said = [...errors, ...output].at(-1) ?? "";
    errors.length = output.length = 0;
    return said;
  };
  const capture = async (fn) => {
    const error = console.error;
    console.error = (text) => errors.push(String(text));
    try {
      return await fn();
    } finally {
      console.error = error;
    }
  };
  return { dir, hook, prepare, post, state, last, capture, output };
}

/** Les refus de forme du socle (QUA-235), communs à chaque sondage préparé : rien n'est écrit, la cause est dite. */
async function refusDuSocle({ hook, prepare, post, state, last }, form, oui) {
  const avant = JSON.stringify(state());
  const base = prepare();
  for (const [change, cause] of [
    [(x) => (x.tool_input.metadata = { source: "agent" }), /champ inattendu \(tool_input\.metadata\)/],
    [(x) => (x.tool_input.answers = { [x.tool_input.questions[0].question]: oui }), /champ inattendu \(tool_input\.answers\)/],
    [(x) => (x.tool_input.questions[0].default = oui), /champ inattendu \(questions\[0\]\.default\)/],
    [(x) => x.tool_input.questions.push({ header: "autre" }), /plusieurs questions \(2\)/],
    [(x) => (x.tool_input.questions[0].options[0].label += " (Recommended)"), /recommandation dans l'option « .* \(Recommended\) »/],
    [(x) => (x.tool_input.questions[0].question += "\nmodifié"), /résumé différent .*modifié/],
    [(x) => (x.tool_input.questions[0].multiSelect = true), /résumé différent .*multiSelect/],
    [(x) => (x.tool_name = "Bash"), /appel non corrélable/],
    [(x) => delete x.session_id, /appel non corrélable/],
  ]) {
    const input = structuredClone(base);
    change(input);
    assert.equal(await hook(input), 2);
    const said = last();
    assert.match(said, cause);
    assert.match(said, form);
    await hook(post(input));
    last();
    assert.equal(JSON.stringify(state()), avant);
  }
  for (const [change, cause] of [
    [(x) => (x.tool_response.answers = {}), /réponse illisible/],
    [(x) => delete x.tool_response, /réponse illisible/],
    [(x) => (x.tool_response.answers[x.tool_input.questions[0].question] = "Oui"), /réponse illisible \(« Oui » ∉ options\)/],
    [(x) => (x.session_id = "autre-session"), /préparation absente/],
  ]) {
    assert.equal(await hook(base), 0);
    const response = structuredClone(post(base));
    change(response);
    await hook(response);
    assert.match(last(), cause);
    assert.equal(JSON.stringify(state()), avant);
  }
  return base;
}

const ETAT_ROUVERT = {
  version: 1,
  activity: "BUILD",
  active_brief: FICHE_ACCEPT,
  active_request: null,
  since: "2026-11-18T10:00:00Z",
  reopened: { pr: 42 },
};

const sondageTransition = (lang) =>
  projetSondage({
    lang,
    hookName: "moveHook",
    preparer: async (githook, dir) => (await githook("state-polls.mjs")).movePoll(dir, { to: "EXPECTATION", brief: FICHE_ACCEPT }).poll,
  });

const sondageDetour = (lang) =>
  projetSondage({
    lang,
    etat: ETAT_ROUVERT,
    hookName: "detourHook",
    preparer: async (githook, dir) => (await githook("detour.mjs")).detourPoll(dir).poll,
  });

test("QUA-235 : sondage drwil-move (QUA-117) — seule la réponse de l'humain au sondage préparé applique la transition humaine, une fois", async () => {
  const s = await sondageTransition();
  try {
    const input = s.prepare();
    assert.match(input.tool_input.questions[0].question, /^drwil-move EXPECTATION \{"brief":"docs\/projects\/exemple\.md"\}\n/);
    assert.equal(await s.hook(input), 0);
    assert.equal(s.state(), null, "la question posée n'écrit rien");
    assert.equal(await s.hook(s.post(input)), 0);
    assert.equal(s.output.at(-1), "✓ SCOPING → EXPECTATION");
    assert.equal(s.state().activity, "EXPECTATION");
    assert.equal(s.state().active_brief, FICHE_ACCEPT);
    await s.hook(s.post(input));
    assert.match(s.output.at(-1), /préparation absente/, "rejeu sans préparation refusé");
    assert.equal(await s.hook({}), null, "un autre sondage n'est pas le sien");
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("QUA-235 : sondage drwil-move (QUA-117) — refusé, cause dite, comme celui de l'attestation ; refus humain, état changé, refus du moteur", async () => {
  const s = await sondageTransition();
  try {
    await s.capture(async () => {
      const form = /sondage de transition refusé — .* ; état inchangé\. relancer `node \.githooks\/state\.mjs poll move EXPECTATION …`/;
      const base = await refusDuSocle(s, form, "Autoriser");
      // La première ligne porte la transition : modifiée, la préparation refaite diffère ; illisible, l'erreur est dite.
      const autre = structuredClone(base);
      autre.tool_input.questions[0].question = autre.tool_input.questions[0].question.replace('{"brief"', '{"request":"x","brief"');
      assert.equal(await s.hook(autre), 2);
      assert.match(s.last(), /résumé différent/);
      autre.tool_input.questions[0].question = autre.tool_input.questions[0].question.replace(/\{.*\}/, "{pas du json}");
      assert.equal(await s.hook(autre), 2);
      assert.match(s.last(), /sondage de transition refusé — erreur \(/);
      assert.equal(await s.hook(base), 0);
      await s.hook(s.post(base, "Ne pas autoriser"));
      const human = s.last();
      assert.match(human, /refus choisi par l'humain \(« Ne pas autoriser »\) : état inchangé\./);
      assert.doesNotMatch(human, /sondage de transition refusé/, "le refus humain n'est pas un refus de forme");
      // État changé pendant la question : la transition n'est pas appliquée.
      assert.equal(await s.hook(base), 0);
      const changed = {
        version: 1,
        activity: "EXPECTATION",
        active_brief: FICHE_ACCEPT,
        active_request: null,
        since: "2026-11-18T11:00:00Z",
      };
      writeFileSync(join(s.dir, ".drwil/state.json"), JSON.stringify(changed));
      await s.hook(s.post(base));
      assert.match(s.last(), /état de gouvernance changé pendant la question/);
      assert.deepEqual(s.state(), changed);
      rmSync(join(s.dir, ".drwil/state.json"));
      // Le moteur refuse après la réponse (fiche retirée) : son message est dit tel quel.
      assert.equal(await s.hook(base), 0);
      rmSync(join(s.dir, FICHE_ACCEPT));
      await s.hook(s.post(base));
      assert.match(s.last(), /sondage de transition refusé — .*introuvable.* ; état inchangé\.$/);
      assert.equal(s.state(), null);
      // La préparation refaite échoue : son message est dit tel quel.
      assert.equal(await s.hook(base), 2);
      assert.match(s.last(), /sondage de transition refusé — .*introuvable/);
    });
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
  const en = await sondageTransition("en");
  try {
    const input = en.prepare();
    assert.deepEqual(
      input.tool_input.questions[0].options.map((o) => o.label),
      ["Allow", "Do not allow"],
    );
    assert.equal(await en.hook(input), 0);
    await en.hook(en.post(input, "Do not allow"));
    assert.match(en.output.at(-1), /refusal chosen by the human \(« Do not allow »\): state unchanged\./);
    assert.equal(en.state(), null);
  } finally {
    rmSync(en.dir, { recursive: true, force: true });
  }
});

test("QUA-235 : sondage drwil-detour (QUA-117) — seule la réponse de l'humain au sondage préparé enregistre le oui à la réouverture, une fois", async () => {
  const s = await sondageDetour();
  try {
    const input = s.prepare();
    assert.match(input.tool_input.questions[0].question, /^drwil-detour docs\/projects\/exemple\.md\nLe correctif de la réouverture/);
    assert.equal(await s.hook(input), 0);
    assert.deepEqual(s.state().reopened, { pr: 42 }, "la question posée n'écrit rien");
    assert.equal(await s.hook(s.post(input)), 0);
    assert.equal(s.output.at(-1), "✓ réouverture de docs/projects/exemple.md autorisée à changer les règles du jeu");
    assert.deepEqual(s.state().reopened, { pr: 42, human: true });
    await s.hook(s.post(input));
    assert.match(s.output.at(-1), /préparation absente/, "rejeu sans préparation refusé");
    assert.equal(await s.hook({}), null, "un autre sondage n'est pas le sien");
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("QUA-235 : sondage drwil-detour (QUA-117) — refusé, cause dite, comme celui de l'attestation ; refus humain, réouverture changée", async () => {
  const s = await sondageDetour();
  try {
    await s.capture(async () => {
      const form = /sondage du oui au détour refusé — .* ; aucun oui enregistré\. relancer `node \.githooks\/state\.mjs poll detour`/;
      const base = await refusDuSocle(s, form, "Autoriser");
      assert.equal(await s.hook(base), 0);
      await s.hook(s.post(base, "Ne pas autoriser"));
      assert.match(
        s.last(),
        /refus choisi par l'humain \(« Ne pas autoriser »\) : aucun oui enregistré, la barrière de périmètre refuse toujours/,
      );
      assert.deepEqual(s.state().reopened, { pr: 42 });
      // Plus rien n'attend le oui pendant la question : rien n'est enregistré.
      assert.equal(await s.hook(base), 0);
      const { reopened, ...sans } = s.state();
      writeFileSync(join(s.dir, ".drwil/state.json"), JSON.stringify(sans));
      await s.hook(s.post(base));
      assert.match(s.last(), /détour ou réouverture changés pendant la question/);
      assert.equal(s.state().reopened, undefined);
      assert.equal(await s.hook(base), 2);
      assert.match(s.last(), /sondage du oui au détour refusé — aucun détour en cours ; aucun oui enregistré\.$/);
    });
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
  const en = await sondageDetour("en");
  try {
    const input = en.prepare();
    assert.deepEqual(
      input.tool_input.questions[0].options.map((o) => o.label),
      ["Allow", "Do not allow"],
    );
    assert.equal(await en.hook(input), 0);
    await en.hook(en.post(input, "Do not allow"));
    assert.match(en.output.at(-1), /refusal chosen by the human \(« Do not allow »\): no yes recorded/);
    assert.equal(await en.hook(input), 0);
    await en.hook(en.post(input));
    assert.equal(en.output.at(-1), "✓ reopening of docs/projects/exemple.md allowed to change the rules");
  } finally {
    rmSync(en.dir, { recursive: true, force: true });
  }
});

const MODULE_RELEASE = fileURLToPath(new URL("../templates/common/optional/create-release/", import.meta.url));
const CANDIDATE = "v1.1.0-rc.1";

/** Projet avec le module de release et un gh simulé : le hook du sondage drwil-verdict (QUA-053) s'y joue. */
async function projetVerdict(lang = "fr") {
  const dir = projet({ lang });
  cpSync(BASE_GITHOOKS, join(dir, ".githooks"), { recursive: true });
  cpSync(MODULE_RELEASE, join(dir, ".githooks"), { recursive: true });
  const githook = (name) => import(pathToFileURL(join(dir, ".githooks", name)).href);
  const { renderSheet, sheetTexts } = await githook("acceptance-sheet.mjs");
  const { verdictPoll } = await githook("release-verdict-poll.mjs");
  const point = (n, what) => ({ id: `v1.1.0-P${n}`, kind: "human", what, how: "Lire", work: null });
  const base = { tag: CANDIDATE, version: "v1.1.0", commit: "0123456789", from: "v1.0.0", repo: null, verdict: null };
  const vide = { proven: [], os: [], tarballs: null, packages: null };
  const sheet = (what = "Lisible") => renderSheet({ ...base, points: [point(1, what), point(2, "Lente")], ...vide }, sheetTexts(dir));
  const gh = { sheet: sheet(), verdict: null, upload: true, appels: [] };
  const run = (_cmd, args) => {
    gh.appels.push(args);
    if (args[0] === "release" && args[1] === "view")
      return JSON.stringify({ isPrerelease: true, url: "https://exemple.invalid/r", body: "" });
    if (args[1] === "download") {
      const nom = args[args.indexOf("--pattern") + 1];
      const texte = nom === "recette-verdict.json" ? gh.verdict : gh.sheet;
      if (texte === null) return null;
      writeFileSync(join(args[args.indexOf("--dir") + 1], nom), texte);
      return "";
    }
    if (args[0] === "api") return "recetteuse";
    if (args[0] === "issue") return "https://exemple.invalid/i/1";
    if (args[1] === "upload") {
      gh.recorded = gh.upload ? JSON.parse(readFileSync(args[3], "utf8")) : null;
      return gh.upload ? "" : null;
    }
    return "";
  };
  const output = [];
  const { verdictHook } = await load("prompt-hook.mjs");
  const hook = (input) => verdictHook(input, { root: dir, tell: (text) => output.push(text), run });
  const prepare = (args = [CANDIDATE, "--reserve", "P1"]) => ({
    hook_event_name: "PreToolUse",
    tool_name: "AskUserQuestion",
    session_id: "session-fictive",
    tool_use_id: "appel-fictif",
    tool_input: verdictPoll(dir, args, { run }).poll,
  });
  const post = (input, label = input.tool_input.questions[0].options[0].label) => {
    const answers = { [input.tool_input.questions[0].question]: label };
    return {
      ...input,
      hook_event_name: "PostToolUse",
      tool_input: { ...input.tool_input, answers: { ...answers }, annotations: {} },
      tool_response: { questions: input.tool_input.questions, answers, annotations: {} },
    };
  };
  return { dir, gh, sheet, hook, prepare, post, output, run };
}

test("QUA-235 : sondage drwil-verdict (QUA-053) — seule la réponse de l'humain au sondage préparé enregistre le verdict sur la candidate, une fois", async () => {
  const { dir, gh, hook, prepare, post, output } = await projetVerdict();
  try {
    const input = prepare();
    assert.match(input.tool_input.questions[0].question, /^drwil-verdict v1\.1\.0-rc\.1 \["--reserve","P1"\]\n/);
    assert.equal(await hook(input), 0);
    assert.equal(gh.recorded, undefined, "la question posée n'enregistre rien");
    assert.ok(!gh.appels.some((a) => a[0] === "issue" || a[0] === "api"));
    assert.equal(await hook(post(input)), 0);
    assert.match(
      output.at(-1),
      /^✓ issue ouverte pour v1\.1\.0-P1[\s\S]*verdict « approuvée avec réserves » enregistré sur v1\.1\.0-rc\.1 par recetteuse/,
    );
    assert.equal(gh.recorded.verdict, "reserved");
    assert.equal(gh.recorded.by, "recetteuse");
    delete gh.recorded;
    await hook(post(input));
    assert.match(output.at(-1), /préparation absente/, "rejeu sans préparation refusé");
    assert.equal(gh.recorded, undefined);
    assert.equal(await hook({}), null, "un autre sondage n'est pas le sien");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("QUA-235 : sondage drwil-verdict (QUA-053) — refusé, cause dite, comme celui de l'attestation ; refus humain, fiche changée, refus du module", async () => {
  const { dir, gh, sheet, hook, prepare, post, output } = await projetVerdict();
  const errors = [];
  const error = console.error;
  console.error = (text) => errors.push(String(text));
  const last = () => {
    const said = [...errors, ...output].at(-1) ?? "";
    errors.length = output.length = 0;
    return said;
  };
  try {
    const base = prepare();
    const form =
      /sondage de verdict refusé — .* ; aucun verdict enregistré\. relancer `node \.githooks\/release-verdict-poll\.mjs v1\.1\.0-rc\.1 …`/;
    for (const [change, cause] of [
      [(x) => (x.tool_input.metadata = {}), /champ inattendu \(tool_input\.metadata\)/],
      [
        (x) => (x.tool_input.questions[0].options[0].label += " (Recommended)"),
        /recommandation dans l'option « Donner le verdict \(Recommended\) »/,
      ],
      [
        (x) => (x.tool_input.questions[0].question = x.tool_input.questions[0].question.replace("Lisible", "Illisible")),
        /résumé différent .*Illisible/,
      ],
      [(x) => (x.tool_input.questions[0].question = x.tool_input.questions[0].question.replace("P1", "P2")), /résumé différent/],
      [(x) => delete x.tool_use_id, /appel non corrélable/],
    ]) {
      const input = structuredClone(base);
      change(input);
      assert.equal(await hook(input), 2);
      const said = last();
      assert.match(said, cause);
      assert.match(said, form);
    }
    // Arguments illisibles dans la première ligne : la préparation refaite échoue, l'usage dit tel quel.
    const illisible = structuredClone(base);
    illisible.tool_input.questions[0].question = illisible.tool_input.questions[0].question.replace('["--reserve","P1"]', "[1]");
    assert.equal(await hook(illisible), 2);
    assert.match(last(), /sondage de verdict refusé — usage : node \.githooks\/release-verdict-poll\.mjs/);
    assert.equal(await hook(base), 0);
    await hook(post(base, "Oui"));
    assert.match(last(), /réponse illisible \(« Oui » ∉ options\)/);
    assert.equal(await hook(base), 0);
    await hook(post(base, "Ne pas le donner"));
    const human = last();
    assert.match(human, /refus choisi par l'humain \(« Ne pas le donner »\) : aucun verdict enregistré sur la candidate/);
    assert.doesNotMatch(human, /sondage de verdict refusé/);
    // Fiche de la candidate changée pendant la question.
    assert.equal(await hook(base), 0);
    gh.sheet = sheet("Illisible");
    await hook(post(base));
    assert.match(last(), /fiche de recette de la candidate changée pendant la question/);
    gh.sheet = sheet();
    // Refus du module à l'écriture : son message est dit tel quel.
    assert.equal(await hook(base), 0);
    gh.upload = false;
    await hook(post(base));
    assert.match(last(), /sondage de verdict refusé — [\s\S]*verdict non enregistré sur v1\.1\.0-rc\.1/);
    // Un verdict déjà donné : la préparation refaite échoue, son message est dit.
    gh.verdict = "{}";
    assert.equal(await hook(base), 2);
    assert.match(last(), /sondage de verdict refusé — v1\.1\.0-rc\.1 a déjà un verdict/);
    assert.equal(gh.recorded, null);
    // Module de release absent (projet sans lui) : la préparation ne peut se faire.
    const sans = projet();
    const { verdictHook } = await load("prompt-hook.mjs");
    assert.equal(await verdictHook(base, { root: sans, tell: (t) => output.push(t) }), 2);
    assert.match(last(), /sondage de verdict refusé — erreur/);
    rmSync(sans, { recursive: true, force: true });
  } finally {
    console.error = error;
    rmSync(dir, { recursive: true, force: true });
  }
  const en = await projetVerdict("en");
  try {
    const input = en.prepare([CANDIDATE, "--approve"]);
    assert.equal(await en.hook(input), 0);
    await en.hook(en.post(input, "Do not give it"));
    assert.match(en.output.join("\n"), /refusal chosen by the human \(« Do not give it »\): no verdict recorded on the candidate/);
    assert.equal(await en.hook(input), 0);
    await en.hook(en.post(input));
    assert.match(en.output.at(-1), /^✓ verdict "approved" recorded on v1\.1\.0-rc\.1 by recetteuse/);
  } finally {
    rmSync(en.dir, { recursive: true, force: true });
  }
});

function run(name, input) {
  return spawnSync(process.execPath, [join(HOOKS, name)], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
  });
}

/** Un projet jetable : configuration, fiches et, au besoin, un glossaire factice. */
function projet(cfg = {}, fichiers = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-claude-hooks-"));
  mkdirSync(join(dir, ".drwil"), { recursive: true });
  writeFileSync(join(dir, ".drwil", "ia-first.json"), JSON.stringify(cfg));
  for (const [rel, text] of Object.entries(fichiers)) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}

const GLOSSAIRE = `export const glossary = () => [{ id: "QUA-001", label: "Un libellé" }];
export const cited = (text) => (text.includes("QUA-001") ? [{ id: "QUA-001", label: "Un libellé" }] : []);
export const unlabelled = (text) => (text.includes("QUA-001") ? [{ id: "QUA-001", label: "Un libellé" }] : []);
`;

/**
 * Sondage préparé posé sous Copilot CLI, à la forme relevée dans ses journaux de session (2026-11-14 et 15, valeurs
 * fictives) : `ask_user` prend `message` et `requestedSchema` ; le preToolUse natif porte `toolCalls[]`, le
 * postToolUse `toolCallId`, `toolArgs` et `toolResult` (« User responded: <valeur> »).
 */
function copilote(dir, poll, ctx = {}) {
  const args = copilotArgs(poll);
  const output = [];
  const denied = [];
  const pre = (a = args, extra = {}) => ({
    sessionId: "session-fictive",
    cwd: dir,
    toolCalls: [{ id: "toolu_fictif", name: "ask_user", args: a }],
    ...extra,
  });
  const post = (texte, a = args, extra = {}) => ({
    sessionId: "session-fictive",
    timestamp: 1794785046314,
    cwd: dir,
    toolCallId: "toolu_fictif",
    toolName: "ask_user",
    toolArgs: a,
    toolResult: {
      textResultForLlm: texte,
      resultType: "success",
      sessionLog: texte.replace("User responded: ", "User responded:\n"),
      toolTelemetry: { properties: { elicitation_action: "accept", elicitation_field_types: '["enum"]' } },
    },
    ...extra,
  });
  const hook = (event, phase) =>
    copilotPollHook(event, { root: dir, phase, tell: (t) => output.push(t), deny: (m) => denied.push(m), ...ctx });
  return { args, pre, post, hook, output, denied };
}

// Défaut du 2026-11-20 : AskUserQuestion retire `multiSelect` quand il vaut false (valeur par défaut) avant les
// hooks ; la préparation l'écrivait, le hook refusait (« questions[0].multiSelect … ≠ false »).
test("QUA-235 : Claude Code retire multiSelect:false avant le hook — les cinq sondages préparés n'en écrivent pas et, posés sans lui, sont acceptés", async () => {
  const sansDefaut = (input) => {
    const x = structuredClone(input);
    for (const q of x.tool_input.questions) if (q.multiSelect === false) delete q.multiSelect;
    return x;
  };
  const cas = [
    ["drwil-move", sondageTransition, (s) => s.prepare(), /^✓ SCOPING → EXPECTATION$/],
    ["drwil-detour", sondageDetour, (s) => s.prepare(), /^✓ réouverture de docs\/projects\/exemple\.md autorisée/],
    ["drwil-accept", projetAcceptation, (s) => s.prepare(), /^✓ critères de docs\/projects\/exemple\.md acceptés/],
    ["drwil-verdict", projetVerdict, (s) => s.prepare(), /verdict « approuvée avec réserves » enregistré/],
    ["drwil-attest", projetAttestation, (s) => s.prepare(), /APP-009 attesté/],
  ];
  for (const [header, creer, preparer, effet] of cas) {
    const s = await creer();
    try {
      const prepare = await preparer(s);
      assert.equal(prepare.tool_input.questions[0].header, header);
      assert.ok(!("multiSelect" in prepare.tool_input.questions[0]), `${header} : la préparation n'écrit pas multiSelect:false`);
      const input = sansDefaut(prepare);
      assert.equal(await s.hook(input), 0, `${header} : question posée sans multiSelect acceptée`);
      assert.equal(await s.hook(s.post(input)), 0);
      assert.match(s.output.at(-1), effet, `${header} : la réponse de l'humain applique le geste`);
    } finally {
      rmSync(s.dir, { recursive: true, force: true });
    }
  }
  // L'autre sens : préparation sans le champ, question posée avec multiSelect:false (forme de Copilot CLI).
  const s = await sondageTransition();
  try {
    const input = s.prepare();
    input.tool_input.questions[0].multiSelect = false;
    assert.equal(await s.hook(input), 0);
    assert.equal(await s.hook(s.post(input)), 0);
    assert.equal(s.output.at(-1), "✓ SCOPING → EXPECTATION");
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("QUA-235 : Copilot CLI — les cinq sondages préparés, sous la forme réelle de ask_user, passent par le socle ; seule la réponse de l'humain applique le geste", async () => {
  const move = await sondageTransition();
  try {
    const c = copilote(move.dir, move.prepare().tool_input);
    assert.match(
      c.args.message,
      /^drwil-move EXPECTATION \{"brief":"docs\/projects\/exemple\.md"\}\n[\s\S]*\n\nAutoriser : L'état passe de SCOPING à EXPECTATION\.\nNe pas autoriser : L'état ne change pas\.$/,
    );
    assert.deepEqual(c.args.requestedSchema, {
      type: "object",
      properties: { "drwil-move": { type: "string", title: "drwil-move", enum: ["Autoriser", "Ne pas autoriser"] } },
    });
    assert.equal(await c.hook(c.pre(), "pre"), 0);
    assert.equal(move.state(), null, "la question posée n'écrit rien");
    assert.equal(await c.hook(c.post("User responded: Autoriser"), "post"), 0);
    assert.equal(c.output.at(-1), "✓ SCOPING → EXPECTATION");
    assert.equal(move.state().activity, "EXPECTATION");
    await c.hook(c.post("User responded: Autoriser"), "post");
    assert.match(c.output.at(-1), /préparation absente/, "rejeu sans préparation refusé");
  } finally {
    rmSync(move.dir, { recursive: true, force: true });
  }
  const detour = await sondageDetour();
  try {
    const c = copilote(detour.dir, detour.prepare().tool_input);
    assert.equal(await c.hook(c.pre(), "pre"), 0);
    assert.equal(await c.hook(c.post("User responded: Autoriser"), "post"), 0);
    assert.equal(c.output.at(-1), "✓ réouverture de docs/projects/exemple.md autorisée à changer les règles du jeu");
    assert.deepEqual(detour.state().reopened, { pr: 42, human: true });
  } finally {
    rmSync(detour.dir, { recursive: true, force: true });
  }
  const accept = await projetAcceptation();
  try {
    const c = copilote(accept.dir, accept.prepare().tool_input);
    assert.equal(await c.hook(c.pre(), "pre"), 0);
    assert.equal(accept.accepted(), null);
    assert.equal(await c.hook(c.post(`User responded: ${c.args.requestedSchema.properties["drwil-accept"].enum[0]}`), "post"), 0);
    assert.match(c.output.at(-1), /^✓ critères de docs\/projects\/exemple\.md acceptés/);
    assert.match(accept.accepted().fingerprint, /^sha256:/);
  } finally {
    rmSync(accept.dir, { recursive: true, force: true });
  }
  const verdict = await projetVerdict();
  try {
    const c = copilote(verdict.dir, verdict.prepare().tool_input, { run: verdict.run });
    assert.equal(await c.hook(c.pre(), "pre"), 0);
    assert.equal(verdict.gh.recorded, undefined, "la question posée n'enregistre rien");
    assert.equal(await c.hook(c.post("User responded: Donner le verdict"), "post"), 0);
    assert.match(c.output.at(-1), /verdict « approuvée avec réserves » enregistré sur v1\.1\.0-rc\.1 par recetteuse/);
    assert.equal(verdict.gh.recorded.verdict, "reserved");
  } finally {
    rmSync(verdict.dir, { recursive: true, force: true });
  }
  const attest = await projetAttestation();
  try {
    const c = copilote(attest.dir, (await attest.prepare()).tool_input);
    assert.equal(await c.hook(c.pre(), "pre"), 0);
    assert.equal((await attest.contract()).status, "MANUAL", "la question posée n'atteste pas");
    assert.equal(await c.hook(c.post(`User responded: ${c.args.requestedSchema.properties["drwil-attest"].enum[0]}`), "post"), 0);
    assert.match(c.output.at(-1), /APP-009 attesté/);
    const k = await attest.contract();
    assert.equal(k.status, "ATTESTED");
    assert.equal(k.attestation.origin.source, "copilot-poll");
    assert.equal(k.attestation.origin.toolUseId, "toolu_fictif");
  } finally {
    rmSync(attest.dir, { recursive: true, force: true });
  }
});

test("QUA-235 : Copilot CLI — chaque sondage préparé est refusé, cause dite, comme sous Claude Code ; annulation, mode autonome et réponse libre ne confirment pas", async () => {
  const s = await sondageTransition();
  try {
    const c = copilote(s.dir, s.prepare().tool_input);
    const field = (a) => a.requestedSchema.properties["drwil-move"];
    const avant = JSON.stringify(s.state());
    const muter = (fn) => {
      const a = structuredClone(c.args);
      fn(a);
      return a;
    };
    for (const [event, cause] of [
      [c.pre(muter((a) => (field(a).default = "Autoriser"))), /champ inattendu \(questions\[0\]\.default\)/],
      [c.pre(muter((a) => (field(a).enumNames = ["Autoriser (Recommended)", "Non"]))), /champ inattendu \(questions\[0\]\.enumNames\)/],
      [c.pre(muter((a) => (field(a).title = "Transition"))), /champ inattendu \(questions\[0\]\.title\)/],
      [c.pre(muter((a) => (field(a).enum[0] += " (Recommended)"))), /recommandation dans l'option « Autoriser \(Recommended\) »/],
      [c.pre(muter((a) => (a.message = a.message.split("\n").toSpliced(1, 0, "modifié").join("\n")))), /résumé différent .*modifié/],
      [
        c.pre(
          muter(
            (a) =>
              (a.requestedSchema.properties["drwil-move"] = {
                type: "array",
                items: { type: "string", enum: ["Autoriser", "Ne pas autoriser"] },
              }),
          ),
        ),
        /résumé différent .*multiSelect/,
      ],
      [c.pre(muter((a) => (a.requestedSchema.properties.autre = { type: "string", enum: ["a", "b"] }))), /plusieurs questions \(2\)/],
      // Forme posée le 2026-11-15 : un champ « choice » ; l'en-tête n'est que dans le message.
      [c.pre(muter((a) => (a.requestedSchema.properties = { choice: field(a) }))), /plusieurs questions \(2\)/],
      [c.pre(muter((a) => (a.choices = ["Autoriser", "Ne pas autoriser"]))), /champ inattendu \(tool_input\.choices\)/],
      [c.pre(muter((a) => (a.requestedSchema.required = ["drwil-move"]))), /champ inattendu \(tool_input\.requestedSchema\.required\)/],
      [
        c.pre(c.args, {
          toolCalls: [
            { id: "a", name: "ask_user", args: c.args },
            { id: "b", name: "ask_user", args: c.args },
          ],
        }),
        /plusieurs questions \(2\)/,
      ],
      [c.pre(c.args, { sessionId: undefined }), /appel non corrélable/],
      // Ancienne forme lue (toolName / toolArgs en preToolUse) : sans identifiant d'appel, rien n'est préparé.
      [{ sessionId: "session-fictive", toolName: "ask_user", toolArgs: c.args }, /appel non corrélable/],
    ]) {
      assert.equal(await c.hook(event, "pre"), 2);
      assert.match(c.denied.at(-1), cause);
      assert.match(c.denied.at(-1), /^\[drwil\] sondage de transition refusé — /);
      assert.equal(JSON.stringify(s.state()), avant);
    }
    for (const [event, cause] of [
      [c.post("User cancelled the request."), /réponse illisible \(tool_response\.answers: 0\)/],
      [c.post("The user is not available to respond and will review your work later. Work autonomously."), /réponse illisible/],
      [
        c.post("User responded: Autoriser", c.args, {
          toolResult: { resultType: "failure", textResultForLlm: "User responded: Autoriser" },
        }),
        /réponse illisible/,
      ],
      [c.post("", c.args, { toolResult: { resultType: "success" } }), /réponse illisible \(tool_response\.answers: 0\)/],
      [c.post("User responded: donne moi les commandes"), /réponse illisible \(« donne moi les commandes » ∉ options\)/],
      [c.post("User responded: Autoriser", c.args, { toolCallId: "toolu_autre" }), /préparation absente/],
      [c.post("User responded: Ne pas autoriser"), /refus choisi par l'humain \(« Ne pas autoriser »\) : état inchangé\./],
    ]) {
      assert.equal(await c.hook(c.pre(), "pre"), 0);
      assert.equal(await c.hook(event, "post"), 0);
      assert.match(c.output.at(-1), cause);
      assert.equal(JSON.stringify(s.state()), avant);
    }
    // Ni un autre sondage, ni un autre outil, ni une autre phase : ce n'est pas le sien.
    const lancement = {
      message: "drwil-start : quelle fiche ?",
      requestedSchema: { properties: { fiche: { type: "string", enum: ["a.md"] } } },
    };
    assert.equal(await c.hook(c.pre(lancement), "pre"), null);
    assert.equal(await c.hook({ sessionId: "s", toolCalls: [{ id: "x", name: "bash", args: { command: "ls" } }] }, "pre"), null);
    assert.equal(await c.hook({ sessionId: "s", toolCalls: [{ id: "x", name: "ask_user", args: {} }] }, "pre"), null);
    assert.equal(await c.hook(c.post("User responded: Autoriser"), "autre"), null);
    assert.equal(claudeEvent(null, "post"), null);
    assert.equal(claudeEvent({ toolCalls: "x" }, "pre"), null);
    assert.equal(
      claudeEvent(c.pre({ ...c.args, message: undefined, requestedSchema: { properties: { "drwil-move": { enum: "x" } } } }), "pre")
        .tool_input.questions[0].options.length,
      0,
    );
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("QUA-235 : Copilot CLI — la préparation se convertit en arguments de ask_user, par module ou par tube ; le choix multiple est refusé", async () => {
  const s = await sondageTransition();
  try {
    const poll = s.prepare().tool_input;
    const r = spawnSync(process.execPath, [join(HOOKS, "copilot-polls.mjs")], { input: JSON.stringify(poll), encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), copilotArgs(poll));
    const vide = spawnSync(process.execPath, [join(HOOKS, "copilot-polls.mjs")], { input: "", encoding: "utf8" });
    assert.equal(vide.status, 2);
    assert.match(vide.stderr, /copilot-polls : .* — passer la sortie d'une préparation drwil/);
    const q = poll.questions[0];
    assert.throws(() => copilotArgs({ questions: [{ ...q, multiSelect: true }] }), /choix multiple non lu sous Copilot CLI/);
    assert.throws(() => copilotArgs({ questions: [q, q] }), /une seule question/);
    assert.throws(() => copilotArgs({ questions: [{ ...q, header: "drwil-start" }] }), /une seule question/);
    assert.throws(() => copilotArgs(null), /une seule question/);
    assert.deepEqual(
      copilotArgs({ questions: [{ header: "drwil-move", question: "q" }] }).requestedSchema.properties["drwil-move"].enum,
      [],
    );
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("read-guard : refuse la lecture entière du registre, laisse passer une plage, une autre cible et une entrée illisible", async () => {
  const g = await load("read-guard.mjs");
  const dir = projet({}, { "docs/contracts.md": "x", "docs/projects/journal.md": "y", "docs/autre.md": "z" });
  try {
    const lire = (tool_input, tool_name = "Read") => g.main(JSON.stringify({ tool_name, tool_input }), dir);
    assert.match(JSON.parse(lire({ file_path: join(dir, "docs/contracts.md") })).hookSpecificOutput.permissionDecisionReason, /QUA-132/);
    assert.match(JSON.parse(lire({ file_path: "docs/projects/journal.md" })).hookSpecificOutput.permissionDecisionReason, /journal/);
    assert.equal(lire({ file_path: join(dir, "docs/contracts.md"), limit: 10 }), "");
    assert.equal(lire({ file_path: join(dir, "docs/autre.md") }), "");
    assert.equal(lire({ file_path: join(dir, "absent.md") }), "");
    assert.equal(lire({ file_path: "" }), "");
    assert.equal(lire({}), "");
    assert.equal(lire({ file_path: join(dir, "docs/contracts.md") }, "Bash"), "");
    assert.equal(g.main("pas du json", dir), "");
    assert.equal(g.main("null", dir), "");
    const dirEn = projet({ lang: "en", dirs: { contracts: "./c.md", projects: "p" } }, { "c.md": "x" });
    try {
      assert.deepEqual(g.guardedFiles(dirEn), ["c.md", "p/journal.md"]);
      assert.match(g.refusal("c.md", dirEn), /Read refused/);
    } finally {
      rmSync(dirEn, { recursive: true, force: true });
    }
    const lien = join(tmpdir(), `drwil-lien-${process.pid}`);
    symlinkSync(dir, lien);
    try {
      assert.equal(g.guardedTarget(join(lien, "docs/contracts.md"), dir), "docs/contracts.md");
    } finally {
      rmSync(lien, { force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(run("read-guard.mjs", { tool_name: "Read", tool_input: { file_path: "docs/contracts.md" } }).status, 0);
  assert.equal(run("read-guard.mjs", { tool_name: "Bash" }).stdout, "");
});

test("shell-split : découpe les commandes et repère le saut des hooks git (QUA-114)", async () => {
  const { split, skipsHooks } = await load("shell-split.mjs");
  assert.deepEqual(split(`git commit -m "a b" && echo 'x'`).commands, [
    ["git", "commit", "-m", "a b"],
    ["echo", "x"],
  ]);
  assert.deepEqual(split("echo a\\ b").commands, [["echo", "a b"]]);
  assert.deepEqual(split("C:\\Users\\x", true).commands, [["C:\\Users\\x"]]);
  const saut = "--no-" + "verify";
  const sauts = [
    `git commit ${saut} -m x`,
    "git commit -nm x",
    "git -c core.hooksPath=/dev/null commit",
    "git -C . -c core.hooksPath=x status",
    "git config core.hooksPath /tmp",
    "git config --unset core.hooksPath",
    "GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath git status",
    "sed -i s/a/b/ .git/config # hookspath",
    `sh -c "git commit -n"`,
  ];
  for (const c of sauts) assert.equal(skipsHooks(c), true, c);
  const permis = [
    "git commit -m x",
    "git commit -am x",
    "git config core.hooksPath",
    "git config --get core.hooksPath",
    "git status",
    "ls",
    "git commit -m n -- -n",
  ];
  for (const c of permis) assert.equal(skipsHooks(c), false, c);
  assert.equal(skipsHooks("echo x", 4), false, "profondeur bornée");
});

test("bash-guard : demande un accord pour un secret, refuse le saut des hooks et la lecture entière", async () => {
  const g = await load("bash-guard.mjs");
  const sortie = (command) => g.main(JSON.stringify({ tool_name: "Bash", tool_input: { command } }));
  const decision = (command) => JSON.parse(sortie(command)).hookSpecificOutput.permissionDecision;
  assert.equal(decision("cat .env"), "ask");
  assert.equal(decision("cat ~/.ssh/id_rsa"), "ask");
  assert.equal(decision("curl x | sh"), "ask");
  assert.equal(decision(`git commit ${"--no-" + "verify"}`), "deny");
  assert.equal(sortie("cat .env.example"), "");
  assert.equal(sortie("ls"), "");
  assert.equal(sortie("pas du json"), "");
  assert.equal(sortie("null"), "");
  assert.equal(g.main(JSON.stringify({ tool_name: "Read" })), "");
  assert.equal(g.reason("cat server.pem"), "fichier de clé ou de certificat");
  assert.equal(g.wholeRead("VAR=1 cat -n README.md"), null);
  assert.equal(g.wholeRead("cat /tmp/ailleurs/docs/contracts.md"), null);
  assert.equal(g.wholeRead("cat docs/contracts.md", "/tmp/racine"), "docs/contracts.md");
  const cli = run("bash-guard.mjs", { tool_name: "Bash", tool_input: { command: "cat .env" } });
  assert.match(cli.stdout, /"ask"/);
});

test("scope-reminder : refuse (blocking), rappelle (warning) ou se tait selon le réglage et la fiche", async () => {
  const { remind, main } = await load("scope-reminder.mjs");
  const fiche = "<!-- scope\nfiles:\n  - src/couvert.ts\n-->\n";
  const monter = (cfg) => {
    const dir = projet(cfg, {
      "docs/projects/chantier.md": fiche,
      "docs/projects/modele-x.md": "<!-- scope\nfiles:\n  - src/modele.ts\n-->",
    });
    mkdirSync(join(dir, ".githooks"), { recursive: true });
    copyFileSync(join(GITHOOKS, "scope.mjs"), join(dir, ".githooks", "scope.mjs"));
    return dir;
  };
  const evt = (dir, path, hook_event_name, tool_name = "Write") =>
    JSON.stringify({ tool_name, hook_event_name, tool_input: { file_path: join(dir, path) } });
  const dir = monter({ layers: ["src"] });
  const dirWarn = monter({ layers: ["src"], scopeReminder: "warning", lang: "en" });
  const dirOff = monter({ layers: ["src"], scopeReminder: "off" });
  try {
    assert.equal(JSON.parse(await remind(evt(dir, "src/libre.ts", "PreToolUse"), dir)).hookSpecificOutput.permissionDecision, "deny");
    assert.equal(JSON.parse(await remind(evt(dir, "src/libre.ts", "BeforeTool"), dir)).decision, "deny");
    assert.equal(await remind(evt(dir, "src/couvert.ts", "PreToolUse"), dir), "");
    assert.equal(await remind(evt(dir, "src/libre.ts", "PostToolUse"), dir), "");
    assert.equal(await remind(evt(dir, "README.md", "PreToolUse"), dir), "");
    assert.match(
      JSON.parse(await remind(evt(dirWarn, "src/libre.ts", "AfterTool"), dirWarn)).hookSpecificOutput.additionalContext,
      /Scope reminder/,
    );
    assert.equal(JSON.parse(await remind(evt(dirWarn, "src/libre.ts"), dirWarn)).hookSpecificOutput.hookEventName, "PostToolUse");
    assert.equal(await remind(evt(dirWarn, "src/libre.ts", "PreToolUse"), dirWarn), "");
    assert.equal(await remind(evt(dirOff, "src/libre.ts", "PreToolUse"), dirOff), "");
    assert.equal(await remind(JSON.stringify({ tool_name: "Write", tool_input: { path: "/hors/du/projet.ts" } }), dir), "");
    assert.equal(await remind(JSON.stringify({ tool_name: "Write", tool_input: {} }), dir), "");
    assert.equal(await remind(JSON.stringify({ tool_name: "Bash", tool_input: {} }), dir), "");
    assert.equal(await remind("pas du json", dir), "");
    assert.equal(await remind("null", dir), "");
    assert.equal(await main("{}"), "");
    assert.equal(await main(JSON.stringify({ tool_name: "Write", tool_input: { file_path: "/inexistant/zzz/a.ts" } })), "");
  } finally {
    for (const d of [dir, dirWarn, dirOff]) rmSync(d, { recursive: true, force: true });
  }
  assert.equal(run("scope-reminder.mjs", { tool_name: "Bash" }).status, 0);
});

/** Projet cadré sur src/couvert.ts, fiche qui cite QUA-900 (Périmètre : un module et un hook), hooks de dérivation copiés. */
async function projetDerive() {
  const { remind } = await load("scope-reminder.mjs");
  const fiche = "<!-- scope\nfiles:\n  - src/couvert.ts\n-->\n\n## Critères d'acceptation\n\n- un critère — `QUA-900`\n";
  const dir = projet(
    { layers: ["src"], codePrefixes: [".githooks"] },
    {
      "docs/projects/chantier.md": fiche,
      "docs/contracts.md": "## QUA-900 — x\n**Règle** : r.\n**Périmètre** : `src/perimetre.ts`, `.githooks/regle.mjs`\n",
      "src/existant.test.ts": 'import { c } from "./couvert";\n',
    },
  );
  mkdirSync(join(dir, ".githooks"), { recursive: true });
  for (const f of [
    "scope.mjs",
    "scope-derived.mjs",
    "briefs-criteria.mjs",
    "contracts.mjs",
    "contracts-validate.mjs",
    "detour-rules.mjs",
    "scope-gate-merge.mjs",
  ])
    copyFileSync(join(GITHOOKS, f), join(dir, ".githooks", f));
  const ecrire = (path, tool_input = {}, tool_name = "Write") =>
    remind(JSON.stringify({ tool_name, hook_event_name: "PreToolUse", tool_input: { file_path: join(dir, path), ...tool_input } }), dir);
  const refuse = async (path, input) => JSON.parse((await ecrire(path, input)) || "{}").hookSpecificOutput?.permissionDecision === "deny";
  return { dir, ecrire, refuse };
}

test("QUA-311 : scope-reminder : un fichier dérivé du cadrage est admis d'office, le texte à écrire compris", async () => {
  const { dir, ecrire, refuse } = await projetDerive();
  try {
    assert.equal(
      await ecrire("src/neuf.test.ts", { content: 'import { c } from "./couvert";\n' }),
      "",
      "texte à écrire qui cite le module",
    );
    assert.equal(await ecrire("src/existant.test.ts", { old_string: "x", new_string: "y" }, "Edit"), "", "fichier déjà écrit qui le cite");
    assert.equal(await refuse("src/libre.test.ts", { content: "// rien\n" }), true, "test qui ne cite rien");
    assert.equal(await ecrire("src/perimetre.ts", { content: "" }), "", "cité au Périmètre d'un contrat de la fiche");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("QUA-312 : scope-reminder : un fichier de règles cité au Périmètre d'un contrat de la fiche n'est jamais admis d'office", async () => {
  const { dir, ecrire, refuse } = await projetDerive();
  try {
    assert.equal(await refuse(".githooks/regle.mjs", { content: "" }), true, "fichier de règles, jamais admis");
    assert.equal(await ecrire("src/perimetre.ts", { content: "" }), "", "le module du même Périmètre l'est");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("id-glossary et reply-glossary : glosent les identifiants cités, une seule fois pour l'agent", async () => {
  const { contextFor } = await load("id-glossary.mjs");
  const { noteFor } = await load("reply-glossary.mjs");
  const dir = projet({}, { ".githooks/glossary.mjs": GLOSSAIRE });
  const dirEn = projet({ lang: "en" }, { ".githooks/glossary.mjs": GLOSSAIRE });
  try {
    assert.match(await contextFor({ tool_response: "voir QUA-001", session_id: "s1" }, dir), /QUA-001 — Un libellé/);
    assert.equal(await contextFor({ tool_response: "voir QUA-001", session_id: "s1" }, dir), null, "déjà rappelé");
    assert.equal(await contextFor({ tool_response: { sortie: "rien" }, session_id: "s1" }, dir), null);
    assert.match(await contextFor({ tool_response: "QUA-001" }, dirEn), /Identifiers cited above/);
    assert.match(await noteFor({ last_assistant_message: "QUA-001 est cité" }, dir), /sans libellé/);
    assert.match(await noteFor({ last_assistant_message: "QUA-001" }, dirEn), /without a label/);
    assert.equal(await noteFor({ last_assistant_message: "rien" }, dir), null);
    assert.equal(await noteFor({ last_assistant_message: "" }, dir), null);
    assert.equal(await noteFor({}, dir), null);
  } finally {
    for (const d of [dir, dirEn]) rmSync(d, { recursive: true, force: true });
  }
  assert.equal(run("id-glossary.mjs", { tool_response: "QUA-001" }).status, 0);
  assert.equal(run("reply-glossary.mjs", { last_assistant_message: "QUA-001" }).status, 0);
});

const sondage = (extra = {}) => ({
  hook_event_name: "PreToolUse",
  tool_input: {
    questions: [
      { header: "drwil-start", question: "Q", options: [{ label: "fiche-a" }, { label: "Pas maintenant" }] },
      { header: "drwil-worktree", question: "W" },
    ],
    ...extra,
  },
});

test("start-poll : lit les deux formes de sondage, la réponse humaine et les questions optionnelles", async () => {
  const p = await load("start-poll.mjs");
  const claude = {
    tool_input: {
      questions: [
        { header: "drwil-start", question: "Q1", options: [{ label: "a" }, { label: "b" }] },
        { header: "drwil-merge", question: "Q2" },
        { header: "drwil-worktree", question: "Q3" },
        { header: "drwil-parallel", question: "Q4" },
      ],
    },
    tool_response: { answers: { Q1: "a, b", Q2: "Fusion automatique", Q3: "Nouveau worktree", Q4: "File en parallèle" } },
  };
  const poll = p.startPoll(claude);
  assert.equal(poll.form, "claude");
  assert.equal(poll.prefilled, false);
  assert.equal(p.humanAnswer(claude, poll), "a, b");
  assert.equal("mergeAuthorised" in p, false, "plus de question de fusion lue : la fusion automatique est le comportement par défaut");
  assert.equal(p.worktreeChosen(claude, poll), true);
  assert.equal(p.parallelChosen(claude, poll), true);
  assert.equal(p.startPoll({ tool_input: { questions: [{ header: "autre" }], answers: { x: 1 } } }), null);
  assert.equal(p.startPoll({ tool_input: { questions: [{ header: "drwil-start" }], answers: { a: "b" } } }).prefilled, true);
  assert.deepEqual(p.inPollOrder(["b", "libre", "a"], ["a", "b"]), ["a", "b", "libre"]);
  assert.deepEqual(p.inPollOrder(["x"]), ["x"]);

  const copilot = {
    tool_input: {
      message: "drwil-start : choisir",
      requestedSchema: {
        properties: {
          fiche: { type: "array", items: { enum: ["a", "b"] } },
          "drwil-merge": { enum: ["Fusion automatique"] },
          "drwil-worktree": {},
          "drwil-parallel": {},
        },
      },
    },
    tool_result: {
      text_result_for_llm:
        'User responded: fiche=["a", "b"], drwil-merge=Fusion automatique, drwil-worktree=Non, drwil-parallel=File en parallèle',
    },
  };
  const cp = p.startPoll(copilot);
  assert.equal(cp.form, "copilot");
  assert.equal(cp.multiple, true);
  assert.equal(p.humanAnswer(copilot, cp), "a, b");
  assert.equal(cp.fieldKey, "fiche", "un champ drwil-merge hérité n'est jamais celui des fiches");
  assert.equal(p.worktreeChosen(copilot, cp), false);
  assert.equal(p.parallelChosen(copilot, cp), true);
  const simple = {
    tool_input: { message: "drwil-start", requestedSchema: { properties: { fiche: { enum: ["a"], default: "a" } } } },
    tool_result: { text_result_for_llm: "User responded: a" },
  };
  const sp = p.startPoll(simple);
  assert.equal(sp.prefilled, true);
  assert.equal(p.humanAnswer(simple, sp), "a");
  assert.equal(p.humanAnswer({}, sp), null);
  assert.equal(p.humanAnswer({ tool_result: { text_result_for_llm: "User responded: []" } }, { ...sp, multiple: true }), null);
  assert.equal(
    p.humanAnswer(
      { tool_result: { text_result_for_llm: "User responded: x=1" } },
      { ...sp, worktreeKey: "m", keys: ["fiche", "m"], fieldKey: "fiche" },
    ),
    null,
  );
  assert.equal(p.startPoll({ tool_input: { message: "drwil-start" } }).options.length, 0);
  assert.equal(p.NOT_NOW_RE.test("Pas maintenant"), true);
});

test("QUA-205 : prompt-hook : refuse un sondage prérempli, annonce un échec sans état, se tait sur un autre outil", async () => {
  const prompt = await load("prompt-hook.mjs");
  assert.equal(typeof prompt.startPoll, "function");
  const prerempli = run("prompt-hook.mjs", sondage({ answers: { x: "y" } }));
  assert.equal(prerempli.status, 2);
  assert.match(prerempli.stderr, /sondage de lancement refusé/);
  assert.equal(run("prompt-hook.mjs", sondage()).status, 0);
  // La question drwil-worktree est obligatoire : sans elle le sondage est refusé, sous les deux formes.
  const sansWorktree = { hook_event_name: "PreToolUse", tool_input: { questions: [sondage().tool_input.questions[0]] } };
  const sans = run("prompt-hook.mjs", sansWorktree);
  assert.equal(sans.status, 2);
  assert.match(sans.stderr, /drwil-worktree/);
  const copilotSans = {
    hook_event_name: "PreToolUse",
    tool_input: { message: "drwil-start : x", requestedSchema: { properties: { fiche: { enum: ["a"] } } } },
  };
  assert.equal(run("prompt-hook.mjs", copilotSans).status, 2);
  // Le gabarit n'a pas d'état à lire : le hook dit l'échec, sans rien lancer.
  const contexte = (entree) => JSON.parse(run("prompt-hook.mjs", entree).stdout).hookSpecificOutput.additionalContext;
  const repondu = (answers, questions = []) => ({
    hook_event_name: "PostToolUse",
    tool_input: {
      questions: [{ header: "drwil-start", question: "Q", options: [{ label: "fiche-a" }, { label: "Pas maintenant" }] }, ...questions],
    },
    tool_response: { answers },
  });
  assert.match(contexte(repondu({})), /aucune réponse lue/);
  assert.match(contexte(repondu({ Q: "Pas maintenant" })), /rien n'est lancé/);
  assert.match(contexte(repondu({ Q: "fiche-a" })), /erreur au lancement/);
  // Un refus est aussi montré à l'humain (systemMessage), pas seulement à l'agent (QUA-179) ; « Pas maintenant » n'en est pas un.
  const humain = (entree) => JSON.parse(run("prompt-hook.mjs", entree).stdout).systemMessage;
  assert.match(humain(repondu({ Q: "fiche-a" })), /^\[drwil\] ✗ erreur au lancement/);
  assert.match(humain(repondu({})), /^\[drwil\] ✗ aucune réponse lue/);
  assert.equal(humain(repondu({ Q: "Pas maintenant" })), undefined);
  assert.match(
    contexte(repondu({ Q: "fiche-a", W: "Nouveau worktree" }, [{ header: "drwil-worktree", question: "W" }])),
    /erreur au lancement/,
  );
  assert.match(
    contexte(repondu({ Q: "fiche-a", P: "File en parallèle" }, [{ header: "drwil-parallel", question: "P" }])),
    /erreur au lancement/,
  );
  const trois = ["Automatic merge", "Manual merge", "Continue scoping"].map((label) => ({ label }));
  const fin = (hook_event_name, options = trois, answers) => ({
    hook_event_name,
    tool_input: { questions: [{ header: "drwil-scope", question: "S", options }] },
    tool_response: { answers },
  });
  // Un ancien sondage de fin de cadrage n'est plus ni refusé ni lu (QUA-187) : rien n'est dit.
  assert.equal(run("prompt-hook.mjs", fin("PreToolUse")).status, 0);
  const ancien = run("prompt-hook.mjs", fin("PreToolUse", trois.slice(1)));
  assert.equal(ancien.status, 0);
  assert.equal(ancien.stderr, "");
  assert.equal(run("prompt-hook.mjs", fin("PostToolUse", trois, {})).stdout, "");
  assert.equal(run("prompt-hook.mjs", fin("PostToolUse", trois, { S: "Manual merge" })).stdout, "");
  assert.equal(run("prompt-hook.mjs", fin("Autre")).stdout, "");
  assert.equal(run("prompt-hook.mjs", { hook_event_name: "Autre", ...sondage() }).stdout, "");
  assert.equal(run("prompt-hook.mjs", "pas du json").status, 0);
});

test("queue-poll : sondage de file à choix unique, lu sous les deux formes ; refusé s'il est rempli, multiple ou sans « Terminer la file »", async () => {
  const q = await load("queue-poll.mjs");
  const claude = (extra = {}, answers) => ({
    tool_input: {
      questions: [
        { header: "drwil-file", question: "Q", options: [{ label: "a.md" }, { label: "Terminer la file" }], ...extra },
        { header: "drwil-merge", question: "M" },
      ],
      answers,
    },
    tool_response: { answers: { Q: "a.md", M: "Automatic merge" } },
  });
  assert.equal(q.queuePoll(claude()).valid, true);
  assert.equal(q.queuePoll(claude({ multiSelect: true })).valid, false);
  assert.equal(q.queuePoll(claude({}, { Q: "a.md" })).valid, false);
  assert.equal(q.queuePoll(claude({ options: [{ label: "a.md" }] })).valid, false);
  assert.equal(q.queuePoll(claude({ options: undefined })).valid, false);
  assert.equal(q.queuePoll({ tool_input: { questions: [{ header: "x" }] } }), null);
  assert.equal(q.queuePoll({ tool_input: { message: "autre" } }), null);

  const copilot = (field, merge = true, text = "User responded: drwil-file=a.md, drwil-merge=Manual merge") => ({
    tool_input: {
      message: "drwil-file : quelle fiche ?",
      requestedSchema: { properties: { "drwil-file": field, ...(merge ? { "drwil-merge": { type: "string" } } : {}) } },
    },
    tool_result: { text_result_for_llm: text },
  });
  const enumFile = { type: "string", enum: ["a.md", "Finish the queue"] };
  assert.equal(q.queuePoll(copilot(enumFile)).valid, true);
  assert.equal(q.queuePoll(copilot({ ...enumFile, default: "a.md" })).valid, false);
  assert.equal(q.queuePoll(copilot({ type: "array", items: enumFile })).valid, false);
  assert.equal(q.queuePoll(copilot(undefined)).valid, false);

  const racine = projet(
    {},
    {
      ".githooks/state.mjs": `export const draftAdd = (r, b) => ({ code: b === "refus.md" ? 1 : 0, message: "ajout " + b });
export const draftFinish = (...a) => ({ code: 0, message: "fin " + a.length });
`,
    },
  );
  const dit = [];
  const ctx = (lang = "fr") => ({ root: racine, lang, tell: (t) => dit.push(t) });
  const post = (input) => ({ hook_event_name: "PostToolUse", ...input });
  assert.equal(await q.queueHook({ tool_input: { message: "autre" } }, ctx()), null);
  assert.equal(await q.queueHook({ hook_event_name: "PreToolUse", ...copilot(enumFile) }, ctx()), 0);
  assert.equal(await q.queueHook({ hook_event_name: "PreToolUse", ...copilot({ ...enumFile, default: "a.md" }) }, ctx("en")), 2);
  assert.equal(await q.queueHook({ hook_event_name: "Autre", ...copilot(enumFile) }, ctx()), 0);
  await q.queueHook(post(copilot(enumFile)), ctx());
  await q.queueHook(post(copilot(enumFile, true, "User responded: drwil-file=Terminer la file, drwil-merge=Automatic merge")), ctx());
  await q.queueHook(post(copilot(enumFile, true, "User responded: drwil-file=refus.md, drwil-merge=Manual merge")), ctx());
  await q.queueHook(post(copilot(enumFile, false, "User responded: drwil-file=a.md")), ctx());
  await q.queueHook(post(claude()), ctx());
  await q.queueHook(post(copilot(enumFile, true, "pas de réponse")), ctx());
  await q.queueHook(post(copilot(enumFile, false, "User responded: a.md")), ctx("en"));
  assert.deepEqual(dit, [
    "✓ ajout a.md",
    "✓ fin 1",
    "✗ ajout refus.md",
    "✓ ajout a.md",
    "✓ ajout a.md",
    "✗ aucune réponse lue dans le sondage de file : rien n'est ajouté ni lancé, l'état est inchangé.",
    "✓ ajout a.md",
  ]);
  const sansEtat = projet();
  await q.queueHook(post(copilot(enumFile)), { root: sansEtat, lang: "en", tell: (t) => dit.push(t) });
  assert.match(dit.at(-1), /^✗ error while reading the queue poll/);
  await q.queueHook(post(copilot(enumFile)), { root: sansEtat, lang: "fr", tell: (t) => dit.push(t) });
  assert.match(dit.at(-1), /^✗ erreur à la lecture du sondage de file/);
  for (const d of [racine, sansEtat]) rmSync(d, { recursive: true, force: true });
});

test("limit-poll : sondage des limites lu sous les deux formes ; refusé s'il est rempli, recommandé ou mal formé (QUA-253)", async () => {
  const l = await load("limit-poll.mjs");
  // Le module d'état est simulé : seul le hook est mesuré ici (le vrai est éprouvé par les tests de l'état).
  const racine = projet(
    {},
    {
      ".githooks/state-limits.mjs": `export const limitChoice = (l) => ({ "Traiter maintenant": "now", "Noter en intention": "note" })[l] ?? null;
export const intentPath = (r, t) => /docs\\/intentions\\/[a-z-]+\\.md/.exec(String(t))?.[0] ?? null;
export const recordLimits = async (r, a) => ({ code: a.some((x) => x.intent.includes("refus")) ? 1 : 0, message: a.map((x) => x.intent + "=" + x.choice).join(",") });
`,
    },
  );
  const dit = [];
  const ctx = (lang = "fr", root = racine) => ({ root, lang, tell: (t) => dit.push(t) });
  const q = (chemin, extra = {}) => ({
    header: "drwil-limite",
    question: `Limite : deviendrait ${chemin}`,
    options: [{ label: "Traiter maintenant" }, { label: "Noter en intention" }],
    ...extra,
  });
  const claude = (questions, answers, reponses = {}) => ({ tool_input: { questions, answers }, tool_response: { answers: reponses } });
  const avant = (input, lang) => l.limitHook({ hook_event_name: "PreToolUse", ...input }, ctx(lang));
  const post = (input, lang, root) => l.limitHook({ hook_event_name: "PostToolUse", ...input }, ctx(lang, root));
  const [A, B] = ["docs/intentions/a.md", "docs/intentions/b.md"];
  assert.equal(await l.limitHook({ tool_input: { questions: [{ header: "x" }] } }, ctx()), null);
  assert.equal(await l.limitHook({ tool_input: { message: "autre" } }, ctx()), null);
  assert.equal(await l.limitHook({}, ctx()), null);
  assert.equal(await avant(claude([q(A), q(B)])), 0);
  for (const refus of [
    claude([q(A)], { [q(A).question]: "Noter en intention" }),
    claude([q(A, { multiSelect: true })]),
    claude([q(A, { options: [{ label: "Traiter maintenant (Recommended)" }, { label: "Noter en intention" }] })]),
    claude([q(A, { options: undefined })]),
    claude([q("sans chemin")]),
    claude([q(A), q(A)]),
  ])
    assert.equal(await avant(refus), 2);
  assert.equal(await avant(claude([q(A, { options: [{ label: "Traiter maintenant" }] })]), "en"), 2);
  assert.equal(await l.limitHook({ hook_event_name: "Autre", ...claude([q(A)]) }, ctx()), 0);

  const copilot = (champ, text = `User responded: ${A}=Noter en intention`) => ({
    tool_input: { message: "drwil-limite : que faire ?", requestedSchema: { properties: { [A]: champ } } },
    tool_result: { text_result_for_llm: text },
  });
  const champ = { type: "string", enum: ["Traiter maintenant", "Noter en intention"] };
  assert.equal(await avant(copilot(champ)), 0);
  for (const refus of [{ ...champ, default: "Noter en intention" }, { type: "array", items: champ, enum: champ.enum }, undefined])
    assert.equal(await avant(copilot(refus)), 2);
  assert.equal(
    await avant({
      tool_input: {
        message: "drwil-limite",
        requestedSchema: { properties: { x: { enum: ["Traiter maintenant (Recommended)", "Noter en intention"] } } },
      },
    }),
    2,
  );
  assert.equal(await avant({ tool_input: { message: "drwil-limite" } }), 2);

  await post(claude([q(A), q(B)], undefined, { [q(A).question]: "Traiter maintenant", [q(B).question]: "Noter en intention" }));
  await post(claude([q(A), q(B)], undefined, { [q(A).question]: "Traiter maintenant" }));
  await post(claude([q(A)]));
  await post(claude([q("docs/intentions/refus.md")], undefined, { "Limite : deviendrait docs/intentions/refus.md": "Noter en intention" }));
  await post(copilot(champ));
  await post(copilot(champ, "User responded: Traiter maintenant"));
  await post(copilot(champ, "pas de réponse"));
  await post(claude([q(A), q(B)], undefined, { [q(A).question]: "Traiter maintenant" }), "en");
  assert.deepEqual(dit, [
    `✓ ${A}=now,${B}=note`,
    `✓ ${A}=now Sans réponse lue, non enregistrée(s), à soumettre de nouveau : ${B}.`,
    "✗ aucune réponse lue dans le sondage des limites : rien n'est enregistré, l'état est inchangé.",
    "✗ docs/intentions/refus.md=note",
    `✓ ${A}=note`,
    `✓ ${A}=now`,
    "✗ aucune réponse lue dans le sondage des limites : rien n'est enregistré, l'état est inchangé.",
    `✓ ${A}=now No answer read, not recorded, to ask again: ${B}.`,
  ]);
  // Module d'état absent : jamais bloquant avant le sondage, l'erreur dite après.
  const sansEtat = projet();
  assert.equal(await l.limitHook({ hook_event_name: "PreToolUse", ...claude([q(A)]) }, ctx("fr", sansEtat)), 0);
  await post(claude([q(A)]), "en", sansEtat);
  assert.match(dit.at(-1), /^✗ error while reading the limits poll/);
  await post(claude([q(A)]), "fr", sansEtat);
  assert.match(dit.at(-1), /^✗ erreur à la lecture du sondage des limites/);
  for (const d of [racine, sansEtat]) rmSync(d, { recursive: true, force: true });
});

// QUA-215, QUA-216 : le repli des réglages livrés est une commande `sh` (Git Bash pour Claude Code sous Windows,
// `bash` pour Copilot) ; les tests la jouent par /bin/sh, donc pas sous Windows.
const SH = "/bin/sh";
const OUTILS = join(HOOKS, "..", "..");
const MESSAGE_SANS_NODE = /node not found in the PATH.*Restart it from a shell where which node answers/;
const commandes = (fichier) =>
  Object.entries(JSON.parse(readFileSync(join(OUTILS, fichier), "utf8").replace("{{stackAllowJson}}", "")).hooks).flatMap(
    ([evenement, groupes]) => groupes.flatMap((g) => (g.hooks ?? [g]).map((h) => ({ evenement, commande: h.command ?? h.bash }))),
  );
const sh = (commande, env, input = "") => spawnSync(SH, ["-c", commande], { env, input, encoding: "utf8" });
const sansNode = (extra = {}) => ({ PATH: "", ...extra });
const COPILOT = "../copilot/.github/hooks/drwil.json";

test("QUA-215 : sans node dans le PATH, chaque hook de Claude Code et de Copilot dit que node est introuvable et quoi faire", {
  skip: process.platform === "win32",
}, () => {
  const claude = commandes(".claude/settings.json");
  const copilot = commandes(COPILOT);
  assert.ok(claude.length >= 10);
  assert.deepEqual(
    copilot.map(({ evenement }) => evenement).sort(),
    ["sessionStart", "sessionStart", "userPromptTransformed", "preToolUse", "postToolUse", "postToolUseFailure"].sort(),
  );
  for (const { evenement, commande } of [...claude, ...copilot]) {
    const r = sh(commande, sansNode({ CLAUDE_PROJECT_DIR: OUTILS }));
    assert.match(r.stderr, MESSAGE_SANS_NODE, `${evenement} : ${commande}`);
    assert.equal(r.stdout, "", "rien sur stdout : pas de décision lue par l'assistant");
  }
});

test("QUA-216 : sans node, les gardes PreToolUse de Claude Code refusent (code 2), les hooks informatifs n'ont pas le code 2 et ceux de Copilot sortent en 0", {
  skip: process.platform === "win32",
}, () => {
  for (const { evenement, commande } of commandes(".claude/settings.json")) {
    const r = sh(commande, sansNode({ CLAUDE_PROJECT_DIR: OUTILS }));
    assert.equal(r.status, evenement === "PreToolUse" ? 2 : 1, `${evenement} : ${commande}`);
  }
  for (const { commande } of commandes(COPILOT)) assert.equal(sh(commande, sansNode()).status, 0, commande);
});

test("QUA-216 : avec node, le repli ne change ni la sortie ni le code de chaque garde Claude livrée (un refus reste un refus)", {
  skip: process.platform === "win32",
}, () => {
  const entrees = {
    "bash-guard.mjs": { tool_name: "Bash", tool_input: { command: "git commit --no-verify -m x" } },
    "read-guard.mjs": { tool_name: "Read", tool_input: { file_path: join(OUTILS, "absent.txt") } },
    "scope-reminder.mjs": { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(OUTILS, "x.md") } },
    "prompt-hook.mjs": { hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input: {} },
  };
  const env = { PATH: dirname(process.execPath), CLAUDE_PROJECT_DIR: OUTILS };
  const gardes = commandes(".claude/settings.json").filter((c) => c.evenement === "PreToolUse");
  assert.equal(gardes.length, 4);
  for (const { commande } of gardes) {
    const script = Object.keys(entrees).find((s) => commande.includes(s));
    const input = JSON.stringify(entrees[script]);
    const avec = sh(commande, env, input);
    const direct = spawnSync(process.execPath, [join(HOOKS, script)], { env, input, encoding: "utf8" });
    assert.deepEqual([avec.status, avec.stdout, avec.stderr], [direct.status, direct.stdout, direct.stderr], script);
    assert.equal(avec.stdout.includes("node not found"), false);
  }
});

const existsSyncLocal = (f) => readdirSync(dirname(f)).includes("lancee");

/** Dossier de projet avec le hook d'accueil copié, et une CLI factice à la place de `drwil`. */
function projetAccueil(config, cliFactice) {
  const dir = mkdtempSync(join(tmpdir(), "drwil-accueil-"));
  mkdirSync(join(dir, ".drwil"), { recursive: true });
  mkdirSync(join(dir, ".claude/hooks"), { recursive: true });
  writeFileSync(join(dir, ".drwil/ia-first.json"), config);
  copyFileSync(join(HOOKS, "serve-welcome.mjs"), join(dir, ".claude/hooks/serve-welcome.mjs"));
  if (cliFactice) {
    mkdirSync(join(dir, "node_modules/drwil/bin"), { recursive: true });
    writeFileSync(join(dir, "node_modules/drwil/bin/drwil.js"), cliFactice);
  }
  return dir;
}

test("QUA-277 : serve-welcome ne parle que par systemMessage, et se tait sans choix de l'humain", async () => {
  const { welcome } = await load("serve-welcome.mjs");
  const actif = JSON.stringify({ serveAutostart: true, lang: "fr" });
  const lancer = (dir, ...args) =>
    spawnSync(process.execPath, [join(dir, ".claude/hooks/serve-welcome.mjs"), ...args], { encoding: "utf8" });

  const lien = projetAccueil(actif, "console.log('drwil serve : http://127.0.0.1:4400/ (sur cet ordinateur).');");
  const r = lancer(lien);
  assert.deepEqual([r.status, r.stderr], [0, ""]);
  assert.deepEqual(JSON.parse(r.stdout), { systemMessage: "drwil serve : http://127.0.0.1:4400/ (sur cet ordinateur)." });
  assert.equal(r.stdout.trim().split("\n").length, 1, "rien d'autre sur stdout");

  // Copilot CLI ne lit que additionalContext : le serveur démarre, stdout reste vide.
  const trace = join(lien, "lancee");
  writeFileSync(
    join(lien, "node_modules/drwil/bin/drwil.js"),
    `require("node:fs").writeFileSync(${JSON.stringify(trace)}, "1"); console.log("lien");`,
  );
  writeFileSync(join(lien, "node_modules/drwil/package.json"), "{}");
  const copilot = lancer(lien, "copilot");
  assert.deepEqual([copilot.status, copilot.stdout, copilot.stderr], [0, "", ""]);
  assert.equal(readFileSync(trace, "utf8"), "1", "la CLI a été lancée");

  for (const config of [JSON.stringify({ serveAutostart: false }), JSON.stringify({ serveAutostart: "true" }), "{}", "pas du JSON"]) {
    const dir = projetAccueil(config, "require('node:fs').writeFileSync('lancee', '1'); console.log('lien');");
    const muet = lancer(dir);
    assert.deepEqual([muet.status, muet.stdout, muet.stderr], [0, "", ""], config);
    assert.equal(existsSyncLocal(join(dir, "lancee")), false, "aucun serveur sans réponse de l'humain");
    rmSync(dir, { recursive: true, force: true });
  }

  const echec = projetAccueil(actif, "process.exit(1);");
  assert.match(welcome(echec), /n'a pas démarré/);
  const vide = projetAccueil(JSON.stringify({ serveAutostart: true, lang: "en" }), "");
  assert.match(welcome(vide), /did not start/, "une sortie vide n'est pas un lien");

  // Sans CLI locale : npx, introuvable ici ; le hook le dit à l'humain, sans erreur.
  const sansCli = projetAccueil(actif);
  const chemin = process.env.PATH;
  process.env.PATH = "";
  try {
    assert.match(welcome(sansCli), /n'a pas démarré/);
  } finally {
    process.env.PATH = chemin;
  }
  for (const dir of [lien, echec, vide, sansCli]) rmSync(dir, { recursive: true, force: true });
});

test("QUA-277 : chaque outil à hook de session lance serve-welcome, Copilot CLI en silence", () => {
  const lire = (f) => readFileSync(join(OUTILS, f), "utf8").replaceAll(/\{\{\w+\}\}/g, "");
  const session = (f, cle) =>
    JSON.parse(lire(f))
      .hooks[cle].flatMap((g) => g.hooks ?? [g])
      .map((h) => h.command ?? h.bash);
  assert.ok(session(".claude/settings.json", "SessionStart").some((c) => c.endsWith('.claude/hooks/serve-welcome.mjs"')));
  assert.ok(session("../gemini/.gemini/settings.json", "SessionStart").some((c) => c.includes(".claude/hooks/serve-welcome.mjs")));
  assert.ok(session("../codex/.codex/hooks.json", "SessionStart").some((c) => c.endsWith('.claude/hooks/serve-welcome.mjs"')));
  assert.ok(session(COPILOT, "sessionStart").some((c) => c.endsWith(".claude/hooks/serve-welcome.mjs copilot")));
  assert.equal(readFileSync(join(HOOKS, "serve-welcome.mjs"), "utf8").includes('"additionalContext":'), false);
});
