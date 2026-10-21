// `drwil attest <ID>` (DRWIL-013, continued): explicit and traceable human proof of a MANUAL contract.
// It is not "the user typed y": the attestation is bound by fingerprint to the contract's text and to
// the definition of its proof and to the content of the files it covers; if one changes, it becomes obsolete and the contract is MANUAL again.
// It is recorded in .drwil/evidence/attestations/ (versioned, reviewed in PRs).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { ATTESTATIONS_DIR, redact, verify, type Attestation, type ContractResult } from "./verify.js";

export interface AttestOptions {
  targetDir: string;
  id: string;
  note?: string;
  /** Renew an attestation that is still valid (QUA-083): the confirmation stays the same. */
  renew?: boolean;
  /**
   * Human confirmation: receives the summary shown, returns true only if the human confirms.
   * The CLI requires an interactive terminal and typing the contract's identifier; no flag allows
   * doing without (an agent or a script cannot attest in a human's place).
   */
  confirm: (summary: string) => Promise<boolean>;
  /** Progress lines while the cited checks are re-run (they can take minutes): QUA-032. */
  log?: (line: string) => void;
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
    alreadyAttested:
      "{0} a déjà une attestation valide ({1}) : rien à attester (la renouveler volontairement : `drwil attest {0} --renew`)",
    renewing: "Renouvellement : l'attestation du {0} est encore valide, elle sera remplacée par une nouvelle (l'historique est conservé).",
    renewUseless: "{0} n'a pas d'attestation valide : rien à renouveler, `drwil attest {0}` suffit",
    covered: "Fichiers couverts : {0}",
    notAttestable:
      "{0} n'est pas attestable ({1}) : seule une partie humaine restante s'atteste, jamais un contrôle en échec, non exécuté ou non applicable — {2}",
    refused: "attestation refusée : rien n'a été enregistré",
    declarative: "git config user.name, déclaratif",
    done: "{0} attesté",
    checkRun: "relance de {0}…",
    checkDone: "  {0} : {1}",
  },
  en: {
    rule: "Rule: {0}",
    automated: "Automated proof:",
    noAutomated: "Automated proof: none",
    human: "Human part to attest: {0}",
    legacy: "legacy contract without a check: the whole proof",
    unknown: "unknown contract: {0}",
    alreadyPass: "{0} is already proven automatically (PASS): nothing to attest",
    alreadyAttested: "{0} already has a valid attestation ({1}): nothing to attest (renew it on purpose: `drwil attest {0} --renew`)",
    renewing: "Renewal: the attestation of {0} is still valid, it will be replaced by a new one (the history is kept).",
    renewUseless: "{0} has no valid attestation: nothing to renew, `drwil attest {0}` is enough",
    covered: "Covered files: {0}",
    notAttestable:
      "{0} is not attestable ({1}): only a remaining human part can be attested, never a failing, not run or not applicable check — {2}",
    refused: "attestation refused: nothing was recorded",
    declarative: "git config user.name, declarative",
    done: "{0} attested",
    checkRun: "re-running {0}…",
    checkDone: "  {0}: {1}",
  },
};

export function contractSummary(k: ContractResult, lang: MessageLang = "en"): string {
  const T = TEXTS[lang];
  const l = [`${k.id} — ${k.title}`, fill(T.rule, k.rule ?? "—")];
  if (k.checks.length) l.push(T.automated, ...k.checks.map((c) => `  ✓ ${c.id} : ${c.status}`));
  else l.push(T.noAutomated);
  l.push(fill(T.human, k.manual ?? T.legacy));
  if (k.covers) l.push(fill(T.covered, `${Object.keys(k.coverage).length} (${k.covers.join(", ")})`));
  return l.join("\n");
}

export async function attest(o: AttestOptions): Promise<AttestResult> {
  // verify gives the language only at the end: the project's, read the same way.
  const L = TEXTS[projectLang(o.targetDir)];
  const onCheck = (id: string, status?: string) => o.log?.(status ? fill(L.checkDone, id, status) : fill(L.checkRun, id));
  const v = await verify({ targetDir: o.targetDir, only: [o.id], onCheck });
  const T = TEXTS[v.lang];
  if (v.errors.length && !v.contracts.length) return { code: 2, message: v.errors.join(" ; ") };
  const k = v.contracts.find((c) => c.id === o.id);
  if (!k) return { code: 2, message: fill(T.unknown, o.id) };
  if (k.status === "PASS") return { code: 1, message: fill(T.alreadyPass, o.id) };
  if (o.renew && !k.renewable) return { code: 1, message: fill(T.renewUseless, o.id) };
  if (k.status === "ATTESTED" && !o.renew) return { code: 1, message: fill(T.alreadyAttested, o.id, k.attestation?.attestedAt) };
  if (!k.attestable && !k.renewable) return { code: 1, message: fill(T.notAttestable, o.id, k.status, k.reasons.join(" ; ")) };
  const renewing = k.renewable && k.attestation ? `${fill(T.renewing, k.attestation.attestedAt)}\n` : "";
  if (!(await o.confirm(renewing + contractSummary(k, v.lang)))) return { code: 1, message: T.refused };

  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: o.targetDir, encoding: "utf8" });
    return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : null;
  };
  const name = git("config", "user.name");
  const now = o.now ?? new Date();
  const attestation: Attestation = {
    version: 3,
    contract: k.id,
    status: "ATTESTED",
    attestedAt: now.toISOString(),
    // Declarative identity (no account, no signature); never the e-mail: useless and personal.
    actor: name ? { name, source: T.declarative } : null,
    note: o.note ? redact(o.note.trim()).slice(0, NOTE_MAX) || null : null,
    fingerprint: k.fingerprint,
    proof: k.proof,
    covers: k.covers,
    coverage: k.coverage,
    commit: git("rev-parse", "HEAD"),
    automated: k.checks.map((c) => ({ id: c.id, status: c.status })),
  };
  const dir = join(o.targetDir, ...ATTESTATIONS_DIR);
  mkdirSync(dir, { recursive: true });
  const file = `${k.id}-${attestation.attestedAt.replace(/[:.]/g, "-")}.json`;
  writeFileSync(join(dir, file), JSON.stringify(attestation, null, 2) + "\n");
  return { code: 0, message: fill(T.done, k.id), file: [...ATTESTATIONS_DIR, file].join("/") };
}
