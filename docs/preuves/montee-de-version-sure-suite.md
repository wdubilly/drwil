# Preuve de clôture — montee-de-version-sure-suite

**Clos le** : 2026-11-09
**Commit vérifié** : `011c6342c8` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:2d3fb54826f189be`, acceptés par l'humain au lancement le 2026-11-09

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| AGENTS.md, une recette, docs/intentions/README.md et le catalogue modifiés par le projet sont identiques après init, hors ajouts exigés | `QUA-284` | `tests-qua-284` | — |
| Les clés du projet de .drwil/ia-first.json (checks, risk, extraCodeGlobs…) sont conservées ; les clés du kit sont à jour, une clé nouvelle a une valeur sûre ; .drwil/state.json (si présent) est identique | `QUA-285` | `tests-qua-285` | — |
| resolve-drift n'existe plus (commande, texte, documentation) ; init montre un diff et demande confirmation, il ne renvoie pas vers lui | `QUA-286` | `tests-qua-286` | — |
| doctor signale après coup ce qu'une montée a supprimé | `QUA-287` | `tests-qua-287` | — |
| node .githooks/run-checks.mjs et node packages/drwil/bin/drwil.js verify --agent : GOVERNANCE: PASS [humain] | `QUA-013` | `ci-coverage`, `tests-qua-013` | `sha256:4f47b18983c0a0fb` (2 fichier(s)) |
