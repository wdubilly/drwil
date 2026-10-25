// `drwil verify`: validation gate of the work (DRWIL-003). Chain obligation (contract) → check →
// proof → verdict. Work is verified by drwil only if the verdict is PASS: FAIL is to fix, MANUAL is
// not validated yet (never a deferred success), ERROR means drwil cannot establish the verdict.
//
// No check is implemented here: verify loads the engine installed in the project
// (.githooks/engine.mjs), the same as the git hooks, and the contract reader
// (.githooks/contracts.mjs). The hooks therefore never need drwil, and each check has a single
// implementation.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { judgeDurable, type ProofResult } from "./closure.js";
import { changeLines, type Coverage, coverageChanges, coverageOf, lacksCoverage, noCoversMessage } from "./coverage.js";
import { type CriterionResult, showOrigins } from "./criteria.js";
import { type Attestation, readAttestations, reusableVerdicts } from "./evidence.js";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { judgeGuarantees } from "./guarantees.js";
import { type BusinessRule, businessRules } from "./rules.js";

export { formatVerdict, verdictJson } from "./verdict.js";
export { ATTESTATIONS_DIR, readAttestations, redact, writeEvidence, type Attestation } from "./evidence.js";
export { criteriaTable, evaluateCriteria, type CriterionResult, type CriterionStatus } from "./criteria.js";

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
}

export interface VerifyOptions {
  targetDir: string;
  /** Only verify these contracts (and only run their checks): used by `drwil attest`. */
  only?: string[];
  /** Called before each check is run (no status), then with its status: `drwil attest` shows them. */
  onCheck?: (id: string, status?: string) => void;
  /** QUA-140: `false` replays every check instead of taking the verdicts of a `run-checks` pass on an identical tree. */
  reuse?: boolean;
}

/**
 * Fingerprint of what an attestation covers: the contract's text and the definition of the checks
 * it cites (command and folder of a project check). If one changes, the attestation is obsolete.
 */
export function fingerprint(k: { text?: string; checks?: string[] | null }, cfg: Record<string, any>): string {
  const checks: any[] = Array.isArray(cfg.checks) ? cfg.checks : [];
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

export function proofFingerprints(k: { checks?: string[] | null }, cfg: Record<string, any>): Record<string, string> {
  const checks: any[] = Array.isArray(cfg.checks) ? cfg.checks : [];
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
function covers(a: Attestation, k: any, cfg: Record<string, any>, proof: Record<string, string>, coverage: Coverage): boolean {
  if (a.version !== 2 && a.version !== 3) return a.fingerprint === fingerprint(k, cfg);
  const human = humanFingerprint(a.version === 3 ? k : { ...k, covers: null });
  const files = a.version !== 3 || coverageChanges(a.coverage ?? {}, coverage).length === 0;
  return a.fingerprint === human && files && Object.entries(a.proof ?? {}).every(([id, h]) => proof[id] === h);
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

const TEXTS = {
  fr: {
    noEngine: "moteur de contrôles absent (.githooks/engine.mjs, .githooks/contracts.mjs) : relancer `drwil init`",
    noConfig: "configuration illisible ou absente (.drwil/ia-first.json)",
    noRegistry: "registre des contrats absent ({0})",
    noContract: "aucun contrat trouvé dans {0}",
    ok: "{0} : ok (automatisé)",
    reused: "{0} : repris de run-checks du {1}",
    replayed: "{0} : rejoué",
    failed: "{0} : échec{1}",
    shared: "{0} est partagé par {1} : échec non attribuable à une seule règle — un contrôle par règle, qui filtre ses tests par l'ID",
    notRun: "{0} : non exécuté ({1})",
    notApplicable: "{0} : non applicable ici ({1}), preuve non établie",
    noCheck: "aucun contrôle déclaré (contrat historique) : preuve humaine requise",
    human: "humain requis : {0}",
    attested: "attesté le {0}{1}{2}",
    by: " par {0} ({1})",
    obsolete: "attestation du {0} obsolète : le contrat ou sa preuve a changé depuis, à attester de nouveau",
  },
  en: {
    noEngine: "check engine missing (.githooks/engine.mjs, .githooks/contracts.mjs): run `drwil init` again",
    noConfig: "configuration unreadable or missing (.drwil/ia-first.json)",
    noRegistry: "contract registry missing ({0})",
    noContract: "no contract found in {0}",
    ok: "{0}: ok (automated)",
    reused: "{0}: reused from run-checks of {1}",
    replayed: "{0}: replayed",
    failed: "{0}: failed{1}",
    shared: "{0} is shared by {1}: failure not attributable to a single rule — one check per rule, filtering its tests by the ID",
    notRun: "{0}: not run ({1})",
    notApplicable: "{0}: not applicable here ({1}), proof not established",
    noCheck: "no declared check (legacy contract): human proof required",
    human: "human required: {0}",
    attested: "attested on {0}{1}{2}",
    by: " by {0} ({1})",
    obsolete: "attestation of {0} obsolete: the contract or its proof changed since, to attest again",
  },
};

function globalError(message: string, lang: MessageLang): Verdict {
  return { lang, status: "ERROR", code: 2, contracts: [], errors: [message], unattached: [] };
}

export interface Project {
  lang: MessageLang;
  cfg: Record<string, any>;
  registry: string;
  engine: any;
  contracts: any;
}

/**
 * Loads the engine and the contract reader installed in the project (never the package's ones):
 * verify, doctor and contracts judge what the project's hooks actually run.
 * Returns an error message if the project cannot be used.
 */
export async function loadProject(root: string): Promise<Project | string> {
  const lang = projectLang(root);
  const T = TEXTS[lang];
  const enginePath = join(root, ".githooks", "engine.mjs");
  const contractsPath = join(root, ".githooks", "contracts.mjs");
  if (!existsSync(enginePath) || !existsSync(contractsPath)) return T.noEngine;
  let cfg: Record<string, any>;
  try {
    cfg = JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return T.noConfig;
  }
  const registry: string = cfg.dirs?.contracts ?? "docs/contracts.md";
  if (!existsSync(join(root, registry))) return fill(T.noRegistry, registry);
  const engine = await import(pathToFileURL(enginePath).href);
  const contracts = await import(pathToFileURL(contractsPath).href);
  return { lang, cfg, registry, engine, contracts };
}

export async function verify(opts: VerifyOptions): Promise<Verdict> {
  const root = opts.targetDir;
  const project = await loadProject(root);
  if (typeof project === "string") return globalError(project, projectLang(root));
  const { lang, cfg, registry, engine, contracts: reader } = project;
  const T = TEXTS[lang];
  const all: any[] = reader.readContracts(readFileSync(join(root, registry), "utf8"));
  if (!all.length) return globalError(fill(T.noContract, registry), lang);
  const only = opts.only;
  const contracts = only ? all.filter((k) => only.includes(k.id)) : all;
  const attestations = readAttestations(root);

  // A duplicate makes the registry itself ambiguous: global error. The other errors concern a contract.
  const errors: string[] = [];
  const byContract = new Map<string, string[]>();
  for (const e of reader.validateContracts(all, reader.knownChecks(cfg), lang) as { id: string; type: string; message: string }[]) {
    if (e.type === "duplicate") errors.push(e.message);
    else byContract.set(e.id, [...(byContract.get(e.id) ?? []), e.message]);
  }

  // `whole`: verify judges the whole repository (e.g. gitleaks on the whole history), not an empty index.
  const available = new Map<string, any>(engine.checks(root, { cfg, whole: true }).map((c: any) => [c.id, c]));
  const cache = new Map<string, CheckResult>();
  // A check cited by several contracts cannot say which rule its failure breaks: verify says so.
  const citedBy = (id: string) => all.filter((k) => (k.checks ?? []).includes(id)).map((k) => k.id);
  // QUA-139: with the engine's `parallel` setting the cited command checks are started together (same limit as
  // run-checks), then read in registry order: the verdict and the reasons are those of a serial pass.
  const cited = [...new Set(contracts.flatMap((k) => ((k.checks ?? []) as string[]).filter((id) => available.has(id))))];
  // QUA-140: a verdict `run-checks` left on an identical tree and configuration is taken, not replayed.
  const reused = opts.reuse === false ? new Map() : reusableVerdicts(root, engine, available);
  const started: Map<string, Promise<any>> | undefined = engine.startParallel?.(
    cited.filter((id) => !reused.has(id)).map((id) => available.get(id)),
  );
  const run = async (id: string): Promise<void> => {
    opts.onCheck?.(id);
    const taken = reused.get(id);
    if (taken) {
      opts.onCheck?.(id, taken.status);
      return void cache.set(id, { id, status: taken.status, output: taken.output, durationMs: taken.durationMs, reusedAt: taken.ranAt });
    }
    const pending = started?.get(id);
    const { launched: _launched, ...raw } = pending
      ? await pending.catch((e: Error) => ({ status: "not-run", detail: e.message }))
      : available.get(id).run({ stdio: "pipe" });
    opts.onCheck?.(id, raw.status);
    cache.set(id, { id, ...raw });
  };
  for (const id of cited) await run(id);

  const results: (ContractResult & { invalidConfig?: boolean })[] = contracts.map((k) => {
    const reasons = [...(byContract.get(k.id) ?? [])];
    const statuses: Status[] = reasons.length ? ["ERROR"] : [];
    // An unknown check is already a validation error: it is not "run".
    const checks = ((k.checks ?? []) as string[]).filter((id) => available.has(id)).map((id) => cache.get(id) ?? { id, status: "unknown" });
    for (const r of checks) {
      if (r.status === "ok" || r.status === "fail") reasons.push(fill(r.reusedAt ? T.reused : T.replayed, r.id, r.reusedAt));
      if (r.status === "ok") reasons.push(fill(T.ok, r.id));
      else if (r.status === "fail") {
        statuses.push("FAIL");
        reasons.push(fill(T.failed, r.id, r.message ? ` — ${r.message}` : ""));
        const sharers = citedBy(r.id);
        if (sharers.length > 1) reasons.push(fill(T.shared, r.id, sharers.join(", ")));
        // The last lines of the output say why, without drowning the verdict.
        const lines = (r.output ?? "").split(/\r?\n/).map((l) => l.trimEnd());
        for (const l of lines.filter(Boolean).slice(-3)) reasons.push(`  │ ${l}`);
      } else if (r.status === "not-run") {
        statuses.push("ERROR");
        reasons.push(fill(T.notRun, r.id, r.detail));
      } else if (r.status === "not-applicable") {
        statuses.push("MANUAL");
        reasons.push(fill(T.notApplicable, r.id, r.detail));
      }
    }
    if (k.checks === null && !k.manual) {
      statuses.push("MANUAL");
      reasons.push(T.noCheck);
    }
    if (k.manual) {
      statuses.push("MANUAL");
      reasons.push(fill(T.human, k.manual));
    }
    let status = worst(statuses);
    // Attestable: only the human judgement is missing. Never if a check fails, does not run or does
    // not apply here (an attestation does not replace a missing automated proof).
    const attestable =
      status === "MANUAL" && !byContract.has(k.id) && checks.every((r) => r.status === "ok") && (Boolean(k.manual) || k.checks === null);
    const proof = proofFingerprints(k, cfg);
    const coverage = coverageOf(root, k.covers);
    let attestation: Attestation | null = null;
    const own = attestations.filter((a) => a.contract === k.id);
    if (attestable && own.length) {
      attestation = own.find((a) => covers(a, k, cfg, proof, coverage)) ?? null;
      if (attestation) {
        status = "ATTESTED";
        reasons.push(
          fill(
            T.attested,
            attestation.attestedAt,
            attestation.actor ? fill(T.by, attestation.actor.name, attestation.actor.source) : "",
            attestation.note ? ` — ${attestation.note}` : "",
          ),
        );
      } else {
        reasons.push(fill(T.obsolete, own[0].attestedAt));
        if (own[0].version === 3) reasons.push(...changeLines(own[0].coverage, coverage, lang));
      }
    }
    if (lacksCoverage(k) && !byContract.has(k.id)) reasons.push(noCoversMessage(lang));
    return {
      id: k.id,
      title: k.title,
      rule: k.rule ?? null,
      status,
      attestation,
      attestable: attestable && !attestation,
      renewable: attestable && attestation !== null,
      covers: k.covers ?? null,
      coverage,
      fingerprint: humanFingerprint(k),
      proof,
      severity: (k.severity ?? "blocking") as Severity,
      checks,
      manual: k.manual,
      reasons,
      invalidConfig: byContract.has(k.id),
    };
  });

  const citedIds = new Set(contracts.flatMap((k) => k.checks ?? []));
  const unattached = [...available.keys()].filter((id) => !citedIds.has(id));
  // Gate: blocking contracts only; a malformed registry stays an ERROR whatever the severity of the
  // contract concerned (the configuration itself is not reliable).
  const deciding = results.filter((r) => r.severity === "blocking").map((r) => r.status);
  const configKo = results.some((r) => r.invalidConfig) || errors.length > 0;
  const status = worst([...deciding, ...(configKo ? (["ERROR"] as Status[]) : [])]);
  for (const r of results) delete r.invalidConfig;
  showOrigins(results, all, lang);
  const verdict: Verdict = { lang, status, code: CODES[status], contracts: results, errors, unattached };
  verdict.rules = businessRules(results, all, cfg);
  // Criteria of the active brief and of the closed workstreams (QUA-034, QUA-085), judged outside this file (QUA-001).
  if (!only) await judgeDurable(verdict, { root, registry, cfg, contracts: all, read: reader.readContracts });
  if (!only) judgeGuarantees(verdict, root, cfg, all);
  return verdict;
}
