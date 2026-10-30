# Projet : clôture d'un chantier sur un projet neuf

**Statut** : cadré le 2026-10-30.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/guarantees.ts
  - packages/drwil/src/guarantees-verify.ts
  - packages/drwil/src/guarantees-table.ts
  - packages/drwil/src/guarantees-texts.ts
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/close-checks.mjs
  - packages/drwil/templates/common/base/.githooks/close-texts.mjs
  - packages/drwil/templates/common/base/.githooks/closure-proof.mjs
  - packages/drwil/templates/common/base/.githooks/state-acceptance.mjs
  - .githooks/close.mjs
  - .githooks/close-checks.mjs
  - .githooks/close-texts.mjs
  - .githooks/closure-proof.mjs
  - .githooks/state-acceptance.mjs
  - .githooks/close.test.mjs
  - .githooks/state.test.mjs
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - docs/recipes/working-with-branches.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Vu à l'installation réelle de `drwil_walk` (projet neuf) et à `release-allegee` : la clôture d'un chantier
est refusée ou faussée pour des raisons qui ne tiennent pas au chantier. Trois défauts, un seul mécanisme
(`drwil verify`, `.githooks/close.mjs`, l'empreinte des critères) :

1. Sur un projet sans code, `drwil verify` juge le projet entier : les garanties couverture et e2e ne
   peuvent pas être tenues, et 11 contrats manuels attendent une attestation. Un chantier de garantie
   (versionnement, forge, CI, protection de la branche principale) atteint ses objectifs mais ne peut pas
   être clos, et reste en BUILD, ce qui refuse le lancement du suivant.
2. Avant la clôture, `verify` échoue (faux FAIL `docs-references`) parce que l'entrée du journal cite
   `docs/preuves/<fiche>.md`, que `.githooks/close.mjs` ne crée qu'à la clôture ; `.githooks/close.mjs` n'écrit pas la ligne
   « Preuve de clôture » du journal et la ligne de `pending.md` qui cite la fiche supprimée se corrige à
   la main.
3. Poser la marque `[humain]` sur un critère après le lancement change l'empreinte acceptée (QUA-174 :
   les critères acceptés au lancement sont figés) et coûte un geste humain (`state.mjs accept`). Les IDs
   de contrat, eux, sont déjà exclus de l'empreinte (`PROOF_TAIL`).

## Critères d'acceptation

- Sur un projet sans code, une garantie couverture ou e2e dont la couche n'a aucun code est « pas encore
  applicable » : elle ne met pas `verify` en FAIL, et le dit en clair — contrat à créer
- Dès que la couche reçoit du code, la garantie redevient applicable et son échec redevient bloquant —
  contrat à créer
- La clôture écrit elle-même la ligne « Preuve de clôture » du journal et corrige la ligne de l'index qui
  cite la fiche supprimée — contrat à créer
- Avant la clôture, la citation de la preuve du chantier actif (`docs/preuves/<fiche>.md`) ne fait plus
  échouer `verify` — contrat à créer
- Ajouter ou retirer la marque `[humain]` d'un critère ne change pas l'empreinte acceptée ; tout autre
  changement du texte d'un critère la change toujours — `QUA-174`

## Contrats modifiés

- `QUA-174` — ancien critère : « texte de chaque puce, lignes de continuation jointes, espaces normalisés,
  preuve citée exclue » — raison : la marque `[humain]` est une classification de la preuve, pas le sens du
  critère ; l'exclure de l'empreinte évite un geste humain par marque posée après coup (validé le 2026-10-30)

## 2. Hors périmètre

- Une notion officielle de « chantier mis en attente » (état, commande de reprise, rappel) : écartée, le
  point 1 la rend inutile pour les chantiers de garantie.
- L'attestation de départ des contrats manuels à l'installation.
- Les renvois à la fiche supprimée qui bloquent le commit de clôture (note du 2026-10-30 « Clôture
  récurrente bloquée ») : autre mécanisme, reste en note.
- L'élargissement visible du périmètre et l'alignement de QUA-050 : fiche à part.
- La première branche principale, l'auto-merge du dépôt neuf, le choix des outils IA, le signalement d'un
  défaut du kit : fiche « installation d'un dépôt neuf ».

## 3. Contraintes

- Le gabarit (`packages/drwil/templates/`) est la seule source ; la copie du dépôt suit (`scopeMirrors`).
- QUA-019 (pas de contournement) : « pas encore applicable » est une règle écrite et testée, jamais une
  dérogation (QUA-090 : aucune dérogation aux garanties, seulement une exclusion déclarée et justifiée) ;
  elle ne vaut qu'une couche **sans aucun code**.
- QUA-092 (sur un dossier vide, la garantie de couverture se prouve en vrai) et QUA-088 (une garantie non
  tenue écrit une fiche bloquante) restent vrais dès qu'il y a du code ; vérifier qu'ils ne sont pas
  affaiblis.
- Les 11 contrats manuels non attestés restent signalés : ils ne bloquent pas un chantier qui ne les cite pas.
- Les fichiers de plus de 180 lignes (`.githooks/close.mjs`, 196 lignes) sont découpés avant d'y ajouter du code.

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 :

- Garanties « pas encore applicables » tant qu'une couche n'a pas de code (plutôt qu'un verdict limité à la
  fiche ou des attestations de départ).
- Pas d'état « mis en attente » : pas de nouvelle notion de cycle de vie.
- `.githooks/close.mjs` fait tout (ligne de journal, ligne d'index) et `verify` tolère la citation de la preuve du
  chantier actif.
- Empreinte des critères sur le sens : la marque `[humain]` n'y entre plus (les IDs n'y entraient déjà plus).

## 5. Points à trancher

- [IA] Définition mécanique de « couche sans code » (aucun fichier source suivi dans les dossiers de la
  couche, hors gabarits et dépendances) : à fixer au lot 1, avec des tests sur dossier vide.

- [IA] Deux défauts liés, vus au même essai : (a) le classement « nouveau » ou « existant » dépend de la
  présence de code au moment où `drwil guarantees` est lancé, alors que la recette d'un projet neuf impose
  d'écrire le code d'abord ; (b) `drwil guarantees` affiche « ✓ couverture » alors que `drwil verify`
  déclare la garantie non tenue. À reproduire au lot 1 (cause avant correctif) ; si les deux outils
  doivent partager le même juge, l'ajouter au lot 1 plutôt qu'en ouvrir un autre.

## 6. Increments

- **Lot 1 — garanties non applicables sans code** [IA] : `packages/drwil/src/guarantees.ts` et `packages/drwil/src/guarantees-verify.ts`, contrats
  et tests (dossier vide, puis premier fichier de code). Critère de sortie : sur un dossier vide
  `verify` ne tombe plus sur couverture/e2e, et retombe dès le premier fichier de code.
- **Lot 2 — clôture complète** [IA] : `.githooks/close.mjs` écrit la ligne « Preuve de clôture » et corrige l'index ;
  `verify` tolère la preuve du chantier actif ; découpe de `.githooks/close.mjs`. Critère de sortie : un chantier
  clos de bout en bout sans retouche à la main, ni faux FAIL avant la clôture.
- **Lot 3 — empreinte sans `[humain]`** [IA] : `.githooks/state-acceptance.mjs`, QUA-174 modifié, tests. Critère de
  sortie : poser `[humain]` après lancement n'impose plus `state.mjs accept`.

## 7. Reprise

- **Dernier état** (2026-10-30) : cadré, décisions prises, aucun code.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] lancer par `/drwil-start`.
