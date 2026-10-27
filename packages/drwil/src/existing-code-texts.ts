// Messages of the reference brief of the existing code (QUA-110), split from existing-code.ts (QUA-001).
export const TEXTS = {
  fr: {
    title: "# Projet : code existant (indexé avant l'installation du kit)",
    status: "**Statut** : référence — code indexé par git avant l'installation du kit, rattaché par `drwil init` le {0}.",
    need: [
      "## 1. Besoin",
      "",
      "Le contrôle de commit (`.githooks/check-docs.mjs`) refuse tout fichier de code indexé",
      "qu'aucune fiche de `docs/projects/` ne couvre (rappel de cadrage, réglage `scopeReminder`",
      "de `.drwil/ia-first.json`). Ce code existait avant le kit : sans cette fiche, le premier",
      "commit, même d'une fiche seule, serait refusé.",
    ],
    out: [
      "## 2. Hors périmètre",
      "",
      "Le code écrit après l'installation : chaque chantier le couvre par le bloc `scope` de sa",
      "fiche. Les fichiers du kit : `docs/projects/kit-mechanics.md`.",
    ],
    handOff: [
      "## Reprise",
      "",
      "- **Dernier état** : fiche écrite une seule fois par `drwil init`, jamais réécrite par une",
      "  mise à jour ni retirée par `drwil uninstall`. À l'adoption (`docs/recipes/adopt-the-kit.md`),",
      "  un fichier touché par un chantier entre dans le bloc `scope` de sa fiche ; un fichier",
      "  supprimé sort de la liste ci-dessus ; la fiche reste tant qu'elle couvre un fichier.",
    ],
    mapTitle: "## Code existant",
    mapIntro:
      "Dossiers de code indexés avant l'installation du kit (`drwil init`, {0}) ; le rôle de chacun reste à décrire à l'adoption (`docs/recipes/adopt-the-kit.md`, étape 1).",
    role: "à décrire à l'adoption",
    attached:
      "Code existant rattaché : {0} fichier(s) indexé(s) couvert(s) par {1}, {2} dossier(s) cité(s) dans {3} (rôles à décrire à l'adoption, /drwil-adopt).",
    briefKept: "{0} existe déjà : gardée telle quelle, jamais réécrite.",
    mapKept: "{0} existait avant l'installation : gardée telle quelle. Y citer ces dossiers de code (QUA-040, carte entretenue) :",
    unlisted: "⚠ Fichiers de code non rattachés (chemin qu'un bloc cadrage ne peut pas nommer seul), à couvrir à la main :",
  },
  en: {
    title: "# Project: existing code (indexed before the kit was installed)",
    status: "**Status**: reference — code indexed by git before the kit was installed, attached by `drwil init` on {0}.",
    need: [
      "## 1. Need",
      "",
      "The commit check (`.githooks/check-docs.mjs`) refuses any indexed code file that no",
      "`docs/projects/` brief covers (scoping reminder, `scopeReminder` setting of",
      "`.drwil/ia-first.json`). This code existed before the kit: without this brief, the first",
      "commit, even of a brief alone, would be refused.",
    ],
    out: [
      "## 2. Out of scope",
      "",
      "Code written after the install: each workstream covers it with the `scope` block of its",
      "brief. The kit's files: `docs/projects/kit-mechanics.md`.",
    ],
    handOff: [
      "## Hand-off",
      "",
      "- **Last state**: brief written once by `drwil init`, never rewritten by an update nor",
      "  removed by `drwil uninstall`. At adoption (`docs/recipes/adopt-the-kit.md`), a file a",
      "  workstream touches enters the `scope` block of its brief; a deleted file leaves the list",
      "  above; the brief stays as long as it covers a file.",
    ],
    mapTitle: "## Existing code",
    mapIntro:
      "Code folders indexed before the kit was installed (`drwil init`, {0}); the role of each is to describe at adoption (`docs/recipes/adopt-the-kit.md`, step 1).",
    role: "to describe at adoption",
    attached:
      "Existing code attached: {0} indexed file(s) covered by {1}, {2} folder(s) cited in {3} (roles to describe at adoption, /drwil-adopt).",
    briefKept: "{0} already exists: kept as it is, never rewritten.",
    mapKept: "{0} existed before the install: kept as it is. Cite these code folders in it (QUA-040, maintained map):",
    unlisted: "⚠ Code files not attached (a path a scope block cannot name alone), to cover by hand:",
  },
};
