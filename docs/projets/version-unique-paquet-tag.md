# Projet : un seul numéro de version (paquet, tag, `--version`)

**Statut** : cadré le 2026-10-06 — lot 1 livré sur la branche `chantier/version-unique`, en attente de fusion ; lot 2 après fusion.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .githooks/creer-release.mjs
  - packages/drwil/templates/common/optional/creer-une-release/creer-release.mjs
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/kit.test.mjs
-->

## 1. Besoin

Le tag Git et la version du paquet divergeaient : releases `v0.2.0` et
`v0.2.1` publiées avec un paquet resté en `0.0.1` (`package.json`,
`drwil --version` écrit en dur, tarball `drwil-0.0.1.tgz`). Le script de
release calculait la version depuis les messages de commit, sans lien avec
le paquet, et proposait `patch` pour toute la V0.2 faute de préfixes
`feat:`. Objectif : un seul numéro, que le tag, le tarball, `--version` et
npm affichent toujours à l'identique.

## 2. Hors périmètre

- Publication sur npm (DRWIL-030 de `docs/projets/drwil-v0-2-gouvernance-executable.md`).
- Changer le contenu des releases déjà publiées : seul l'asset de la
  release `v0.2.1` est remplacé (lot 2), le tag ne bouge pas.

## 3. Contraintes

- QUA-017 : le script de release ne commite jamais rien ; la version se
  décide donc dans une PR, pas au moment de la release.
- QUA-018 : le script est aussi un module optionnel livré aux projets ; un
  projet sans paquet npm garde le calcul d'après les commits.
- QUA-011 : recettes de release (dépôt et gabarit fr/en) mises à jour dans
  le même changement.

## 4. Décisions

- 2026-10-06 : les numéros doivent se suivre ; `package.json` est la source
  unique, le tag en découle (et non l'inverse, qui obligerait le script à
  commiter). [décision utilisateur]
- 2026-10-06 : le script refuse (code 1, y compris en `--dry-run`) un tag
  déjà existant, une version non supérieure au dernier tag, ou des paquets
  en désaccord ; le calcul d'après les commits reste une suggestion
  affichée. `drwil --version` lit `package.json`. [par défaut]

## 5. Points à trancher

(aucun)

## 6. Lots

- **Lot 1 — Source unique** [IA] : `deciderVersion` dans
  `.githooks/creer-release.mjs` (et sa copie du gabarit) ; `packages/drwil/bin/drwil.js`
  lit la version du paquet ; paquet passé en `0.2.1` ; tests (décision de
  version, refus, `--version` = `package.json`) ; recettes de release
  mises à jour. Critère de sortie : suite verte, `--dry-run` sur ce dépôt
  refuse `v0.2.1` (déjà publiée), ce qui prouve la garde.
- **Lot 2 — Asset de la release `v0.2.1`** [IA, après fusion] : remplacer
  `drwil-0.0.1.tgz` par `drwil-0.2.1.tgz` (`gh release upload --clobber`
  puis suppression de l'ancien asset).

## 7. Reprise

- **Dernier état** (2026-10-06) : lot 1 livré — `deciderVersion` (dépôt et
  gabarit), `packages/drwil/bin/drwil.js` lit `package.json`, paquet et racine en
  `0.2.1`, recettes de release (dépôt, gabarit fr/en), test dédié ; suite
  85/85. Sur ce dépôt, `--dry-run` refuse désormais `v0.2.1` (déjà publiée).
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] relire et fusionner la PR ; puis [IA] lot 2
  (asset de la release `v0.2.1`).
