// Présentation du verdict de `drwil verify` pour un agent (Claude, Codex, Cursor…), sans lien avec
// un agent particulier. Adaptateur pur : il ne lit que le JSON v1 de verify (verdictJson) et ne
// recalcule aucune règle. Il ne lance jamais `drwil attest` : il le présente comme une action
// humaine. Sortie en anglais, stable quelle que soit la langue du projet (consommée par des agents).
import type { verdictJson } from "./verify.js";

type VerdictJson = ReturnType<typeof verdictJson>;

const CONDUITE: Record<string, string> = {
  pass: "Work is verified by drwil. You may continue or finish the task.",
  fail: "Work is NOT verified. Fix the failing contracts below, then run `drwil verify` again. Do not claim the work is done.",
  error: "drwil could not establish the verdict. Report the verification problem to the human; do not claim the work is verified.",
  manual: "Work is NOT verified yet. Stop claiming validation and ask the human to attest the contracts below.",
};

const LIBELLES: Record<string, string> = {
  pass: "GOVERNANCE: PASS",
  fail: "GOVERNANCE: FAIL",
  error: "GOVERNANCE: VERIFY ERROR",
  manual: "GOVERNANCE: MANUAL REVIEW REQUIRED",
};

export function formaterPourAgent(j: VerdictJson): string {
  const c = j.contracts;
  const l = [
    "drwil verify — result for the agent",
    `Contracts: ${c.passed} PASS · ${c.attested} ATTESTED · ${c.failed} FAIL · ${c.error} ERROR · ${c.manual} MANUAL (${c.total} total)`,
    `Verdict: ${LIBELLES[j.status] ?? j.status} (exit ${j.exitCode})`,
    `Next step: ${CONDUITE[j.status] ?? CONDUITE.error}`,
  ];
  if (j.status === "pass" && c.attested) l.push(`Note: ${c.attested} contract(s) are satisfied by a human attestation, not by an automated proof.`);
  const bloquants = j.results.filter((r) => r.severity === "blocking");
  const liste = (statut: string) => bloquants.filter((r) => r.status === statut);
  for (const [statut, titre] of [["fail", "Failing contracts (fix them)"], ["error", "Contracts drwil could not verify"]] as const) {
    if (!liste(statut).length) continue;
    l.push("", `${titre}:`);
    for (const r of liste(statut)) l.push(`  - ${r.id} — ${r.title}: ${r.reasons.filter((x) => !x.endsWith("ok (automatisé)")).join(" ; ")}`);
  }
  const manuels = liste("manual");
  if (manuels.length) {
    l.push("", "Human attestation required.");
    for (const r of manuels) l.push(`  - ${r.id} — ${r.title}${r.attestable ? "" : " (not attestable as is: needs a human decision first)"}`);
    l.push(
      "HUMAN ACTION — for the human, in their own interactive terminal; never run it yourself:",
      "  drwil attest <CONTRACT_ID>",
      "Then run `drwil verify` again.",
    );
  }
  const informatifs = j.results.filter((r) => r.severity !== "blocking" && r.status !== "pass" && r.status !== "attested");
  if (informatifs.length) l.push("", `Non-blocking (informational): ${informatifs.map((r) => `${r.id} ${r.status.toUpperCase()}`).join(", ")}`);
  if (j.errors.length) l.push("", "Registry errors:", ...j.errors.map((e) => `  - ${e}`));
  return l.join("\n");
}
