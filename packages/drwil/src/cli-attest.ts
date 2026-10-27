import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Command } from "commander";
import { attest, fill } from "./index.js";
import { texts } from "./cli-texts.js";

export function registerAttest(program: Command): void {
  program
    .command("attest <id>")
    .description(
      "Record an explicit human attestation for a MANUAL contract (interactive terminal only; tied to the contract's current text and proof)",
    )
    .option("--note <text>", "Short note kept with the attestation (redacted, 500 chars max)")
    .option("--renew", "Renew on purpose an attestation that is still valid (same interactive confirmation)")
    .action(async (id, opts) => {
      const T = texts();
      // Never an attestation without a human in front of a terminal: no --yes, no redirected stdin.
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        console.error(`✗ ${fill(T.noTerminal, id)}`);
        process.exit(1);
      }
      const { createInterface } = await import("node:readline/promises");
      try {
        const r = await attest({
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
        console.log(r.code === 0 ? `✓ ${fill(T.attested, r.message, r.file)}` : `✗ ${r.message}`);
        process.exit(r.code);
      } catch (e) {
        console.error(`✗ ${(e as Error).message}`);
        process.exit(2);
      }
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
