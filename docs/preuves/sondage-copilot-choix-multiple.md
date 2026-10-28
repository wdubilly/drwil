# Preuve de clôture — sondage-copilot-choix-multiple

**Clos le** : 2026-10-28
**Commit vérifié** : `496e0eee06` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs reconnaît, pour Copilot CLI, un champ des fiches à choix multiple (type array, valeurs dans items.enum) comme il reconnaît le champ à choix unique, et en tire la liste des options | `QUA-165` | `tests-qua-165` | — |
| La réponse Copilot à un choix multiple (forme relevée par un essai réel, consignée dans l'intention) est lue comme une file, dans l'ordre des options du sondage (inPollOrder), les champs drwil-merge, drwil-worktree et drwil-parallel restant lus comme avant | `QUA-165` | `tests-qua-165` | — |
| Le choix unique d'une fiche continue de fonctionner à l'identique | `QUA-165` | `tests-qua-165` | — |
| Le skill dit à l'agent Copilot de poser un champ fiche à choix multiple, toujours accompagné des champs drwil-merge, drwil-worktree et (avec au moins deux fiches prêtes) drwil-parallel | `QUA-165` | `tests-qua-165` | — |
