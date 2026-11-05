# Preuve de clôture — reprise-d-etat-sur-un-autre-clone

**Clos le** : 2026-11-05
**Commit vérifié** : `a6ebfe29f0` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:9f30f5f98e01c185`, acceptés par l'humain au lancement le 2026-11-05

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sur un clone neuf placé sur workstream/<fiche>, node .githooks/state.mjs resume remet l'état en BUILD sur cette fiche quand elle est présente, et en CLOSING quand un commit de clôture l'a supprimée et que la PR de la branche n'est pas fusionnée ; le commit suivant passe la barrière de périmètre, prouvé par un test qui clone un dépôt de chantier en cours | `QUA-245` | `tests-qua-245` | — |
| Pour une fiche à plusieurs lots, chaque commit de lot porte le trailer Drwil-Lot: N et resume reprend le dernier lot lu dans l'historique de la branche | `QUA-246` | `tests-qua-246` | — |
| resume refuse, sans rien écrire, quand l'historique ne prouve rien (branche qui n'est pas celle d'un chantier, fiche absente sans commit de clôture, PR fusionnée, état local déjà actif sur une autre fiche) et dit pourquoi ; il ne reconstruit jamais une décision humaine (fusion automatique, file, réouverture) : il dit qu'elle est à redemander | `QUA-247` | `tests-qua-247` | — |
