# Projet : la CI GitLab dit pourquoi une preuve ou des verdicts ne sont pas repris

**Statut** : cadré le 2026-11-26 (réduit à l'affichage de la cause).
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - packages/drwil/test/ci-parite.test.mjs
  - packages/drwil/test/ci-parite-bash.test.mjs
  - packages/drwil/test/kit-ci.test.mjs
  - docs/intentions/correctif-preuve-gitlab.md
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Rapport d'un projet adoptant (drwil 0.11.2, gitlab.com, runner auto-hébergé), non reproduit ici : l'arbre prouvé par
le pipeline de la branche était égal à celui du commit de fusion, le job `plan` a dit « Tree not proven » et `checks`
a duré 961 s sur la branche principale. Dans le pipeline de branche précédent, le téléchargement des verdicts de la
branche principale par le même appel avait répondu 404.

Lu dans `packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml` le 2026-11-26 : le `curl` du job `plan` écrit avec `2>/dev/null` ; refus, fichier absent et
arbre différent donnent le même message.

**Cause : non établie.** Piste : l'appel de téléchargement par nom de branche avec le jeton du job. La documentation
GitLab (`docs.gitlab.com/api/job_artifacts/`, lue le 2026-11-26) marque le paramètre `job_token` « Premium and
Ultimate only » ; elle ne dit pas si cela vaut pour l'en-tête `JOB-TOKEN`, et un 404 peut signaler un refus. Les
tests du paquet jouent un `curl` factice : ils ne prouvent pas que GitLab accepte l'appel. Si la piste tient, la
reprise des verdicts de la branche principale (QUA-250) est touchée aussi.

## Critères d'acceptation

- Quand la preuve ou les verdicts ne sont pas repris (job `plan` et job `checks`), le journal du job en dit la raison — statut HTTP, ou les deux arbres comparés — sans jamais écrire de jeton — `QUA-296`
- Au moindre doute, tout est rejoué comme aujourd'hui — `QUA-296`

## Contrats modifiés

- `QUA-296` — ancien critère : « arbres différents : tout est rejoué, rien n'est repris de la PR », sans exigence sur la raison affichée — raison : un refus, un fichier absent et un arbre différent doivent se distinguer dans le journal du job ; le saut et le rejeu ne changent pas (validé par le demandeur le 2026-11-26)

## 2. Hors périmètre

- La CI GitHub.
- Le correctif de la reprise : `docs/intentions/correctif-preuve-gitlab.md`, à trancher après la mesure.

## 3. Contraintes

- La reprise d'une preuve permet de sauter des contrôles : ne rien élargir de ce qui peut en écrire une (QUA-019).

## 4. Décisions

- 2026-11-26 : en tête de la 0.11.3.
- 2026-11-26 : le correctif se décide après la mesure ; sans essai réel à temps, la 0.11.3 est publiée avec le seul
  affichage et annonce la limite.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — raison affichée** [IA] : tests en échec d'abord ; messages distincts dans `plan` et `checks` ; limite
  annoncée au changelog. Critère de sortie : `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-26) : cadrage terminé, cause non établie.
- **Prochaine étape** : [humain] `/drwil-start`.
