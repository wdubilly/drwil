# Recette : visualiser l'avancement

Objectif : voir d'un coup d'œil l'avancement des chantiers (`docs/projets/`)
et la couverture des contrats (`docs/contrats.md`), sans rien déployer ni
recalculer un état qui n'existe nulle part ailleurs.

Étapes :
1. Copier le fichier unique de `templates/common/optional/tableau-de-bord/`
   (module optionnel du paquet du kit, voir son README) en
   `.githooks/tableau-de-bord.mjs` (à créer).
2. Lancer à la main : `node .githooks/tableau-de-bord.mjs` — écrit
   `docs/tableau-de-bord.html` (à créer) par défaut. Jamais en CI ni au
   commit : pas un contrôle, un outil de consultation.
3. Ouvrir le fichier généré dans un navigateur. Ajouter son chemin au
   `.gitignore` (artefact dérivé, pas une source).

Ce que ça montre : les cases de l'index des chantiers, puis pour chaque
fiche de `docs/projets/` sa ligne « Statut » et ses lots tels qu'écrits ;
les contrats installés (`docs/contrats.md`) et ceux du catalogue, non
installés (`docs/catalogue-contrats.md`). Rien n'est réinterprété : si une
fiche n'a pas de ligne « Statut », le tableau de bord le signale au lieu
d'en deviner un.
