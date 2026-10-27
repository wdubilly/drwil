#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Command } from "commander";
import { registerAttest } from "../dist/cli-attest.js";
import { registerInstall } from "../dist/cli-install.js";
import { registerVerify } from "../dist/cli-verify.js";

const program = new Command();
program
  .name("drwil")
  .description("Scaffold IA-first governance for a project (any OS, any AI tool, fr/en)")
  // Read from package.json, the single source of the version.
  .version(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);

registerInstall(program);
registerVerify(program);
registerAttest(program);

program.parse();
