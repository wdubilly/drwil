# Projet : un chantier par worktree, lancé d'un geste humain

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/worktree.mjs
  - .githooks/worktree.mjs
  - .githooks/worktree.test.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - .githooks/state.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - .githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - .githooks/close.mjs
  - .githooks/close.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - .claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/working-with-branches.md
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/ia-first.md
  - docs/architecture.md
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/kit-mechanics.md
-->

## 1. Besoin

Travailler sur deux chantiers à la fois impose aujourd'hui de tout faire à
la main : `git worktree add`, l'installation des dépendances, puis un
lancement dans le nouveau dossier. Rien n'empêche de lancer la même fiche
dans deux worktrees, puisque le fichier d’état (.drwil/state.json) n'est pas versionné et que
chaque dossier a le sien (absent = SCOPING neutre). Les deux chantiers se
rencontrent ensuite à la clôture, sur `docs/projects/pending.md` et
`docs/projects/journal.md`, sans que rien ne prévienne qu'une branche est
en retard sur la branche principale.

Ce chantier livre le modèle « un terminal par worktree » : l'humain lance
chaque chantier, chaque dossier a sa session principale et ses sous-agents.
Il prépare la file menée en parallèle
(`docs/projects/file-en-parallele.md`).

Périmètre : **livrable et ses miroirs dans le dépôt**. Éditer uniquement
le gabarit, puis installer ses copies avec `npm run installer-depot`.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; ID
à attribuer à ce moment-là dans le registre.)

- Au sondage de lancement, l'humain peut choisir de mener le chantier dans
  un nouveau worktree ; la réponse, lue par le hook et jamais par l'agent,
  crée le dossier et sa branche depuis la branche principale à jour, et y
  lance le chantier : son fichier d'état (.drwil/state.json) est écrit par
  `.githooks/state.mjs`, jamais à la main, et l'état du dossier d'origine
  ne change pas — `QUA-142`
- Un agent ne prend jamais un worktree pour un dépôt distinct : dans un
  worktree, le rappel d'état (`node .githooks/state.mjs` et l'injection
  de début de session) nomme le dépôt principal, la branche et le
  chantier du dossier, dit que les autres dossiers listés sont des
  worktrees du même dépôt et qu'on ne modifie que le sien ; dans le
  dossier principal, il liste les worktrees ouverts et leur chantier —
  `QUA-143`
- Une commande d'installation déclarée dans `.drwil/ia-first.json` est
  lancée dans le nouveau worktree ; sans réglage, rien n'est lancé et la
  sortie dit quoi faire ; un échec d'installation est dit, le worktree et
  l'état restent — `QUA-144`
- Le lancement d'une fiche déjà active dans un autre worktree du même
  dépôt est refusé, avec le chemin de ce worktree — `QUA-145`
- `node .githooks/close.mjs --check` signale une branche de chantier en
  retard sur la branche principale et donne la commande de mise à jour ;
  la clôture n'est pas refusée pour ce motif — `QUA-146`

(la recette, lot 3, accompagne ces contrats sans en être un : un terminal
et une session par worktree, conflits attendus sur l'index et le journal,
nettoyage après la fusion.)

## Contrats modifiés

- `.githooks/state.mjs` — garde de doublon au lancement : une fiche déjà
  active dans un autre worktree du même dépôt est refusée (validé par le
  demandeur le 2026-10-26)
- `.githooks/state-texts.mjs` — rappel d'état : textes de la garde et
  liste des worktrees (validé par le demandeur le 2026-10-26)
- `.githooks/close.mjs` — `--check` signale le retard de la branche sur la
  branche principale distante, sans refuser la clôture (validé par le
  demandeur le 2026-10-26)

## 2. Hors périmètre

- La file de chantiers menée en parallèle par une session qui orchestre
  des sous-agents : `docs/projects/file-en-parallele.md`. La file reste
  séquentielle, dans le dossier du dépôt (QUA-037 inchangé).
- La résolution automatique des conflits de clôture.
- Le nettoyage automatique des worktrees après la fusion : la recette le
  décrit, aucune commande ne supprime un dossier.
- Les autres outils que Claude Code pour le sondage (Copilot CLI lit les
  mêmes hooks : à vérifier, pas à adapter dans ce chantier).

## 3. Contraintes

- `.githooks/close.mjs` est au plafond de 400 lignes (QUA-001, fichier de code
  plafonné) : ce chantier vient **après**
  `docs/projects/journal.md`. `.githooks/state.mjs` est à 384 lignes : la
  création du worktree et la garde vivent dans un nouveau module, .githooks/worktree.mjs, `.githooks/state.mjs`
  ne fait que l'appeler.
- Un worktree hérite de la configuration commune : ne jamais écrire dans
  la configuration du dépôt principal (QUA-056, un push depuis un worktree
  ne touche jamais le dépôt principal).
- La garde lit `git worktree list --porcelain` et l'état de chaque
  dossier listé ; un dossier listé mais disparu est ignoré, pas une
  erreur.
- Le retard se mesure sur la branche principale distante après
  `git fetch` ; sans réseau, le signal le dit et ne conclut rien.
- Messages en français et en anglais, comme le reste des hooks.

## 4. Décisions

Validées par le demandeur le 2026-10-25 :

1. Le sujet « chantiers en parallèle », abandonné le 2026-10-25 au ménage
   des intentions, est rouvert en entier, en deux fiches : celle-ci, puis
   `docs/projects/file-en-parallele.md`.
2. Le lancement dans un worktree passe par une question du sondage
   `/drwil-start` : c'est la réponse de l'humain qui vaut lancement.
3. L'installation des dépendances est une commande déclarée dans
   `.drwil/ia-first.json` (dans ce dépôt : `npm ci`), facultative.
4. Le retard sur la branche principale est signalé, jamais refusé.
5. Le worktree est un dossier frère, `../<dépôt>-<fiche>`, jamais un
   dossier sous le dépôt : aucun outil qui parcourt le disque n'y voit une
   seconde copie du projet.
6. Un agent ne doit jamais croire qu'il y a plusieurs dépôts : le rappel
   d'état le dit, dans chaque worktree comme dans le dossier principal.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — module worktree et garde** [IA] : création du worktree et de
  sa branche, commande d'installation déclarée, garde de doublon appelée
  par `start` ; tests sur dépôt jetable, dont le dépôt principal inchangé.
- **Lot 2 — sondage** [IA] : question du sondage, lecture par le hook,
  lancement dans le nouveau dossier, rappel d'état qui nomme le dépôt
  principal et ses worktrees ; tests du hook et de l'état.
- **Lot 3 — retard et recette** [IA] : signal de `close.mjs --check`,
  recette, carte, README du paquet, ligne « Unreleased » du changelog.
  Sortie : `node .githooks/run-checks.mjs` OK et
  `node packages/drwil/bin/drwil.js verify --evidence --agent` donnant
  `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer (`/drwil-start`) après la clôture
  de `docs/projects/journal.md`.
