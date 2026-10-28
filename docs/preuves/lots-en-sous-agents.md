# Preuve de clôture — lots-en-sous-agents

**Clos le** : 2026-10-28
**Commit vérifié** : `158d7ba19c` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Les lots d'une fiche sont lus dans sa section « Increments » (puces « **Lot N — titre** [IA\|humain] ») et la commande state.mjs lot dit le lot courant, ceux qui sont faits et ceux qui restent | `QUA-166` | `tests-qua-166` | — |
| state.mjs lot next passe au lot suivant seulement si le lot courant est commité (arbre propre) ; il ne passe jamais à un lot au-delà du dernier | `QUA-167` | `tests-qua-167` | — |
| Le rappel d'état d'un chantier à lots nomme le lot courant et dit de ne traiter que lui | `QUA-168` | `tests-qua-168` | — |
| Un lot confié à l'humain est sauté par l'enchaînement, nommé comme restant à faire, et rappelé à la clôture avec ce qui est attendu ; l'enchaînement continue sur les lots [IA] suivants | `QUA-169` | `tests-qua-169` | — |
| La clôture reste unique : refusée tant qu'un lot [IA] n'est pas fait (un lot confié à l'humain n'est que rappelé : son critère est jugé par verify) ; une fiche à un seul lot (ou sans lot) se comporte comme avant | `QUA-170` | `tests-qua-170` | — |
| Le mode d'emploi du lancement (.claude/skills/start-a-workstream/SKILL.md) dit qu'un sous-agent neuf traite chaque lot, la passation se faisant par les commits et la section « Reprise » de la fiche | `QUA-171` | `tests-qua-171` | — |
