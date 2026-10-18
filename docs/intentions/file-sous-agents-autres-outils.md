# Intention : une file menée par sous-agents avec les autres agents

**Statut** : proposée le 2026-10-18 — limite du chantier « une file de
chantiers menée par sous-agents » (journal du 2026-10-18, 0.6.4) ;
décision du 2026-10-17 : Claude Code d'abord, les autres vérifiés un par
un.

## Besoin

Avec Copilot CLI, Codex, Cursor ou Gemini, une file de chantiers reste
menée dans une seule session : le contexte relu grossit à chaque chantier,
comme avec Claude Code avant la 0.6.4.

## Existant (vérifié le 2026-10-18)

- Le rappel d'état et la skill de lancement disent « autre outil : tout
  dans la même session » ; seul Claude Code reçoit la consigne des
  sous-agents.
- Copilot CLI lance la skill de lancement (`ask_user`) ; ses sous-agents,
  leurs hooks et leur accès à l'état ne sont pas vérifiés. Codex, Cursor
  et Gemini : non vérifiés.

## Questions à trancher

- [décision] Quels agents ont des sous-agents qui travaillent dans le
  dossier du dépôt, voient l'état (`.drwil/state.json`, si présent) et
  passent les hooks ? Les vérifier un par un, Copilot CLI d'abord ?
- [décision] Sans sous-agent, proposer à l'humain une nouvelle
  conversation entre deux chantiers (un geste), ou garder la session
  unique ?
