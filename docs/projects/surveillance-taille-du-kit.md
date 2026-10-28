# Projet : un contrôle livré qui surveille la taille de tous les fichiers générés par drwil

**Statut** : cadré le 2026-10-27 (sondage du demandeur), pour la 0.10.0, en dernier des trois fiches de taille.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/fichiers-charges-courts.md` (point 3)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/check-kit-size.mjs
  - .githooks/check-kit-size.mjs
  - .githooks/check-kit-size.test.mjs
  - packages/drwil/templates/common/base/.drwil/ia-first.json
  - .drwil/ia-first.json
  - packages/drwil/src/config-write.ts
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/fichiers-charges-courts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - outils/banc.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
-->
## 1. Besoin

Corriger les hooks et `AGENTS.md` une fois ne suffit pas : rien ne retient un
fichier livré de regrossir. Un contrôle mécanique surveille la taille de
chaque fichier que la CLI installe chez un projet (code, hooks, documents,
réglages), chacun sous le plafond de sa sorte. Il est livré dans le paquet et
déclaré à l'installation : un projet adopté le reçoit d'office, sans le
choisir. Il ne porte que sur les fichiers du kit, jamais sur le code du
projet. Dans ce dépôt, il joue sur le gabarit (`packages/drwil/templates/`).

## Critères d'acceptation

(contrat créé : `QUA-157`, qui porte chaque critère ; le code du projet reste
au contrat du plafond de fichier de code.)

- Le contrôle lit la liste des fichiers installés
  (le manifeste d'installation d'un projet adopté, le gabarit dans ce dépôt) et
  compare chacun au plafond de sa sorte, en lignes : 200 pour le code et les
  hooks, 100 pour `AGENTS.md`, 800 pour les documents lus à la demande, 250
  pour les recettes — `QUA-157`
- Sur le gabarit de ce dépôt, un dépassement **bloque** (commit, CI, avant
  release). Chez un projet adopté, il **avertit** seulement, en nommant le
  fichier et sa limite : le projet a pu enrichir un fichier du kit exprès — `QUA-157`
- Un fichier du kit modifié à la main par le projet reste surveillé — `QUA-157`
- Un projet adopté reçoit le contrôle à l'installation, déclaré dans ses
  réglages, sans geste de sa part ; le code du projet n'est jamais mesuré — `QUA-157`
- `docs/ia-first.md` (729 lignes) et la recette `docs/recipes/working-with-branches.md`
  (203 lignes) tiennent leur plafond ou le plafond de leur sorte les couvre (plafond hérité de 916 lignes pour `docs/ia-first.md`) — `QUA-157`

## 2. Hors périmètre

- Le code du projet adopté : relève de QUA-001 et de son choix.
- Le découpage de `docs/ia-first.md`.

## 3. Contraintes

- QUA-013 (un contrôle non exécuté n'est pas passé) : liste d'installation
  absente ou illisible, c'est un échec qui le dit, pas un succès.
- Montée de version sans perte : l'avertissement chez un projet adopté ne
  doit jamais être silencieux ni bloquer une mise à jour.
- On n'édite que le gabarit ; la copie du dépôt s'installe par
  `npm run installer-depot`.

## 4. Décisions

(validées par le demandeur le 2026-10-27)

1. Un contrat neuf (taille du kit livré), QUA-001 gardant le code.
2. Plafonds en lignes : 200 / 100 / 800 / 250 selon la sorte.
3. Un dépassement bloque sur le gabarit de ce dépôt et avertit chez un projet
   adopté (le demandeur est revenu sur « bloque partout » le même jour).

## 6. Increments

- **Lot 1 — contrôle de taille du kit** [IA] : outil du gabarit, déclaré à l'installation, contrat neuf et son contrôle `tests-qua-<id>`, tests, changelog. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-27) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`) (après la fiche d'`AGENTS.md`).
