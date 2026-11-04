// QUA-235 : serveurs ACP et humains entièrement fictifs, aucun agent Cursor lancé.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import childProcess from "node:child_process";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { PassThrough } from "node:stream";
import readline from "node:readline/promises";
import { syncBuiltinESMExports } from "node:module";
import { test, mock } from "node:test";
import { fileURLToPath } from "node:url";
import { init, preparePortableAttestationPoll, verify } from "../dist/index.js";
import { conversationCursor, lancerCursor, texteTerminal } from "../dist/cli-cursor.js";
import { SessionCursor } from "../dist/cursor-acp-session.js";
import { ErreurACP, TransportCursor } from "../dist/cursor-acp.js";
import { portableAttestationHook, portableAttestationMain } from "../templates/common/tools/claude/.claude/hooks/portable-attest.mjs";
import { serialise } from "../templates/common/tools/claude/.claude/hooks/attest-adapters.mjs";

const CLI = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
const hash = (v) => createHash("sha256").update(serialise(v)).digest("hex");
const attendre = () => new Promise((r) => setImmediate(r));
async function projet() {
  const evidence = relative(process.cwd(), fileURLToPath(new URL("../../../.drwil/evidence/", import.meta.url)));
  mkdirSync(evidence, { recursive: true });
  const root = resolve(mkdtempSync(join(evidence, "cursor-test-")));
  const log = console.log;
  const warn = console.warn;
  try {
    console.log = console.warn = () => {};
    await init({ targetDir: root, lang: "fr", tools: "cursor", git: false });
  } finally {
    console.log = log;
    console.warn = warn;
  }
  assert.ok(existsSync(join(root, ".claude/hooks/portable-attest.mjs")));
  assert.equal(existsSync(join(root, ".claude/settings.json")), false);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src/objet.js"), "export const valeur = 1;\n");
  const registre = join(root, "docs/contracts.md");
  writeFileSync(
    registre,
    readFileSync(registre, "utf8") +
      "\n## APP-009 — Jugement fictif\n**Règle** : règle fictive.\n**Manuel** : lisibilité fictive.\n**Couvre** : `src/**`\n",
  );
  const prepare = async (extra = {}) => {
    const r = await preparePortableAttestationPoll({ targetDir: root, tool: "cursor", id: "APP-009", tried: "Essai fictif.", ...extra });
    assert.equal(r.code, 0, r.message);
    return { ...r.poll, toolCallId: "appel-fictif" };
  };
  const contrat = async () => (await verify({ targetDir: root, only: ["APP-009"] })).contracts[0];
  return { root, prepare, contrat, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

// Exécutable local de test : un vrai stdio JSON-RPC, aucun accès réseau ni SDK/agent tiers.
const SERVEUR = `
import readline from "node:readline";
const config = JSON.parse(process.argv[1]);
if (config.ignoreTerm) { process.on("SIGTERM", () => {}); setInterval(() => {}, 1000); }
const send = m => process.stdout.write(JSON.stringify({jsonrpc:"2.0", ...m})+"\\n");
let prompt;
let attendues = config.requests?.length ?? 1;
const rl = readline.createInterface({input:process.stdin});
rl.on("line", line => {
 const m = JSON.parse(line);
 if (m.method === "initialize") send({id:m.id,result:{protocolVersion:1}});
 else if (m.method === "authenticate") send({id:m.id,result:{}});
 else if (m.method === "session/new") send({id:m.id,result:{sessionId:"session-fictive"}});
 else if (m.method === "session/prompt") {
  prompt=m.id;
  process.stdout.write((config.requests ?? [{method:"cursor/ask_question",params:config.poll}]).map((r,i) =>
    JSON.stringify({jsonrpc:"2.0",id:"question-"+i,...r})+"\\n").join(""));
 } else if (m.id?.startsWith("question-")) {
  send({method:"session/update",params:{sessionId:"session-fictive",update:{sessionUpdate:"agent_message_chunk",content:{type:"text",text:JSON.stringify(m)}}}});
  if (--attendues===0) send({id:prompt,result:{stopReason:"end_turn"}});
 }
});
`;
async function runtime(p, poll, choisir, config = {}) {
  const messages = [];
  const child = spawn(process.execPath, ["--input-type=module", "-e", SERVEUR, JSON.stringify({ poll, ...config })], { stdio: "pipe" });
  let interrompue = false;
  const s = new SessionCursor(
    child,
    p.root,
    {
      choisir,
      afficher: (m) => messages.push(m),
      interrompre: () => {
        interrompue = true;
      },
    },
    portableAttestationHook,
    5000,
  );
  try {
    await s.initialiser();
    await s.envoyer("Question fictive locale.");
  } finally {
    await s.transport.fermer();
  }
  assert.equal(child.exitCode === null && child.signalCode === null, false, "sous-processus arrêté et récolté");
  if (config.ignoreTerm && process.platform !== "win32") assert.equal(child.signalCode, "SIGKILL");
  assert.equal(interrompue, true);
  return messages;
}

test("QUA-235 : Cursor, vrai stdio ACP local fictif, choix humain exact, provenance et renouvellement", async () => {
  const p = await projet();
  try {
    const r = spawnSync(process.execPath, [CLI, "attest-poll", "APP-009", "--tool", "cursor", "--tried", "Essai fictif."], {
      cwd: p.root,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    const poll = { ...JSON.parse(r.stdout), toolCallId: "appel-fictif" };
    const messages = await runtime(p, poll, async (texte, choix) => {
      assert.match(texte, /règle fictive[\s\S]*lisibilité fictive[\s\S]*src\/objet.js[\s\S]*Essai fictif/);
      assert.deepEqual(
        choix.map((c) => c.id),
        ["attest", "decline"],
      );
      assert.equal((await p.contrat()).status, "MANUAL");
      return "attest";
    });
    assert.match(messages.join("\n"), /APP-009 attesté/);
    const k = await p.contrat();
    assert.equal(k.status, "ATTESTED");
    assert.equal(k.attestation.version, 4);
    assert.equal(k.attestation.origin.source, "cursor-poll");
    assert.equal(k.attestation.origin.toolUseId, "appel-fictif");
    assert.equal(k.attestation.origin.sessionId, "session-fictive");
    assert.equal(k.attestation.origin.pollHash, hash(poll));
    const before = readdirSync(join(p.root, ".drwil/evidence/attestations")).length;
    await runtime(p, poll, async () => assert.fail("le rejeu ne doit pas être affiché"));
    assert.equal(readdirSync(join(p.root, ".drwil/evidence/attestations")).length, before);
    await runtime(p, await p.prepare({ renew: true }), async () => "attest");
    assert.equal(readdirSync(join(p.root, ".drwil/evidence/attestations")).length, before + 1);
    await runtime(p, await p.prepare({ renew: true }), async () => "decline", { ignoreTerm: true });
    const cli = spawnSync(process.execPath, [CLI, "cursor-acp"], { cwd: p.root, input: "1\n", encoding: "utf8" });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /terminal humain interactif requis/);
    assert.equal(spawnSync(process.execPath, [CLI, "cursor-acp", "--yes"], { encoding: "utf8" }).status, 1);
    const argument = spawnSync(process.execPath, [CLI, "cursor-acp", "attest"], { encoding: "utf8" });
    assert.equal(argument.status, 1);
    assert.match(argument.stderr, /too many arguments/);
    await assert.rejects(lancerCursor, /terminal humain interactif requis/);
  } finally {
    p.dispose();
  }
});

test("QUA-235 : Cursor, refus, abandon, choix inventé et preuve changée n'attestent pas", async () => {
  const p = await projet();
  try {
    for (const choix of ["decline", null, "Attester", "attest"]) {
      await runtime(p, await p.prepare(), async () => {
        if (choix === "attest") writeFileSync(join(p.root, "src/objet.js"), "preuve changée\n");
        return choix;
      });

      assert.equal((await p.contrat()).status, "MANUAL");
    }
    const msgs = await runtime(p, await p.prepare(), async () => {
      throw new Error("interface fictive fermée");
    });
    assert.match(msgs.join("\n"), /interface fictive fermée/);
    assert.equal((await p.contrat()).status, "MANUAL");
  } finally {
    p.dispose();
  }
});

test("QUA-235 : Cursor, contrôles vraiment relancés et preuve automatisée changée refusée", async () => {
  const p = await projet();
  try {
    const registre = join(p.root, "docs/contracts.md");
    writeFileSync(registre, readFileSync(registre, "utf8") + "\n**Contrôle** : `essai-fictif`\n");
    const configFile = join(p.root, ".drwil/ia-first.json");
    const cfg = JSON.parse(readFileSync(configFile, "utf8"));
    const run =
      "node -e \"const f=require('fs');f.appendFileSync('runs.log','x');process.exit(f.readFileSync('verdict.txt','utf8')==='ok'?0:1)\"";
    writeFileSync(configFile, JSON.stringify({ ...cfg, checks: [{ id: "essai-fictif", run }] }));
    writeFileSync(join(p.root, "verdict.txt"), "ok");
    const poll = await p.prepare();
    let runs;
    await runtime(p, poll, async () => {
      runs = readFileSync(join(p.root, "runs.log"), "utf8").length;
      writeFileSync(join(p.root, "verdict.txt"), "non");
      return "attest";
    });
    assert.equal(readFileSync(join(p.root, "runs.log"), "utf8").length, runs + 1);
    assert.equal((await p.contrat()).status, "FAIL", "un résultat automatique rouge ne s'atteste pas");
    writeFileSync(join(p.root, "verdict.txt"), "ok");
    await runtime(p, await p.prepare(), async () => {
      writeFileSync(configFile, JSON.stringify({ ...cfg, checks: [{ id: "essai-fictif", run: run + ' && node -e "process.exit(0)"' }] }));
      return "attest";
    });
    assert.equal((await p.contrat()).status, "MANUAL", "preuve modifiée malgré contrôle toujours vert");
  } finally {
    p.dispose();
  }
});

test("QUA-235 : Cursor, contenu exact, réponse modèle, recommandation et concurrence refusés avant affichage", async () => {
  const p = await projet();
  try {
    for (const modifier of [
      (v) => {
        v.answers = ["attest"];
      },
      (v) => {
        v.questions[0].default = "attest";
      },
      (v) => {
        v.questions[0].options[0].label += " (Recommended)";
      },
      (v) => {
        v.questions[0].prompt += " texte ajouté";
      },
      (v) => {
        v.questions[0].allowMultiple = true;
      },
      (v) => {
        v.questions[0].options[1].id = "attest";
      },
      (v) => {
        v.questions[0].options[0].label = 12;
      },
      (v) => {
        v.toolCallId = "";
      },
    ]) {
      const poll = await p.prepare();
      modifier(poll);
      const m = await runtime(p, poll, async () => assert.fail("sondage falsifié affiché"));
      assert.match(m.join("\n"), /error/);
      assert.equal((await p.contrat()).status, "MANUAL");
    }
    const requests = [
      { method: "cursor/ask_question", params: await p.prepare() },
      { method: "cursor/ask_question", params: await p.prepare() },
    ];
    let affichages = 0;
    const messages = await runtime(
      p,
      null,
      async () => {
        affichages++;
        await attendre();
        return "decline";
      },
      { requests },
    );
    assert.equal(affichages, 1);
    assert.match(messages.join("\n"), /déjà en attente/);
  } finally {
    p.dispose();
  }
});

test("QUA-235 : Cursor, expiration, session/call liés, entrée stdin interdite et fermeture pendant relance", async () => {
  const p = await projet();
  const hook = (params, phase, extra = {}) =>
    portableAttestationHook(
      { sessionId: "session-fictive", params, ...extra },
      { root: p.root, tool: "cursor", phase, tell: () => {}, isActive: () => true },
    );
  const positif = { outcome: { outcome: "answered", answers: [{ questionId: "drwil_attest", selectedOptionIds: ["attest"] }] } };
  try {
    for (const mode of ["expiration", "call", "session", "arrêt"]) {
      const poll = await p.prepare();
      assert.equal(await hook(poll, "pre"), 0);
      const expiration = Date.now() + 3_600_001;
      if (mode === "expiration") mock.method(Date, "now", () => expiration);
      let active = false;
      const retour = {
        sessionId: mode === "session" ? "autre" : "session-fictive",
        params: mode === "call" ? { ...poll, toolCallId: "autre" } : poll,
        response: positif,
      };
      await portableAttestationHook(retour, {
        root: p.root,
        tool: "cursor",
        phase: "post",
        tell: () => {},
        isActive: () => {
          if (mode !== "arrêt") return true;
          active = !active;
          return active;
        },
      });
      mock.restoreAll();
      assert.equal((await p.contrat()).status, "MANUAL");
      // Une mauvaise session ne consomme pas la réservation de la session d'origine.
      if (mode === "session") await hook(poll, "post", { response: { outcome: { outcome: "cancelled" } } });
    }
    assert.equal(await portableAttestationMain({ root: p.root, tool: "cursor", raw: JSON.stringify({ response: positif }) }), 2);
    const entrée = spawnSync(process.execPath, [join(p.root, ".claude/hooks/prompt-hook.mjs"), "cursor"], {
      input: JSON.stringify({ response: positif }),
      encoding: "utf8",
    });
    assert.equal(entrée.status, 2, "l'entrée installée refuse Cursor au lieu de retomber sur le hook Claude");
    assert.match(entrée.stderr, /aucune attestation enregistrée/);
  } finally {
    mock.restoreAll();
    p.dispose();
  }
});

function faux() {
  const processus = new EventEmitter();
  processus.stdin = new PassThrough();
  processus.stdout = new PassThrough();
  processus.stderr = new PassThrough();
  processus.signaux = [];
  processus.kill = (signal) => {
    processus.signaux.push(signal);
    queueMicrotask(() => processus.emit("close", null, signal));
  };
  return processus;
}
const envoyer = (p, msg) => p.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");
test("QUA-235 : transport Cursor, erreurs serveur, JSON malformé, fermeture et délai bornés", async () => {
  for (const mode of ["rpc", "error", "json", "envelope", "response", "close", "spawn", "pipe", "taille", "timeout"]) {
    const p = faux();
    let interrompu = false;
    const t = new TransportCursor(
      p,
      async () => ({}),
      () => {},
      () => {
        interrompu = true;
      },
      10,
    );
    const requête = t.demander("initialize", {});
    if (mode === "rpc") envoyer(p, { id: 1, error: { code: -1, message: "erreur serveur fictive" } });
    if (mode === "error") envoyer(p, { id: 1, error: {} });
    if (mode === "json") p.stdout.write("JSON invalide\n");
    if (mode === "envelope") p.stdout.write("{}\n");
    if (mode === "response") envoyer(p, { id: 4, result: {} });
    if (mode === "close") p.emit("close", 1);
    if (mode === "spawn") p.emit("error", new Error("agent absent fictif"));
    if (mode === "pipe") p.stdin.emit("error", new Error("pipe fermé"));
    if (mode === "taille") p.stdout.write("x".repeat(1024 * 1024 + 1));
    await assert.rejects(requête, /ACP|JSON|ficti|fermé|Unexpected/);
    if (mode !== "rpc") assert.equal(interrompu, true);
    await assert.rejects(t.demander("session/new", {}), /ACP|ficti|fermé|JSON|Unexpected/);
    await t.fermer();
  }
});

test("QUA-235 : transport Cursor, enveloppes requêtes/notifications et limites de concurrence", async () => {
  const p = faux();
  const sorties = [];
  p.stdin.on("data", (c) => sorties.push(JSON.parse(c)));
  const t = new TransportCursor(
    p,
    async (m) => {
      if (m === "inconnue") throw new ErreurACP(-32601, "non prise en charge");
      if (m === "erreur") throw new Error("échec visible");
      return { ok: true };
    },
    () => {},
    () => {},
    50,
  );
  envoyer(p, { id: "a", method: "question", params: {} });
  envoyer(p, { id: "b", method: "inconnue", params: {} });
  envoyer(p, { id: "c", method: "erreur", params: {} });
  envoyer(p, { method: "notification", params: {} });
  await attendre();
  assert.equal(sorties[0].result.ok, true);
  assert.equal(sorties[1].error.code, -32601);
  assert.equal(sorties[2].error.code, -32603);
  const attentes = Array.from({ length: 16 }, () => t.demander("attente", {}));
  const fin = Promise.allSettled(attentes);
  await assert.rejects(t.demander("excès", {}), /Trop/);
  envoyer(p, { id: "a", method: "question" });
  assert.equal(
    (await fin).every((v) => v.status === "rejected"),
    true,
  );
  await t.fermer();
});

test("QUA-235 : interface dédiée fictive, choix numéroté sans défaut, arrêt et erreurs nettoient le processus", async () => {
  assert.equal(texteTerminal("\x1b[31mtexte\x1b[0m\x00\r\n\t"), "texte\n\t");
  for (const saisie of ["1", "2", "0", "", "inventé", "10"]) {
    const p = faux();
    const sorties = [];
    let session;
    let choix;
    const entrées = ["essai", saisie, "/quitter"];
    await conversationCursor(
      async () => entrées.shift(),
      (m) => sorties.push(m),
      (ui) => {
        session = {
          initialiser: async () => {},
          envoyer: async () => {
            choix = await ui.choisir("Règle fictive", [
              { id: "oui", label: "Attester" },
              { id: "non", label: "Refuser" },
            ]);
          },
          transport: { fermer: async () => p.kill("SIGTERM") },
        };
        return session;
      },
      () => {},
    );
    assert.equal(choix, saisie === "1" ? "oui" : saisie === "2" ? "non" : null);
    assert.match(sorties.join("\n"), /aucun défaut|Règle fictive/);
    assert.deepEqual(p.signaux, ["SIGTERM"]);
  }
  for (const entrée of [null, "/quitter", "x".repeat(16_001), ""]) {
    let fermé = false;
    const r = conversationCursor(
      async () => entrée,
      () => {},
      () => ({
        initialiser: async () => {},
        envoyer: async () => assert.fail("pas de message"),
        transport: {
          fermer: async () => {
            fermé = true;
          },
        },
      }),
      () => {},
    );
    if (entrée?.length > 16_000) await assert.rejects(r, /trop long/);
    else await r;
    assert.equal(fermé, true);
  }
});

test("QUA-235 : Cursor, permissions explicites, questions ordinaires et méthodes non prises en charge", async () => {
  const p = await projet();
  try {
    const options = [
      { optionId: "autoriser", name: "Autoriser une fois", kind: "allow_once" },
      { optionId: "refuser", name: "Refuser", kind: "reject_once" },
    ];
    for (const choix of ["autoriser", null, "inventé"]) {
      const m = await runtime(
        p,
        null,
        async (texte, c) => {
          assert.match(texte, /Permission ACP : outil fictif/);
          assert.equal(c[0].id, "autoriser");
          return choix;
        },
        {
          requests: [
            {
              method: "session/request_permission",
              params: {
                sessionId: "session-fictive",
                toolCall: { toolCallId: "permission-fictive", title: "outil fictif", rawInput: { command: "commande fictive" } },
                options,
              },
            },
          ],
        },
      );
      assert.match(m.join("\n"), choix === "autoriser" ? /selected/ : /cancelled/);
    }
    for (const params of [
      {},
      { sessionId: "autre", options },
      { sessionId: "session-fictive", options: [{}] },
      { sessionId: "session-fictive", options: [options[0], options[0]] },
    ]) {
      const m = await runtime(p, null, async () => assert.fail("permission invalide affichée"), {
        requests: [{ method: "session/request_permission", params }],
      });
      assert.match(m.join("\n"), /error/);
    }
    for (const method of ["cursor/create_plan", "fs/read_text_file", "terminal/create"]) {
      const m = await runtime(p, null, async () => assert.fail("méthode sans UI"), { requests: [{ method, params: {} }] });
      assert.match(m.join("\n"), /rejected|non prise en charge/);
    }
    const poll = {
      toolCallId: "ordinaire",
      title: "Question ordinaire",
      questions: [
        {
          id: "q",
          prompt: "Quel choix fictif ?",
          options: [
            { id: "a", label: "Alpha" },
            { id: "b", label: "Beta" },
          ],
        },
      ],
    };
    const m = await runtime(p, poll, async (texte) => {
      assert.match(texte, /Question ordinaire\nQuel choix/);
      return "b";
    });
    assert.match(m.join("\n"), /selectedOptionIds.*b/);
    assert.equal((await p.contrat()).status, "MANUAL", "une question ordinaire n'atteste pas");
    const malformed = structuredClone(poll);
    malformed.questions[0].prompt = "drwil-attest sans protocole valide";
    await runtime(p, malformed, async () => assert.fail("faux sondage ordinaire"));
  } finally {
    p.dispose();
  }
});

function automatique(répondre) {
  const p = faux();
  p.stdin.on("data", (chunk) => {
    const m = JSON.parse(chunk);
    if (m.method) queueMicrotask(() => répondre(p, m));
  });
  return p;
}
const résultatNormal = (m) =>
  m.method === "initialize" ? { protocolVersion: 1 } : m.method === "session/new" ? { sessionId: "session-fictive" } : {};

test("QUA-235 : Cursor, session incompatible, notifications et tour fermé avant réponse humaine", async () => {
  for (const mode of ["version", "session", "fin", "notification", "fermeture"]) {
    let débloquer;
    const attente = new Promise((r) => {
      débloquer = r;
    });
    const messages = [];
    const p = automatique((p, m) => {
      if (mode === "version" && m.method === "initialize") return envoyer(p, { id: m.id, result: { protocolVersion: 2 } });
      if (mode === "session" && m.method === "session/new") return envoyer(p, { id: m.id, result: {} });
      if (m.method === "session/prompt") {
        if (mode === "notification") {
          for (const method of ["cursor/update_todos", "cursor/task", "cursor/generate_image"]) envoyer(p, { method, params: {} });
          envoyer(p, { method: "non-documentée", params: {} });
          return;
        }
        if (mode === "fermeture") {
          envoyer(p, {
            id: "humaine",
            method: "cursor/ask_question",
            params: {
              toolCallId: "c",
              questions: [
                {
                  id: "q",
                  prompt: "Question",
                  options: [
                    { id: "a", label: "A" },
                    { id: "b", label: "B" },
                  ],
                },
              ],
            },
          });
          setImmediate(() => envoyer(p, { id: m.id, result: { stopReason: "end_turn" } }));
          return;
        }
        envoyer(p, { id: m.id, result: {} });
        return;
      }
      envoyer(p, { id: m.id, result: résultatNormal(m) });
    });
    const s = new SessionCursor(
      p,
      process.cwd(),
      {
        choisir: () => attente,
        afficher: (m) => messages.push(m),
        interrompre: () => débloquer(null),
      },
      async () => null,
      50,
    );
    try {
      if (["version", "session"].includes(mode)) await assert.rejects(s.initialiser(), /incompatible|absent/);
      else {
        await s.initialiser();
        await assert.rejects(s.envoyer("essai"), /invalide|non prise en charge|fermé/);
      }
    } finally {
      await s.transport.fermer();
    }
    if (mode === "notification") assert.match(messages.join("\n"), /cursor\/task/);
    await assert.rejects(s.envoyer("après fermeture"), /indisponible/);
  }
});

test("QUA-235 : lanceur TTY simulé exclusivement en helper, lecture humaine et nettoyage effectifs", async () => {
  const p = await projet();
  const stdinTTY = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
  const stdoutTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
  const logs = [];
  try {
    Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: true });
    Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true });
    mock.method(process, "cwd", () => p.root);
    mock.method(process.stdout, "write", (s) => {
      logs.push(s);
      return true;
    });
    for (const mode of ["quitter", "sigint", "erreur", "abort", "fermeture"]) {
      const rl = new EventEmitter();
      rl.close = () => rl.emit("close");
      rl.question = async () => {
        if (mode === "fermeture") return new Promise((resolve) => rl.once("close", () => resolve(null)));
        if (mode === "sigint") {
          rl.emit("SIGINT");
          return null;
        }
        if (mode === "erreur") throw new Error("lecture fictive cassée");
        if (mode === "abort") {
          rl.close();
          throw new Error("lecture interrompue");
        }
        return "/quitter";
      };
      mock.method(readline, "createInterface", () => rl);
      const child = automatique((p, m) => {
        envoyer(p, { id: m.id, result: résultatNormal(m) });
        if (mode === "fermeture" && m.method === "session/new") setImmediate(() => p.emit("close", 1));
      });
      mock.method(childProcess, "spawn", (commande, args) => {
        assert.equal(commande, "agent");
        assert.deepEqual(args, ["acp"]);
        return child;
      });
      syncBuiltinESMExports();
      if (mode === "fermeture") await assert.rejects(lancerCursor(), /Session ACP fermée/);
      else if (mode === "erreur") await assert.rejects(lancerCursor(), /lecture fictive cassée/);
      else await lancerCursor();
      assert.deepEqual(child.signaux, mode === "fermeture" ? [] : ["SIGTERM"]);
    }
  } finally {
    mock.restoreAll();
    syncBuiltinESMExports();
    if (stdinTTY) Object.defineProperty(process.stdin, "isTTY", stdinTTY);
    else delete process.stdin.isTTY;
    if (stdoutTTY) Object.defineProperty(process.stdout, "isTTY", stdoutTTY);
    else delete process.stdout.isTTY;
    p.dispose();
  }
  assert.match(logs.join("\n"), /interface distincte/);
});
