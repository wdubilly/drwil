# Preuve de clôture — doc-lancement-parallele

**Clos le** : 2026-10-26
**Commit vérifié** : `c07eff0dc0` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| docs/ia-first.md (et son gabarit) décrit la question drwil-parallel, la file en parallèle, le plafond maxParallel (3 par défaut) et le refus des fiches dont les blocs scope se recoupent, et ne dit plus qu'une file reste dans le dossier du dépôt sans nuance | `QUA-147` | `tests-qua-147` | — |
| docs/architecture.md cite .githooks/worktree.mjs (launchParallel), .githooks/briefs.mjs (recoupement des scope) et le réglage maxParallel | `QUA-040` | `architecture-map`, `tests-qua-040` | — |
| La ligne « Unreleased » du changelog du paquet le dit | `QUA-040` | `architecture-map`, `tests-qua-040` | — |
