# Preuve de clôture — cadrage-en-build

**Clos le** : 2026-11-19
**Commit vérifié** : `f1333c54d5` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:5241a60991c04cc7`, acceptés par l'humain au lancement le 2026-11-19

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| En BUILD, la création ou la modification d'une fiche (docs/projects/) ou d'une intention (docs/intentions/) se commite sans être refusée par la barrière de périmètre, et sans changer l'état ni la fiche active | `QUA-016` | `docs-references`, `tests-qua-016` | — |
| Le cadrage commité en BUILD ne couvre ni ne modifie le périmètre du chantier en cours : un fichier de code hors de la fiche active reste refusé | `QUA-016` | `docs-references`, `tests-qua-016` | — |
| Les contrats ne se créent toujours qu'en SCOPING ou par le chantier lui-même (le registre reste refusé en BUILD hors périmètre) | `QUA-016` | `docs-references`, `tests-qua-016` | — |
