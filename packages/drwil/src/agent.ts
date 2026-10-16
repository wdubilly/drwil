// Presentation of the `drwil verify` verdict for an agent (Claude, Codex, Cursor…), tied to no
// particular agent. Pure adapter: it only reads verify's v1 JSON (verdictJson) and recomputes no rule.
// It never runs `drwil attest`: it presents it as a human action. Output in English, stable whatever
// the project's language (consumed by agents).
import { rulesLine } from "./rules.js";
import { labelIds } from "./verdict.js";
import type { verdictJson } from "./verify.js";

type VerdictJson = ReturnType<typeof verdictJson>;

const CONDUCT: Record<string, string> = {
  pass: "Work is verified by drwil. You may continue or finish the task.",
  fail: "Work is NOT verified. Fix the failing contracts below, then run `drwil verify` again. Do not claim the work is done.",
  error: "drwil could not establish the verdict. Report the verification problem to the human; do not claim the work is verified.",
  manual: "Work is NOT verified yet. Stop claiming validation and ask the human to attest the contracts below.",
};

const LABELS: Record<string, string> = {
  pass: "GOVERNANCE: PASS",
  fail: "GOVERNANCE: FAIL",
  error: "GOVERNANCE: VERIFY ERROR",
  manual: "GOVERNANCE: MANUAL REVIEW REQUIRED",
};

export function formatForAgent(j: VerdictJson): string {
  const c = j.contracts;
  const l = [
    "drwil verify — result for the agent",
    `Contracts: ${c.passed} PASS · ${c.attested} ATTESTED · ${c.failed} FAIL · ${c.error} ERROR · ${c.manual} MANUAL (${c.total} total)`,
    `Verdict: ${LABELS[j.status] ?? j.status} (exit ${j.exitCode})`,
    `Next step: ${CONDUCT[j.status] ?? CONDUCT.error}`,
  ];
  if (j.status === "pass" && c.attested)
    l.push(`Note: ${c.attested} contract(s) are satisfied by a human attestation, not by an automated proof.`);
  const blocking = j.results.filter((r) => r.severity === "blocking");
  const list = (status: string) => blocking.filter((r) => r.status === status);
  for (const [status, title] of [
    ["fail", "Failing contracts (fix them)"],
    ["error", "Contracts drwil could not verify"],
  ] as const) {
    if (!list(status).length) continue;
    l.push("", `${title}:`);
    // Successful checks are noise here, in either language of the reasons.
    for (const r of list(status))
      l.push(`  - ${r.id} — ${r.title}: ${r.reasons.filter((x) => !/ok \((automatisé|automated)\)$/.test(x)).join(" ; ")}`);
  }
  const unproven = j.criteria.filter((c) => c.status !== "pass");
  if (unproven.length) {
    l.push("", "Unproven acceptance criteria of the active brief (each one needs a passing contract):");
    for (const c of unproven) l.push(`  - « ${c.text} » — ${c.link ?? "no proof"}: ${c.status}${c.human ? " (human)" : ""}`);
  }
  const manual = list("manual");
  if (manual.length) {
    l.push("", "Human attestation required.");
    for (const r of manual)
      l.push(`  - ${r.id} — ${r.title}${r.attestable ? "" : " (not attestable as is: needs a human decision first)"}`);
    l.push(
      "HUMAN ACTION — for the human, in their own interactive terminal; never run it yourself:",
      "  drwil attest <CONTRACT_ID>",
      "Then run `drwil verify` again.",
    );
  }
  const informational = j.results.filter((r) => r.severity !== "blocking" && r.status !== "pass" && r.status !== "attested");
  if (informational.length)
    l.push("", `Non-blocking (informational): ${informational.map((r) => `${r.id} ${r.status.toUpperCase()}`).join(", ")}`);
  if (j.errors.length) l.push("", "Registry errors:", ...j.errors.map((e) => `  - ${e}`));
  const rules = rulesLine(j.businessRules, "en");
  if (rules) l.push("", rules);
  return labelIds(l.join("\n"), j.results);
}
