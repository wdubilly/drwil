# Preuve de clôture — fusion-avant-les-vrais-controles

**Clos le** : 2026-11-27
**Commit vérifié** : `30957381b7` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:f21ff18a0aeabb29`, acceptés par l'humain au lancement le 2026-11-26

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Dans ce dépôt, aucune exécution ne rapporte un succès sous un nom exigé (checks, kit-tests (<os>)) pour un travail que seule une autre exécution doit faire | `QUA-121` | `tests-qua-121` | — |
| La CI GitHub livrée ne rapporte pas checks réussi quand ses contrôles sont sautés au profit de la PR | `QUA-263` | `tests-qua-263` | — |
| Un même commit de branche n'est toujours pas contrôlé deux fois, et une branche sans PR reste testée | `QUA-121` | `tests-qua-121` | — |
| Sur un vrai dépôt GitHub dont la règle exige ces noms, une PR au contrôle en échec reste non fusionnable avant, pendant et après sa CI, fusion automatique programmée comprise — contrat Manuel à créer par le chantier [humain] | `QUA-339` | — | `sha256:88a04b3da3dba51e` (2 fichier(s)) |
