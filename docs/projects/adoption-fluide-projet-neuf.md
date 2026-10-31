# Projet : adoption fluide d'un projet sans code existant

**Statut** : cadré le 2026-10-30.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/installation-fluide.md`

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - .claude/settings.json
  - .claude/hooks/start-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - .githooks/worktree.mjs
  - .githooks/worktree.test.mjs
  - .githooks/state.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/base/.githooks/worktree.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/src/index.ts
  - packages/drwil/src/install.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - INSTALL.md
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
  - .claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - .githooks/state-cli.mjs
  - .githooks/state-texts.mjs
  - .githooks/state-messages-fr.mjs
  - .githooks/state-messages-en.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
-->

## 1. Besoin

Le parcours d'un adoptant qui installe drwil sur un projet **sans code existant** a trois frictions, vues à
l'installation de `drwil_walk` et à `drwil_dbox` :

1. Chaque commande git, gh ou `.githooks` courante déclenche une demande d'autorisation de Claude Code.
2. Le lancement d'un chantier ne propose pas toujours le worktree : la question est facultative, c'est
   l'agent qui doit l'ajouter au sondage (QUA-142 : le sondage de lancement peut mener le chantier dans un
   nouveau worktree, sur la seule réponse de l'humain).
3. Depuis que l'installation neuve écrit `scopeGate` en `blocking` (QUA-154), le premier commit du kit en
   SCOPING est refusé (« fichiers hors fiches commités en SCOPING ») sans que la recette le dise.

## Critères d'acceptation

- Le gabarit livre un `.claude/settings.json` Claude Code qui autorise sans demande les commandes git, gh et
  `.githooks` courantes et garde une demande sur `git push`, `merge` et `rebase` — contrat à créer
- Le hook du sondage de lancement refuse un sondage sans la question `drwil-worktree`, et `state.mjs start`
  propose aussi le worktree — contrat à créer
- Sur un projet neuf, `drwil init` commite lui-même le kit sur sa branche d'installation, et le premier
  chantier peut se lancer sans commit refusé — contrat à créer
- La recette d'adoption et `INSTALL.md` disent ce que fait `init` du premier commit et pourquoi une
  autorisation n'est pas demandée — [humain] — contrat à créer

## 2. Hors périmètre

- Attester depuis le chat, et ajouter ou adopter un contrat par commande : deux fiches à cadrer ensuite (la
  première exige une preuve de l'origine humaine, la seconde un choix de conception de la commande).
- Retirer le « ask » sur `git push`, `merge` et `rebase` : gardé (option écartée).
- Un projet avec code existant (`docs/intentions/adoption-et-init.md`).
- Le choix des outils IA et la première branche principale : `docs/projects/journal.md`.

## 3. Contraintes

- Le gabarit est la seule source ; la copie du dépôt suit (`scopeMirrors`).
- QUA-019 (pas de contournement) : une règle `allow` n'ouvre aucun geste que le hook ou la forge refusent
  (push sur la branche principale, QUA-017) ; elle ne coupe aucun contrôle.
- Le commit initial de `init` se fait avant toute barrière active et jamais sur la branche principale
  (QUA-017) : sur la branche d'installation déjà créée par `init`.
- Chevauche `docs/projects/journal.md` (`packages/drwil/src/index.ts`,
  `docs/recipes/adopt-the-kit.md`) : à lancer après elle.
- Doc visiteur (`INSTALL.md`, `packages/drwil/CHANGELOG.md`) en anglais.

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 :

- Autorisations livrées dans le gabarit, le « ask » sur push, merge et rebase gardé.
- La question `drwil-worktree` devient obligatoire dans le sondage de lancement.
- `init` fait le commit initial du kit (plutôt que documenter le parcours ou laisser la barrière en
  avertissement).
- Attester depuis le chat et la commande de contrat : fiches séparées, plus tard.

## 5. Points à trancher

- [IA] Liste exacte des commandes autorisées sans demande (git status, diff, log, add, commit, `gh pr view`,
  `node .githooks/*.mjs` en lecture) : à fixer au lot 1 en relevant les demandes réelles de `drwil_walk`.
- [IA] Si `init` s'exécute sur un dépôt git déjà commité, ou hors terminal, le commit initial est-il
  ignoré ? À fixer au lot 3 (par défaut : seulement sur un dépôt sans aucun commit).

## 6. Increments

- **Lot 1 — autorisations livrées** [IA] : `.claude/settings.json` du gabarit, tests de livraison, `INSTALL.md`.
  Critère de sortie : une installation neuve contient les règles `allow` et le `ask` conservé.
- **Lot 2 — worktree obligatoire** [IA] : `.claude/hooks/start-poll.mjs`, `state.mjs start`, skill de
  lancement, tests. Critère de sortie : un sondage de lancement sans `drwil-worktree` est refusé.
- **Lot 3 — commit initial du kit** [IA] : `packages/drwil/src/index.ts`, recette, tests sur un dossier vide.
  Critère de sortie : après `init` sur un dossier vide, le premier chantier se lance sans refus de commit.

## 7. Reprise

- **Dernier état** (2026-10-31) : lots 1 et 2 livrés. Lot 1 : règles `allow` gh en lecture et outils `.githooks` en lecture
  dans le gabarit et la copie, `ask` conservé. Lot 2 : le hook refuse un sondage sans `drwil-worktree` (formes Claude Code et
  Copilot CLI), `state.mjs start` au terminal pose la question du worktree (`WORKTREE`), le skill dit que la question est
  toujours posée (« Ce dossier » quand aucun dossier frère n'est possible). Les contrats à créer restent à écrire à la clôture.
- **Travail non commité** : aucun.
- **Prochaine étape** : lot 3, commit initial du kit.
