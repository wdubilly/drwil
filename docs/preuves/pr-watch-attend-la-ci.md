# Preuve de clôture — pr-watch-attend-la-ci

**Clos le** : 2026-11-13
**Commit vérifié** : `749ffb26f5` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:5d6ddd2dc75bfb7e`, acceptés par l'humain au lancement le 2026-11-13

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un contrôle sauté (SKIPPED) ou neutre ne compte jamais comme réussi ; « verte » exige au moins un contrôle réellement réussi et aucun en échec ni en cours | `QUA-100` | `tests-qua-100` | — |
| « verte », « rouge » ou « fusionnée » ne se disent que si la tête de la PR (headRefOid) est le commit HEAD local ; sinon le suivi attend, dans le délai global | `QUA-100` | `tests-qua-100` | — |
| Sans aucun contrôle inscrit (ou seulement des contrôles sautés), le suivi attend jusqu'à 3 minutes que la CI apparaisse (GitHub et GitLab) ; passé ce délai, il reste « non exécuté » (code 2), jamais « verte » — QUA-013, | `QUA-100` | `tests-qua-100` | — |
| Le délai de grâce compte dans les 30 minutes du délai global, jamais en plus | `QUA-100` | `tests-qua-100` | — |
| Au délai global dépassé, le message nomme les contrôles restés en file d'attente (jamais démarrés), distincts de ceux en cours ; aucune relance automatique | `QUA-100` | `tests-qua-100` | — |
| Chaque appel à gh ou glab de .githooks/pr-watch.mjs et .githooks/merge-auto-forge.mjs a un délai ; un délai atteint vaut « non exécuté », jamais un succès — QUA-013, QUA-161, | `QUA-100` | `tests-qua-100` | — |
| Tests : push seul visible (contrôles sautés et un succès hors PR), CI de PR absente puis inscrite, tête de PR en retard sur HEAD, appel bloqué ; chacun en échec contre le code actuel | `QUA-100` | `tests-qua-100` | — |
