// Fingerprints of what an attestation covers (QUA-032, QUA-081), split from verify.ts (QUA-001).
import { createHash } from "node:crypto";
import { type Coverage, coverageChanges } from "./coverage.js";
import type { Attestation } from "./evidence.js";

type CheckDefinition = { id: string; run?: unknown; cwd?: string };
type ProjectConfig = { checks?: unknown };
type AttestedContract = Parameters<typeof humanFingerprint>[0] & Parameters<typeof fingerprint>[0];

const definedChecks = (cfg: ProjectConfig): CheckDefinition[] => (Array.isArray(cfg.checks) ? cfg.checks : []);

/**
 * Fingerprint of what an attestation covers: the contract's text and the definition of the checks
 * it cites (command and folder of a project check). If one changes, the attestation is obsolete.
 */
export function fingerprint(k: { text?: string; checks?: string[] | null }, cfg: ProjectConfig): string {
  const checks = definedChecks(cfg);
  const proof = (k.checks ?? []).map((id) => {
    const c = checks.find((x) => x.id === id);
    return c ? { id, run: c.run, cwd: c.cwd ?? null } : { id };
  });
  // The hashed keys ("contrat", "preuve") stay as they are: renaming them would make every existing
  // attestation obsolete.
  return createHash("sha256")
    .update(JSON.stringify({ contrat: k.text ?? "", preuve: proof }))
    .digest("hex");
}

const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/**
 * Version 2 of an attestation (QUA-032): the human part (rule, Manual, severity; the whole section
 * for a legacy table contract) and, separately, each cited check's definition. A check added later
 * leaves the attestation valid (it must pass anyway); a changed human part, or an attested check
 * removed or redefined, makes it obsolete. Version 3 (QUA-081) adds the coverage patterns, in the
 * hash only when declared: a contract without any keeps the version 2 hash.
 */
export function humanFingerprint(k: {
  text?: string;
  rule?: string | null;
  manual?: string | null;
  severity?: string | null;
  covers?: string[] | null;
}): string {
  const base = { regle: k.rule ?? k.text ?? "", manuel: k.manual ?? null, severite: k.severity ?? null };
  return sha(k.covers?.length ? { ...base, couvre: [...k.covers].sort() } : base);
}

export function proofFingerprints(k: { checks?: string[] | null }, cfg: ProjectConfig): Record<string, string> {
  const checks = definedChecks(cfg);
  return Object.fromEntries(
    (k.checks ?? []).map((id) => {
      const c = checks.find((x) => x.id === id);
      return [id, sha(c ? { id, run: c.run, cwd: c.cwd ?? null } : { id })];
    }),
  );
}

/**
 * Does this attestation still cover the contract? Version 1: its old fingerprint, unchanged; version 2:
 * the human part without coverage, as written then; version 3: also the content of the covered files.
 */
export function covers(
  a: Attestation,
  k: AttestedContract,
  cfg: ProjectConfig,
  proof: Record<string, string>,
  coverage: Coverage,
): boolean {
  if (a.version !== 2 && a.version !== 3) return a.fingerprint === fingerprint(k, cfg);
  const human = humanFingerprint(a.version === 3 ? k : { ...k, covers: null });
  const files = a.version !== 3 || coverageChanges(a.coverage ?? {}, coverage).length === 0;
  return a.fingerprint === human && files && Object.entries(a.proof ?? {}).every(([id, h]) => proof[id] === h);
}
