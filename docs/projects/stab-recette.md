# Projet : une fiche de recette juste, leçons de la 0.6.5 (0.6.6, 4 sur 4)

**Statut** : cadré le 2026-10-19.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/recette-eprouvee-en-reel.md`

<!-- scope
files:
  - packages/drwil/templates/common/optional/create-release/acceptance-sheet.mjs
  - .githooks/acceptance-sheet.mjs
  - .githooks/acceptance-sheet.test.mjs
  - packages/drwil/templates/common/optional/create-release/README.md
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - docs/recipes/create-a-release.md
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
-->

(cadrage : le générateur de la fiche de recette, gabarit et copie, avec
son test ; le README du module et la recette de release ; la carte, le
registre, les contrôles, les miroirs et le changelog.)

## 1. Besoin

Premier essai réel du parcours de recette, sur la 0.6.5 (journal du
2026-10-19) : la version a été approuvée et promue, mais sa fiche de
recette (`v0.6.5-rc.1`) était fausse ou bruyante sur trois points :

1. « Verdict de `drwil verify` : FAIL » pour une version saine, à cause de
   QUA-017 (pas de travail direct sur la branche principale) : une release
   se crée toujours sur la branche principale.
2. 26 points à valider, dont six « pas encore essayé en réel » tirés par
   mot-clé de phrases de décision de la fiche de release.
3. Des critères humains lus dans une version périmée des fiches (un
   « contrat à créer » déjà rattaché, un critère déjà corrigé).

## Contrats modifiés

- `QUA-052` — la fiche de recette juge verify hors de la règle de la
  branche principale, et lit chaque fiche dans sa dernière version avant
  sa suppression.

## Critères d'acceptation

- Créée sur la branche principale, la fiche de recette ne fait pas tomber
  le verdict de verify pour QUA-017 seul, et le dit — `QUA-052`
- Chaque fiche de chantier est lue dans sa dernière version avant sa
  suppression : un critère corrigé ou rattaché avant la clôture apparaît
  corrigé — `QUA-052`
- Une phrase de décision ou de besoin ne devient pas un point « pas encore
  essayé en réel » ; seules le deviennent les limites déclarées comme
  telles — `QUA-052`

## 2. Hors périmètre

- La fiche en HTML : `docs/intentions/fiche-de-recette-html.md`.
- Une reconnaissance des essais réels sans liste de mots :
  `docs/intentions/essai-reel-reconnu-par-mots.md` (ce chantier ne retire
  que les faux positifs constatés).

## 3. Contraintes

- La fiche de la 0.6.5 (fichier recette-v0.6.5-rc.1.md joint à la pré-release)
  sert de cas réel : le test rejoue ses trois défauts.
- Livré à tout projet qui active le module de release (QUA-018).
- Fichiers de code sous 400 lignes (QUA-001).

## 4. Lots

- **Lot 1** : verify jugé hors QUA-017 à la création d'une release.
- **Lot 2** : dernière version des fiches avant suppression ; faux
  positifs « essai réel » retirés.

## 5. Décisions

- **2026-10-19 — Publier la 0.6.5 malgré le faux FAIL, et le corriger en
  0.6.6** (demandeur).

## 6. Reprise

- **Dernier état** (2026-10-19) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
