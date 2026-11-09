# Intention : la CI rapide éprouvée en réel, et la preuve de CI de la branche principale hors GitHub

**Statut** : proposée le 2026-11-06 — limites laissées par la clôture du chantier « une PR de doc
passe la CI et fusionne en quelques minutes » (voir `docs/projects/journal.md`).

## Besoin

Le chantier a livré la reprise des verdicts en CI (QUA-250), la levée de « à jour avec master »
(QUA-252) et la file qui attend une branche principale verte (QUA-251). Tout est prouvé par des
tests, rien encore sur une vraie fusion ni sur un vrai GitLab.

## Existant (relevé le 2026-11-06)

- Le cache des verdicts n'existe qu'après un push sur la branche principale : aucune PR de doc n'a
  encore été mesurée avec la reprise (référence : PR #362, 6 min 40 s de l'ouverture à la fusion).
- La CI GitLab du gabarit télécharge l'artefact de verdicts de la branche principale avec
  `CI_JOB_TOKEN` : jamais joué sur un vrai GitLab.
- `node .githooks/pr-watch.mjs` suit la CI de la branche principale et écrit la preuve
  (`.drwil/evidence/main-ci.json` (si présent)). Éprouvé une fois en vrai le 2026-11-06 sur la PR #366
  (commit de fusion `4acc3d1`, CI verte, preuve écrite) ; le cas rouge n'a jamais été joué en vrai.
- Hors GitHub, le verrou de QUA-251 ne s'applique pas (décision du demandeur du 2026-11-06) : la
  file passe et le dit, la CI de la branche principale se vérifie à la main.

## Questions à trancher

- [IA] Mesurer une PR de doc après la fusion de ce chantier (durée de l'ouverture à la fusion, contrôles repris).
- [IA] Éprouver la preuve de CI de la branche principale sur une vraie fusion rouge (la verte l'est : PR #366).
- [décision] Éprouver la reprise GitLab par `CI_JOB_TOKEN` sur un vrai GitLab (projet d'essai à choisir).
- [décision] Parité GitLab de `pr-watch` et `merge-auto` (élargi par le demandeur le 2026-11-06) :
  aujourd'hui les deux ne parlent qu'à GitHub (`gh`). Porter sur les merge requests GitLab le suivi
  de la CI, la fusion programmée, le suivi de la CI de la branche principale après la fusion et
  l'issue d'alerte (déjà ouverte par le job `alert-if-ci-broken` du gabarit GitLab), pour que la
  fusion automatique et le verrou de QUA-251 y valent aussi (`glab` ou API v4, à trancher).

## Suite livrée (2026-11-09)

Le chantier « les contrôles lents sont accélérés par la CI livrée » (voir `docs/projects/journal.md`) a ajouté le
réglage `shards: N` (tranches parallèles GitHub et GitLab) et la reprise d'un verdict de PR d'un push à l'autre
(QUA-288 à QUA-291), prouvés par un projet d'essai synthétique. Restent ouverts ici : la mesure réelle d'un gain
(sur un projet adoptant) et l'essai sur un vrai GitLab.
