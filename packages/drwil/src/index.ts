import { existsSync } from "node:fs";
import { join } from "node:path";

export { detectStack, type StackEntry } from "./stack.js";
export { report } from "./cli-report.js";
export {
  verify,
  formatVerdict,
  verdictJson,
  writeEvidence,
  redact,
  fingerprint,
  readAttestations,
  type Attestation,
  type Verdict,
  type ContractResult,
  type CheckResult,
  type Status,
} from "./verify.js";
export { attest, contractSummary, prepareAttestationPoll, type AttestResult } from "./attest.js";
export { preparePortableAttestationPoll, formatPortableAttestationPoll, type PortableAttestationTool } from "./attest-portable.js";
export { type ClosureProof, judgeProofs, parseProof, type ProofResult, PROOFS_DIR, readProofs } from "./closure.js";
export { formatForAgent } from "./agent.js";
export { doctor, formatDiagnosis, diagnosisJson, listContracts, type Diagnosis } from "./doctor.js";
export { LANGS, TOOLS, CIS, type InitOptions } from "./config.js";
export { uninstall, type UninstallOptions, type UninstallReport } from "./manifest.js";
export { previewInit, formatPreview, type InitPreview } from "./preview.js";
export { migrate, formatMigration, type MigrationPlan } from "./migration.js";
export { fill, projectLang, type MessageLang } from "./i18n.js";
export { guarantees, formatGuarantees, guaranteeFailures, type GuaranteesReport, type GuaranteesOptions } from "./guarantees.js";
export { skeletonFiles, type CoverageTool, type Exec } from "./guarantees-table.js";
export { COVERAGE_TOOLS, toolFor } from "./guarantees-tools.js";
import { readConfig, type InitOptions, type Resolved } from "./config.js";
import { writeConfig } from "./config-write.js";
import { installChoices } from "./install.js";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { scaffold } from "./render.js";
import { type ConfirmDrift, isProjectFile, replaceOnConfirm } from "./drift.js";
import { assertSafeManifest, engineVersion, removeObsolete, writeInstall, writeManifest } from "./manifest.js";
import { formatMigration, migrate } from "./migration.js";
import { finishUpdate } from "./kit-update.js";
import { prepareKitCommit, setupGit } from "./kit-install.js";
import { complete, type Addition } from "./complete.js";
import { writeCompleted } from "./manifest-completed.js";
import { formatGaps } from "./essentials.js";
import { attachExistingCode, type ProjectConfig } from "./existing-code.js";

const TEXTS = {
  fr: {
    added: "Ajouté aux fichiers du projet, sans rien y écraser (bloc « drwil », retiré par `drwil uninstall`) :",
    stack: "Stack détectée : {0}",
    noStack: "Stack non détectée : à décider par l'utilisateur (voir docs/architecture.md).",
    noLayers:
      "Aucune couche écrite : le projet n'a pas encore de code. Le cadrer d'abord (/drwil-adopt : besoin, pile, couches), ou déclarer les couches avec --layers.",
    drifted: "⚠ Fichiers du kit modifiés à la main, laissés tels quels (`npx drwil init` dans un terminal en montre le diff) :",
    obsolete: "Fichiers obsolètes d'une version antérieure du kit supprimés (jamais modifiés depuis l'installation) :",
    guarantees:
      "Garanties obligatoires (couverture 100 %, e2e, forge protégée, présentation) : `npx drwil guarantees` une fois la pile connue (/drwil-adopt).",
  },
  en: {
    added: 'Added to the project\'s files, nothing overwritten ("drwil" block, removed by `drwil uninstall`):',
    stack: "Detected stack: {0}",
    noStack: "Stack not detected: for the user to decide (see docs/architecture.md).",
    noLayers:
      "No layer written: the project has no code yet. Scope it first (/drwil-adopt: need, stack, layers), or declare the layers with --layers.",
    drifted: "⚠ Kit files modified by hand, left as they are (`npx drwil init` in a terminal shows the diff of each):",
    obsolete: "Obsolete files of an earlier kit version removed (never modified since installation):",
    guarantees:
      "Mandatory guarantees (100 % coverage, e2e, protected forge, presentation): `npx drwil guarantees` once the stack is known (/drwil-adopt).",
  },
};

function reportStack(r: Resolved): void {
  const T = TEXTS[r.lang];
  if (r.stack.length) {
    console.log(fill(T.stack, r.stack.map((s) => `${s.path} → ${s.technos.join(", ")}`).join(" ; ")));
    return;
  }
  console.log(T.noStack);
  // No layer invented for a project without code: say what to do instead (QUA-038).
  if (r.opts.layers === undefined && !r.layers.length) console.log(T.noLayers);
}

function reportDrifted(drifted: string[], lang: MessageLang): void {
  if (!drifted.length) return;
  console.log(TEXTS[lang].drifted);
  for (const d of drifted) console.log(`  - ${d}`);
}

function reportAdded(added: Addition[], lang: MessageLang): void {
  if (!added.length) return;
  console.log(TEXTS[lang].added);
  for (const a of added) {
    console.log(`  + ${a.file}`);
    for (const item of a.items) console.log(`      ${item}`);
  }
}

function reportObsolete(obsolete: string[], lang: MessageLang): void {
  if (!obsolete.length) return;
  console.log(TEXTS[lang].obsolete);
  for (const o of obsolete) console.log(`  - ${o}`);
}

async function migrateFirst(targetDir: string): Promise<void> {
  const lines = formatMigration(await migrate(targetDir), false, projectLang(targetDir));
  if (lines.length) console.log(lines.join("\n"));
}

/**
 * Installs or updates the kit: a single command for a new project and for an existing one
 * (`installChoices`). Project files (AGENTS.md, docs/contracts.md, docs/projects/pending.md…) are
 * only written if missing, so as not to erase the contracts and workstreams added by the project;
 * the kit mechanics are refreshed unless modified by hand. `--force` rewrites everything.
 */
export async function init(opts: InitOptions & { confirmDrift?: ConfirmDrift }): Promise<void> {
  // Before anything is written: an update, or an installation in a repository with commits, refuses or cuts its own branch (QUA-237, QUA-206).
  const update = opts.git === false ? null : prepareKitCommit(opts.targetDir, opts.lang === "fr" ? "fr" : "en");
  // First of all: a project in the old format moves to the English names, the only ones the install reads.
  await migrateFirst(opts.targetDir);
  assertSafeManifest(opts.targetDir);
  const { r, existing, previous, shouldOverwrite: base } = installChoices(opts);
  const shouldOverwrite = await replaceOnConfirm(r, previous, base, opts.force ? undefined : opts.confirmDrift);
  // Read before anything is written: only a first install attaches the existing code (QUA-110).
  const firstInstall = readConfig(opts.targetDir) === null && !Object.keys(previous).length;
  const hadMap = existsSync(join(opts.targetDir, "docs", "architecture.md"));
  const flagged: string[] = [];
  const manifest: Record<string, string> = {};
  const expected: string[] = [];
  await scaffold(r, { shouldOverwrite, drifted: flagged, manifest, expected, ci: { lang: r.lang, commit: update ?? undefined } });
  const drifted = flagged.filter((f) => !isProjectFile(f));
  const completed: Record<string, string> = {};
  const { added } = await complete(r, { manifest, previous, completed, committed: update !== null });
  const obsolete = await removeObsolete(opts.targetDir, previous, expected);
  await writeManifest(opts.targetDir, manifest, obsolete);
  await writeCompleted(opts.targetDir, completed);
  await writeInstall(opts.targetDir, engineVersion(), Object.keys(previous).length > 0);
  await writeConfig(r);
  reportStack(r);
  reportDrifted(drifted, r.lang);
  reportObsolete(obsolete, r.lang);
  reportAdded(added, r.lang);
  if (firstInstall) await attachExistingCode(opts.targetDir, (readConfig(opts.targetDir) ?? {}) as ProjectConfig, { hadMap, lang: r.lang });
  // An existing project gets no new repository: only the hooks are enabled if there is one.
  if (opts.git !== false) setupGit(opts.targetDir, !existing, r.lang);
  // Last, once git is set up: what drwil still needs and leaves to the human, never silently.
  const left = formatGaps((await complete(r, { dryRun: true })).gaps, r.lang);
  if (left.length) console.log(left.join("\n"));
  // Not yet enforced: wired once the stack is known (QUA-087), never silently skipped.
  if (readConfig(opts.targetDir)?.guarantees === undefined) console.log(TEXTS[r.lang].guarantees);
  if (update) finishUpdate(opts.targetDir, r.lang, update, engineVersion(), drifted.length);
}
