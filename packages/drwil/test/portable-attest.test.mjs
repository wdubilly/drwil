// Événements entièrement fictifs, aux formats documentés ; aucun essai interactif réel.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, mock } from "node:test";
import { fileURLToPath } from "node:url";
import { init, preparePortableAttestationPoll, prepareAttestationPoll, formatPortableAttestationPoll, verify } from "../dist/index.js";
import { portableAttestationHook, portableAttestationMain } from "../templates/common/tools/claude/.claude/hooks/portable-attest.mjs";
import { nativeAttestationEvent, portableIdentity, serialise } from "../templates/common/tools/claude/.claude/hooks/attest-adapters.mjs";

const CLI = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
const hash = (v) => createHash("sha256").update(serialise(v)).digest("hex");

async function projet(tool, lang = "fr") {
  mkdirSync(".drwil/evidence", { recursive: true });
  const root = mkdtempSync(".drwil/evidence/portable-test-");
  const log = console.log;
  const warn = console.warn;
  try {
    console.log = console.warn = () => {};
    await init({ targetDir: root, lang, tools: tool, git: false });
  } finally {
    console.log = log;
    console.warn = warn;
  }
  if (tool === "codex") assert.equal(spawnSync("git", ["init", "-q"], { cwd: root }).status, 0);
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src/objet.js"), "export const valeur = 1;\n");
  const registry = join(root, "docs/contracts.md");
  writeFileSync(
    registry,
    `${readFileSync(registry, "utf8")}\n## APP-009 — Jugement fictif\n**Règle** : règle fictive.\n**Manuel** : lisibilité fictive.\n**Couvre** : \`src/**\`\n`,
  );
  const output = [];
  const prepare = async (extra = {}) => {
    const r = await preparePortableAttestationPoll({ targetDir: root, tool, id: "APP-009", tried: "Essai fictif.", ...extra });
    assert.equal(r.code, 0, r.message);
    return r.poll;
  };
  const before = (args, session = "session-fictive", extra = {}) =>
    tool === "copilot"
      ? { sessionId: session, toolName: "ask_user", toolArgs: args, timestamp: Date.now(), cwd: root, ...extra }
      : {
          session_id: session,
          tool_name: tool === "codex" ? "request_user_input" : "ask_user",
          tool_input: args,
          hook_event_name: tool === "codex" ? "PreToolUse" : "BeforeTool",
          ...(tool === "codex" ? { tool_use_id: "appel-fictif", turn_id: "tour-fictif", permission_mode: "plan" } : {}),
          timestamp: new Date().toISOString(),
          cwd: root,
          ...extra,
        };
  const after = (event, answer = lang === "fr" ? "Attester" : "Attest") =>
    tool === "copilot"
      ? { ...event, toolResult: { resultType: "success", textResultForLlm: `User responded: ${answer}` } }
      : {
          ...event,
          hook_event_name: tool === "codex" ? "PostToolUse" : "AfterTool",
          tool_response:
            tool === "codex"
              ? JSON.stringify({ answers: { drwil_attest: { answers: [answer] } } })
              : { llmContent: JSON.stringify({ answers: { 0: answer } }), returnDisplay: "Réponse fictive" },
        };
  const hook = (event, phase = "pre") => portableAttestationHook(event, { root, tool, phase, tell: (s) => output.push(s) });
  const contract = async () => (await verify({ targetDir: root, only: ["APP-009"] })).contracts[0];
  const files = () => readdirSync(join(root, ".drwil/evidence/attestations")).filter((f) => f.startsWith("APP-009"));
  const dir = join(root, ".drwil/evidence/attest-polls/portable");
  const pending = () => join(dir, hash("session-fictive"), "pending.json");
  const dispose = () => rmSync(root, { recursive: true, force: true });
  return { root, registry, prepare, before, after, hook, contract, files, pending, output, dispose };
}

for (const tool of ["copilot", "gemini", "codex"]) {
  test(`QUA-235 : ${tool}, préparation CLI native et hooks réellement installés, sur projet fictif seulement`, async () => {
    const p = await projet(tool);
    try {
      const r = spawnSync(process.execPath, [CLI, "attest-poll", "APP-009", "--tool", tool, "--tried", "Essai fictif."], {
        cwd: p.root,
        encoding: "utf8",
      });
      assert.equal(r.status, 0, r.stderr);
      const args = JSON.parse(r.stdout);
      assert.equal((await p.contract()).status, "MANUAL", "préparer n'atteste pas");
      const other = await p.prepare();
      assert.notEqual(portableIdentity(args).nonce, portableIdentity(other).nonce);
      const config = JSON.parse(
        readFileSync(
          join(p.root, tool === "copilot" ? ".github/hooks/drwil.json" : tool === "codex" ? ".codex/hooks.json" : ".gemini/settings.json"),
          "utf8",
        ),
      );
      const command = (pre) =>
        tool === "copilot"
          ? config.hooks[pre ? "preToolUse" : "postToolUse"][0].bash
          : tool === "codex"
            ? config.hooks[pre ? "PreToolUse" : "PostToolUse"].find((g) => new RegExp(g.matcher).test("request_user_input")).hooks[0]
                .command
            : config.hooks[pre ? "BeforeTool" : "AfterTool"].find((g) => new RegExp(g.matcher).test("ask_user")).hooks[0].command;
      const invoke = (event, pre, failure = false) => {
        const cmd = failure ? config.hooks.postToolUseFailure[0].bash : command(pre);
        const options = {
          cwd: p.root,
          input: JSON.stringify(event),
          encoding: "utf8",
          env: { ...process.env, GEMINI_PROJECT_DIR: process.cwd() + "/" + p.root },
        };
        if (process.platform === "win32") {
          // Le banc teste l'entrée déclarée sans faire passer Bash pour cmd.exe.
          const entry = cmd.match(/(\.claude\/hooks\/prompt-hook\.mjs)"?\s+(copilot|gemini|codex)(?:\s+(pre|post))?/);
          assert.ok(entry, cmd);
          return spawnSync(process.execPath, [join(process.cwd(), p.root, entry[1]), ...entry.slice(2).filter(Boolean)], options);
        }
        return spawnSync(cmd, { ...options, shell: true });
      };
      const event = p.before(args);
      if (tool === "codex") {
        assert.ok(new RegExp(config.hooks.PreToolUse[0].matcher).test("Bash"));
        assert.equal(
          invoke({ ...event, tool_name: "Bash", tool_input: { command: "node .claude/hooks/prompt-hook.mjs codex" } }, true).status,
          2,
          "l'agent ne peut pas appeler directement l'entrée de confirmation",
        );
        assert.equal(invoke({ ...event, tool_name: "Bash", tool_input: { command: "git status --short" } }, true).status, 0);
      }
      assert.equal(invoke(event, true).status, 0);
      assert.equal((await p.contract()).status, "MANUAL");
      const response = invoke(p.after(event), false);
      assert.equal(response.status, 0, response.stderr);
      assert.match(response.stdout, /APP-009 attesté/);
      const k = await p.contract();
      assert.equal(k.status, "ATTESTED");
      assert.equal(k.attestation.version, 4);
      assert.equal(k.attestation.origin.source, `${tool}-poll`);
      assert.equal(k.attestation.origin.sessionId, "session-fictive");
      assert.equal(k.attestation.origin.nonce, portableIdentity(args).nonce);
      assert.equal(k.attestation.origin.pollHash, hash(args));
      assert.equal(k.attestation.origin.toolUseId, tool === "codex" ? "appel-fictif" : undefined, "ID natif seulement s'il est fourni");
      assert.ok(Date.parse(k.attestation.origin.askedAt));
      assert.equal(invoke(p.after(event), false).status, 0);
      assert.equal(p.files().length, 1, "rejeu du retour refusé");
      const rearm = invoke(event, true);
      assert.equal(tool === "copilot" ? JSON.parse(rearm.stdout).permissionDecision : rearm.status, tool === "copilot" ? "deny" : 2);
      const renewal = p.before(await p.prepare({ renew: true }));
      assert.equal(await p.hook(renewal), 0);
      await p.hook(p.after(renewal), "post");
      assert.equal(p.files().length, 2, "renouvellement explicite avec nonce neuf");
      if (tool === "copilot") {
        const failed = p.before(await p.prepare({ renew: true }));
        assert.equal(invoke(failed, true).status, 0);
        const failure = invoke({ ...failed, error: "annulation fictive" }, false, true);
        assert.equal(failure.status, 0);
        assert.match(failure.stdout, /aucune attestation enregistrée/);
        assert.equal(p.files().length, 2);
        assert.equal(existsSync(p.pending()), false, "une erreur native consomme aussi la réservation");
      }
      writeFileSync(join(p.root, "src/objet.js"), "export const valeur = 2;\n");
      assert.equal((await p.contract()).status, "MANUAL");
      const bad = spawnSync(process.execPath, [CLI, "attest-poll", "APP-009", "--tool", "cursor", "--tried", "Essai"], {
        cwd: p.root,
        encoding: "utf8",
      });
      assert.equal(bad.status, 2);
      const unknown = spawnSync(process.execPath, [CLI, "attest-poll", "APP-404", "--tool", tool, "--tried", "Essai fictif."], {
        cwd: p.root,
        encoding: "utf8",
      });
      assert.equal(unknown.status, 2);
      assert.match(unknown.stderr, /contrat inconnu/);
      assert.equal(p.files().length, 2, "une préparation inéligible ne confirme rien");
      const script = join(p.root, ".claude/hooks/prompt-hook.mjs");
      for (const [input, expected] of [
        ["{}", 0],
        ["JSON invalide", tool === "copilot" ? 0 : 2],
      ]) {
        const invalid = spawnSync(process.execPath, [script, tool, "pre"], { input, encoding: "utf8" });
        assert.equal(invalid.status, expected);
        if (input !== "{}") assert.match(invalid.stderr, /aucune attestation enregistrée/);
      }
    } finally {
      p.dispose();
    }
  });

  test(`QUA-235 : ${tool}, réponses agent, défauts, recommandations et sondages modifiés refusés avant affichage`, async () => {
    const p = await projet(tool);
    try {
      const mutate = [
        (a) => {
          a.answers = { 0: "Attester" };
        },
        (a) => {
          a.default = "Attester";
        },
        (a) => {
          if (tool === "copilot") a.choices[0] += " (Recommended)";
          else a.questions[0].options[0].description += " (recommandé)";
        },
        (a) => {
          const q = tool === "copilot" ? a : a.questions[0];
          q.question = q.question.replace("lisibilité fictive.", "jugement falsifié.");
        },
        (a) => {
          if (tool === "copilot") a.choices.reverse();
          else a.questions[0].multiSelect = true;
        },
        (a) => {
          if (tool === "copilot") a.requestedSchema = {};
          else a.questions[0].default = "Attester";
        },
      ];
      for (const change of mutate) {
        const args = await p.prepare();
        change(args);
        const event = p.before(args);
        assert.equal(await p.hook(event), 2);
        await p.hook(p.after(event), "post");
        assert.equal((await p.contract()).status, "MANUAL");
      }
      const args = await p.prepare();
      const question = tool === "copilot" ? args : args.questions[0];
      question.question = "drwil-attest-v1 invalide";
      assert.equal(await p.hook(p.before(args)), 2);
      const clean = p.before(await p.prepare());
      const fake = tool === "copilot" ? { ...clean, toolName: "bash" } : { ...clean, tool_name: "run_shell_command" };
      assert.equal(await p.hook(fake), 2);
      for (const session of [undefined, "", 42]) {
        const missing = { ...clean, [tool === "copilot" ? "sessionId" : "session_id"]: session };
        assert.equal(await p.hook(missing), 2);
      }
      assert.equal(await p.hook({}), null);
      assert.equal(nativeAttestationEvent({}, "cursor"), null);
      assert.equal(portableIdentity({}), null);
    } finally {
      p.dispose();
    }
  });

  test(`QUA-235 : ${tool}, refus, absence, faux résultat, mauvais outil/session/appel et sous-agent ne confirment pas`, async () => {
    const p = await projet(tool);
    try {
      for (const change of [
        (e) => p.after(e, "Refuser"),
        (e) => p.after(e, ""),
        (e) => ({ ...e, tool_response: { answers: { 0: "Attester" } } }),
        (e) =>
          tool === "copilot"
            ? { ...e, toolResult: { resultType: "failure", textResultForLlm: "User responded: Attester" } }
            : { ...p.after(e), tool_response: { llmContent: '{"answers":{"0":"Attester"}}', error: { message: "échec" } } },
        (e) =>
          tool === "copilot"
            ? { ...e, toolResult: { resultType: "success", textResultForLlm: "Agent says: User responded: Attester" } }
            : { ...p.after(e), tool_response: { llmContent: "Réponse de l'agent : Attester" } },
        (e) => (tool === "copilot" ? { ...p.after(e), sessionId: "autre" } : { ...p.after(e), session_id: "autre" }),
        (e) => (tool === "copilot" ? { ...p.after(e), agentId: "sous-agent-fictif" } : { ...p.after(e), tool_name: "autre" }),
        (e) =>
          tool === "copilot"
            ? { ...p.after(e), toolArgs: { ...e.toolArgs, question: e.toolArgs.question + "changé" } }
            : { ...p.after(e), tool_input: { questions: [{ ...e.tool_input.questions[0], multiSelect: true }] } },
      ]) {
        const event = p.before(await p.prepare());
        assert.equal(await p.hook(event), 0);
        await p.hook(change(event), "post");
        assert.equal((await p.contract()).status, "MANUAL");
        // Un retour hors session/outil laisse parfois la vraie demande en attente : on la refuse.
        await p.hook(p.after(event, "Refuser"), "post");
      }
      const event = p.before(await p.prepare());
      assert.equal(await p.hook(event), 0);
      const otherCall = p.before(await p.prepare());
      await p.hook(p.after(otherCall), "post");
      await p.hook(p.after(event), "post");
      assert.equal((await p.contract()).status, "MANUAL", "un autre nonce n'est pas le retour de l'appel attendu");
      if (tool === "copilot") {
        assert.equal(await p.hook(p.before(await p.prepare(), "session-fictive", { agentId: "" })), 2);
      } else if (tool === "gemini") {
        const e = p.before(await p.prepare());
        assert.equal(await p.hook(e), 0);
        const multiple = p.after(e);
        multiple.tool_response.llmContent = '{"answers":{"0":"Attester","1":"Attester"}}';
        await p.hook(multiple, "post");
        assert.equal((await p.contract()).status, "MANUAL");
        assert.equal(await p.hook({ ...e, hook_event_name: "BeforeAgent" }), null);
      } else {
        for (const call of [undefined, "", 42]) assert.equal(await p.hook({ ...event, tool_use_id: call }), 2);
        assert.equal(await p.hook({ ...event, agent_id: "" }), 2);
        for (const change of [
          (e) => ({ ...p.after(e), tool_use_id: "autre-appel" }),
          (e) => ({ ...p.after(e), agent_id: "autre-agent" }),
          (e) => ({ ...p.after(e), tool_response: '{"answers":{"drwil_attest":{"answers":["Attester","Refuser"]}}}' }),
          (e) => ({
            ...p.after(e),
            tool_response: '{"answers":{"drwil_attest":{"answers":["Attester"]},"autre":{"answers":["Attester"]}}}',
          }),
          (e) => ({ ...p.after(e), tool_response: '{"answers":{"drwil_attest":{"answers":["Attester"]}},"error":"échec"}' }),
          (e) => ({ ...p.after(e), tool_response: "Réponse de l'agent : Attester" }),
          (e) => ({ ...p.after(e), tool_response: { answers: { drwil_attest: { answers: ["Attester"] } } } }),
        ]) {
          const e = p.before(await p.prepare());
          assert.equal(await p.hook(e), 0);
          await p.hook(change(e), "post");
          assert.equal((await p.contract()).status, "MANUAL");
        }
      }
    } finally {
      p.dispose();
    }
  });

  test(`QUA-235 : ${tool}, concurrence inter-appels et inter-retours, nonce réservé une fois même hors session`, async () => {
    const p = await projet(tool);
    try {
      const args = await p.prepare();
      const event = p.before(args);
      const results = await Promise.all([p.hook(event), p.hook(event), p.hook(p.before(await p.prepare()))]);
      assert.deepEqual(results.sort(), [0, 2, 2]);
      assert.equal(await p.hook(p.before(args, "autre-session")), 2);
      await Promise.all([p.hook(p.after(event), "post"), p.hook(p.after(event), "post")]);
      assert.equal((await p.contract()).status, "ATTESTED");
      assert.equal(p.files().length, 1);
      assert.equal(await p.hook(event), 2, "le nonce reste brûlé après consommation");
    } finally {
      p.dispose();
    }
  });

  test(`QUA-235 : ${tool}, expiration, préparation altérée, contrat/couverture changés et contrôles relancés`, async () => {
    const p = await projet(tool);
    try {
      let event = p.before(await p.prepare());
      assert.equal(await p.hook(event), 0);
      const now = Date.now();
      const clock = mock.method(Date, "now", () => now + 3_600_001);
      await p.hook(p.after(event), "post");
      clock.mock.restore();
      assert.equal((await p.contract()).status, "MANUAL", "expiration");
      event = p.before(await p.prepare());
      assert.equal(await p.hook(event), 0);
      const backward = mock.method(Date, "now", () => now - 3_600_001);
      await p.hook(p.after(event), "post");
      backward.mock.restore();
      assert.equal((await p.contract()).status, "MANUAL", "date future refusée");
      event = p.before(await p.prepare());
      assert.equal(await p.hook(event), 0);
      const saved = JSON.parse(readFileSync(p.pending(), "utf8"));
      writeFileSync(p.pending(), JSON.stringify({ ...saved, snapshot: "preuve modifiée" }));
      await p.hook(p.after(event), "post");
      assert.equal((await p.contract()).status, "MANUAL");
      for (const change of [
        () => writeFileSync(join(p.root, "src/objet.js"), "export const valeur = 3;\n"),
        () => writeFileSync(p.registry, readFileSync(p.registry, "utf8").replace("règle fictive.", "règle différente.")),
      ]) {
        event = p.before(await p.prepare());
        assert.equal(await p.hook(event), 0);
        change();
        await p.hook(p.after(event), "post");
        assert.equal((await p.contract()).status, "MANUAL");
      }
      writeFileSync(p.registry, `${readFileSync(p.registry, "utf8")}\n**Contrôle** : \`essai\`\n`);
      const cfgFile = join(p.root, ".drwil/ia-first.json");
      const cfg = JSON.parse(readFileSync(cfgFile, "utf8"));
      const run =
        "node -e \"const f=require('fs');f.appendFileSync('runs.log','x');process.exit(f.readFileSync('verdict.txt','utf8')==='ok'?0:1)\"";
      writeFileSync(cfgFile, JSON.stringify({ ...cfg, checks: [{ id: "essai", run }] }));
      writeFileSync(join(p.root, "verdict.txt"), "ok");
      event = p.before(await p.prepare());
      assert.equal(await p.hook(event), 0);
      writeFileSync(cfgFile, JSON.stringify({ ...cfg, checks: [{ id: "essai", run: run + ' && node -e "process.exit(0)"' }] }));
      await p.hook(p.after(event), "post");
      assert.equal((await p.contract()).status, "MANUAL", "preuve modifiée malgré contrôle toujours vert");
      writeFileSync(cfgFile, JSON.stringify({ ...cfg, checks: [{ id: "essai", run }] }));
      event = p.before(await p.prepare());
      assert.equal(await p.hook(event), 0);
      const runs = readFileSync(join(p.root, "runs.log"), "utf8").length;
      writeFileSync(join(p.root, "verdict.txt"), "non");
      await p.hook(p.after(event), "post");
      assert.ok(readFileSync(join(p.root, "runs.log"), "utf8").length > runs, "contrôle réexécuté à réception");
      assert.equal((await p.contract()).status, "FAIL");
      assert.equal(existsSync(join(p.root, ".drwil/evidence/attestations")), false);
    } finally {
      mock.restoreAll();
      p.dispose();
    }
  });

  test(`QUA-235 : ${tool}, session expirée libérée, erreur du moteur et format anglais sans choix suggéré`, async () => {
    const p = await projet(tool, "en");
    try {
      let event = p.before(await p.prepare());
      assert.equal(await p.hook(event), 0);
      const now = Date.now();
      const clock = mock.method(Date, "now", () => now + 3_600_001);
      const fresh = p.before(await p.prepare());
      assert.equal(await p.hook(fresh), 0, "une autre préparation remplace la session expirée");
      clock.mock.restore();
      await p.hook(p.after(fresh, "Decline"), "post");
      assert.equal((await p.contract()).status, "MANUAL");
      event = p.before(await p.prepare());
      writeFileSync(p.registry, "");
      assert.equal(await p.hook(event), 2, "un sondage devenu inéligible ne crée pas de préparation");
      assert.equal(existsSync(p.pending()), false);
    } finally {
      mock.restoreAll();
      p.dispose();
    }
  });

  test(`QUA-235 : ${tool}, le point d'entrée natif refuse sans effet et restitue le résultat sur un projet fictif`, async () => {
    const p = await projet(tool);
    const log = console.log;
    const output = [];
    console.log = (s) => output.push(JSON.parse(s));
    try {
      const invoke = (raw, phase = "pre") =>
        portableAttestationMain({ root: p.root, tool, phase, raw: typeof raw === "string" ? raw : JSON.stringify(raw) });
      assert.equal(await invoke({}), 0, "un outil ordinaire n'est pas intercepté");
      assert.equal(await invoke("JSON invalide"), tool === "copilot" ? 0 : 2);
      if (tool === "copilot") assert.equal(output.at(-1).permissionDecision, "deny");
      const event = p.before(await p.prepare());
      const invalid = structuredClone(event);
      (tool === "copilot" ? invalid.toolArgs : invalid.tool_input).answers = { 0: "Attester" };
      assert.equal(await invoke(invalid), tool === "copilot" ? 0 : 2);
      if (tool === "copilot") assert.equal(output.at(-1).permissionDecision, "deny");
      const fresh = p.before(await p.prepare());
      assert.equal(await invoke(fresh), 0);
      assert.equal(await invoke(p.after(fresh), "post"), 0);
      assert.equal((await p.contract()).status, "ATTESTED");
      assert.match(JSON.stringify(output.at(-1)), /APP-009 attesté/);
    } finally {
      console.log = log;
      p.dispose();
    }
  });
}

test("QUA-235 : un nonce réservé par Copilot ne peut pas être réarmé sous Gemini, même dans une autre session", async () => {
  const p = await projet("copilot");
  try {
    const args = await p.prepare();
    const event = p.before(args);
    assert.equal(await p.hook(event), 0);
    const prepared = await prepareAttestationPoll({ targetDir: p.root, id: "APP-009", tried: "Essai fictif." });
    const input = {
      hook_event_name: "BeforeTool",
      session_id: "autre-session",
      tool_name: "ask_user",
      tool_input: formatPortableAttestationPoll(prepared.poll, "gemini", portableIdentity(args).nonce),
    };
    const ctx = { root: p.root, tool: "gemini", tell: () => {} };
    assert.equal(await portableAttestationHook(input, ctx), 2);
    assert.equal(await portableAttestationHook({ ...input, tool_input: args }, ctx), 2, "mauvais outil dans la corrélation");
    await p.hook(p.after(event, "Refuser"), "post");
    assert.equal((await p.contract()).status, "MANUAL");
  } finally {
    p.dispose();
  }
});

for (const tool of ["copilot", "codex"])
  test(`QUA-235 : ${tool}, deux processus natifs concurrents ne réservent ni ne consomment deux fois le même sondage`, async () => {
    const p = await projet(tool);
    try {
      const event = p.before(await p.prepare());
      const invoke = (input, phase) =>
        new Promise((resolve, reject) => {
          const child = spawn(process.execPath, [join(p.root, ".claude/hooks/prompt-hook.mjs"), tool, phase]);
          let out = "";
          child.stdout.on("data", (chunk) => {
            out += chunk;
          });
          child.stderr.resume();
          child.on("error", reject);
          child.on("close", (code) => resolve({ code, out }));
          child.stdin.end(JSON.stringify(input));
        });
      const before = await Promise.all([invoke(event, "pre"), invoke(event, "pre")]);
      assert.deepEqual(before.map((r) => r.code).sort(), tool === "copilot" ? [0, 0] : [0, 2]);
      if (tool === "copilot") assert.equal(before.filter((r) => /"deny"/.test(r.out)).length, 1);
      const after = await Promise.all([invoke(p.after(event), "post"), invoke(p.after(event), "post")]);
      assert.ok(after.every((r) => r.code === 0));
      assert.equal(after.filter((r) => /APP-009 attesté/.test(r.out)).length, 1);
      assert.equal(p.files().length, 1);
    } finally {
      p.dispose();
    }
  });
