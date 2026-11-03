# Preuve de clôture — cloture-sur-projet-neuf

**Clos le** : 2026-11-03
**Commit vérifié** : `d307eefb8b` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:922f5befc3a3593d`, acceptés par l'humain au lancement le 2026-11-03

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sur un projet sans code, une garantie couverture ou e2e dont la couche n'a aucun code est « pas encore applicable » : elle ne met pas verify en FAIL, et le dit en clair | `QUA-224` | `tests-qua-224` | — |
| Dès que la couche reçoit du code, la garantie redevient applicable et son échec redevient bloquant | `QUA-225` | `tests-qua-225` | — |
| La clôture écrit elle-même la ligne « Preuve de clôture » du journal et corrige la ligne de l'index qui cite la fiche supprimée | `QUA-228` | `tests-qua-228` | — |
| Avant la clôture, la citation de la preuve du chantier actif (docs/preuves/<fiche>.md) ne fait plus échouer verify | `QUA-229` | `tests-qua-229` | — |
| En BUILD, .githooks/close.mjs --check liste les renvois à la fiche (catalogue, dashboard, intentions, index, journal) qui bloqueraient le commit de clôture, et propose l'extension du bloc scope | `QUA-230` | `tests-qua-230` | — |
| Ajouter ou retirer la marque `[humain]` d'un critère ne change pas l'empreinte acceptée ; tout autre changement du texte d'un critère la change toujours | `QUA-174` | `tests-qua-174` | — |
