# Projet : travailler avec des branches et des merge/pull requests

**Statut** (2026-10-05) : fait — lots 1, 2 et 3 livrés, 41/41 tests verts,
`check-docs`/`run-checks` verts sur drwil.

<!-- cadrage
fichiers:
  - docs/recettes/travailler-en-branche.md
  - packages/drwil/templates/fr/base/docs/recettes/travailler-en-branche.md
  - packages/drwil/templates/en/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/fr/ci/github/.github/pull_request_template.md
  - packages/drwil/templates/fr/ci/gitlab/.gitlab/merge_request_templates/Default.md
  - packages/drwil/templates/en/ci/github/.github/pull_request_template.md
  - packages/drwil/templates/en/ci/gitlab/.gitlab/merge_request_templates/Default.md
  - packages/drwil/src/index.ts
  - packages/drwil/templates/fr/base/AGENTS.md
  - packages/drwil/templates/en/base/AGENTS.md
  - packages/drwil/templates/fr/base/README.md
  - packages/drwil/templates/en/base/README.md
  - AGENTS.md
  - README.md
-->
Pas d'équivalent EN à la racine de drwil : le dépôt dogfood en FR
uniquement (pas de dossier docs/recipes/ installé ici) ; l'EN vit seulement
dans le template `en/base/`.
## 1. Besoin

Voir `docs/intentions/travailler-avec-branches-et-mr.md` (Besoin, Existant,
Décisions prises). En résumé : documenter le geste « ouvrir une branche à
partir d'une fiche, clôturer via une MR » et livrer des gabarits de
pull/merge request, sans toucher aux contrôles existants (déjà
agnostiques à la branche).

## 2. Hors périmètre

- Contrôle automatique du nom de branche ou de la présence d'une MR avant
  de committer (convention documentée uniquement).
- Automatisation d'ouverture de MR via l'API GitHub/GitLab.
- Changement de QUA-015 (l'avertissement non bloquant existant suffit).

## 3. Contraintes

- Symétrie FR/EN (test « même nombre de fichiers livrés en français et en
  anglais »).
- Les gabarits de PR/MR contiennent de la prose (traduite), donc vivent
  dans `templates/fr/ci/<ci>/` et `templates/en/ci/<ci>/` — pas dans
  `templates/common/ci/` (réservé au mécanique, sans prose : vérifié par
  `grep` qu'aucun fichier de `common/` ne contient d'accent français).
  Nécessite un appel `copyTree` supplémentaire dans `scaffold()`
  (`packages/drwil/src/index.ts`), sur le modèle de `common/tools/<tool>`
  + `langDir/tools/<tool>` déjà en place.
- `.githooks/check-docs.mjs` et les tests du kit doivent rester verts.

## 4. Décisions

- (2026-10-05) Reprend les 5 décisions de l'intention associée telles
  quelles (nommage `chantier/<slug>`, Statut "fait" seulement après
  fusion, recette dédiée FR+EN, gabarits GitHub+GitLab, aucun impact sur
  le bloc cadrage).

## 5. Points à trancher

(aucun — les décisions de l'intention couvrent le périmètre)

## 6. Lots

- **Lot 1 — recette FR/EN** [IA] : créer
  `docs/recettes/travailler-en-branche.md` (à créer) (racine, dogfooding) et
  `packages/drwil/templates/fr/base/docs/recettes/travailler-en-branche.md` (à créer)
  (template), + équivalent EN uniquement côté template (le dépôt drwil ne
  dogfood qu'en FR) :
  `packages/drwil/templates/en/base/docs/recipes/working-with-branches.md` (à créer).
  Critère de sortie : `.githooks/check-docs.mjs` vert, symétrie FR/EN
  testée.
- **Lot 2 — gabarits de pull/merge request** [IA] : ajouter les gabarits
  dans `templates/fr/ci/<ci>/` et `templates/en/ci/<ci>/` (nouveau,
  symétrique à `templates/*/tools/<tool>`), + un appel `copyTree`
  supplémentaire dans `scaffold()` pour les copier, + report à la racine
  de drwil (dogfooding, `ci: github`). Critère de sortie : test du kit
  vérifiant la présence du gabarit après `init` avec `ci: github` et
  `ci: gitlab`, dans les deux langues.
- **Lot 3 — indexation** [IA] : ajouter une ligne pour la nouvelle
  recette dans les tableaux existants d'`AGENTS.md`/`README.md` (FR/EN,
  templates + racine), même mécanique que
  `docs/projets/informer-capacites-drwil.md`.

## 7. Reprise

- **Dernier état** (2026-10-05) : 3 lots livrés — recette
  `docs/recettes/travailler-en-branche.md` (FR, racine + template) et
  `packages/drwil/templates/en/base/docs/recipes/working-with-branches.md`
  (EN, template seul, pas de dogfooding EN à la racine) ; gabarits de
  pull/merge request sous `templates/fr/ci/<ci>/` et
  `templates/en/ci/<ci>/` (nouveau, copiés par un appel `copyTree`
  supplémentaire dans `scaffold()`), reportés à la racine de drwil
  (`.github/pull_request_template.md`) ; indexation dans les 2
  `AGENTS.md` et 2 `README.md` des templates + racine. 41/41 tests
  verts, `.githooks/check-docs.mjs`/`.githooks/run-checks.mjs` verts.
- **Travail non commité** : tout ce qui précède, à committer.
- **Prochaine étape** : aucune (chantier livré).
