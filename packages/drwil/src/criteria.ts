// Acceptance criteria of the active brief, judged against the verify verdict: the tool evaluates, the
// agent never grades itself. Split from verify.ts (QUA-001: files under 400 lines).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ContractResult } from "./verify.js";

/**
 * pass: proven by a durable, passing contract or check. no-proof: no link. unknown-proof: the link
 * names nothing in the registry. not-durable: a contract without a check cannot guard against
 * regressions (unless the criterion is human). not-pass: the proof exists but does not pass.
 */
export type CriterionStatus = "pass" | "no-proof" | "unknown-proof" | "not-durable" | "not-pass";

export interface Criterion {
  text: string;
  link: string | null;
  human: boolean;
}

export interface CriterionResult extends Criterion {
  status: CriterionStatus;
  /** Status of the linked contract or check, lowercase; null when nothing is linked or found. */
  proof: string | null;
}

export function evaluateCriteria(criteria: Criterion[], contracts: ContractResult[]): CriterionResult[] {
  const passing = (s: string) => s === "pass" || s === "attested";
  return criteria.map((c) => {
    const result = (status: CriterionStatus, proof: string | null = null): CriterionResult => ({ ...c, status, proof });
    if (!c.link) return result("no-proof");
    const contract = contracts.find((k) => k.id === c.link);
    if (contract) {
      const proof = contract.status.toLowerCase();
      const human = contract.manual !== null || contract.checks.length === 0;
      if (human !== c.human) return result("not-durable", proof);
      return result(passing(proof) ? "pass" : "not-pass", proof);
    }
    const check = contracts.flatMap((k) => k.checks).find((r) => r.id === c.link);
    if (!check || c.human) return result("unknown-proof");
    return result(check.status === "ok" ? "pass" : "not-pass", check.status);
  });
}

/** Criteria of the active brief (.drwil/state.json), read by the project's own briefs.mjs; null when there is none to read. */
export async function activeCriteria(root: string): Promise<Criterion[] | null> {
  try {
    const brief = JSON.parse(readFileSync(join(root, ".drwil", "state.json"), "utf8"))?.active_brief;
    if (typeof brief !== "string") return null;
    const mod = await import(pathToFileURL(join(root, ".githooks", "briefs.mjs")).href);
    if (typeof mod.acceptanceCriteria !== "function") return null;
    return mod.acceptanceCriteria(readFileSync(join(root, brief), "utf8"));
  } catch {
    return null;
  }
}
