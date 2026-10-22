# Projet : la note de recette échappe à la barrière de périmètre

**Statut** : cadré le 2026-10-22 — correctif fait et vérifié (verify PASS), reste la clôture.
**Risque** : HIGH
**Maturité** : prêt

(cadrage : le livrable — le gabarit de `packages/drwil/templates/` — et ses
copies dans ce dépôt, QUA-018.)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - .githooks/scope-gate.test.mjs
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
  - docs/projects/routine-maintenance.md
-->

## 1. Besoin

La note de recette d'une version (`docs/recettes/<version>.md`) est écrite à
la publication par `.githooks/recette-note.mjs`, qui la commite par plomberie
git (`commit-tree`) : aucun hook, donc aucun trailer `Drwil-Brief`, et aucune
fiche active à ce moment-là. En CI, la barrière de périmètre
(`.githooks/scope-gate.mjs`) refuse ce commit, `docs/recettes/` n'étant pas dans la
liste de ce qui échappe au périmètre : la PR de la note de la v0.6.10 (#199)
est bloquée, et celle de chaque version suivante le serait.

## Critères d'acceptation

- Une note de recette (`docs/recettes/*`) échappe à la barrière de
  périmètre, comme une attestation ou une preuve de clôture ; un fichier
  voisin, hors du dossier des recettes, y reste soumis — `QUA-035`

## Contrats modifiés

- `QUA-035` — ancien critère : « Échappent au périmètre, comme les fiches et
  les intentions, les sorties des recettes de cadrage — découverte de valeur
  et audit de risques, noms exacts en français et en anglais
  (`OUT_OF_SCOPE`, `.githooks/scope-gate.mjs`) — : elles se commitent en
  SCOPING ; aucun motif large sur `docs/`. » — raison : la note de recette
  d'une version, générée par l'outil et relue en PR, était refusée en CI
  faute de trailer (PR #199) ; elle rejoint la liste, sans motif large sur
  `docs/` (validé par le demandeur le 2026-10-22).

## 2. Hors périmètre

- Ajouter un trailer au commit de la note : aucune fiche n'est active à la
  publication, ce serait un faux rattachement.
- Les autres écarts relevés le même jour (CODEOWNERS, contournements) : des
  intentions à part.

## 3. Contraintes

- Touche `.githooks/` : risque HIGH, oui du demandeur requis (donné le
  2026-10-22).

## 4. Décisions

- 2026-10-22 (demandeur) : correctif définitif, `docs/recettes/*` ajouté à
  `OUT_OF_SCOPE` ; une fiche dédiée plutôt que l'entretien courant, pour que
  la déclaration de contrat modifié disparaisse avec la fiche.

## 6. Increments

- **Lot 1 — la note échappe au périmètre** [IA] : `OUT_OF_SCOPE` du gabarit
  et sa copie, test QUA-035, doc `docs/ia-first.md`, règle de QUA-035,
  CHANGELOG. Critère de sortie : tests QUA-035 verts, verify PASS. Fait
  (commit `ae9c4da`, d'abord rattaché à l'entretien courant).

## 7. Reprise

- **Dernier état** (2026-10-22) : correctif commité sur la branche
  `entretien-note-recette-hors-perimetre`, verify PASS ; clôture refusée sous
  l'entretien courant (fiche permanente, sans « Contrats modifiés ») ; d'où
  cette fiche.
- **Prochaine étape** : [humain] la lancer (`/drwil-start`), puis clôture,
  PR et fusion automatique ; relancer ensuite la CI de la PR #199.
