# Chantiers en attente — index

Une ligne par sujet. Le détail et le **statut** vivent dans la fiche liée,
seule source : cet index ne recopie aucun état.

Marqueur obligatoire sur chaque case ouverte : `[IA]` faisable par un agent
dans le dépôt ; `[humain]` geste hors du dépôt ; `[décision]` à trancher par
le demandeur avant tout travail. Un agent ne tente pas un geste `[humain]` et
ne tranche pas une `[décision]` : il la pose.

## Kit IA-first

- [ ] [IA] Extraire l'architecture IA-first complète de run-box-v2 dans le
  kit (rien perdre, rendre générique), lots 1 à 8 — `docs/projets/extraction-ia-first-run-box.md`.
- [ ] [IA] Aucun `.gitignore` dans les modèles du kit —
  `docs/projets/suites-kit-portable.md` (point 9).
- [ ] [IA] Contrôles du dépôt drwil lui-même encore vides (QUA-013) —
  `docs/projets/suites-kit-portable.md` (point 5).
- [ ] [IA] check-docs.mjs : faux positifs et 14 écarts relevés dans drwil —
  `docs/projets/suites-kit-portable.md` (point 8) ; traité par le lot 2 de
  l'extraction.
- [ ] [IA] Tester le kit sous Windows et macOS —
  `docs/projets/suites-kit-portable.md` (point 1).
- [ ] [IA] Supprimer à l'`init` les fichiers obsolètes d'une ancienne version
  du kit — `docs/projets/suites-kit-portable.md` (point 3).
- [ ] [humain] Vérifier que Cursor et Copilot lisent les fichiers de renvoi —
  `docs/projets/suites-kit-portable.md` (point 2).
- [ ] [décision] Publication npm du kit — `docs/intentions/packager-kit-ia-first.md`.
