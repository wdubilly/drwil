// QUA-266 : sondages des limites et de fusion hors Claude Code, rejoués par la vraie commande de chaque outil
// (hooks installés par `init`), avec des entrées fictives au format documenté de l'outil ; aucun essai interactif réel.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { init } from "../dist/index.js";
import { crochetCursor } from "../dist/cli-cursor.js";
import { SessionCursor } from "../dist/cursor-acp-session.js";
import { portableMain, portablePollHook } from "../templates/common/tools/claude/.claude/hooks/portable-polls.mjs";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const FICHE = "docs/projects/exemple.md";
const LIMITE = "docs/intentions/sondes.md";
const AUTRE = "docs/intentions/autre-limite.md";
const actif = { version: 1, activity: "BUILD", active_brief: FICHE, active_request: null, since: "2026-11-07T10:00:00Z" };

/** Projet installé par `init` pour `tool`, sur une branche de chantier en BUILD. */
async function projet(tool, lang = "fr") {
  const root = realpathSync(mkdtempSync(join(tmpdir(), `drwil-sondages-${tool}-`)));
  const log = console.log;
  const warn = console.warn;
  try {
    console.log = console.warn = () => {};
    await init({ targetDir: root, lang, tools: tool, git: false });
  } finally {
    console.log = log;
    console.warn = warn;
  }
  mkdirSync(join(root, "docs/projects"), { recursive: true });
  writeFileSync(join(root, FICHE), "# Projet : Exemple\n");
  const git = (...a) =>
    spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "core.hooksPath=/dev/null", ...a], { cwd: root });
  git("init", "-q", "-b", "master");
  git("commit", "-q", "--allow-empty", "-m", "init");
  git("checkout", "-q", "-b", "workstream/exemple");
  writeFileSync(join(root, ".drwil/state.json"), JSON.stringify(actif));
  const etat = () => JSON.parse(readFileSync(join(root, ".drwil/state.json"), "utf8"));
  return { root, etat, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

/** La commande que l'outil lance, lue dans sa configuration installée, jouée par le shell avec l'entrée `event`. */
function commande(root, tool, pre) {
  if (tool === "codex") {
    const c = JSON.parse(readFileSync(join(root, ".codex/hooks.json"), "utf8")).hooks[pre ? "PreToolUse" : "PostToolUse"];
    return c.find((g) => new RegExp(g.matcher).test("request_user_input")).hooks[0].command;
  }
  if (tool === "gemini") {
    const c = JSON.parse(readFileSync(join(root, ".gemini/settings.json"), "utf8")).hooks[pre ? "BeforeTool" : "AfterTool"];
    return c.find((g) => new RegExp(g.matcher).test("ask_user")).hooks[0].command;
  }
  if (tool === "copilot")
    return JSON.parse(readFileSync(join(root, ".github/hooks/drwil.json"), "utf8")).hooks[pre ? "preToolUse" : "postToolUse"][0].bash;
  // Copilot CLI lit aussi les réglages de Claude Code : le hook des sondages sans argument.
  const c = JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8")).hooks[pre ? "PreToolUse" : "PostToolUse"];
  return c.find((g) => g.matcher === "AskUserQuestion").hooks[0].command;
}
/**
 * Le module du gabarit, appelé dans ce processus (couverture), puis la vraie commande de l'outil : même code, même
 * sortie. Le second passage réécrit la même réponse, l'état ne change pas entre les deux.
 */
async function lancer(root, tool, pre, event) {
  let code = null;
  if (tool !== "claude") {
    const sorties = [];
    const [log, error] = [console.log, console.error];
    console.log = console.error = (m) => sorties.push(m);
    try {
      code = await portableMain({ root, tool, phase: pre ? "pre" : "post", raw: JSON.stringify(event) });
    } finally {
      [console.log, console.error] = [log, error];
    }
  }
  const env = { ...process.env, GEMINI_PROJECT_DIR: root, CLAUDE_PROJECT_DIR: root };
  const cmd = commande(root, tool, pre);
  const options = { cwd: root, input: JSON.stringify(event), encoding: "utf8", env };
  // Comme portable-attest.test.mjs : sous Windows, l'entrée déclarée est lancée sans faire passer Bash pour cmd.exe.
  const entree = cmd.match(/(\.claude\/hooks\/prompt-hook\.mjs)"?((?:\s+(?:copilot|gemini|codex|pre|post)\b)*)/);
  assert.ok(entree, cmd);
  const r =
    process.platform === "win32"
      ? spawnSync(process.execPath, [join(root, entree[1]), ...entree[2].split(/\s+/).filter(Boolean)], options)
      : spawnSync(cmd, { ...options, shell: true });
  if (code !== null) assert.equal(r.status, code, "même code dans ce processus et par la commande de l'outil");
  return { ...r, contexte: r.stdout ? JSON.stringify(JSON.parse(r.stdout)) : "" };
}

const OPTIONS = {
  limite: [
    { label: "Traiter maintenant", description: "cadrage élargi sur ce oui" },
    { label: "Noter en intention", description: "fiche d'intention écrite" },
  ],
  merge: [
    { label: "Automatic merge", description: "programmée une fois la CI verte" },
    { label: "Manual merge", description: "geste humain" },
  ],
};
const texte = (chemin) => `Limite : sondes absentes. Fichiers : src/a.mjs. Deviendrait \`${chemin}\`. Que faire ?`;
/** Questions natives (Gemini, Codex) d'un sondage : en-tête, texte, réponses. */
const natives = (tool, liste) =>
  liste.map(([header, question, options], i) => ({
    ...(tool === "codex" ? { id: `q${i}` } : { type: "choice" }),
    header,
    question,
    options,
  }));
const limite = (tool, ...chemins) => ({
  questions: natives(
    tool,
    (chemins.length ? chemins : [LIMITE]).map((c) => ["drwil-limite", texte(c), OPTIONS.limite]),
  ),
});
const fusion = (tool) => ({ questions: natives(tool, [["drwil-merge", "Fusion de la PR de ce chantier ?", OPTIONS.merge]]) });
/** Événement avant / après, au format de l'outil ; `reponses` : libellés dans l'ordre des questions. */
function avant(tool, args) {
  return tool === "codex"
    ? { session_id: "s", tool_name: "request_user_input", tool_use_id: "appel", hook_event_name: "PreToolUse", tool_input: args }
    : { session_id: "s", tool_name: "ask_user", hook_event_name: "BeforeTool", tool_input: args };
}
function apres(tool, args, reponses) {
  const ids = args.questions.map((q, i) => (tool === "codex" ? q.id : String(i)));
  if (tool === "codex")
    return {
      ...avant(tool, args),
      hook_event_name: "PostToolUse",
      tool_response: JSON.stringify({ answers: Object.fromEntries(reponses.map((r, i) => [ids[i], { answers: r === null ? [] : [r] }])) }),
    };
  return {
    ...avant(tool, args),
    hook_event_name: "AfterTool",
    tool_response: { llmContent: JSON.stringify({ answers: Object.fromEntries(reponses.map((r, i) => [ids[i], r])) }) },
  };
}

for (const tool of ["gemini", "codex"]) {
  test(`QUA-266 : ${tool}, la commande installée lit la réponse humaine aux sondages drwil-limite et drwil-merge`, async () => {
    const p = await projet(tool);
    try {
      assert.equal((await lancer(p.root, tool, true, avant(tool, limite(tool)))).status, 0, "sondage conforme : posé");
      let r = await lancer(p.root, tool, false, apres(tool, limite(tool), ["Noter en intention"]));
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.contexte, /\[drwil\] ✓ .*docs\/intentions\/sondes\.md → « Noter en intention »/);
      if (tool === "codex") assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, "PostToolUse");
      assert.deepEqual(p.etat().limits, [{ intent: LIMITE, choice: "note" }]);
      // Deux limites, une seule répondue : la réponse lue est enregistrée, l'autre dite à soumettre de nouveau.
      r = await lancer(p.root, tool, false, apres(tool, limite(tool, LIMITE, AUTRE), ["Traiter maintenant", null]));
      assert.match(r.contexte, /« Traiter maintenant ».*à soumettre de nouveau : docs\/intentions\/autre-limite\.md/);
      assert.deepEqual(p.etat().limits, [{ intent: LIMITE, choice: "now" }]);
      assert.equal((await lancer(p.root, tool, true, avant(tool, fusion(tool)))).status, 0);
      r = await lancer(p.root, tool, false, apres(tool, fusion(tool), ["Automatic merge"]));
      assert.match(r.contexte, /✓ fusion automatique autorisée par l'humain/);
      assert.equal(p.etat().auto_merge, true);
      await lancer(p.root, tool, false, apres(tool, fusion(tool), ["Manual merge"]));
      assert.equal(p.etat().auto_merge, undefined);
      // Sans réponse lue (résultat illisible, en erreur, réponse libre ou double) : rien n'est écrit.
      const avantEtat = JSON.stringify(p.etat());
      const sans = [
        { ...apres(tool, fusion(tool), ["Automatic merge"]), tool_response: tool === "codex" ? "pas du json" : { error: "annulé" } },
        apres(tool, fusion(tool), ["Je ne sais pas"]),
        tool === "codex"
          ? {
              ...apres(tool, fusion(tool), []),
              tool_response: JSON.stringify({ answers: { q0: { answers: ["Automatic merge", "Manual merge"] } } }),
            }
          : { ...apres(tool, fusion(tool), []), tool_response: {} },
      ];
      for (const e of sans) assert.match((await lancer(p.root, tool, false, e)).contexte, /✗ aucune réponse lue dans le sondage de fusion/);
      assert.equal(JSON.stringify(p.etat()), avantEtat);
    } finally {
      p.dispose();
    }
  });

  test(`QUA-266 : ${tool}, la commande installée refuse avant affichage un sondage rempli, par défaut, recommandé ou multiple`, async () => {
    const p = await projet(tool);
    const en = await projet(tool, "en");
    try {
      const q = limite(tool).questions[0];
      const refuses = {
        "réponse remplie": { ...limite(tool), answers: { 0: "Noter en intention" } },
        "valeur par défaut": { questions: [{ ...q, default: "Noter en intention" }] },
        recommandée: { questions: [{ ...q, options: [{ label: "Traiter maintenant (Recommandé)" }, q.options[1]] }] },
        "choix multiple": { questions: [{ ...q, multiSelect: true }] },
        "autre réponse": { questions: [{ ...q, options: [q.options[0], { label: "Plus tard" }] }] },
        "sans chemin d'intention": { questions: [{ ...q, question: "Que faire ?" }] },
        "options illisibles": { questions: [{ ...q, options: ["Traiter maintenant", null] }] },
      };
      if (tool === "gemini") refuses["question texte"] = { questions: [{ ...q, type: "text" }] };
      for (const [cas, args] of Object.entries(refuses)) {
        const r = await lancer(p.root, tool, true, avant(tool, args));
        assert.equal(r.status, 2, cas);
        assert.match(r.stderr, /sondage des limites refusé/, cas);
      }
      const m = fusion(tool).questions[0];
      const r = await lancer(
        p.root,
        tool,
        true,
        avant(tool, { questions: [{ ...m, options: [{ label: "Automatic merge (Recommended)" }, m.options[1]] }] }),
      );
      assert.equal(r.status, 2);
      assert.match(r.stderr, /sondage de fusion refusé/);
      assert.match(
        (await lancer(en.root, tool, true, avant(tool, { questions: [{ ...q, multiSelect: true }] }))).stderr,
        /limits poll refused/,
      );
      // Une entrée illisible n'est pas un sondage : l'attestation la refuse, comme avant.
      const error = console.error;
      console.error = () => {};
      try {
        assert.equal(await portableMain({ root: p.root, tool, phase: "pre", raw: "pas du json" }), 2);
      } finally {
        console.error = error;
      }
      // Une question étrangère, une question nulle ou un événement inconnu passent sans rien changer.
      const avantEtat = JSON.stringify(p.etat());
      for (const args of [{ questions: [{ ...q, header: "autre" }] }, { questions: [null] }, {}])
        assert.equal((await lancer(p.root, tool, true, avant(tool, args))).status, 0);
      assert.equal((await lancer(p.root, tool, true, { ...avant(tool, limite(tool)), hook_event_name: "Notification" })).status, 0);
      assert.equal(JSON.stringify(p.etat()), avantEtat);
    } finally {
      p.dispose();
      en.dispose();
    }
  });
}

test("QUA-266 : copilot, les sondages passent par .claude/settings.json ; l'entrée native n'y touche pas", async () => {
  const p = await projet("copilot");
  try {
    const sondage = {
      message: `drwil-limite : que faire de chaque limite hors cadre ?`,
      requestedSchema: { properties: { [LIMITE]: { type: "string", enum: ["Traiter maintenant", "Noter en intention"] } } },
    };
    const fusionCopilot = {
      message: "drwil-merge : fusion de la PR de ce chantier ?",
      requestedSchema: { properties: { "drwil-merge": { type: "string", enum: ["Automatic merge", "Manual merge"] } } },
    };
    // Format des hooks de Claude Code relus par Copilot CLI (noms en snake_case).
    const claude = (pre, args, reponse) => ({
      hook_event_name: pre ? "PreToolUse" : "PostToolUse",
      tool_name: "ask_user",
      tool_input: args,
      ...(pre ? {} : { tool_result: { result_type: "success", text_result_for_llm: `User responded: ${reponse}` } }),
    });
    // Format natif de Copilot CLI (.github/hooks/drwil.json).
    const natif = (pre, args, reponse) => ({
      sessionId: "s",
      toolName: "ask_user",
      toolArgs: args,
      ...(pre ? {} : { toolResult: { resultType: "success", textResultForLlm: `User responded: ${reponse}` } }),
    });
    for (const [args, reponse] of [
      [sondage, "Noter en intention"],
      [fusionCopilot, "Automatic merge"],
    ]) {
      const n = await lancer(p.root, "copilot", true, natif(true, args));
      assert.equal(n.status, 0);
      assert.equal(n.stdout, "", "l'entrée native ne lit que l'attestation");
      assert.equal((await lancer(p.root, "copilot", false, natif(false, args, reponse))).stdout, "");
      assert.equal(p.etat().limits, undefined, "rien d'enregistré par l'entrée native");
      assert.equal((await lancer(p.root, "claude", true, claude(true, args))).status, 0);
    }
    assert.match(
      (await lancer(p.root, "claude", false, claude(false, sondage, "Noter en intention"))).contexte,
      /✓ .*« Noter en intention »/,
    );
    assert.deepEqual(p.etat().limits, [{ intent: LIMITE, choice: "note" }]);
    await lancer(p.root, "claude", false, claude(false, fusionCopilot, "Automatic merge"));
    assert.equal(p.etat().auto_merge, true);
    const prerempli = {
      ...sondage,
      requestedSchema: {
        properties: { [LIMITE]: { type: "string", enum: ["Traiter maintenant", "Noter en intention"], default: "Noter en intention" } },
      },
    };
    const r = await lancer(p.root, "claude", true, claude(true, prerempli));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /sondage des limites refusé/);
  } finally {
    p.dispose();
  }
});

// Serveur ACP local fictif (voir cursor-acp.test.mjs) : il pose la question `poll`, puis clôt le tour.
const SERVEUR = `
import readline from "node:readline";
const poll = JSON.parse(process.argv[1]);
const send = m => process.stdout.write(JSON.stringify({jsonrpc:"2.0", ...m})+"\\n");
let prompt;
readline.createInterface({input:process.stdin}).on("line", line => {
 const m = JSON.parse(line);
 if (m.method === "initialize") send({id:m.id,result:{protocolVersion:1}});
 else if (m.method === "authenticate") send({id:m.id,result:{}});
 else if (m.method === "session/new") send({id:m.id,result:{sessionId:"session-fictive"}});
 else if (m.method === "session/prompt") { prompt=m.id; send({id:"question-0",method:"cursor/ask_question",params:poll}); }
 else if (m.id === "question-0") send({id:prompt,result:{stopReason:"end_turn"}});
});
`;
async function cursor(p, poll, choisir) {
  const messages = [];
  const child = spawn(process.execPath, ["--input-type=module", "-e", SERVEUR, JSON.stringify(poll)], { stdio: "pipe" });
  const s = new SessionCursor(
    child,
    p.root,
    { choisir, afficher: (m) => messages.push(m), interrompre: () => {} },
    await crochetCursor(p.root),
    5000,
  );
  try {
    await s.initialiser();
    await s.envoyer("Question fictive locale.").catch((e) => messages.push(`erreur : ${e.message}`));
  } finally {
    await s.transport.fermer();
  }
  return messages.join("\n");
}
const acp = (title, prompt, labels) => ({
  toolCallId: "appel",
  title,
  questions: [{ id: "q", prompt, allowMultiple: false, options: labels.map((label, i) => ({ id: `o${i}`, label })) }],
});

test("QUA-266 : cursor, le client ACP dédié lit la réponse humaine aux sondages drwil-limite et drwil-merge", async () => {
  const p = await projet("cursor");
  try {
    let vu = "";
    let m = await cursor(p, acp("drwil-limite", texte(LIMITE), ["Traiter maintenant", "Noter en intention"]), async (t, choix) => {
      vu = t;
      return choix[1].id;
    });
    assert.match(vu, /^drwil-limite\nLimite : sondes absentes/);
    assert.match(m, /✓ .*« Noter en intention »/);
    assert.deepEqual(p.etat().limits, [{ intent: LIMITE, choice: "note" }]);
    await cursor(p, acp("drwil-merge", "Fusion de la PR ?", ["Automatic merge", "Manual merge"]), async (_, choix) => choix[0].id);
    assert.equal(p.etat().auto_merge, true);
    // Abandon : rien n'est lu ; sondage recommandé : refusé avant affichage.
    m = await cursor(p, acp("drwil-merge", "Fusion de la PR ?", ["Automatic merge", "Manual merge"]), async () => null);
    assert.match(m, /✗ aucune réponse lue dans le sondage de fusion/);
    assert.equal(p.etat().auto_merge, true);
    const multiple = acp("drwil-limite", texte(AUTRE), ["Traiter maintenant", "Noter en intention"]);
    multiple.questions[0].allowMultiple = true;
    let affiche = false;
    for (const refuse of [acp("drwil-merge", "Fusion ?", ["Automatic merge (Recommended)", "Manual merge"]), multiple])
      await cursor(p, refuse, async () => {
        affiche = true;
        return "o0";
      });
    assert.equal(affiche, false, "refusés avant affichage");
    assert.equal(p.etat().auto_merge, true);
    assert.deepEqual(p.etat().limits, [{ intent: LIMITE, choice: "note" }]);
    // Le crochet lu par le client, et le module du gabarit qu'il charge : réponse étrangère, double ou absente,
    // rien d'enregistré.
    const gabarit = (e, o) => portablePollHook(e, o);
    const installe = await crochetCursor(p.root);
    const crochet = async (e, o) => {
      const attendu = await gabarit(e, o);
      assert.equal(await installe(e, o), attendu);
      return attendu;
    };
    const ctx = (phase) => ({ root: p.root, tool: "cursor", phase, tell: () => {}, isActive: () => true });
    const params = acp("drwil-limite", texte(AUTRE), ["Traiter maintenant", "Noter en intention"]);
    for (const response of [
      { outcome: { outcome: "answered", answers: [{ questionId: "autre", selectedOptionIds: ["o0"] }] } },
      { outcome: { outcome: "answered", answers: [{ questionId: "q", selectedOptionIds: ["o0", "o1"] }] } },
      { outcome: { outcome: "cancelled" } },
      null,
    ])
      assert.equal(await crochet({ sessionId: "s", params, response }, ctx("post")), 0);
    assert.deepEqual(p.etat().limits, [{ intent: LIMITE, choice: "note" }]);
    const choisi = { outcome: { outcome: "answered", answers: [{ questionId: "q", selectedOptionIds: ["o0"] }] } };
    assert.equal(await crochet({ sessionId: "s", params, response: choisi }, ctx("post")), 0);
    assert.deepEqual(p.etat().limits, [
      { intent: LIMITE, choice: "note" },
      { intent: AUTRE, choice: "now" },
    ]);
    assert.equal(
      await crochet({ sessionId: "s", params: acp("autre", "Question ?", ["Oui", "Non"]) }, ctx("pre")),
      null,
      "question ordinaire",
    );
    assert.equal(await crochet({ sessionId: "s", params: { questions: [null] } }, ctx("pre")), null);
    assert.equal(await gabarit({ sessionId: "s", params }, { ...ctx("pre"), phase: "autre" }), null, "phase inconnue");
    assert.equal(await gabarit({ sessionId: "s", params }, ctx("pre")), 0, "sondage conforme : posé");
    assert.equal(
      await gabarit({ sessionId: "s", params }, { ...ctx("pre"), tool: "copilot" }),
      null,
      "Copilot : par .claude/settings.json",
    );
    // Racine sans configuration ni hooks : langue par défaut, et une erreur de hook ne bloque jamais.
    assert.equal(await gabarit({ sessionId: "s", params }, { ...ctx("pre"), root: join(p.root, "absent") }), 0);
  } finally {
    p.dispose();
  }
  // Hooks antérieurs aux sondages portables : le client garde l'attestation seule.
  const ancien = await projet("cursor");
  try {
    rmSync(join(ancien.root, ".claude/hooks/portable-polls.mjs"));
    const params = acp("drwil-limite", texte(LIMITE), ["Traiter maintenant", "Noter en intention"]);
    const options = { root: ancien.root, tool: "cursor", phase: "pre", tell: () => {}, isActive: () => true };
    assert.equal(await (await crochetCursor(ancien.root))({ sessionId: "s", params }, options), null);
  } finally {
    ancien.dispose();
  }
});
