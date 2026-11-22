# Intention : cadrer en parallèle du chantier, dans un worktree, avec sa propre PR

**Statut** : proposée le 2026-11-22, demande du demandeur. Livrable (pour tout adoptant) et dépôt.

## Besoin

Constat du demandeur le 2026-11-22 : pendant un chantier (BUILD, VERIFY, CLOSING), le rappel d'état ne propose que
`node .githooks/note.mjs`, qui écrit dans le dossier du chantier (« elle part avec la branche du chantier »). Rien ne
dit qu'on peut cadrer une intention ou une fiche en parallèle, dans un worktree créé depuis la branche principale, avec
sa propre petite PR. La pratique a pourtant servi trois fois le 2026-11-22 sans gêner le chantier, et l'agent a deux
fois dit à tort que c'était impossible.

Deux pistes à cadrer :

1. le rappel d'état (BUILD, VERIFY, CLOSING) ajoute ce chemin ;
2. un outil qui fait le geste d'un coup : worktree depuis la branche principale à jour, dépendances installées,
   cadrage, PR de cadrage en fusion automatique, worktree retiré après la fusion.

## Existant

Relevé dans le code le 2026-11-22.

- Le rappel d'état (`.githooks/state-context-texts.mjs`, gabarit sous `packages/drwil/templates/common/base/.githooks/`)
  dit, pour toute activité : « Noter une idée sans changer d'activité : `node .githooks/note.mjs '<texte>'` ». Il nomme
  les worktrees frères du même dépôt et interdit de les modifier (QUA-143), sans parler d'un worktree de cadrage.
- `.githooks/note.mjs` ajoute une ligne à `docs/intentions/notes.md` dans le dossier courant, sans commit : la note
  part avec la branche du chantier.
- Le chantier « cadrage-en-build » (clos le 2026-11-19, `docs/preuves/cadrage-en-build.md`) permet de commiter une
  fiche ou une intention en BUILD sur la branche du chantier, sans toucher au périmètre (QUA-016) ; le cadrage part
  alors avec la PR du chantier, pas dans sa propre PR.
- `docs/intentions/cadrer-pendant-un-chantier.md` (tranchée le 2026-11-12) envisageait déjà un worktree dédié
  (`../<dépôt>-cadrage`, branche `cadrage/…`) ; la réponse retenue fut le cadrage dans le dossier du chantier. Reste
  ouverte la fiche `docs/projects/index-par-fiche.md` (conflits sur l'index commun).
- Worktrees existants : un par chantier, lancé par le sondage (QUA-142), file parallèle (QUA-147) ; rien pour le
  cadrage. `docs/intentions/nettoyage-des-worktrees.md` traite du repositionnement après une clôture.
- Fusion automatique de la PR de cadrage : `node .githooks/merge-auto.mjs <n>` et la compétence `drwil-scope`.

## Questions à trancher

- [décision] Piste 1, piste 2, ou les deux, et dans quel ordre.
- [décision] Coût des dépendances dans le worktree : `npm ci` complet (exigé par le pre-push), partage du
  `node_modules` du dossier principal, ou hooks de cadrage qui s'en passent.
- [décision] Chevauchement avec le chantier en cours : une intention de cadrage qui cite les fichiers du chantier,
  conflits sur `docs/projects/pending.md` (lié à `docs/projects/index-par-fiche.md`), fusion avant ou après le
  chantier.
- [décision] Outils autres que Claude Code (Copilot CLI, Gemini CLI, Codex, Cursor) : le geste doit être le même,
  sans fonction propre à un outil.
- [décision] Retrait du worktree après la fusion : par l'outil, par le pr-watch, ou par le nettoyage des worktrees.
- [décision] Rapport avec `.githooks/note.mjs` : le rappel garde la note pour une idée d'une ligne et propose le worktree pour une
  intention ou une fiche, ou l'un remplace l'autre.
