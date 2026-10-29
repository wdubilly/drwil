# Preuve de clôture — retour-scoping-branche-sondage

**Clos le** : 2026-10-29
**Commit vérifié** : `eb59ad8b77` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:dc466066d12aa35c`, acceptés par l'humain au lancement le 2026-10-29

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Lire l'état (.githooks/state.mjs) en CLOSING dont la PR est fusionnée (vérifié par gh, via closingMerged) ramène l'état en SCOPING et le dit ; PR ouverte, introuvable ou gh absent : l'état reste CLOSING et le dit, jamais un retour | `QUA-176` | `tests-qua-176` | — |
| state.mjs next refuse de lancer la tête de file tant que la PR du chantier précédent n'est pas fusionnée, et le dit ; PR introuvable ou gh absent : refus qui le dit, jamais un lancement | `QUA-177` | `tests-qua-177` | — |
| Une file décidée au lancement enchaîne le chantier suivant dès que la fusion du précédent est constatée, sans nouveau geste ; une file reprise dans une nouvelle session attend toujours le oui explicite de l'humain | `QUA-178` | `tests-qua-178` | — |
| Un lancement en « This folder » depuis la branche principale crée et bascule sur workstream/<fiche> depuis la branche principale à jour ; depuis une branche de chantier il la garde ; une branche déjà existante ou un arbre sale est refusé avec un message qui dit quoi faire | `QUA-179` | `tests-qua-179` | — |
| Le skill /drwil-start prescrit pour Copilot CLI un champ fiche en choix unique (enum seul), seul lu de façon fiable, et le hook lit cette réponse | `QUA-180` | `tests-qua-180` | — |
