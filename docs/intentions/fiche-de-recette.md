# Intention : une fiche de recette par version, pour une équipe hors dépôt

**Statut** : proposée le 2026-10-18 par le demandeur — PR séparée de la
clôture allégée (`docs/projects/cloture-allegee.md`), à cadrer ensuite.

## Besoin

Une équipe de recette, qui ne lit pas le dépôt, valide chaque version.
Elle doit savoir en quelques minutes ce qu'elle a à valider, et ce que la
non-régression automatique a déjà prouvé, pour ne pas tout retester.

## Pistes (recommandation de l'agent, 2026-10-18)

- **Générée, jamais écrite à la main** : écrite par l'agent, elle
  dériverait et ne serait que sa parole. Une commande la produit à partir
  des sources existantes.
- **Une par version** (du tag précédent au nouveau), jointe à la release
  GitHub à côté du tarball, lisible sans Git.
- **En tête, « à valider »** : 5 à 10 points, chacun avec quoi regarder et
  comment — critères `[humain]`, attestations à refaire, ce qui n'a pas été
  essayé en réel, limites connues.
- **En dessous, la non-régression** : verdict de `drwil verify`, nombre de
  contrats prouvés par un test, leurs ID et libellés, OS testés par la CI.

## Relier chaque point à son chantier (vérifié le 2026-10-18)

La chaîne existe : chaque commit d'un chantier porte le trailer
`Drwil-Brief` (vérifié sur `v0.6.3..v0.6.4` : tous les commits de chantier
le portent) ; chaque chantier a sa PR et son entrée de journal. La fiche
étant supprimée à la clôture, le lien durable pour l'équipe est la PR
(lien GitHub) et l'entrée du journal ; chaque point porte un identifiant
stable (par exemple version et numéro de point) que l'équipe cite dans son
retour.

## Existant

- `docs/intentions/vue-de-relecture.md` : la même question (« qu'est-ce
  que je dois valider ? ») pour une PR.
- `docs/intentions/acceptation-par-critere.md` : enregistrer une décision
  humaine critère par critère.
- `drwil verify --evidence`, le journal, `.drwil/usage.jsonl`.

## Questions à trancher

- [décision] Format : Markdown joint à la release, HTML statique (comme le
  tableau de bord), ou les deux ?
- [décision] Retour de l'équipe : comment un point refusé revient-il dans
  le dépôt (intention, défaut à corriger, attestation refusée) ?
- [décision] Livrée à tout projet (QUA-018, dépôt ou livrable), ou d'abord
  éprouvée dans ce dépôt ?
