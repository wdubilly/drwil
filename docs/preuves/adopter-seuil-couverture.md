# Preuve de clôture — adopter-seuil-couverture

**Clos le** : 2026-10-30
**Commit vérifié** : `9063760241` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:0e176fb19970b2f4`, acceptés par l'humain au lancement le 2026-10-30

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| La mesure du paquet compte tout fichier de packages/drwil/src/ (compilé) et de packages/drwil/bin/, même jamais importé par les tests (--all) ; les hooks du gabarit en sont exclus parce que leurs copies sont mesurées à 100 % par le dépôt, exclusion déclarée dans QUA-004 | `QUA-004` | `couverture-tests`, `couverture-hooks`, `couverture-claude` | — |
| Les hooks Claude et le module front entrent dans une mesure contrôlée, au seuil de leur niveau réel au lancement, qui ne redescend plus ; un fichier sans aucun test y reçoit au moins un test de son chemin principal | `QUA-004` | `couverture-tests`, `couverture-hooks`, `couverture-claude` | — |
| Les seuils du paquet sont relevés aux chiffres mesurés au lancement (cliquet), et le contrôle reste vert | `QUA-004` | `couverture-tests`, `couverture-hooks`, `couverture-claude` | — |
