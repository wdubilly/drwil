# Intention : la consommation de tokens mesurée aussi pour les autres outils IA

**Statut** : proposée le 2026-10-16 — limite du chantier « La consommation
de tokens par chantier, mesurée chez tout projet » (journal du 2026-10-16).

## Besoin

`node .githooks/consumption.mjs` (QUA-042, consommation de tokens mesurée
par chantier) ne lit que les journaux de session de Claude Code. Un projet
du pilote qui travaille avec un autre outil n'a pas de mesure automatique :
la recette lui demande une estimation à la main, moins fiable et souvent
oubliée.

## Existant (vérifié le 2026-10-16)

- Copilot CLI : la recette décrit une requête `session_store_sql` (table
  `session_usage`) à lancer à la main ; rien n'écrit la ligne de
  `.drwil/usage.jsonl`.
- Copilot CLI, constaté le 2026-10-19 à la clôture de « Gemini CLI tenu » :
  `.githooks/close.mjs` répond « aucune réponse d'agent dans ~/.claude/projects/… —
  non mesuré », alors que la session a bien tourné sous Copilot CLI (ses
  traces sont dans `~/.copilot/session-state/<session>/` : `events.jsonl` et
  `session.db`, format différent de celui de Claude Code). Copilot CLI est
  l'outil le plus utilisé sur ce dépôt : à couvrir en premier.
- Cursor, Codex, Gemini : aucune voie décrite.
- Sans journal lisible, le script le dit et sort en succès (jamais
  bloquant) : la clôture n'est pas gênée, seulement non mesurée.

## Questions à trancher

- [décision] Quels outils couvrir d'abord (ceux des projets du pilote) ?
  Proposition : Copilot CLI d'abord (demande du 2026-10-19), puis les autres.
- [décision] Lire leurs historiques dans le même script (un lecteur par
  outil) ou garder une saisie guidée qui écrit la même ligne ?
- [décision] Comment garantir, comme pour Claude Code, que seuls les champs
  de consommation sont lus, jamais un contenu de message ?
