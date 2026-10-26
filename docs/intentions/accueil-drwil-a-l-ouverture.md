# Intention : un accueil drwil court à l'ouverture d'une session

**Statut** : proposée le 2026-10-27 — demande de l'humain.

## Besoin

À l'ouverture d'une session, afficher un accueil drwil : où en est le projet
(activité, fiche active, attente) et les commandes utiles. Il doit rester
**court** : comme il ne peut pas tout rappeler, il donne l'essentiel et dit
où obtenir le détail à la demande, au lieu de tout recopier.

Contrainte posée le 2026-10-27 : l'accueil doit être **gratuit**, c'est-à-dire
ne coûter aucun token. Il est affiché à l'humain seul et n'entre jamais dans
le contexte du modèle (ni à l'ouverture, ni ensuite).

## Existant (relevé le 2026-10-27)

- Un hook de début de session injecte déjà l'état de gouvernance à l'agent :
  `SessionStart` pour Claude Code et Gemini, `sessionStart` pour Copilot CLI
  (`copilot-start`). Cette injection est un contexte pour l'agent
  (`additionalContext`), que l'humain ne voit pas.
- Non vérifié : si Copilot CLI ou Gemini affichent à l'humain la sortie d'un
  hook de début de session, ou seulement le contexte envoyé à l'agent ;
  Claude Code permet de montrer un message à l'utilisateur à l'ouverture.
- Tout ce qui entre dans le contexte du modèle coûte des tokens à chaque session ; un accueil long
  alourdit chaque session.

## Questions à trancher

- [décision] Que contient l'essentiel en quelques lignes (activité, fiche
  active, verdict du dernier `verify`, attente, worktrees ouverts, prochaine
  fiche prête, trois ou quatre commandes) et que laisse-t-on à la demande ?
- [décision] Où trouver le détail : une commande ou un skill unique
  (« drwil » avec un état complet), plutôt que d'allonger l'accueil ?
- [décision] Comment l'afficher gratuitement quand l'outil ne montre pas la
  sortie du hook à l'humain : y renoncer pour cet outil, ou une commande de
  terminal (qui ne passe pas par le modèle) ? Le demander à l'agent dans sa
  première réponse coûte des tokens et est donc exclu.
- [décision] Comment prouver que l'accueil ne coûte rien (aucun octet
  injecté au modèle), et le garder ainsi (à rapprocher de l'intention sur le
  suivi du contexte relu) ?
- [décision] Un petit ASCII art (logo drwil) en tête de l'accueil, demandé le
  2026-10-27 : à quelques lignes seulement, et réservé à ce que l'humain voit
  (message d'un hook), jamais injecté à l'agent (gratuité).
