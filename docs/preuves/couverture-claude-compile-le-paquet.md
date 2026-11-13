# Preuve de clôture — couverture-claude-compile-le-paquet

**Clos le** : 2026-11-13
**Commit vérifié** : `cb018366c5` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:d407f1a49fc4d7b7`, acceptés par l'humain au lancement le 2026-11-13

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| couverture-claude compile le paquet avant ses tests, sans dépendre de l'ordre ni de la reprise des autres contrôles | `QUA-004` | `couverture-tests`, `couverture-hooks`, `couverture-claude` | — |
| Les paths de couverture-claude couvrent tout ce que ses tests lisent : packages/drwil/src/** et les cinq fichiers de test de sa commande | `QUA-004` | `couverture-tests`, `couverture-hooks`, `couverture-claude` | — |
| La CI de la PR du chantier est verte ; la PR #416 rejouée après la fusion est verte sur couverture-claude | `QUA-004` | `couverture-tests`, `couverture-hooks`, `couverture-claude` | — |
