# Preuve de clôture — attestation-par-sondage-d-abord

**Clos le** : 2026-11-07
**Commit vérifié** : `adade2c94e` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:76fa57679c1349db`, acceptés par l'humain au lancement le 2026-11-07

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le sondage drwil-attest répondu « Attester » dans Claude Code enregistre l'attestation, avec la forme réelle du retour de l'outil (réponse ajoutée à tool_input comprise), et refuse toujours une réponse préremplie, un défaut, une recommandation ou un sondage modifié | `QUA-235` | `tests-qua-235` | — |
| Quand une attestation humaine est attendue, drwil verify --agent, les messages de l'état, le skill drwil, les règles de conduite et la consigne de drwil-checks proposent d'abord le sondage dans le chat (préparation drwil attest-poll <ID> --tried …, recette attest-a-contract), puis le terminal drwil attest <ID> en repli ; aucun de ces textes ne donne le terminal comme seule voie | `QUA-267` | `tests-qua-267` | — |
| La recette attest-a-contract dit, pour chaque outil qui a un sondage, comment le préparer et le poser, sans réponse préremplie ni recommandation ; AGENTS.md et le skill de lancement y renvoient | `QUA-267` | `tests-qua-267` | — |
