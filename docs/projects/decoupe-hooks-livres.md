# Projet : les hooks de base livrés découpés sous 200 lignes

**Statut** : cadré le 2026-10-27.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/decouper-les-fichiers-plafonnes.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/*.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/src/*.ts
  - packages/drwil/test/*.test.mjs
  - .githooks/base-checks.test.mjs
  - .githooks/check-control-coverage.test.mjs
  - .githooks/check-docs.test.mjs
  - .githooks/close-branches.test.mjs
  - .githooks/close.test.mjs
  - .githooks/consumption.test.mjs
  - .githooks/contracts.test.mjs
  - .githooks/detour.test.mjs
  - .githooks/doc-coherence.test.mjs
  - .githooks/engine.test.mjs
  - .githooks/glossary.test.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/scope-gate.test.mjs
  - .githooks/state.test.mjs
  - .githooks/worktree.test.mjs
  - .githooks/briefs.test.mjs
  - .githooks/state-cli.test.mjs
  - .githooks/state-texts.test.mjs
  - .githooks/check-file-size.legacy.json
  - packages/drwil/CHANGELOG.md
  - INSTALL.md
  - docs/architecture.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Troisième des quatre chantiers de la taille des fichiers. Les 17 hooks de
base au-dessus de 200 lignes (relevé du 2026-10-27,
`docs/intentions/decouper-les-fichiers-plafonnes.md`) sont découpés sous 200
lignes, sans changer leur comportement. Ils sont copiés dans tout projet
adopté : leur découpe y arrive à la mise à jour.

Aucun projet n'a encore adopté le kit (constat du demandeur, 2026-10-27) :
la découpe ne cherche aucune compatibilité avec une installation existante.
Un projet d'essai déjà équipé se désinstalle puis se réinstalle ; le
changelog le dit.

## Critères d'acceptation

- Chaque hook de base livré fait 200 lignes au plus, tests exclus, et n'a
  plus de plafond hérité — `QUA-001`
- Le comportement des hooks ne change pas : leurs tests et la couverture de
  `.githooks/` passent, aucun test n'étant modifié hors de ses chemins
  d'import — `QUA-004`
- Une installation neuve donne des hooks découpés qui tournent : premier
  commit accepté, chaque nouveau fichier installé, cité par
  `docs/projects/kit-mechanics.md` et retiré par `uninstall` — `QUA-004`

## 2. Hors périmètre

- Toute compatibilité avec une installation antérieure (ré-exports, refus
  de mise à jour) : aucun projet n'a encore adopté le kit.
- La CLI et les modules optionnels : fiches
  `docs/projects/decoupe-cli-du-paquet.md` et
  `docs/projects/decoupe-modules-et-outils.md`.

## 3. Contraintes

- Un hook découpé par commit, contrôles verts à chaque pas ; son plafond
  hérité retiré dans le même commit ; chaque nouveau fichier cité par
  `docs/projects/kit-mechanics.md`, installé par `init` et retiré par
  `uninstall` (manifeste).
- On modifie le gabarit, puis `npm run installer-depot` : les copies du
  dépôt suivent (contrôle `miroirs-gabarit`).
- Sortie groupée en 0.10.0 ; le changelog et `INSTALL.md` disent qu'un
  projet déjà équipé se désinstalle puis se réinstalle.

## 4. Décisions

- 2026-10-27 — Tout fichier sous 200 lignes, sans exception (demandeur).
- 2026-10-27 — Aucune compatibilité avec une installation antérieure : pas
  encore d'adoption ; un projet d'essai se désinstalle puis se réinstalle
  (demandeur).
- 2026-10-27 — Une seule version, 0.10.0 (recommandation de l'agent, sans
  préférence du demandeur).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — l'état et le moteur** [IA] : state.mjs, state-texts.mjs,
  state-cli.mjs, engine.mjs, run-checks.mjs, base-checks.mjs. Critère de
  sortie : les six sous 200 lignes, `node .githooks/run-checks.mjs` vert.
- **Lot 2 — les autres hooks** [IA] : detour.mjs, briefs.mjs,
  check-docs.mjs, close.mjs, consumption.mjs, worktree.mjs,
  doc-coherence.mjs, scope-gate.mjs, contracts.mjs,
  check-control-coverage.mjs, glossary.mjs ; changelog et `INSTALL.md`.
  Critère de sortie : aucun plafond hérité sous `.githooks/` pour les hooks
  de base, `drwil verify --agent` en PASS.

## 7. Reprise

- **Dernier état** (2026-10-27) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier, après la fusion de
  `docs/projects/decoupe-cli-du-paquet.md`.
