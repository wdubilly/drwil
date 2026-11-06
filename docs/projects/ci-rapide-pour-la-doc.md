# Projet : une PR de doc passe la CI et fusionne en quelques minutes

**Statut** : cadré le 2026-11-05.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/run-checks-verdicts.mjs
  - .githooks/run-checks-verdicts.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - packages/drwil/test/kit.test.mjs
  - .githooks/run-checks.test.mjs
  - .github/workflows/ia-first.yml
  - .github/scripts/ci-multi-os.mjs
  - .github/scripts/ci-multi-os.test.mjs
  - .github/scripts/workflows-yaml.test.mjs
  - .github/ruleset-master.json
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/features.md
  - packages/drwil/CHANGELOG.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Mesuré le 2026-11-05 sur la PR #362 (doc seule) : 6 min 40 s de l'ouverture à la fusion. Le job
`checks` rejoue tout (6 min 11 s, dont construction et tests du paquet 184 s, tests des contrôles
72 s, tests des hooks 59 s) ; `kit-tests (ubuntu-latest)` joue les tests du paquet (2 min) ; la
règle « à jour avec master » relance toute la CI dès qu'une autre PR est fusionnée. En local, la
reprise contrôle par contrôle (`QUA-141`) évite déjà ce coût ; en CI elle est désactivée.

Le demandeur veut qu'une PR de doc pousse et fusionne vite, sans perdre la preuve : dans ce dépôt
la doc est une donnée (les tests lisent `docs/contracts.md`, les fiches, l'index), donc « doc seule »
ne suffit pas à sauter un contrôle.

**Contrats concernés** : `QUA-141` (reprise d'un verdict contrôle par contrôle), `QUA-013`
(contrôle non exécuté n'est pas passé), `QUA-045` (Windows et macOS testés avant la fusion de tout
code), `QUA-113` (la CI d'une PR rejoue les contrôles avec les hooks de la branche principale).

## Critères d'acceptation

- Sur une PR, la CI reprend le verdict de la dernière CI de la branche principale pour chaque
  contrôle dont l'empreinte (fichiers et commande) est identique ; elle rejoue les autres ; le
  push sur la branche principale rejoue tout et seul écrit ces verdicts — `QUA-250`
- Sur une PR qui ne touche que la documentation, `kit-tests (ubuntu-latest)` saute les tests du
  paquet comme Windows et macOS, et le dit — `QUA-045`
- La CI livrée aux projets (GitHub et GitLab, gabarit) restaure les verdicts de la dernière CI
  de leur branche principale sur une PR (ou merge request) et ne les sauvegarde que sur la branche
  principale ; un projet adoptant reprend donc ses contrôles inchangés comme ce dépôt — contrat à
  créer (le même que le premier critère)
- La protection de la branche principale n'exige plus qu'une PR soit à jour avec elle ;
  `.github/ruleset-master.json` le dit et la CI vérifie que la forge le tient — contrat à créer

## Contrats modifiés

- `.githooks/run-checks-verdicts.mjs` — en CI, la reprise des verdicts s'active quand la CI le
  demande (PR), sur le fichier de verdicts restauré depuis la branche principale ; hors CI, rien ne
  change (validé par le demandeur le 2026-11-05)
- `QUA-045` — ancien critère : Ubuntu joue les tests du paquet sur toute PR — raison : sur une PR
  de doc seule, Ubuntu les saute comme Windows et macOS ; le push sur la branche principale les
  joue toujours (validé par le demandeur le 2026-11-05)

## 2. Hors périmètre

- La règle « à jour avec la branche principale » que `drwil guarantees` pose chez les adoptants
  (`packages/drwil/src/guarantees-forge.ts`) : inchangée, levée seulement dans ce dépôt (décidé le
  2026-11-05).
- Sauter un contrôle sur le seul critère « doc seule » : écarté, la doc est une donnée.
- Le push local : il reprend déjà les verdicts (`QUA-141`).

## 3. Contraintes

- Le cache des verdicts n'est écrit que par un push sur la branche principale, jamais par une PR :
  une PR ne peut pas fabriquer le verdict qu'elle relira. Il est restauré par `actions/cache/restore`,
  sa sauvegarde n'a lieu que sur la branche principale.
- Sans cache restauré (premier passage, cache expiré), tout est rejoué : jamais « repris » sans
  verdict.
- Le rejeu avec les hooks de la branche principale (`QUA-113`) reste inchangé.
- Lever « à jour avec master » touche les réglages de la forge : le changement du réglage
  lui-même est un geste du demandeur (lot 2), la CI vérifie ensuite que la forge tient
  `.github/ruleset-master.json`.
- Risque accepté le 2026-11-05 : deux PR vertes chacune peuvent casser une fois fusionnées
  ensemble ; la CI de la branche principale le voit après la fusion et ouvre l'alerte existante.

## 4. Décisions

Tranchées par le demandeur le 2026-11-05 : les trois mesures (reprise des verdicts en CI, Ubuntu
sans tests sur une PR de doc, « à jour avec master » levé) ; le kit en profite aussi : la CI du
gabarit (GitHub et GitLab) reçoit la reprise des verdicts, sans changer la protection de forge
posée chez les adoptants.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — reprise en CI et Ubuntu sur doc** [IA] : `.githooks/run-checks-verdicts.mjs`,
  `.github/workflows/ia-first.yml`, `.github/scripts/ci-multi-os.mjs`, tests. Critère de sortie :
  le premier contrat vert, une PR de doc mesurée.
- **Lot 2 — CI du gabarit** [IA] : étapes de cache des verdicts dans
  `packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml` et
  `packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml`, tests du paquet. Critère de sortie :
  le contrat prouvé aussi sur la CI livrée.
- **Lot 3 — « à jour avec master » levé** [humain] : le demandeur change le réglage de la forge
  (commande prête dans la reprise), l'agent met `.github/ruleset-master.json` d'accord. Critère de
  sortie : `.github/scripts/verifier-ruleset.mjs` vert.

## 7. Reprise

- **Dernier état** (2026-11-05) : cadré, rien de réalisé.
- **Prochaine étape** : [IA] lot 1.
