// Acceptance criteria of the active brief, judged against the verify verdict: the tool evaluates, the
// agent never grades itself. Split from verify.ts (QUA-001: files under 400 lines).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { MessageLang } from "./i18n.js";
import type { ContractResult } from "./verify.js";

/**
 * pass: proven by a durable, passing contract. no-proof: no link. unknown-proof: the link names
 * nothing in the registry. not-durable: a contract without a check cannot guard against regressions
 * (unless the criterion is human). no-contract: a check alone proves today but leaves nothing in the
 * registry (QUA-022). no-origin: a contract created by the workstream without its Origin field.
 * not-pass: the proof exists but does not pass.
 */
export type CriterionStatus = "pass" | "no-proof" | "unknown-proof" | "not-durable" | "no-contract" | "no-origin" | "not-pass";

export interface Criterion {
  text: string;
  link: string | null;
  human: boolean;
}

/** What the branch did to a linked contract, against its merge base: created, reused unchanged, or modified. */
export type ContractChange = "created" | "reused" | "modified";

export interface CriterionResult extends Criterion {
  status: CriterionStatus;
  /** Status of the linked contract or check, lowercase; null when nothing is linked or found. */
  proof: string | null;
  /** Null when the link is not a contract, or without a merge base to compare with. */
  change?: ContractChange | null;
}

export function evaluateCriteria(
  criteria: Criterion[],
  contracts: ContractResult[],
  changes: Map<string, ContractChange> | null = null,
  /** Contracts carrying an Origin field; null: not checked. */
  origins: Set<string> | null = null,
): CriterionResult[] {
  const passing = (s: string) => s === "pass" || s === "attested";
  return criteria.map((c) => {
    const change = c.link ? (changes?.get(c.link) ?? null) : null;
    const result = (status: CriterionStatus, proof: string | null = null): CriterionResult => ({ ...c, status, proof, change });
    if (!c.link) return result("no-proof");
    const contract = contracts.find((k) => k.id === c.link);
    if (contract) {
      const proof = contract.status.toLowerCase();
      const human = contract.manual !== null || contract.checks.length === 0;
      if (human !== c.human) return result("not-durable", proof);
      if (change === "created" && origins && !origins.has(contract.id)) return result("no-origin", proof);
      return result(passing(proof) ? "pass" : "not-pass", proof);
    }
    const check = contracts.flatMap((k) => k.checks).find((r) => r.id === c.link);
    if (!check || c.human) return result("unknown-proof");
    return result("no-contract", check.status);
  });
}

// Same reference as the hooks' scope gate (scope-gate.mjs): DRWIL_BASE, then origin/HEAD, then the usual names.
function mergeBase(root: string, env: NodeJS.ProcessEnv): string | null {
  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  const origin = git("symbolic-ref", "--quiet", "refs/remotes/origin/HEAD");
  const refs = [env.DRWIL_BASE, origin, "origin/master", "origin/main", "master", "main"];
  for (const ref of refs) {
    if (!ref || git("rev-parse", "--verify", "--quiet", `${ref}^{commit}`) === null) continue;
    const base = git("merge-base", "HEAD", ref);
    if (base) return base;
  }
  return null;
}

/**
 * Each contract of the registry, compared with the registry at the merge base of the branch. Null
 * outside git or without a reference branch: nothing to compare, nothing is judged on it.
 */
export function contractChanges(
  root: string,
  registry: string,
  current: { id: string; text?: string }[],
  read: (text: string) => { id: string; text?: string }[],
  env: NodeJS.ProcessEnv = process.env,
): Map<string, ContractChange> | null {
  const base = mergeBase(root, env);
  if (!base) return null;
  const r = spawnSync("git", ["show", `${base}:${registry}`], { cwd: root, encoding: "utf8" });
  // No registry at the base: the branch created every contract.
  const before = new Map(r.status === 0 ? read(r.stdout).map((k) => [k.id, (k.text ?? "").trim()]) : []);
  return new Map(
    current.map((k) => {
      const old = before.get(k.id);
      return [k.id, old === undefined ? "created" : old === (k.text ?? "").trim() ? "reused" : "modified"];
    }),
  );
}

const TABLE = {
  fr: {
    head: ["Critère", "Preuve", "Verdict"],
    status: {
      pass: "✅ prouvé",
      "no-proof": "❌ sans preuve",
      "unknown-proof": "❌ preuve inconnue du registre",
      "not-durable": "❌ preuve non durable",
      "no-contract": "❌ contrôle sans contrat (rien au registre)",
      "no-origin": "❌ contrat créé sans champ Origine",
      "not-pass": "❌ preuve non passante",
    },
    none: "aucun critère d'acceptation",
    change: { created: "créé", reused: "réutilisé", modified: "modifié" },
  },
  en: {
    head: ["Criterion", "Proof", "Verdict"],
    status: {
      pass: "✅ proven",
      "no-proof": "❌ no proof",
      "unknown-proof": "❌ proof unknown to the registry",
      "not-durable": "❌ proof not durable",
      "no-contract": "❌ check without a contract (nothing in the registry)",
      "no-origin": "❌ contract created without an Origin field",
      "not-pass": "❌ proof not passing",
    },
    none: "no acceptance criteria",
    change: { created: "created", reused: "reused", modified: "modified" },
  },
} satisfies Record<MessageLang, unknown>;

/** Review table "criterion → proof → verdict" for the pull request body; built from the evaluation, never typed by the agent. */
export function criteriaTable(criteria: CriterionResult[], lang: MessageLang): string {
  const T = TABLE[lang];
  if (!criteria.length) return `_${T.none}_\n`;
  const cell = (s: string) => s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
  const rows = criteria.map((c) => {
    const detail = [c.proof && cell(c.proof), c.change && T.change[c.change]].filter(Boolean).join(", ");
    const proof = c.link ? `\`${cell(c.link)}\`${detail ? ` (${detail})` : ""}` : "—";
    return `| ${cell(c.text)}${c.human ? " [human]" : ""} | ${proof} | ${T.status[c.status]} |`;
  });
  return [`| ${T.head.join(" | ")} |`, "|---|---|---|", ...rows].join("\n") + "\n";
}

/** The active brief as verify judges it: its criteria and the contracts it declares as changed on purpose. */
export interface ActiveBrief {
  criteria: Criterion[];
  declared: string[];
}

/** Active brief (.drwil/state.json), read by the project's own briefs.mjs; null when there is none to read. */
export async function activeBrief(root: string): Promise<ActiveBrief | null> {
  try {
    const brief = JSON.parse(readFileSync(join(root, ".drwil", "state.json"), "utf8"))?.active_brief;
    if (typeof brief !== "string") return null;
    const mod = await import(pathToFileURL(join(root, ".githooks", "briefs.mjs")).href);
    if (typeof mod.acceptanceCriteria !== "function") return null;
    const text = readFileSync(join(root, brief), "utf8");
    // A briefs.mjs older than the declarations declares nothing.
    return {
      criteria: mod.acceptanceCriteria(text),
      declared: typeof mod.declaredContracts === "function" ? mod.declaredContracts(text) : [],
    };
  } catch {
    return null;
  }
}

/** Criteria judged, and the contracts the branch modified without the brief declaring them (a regression until declared). */
export function judgeBrief(
  brief: ActiveBrief,
  contracts: ContractResult[],
  changes: Map<string, ContractChange> | null,
  registry: { id: string; text?: string }[] = [],
): { criteria: CriterionResult[]; undeclared: string[] } {
  const undeclared = [...(changes ?? [])].filter(([id, c]) => c === "modified" && !brief.declared.includes(id)).map(([id]) => id);
  const origins = new Set(registry.filter((k) => originOf(k.text)).map((k) => k.id));
  return { criteria: evaluateCriteria(brief.criteria, contracts, changes, origins), undeclared };
}

/**
 * What the active brief's criteria do to the verdict (QUA-034): FAIL if one is not proven, MANUAL if
 * the only gap is a human criterion whose contract awaits its attestation, null if all are proven.
 */
export function criteriaVerdict(criteria: CriterionResult[]): "FAIL" | "MANUAL" | null {
  const open = criteria.filter((c) => c.status !== "pass");
  if (!open.length) return null;
  return open.every((c) => c.human && c.status === "not-pass" && c.proof === "manual") ? "MANUAL" : "FAIL";
}

/** The Origin field of a contract's text (« <workstream> — « <criterion> » »), or null. */
export function originOf(text?: string): string | null {
  return /^\*\*(?:Origine|Origin)\s*:?\*\*\s*:?\s*(.+)$/m.exec(text ?? "")?.[1].trim() ?? null;
}

const ORIGIN = {
  fr: "protège {0} — régression si ce changement n'est pas déclaré dans la fiche active",
  en: "protects {0} — a regression unless this change is declared in the active brief",
} satisfies Record<MessageLang, string>;

/**
 * A failing contract born from an acceptance criterion says which one (« **Origine** : <workstream> —
 * « <criterion> » »): the reader sees what the failure breaks, not only which check failed.
 */
export function showOrigins(results: ContractResult[], contracts: { id: string; text?: string }[], lang: MessageLang): void {
  for (const r of results) {
    const origin = originOf(contracts.find((k) => k.id === r.id)?.text);
    if (origin && r.status === "FAIL") r.reasons.push(ORIGIN[lang].replace("{0}", origin));
  }
}
