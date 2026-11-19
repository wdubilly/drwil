# Projet : les contrôles de contrats d'un projet lancent chaque fichier de tests une fois par passe, pas une fois par contrat

**Statut** : cadré le 2026-11-19.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : constat du demandeur sur `marinade-poulet` (2026-11-19) : CI passée d'environ 12 à 22 minutes en deux
jours.

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/engine-pass.mjs
  - packages/drwil/templates/common/base/.githooks/engine-launch.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/contract-tests.mjs
  - packages/drwil/templates/common/base/.githooks/contract-tests-reporters.mjs
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - .githooks/engine.mjs
  - .githooks/engine-pass.mjs
  - .githooks/engine-launch.mjs
  - .githooks/run-checks.mjs
  - .githooks/contract-tests.mjs
  - .githooks/contract-tests-reporters.mjs
  - .githooks/contract-tests.test.mjs
  - docs/recipes/adopt-the-kit.md
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/guarantees-merge.ts
  - packages/drwil/src/guarantees-layers.ts
  - packages/drwil/test/coverage-merge.test.mjs
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - packages/drwil/test/kit-ci.test.mjs
  - .githooks/run-checks-verdicts.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-verdicts.mjs
  - packages/drwil/test/kit-verify.test.mjs
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Chez un projet qui a adopté le kit, chaque contrat métier a son propre contrôle (recette
`docs/recipes/adopt-the-kit.md`, étape 5 : `npm test -- -t "APP-001"`). Chez `marinade-poulet` (relevé le
2026-11-19), 27 des 31 contrôles sont `npx vitest run -t "<ID>"` : chacun relance Vitest sur **tous** les fichiers de
tests et ne garde que les tests de son ID. En CI, chaque lancement coûte environ 31 s, presque tout en démarrage
(transformation, jsdom, imports) ; les 27 démarrages font l'essentiel des 22 minutes. Chaque nouveau contrat ajoute
le sien : le temps croît avec le registre.

Le dépôt drwil a déjà résolu ce problème pour lui-même (QUA-033) : `outils/tests-par-fichier.mjs` lance chaque
fichier de tests une seule fois par passe de `run-checks` (`DRWIL_PASS_ID`), un reporter laisse le résultat de chaque
test, le verdict de chaque contrat est lu par ID. Mais cet outil est propre au dépôt (`outils/`), ne sait que
`node --test`, et n'est pas livré.

Le projet : livrer ce mécanisme aux projets, pour les lanceurs de tests de la pile JavaScript (Vitest, Jest,
`node --test`), sans retirer aucun contrôle ni perdre le verdict par contrat.

## Critères d'acceptation

- Un contrôle de contrat déclaré par le mécanisme livré (`node .githooks/contract-tests.mjs <ID> [fichiers…]`) lance
  son lanceur de tests (Vitest, Jest ou `node --test`, détecté ou déclaré) **une seule fois par passe** pour tous les
  contrats qui le partagent ; son verdict ne vient que des tests dont le nom commence par son ID : un test cassé fait
  échouer ce seul contrat — contrat à créer
- Un contrat dont aucun test ne porte l'ID, ou un lancement qui n'a rien joué (erreur de chargement, processus mort),
  échoue, jamais un succès (QUA-013) ; hors passe (lancement à la main), le lanceur est rejoué — contrat à créer
- La recette d'adoption déclare désormais un contrôle de contrat par ce mécanisme ; un projet déjà adopté est guidé :
  `drwil doctor` signale, sans rien écrire, les contrôles `vitest|jest … -t "<ID>"` qui relancent chacun le lanceur, et
  donne la forme groupée — contrat à créer
- Mesure : sur une copie de `marinade-poulet` (ou un projet de test de même forme, 27 contrats Vitest), le temps de
  `run-checks` avant et après est relevé dans le journal de clôture — [humain] `QUA-013`
- Lot 2 : sur un commit dont les contrôles viennent de passer, la seconde passe ne rejoue pas l'e2e ; la cause du
  rejeu est d'abord reproduite et dite (contrôle sans `paths`, ou passe qui ne reprend pas ses verdicts) — contrat à
  créer ou existant cité selon la cause
- Lot 4 : sur une couche Node **à 100 %** (seuil déjà au maximum), la paire `coverage-<couche>` et
  `coverage-diff-<couche>` exactement telle que le kit la génère est aussi fusionnée en un seul run ; une paire
  modifiée à la main n'est jamais réécrite et `drwil doctor` la signale — `QUA-302`
- Lot 5 : la CI GitLab livrée sauvegarde le cache des verdicts à chaque fusion sur la branche principale et le
  restaure sur une MR, comme la CI GitHub ; une MR dont le code des contrôles n'a pas changé reprend leurs verdicts.
  Éprouvé sur un vrai projet GitLab (`marinade-poulet` ou bac à sable) — `QUA-250`

## Contrats modifiés

- `QUA-302` — ancien critère : la fusion de la paire de couverture ne vise que la couche Node en dette ; une couche à
  100 % garde ses deux runs — raison : une couche à 100 % paie aussi deux runs (constat `marinade-poulet`, environ
  2 min 30 s) (validé par le demandeur le 2026-11-19)
- `QUA-250` — ancien critère : la sauvegarde du cache à chaque fusion n'est corrigée que pour la CI GitHub livrée,
  la reprise GitLab jamais éprouvée — raison : `marinade-poulet` est sur GitLab (validé par le demandeur le
  2026-11-19)
- Le chantier dira si QUA-033 (règle du dépôt) devient la source livrée, ou s'il est seulement cité.

## 2. Hors périmètre

- Les piles hors JavaScript (pytest, go test) : la recette garde pour elles le filtre par ID, un lancement par
  contrat.
- Le découpage de l'e2e en tranches : `docs/projects/controles-lents-decoupes-des-le-depart.md`.
- Toute modification de `marinade-poulet` : le projet se met à jour par `npx drwil init` puis adopte la forme groupée
  dans sa propre session.

## 3. Contraintes

- Cause avant correctif : mesurer d'abord, sur une copie, le coût d'un lancement Vitest et le gain d'un lancement
  unique (avec reporter JSON par test) ; vérifier que `-t` et le reporter de Vitest et Jest donnent le nom complet de
  chaque test.
- Reprendre le fonctionnement prouvé de `outils/tests-par-fichier.mjs` (passe, dossier partagé sous `.drwil/evidence`,
  effacé en fin de passe ; verdict refusé sans test à l'ID) sans le recopier : le dépôt l'utilise aussi, une seule
  source (`outils/miroirs.json` dit l'écart si le dépôt garde son outil).
- Plafond de 200 lignes par fichier (QUA-001) ; on édite le gabarit puis `npm run installer-depot` (QUA-018) ;
  couverture à 100 % des hooks (QUA-004).

## 4. Décisions

- 2026-11-19 (demandeur) : couverture unique sur une couche à 100 % et cache des verdicts sur GitLab ajoutés
  (lots 4 et 5), constat `marinade-poulet`.
- 2026-11-19 (demandeur) : P0, rangé dans la 0.11.2 avant la release, après le cadrage en BUILD et avant les tranches
  dès le départ ; cadré dans la PR de cadrage #455.

## 5. Points à trancher

- [IA] Forme exacte du lanceur unique par outil (Vitest : `--reporter=json` ou reporter maison ; Jest : `--json`) :
  tranchée au lot 1 sur mesure.

## 6. Increments

- **Lot 1 — lanceur groupé et recette** [IA] : le module contract-tests du gabarit, reporters par outil, tests
  (verdict par ID, aucun test à l'ID refusé, un seul lancement par passe), recette d'adoption, contrat créé.
  Critère de sortie : tests verts ; `node .githooks/run-checks.mjs` sans échec.
- **Lot 2 — e2e non rejoué dans la seconde passe** [IA] : reproduire, dire la cause, corriger.
- **Lot 3 — `doctor`** [IA] : avertissement des contrôles non groupés.
- **Lot 4 — une seule couverture sur une couche à 100 %** [IA] : `drwil guarantees` fusionne aussi la paire d'une
  couche à 100 % ; `doctor` signale la paire modifiée à la main.
- **Lot 5 — cache des verdicts sur GitLab** [IA] puis [humain] : reproduire (une MR rejoue-t-elle tout ?), dire la
  cause, corriger la CI GitLab livrée ; essai réel sur GitLab.
- **Lot 6 — mesure** [humain] : temps de CI de `marinade-poulet` avant/après, au journal ; ligne « Unreleased » du
  CHANGELOG (dernier lot [IA] : le lot 5).

## 7. Reprise

- **Dernier état** (2026-11-19) : cadré, non lancé.
- **Prochaine étape** : [humain] `/drwil-start`, après le cadrage en BUILD.
