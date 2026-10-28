# Preuve de clôture — fusion-auto-ordonnee

**Clos le** : 2026-10-28
**Commit vérifié** : `6e228d62f7` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| node .githooks/merge-auto.mjs <numéro> enchaîne, dans cet ordre : attendre que GitHub ait calculé la PR, la mettre à jour si elle est BEHIND, programmer l'auto-merge, vérifier qu'il est programmé | `QUA-161` | `tests-qua-161` | — |
| L'outil ne programme jamais l'auto-merge sur une PR dont l'état n'est pas calculé ou pas à jour ; délai dépassé, gh absent ou refus (« Auto merge is not allowed for this repository ») : il le dit, avec la sortie à suivre, et ne prétend jamais que la fusion est programmée | `QUA-162` | `tests-qua-162` | — |
| Il ne s'exécute qu'avec l'autorisation « Automatic merge » donnée au lancement (lue dans l'état) ; sans elle il refuse | `QUA-163` | `tests-qua-163` | — |
| La consigne de l'état et le skill appellent cet outil au lieu de lister les commandes gh ; le suivi (pr-watch) et le retour en SCOPING après la fusion restent inchangés | `QUA-164` | `tests-qua-164` | — |
