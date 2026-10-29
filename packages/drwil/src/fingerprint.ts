// Fingerprints of what an attestation covers (QUA-032, QUA-081), split from verify.ts (QUA-001).
import { createHash } from "node:crypto";
import { type Coverage, coverageChanges } from "./coverage.js";
import type { Attestation } from "./evidence.js";
import { fill, type MessageLang } from "./i18n.js";

type CheckDefinition = { id: string; run?: unknown; cwd?: string; paths?: unknown };
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

export function legacyProofFingerprints(k: { checks?: string[] | null }, cfg: ProjectConfig): Record<string, string> {
  const checks = definedChecks(cfg);
  return Object.fromEntries(
    (k.checks ?? []).map((id) => {
      const c = checks.find((x) => x.id === id);
      return [id, sha(c ? { id, run: c.run, cwd: c.cwd ?? null } : { id })];
    }),
  );
}

/**
 * Version 4 (QUA-183): what a cited check does, not how it is run. The command (which carries the
 * targeted tests), its folder and its `paths`; the execution fields (`build`, `needsBuild`,
 * `parallel`, `reuse`…) are left out, so adding or removing one keeps the attestation valid.
 * A command, a targeted test or a path that changes still makes it obsolete (QUA-184, QUA-013).
 */
export function proofFingerprints(k: { checks?: string[] | null }, cfg: ProjectConfig): Record<string, string> {
  const checks = definedChecks(cfg);
  return Object.fromEntries(
    (k.checks ?? []).map((id) => {
      const c = checks.find((x) => x.id === id);
      const paths = Array.isArray(c?.paths) ? [...(c.paths as string[])].sort() : null;
      return [id, sha(c ? { id, run: c.run, cwd: c.cwd ?? null, paths } : { id })];
    }),
  );
}

/**
 * Does this attestation still cover the contract? Version 1: its old fingerprint, unchanged; version 2:
 * the human part without coverage, as written then; version 3: also the content of the covered files;
 * version 4: the same, and each check by its effect (QUA-183) instead of its whole definition.
 */
export function covers(a: Attestation, k: AttestedContract, cfg: ProjectConfig, coverage: Coverage): boolean {
  if (a.version !== 2 && a.version !== 3 && a.version !== 4) return a.fingerprint === fingerprint(k, cfg);
  return staleParts(a, k, cfg, coverage).length === 0;
}

const TEXTS = {
  fr: {
    human: "la partie humaine du contrat (règle, Manuel, sévérité ou Couvre) a changé",
    checks: "l'effet du contrôle {0} a changé (commande, test visé ou paths)",
    checksLegacy: "la définition du contrôle {0} a changé",
    files: "un fichier couvert a changé",
    legacy: "attestation de version {0} : lue par son ancienne empreinte ; la renouveler la passe à la version 4 (effet des contrôles)",
  },
  en: {
    human: "the contract's human part (rule, Manual, severity or Covers) changed",
    checks: "the effect of check {0} changed (command, targeted test or paths)",
    checksLegacy: "the definition of check {0} changed",
    files: "a covered file changed",
    legacy: "version {0} attestation: read by its old fingerprint; renewing it moves it to version 4 (effect of the checks)",
  },
};

type Stale = { part: "human" | "check" | "files"; id?: string };

function staleParts(a: Attestation, k: AttestedContract, cfg: ProjectConfig, coverage: Coverage): Stale[] {
  const stale: Stale[] = [];
  const v4 = a.version === 4;
  if (a.fingerprint !== humanFingerprint(a.version >= 3 ? k : { ...k, covers: null })) stale.push({ part: "human" });
  const proof = v4 ? proofFingerprints(k, cfg) : legacyProofFingerprints(k, cfg);
  for (const [id, h] of Object.entries(a.proof ?? {})) if (proof[id] !== h) stale.push({ part: "check", id });
  if (a.version >= 3 && coverageChanges(a.coverage ?? {}, coverage).length) stale.push({ part: "files" });
  return stale;
}

/** Why an attestation of version 2 to 4 is obsolete, and, for an old one, which version still judges it. */
export function obsoleteReasons(a: Attestation, k: AttestedContract, cfg: ProjectConfig, coverage: Coverage, lang: MessageLang): string[] {
  if (a.version < 2 || a.version > 4) return [];
  const T = TEXTS[lang];
  const lines = staleParts(a, k, cfg, coverage)
    .filter((s) => s.part !== "files")
    .map((s) => (s.part === "human" ? T.human : fill(a.version === 4 ? T.checks : T.checksLegacy, s.id)));
  return a.version < 4 ? [...lines, fill(T.legacy, a.version)] : lines;
}
