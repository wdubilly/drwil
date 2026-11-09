# Intention : `pr-watch` montre la CI en temps réel

**Statut** : proposée le 2026-11-09 — promue d'une note du 2026-11-07.

## Besoin

`pr-watch` rend un verdict (verte, rouge, fusionnée) mais pas ce que fait la CI pendant l'attente. Le demandeur veut y
voir les jobs et les étapes avec leur durée (« en cours depuis N s »), comme `gh api actions/jobs`, sans enchaîner `gh` à
la main ; GitHub et GitLab, dans le dépôt et dans le livrable.

## Existant

`.githooks/pr-watch.mjs` suit les verdicts des contrôles (relevé par l'audit du 2026-11-09, à relire avant le cadrage).

## Questions à trancher

- [décision] Affichage seulement en cours d'attente, ou aussi un bilan des durées à la fin (suite de la décision « suivre la durée de la CI » ) ?
- [décision] Le même rendu pour GitLab (jobs d'un pipeline de MR) ?
