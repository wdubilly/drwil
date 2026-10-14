# Projet : preuves de bout en bout (cycle, verdicts, attestations, contournements)

**Statut** : cadré le 2026-10-14 — lots 1 à 4 faits (2026-10-14), chantier à clore.
**Risque** : HIGH

<!-- scope
files:
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/src/attest.ts
  - packages/drwil/src/verify.ts
  - .githooks/state.test.mjs
  - .github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
-->

(cadrage provisoire : à confirmer au démarrage de chaque lot.)

## 1. Besoin

Phase 2 de la feuille de route du demandeur (2026-10-14) : démontrer que
les résultats affichés correspondent à ce qui a été contrôlé. Relevé le
2026-10-14 : `packages/drwil/test/kit.test.mjs` éprouve l'installation, la CI installe le
tarball et lance `init` et `verify` ; les transitions d'état sont testées
dans `.githooks/state.test.mjs`. Manque : un test unique du cycle complet,
des verdicts croisés, des attestations devenues obsolètes et des
contournements.

## 2. Hors périmètre

- Le blocage des merges par la forge : déjà fait et vérifié en CI (journal du
  2026-10-13, « Protéger master »).
- La sécurité du manifeste (chantier clos le 2026-10-14, voir `docs/projects/journal.md`).

## 3. Contraintes

- Contrats concernés : QUA-013, QUA-019 (pas de contournement), QUA-018.
- Les tests tournent sur Linux, Windows et macOS (matrice CI).

## 4. Décisions

(aucune pour l'instant)

## 5. Points à trancher

- [IA] Comparer le résultat local au résultat CI : par test sur le même
  dépôt temporaire, ou par un job CI qui rejoue `verify` ? (proposition :
  test sur dépôt temporaire, le job CI existant sert de témoin.)

## 6. Increments

- **Lot 1 — cycle complet** (fait le 2026-10-14) [IA] : installer dans un dépôt temporaire,
  modifier, vérifier, mettre à jour, désinstaller. Critère de sortie : un
  test unique vert sur les 3 systèmes.
- **Lot 2 — sept activités et verdicts** [IA] : parcourir SCOPING,
  EXPECTATION, REQUEST, BUILD, EVIDENCE, VERIFY, CLOSING ; croiser succès,
  échec, contrôle bloquant non exécuté et preuve humaine manquante avec
  PASS, FAIL, ERROR et MANUAL. Critère de sortie : une table de cas, un test
  par ligne.
- **Lot 3 — attestations** (fait le 2026-10-14, déjà couvert par les tests `attest :` de `packages/drwil/test/kit.test.mjs`) [IA] : une attestation devient obsolète quand le
  contrat ou les éléments qu'elle couvre changent. Critère de sortie : test
  vert, attestation périmée refusée.
- **Lot 4 — contournements** [IA] : état local modifié, hook désactivé,
  branche poussée ; comparer local et CI. Critère de sortie : chaque
  contournement est détecté ou son angle mort documenté.

## 7. Reprise

- **Dernier état** (2026-10-14) : lot 1 fait sur la branche
  `workstream/preuves-de-bout-en-bout` (`packages/drwil/test/cycle.test.mjs`,
  2 tests : installer, modifier, vérifier, mettre à jour, désinstaller).
- **Travail non commité** : voir `git status`.
- **Prochaine étape** : [IA] clore (vérifier, journal, supprimer la fiche). Angle mort connu du lot 4 : un `.drwil/state.json` (si présent) réécrit à la main n'est pas détecté, seuls les refus de l'outil et le diff de la PR le couvrent (`docs/ia-first.md`, « Limits »).
