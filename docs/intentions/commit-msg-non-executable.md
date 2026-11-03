# Intention : rendre effectif le hook de message de commit

**Statut** : noté le 2026-11-03.

## Besoin

Aux commits de cadrage et de code du premier lot de clôture sur projet neuf, Git a signalé
que `.githooks/commit-msg` était ignoré car non exécutable. Les contrôles actifs ont réussi ;
aucun besoin de geste humain supplémentaire n'est établi par cet incident.
Comprendre l'origine des droits du hook et garantir son exécution sans affaiblir les contrôles.
La clôture complète ne corrige pas ce défaut préexistant.

## Questions à trancher

- Le défaut relève-t-il des droits suivis par Git, de l'installation ou de ce clone seulement ?
- Quelle preuve de non-régression couvre l'installation et les clones existants ?

## Existant

Le hook `.githooks/commit-msg` existe ; Git refuse seulement de l'exécuter dans ce clone.
Les autres hooks sont restés actifs aux deux commits observés. Aucun droit n'a été changé ici.
