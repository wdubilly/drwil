# Preuve de clôture — pre-push-reference-poussee

**Clos le** : 2026-10-25
**Commit vérifié** : `0127d44f90` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Au push, le contrôle de la branche principale juge les références distantes poussées (entrée standard du hook) : pousser recette/vX.Y.Z depuis master passe, pousser vers refs/heads/master (ou main) reste refusé, d'où qu'on pousse | `QUA-017` | `main-branch`, `tests-qua-017` | — |
| Quand la note de recette ne peut pas être poussée, .githooks/recette-note.mjs affiche la sortie de git (raison du refus) avec la commande de rattrapage | `QUA-080` | `tests-qua-080` | — |
| La note de la v0.8.0 est dans le dépôt, sous docs/recettes/v0.8.0.md, arrivée par sa PR dédiée | `QUA-079` | `tests-qua-079` | — |
