# Architecture « IA first » — descriptif

État au {{date}}. Ce document explique comment ce dépôt est construit pour être modifié par des agents.

## Principes
- Point d'entrée unique : `AGENTS.md`
- Une information, une seule source
- Les invariants sont outillés quand possible
- Le contrôle est dans git (`.githooks/`), lancé au commit et en CI, sans dépendre de l'outil IA ni de l'OS
