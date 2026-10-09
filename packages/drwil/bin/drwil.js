#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { init, apply, uninstall, resoudreDerive, verify, formaterVerdict, verdictJson, ecrireEvidence, attester, formaterPourAgent, auditerApply, formaterAudit, doctor, formaterDiagnostic, diagnosticJson, listerContrats, TOOLS, CIS } from "../dist/index.js";

const program = new Command();
program
  .name("drwil")
  .description("Scaffold IA-first governance for a project (any OS, any AI tool, fr/en)")
  // Lue dans package.json, source unique de la version (docs/projets/journal.md, 2026-10-06 « Un seul numéro de version »).
  .version(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);

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

addOptions(program.command("apply").description("Apply IA-first to existing project (never overwrites files); audits the repo and previews what will be added first"),
  "Layers CSV (default: subfolders where a stack is detected)")
  .option("--dry-run", "Only audit the repository and preview what would be added; write nothing")
  .action(async (opts) => {
    try {
      console.log(formaterAudit(await auditerApply({ targetDir: process.cwd(), ...opts })));
    } catch (e) {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
    if (opts.dryRun) return;
    console.log("");
    await run(apply, opts, "IA-first applied to");
  });

program.command("uninstall")
  .description("Remove kit mechanics files, driven by the installed-files manifest (dry-run by default, never touches docs/projets, docs/intentions, docs/recettes)")
  .option("--yes", "Actually delete files (default: dry-run, only prints what would be removed)")
  .action(async (opts) => {
    try {
      const { removed, modified } = await uninstall({ targetDir: process.cwd(), dryRun: !opts.yes });
      if (!removed.length) console.log("Rien à supprimer.");
      else {
        console.log(opts.yes ? "Fichiers supprimés :" : "Fichiers qui seraient supprimés (--yes pour confirmer) :");
        for (const r of removed) console.log(`  - ${r}`);
      }
      if (modified.length) {
        console.log("Modifiés depuis l'installation, non supprimés :");
        for (const r of modified) console.log(`  - ${r}`);
      }
    } catch (e) {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
  });

program.command("resoudre-derive")
  .description("Resolve mechanics drift signaled by init()/apply() (.githooks/, .claude/settings.json, CI file): diff + confirmation, .bak backup before overwrite")
  .option("--forcer", "Non-interactive: overwrite every drifted mechanics file without asking (scripted use)")
  .action(async (opts) => {
    try {
      const { resolus, ignores } = await resoudreDerive({ targetDir: process.cwd(), forcer: opts.forcer });
      if (!resolus.length && !ignores.length) console.log("Rien à résoudre : aucune dérive sur la mécanique du kit.");
      if (resolus.length) {
        console.log("Fichiers résolus (ancien sauvegardé en .bak) :");
        for (const r of resolus) console.log(`  - ${r}`);
      }
      if (ignores.length) {
        console.log("Dérive laissée en l'état (confirmation refusée ou terminal non interactif sans --forcer) :");
        for (const r of ignores) console.log(`  - ${r}`);
      }
    } catch (e) {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
  });

// --json : seul le JSON sort sur stdout (aucune ligne humaine), avec les mêmes codes de sortie.
async function machine(fn, json, humain, versJson) {
  try {
    const r = await fn({ targetDir: process.cwd() });
    console.log(json ? JSON.stringify(versJson(r), null, 2) : humain(r));
    process.exit(r.code ?? r.exitCode);
  } catch (e) {
    if (json) console.log(JSON.stringify({ version: 1, status: "error", exitCode: 2, error: e.message }, null, 2));
    else console.error(`✗ ${e.message}`);
    process.exit(2);
  }
}

program.command("verify")
  .description("Verify the project's contracts with the shared check engine: PASS (exit 0), FAIL or MANUAL REVIEW REQUIRED (exit 1), VERIFY ERROR (exit 2)")
  .option("--json", "Machine-readable output (stable format, version 1), same exit codes")
  .option("--evidence", "Also record the run as evidence in .drwil/evidence/ (verdict, timestamp, commit, redacted summaries)")
  .option("--agent", "Output meant for an AI agent (counts, verdict, next step, human actions); same exit codes")
  .action((opts) => machine(async (o) => {
    const v = await verify(o);
    // L'évidence s'écrit à côté du verdict : son chemin va sur stderr pour ne pas casser le JSON de stdout.
    if (opts.evidence) console.error(`évidence : ${ecrireEvidence(o.targetDir, v)}`);
    return v;
  }, opts.json, opts.agent ? (v) => formaterPourAgent(verdictJson(v)) : formaterVerdict, verdictJson));

program.command("doctor")
  .description("Diagnose the drwil installation without running any check: healthy (exit 0), problems (exit 1), not a drwil project (exit 2)")
  .option("--json", "Machine-readable output (stable format, version 1), same exit codes")
  .action((opts) => machine(doctor, opts.json, formaterDiagnostic, diagnosticJson));

program.command("contracts")
  .description("List and validate the project's contracts without running them: valid (exit 0), invalid registry (exit 2)")
  .option("--json", "Machine-readable output (stable format, version 1)")
  .action((opts) => machine(listerContrats, opts.json,
    (r) => [`${r.registry ?? ""}`, ...r.contracts.map((k) => `  ${k.id.padEnd(8)} ${k.checks.length ? k.checks.join(", ") : "—"}${k.manual ? "  [manuel]" : ""}  ${k.title}`), ...r.errors.map((e) => `✗ ${e}`), ...(r.error ? [`✗ ${r.error}`] : [])].join("\n"),
    (r) => r));

program.command("attest <id>")
  .description("Record an explicit human attestation for a MANUAL contract (interactive terminal only; tied to the contract's current text and proof)")
  .option("--note <text>", "Short note kept with the attestation (redacted, 500 chars max)")
  .action(async (id, opts) => {
    // Jamais d'attestation sans humain devant un terminal : pas de --yes, pas de stdin redirigé.
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      console.error(`✗ attestation refusée : un terminal interactif est requis (un agent ou un script ne peut pas attester ${id})`);
      process.exit(1);
    }
    const { createInterface } = await import("node:readline/promises");
    try {
      const r = await attester({
        targetDir: process.cwd(), id, note: opts.note,
        confirmer: async (resume) => {
          console.log(`${resume}\n`);
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          const saisie = await rl.question(`Pour attester, retapez l'identifiant du contrat (${id}) : `);
          rl.close();
          return saisie.trim() === id;
        },
      });
      console.log(r.code === 0 ? `✓ ${r.message} : ${r.fichier} (à commiter avec le travail attesté)` : `✗ ${r.message}`);
      process.exit(r.code);
    } catch (e) {
      console.error(`✗ ${e.message}`);
      process.exit(2);
    }
  });

program.command("etat")
  .description("Show the governance state, or change activity: drwil etat passer <ACTIVITY> [--fiche <sheet>] [--demande <text>]")
  .argument("[args...]")
  .allowUnknownOption()
  .action(async (args) => {
    // Façade : la logique et le garde-fou humain vivent dans .githooks/etat.mjs du projet,
    // utilisable sans drwil installé ; une seule source.
    const module = join(process.cwd(), ".githooks", "etat.mjs");
    if (!existsSync(module)) {
      console.error(`✗ ${module} introuvable : lancer « drwil apply » pour installer le lecteur d'état`);
      process.exit(2);
    }
    const { principal } = await import(pathToFileURL(module).href);
    process.exit(await principal(args, process.cwd()));
  });

program.parse();
