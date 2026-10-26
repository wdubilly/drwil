# Projet : une file de chantiers menée en parallèle, un worktree par chantier

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : à affiner

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/worktree.mjs
  - .githooks/state.mjs
  - .githooks/state-cli.mjs
  - .githooks/state-texts.mjs
  - .githooks/briefs.mjs
  - .githooks/worktree.mjs
  - .githooks/state.test.mjs
  - .githooks/worktree.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - .claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Une file de chantiers (QUA-037, une file de chantiers décidée d'un geste)
se mène aujourd'hui un chantier à la fois, dans le dossier du dépôt : le
suivant attend la fusion du précédent. Des chantiers indépendants
attendent donc leur tour sans raison. Avec un worktree par chantier,
lancé par le sondage (`docs/projects/journal.md`), la
session principale peut mener plusieurs chantiers de la file à la fois,
chacun dans un sous-agent qui travaille dans son propre worktree.

Périmètre : **livrable et ses miroirs dans le dépôt**.

## Critères d'acceptation

(contrats à créer au lancement, avec leur champ **Origine**.)

- Au sondage, l'humain choisit de mener la file en parallèle ; chaque
  fiche choisie est lancée dans son propre worktree par le hook, jamais
  par l'agent ; au plus N chantiers sont actifs à la fois — `QUA-147`
- Chaque chantier se mène dans un sous-agent dont le dossier de travail
  est son worktree ; la session principale ne garde que les comptes
  rendus — `QUA-148`
- Un chantier qui demande un humain arrête le lancement des suivants,
  sans interrompre ceux qui tournent ; le bilan de file dit l'état de
  chacun — `QUA-149`

## Contrats modifiés

- `QUA-037` (une file de chantiers décidée d'un geste) — ancien critère :
  « chaque chantier d'une file se mène dans un sous-agent (contexte neuf),
  un à la fois, dans le dossier du dépôt (jamais une copie isolée) [...] et
  ne lance jamais de suivante sur une fusion non faite » — raison : en
  mode parallèle, choisi au sondage, plusieurs chantiers tournent à la
  fois, chacun dans son worktree ; le mode séquentiel reste le défaut,
  inchangé (validé le 2026-10-26, texte soumis puis validé).
- `.githooks/state.mjs` — champ `parallel` de l'état et `recordParallel`
  (ajout, rien d'existant retiré) (validé par le demandeur le 2026-10-26).
- `.githooks/state-texts.mjs` — rappel d'état de la file parallèle et
  message du champ `parallel` (ajout) (validé par le demandeur le
  2026-10-26).
- `.githooks/worktree.mjs` — `launchParallel` et plafond `maxParallel`
  (ajout) (validé par le demandeur le 2026-10-26).
- `.githooks/briefs.mjs` — `scopesOverlap`, recoupement des cadrages
  (ajout) (validé par le demandeur le 2026-10-26).
- `.claude/hooks/prompt-hook.mjs` — question `drwil-parallel` du sondage
  (ajout) (validé par le demandeur le 2026-10-26).
- `.githooks/state.test.mjs` et `.githooks/worktree.test.mjs` — tests
  ajoutés (validé par le demandeur le 2026-10-26).

## 2. Hors périmètre

- La création d'un worktree et la garde de doublon :
  `docs/projects/journal.md`, à faire avant.
- Une file en parallèle sous un autre outil que Claude Code.
- Des chantiers qui dépendent l'un de l'autre : le sondage les refuse en
  parallèle, ou la file reste séquentielle (point à trancher).

## 3. Contraintes

- Fait après `docs/projects/journal.md`.
- La fusion automatique reste celle de QUA-138 (le retour en SCOPING
  attend la fusion de la PR), chantier par chantier, dans son worktree.
- Deux chantiers de la file qui touchent les mêmes fichiers de code se
  rencontrent à la fusion : le cadrage de la file doit le voir avant.

## 4. Décisions

Validées par le demandeur le 2026-10-25 :

1. Le sujet est rouvert en entier, en deux fiches ; celle-ci vient après
   le worktree par chantier.
2. Le lancement reste humain : c'est le sondage qui décide la file et son
   mode.

Validées par le demandeur le 2026-10-26 :

3. Au plus 3 chantiers actifs à la fois (réglage `maxParallel`).
4. Deux fiches dont les blocs `scope` se recoupent sont refusées en
   parallèle au sondage, sans rien créer.
5. Ordre de fusion libre.
6. Conflits de clôture sur `pending.md` et `journal.md` : le sous-agent
   rebase et résout seul (lot 2).
7. Worktrees menés par une session : dossier frère du dépôt (autorisation
   demandée à la session principale).

## 5. Points à trancher

- [décision] Texte exact de QUA-037 modifié (lot 2 : texte soumis au
  demandeur avant écriture).

## 6. Increments

- **Lot 1 — mode parallèle au sondage** [IA] : question du sondage, file
  enregistrée avec son mode, lancement de N worktrees par le hook ;
  tests.
- **Lot 2 — conduite par la session principale** [IA] : skill de
  lancement et rappel d'état (sous-agent par worktree, arrêt au premier
  chantier qui demande un humain, bilan) ; QUA-037 modifié ; README,
  changelog. Sortie : `node .githooks/run-checks.mjs` OK et
  `node packages/drwil/bin/drwil.js verify --evidence --agent` donnant
  `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-10-26) : lot 1 réalisé (QUA-147 : sondage,
  lancement des worktrees, plafond N, refus des cadrages qui se
  recoupent, enregistrement `parallel`) ; points décidés en section 4.
- **Travail non commité** : tout le lot 1.
- **Prochaine étape** : lot 2, après validation par le demandeur du texte
  de QUA-037 modifié.
