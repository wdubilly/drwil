# Preuve de clôture — renvois-apres-decoupe

**Clos le** : 2026-10-30
**Commit vérifié** : `6cfc62cfc7` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:c165e99d167eb784`, acceptés par l'humain au lancement le 2026-10-30

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Chaque titre de section cité dans un commentaire d'un hook livré (.githooks/ du gabarit) mène à un titre existant de docs/ia-first/ | `QUA-190` | `tests-qua-190` | — |
| Aucun renvoi relatif d'un fichier de docs/ia-first/ ne sort de ce fichier : ni « this document », ni titre cité avec « below » ou « above » absent du même fichier | `QUA-190` | `tests-qua-190` | — |
| La recette livrée docs/recipes/working-with-branches.md dit qu'un lancement en « This folder » crée workstream/<fiche> depuis la branche principale à jour, et quand il refuse | `QUA-179` | `tests-qua-179` | — |
| QUA-063 vise le fichier qui porte la matrice de compatibilité [humain] | `QUA-063` | `tests-qua-063` | `sha256:41fb1b6aaeb0563e` (1 fichier(s)) |
