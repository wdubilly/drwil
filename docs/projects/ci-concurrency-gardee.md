# Projet : une clé concurrency du projet ne bloque plus la mise à jour de la CI

**Statut** : cadré le 2026-11-28.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/ci-zone.ts
  - packages/drwil/src/ci-zone-move.ts
  - packages/drwil/src/ci-zone-keys.ts
  - packages/drwil/src/render.ts
  - packages/drwil/src/messages*.ts
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - packages/drwil/test/montee-de-version.test.mjs
  - packages/drwil/test/kit-ci.test.mjs
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Un projet qui a ajouté une clé `concurrency` de premier niveau au workflow GitHub ne reçoit plus ses corrections :
`drwil init` met à jour le moteur et laisse tout le fichier tel quel. Son message parle d'une clé définie « par le
projet et par le kit », alors que le gabarit n'a pas `concurrency`. Signalé le 2026-11-28 par un projet adoptant.

Cause lue dans le code le 2026-11-28, non rejouée sur un projet d'essai : `placeProject`
(`packages/drwil/src/ci-zone-move.ts`) met en conflit toute clé GitHub de premier niveau absente du gabarit, hors
`jobs`. Lu aussi, risque que le signalement laissait à confirmer : dans un fichier déjà balisé, un `on:` restreint par
le projet est remplacé par celui du gabarit sans être nommé.

## Critères d'acceptation

- Un workflow GitHub avec une clé `concurrency` de premier niveau, balisé ou non, est mis à jour : la clé est gardée à l'identique, et rejouer `init` ne change plus rien — `QUA-283`
- Dans un fichier balisé, le remplacement d'un `on:` différent de celui du gabarit est annoncé par `init` — `QUA-283`
- Une autre clé de premier niveau sans place laisse le fichier tel quel, et le message ne dit pas que le kit la définit — `QUA-283`

## Contrats modifiés

- `QUA-283` — ancien critère : « une clé GitHub de premier niveau du projet sans place dans une zone : `init` laisse le fichier tel quel » — raison : `concurrency` est désormais gardée et le reste du fichier mis à jour (validé par le demandeur le 2026-11-28)

## 2. Hors périmètre

- Garder le `on:` du projet : il reste géré par drwil.
- La règle d'un fichier sans balises dont le `on:` diffère du gabarit : il reste laissé tel quel.
- Les autres clés de premier niveau et la CI GitLab.

## 3. Contraintes

- Une `concurrency` du projet peut annuler un run : un `checks` annulé ou absent ne doit jamais compter comme réussi
  (QUA-339). À vérifier avant de conclure.
- `packages/drwil/src/ci-zone-move.ts` est à 200 lignes : la découpe va dans un nouveau module, listé au cadrage.
- Recette réelle : montée par le tarball de la branche sur un projet d'essai avec `concurrency`.

## 4. Décisions

- 2026-11-28 : `concurrency` est gardée ; `on:` reste géré par drwil et son remplacement est annoncé.
- 2026-11-28 : QUA-283 est modifié (ci-dessus). Dans la 0.11.3 resserrée, après les tranches de la montée.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — concurrency gardée** [IA] : tests en échec d'abord, puis correctif et recette réelle. Critère de sortie :
  `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-28) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`.
