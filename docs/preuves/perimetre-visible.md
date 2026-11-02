# Preuve de clôture — perimetre-visible

**Clos le** : 2026-11-02
**Commit vérifié** : `0545bc9ff5` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:60ca7b60a2b0680e`, acceptés par l'humain au lancement le 2026-11-02

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Tout commit qui modifie le bloc scope de la fiche active affiche un avertissement net, avec les chemins ajoutés | `QUA-213` | `tests-qua-213` | — |
| Le compte rendu de fin de tâche mentionne les chemins ajoutés au bloc scope et la raison | `QUA-214` | `tests-qua-214` | — |
| La règle écrite et la barrière disent la même chose de l'élargissement du cadrage | `QUA-050` | `tests-qua-050` | — |
