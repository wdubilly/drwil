// Messages of the versioning guarantee (QUA-094, QUA-095), split from guarantees-forge.ts (QUA-001).
export const TEXTS = {
  fr: {
    noGit: "pas de dépôt Git (`git init`)",
    noRemote: "pas de dépôt distant `origin` sur GitHub ou GitLab",
    noCi: "pas de CI déclarée (`npx drwil init --ci github` ou `--ci gitlab`)",
    ciFile: "fichier de CI absent : {0}",
    noReplay: "la CI ne rejoue pas les contrôles du hook (`node .githooks/run-checks.mjs`) : un `--no-verify` passerait",
    unprotected: "branche principale `{0}` non protégée : fusion par PR/MR et contrôles requis, sans contournement administrateur",
    partial: "protection de `{0}` incomplète : {1}",
    noPr: "fusion par PR/MR non imposée",
    noChecks: "contrôles de CI non requis",
    adminBypass: "les administrateurs peuvent contourner",
    pushAllowed: "push direct autorisé",
    notRun: "protection de la branche non vérifiée (non exécuté) : {0} injoignable ou non connecté",
    rulesetBypass: "le ruleset a des acteurs qui le contournent (bypass_actors : {0})",
    bypassNone: "aucun acteur ne contourne le ruleset de `{0}`",
    bypassUnverified:
      "contournement du ruleset (bypass_actors) non vérifié : lisible seulement avec un jeton administrateur du dépôt (`gh auth login` d'un administrateur, puis `drwil guarantees`)",
  },
  en: {
    noGit: "no Git repository (`git init`)",
    noRemote: "no `origin` remote on GitHub or GitLab",
    noCi: "no CI declared (`npx drwil init --ci github` or `--ci gitlab`)",
    ciFile: "CI file missing: {0}",
    noReplay: "the CI does not replay the hook's checks (`node .githooks/run-checks.mjs`): a `--no-verify` would get through",
    unprotected: "main branch `{0}` not protected: merge through PR/MR and required checks, no administrator bypass",
    partial: "protection of `{0}` incomplete: {1}",
    noPr: "merge through PR/MR not enforced",
    noChecks: "CI checks not required",
    adminBypass: "administrators can bypass",
    pushAllowed: "direct push allowed",
    notRun: "branch protection not checked (not run): {0} unreachable or not logged in",
    rulesetBypass: "the ruleset has actors that bypass it (bypass_actors: {0})",
    bypassNone: "no actor bypasses the ruleset of `{0}`",
    bypassUnverified:
      "ruleset bypass (bypass_actors) not verified: readable only with a repository administrator token (`gh auth login` as an administrator, then `drwil guarantees`)",
  },
};
