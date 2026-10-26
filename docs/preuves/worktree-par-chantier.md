# Preuve de clôture — worktree-par-chantier

**Clos le** : 2026-10-26
**Commit vérifié** : `f2df0e4848` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Au sondage de lancement, l'humain peut choisir de mener le chantier dans un nouveau worktree ; la réponse, lue par le hook et jamais par l'agent, crée le dossier et sa branche depuis la branche principale à jour, et y lance le chantier : son fichier d'état (.drwil/state.json) est écrit par .githooks/state.mjs, jamais à la main, et l'état du dossier d'origine ne change pas | `QUA-142` | `tests-qua-142` | — |
| Un agent ne prend jamais un worktree pour un dépôt distinct : dans un worktree, le rappel d'état (node .githooks/state.mjs et l'injection de début de session) nomme le dépôt principal, la branche et le chantier du dossier, dit que les autres dossiers listés sont des worktrees du même dépôt et qu'on ne modifie que le sien ; dans le dossier principal, il liste les worktrees ouverts et leur chantier | `QUA-143` | `tests-qua-143` | — |
| Une commande d'installation déclarée dans .drwil/ia-first.json est lancée dans le nouveau worktree ; sans réglage, rien n'est lancé et la sortie dit quoi faire ; un échec d'installation est dit, le worktree et l'état restent | `QUA-144` | `tests-qua-144` | — |
| Le lancement d'une fiche déjà active dans un autre worktree du même dépôt est refusé, avec le chemin de ce worktree | `QUA-145` | `tests-qua-145` | — |
| node .githooks/close.mjs --check signale une branche de chantier en retard sur la branche principale et donne la commande de mise à jour ; la clôture n'est pas refusée pour ce motif | `QUA-146` | `tests-qua-146` | — |
