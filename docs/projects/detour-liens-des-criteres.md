# Détour : Critères 1 et 3 de la fiche sans preuve lisible par verify (détour de docs/projects/tests-de-serve-sous-windows.md)

**Statut** : ouvert le 2026-11-10 (détour de docs/projects/tests-de-serve-sous-windows.md, branche detour/liens-des-criteres).
**Risque** : MEDIUM
**Maturité** : en cours

<!-- scope
files:
  - docs/projects/tests-de-serve-sous-windows.md
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/tests-de-serve-sous-windows.md ne s'élargit jamais pour un détour.)

## 1. Besoin

Critères 1 et 3 de la fiche sans preuve lisible par verify : défaut préalable rencontré pendant docs/projects/tests-de-serve-sous-windows.md, hors de son cadrage.

## Critères d'acceptation

- Critères 1 et 3 de la fiche sans preuve lisible par verify : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/tests-de-serve-sous-windows.md : Critères 1 et 3 de la fiche sans preuve lisible par verify » ; avant le push, entrée de journal citant la branche detour/liens-des-criteres et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
