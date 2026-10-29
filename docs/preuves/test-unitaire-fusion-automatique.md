# Preuve de clôture — test-unitaire-fusion-automatique

**Clos le** : 2026-10-29
**Commit vérifié** : `6c400b589e` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:46804fd309620740`, acceptés par l'humain au lancement le 2026-10-29

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le test unitaire vérifie en français et en anglais l'ordre : programmation de la fusion, vérification de sa programmation, suivi avec node .githooks/pr-watch.mjs, fusion effective, puis seulement retour en SCOPING | `QUA-138` | `tests-qua-138` | — |
| Le même test vérifie la relance du suivi tant que la CI est verte sans fusion, la limite totale de 30 minutes, la CI rouge avant fusion entraînant le maintien en CLOSING et reopen, et le délai dépassé ou l'échec entraînant le maintien en CLOSING avec signalement | `QUA-138` | `tests-qua-138` | — |
| Le contrôle tests-qua-138 exécute effectivement ce test unitaire et le test du cycle installé existant, sans perdre ses vérifications en français et en anglais ni celles du skill installé | `QUA-138` | `tests-qua-138` | — |
