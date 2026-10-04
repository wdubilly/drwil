# Projet : le kit de gouvernance IA-first devient le paquet `drwil`

**Statut** (2026-10-04) : décidé sur le principe — 1 point reste à
trancher avant lot 1 (section 5).

<!-- cadrage
fichiers:
  - packages/kit-ia-first/package.json
  - packages/kit-ia-first/bin
  - packages/kit-ia-first/src
  - packages/kit-ia-first/test
-->

## 1. Besoin

Clarifié le 2026-10-04 avec le demandeur : drwil n'est pas un produit
distinct qui *utiliserait* un kit — **drwil est le kit de gouvernance
IA-first**, rien d'autre. Jusqu'ici, `packages/kit-ia-first` (nommé
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
  du paquet, pas de dossier `packages/kit-ia-first/` conservé).
- (2026-10-04) Binaire CLI simplifié en `drwil` (`npx drwil init`,
  `npx drwil apply`), à la place de `drwil-ia-first`.

## 5. Points à trancher

- [décision] Dans la prose des docs (AGENTS.md, recettes, intentions...),
  remplacer systématiquement « kit IA-first » par « drwil » ou garder « kit
  IA-first » comme description du *contenu* et réserver « drwil » au nom du
  paquet/produit ?

## 6. Lots

(à proposer une fois la section 5 tranchée)

## 7. Reprise

- **Dernier état** (2026-10-04) : fiche créée après clarification du
  demandeur (« Drwil est le nom du produit (outil) que le projet drwil met
  en place » → « je veux construire le package de gouvernance qu'on
  appellera drwil »). Recensement fait : 13 fichiers citent
  `kit-ia-first` (`packages/kit-ia-first/package.json`,
  `packages/kit-ia-first/test/kit.test.mjs`, `tsconfig.json`,
  `.drwil/ia-first.json`, et plusieurs docs/fiches). Aucun code touché.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] trancher le dernier point de la
  section 5 (vocabulaire kit IA-first vs drwil), puis proposer les lots
  (renommage package.json/dossier/bin, mise à jour des imports/chemins
  relatifs, mise à jour des citations dans les docs, build + tests verts).
