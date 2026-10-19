# Projet : un contrat ajouté pendant un détour, sans arrêter la file (0.6.6, 3 sur 4)

**Statut** : cadré le 2026-10-19.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/registre-ajout-sans-oui.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - .githooks/scope-gate.mjs
  - .githooks/scope-gate.test.mjs
  - packages/drwil/templates/common/base/.githooks/detour.mjs
  - .githooks/detour.mjs
  - .githooks/detour.test.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - .githooks/state-texts.mjs
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
  - packages/drwil/templates/common/base/docs/recipes/corriger-un-defaut.md
  - docs/recipes/corriger-un-defaut.md
-->

(cadrage : la barrière de périmètre et la commande de détour, gabarit et
copies, avec leurs tests ; `AGENTS.md` ; la carte, le registre, les
contrôles, les miroirs et le changelog ; la recette de correction d'un
défaut, qui décrit le oui du détour.)

## 1. Besoin

Pendant un détour, tout changement du registre des contrats, même un
simple ajout, demande le oui de l'humain (QUA-050, un détour pour une
correction intercalée) : en file, le sous-agent s'arrête dès qu'un détour
crée un contrat (`docs/intentions/registre-ajout-sans-oui.md`).

## Contrats modifiés

- `QUA-050` — un ajout de contrat au registre ne demande plus le oui de
  l'humain pendant un détour ; modifier ou retirer un contrat existant le
  demande toujours (décision du demandeur, 2026-10-19).

## Critères d'acceptation

- Pendant un détour, un commit qui ne fait qu'ajouter un contrat au
  registre passe sans le oui de l'humain ; un commit qui modifie ou retire
  un contrat existant est toujours refusé jusqu'au oui — `QUA-050`

## 2. Hors périmètre

- Les autres déclencheurs du oui (hook, seuil, barrière, CI) : inchangés.
- `package.json` parmi les seuils : `docs/intentions/seuils-dans-package-json.md`.

## 3. Contraintes

- « Ajout » se juge sur le contenu : une ligne de contrat nouvelle, aucun
  contrat existant touché ; dans le doute, le oui reste demandé.
- Livré à tout projet (QUA-018) : gabarit d'abord, puis
  `npm run installer-depot`.
- Hooks à 100 % de couverture (QUA-004) ; fichiers de code sous 400
  lignes (QUA-001).

## 4. Lots

- **Lot 1** : distinguer ajout et modification du registre dans la
  barrière ; tests des deux cas.

## 5. Décisions

- **2026-10-19 — Ajout libre, modification soumise au oui** (demandeur).

## 6. Reprise

- **Dernier état** (2026-10-19) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
