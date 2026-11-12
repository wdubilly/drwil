# Projet : le lancement dit pourquoi il est refusé, arbre sale compris

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/retours-du-demandeur-0-11-2.md` (point 7a)

<!-- scope
files:
  - .githooks/state-transitions.mjs
  - .githooks/state-cli-commands.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/base/.githooks/state-transitions.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli-commands.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - .githooks/state-cli.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - .claude/hooks/prompt-hook.mjs
-->

## 1. Besoin

Le demandeur signale que `state.mjs start` (et le sondage `/drwil-start`) échoue **en silence** quand l'arbre de
travail est sale, plus généralement. Le texte `branchDirty` existe (`.githooks/state-messages-fr.mjs`), mais le
refus n'arrive pas toujours jusqu'à l'humain.

## Critères d'acceptation

- Un lancement refusé par un arbre de travail modifié le dit en clair, avec ce qu'il faut faire (commiter ou
  remiser), par la ligne de commande comme par le sondage ; rien n'est créé — `QUA-179`
- Tout refus de lancement, quelle qu'en soit la raison, produit un message lisible : jamais de sortie vide ni
  de succès apparent (QUA-013) — `QUA-179`

## Contrats modifiés

- `.githooks/state-transitions.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-12)
- `.githooks/state-cli-commands.mjs` — gardé à sa version de la branche (QUA-113), si le chantier le modifie (validé le 2026-11-12)
- `.githooks/state-cli.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-12)

## 2. Hors périmètre

- Les autres garde-fous du lancement (branche non fusionnée, fiche déjà active) sauf s'ils partagent la cause du silence.

## 3. Contraintes

- Cause avant correctif : reproduire le silence (sondage et ligne de commande), trouver où le message se perd,
  puis corriger. Le message `branchDirty` ne se réécrit pas sans besoin.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-12 : urgence demandée par le demandeur, P0 (0.11.2).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — reproduire et corriger** [IA] : un test qui reproduit le refus silencieux d'un lancement sur arbre sale,
  puis le correctif. Critère de sortie : le test rouge avant, vert après ; `node .githooks/run-checks.mjs` sans échec.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé, non commité.
- **Prochaine étape** : [humain] `/drwil-start`.
