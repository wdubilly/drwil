// Presentation of the `drwil verify` verdict (split from verify.ts, which re-exports it): human
// output and stable machine format.
import { fill } from "./i18n.js";
import { rulesLine } from "./rules.js";
import type { Severity, Status, Verdict } from "./verify.js";

const LABELS: Record<Status, string> = {
  PASS: "GOVERNANCE: PASS",
  ATTESTED: "GOVERNANCE: PASS",
  FAIL: "GOVERNANCE: FAIL",
  MANUAL: "GOVERNANCE: MANUAL REVIEW REQUIRED",
  ERROR: "GOVERNANCE: VERIFY ERROR",
};
const SYMBOLS: Record<Status, string> = { PASS: "✓", ATTESTED: "◆", FAIL: "✗", MANUAL: "?", ERROR: "!" };
const SEVERITY_FR: Record<Severity, string> = { blocking: "bloquant", warning: "avertissement", advisory: "indicatif" };

const TEXTS = {
  fr: {
    contracts: "Contrats",
    unattached: "Contrôles cités par aucun contrat (non exécutés par verify) : {0}",
    counts: "{0} contrats : {1} PASS, {2} ATTESTED, {3} FAIL, {4} MANUAL, {5} ERROR",
    attested: "dont {0} obligation(s) bloquante(s) validée(s) par attestation humaine, pas par une preuve automatique",
    attestable: "Attestables par un humain (`drwil attest <ID>`) : {0}",
    severities:
      "dont {0} bloquant(s) ({1} satisfait(s)), {2} avertissement(s) non satisfait(s), {3} indicatif(s) non satisfait(s) — seuls les bloquants décident du verdict",
    severity: (s: Severity) => SEVERITY_FR[s],
    undeclared: "Contrats modifiés sans déclaration dans la fiche active (section « Contrats modifiés ») — clôture refusée : {0}",
    unproven: "Critères d'acceptation non prouvés de la fiche active (verdict et clôture) : {0}",
  },
  en: {
    contracts: "Contracts",
    unattached: "Checks cited by no contract (not run by verify): {0}",
    counts: "{0} contracts: {1} PASS, {2} ATTESTED, {3} FAIL, {4} MANUAL, {5} ERROR",
    attested: "including {0} blocking obligation(s) validated by human attestation, not by an automated proof",
    attestable: "Attestable by a human (`drwil attest <ID>`): {0}",
    severities:
      "including {0} blocking ({1} satisfied), {2} warning(s) not satisfied, {3} advisory not satisfied — only blocking contracts decide the verdict",
    severity: (s: Severity) => s,
    undeclared: "Contracts modified without declaration in the active brief (« Modified contracts » section) — closing refused: {0}",
    unproven: "Unproven acceptance criteria of the active brief (verdict and closing): {0}",
  },
};

/**
 * `text` with the first mention of each contract followed by its title, unless that mention already is
 * (QUA-039): an ID cited alone tells the human nothing. Same rule as .githooks/glossary.mjs, fed here by
 * the verdict itself (the titles are in it).
 */
export function labelIds(text: string, contracts: { id: string; title: string }[]): string {
  let out = text;
  for (const k of contracts) {
    if (!k.title) continue;
    const m = new RegExp(`(?<![A-Za-z0-9:-])${k.id}(?![0-9])`).exec(out);
    if (!m) continue;
    const end = m.index + m[0].length;
    if (out.slice(end, end + k.title.length + 6).includes(k.title.slice(0, 20))) continue;
    out = `${out.slice(0, end)}${out[end] === ")" ? ` — ${k.title}` : ` (${k.title})`}${out.slice(end)}`;
  }
  return out;
}

/** Human output of the verdict. The FAIL/MANUAL/ERROR detail stays visible contract by contract. */
export function formatVerdict(v: Verdict): string {
  const T = TEXTS[v.lang];
  const lines = ["drwil verify", ""];
  if (v.contracts.length) {
    lines.push(T.contracts);
    for (const k of v.contracts) {
      lines.push(
        `  ${SYMBOLS[k.status]} ${k.status.padEnd(6)} ${k.id.padEnd(8)} ${k.title}${k.severity === "blocking" ? "" : ` [${T.severity(k.severity)}]`}`,
      );
      for (const r of k.reasons) lines.push(`             ${r}`);
    }
    lines.push("");
  }
  for (const e of v.errors) lines.push(`! ${e}`);
  if (v.unattached.length) lines.push(fill(T.unattached, v.unattached.join(", ")));
  if (v.undeclared?.length) lines.push(fill(T.undeclared, v.undeclared.join(", ")));
  const unproven = (v.criteria ?? []).filter((c) => c.status !== "pass");
  if (unproven.length) lines.push(fill(T.unproven, unproven.map((c) => `« ${c.text} » (${c.status})`).join(", ")));
  const count = (s: Status) => v.contracts.filter((k) => k.status === s).length;
  if (v.contracts.length)
    lines.push(fill(T.counts, v.contracts.length, count("PASS"), count("ATTESTED"), count("FAIL"), count("MANUAL"), count("ERROR")));
  const attested = v.contracts.filter((k) => k.status === "ATTESTED" && k.severity === "blocking").length;
  if (v.status === "PASS" && attested) lines.push(fill(T.attested, attested));
  const toAttest = v.contracts.filter((k) => k.attestable).map((k) => k.id);
  if (toAttest.length) lines.push(fill(T.attestable, toAttest.join(", ")));
  const blocking = v.contracts.filter((k) => k.severity === "blocking");
  const notSatisfied = (s: Severity) =>
    v.contracts.filter((k) => k.severity === s && k.status !== "PASS" && k.status !== "ATTESTED").length;
  if (blocking.length !== v.contracts.length)
    lines.push(
      fill(
        T.severities,
        blocking.length,
        blocking.filter((k) => k.status === "PASS" || k.status === "ATTESTED").length,
        notSatisfied("warning"),
        notSatisfied("advisory"),
      ),
    );
  const rules = rulesLine(v.rules ?? [], v.lang);
  if (rules) lines.push(rules);
  lines.push("", LABELS[v.status]);
  return labelIds(lines.join("\n"), v.contracts);
}

/**
 * Stable machine format of `drwil verify --json` (DRWIL-004), version 1. Same exit codes as the
 * human output; FAIL and MANUAL stay distinct. The checks' raw output is not included (it may hold
 * sensitive data): see the evidence (DRWIL-013).
 */
export function verdictJson(v: Verdict) {
  const count = (s: Status) => v.contracts.filter((k) => k.status === s).length;
  return {
    version: 1,
    status: v.status.toLowerCase(),
    exitCode: v.code,
    contracts: {
      total: v.contracts.length,
      passed: count("PASS"),
      failed: count("FAIL"),
      manual: count("MANUAL"),
      error: count("ERROR"),
      attested: count("ATTESTED"),
    },
    bySeverity: Object.fromEntries(
      (["blocking", "warning", "advisory"] as Severity[]).map((severity) => {
        const ks = v.contracts.filter((k) => k.severity === severity);
        return [
          severity,
          {
            total: ks.length,
            passed: ks.filter((k) => k.status === "PASS").length,
            notPassed: ks.filter((k) => k.status !== "PASS" && k.status !== "ATTESTED").length,
          },
        ];
      }),
    ),
    results: v.contracts.map((k) => ({
      id: k.id,
      title: k.title,
      status: k.status.toLowerCase(),
      severity: k.severity,
      checks: k.checks.map(({ id, status, detail, message }) => ({
        id,
        status,
        ...(detail ? { detail } : {}),
        ...(message ? { message } : {}),
      })),
      manual: k.manual,
      attestable: k.attestable,
      attestation: k.attestation
        ? {
            attestedAt: k.attestation.attestedAt,
            actor: k.attestation.actor,
            note: k.attestation.note,
            fingerprint: k.attestation.fingerprint,
          }
        : null,
      reasons: k.reasons.filter((r) => !r.startsWith("  │")),
    })),
    errors: v.errors,
    unlinkedChecks: v.unattached,
    businessRules: v.rules ?? [],
    /** Acceptance criteria of the active brief, judged (QUA-034); empty without an active brief. */
    criteria: v.criteria ?? [],
  };
}
