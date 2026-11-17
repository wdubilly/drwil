# Projet : la clôture rattache sa preuve à l'entrée du journal écrite sur la branche

**Statut** : cadré le 2026-11-17.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : constat du 2026-11-17, en relisant le journal (trois entrées coupées en deux)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/close-journal.mjs
  - .githooks/close-journal.mjs
  - packages/drwil/templates/common/base/.githooks/close-texts.mjs
  - .githooks/close-texts.mjs
  - .githooks/close.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/working-with-branches.md
  - docs/contracts.md
  - docs/projects/journal.md
  - docs/projects/pending.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Trois chantiers clos ont une entrée du journal coupée en deux : `ci-multi-os-a-la-release`,
`ci-lents-controles` et `marque-humain-et-empreinte-des-criteres`. On y trouve d'abord l'entrée rédigée, datée et
titrée par une phrase, mais sans sa preuve. Elle est suivie d'une entrée « ## <nom-de-fiche> » qui ne contient que
la ligne « Preuve de clôture ».

La cause a été lue dans le code le 2026-11-17. `journalPlan` (`.githooks/close-journal.mjs`) ne reconnaît une
entrée que par l'un de ces signes : la preuve déjà citée, le nom ou le titre de la fiche en en-tête, ou une ligne
« Clôturé par » qui nomme la branche. Un en-tête « date — phrase » ne porte aucun de ces signes. La clôture ajoute
alors une entrée minimale (QUA-228) au lieu de compléter celle qui existe. Les tests fixent ce comportement
(`.githooks/close.test.mjs:284`).

Le signe fiable existe déjà : l'entrée rédigée est celle que la branche du chantier a ajoutée au journal.

## Critères d'acceptation

- Une entrée du journal ajoutée par la branche du chantier reçoit la preuve de clôture, quel que soit son titre.
  Aucune entrée minimale n'est ajoutée à côté — `QUA-228`
- Sans entrée reconnue, ni par les signes actuels ni par la branche, la clôture est refusée avant toute
  suppression. Le refus donne la forme d'entrée à écrire. Il n'y a plus d'entrée minimale, et `--check` le signale
  avec le même texte, sans rien écrire — `QUA-228`
- Si la branche a ajouté plusieurs entrées, la clôture est refusée pour ambiguïté, comme aujourd'hui — `QUA-228`
- Ni une relance ni la nouvelle clôture d'un chantier rouvert ne doublent l'entrée ou le renvoi : l'entrée déjà
  complétée est reconnue par sa preuve — `QUA-228`

## Contrats modifiés

- `QUA-228` — ancien critère : « Sans entrée identifiable, seule une entrée minimale nommée par le chantier et
  citant sa preuve est ajoutée : aucune décision métier n'est inventée » — raison : une entrée réduite au renvoi
  de preuve ne vaut pas une entrée du journal. L'entrée ajoutée par la branche est reconnue, et sans entrée
  reconnue, la clôture est refusée (validé par le demandeur le 2026-11-17, P1 voie a, sans contrôle du contenu)
- `.githooks/close-journal.mjs` — l'entrée de la branche est reconnue, l'entrée minimale est remplacée par un
  refus (validé par le demandeur le 2026-11-17)
- `.githooks/close-texts.mjs` — texte du refus « aucune entrée du journal pour ce chantier », en français et en
  anglais (validé par le demandeur le 2026-11-17)
- `.githooks/close.test.mjs` — le test sans entrée attend le refus au lieu de l'entrée minimale ; ajout des tests
  de l'entrée de la branche (validé par le demandeur le 2026-11-17)

## 2. Hors périmètre

- Le contenu de l'entrée (« Ce qui change », « Décisions clés »…) : pas de contrôle de forme. « Reconnue » ne veut
  pas dire « complète ».
- `.githooks/close.mjs`, qui fait 200 lignes et touche le plafond : il n'est pas modifié. Le refus passe par le
  `problem` que `journalPlan` renvoie déjà, et qui refuse déjà la suppression.
- Les autres entrées du journal.
- L'audit d'ensemble des garanties de preuve et de clôture :
  `docs/intentions/audit-coherence-des-garanties-existantes.md`.

## 3. Contraintes

- Reproduire d'abord : un test avec une entrée « ## AAAA-MM-JJ — phrase » ajoutée sur la branche doit échouer
  contre le code actuel, qui ajoute une entrée minimale à côté.
- L'entrée de la branche se lit par Git, dans les lignes `## ` ajoutées au journal depuis la base de fusion avec la
  branche principale, et pas dans la copie de travail seule. Si Git est illisible, la clôture est refusée, comme
  pour une erreur de lecture aujourd'hui.
- La reconnaissance actuelle est gardée. La branche n'est consultée qu'à défaut, et ne départage jamais deux
  entrées déjà reconnues.
- On édite le gabarit, puis `npm run installer-depot` (QUA-018). Couverture des hooks à 100 % (QUA-004).

## 4. Décisions

- 2026-11-17 (P1, demandeur) : voie a. Sans entrée reconnue, la clôture est refusée ; l'entrée rédigée sur la
  branche est reconnue quel que soit son titre ; l'entrée minimale disparaît. « Complète » se lit « reconnue », sans
  contrôle des rubriques.
- 2026-11-17 (demandeur) : le chantier correctif avance seul, sans attendre l'audit des garanties.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — entrée reconnue par la branche** [IA] : tests en échec d'abord ; `journalPlan` et le texte du refus ;
  QUA-228 réécrit, ainsi que le passage de la recette `docs/recipes/working-with-branches.md` qui décrit l'entrée minimale ;
  `npm run installer-depot`. Les trois entrées existantes sont réunies : la ligne « Preuve de clôture » rejoint
  l'entrée rédigée et l'entrée vide disparaît. Ligne « Unreleased » du CHANGELOG. Critère de sortie :
  `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-17) : cadrage terminé, contenu validé par le demandeur le 2026-11-17.
- **Prochaine étape** : [humain] `/drwil-start`.
