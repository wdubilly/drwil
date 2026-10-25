# Projet : le pre-push juge la branche poussée, la note de recette arrive enfin

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/pre-push
  - .githooks/pre-push
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/templates/common/optional/create-release/recette-note.mjs
  - .githooks/recette-note.mjs
  - .githooks/recette-note.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/recettes/v0.8.0.md
  - docs/intentions/notes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le contrôle `main-branch` de QUA-017 (pas de travail direct sur la branche
principale) juge la **branche courante**, pas la référence réellement
poussée. Depuis `master`, le push de la branche `recette/vX.Y.Z` par
`.githooks/recette-note.mjs` (lancé par `.githooks/create-release.mjs`) est donc
refusé alors qu'il ne touche pas `master`. Résultat : la note de recette
n'arrive jamais dans le dépôt. C'est arrivé pour la v0.7.0 (2026-10-22, noté
dans `docs/intentions/notes.md`) et de nouveau pour la v0.8.0 (2026-10-25).
L'échec est en plus muet : `.githooks/recette-note.mjs` dit « branche non créée ou non
poussée » sans montrer la sortie de git.

## Critères d'acceptation

- Au push, le contrôle de la branche principale juge les références
  distantes poussées (entrée standard du hook) : pousser `recette/vX.Y.Z`
  depuis `master` passe, pousser vers `refs/heads/master` (ou `main`) reste
  refusé, d'où qu'on pousse — `QUA-017`
- Quand la note de recette ne peut pas être poussée, `.githooks/recette-note.mjs`
  affiche la sortie de git (raison du refus) avec la commande de
  rattrapage — `QUA-080`
- La note de la v0.8.0 est dans le dépôt, sous docs/recettes/v0.8.0.md,
  arrivée par sa PR dédiée — `QUA-079`

## Contrats modifiés

- `QUA-017` — ancien critère : « Commiter ou pousser directement sur la
  branche principale est refusé » jugé, au push, sur la branche courante —
  raison : au push, seule la référence distante poussée dit si la branche
  principale est touchée ; la règle gagne la précision « au push, la
  référence distante poussée est jugée, pas la branche courante » (validé le
  2026-10-25)

## 2. Hors périmètre

- Recréer la note de la v0.7.0 : son fichier temporaire est perdu ; la
  régénérer pour une version passée est une autre question (point 5).
- Tout autre changement du module de release (allègement de la release,
  noté le 2026-10-21 dans `docs/intentions/notes.md`).
- Le contrôle au commit (`pre-commit`) : il reste jugé sur la branche
  courante, c'est bien là que le commit atterrit.

## 3. Contraintes

- Gabarit d'abord (`packages/drwil/templates/`), copies du dépôt ensuite
  (`npm run installer-depot`), contrôle `miroirs-gabarit` vert.
- Le hook reste du `sh` portable (Git for Windows le lance par son `sh`).
- Les cas déjà couverts restent : push de tags seuls, suppression d'une
  branche distante, jamais en CI.

## 4. Décisions

- 2026-10-25 — Corriger le hook avant de rattraper la note v0.8.0 (choix du
  demandeur, plutôt qu'un rattrapage lancé depuis une autre branche).

## 5. Points à trancher

(aucun pour ce chantier ; la note v0.7.0 relève d'une intention à écrire à
la clôture)

## 6. Increments

- **Lot 1 — le pre-push juge la référence poussée** [IA] : `pre-push` passe
  au moteur les références distantes poussées ; `main-branch` refuse si l'une
  d'elles est la branche principale, accepte sinon, même depuis `master` ;
  tests sur un vrai dépôt git temporaire (push de `recette/x` depuis
  `master` accepté, push vers `master` refusé depuis une autre branche).
  Critère de sortie : tests verts, `QUA-017` à jour.
- **Lot 2 — l'échec de la note dit pourquoi** [IA] : `.githooks/recette-note.mjs`
  montre la sortie de git en cas d'échec. Critère de sortie : test vert.
- **Lot 3 — la note v0.8.0** [IA] : après la fusion, rattraper avec
  `node .githooks/recette-note.mjs v0.8.0 <note>` depuis `master`. La note générée le 2026-10-25 est hors du dépôt, en
  /tmp/recette-note-OuCtKE/v0.8.0.md (copie :
  /tmp/claude-1000/-home-wdubilly-projects-drwil/ab275cb7-fc10-48ff-92b2-8c3a5df83dcd/scratchpad/recette-v0.8.0.md) ;
  si `/tmp` a été vidé, la reconstruire depuis la release v0.8.0 (empreinte
  du tarball attaché). Critère de sortie : PR de la note fusionnée.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré ; release v0.8.0 publiée sans sa
  note.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
