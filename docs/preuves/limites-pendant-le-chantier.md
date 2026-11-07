# Preuve de clôture — limites-pendant-le-chantier

**Clos le** : 2026-11-07
**Commit vérifié** : `6c1134d52c` — verdict `drwil verify` : PASS
**Critères acceptés** : aucune acceptation enregistrée au lancement (lancement hors sondage ou terminal)

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le sondage des limites (drwil-limite) est refusé avec une réponse remplie, une valeur par défaut ou une recommandation ; la réponse de l'humain, lue par le hook, est enregistrée dans l'état pour chaque limite | `QUA-253` | `tests-qua-253` | — |
| La clôture refuse une fiche d'intention ajoutée par la branche sans réponse « Noter en intention » enregistrée pour son chemin, et une limite répondue « Traiter maintenant » qui finit quand même en fiche d'intention ; elle dit quelle limite et le sondage à poser | `QUA-264` | `tests-qua-264` | — |
| Le rappel de BUILD et les règles de conduite disent : limite dans le cadre, traitée sur le champ ; hors cadre, sondage avant VERIFY | `QUA-036` | `tests-qua-036` | — |
| Sous Copilot CLI, Gemini CLI, Codex et le client ACP de Cursor, les sondages drwil-limite et drwil-merge sont lus par le hook, avec les mêmes refus que sous Claude Code (réponse remplie, défaut, recommandation), prouvés par la vraie commande de chaque outil | `QUA-266` | `tests-qua-266` | — |
| La clôture ne compte plus pour une seconde entrée du journal celle d'un autre chantier qui ne fait que citer la branche | `QUA-228` | `tests-qua-228` | — |
