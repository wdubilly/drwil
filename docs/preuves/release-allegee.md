# Preuve de clôture — release-allegee

**Clos le** : 2026-10-30
**Commit vérifié** : `000745c8f1` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:2db2f91a6ca0a961`, acceptés par l'humain au lancement le 2026-10-30

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le réglage release.mode vaut solo ou team, solo par défaut ; une autre valeur est refusée et la migration d'un projet existant le conserve | `QUA-199` | `tests-qua-199` | — |
| En solo, .githooks/create-release.mjs sans --candidate publie directement un patch, sans candidate ni verdict | `QUA-200` | `tests-qua-200` | — |
| En team, la création directe d'une release est refusée et dit d'utiliser --candidate | `QUA-201` | `tests-qua-201` | — |
| En solo, la note de recette « sans verdict » est écrite dans le corps de la release GitHub, jamais par une branche recette/vX.Y.Z ni une PR ; en team, elle arrive par la PR dédiée comme aujourd'hui | `QUA-079` | `tests-qua-079` | — |
| Le tag et la release publiés ne dépendent jamais de l'écriture de la note, dans les deux modes | `QUA-080` | `tests-qua-080` | — |
| --dry-run montre, pour chaque mode, ce qui serait publié et où irait la note, sans rien créer | `QUA-079` | `tests-qua-079` | — |
| La fiche des mécaniques livrée et le README du module citent .githooks/recette-note.mjs, et le contournement du test du kit est retiré | `QUA-051` | `tests-qua-051` | — |
| Le texte de QUA-048 renvoie à QUA-058 pour les branches fusionnées par squash [humain] | `QUA-048` | `tests-qua-048` | `sha256:199a29916d0b6e66` (3 fichier(s)) |
