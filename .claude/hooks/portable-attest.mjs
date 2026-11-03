// QUA-235 : une réservation native par session, un nonce jamais réarmé, un retour consommé avant await.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nativeAttestationEvent, nativePositive, portableIdentity, serialise } from "./attest-adapters.mjs";

const hash = (value) => createHash("sha256").update(serialise(value)).digest("hex");
const fresh = (date) => Number.isFinite(Date.parse(date)) && Date.now() >= Date.parse(date) && Date.now() - Date.parse(date) <= 3_600_000;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
function refusal(root) {
  let en = false;
  try {
    en = JSON.parse(readFileSync(join(root, ".drwil/ia-first.json"), "utf8")).lang === "en";
  } catch {}
  return en
    ? "[drwil] Attestation poll refused: check the session, preparation and native result; no attestation recorded."
    : "[drwil] Sondage d'attestation refusé : vérifier session, préparation et résultat natif ; aucune attestation enregistrée.";
}

export async function portableAttestationHook(input, { root, tool, phase, tell, isActive }) {
  const e = nativeAttestationEvent(input, tool, phase);
  if (!e || (!e.pre && !e.post)) return null;
  if (tool === "codex" && e.pre && e.name === "Bash" && /prompt-hook/i.test(String(e.args?.command ?? ""))) {
    console.error(refusal(root));
    return 2;
  }
  const poll = portableIdentity(e.args);
  if (!poll) return null;
  const refuse = () => {
    const message = refusal(root);
    if (e.pre) console.error(message);
    else tell(message);
    return e.pre ? 2 : 0;
  };
  if (
    poll.tool !== tool ||
    e.name !== (tool === "cursor" ? "cursor/ask_question" : tool === "codex" ? "request_user_input" : "ask_user") ||
    ((tool === "codex" || tool === "cursor") && (typeof e.call !== "string" || !e.call.trim())) ||
    typeof e.session !== "string" ||
    !e.session.trim() ||
    (e.agent !== null && (typeof e.agent !== "string" || !e.agent.trim()))
  )
    return refuse();
  const dir = join(root, ".drwil/evidence/attest-polls/portable");
  const slot = join(dir, hash(e.session));
  const file = join(slot, "pending.json");
  const used = join(dir, `nonce-${hash(poll.nonce)}.json`);
  let owned = false;
  try {
    if (e.pre) {
      if (tool === "cursor" && (typeof isActive !== "function" || !isActive())) return refuse();
      mkdirSync(dir, { recursive: true });
      if (existsSync(file) && !existsSync(join(slot, "claimed"))) {
        const previous = JSON.parse(readFileSync(file, "utf8"));
        if (!fresh(previous.askedAt)) rmSync(slot, { recursive: true });
      }
      mkdirSync(slot);
      owned = true;
      // wx est interprocessus : une réutilisation, même dans une autre session ou un autre outil, échoue.
      writeFileSync(used, "", { flag: "wx" });
      const { prepareAttestationPoll, formatPortableAttestationPoll } = await import("drwil");
      const prepared = await prepareAttestationPoll({ targetDir: root, ...poll });
      if (!("poll" in prepared)) return refuse();
      const expected = {
        ...formatPortableAttestationPoll(prepared.poll, tool, poll.nonce),
        ...(tool === "cursor" ? { toolCallId: e.call } : {}),
      };
      if (serialise(expected) !== serialise(e.args) || /\((recommended|recommandée?)\)/i.test(serialise(e.args))) return refuse();
      const pending = {
        tool,
        session: e.session,
        agent: e.agent,
        ...(tool === "codex" || tool === "cursor" ? { call: e.call } : {}),
        nonce: poll.nonce,
        args: e.args,
        snapshot: prepared.snapshot,
        askedAt: new Date().toISOString(),
      };
      writeFileSync(used, hash(pending));
      writeFileSync(file, JSON.stringify(pending));
      owned = false;
      return 0;
    }
    // La session reste verrouillée pendant la relance ; deux retours ne peuvent pas confirmer.
    mkdirSync(join(slot, "claimed"));
    owned = true;
    const pending = JSON.parse(readFileSync(file, "utf8"));
    rmSync(file);
    if (
      readFileSync(used, "utf8") !== hash(pending) ||
      !fresh(pending.askedAt) ||
      pending.tool !== tool ||
      pending.session !== e.session ||
      pending.agent !== e.agent ||
      ((tool === "codex" || tool === "cursor") && pending.call !== e.call) ||
      pending.nonce !== poll.nonce ||
      serialise(pending.args) !== serialise(e.args) ||
      (tool === "cursor" && (typeof isActive !== "function" || !isActive())) ||
      !nativePositive(e, tool)
    )
      return refuse();
    const { attest } = await import("drwil");
    const result = await attest({
      targetDir: root,
      id: poll.id,
      renew: poll.renew,
      note: poll.tried,
      origin: {
        source: `${tool}-poll`,
        sessionId: e.session,
        ...(tool === "codex" || tool === "cursor" ? { toolUseId: e.call } : {}),
        nonce: poll.nonce,
        pollHash: hash(e.args),
        askedAt: pending.askedAt,
      },
      confirm: async (_, snapshot) => snapshot === pending.snapshot && (tool !== "cursor" || isActive()),
    });
    tell(`[drwil] ${result.code === 0 ? "✓" : "✗"} ${result.message}`);
    return 0;
  } catch {
    return refuse();
  } finally {
    if (owned) rmSync(slot, { recursive: true, force: true });
  }
}

export async function portableAttestationMain({
  root = ROOT,
  tool = process.argv[2],
  phase = process.argv[3],
  raw = readFileSync(0, "utf8"),
} = {}) {
  try {
    if (tool === "cursor") throw new Error("Cursor exige le client humain ACP, pas cette entrée stdin.");
    const input = JSON.parse(raw);
    const tell = (message) =>
      console.log(
        JSON.stringify(
          tool === "copilot"
            ? { additionalContext: message }
            : { hookSpecificOutput: { ...(tool === "codex" ? { hookEventName: "PostToolUse" } : {}), additionalContext: message } },
        ),
      );
    const code = (await portableAttestationHook(input, { root, tool, phase, tell })) ?? 0;
    if (tool !== "copilot" || code !== 2) return code;
    console.log(JSON.stringify({ permissionDecision: "deny", permissionDecisionReason: refusal(root) }));
    return 0;
  } catch {
    console.error(refusal(root));
    if (tool !== "copilot") return 2;
    console.log(JSON.stringify({ permissionDecision: "deny", permissionDecisionReason: refusal(root) }));
    return 0;
  }
}
