# Preuve de clôture — attestations-sur-l-effet-et-couvre

**Clos le** : 2026-10-29
**Commit vérifié** : `488f2bc624` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:da2c3853978303ae`, acceptés par l'humain au lancement le 2026-10-29

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| L'empreinte d'une attestation porte sur l'effet des contrôles que le contrat cite (commande, tests visés, paths) et plus sur les champs d'exécution (build, needsBuild, parallel, reuse) : ajouter ou retirer un champ d'exécution ne fait pas tomber l'attestation | `QUA-183` | `tests-qua-183` | — |
| Une attestation tombe quand l'effet d'un contrôle change (commande, test visé ou paths), comme avant : QUA-013 (un contrôle non exécuté n'est pas passé) reste vrai | `QUA-184` | `tests-qua-184` | — |
| Chaque contrat attesté du dépôt déclare ce qu'il couvre (**Couvre**) ; drwil doctor ne signale plus aucun contrat attesté sans couverture déclarée | `QUA-185` | `tests-qua-185` | — |
| Les attestations tombées par le chantier sont réattestées par l'humain en une seule séance, et drwil verify --evidence rend GOVERNANCE: PASS [humain] | `QUA-186` | — | — |
