---
name: refactorer-sans-casser
description: Découper ou restructurer du code existant sans changer son comportement — tests de caractérisation d'abord, petites étapes commitées, bugs trouvés en commits séparés. À utiliser pour tout refactor.
---

Recette : `docs/recettes/refactorer-sans-casser.md` (tests de
caractérisation d'abord, petites étapes, pièges déjà rencontrés). Contexte :
l'`AGENTS.md` de la couche touchée. Un bug trouvé en route : commit séparé
(`AGENTS.md`, section Conduite).
Vérifier : `node .githooks/run-checks.mjs` à chaque étape.
