// Presentation of the `drwil verify` verdict (split from verify.ts, which re-exports it): human
// output and stable machine format.
import { durabilityHint } from "./criteria.js";
import { fill } from "./i18n.js";
import { rulesLine } from "./rules.js";
import type { Severity, Status, Verdict } from "./verify.js";
import { TEXTS } from "./verdict-texts.js";

const LABELS: Record<Status, string> = {
  PASS: "GOVERNANCE: PASS",
  ATTESTED: "GOVERNANCE: PASS",
  FAIL: "GOVERNANCE: FAIL",
  MANUAL: "GOVERNANCE: MANUAL REVIEW REQUIRED",
  ERROR: "GOVERNANCE: VERIFY ERROR",
};
// QUA-159: a partial verdict never carries the PASS label an agent or a script reads as "verified".
export const PARTIAL_LABEL = "GOVERNANCE: PARTIAL (--failed) — NOT A VERDICT";
const SYMBOLS: Record<Status, string> = { PASS: "✓", ATTESTED: "◆", FAIL: "✗", MANUAL: "?", ERROR: "!" };

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
  for (const notice of v.notices ?? []) lines.push(`- ${notice}`);
  if (v.unattached.length) lines.push(fill(T.unattached, v.unattached.join(", ")));
  if (v.undeclared?.length) lines.push(fill(T.undeclared, v.undeclared.join(", ")));
  const unproven = (v.criteria ?? []).filter((c) => c.status !== "pass");
  if (unproven.length)
    lines.push(
      fill(
        T.unproven,
        unproven.map((c) => `« ${c.text} » (${[c.status, durabilityHint(c, v.lang)].filter(Boolean).join(" : ")})`).join(", "),
      ),
    );
  if (v.proofs?.length)
    lines.push(fill(T.proofs, v.proofs.map((c) => `${c.workstream} « ${c.text} » (${c.link ?? "—"} : ${c.status})`).join(", ")));
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
  if (v.partial) {
    const p = v.partial;
    lines.push(p.previous ? fill(T.partial, p.replayed.length, p.previous, p.skipped) : T.partialNone);
    if (p.manual.length) lines.push(fill(T.partialManual, p.manual.join(", ")));
    lines.push(T.partialEnd);
  }
  lines.push("", v.partial ? PARTIAL_LABEL : LABELS[v.status]);
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
    status: v.partial ? "partial" : v.status.toLowerCase(),
    ...(v.partial ? { partial: { ...v.partial, outcome: v.status.toLowerCase() } } : {}),
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
    ...(v.notices?.length ? { notices: v.notices } : {}),
    unlinkedChecks: v.unattached,
    businessRules: v.rules ?? [],
    /** Acceptance criteria of the active brief, judged (QUA-034); empty without an active brief. */
    criteria: v.criteria ?? [],
    /** Criteria of the closed workstreams whose proof has disappeared (QUA-085); empty when they all hold. */
    closureProofs: v.proofs ?? [],
  };
}
