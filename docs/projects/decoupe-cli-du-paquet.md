# Projet : la CLI du paquet découpée sous 200 lignes

**Statut** : cadré le 2026-10-27.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/decouper-les-fichiers-plafonnes.md`

<!-- scope
files:
  - packages/drwil/src/*.ts
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/*.test.mjs
  - .githooks/check-file-size.legacy.json
  - docs/architecture.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Deuxième des quatre chantiers de la taille des fichiers, après
`docs/projects/journal.md`. Les 14 fichiers de la CLI au-dessus
de 200 lignes (relevé du 2026-10-27, `docs/intentions/decouper-les-fichiers-plafonnes.md`)
sont découpés sous 200 lignes, sans changer le comportement. La CLI
s'exécute depuis le paquet et n'est jamais copiée dans un projet : la mise
à jour d'un projet adopté n'est pas en jeu.

## Critères d'acceptation

- Chaque fichier de `packages/drwil/src/` et `packages/drwil/bin/` fait 200
  lignes au plus, tests exclus, et n'a plus de plafond hérité dans
  `.githooks/check-file-size.legacy.json` — `QUA-001`
- Le comportement de la CLI ne change pas : la suite du paquet passe avec sa
  couverture à 100 %, aucun test n'étant modifié hors de ses chemins
  d'import — `QUA-004`

## 2. Hors périmètre

- Les hooks et les modules optionnels : fiches
  `docs/projects/decoupe-hooks-livres.md` et
  `docs/projects/decoupe-modules-et-outils.md`.
- Toute correction de comportement trouvée en route : commit séparé avec son
  test, signalée (recette `docs/recipes/refactor-without-breaking.md`).

## 3. Contraintes

- Un fichier découpé par commit, contrôles verts à chaque pas ; son plafond
  hérité retiré dans le même commit.
- Les exports publics du paquet (`packages/drwil/src/index.ts`) ne changent
  pas.
- Sortie groupée en 0.10.0 avec les trois autres chantiers de la taille des
  fichiers : pas de release propre.

## 4. Décisions

- 2026-10-27 — Tout fichier sous 200 lignes, sans exception (demandeur).
- 2026-10-27 — Une seule version pour le plafond et les trois découpes,
  0.10.0 (recommandation de l'agent, sans préférence du demandeur).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — les plus gros** [IA] : verify.ts, migration.ts, guarantees.ts
  et `packages/drwil/bin/drwil.js`. Critère de sortie : les quatre sous 200
  lignes, `node .githooks/run-checks.mjs` vert.
- **Lot 2 — les autres** [IA] : les dix fichiers restants. Critère de
  sortie : aucun plafond hérité sous `packages/drwil/`, `drwil verify
  --agent` en PASS.

## 7. Reprise

- **Dernier état** (2026-10-27) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier, après la fusion de
  `docs/projects/journal.md`.
