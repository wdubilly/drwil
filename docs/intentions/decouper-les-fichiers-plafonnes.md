# Intention : découper les fichiers plafonnés, sans rien casser à la mise à jour d'un projet adopté

**Statut** : proposée le 2026-10-27 — demande de l'humain, à cadrer en
trois fiches juste après `docs/projects/plafond-200-lignes.md` et avant les
autres fiches cadrées.

## Besoin

La fiche du plafond à 200 lignes (QUA-001, fichier de code plafonné) ne
découpe rien : elle bloque chaque fichier trop gros à sa taille. Le
demandeur veut que tous maigrissent sous 200 lignes, pour que les fiches
suivantes partent sur des fichiers courts au lieu d'extraire en route, et
que `.githooks/check-file-size.legacy.json` se vide.

Ce n'est pas qu'un refactor du dépôt : 21 de ces fichiers sont des hooks
copiés dans les projets adoptés. Leur découpe arrive chez chaque projet à
sa prochaine mise à jour par `npx drwil init`, qui doit rester sûre : rien
de cassé, rien de perdu, rien d'écrasé de ce que le projet a modifié.

## Existant (relevé le 2026-10-27)

39 fichiers au-dessus de 200 lignes, tests exclus, en trois familles :

- **CLI du paquet** (14), exécutée depuis le paquet, jamais copiée dans un
  projet ; dans `packages/drwil/src/` : verify.ts (398), migration.ts (379),
  guarantees.ts (377), essentials.ts et doctor.ts (268), config.ts (248),
  criteria.ts (246), manifest.ts (245), complete.ts (241),
  guarantees-forge.ts (229), existing-code.ts (216), guarantees-table.ts
  (213), render.ts (205) ; plus `packages/drwil/bin/drwil.js` (331).
- **Hooks de base livrés** (17), copiés dans tout projet ; dans
  `.githooks/` : state.mjs (395), engine.mjs (386), state-texts.mjs (381),
  detour.mjs (378), briefs.mjs (348), check-docs.mjs (344), close.mjs (325),
  consumption.mjs (319), run-checks.mjs (292), worktree.mjs (273),
  state-cli.mjs (259), doc-coherence.mjs (246), scope-gate.mjs et
  contracts.mjs (242), base-checks.mjs (221), check-control-coverage.mjs
  (210), glossary.mjs (206).
- **Modules optionnels livrés et outils du dépôt** (8) : dans `.githooks/`,
  acceptance-sheet.mjs (355), create-release.mjs (342) et recette-note.mjs
  (216), livrés par le module de release, et dashboard.mjs (347), livré par
  le module de tableau de bord ; dans `outils/`, propres au dépôt :
  banc.mjs (322), banc-juge.mjs (314), verifier-miroirs.mjs (282),
  banc-agents.mjs (225).

Mise à jour d'un projet adopté (`packages/drwil/src/install.ts`,
`packages/drwil/src/manifest.ts`, README du paquet, section `init`) :

- `init` sur un projet équipé crée ce qui manque : un nouveau fichier issu
  d'une découpe est installé.
- Il rafraîchit la mécanique du kit (`.githooks/`, `.claude/hooks/`)
  restée inchangée depuis son installation, et signale sans l'écraser un
  fichier modifié à la main (`resolve-drift`).
- `removeObsolete` retire un ancien fichier du kit absent du nouveau
  gabarit, seulement s'il est inchangé depuis son installation.
- Le manifeste `.drwil/installed-files.json` (si présent) enregistre chaque fichier installé ;
  `uninstall` s'en sert pour retirer le kit.
- `docs/projects/kit-mechanics.md` cite chaque hook livré, un par ligne,
  pour la barrière de cadrage ; `packages/drwil/test/kit.test.mjs` le
  vérifie.
- Précédent : `.githooks/close-branches.mjs` extrait de `.githooks/close.mjs` dans la 0.9.0,
  qui ré-exporte les mêmes fonctions (journal du 2026-10-26).

## Le risque propre à la mise à jour

Un projet qui a modifié un hook à la main garde son ancienne version : la
mise à jour la signale sans l'écraser. Les autres hooks, rafraîchis, et les
nouveaux fichiers, installés, cohabitent alors avec cet ancien fichier.
Si un hook rafraîchi importe d'un fichier découpé une fonction qui a quitté
sa version ancienne, ou d'un nouveau fichier une fonction que l'ancienne
version définit encore autrement, le hook casse au premier commit du
projet, hors de toute CI de drwil.

## Piste

- Chaque fichier découpé garde ses exports d'origine en les ré-exportant
  depuis ses nouveaux modules (comme `.githooks/close.mjs` pour `.githooks/close-branches.mjs`) :
  un appelant ancien ou nouveau trouve toujours la même fonction au même
  endroit.
- Un test de mise à jour rejoue l'installation d'une version précédente,
  modifie un hook découpé à la main, met à jour et prouve que les hooks
  tournent encore (premier commit accepté), que le fichier modifié est
  signalé et non écrasé, et que les nouveaux fichiers sont au manifeste.
- Chaque nouveau fichier livré est cité par `docs/projects/kit-mechanics.md` et retiré
  par `uninstall`.
- Trois fiches, chacune sa PR, un fichier découpé par commit, contrôles
  verts à chaque pas (recette `docs/recipes/refactor-without-breaking.md`),
  chaque plafond hérité baissé ou retiré dans le même commit :
  1. la CLI du paquet (14 fichiers, aucun effet sur les fichiers d'un
     projet) ;
  2. les hooks de base livrés (17 fichiers, la mise à jour en jeu) ;
  3. les modules optionnels livrés et les outils du dépôt (8 fichiers).
- Le changelog dit ce que la mise à jour ajoute aux projets, et qu'un hook
  modifié à la main se réconcilie par `resolve-drift`.

## Questions à trancher

- [décision] Les ré-exports restent-ils pour toujours, ou une version
  ultérieure les retire-t-elle, une fois les projets mis à jour ?
- [décision] Le test de mise à jour part-il de la dernière version publiée
  (0.9.0) ou de la plus ancienne encore migrée ?
- [décision] Un fichier qui ne se découpe pas proprement sous 200 lignes
  (une table de textes comme `.githooks/state-texts.mjs`) garde-t-il un plafond
  hérité, déclaré et justifié, plutôt qu'un découpage artificiel ?
- [décision] Les trois fiches sortent-elles dans une même version, ou une
  version chacune ?
