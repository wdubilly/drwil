# Architecture « IA first » — descriptif

État au 2026-10-03. Ce document explique comment ce dépôt est construit pour être modifié par des agents.

## Principes
- Point d'entrée unique : `AGENTS.md`
- Une information, une seule source
- Les invariants sont outillés quand possible
- Le contrôle est dans git (.githooks)
- L'état de gouvernance (activité, attente active) se lit sur disque, jamais
  dans la mémoire de l'agent : `.drwil/state.json` (si présent), local et ignoré par Git,
  lu par `.githooks/etat.mjs`, que tout agent lance en début de tâche
  (`AGENTS.md`) ; Claude Code le reçoit en plus au démarrage
  (détail : `packages/drwil/templates/fr/base/docs/ia-first.md`, « État de
  gouvernance » ; chantier `docs/projets/gouvernance-attente-active.md`)
