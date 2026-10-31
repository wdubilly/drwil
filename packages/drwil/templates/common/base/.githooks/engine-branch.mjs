// The main-branch check (QUA-017), split from engine.mjs.
import { spawnSync } from "node:child_process";

/** Vrai si `remote` (nom ou URL) répond et n'a aucune branche. */
function remoteWithoutBranch(root, remote) {
  if (!remote) return false;
  const r = spawnSync("git", ["ls-remote", "--heads", remote], { cwd: root, encoding: "utf8", timeout: 15000 });
  return r.status === 0 && r.stdout.trim() === "";
}

/** Verdict of the main-branch check for the environment `env` of the hook that runs it. */
export function mainBranchVerdict(root, env, T) {
  // QUA-017: never work directly on the main branch, including the very first commit (`init()` always creates a working branch first).
  // `symbolic-ref` works even before the first commit. Never in CI (a merge landing on master is legitimate), nor on a push of tags
  // only (DRWIL_PUSH_TAGS_ONLY) or of branch deletions (DRWIL_PUSH_NO_BRANCH), both set by .githooks/pre-push. At push time, the pushed
  // remote branches (DRWIL_PUSH_REFS) are judged, not the current one: `recette/vX.Y.Z` pushed from master does not touch master.
  if (env.CI) return { status: "not-applicable", detail: T.branchCi };
  if (env.DRWIL_PUSH_TAGS_ONLY === "1") return { status: "not-applicable", detail: T.branchTags };
  if (env.DRWIL_PUSH_NO_BRANCH === "1") return { status: "not-applicable", detail: T.branchNoBranch };
  if (env.DRWIL_PUSH_REFS?.trim()) {
    const pushed = env.DRWIL_PUSH_REFS.trim()
      .split(/\s+/)
      .map((r) => r.replace(/^refs\/heads\//, ""));
    const main = pushed.find((b) => ["master", "main"].includes(b));
    if (!main) return { status: "ok" };
    // Exception bornée : sur un distant sans aucune branche, aucune PR ne peut fusionner vers la principale. Hors ligne ou
    // en erreur, pas d'exception (QUA-013 : ce qui n'est pas lu n'est pas prouvé). Aucun réglage ne la désactive ni ne l'élargit.
    if (remoteWithoutBranch(root, env.DRWIL_PUSH_REMOTE)) return { status: "ok", detail: T.branchFirstPush };
    return { status: "fail", message: T.branchProtected(main) };
  }
  const branch = spawnSync("git", ["symbolic-ref", "--short", "HEAD"], { cwd: root, encoding: "utf8" });
  const branchName = branch.status === 0 ? branch.stdout.trim() : null;
  if (branchName && ["master", "main"].includes(branchName)) return { status: "fail", message: T.branchProtected(branchName) };
  return { status: "ok" };
}
