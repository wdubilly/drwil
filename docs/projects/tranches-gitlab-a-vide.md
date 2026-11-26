# Projet : la CI GitLab ne démarre pas de job de tranche inutile

**Statut** : cadré le 2026-11-26 — P1 se tranche après l'essai du lot 1.
**Risque** : HIGH
**Maturité** : à affiner

<!-- scope
files:
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - packages/drwil/test/ci-parite.test.mjs
  - packages/drwil/test/ci-shards.test.mjs
  - packages/drwil/test/kit-ci.test.mjs
  - packages/drwil/test/montee-de-version.test.mjs
  - packages/drwil/templates/common/base/.githooks/engine-shards.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/engine-shards.mjs
  - .githooks/run-checks.mjs
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Le job `shards` de la CI GitLab livrée déclare `parallel: 16`, fixe (commentaire du fichier : `parallel:` est statique
dans GitLab). Sans contrôle découpé, les 16 jobs démarrent quand même. Rapport d'un projet adoptant, avec un runner
qui joue un job à la fois : environ 10 s chacun, environ 3 minutes entre `plan` et `checks` (non mesuré ici).

## Critères d'acceptation

- Sans contrôle découpé, le pipeline GitLab livré ne démarre pas 16 jobs à vide — `QUA-288`
- Une configuration qui déclare plus de tranches que le pipeline n'en démarre fait échouer le pipeline : aucun
  contrôle découpé n'est sauté en silence — `QUA-288`
- Un nombre de tranches fixé à chaque CI (`shards: "auto"`) reste entièrement joué — `QUA-321`

## Contrats modifiés

Aucun validé : dépend du mécanisme (point P1).

## 2. Hors périmètre

- La CI GitHub, dont la matrice est déjà calculée.

## 3. Contraintes

- Le découpage divise le travail, pas l'exigence (QUA-289).
- Le fichier de CI livré garde ses zones du projet (QUA-283).
- Après `preuve-gitlab-non-reprise` : même fichier.

## 4. Décisions

- 2026-11-26 : dans la 0.11.3.
- 2026-11-26 : les mécanismes sont essayés avant de trancher P1.

## 5. Points à trancher

- [décision] P1 : le mécanisme, après essai — pipeline enfant généré par `plan`, ou `parallel:` écrit par
  `drwil init` selon la configuration avec un contrôle d'accord. Aucun n'est essayé.

## 6. Increments

- **Lot 1 — essai des mécanismes** [IA, puis humain pour le pipeline réel] : comparer et faire trancher P1.
- **Lot 2 — réalisation** [IA] : tests en échec d'abord.

## 7. Reprise

- **Dernier état** (2026-11-26) : cadré, P1 ouvert.
- **Prochaine étape** : [IA] lot 1.
