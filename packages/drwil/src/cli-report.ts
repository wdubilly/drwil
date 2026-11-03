import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { TEXTS } from "./cli-texts.js";
import { engineVersion } from "./install-record.js";

// QUA-232 : une liste fermée, jamais les noms, commandes ou sorties définis par le projet.
const CHECKS = [
  "secrets",
  "docs-references",
  "contract-tests",
  "architecture-map",
  "scope-gate",
  "main-branch",
  "checks-self-test",
  "ci-coverage",
] as const;

function readLocal(root: string, parts: string[]): unknown {
  try {
    for (let i = 1; i <= parts.length; i++) {
      const stat = lstatSync(join(root, ...parts.slice(0, i)));
      if (stat.isSymbolicLink() || (i === parts.length && (!stat.isFile() || stat.size > 1024 * 1024))) return null;
    }
    return JSON.parse(readFileSync(join(root, ...parts), "utf8"));
  } catch {
    return null;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** QUA-231, QUA-232, QUA-233 : rapport public, sans exécuter le code du projet ni exporter ses sorties. */
export function report(opts: { targetDir: string }): string {
  const config = readLocal(opts.targetDir, [".drwil", "ia-first.json"]);
  const T = TEXTS[record(config) && config.lang === "fr" ? "fr" : "en"].report;
  const install = readLocal(opts.targetDir, [".drwil", "install.json"]);
  const version =
    record(install) && typeof install.version === "string" && /^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(install.version)
      ? install.version
      : T.unread;
  const evidence = readLocal(opts.targetDir, [".drwil", "evidence", "run-checks-verdicts.json"]);
  const checks = record(evidence) && record(evidence.checks) ? evidence.checks : null;
  const lines = [T.title, "", `${T.cliVersion}: ${engineVersion()}`, `${T.kitVersion}: ${version}`, T.snapshot, T.privacy, ""];
  let failures = 0;
  if (checks) {
    for (const id of CHECKS) {
      const check = checks[id];
      if (record(check) && check.status === "fail") {
        failures++;
        lines.push(`- ${id}: FAIL — ${T.failed[id]}`);
      }
    }
    lines.push(T.excluded);
  } else lines.push(T.noEvidence);
  if (!failures) lines.push(T.noFailure);
  lines.push("", T.reproduce, "node .githooks/run-checks.mjs", "", T.example);
  return lines.join("\n");
}

export function registerReport(program: Command): void {
  program
    .command("report")
    .description("Print a privacy-safe kit defect report to paste, without running checks or contacting a forge")
    .action(() => console.log(report({ targetDir: process.cwd() })));
}
