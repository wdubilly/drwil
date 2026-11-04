// QUA-235 : même jugement, corrélation portable sans inventer d'identifiant d'appel natif.
import { randomUUID } from "node:crypto";
import { prepareAttestationPoll, type AttestationPollOptions, type AttestationQuestion } from "./attest.js";

export type PortableAttestationTool = "copilot" | "gemini" | "codex" | "cursor";
export type PortableAttestationPoll =
  | { question: string; choices: string[] }
  | { questions: (AttestationQuestion & { type: "choice" })[] }
  | { title: string; questions: { id: string; prompt: string; options: { id: string; label: string }[]; allowMultiple: false }[] }
  | { questions: { id: string; header: string; question: string; options: AttestationQuestion["options"] }[] };

/** Le nonce est visible et non secret ; il ne prétend pas authentifier l'humain. */
export function formatPortableAttestationPoll(
  poll: { questions: AttestationQuestion[] },
  tool: PortableAttestationTool,
  nonce: string,
): PortableAttestationPoll {
  const q = poll.questions[0];
  const question = `drwil-attest-v1 ${tool} ${nonce}\n${q.question}`;
  if (tool === "copilot") return { question, choices: q.options.map((o) => o.label) };
  if (tool === "cursor")
    return {
      title: "drwil-attest",
      questions: [
        {
          id: "drwil_attest",
          prompt: question,
          allowMultiple: false,
          options: q.options.map((o, i) => ({ id: i === 0 ? "attest" : "decline", label: `${o.label} — ${o.description}` })),
        },
      ],
    };
  if (tool === "codex") return { questions: [{ id: "drwil_attest", header: q.header, question, options: q.options }] };
  return { questions: [{ ...q, question, type: "choice" }] };
}

export async function preparePortableAttestationPoll(o: AttestationPollOptions & { tool: PortableAttestationTool }) {
  const result = await prepareAttestationPoll(o);
  return "poll" in result ? { ...result, poll: formatPortableAttestationPoll(result.poll, o.tool, randomUUID()) } : result;
}
