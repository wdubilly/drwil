// Evidence of a `drwil verify` run and redaction of what it keeps (split from verify.ts, which
// re-exports it).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
