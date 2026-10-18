# Intention : le feu vert de publication enregistré par l'outil au lancement

**Statut** : proposée le 2026-10-18 — limite du chantier « date gardée et
feu vert de publication » (journal du 2026-10-18, 0.6.5, 1 sur 4).

## Besoin

La recette de release permet désormais de donner le feu vert de
publication au lancement, en nommant la version, pour qu'une file menée
par sous-agents publie sans s'arrêter. Ce feu vert n'est qu'une phrase de
la demande, que l'agent qui orchestre transmet mot pour mot au sous-agent :
rien ne le garde si la session change, et rien ne l'efface une fois la
release faite.

## Existant (vérifié le 2026-10-18)

- `docs/recipes/create-a-release.md` (et son gabarit), section
  « Publication green light » : le feu vert couvre une release, nomme sa
  version, jamais une publication npm.
- La fusion automatique, elle, est autorisée au lancement et enregistrée
  par `.githooks/state.mjs` (affichée par le rappel, effacée au retour en
  SCOPING) : un modèle possible.

## Questions à trancher

- [décision] Enregistrer le feu vert dans l'état au lancement (sondage de
  `/drwil-start`, `state.mjs start`), affiché par le rappel et effacé une
  fois la release créée, ou le garder comme une phrase de la demande ?
