# Preuve de clôture — commandes-d-etat-bloquees

**Clos le** : 2026-11-06
**Commit vérifié** : `50fe1ae4aa` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:fef775e500de3d36`, acceptés par l'humain au lancement le 2026-11-05

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Chaque sous-commande de node .githooks/state.mjs (dont briefs, briefs --json, resume, lot, start vers un worktree), lancée dans un vrai processus sur un dépôt de test, rend la main avec sa sortie, jamais le code 13 ; la CLI installée depuis l'archive (outils/tester-tarball.mjs) lance aussi node .githooks/state.mjs briefs --json dans le projet créé | `QUA-248` | `tests-qua-248`, `tarball` | — |
| Aucun hook du kit importé par un autre module ne fait d'await de premier niveau : un contrôle du dépôt le refuse en nommant le fichier et la ligne | `QUA-249` | `await-premier-niveau`, `tests-qua-249` | — |
