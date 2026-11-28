# Projet : la PR de mise à jour de drwil valide ses tranches

**Statut** : cadré le 2026-11-28.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/engine-shards.mjs
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/engine-texts.mjs
  - packages/drwil/templates/common/base/.githooks/fingerprints.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-shards.mjs
  - packages/drwil/templates/common/base/.githooks/base-checks.mjs
  - packages/drwil/templates/common/base/.githooks/base-overlay.mjs
  - .githooks/engine-shards.mjs
  - .githooks/engine.mjs
  - .githooks/engine-texts.mjs
  - .githooks/fingerprints.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks-shards.mjs
  - .githooks/base-checks.mjs
  - .githooks/base-overlay.mjs
  - .githooks/engine-shards.test.mjs
  - .githooks/run-checks-shards.test.mjs
  - .githooks/base-checks.test.mjs
  - packages/drwil/test/ci-shards.test.mjs
  - packages/drwil/test/montee-de-version.test.mjs
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Un projet adoptant avec un contrôle découpé (`shards`) ne peut pas monter de la 0.11.1 à la 0.11.2 : toutes ses
tranches sont vertes, puis l'agrégation les refuse (« jouée sur d'autres fichiers ou une autre déclaration du
contrôle »). Signalé le 2026-11-28 : échec vu sur deux essais de CI, écart d'empreintes reproduit sur un clone par le
projet adoptant.

Cause lue dans le code le 2026-11-28, non rejouée dans ce dépôt : sur une PR, les tranches sont jouées par
`.githooks/base-checks.mjs` avec les hooks de la branche principale. La première agrégation tourne avec les hooks de la PR.
L'empreinte propre du contrôle (`controlFingerprints`) inclut `.githooks/fingerprints.mjs` et les modules du moteur : dès que le
moteur change, `aggregateShards` refuse chaque tranche. Relancer la CI n'y change rien. La configuration de drwil ne
déclare aucun contrôle découpé : son propre usage ne passe pas par ce cas (déduit).

## Critères d'acceptation

- Sur une PR qui change le moteur, des tranches jouées avec les hooks de la branche principale, version 0.11.1 publiée comprise, sont acceptées par la première agrégation — `QUA-288`
- Une tranche d'un autre commit, jouée sur d'autres fichiers ou une autre déclaration, absente, doublée ou en échec reste refusée — `QUA-288`
- Un hook affaibli ou supprimé par la PR fait toujours échouer le rejeu avec les hooks de la branche principale — `QUA-113`

## Contrats modifiés

- `QUA-288` — ancien critère : « une tranche absente, dupliquée, en échec, d'un autre commit ou d'une autre empreinte […] fait échouer l'agrégation » — raison : sur une PR qui change le moteur, l'agrégation accepte aussi l'empreinte calculée avec les hooks de la branche principale sur les mêmes fichiers ; un autre commit, d'autres fichiers ou une autre déclaration restent refusés (validé par le demandeur le 2026-11-28)

## 2. Hors périmètre

- Les clés du projet dans le fichier de CI : `docs/projects/ci-concurrency-gardee.md`.
- La cause du plantage intermittent de Node vu par le projet adoptant, non établie.
- Les tests hors délai sur le poste du projet adoptant.

## 3. Contraintes

- Sur la PR de mise à jour, les tranches sont jouées par l'ancien moteur : le correctif agit du côté de la PR et lit
  les verdicts écrits par une version antérieure, qui ne portent que le champ `control`.
- Le correctif passe par les hooks, pas par le seul workflow : un projet dont le workflow n'est pas mis à jour doit
  aussi en profiter.
- Au moindre doute (branche principale introuvable, empreinte incalculable), l'agrégation refuse (QUA-013).
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-28 : QUA-288 est modifié (ci-dessus). Écarté : un correctif par le seul workflow.
- 2026-11-28 : en tête de la 0.11.3, resserrée pour être publiée vite ; ensuite placée après la release en un geste (`docs/projects/release-en-un-geste.md`).
- 2026-11-28 : pas de contournement chez l'adoptant (garder les hooks de la PR affaiblirait le rejeu).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — tranches acceptées à la montée** [IA] : reproduire d'abord sur un projet d'essai (hooks de la 0.11.1 lus
  dans son étiquette git, contrôle découpé, montée par le tarball de la branche), test en échec, puis correctif.
  Recette réelle : montée sur des copies d'adoptants (`outils/recette-adoptant.mjs`). Critère de sortie :
  `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-28) : cadrage terminé. Signalement d'origine hors du dépôt, sur le poste du demandeur
  (fichier signalement-drwil-0.11.2.md de son dossier personnel).
- **Prochaine étape** : [humain] `/drwil-start`.
