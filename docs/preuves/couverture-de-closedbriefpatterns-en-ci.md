# Preuve de clôture — couverture-de-closedbriefpatterns-en-ci

**Clos le** : 2026-11-12
**Commit vérifié** : `b25294ecb0` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:5172378976b604df`, acceptés par l'humain au lancement le 2026-11-12

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| closedBriefPatterns est couverte par le test lui-même, sans dépendre de l'historique de la branche : les tests de .githooks/scope.test.mjs l'appellent dans le module réel (importé de .githooks/scope.mjs) avec la racine du dépôt temporaire | `QUA-173` | `tests-qua-173` | — |
| Le contrôle de couverture passe sur une branche qui ne supprime aucune fiche (la PR de cadrage #410 puis la suivante) | `QUA-004` | `couverture-tests`, `couverture-hooks`, `couverture-claude` | — |
| Les cas déjà testés tiennent : fichier neuf listé par la fiche supprimée couvert, fichier jamais listé refusé (QUA-016), historique illisible = rien de couvert (QUA-013) | `QUA-173` | `tests-qua-173` | — |
