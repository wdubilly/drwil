# Détour : le test QUA-268 de create-release échoue quand un chemin temporaire aléatoire contient « CI » (détour de docs/projects/unreleased-en-fin-de-build.md)

**Statut** : ouvert le 2026-11-13 (détour de docs/projects/unreleased-en-fin-de-build.md, branche detour/ci-dans-chemin-temporaire).
**Risque** : HIGH
**Maturité** : en cours

<!-- scope
files:
  - .githooks/create-release.test.mjs
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/unreleased-en-fin-de-build.md ne s'élargit jamais pour un détour.)

## 1. Besoin

le test QUA-268 de create-release échoue quand un chemin temporaire aléatoire contient « CI » : défaut préalable rencontré pendant docs/projects/unreleased-en-fin-de-build.md, hors de son cadrage.

## Critères d'acceptation

- le test QUA-268 de create-release échoue quand un chemin temporaire aléatoire contient « CI » : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/unreleased-en-fin-de-build.md : le test QUA-268 de create-release échoue quand un chemin temporaire aléatoire contient « CI » » ; avant le push, entrée de journal citant la branche detour/ci-dans-chemin-temporaire et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
