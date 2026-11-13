# Preuve de clôture — unreleased-en-fin-de-build

**Clos le** : 2026-11-13
**Commit vérifié** : `9a2d43da89` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:2016cd998dd4ed3c`, acceptés par l'humain au lancement le 2026-11-13

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| La consigne d'état (BUILD, français et anglais) dit d'ajouter la ligne « Unreleased » dans le dernier lot quand le chantier change ce que voit l'utilisateur ; le rappel CLOSING ne la demande plus dans le commit de clôture | `QUA-040` | `architecture-map`, `tests-qua-040` | — |
| L'en-tête de la section « Unreleased » du changelog et les recettes de branche et de release disent la même chose | `QUA-040` | `architecture-map`, `tests-qua-040` | — |
| node .githooks/close.mjs --check signale, sans bloquer, une branche qui change du code livré sans toucher la section « Unreleased » du changelog du projet (s'il en a un) | `QUA-040` | `architecture-map`, `tests-qua-040` | — |
| La barrière de périmètre en CLOSING est inchangée : sa liste fermée n'admet pas le changelog | `QUA-016` | `docs-references`, `tests-qua-016` | — |
| Les lignes manquantes des trois chantiers du 2026-11-12 sont ajoutées à « Unreleased » | `QUA-040` | `architecture-map`, `tests-qua-040` | — |
