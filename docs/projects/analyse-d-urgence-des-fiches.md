# Projet : une fiche P0 passe d'abord une analyse d'urgence

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/retours-du-demandeur-0-11-2.md` (point 2)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/check-docs-workstreams.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs-texts.mjs
  - packages/drwil/templates/common/base/docs/projects/model-brief.md
  - packages/drwil/templates/common/base/docs/projects/pending.md
  - .githooks/check-docs.test.mjs
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Une fiche se priorise en P0 sans qu'on se demande si elle peut attendre. Le demandeur veut une analyse qui dit si
elle peut attendre ou non, avant de poser un P0.

## Critères d'acceptation

- Une fiche portant un P0 dans l'index doit porter une section « Urgence » répondant aux trois questions : bloque-t-elle
  un adoptant ou la CI, existe-t-il un contournement, quelle échéance ; sinon `check-docs` avertit — `QUA-088`
- Le modèle de fiche contient cette section et dit de n'y poser un P0 que si la première réponse est oui ou
  l'échéance proche — `QUA-088`

## 2. Hors périmètre

- Le blocage dur (erreur) : décidé en avertissement, pour ne pas astreindre les fiches P0 existantes.

## 3. Contraintes

- Décidé le 2026-11-12, le demandeur déléguant la décision : section « Urgence » dans la fiche, contrôlée par
  `check-docs` en avertissement. Pas de réglage ni de seuil.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-12 : forme et sévérité tranchées (section de la fiche, avertissement).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — modèle et contrôle** [IA] : section « Urgence » dans le modèle de fiche, avertissement de `check-docs`
  pour un P0 sans elle, tests. Critère de sortie : `node .githooks/check-docs.mjs` sans nouvelle erreur,
  `node .githooks/run-checks.mjs` sans échec.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé, non commité.
- **Prochaine étape** : [humain] `/drwil-start`.
