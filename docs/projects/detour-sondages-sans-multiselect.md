# Détour : Les sondages préparés écrivent multiSelect:false, retiré par Claude Code : le hook refuse acceptation, attestation et détour posés dans le chat (détour de docs/projects/controles-lents-decoupes-des-le-depart.md)

**Statut** : ouvert le 2026-11-21 (détour de docs/projects/controles-lents-decoupes-des-le-depart.md, branche detour/sondages-sans-multiselect).
**Risque** : HIGH
**Maturité** : en cours

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prepared-poll.mjs
  - .claude/hooks/prepared-poll.mjs
  - packages/drwil/templates/common/base/.githooks/state-polls.mjs
  - .githooks/state-polls.mjs
  - packages/drwil/templates/common/base/.githooks/state-acceptance.mjs
  - .githooks/state-acceptance.mjs
  - packages/drwil/templates/common/base/.githooks/detour.mjs
  - .githooks/detour.mjs
  - packages/drwil/templates/common/optional/create-release/release-verdict-poll.mjs
  - .githooks/release-verdict-poll.mjs
  - packages/drwil/src/attest.ts
  - packages/drwil/test/claude-hooks.test.mjs
  - .githooks/state.test.mjs
  - .githooks/detour.test.mjs
  - .githooks/release-verdict.test.mjs
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/controles-lents-decoupes-des-le-depart.md ne s'élargit jamais pour un détour.)

## 1. Besoin

Les sondages préparés écrivent multiSelect:false, retiré par Claude Code : le hook refuse acceptation, attestation et détour posés dans le chat : défaut préalable rencontré pendant docs/projects/controles-lents-decoupes-des-le-depart.md, hors de son cadrage.

## Critères d'acceptation

- Les sondages préparés écrivent multiSelect:false, retiré par Claude Code : le hook refuse acceptation, attestation et détour posés dans le chat : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/controles-lents-decoupes-des-le-depart.md : Les sondages préparés écrivent multiSelect:false, retiré par Claude Code : le hook refuse acceptation, attestation et détour posés dans le chat » ; avant le push, entrée de journal citant la branche detour/sondages-sans-multiselect et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
