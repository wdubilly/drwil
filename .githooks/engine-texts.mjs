// Names and messages of the engine's own checks, French and English (split from engine.mjs).

const TEXTS = {
  fr: {
    secrets: "secrets (gitleaks)",
    gitleaksMissing: "gitleaks absent",
    noGit: "pas de dépôt git",
    minimalMode: "mode minimal",
    docs: "chemins et contrats cités dans la doc",
    contractTests: "tests cités par les contrats, présents et porteurs de leur ID (QUA-029)",
    architecture: "carte d'architecture à jour (QUA-040)",
    scope: "périmètre de l'attente",
    branch: "branche principale (QUA-017)",
    branchCi: "jamais en CI",
    branchTags: "push de tags uniquement",
    branchNoBranch: "push de tags ou de suppressions de branches uniquement",
    branchProtected: (b) =>
      `travail direct sur la branche principale (${b}) : passer par une branche et une pull/merge request (voir docs/recipes/working-with-branches.md)`,
    selfTests: "tests des contrôles eux-mêmes",
    noTests: "tests propres au dépôt drwil, non livrés",
    ciCoverage: "couverture CI de chaque contrôle (QUA-013)",
    noCi: "aucune CI configurée (ci: none) : pas de filet pour les contrôles dégradables — en déclarer une : `npx drwil init --ci github` (ou `--ci gitlab`)",
    deferred: "aucun fichier indexé sous ses chemins : rejoué au push et en CI",
    docsOnly: "commit de documentation seule : rejoué au push et en CI",
    buildFailed: (n) => `${n} : la compilation du projet (build) est en échec`,
    buildMissing: (n) => `${n} déclare needsBuild sans « build » dans .drwil/ia-first.json`,
  },
  en: {
    secrets: "secrets (gitleaks)",
    gitleaksMissing: "gitleaks not installed",
    noGit: "not a git repository",
    minimalMode: "minimal mode",
    docs: "paths and contracts cited in docs",
    contractTests: "tests cited by the contracts, present and carrying their ID (QUA-029)",
    architecture: "architecture map up to date (QUA-040)",
    scope: "brief scope",
    branch: "main branch (QUA-017)",
    branchCi: "never in CI",
    branchTags: "tags-only push",
    branchNoBranch: "push of tags or branch deletions only",
    branchProtected: (b) =>
      `direct work on the main branch (${b}): go through a branch and a pull/merge request (see docs/recipes/working-with-branches.md)`,
    selfTests: "tests of the checks themselves",
    noTests: "tests owned by the drwil repository, not shipped",
    ciCoverage: "CI coverage of each check (QUA-013)",
    noCi: "no CI configured (ci: none): no net for degradable checks — declare one: `npx drwil init --ci github` (or `--ci gitlab`)",
    deferred: "no staged file under its paths: replayed on push and in CI",
    docsOnly: "documentation-only commit: replayed on push and in CI",
    buildFailed: (n) => `${n}: the project build failed`,
    buildMissing: (n) => `${n} declares needsBuild without a "build" in .drwil/ia-first.json`,
  },
};

export function texts(lang) {
  return TEXTS[lang === "en" ? "en" : "fr"];
}
