// QUA-235 : seul le retour de l'outil humain confirme ; la préparation ne confirme jamais.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Claude Code seul ; tout le contenu sera comparé à la préparation du moteur. */
export function attestationPoll(input) {
  const e = input?.tool_input;
  const q = Array.isArray(e?.questions) ? e.questions.find((q) => q?.header === "drwil-attest") : null;
  if (!q) return null;
  const match = /^drwil-attest ([A-Z][A-Z0-9]*-\d+)( --renew)?\n[\s\S]*\n\n(?:Essai de l'agent|Agent trial):\n([\s\S]+)$/.exec(
    q.question ?? "",
  );
  // L'outil ajoute `answers` et `annotations` à tool_input après la réponse humaine : tolérés en
  // PostToolUse seulement, jamais lus ; seule la question est comparée à la préparation.
  const added = input.hook_event_name === "PostToolUse" ? ["answers", "annotations"] : [];
  const asked = { questions: e.questions };
  const clean =
    input.tool_name === "AskUserQuestion" &&
    typeof input.session_id === "string" &&
    Boolean(input.session_id.trim()) &&
    typeof input.tool_use_id === "string" &&
    Boolean(input.tool_use_id.trim()) &&
    Object.keys(e).every((k) => k === "questions" || added.includes(k)) &&
    e.questions.length === 1 &&
    !/\((recommended|recommandée?)\)/i.test(JSON.stringify(asked));
  return { valid: Boolean(match && clean), id: match?.[1], renew: Boolean(match?.[2]), tried: match?.[3], asked };
}

/** Préparation liée à l'appel, consommée une fois ; aucune réponse lue dans tool_input. */
export async function attestationHook(input, { root, tell }) {
  const poll = attestationPoll(input);
  if (!poll) return null;
  const pre = input.hook_event_name === "PreToolUse";
  const post = input.hook_event_name === "PostToolUse";
  if (!pre && !post) return 0;
  const refuse = (message) => {
    if (pre) console.error(`[drwil] ${message}`);
    else tell(`✗ ${message}`);
    return pre ? 2 : 0;
  };
  const fr = (() => {
    try {
      return JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8")).lang !== "en";
    } catch {
      return true;
    }
  })();
  const refused = fr
    ? "sondage d'attestation refusé : utiliser la préparation `drwil attest-poll`, sans réponse, défaut ni recommandation ; aucune attestation enregistrée."
    : "attestation poll refused: use `drwil attest-poll` preparation, without answers, defaults or recommendations; no attestation recorded.";
  const dir = join(root, ".drwil", "evidence", "attest-polls");
  const key = createHash("sha256")
    .update(JSON.stringify([input.session_id, input.tool_use_id]))
    .digest("hex");
  const file = join(dir, `${key}.json`);
  if (!poll.valid) {
    rmSync(file, { force: true });
    return refuse(refused);
  }
  try {
    const { attest, prepareAttestationPoll } = await import("drwil");
    const options = { targetDir: root, id: poll.id, renew: poll.renew, tried: poll.tried };
    // L'ordre des clés ne compte pas ; aucun champ fourni par l'agent n'est ignoré.
    const sorted = (value) =>
      Array.isArray(value)
        ? value.map(sorted)
        : value && typeof value === "object"
          ? Object.fromEntries(
              Object.keys(value)
                .sort()
                .map((k) => [k, sorted(value[k])]),
            )
          : value;
    const serialise = (value) => JSON.stringify(sorted(value));
    if (pre) {
      rmSync(file, { force: true });
      const prepared = await prepareAttestationPoll(options);
      if (!prepared.poll || serialise(prepared.poll) !== serialise(poll.asked)) return refuse(prepared.message || refused);
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, JSON.stringify({ poll: poll.asked, snapshot: prepared.snapshot, askedAt: new Date().toISOString() }));
      return 0;
    }
    const pending = JSON.parse(readFileSync(file, "utf8"));
    rmSync(file);
    if (
      serialise(pending.poll) !== serialise(poll.asked) ||
      !Number.isFinite(Date.parse(pending.askedAt)) ||
      Date.now() < Date.parse(pending.askedAt) ||
      Date.now() - Date.parse(pending.askedAt) > 3_600_000
    )
      return refuse(refused);
    const question = poll.asked.questions[0];
    const answer = input.tool_response?.answers;
    if (!answer || Object.keys(answer).length !== 1 || answer[question.question] !== question.options[0].label) return refuse(refused);
    const result = await attest({
      ...options,
      note: poll.tried,
      origin: { source: "claude-poll", sessionId: input.session_id, toolUseId: input.tool_use_id, askedAt: pending.askedAt },
      confirm: async (_, snapshot) => snapshot === pending.snapshot,
    });
    tell(`${result.code === 0 ? "✓" : "✗"} ${result.message}${result.file ? ` : ${result.file}` : ""}`);
  } catch (e) {
    return refuse(`${refused} ${e?.message ?? String(e)}`);
  }
  return 0;
}
