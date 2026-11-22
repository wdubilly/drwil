# Détour : Sous Copilot CLI interactif, /drwil-start avec « This folder » ne lance rien, sans message [drwil] (« New worktree » fonctionne) (détour de docs/projects/installation-dans-un-depot-existant.md)

**Statut** : ouvert le 2026-11-22 (détour de docs/projects/installation-dans-un-depot-existant.md, branche detour/copilot-lancement-ce-dossier).
**Risque** : MEDIUM
**Maturité** : en cours

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - .claude/hooks/prompt-hook.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - packages/drwil/CHANGELOG.md
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/installation-dans-un-depot-existant.md ne s'élargit jamais pour un détour.)

## 1. Besoin

Sous Copilot CLI interactif, /drwil-start avec « This folder » ne lance rien, sans message [drwil] (« New worktree » fonctionne) : défaut préalable rencontré pendant docs/projects/installation-dans-un-depot-existant.md, hors de son cadrage.

Reproduit hors Copilot (2026-11-22), en rejouant sur une copie du dépôt d'essai la charge PostToolUse que Copilot
passe au hook de `.claude/settings.json` (forme snake_case, réponse `fiche=…, drwil-worktree=This folder`) : le hook
lit bien la réponse et refuse le lancement (branche courante `cadrage/…` dont la fusion n'est pas établie, QUA-179),
mais dit ce refus seulement dans la forme de Claude Code (`hookSpecificOutput.additionalContext`, `systemMessage`).
Copilot CLI ne lit, en postToolUse, que `additionalContext` au premier niveau (format natif, déjà celui de
`copilot-start`, QUA-065) : son journal de session montre l'agent sans aucun message `[drwil]`, après « This folder »
comme après « New worktree » (où le worktree se crée en silence). Cause : la sortie du hook de lancement n'est pas au
format que Copilot lit. Correction : sous la forme Copilot du sondage, le message est aussi rendu en `additionalContext`
de premier niveau ; la forme Claude Code est inchangée.

## Critères d'acceptation

- Sous Copilot CLI interactif, /drwil-start avec « This folder » ne lance rien, sans message [drwil] (« New worktree » fonctionne) : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/installation-dans-un-depot-existant.md : Sous Copilot CLI interactif, /drwil-start avec « This folder » ne lance rien, sans message [drwil] (« New worktree » fonctionne) » ; avant le push, entrée de journal citant la branche detour/copilot-lancement-ce-dossier et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.
