# Détour : Une mise à jour du kit laisse un nouveau fichier de mécanique hors de toute fiche (QUA-011 échoue après la mise à jour) (détour de docs/projects/release-0-6-7.md)

**Statut** : ouvert le 2026-10-19 (détour de docs/projects/release-0-6-7.md, branche detour/maj-fiche-mecaniques).
**Risque** : MEDIUM
**Maturité** : en cours

<!-- scope
files:
  - packages/drwil/src/complete.ts
  - packages/drwil/test/kit.test.mjs
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/release-0-6-7.md ne s'élargit jamais pour un détour.)

## 1. Besoin

Une mise à jour du kit laisse un nouveau fichier de mécanique hors de toute fiche (QUA-011 échoue après la mise à jour) : défaut préalable rencontré pendant docs/projects/release-0-6-7.md, hors de son cadrage.

## Critères d'acceptation

- Une mise à jour du kit laisse un nouveau fichier de mécanique hors de toute fiche (QUA-011 échoue après la mise à jour) : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 2. Cause

`docs/projects/kit-mechanics.md` est générée à l'installation, hors de la prose et des mécaniques du kit :
`init` ne la réécrit ni ne la complète jamais. Un fichier de mécanique ajouté par une version
(0.6.7 : `.githooks/skill-headers.mjs`) n'est donc couvert par aucune fiche dans un projet déjà équipé,
et `check-docs` échoue (QUA-011).

## 4. Décisions

- Correction : `complete()` (packages/drwil/src/complete.ts) ajoute au bloc de cadrage de cette fiche les
  fichiers de mécanique du kit qui y manquent, sans rien retirer ni réécrire d'autre.

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/release-0-6-7.md : Une mise à jour du kit laisse un nouveau fichier de mécanique hors de toute fiche (QUA-011 échoue après la mise à jour) » ; avant le push, entrée de journal citant la branche detour/maj-fiche-mecaniques et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
