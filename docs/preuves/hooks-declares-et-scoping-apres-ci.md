# Preuve de clôture — hooks-declares-et-scoping-apres-ci

**Clos le** : 2026-10-25
**Commit vérifié** : `56fa318fe3` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| node .githooks/close.mjs (clôture, --check et passage de BUILD à EVIDENCE) signale chaque fichier de .githooks/ modifié par la branche et absent des « Contrats modifiés » de ses fiches, nomme la puce à écrire et rappelle qu'elle demande le oui du demandeur ; la clôture est refusée tant qu'il en reste ; sans branche principale lisible, le signal est « non exécuté » et le dit, jamais un succès | `QUA-137` | `tests-qua-137` | — |
| Avec la fusion automatique, le retour en SCOPING n'a lieu qu'une fois la PR fusionnée, suivie par node .githooks/pr-watch.mjs (30 minutes au plus) ; CI rouge : l'état reste en CLOSING et reopen s'applique ; délai dépassé : rester en CLOSING et le signaler | `QUA-138` | `tests-qua-138` | — |
