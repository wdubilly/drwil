import type { Command, OptionValues } from "commander";
import { CIS, init, type InitOptions, previewInit, formatPreview, resolveDrift, TOOLS, uninstall } from "./index.js";
import { texts } from "./cli-texts.js";
import { readConfig } from "./config.js";
import { fill } from "./i18n.js";

const DEFAULT = (v: string) => `(default: value of an installed project, else ${v})`;

function addOptions(cmd: Command, layersHelp: string) {
  return (
    cmd
      .option("-n, --name <name>", `Project name ${DEFAULT("folder name")}`)
      .option("-s, --short <short>", "Short name")
      // No default here: a missing option must be told apart from an explicit choice, to take over the
      // config of an already installed project; the defaults live in resolve() (src/config.ts).
      .option(
        "-l, --lang <lang>",
        `Project language (fr|en): the agent replies and writes briefs and commits in it; the kit itself is in English ${DEFAULT("en")}`,
      )
      .option("--layers <layers>", layersHelp)
      .option("-d, --description <text>", "What the application does (fills AGENTS.md and docs/architecture.md)")
      .option(
        "--tools <tools>",
        `AI tools to configure, CSV (${TOOLS.join(",")}); asked on a first interactive install, required without a terminal ${DEFAULT("the tools already installed")}`,
      )
      .option("--ci <ci>", `CI file to generate (${CIS.join("|")}) ${DEFAULT("none")}`)
      .option("--contract-prefixes <c>", `Contract prefixes CSV ${DEFAULT("SEC,QUA")}`)
      .option("--mode <mode>", `minimal|full ${DEFAULT("full")}`)
      .option("--no-git", "Do not run git init nor enable hooks")
  );
}

// First install without --tools: the choice belongs to the human (QUA-203). An update reads the tools
// already recorded; without a terminal nothing is chosen in the human's place.
export async function chooseTools(
  targetDir: string,
  tools: string | undefined,
  interactive: boolean,
  ask: (question: string) => Promise<string>,
): Promise<string | undefined> {
  if (tools !== undefined || Array.isArray(readConfig(targetDir)?.tools)) return tools;
  const T = texts();
  if (!interactive) throw new Error(fill(T.toolsRequired, TOOLS.join(",")));
  const answer = (await ask(fill(T.toolsQuestion, TOOLS.join(", ")))).trim();
  if (!answer) throw new Error(fill(T.toolsRequired, TOOLS.join(",")));
  return answer === "all" ? TOOLS.join(",") : answer;
}

export async function askTerminal(
  question: string,
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Promise<string> {
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input, output });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function run(fn: (o: InitOptions) => Promise<unknown>, opts: OptionValues, message: "initDone") {
  try {
    await fn({ targetDir: process.cwd(), ...opts } as InitOptions);
    console.log(texts()[message], process.cwd());
  } catch (e) {
    console.error(`✗ ${(e as Error).message}`);
    process.exit(1);
  }
}

export function registerInstall(program: Command): void {
  addOptions(
    program
      .command("init")
      .description(
        "Install IA-first in the current directory, or update an installed project: creates what is missing, refreshes the kit mechanics unless modified by hand, never overwrites project files",
      ),
    `Layers CSV ${DEFAULT("subfolders where a stack is detected, else none: declared once the stack is chosen")}`,
  )
    .option("--dry-run", "Only audit the repository and preview what would be written; write nothing")
    .option(
      "--force",
      "Overwrite every file, even modified ones (erases project docs added since the last install; keeps the settings of .drwil/ia-first.json)",
    )
    .action(async (opts) => {
      if (!opts.dryRun) {
        try {
          opts.tools = await chooseTools(process.cwd(), opts.tools, !!(process.stdin.isTTY && process.stdout.isTTY), askTerminal);
        } catch (e) {
          console.error(`✗ ${(e as Error).message}`);
          process.exit(1);
        }
      }
      if (opts.dryRun) {
        try {
          console.log(formatPreview(await previewInit({ targetDir: process.cwd(), ...opts })));
        } catch (e) {
          console.error(`✗ ${(e as Error).message}`);
          process.exit(1);
        }
        return;
      }
      await run(init, opts, "initDone");
    });

  program
    .command("uninstall")
    .description(
      "Remove kit mechanics files, driven by the installed-files manifest (dry-run by default, never touches docs/projects, docs/intentions, docs/recipes)",
    )
    .option("--yes", "Actually delete files (default: dry-run, only prints what would be removed)")
    .action(async (opts) => {
      try {
        const T = texts();
        const { removed, modified, cleaned } = await uninstall({ targetDir: process.cwd(), dryRun: !opts.yes });
        if (!removed.length && !cleaned.length) console.log(T.nothingToRemove);
        else if (removed.length) {
          console.log(opts.yes ? T.removed : T.wouldRemove);
          for (const r of removed) console.log(`  - ${r}`);
        }
        if (cleaned.length) {
          console.log(opts.yes ? T.cleaned : T.wouldClean);
          for (const r of cleaned) console.log(`  - ${r}`);
        }
        if (modified.length) {
          console.log(T.modified);
          for (const r of modified) console.log(`  - ${r}`);
        }
      } catch (e) {
        console.error(`✗ ${(e as Error).message}`);
        process.exit(1);
      }
    });

  program
    .command("resolve-drift")
    .description(
      "Resolve the mechanics drift reported by init (.githooks/, .claude/settings.json, CI file): diff + confirmation, .bak backup before overwrite",
    )
    .option("--force", "Non-interactive: overwrite every drifted mechanics file without asking (scripted use)")
    .action(async (opts) => {
      try {
        const T = texts();
        const { resolved, ignored } = await resolveDrift({ targetDir: process.cwd(), force: opts.force });
        if (!resolved.length && !ignored.length) console.log(T.noDrift);
        if (resolved.length) {
          console.log(T.resolved);
          for (const r of resolved) console.log(`  - ${r}`);
        }
        if (ignored.length) {
          console.log(T.ignored);
          for (const r of ignored) console.log(`  - ${r}`);
        }
      } catch (e) {
        console.error(`✗ ${(e as Error).message}`);
        process.exit(1);
      }
    });
}
