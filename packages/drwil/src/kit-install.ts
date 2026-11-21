// Git à l'installation du kit (QUA-206) : dépôt neuf créé et commité, hooks activés (`setupGit`) ; dans un dépôt qui a
// déjà des commits, sans commit la barrière de périmètre refusait l'installation en SCOPING : `init` coupe sa branche
// depuis la branche principale, comme pour la mise à jour (kit-update.ts), et y commite le kit avec le trailer que la
// barrière reconnaît par le manifeste (QUA-238).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Addition } from "./complete.js";
import { hooksPath } from "./essentials.js";
import { commitKit } from "./install.js";
import { cutBranch, prepareUpdate, type KitTexts, type UpdatePlan } from "./kit-update.js";
import { readManifest, sha256 } from "./manifest.js";
import { fill, type MessageLang } from "./i18n.js";

// Branche de l'installation, dépôt neuf (`setupGit`) ou existant : jamais de commit direct sur la branche principale.
export const INSTALL_BRANCH = "workstream/kit-installation";

const GIT_TEXTS = {
  fr: {
    noGit: "⚠ git introuvable : dépôt et hooks non configurés (lancer `git init` puis `git config core.hooksPath .githooks`).",
    noRepo: "⚠ pas de dépôt git : hooks non activés (lancer `git config core.hooksPath .githooks` après `git init`).",
    repoCreated: "Dépôt git initialisé, branche « {0} » créée (jamais de commit direct sur master/main).",
    hooksEnabled: "Hooks activés (core.hooksPath = .githooks).",
    hooksKept: "core.hooksPath déjà réglé ({0}) : gardé tel quel, les hooks drwil n'y tournent que s'ils y sont appelés (voir ci-dessous).",
  },
  en: {
    noGit: "⚠ git not found: repository and hooks not configured (run `git init` then `git config core.hooksPath .githooks`).",
    noRepo: "⚠ no git repository: hooks not enabled (run `git config core.hooksPath .githooks` after `git init`).",
    repoCreated: 'Git repository initialised, branch "{0}" created (never a direct commit on master/main).',
    hooksEnabled: "Hooks enabled (core.hooksPath = .githooks).",
    hooksKept: "core.hooksPath already set ({0}): kept as it is, drwil hooks only run if called from there (see below).",
  },
};

/** A new repository (`allowInit`) is created on the installation branch and committed before the hooks; then the hooks are enabled. */
export function setupGit(targetDir: string, allowInit: boolean, lang: MessageLang): void {
  const T = GIT_TEXTS[lang];
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
    commitKit(lang, INSTALL_BRANCH, git);
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

const TEXTS: Record<MessageLang, KitTexts> = {
  fr: {
    dirty:
      "Installation refusée, rien n'a été modifié : l'arbre de travail n'est pas propre ({0}). Commiter ou remiser ces changements (`git stash`), puis relancer `npx drwil init`.",
    identity:
      "Installation refusée, rien n'a été modifié : aucune identité git pour commiter le kit. Régler `git config user.name` et `git config user.email`, puis relancer `npx drwil init`.",
    behind:
      "Installation refusée, rien n'a été modifié : la branche « {0} » est en retard sur le distant. La mettre à jour d'abord : `git fetch origin && git checkout {0} && git merge --ff-only origin/{0}`, puis relancer `npx drwil init`.",
    exists:
      "Installation refusée, rien n'a été modifié : la branche « {0} » existe déjà (installation précédente non fusionnée). La fusionner ou la supprimer (`git branch -D {0}`), puis relancer `npx drwil init`.",
    checkout: "Installation refusée, rien n'a été modifié : la branche « {0} » n'a pas pu être créée ({1}).",
    noMain:
      "⚠ branche principale introuvable (origin/HEAD, master, main) : l'installation reste dans l'arbre de travail, sans commit ni branche dédiée.",
    upToDate: "Rien à commiter, retour sur la branche « {0} ».",
    committed: "Fait : kit {0} installé et commité sur la branche « {1} » (créée depuis « {2} »), {3} fichier(s).",
    notCommitted:
      "⚠ Kit installé sur la branche « {0} » mais commit non fait ({1}) : les fichiers sont dans l'arbre de travail, à commiter une fois la cause levée.",
    decide: "Reste à décider : relire l'installation, puis la fusionner par une pull request.",
    drift:
      "Reste à décider : {0} fichier(s) déjà présent(s) n'ont pas été réécrits — `npx drwil init` dans un terminal propose le diff de chacun.",
    next: "Commande suivante : `git push -u origin {0}`, puis `gh pr create --base {1}` ; une fois fusionnée, `git checkout {1}`.",
    hooks: "Les hooks du projet sont gérés par un autre outil (core.hooksPath = {0}) : ils jugent ce commit à leur façon.",
    shards: "Reste à décider : {0} — {1}. L'installation n'y écrit rien : lancer `npx drwil doctor --fix`.",
  },
  en: {
    dirty:
      "Installation refused, nothing was changed: the working tree is not clean ({0}). Commit or stash those changes (`git stash`), then run `npx drwil init` again.",
    identity:
      "Installation refused, nothing was changed: no git identity to commit the kit. Set `git config user.name` and `git config user.email`, then run `npx drwil init` again.",
    behind:
      'Installation refused, nothing was changed: branch "{0}" is behind the remote. Bring it up to date first: `git fetch origin && git checkout {0} && git merge --ff-only origin/{0}`, then run `npx drwil init` again.',
    exists:
      'Installation refused, nothing was changed: branch "{0}" already exists (an earlier installation that was not merged). Merge or delete it (`git branch -D {0}`), then run `npx drwil init` again.',
    checkout: 'Installation refused, nothing was changed: branch "{0}" could not be created ({1}).',
    noMain:
      "⚠ main branch not found (origin/HEAD, master, main): the installation stays in the working tree, with no commit or dedicated branch.",
    upToDate: 'Nothing to commit, back on branch "{0}".',
    committed: 'Done: kit {0} installed and committed on branch "{1}" (created from "{2}"), {3} file(s).',
    notCommitted:
      '⚠ Kit installed on branch "{0}" but not committed ({1}): the files are in the working tree, to be committed once the cause is fixed.',
    decide: "Left to decide: review the installation, then merge it through a pull request.",
    drift: "Left to decide: {0} file(s) already present were not rewritten — `npx drwil init` in a terminal offers the diff of each.",
    next: "Next command: `git push -u origin {0}`, then `gh pr create --base {1}`; once merged, `git checkout {1}`.",
    hooks: "The project's hooks are managed by another tool (core.hooksPath = {0}): they judge this commit their own way.",
    shards: "Left to decide: {0} — {1}. The installation writes nothing to it: run `npx drwil doctor --fix`.",
  },
};

const subject = (lang: MessageLang, version: string) =>
  `${lang === "fr" ? "Installation du kit drwil" : "Install the drwil kit"} ${version}`;

/**
 * Before anything is written: the commit `init` will make on its own branch, an update of an equipped project or the
 * first installation in a repository that already has commits (no manifest); null otherwise (no repository, a
 * repository `init` creates itself, no commit yet).
 */
export function prepareKitCommit(dir: string, lang: MessageLang): UpdatePlan | null {
  const update = prepareUpdate(dir);
  if (update || !existsSync(join(dir, ".git")) || Object.keys(readManifest(dir)).length) return update;
  const cut = cutBranch(dir, INSTALL_BRANCH, TEXTS[lang]);
  return cut && { ...cut, previousVersion: null, texts: TEXTS, subject };
}

/**
 * The installation's commit (no previous manifest): the project's own files `init` completed without overwriting them
 * (AGENTS.md, .gitignore…) stay out of the manifest; their fingerprint after completion is noted aside, as for an
 * update (manifest-completed.ts, QUA-244), so the scope gate admits them in this commit and never an edit by hand.
 */
export function noteInstallCompletions(
  dir: string,
  plan: UpdatePlan | null,
  fp: { previous: Record<string, string>; manifest: Record<string, string>; completed: Record<string, string> },
  added: Addition[],
): void {
  if (!plan || Object.keys(fp.previous).length) return;
  for (const { file } of added) if (!(file in fp.manifest)) fp.completed[file] = sha256(readFileSync(join(dir, file), "utf8"));
}
