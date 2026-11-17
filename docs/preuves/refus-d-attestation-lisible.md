# Preuve de clôture — refus-d-attestation-lisible

**Clos le** : 2026-11-17
**Commit vérifié** : `0cde22a07c` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:8be201f04a93c4f6`, acceptés par l'humain au lancement le 2026-11-17

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Chaque refus nomme sa cause parmi : champ inattendu (avec ses clés), plusieurs questions, recommandation (avec l'option fautive), résumé différent de la préparation (avec la première ligne qui diffère), préparation absente, préparation expirée, réponse illisible, refus choisi par l'humain, preuve ou couverture changée ; et ce qu'il faut refaire | `QUA-235` | `tests-qua-235` | — |
| Le refus choisi par l'humain se dit comme tel, distinct d'un refus de forme | `QUA-235` | `tests-qua-235` | — |
| La dernière charge utile refusée est écrite sous .drwil/evidence/ (sans secret ni donnée nominative), assez pour la rejouer dans un test — QUA-235, | `SEC-007` | `secrets` | — |
| La recommandation n'est cherchée que dans les libellés et descriptions des options | `QUA-235` | `tests-qua-235` | — |
| Les entrées AskUserQuestion du hook dans .claude/settings.json (gabarit et dépôt) déclarent un timeout suffisant pour la relance de verify | `QUA-235` | `tests-qua-235` | — |
| Tests : un par cause de refus ; un sondage dont le résumé contient « (recommandé) » est accepté ; une charge utile au format réel de Claude Code (PostToolUse AskUserQuestion) est rejouée | `QUA-235` | `tests-qua-235` | — |
