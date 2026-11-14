# Preuve de clôture — fusion-automatique-par-defaut

**Clos le** : 2026-11-14
**Commit vérifié** : `d1921956c5` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:5a66639d07b9cc2f`, acceptés par l'humain au lancement le 2026-11-14

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Après la clôture d'un chantier et son push, .githooks/merge-auto.mjs programme la fusion sans autorisation préalable de l'humain, avec toutes ses autres garanties (état calculé, mise à jour si en retard, relecture sur la forge) | `QUA-161` | `tests-qua-161` | — |
| Les garde-fous restent : jamais de fusion programmée sur un état inconnu, en retard, en conflit, une MR fermée ou d'une autre branche ; la PR (MR) dont la branche (headRefName) n'est pas la branche git courante est refusée sans rien programmer | `QUA-162` | `tests-qua-162` | — |
| Tant que la marque merge_cancelled (fusion annulée par une réouverture non aboutie) est dans l'état, .githooks/merge-auto.mjs refuse sans appel à la forge : la reprogrammation reste à l'humain | `QUA-181` | `tests-qua-181` | — |
| L'outil d'état n'écrit plus auto_merge (lancement, file, sondage drwil-merge) ni scoping_merge (fin de cadrage) ; les marques déjà écrites restent lisibles, sans effet | `QUA-188` | `tests-qua-188` | — |
| Un contrat retiré reste au registre, marqué « **Retiré** : <date> — <raison> », sans preuve (ni Contrôle ni Manuel), citable par le journal, les preuves et les recettes, et n'est jamais compté PASS ni ATTESTED par drwil verify ; un champ Retiré sans date ou sans raison est refusé | `QUA-298` | `tests-qua-298` | — |
| Le sondage de lancement ne pose plus drwil-merge et celui de fin de cadrage disparaît ; un cadrage poussé voit sa PR mise en fusion automatique par l'agent | `QUA-187` | `tests-qua-187` | — |
| Un réglage hérité (auto_merge, scoping_merge) dans un état existant ne casse rien | `QUA-188` | `tests-qua-188` | — |
