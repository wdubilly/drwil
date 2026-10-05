---
name: drwil-release
description: Poser un tag Git et une note de release GitHub sur le dernier chantier fusionné (module optionnel, jamais de fichier suivi modifié). À utiliser une fois le module activé sur le projet, pour prévisualiser (--dry-run) puis créer la release.
---

Recette : `docs/recettes/creer-une-release.md`. Module optionnel, non
installé par défaut — vérifier d'abord que `.githooks/creer-release.mjs` (si présent) existe
(sinon, suivre l'activation décrite dans la recette
avant de continuer). Toujours commencer par
`node .githooks/creer-release.mjs --dry-run` et montrer le résultat
(dernier tag, bump détecté, version suivante) avant de créer quoi que ce
soit réellement.
