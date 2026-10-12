// The kit's old French names and their English names: single source of the migration of an equipped
// project. Migration in one go, without aliases: after it, the hooks only read the English names.

/** Project content moved, never deleted (briefs, index, contracts). Briefs are moved one by one:
 * docs/projets/<x>.md → docs/projects/<x>.md, except the names below. */
export const BRIEF_DIR: [string, string] = ["docs/projets/", "docs/projects/"];
export const MOVED: Record<string, string> = {
  "docs/projets/en-attente.md": "docs/projects/pending.md",
  "docs/projets/entretien-courant.md": "docs/projects/routine-maintenance.md",
  "docs/projets/mecanique-ia-first.md": "docs/projects/kit-mechanics.md",
  "docs/projets/modele-fiche-projet.md": "docs/projects/model-brief.md",
  "docs/contrats.md": "docs/contracts.md",
  "docs/catalogue-contrats.md": "docs/contracts-catalog.md",
  ".drwil/fichiers-installes.json": ".drwil/installed-files.json",
  ".drwil/rappel.json": ".drwil/reminder.json",
};

const RECIPES: Record<string, string> = {
  "adopter-le-kit": "adopt-the-kit",
  "ajouter-un-ecran-front": "add-a-frontend-screen",
  "ajouter-une-route-api": "add-an-api-route",
  "auditer-risques-et-dette": "audit-risks-and-debt",
  "creer-une-release": "create-a-release",
  "decouvrir-valeur-produit": "discover-product-value",
  "deployer-en-prod": "deploy-to-production",
  "gerer-les-acces": "manage-access",
  "lancer-en-local": "run-locally",
  "modifier-les-droits": "modify-permissions",
  "refactorer-sans-casser": "refactor-without-breaking",
  "sauvegarder-et-restaurer": "backup-and-restore",
  "suivre-consommation-par-lot": "track-consumption-per-increment",
  "travailler-en-branche": "working-with-branches",
  "visualiser-avancement": "view-progress",
};
const SKILLS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(RECIPES).filter(([fr]) => fr !== "travailler-en-branche")),
  "lancer-un-chantier": "start-a-workstream",
};

/** Renamed hooks: `.githooks/` and `.claude/hooks/`. */
export const HOOKS: Record<string, string> = {
  ".githooks/etat.mjs": ".githooks/state.mjs",
  ".githooks/etat-textes.mjs": ".githooks/state-texts.mjs",
  ".githooks/perimetre.mjs": ".githooks/scope-gate.mjs",
  ".githooks/cadrage.mjs": ".githooks/scope.mjs",
  ".githooks/fiches.mjs": ".githooks/briefs.mjs",
  ".githooks/contrats.mjs": ".githooks/contracts.mjs",
  ".githooks/moteur.mjs": ".githooks/engine.mjs",
  ".githooks/risque.mjs": ".githooks/risk.mjs",
  ".githooks/tableau-de-bord.mjs": ".githooks/dashboard.mjs",
  ".githooks/creer-release.mjs": ".githooks/create-release.mjs",
  ".claude/hooks/garde-fou-bash.mjs": ".claude/hooks/bash-guard.mjs",
  ".claude/hooks/rappel-cadrage.mjs": ".claude/hooks/scope-reminder.mjs",
  ".claude/hooks/saisie-drwil.mjs": ".claude/hooks/prompt-hook.mjs",
};

/** Files of the old French template replaced by their English counterpart: removed if they did not
 * change since installation, kept and reported otherwise. */
export const OLD_KIT_FILES: Record<string, string> = {
  ...Object.fromEntries(Object.entries(RECIPES).map(([fr, en]) => [`docs/recettes/${fr}.md`, `docs/recipes/${en}.md`])),
  ...Object.fromEntries(Object.entries(SKILLS).map(([fr, en]) => [`.claude/skills/${fr}/SKILL.md`, `.claude/skills/${en}/SKILL.md`])),
  ".github/instructions/ajouter-un-ecran-front.instructions.md": ".github/instructions/add-a-frontend-screen.instructions.md",
  ".github/instructions/ajouter-une-route-api.instructions.md": ".github/instructions/add-an-api-route.instructions.md",
  "docs/securite.md": "docs/security.md",
  "docs/deploiement.md": "docs/deployment.md",
  "docs/fonctionnalites.md": "docs/features.md",
  "docs/charte-graphique.md": "docs/style-guide.md",
  ...HOOKS,
};

/** Kit mechanics: a file unchanged since installation is removed, then written anew by the
 * installation (it calls the hooks under their new names). */
export const MECHANICS = [".githooks/", ".claude/hooks/", ".claude/settings.json"];

/** Subcommands of `.githooks/state.mjs`, rewritten in the references (docs, settings). */
export const SUBCOMMANDS: Record<string, string> = { passer: "move", lancer: "start", fiches: "briefs", rappel: "reminder" };

export const ACTIVITIES: Record<string, string> = {
  CADRAGE: "SCOPING",
  ATTENTE: "EXPECTATION",
  DEMANDE: "REQUEST",
  REALISATION: "BUILD",
  PREUVES: "EVIDENCE",
  VERIFY: "VERIFY",
  CLOTURE: "CLOSING",
};

export const STATE_FIELDS: Record<string, string> = {
  activite: "activity",
  attente_active: "active_brief",
  demande_active: "active_request",
  fusion_autorisee: "auto_merge",
  depuis: "since",
};

/** Keys of `.drwil/ia-first.json`; the severity and transitions values follow. */
export const CONFIG_KEYS: Record<string, string> = {
  barriere: "scopeGate",
  cadrage: "scopeReminder",
  nouvellesExigences: "newRequirements",
  horsPerimetre: "outOfScope",
  risque: "risk",
};
export const NESTED_CONFIG_KEYS: Record<string, Record<string, string>> = {
  dirs: { recettes: "recipes" },
  risk: { cheminsSensibles: "sensitivePaths" },
  checks: { chemins: "paths" },
};
export const CONFIG_VALUES: Record<string, string> = { bloquant: "blocking", avertissement: "warning", humain: "human" };

export const USAGE_FIELDS: Record<string, string> = {
  chantier: "workstream",
  lot: "increment",
  modele: "model",
  duree_min: "duration_min",
};

/** Scope block of the briefs. */
export const BLOCK = { old: "<!-- cadrage", new: "<!-- scope", oldKey: "fichiers:", newKey: "files:" };

/** Check identifiers cited by the **Check** field of contract registries (0.5.0). A project check
 * without an `id` was cited as `projet:<name>`, now `project:<name>`. */
export const CHECK_IDS: Record<string, string> = {
  "secrets-fichiers": "secrets",
  "perimetre-attente": "scope-gate",
  "controles-autotest": "checks-self-test",
  "couverture-ci": "ci-coverage",
  "branche-principale": "main-branch",
};
export const PROJECT_CHECK_PREFIX: [string, string] = ["projet:", "project:"];

/** Contract registries rewritten by the check identifiers migration (besides `dirs.contracts`). */
export const REGISTRIES = ["docs/contracts.md", "docs/contracts-catalog.md"];
