# Preuve de clôture — cycle-de-vie-des-fiches

**Clos le** : 2026-10-29
**Commit vérifié** : `302ace3861` — verdict `drwil verify` : PASS
**Critères acceptés** : aucune acceptation enregistrée au lancement (lancement hors sondage ou terminal)

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le registre des contrats s'écrit en SCOPING sans avertissement de périmètre, et un nouveau contrat entre dans le même commit que la fiche qui le cite ; la régression d'un contrat modifié dans une branche sans ligne « Contrats modifiés » reste signalée par drwil verify et refuse la clôture | `QUA-172` | `tests-qua-172` | — |
| Un fichier de code déjà présent sur la branche principale reste couvert par défaut après la clôture d'une fiche ; le cadrage ne garde que le code nouveau ou modifié, et la barrière de périmètre n'est pas affaiblie pour un fichier hors de ce cas | `QUA-173` | `tests-qua-173` | — |
| Le lancement par sondage enregistre l'empreinte des critères acceptés par l'humain ; l'empreinte entre dans la preuve de clôture ; un critère modifié ensuite redemande un geste humain avant la clôture | `QUA-174` | `tests-qua-174` | — |
| Aucun agent ne peut écrire l'acceptation : elle vient du sondage lu par le hook ou du terminal interactif [humain] | `QUA-175` | `tests-qua-175` | — |
| Au lancement (sondage et node .githooks/state.mjs start), une fiche dont le bloc scope cite un fichier existant de .githooks/ sans puce « Contrats modifiés » qui le nomme est signalée, avec la puce à écrire sur le oui du demandeur ; le refus de clôture de QUA-137 reste inchangé — (contrat modifié) | `QUA-137` | `tests-qua-137` | — |
| node .githooks/close.mjs retire la ligne d'index d'une fiche même quand cette ligne cite aussi d'autres documents de docs/ : seule une fiche de docs/projects/ compte comme fiche de la ligne — (contrat modifié) | `QUA-074` | `tests-qua-074` | — |
