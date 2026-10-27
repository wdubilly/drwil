// `drwil verify`: validation gate of the work (DRWIL-003). Chain obligation (contract) → check →
// proof → verdict. Work is verified by drwil only if the verdict is PASS: FAIL is to fix, MANUAL is
// not validated yet (never a deferred success), ERROR means drwil cannot establish the verdict.
//
// No check is implemented here: verify loads the engine installed in the project
// (.githooks/engine.mjs), the same as the git hooks, and the contract reader
// (.githooks/contracts.mjs). The hooks therefore never need drwil, and each check has a single
// implementation.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { judgeDurable } from "./closure.js";
import { changeLines, coverageOf, lacksCoverage, noCoversMessage } from "./coverage.js";
import { showOrigins } from "./criteria.js";
import { type Attestation, readAttestations, reusableVerdicts } from "./evidence.js";
import { covers, humanFingerprint, proofFingerprints } from "./fingerprint.js";
import { fill, projectLang } from "./i18n.js";
import { judgeGuarantees } from "./guarantees.js";
import { businessRules } from "./rules.js";
import { globalError, loadProject } from "./verify-project.js";
import { TEXTS } from "./verify-texts.js";
import {
  CODES,
  type CheckResult,
  type ContractResult,
  type Severity,
  type Status,
  type Verdict,
  type VerifyOptions,
  worst,
} from "./verify-types.js";

export { formatVerdict, verdictJson } from "./verdict.js";
export { ATTESTATIONS_DIR, readAttestations, redact, writeEvidence, type Attestation } from "./evidence.js";
export { criteriaTable, evaluateCriteria, type CriterionResult, type CriterionStatus } from "./criteria.js";
export { fingerprint, humanFingerprint, proofFingerprints } from "./fingerprint.js";
export { loadProject, type Project } from "./verify-project.js";
export {
  CODES,
  worst,
  type CheckResult,
  type ContractResult,
  type Severity,
  type Status,
  type Verdict,
  type VerifyOptions,
} from "./verify-types.js";

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
  const reused = opts.reuse === false ? new Map() : reusableVerdicts(root, engine, available, !opts.evidence);
  const started: Map<string, Promise<any>> | undefined = engine.startParallel?.(
    cited.filter((id) => !reused.has(id)).map((id) => available.get(id)),
  );
  const run = async (id: string): Promise<void> => {
    opts.onCheck?.(id);
    const taken = reused.get(id);
    if (taken) {
      opts.onCheck?.(id, taken.status);
      return void cache.set(id, {
        id,
        status: taken.status,
        output: taken.output,
        durationMs: taken.durationMs,
        reusedAt: taken.ranAt,
        reusedBasis: taken.basis,
      });
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
      if (r.status === "ok" || r.status === "fail")
        reasons.push(fill(!r.reusedAt ? T.replayed : r.reusedBasis === "control" ? T.reusedControl : T.reused, r.id, r.reusedAt));
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
