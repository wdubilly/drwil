# Projet : une mise à jour du kit sur un projet équipé ne bloque plus, `init` gère tout

**Statut** : cadré le 2026-11-04 — piste A retenue, points à trancher.
**Risque** : HIGH
**Maturité** : à affiner
**Intention** : `docs/intentions/adoption-et-init.md`

<!-- scope
files:
  - packages/drwil/src/install.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/manifest.ts
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate-merge.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate-texts.mjs
  - .githooks/scope-gate.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/adopt-the-kit.md
  - docs/recipes/working-with-branches.md
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - INSTALL.md
  - docs/contracts.md
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Constat sur `drwil_walk` (2026-11-04) : `drwil init` en mise à jour rafraîchit une soixantaine de fichiers de
mécanique et les laisse non commités ; la barrière de périmètre les refuse en SCOPING (« fichier(s) hors fiches
commité(s) en SCOPING : seule l'activité BUILD l'autorise »), `move BUILD` est interdit depuis SCOPING, et
`start` exige une fiche de chantier fonctionnelle (`routine-maintenance` et `kit-mechanics`, de référence, n'y
sont pas offertes). Rien ne dit à l'utilisateur la marche à suivre : le projet est bloqué par sa propre mise à
jour (QUA-027, mise à jour sûre).

Attendu du demandeur : la mise à jour d'un projet existant ne bloque pas, et `init` gère tout seul le cas, sans
nouvel état ni mode de maintenance, ni second geste (`/drwil-adopt`) pour rendre la mise à jour exploitable.
Précédent : QUA-206, qui commite le kit sur le dépôt neuf qu'`init` crée, avant d'activer les hooks.

## Critères d'acceptation

- Après `drwil init` sur un projet équipé en SCOPING, `git status` est propre ou la mise à jour est commitée
  sur sa propre branche, sans commit refusé par la barrière de périmètre — contrat à créer
- La mise à jour commitée passe la barrière en local et en CI (rejeu de la branche), alors qu'un fichier de
  mécanique modifié à la main dans un commit ordinaire reste refusé en SCOPING — contrat à créer
- `init` dit, à la fin d'une mise à jour, ce qu'il a fait, ce qui reste à décider et la commande suivante — contrat à créer

## 2. Hors périmètre

- Un mode `start --maintenance` ou une nouvelle activité de gouvernance (écartés par le demandeur).
- Fusionner `init` et `/drwil-adopt` : les décisions d'adoption restent celles du demandeur ; seule l'étape
  mécanique de la mise à jour est traitée ici.
- Réécrire la détection de dérive (`resolve-drift`) : un fichier modifié à la main reste signalé, jamais écrasé.
- La remontée « le sondage `/drwil-start` ne déclenche aucune transition sous Copilot CLI » : à vérifier à part.

## 3. Contraintes

- Jamais de contrôle désactivé, sauté ni contourné (QUA-019) : la barrière reste active ; la mise à jour est
  reconnue par une règle écrite et testée, pas par un `--no-verify`.
- Le gabarit est la seule source ; la copie du dépôt suit (`scopeMirrors`).
- QUA-018 : le correctif vise le livrable (gabarit), pas drwil-le-dépôt.
- Un projet dont `core.hooksPath` est géré par un autre outil, ou sans identité git : `init` le dit et ne casse
  pas (comme QUA-206).
- Le plafond de 200 lignes par fichier de code.

## 4. Décisions

- Le mode de maintenance est écarté (demandeur, 2026-11-04) ; la cause est traitée, pas le symptôme.
- Piste A retenue (demandeur, 2026-11-04) : `init` commite la mise à jour lui-même.
- La branche de mise à jour part de la branche principale du projet hôte, mise à jour au préalable
  (récupération distante faite) : jamais d'une branche de travail ni d'une copie en retard (demandeur, 2026-11-04).

## 5. Points à trancher

- [décision] Un projet sans identité git, ou avec un arbre déjà sale avant la mise à jour : `init`
  refuse, ou commite seulement ses propres fichiers ?
- [décision] Branche principale en retard sur le dépôt distant, ou dépôt sans distant : `init` met la branche
  à jour (`fetch` puis fast-forward), ou refuse et dit la commande à lancer ?

## 6. Increments

- **Lot 1 — marche à suivre et règle de la barrière** [IA] : `init` met à jour la branche principale du projet
  hôte, y coupe la branche de mise à jour, la commite avec le marqueur ; le rejeu en CI la reconnaît, les messages disent la suite. Critère de sortie : tests du
  paquet sur un dépôt temporaire équipé (mise à jour en SCOPING sans refus ; édition manuelle d'un hook
  toujours refusée) et `node .githooks/run-checks.mjs` vert.

## 7. Reprise

- **Dernier état** (2026-11-04) : cadré, rien codé ; la remontée est dans `docs/intentions/adoption-et-init.md`.
- **Travail non commité** : cette fiche et la remontée dans l'intention.
- **Prochaine étape** : [décision] trancher les deux points ci-dessus, puis passer la maturité à « prêt ».
