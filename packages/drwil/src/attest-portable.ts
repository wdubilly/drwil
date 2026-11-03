// QUA-235 : même jugement, encodé pour les canaux natifs sans identifiant d'appel.
import { randomUUID } from "node:crypto";
import { prepareAttestationPoll, type AttestationPollOptions, type AttestationQuestion } from "./attest.js";

export type PortableAttestationTool = "copilot" | "gemini";
export type PortableAttestationPoll = { question: string; choices: string[] } | { questions: (AttestationQuestion & { type: "choice" })[] };

/** Le nonce est visible et non secret ; il ne prétend pas authentifier l'humain. */
export function formatPortableAttestationPoll(
  poll: { questions: AttestationQuestion[] },
  tool: PortableAttestationTool,
  nonce: string,
): PortableAttestationPoll {
  const q = poll.questions[0];
  const question = `drwil-attest-v1 ${tool} ${nonce}\n${q.question}`;
  return tool === "copilot" ? { question, choices: q.options.map((o) => o.label) } : { questions: [{ ...q, question, type: "choice" }] };
}

export async function preparePortableAttestationPoll(o: AttestationPollOptions & { tool: PortableAttestationTool }) {
  const result = await prepareAttestationPoll(o);
  return "poll" in result ? { ...result, poll: formatPortableAttestationPoll(result.poll, o.tool, randomUUID()) } : result;
}
