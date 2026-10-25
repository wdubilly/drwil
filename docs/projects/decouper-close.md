# Projet : séparer la gestion des branches de la mécanique de clôture

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/decouper-close.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/close-branches.mjs
  - .githooks/close.mjs
  - .githooks/close-branches.mjs
  - .githooks/close.test.mjs
  - .githooks/close-branches.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/decouper-close.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

La commande `.githooks/close.mjs` est au plafond de 400 lignes. Elle mêle
la reconnaissance et la suppression des branches fusionnées à la mécanique
de clôture. Extraire la gestion des branches avant le prochain ajout évite
un découpage improvisé dans un autre chantier.

Périmètre : **livrable et ses miroirs dans le dépôt**. Éditer uniquement
le gabarit, puis installer ses copies avec `npm run installer-depot`.
Recette : `docs/recipes/refactor-without-breaking.md`.

## Critères d'acceptation

- La gestion des branches fusionnées est extraite dans un module dédié ;
  la commande de clôture et ce module restent chacun sous le plafond de
  400 lignes, sans dérogation ni compression artificielle — `QUA-001`
- Les exports publics actuellement importés depuis
  `.githooks/close.mjs` restent disponibles à ce chemin ; clôture,
  `--check`, `--fix`, codes de sortie et messages en français et en anglais
  gardent leur comportement — `QUA-048`
- La reconnaissance des fusions classiques et par squash, le refus de
  supprimer une branche non fusionnée ou protégée et le signal lorsque
  `gh` est injoignable restent identiques — `QUA-058`
- L'absence de `gh` ne devient jamais une preuve de fusion par squash ;
  le repli sur Git et ses messages sont conservés — `QUA-059`
- Les tests de caractérisation passent avant et après l'extraction ; les
  hooks gardent 100 % de couverture en lignes, branches, fonctions et
  instructions, nouveau module inclus — `QUA-004`

## 2. Hors périmètre

- Nouvelle fonctionnalité de clôture ou changement des règles de fusion.
- Découpage des autres modules, notamment du moteur des contrôles.
- Modification des consommateurs dans l'état ou les détours : conserver
  la compatibilité des exports plutôt que propager le refactoring.

## 3. Contraintes

- Extraire les fonctions de branches dans le nouveau module du périmètre
  ci-dessus ; garder les exports de compatibilité depuis le module actuel.
- Caractérisation sur le code actuel d'abord, commit séparé vert, puis
  extraction par étapes. Ne pas ajouter des tests qui vérifient seulement
  la forme des imports.
- Conserver les contrôles existants et ajuster leurs sélecteurs si les
  tests de branches sont déplacés ; aucun seuil ne baisse.
- Vérifier les tests de clôture, d'état et de détour, puis le cycle du
  paquet installé et les miroirs du gabarit.
- Mettre à jour la carte et la ligne « Unreleased » du changelog.

## 4. Décisions

Validées par le demandeur le 2026-10-25 :

1. Découpage maintenant, dans un chantier dédié, sans changement de
   comportement.
2. Déclaration explicite du hook de clôture et de ses tests ; nouveau
   module livré aux projets et installé dans le dépôt.

## Contrats modifiés

- `.githooks/close.mjs` : extraction de la gestion des branches, exports
  publics maintenus ; déclaration autorisée par le demandeur, tests
  associés compris (QUA-137, hooks modifiés déclarés).
- `QUA-048` (clôture en un geste), `QUA-058` (fusion par squash reconnue)
  et `QUA-059` (repli sans `gh`) : seules les références de source et de
  tests peuvent être adaptées au découpage ; invariants inchangés.

## 5. Points à trancher

Aucun : découpage sans changement de comportement autorisé.

## 6. Increments

- **Lot 1 — caractérisation** [IA] : rejouer et compléter seulement si
  nécessaire les tests de comportement actuels, puis commit vert séparé.
- **Lot 2 — extraction** [IA] : extraire la gestion des branches, préserver
  les exports, installer les miroirs, adapter les sélecteurs des contrôles
  si nécessaire et actualiser la documentation. Sortie :
  `node .githooks/run-checks.mjs` OK et
  `node packages/drwil/bin/drwil.js verify --evidence --agent` donnant
  `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré, sans réalisation commencée.
- **Prochaine étape** : [humain] lancer dans une nouvelle session avec
  `/drwil-start` ; faire d'abord le chantier
  `docs/projects/journal.md` évite une réattestation de durée
  si les sélecteurs de contrôles doivent changer.
