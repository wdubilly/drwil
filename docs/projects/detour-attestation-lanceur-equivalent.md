# Détour : Une attestation tombe quand seul le lanceur de son contrôle change, avec les mêmes tests visés (détour de docs/projects/controles-contrats-groupes.md)

**Statut** : ouvert le 2026-11-20 (détour de docs/projects/controles-contrats-groupes.md, branche detour/attestation-lanceur-equivalent).
**Risque** : MEDIUM
**Maturité** : en cours

<!-- scope
files:
  - packages/drwil/src/fingerprint.ts
  - packages/drwil/test/kit-attestation.test.mjs
  - docs/contracts.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/controles-contrats-groupes.md ne s'élargit jamais pour un détour.)

## 1. Besoin

Une attestation tombe quand seul le lanceur de son contrôle change, avec les mêmes tests visés : défaut préalable rencontré pendant docs/projects/controles-contrats-groupes.md, hors de son cadrage.

## Critères d'acceptation

- Une attestation tombe quand seul le lanceur de son contrôle change, avec les mêmes tests visés : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Deux lanceurs déclarés équivalents dans une table courte du code (`packages/drwil/src/fingerprint.ts`) : `node outils/tests-par-fichier.mjs` et « node .githooks/contract-tests.mjs » (éventuellement suivi de `--runner node`). L'empreinte d'effet (version 4) ramène la commande à la forme historique avant le hachage, et, pour un tel contrôle seulement, ramène dans ses `paths` les fichiers du lanceur (contract-tests.mjs et contract-tests-reporters.mjs, sous .githooks/) au fichier historique `outils/tests-par-fichier.mjs` : les attestations enregistrées restent valides, toute autre différence (ID, fichiers de tests, dossier, autres paths, autre commande) les rend toujours obsolètes. Contrats modifiés : QUA-183, QUA-184 (oui au détour du demandeur, 2026-11-20).

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/controles-contrats-groupes.md : Une attestation tombe quand seul le lanceur de son contrôle change, avec les mêmes tests visés » ; avant le push, entrée de journal citant la branche detour/attestation-lanceur-equivalent et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
