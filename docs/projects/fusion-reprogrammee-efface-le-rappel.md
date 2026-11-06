# Projet : merge-auto dit vrai sur une PR déjà verte, et efface le rappel « fusion annulée » quand il reprogramme

**Statut** : cadré le 2026-11-06 ; élargi le 2026-11-06 (PR déjà verte fusionnée sur-le-champ).
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

Second défaut, vu le 2026-11-06 sur la PR #367 : quand toute la CI d'une PR est déjà verte,
`gh pr merge --auto` fusionne sur-le-champ au lieu de programmer. La vérification qui suit
(`.githooks/merge-auto.mjs:115`) lit alors une PR `MERGED` sans `autoMergeRequest`, et sort en échec
(code 1) avec « la fusion n'est PAS programmée ». Dans une file de chantiers, ce faux refus arrêterait
l'enchaînement.

## Critères d'acceptation

- Quand la PR est fusionnée par la commande elle-même (CI déjà verte), `node .githooks/merge-auto.mjs`
  sort en succès et dit « fusionnée », jamais « programmée » ; une PR ni programmée ni fusionnée reste un
  échec — `QUA-162`

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

- `QUA-162` — ancien critère : succès seulement sur une fusion vue programmée — raison : une PR vue
  fusionnée après la commande est aussi un succès, dit « fusionnée » ; ne jamais dire programmée sans
  `autoMergeRequest` reste la règle (validé par le demandeur le 2026-11-06)

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
- 2026-11-06 : le faux refus sur une PR déjà verte entre dans cette fiche, pour que la file de la 0.11.1
  ne s'arrête pas dessus.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — merge-auto dit vrai et efface la marque** [IA] : `.githooks/merge-auto.mjs` (PR fusionnée sur-le-champ,
  marque effacée), messages, tests, QUA-162 et QUA-181 modifiés. Critère de sortie : tests de QUA-162,
  QUA-181 et de `merge-auto` verts, `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-06) : cadré, rien de réalisé.
- **Prochaine étape** : [IA] lot 1.
