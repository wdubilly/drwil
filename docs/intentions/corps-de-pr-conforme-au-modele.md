# Intention : le corps d'une PR suit le modèle, contrôlé par une machine

**Statut** : proposée le 2026-11-09 — promue d'une note du 2026-10-27.

## Besoin

Aujourd'hui seule la consigne à l'agent impose que le corps d'une PR suive `.github/pull_request_template.md`. Le
demandeur veut un contrôle déterministe (titres présents), en CI ou en hook.

## Existant

Écart constaté sur la PR #273 du chantier `plafond-200-lignes`. Aucun contrôle de ce type n'est connu : à vérifier dans
`.githooks/` avant le cadrage.

## Questions à trancher

- [décision] En CI (lecture du corps de la PR) ou en hook ? Que faire d'une PR hors GitHub (GitLab) ?
- [décision] Le contrôle existe-t-il aussi dans le livrable (gabarit), ou seulement dans ce dépôt (QUA-018) ?
