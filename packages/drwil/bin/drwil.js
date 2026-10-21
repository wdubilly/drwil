#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import {
  init,
  uninstall,
  resolveDrift,
  verify,
  formatVerdict,
  verdictJson,
  writeEvidence,
  attest,
  formatForAgent,
  previewInit,
  formatPreview,
  doctor,
  formatDiagnosis,
  diagnosisJson,
  listContracts,
  fill,
  projectLang,
  TOOLS,
  CIS,
} from "../dist/index.js";

// Messages of the commands, in the language of the project of the current folder (English outside a project).
const TEXTS = {
  fr: {
    initDone: "Gouvernance IA-first installée dans",
    nothingToRemove: "Rien à supprimer.",
    removed: "Fichiers supprimés :",
    wouldRemove: "Fichiers qui seraient supprimés (--yes pour confirmer) :",
    modified: "Modifiés depuis l'installation, non supprimés :",
    cleaned: "Ajouts drwil retirés de ces fichiers du projet :",
    wouldClean: "Ajouts drwil qui seraient retirés de ces fichiers du projet :",
    noDrift: "Rien à résoudre : aucune dérive sur la mécanique du kit.",
    resolved: "Fichiers résolus (ancien sauvegardé en .bak) :",
    ignored: "Dérive laissée en l'état (confirmation refusée ou terminal non interactif sans --force) :",
    evidence: "évidence : {0}",
    manual: "  [manuel]",
    noTerminal: "attestation refusée : un terminal interactif est requis (un agent ou un script ne peut pas attester {0})",
    retype: "Pour attester, retapez l'identifiant du contrat ({0}) : ",
    attested: "{0} : {1} (à commiter avec le travail attesté)",
    noState: "{0} introuvable : lancer « drwil init » pour installer le lecteur d'état",
  },
  en: {
    initDone: "IA-first scaffolding applied to",
    nothingToRemove: "Nothing to remove.",
    removed: "Files removed:",
    wouldRemove: "Files that would be removed (--yes to confirm):",
    modified: "Modified since installation, not removed:",
    cleaned: "drwil additions removed from these project files:",
    wouldClean: "drwil additions that would be removed from these project files:",
    noDrift: "Nothing to resolve: no drift on the kit mechanics.",
    resolved: "Files resolved (old one backed up as .bak):",
    ignored: "Drift left as it is (confirmation refused, or non-interactive terminal without --force):",
    evidence: "evidence: {0}",
    manual: "  [manual]",
    noTerminal: "attestation refused: an interactive terminal is required (an agent or a script cannot attest {0})",
    retype: "To attest, type the contract's identifier again ({0}): ",
    attested: "{0}: {1} (to commit with the attested work)",
    noState: '{0} not found: run "drwil init" to install the state reader',
  },
};
const texts = () => TEXTS[projectLang(process.cwd())];

const program = new Command();
program
  .name("drwil")
  .description("Scaffold IA-first governance for a project (any OS, any AI tool, fr/en)")
  // Read from package.json, the single source of the version.
  .version(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);

const DEFAULT = (v) => `(default: value of an installed project, else ${v})`;

function addOptions(cmd, layersHelp) {
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
      .option("--tools <tools>", `AI tools to configure, CSV (${TOOLS.join(",")}) ${DEFAULT("all")}`)
      .option("--ci <ci>", `CI file to generate (${CIS.join("|")}) ${DEFAULT("none")}`)
      .option("--contract-prefixes <c>", `Contract prefixes CSV ${DEFAULT("SEC,QUA")}`)
      .option("--mode <mode>", `minimal|full ${DEFAULT("full")}`)
      .option("--no-git", "Do not run git init nor enable hooks")
  );
}

async function run(fn, opts, message) {
  try {
    await fn({ targetDir: process.cwd(), ...opts });
    console.log(texts()[message], process.cwd());
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}

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
    if (opts.dryRun) {
      try {
        console.log(formatPreview(await previewInit({ targetDir: process.cwd(), ...opts })));
      } catch (e) {
        console.error(`✗ ${e.message}`);
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
      console.error(`✗ ${e.message}`);
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
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
  });

// --json: only the JSON goes to stdout (no human line), with the same exit codes.
async function machine(fn, json, human, toJson) {
  try {
    const r = await fn({ targetDir: process.cwd() });
    console.log(json ? JSON.stringify(toJson(r), null, 2) : human(r));
    process.exit(r.code ?? r.exitCode);
  } catch (e) {
    if (json) console.log(JSON.stringify({ version: 1, status: "error", exitCode: 2, error: e.message }, null, 2));
    else console.error(`✗ ${e.message}`);
    process.exit(2);
  }
}

program
  .command("verify")
  .description(
    "Verify the project's contracts with the shared check engine: PASS (exit 0), FAIL or MANUAL REVIEW REQUIRED (exit 1), VERIFY ERROR (exit 2)",
  )
  .option("--json", "Machine-readable output (stable format, version 1), same exit codes")
  .option("--evidence", "Also record the run as evidence in .drwil/evidence/ (verdict, timestamp, commit, redacted summaries)")
  .option("--agent", "Output meant for an AI agent (counts, verdict, next step, human actions); same exit codes")
  .action((opts) =>
    machine(
      async (o) => {
        const v = await verify(o);
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
      console.error(`✗ ${e.message}`);
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

program.parse();
