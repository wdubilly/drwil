# Preuve de clôture — fichier-neuf-couvert-apres-cloture

**Clos le** : 2026-11-12
**Commit vérifié** : `bd12443c18` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:d2dbeb5a07f702c2`, acceptés par l'humain au lancement le 2026-11-12

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un fichier de code ajouté par une branche dont la fiche a été supprimée par la clôture reste couvert jusqu'à la fusion, sur GitHub comme sur GitLab, sans toucher au réglage scopeReminder — contrat | `QUA-173` | `tests-qua-173` | — |
| Un fichier de code neuf que jamais aucune fiche de la branche n'a listé reste refusé — contrat | `QUA-016` | `docs-references`, `tests-qua-016` | — |
| Un commit qui supprime la fiche active porte son trailer Drwil-Brief: sans geste manuel — contrat | `QUA-172` | `tests-qua-172` | — |
| La MR qui livre le correctif se valide sous les hooks de la branche principale, par la déclaration prévue de QUA-113 et non par un contrôle désactivé ou sauté — contrat | `QUA-113` | `tests-qua-113` | — |
