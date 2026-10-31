# Preuve de clôture — installation-depot-neuf

**Clos le** : 2026-10-31
**Commit vérifié** : `1b87bebd2c` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:24c13fd97b01f55e`, acceptés par l'humain au lancement le 2026-10-31

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sur un dépôt distant sans aucune branche, le tout premier envoi de la branche principale est accepté une seule fois par le hook de push ; dès que le distant a une branche principale, tout envoi direct est refusé comme avant | `QUA-017` | `main-branch`, `tests-qua-017` | — |
| La recette d'un projet neuf dit comment faire ce premier envoi, et que l'exception ne vaut qu'une fois | `QUA-017` | `main-branch`, `tests-qua-017` | — |
| drwil guarantees --protect, avec l'accord de l'humain, active aussi l'auto-merge du dépôt GitHub avec la protection de la branche principale, et drwil doctor dit si l'auto-merge est autorisé | `QUA-202` | `tests-qua-202` | — |
| init demande à l'humain quels outils IA configurer en terminal interactif ; sans terminal, il refuse de choisir à sa place et demande --tools | `QUA-203` | `tests-qua-203` | — |
| La recette d'adoption dit ce que chaque outil IA ajoute au dépôt | `QUA-203` | `tests-qua-203` | — |
