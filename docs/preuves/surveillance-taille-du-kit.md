# Preuve de clôture — surveillance-taille-du-kit

**Clos le** : 2026-10-28
**Commit vérifié** : `8dcf027d3e` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le contrôle lit la liste des fichiers installés (le manifeste d'installation d'un projet adopté, le gabarit dans ce dépôt) et compare chacun au plafond de sa sorte, en lignes : 200 pour le code et les hooks, 100 pour AGENTS.md, 800 pour les documents lus à la demande, 250 pour les recettes | `QUA-157` | `taille-kit`, `tests-qua-157` | — |
| Sur le gabarit de ce dépôt, un dépassement **bloque** (commit, CI, avant release). Chez un projet adopté, il **avertit** seulement, en nommant le fichier et sa limite : le projet a pu enrichir un fichier du kit exprès | `QUA-157` | `taille-kit`, `tests-qua-157` | — |
| Un fichier du kit modifié à la main par le projet reste surveillé | `QUA-157` | `taille-kit`, `tests-qua-157` | — |
| Un projet adopté reçoit le contrôle à l'installation, déclaré dans ses réglages, sans geste de sa part ; le code du projet n'est jamais mesuré | `QUA-157` | `taille-kit`, `tests-qua-157` | — |
| docs/ia-first.md (729 lignes) et la recette docs/recipes/working-with-branches.md (203 lignes) tiennent leur plafond ou le plafond de leur sorte les couvre (plafond hérité de 916 lignes pour docs/ia-first.md) | `QUA-157` | `taille-kit`, `tests-qua-157` | — |
