# Preuve de clôture — test-des-tranches-sans-variables-de-push

**Clos le** : 2026-11-10
**Commit vérifié** : `97c0bdb994` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:302acfb4bc34e072`, acceptés par l'humain au lancement le 2026-11-10

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le fichier .githooks/run-checks-shards.test.mjs passe en entier même quand DRWIL_PUSH_TAGS_ONLY, DRWIL_PUSH_NO_BRANCH ou DRWIL_PUSH_REFS sont définies dans l'environnement du pré-push — contrat | `QUA-290` | `tests-qua-290` | — |
