# Qualité front (optionnel)

Module **non installé par défaut** : `scaffold()` ne copie pas ce dossier.
À copier manuellement dans le projet qui en a besoin (front avec une charte
de couleurs à faire respecter), en attendant la recette d'adoption dédiée.

## Contenu

- `check-colors.mjs` : aucune couleur en dur (hex, `rgb()`, `hsl()`) ni
  palette Tailwind hors charte dans le code source du front, hors le
  dossier de thème.
- `check-contrast.mjs` : contraste texte/fond RGAA 4.1 / WCAG AA (4,5:1,
  3:1 pour le gros texte) de chaque combinaison de classes réellement
  écrite, en clair et en sombre, à partir d'un module de palette du projet.

## Activation

1. Copier les deux fichiers dans `.githooks/` du projet.
2. Déclarer un module de palette (export de scales façon config Tailwind,
   ex. `{ slate: { 50: "#...", 900: "#..." } }`) — voir l'exemple de la
   charte Cobalt de run-box-v2 (`frontend/src/theme/palettes.js`).
3. Ajouter les deux contrôles à `.drwil/ia-first.json -> checks`, par
   exemple :

```json
{ "name": "couleurs hors charte", "run": "node .githooks/check-colors.mjs frontend src/theme" },
{ "name": "contrastes", "run": "node .githooks/check-contrast.mjs frontend src/theme/palettes.js src/theme" }
```

Arguments de `check-contrast.mjs` : racine, chemin du module de palette
(relatif à la racine), dossier de thème (relatif à la racine, exclu du
balayage), et en option un JSON de jetons clair/sombre si la palette du
projet ne nomme pas ses nuances `slate-900`, `slate-50`, etc. (voir le
commentaire en tête du fichier).
