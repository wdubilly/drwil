# Preuve de clôture — cloture-fix-une-seule-fois

**Clos le** : 2026-11-17
**Commit vérifié** : `72c6204e7d` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:98e0f8d69c356d05`, acceptés par l'humain au lancement le 2026-11-17

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| node .githooks/close.mjs --fix écrit seulement les corrections proposées, en CLOSING comme ailleurs : ni preuve, ni fiche supprimée, ni index touché, ni consommation consignée ; le message de proposition donne la commande de clôture à lancer ensuite | `QUA-076` | `tests-qua-076` | — |
| node .githooks/close.mjs relancé sur une clôture déjà faite (fiche absente de la copie de travail, preuve écrite, ligne d'index retirée) dit « clôture déjà faite » avec ce qui a été fait, code 0, sans rien réécrire ni consigner une seconde fois la consommation, et ne parle jamais d'empreinte modifiée [humain] | `QUA-048` | `tests-qua-048` | `sha256:d8cdd974dd60d5f4` (3 fichier(s)) |
| node .githooks/close.mjs --check (et le passage de BUILD à EVIDENCE) signale des critères d'acceptation modifiés depuis leur acceptation, avec le même texte que le refus de la clôture : jamais « rien ne ferait échouer » quand la clôture refuserait pour cette raison [humain] | `QUA-048` | `tests-qua-048` | `sha256:d8cdd974dd60d5f4` (3 fichier(s)) |
| Une citation de la fiche close n'est réorientée vers le journal que dans une forme de simple renvoi (entre parenthèses, « voir … », après un tiret en fin de ligne) ; dans toute autre phrase, elle est signalée « à réécrire à la main », sans correction proposée ni écrite | `QUA-076` | `tests-qua-076` | — |
| Les phrases fausses déjà écrites par une réorientation, relevées au besoin ci-dessus, sont réécrites à la main | `QUA-076` | `tests-qua-076` | — |
| Tests : --fix en CLOSING sans mécanique ; clôture relancée après une clôture faite ; --check sur critère modifié ; renvoi dans une phrase signalé, renvoi entre parenthèses réorienté ; en échec contre le code actuel — QUA-048, | `QUA-076` | `tests-qua-076` | — |
