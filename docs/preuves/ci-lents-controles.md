# Preuve de clôture — ci-lents-controles

**Clos le** : 2026-11-09
**Commit vérifié** : `1b628e80eb` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:8523e1bbfb659824`, acceptés par l'humain au lancement le 2026-11-09

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un contrôle déclaré shards: N est joué par N jobs parallèles en CI GitHub et GitLab, une tranche chacun, le contrôle recevant son numéro et le total par DRWIL_SHARD_INDEX et DRWIL_SHARD_TOTAL | `QUA-288` | `tests-qua-288` | — |
| Une tranche absente, en échec, annulée ou jouée deux fois fait échouer l'agrégation ; l'agrégation n'écrit « ok » que si les N tranches du même commit sont « ok » | `QUA-288` | `tests-qua-288` | — |
| Le job exigé par la protection de branche garde son nom unique et stable, et alert-if-ci-broken suit son résultat, tranches et agrégation comprises | `QUA-251` | `tests-qua-251` | — |
| Aucun contrôle n'est affaibli : un contrôle découpé juge les mêmes fichiers et la même commande que non découpé, drwil verify et run-checks locaux jouent une seule passe sans tranche, et un contrôle sans shards est joué comme avant | `QUA-289` | `tests-qua-289` | — |
| Un contrôle lent n'est repris d'une passe de PR à la suivante que sur une empreinte de ses paths identique, liée au commit et à la configuration du verdict, et rejoué au moindre doute — (D3 tranchée : oui) | `QUA-290` | `tests-qua-290` | — |
| Un verdict de PR ne s'écrit que depuis le job de cette PR, ne se lit que par la même PR sur le même dépôt, et son intégrité se vérifie avant reprise (D4 : somme et identité du run) ; un verdict falsifié, d'un autre commit, d'une autre PR ou d'un fork est rejoué — (D3 tranchée : oui) | `QUA-291` | `tests-qua-291` | — |
| Un projet d'essai installé depuis le paquet, avec un faux contrôle lent découpé, prouve sur GitHub et sur GitLab : la répartition des tranches, l'échec d'une tranche absente, le nom exigé inchangé et le local sans tranche (preuve de même forme que QUA-270, projet d'essai synthétique ; aucune mesure réelle sur drwil_walk) | `QUA-270` | `tests-qua-270` | — |
