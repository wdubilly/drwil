# Intention : la lecture de la CI d'une MR GitLab et la CI GitLab du gabarit, éprouvées en réel

**Statut** : proposée le 2026-11-07 — limite du chantier « un contrôle lent se joue une seule fois, en CI » (journal du 2026-11-07).

## Besoin

`.githooks/pr-watch.mjs` et la clôture (`.githooks/close-checks.mjs`) lisent la CI d'une MR GitLab par `glab` (QUA-262), et la CI GitLab du gabarit ne lance qu'une pipeline par push (QUA-263). Tout n'est prouvé que par des réponses de forge simulées et un faux `glab` : aucun essai sur un vrai projet GitLab.

## Existant (relevé le 2026-11-07)

- MR lue par `glab mr view --output json` (champ `head_pipeline`), jobs par `glab api projects/:id/pipelines/<id>/jobs` : le remplacement de `:id` et la forme réelle de `head_pipeline` ne sont pas vérifiés.
- `packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml` : pipelines de MR refusées, une pipeline par push de branche.

## Questions à trancher

- [humain] Un essai réel sur un projet GitLab (MR ouverte, contrôle `["ci"]`, CI verte puis rouge) : quand, et sur quel projet ?
- [décision] Un défaut vu à l'essai ouvre une fiche de correction ; faut-il un essai avant la prochaine publication ?
