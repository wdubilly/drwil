# Intention : la consommation de tokens mesurée aussi pour les autres outils IA

**Statut** : proposée le 2026-10-16 — limite du chantier « La consommation
de tokens par chantier, mesurée chez tout projet » (journal du 2026-10-16).
Copilot CLI couvert le 2026-11-15 par le chantier « La consommation de Copilot
CLI est mesurée comme celle de Claude Code » (journal du 2026-11-15) : restent
Cursor, Codex et Gemini.

## Besoin

`node .githooks/consumption.mjs` (QUA-042, consommation de tokens mesurée
par chantier) ne lit que les journaux de session de Claude Code et de
Copilot CLI. Un projet du pilote qui travaille avec Cursor, Codex ou Gemini
n'a pas de mesure automatique :
la recette lui demande une estimation à la main, moins fiable et souvent
oubliée.

## Existant (vérifié le 2026-11-15)

- Claude Code et Copilot CLI : lus par `node .githooks/consumption.mjs`
  (un lecteur par outil, seuls les champs de consommation lus) ; un chantier
  mené avec les deux a une ligne qui nomme chaque outil et sa part (recette
  `docs/recipes/track-consumption-per-increment.md`).
- Cursor, Codex, Gemini : aucune voie décrite.
- Sans journal lisible, le script le dit et sort en succès (jamais
  bloquant) : la clôture n'est pas gênée, seulement non mesurée.

## Questions à trancher

- [décision] Lequel de Cursor, Codex et Gemini couvrir d'abord (ceux des
  projets du pilote) ?
- [décision] Lire leurs historiques dans le même script (un lecteur par
  outil, comme pour Copilot CLI) ou garder une saisie guidée qui écrit la
  même ligne ?
- [décision] Comment garantir, comme pour Claude Code et Copilot CLI, que
  seuls les champs de consommation sont lus, jamais un contenu de message ?
