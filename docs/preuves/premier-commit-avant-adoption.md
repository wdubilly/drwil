# Preuve de clôture — premier-commit-avant-adoption

**Clos le** : 2026-10-23
**Commit vérifié** : `ba8aa5a09c` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sur un projet qui a déjà des fichiers de code indexés, init écrit une fiche de référence « code existant » dont le bloc scope couvre chacun d'eux (hors fichiers du kit), et une carte d'architecture qui cite chacun de leurs dossiers ; prouvé sur un vrai projet installé : un commit qui ne touche qu'une fiche y passe, hooks actifs et réglages bloquants, et run-checks n'y signale aucun fichier hors fiche ni dossier absent de la carte | `QUA-110` | `tests-qua-110` | — |
| Un projet neuf (aucun code indexé) et la mise à jour d'un projet déjà installé ne changent pas : aucune fiche « code existant » créée, aucune fiche ni carte existante réécrite | `QUA-110` | `tests-qua-110` | — |
| La recette d'adoption dit ce que devient la fiche « code existant » : la carte réécrite depuis le code (étape 1), le code rattaché aux fiches des chantiers qui le touchent ensuite, la fiche gardée tant qu'elle couvre un fichier [humain] | `QUA-041` | `docs-references` | — |
