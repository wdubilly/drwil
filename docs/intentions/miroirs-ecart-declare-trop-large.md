# Intention : un écart déclaré entre le gabarit et sa copie ne couvre que ce qu'il déclare

**Statut** : proposée le 2026-10-30 — relevée au cadrage de `renvois-apres-decoupe`, séparée sur décision du
demandeur.

## Besoin

Le contrôle `miroirs-gabarit` (QUA-018 : dépôt et gabarit identiques, sauf écart déclaré) accepte toute
différence d'un fichier dont l'écart est déclaré dans `outils/miroirs.json`, quelle que soit la raison
déclarée. Une puce ajoutée dans la copie du dépôt au lieu du gabarit passe donc sans bruit : c'est arrivé à
`docs/recipes/working-with-branches.md`, dont la puce « This folder » n'a jamais atteint la recette livrée.

## Existant (relevé le 2026-10-30)

- `outils/verifier-miroirs.mjs` : pour un fichier déclaré, aucun contenu n'est comparé (« Hors de portée : le
  contenu d'un écart déclaré », en tête du fichier) ; seuls sont vérifiés l'écart résolu, le fichier
  introuvable et la raison vide.
- `outils/miroirs.json` : une raison en prose par fichier (version 2), sans les passages propres au dépôt.

## Questions à trancher

- [décision] Déclarer les passages propres au dépôt (texte ou marqueurs) et comparer tout le reste, ou
  seulement avertir quand la copie gagne des lignes absentes du gabarit ?
- [décision] Quels fichiers déclarés gardent un contenu entièrement libre (registre, journal, README…) ?
