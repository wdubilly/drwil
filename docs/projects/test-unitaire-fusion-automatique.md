# Projet : le test unitaire prouve que la procédure attend la fusion avant SCOPING

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/test-unitaire-fusion-automatique.md`

<!-- scope
files:
  - .githooks/state.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/intentions/test-unitaire-fusion-automatique.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le test unitaire de fusion autorisée dans `.githooks/state.test.mjs`
accepte encore l'ancienne procédure : programmer, vérifier la programmation,
puis revenir en SCOPING. Le test du cycle installé vérifie déjà la procédure
complète de QUA-138 (retour en SCOPING seulement après la fusion).

Périmètre : **preuve du comportement livré et exercé dans le dépôt**.
La procédure livrée ne change pas ; son test unitaire est complété et
câblé au contrôle du contrat. Aucun fichier de production n'est à modifier.

## Critères d'acceptation

- Le test unitaire vérifie en français et en anglais l'ordre :
  programmation de la fusion, vérification de sa programmation, suivi
  avec `node .githooks/pr-watch.mjs`, fusion effective, puis seulement
  retour en SCOPING — `QUA-138`
- Le même test vérifie la relance du suivi tant que la CI est verte sans
  fusion, la limite totale de 30 minutes, la CI rouge avant fusion
  entraînant le maintien en CLOSING et `reopen`, et le délai dépassé ou
  l'échec entraînant le maintien en CLOSING avec signalement — `QUA-138`
- Le contrôle `tests-qua-138` exécute effectivement ce test unitaire et le
  test du cycle installé existant, sans perdre ses vérifications en
  français et en anglais ni celles du skill installé — `QUA-138`

## 2. Hors périmètre

- Modifier la procédure, l'état, les transitions ou le skill de lancement.
- Imposer une fusion réelle sur GitHub pendant le test unitaire.
- Affirmer que le test impose une barrière de transition nouvelle : il
  protège le texte de la procédure, pas une nouvelle règle d'exécution.

## 3. Contraintes

- Compléter les assertions du test existant ou ajouter un test ciblé nommé
  avec le préfixe `QUA-138 ` pour qu'il soit sélectionné par son contrôle.
- Garder les vérifications de calcul de la PR, de mise à jour si BEHIND
  et d'autorisation de fusion humaine déjà présentes.
- Le test doit échouer contre l'ancienne procédure, celle qui permet le
  retour en SCOPING dès la programmation ; prouver cette sensibilité par
  une régression temporaire locale, jamais commitée.
- Déclarer directement le fichier de test modifié : aucun besoin de
  modifier artificiellement son module de production.

## 4. Décisions

Validées par le demandeur le 2026-10-25 :

1. Ajouter la preuve unitaire, en complément du test du cycle existant.
2. Déclarer explicitement le fichier de test de l'état au titre des hooks
   modifiés, sans changer le comportement livré.

## Contrats modifiés

- `.githooks/state.test.mjs` : compléter la preuve unitaire de la procédure
  de fusion automatique ; déclaration autorisée par le demandeur
  (QUA-137, hooks modifiés déclarés).
- `QUA-138` (retour en SCOPING après fusion) : ajouter le test unitaire
  dans « Preuve » et « Tests » et compléter son contrôle ; règle inchangée.

## 5. Points à trancher

Aucun : preuve complémentaire et déclaration du test autorisées.

## 6. Increments

- **Lot 1 — preuve unitaire et câblage** [IA] : compléter le test dans les
  deux langues, vérifier sa sensibilité à l'ancienne procédure, inclure
  le test dans le contrôle du contrat, mettre à jour ses références de
  preuve et l'intention. Sortie :
  `node .githooks/run-checks.mjs` OK et
  `node packages/drwil/bin/drwil.js verify --evidence --agent` donnant
  `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré, sans réalisation commencée.
- **Prochaine étape** : [humain] lancer dans une nouvelle session avec
  `/drwil-start` ; faire d'abord le chantier
  `docs/projects/journal.md` évite que l'ajout du test au
  contrôle demande une nouvelle attestation de durée.
