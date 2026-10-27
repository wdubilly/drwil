# Intention : découper les fichiers plafonnés sous 200 lignes

**Statut** : proposée et cadrée le 2026-10-27 en trois fiches, réalisées juste
après `docs/projects/journal.md` et avant les autres fiches cadrées. La
première, la CLI du paquet (14 fichiers), est faite et consignée au journal ;
restent `docs/projects/decoupe-hooks-livres.md` et
`docs/projects/decoupe-modules-et-outils.md`. Retirée à la clôture de la
dernière.

## Besoin

La fiche du plafond à 200 lignes (QUA-001, fichier de code plafonné) ne
découpe rien : elle bloque chaque fichier trop gros à sa taille. Le
demandeur veut que tous maigrissent sous 200 lignes, pour que les fiches
suivantes partent sur des fichiers courts au lieu d'extraire en route, et
que `.githooks/check-file-size.legacy.json` se vide.

21 de ces fichiers sont des hooks copiés dans les projets qui adoptent le
kit : leur découpe ajoute des fichiers livrés. Aucun projet n'a encore
adopté le kit : un projet d'essai déjà équipé se désinstalle puis se
réinstalle.

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

## Décisions du cadrage (2026-10-27)

- Tout fichier sous 200 lignes, sans exception, même une table de textes ;
  `.githooks/check-file-size.legacy.json` se vide à la fin (demandeur).
- Aucune compatibilité avec une installation antérieure : aucun projet n'a
  encore adopté le kit ; un projet d'essai déjà équipé se désinstalle puis
  se réinstalle, et le changelog le dit (demandeur). Les ré-exports, le
  test de mise à jour depuis la 0.9.0 et le refus de mise à jour, envisagés
  au cadrage, sont abandonnés.
- Le plafond et les trois découpes sortent ensemble en 0.10.0
  (recommandation de l'agent, sans préférence du demandeur).

## Questions à trancher

Aucune : toutes tranchées au cadrage du 2026-10-27.
