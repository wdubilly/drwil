# Preuve de clôture — tests-de-timing-stables

**Clos le** : 2026-10-26
**Commit vérifié** : `16ed0a1775` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le test de budget de temps au commit (« budget de temps » du paquet) ne bloque plus : un dépassement est un **avertissement compté** dans le résumé de run-checks, la mesure [budget-commit] reste écrite ; son échec de contrôle (statut non nul des contrôles mesurés) reste bloquant | `QUA-127` | `tests-qua-127` | — |
| Le test de QUA-136 (durée de chaque contrôle, trois plus lents au résumé) utilise des contrôles factices à durée imposée : son résultat ne dépend d'aucune mesure d'un contrôle réel | `QUA-136` | `tests-qua-136` | — |
| Jugement humain : les autres tests du dépôt qui mesurent une durée sont recensés au journal, et chacun est rendu déterministe ou passé en indicateur, ou sa conservation est justifiée [humain] | `QUA-150` | — | — |
| Jugement humain : cinq passes consécutives du pre-push sous charge (taskset, contrôles en parallèle) ne refusent plus aucun push pour un test de timing, résultat consigné au journal [humain] | `QUA-151` | — | — |
