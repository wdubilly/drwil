# Preuve de clôture — adoption-fluide-projet-neuf

**Clos le** : 2026-10-31
**Commit vérifié** : `b140d08309` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:37e3cbbc6d9b403b`, acceptés par l'humain au lancement le 2026-10-31

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le gabarit livre un .claude/settings.json Claude Code qui autorise sans demande les commandes git, gh et .githooks courantes et garde une demande sur git push, merge et rebase | `QUA-204` | `tests-qua-204` | — |
| Le hook du sondage de lancement refuse un sondage sans la question drwil-worktree, et state.mjs start propose aussi le worktree | `QUA-205` | `tests-qua-205` | — |
| Sur un projet neuf, drwil init commite lui-même le kit sur sa branche d'installation, et le premier chantier peut se lancer sans commit refusé | `QUA-206` | `tests-qua-206` | — |
| La recette d'adoption et INSTALL.md disent ce que fait init du premier commit et pourquoi une autorisation n'est pas demandée | `QUA-207` | `tests-qua-207` | — |
