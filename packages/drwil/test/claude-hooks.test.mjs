// Hooks Claude livrés (gabarit `.claude/hooks/`) : un test du chemin principal de chacun, mesurés par
// `npm run test:claude:coverage` (QUA-004). Les copies installées sont les mêmes fichiers (scopeMirrors).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  assert.equal(p.mergeAuthorised(claude, poll), true);
  assert.equal(p.worktreeChosen(claude, poll), true);
  assert.equal(p.parallelChosen(claude, poll), true);
  assert.equal(p.mergeAuthorised({}, { form: "claude", mergeQuestion: null }), false);
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
  assert.equal(p.mergeAuthorised(copilot, cp), true);
  assert.equal(p.worktreeChosen(copilot, cp), false);
  assert.equal(p.parallelChosen(copilot, cp), true);
  const simple = {
    tool_input: { message: "drwil-start", requestedSchema: { properties: { fiche: { enum: ["a"], default: "a" } } } },
    tool_result: { text_result_for_llm: "User responded: a" },
  };
  const sp = p.startPoll(simple);
  assert.equal(sp.prefilled, true);
  assert.equal(p.humanAnswer(simple, sp), "a");
  assert.equal(p.mergeAuthorised(simple, sp), false);
  assert.equal(p.humanAnswer({}, sp), null);
  assert.equal(p.humanAnswer({ tool_result: { text_result_for_llm: "User responded: []" } }, { ...sp, multiple: true }), null);
  assert.equal(
    p.humanAnswer(
      { tool_result: { text_result_for_llm: "User responded: x=1" } },
      { ...sp, mergeKey: "m", keys: ["fiche", "m"], fieldKey: "fiche" },
    ),
    null,
  );
  assert.equal(p.startPoll({ tool_input: { message: "drwil-start" } }).options.length, 0);
  assert.equal(p.NOT_NOW_RE.test("Pas maintenant"), true);
});

test("start-poll : sondage de fin de cadrage (QUA-187), valide ou non, et réponse lue", async () => {
  const p = await load("start-poll.mjs");
  const trois = ["Automatic merge", "Manual merge", "Continue scoping"];
  const claude = (labels, extra = {}) => ({
    tool_input: { questions: [{ header: "drwil-scope", question: "Q", options: labels.map((label) => ({ label })), ...extra }] },
  });
  const poll = p.scopePoll(claude(trois));
  assert.equal(p.scopePollValid(poll), true);
  assert.equal(p.scopePollValid(p.scopePoll(claude(trois.slice(1)))), false);
  assert.equal(p.scopePollValid(p.scopePoll(claude(["Automatic merge (Recommended)", ...trois.slice(1)]))), false);
  assert.equal(p.scopePollValid(p.scopePoll(claude(trois, { multiSelect: true }))), false);
  assert.equal(p.scopeChoice({ tool_response: { answers: { Q: "Manual merge" } } }, poll), "manual");
  assert.equal(p.scopeChoice({ tool_response: { answers: { Q: "?" } } }, poll), null);
  assert.equal(p.scopePoll({ tool_input: { questions: [{ header: "x" }] } }), null);
  assert.equal(p.scopePoll({ tool_input: { message: "autre" } }), null);
  const copilot = {
    tool_input: { message: "drwil-scope", requestedSchema: { properties: { "drwil-scope": { enum: trois } } } },
    tool_result: { text_result_for_llm: "User responded: drwil-scope=Continue scoping" },
  };
  const cp = p.scopePoll(copilot);
  assert.equal(p.scopePollValid(cp), true);
  assert.equal(p.scopeChoice(copilot, cp), "continue");
  assert.equal(p.scopeChoice({}, cp), null);
  assert.equal(p.scopePoll({ tool_input: { message: "drwil-scope" } }).answers.length, 0);
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
  assert.equal(run("prompt-hook.mjs", fin("PreToolUse")).status, 0);
  const refuse = run("prompt-hook.mjs", fin("PreToolUse", trois.slice(1)));
  assert.equal(refuse.status, 2);
  assert.match(refuse.stderr, /fin de cadrage refusé/);
  assert.match(contexte(fin("PostToolUse", trois, {})), /aucune réponse lue/);
  assert.match(contexte(fin("PostToolUse", trois, { S: "Manual merge" })), /erreur à la lecture/);
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
export const draftFinish = (r, o) => ({ code: 0, message: "fin " + o.autoMerge });
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
    "✓ fin true",
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

test("merge-poll : sondage de fusion autonome lu sous les deux formes ; refusé s'il est rempli, recommandé ou mal formé (QUA-265)", async () => {
  const m = await load("merge-poll.mjs");
  // Le module d'état est simulé : seul le hook est mesuré ici (le vrai est éprouvé par les tests de l'état).
  const racine = projet(
    {},
    {
      ".githooks/state-merge.mjs": `export const mergeChoice = (l) => ({ "Automatic merge": "auto", "Manual merge": "manual" })[String(l ?? "").trim()] ?? null;
export const recordMerge = (r, c) => ({ code: r.includes("refus") ? 1 : 0, message: "fusion=" + c });
`,
    },
  );
  const dit = [];
  const ctx = (lang = "fr", root = racine) => ({ root, lang, tell: (t) => dit.push(t) });
  const Q = "Fusion de la PR ?";
  const q = (extra = {}) => ({
    header: "drwil-merge",
    question: Q,
    options: [{ label: "Automatic merge" }, { label: "Manual merge" }],
    ...extra,
  });
  const claude = (questions, answers, reponses = {}) => ({ tool_input: { questions, answers }, tool_response: { answers: reponses } });
  const avant = (input, lang) => m.mergeHook({ hook_event_name: "PreToolUse", ...input }, ctx(lang));
  const post = (input, lang, root) => m.mergeHook({ hook_event_name: "PostToolUse", ...input }, ctx(lang, root));
  assert.equal(await m.mergeHook({ tool_input: { questions: [{ header: "x" }] } }, ctx()), null);
  assert.equal(await m.mergeHook({ tool_input: { message: "autre" } }, ctx()), null);
  assert.equal(await m.mergeHook({}, ctx()), null);
  assert.equal(await avant(claude([q()])), 0);
  for (const refus of [
    claude([q()], { [Q]: "Automatic merge" }),
    claude([q({ multiSelect: true })]),
    claude([q({ options: [{ label: "Automatic merge (Recommended)" }, { label: "Manual merge" }] })]),
    claude([q({ options: [{ label: "Automatic merge" }, { label: "Manual merge", description: "(recommandée)" }] })]),
    claude([q({ options: undefined })]),
    claude([q(), { header: "autre", question: "?" }]),
  ])
    assert.equal(await avant(refus), 2);
  assert.equal(await avant(claude([q({ options: [{ label: "Automatic merge" }] })]), "en"), 2);
  assert.equal(await m.mergeHook({ hook_event_name: "Autre", ...claude([q()]) }, ctx()), 0);

  const copilot = (props, text = "User responded: drwil-merge=Automatic merge") => ({
    tool_input: { message: "drwil-merge : fusion ?", requestedSchema: props === undefined ? undefined : { properties: props } },
    tool_result: { text_result_for_llm: text },
  });
  const champ = { type: "string", enum: ["Automatic merge", "Manual merge"] };
  assert.equal(await avant(copilot({ "drwil-merge": champ })), 0);
  for (const refus of [
    { "drwil-merge": { ...champ, default: "Manual merge" } },
    { "drwil-merge": { type: "array", items: champ, enum: champ.enum } },
    { "drwil-merge": { ...champ, enum: ["Automatic merge (Recommended)", "Manual merge"] } },
    { "drwil-merge": champ, autre: champ },
    { autre: champ },
    undefined,
  ])
    assert.equal(await avant(copilot(refus)), 2);

  await post(claude([q()], undefined, { [Q]: "Automatic merge" }));
  await post(claude([q()], undefined, { [Q]: "Manual merge" }));
  await post(claude([q()]));
  await post(copilot({ "drwil-merge": champ }));
  await post(copilot({ "drwil-merge": champ }, "User responded: Manual merge"));
  await post(copilot({ "drwil-merge": champ }, "pas de réponse"));
  await post(claude([q()]), "en");
  const refusRacine = projet(
    {},
    {
      ".githooks/state-merge.mjs":
        "export const mergeChoice = () => 'auto'; export const recordMerge = () => ({ code: 1, message: 'non' });\n",
    },
  );
  await post(claude([q()], undefined, { [Q]: "Automatic merge" }), "fr", refusRacine);
  assert.deepEqual(dit, [
    "✓ fusion=auto",
    "✓ fusion=manual",
    "✗ aucune réponse lue dans le sondage de fusion : rien n'est autorisé, l'état est inchangé.",
    "✓ fusion=auto",
    "✓ fusion=manual",
    "✗ aucune réponse lue dans le sondage de fusion : rien n'est autorisé, l'état est inchangé.",
    "✗ no answer read in the merge poll: nothing authorised, the state is unchanged.",
    "✗ non",
  ]);
  // Module d'état absent : jamais bloquant avant le sondage, l'erreur dite après.
  const sansEtat = projet();
  assert.equal(await m.mergeHook({ hook_event_name: "PreToolUse", ...claude([q()]) }, ctx("fr", sansEtat)), 0);
  await post(claude([q()]), "en", sansEtat);
  assert.match(dit.at(-1), /^✗ error while reading the merge poll/);
  await post(claude([q()]), "fr", sansEtat);
  assert.match(dit.at(-1), /^✗ erreur à la lecture du sondage de fusion/);
  for (const d of [racine, sansEtat, refusRacine]) rmSync(d, { recursive: true, force: true });
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
