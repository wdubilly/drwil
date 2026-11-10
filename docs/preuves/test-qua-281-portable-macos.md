# Preuve de clôture — test-qua-281-portable-macos

**Clos le** : 2026-11-10
**Commit vérifié** : `8dfc7438e5` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:16a8ff8949971c70`, acceptés par l'humain au lancement le 2026-11-10

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le test de la redirection écoute sur --host 0.0.0.0 (hors de 127.0.0.1, donc le jeton reste obligatoire) et s'y connecte par 127.0.0.1 ; il garde ses trois assertions : 401 sans jeton, sans adresse de redirection, puis 302 vers /pull/12 avec le jeton valide | `QUA-281` | `tests-qua-281` | — |
| Aucune autre adresse 127.0.0.x autre que 127.0.0.1 ne reste dans les tests de drwil serve | `QUA-281` | `tests-qua-281` | — |
