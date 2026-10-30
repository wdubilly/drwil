# Projet : signaler un défaut du kit

**Statut** : cadré le 2026-10-30.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/cli-report.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/src/index.ts
  - packages/drwil/test/report.test.mjs
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - packages/drwil/templates/common/base/docs/recipes/report-a-kit-defect.md
  - docs/recipes/report-a-kit-defect.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Depuis un projet qui a installé drwil, aucun chemin n'est prévu pour remonter un défaut du kit vers le dépôt
drwil : l'agent de `drwil_walk` a proposé « le noter dans wdubilly/drwil » sans moyen outillé, et la
rédaction dépend de la session.

## Critères d'acceptation

- Une commande `drwil` imprime un rapport de défaut prêt à coller : version du kit, contrôle en échec et son
  message — contrat à créer
- Le rapport ne contient aucune donnée du projet (chemins absolus, noms de dépôt, contenu de fichiers,
  secrets) — contrat à créer
- La commande n'écrit jamais dans un autre dépôt et n'appelle aucune forge — contrat à créer
- Le texte du rapport est lisible et assez précis pour être reproduit — [humain] — contrat à créer

## 2. Hors périmètre

- Ouvrir l'issue automatiquement via `gh` (option écartée : le texte à coller suffit).
- Un canal de retour de la consommation ou de la télémétrie.

## 3. Contraintes

- Livrable : la commande et la recette vont dans le gabarit (`packages/drwil/`), jamais dans une copie.
- QUA-013 : un contrôle non exécuté n'est pas passé ; le rapport dit ce qui n'a pas pu être lu.
- Doc visiteur en anglais pour `packages/drwil/README.md` et `packages/drwil/CHANGELOG.md`.

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 : une commande qui imprime un texte à coller, sans écriture dans un
autre dépôt.

## 5. Points à trancher

- [IA] Nom de la commande (`drwil report`) et liste exacte des champs gardés : à fixer au lot 1 ; en cas de
  doute sur un champ, il est exclu.

## 6. Increments

- **Lot 1 — commande et recette** [IA] : commande, tests (aucun chemin absolu, aucune donnée du projet),
  recette, README et changelog. Critère de sortie : la commande, lancée sur un dépôt de test, imprime la
  version et le message d'un contrôle en échec sans chemin absolu.

## 7. Reprise

- **Dernier état** (2026-10-30) : cadré, aucun code.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] lancer par `/drwil-start`.
