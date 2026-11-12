# Projet : la fusion automatique est le comportement par défaut, sans sondage

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/retours-du-demandeur-0-11-2.md` (point 4)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/merge-auto.mjs
  - packages/drwil/templates/common/base/.githooks/state-merge.mjs
  - packages/drwil/templates/common/base/.githooks/state-validate.mjs
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/merge-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/queue-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/portable-polls.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/scope-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/docs/ia-first/7-starting-and-closing.md
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - packages/drwil/templates/common/base/AGENTS.md
  - .githooks/merge-auto.test.mjs
  - .githooks/state-merge.test.mjs
  - .githooks/state.test.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Le demandeur veut que la fusion automatique soit le comportement par défaut : plus de sondage `drwil-merge` au
lancement d'un chantier, plus de sondage `drwil-scope` à la fin d'un cadrage. Aujourd'hui l'autorisation
« Automatic merge » est une réponse humaine, lue par un hook (`.claude/hooks/merge-poll.mjs`), sans laquelle
`.githooks/merge-auto.mjs` refuse (QUA-163).

## Critères d'acceptation

- Après la clôture d'un chantier et son push, `.githooks/merge-auto.mjs` programme la fusion sans autorisation
  préalable de l'humain, avec toutes ses autres garanties (état calculé, mise à jour si en retard, relecture sur la
  forge) — `QUA-161`
- Les garde-fous restent : jamais de fusion programmée sur un état inconnu, en retard, en conflit, une MR fermée ou
  d'une autre branche — `QUA-162`
- Le sondage de lancement ne pose plus `drwil-merge` et celui de fin de cadrage disparaît ; un cadrage poussé voit sa
  PR mise en fusion automatique par l'agent — `QUA-187`
- Un réglage hérité (`auto_merge`, `scoping_merge`) dans un état existant ne casse rien — `QUA-188`

## Contrats modifiés

- `QUA-163` — ancien critère : « L'outil de fusion automatique ne s'exécute qu'avec l'autorisation « Automatic merge » donnée au lancement » — raison : la fusion automatique est le comportement par défaut, sans autorisation (validé le 2026-11-12)
- `QUA-187` — ancien critère : « En fin de cadrage, le skill pose un sondage à trois réponses » — raison : le sondage de fin de cadrage est retiré (validé le 2026-11-12)
- `QUA-188` — ancien critère : « La réponse « Automatic merge » de fin de cadrage ouvre l'outil de fusion automatique pour la PR de sa branche » — raison : plus de réponse, la PR de la branche est mise en fusion automatique d'office (validé le 2026-11-12)
- `QUA-164` — ancien critère : « La consigne de l'état et le skill de lancement appellent l'outil de fusion automatique » — raison : l'appel n'est plus conditionné à une autorisation (validé le 2026-11-12)
- `QUA-266` — ancien critère : sondages `drwil-limite` et `drwil-merge` lus par le hook sous les autres outils — raison : `drwil-merge` n'existe plus (validé le 2026-11-12)
- `.githooks/merge-auto.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-12)
- `.githooks/state-merge.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-12)
- `.githooks/state-validate.mjs` — gardé à sa version de la branche (QUA-113), si le chantier le modifie (validé le 2026-11-12)

## 2. Hors périmètre

- Le client GitLab de merge-auto (`docs/projects/journal.md`, fait le 2026-11-12) : à faire avant, les deux chantiers touchent le même hook.
- Le sondage `drwil-limite`, le sondage de lancement lui-même (fiche, worktree).
- Un réglage pour refuser la fusion automatique (décidé : inconditionnelle).

## 3. Contraintes

- Décidé le 2026-11-12 : inconditionnelle, sans réglage. Le garde-fou qui remplace l'autorisation est la preuve : CI
  verte, PR de la branche active, vérification relue sur la forge.
- Les fichiers d'état déjà écrits avec `auto_merge` ou `scoping_merge` restent lisibles (QUA-013 : illisible = refus, pas succès).
- On édite le gabarit `packages/drwil/templates/` puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-12 : fusion automatique inconditionnelle, sans réglage ; sondages `drwil-merge` et `drwil-scope` retirés ; modification de QUA-163, QUA-164, QUA-187, QUA-188 et QUA-266 validée par le demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — outil et état** [IA] : `.githooks/merge-auto.mjs` n'exige plus d'autorisation ; `.githooks/state-merge.mjs` et `.githooks/state-validate.mjs` lisent sans la produire les marques héritées ; tests. Critère de sortie : tests de merge-auto et de l'état verts.
- **Lot 2 — sondages, skills, docs, contrats** [IA] : retrait de `drwil-merge` et `drwil-scope` des hooks et skills, consignes, `AGENTS.md`, `docs/contracts.md`, `npm run installer-depot`. Critère de sortie : `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé, non commité.
- **Prochaine étape** : [humain] `/drwil-start`, après `support-gitlab-merge-auto`.
