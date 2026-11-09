# Détour : banc-run : agent absent non détecté sous Node 26 (détour de docs/projects/reouverture-sans-faux-blocage.md)

**Statut** : ouvert le 2026-11-09 (détour de docs/projects/reouverture-sans-faux-blocage.md, branche detour/banc-absent-node26).
**Risque** : MEDIUM
**Maturité** : en cours

<!-- scope
files:
  - outils/banc-run.mjs
  - outils/banc.test.mjs
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/reouverture-sans-faux-blocage.md ne s'élargit jamais pour un détour.)

## 1. Besoin

banc-run : agent absent non détecté sous Node 26 : défaut préalable rencontré pendant docs/projects/reouverture-sans-faux-blocage.md, hors de son cadrage.

## Critères d'acceptation

- banc-run : agent absent non détecté sous Node 26 : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/reouverture-sans-faux-blocage.md : banc-run : agent absent non détecté sous Node 26 » ; avant le push, entrée de journal citant la branche detour/banc-absent-node26 et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
