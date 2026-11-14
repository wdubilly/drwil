# Projet : la place de la marque [humain] ne change plus l'empreinte des critères acceptés

**Statut** : cadré le 2026-11-14 ; décisions D1 et D2 tranchées le 2026-11-14.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/marque-humain-et-empreinte-des-criteres.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state-acceptance.mjs
  - .githooks/state-acceptance.mjs
  - .githooks/state.test.mjs
  - docs/contracts.md
  - docs/intentions/marque-humain-et-empreinte-des-criteres.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

QUA-174 promet qu'ajouter ou retirer une marque `[humain]` ne change pas l'empreinte des critères acceptés. Le code
ne tient pas cette promesse quand la marque est écrite entre le tiret et l'identifiant de preuve
(« — [humain] `QUA-013` ») : dans `criteriaFingerprint` (`.githooks/state-acceptance.mjs`), la preuve de fin de ligne
(`PROOF_TAIL`) est retirée **avant** la marque (`HUMAN_MARK`) ; à cette place, la preuve n'est pas reconnue et entre
dans le texte accepté. Retirer ou déplacer la marque change alors l'empreinte et la clôture est refusée. Deux
clôtures gênées le 2026-11-14 (PR #428 et #430), dont une nouvelle acceptation au terminal.

## Critères d'acceptation

- L'empreinte des critères ne dépend ni de la présence ni de la place d'une marque `[humain]` ou `[human]` : en tête
  du critère, entre le tiret et la preuve, après la preuve ou absente, l'empreinte est la même — `QUA-174`
- Une marque citée entre accents graves reste du texte, et tout autre changement du texte d'un critère change
  toujours l'empreinte — `QUA-174`
- Une empreinte enregistrée avant la livraison (ancien calcul) reste reconnue à la clôture : un chantier accepté avant
  la mise à jour se clôt sans nouvelle acceptation ; un critère réellement modifié est toujours refusé — `QUA-174`
- Tests : les quatre places de la marque, en échec contre le code actuel pour la place entre le tiret et la preuve ;
  repli sur l'ancienne empreinte ; critère modifié refusé avec les deux calculs — `QUA-174`

## Contrats modifiés

- `QUA-174` — ancien critère : « Les marques de classification `[humain]` et `[human]` (sans distinction de casse) sont aussi exclues : ajouter ou retirer une marque ou un lien de preuve ne change pas l'empreinte. » — raison : la marque est exclue quelle que soit sa place, y compris entre le tiret et la preuve ; une empreinte de l'ancien calcul reste reconnue en repli (validé par le demandeur le 2026-11-14)
- `.githooks/state-acceptance.mjs` — la marque est effacée avant la preuve de fin de ligne ; `acceptanceCheck` reconnaît aussi l'empreinte de l'ancien calcul (validé par le demandeur le 2026-11-14)
- `.githooks/state.test.mjs` — tests des places de la marque et du repli sur l'ancienne empreinte (validé par le demandeur le 2026-11-14)

## 2. Hors périmètre

- Une place unique imposée à la marque et signalée par `check-docs` dès le cadrage (écartée, D1).
- La clôture (`.githooks/closure-proof.mjs`) et la commande `accept` : inchangées, elles passent par `acceptanceCheck`.

## 3. Contraintes

- Reproduire d'abord : le test de la marque entre le tiret et la preuve échoue contre le code actuel.
- On édite le gabarit puis `npm run installer-depot` (QUA-018) ; couverture à 100 % des hooks (QUA-004).
- La frontière humain/agent reste entière : le repli ne reconnaît qu'une empreinte déjà enregistrée par un geste
  humain, jamais n'en écrit une (QUA-175).

## 4. Décisions

- D1 (2026-11-14) : la marque est effacée avant la preuve de fin de ligne ; pas de place unique imposée par
  `check-docs` — réponse du demandeur.
- D2 (2026-11-14) : un chantier accepté avant la livraison n'est pas cassé : l'ancienne empreinte est relue en
  repli — réponse du demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — empreinte insensible à la marque** [IA] : tests en échec d'abord ; correctif dans
  `criteriaFingerprint`, repli dans `acceptanceCheck` ; QUA-174 réécrit ; `npm run installer-depot` ; ligne
  « Unreleased » du CHANGELOG ; intention d'origine résumée au journal et retirée. Critère de sortie :
  `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-14) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`.
