# Intention : suites de la parité des outils

**Statut** : proposée le 2026-11-02, limites de la clôture du chantier `parite-des-outils` (journal du 2026-11-02).

## Besoin

La file en sondages enchaînés et le tableau de parité sont livrés, mais rien n'a été essayé en vrai : toutes les
cases du tableau « Workstream cycle parity » sont « not tested ».

## Existant

- Le lot 1 [humain] de la fiche (sondes) n'a pas été fait : sondage, sous-agents dans le dossier du dépôt, hooks
  lancés, pour Claude Code, Copilot CLI, Gemini CLI et Codex.
- Codex : essai avec un modèle local 7B inexploitable (il n'appelle pas les outils) ; il faut un modèle capable
  (abonnement ou clé API).
- Le banc des agents ne mesure ni sondage, ni file, ni sous-agent.
- Les sondages `drwil-file` restent dans le dossier du dépôt : pas de worktree ni de file parallèle.

## Questions à trancher

- [humain] Faire les sondes du lot 1 et dater les cases du tableau de parité.
- [décision] Étendre le banc au sondage et à la file, ou garder les essais manuels attestés ?
- [décision] Worktree et file parallèle en sondages enchaînés : utile, ou la file séquentielle suffit ?
