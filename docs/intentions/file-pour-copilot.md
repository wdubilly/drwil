# Intention : une file de chantiers aussi pour Copilot CLI

**Statut** : proposée le 2026-10-16 — limite du chantier « Une file de
chantiers décidée d'un geste » (journal du 2026-10-16).

## Besoin

La file de chantiers (QUA-037) se décide par un sondage à choix multiple
de Claude Code. Le sondage de Copilot CLI (`ask_user`) n'accepte qu'une
réponse libre : un utilisateur de Copilot CLI lance encore ses fiches une
par une. drwil se veut agnostique de l'agent.

## Existant (vérifié le 2026-10-16)

- `.claude/hooks/prompt-hook.mjs` lit les deux formes de sondage ; pour
  Copilot CLI, `humanAnswer` prend la réponse libre (« User responded: … »).
- `start()` (`.githooks/state.mjs`) accepte déjà une file (`queue`) : seul
  le geste manque côté Copilot CLI.

## Questions à trancher

- [décision] Une réponse libre listant plusieurs chemins séparés par des
  virgules vaut-elle file, ou faut-il un second sondage « ajouter une
  fiche à la file » ?
- [décision] La fusion automatique (deuxième question, absente côté
  Copilot CLI) : comment la décider ?
