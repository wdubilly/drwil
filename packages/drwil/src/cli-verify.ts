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
  listContracts,
  verdictJson,
  verify,
  writeEvidence,
} from "./index.js";
import { texts } from "./cli-texts.js";
import { verifyFailed } from "./failed.js";

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
    .action((opts) =>
      machine(
        async (o) => {
          const v = await (opts.failed ? verifyFailed : verify)({ ...o, reuse: opts.reuse, evidence: opts.evidence });
          // The evidence is written next to the verdict: its path goes to stderr so as not to break stdout's JSON.
          if (opts.evidence) console.error(fill(texts().evidence, writeEvidence(o.targetDir, v)));
          return v;
        },
        opts.json,
        opts.agent ? (v) => formatForAgent(verdictJson(v)) : formatVerdict,
        verdictJson,
      ),
    );

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

  program
    .command("contracts")
    .description("List and validate the project's contracts without running them: valid (exit 0), invalid registry (exit 2)")
    .option("--json", "Machine-readable output (stable format, version 1)")
    .action((opts) =>
      machine(
        listContracts,
        opts.json,
        (r) =>
          [
            `${r.registry ?? ""}`,
            ...r.contracts.map(
              (k) => `  ${k.id.padEnd(8)} ${k.checks.length ? k.checks.join(", ") : "—"}${k.manual ? texts().manual : ""}  ${k.title}`,
            ),
            ...r.errors.map((e) => `✗ ${e}`),
            ...(r.error ? [`✗ ${r.error}`] : []),
          ].join("\n"),
        (r) => r,
      ),
    );
}
