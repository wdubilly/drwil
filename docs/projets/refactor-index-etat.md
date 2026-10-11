# Projet : découper index.ts, etat.mjs et verify.ts, adopter le plafond de taille

**Statut** : cadré le 2026-10-12 — décisions prises, lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - packages/drwil/src/*.ts
  - packages/drwil/test/*.test.mjs
  - packages/drwil/templates/common/base/.githooks/etat.mjs
  - packages/drwil/templates/common/base/.githooks/fiches.mjs
  - packages/drwil/templates/common/base/.githooks/etat-textes.mjs
  - .githooks/etat.mjs
  - .githooks/fiches.mjs
  - .githooks/etat-textes.mjs
  - .githooks/etat.test.mjs
  - .githooks/fiches.test.mjs
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/contrats.md
  - docs/catalogue-contrats.md
-->

## 1. Besoin

Trois fichiers dépassent un plafond raisonnable et mêlent plusieurs
sujets, ce qui rend chaque chantier suivant (passage à l'anglais,
fluidité) plus coûteux à écrire et à relire :

- `packages/drwil/src/index.ts` (838 lignes le 2026-10-12) : options et
  config, rendu du gabarit, manifeste et désinstallation, résolution de
  dérive, git, aperçu d'`apply`, `init` et `apply` ; une variable globale
  (`simulation`) relie l'aperçu d'`apply` à l'écriture des fichiers ;
- `.githooks/etat.mjs` (607 lignes, livré) : modèle d'état et transitions,
  lecture des fiches et de l'index, textes et rappels, ligne de commande ;
- `packages/drwil/src/verify.ts` (450 lignes).

Le kit livre un garde-fou de taille (catalogue:QUA-001, fichier de code
plafonné) que ce dépôt n'a pas adopté : il éprouve ici ce qu'il livre.

## 2. Hors périmètre

- Tout changement de comportement : sorties, messages, codes de sortie,
  fichiers installés et leur contenu restent identiques. Un bug trouvé en
  route : commit séparé avec son test, signalé.
- Le passage à l'anglais et la commande unique `init`/`apply`
  (`docs/intentions/livrable-full-english.md`).
- Les autres fichiers sous 400 lignes.

## 3. Contraintes

- Recette : `docs/recettes/refactorer-sans-casser.md` — tests de
  caractérisation d'abord, commités seuls et verts ; un commit par étape,
  contrôles verts à chaque commit.
- `.githooks/etat.mjs` garde toute son interface exportée actuelle (réexports) : ses
  consommateurs (autres hooks, hook de saisie de Claude Code, CLI, tests)
  ne changent pas.
- Fichiers livrés : on n'édite que le gabarit, puis
  `npm run installer-depot` (journal du 2026-10-12). Les fichiers ajoutés à
  `.githooks/` sont repris par l'installation et la désinstallation des
  projets équipés (manifeste).
- `couverture-hooks` reste à 100 % ; la couverture du paquet ne baisse pas
  (cliquet de `packages/drwil/package.json`).
- Le garde-fou de taille ne compte pas les fichiers .mjs par défaut : lui passer
  l'extension pour couvrir `.githooks/` et `outils/`.

## 4. Décisions

- **2026-10-12 — Plafond de 400 lignes** (demandeur), le défaut du kit ;
  `packages/drwil/src/verify.ts` est donc découpé aussi, et la liste des plafonds hérités
  (`.githooks/check-file-size.legacy.json`) reste vide, identique au
  gabarit : aucun écart à déclarer.
- **2026-10-12 — `.githooks/etat.mjs` découpé en plusieurs fichiers livrés**
  (demandeur) : `.githooks/etat.mjs` (ligne de commande et transitions),
  fiches.mjs (lecture des fiches et de l'index), etat-textes.mjs
  (textes).
- **2026-10-12 — Un lot par fichier, une seule PR** (demandeur).

## Contrats concernés

- **QUA-004** — Seuil de couverture : caractérisation d'abord, couverture
  qui ne baisse pas, hooks à 100 %.
- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit : les
  nouveaux fichiers de `.githooks/` sont livrés, rien de propre au dépôt
  n'y remonte.
- **QUA-019** — Pas de contournement : aucun test affaibli pour faire
  passer un découpage.

Contrat du catalogue adopté : catalogue:QUA-001 (fichier de code plafonné).

## 5. Points à trancher

Aucun.

## 6. Lots

- **Lot 1 — Caractérisation** [IA] : tests sur les trous de couverture
  d'`packages/drwil/src/index.ts` (confirmation interactive de la dérive, erreurs de git à
  l'installation), commités seuls et verts. Critère de sortie : couverture
  d'`packages/drwil/src/index.ts` relevée, contrôles verts.
- **Lot 2 — `packages/drwil/src/index.ts`** [IA] : modules par sujet (config, rendu,
  manifeste et désinstallation, dérive, git, aperçu), `packages/drwil/src/index.ts` ne gardant
  qu'`init`, `apply` et les exports ; `simulation` passée en paramètre.
  Critère de sortie : chaque fichier sous 400 lignes, suite du paquet
  identique et verte.
- **Lot 3 — `.githooks/etat.mjs`** [IA] : découpage dans le gabarit, installé par
  `npm run installer-depot`, réexports conservés. Critère de sortie :
  chaque fichier sous 400 lignes, `couverture-hooks` à 100 %,
  `miroirs-gabarit` vert.
- **Lot 4 — `packages/drwil/src/verify.ts`** [IA] : un module extrait. Critère de sortie :
  sous 400 lignes, suite verte.
- **Lot 5 — Garde-fou** [IA] : contrôle de taille déclaré dans
  `.drwil/ia-first.json` (paquet, hooks, outils ; extensions `ts`, `js`,
  `mjs`) ; catalogue:QUA-001 inscrit au registre (`docs/contrats.md`) et
  retiré du catalogue du dépôt (`docs/catalogue-contrats.md`, écart déjà
  déclaré) ; `docs/architecture.md` à jour. Critère de sortie :
  `node .githooks/run-checks.mjs` vert, un fichier de 401 lignes refusé.

## 7. Reprise

- **Dernier état** (2026-10-12) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancement par `/drwil-lancer`.
