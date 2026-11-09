// Mise à jour du kit d'un projet équipé (QUA-206, QUA-237) : `init` coupe une branche dédiée depuis la branche
// principale, applique la mise à jour et la commite lui-même, pour que la barrière de périmètre ne bloque pas le projet.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { hooksPath } from "./essentials.js";
import { readInstall, readManifest } from "./manifest.js";

export const UPDATE_BRANCH = "workstream/kit-update";
/** Trailer et variable que la barrière de périmètre reconnaît (scope-gate-kit.mjs, livré par le gabarit). */
const TRAILER = "Drwil-Kit-Update";
const ENV = "DRWIL_KIT_UPDATE";

export interface UpdatePlan {
  branch: string;
  main: string;
  /** Branche sur laquelle l'utilisateur se trouvait, où revenir si rien ne change. */
  from: string;
  previousVersion: string | null;
}

const TEXTS = {
  fr: {
    dirty:
      "Mise à jour refusée, rien n'a été modifié : l'arbre de travail n'est pas propre ({0}). Commiter ou remiser ces changements (`git stash`), puis relancer `npx drwil init`.",
    identity:
      "Mise à jour refusée, rien n'a été modifié : aucune identité git pour commiter la mise à jour. Régler `git config user.name` et `git config user.email`, puis relancer `npx drwil init`.",
    behind:
      "Mise à jour refusée, rien n'a été modifié : la branche « {0} » est en retard sur le distant. La mettre à jour d'abord : `git fetch origin && git checkout {0} && git merge --ff-only origin/{0}`, puis relancer `npx drwil init`.",
    exists:
      "Mise à jour refusée, rien n'a été modifié : la branche « {0} » existe déjà (mise à jour précédente non fusionnée). La fusionner ou la supprimer (`git branch -D {0}`), puis relancer `npx drwil init`.",
    checkout: "Mise à jour refusée, rien n'a été modifié : la branche « {0} » n'a pas pu être créée ({1}).",
    noMain:
      "⚠ branche principale introuvable (origin/HEAD, master, main) : la mise à jour reste dans l'arbre de travail, sans commit ni branche dédiée.",
    upToDate: "Kit déjà à jour : rien à commiter, retour sur la branche « {0} ».",
    committed: "Fait : mise à jour du kit vers {0} commitée sur la branche « {1} » (créée depuis « {2} »), {3} fichier(s).",
    notCommitted:
      "⚠ Mise à jour appliquée sur la branche « {0} » mais commit non fait ({1}) : les fichiers sont dans l'arbre de travail, à commiter une fois la cause levée.",
    decide: "Reste à décider : relire la mise à jour, puis la fusionner par une pull request.",
    drift:
      "Reste à décider : {0} fichier(s) modifié(s) à la main n'ont pas été réécrits — `npx drwil init` dans un terminal propose le diff de chacun.",
    next: "Commande suivante : `git push -u origin {0}`, puis `gh pr create --base {1}` ; une fois fusionnée, `git checkout {1}`.",
    hooks: "Les hooks du projet sont gérés par un autre outil (core.hooksPath = {0}) : ils jugent ce commit à leur façon.",
  },
  en: {
    dirty:
      "Update refused, nothing was changed: the working tree is not clean ({0}). Commit or stash those changes (`git stash`), then run `npx drwil init` again.",
    identity:
      "Update refused, nothing was changed: no git identity to commit the update. Set `git config user.name` and `git config user.email`, then run `npx drwil init` again.",
    behind:
      'Update refused, nothing was changed: branch "{0}" is behind the remote. Bring it up to date first: `git fetch origin && git checkout {0} && git merge --ff-only origin/{0}`, then run `npx drwil init` again.',
    exists:
      'Update refused, nothing was changed: branch "{0}" already exists (an earlier update that was not merged). Merge or delete it (`git branch -D {0}`), then run `npx drwil init` again.',
    checkout: 'Update refused, nothing was changed: branch "{0}" could not be created ({1}).',
    noMain:
      "⚠ main branch not found (origin/HEAD, master, main): the update stays in the working tree, with no commit or dedicated branch.",
    upToDate: 'Kit already up to date: nothing to commit, back on branch "{0}".',
    committed: 'Done: kit update to {0} committed on branch "{1}" (created from "{2}"), {3} file(s).',
    notCommitted:
      '⚠ Update applied on branch "{0}" but not committed ({1}): the files are in the working tree, to be committed once the cause is fixed.',
    decide: "Left to decide: review the update, then merge it through a pull request.",
    drift: "Left to decide: {0} file(s) modified by hand were not rewritten — `npx drwil init` in a terminal offers the diff of each.",
    next: "Next command: `git push -u origin {0}`, then `gh pr create --base {1}`; once merged, `git checkout {1}`.",
    hooks: "The project's hooks are managed by another tool (core.hooksPath = {0}): they judge this commit their own way.",
  },
};

const run = (dir: string, args: string[], env?: NodeJS.ProcessEnv): string =>
  execFileSync("git", args, { cwd: dir, stdio: "pipe", env: env ?? process.env, timeout: 60_000 })
    .toString()
    .trim();
const ok = (dir: string, args: string[]): boolean => {
  try {
    run(dir, args);
    return true;
  } catch {
    return false;
  }
};
const firstLines = (e: unknown): string =>
  String((e as { stderr?: Buffer }).stderr?.toString() || (e as Error).message)
    .trim()
    .split("\n")
    .slice(0, 4)
    .join(" | ");

function mainBranch(dir: string): string | null {
  try {
    const origin = run(dir, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"]).replace("refs/remotes/origin/", "");
    if (origin && ok(dir, ["rev-parse", "--verify", "--quiet", `refs/heads/${origin}`])) return origin;
  } catch {}
  return ["master", "main"].find((b) => ok(dir, ["rev-parse", "--verify", "--quiet", `refs/heads/${b}`])) ?? null;
}

/**
 * Before anything is written: refuses (an Error that says what to do) when the update could not be committed
 * cleanly, otherwise cuts the dedicated branch from the project's main branch. Null: not an update, or no commit to make
 * (no git, no commit yet, no main branch), the update then stays in the working tree as it always did.
 */
export function prepareUpdate(dir: string): UpdatePlan | null {
  // Only an equipped project (a manifest) in a git repository is an update; a first install is never committed here.
  if (!existsSync(join(dir, ".git")) || !Object.keys(readManifest(dir)).length) return null;
  const lang = projectLang(dir);
  const previousVersion = readInstall(dir)?.version ?? null;
  const T = TEXTS[lang];
  if (!ok(dir, ["rev-parse", "--verify", "--quiet", "HEAD"])) return null;
  const main = mainBranch(dir);
  if (!main) {
    console.warn(T.noMain);
    return null;
  }
  const dirty = run(dir, ["status", "--porcelain"]);
  if (dirty) throw new Error(fill(T.dirty, `${dirty.split("\n").length} chemin(s)`));
  if (!ok(dir, ["var", "GIT_COMMITTER_IDENT"]) || !ok(dir, ["var", "GIT_AUTHOR_IDENT"])) throw new Error(T.identity);
  // The remote is only read here; bringing the main branch up to date stays the human's gesture.
  if (ok(dir, ["remote", "get-url", "origin"])) ok(dir, ["fetch", "--quiet", "origin"]);
  if (
    ok(dir, ["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${main}`]) &&
    !ok(dir, ["merge-base", "--is-ancestor", `origin/${main}`, main])
  )
    throw new Error(fill(T.behind, main));
  if (ok(dir, ["rev-parse", "--verify", "--quiet", `refs/heads/${UPDATE_BRANCH}`])) throw new Error(fill(T.exists, UPDATE_BRANCH));
  let from = main;
  try {
    from = run(dir, ["symbolic-ref", "--quiet", "--short", "HEAD"]) || main;
  } catch {} // HEAD détachée : retour sur la branche principale.
  try {
    run(dir, ["checkout", "--quiet", "-b", UPDATE_BRANCH, main]);
  } catch (e) {
    throw new Error(fill(T.checkout, UPDATE_BRANCH, firstLines(e)));
  }
  return { branch: UPDATE_BRANCH, main, from, previousVersion };
}

/** Commits the update on its branch (hooks included, the scope gate recognises it by its manifest), then says what was done. */
export function finishUpdate(dir: string, lang: MessageLang, plan: UpdatePlan, version: string, drifted: number): void {
  const T = TEXTS[lang];
  const changed = run(dir, ["status", "--porcelain", "-uall"]);
  if (!changed) {
    run(dir, ["checkout", "--quiet", plan.from]);
    run(dir, ["branch", "-D", plan.branch]);
    console.log(fill(T.upToDate, plan.from));
    return;
  }
  try {
    run(dir, ["add", "-A"]);
    const subject = `${lang === "fr" ? "Mise à jour du kit drwil" : "Update the drwil kit"}: ${plan.previousVersion ?? "?"} → ${version}`;
    run(dir, ["commit", "--quiet", "-m", subject, "-m", `${TRAILER}: ${version}`], { ...process.env, [ENV]: version });
    console.log(fill(T.committed, version, plan.branch, plan.main, changed.split("\n").length));
  } catch (e) {
    console.warn(fill(T.notCommitted, plan.branch, firstLines(e)));
  }
  const hooks = hooksPath(dir);
  if (hooks && hooks !== ".githooks") console.log(fill(T.hooks, hooks));
  if (drifted) console.log(fill(T.drift, drifted));
  console.log(T.decide);
  console.log(fill(T.next, plan.branch, plan.main));
}
