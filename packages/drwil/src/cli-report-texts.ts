// Messages du rapport de défaut public (`drwil report`), à part de cli-texts.ts : ce fichier, que presque chaque
// chantier touche, ne fait plus tomber l'attestation de QUA-234, qui ne juge que ces textes (QUA-081).
export const REPORT_TEXTS = {
  fr: {
    title: "# Rapport de défaut drwil",
    cliVersion: "Version de la CLI",
    kitVersion: "Version du kit installé",
    unread: "non lue (absente, invalide ou non exportable)",
    snapshot: "Source : dernier instantané local de run-checks ; état actuel non vérifié. Aucun contrôle exécuté par report.",
    privacy: "Messages normalisés du kit uniquement ; sorties brutes et données du projet exclues.",
    failed: {
      secrets: "la recherche de secrets a échoué ; diagnostic privé exclu",
      "docs-references": "le contrôle des références documentaires et contrats cités a échoué ; détails privés exclus",
      "contract-tests": "le contrôle des liens entre contrats et tests a échoué ; détails privés exclus",
      "architecture-map": "le contrôle de la carte d'architecture a échoué ; détails privés exclus",
      "scope-gate": "le contrôle du périmètre a échoué ; détails privés exclus",
      "main-branch": "le contrôle de travail sur la branche principale a échoué ; détails privés exclus",
      "checks-self-test": "les tests des contrôles du kit ont échoué ; détails privés exclus",
      "ci-coverage": "le contrôle de la couverture CI a échoué ; détails privés exclus",
    },
    excluded: "Contrôles propres au projet, détails, horodatages et empreintes exclus.",
    noEvidence: "Instantané non lu (absent, invalide, trop volumineux ou lien symbolique).",
    noFailure: "Aucun échec exportable constaté ; cela ne signifie pas que les contrôles passent.",
    reproduce: "Pour reproduire localement (cette commande n'a pas été exécutée par report) :",
    example:
      "Avant de coller : décrire le résultat attendu et un exemple minimal avec des données fictives uniquement. Ne pas joindre de log ni de fichier du projet.",
  },
  en: {
    title: "# drwil defect report",
    cliVersion: "CLI version",
    kitVersion: "Installed kit version",
    unread: "not read (missing, invalid or not exportable)",
    snapshot: "Source: last local run-checks snapshot; current state not verified. No check executed by report.",
    privacy: "Normalized kit messages only; raw output and project data excluded.",
    failed: {
      secrets: "secret scanning failed; private diagnostics excluded",
      "docs-references": "the documentation references and cited contracts check failed; private details excluded",
      "contract-tests": "the contract-to-test links check failed; private details excluded",
      "architecture-map": "the architecture map check failed; private details excluded",
      "scope-gate": "the scope check failed; private details excluded",
      "main-branch": "the main-branch work check failed; private details excluded",
      "checks-self-test": "the kit checks' own tests failed; private details excluded",
      "ci-coverage": "the CI coverage check failed; private details excluded",
    },
    excluded: "Project-specific checks, details, timestamps and fingerprints excluded.",
    noEvidence: "Snapshot not read (missing, invalid, too large or symbolic link).",
    noFailure: "No exportable failure found; this does not mean the checks pass.",
    reproduce: "To reproduce locally (this command was not executed by report):",
    example:
      "Before pasting: describe the expected result and a minimal example using fictitious data only. Do not attach project logs or files.",
  },
};
