# Intention : l'étape de rejeu ne se retire pas du workflow par la PR elle-même

**Statut** : proposée le 2026-10-24 — limite du chantier « les
contournements restants fermés ou assumés » (journal du 2026-10-24).

## Besoin

QUA-113 (sur une PR, la CI rejoue les contrôles avec les hooks de la
branche principale) rejoue `.githooks/` de la branche principale, mais
l'étape qui lance ce rejeu vit dans le workflow de la branche contrôlée
(`.github/workflows/ia-first.yml` ; dans le gabarit,
`packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml`). Une PR qui retire ou
neutralise cette étape se valide donc encore elle-même : seule la relecture
la retient.

## Existant (relevé le 2026-10-24)

- Ce dépôt : `.github/CODEOWNERS` exige la revue du propriétaire sur le
  workflow ; un projet adopté n'a pas de CODEOWNERS
  (`docs/intentions/forge-dans-le-livrable.md`).
- GitHub sait exiger un workflow par un ruleset d'organisation (« required
  workflows »), hors de portée d'un dépôt personnel.

## Questions à trancher

- [décision] Faire vérifier par le rejeu lui-même que le workflow de la PR
  contient encore l'étape (comparaison avec celui de la branche
  principale), exiger un workflow par la forge quand elle le permet, ou
  assumer la limite par écrit ?
