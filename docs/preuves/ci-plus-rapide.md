# Preuve de clôture — ci-plus-rapide

**Clos le** : 2026-11-08
**Commit vérifié** : `ab8f10818a` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:64c43331bc391d3d`, acceptés par l'humain au lancement le 2026-11-08

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sur une PR, le rejeu avec les hooks de la branche principale reprend le verdict de chaque contrôle dont les hooks et l'empreinte sont identiques à ceux déjà joués : une PR de code ne paie plus deux passes complètes, et un hook affaibli reste refusé | `QUA-113` | `tests-qua-113` | — |
| Un push sur la branche principale dont l'arbre est celui d'une PR verte ne rejoue pas les contrôles et le dit ; dans tout autre cas il rejoue tout, et le suivi de la CI de la branche principale (QUA-251) reste exact | `QUA-250` | `tests-qua-250` | — |
| Le téléchargement de gitleaks se remet de ses échecs passagers (nouvelles tentatives, y compris sur une erreur HTTP, et cache de l'archive vérifiée par son empreinte) dans les trois CI : celle du dépôt, celle du gabarit GitHub et celle du gabarit GitLab | `QUA-269` | `tests-qua-269` | — |
| Un projet adopté reçoit ces gains : les CI du gabarit portent les mêmes mécanismes, et un projet d'essai installé depuis le paquet le prouve | `QUA-270` | `tests-qua-270` | — |
