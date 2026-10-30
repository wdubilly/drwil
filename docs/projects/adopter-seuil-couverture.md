# Projet : couverture de test, tout le code livré mesuré

**Statut** : cadré le 2026-10-05, recadré le 2026-10-16 — lots 1, 2 et 3a
d'origine faits (c8 câblé, QUA-004 adopté, seuils au réel avec cliquet,
le 2026-10-11) ; reste le lot 1 ci-dessous.
**Risque** : HIGH
**Maturité** : prêt (2026-10-30 : la cible de couverture est tranchée, `docs/intentions/couverture-paquet-100.md`)
**Intention** : `docs/intentions/couverture-paquet-100.md` (le 100 % du
paquet, sorti de ce chantier au recadrage)

<!-- scope
files:
  - packages/drwil/package.json
  - package.json
  - .drwil/ia-first.json
  - docs/contracts.md
  - packages/drwil/test/*.test.mjs
  - packages/drwil/templates/common/optional/front-quality/*.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/*.mjs
  - .claude/hooks/*.test.mjs
  - docs/architecture.md
-->

(cadrage : les scripts de couverture du paquet et du dépôt, leurs
contrôles, le registre ; les tests du paquet et des hooks Claude ; le
code du module front et des hooks Claude, seulement s'il faut le rendre
testable — les copies installées sont couvertes par `scopeMirrors`.)

## 1. Besoin

QUA-004 (seuil de couverture de test) mesure deux périmètres : le paquet
`packages/drwil` (seuils 89 % lignes, 81 % branches, 91 % fonctions ;
mesuré le 2026-10-16 : 95,2 % / 88,0 % / 95,9 %) et les hooks du dépôt
`.githooks/*.mjs` à 100 %, qui couvrent les hooks livrés par leurs copies
installées, y compris le tableau de bord et le script de release.

Deux trous restent :
- sans `--all`, la mesure du paquet ignore un fichier que les tests
  n'importent jamais (limite relevée au lot 3a, le 2026-10-11) ;
- du code livré n'entre dans aucune mesure : les hooks Claude
  (`.claude/hooks/*.mjs`) et le module optionnel front
  (`packages/drwil/templates/common/optional/front-quality/check-colors.mjs`, `packages/drwil/templates/common/optional/front-quality/check-contrast.mjs`). Une régression n'y fait
  rien échouer.

## Critères d'acceptation

- La mesure du paquet compte tout fichier de `packages/drwil/src/` (compilé) et de
  `packages/drwil/bin/`, même jamais importé par les tests (`--all`) ; les hooks du
  gabarit en sont exclus parce que leurs copies sont mesurées à 100 % par
  le dépôt, exclusion déclarée dans QUA-004 — `QUA-004`
- Les hooks Claude et le module front entrent dans une mesure contrôlée,
  au seuil de leur niveau réel au lancement, qui ne redescend plus ;
  un fichier sans aucun test y reçoit au moins un test de son chemin
  principal — `QUA-004`
- Les seuils du paquet sont relevés aux chiffres mesurés au lancement
  (cliquet), et le contrôle reste vert — `QUA-004`

## Contrats modifiés

- `QUA-004` — ancien critère : « `packages/drwil` à 89 % lignes, 81 %
  branches, 91 % fonctions […] ; hooks de gouvernance (`.githooks/*.mjs`)
  à 100 % » (périmètre : `packages/drwil` et `.githooks/*.mjs`) — raison :
  la règle étend sa mesure aux hooks Claude et au module front, compte les
  fichiers jamais importés (`--all`) et relève les seuils du paquet ; rien
  n'est retiré (validé le 2026-10-16, recommandations de l'agent acceptées
  par le demandeur)

## 2. Hors périmètre

- Le 100 % du paquet (`packages/drwil/bin/drwil.js`, branches de `packages/drwil/src/`, chemin réel du
  script de release) : intention `docs/intentions/couverture-paquet-100.md`.
- Les outils propres au dépôt (`outils/*.mjs`) : pas du code livré.
- `catalogue:QUA-020` (tests de bout en bout).

## 3. Contraintes

- Un seuil ne redescend jamais (cliquet) ; seuils arrondis à l'entier
  inférieur de la mesure.
- Le contrôle tourne vraiment, en local et en CI (QUA-011, doc jamais
  fausse ; QUA-013, contrôle non exécuté n'est pas passé).
- Toucher au code d'un hook Claude ou du module front pour le rendre
  testable ne change pas son comportement (recette
  `docs/recipes/refactor-without-breaking.md`).

## 4. Décisions

- 2026-10-05 (demandeur) : outil `c8` ; les trois métriques (lignes,
  branches, fonctions) ; seuil bas d'abord, relevé au fil de l'eau.
- 2026-10-11 (demandeur) : seuils au réel, cliquet ; le 100 % à part.
- 2026-10-16 (demandeur, recommandations de l'agent acceptées) : ce
  chantier ne fait que la mesure complète (lot 1) ; le 100 % du paquet
  devient une intention ; les hooks Claude et le module front entrent à
  leur niveau réel, pas à 100 % ; pour le futur 100 %, le chemin réel du
  script de release sera testé en mockant `execFileSync`, pas exclu par
  `c8 ignore`.

- 2026-10-30 (demandeur) : ordre des trois sujets de couverture — ce chantier
  d'abord (mesure complète, cliquet), puis la couverture du code modifié
  (`docs/projects/couverture-du-code-modifie.md`), puis le 100 % du paquet
  (`docs/intentions/couverture-paquet-100.md`).

## 5. Lots

- **Lot 1 — aucun code livré hors mesure** : `--all` sur la mesure du
  paquet (`packages/drwil/src/` compilé et `packages/drwil/bin/`, hooks du gabarit exclus et déclarés) ;
  mesure contrôlée des hooks Claude et du module front à leur niveau réel
  (un test minimal pour un fichier qui n'en a aucun) ; cliquet des seuils
  du paquet ; QUA-004 et la carte à jour.

## 6. Reprise

- **Dernier état** (2026-10-30) : cible tranchée, prêt ; rien de commencé.
- **Prochaine étape** : lancer le lot 1, mesurer d'abord hooks Claude et
  module front.
