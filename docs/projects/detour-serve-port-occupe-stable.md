# Détour : serve.test : test port occupé instable sous charge parallèle (QUA-272) (détour de docs/projects/reouverture-sans-faux-blocage.md)

**Statut** : ouvert le 2026-11-09 (détour de docs/projects/reouverture-sans-faux-blocage.md, branche detour/serve-port-occupe-stable).
**Risque** : MEDIUM
**Maturité** : en cours

<!-- scope
files:
  - packages/drwil/test/serve.test.mjs
  - docs/projects/journal.md
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/reouverture-sans-faux-blocage.md ne s'élargit jamais pour un détour.)

## 1. Besoin

serve.test : test port occupé instable sous charge parallèle (QUA-272) : défaut préalable rencontré pendant docs/projects/reouverture-sans-faux-blocage.md, hors de son cadrage.

## Cause

Le test « port occupé » (QUA-272) occupe lui-même `preferredPort(dir)` (dossier temporaire au hasard, 700 ports) ;
si un autre processus (rejeu parallèle du fichier par verify/run-checks) tient déjà ce port, `listen` lève
EADDRINUSE non géré (vu : 127.0.0.1:4937 au run-checks). Non reproduit en 12 processus parallèles (collision
rare), mais le mécanisme est reproduit de façon déterministe par un tiers qui tient le port.

## Critères d'acceptation

- serve.test : test port occupé instable sous charge parallèle (QUA-272) : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/reouverture-sans-faux-blocage.md : serve.test : test port occupé instable sous charge parallèle (QUA-272) » ; avant le push, entrée de journal citant la branche detour/serve-port-occupe-stable et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
