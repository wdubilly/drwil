# Preuve de clôture — lancement-refuse-dit-pourquoi

**Clos le** : 2026-11-12
**Commit vérifié** : `5d51570bb1` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:4303fa32bb5cd228`, acceptés par l'humain au lancement le 2026-11-12

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un lancement refusé par un arbre de travail modifié le dit en clair, avec ce qu'il faut faire (commiter ou remiser), par la ligne de commande comme par le sondage ; rien n'est créé | `QUA-179` | `tests-qua-179` | — |
| Tout refus de lancement, quelle qu'en soit la raison, produit un message lisible : jamais de sortie vide ni de succès apparent (QUA-013) | `QUA-179` | `tests-qua-179` | — |
