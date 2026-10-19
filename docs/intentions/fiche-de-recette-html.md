# Intention : une version HTML de la fiche de recette

**Statut** : proposée le 2026-10-19 — hors périmètre du chantier « une
recette par version, pour une équipe hors dépôt » (journal du 2026-10-19,
0.6.5), repris de l'intention d'origine.

## Besoin

La fiche de recette est en Markdown, jointe à la pré-release et affichée
en note par GitHub. Une version HTML (cases à cocher, points repliables)
pourrait aider l'équipe de recette, depuis la même source.

## Existant (vérifié le 2026-10-19)

- `.githooks/acceptance-sheet.mjs` : `renderSheet` produit le Markdown à
  partir de données déjà structurées (points, non-régression) ;
  `readPoints` et `readFingerprints` le relisent pour le verdict et la
  promotion.
- `.githooks/dashboard.mjs` : un rendu HTML statique existe déjà dans le
  kit.

## Questions à trancher

- [décision] Faut-il une version HTML, et pour quel usage (lecture seule,
  ou saisie du verdict) ? Le verdict reste une commande humaine.
