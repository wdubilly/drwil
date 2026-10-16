// Business rules view of `drwil verify` (QUA-031 of the drwil repository): where the business non-regression stands, at a
// glance. A business rule is a contract with a business prefix (`APP` by default, setting
// `businessPrefixes` of .drwil/ia-first.json) or a contract born from a workstream (Origin field).
// One summary line in the outputs, the rule-by-rule detail in the JSON and the evidence.
import { fill, type MessageLang } from "./i18n.js";
import type { ContractResult } from "./verify.js";

/** tested: proven with cited tests; untested: proven, no test cited; to-complete: human part; broken: failing. */
export type RuleState = "tested" | "untested" | "to-complete" | "broken";

export interface BusinessRule {
  id: string;
  title: string;
  state: RuleState;
  tests: string[];
  /** The Origin field as written (« <workstream> — « <criterion> » »), or null. */
  origin: string | null;
}

const ORIGIN_FIELD = /^\*\*(?:Origine|Origin)\s*:?\*\*\s*:?\s*(.+)$/m;

export function businessRules(
  results: ContractResult[],
  contracts: { id: string; text?: string; tests?: string[] | null }[],
  cfg: { businessPrefixes?: unknown },
): BusinessRule[] {
  const prefixes = Array.isArray(cfg.businessPrefixes) ? (cfg.businessPrefixes as string[]) : ["APP"];
  const rules: BusinessRule[] = [];
  for (const r of results) {
    const k = contracts.find((c) => c.id === r.id);
    const origin = ORIGIN_FIELD.exec(k?.text ?? "")?.[1].trim() ?? null;
    if (!origin && !prefixes.includes(r.id.replace(/-\d+$/, ""))) continue;
    const tests = k?.tests ?? [];
    const state: RuleState =
      r.status === "FAIL" || r.status === "ERROR" ? "broken" : r.status === "PASS" ? (tests.length ? "tested" : "untested") : "to-complete";
    rules.push({ id: r.id, title: r.title, state, tests, origin });
  }
  return rules;
}

const TEXTS = {
  fr: {
    line: "Règles métier : {0}",
    tested: "{0} prouvée(s) par un test",
    untested: "{0} prouvée(s) sans test cité ({1})",
    "to-complete": "{0} à compléter ({1})",
    broken: "{0} cassée(s) ({1})",
    workstream: "{0}, chantier « {1} »",
  },
  en: {
    line: "Business rules: {0}",
    tested: "{0} proven by a test",
    untested: "{0} proven without a cited test ({1})",
    "to-complete": "{0} to complete ({1})",
    broken: "{0} broken ({1})",
    workstream: "{0}, workstream « {1} »",
  },
} satisfies Record<MessageLang, Record<string, string>>;

/** The summary line, or null without any business rule (no noise for a project that has none). */
export function rulesLine(rules: BusinessRule[], lang: MessageLang): string | null {
  if (!rules.length) return null;
  const T = TEXTS[lang];
  const parts: string[] = [];
  for (const state of ["tested", "untested", "to-complete", "broken"] as const) {
    const rs = rules.filter((r) => r.state === state);
    if (!rs.length) continue;
    // A broken rule names the workstream it protects (the part of the Origin before « — »).
    const ids = rs.map((r) => (state === "broken" && r.origin ? fill(T.workstream, r.id, r.origin.split(" — ")[0]) : r.id));
    parts.push(fill(T[state], rs.length, ids.join(", ")));
  }
  return fill(T.line, parts.join(", "));
}
