import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

export { detectStack, type StackEntry } from "./stack.js";
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
export { attest, contractSummary, type AttestResult } from "./attest.js";
export { type ClosureProof, judgeProofs, parseProof, type ProofResult, PROOFS_DIR, readProofs } from "./closure.js";
export { formatForAgent } from "./agent.js";
export { doctor, formatDiagnosis, diagnosisJson, listContracts, type Diagnosis } from "./doctor.js";
export { LANGS, TOOLS, CIS, type InitOptions } from "./config.js";
export { uninstall, type UninstallOptions, type UninstallReport } from "./manifest.js";
export { resolveDrift, type ResolveDriftOptions, type ResolveDriftReport } from "./drift.js";
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
import { assertSafeManifest, engineVersion, removeObsolete, writeInstall, writeManifest } from "./manifest.js";
import { formatMigration, migrate } from "./migration.js";
import { complete, type Addition } from "./complete.js";
import { formatGaps, hooksPath } from "./essentials.js";
import { attachExistingCode, type ProjectConfig } from "./existing-code.js";

// Branch created by `init()` before the very first commit: nobody ever needs to push to
// master/main again, not even for the bootstrap.
const INSTALL_BRANCH = "workstream/kit-installation";

const TEXTS = {
  fr: {
    noGit: "⚠ git introuvable : dépôt et hooks non configurés (lancer `git init` puis `git config core.hooksPath .githooks`).",
    noRepo: "⚠ pas de dépôt git : hooks non activés (lancer `git config core.hooksPath .githooks` après `git init`).",
    repoCreated: "Dépôt git initialisé, branche « {0} » créée (jamais de commit direct sur master/main).",
    hooksEnabled: "Hooks activés (core.hooksPath = .githooks).",
    hooksKept: "core.hooksPath déjà réglé ({0}) : gardé tel quel, les hooks drwil n'y tournent que s'ils y sont appelés (voir ci-dessous).",
    added: "Ajouté aux fichiers du projet, sans rien y écraser (bloc « drwil », retiré par `drwil uninstall`) :",
    stack: "Stack détectée : {0}",
    noStack: "Stack non détectée : à décider par l'utilisateur (voir docs/architecture.md).",
    noLayers:
      "Aucune couche écrite : le projet n'a pas encore de code. Le cadrer d'abord (/drwil-adopt : besoin, pile, couches), ou déclarer les couches avec --layers.",
    drifted: "⚠ Fichiers dérivés du template du kit (nombre de lignes ou sections différents, jamais réécrits automatiquement) :",
    obsolete: "Fichiers obsolètes d'une version antérieure du kit supprimés (jamais modifiés depuis l'installation) :",
    guarantees:
      "Garanties obligatoires (couverture 100 %, e2e, forge protégée, présentation) : `npx drwil guarantees` une fois la pile connue (/drwil-adopt).",
  },
  en: {
    noGit: "⚠ git not found: repository and hooks not configured (run `git init` then `git config core.hooksPath .githooks`).",
    noRepo: "⚠ no git repository: hooks not enabled (run `git config core.hooksPath .githooks` after `git init`).",
    repoCreated: 'Git repository initialised, branch "{0}" created (never a direct commit on master/main).',
    hooksEnabled: "Hooks enabled (core.hooksPath = .githooks).",
    hooksKept: "core.hooksPath already set ({0}): kept as it is, drwil hooks only run if called from there (see below).",
    added: 'Added to the project\'s files, nothing overwritten ("drwil" block, removed by `drwil uninstall`):',
    stack: "Detected stack: {0}",
    noStack: "Stack not detected: for the user to decide (see docs/architecture.md).",
    noLayers:
      "No layer written: the project has no code yet. Scope it first (/drwil-adopt: need, stack, layers), or declare the layers with --layers.",
    drifted: "⚠ Files drifted from the kit's template (different line count or sections, never rewritten automatically):",
    obsolete: "Obsolete files of an earlier kit version removed (never modified since installation):",
    guarantees:
      "Mandatory guarantees (100 % coverage, e2e, protected forge, presentation): `npx drwil guarantees` once the stack is known (/drwil-adopt).",
  },
};

function setupGit(targetDir: string, allowInit: boolean, lang: MessageLang): void {
  const T = TEXTS[lang];
  const git = (...args: string[]) => execFileSync("git", args, { cwd: targetDir, stdio: "pipe" }).toString().trim();
  try {
    git("--version");
  } catch {
    console.warn(T.noGit);
    return;
  }
  if (!existsSync(join(targetDir, ".git"))) {
    if (!allowInit) {
      console.warn(T.noRepo);
      return;
    }
    git("init");
    // Before any commit: never on master/main (see QUA-017, no more bootstrap exception).
    git("checkout", "-b", INSTALL_BRANCH);
    console.log(fill(T.repoCreated, INSTALL_BRANCH));
  }
  // A hook manager of the project (husky, lefthook…) is never switched off: findGaps() reports the
  // drwil hooks to call from it.
  const current = hooksPath(targetDir);
  if (current && current !== ".githooks") {
    console.log(fill(T.hooksKept, current));
    return;
  }
  git("config", "core.hooksPath", ".githooks");
  // commit-msg is deliberately shipped non-executable: without this setting, git repeats the same
  // warning at every commit, permanent noise.
  git("config", "advice.ignoredHook", "false");
  console.log(T.hooksEnabled);
}

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

// Never an automatic rewrite: only tells that an already present file drifted from the kit's
// template (mechanics or prose), to compare/update by hand if needed.
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
export async function init(opts: InitOptions): Promise<void> {
  // First of all: a project in the old format moves to the English names, the only ones the install reads.
  await migrateFirst(opts.targetDir);
  assertSafeManifest(opts.targetDir);
  const { r, existing, previous, shouldOverwrite } = installChoices(opts);
  // Read before anything is written: only a first install attaches the existing code (QUA-110).
  const firstInstall = readConfig(opts.targetDir) === null && !Object.keys(previous).length;
  const hadMap = existsSync(join(opts.targetDir, "docs", "architecture.md"));
  const drifted: string[] = [];
  const manifest: Record<string, string> = {};
  const expected: string[] = [];
  await scaffold(r, { shouldOverwrite, drifted, manifest, expected });
  const { added } = await complete(r, { manifest });
  const obsolete = await removeObsolete(opts.targetDir, previous, expected);
  await writeManifest(opts.targetDir, manifest, obsolete);
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
}
