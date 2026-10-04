#!/usr/bin/env node
import { Command } from "commander";
import { init, apply, TOOLS, CIS } from "../dist/index.js";

const program = new Command();
program
  .name("drwil")
  .description("Scaffold IA-first governance for a project (any OS, any AI tool, fr/en)")
  .version("0.0.1");

function addOptions(cmd, layersHelp) {
  return cmd
    .option("-n, --name <name>", "Project name (default: folder name)")
    .option("-s, --short <short>", "Short name")
    .option("-l, --lang <lang>", "Templates language (fr|en)", "fr")
    .option("--layers <layers>", layersHelp)
    .option("-d, --description <text>", "What the application does (fills AGENTS.md and docs/architecture.md)")
    .option("--tools <tools>", `AI tools to configure, CSV (${TOOLS.join(",")})`, TOOLS.join(","))
    .option("--ci <ci>", `CI file to generate (${CIS.join("|")})`, "none")
    .option("--contract-prefixes <c>", "Contract prefixes CSV", "SEC,QUA")
    .option("--mode <mode>", "minimal|full", "full")
    .option("--no-git", "Do not run git init nor enable hooks");
}

async function run(fn, opts, message) {
  try {
    await fn({ targetDir: process.cwd(), ...opts });
    console.log(message, process.cwd());
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}

addOptions(program.command("init").description("Initialize IA-first in current directory (refreshes .githooks/; use --force to overwrite everything)"),
  "Layers CSV (default: backend,frontend)")
  .option("--force", "Overwrite every file, not just .githooks/ (erases project docs added since last install)")
  .action((opts) => run(init, opts, "IA-first scaffolding applied to"));

addOptions(program.command("apply").description("Apply IA-first to existing project (never overwrites files)"),
  "Layers CSV (default: subfolders where a stack is detected)")
  .action((opts) => run(apply, opts, "IA-first applied to"));

program.parse();
