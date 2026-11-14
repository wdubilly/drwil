# Preuve de clôture — reprise-de-detour-sans-reecriture

**Clos le** : 2026-11-14
**Commit vérifié** : `3e16673b92` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:d7b17d47bf958063`, acceptés par l'humain au lancement le 2026-11-14

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sur une branche de chantier qui a un amont (déjà poussée), resume fusionne la branche principale corrigée dans la branche du chantier (commit de fusion, hooks du dépôt joués), ne rebase jamais et ne conseille jamais de push forcé ; sa sortie dit « fusionnée » ; sur une branche sans amont, le rebase d'aujourd'hui est gardé (trailer Drwil-Brief de chaque commit rejoué compris) | `QUA-050` | `tests-qua-050` | — |
| Une branche de chantier qui contient déjà la branche principale (fusion faite à la main) est reprise sans rien rejouer ni fusionner : travail restauré, état en BUILD sur la fiche d'origine | `QUA-050` | `tests-qua-050` | — |
| Un conflit de reprise limité aux fichiers d'ajout en fin de fichier connus (docs/projects/journal.md, ou le journal déclaré du projet) se résout seul en gardant les deux entrées, celle de la branche principale d'abord puis celle du chantier, sans en perdre ni en dupliquer une ; tout autre conflit, ou un conflit du journal qui n'est pas un pur ajout en fin de fichier des deux côtés, est refusé comme aujourd'hui : fusion (ou rebase) annulée, état inchangé, travail mis de côté intact, branche à son commit d'avant | `QUA-300` | `tests-qua-300` | — |
| Toute étape qui échoue (fusion, rebase, restauration) laisse l'état, la branche et la mise de côté inchangés ; un appel git qui échoue refuse, jamais un succès (QUA-013) | `QUA-050` | `tests-qua-050` | — |
