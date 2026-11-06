# Projet : le rappel « fusion annulée » tombe quand la fusion est reprogrammée par merge-auto

**Statut** : cadré le 2026-11-06.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/rappel-fusion-annulee-reprogrammee.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/merge-auto.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - .githooks/merge-auto.mjs
  - .githooks/state-messages-fr.mjs
  - .githooks/state-messages-en.mjs
  - .githooks/merge-auto.test.mjs
  - .githooks/state.test.mjs
  - docs/contracts.md
  - docs/intentions/rappel-fusion-annulee-reprogrammee.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Une réouverture échouée après l'annulation de la fusion automatique pose la marque `merge_cancelled`
de l'état (QUA-181). Elle ne tombe qu'à une réouverture réussie ou au retour en SCOPING. Si l'humain
reprogramme la fusion entre-temps, le rappel « fusion annulée, non reprogrammée » reste affiché alors
qu'il est faux.

## Critères d'acceptation

- Quand `node .githooks/merge-auto.mjs` voit la fusion programmée sur la PR marquée par `merge_cancelled`,
  il efface la marque et le dit ; une PR autre que celle de la marque, ou une fusion non programmée, la
  laisse — `QUA-181`

## Contrats modifiés

- `QUA-181` — ancien critère : la marque reste « jusqu'à une réouverture réussie ou le retour en
  SCOPING » — raison : elle tombe aussi quand `merge-auto` voit la fusion programmée sur sa PR ; le
  refus, son texte et la règle « l'outil ne reprogramme jamais seul » sont inchangés (validé par le
  demandeur le 2026-11-06)
- `.githooks/merge-auto.mjs` — écrit l'état pour effacer `merge_cancelled`, et rien d'autre ; aucun refus
  ni aucune autorisation (QUA-161 à QUA-163, QUA-188) ne change (validé par le demandeur le 2026-11-06)

## 2. Hors périmètre

- Une fusion reprogrammée à la main sur GitHub, sans `merge-auto` : la marque reste jusqu'au prochain
  passage de `merge-auto`, à une réouverture réussie ou au retour en SCOPING ; pas d'appel `gh` à chaque
  rappel (décision du 2026-11-06).
- La reprogrammation par l'outil lui-même : `merge-auto` exige toujours l'autorisation de l'humain.

## 3. Contraintes

- L'état s'écrit par l'outil (`writeState` de `.githooks/state.mjs`), jamais à la main.
- La marque ne s'efface qu'une fois la fusion vue programmée (`autoMergeRequest` non nul), jamais sur
  une simple tentative.

## 4. Décisions

- 2026-11-06 : `merge-auto` efface la marque, plutôt qu'un appel `gh` à chaque rappel.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — effacement par merge-auto** [IA] : `.githooks/merge-auto.mjs`, messages, tests, QUA-181 modifié.
  Critère de sortie : tests de QUA-181 et de `merge-auto` verts, `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-06) : cadré, rien de réalisé.
- **Prochaine étape** : [IA] lot 1.
