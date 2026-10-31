// Hooks Claude livrés (gabarit `.claude/hooks/`) : un test du chemin principal de chacun, mesurés par
// `npm run test:claude:coverage` (QUA-004). Les copies installées sont les mêmes fichiers (scopeMirrors).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const HOOKS = fileURLToPath(new URL("../templates/common/tools/claude/.claude/hooks/", import.meta.url));
const GITHOOKS = fileURLToPath(new URL("../../../.githooks/", import.meta.url));
const load = (name) => import(pathToFileURL(join(HOOKS, name)).href);

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
