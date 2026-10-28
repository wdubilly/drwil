# Détour : Des tests d'installation supposent la barrière en avertissement par défaut : la régler explicitement (détour de docs/projects/niveau-de-protection.md)

**Statut** : ouvert le 2026-10-28 (détour de docs/projects/niveau-de-protection.md, branche detour/tests-barriere-explicite).
**Risque** : MEDIUM
**Maturité** : en cours

<!-- scope
files:
  - packages/drwil/test/existing-code.test.mjs
  - outils/banc.test.mjs
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/niveau-de-protection.md ne s'élargit jamais pour un détour.)

## 1. Besoin

Des tests d'installation supposent la barrière en avertissement par défaut : la régler explicitement : défaut préalable rencontré pendant docs/projects/niveau-de-protection.md, hors de son cadrage.

## Critères d'acceptation

- Des tests d'installation supposent la barrière en avertissement par défaut : la régler explicitement : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/niveau-de-protection.md : Des tests d'installation supposent la barrière en avertissement par défaut : la régler explicitement » ; avant le push, entrée de journal citant la branche detour/tests-barriere-explicite et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
