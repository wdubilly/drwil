// `drwil verify`: validation gate of the work (DRWIL-003). Chain obligation (contract) → check →
// proof → verdict. Work is verified by drwil only if the verdict is PASS: FAIL is to fix, MANUAL is
// not validated yet (never a deferred success), ERROR means drwil cannot establish the verdict.
//
// No check is implemented here: verify loads the engine installed in the project
// (.githooks/engine.mjs), the same as the git hooks, and the contract reader
// (.githooks/contracts.mjs). The hooks therefore never need drwil, and each check has a single
// implementation.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { activeCriteria, evaluateCriteria, type CriterionResult } from "./criteria.js";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { verdictJson } from "./verdict.js";

export { formatVerdict, verdictJson } from "./verdict.js";
export { evaluateCriteria, type CriterionResult, type CriterionStatus } from "./criteria.js";

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
  /** Current fingerprint of the contract and its proof. */
  fingerprint: string;
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
}

export interface VerifyOptions {
  targetDir: string;
  /** Only verify these contracts (and only run their checks): used by `drwil attest`. */
  only?: string[];
}

export interface Attestation {
  version: 1;
  contract: string;
  status: "ATTESTED";
  attestedAt: string;
  actor: { name: string; source: string } | null;
  note: string | null;
  fingerprint: string;
  commit: string | null;
  automated: { id: string; status: string }[];
}

/** Versioned folder of the attestations (the rest of .drwil/evidence/ is outside git). */
export const ATTESTATIONS_DIR = [".drwil", "evidence", "attestations"];

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

export function readAttestations(root: string): Attestation[] {
  const dir = join(root, ...ATTESTATIONS_DIR);
  if (!existsSync(dir)) return [];
  const all: Attestation[] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    try {
      const a = JSON.parse(readFileSync(join(dir, f), "utf8"));
      if (a?.status === "ATTESTED" && typeof a.contract === "string" && typeof a.fingerprint === "string") all.push(a);
    } catch {}
  }
  return all.sort((a, b) => String(b.attestedAt).localeCompare(String(a.attestedAt)));
}

const CODES: Record<Status, 0 | 1 | 2> = { PASS: 0, ATTESTED: 0, FAIL: 1, MANUAL: 1, ERROR: 2 };

/**
 * Deterministic priority, per contract as for the overall verdict: FAIL > ERROR > MANUAL > PASS.
 * FAIL wins (a failure is established); ERROR comes before MANUAL (a proof that could not be produced
 * makes the verdict undeterminable); PASS only if everything is proven.
 */
function worst(statuses: Status[]): Status {
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
    failed: "{0} : échec{1}",
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
    failed: "{0}: failed{1}",
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
  const run = (id: string): CheckResult => {
    const known = cache.get(id);
    if (known) return known;
    const c = available.get(id);
    const r: CheckResult = c ? { id, ...c.run({ stdio: "pipe" }) } : { id, status: "unknown" };
    cache.set(id, r);
    return r;
  };

  const results: (ContractResult & { invalidConfig?: boolean })[] = contracts.map((k) => {
    const reasons = [...(byContract.get(k.id) ?? [])];
    const statuses: Status[] = reasons.length ? ["ERROR"] : [];
    // An unknown check is already a validation error: it is not "run".
    const checks = ((k.checks ?? []) as string[]).filter((id) => available.has(id)).map(run);
    for (const r of checks) {
      if (r.status === "ok") reasons.push(fill(T.ok, r.id));
      else if (r.status === "fail") {
        statuses.push("FAIL");
        reasons.push(fill(T.failed, r.id, r.message ? ` — ${r.message}` : ""));
        // The last lines of the output say why, without drowning the verdict.
        const tail = (r.output ?? "")
          .split(/\r?\n/)
          .map((l) => l.trimEnd())
          .filter(Boolean)
          .slice(-3);
        for (const l of tail) reasons.push(`  │ ${l}`);
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
    const current = fingerprint(k, cfg);
    let attestation: Attestation | null = null;
    const own = attestations.filter((a) => a.contract === k.id);
    if (attestable && own.length) {
      attestation = own.find((a) => a.fingerprint === current) ?? null;
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
      }
    }
    return {
      id: k.id,
      title: k.title,
      rule: k.rule ?? null,
      status,
      attestation,
      attestable: attestable && !attestation,
      fingerprint: current,
      severity: (k.severity ?? "blocking") as Severity,
      checks,
      manual: k.manual,
      reasons,
      invalidConfig: byContract.has(k.id),
    };
  });

  const cited = new Set(contracts.flatMap((k) => k.checks ?? []));
  const unattached = [...available.keys()].filter((id) => !cited.has(id));
  // Gate: blocking contracts only; a malformed registry stays an ERROR whatever the severity of the
  // contract concerned (the configuration itself is not reliable).
  const deciding = results.filter((r) => r.severity === "blocking").map((r) => r.status);
  const configKo = results.some((r) => r.invalidConfig) || errors.length > 0;
  const status = worst([...deciding, ...(configKo ? (["ERROR"] as Status[]) : [])]);
  for (const r of results) delete r.invalidConfig;
  const found = only ? null : await activeCriteria(root);
  const verdict: Verdict = { lang, status, code: CODES[status], contracts: results, errors, unattached };
  if (found) verdict.criteria = evaluateCriteria(found, results);
  return verdict;
}

// Redaction before any evidence is written (SEC-007): a check's output may contain a secret (a test
// that prints its configuration, a verbose tool). Deliberately broad patterns: better to hide a false
// positive than to keep a real key.
const SECRET_PATTERNS: RegExp[] = [
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /((?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)\s*[:=]\s*)\S+/gi,
  /\b[A-Za-z0-9+/_-]{40,}={0,2}\b/g,
];

export function redact(text: string): string {
  let t = text;
  for (const re of SECRET_PATTERNS)
    t = t.replace(re, (m, prefix) => (typeof prefix === "string" && m.startsWith(prefix) ? `${prefix}[REDACTED]` : "[REDACTED]"));
  return t;
}

/**
 * Evidence of a verify run (DRWIL-013): RULE → PROOF → EVIDENCE. Writes
 * .drwil/evidence/verify-<timestamp>.json (outside git) and returns its relative path. Holds the
 * verdict, the timestamp, the commit (and whether the worktree was modified), and for each check its
 * status with a readable summary: the last lines of its output, redacted.
 */
export function writeEvidence(root: string, v: Verdict, now = new Date()): string {
  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  const commit = git("rev-parse", "HEAD");
  const dirty = commit ? Boolean(git("status", "--porcelain")) : null;
  const summary = (output?: string) =>
    redact(
      (output ?? "")
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter(Boolean)
        .slice(-5)
        .join("\n"),
    );
  const evidence = {
    ...verdictJson(v),
    verifiedAt: now.toISOString(),
    commit,
    dirtyWorktree: dirty,
    evidence: v.contracts.map((k) => ({
      id: k.id,
      status: k.status.toLowerCase(),
      checks: k.checks.map((c) => ({
        id: c.id,
        status: c.status,
        summary: c.status === "ok" ? "ok" : summary(c.output) || redact(c.detail ?? c.message ?? ""),
      })),
      manual: k.manual,
    })),
    ...(v.criteria ? { criteria: v.criteria } : {}),
  };
  const dir = join(root, ".drwil", "evidence");
  mkdirSync(dir, { recursive: true });
  const name = `verify-${now.toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(join(dir, name), JSON.stringify(evidence, null, 2) + "\n");
  return `.drwil/evidence/${name}`;
}
