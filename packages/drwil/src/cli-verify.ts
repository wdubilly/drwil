import { type Command, Option } from "commander";
import {
  doctor,
  diagnosisJson,
  fill,
  formatDiagnosis,
  formatForAgent,
  formatGuarantees,
  formatVerdict,
  guarantees,
  verdictJson,
  verify,
  writeEvidence,
} from "./index.js";
import { registerContracts } from "./cli-contracts.js";
import { texts } from "./cli-texts.js";
import { verifyFailed } from "./failed.js";
import type { CiChecksOption, CiPendingResult } from "./verify-checks.js";
import { TEXTS as VERIFY_TEXTS } from "./verify-texts.js";
import type { Verdict, VerifyOptions } from "./verify-types.js";

// QUA-253: a PASS with checks left to CI (`runAt: ["ci"]`, QUA-208) is never a PASS without reserve: it reads
// `GOVERNANCE: PASS (CI pending)` and names the checks waiting for the PR or MR CI. QUA-254: the option says it is active.
const PASS_LABEL = "GOVERNANCE: PASS";
const PENDING_LABEL = "GOVERNANCE: PASS (CI pending)";

export function ciPending(v: Verdict): string[] {
  return [...new Set(v.contracts.flatMap((k) => k.checks.filter((c) => (c as CiPendingResult).ciPending).map((c) => c.id)))];
}

const passed = (v: Verdict) => !v.partial && (v.status === "PASS" || v.status === "ATTESTED");

/** Human output (`agent` false) or agent output, with the CI pending checks and the option named next to the verdict line. */
export function withCiNotes(text: string, v: Verdict, { agent, withCiChecks }: { agent: boolean; withCiChecks: boolean }): string {
  const pending = ciPending(v);
  const T = VERIFY_TEXTS[agent ? "en" : v.lang];
  const notes = [...(withCiChecks ? [T.withCiChecks] : []), ...(pending.length ? [fill(T.ciPending, pending.join(", "))] : [])];
  if (!notes.length) return text;
  const lines = text.split("\n");
  // Human: the verdict is the last line, after an empty one; agent: the line « Verdict: … (exit n) ».
  const at = agent ? lines.findIndex((l) => l.startsWith("Verdict: ")) : lines.length - 1;
  if (pending.length && passed(v)) lines[at] = lines[at].replace(PASS_LABEL, PENDING_LABEL);
  if (agent) lines.splice(at + 1, 0, ...notes.map((n) => `Note: ${n}`));
  else lines.splice(at - 1, 0, ...notes);
  return lines.join("\n");
}

// --json: only the JSON goes to stdout (no human line), with the same exit codes.
async function machine<R extends { code?: number; exitCode?: number }>(
  fn: (o: { targetDir: string }) => Promise<R> | R,
  json: boolean,
  human: (r: R) => string,
  toJson: (r: R) => unknown,
) {
  try {
    const r = await fn({ targetDir: process.cwd() });
    console.log(json ? JSON.stringify(toJson(r), null, 2) : human(r));
    process.exit(r.code ?? r.exitCode);
  } catch (e) {
    if (json) console.log(JSON.stringify({ version: 1, status: "error", exitCode: 2, error: (e as Error).message }, null, 2));
    else console.error(`✗ ${(e as Error).message}`);
    process.exit(2);
  }
}

export function registerVerify(program: Command): void {
  program
    .command("verify")
    .description(
      "Verify the project's contracts with the shared check engine: PASS (exit 0), FAIL or MANUAL REVIEW REQUIRED (exit 1), VERIFY ERROR (exit 2)",
    )
    .option("--json", "Machine-readable output (stable format, version 1), same exit codes")
    .option("--evidence", "Also record the run as evidence in .drwil/evidence/ (verdict, timestamp, commit, redacted summaries)")
    .addOption(
      new Option(
        "--failed",
        "Replay only the contracts that were not PASS or ATTESTED at the last evidence: a partial verdict, never PASS, no evidence written",
      ).conflicts("evidence"),
    )
    .option("--agent", "Output meant for an AI agent (counts, verdict, next step, human actions); same exit codes")
    .option("--no-reuse", "Replay every check, even those whose verdict `run-checks` left on an identical tree or on unchanged check files")
    .option(
      "--with-ci-checks",
      'Also run locally the checks left to CI (runAt ["ci"]), to reproduce a CI failure; the output says the option is active',
    )
    .action((opts) => {
      const withCiChecks = opts.withCiChecks === true;
      return machine(
        async (o) => {
          const options: VerifyOptions & CiChecksOption = { ...o, reuse: opts.reuse, evidence: opts.evidence, withCiChecks };
          const v = await (opts.failed ? verifyFailed : verify)(options);
          // The evidence is written next to the verdict: its path goes to stderr so as not to break stdout's JSON.
          if (opts.evidence) console.error(fill(texts().evidence, writeEvidence(o.targetDir, v)));
          return v;
        },
        opts.json,
        (v) => withCiNotes(opts.agent ? formatForAgent(verdictJson(v)) : formatVerdict(v), v, { agent: Boolean(opts.agent), withCiChecks }),
        (v) => ({ ...verdictJson(v), ciPending: ciPending(v), ...(withCiChecks ? { withCiChecks } : {}) }),
      );
    });

  program
    .command("guarantees")
    .description(
      "Wire the mandatory guarantees once the stack is known: 100 % coverage per layer, e2e of the critical paths, protected forge with CI, project presentation; a blocking brief for each one not held (exit 1)",
    )
    .option("--dry-run", "Show what would be wired and written; write nothing")
    .option("--protect", "Set the protection of the main branch on the forge (gh or glab) — only with the human's agreement")
    .action((opts) => {
      try {
        const r = guarantees({ targetDir: process.cwd(), dryRun: opts.dryRun, protect: opts.protect });
        console.log(formatGuarantees(r).join("\n"));
        if (r.briefs.some((b) => b.blocking)) process.exitCode = 1;
      } catch (e) {
        console.error(`✗ ${(e as Error).message}`);
        process.exit(2);
      }
    });

  program
    .command("doctor")
    .description(
      "Diagnose the drwil installation without running any check: healthy (exit 0), problems (exit 1), not a drwil project (exit 2)",
    )
    .option("--json", "Machine-readable output (stable format, version 1), same exit codes")
    .action((opts) => machine(doctor, opts.json, formatDiagnosis, diagnosisJson));

  registerContracts(program);
}
