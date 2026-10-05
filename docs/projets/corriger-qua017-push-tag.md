# Projet : corriger le faux positif QUA-017 sur un push de tag

**Statut** : cadré le 2026-10-05 — fait (lot 1) le 2026-10-05.

<!-- cadrage
fichiers:
  - .githooks/pre-push
  - .githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/pre-push
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/test/kit.test.mjs
-->

## 1. Besoin

`node .githooks/creer-release.mjs` (recette `docs/recettes/creer-une-release.md`)
pose un tag Git sur le commit courant de `master` puis le pousse
(`git push origin <tag>`). Ce push est systématiquement refusé par le hook
`pre-push`, qui relance `.githooks/run-checks.mjs` en entier — y compris QUA-017
(« pas de travail direct sur la branche principale »), lequel ne regarde que
la branche courante (`git symbolic-ref --short HEAD`) sans tenir compte de ce
qui est réellement poussé. Un push de tag ne modifie jamais `master` : c'est
un faux positif qui bloque toute release depuis ce dépôt.

Constaté le 2026-10-05 : `node .githooks/creer-release.mjs` échoue à l'étape
`git push origin v0.1.0` (tag créé localement, jamais poussé, aucune release
GitHub créée). Aucun contournement (`--no-verify`) n'a été accepté par le
demandeur : la correction doit être propre, pas une solution de rechange.

## 2. Hors périmètre

- Ne touche pas à la logique de détection de version/bump de
  `.githooks/creer-release.mjs` (déjà testée, hors sujet ici).
- Ne modifie pas le comportement de QUA-017 pour un vrai push de commits sur
  `master`/`main` : ce cas doit continuer à être bloqué exactement comme
  aujourd'hui.
- Ne traite pas d'éventuels autres faux positifs de `pre-push` non identifiés
  à ce jour (ouvrir une fiche séparée si un autre cas apparaît).

## 3. Contraintes

- Le hook `pre-push` reçoit normalement sur son entrée standard une ligne par
  référence poussée : `<local ref> <local sha1> <remote ref> <remote sha1>`
  (protocole standard Git pour `pre-push`) — c'est la seule information fiable
  pour distinguer « je pousse un tag » de « je pousse `master` ».
- `.githooks/run-checks.mjs` est un point d'entrée partagé (pre-commit, pre-push, CI) :
  toute modification doit rester rétrocompatible pour les deux autres appels.
- Garder la preuve par test (pas seulement une relecture) : simuler un
  pre-push qui ne pousse qu'un tag, et un autre qui pousse `master`, doit
  donner deux résultats différents.

## 4. Décisions

- Seul le contrôle QUA-017 est exempté sur un push ne contenant que des tags ;
  les autres contrôles (secrets, doc, tests…) continuent de tourner en entier
  via `.githooks/run-checks.mjs` (point à trancher 1 : option recommandée retenue).
- Un push mixte (au moins une référence qui n'est pas un tag, ex. tag +
  branche) reste bloqué par QUA-017 comme avant, par prudence (point à
  trancher 2 : option « bloquer par prudence » retenue).
- Windows : non vérifié manuellement sur un poste Windows, mais couvert par le
  job `kit-tests (windows-latest)` de la CI, qui invoque le push réel (donc le
  `sh` embarqué de Git for Windows) via le nouveau test (point à trancher 3 :
  preuve indirecte par CI, pas de vérification humaine locale supplémentaire).

## 5. Points à trancher

(tranchés — voir section 4)

## 6. Lots

- **Lot 1 — lire les références poussées et exempter un push de tag pur**
  [IA] : dans `.githooks/pre-push`, lire l'entrée standard (protocole
  pre-push standard), détecter si toutes les références locales poussées
  commencent par `refs/tags/` ; si oui, ne pas faire échouer le push sur
  QUA-017 (détail exact selon la décision du point 1 ci-dessus). Ajouter un
  test qui simule les deux cas (tag seul / branche `master`). Critère de
  sortie : `node .githooks/creer-release.mjs` pousse effectivement le tag
  sans erreur sur ce dépôt ; un push direct de `master` reste refusé comme
  avant (non-régression prouvée par test). **Fait** : `.githooks/pre-push`
  lit l'entrée standard et positionne `DRWIL_PUSH_TAGS_ONLY=1` quand seules
  des références `refs/tags/*` sont poussées ; `.githooks/run-checks.mjs`
  exempte QUA-017 uniquement dans ce cas. Même correctif recopié dans
  `packages/drwil/templates/common/base/.githooks/` (livrable). Test ajouté
  dans `packages/drwil/test/kit.test.mjs` (push réel vers un dépôt bare
  local : tag seul passe, `master` seul et le mélange tag+`master` restent
  refusés).

## 7. Reprise

- **Dernier état** (2026-10-05) : lot 1 fait et vérifié (`node
  .githooks/check-docs.mjs` 0 erreur, `node .githooks/run-checks.mjs` et la
  suite `packages/drwil/test/kit.test.mjs` verts, 55 tests). Le tag local
  `v0.1.0` (posé lors d'une tentative de release précédente) n'a toujours pas
  été poussé ni republié : à reprendre avec `/drwil-release` ou
  `node .githooks/creer-release.mjs` une fois ce correctif mergé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] relancer la création de release (le tag
  `v0.1.0` existant localement peut être repoussé directement, ou
  `.githooks/creer-release.mjs` relancé).
