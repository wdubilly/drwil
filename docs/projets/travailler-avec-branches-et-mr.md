# Projet : travailler avec des branches et des merge/pull requests

**Statut** (2026-10-05) : en cours — lots 1, 2 et 3 livrés, lot 4
(contrat QUA-017) en cours.

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
  - .githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - docs/contrats.md
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

Extension (2026-10-05) : la convention devient un contrat vérifié
mécaniquement (QUA-017) — voir décision révisée dans l'intention.

## 2. Hors périmètre

- Contrôle automatique du nom de branche (`chantier/<slug>`) : reste une
  convention documentée, non vérifiée.
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
- Lot 4 : le contrôle QUA-017 ne tourne jamais en CI (`process.env.CI`),
  sinon un merge légitime sur la branche principale casserait la CI
  rétroactivement. Le premier commit d'un dépôt fraîchement initialisé
  reste toléré (bootstrap), sinon `drwil init` ne pourrait jamais faire
  de premier commit.

## 4. Décisions

- (2026-10-05) Reprend les 5 décisions de l'intention associée telles
  quelles (nommage `chantier/<slug>`, Statut "fait" seulement après
  fusion, recette dédiée FR+EN, gabarits GitHub+GitLab, aucun impact sur
  le bloc cadrage).
- (2026-10-05) Lot 4 : la décision initiale « pas de contrôle bloquant »
  est révisée à la demande explicite de l'utilisateur. Nouveau contrat
  QUA-017 : bloquant, portée commit+push, appliqué immédiatement sur
  drwil, sans porte de sortie configurable, sauf le tout premier commit
  d'un dépôt (bootstrap) et sauf en CI (contrainte technique, pas un
  choix — voir section 3).

## 5. Points à trancher

(aucun — les décisions ci-dessus couvrent le périmètre du lot 4)

## 6. Lots

- **Lot 1 — recette FR/EN** [IA] : fait.
- **Lot 2 — gabarits de pull/merge request** [IA] : fait.
- **Lot 3 — indexation** [IA] : fait.
- **Lot 4 — contrat QUA-017** [IA] : ajouter l'entrée `docs/contrats.md`,
  implémenter le contrôle dans `.githooks/run-checks.mjs` (+ template
  synchronisé `packages/drwil/templates/common/base/.githooks/run-checks.mjs`),
  mettre à jour la recette (section « Ce que le kit vérifie »), ajouter un
  test du kit couvrant le blocage/la tolérance. Critère de sortie :
  41+/41+ tests verts, `.githooks/check-docs.mjs`/`.githooks/run-checks.mjs` verts,
  travail fait sur une branche (`chantier/travailler-avec-branches-et-mr`)
  fusionnée via une pull request réelle (test en conditions réelles de la
  recette elle-même).

## 7. Reprise

- **Dernier état** (2026-10-05) : lots 1-3 livrés et committés
  (`6b35c7b`, poussé directement sur master — avant l'existence de
  QUA-017). Lot 4 fait sur la branche
  `chantier/travailler-avec-branches-et-mr` : contrat QUA-017 documenté
  (`docs/contrats.md` + catalogues templates FR/EN), implémenté dans
  `.githooks/run-checks.mjs` (+ template synchronisé), recette mise à
  jour (section « Ce que le kit vérifie »), test dédié ajouté
  (`packages/drwil/test/kit.test.mjs`), 2 tests QUA-016 adaptés (commits
  de test déplacés sur une branche, puisqu'ils enchaînaient plusieurs
  commits directs sur master — ce que QUA-017 interdit désormais). 42/42
  tests verts, `.githooks/check-docs.mjs`/`.githooks/run-checks.mjs`
  verts sur drwil.
- **Travail non commité** : voir le bloc cadrage ci-dessus, à committer
  sur la branche (le dépôt drwil a déjà plus d'un commit sur master,
  donc QUA-017 interdit désormais un commit direct dessus — ce chantier
  est le premier test réel de la recette qu'il décrit).
- **Prochaine étape** : committer sur la branche, pousser, ouvrir une
  pull request réelle vers master, la fusionner, puis repasser le
  Statut de cette fiche à "fait" et cocher sa case dans l'index.
