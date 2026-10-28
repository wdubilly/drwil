# Preuve de clôture — scope-anticipe-les-decoupes

**Clos le** : 2026-10-28
**Commit vérifié** : `7e69f6ca3a` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le rappel de cadrage avertit, sans jamais bloquer, quand un fichier de code du scope d'une fiche atteint 180 lignes ou plus, et dit de lister d'avance les fichiers issus de sa découpe ; en dessous, aucun avertissement | `QUA-158` | `tests-qua-158` | — |
| Le modèle de fiche (dépôt et gabarit) rappelle la carte d'architecture et docs/projects/kit-mechanics.md à lister quand un fichier de code ou un hook est ajouté | `QUA-158` | `tests-qua-158` | — |
