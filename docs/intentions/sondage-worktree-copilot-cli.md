# Intention : la question « Nouveau worktree » vérifiée avec Copilot CLI

**Statut** : proposée le 2026-10-26 — limite du chantier « un chantier par worktree, lancé d'un geste humain » (journal du 2026-10-26).

## Besoin

Le sondage de lancement propose « Nouveau worktree » et le crochet de prompt lit la réponse pour créer le worktree frère (QUA-142). Le besoin : savoir si cela fonctionne aussi avec Copilot CLI, au-delà de Claude Code.

## Existant

Relevé le 2026-10-26 : le test du crochet couvre les formes de réponse Claude et Copilot (`packages/drwil/test/kit.test.mjs`), mais aucun essai réel dans Copilot CLI n'a été fait ; non vérifié.

## Questions à trancher

- [décision] Faire un essai réel dans Copilot CLI avant la prochaine version, ou attendre un retour d'usage ?
