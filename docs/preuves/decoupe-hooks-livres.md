# Preuve de clôture — decoupe-hooks-livres

**Clos le** : 2026-10-27
**Commit vérifié** : `6731af94c8` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Chaque hook de base livré fait 200 lignes au plus, tests exclus, et n'a plus de plafond hérité | `QUA-001` | `taille-fichiers`, `tests-qua-001` | — |
| Le comportement des hooks ne change pas : leurs tests et la couverture de .githooks/ passent, aucun test n'étant modifié hors de ses chemins d'import | `QUA-004` | `couverture-tests`, `couverture-hooks` | — |
| Une installation neuve donne des hooks découpés qui tournent : premier commit accepté, chaque nouveau fichier installé, cité par docs/projects/kit-mechanics.md et retiré par uninstall | `QUA-004` | `couverture-tests`, `couverture-hooks` | — |
