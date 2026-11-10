# Détour : Critère 2 de la fiche sans contrat (méthode, pas comportement) (détour de docs/projects/test-des-tranches-sans-variables-de-push.md)

**Statut** : ouvert le 2026-11-10 (détour de docs/projects/test-des-tranches-sans-variables-de-push.md, branche detour/critere-sans-preuve).
**Risque** : MEDIUM
**Maturité** : en cours

<!-- scope
files:
  - docs/projects/test-des-tranches-sans-variables-de-push.md
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/test-des-tranches-sans-variables-de-push.md ne s'élargit jamais pour un détour.)

## 1. Besoin

Critère 2 de la fiche sans contrat (méthode, pas comportement) : défaut préalable rencontré pendant docs/projects/test-des-tranches-sans-variables-de-push.md, hors de son cadrage.

## Critères d'acceptation

- Critère 2 de la fiche sans contrat (méthode, pas comportement) : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/test-des-tranches-sans-variables-de-push.md : Critère 2 de la fiche sans contrat (méthode, pas comportement) » ; avant le push, entrée de journal citant la branche detour/critere-sans-preuve et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
