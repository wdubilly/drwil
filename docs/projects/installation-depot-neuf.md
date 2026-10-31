# Projet : installation d'un dépôt neuf

**Statut** : cadré le 2026-10-30.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .githooks/pre-push
  - .githooks/engine-branch.mjs
  - .githooks/engine-texts.mjs
  - .githooks/engine.test.mjs
  - packages/drwil/templates/common/base/.githooks/pre-push
  - packages/drwil/templates/common/base/.githooks/engine-branch.mjs
  - packages/drwil/templates/common/base/.githooks/engine-texts.mjs
  - packages/drwil/src/guarantees-forge.ts
  - packages/drwil/src/guarantees-forge-texts.ts
  - packages/drwil/src/guarantees.ts
  - packages/drwil/src/protection.ts
  - packages/drwil/src/cli-install.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/src/install.ts
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/test/protection.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/recipes/adopt-the-kit.md
  - docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/README.md
  - .drwil/ia-first.json
  - outils/tester-tarball.mjs
-->

## 1. Besoin

Vu à l'installation réelle de `drwil_walk` (projet neuf), trois points où le kit laisse l'installation en
panne ou décide à la place de l'utilisateur :

1. **Première branche principale.** QUA-017 (pas de travail direct sur la branche principale) refuse tout
   envoi vers `master`, y compris le tout premier sur un dépôt GitHub vide ; le kit ne prévoit aucune
   procédure, et l'agent a dû créer la branche côté forge avec `gh api` après accord du demandeur.
2. **Auto-merge du dépôt neuf.** La protection de la branche principale est en place, mais le dépôt
   n'autorise pas l'auto-merge : `.githooks/merge-auto.mjs` refuse (« auto-merge non autorisé par le
   dépôt »), et qui choisit « Automatic merge » au lancement échoue à la clôture.
3. **Choix des outils IA.** `init` configure par défaut cinq outils (Claude, Codex, Cursor, Gemini, Copilot)
   sans le demander ; à `drwil_walk` l'agent a choisi Claude seul de lui-même pour garder le dossier léger,
   un choix qui revient à l'utilisateur.

## Critères d'acceptation

- Sur un dépôt distant sans aucune branche, le tout premier envoi de la branche principale est accepté une
  seule fois par le hook de push ; dès que le distant a une branche principale, tout envoi direct est
  refusé comme avant — contrat à créer
- La recette d'un projet neuf dit comment faire ce premier envoi, et que l'exception ne vaut qu'une fois —
  contrat à créer
- `drwil guarantees --protect`, avec l'accord de l'humain, active aussi l'auto-merge du dépôt GitHub avec la
  protection de la branche principale, et `drwil doctor` dit si l'auto-merge est autorisé — contrat à créer
- `init` demande à l'humain quels outils IA configurer en terminal interactif ; sans terminal, il refuse
  de choisir à sa place et demande `--tools` — contrat à créer
- La recette d'adoption dit ce que chaque outil IA ajoute au dépôt — [humain] — contrat à créer

## Contrats modifiés

- `QUA-017` — ancien critère : « Commiter ou pousser directement sur la branche principale est refusé, y
  compris le tout premier commit d'un dépôt » (le commit local reste refusé ; seul le tout premier envoi vers
  un distant vide est excepté) — raison : sur un dépôt distant vide, aucune branche principale n'existe pour
  fusionner une PR ; l'exception est bornée à ce seul envoi, sans porte de sortie configurable (validé le
  2026-10-30)

## 2. Hors périmètre

- Signaler un défaut du kit au dépôt drwil : fiche à part.
- L'auto-merge côté GitLab : pas de réglage équivalent à « Allow auto-merge » ; seul GitHub est traité.
- Créer le dépôt distant lui-même (`gh repo create`) : l'agent ne crée rien sur la forge hors accord.
- Le classement « nouveau » ou « existant » et la contradiction `guarantees` / `verify` : fiche
  `docs/projects/cloture-sur-projet-neuf.md`.

## 3. Contraintes

- Le gabarit (`packages/drwil/templates/`) est la seule source ; la copie du dépôt suit (`scopeMirrors`).
- QUA-019 (pas de contournement) : l'exception de QUA-017 est une règle écrite, testée, bornée au distant
  sans aucune branche ; aucun réglage ne la désactive ni ne l'élargit.
- Changer un réglage de forge exige l'accord de l'humain, comme `--protect` aujourd'hui (QUA-013 : un
  réglage non lu reste « non vérifié », jamais atteint).
- En CI (`process.env.CI`) le contrôle de branche ne tourne pas : l'exception ne concerne que les hooks locaux.

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 :

- Première branche principale : une exception bornée de QUA-017 au tout premier envoi vers un distant vide
  (plutôt qu'une étape outillée côté forge ou une recette seule).
- Auto-merge : activé avec la protection (`drwil guarantees --protect`), vérifié par `drwil doctor`.
- Outils IA : `init` demande en terminal interactif ; sans terminal, `--tools` devient obligatoire ; la
  recette dit l'effet de chaque choix.

## 5. Points à trancher

- [IA] Détection du « distant sans aucune branche » dans le hook de push (par exemple
  `git ls-remote --heads <remote>` vide, hors ligne = pas d'exception) : à fixer au lot 1 avec des tests sur
  un distant local vide.
- [IA] Les installations existantes lancent `init` sans terminal (CI, mise à jour) : `--tools` devient
  obligatoire seulement à la première installation, pas à une mise à jour qui lit les outils déjà
  enregistrés.

## 6. Increments

- **Lot 1 — premier envoi sur un distant vide** [IA] : hook de push et `.githooks/engine-branch.mjs`, QUA-017
  modifié, recette. Critère de sortie : sur un distant local vide le premier envoi passe, le second est refusé.
- **Lot 2 — auto-merge avec la protection** [IA] : `packages/drwil/src/guarantees-forge.ts`, `packages/drwil/src/protection.ts` (doctor), tests,
  recette. Critère de sortie : `--protect` active l'auto-merge sur un faux `gh`, `doctor` le lit.
- **Lot 3 — choix des outils IA** [IA] : `packages/drwil/src/cli-install.ts` (question interactive, refus sans terminal),
  recette d'adoption. Critère de sortie : sans terminal ni `--tools`, `init` d'un projet neuf s'arrête avec
  un message qui nomme l'option.

## 7. Reprise

- **Dernier état** (2026-10-30) : cadré, décisions prises, aucun code.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] lancer par `/drwil-start`.
