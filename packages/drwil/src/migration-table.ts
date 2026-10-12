// Anciens noms français du kit et leurs noms anglais (glossaire de
// docs/intentions/livrable-full-english.md) : seule source de la migration d'un projet équipé.
// Migration en une fois, sans alias (décision du 2026-10-12) : après elle, les hooks ne lisent plus
// que les noms anglais.

/** Contenu du projet déplacé, jamais supprimé (fiches, index, contrats). Les fiches seront
 * déplacées une à une : docs/projets/<x>.md → docs/projects/<x>.md, sauf les noms ci-dessous. */
export const DOSSIER_FICHES: [string, string] = ["docs/projets/", "docs/projects/"];
export const DEPLACES: Record<string, string> = {
  "docs/projets/en-attente.md": "docs/projects/pending.md",
  "docs/projets/entretien-courant.md": "docs/projects/routine-maintenance.md",
  "docs/projets/mecanique-ia-first.md": "docs/projects/kit-mechanics.md",
  "docs/projets/modele-fiche-projet.md": "docs/projects/model-brief.md",
  "docs/contrats.md": "docs/contracts.md",
  "docs/catalogue-contrats.md": "docs/contracts-catalog.md",
  ".drwil/fichiers-installes.json": ".drwil/installed-files.json",
  ".drwil/rappel.json": ".drwil/reminder.json",
};

const RECETTES: Record<string, string> = {
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
  ...Object.fromEntries(Object.entries(RECETTES).filter(([fr]) => fr !== "travailler-en-branche")),
  "lancer-un-chantier": "start-a-workstream",
};

/** Hooks renommés : `.githooks/` et `.claude/hooks/`. */
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

/** Fichiers de l'ancien gabarit français remplacés par leur homologue anglais : supprimés s'ils
 * n'ont pas changé depuis l'installation, gardés et signalés sinon. */
export const ANCIENS_DU_KIT: Record<string, string> = {
  ...Object.fromEntries(Object.entries(RECETTES).map(([fr, en]) => [`docs/recettes/${fr}.md`, `docs/recipes/${en}.md`])),
  ...Object.fromEntries(Object.entries(SKILLS).map(([fr, en]) => [`.claude/skills/${fr}/SKILL.md`, `.claude/skills/${en}/SKILL.md`])),
  ".github/instructions/ajouter-un-ecran-front.instructions.md": ".github/instructions/add-a-frontend-screen.instructions.md",
  ".github/instructions/ajouter-une-route-api.instructions.md": ".github/instructions/add-an-api-route.instructions.md",
  "docs/securite.md": "docs/security.md",
  "docs/deploiement.md": "docs/deployment.md",
  "docs/fonctionnalites.md": "docs/features.md",
  "docs/charte-graphique.md": "docs/style-guide.md",
  ...HOOKS,
};

/** Mécanique du kit : un fichier inchangé depuis l'installation est supprimé, puis réécrit à neuf
 * par l'installation (il appelle les hooks sous leurs nouveaux noms). */
export const MECANIQUE = [".githooks/", ".claude/hooks/", ".claude/settings.json"];

/** Sous-commandes de `.githooks/state.mjs`, réécrites dans les références (docs, réglages). */
export const SOUS_COMMANDES: Record<string, string> = { passer: "move", lancer: "start", fiches: "briefs", rappel: "reminder" };

export const ACTIVITES: Record<string, string> = {
  CADRAGE: "SCOPING",
  ATTENTE: "EXPECTATION",
  DEMANDE: "REQUEST",
  REALISATION: "BUILD",
  PREUVES: "EVIDENCE",
  VERIFY: "VERIFY",
  CLOTURE: "CLOSING",
};

export const CHAMPS_ETAT: Record<string, string> = {
  activite: "activity",
  attente_active: "active_brief",
  demande_active: "active_request",
  fusion_autorisee: "auto_merge",
  depuis: "since",
};

/** Clés de `.drwil/ia-first.json` ; les valeurs de sévérité et de transitions suivent. */
export const CLES_CONFIG: Record<string, string> = {
  barriere: "scopeGate",
  cadrage: "scopeReminder",
  nouvellesExigences: "newRequirements",
  horsPerimetre: "outOfScope",
  risque: "risk",
};
export const CLES_CONFIG_IMBRIQUEES: Record<string, Record<string, string>> = {
  dirs: { recettes: "recipes" },
  risk: { cheminsSensibles: "sensitivePaths" },
  checks: { chemins: "paths" },
};
export const VALEURS_CONFIG: Record<string, string> = { bloquant: "blocking", avertissement: "warning", humain: "human" };

export const CHAMPS_USAGE: Record<string, string> = {
  chantier: "workstream",
  lot: "increment",
  modele: "model",
  duree_min: "duration_min",
};

/** Bloc de périmètre des fiches. */
export const BLOC = { ancien: "<!-- cadrage", nouveau: "<!-- scope", cleAncienne: "fichiers:", cleNouvelle: "files:" };
