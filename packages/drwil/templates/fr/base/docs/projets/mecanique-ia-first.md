# Projet : mécanique du kit IA-first (fichiers propres au kit)

**Statut** : mécanique livrée à l'installation du kit, le {{date}}.

<!-- cadrage
fichiers:
  - .githooks/run-checks.mjs
  - .githooks/check-docs.mjs
  - .githooks/check-control-coverage.mjs
  - .githooks/glob.mjs
  - .githooks/cadrage.mjs
  - .githooks/cadrage.test.mjs
  - .githooks/pre-commit
  - .githooks/pre-push
  - .githooks/commit-msg
  - .githooks/check-file-size.mjs
  - .githooks/check-file-size.legacy.json
  - .githooks/check-code-rules.mjs
{{cadrageCi}}
{{cadrageClaude}}
-->

## 1. Besoin

Le contrôle au commit (`.githooks/check-docs.mjs`) signale tout fichier de
code indexé qu'aucune fiche de `docs/projets/` ne couvre (rappel de
cadrage, sévérité réglable par `.drwil/ia-first.json` -> `cadrage` :
`avertissement` par défaut, `bloquant` en option). Sans cette fiche, les
fichiers posés par le kit lui-même seraient signalés dès le tout premier
commit du projet (bloquant si le réglage `bloquant` est choisi).

## 2. Hors périmètre

Le code applicatif du projet : chaque chantier porte son propre bloc
`cadrage` dans sa fiche, et une petite tâche se rattache à
`docs/projets/entretien-courant.md`.

## Reprise

- **Dernier état** : fiche posée à l'installation, rien à reprendre. Si le
  kit ajoute un nouveau fichier de mécanique (`.githooks/` ou un réglage
  d'outil IA), l'ajouter ici. Lot 4 a ajouté `.githooks/check-control-coverage.mjs`
  (QUA-013), `.githooks/pre-push`, `.githooks/commit-msg` (livré désactivé)
  et `.githooks/cadrage.test.mjs`. Lot 5 a ajouté `.githooks/check-file-size.mjs`
  et son fichier de plafonds hérités `.githooks/check-file-size.legacy.json`,
  ainsi que le point d'extension vide `.githooks/check-code-rules.mjs` — les
  trois livrés mais **opt-in** (pas lancés tant que le projet ne les déclare
  pas dans `.drwil/ia-first.json → checks`).
