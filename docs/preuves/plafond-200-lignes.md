# Preuve de clôture — plafond-200-lignes

**Clos le** : 2026-10-27
**Commit vérifié** : `5221f7176a` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un fichier de code du périmètre de QUA-001 ne dépasse pas 200 lignes, tests exclus ; chaque fichier au-dessus au lancement du chantier est plafonné à sa taille mesurée dans .githooks/check-file-size.legacy.json et ne peut plus grossir | `QUA-001` | `taille-fichiers`, `tests-qua-001` | — |
| Le livrable propose 200 lignes à l'adoption : la recette d'adoption et le catalogue le disent, l'exemple du script livré écrit son plafond en entier ; le défaut du script reste 400, si bien qu'aucun projet déjà adopté ne casse à la mise à jour | `QUA-001` | `taille-fichiers`, `tests-qua-001` | — |
