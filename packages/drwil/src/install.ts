import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isCiFile } from "./ci-zone.js";
import { isKitProse, isMechanics, readConfig, resolve, type InitOptions, type Resolved } from "./config.js";
import { readManifest, sha256 } from "./manifest.js";
import type { Overwrite } from "./render.js";
import { detectStack } from "./stack.js";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { compareVersions, engineVersion, readInstall } from "./install-record.js";

export interface InstallChoices {
  r: Resolved;
  /** An already equipped project, or existing code: never a `git init`, layers from the detected stack. */
  existing: boolean;
  /** Manifest of the previous installation (empty for a new one). */
  previous: Record<string, string>;
  shouldOverwrite: Overwrite;
}

/**
 * What `drwil init` decides before writing anything, shared with its preview (`--dry-run`) so that
 * the preview cannot diverge from the installation. A new project gets no layer (declared once its stack is
 * chosen); an existing one, the subfolders where a stack was found. The kit mechanics are refreshed when they
 * did not change since their installation (or were never recorded); the kit's prose (KIT_PROSE) only
 * when recorded and unchanged — a project's own AGENTS.md, absent from the manifest, is never
 * overwritten. A CI file as installed is refreshed, one
 * modified since keeps its project zones (QUA-283). A file modified by hand is reported as drift, never overwritten.
 * `--force` rewrites everything.
 */
export function installChoices(opts: InitOptions): InstallChoices {
  const existing = readConfig(opts.targetDir) !== null || detectStack(opts.targetDir).length > 0;
  // No stack detected (an empty folder, a new project): no layer is invented; they are declared once
  // the stack is chosen, when the project is scoped (/drwil-adopt) or with --layers (QUA-038).
  const r = resolve(opts, (stack) => stack.map((s) => s.path).filter((p) => p !== "."));
  const previous = readManifest(opts.targetDir);
  const recorded = (rel: string) => {
    const abs = join(opts.targetDir, rel);
    return rel in previous && existsSync(abs) && previous[rel] === sha256(readFileSync(abs, "utf8"));
  };
  const unchanged = (rel: string) => !(rel in previous) || !existsSync(join(opts.targetDir, rel)) || recorded(rel);
  const shouldOverwrite: Overwrite = opts.force
    ? () => true
    : (rel) => (isMechanics(rel) && unchanged(rel)) || ((isKitProse(rel) || isCiFile(rel)) && recorded(rel));
  return { r, existing, previous, shouldOverwrite };
}

const COMMIT_TEXTS = {
  fr: {
    committed: "Kit commité sur la branche « {0} » (commit initial, avant l'activation des hooks).",
    notCommitted: "⚠ commit initial du kit non fait ({0}) : le commiter à la main avant de lancer un chantier.",
    message: "Installation du kit drwil",
  },
  en: {
    committed: 'Kit committed on branch "{0}" (initial commit, before the hooks are enabled).',
    notCommitted: "⚠ initial kit commit not made ({0}): commit it by hand before starting a workstream.",
    message: "Install the drwil kit",
  },
};

// Only on the repository `init` has just created (no commit yet), on the installation branch and
// before core.hooksPath is set: with `scopeGate` blocking (QUA-154), files outside any brief could not
// be committed in SCOPING afterwards, so the first workstream would start on a refused commit.
export function commitKit(lang: MessageLang, branch: string, git: (...args: string[]) => string): void {
  const T = COMMIT_TEXTS[lang];
  try {
    git("add", "-A");
    git("commit", "-m", T.message);
    console.log(fill(T.committed, branch));
  } catch (e) {
    const detail = String((e as { stderr?: Buffer }).stderr ?? (e as Error).message)
      .trim()
      .split("\n")[0];
    console.warn(fill(T.notCommitted, detail));
  }
}

const VERSION_TEXTS = {
  fr: {
    older:
      "Montée refusée, rien n'a été modifié : ce projet est équipé en {0} et cette commande est en {1}, plus ancienne (elle rétrograderait la mécanique). Relancer avec la bonne version (`npx drwil@{0} init`) ; pour rétrograder volontairement, ajouter `--allow-older`.",
    other:
      "Montée refusée, rien n'a été modifié : la version visée est {0} et cette commande est en {1}. Relancer avec `npx drwil@{0} init`.",
  },
  en: {
    older:
      "Update refused, nothing was changed: this project is equipped with {0} and this command is {1}, which is older (it would downgrade the mechanics). Run it again with the right version (`npx drwil@{0} init`); to downgrade on purpose, add `--allow-older`.",
    other:
      "Update refused, nothing was changed: the target version is {0} and this command is {1}. Run it again with `npx drwil@{0} init`.",
  },
};

/**
 * Before anything is written: `init` refuses to run with a version older than the one recorded in
 * .drwil/install.json (no record: nothing to compare), or different from the version aimed at.
 * `allowOlder` lets a deliberate downgrade through; the aimed version still has to match.
 */
export function assertVersion(
  targetDir: string,
  opts: { allowOlder?: boolean; targetVersion?: string } = {},
  version = engineVersion(),
): void {
  const T = VERSION_TEXTS[projectLang(targetDir)];
  if (opts.targetVersion !== undefined && compareVersions(opts.targetVersion, version) !== 0)
    throw new Error(fill(T.other, opts.targetVersion, version));
  const recorded = readInstall(targetDir)?.version;
  if (recorded && !opts.allowOlder && compareVersions(version, recorded) < 0) throw new Error(fill(T.older, recorded, version));
}
