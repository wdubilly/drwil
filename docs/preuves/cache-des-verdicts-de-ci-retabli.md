# Preuve de clôture — cache-des-verdicts-de-ci-retabli

**Clos le** : 2026-11-13
**Commit vérifié** : `ba86a41ef0` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:ddbd09a82a91c3e5`, acceptés par l'humain au lancement le 2026-11-13

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un push sur la branche principale dont l'arbre est déjà prouvé par la CI verte d'une PR sauvegarde quand même le cache de verdicts, sous la clé du commit poussé, à partir des verdicts de cette PR ; l'arbre prouvé et l'arbre poussé sont comparés avant toute sauvegarde | `QUA-296` | `tests-qua-296` | — |
| Une PR ne restaure que des verdicts sauvegardés par la branche principale, jamais ceux d'une PR (même la sienne) | `QUA-250` | `tests-qua-250` | — |
| Sur une PR, la CI écrit au journal le commit du cache de verdicts restauré et son retard en nombre de commits sur la base de la PR, sans bloquer ; l'absence de cache est dite | `QUA-297` | `tests-qua-297` | — |
| Une PR de documentation seule, ouverte après la fusion d'une PR précédente, ne rejoue pas les contrôles dont les fichiers sont inchangés : durée du job checks mesurée avant (8 min sur la PR #405) et après, relevée au journal de clôture [humain] | `QUA-013` | `ci-coverage`, `tests-qua-013` | `sha256:54d2036b60322df9` (2 fichier(s)) |
