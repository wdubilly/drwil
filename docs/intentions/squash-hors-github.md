# Intention : reconnaître une fusion par squash hors de GitHub

**Statut** : proposée le 2026-10-19 — limite du chantier « les branches
fusionnées par squash reconnues » (journal du 2026-10-19, 0.6.6, 2 sur 4).

## Besoin

Une branche fusionnée par squash n'est reconnue que par `gh` (QUA-058,
une branche dont la PR est fusionnée sur GitHub est reconnue fusionnée).
Sur GitLab ou une autre forge, le repli git seul s'applique (QUA-059, sans
gh joignable seule la fusion classique est reconnue) : la branche est
gardée et le lancement le dit, mais elle reste à supprimer à la main, et
la reprise d'un détour fusionné par squash est refusée.

## Existant (vérifié le 2026-10-19)

- `.githooks/close.mjs` (`mergedPullRequests`) : `gh pr list --state
  merged`, les 200 PR fusionnées les plus récentes pour le ménage (une
  branche plus ancienne est gardée, jamais supprimée sans preuve), 20 pour
  la branche d'un détour.
- La fiche du chantier mettait GitLab et les autres forges hors périmètre.

## Questions à trancher

- [décision] Interroger `glab` (GitLab) de la même façon, ou laisser le
  repli git et documenter la suppression à la main ?
- [décision] Au-delà des 200 PR les plus récentes, chercher branche par
  branche (une question par branche gardée), ou garder la limite ?
