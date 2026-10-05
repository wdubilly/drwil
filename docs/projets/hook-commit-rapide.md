# Projet : garder le commit rapide (report des contrôles hors périmètre)

**Statut** : lots 1 à 4 livrés le 2026-10-05 sur la branche, en attente de fusion.

<!-- cadrage
fichiers:
  - .githooks/run-checks.mjs
  - .githooks/glob.mjs
  - .githooks/check-control-coverage.mjs
  - .githooks/pre-commit
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/glob.mjs
  - packages/drwil/templates/common/base/.githooks/check-control-coverage.mjs
  - packages/drwil/templates/common/base/.githooks/pre-commit
  - packages/drwil/test/kit.test.mjs
-->

## 1. Besoin

Retour extérieur (2026-10-05) : des hooks trop lents dégradent la boucle de
feedback ; garder le commit rapide et laisser les suites lourdes au push/CI.
Constat sur drwil : le pre-commit lançait toute la suite à chaque commit,
même de doc, et les tests du paquet deux fois (`npm test` puis
`npm run test:coverage`, qui refait le même build et les mêmes tests).

## 2. Hors périmètre

- Les contrôles du socle (gitleaks `--staged`, `.githooks/check-docs.mjs`, tests de
  `.githooks/`, couverture CI) : déjà rapides, toujours lancés.
- Le pre-push et la CI : inchangés, ils lancent toujours tout.

## 3. Contraintes

- QUA-013 : un contrôle reporté reste visible (« non exécuté »), jamais un
  succès silencieux.
- QUA-019 : rien n'est désactivé ; le pre-push rejoue tout.
- Viser les deux casquettes (QUA-018) : le dépôt et le gabarit livré.

## 4. Décisions

- 2026-10-05 : appliquer au dépôt et au livrable. [décision utilisateur]

## 5. Points à trancher

(aucun)

## 6. Lots

- **Lot 1 — Supprimer le doublon (dépôt)** [IA] : retirer
  `drwil: build + tests` de `.drwil/ia-first.json`, le contrôle de
  couverture faisant déjà build + tests. Critère de sortie :
  `node .githooks/run-checks.mjs` vert.
- **Lot 2 — Report au commit selon `chemins` (dépôt + gabarit)** [IA] :
  `DRWIL_HOOK=pre-commit` posé par `.githooks/pre-commit` ; un contrôle du
  projet qui déclare `chemins` sans fichier indexé correspondant finit
  « non exécuté ». Motifs interprétés par `.githooks/glob.mjs`, partagé
  avec `.githooks/check-control-coverage.mjs`. Doc : `docs/ia-first.md` du gabarit
  (fr/en), section 4. Critère de sortie : `npm test` de `packages/drwil`
  vert, dont le test « pre-commit : un contrôle du projet hors de ses
  chemins est reporté ».
- **Lot 3 — Nettoyer les dossiers temporaires des tests** [IA] :
  `packages/drwil/test/kit.test.mjs` laissait ses dossiers `drwil-*` dans
  `tmpdir()` (~70 par passage, lancé à chaque commit) ; 7919 dossiers ont
  saturé les inodes de `/tmp` le 2026-10-05 (`ENOSPC` avec 4,6 Go libres).
  Ils sont désormais supprimés après chaque test (`afterEach`). Critère de
  sortie : suite verte, aucun `drwil-*` restant après un passage.
- **Lot 4 — Combler les pertes relevées** [IA] (2026-10-05) : `chemins`
  du dépôt élargis à `package.json`, `package-lock.json` et
  `.drwil/ia-first.json` (dépendances du contrôle hors de son dossier, doc
  du gabarit complétée en ce sens) ; les dossiers temporaires d'un test en
  échec sont gardés et affichés pour le diagnostic. Reste à signaler dans
  la note de version : `chemins` décide désormais aussi de ce qui tourne
  au commit, pas seulement de la couverture CI.

## 7. Reprise

- **Dernier état** (2026-10-05) : lots 1 et 2 vérifiés sur la branche
  `perf/hook-commit-rapide` — `npm run test:coverage` : 56/56 verts, seuil
  tenu ; copies dépôt/gabarit de `.githooks/` identiques ; pre-commit
  simulé sur un commit de doc seule : 0,7 s au lieu d'environ 37 s.
  Lot 3 : 56/56 verts, aucun dossier `drwil-*` laissé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] fusionner la branche via une pull request,
  puis clôturer (journal + retrait de l'index).
