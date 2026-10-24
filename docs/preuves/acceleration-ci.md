# Preuve de clôture — acceleration-ci

**Clos le** : 2026-10-24
**Commit vérifié** : `aafb7afd6e` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Les contrôles du projet s'exécutent à la même exigence qu'avant, plus vite : chaque contrat garde son contrôle propre, un échec nomme toujours le contrat fautif, et un contrôle qui ne s'est pas exécuté reste un échec (QUA-013, un contrôle non exécuté n'est jamais un succès) | `QUA-119` | `tests-qua-119` | — |
| La compilation du paquet n'est faite qu'une fois par passage de run-checks, pas une fois par contrôle ; une compilation en échec fait échouer tous les contrôles qui en dépendent, jamais passer | `QUA-120` | `tests-qua-120` | — |
| Le workflow ne lance pas deux fois les mêmes jobs pour un même commit de branche (push et pull_request) ; un push sur la branche principale garde l'alerte de CI cassée et les noms de checks exigés par le ruleset de master (checks, kit-tests (<os>)) ne changent pas | `QUA-121` | `tests-qua-121` | — |
| Chaque contrôle n'est joué qu'une fois par PR en CI : le rejeu par la branche principale est sauté, et dit, seulement quand hooks et liste de contrôles sont identiques à la base ; un doute ou un écart rejoue ; la suite ne tourne qu'une fois sur Node 22 dans le job checks, sans perte de garantie | `QUA-123` | `tests-qua-123` | — |
| Hooks modifiés : le job checks dure au moins 30 % de moins que la référence (environ 5m35, soit 3m55 au plus), relevé sur trois passages de CI et consigné dans le journal ; hooks inchangés : durée relevée sur la première PR ordinaire après fusion, suivie par une intention jusqu'au relevé [humain] | `QUA-122` | — | `sha256:50fdd38685f3c218` (2 fichier(s)) |
