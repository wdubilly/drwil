# Preuve de clôture — version-0-11-1

**Clos le** : 2026-11-09
**Commit vérifié** : `ef769a224c` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:44a36da2c84fe006`, acceptés par l'humain au lancement le 2026-11-09

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| package.json, package-lock.json et packages/drwil/package.json portent 0.11.1 | `QUA-098` | `tests-qua-098` | — |
| La section « Unreleased » de packages/drwil/CHANGELOG.md devient 0.11.1 (date) et une section « Unreleased » vide la remplace | `QUA-040` | `architecture-map`, `tests-qua-040` | — |
| README.md et docs/features.md disent en une phrase ce que la 0.11.1 apporte, comme pour la 0.11.0 | `QUA-098` | `tests-qua-098` | — |
| node .githooks/create-release.mjs --dry-run calcule la version 0.11.1 sans refus, une fois la PR fusionnée | `QUA-268` | `tests-qua-268` | — |
| GOVERNANCE: PASS | `QUA-084` | `tests-qua-084` | — |
