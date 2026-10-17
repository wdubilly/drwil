# Projet : une mise à jour rafraîchit la prose du kit que le projet n'a pas touchée

**Statut** : cadré le 2026-10-17.
**Intention** : `docs/intentions/maj-prose-non-modifiee.md`
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/config.ts
  - packages/drwil/src/install.ts
  - packages/drwil/src/drift.ts
  - packages/drwil/src/manifest.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/render.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/preview.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/migration.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - README.md
  - packages/drwil/README.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/ia-first.md
-->

(cadrage : la règle de rafraîchissement (config, installation), la
résolution de dérive, le retrait des fichiers obsolètes (manifeste),
`doctor`, leurs tests, le registre (QUA-025, QUA-026,
QUA-027 évoluent), le réglage des contrôles, changelog, README et doc du
kit.)

## 1. Besoin

`npx drwil init` sur un projet déjà équipé ne rafraîchit que `.githooks/`
et `.claude/hooks/` (`KIT_MECHANICS`, `packages/drwil/src/config.ts`) : les
skills, recettes et instructions des agents restent à leur version
d'origine même quand le projet ne les a jamais touchées. Conséquence
directe sur la 0.6.x : le correctif du sondage (option « Not now » de la
skill `/drwil-start`, 0.6.2) n'atteint pas un projet installé avant, comme
`drwil_com` ; le futur hook de fin de réponse (fiche
`docs/projects/identifiant-libelle-en-fin-de-reponse.md`) ne serait pas
déclaré dans son `.claude/settings.json`. Seul `init --force` corrige, en
écrasant aussi ce que le projet a modifié.

Le manifeste `.drwil/installed-files.json` (si présent) garde l'empreinte
de chaque fichier installé : il permet de savoir, fichier par fichier, si
le projet l'a modifié.

## Critères d'acceptation

- Une mise à jour (`npx drwil init`) rafraîchit la prose du kit que le
  projet n'a pas modifiée — skills, recettes, `docs/ia-first.md`,
  instructions des agents (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor,
  Copilot), catalogue des contrats, `.claude/settings.json` — et ne touche
  jamais les documents de départ du projet (README, INSTALL, carte,
  registre, fiches, guides), même inchangés — `QUA-027`
- Une prose du kit modifiée par le projet n'est jamais écrasée par
  `init` : elle est signalée comme dérive, et `npx drwil resolve-drift`
  propose son diff, avec confirmation par fichier et sauvegarde `.bak`,
  comme pour les hooks — `QUA-027`
- Sur un projet installé avant l'enregistrement de version (manifeste
  présent, `.drwil/install.json` (si présent) absent), `init` enregistre
  une première version inconnue, et `doctor` dit « version d'origine
  inconnue (antérieure à 0.6.0) » au lieu d'une première installation
  fausse — `QUA-026`
- Le changelog (« Unreleased ») et la section de mise à jour des README
  disent ce qu'une mise à jour rafraîchit désormais — `QUA-040`

## Contrats modifiés

- `QUA-027` — ancien critère : « rafraîchit la mécanique jamais
  modifiée » (`.githooks/`, `.claude/hooks/`) — raison : la prose du kit
  et `.claude/settings.json` jamais modifiés sont rafraîchis aussi, et
  `resolve-drift` couvre la prose modifiée ; les documents de départ du
  projet restent intouchés ; rien n'est retiré (validé le 2026-10-17 par
  le demandeur, sondage de cadrage).
- `QUA-025` — ancien critère : `firstVersion` toujours une version —
  raison : sur un projet d'avant l'enregistrement, elle est inconnue
  plutôt que fausse (validé le 2026-10-17 par le demandeur).
- `QUA-026` — ancien critère : `doctor` affiche la première version
  installée — raison : il dit « antérieure à 0.6.0 » quand elle est
  inconnue (validé le 2026-10-17 par le demandeur).

## 2. Hors périmètre

- Corriger les projets déjà passés en 0.6.0 avec une première version
  enregistrée à tort (`firstVersion` 0.6.0) : rien ne permet de la
  distinguer après coup.
- Les fichiers que le projet est censé compléter, même inchangés (carte,
  registre, README, INSTALL, fiches, guides) : jamais rafraîchis.
- Les autres agents que Claude Code pour les hooks ; seule la prose de
  leurs instructions est concernée.

## 3. Contraintes

- Jamais écraser un fichier modifié par le projet : la décision repose
  sur l'empreinte du manifeste, et un manifeste forgé ne doit pas
  l'emporter (garde existante de `packages/drwil/src/manifest.ts`).
- Retrait des fichiers obsolètes : même règle que pour la mécanique (une
  prose du kit obsolète jamais modifiée est retirée, modifiée elle est
  gardée et signalée) ; `uninstall` garde son comportement (ne retire que
  ce que le kit a installé, jamais en silence).
- `init --dry-run` montre ce qui serait rafraîchi.
- Ordre avec la fiche du hook de fin de réponse : si celle-ci est fermée
  avant, son changelog dit `resolve-drift` ; ce chantier corrige alors la
  phrase (`init` suffit si `.claude/settings.json` est inchangé).
- Fichiers de code sous 400 lignes (QUA-001, fichier de code plafonné).

## 4. Décisions

- 2026-10-17 (demandeur, sondage) : rafraîchir la prose du kit, pas les
  documents de départ du projet ; prose modifiée : diff dans
  `resolve-drift` ; `.claude/settings.json` rafraîchi s'il est inchangé ;
  `doctor` dit « antérieure à 0.6.0 » quand la première version est
  inconnue.
- Proposé par l'agent : obsolètes de la prose du kit retirés s'ils sont
  inchangés, comme la mécanique.

## 5. Lots

- **Lot 1** : liste « prose du kit » (`packages/drwil/src/config.ts`), rafraîchissement et
  retrait des obsolètes, tests de caractérisation d'abord (mise à jour
  d'un projet d'essai : prose inchangée rafraîchie, modifiée gardée et
  signalée, documents du projet intouchés).
- **Lot 2** : `resolve-drift` sur la prose, `doctor` et version d'origine
  inconnue, contrats, changelog, README, doc du kit ; PR.

## 6. Reprise

- **Dernier état** (2026-10-17) : cadré ; rien de commencé.
