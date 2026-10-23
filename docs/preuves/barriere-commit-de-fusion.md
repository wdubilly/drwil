# Preuve de clôture — barriere-commit-de-fusion

**Clos le** : 2026-10-23
**Commit vérifié** : `3183f10668` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Pendant une fusion, la barrière ne juge que la résolution : un fichier indexé identique à sa version dans l'un des deux parents passe, quels que soient l'activité et le cadrage ; un fichier différent des deux parents (conflit résolu, combinaison) reste jugé comme tout fichier indexé ; hors fusion, rien ne change | `QUA-111` | `tests-qua-111` | — |
