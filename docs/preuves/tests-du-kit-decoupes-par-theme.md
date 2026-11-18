# Preuve de clôture — tests-du-kit-decoupes-par-theme

**Clos le** : 2026-11-18
**Commit vérifié** : `079f02f01b` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:39110a19e405ddef`, acceptés par l'humain au lancement le 2026-11-17

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Aucun test n'est perdu ni modifié dans le découpage : le nombre de tests et la liste des contrats cités sont identiques avant et après, prouvé par un test qui compare les deux | `QUA-315` | `tests-qua-315` | — |
| Aucun fichier de test du kit ne dépasse un plafond de durée fixé à la réalisation, relevé dans le journal de clôture : mesure avant et après de chaque fichier | `QUA-013` | `ci-coverage`, `tests-qua-013` | — |
| Chaque contrôle de .drwil/ia-first.json et chaque ligne « Couvre » de docs/contracts.md qui citaient le gros fichier citent les fichiers qui portent désormais ses tests ; un contrat n'est jamais attesté sur un fichier qui ne le teste plus | `QUA-185` | `tests-qua-185` | — |
