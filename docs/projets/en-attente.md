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

- [ ] [décision] [P1] Un chemin cité ne vaut pas preuve s'il est ignoré par
  Git (contrôle local divergent de la CI) —
  `docs/projets/citations-fichiers-ignores.md`.
- [ ] [décision] [P2] Petite correction sous barrière bloquante : voie
  légère décidée, modalités à définir — `docs/projets/entretien-sous-barriere-bloquante.md`.
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
- [ ] [décision] [P1] Publication npm du kit — `docs/intentions/packager-kit-ia-first.md`.
- [ ] [décision] [P2] QUA-017 bloque un push qui ne fait que supprimer une
  branche distante (faux positif, cousin du push de tag) —
  `docs/projets/qua017-push-suppression.md`.
- [ ] [humain] [P1] Protéger master : ruleset (checks obligatoires, pas
  de push direct ni de contournement), CODEOWNERS, identité de l'agent —
  `docs/projets/proteger-master.md`.
- [ ] [décision] [P1] Fabrique autonome graduée par le risque (forge,
  outillage, mutation, rôles séparés, auto-fusion LOW) —
  `docs/intentions/fabrique-autonome.md`.
- [ ] [décision] [P2] Non-régression continue : règle « défaut corrigé →
  test rattaché à un contrat », traçabilité dans `verify` —
  `docs/intentions/non-regression-continue.md`.
- [ ] [décision] [P1] Vue de relecture : montrer à l'humain ce qui demande
  son jugement dans une PR (décisions, cadrage, règles, preuves,
  exceptions) — `docs/intentions/vue-de-relecture.md`.
- [ ] [décision] [P1] Bench avec / sans drwil : même consigne, même projet,
  pour mesurer l'apport en qualité de livrable et en consommation de
  tokens — `docs/intentions/bench-avec-sans-drwil.md`.
- [ ] [décision] [P1] Fluidité sans perte de rigueur : moins de gestes
  humains, mieux placés (lancer, fusionner), décision dans le chat non
  simulable, regroupements — `docs/intentions/fluidite-sans-perte-de-rigueur.md`.
- [ ] [décision] [P1] Livrable entièrement en anglais (gabarit, CLI, hooks,
  noms d'activités, configuration) — `docs/intentions/livrable-full-english.md`.
- [ ] [décision] [P3] Importer un ticket externe (Jira ou autre) pour en
  dériver une fiche d'intention/cadrage, plutôt que de tout retaper à la
  main — outil cible, mode d'authentification et ponctuel vs continu
  restent à trancher — `docs/intentions/importer-tickets-externes.md`.
- [ ] [décision] [P2] Adopter un seuil de couverture de test
  (`catalogue:QUA-004`) avec `c8` sur `packages/drwil` — lots 1 et 2
  faits le 2026-10-05, lot 3 (couverture 100 %) reste ouvert à la demande
  du demandeur — `docs/projets/adopter-seuil-couverture.md`.
- [ ] [IA] [P2] Prochaine release : signaler dans la note de version que
  `chemins` (`.drwil/ia-first.json` → `checks`) décide désormais aussi de ce
  qui tourne au commit — voir `docs/projets/journal.md` (2026-10-05).
- [ ] [décision] [P3] V3 — investigation & reporting par agent : DRWIL
  gouverne-t-il le travail d'agents au-delà du code ? Expérimentation après
  stabilisation du cœur, sans code pour l'instant —
  `docs/projets/v3-investigation-reporting-agent.md`.
- [ ] [décision] [P2] Community Ready : fichiers et parcours pour qu'un
  contributeur externe puisse participer sans demander au mainteneur ;
  questions à trancher (langue, gabarit de PR, canal sécurité, contrats
  COM) — `docs/intentions/community-ready.md`.
- [ ] [IA] [P1] Garde-fous lot 3 : contrôle « un changement de code a sa
  fiche » — à cadrer puis coder — `docs/projets/garde-fous-depot.md`.
- [ ] [IA] [P1] Fusion autorisée au lancement : un seul geste humain
  par chantier (`gh pr merge --auto` après CI verte) —
  `docs/projets/fusion-autorisee.md`.
- [ ] [décision] [P3] CI : matrice Windows et macOS sur les pull requests
  seulement (jobs divisés par deux) — `docs/projets/ci-matrice-sur-pr.md`.
