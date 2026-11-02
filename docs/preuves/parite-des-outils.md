# Preuve de clôture — parite-des-outils

**Clos le** : 2026-11-02
**Commit vérifié** : `71cbd518d7` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:ad4cd5d7bccf625d`, acceptés par l'humain au lancement le 2026-11-02

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un tableau de parité, outil par outil (Claude Code, Copilot CLI, Gemini CLI, Codex), dit pour chacun : sondage de lancement, choix de plusieurs fiches (file), sous-agent par chantier, blocage avant écriture, rappel d'état ; chaque case est « tenu », « contourné par … » ou « impossible », avec date et version d'essai, jamais devinée — [humain] | `QUA-063` | `tests-qua-063` | `sha256:e4c36ae724aff8e3` (1 fichier(s)) |
| Une file de plusieurs fiches se construit sous chaque outil par des sondages à choix unique enchaînés (drwil-file), sans cocher plusieurs cases (décision du lot 2) | `QUA-037` | `tests-qua-037` | — |
| Le contournement ne laisse jamais l'agent décider du lancement : l'humain répond, un outil lit (même invariant que le sondage actuel) | `QUA-037` | `tests-qua-037` | — |
| Le résultat par outil est prouvé par le banc outils/banc-agents.mjs ; l'attestation de la colonne « Attested by the human » reste un geste humain — [humain] | `QUA-060` | `tests-qua-060` | `sha256:10776ae936efc4ca` (1 fichier(s)) |
