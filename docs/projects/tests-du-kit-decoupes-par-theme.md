# Projet : le plus gros fichier de tests du kit est découpé par thème pour être joué en parallèle

**Statut** : cadré le 2026-11-11 ; décisions D1 à D3 tranchées le 2026-11-11 (0.11.2, chantier 5 sur 8).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/notes.md` (notes du 2026-11-07 « Tests de contrat plus rapides » et du 2026-11-08 « Accélérer run-checks »)

<!-- scope
files:
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - .drwil/ia-first.json
  - docs/contracts.md
  - docs/architecture.md
  - packages/drwil/CHANGELOG.md
  - packages/drwil/test/decoupe-kit.test.mjs
  - packages/drwil/test/decoupe-kit.inventaire.json
  - packages/drwil/test/kit-commun.mjs
  - packages/drwil/test/kit-*.test.mjs
  - .githooks/engine.test.mjs
-->

(Le bloc `scope` couvre le fichier découpé, les contrôles et le registre qui le citent. Les fichiers de test neufs, nés du
découpage, s'ajoutent au bloc au fil des lots et sont signalés au compte rendu (QUA-214).)

## 1. Besoin

Profil mesuré le 2026-11-11 (chaque fichier de test joué seul, en série, 73 fichiers, 213 s au total) :

- `packages/drwil/test/kit.test.mjs` : 68 s, soit 32 % du total, 6069 lignes, 206 tests. Aucun test n'écrase les autres
  (le plus lent dure 4 s, la moyenne 0,3 s) : le temps est réparti, surtout en création de dépôts git temporaires.
- Les suivants : `state` (16 s), `run-checks` (15 s), `serve` (13 s), `cycle` (12 s), `banc` (10 s).

Un fichier ne se joue qu'en un seul processus : tant que 68 s tiennent dans un fichier, aucune tranche ni aucun
parallélisme ne peut les répartir, et la passe dure au moins aussi longtemps que ce fichier.

Le projet : découper ce fichier par thème, sans changer ce que testent les tests, pour que les tranches le jouent en parallèle.

## Critères d'acceptation

- Aucun test n'est perdu ni modifié dans le découpage : le nombre de tests et la liste des contrats cités sont identiques
  avant et après, prouvé par un test qui compare les deux — `QUA-315`
- Aucun fichier de test du kit ne dépasse un plafond de durée fixé à la réalisation, relevé dans le journal de clôture :
  mesure avant et après de chaque fichier — [humain] `QUA-013`
- Chaque contrôle de `.drwil/ia-first.json` et chaque ligne « Couvre » de `docs/contracts.md` qui citaient le gros fichier
  citent les fichiers qui portent désormais ses tests ; un contrat n'est jamais attesté sur un fichier qui ne le teste plus — `QUA-185`

## Contrats modifiés

- `.githooks/engine.test.mjs` — le test de QUA-212 joue les fichiers nés de la découpe du kit au lieu de kit.test.mjs vidé (validé par le demandeur le 2026-11-17, réponse « Traiter maintenant » au sondage des limites)

## 2. Hors périmètre

- Les fichiers laissés dans le dossier temporaire par les tests (intention du 2026-10-25) : entretien courant, hors de ce
  chantier (D2).
- Un objectif chiffré de gain : aucun (D3) ; on mesure avant et après et on le consigne.
- Mutualiser un dépôt git temporaire entre tests : écarté (D1), risque de fuite d'état d'un test à l'autre.
- Les tranches dès le départ et le plafond de durée par tranche : chantier 4.
- Les doublons de contrôles et le cache CI : chantiers 1 et 2.

## 3. Contraintes

- QUA-033 : un fichier de tests n'est joué qu'une fois par passe, le verdict par ID de contrat est lu dans ce
  résultat ; les fichiers neufs doivent passer par le même lanceur (`outils/tests-par-fichier.mjs`).
- QUA-185 : chaque contrat attesté déclare ce qu'il couvre ; les références au gros fichier (une soixantaine de
  contrats dans `docs/contracts.md`, autant de contrôles dans `.drwil/ia-first.json`) sont à mettre à jour sans en perdre une.
- QUA-019 : aucun test n'est supprimé, sauté ni affaibli pour gagner du temps.
- Les helpers que le gros fichier partage entre ses tests (installation, git temporaire, nettoyage) sortent dans un
  module commun importé par chaque fichier neuf, sans duplication.
- Un fichier de code à 180 lignes ou plus est découpé (plafond 200) ; le gros fichier le dépasse déjà largement : le
  découpage est ce qui le ramène sous ce plafond.

## 4. Décisions

Tranchées par le demandeur le 2026-11-11 (l'agent n'en a tranché aucune) :

- **D1 — Comment réduire son coût** : découper en plusieurs fichiers par thème, joués en parallèle par les tranches.
  *Alternatives écartées* : mutualiser le dépôt git temporaire entre tests (risque de fuite d'état) ; mesurer d'abord sans découper.
- **D2 — Fichiers laissés dans le dossier temporaire** : hors de ce chantier, entretien courant.
- **D3 — Objectif chiffré** : aucun ; on mesure et on rend compte.

## 5. Points à trancher

- [IA] Les thèmes du découpage : à proposer à la réalisation, d'après les familles de contrats testées (hooks et refus,
  installation et mise à jour, attestation, documents), un thème par fichier de 15 à 20 s environ.
- [IA] Le nom des fichiers neufs et celui du module commun.

## 6. Increments

- **Lot 1** : le test de non-perte (nombre de tests et contrats cités avant et après) écrit **avant** le découpage, vert
  sur le fichier actuel.
- **Lot 2** : extraire les helpers partagés dans un module commun, sans bouger de test.
- **Lot 3** : déplacer les tests par thème, un commit par thème, test de non-perte vert à chaque commit.
- **Lot 4** : mettre à jour les citations dans `.drwil/ia-first.json` et `docs/contracts.md`, mesurer après, consigner
  avant et après au journal.

## 7. Reprise

- **Lot 1 fait** (2026-11-17) : QUA-315 créé, test de non-perte `packages/drwil/test/decoupe-kit.test.mjs` vert sur le
  fichier actuel ; inventaire figé `packages/drwil/test/decoupe-kit.inventaire.json` : 209 tests (noms triés, relus à
  l'identique sur une exécution réelle). Contrôle `tests-qua-315` déclaré dans `.drwil/ia-first.json`.
- **Nommage décidé** : les fichiers nés de la découpe s'appellent `kit-<thème>.test.mjs` (même dossier), ce que lit le
  test de non-perte ; le module commun des helpers (lot 2) : kit-commun.mjs (sans `.test.`, jamais lu comme fichier de
  tests). Chaque fichier neuf entre au bloc `scope` par un commit de cadrage séparé : aucun cas admis d'office ne les
  couvre (`packages/drwil/test/kit.test.mjs` est lui-même un test).
- **Mesure avant** (2026-11-17, ce poste, `node --test` sur `packages/drwil/test/kit.test.mjs` seul) : 209 tests, 220,5 s (`duration_ms`
  220514), contre 68 s au profil du 2026-11-11 sur un autre poste : comparer avant et après sur le même poste.
- **Lot 2 fait** (2026-11-17) : les helpers partagés sortent dans `packages/drwil/test/kit-commun.mjs` (aucun test
  déplacé ; `packages/drwil/test/kit.test.mjs` passe en entier, 209 tests ; test de non-perte vert) : environnement `GIT_*` et `DRWIL_*`
  retiré, dossiers temporaires et leurs hooks `after`/`afterEach` (valables pour le fichier qui importe le module), `quiet`,
  `capture`, `envTest`, `checks`, `git`, `read`, lecture des consignes (`sectionsIaFirst`, `sectionIaFirst`, `consignes`,
  `config`), `enAvertissement`, `executable`, `GABARIT`, `DEPOT`, `copierModule`, `projetVerify`, `contrat`, `cli`.
  Les helpers d'un seul thème (`projetReprise`, `projetAtteste`, `empreinte`…) restent avec leurs tests et partent avec
  eux au lot 3 ; un helper que deux thèmes partagent rejoint alors le module commun, jamais une copie. `node --test`
  sans argument (le `npm test` du paquet) lit aussi le module commun comme un fichier de tests vide (0 test).
- **Thèmes du lot 3** (choisis le 2026-11-17 d'après les durées par test d'une exécution de `packages/drwil/test/kit.test.mjs`,
  113 s en tout, charge 2,4) : `consignes` (documents, consignes et skills livrés, ~4 s), `fiches` (fiches, cadrage,
  check-docs, ~11 s), `hooks` (hooks des outils IA, lancement par sondage, ~12 s), `installation` (init, projet existant,
  désinstallation, ~12 s), `mise-a-jour` (version, mise à jour, réglages gardés, ~13 s), `ci` (branche principale, push,
  CI livrée, ~17 s), `modules` (modules optionnels, release, paquet npm, ~10 s), `verify` (verdicts, critères, ~13 s),
  `verify-reprise` (parallèle, reprise des verdicts, `--failed`, ~12 s), `attestation` (~9 s). Les fichiers neufs
  entrent au bloc `scope` par le motif `packages/drwil/test/kit-*.test.mjs` (un commit de cadrage).
- **Lot 3 fait** (2026-11-17) : les 209 tests sont dans dix fichiers `kit-<thème>.test.mjs`, un commit par thème, test
  de non-perte vert à chaque commit. Tests par fichier : consignes 37, fiches 13, hooks 24, installation 37,
  mise-a-jour 18, ci 15, modules 16, verify 27, verify-reprise 11, attestation 11. Les helpers d'un seul thème sont
  partis avec lui ; `empreinte` et `projetReprise`, partagés, ont rejoint `packages/drwil/test/kit-commun.mjs`.
  `packages/drwil/test/kit.test.mjs` ne déclare plus aucun test : gardé vide (un commentaire), car des documents hors du
  bloc `scope` le citent encore (intentions, fiches passées, `packages/drwil/README.md`) et check-docs refuserait un
  chemin disparu ; `node --test` le compte comme un test vide qui passe.
- **Citations déjà suivies au lot 3** (le strict nécessaire, sans quoi le commit est refusé) : chaque contrôle
  `tests-<ID>` de la forme `outils/tests-par-fichier.mjs` et chaque champ **Tests** des contrats dont les tests ont
  bougé citent le ou les fichiers `kit-<thème>.test.mjs` qui portent un test ouvert par l'ID ; `tests-qua-207`
  (forme `node --test --test-name-pattern`, non vue au premier commit) passait sans jouer de test, il cite
  `packages/drwil/test/kit-consignes.test.mjs` depuis le dernier commit du lot.
- **Mesure après, par fichier** (2026-11-17 vers 23 h 55, en série, ce poste, charge 1 min de 3 à 9 : machine chargée,
  à refaire au calme au lot 4) : attestation 7,9 s, ci 19,0 s, consignes 5,6 s, fiches 14,1 s, hooks 16,9 s,
  installation 15,1 s, mise-a-jour 15,4 s, modules 14,1 s, verify-reprise 30,5 s, verify 38,6 s. Au moment de chaque
  déplacement (charge 1 min entre parenthèses) : consignes 4,6 s (0,8), fiches 14,2 s (4,5), hooks 15,9 s (5,3),
  installation 22,8 s (2,5), mise-a-jour 24,1 s (3,4), ci 28,2 s (4,8), modules 19,3 s (6,0), verify 49,6 s (10,9),
  verify-reprise 16,6 s (8,6), attestation 13,4 s (9,8). Avant la découpe : 113,4 s pour le fichier entier (charge 2,4).
- **Restes pour le lot 4** : les citations hors champ **Tests** de `docs/contracts.md` (**Source de vérité**,
  **Périmètre**), les `paths` de `tests-qua-212`, `tests-qua-160` qui cite `packages/drwil/test/kit.test.mjs` sans
  qu'aucun test QUA-160 n'y soit (déjà le cas avant la découpe), `docs/architecture.md`, et le sort de
  `packages/drwil/test/kit.test.mjs` vide. Limite hors cadre : `.githooks/engine.test.mjs` (QUA-212) joue
  `packages/drwil/test/kit.test.mjs` filtré par `^QUA-2` ; vide, ce fichier n'y prouve plus rien (à soumettre à
  l'humain avant VERIFY).
- **Suite** : lot 4, mettre à jour les citations restantes, mesurer après au calme, consigner avant et après au journal.
