// Evidence of a `drwil verify` run and redaction of what it keeps (split from verify.ts, which
// re-exports it).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Coverage } from "./coverage.js";
import { criteriaTable } from "./criteria.js";
import { verdictJson } from "./verdict.js";
import type { Verdict } from "./verify.js";

// Redaction before any evidence is written (SEC-007): a check's output may contain a secret (a test
// that prints its configuration, a verbose tool). Deliberately broad patterns: better to hide a false
// positive than to keep a real key.
const SECRET_PATTERNS: RegExp[] = [
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g,
  /((?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)\s*[:=]\s*)\S+/gi,
  /\b[A-Za-z0-9+/_-]{40,}={0,2}\b/g,
];

// Private key blocks, found without a lazy « BEGIN … END » pattern: that one is quadratic on an input
// repeating BEGIN without END (CodeQL js/polynomial-redos). A block's body may hold dashes (header of a
// legacy encrypted key): it runs up to the next END, whatever it contains.
function redactKeyBlocks(text: string): string {
  const begin = /-----BEGIN [A-Z ]{0,30}PRIVATE KEY-----/g;
  const end = /-----END [A-Z ]{0,30}PRIVATE KEY-----/g;
  let out = "";
  let last = 0;
  for (let b = begin.exec(text); b; b = begin.exec(text)) {
    end.lastIndex = begin.lastIndex;
    const e = end.exec(text);
    if (!e) break;
    out += `${text.slice(last, b.index)}[REDACTED]`;
    last = begin.lastIndex = e.index + e[0].length;
  }
  return out + text.slice(last);
}

export function redact(text: string): string {
  let t = redactKeyBlocks(text);
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
        ...(c.durationMs === undefined ? {} : { durationMs: c.durationMs }),
        ...(c.reusedAt ? { reusedFrom: "run-checks", reusedAt: c.reusedAt, reusedBasis: c.reusedBasis } : { replayed: true }),
        summary: c.status === "ok" ? "ok" : summary(c.output) || redact(c.detail ?? c.message ?? ""),
      })),
      manual: k.manual,
      // Coverage computed once by coverage.ts: the closing's proof file carries its fingerprint (QUA-084).
      ...(k.covers ? { covers: k.covers, coverage: k.coverage ?? {} } : {}),
    })),
    ...(v.criteria ? { criteria: v.criteria } : {}),
    ...(v.undeclared ? { undeclared: v.undeclared } : {}),
  };
  const dir = join(root, ".drwil", "evidence");
  mkdirSync(dir, { recursive: true });
  const name = `verify-${now.toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(join(dir, name), JSON.stringify(evidence, null, 2) + "\n");
  // Next to the evidence, the table to paste in the pull request (`gh pr create --body-file`); not named
  // verify-*.json, so verifyEvidence never mistakes it for the evidence.
  if (v.criteria) writeFileSync(join(dir, name.replace(/^verify-(.+)\.json$/, "criteria-$1.md")), criteriaTable(v.criteria, v.lang));
  return `.drwil/evidence/${name}`;
}

export interface Attestation {
  /** 1: bound to the whole section and its checks; 2: to the human part and to each attested check; 3: and to the content of the covered files. */
  version: 1 | 2 | 3;
  contract: string;
  status: "ATTESTED";
  attestedAt: string;
  actor: { name: string; source: string } | null;
  note: string | null;
  fingerprint: string;
  /** Version 2: fingerprint of each attested check's definition. */
  proof?: Record<string, string>;
  /** Version 3: patterns of the `**Covers**` field and fingerprint of each file they matched. */
  covers?: string[] | null;
  coverage?: Coverage;
  commit: string | null;
  automated: { id: string; status: string }[];
}

/** Versioned folder of the attestations (the rest of .drwil/evidence/ is outside git). */
export const ATTESTATIONS_DIR = [".drwil", "evidence", "attestations"];

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

/** Verdict of a check played by a `run-checks` pass (QUA-140), on the same tree or on the same files of the check (QUA-141). */
export interface ReusedVerdict {
  status: "ok" | "fail";
  output: string;
  durationMs?: number;
  ranAt: string;
  /** `tree`: identical tree (QUA-140); `control`: the files of the check's `paths` and its declaration are identical (QUA-141). */
  basis: "tree" | "control";
}

/**
 * Verdicts `run-checks` left (.drwil/evidence/run-checks-verdicts.json) that `verify` may take instead of replaying the check.
 * QUA-140: if the fingerprint of the tree and of the configuration is the one of the pass (and the check was played in it).
 * QUA-141, only with `perControl` (never for the closing evidence): or if the check's own fingerprint (`controlFingerprints` of the
 * engine: its declaration and the files of its `paths`) is the recorded one, wherever else the tree changed.
 * Only "ok" and "fail"; never a check that declares `reuse: false` (the engine says so), nor one `run-checks` judged otherwise than
 * `verify` would. Anything else: replayed.
 */
export function reusableVerdicts(
  root: string,
  engine: {
    treeFingerprint?: (root: string) => string | null;
    controlFingerprints?: (root: string, list: unknown[]) => Map<string, string | null>;
  },
  available: Map<string, { reuse?: boolean }>,
  perControl = false,
): Map<string, ReusedVerdict> {
  const reused = new Map<string, ReusedVerdict>();
  try {
    const file: {
      fingerprint?: string | null;
      ranAt?: string;
      played?: string[];
      checks?: Record<string, Partial<ReusedVerdict> & { status?: string; reusable?: boolean; control?: string | null }>;
    } = JSON.parse(readFileSync(join(root, ".drwil", "evidence", "run-checks-verdicts.json"), "utf8"));
    const now = engine.treeFingerprint?.(root);
    const sameTree = typeof now === "string" && file.fingerprint === now;
    // Without `played` (file of QUA-140), every verdict was played in the pass of the tree fingerprint.
    const played = Array.isArray(file.played) ? new Set(file.played) : null;
    const controls = perControl ? engine.controlFingerprints?.(root, [...available.values()]) : undefined;
    for (const [id, v] of Object.entries(file.checks ?? {})) {
      const status = v?.status;
      if ((status !== "ok" && status !== "fail") || v.reusable === false || available.get(id)?.reuse !== true) continue;
      const basis =
        sameTree && (!played || played.has(id))
          ? "tree"
          : typeof v.control === "string" && controls?.get(id) === v.control
            ? "control"
            : null;
      if (basis)
        reused.set(id, { status, output: String(v.output ?? ""), durationMs: v.durationMs, ranAt: String(v.ranAt ?? file.ranAt), basis });
    }
  } catch {}
  return reused;
}
