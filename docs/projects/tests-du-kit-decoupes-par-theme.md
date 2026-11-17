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

(aucun à ce stade ; si le découpage change un contrat existant, la puce s'écrit ici sur le oui du demandeur.)

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
- **Suite** : lot 3, déplacer les tests par thème dans `kit-<thème>.test.mjs`, un commit par thème, chaque fichier neuf
  au bloc `scope` par un commit de cadrage séparé, test de non-perte vert à chaque commit.
