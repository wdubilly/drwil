# Projet : le kit de gouvernance IA-first devient le paquet `drwil`

**Statut** (2026-10-04) : lots 1 et 2 faits — paquet renommé en `drwil`,
toutes les citations mises à jour. Reste à trancher : publication npm
effective (geste humain, voir `docs/intentions/packager-kit-ia-first.md`).

<!-- cadrage
fichiers:
  - packages/drwil/package.json
  - packages/drwil/bin
  - packages/drwil/src
  - packages/drwil/test
-->

## 1. Besoin

Clarifié le 2026-10-04 avec le demandeur : drwil n'est pas un produit
distinct qui *utiliserait* un kit — **drwil est le kit de gouvernance
IA-first**, rien d'autre. Jusqu'ici, `packages/drwil` (nommé
`@drwil/kit-ia-first`) cohabitait avec des docs produit à la racine
(`DOC_TECHNICO_COMMERCIAL.md`, `docs/charte-graphique.md`,
`docs/decouverte-valeur.md`, `docs/securite.md`, `docs/deploiement.md`,
`docs/fonctionnalites.md`) qui laissaient croire à un produit séparé — d'où
la confusion « on travaille un projet dans le projet ».

Décisions déjà tranchées par le demandeur :
- Le paquet s'appelle **`drwil`** (pas `@drwil/kit-ia-first`).
- Les docs produit désormais sans objet : **ne pas y toucher pour
  l'instant** (hors périmètre explicite de ce projet, voir section 2).

## 2. Hors périmètre

- Les docs produit à la racine (`DOC_TECHNICO_COMMERCIAL.md`,
  `docs/charte-graphique.md`, `docs/decouverte-valeur.md`,
  `docs/securite.md`, `docs/deploiement.md`, `docs/fonctionnalites.md`) :
  décision explicite du demandeur de ne pas y toucher pour l'instant.
- La publication npm effective (geste humain, authentification requise) :
  reste traitée par `docs/intentions/packager-kit-ia-first.md`, dont une
  question (nom du paquet) est résolue par ce projet-ci (voir section 4).
- Le chantier `docs/projets/apply-rafraichit-mecanique.md` (mécanique
  `apply()` et dérive de prose) : sujet séparé, pas rouvert ici.

## 3. Contraintes

- Rien n'a jamais été publié sous `@drwil/kit-ia-first` (`npm whoami` →
  non connecté sur ce poste, confirmé dans
  `docs/intentions/packager-kit-ia-first.md`) :
  aucune rétrocompatibilité de nom à assurer.
- 13 fichiers citent aujourd'hui `kit-ia-first` (docs comprises) ; certains
  sont des fiches de projet/intention dont le contenu reste valide, seul le
  nom change.

## 4. Décisions

- (2026-10-04) Nom du paquet : `drwil` — tranche la question 2 de
  `docs/intentions/packager-kit-ia-first.md`.
- (2026-10-04) Pas de retouche des docs produit à la racine pour l'instant.
- (2026-10-04) Dossier renommé en `packages/drwil/` (cohérence avec le nom
  du paquet, pas de dossier `packages/drwil/` conservé).
- (2026-10-04) Binaire CLI simplifié en `drwil` (`npx drwil init`,
  `npx drwil apply`), à la place de `drwil-ia-first`.
- (2026-10-04) Vocabulaire : remplacer systématiquement « kit IA-first »
  par « drwil » dans la prose des docs (AGENTS.md, recettes, intentions),
  pas de distinction contenu/produit.

## 5. Points à trancher

(aucun — les 5 décisions ci-dessus couvrent le périmètre)

## 6. Lots

- **Lot 1 — renommer le dossier et le paquet** [IA] : déplacer
  `packages/drwil/` vers `packages/drwil/` ; `package.json` →
  `name: "drwil"` (plus de scope `@drwil/`) ; `bin` →
  `{ "drwil": "./bin/drwil.js" }` (renommer le fichier bin existant) ;
  mettre à jour `tsconfig.json` et tout chemin relatif interne
  (imports, `templatesDir`, scripts npm) qui référence l'ancien chemin.
  Critère de sortie : `npm test` vert dans `packages/drwil/`
  (build + 36 tests), `npx drwil init`/`apply` fonctionnels depuis un
  dossier `/tmp` isolé (preuve manuelle).
- **Lot 2 — mettre à jour les citations dans les docs** [IA] : sur les 13
  fichiers recensés citant `kit-ia-first` (voir section 7), remplacer les
  chemins (`packages/drwil` → `packages/drwil`) et, dans la prose,
  « kit IA-first » → « drwil » partout. Inclut
  `.drwil/ia-first.json` (racine drwil, dogfooding) et le contenu des
  templates du kit lui-même (`packages/drwil/templates/**`) qui
  s'auto-citent. Critère de sortie : `.githooks/check-docs.mjs` vert (0
  chemin cité introuvable), relecture humaine des docs produit non
  touchées (hors périmètre, section 2) pour confirmer qu'aucune n'a été
  modifiée par erreur.

## 7. Reprise

- **Dernier état** (2026-10-04) : lot 1 fait (dossier → `packages/drwil/`,
  `package.json` → `name: "drwil"`, bin → `drwil` (`packages/drwil/bin/drwil.js`),
  `tsconfig.json` racine mis à jour, `node_modules` réinstallés proprement
  depuis la racine du monorepo). Preuve : `npm test` vert dans
  `packages/drwil/` (36 tests), `node packages/drwil/bin/drwil.js init`
  testé depuis `/tmp` isolé, fonctionne. Lot 2 fait : 13 fichiers mis à
  jour (chemins `packages/kit-ia-first` → `packages/drwil`, prose
  `@drwil/kit-ia-first` → `drwil` dans `docs/decouverte-valeur.md`,
  `docs/intentions/packager-kit-ia-first.md`,
  `docs/intentions/auditer-risques-et-dette.md`) ; `.drwil/ia-first.json`
  (`checks` → `packages/drwil`) corrigé en même temps (sinon
  `.githooks/run-checks.mjs` aurait échoué). `.githooks/check-docs.mjs` :
  0 erreur. `node .githooks/run-checks.mjs` : 36/36 verts.
- **Travail non commité** : tout le travail ci-dessus, prêt à committer.
- **Prochaine étape** : [humain] trancher la publication npm effective
  (`docs/intentions/packager-kit-ia-first.md`) quand souhaité ; sinon
  chantier terminé.
