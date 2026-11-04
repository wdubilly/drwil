# Preuve de clôture — attester-depuis-le-chat

**Clos le** : 2026-11-04
**Commit vérifié** : `fad0e61712` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:20fcbea3d5d3e425`, acceptés par l'humain au lancement le 2026-11-04

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| L'agent peut ouvrir un sondage d'attestation pour un contrat manuel ; la réponse de l'humain, lue par un hook ou par le client ACP dédié à Cursor, enregistre l'attestation sous chacun des cinq outils : Claude Code, Copilot CLI, Gemini CLI, Codex et Cursor | `QUA-235` | `tests-qua-235` | — |
| Le sondage affiche le critère du contrat, ce que l'agent a essayé et les fichiers couverts dont la modification ferait tomber l'attestation | `QUA-032` | `tests-qua-032` | — |
| Une réponse écrite par l'agent, un sondage sans réponse ou refusé n'enregistre jamais d'attestation | `QUA-235` | `tests-qua-235` | — |
| L'attestation faite dans le chat est liée au texte et à la preuve du contrat comme celle du terminal, compatible avec la couverture et --renew | `QUA-081` | `tests-qua-081` | — |
| Le sondage est lisible et ne demande que le jugement utile — [humain] | `QUA-236` | — | `sha256:7f7f2f18e9671eee` (4 fichier(s)) |
| La matrice distingue, pour chacun des cinq outils, adaptateur livré, événements fictifs testés et essai interactif réel daté ; un canal absent ou non vérifié bloque la parité, sans être présenté comme tenu — [humain] | `QUA-063` | `tests-qua-063` | `sha256:8d5ef685e61d4cb5` (1 fichier(s)) |
