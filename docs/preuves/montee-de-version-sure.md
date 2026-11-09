# Preuve de clôture — montee-de-version-sure

**Clos le** : 2026-11-09
**Commit vérifié** : `422bf5821c` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:7dad86eacf803a6b`, acceptés par l'humain au lancement le 2026-11-08

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sur un projet de test en version N équipé, init de la version N+1 crée workstream/kit-update, commite, et laisse l'arbre propre ; aucun .bak | `QUA-282` | `tests-qua-282` | — |
| Un fichier de CI avec étapes du projet (jeu d'essai tiré de drwil_walk) garde ces étapes dans la zone, GitHub et GitLab ; le reste est conforme au gabarit N+1 | `QUA-283` | `tests-qua-283` | — |
| Un fichier de CI sans marqueurs : init nomme ce qui disparaîtrait, ne change rien sans confirmation | `QUA-283` | `tests-qua-283` | — |
| init d'une version plus ancienne que .drwil/install.json (si présent) refuse avec un message clair ; l'option passe outre | `QUA-282` | `tests-qua-282` | — |
| Rejouer init sur un projet déjà à jour ne change rien | `QUA-283` | `tests-qua-283` | — |
| node .githooks/run-checks.mjs et node packages/drwil/bin/drwil.js verify --agent : GOVERNANCE: PASS [humain] | `QUA-013` | `ci-coverage`, `tests-qua-013` | `sha256:4f47b18983c0a0fb` (2 fichier(s)) |
