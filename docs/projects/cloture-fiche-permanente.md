# Projet : la clôture ne supprime jamais la fiche permanente d'entretien courant

**Statut** : cadré le 2026-11-26 (P1 à P4 tranchés).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cloture-et-attestations.md` (partie « ex-cloture-fiche-permanente »)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/close-mechanics.mjs
  - packages/drwil/templates/common/base/.githooks/close-checks.mjs
  - packages/drwil/templates/common/base/.githooks/close-done.mjs
  - packages/drwil/templates/common/base/.githooks/close-journal.mjs
  - packages/drwil/templates/common/base/.githooks/close-texts.mjs
  - packages/drwil/templates/common/base/.githooks/closure-proof.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - .githooks/close.mjs
  - .githooks/close-mechanics.mjs
  - .githooks/close-checks.mjs
  - .githooks/close-done.mjs
  - .githooks/close-journal.mjs
  - .githooks/close-texts.mjs
  - .githooks/closure-proof.mjs
  - .githooks/briefs.mjs
  - .githooks/close.test.mjs
  - packages/drwil/test/kit-fiches.test.mjs
  - docs/intentions/cloture-et-attestations.md
  - packages/drwil/templates/common/base/docs/ia-first/7-project-lifecycle.md
  - docs/ia-first/7-project-lifecycle.md
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - .githooks/check-docs.mjs
  - packages/drwil/templates/common/base/.githooks/glossary.mjs
  - .githooks/glossary.mjs
  - packages/drwil/src/closure.ts
  - packages/drwil/test/cycle.test.mjs
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
  - .drwil/ia-first.json
-->

## 1. Besoin

La documentation du kit dit `docs/projects/routine-maintenance.md` permanente, mais la clôture la traite comme
une fiche de chantier. Signalé de nouveau par un projet adoptant (drwil 0.11.2) : la reprise prévue « si un projet
adoptant en a besoin » est donc due.

Lu dans le code le 2026-11-26, sans lancer de clôture : `closingMechanics`
(`.githooks/close-mechanics.mjs:51`) supprime la fiche active sans exception, puis retire sa ligne d'index si elle en
a une ; `closingReport` (`.githooks/close.mjs`) annonce ses citations comme des renvois à un fichier supprimé.
`ROUTINE_RE` (`.githooks/briefs.mjs`) ne sert pas à la clôture. L'absence de critère ne bloque pas la preuve
(`.githooks/closure-proof.mjs` écrit « aucun critère ») : avec une évidence valide de HEAD et un journal sans
ambiguïté, la clôture va jusqu'à la suppression.

## Critères d'acceptation

- Clore avec la fiche d'entretien active (`ROUTINE_RE` : `docs/projects/routine-maintenance.md` ou son ancien nom français) garde la fiche et sa ligne d'index — `QUA-048`
- Le signal de clôture n'annonce ni sa suppression ni les citations à réorienter ou à ajouter au cadrage — `QUA-048`
- La clôture de l'entretien est refusée, sans rien écrire, si la branche n'ajoute aucune ligne datée au tableau du journal de la fiche — `QUA-048`
- La consommation de l'entretien est consignée, une clôture relancée est reconnue déjà faite, et l'état peut revenir en SCOPING par le parcours ordinaire — `QUA-048`
- Une fiche de chantier ordinaire est toujours supprimée, avec les mêmes signaux — `QUA-048`
- Chaque clôture de l'entretien écrit sa propre preuve, nommée avec la date et le commit vérifié, sans écraser une précédente ; les autres chantiers gardent `docs/preuves/<chantier>.md` — `QUA-084`

## Contrats modifiés

- `QUA-048` — ancien critère : « En CLOSING, `node .githooks/close.mjs` supprime la fiche active, retire sa ligne de l'index et consigne la consommation du chantier » et « clôture déjà faite, reconnue sur ses trois traces seulement (fiche absente de la copie de travail, preuve écrite, aucune ligne d'index qui la cite) » — raison : la fiche permanente d'entretien est gardée avec sa ligne d'index, sa clôture exige une ligne ajoutée à son tableau, et « déjà faite » s'y reconnaît autrement (validé par le demandeur le 2026-11-26)
- `QUA-084` — ancien critère : « écrit un fichier de preuve versionné par chantier (`docs/preuves/<chantier>.md`, réglage `dirs.proofs`) » et « la clôture est refusée et la fiche reste » — raison : pour la seule fiche permanente, un fichier de preuve par clôture, nommé avec la date et le commit vérifié (validé par le demandeur le 2026-11-26)

## 2. Hors périmètre

- Les autres parties de l'intention « clôture et attestations ».

## 3. Contraintes

- Le journal du dépôt (`docs/projects/journal.md`) rattache une entrée par le nom ou le titre de la fiche
  (`.githooks/close-journal.mjs`) et refuse deux entrées citant la même preuve : les clôtures répétées de
  l'entretien ne doivent ni réécrire une ancienne entrée ni être refusées comme ambiguës.
- Qui retrouve une preuve par le nom du chantier (`.githooks/check-docs.mjs`, `.githooks/glossary.mjs`,
  `packages/drwil/src/closure.ts`) doit lire aussi les preuves datées.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-26 : en tête de la 0.11.3.
- 2026-11-26 (P1) : QUA-048 est modifié, la fiche permanente et sa ligne d'index sont gardées.
- 2026-11-26 (P2) : elle est reconnue par son nom (`ROUTINE_RE`), sans marqueur.
- 2026-11-26 (P3) : la clôture exige une ligne datée ajoutée par la branche au tableau de la fiche ; la date n'a pas à être celle du jour.
- 2026-11-26 (P4) : une preuve datée par clôture ; QUA-084 est modifié pour la seule fiche permanente.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — fiche permanente gardée** [IA] : tests en échec d'abord, dont une clôture complète sur un projet d'essai.
  Critère de sortie : `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-26) : cadrage terminé, P1 à P4 tranchés.
- **Prochaine étape** : [humain] `/drwil-start`.
