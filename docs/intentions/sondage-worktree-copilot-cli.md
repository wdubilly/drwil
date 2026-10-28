# Intention : la question « Nouveau worktree » vérifiée avec Copilot CLI

**Statut** : proposée le 2026-10-26 — limite du chantier « un chantier par worktree, lancé d'un geste humain » (journal du 2026-10-26).

## Besoin

Le sondage de lancement propose « Nouveau worktree » et le crochet de prompt lit la réponse pour créer le worktree frère (QUA-142). Le besoin : savoir si cela fonctionne aussi avec Copilot CLI, au-delà de Claude Code.

## Existant

Relevé le 2026-10-26 : le test du crochet couvre les formes de réponse Claude et Copilot (`packages/drwil/test/kit.test.mjs`). Un essai réel a été fait dans Copilot CLI le même jour : le sondage à une seule fiche (champs `fiche`, `drwil-merge`, `drwil-worktree` = « New worktree ») a créé le worktree frère et lancé le chantier, qui y a été mené jusqu'à la fusion de sa PR. Mis à jour le 2026-10-28 : le hook lit désormais le champ des fiches à choix multiple de Copilot CLI (type `array`, valeurs dans `items.enum`, QUA-165) et le skill dit de le poser ; la lecture tolère des valeurs séparées par des virgules ou une liste entre crochets. **Reste [humain]** : relever dans un essai réel la forme exacte de la réponse de Copilot CLI à un choix multiple et, si elle diffère, ajuster `.claude/hooks/start-poll.mjs` (gabarit) et le test de QUA-165.
**Non vérifié** : le sondage à choix multiple avec la question `drwil-parallel` (plusieurs worktrees d'un coup) dans Copilot CLI.

## Questions à trancher

- [décision] Faire un essai réel du sondage parallèle dans Copilot CLI avant la prochaine version, ou attendre un retour d'usage ?
