# Preuve de clôture — e2e-et-attestation-precises

**Clos le** : 2026-10-30
**Commit vérifié** : `ee46c9e5e3` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:ef3bf09e10d51c2b`, acceptés par l'humain au lancement le 2026-10-30

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le catalogue définit l'e2e par forme de projet : bibliothèque (installer le paquet comme un client, appeler l'API publique, vérifier résultats et erreurs), service (un parcours à travers son API), application web (un parcours utilisateur) ; la même définition vaut pour tous, sans doublure sur ce qu'on veut garantir | `QUA-195` | `tests-qua-195` | — |
| La recette d'adoption renvoie à cette définition sans la recopier (une information, une seule source) | `QUA-196` | `tests-qua-196` | — |
| La doc des preuves distingue l'identité, l'approbation et la preuve d'exécution, et dit ce que garantit drwil attest et ce qu'il ne garantit pas | `QUA-197` | `tests-qua-197` | — |
