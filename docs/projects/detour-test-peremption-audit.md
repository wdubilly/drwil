# Détour : Le test de rappel de péremption des audits a une date figée à 2026-10-04, périmée depuis 30 jours (détour de docs/projects/attente-commandes-longues.md)

**Statut** : ouvert le 2026-11-03 (détour de docs/projects/attente-commandes-longues.md, branche detour/test-peremption-audit).
**Risque** : MEDIUM
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/test/kit.test.mjs
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/attente-commandes-longues.md ne s'élargit jamais pour un détour.)

## 1. Besoin

Le test de rappel de péremption des audits a une date figée à 2026-10-04, périmée depuis 30 jours : défaut préalable rencontré pendant docs/projects/attente-commandes-longues.md, hors de son cadrage.

## Critères d'acceptation

- Le test de rappel de péremption des audits a une date figée à 2026-10-04, périmée depuis 30 jours : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/attente-commandes-longues.md : Le test de rappel de péremption des audits a une date figée à 2026-10-04, périmée depuis 30 jours » ; avant le push, entrée de journal citant la branche detour/test-peremption-audit et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
