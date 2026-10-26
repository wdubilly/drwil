# Intention : un accueil drwil court à l'ouverture d'une session

**Statut** : proposée le 2026-10-27 — demande de l'humain.

## Besoin

À l'ouverture d'une session, afficher un accueil drwil : où en est le projet
(activité, fiche active, attente) et les commandes utiles. Il doit rester
**court** : comme il ne peut pas tout rappeler, il donne l'essentiel et dit
où obtenir le détail à la demande, au lieu de tout recopier.

## Existant (relevé le 2026-10-27)

- Un hook de début de session injecte déjà l'état de gouvernance à l'agent :
  `SessionStart` pour Claude Code et Gemini, `sessionStart` pour Copilot CLI
  (`copilot-start`). Cette injection est un contexte pour l'agent
  (`additionalContext`), que l'humain ne voit pas.
- Non vérifié : si Copilot CLI ou Gemini affichent à l'humain la sortie d'un
  hook de début de session, ou seulement le contexte envoyé à l'agent ;
  Claude Code permet de montrer un message à l'utilisateur à l'ouverture.
- Le contexte lu à chaque session coûte des tokens ; un accueil long
  alourdit chaque session.

## Questions à trancher

- [décision] Que contient l'essentiel en quelques lignes (activité, fiche
  active, verdict du dernier `verify`, attente, worktrees ouverts, prochaine
  fiche prête, trois ou quatre commandes) et que laisse-t-on à la demande ?
- [décision] Où trouver le détail : une commande ou un skill unique
  (« drwil » avec un état complet), plutôt que d'allonger l'accueil ?
- [décision] Comment l'afficher quand l'outil ne montre pas la sortie du
  hook à l'humain : le demander à l'agent dans sa première réponse ?
- [décision] Taille maximale de l'accueil, et mesure de son coût en tokens
  (à rapprocher de l'intention sur le suivi du contexte relu).
