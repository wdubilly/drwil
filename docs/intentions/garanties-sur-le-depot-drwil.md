# Intention : soumettre le dépôt drwil à ses propres garanties

**Statut** : proposée le 2026-10-22 — limite du chantier « garanties
obligatoires à l'adoption ».

## Besoin

Le chantier a livré les garanties obligatoires au gabarit (drwil-le-livrable,
QUA-018 : demander la casquette visée). Le dépôt drwil lui-même n'y est pas
soumis : `drwil guarantees` n'y a jamais été lancé. Conséquence immédiate :
son `docs/features.md` est encore le squelette du gabarit, et la commande de
release, qui refuse désormais un document resté en squelette (QUA-098 : la
release exige l'examen du README, des fonctionnalités et de la carte avant le
tag), refusera la prochaine release du dépôt tant qu'il n'est pas rédigé.

## Existant (relevé le 2026-10-22)

- `docs/features.md` du dépôt : texte du squelette.
- `.githooks/release-review.mjs` : bloque l'aperçu et la création du tag sur un
  document qui garde du texte de squelette.
- La couverture du paquet n'est pas à 100 % (intention
  `docs/intentions/couverture-paquet-100.md`).

## Questions à trancher

- [décision] Rédiger `docs/features.md` du dépôt avant la prochaine release
  (geste court, nécessaire de toute façon) ?
- [décision] Lancer `drwil guarantees` sur le dépôt, et accepter les fiches
  bloquantes qu'il écrira (couverture du paquet, e2e, forge) ?
