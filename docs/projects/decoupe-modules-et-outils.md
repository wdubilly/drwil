# Projet : les modules optionnels et les outils du dépôt découpés sous 200 lignes

**Statut** : cadré le 2026-10-27.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/decouper-les-fichiers-plafonnes.md`

<!-- scope
files:
  - packages/drwil/templates/common/optional/create-release/*.mjs
  - packages/drwil/templates/common/optional/dashboard/*.mjs
  - packages/drwil/templates/common/optional/create-release/README.md
  - packages/drwil/templates/common/optional/dashboard/README.md
  - outils/banc.mjs
  - outils/banc-juge.mjs
  - outils/banc-agents.mjs
  - outils/verifier-miroirs.mjs
  - outils/banc-texts.mjs
  - outils/miroirs.json
  - docs/intentions/decouper-les-fichiers-plafonnes.md
  - outils/banc-run.mjs
  - outils/banc-juge-rules.mjs
  - outils/banc-agents-cli.mjs
  - outils/verifier-miroirs-lib.mjs
  - .githooks/acceptance-sheet.mjs
  - .githooks/acceptance-sheet-texts.mjs
  - .githooks/acceptance-sheet-works.mjs
  - .githooks/create-release.mjs
  - .githooks/create-release-texts.mjs
  - .githooks/create-release-version.mjs
  - .githooks/recette-note.mjs
  - .githooks/recette-note-texts.mjs
  - .githooks/dashboard.mjs
  - .githooks/dashboard-texts.mjs
  - .githooks/dashboard-read.mjs
  - outils/banc.test.mjs
  - outils/banc-agents.test.mjs
  - outils/verifier-miroirs.test.mjs
  - .githooks/acceptance-sheet.test.mjs
  - .githooks/create-release.test.mjs
  - .githooks/recette-note.test.mjs
  - .githooks/dashboard.test.mjs
  - packages/drwil/test/*.test.mjs
  - .githooks/check-file-size.legacy.json
  - packages/drwil/CHANGELOG.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/architecture.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Dernier des quatre chantiers de la taille des fichiers. Les 8 derniers
fichiers au-dessus de 200 lignes (relevé du 2026-10-27,
`docs/intentions/decouper-les-fichiers-plafonnes.md`) sont découpés sous 200
lignes, sans changer leur comportement : trois du module de release et un
du module de tableau de bord, livrés aux projets qui les activent ; quatre
outils propres au dépôt (banc et vérification des miroirs).

À la fin, `.githooks/check-file-size.legacy.json` est vide : plus aucun
fichier du périmètre de QUA-001 ne dépasse 200 lignes.

## Critères d'acceptation

- Chaque fichier des modules optionnels et de `outils/` fait 200 lignes au
  plus, tests exclus ; `.githooks/check-file-size.legacy.json` ne contient
  plus aucun plafond — `QUA-001`
- Le comportement ne change pas : les tests du module de release, du
  tableau de bord, du banc et des miroirs passent avec leur couverture,
  aucun test n'étant modifié hors de ses chemins d'import — `QUA-004`

## 2. Hors périmètre

- La CLI et les hooks de base : fiches
  `docs/projects/journal.md` et
  `docs/projects/journal.md`.
- Changer ce que mesure le banc ou ce que vérifient les miroirs.

## 3. Contraintes

- Un fichier découpé par commit, contrôles verts à chaque pas ; son plafond
  hérité retiré dans le même commit.
- Les noms des nouveaux fichiers d'`outils/` listés au bloc `scope` sont
  ceux prévus au cadrage ; un autre nom s'ajoute par un commit qui ne
  touche que cette fiche.
- Sortie groupée en 0.10.0, avec sa recette.

## 4. Décisions

- 2026-10-27 — Tout fichier sous 200 lignes, sans exception (demandeur).
- 2026-10-27 — Une seule version, 0.10.0 (recommandation de l'agent, sans
  préférence du demandeur).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — les modules livrés** [IA] : acceptance-sheet.mjs,
  create-release.mjs, recette-note.mjs, dashboard.mjs. Critère de sortie :
  les quatre sous 200 lignes, `node .githooks/run-checks.mjs` vert.
- **Lot 2 — les outils du dépôt** [IA] : banc.mjs, banc-juge.mjs,
  banc-agents.mjs, verifier-miroirs.mjs. Critère de sortie :
  `.githooks/check-file-size.legacy.json` vide, `drwil verify --agent` en
  PASS.

## 7. Reprise

- **Dernier état** (2026-10-27) : réalisé, 8 fichiers découpés, plafonds hérités vidés ; clôture en cours.
- **Travail non commité** : aucun.
- **Prochaine étape** : fusion de la PR, puis la sortie 0.10.0 avec sa recette.
