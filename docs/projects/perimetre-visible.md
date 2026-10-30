# Projet : élargissement du périmètre rendu visible

**Statut** : cadré le 2026-10-30.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .githooks/scope-gate.mjs
  - .githooks/scope-gate-merge.mjs
  - .githooks/scope-gate-texts.mjs
  - .githooks/scope-gate.test.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate-merge.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate-texts.mjs
  - docs/ia-first/8-conduct-rules.md
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - AGENTS.md
  - packages/drwil/templates/common/base/AGENTS.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
-->

## 1. Besoin

En BUILD, l'agent peut élargir le bloc `scope` de la fiche active : un commit de cadrage séparé, lu dans HEAD
par la barrière de périmètre. Décision du demandeur (2026-10-30) : le garder, mais le rendre **bien visible**.
Vu au lot 1 de `release-allegee`, où les copies du module de release étaient hors `scopeMirrors`. Aujourd'hui
QUA-050 (un détour pour une correction intercalée, sans élargir le chantier) dit que « le cadrage de la fiche
d'origine ne s'élargit jamais » : la règle écrite et la barrière divergent.

## Critères d'acceptation

- Tout commit qui modifie le bloc `scope` de la fiche active affiche un avertissement net, avec les chemins
  ajoutés — contrat à créer
- Le compte rendu de fin de tâche mentionne les chemins ajoutés au bloc `scope` et la raison — [humain] —
  contrat à créer
- La règle écrite et la barrière disent la même chose de l'élargissement du cadrage — `QUA-050`

## Contrats modifiés

- `QUA-050` — ancien critère : « le cadrage de la fiche d'origine ne s'élargit jamais » — raison : la barrière
  admet l'élargissement par un commit de cadrage séparé ; la règle est alignée sur cette décision, sans
  l'interdire, en l'entourant de visibilité (validé le 2026-10-30)

## 2. Hors périmètre

- Interdire l'élargissement : écarté par le demandeur.
- Les détours eux-mêmes (`.githooks/detour.mjs`), hors alignement du texte de QUA-050.

## 3. Contraintes

- Le gabarit (`packages/drwil/templates/`) est la seule source ; la copie du dépôt suit (`scopeMirrors`).
- QUA-019 (pas de contournement) : l'avertissement ne dépend d'aucun réglage qui le coupe.
- Le plafond de 200 lignes par fichier de code : découper `.githooks/scope-gate.mjs` avant d'y ajouter du code
  s'il dépasse 180 lignes.

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 : garder l'élargissement ; avertissement net sur tout commit qui
modifie le bloc `scope` ; mention obligatoire au compte rendu (chemins ajoutés et raison) ; réaligner QUA-050
et la barrière.

## 5. Points à trancher

- [IA] Où la mention obligatoire est-elle contrôlée : consigne de conduite seule, ou ligne recopiée dans la
  preuve de clôture (qui rend l'omission visible) ? À fixer au lot 1.

## 6. Increments

- **Lot 1 — avertissement et alignement** [IA] : barrière, texte de QUA-050, consigne de conduite. Critère de
  sortie : un commit qui ajoute un chemin au bloc `scope` affiche l'avertissement et les chemins.

## 7. Reprise

- **Dernier état** (2026-10-30) : cadré, aucun code.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] lancer par `/drwil-start`.
