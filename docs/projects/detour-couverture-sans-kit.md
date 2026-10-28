# Détour : guarantees câble coverage-root avec --all : les scripts du kit installé comptent dans la mesure (détour de docs/projects/niveau-de-protection.md)

**Statut** : ouvert le 2026-10-28 (détour de docs/projects/niveau-de-protection.md, branche detour/couverture-sans-kit).
**Risque** : MEDIUM
**Maturité** : en cours

<!-- scope
files:
  - packages/drwil/src/guarantees-tools.ts
  - packages/drwil/test/guarantees.test.mjs

-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/niveau-de-protection.md ne s'élargit jamais pour un détour.)

## 1. Besoin

guarantees câble coverage-root avec --all : les scripts du kit installé comptent dans la mesure : défaut préalable rencontré pendant docs/projects/niveau-de-protection.md, hors de son cadrage.

## Critères d'acceptation

- guarantees câble coverage-root avec --all : les scripts du kit installé comptent dans la mesure : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/niveau-de-protection.md : guarantees câble coverage-root avec --all : les scripts du kit installé comptent dans la mesure » ; avant le push, entrée de journal citant la branche detour/couverture-sans-kit et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
