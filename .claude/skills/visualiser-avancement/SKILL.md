---
name: drwil-avancement
description: Générer un tableau de bord HTML statique (avancement des chantiers, couverture des contrats) sans rien déployer. À utiliser pour une vue d'ensemble rapide avant une réunion, une reprise de chantier ou une revue.
---

Recette : `docs/recettes/visualiser-avancement.md` (copier le module
optionnel de `templates/common/optional/tableau-de-bord/` en
`.githooks/tableau-de-bord.mjs` (à créer), lancer à la main avec
`node .githooks/tableau-de-bord.mjs`, jamais en CI ni au commit).
Rien n'est recalculé : le tableau de bord recopie la ligne « Statut » et
les lots tels qu'écrits dans chaque fiche de `docs/projets/`.
