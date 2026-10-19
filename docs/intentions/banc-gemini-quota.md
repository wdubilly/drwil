# Intention : un passage complet du banc stable sous Gemini CLI

**Statut** : proposée le 2026-10-19 — limite du chantier « Compatibilité des agents, Gemini CLI tenu » (journal du 2026-10-19).

## Besoin

Le quota gratuit du modèle par défaut de Gemini CLI (20 requêtes par jour)
s'épuise vite (429) et le modèle essayé en repli répond parfois 503 : des
passages du banc échouent sans rien prouver (`codeAgent` non nul, hooks
partiels). Les trois preuves (hooks lancés, écriture refusée, rappel reçu) ont
été obtenues en essais séparés, pas en un seul passage « conforme ».

## Existant (vérifié le 2026-10-19)

- Banc sur `gemini-3-flash-preview` (variable `GEMINI_MODEL`) : trois passages,
  trois résultats différents (rappel seul ; refus sans rappel ; hooks d'état seuls).

## Questions à trancher

- [décision] Faire relancer le banc par le banc lui-même tant que l'agent
  sort en erreur de quota, ou attester sur un compte payant ?
