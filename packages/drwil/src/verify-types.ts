// Types of the verdict of `drwil verify` (DRWIL-003) and its priority rules, split from verify.ts (QUA-001).
import type { Coverage } from "./coverage.js";
import type { ProofResult } from "./closure.js";
import type { CriterionResult } from "./criteria.js";
import type { Attestation } from "./evidence.js";
import type { MessageLang } from "./i18n.js";
import type { BusinessRule } from "./rules.js";

/** ATTESTED (DRWIL-013): the automated part is proven and the human part has a valid attestation.
 *  Distinct from PASS (fully automated proof), but it satisfies the contract. */
export type Status = "PASS" | "ATTESTED" | "FAIL" | "MANUAL" | "ERROR";

export interface CheckResult {
  id: string;
  /** Raw result of the engine: ok | fail | not-run | not-applicable | unknown. */
  status: string;
  detail?: string;
  message?: string;
  output?: string;
  durationMs?: number; // whole ms (QUA-136); absent when the check did not run, never 0
  reusedAt?: string; // QUA-140: taken from the `run-checks` pass of this date instead of being replayed
  reusedBasis?: "tree" | "control"; // QUA-141: identical tree, or identical files and declaration of the check only
}

export type Severity = "blocking" | "warning" | "advisory";

export interface ContractResult {
  id: string;
  title: string;
  rule: string | null;
  status: Status;
  /** Valid human attestation retained (ATTESTED status), otherwise null. */
  attestation: Attestation | null;
  /** Eligible for `drwil attest`: automated part proven, human part remaining. */
  attestable: boolean;
  /** A valid attestation `drwil attest --renew` can replace. */
  renewable: boolean;
  /** `**Covers**` patterns (null if absent) and current fingerprint of each covered file. */
  covers: string[] | null;
  coverage: Coverage;
  /** Current fingerprint of the human part (rule, Manual, severity, coverage patterns). */
  fingerprint: string;
  /** Current fingerprint of each cited check's definition, by identifier. */
  proof: Record<string, string>;
  /** DRWIL-020: only blocking contracts decide the overall verdict. */
  severity: Severity;
  checks: CheckResult[];
  manual: string | null;
  reasons: string[];
}

export interface Verdict {
  lang: MessageLang;
  status: Status;
  /** 0 PASS; 1 FAIL or MANUAL; 2 ERROR (configuration, tooling, execution). */
  code: 0 | 1 | 2;
  contracts: ContractResult[];
  /** Errors not attached to a single contract (missing engine, empty registry, duplicate…). */
  errors: string[];
  /** Engine checks no contract cites: not run by verify, reported for information. */
  unattached: string[];
  /** Acceptance criteria of the active brief, each judged against its proof; absent without an active brief. */
  criteria?: CriterionResult[];
  /** Contracts modified in the branch that the active brief does not declare; absent without an active brief. */
  undeclared?: string[];
  /** Criteria of the closed workstreams whose proof has disappeared (QUA-085); empty when they all hold. */
  proofs?: ProofResult[];
  rules?: BusinessRule[];
  /** QUA-159: set by `verify --failed`; the verdict is then partial, never a proof of closing. */
  partial?: PartialRun;
}

/** What a `verify --failed` pass replayed and left out, against the last evidence (`previous`, null when none is readable). */
export interface PartialRun {
  previous: string | null;
  replayed: string[];
  /** Contracts only awaiting an attestation at the last evidence: not failures, not replayed (`drwil attest`). */
  manual: string[];
  /** Contracts PASS or ATTESTED at the last evidence, not replayed. */
  skipped: number;
}

export interface VerifyOptions {
  targetDir: string;
  /** Only verify these contracts (and only run their checks): used by `drwil attest`. */
  only?: string[];
  /** Called before each check is run (no status), then with its status: `drwil attest` shows them. */
  onCheck?: (id: string, status?: string) => void;
  /** QUA-140: `false` replays every check instead of taking the verdicts of a `run-checks` pass on an identical tree. */
  reuse?: boolean;
  /** QUA-141: the closing evidence (`--evidence`) judges the whole tree: no verdict is taken by check, only by identical tree. */
  evidence?: boolean;
}

export const CODES: Record<Status, 0 | 1 | 2> = { PASS: 0, ATTESTED: 0, FAIL: 1, MANUAL: 1, ERROR: 2 };

/**
 * Deterministic priority, per contract as for the overall verdict: FAIL > ERROR > MANUAL > PASS.
 * FAIL wins (a failure is established); ERROR comes before MANUAL (a proof that could not be produced
 * makes the verdict undeterminable); PASS only if everything is proven.
 */
export function worst(statuses: Status[]): Status {
  for (const s of ["FAIL", "ERROR", "MANUAL"] as const) if (statuses.includes(s)) return s;
  return "PASS";
}
