---
name: drwil-valeur
description: Analyser le dépôt (cadrage, code existant) pour identifier les fonctionnalités à forte valeur métier les plus pertinentes à développer ensuite, et produire docs/decouverte-valeur.md. À utiliser pour cadrer la prochaine priorité produit.
---

Recette : `docs/recettes/decouvrir-valeur-produit.md`. Lit les entrées via
`.drwil/ia-first.json` (fiches de `dirs.intentions`, `dirs.projects`, code
des `layers` déclarées) plutôt que des chemins en dur. Produit ou met à
jour docs/decouverte-valeur.md (à créer — tableau OPT-N + analyse détaillée
+ prochaine étape). Jamais en CI ni au commit : une analyse à la demande,
pas un contrôle. « Valide OPT-X » débouche sur une fiche d'intention à
cadrer, jamais sur du code direct (QUA-016).
