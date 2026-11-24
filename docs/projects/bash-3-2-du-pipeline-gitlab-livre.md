# Projet : le script du pipeline GitLab livré s'exécute sous bash 3.2 (macOS)

**Statut** : cadré le 2026-11-24.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - packages/drwil/test/ci-parite.test.mjs
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le 2026-11-24, le workflow `.github/workflows/ia-first.yml` lancé à la main sur `master` (commit `f4377ff`, run 45436393675), qui rejoue tous les
tests, est rouge sous macOS : trois tests de `packages/drwil/test/ci-parite.test.mjs` échouent (QUA-296, QUA-288, QUA-321),
tous sur `bash: -c: line 2: syntax error near unexpected token ';;'`. La CI d'une PR ne l'avait pas vu : elle reprend des
verdicts et saute ces tests quand l'arbre est prouvé. Sans CI verte sur macOS et Windows, `.githooks/create-release.mjs` refuse la 0.11.2
(`release.requiredOs`).

Cause probable (à confirmer en reproduisant sous bash 3.2) : la ligne 37 du pipeline GitLab livré met un `case … ;; esac`
dans une substitution `$( { … } )`, dont les motifs `*" $sha "*)` ont une parenthèse fermante non appariée ; bash 3.2, celui
de macOS, compte mal les parenthèses dans `$( )` ; bash 5 de Linux les accepte. Le job Windows du même run a été annulé : à
relire une fois le macOS réparé.

## Critères d'acceptation

- Le script `plan` du pipeline GitLab livré s'exécute sous bash 3.2 : aucune construction `case` dont les motifs sont non
  parenthésés dans une substitution `$( )` — `QUA-296`
- Les trois tests de `packages/drwil/test/ci-parite.test.mjs` (QUA-296, QUA-288, QUA-321) passent sous macOS — `QUA-296`
- Le comportement du pipeline ne change pas : mêmes branches retenues, même arbre prouvé, même sortie sous bash 5
  (les tests de parité existants passent sous Linux sans modification de leurs attentes) — `QUA-296`
- Le workflow `.github/workflows/ia-first.yml` lancé sur `master` est vert sous les trois systèmes exigés avant la release — `QUA-296`

## Contrats modifiés

- `QUA-296` — le script GitLab livré est réécrit sans `case` non parenthésé dans `$( )`, comportement identique
  (validé par le demandeur le 2026-11-24)

## 2. Hors périmètre

- La mise à jour 0.11.2 d'un projet à garde ancien (fiche `maj-0-11-2-passe-la-ci-de-l-adoptant`).
- Un second contrôle d'exécution sous macOS en CI : le job `kit-tests (macos-latest)` existe déjà et a trouvé ce défaut dès
  qu'il n'a plus été sauté.
- La CI GitHub livrée : aucun `case` dans un `$( )` n'y est relevé (à vérifier au lot 1 par recherche).

## 3. Contraintes

- Reproduire d'abord sous un bash 3.2 (conteneur ou le runner macOS) : le test échoue contre le script actuel.
- Le correctif le plus petit d'abord : motifs parenthésés `(*" $sha "*)` ; sinon sortir le `case` de la substitution.
- Un test statique côté Linux garde la règle (QUA-296) : un `case` non parenthésé dans un `$( )` du pipeline livré est refusé.
- Le CHANGELOG (en anglais) dit le correctif. On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- D1 (2026-11-24, demandeur : « il faut corriger ») : défaut corrigé avant la publication de la 0.11.2.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — le script** [IA] : reproduction, correctif, test statique, contrat `QUA-296`, ligne « Unreleased » du changelog.
- **Lot 2 — CI trois systèmes** [humain] : `gh workflow run ia-first.yml --ref master`, attendre le vert, puis la release.

## 7. Reprise

- **Dernier état** (2026-11-24) : cadré, rien commencé. Preuve de départ : run 45436393675, job `kit-tests (macos-latest)`.
- **Prochaine étape** : le lot 1.
