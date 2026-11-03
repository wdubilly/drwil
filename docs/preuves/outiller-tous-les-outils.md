# Preuve de clôture — outiller-tous-les-outils

**Clos le** : 2026-11-03
**Commit vérifié** : `f9dbd49948` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:bad7bded3c67f95a`, acceptés par l'humain au lancement le 2026-11-03

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Toute consigne ou tout mécanisme livré par le kit atteint chaque outil choisi, par le fichier que tous lisent (AGENTS.md) ou par son fichier natif, sinon son écart est déclaré dans la matrice de compatibilité | `QUA-222` | `tests-qua-222` | — |
| Sous tout outil, la consigne de lancer les commandes longues par .githooks/wait-command.mjs et de ne jamais attendre par une boucle while pgrep est lue au démarrage, pas seulement sous Claude Code | `QUA-223` | `tests-qua-223` | — |
