# Preuve de clôture — consommation-copilot-cli

**Clos le** : 2026-11-15
**Commit vérifié** : `14527e2a89` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:ac1759a0a7fcdb61`, acceptés par l'humain au lancement le 2026-11-14

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sous Copilot CLI, node .githooks/consumption.mjs lit les jetons, le modèle et la durée des sessions locales et attribue chaque chantier par sa branche, comme avec Claude Code ; sans journal lisible, il le dit, sans bloquer | `QUA-042` | `tests-qua-042` | — |
| --record <fiche> écrit la ligne de .drwil/usage.jsonl avec "source" nommant l'outil ; jamais de contenu de message lu ni écrit | `QUA-042` | `tests-qua-042` | — |
| Un chantier mené avec les deux outils (commencé sous Claude Code, repris sous Copilot CLI, ou l'inverse) : les consommations des deux journaux attribuées à sa branche s'additionnent sur une seule ligne de .drwil/usage.jsonl, qui nomme chaque outil et sa part ; aucune session comptée deux fois | `QUA-042` | `tests-qua-042` | — |
| drwil serve montre, pour chaque chantier, la répartition de la consommation par outil (Claude Code, Copilot CLI) ; une ligne ancienne sans outil nommé reste comptée et s'affiche « outil inconnu » ; seuls le nom de l'outil et ses totaux atteignent l'API, jamais une autre colonne du fichier | `QUA-304` | `tests-qua-304` | — |
