# Chantiers en attente — index

Une ligne par sujet. Le détail et le **statut** vivent dans la fiche liée,
seule source : cet index ne recopie aucun état.

Marqueur obligatoire sur chaque case ouverte : `[IA]` faisable par un agent
dans le dépôt ; `[humain]` geste hors du dépôt ; `[décision]` à trancher par
le demandeur avant tout travail. Un agent ne tente pas un geste `[humain]` et
ne tranche pas une `[décision]` : il la pose.

Priorité facultative, non vérifiée par check-docs.mjs (simple convention) :
`[P0]` le plus urgent, `[P1]` élevée, `[P2]` normale, `[P3]` le moins urgent.
Sans tag, un sujet est considéré `[P2]`.

Un chantier dont la fiche est **entièrement** terminée (pas un simple point
parmi d'autres) est condensé dans `docs/projets/journal.md` puis retiré de
cet index, pas coché : voir `docs/recettes/travailler-en-branche.md`,
section « Clôturer ». Les lignes cochées restantes concernent des points
déjà faits d'une fiche qui reste ouverte par ailleurs.

## Kit IA-first

- [ ] [humain] [P1] Intégration agent de `drwil verify` (`/drwil verify`,
  `verify --agent`) livrée sur `chantier/integration-agent` : à relire, et
  essai d'attestation humaine à faire —
  `docs/projets/integration-agent-verify.md`.
- [ ] [humain] [P1] drwil V0.2 — gouvernance exécutable : lots [IA] livrés
  sur la PR #34, à relire et fusionner ; benchmark à exécuter, publication
  npm à décider — `docs/projets/drwil-v0-2-gouvernance-executable.md`.
- [x] [IA] Aucun `.gitignore` dans les modèles du kit —
  `docs/projets/suites-kit-portable.md` (point 9).
- [x] [IA] Contrôles du dépôt drwil lui-même — fait le 2026-10-04 —
  `docs/projets/suites-kit-portable.md` (point 5).
- [x] [IA] check-docs.mjs : faux positifs et écarts relevés dans drwil —
  corrigé le 2026-10-04 (lot 2 de l'extraction) —
  `docs/projets/suites-kit-portable.md` (point 8).
- [x] [IA] [P2] Tester le kit sous Windows et macOS — matrice CI ajoutée
  le 2026-10-04, verte sur les 3 OS (run CI `37238852012`) —
  `docs/projets/suites-kit-portable.md` (point 1).
- [x] [IA] [P3] Supprimer à l'`init` les fichiers obsolètes d'une ancienne version
  du kit — fait le 2026-10-05 —
  `docs/projets/suites-kit-portable.md` (point 3).
- [ ] [humain] [P2] Vérifier que Cursor et Copilot lisent les fichiers de renvoi —
  `docs/projets/suites-kit-portable.md` (point 2).
- [x] [IA] Renommer le paquet `@drwil/kit-ia-first` en `drwil`
  (dossier, bin, citations dans les docs) — fait le 2026-10-04 —
  `docs/projets/renommer-kit-en-drwil.md`.
- [x] [IA] Signaler explicitement les couches par défaut (backend,frontend)
  quand aucune stack n'est détectée à l'`init` — fait le 2026-10-04 (commit
  52bb22b) — `docs/projets/signaler-couches-par-defaut.md`.
- [x] [IA] [P1] Corriger le faux positif QUA-017 sur un push de tag (bloque
  toute release via `.githooks/creer-release.mjs` : push du tag refusé par
  `pre-push` qui ne regarde que la branche courante, pas la référence
  réellement poussée) — `docs/projets/corriger-qua017-push-tag.md`.
- [ ] [décision] [P1] Publication npm du kit — `docs/intentions/packager-kit-ia-first.md`.
- [ ] [décision] [P3] Importer un ticket externe (Jira ou autre) pour en
  dériver une fiche d'intention/cadrage, plutôt que de tout retaper à la
  main — outil cible, mode d'authentification et ponctuel vs continu
  restent à trancher — `docs/intentions/importer-tickets-externes.md`.
- [x] [décision] [P2] Adopter un seuil de couverture de test
  (`catalogue:QUA-004`) avec `c8` sur `packages/drwil` — lots 1 et 2
  faits le 2026-10-05, lot 3 (couverture 100 %) reste ouvert à la demande
  du demandeur — `docs/projets/adopter-seuil-couverture.md`.
- [ ] [IA] [P2] Prochaine release : signaler dans la note de version que
  `chemins` (`.drwil/ia-first.json` → `checks`) décide désormais aussi de ce
  qui tourne au commit — voir `docs/projets/journal.md` (2026-10-05).
