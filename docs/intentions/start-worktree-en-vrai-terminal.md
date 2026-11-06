# Intention : prouver `start` vers un worktree dans un vrai terminal

**Statut** : noté le 2026-11-06.

## Besoin

QUA-248 (chaque sous-commande de `node .githooks/state.mjs` rend la main dans un vrai processus)
prouve `start` vers un nouveau worktree avec un terminal simulé : le test pose `isTTY` par un
préchargement et répond à chaque question quand elle s'affiche. Un vrai pseudo-terminal
(lecture caractère par caractère, mode brut) n'est pas exercé.

## Questions à trancher

- Un pseudo-terminal portable (Linux, macOS, Windows) est-il disponible sans dépendance lourde ?
- Faut-il plutôt un essai réel attesté, une fois par version ?

## Existant

`.githooks/state-cli-process.test.mjs`, troisième test de QUA-248.
