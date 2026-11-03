# Preuve de clôture — attente-commandes-longues

**Clos le** : 2026-11-03
**Commit vérifié** : `0a1ee703b2` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:ed967beec66f5c70`, acceptés par l'humain au lancement le 2026-11-03

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un script du kit lance une commande longue en tâche de fond et écrit son verdict dans un fichier | `QUA-219` | `tests-qua-219` | — |
| Le même script expose une attente bornée : elle rend le verdict ou dit « toujours en cours » à l'échéance, sans jamais boucler indéfiniment | `QUA-220` | `tests-qua-220` | — |
| Les consignes des sous-agents imposent ce script et run_in_background, et interdisent la boucle pgrep | `QUA-221` | `tests-qua-221` | — |
