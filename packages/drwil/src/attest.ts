// `drwil attest <ID>` (DRWIL-013, continued): explicit and traceable human proof of a MANUAL contract.
// It is not "the user typed y": the attestation is bound by fingerprint to the contract's text and to
// the definition of its proof; if one changes, it becomes obsolete and the contract is MANUAL again.
// It is recorded in .drwil/evidence/attestations/ (versioned, reviewed in PRs).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fill, type MessageLang } from "./i18n.js";
import { ATTESTATIONS_DIR, redact, verify, type Attestation, type ContractResult } from "./verify.js";

export interface AttestOptions {
  targetDir: string;
  id: string;
  note?: string;
  /**
   * Human confirmation: receives the summary shown, returns true only if the human confirms.
   * The CLI requires an interactive terminal and typing the contract's identifier; no flag allows
   * doing without (an agent or a script cannot attest in a human's place).
   */
  confirm: (summary: string) => Promise<boolean>;
  now?: Date;
}

export interface AttestResult {
  /** 0: recorded; 1: refused (not eligible or not confirmed); 2: unknown contract or invalid configuration. */
  code: 0 | 1 | 2;
  message: string;
  file?: string;
}

const NOTE_MAX = 500;

const TEXTS = {
  fr: {
    rule: "Règle : {0}",
    automated: "Preuve automatisée :",
    noAutomated: "Preuve automatisée : aucune",
    human: "Partie humaine à attester : {0}",
    legacy: "contrat historique sans contrôle : toute la preuve",
    unknown: "contrat inconnu : {0}",
    alreadyPass: "{0} est déjà prouvé automatiquement (PASS) : rien à attester",
    alreadyAttested: "{0} a déjà une attestation valide ({1}) : rien à attester",
    notAttestable:
      "{0} n'est pas attestable ({1}) : seule une partie humaine restante s'atteste, jamais un contrôle en échec, non exécuté ou non applicable — {2}",
    refused: "attestation refusée : rien n'a été enregistré",
    declarative: "git config user.name, déclaratif",
    done: "{0} attesté",
  },
  en: {
    rule: "Rule: {0}",
    automated: "Automated proof:",
    noAutomated: "Automated proof: none",
    human: "Human part to attest: {0}",
    legacy: "legacy contract without a check: the whole proof",
    unknown: "unknown contract: {0}",
    alreadyPass: "{0} is already proven automatically (PASS): nothing to attest",
    alreadyAttested: "{0} already has a valid attestation ({1}): nothing to attest",
    notAttestable:
      "{0} is not attestable ({1}): only a remaining human part can be attested, never a failing, not run or not applicable check — {2}",
    refused: "attestation refused: nothing was recorded",
    declarative: "git config user.name, declarative",
    done: "{0} attested",
  },
};

export function contractSummary(k: ContractResult, lang: MessageLang = "en"): string {
  const T = TEXTS[lang];
  const l = [`${k.id} — ${k.title}`, fill(T.rule, k.rule ?? "—")];
  if (k.checks.length) l.push(T.automated, ...k.checks.map((c) => `  ✓ ${c.id} : ${c.status}`));
  else l.push(T.noAutomated);
  l.push(fill(T.human, k.manual ?? T.legacy));
  return l.join("\n");
}

export async function attest(o: AttestOptions): Promise<AttestResult> {
  const v = await verify({ targetDir: o.targetDir, only: [o.id] });
  const T = TEXTS[v.lang];
  if (v.errors.length && !v.contracts.length) return { code: 2, message: v.errors.join(" ; ") };
  const k = v.contracts.find((c) => c.id === o.id);
  if (!k) return { code: 2, message: fill(T.unknown, o.id) };
  if (k.status === "PASS") return { code: 1, message: fill(T.alreadyPass, o.id) };
  if (k.status === "ATTESTED") return { code: 1, message: fill(T.alreadyAttested, o.id, k.attestation?.attestedAt) };
  if (!k.attestable) return { code: 1, message: fill(T.notAttestable, o.id, k.status, k.reasons.join(" ; ")) };
  if (!(await o.confirm(contractSummary(k, v.lang)))) return { code: 1, message: T.refused };

  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: o.targetDir, encoding: "utf8" });
    return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : null;
  };
  const name = git("config", "user.name");
  const now = o.now ?? new Date();
  const attestation: Attestation = {
    version: 1,
    contract: k.id,
    status: "ATTESTED",
    attestedAt: now.toISOString(),
    // Declarative identity (no account, no signature); never the e-mail: useless and personal.
    actor: name ? { name, source: T.declarative } : null,
    note: o.note ? redact(o.note.trim()).slice(0, NOTE_MAX) || null : null,
    fingerprint: k.fingerprint,
    commit: git("rev-parse", "HEAD"),
    automated: k.checks.map((c) => ({ id: c.id, status: c.status })),
  };
  const dir = join(o.targetDir, ...ATTESTATIONS_DIR);
  mkdirSync(dir, { recursive: true });
  const file = `${k.id}-${attestation.attestedAt.replace(/[:.]/g, "-")}.json`;
  writeFileSync(join(dir, file), JSON.stringify(attestation, null, 2) + "\n");
  return { code: 0, message: fill(T.done, k.id), file: [...ATTESTATIONS_DIR, file].join("/") };
}
