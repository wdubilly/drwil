# Preuve de clôture — couverture-du-code-modifie

**Clos le** : 2026-10-30
**Commit vérifié** : `d53faca847` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:93c1d6436ae06b92`, acceptés par l'humain au lancement le 2026-10-30

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Les lignes ajoutées ou modifiées d'une branche, et les branches qu'elles ouvrent, sont couvertes à 100 % d'après le rapport lcov du projet ; une ligne ou une branche non couverte fait échouer le contrôle | `QUA-191` | `tests-qua-191` | — |
| Une exclusion (code généré, configuration, ligne non testable) n'est admise que déclarée avec sa justification dans .drwil/ia-first.json ; sans justification, elle est refusée | `QUA-192` | `tests-qua-192` | — |
| Sans rapport lcov, le contrôle est signalé non exécuté, jamais passé | `QUA-193` | `tests-qua-193` | — |
| Ce dépôt applique le contrôle à ses propres branches, en plus du cliquet de seuils | `QUA-194` | `tests-qua-194` | — |
