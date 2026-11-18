import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Command } from "commander";
import { attest, fill, prepareAttestationPoll, preparePortableAttestationPoll, type AttestResult } from "./index.js";
import { texts } from "./cli-texts.js";
import { registerCursor } from "./cli-cursor.js";

/**
 * QUA-235 : au terminal, la même question contrat par contrat, en un passage ; un contrat refusé n'empêche pas
 * les suivants. Le code de sortie est le pire des codes.
 */
export async function attestEach(ids: string[], one: (id: string) => Promise<AttestResult>, print: (line: string) => void) {
  const T = texts();
  let worst = 0;
  for (const id of [...new Set(ids)]) {
    let r: AttestResult;
    try {
      r = await one(id);
    } catch (e) {
      r = { code: 2, message: `${id} : ${(e as Error).message}` };
    }
    print(r.code === 0 ? `✓ ${fill(T.attested, r.message, r.file)}` : `✗ ${r.message}`);
    worst = Math.max(worst, r.code);
  }
  return worst;
}

export function registerAttest(program: Command): void {
  registerCursor(program);
  program
    .command("attest-poll <ids...>")
    .description("Prepare a native human-attestation poll (1 to 4 contracts, one multiple choice); never records an attestation")
    .requiredOption("--tried <text>", "What the agent tried (1 to 500 characters)")
    .option("--tool <tool>", "Native poll: claude, copilot, gemini, codex or cursor (dedicated ACP client)", "claude")
    .option("--renew", "Prepare renewal of a still-valid attestation")
    .action(async (ids: string[], opts) => {
      try {
        if (!["claude", "copilot", "gemini", "codex", "cursor"].includes(opts.tool))
          throw new Error("--tool: claude | copilot | gemini | codex | cursor");
        // Le choix multiple n'est lu que par le hook de Claude Code pour l'instant : ailleurs, un contrat par sondage.
        if (ids.length > 1 && opts.tool !== "claude") throw new Error("--tool claude only with several contracts in one poll");
        const options = { targetDir: process.cwd(), ids, id: ids[0], tried: opts.tried, renew: opts.renew };
        const r =
          opts.tool === "claude"
            ? await prepareAttestationPoll(options)
            : await preparePortableAttestationPoll({ ...options, tool: opts.tool });
        if ("poll" in r) console.log(JSON.stringify(r.poll, null, 2));
        else console.error(`✗ ${r.message}`);
        process.exit(r.code);
      } catch (e) {
        console.error(`✗ ${(e as Error).message}`);
        process.exit(2);
      }
    });

  program
    .command("attest <ids...>")
    .description(
      "Record an explicit human attestation for one or several MANUAL contracts, asked one by one (interactive terminal only; tied to each contract's current text and proof)",
    )
    .option("--note <text>", "Short note kept with the attestation (redacted, 500 chars max)")
    .option("--renew", "Renew on purpose an attestation that is still valid (same interactive confirmation)")
    .action(async (ids: string[], opts) => {
      const T = texts();
      // Never an attestation without a human in front of a terminal: no --yes, no redirected stdin.
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        console.error(`✗ ${fill(T.noTerminal, ids.join(" "))}`);
        process.exit(1);
      }
      const { createInterface } = await import("node:readline/promises");
      const one = (id: string) =>
        attest({
          targetDir: process.cwd(),
          id,
          note: opts.note,
          renew: opts.renew,
          log: (line) => console.log(line),
          confirm: async (summary) => {
            console.log(`${summary}\n`);
            const rl = createInterface({ input: process.stdin, output: process.stdout });
            const typed = await rl.question(fill(T.retype, id));
            rl.close();
            return typed.trim() === id;
          },
        });
      process.exit(await attestEach(ids, one, (line) => console.log(line)));
    });

  program
    .command("state")
    .description(
      "Show the governance state, or act on it: drwil state move <ACTIVITY> [--brief <brief>] [--request <text>] | start [<brief>] | briefs [--json] | reminder",
    )
    .argument("[args...]")
    .allowUnknownOption()
    .action(async (args) => {
      // Facade: the logic and the human guard live in the project's .githooks/state.mjs, usable without
      // drwil installed; a single source.
      const module = join(process.cwd(), ".githooks", "state.mjs");
      if (!existsSync(module)) {
        console.error(`✗ ${fill(texts().noState, module)}`);
        process.exit(2);
      }
      const { main } = await import(pathToFileURL(module).href);
      process.exit(await main(args, process.cwd()));
    });
}
