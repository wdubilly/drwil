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

## Kit IA-first

- [ ] [humain] [P1] Extraire l'architecture IA-first complète de run-box-v2 dans
  le kit (rien perdre, rendre générique), lots 1 à 8 terminés côté IA,
  relecture humaine restante — `docs/projets/extraction-ia-first-run-box.md`.
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
- [ ] [IA] [P3] Supprimer à l'`init` les fichiers obsolètes d'une ancienne version
  du kit — `docs/projets/suites-kit-portable.md` (point 3).
- [ ] [humain] [P2] Vérifier que Cursor et Copilot lisent les fichiers de renvoi —
  `docs/projets/suites-kit-portable.md` (point 2).
- [x] [IA] Renommer le paquet `@drwil/kit-ia-first` en `drwil`
  (dossier, bin, citations dans les docs) — fait le 2026-10-04 —
  `docs/projets/renommer-kit-en-drwil.md`.
- [x] [IA] [P2] Vérifier la cohérence case cochée ↔ statut de la fiche
  liée (désynchro constatée sur signaler-couches-par-defaut.md) — fait
  le 2026-10-04 — `docs/projets/verifier-coherence-case-statut.md`.
- [x] [IA] Signaler explicitement les couches par défaut (backend,frontend)
  quand aucune stack n'est détectée à l'`init` — fait le 2026-10-04 (commit
  52bb22b) — `docs/projets/signaler-couches-par-defaut.md`.
- [ ] [décision] [P1] Publication npm du kit — `docs/intentions/packager-kit-ia-first.md`.
- [ ] [IA] [décision] [P2] `apply()` rafraîchit la mécanique du kit (`.githooks/`...)
  et signale la dérive de prose (AGENTS.md, docs/ia-first.md, docs/contrats.md
  restés sur une version pré-kit chez drwil) — lot 1 (détection et
  signalement) fait le 2026-10-04 ; lot 2 (résolution) reste à trancher —
  `docs/projets/apply-rafraichit-mecanique.md`.
- [x] [IA] [P2] Rappeler quand l'audit d'opportunité ou de risques/dette est
  périmé (> 30 jours depuis le dernier scan), dans le tableau de bord et
  en avertissement non bloquant de run-checks.mjs — fait le 2026-10-04 —
  `docs/projets/rappeler-peremption-audits.md`.
- [ ] [IA] [P2] Manifeste des fichiers installés par le kit + commande de
  désinstallation propre (réutilise le mécanisme pressenti au point 3 de
  suites-kit-portable.md) — lot 1 (manifeste) fait le 2026-10-04 ; lot 2
  (désinstallation) à ouvrir —
  `docs/projets/desinstaller-proprement.md`.
- [x] [IA] [P2] Indexer dans AGENTS.md et README.md les recettes déjà
  livrées au-delà de la gouvernance (audit, tableau de bord, suivi de
  coût, découverte de valeur) — fait le 2026-10-04 —
  `docs/projets/informer-capacites-drwil.md`.
- [ ] [décision] [P3] Skills Copilot CLI (parité fonctionnelle, pas mécanique :
  Copilot CLI déclenche par motif de fichier, pas par description comme
  Claude). 2 recettes s'y prêtent (route API → `applyTo: backend/**`, écran
  front → `applyTo: frontend/**`) ; les 11 autres restent couvertes par
  `AGENTS.md`, déjà lu nativement. Sans risque pour ce que drwil enforce
  (hooks git, contrats) si non fait : confort de découverte, pas un contrôle.
- [x] [IA] [P3] Commande `/drwil` (Claude Code seul le supporte
  aujourd'hui parmi les outils de drwil) pour découvrir les capacités du
  kit sans lire de prose —
  `docs/projets/commande-slash-drwil.md`.
- [x] [IA] [P2] Travailler avec des branches et des merge/pull requests :
  recette dédiée (FR/EN) + gabarits de PR/MR (GitHub, GitLab) + contrat
  QUA-017 — fait le 2026-10-05 —
  `docs/projets/travailler-avec-branches-et-mr.md`.
