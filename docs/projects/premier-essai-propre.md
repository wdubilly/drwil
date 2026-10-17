# Projet : un premier essai propre — installation sans tarball local, premier `verify` sans CI expliqué (0.6.2)

**Statut** : cadré le 2026-10-17.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - README.md
  - packages/drwil/README.md
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - packages/drwil/src/doctor.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/package.json
  - package.json
  - package-lock.json
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - .drwil/ia-first.json
-->

(cadrage : l'installation décrite par les deux README, le message « pas de
CI » du moteur (gabarit, copie du dépôt, test) et de `doctor` (test du
paquet), puis la version 0.6.2 — paquets, verrou, changelog.)

## 1. Besoin

Constaté le 2026-10-17 en installant la 0.6.1 dans `drwil_com` (dossier
vide, projet du pilote) en suivant le README à la lettre :

1. **Le tarball pollue le projet.** `gh release download` dépose
   `drwil-0.6.1.tgz` à la racine, puis `npm install -D ./drwil-*.tgz` écrit
   `"drwil": "file:drwil-0.6.1.tgz"` dans `package.json`. Le fichier doit
   donc rester là (sinon `npm ci` échoue ailleurs), il n'est pas ignoré par
   git (`git check-ignore` : non) et partirait au premier commit — 229 Ko,
   plus un tarball par mise à jour. Le dépôt étant public, l'URL de l'asset
   de la release s'installe directement (vérifié le 2026-10-17 dans un
   dossier d'essai : `package.json` pointe sur l'URL, aucun fichier déposé,
   `npx drwil --version` → `0.6.1`) — et `gh` n'est plus nécessaire.
2. **Le premier `verify` du README finit en erreur.** `init` par défaut
   déclare `ci: none` ; `verify` rend alors `GOVERNANCE: VERIFY ERROR`
   (QUA-013 : couverture CI non exécutée, « no CI configured (ci: none): no
   net for degradable checks »). C'est voulu (journal du 2026-10-11), mais
   ni le README ni le message ne disent que c'est attendu ni comment en
   sortir : la première commande d'un nouvel utilisateur échoue sans
   explication.

## Critères d'acceptation

- Les deux README installent drwil par l'URL de l'asset de la release
  courante (`npm install -D https://github.com/wdubilly/drwil/releases/download/v<version>/drwil-<version>.tgz`),
  sans `gh release download` ni tarball déposé ; la variante sans toucher
  `package.json` (`npx --package <URL> drwil`) et la mise à jour (relancer
  avec la nouvelle URL, puis supprimer un ancien `drwil-*.tgz` local) sont
  dites ; les prérequis ne demandent plus `gh` pour installer — `QUA-040`
- Sans CI déclarée, le détail de QUA-013 (contrôle non exécuté n'est pas
  passé) dans `verify` et la ligne CI de `doctor` disent comment en sortir
  (`npx drwil init --ci github` ou `--ci gitlab`), en français et en
  anglais, prouvé par les tests ; le verdict reste ERROR — `QUA-013`
- Le README dit, à côté du premier `verify`, qu'un projet sans CI y lit
  ERROR et comment en déclarer une — `QUA-040`
- La version 0.6.2 est la même partout, son changelog dit les deux
  changements, et le README la donne comme dernière release — `QUA-040`

## Contrats modifiés

Aucun : QUA-013 garde sa règle (un contrôle non exécuté n'est pas passé) ;
seul son message dit quoi faire.

Contrat créé (ID attribué au commit qui l'inscrit au registre) : « un
projet sans CI sait comment en déclarer une », automatisé, avec son
contrôle de tests. Décision du demandeur du 2026-10-17
en cours de chantier : QUA-013 porte un champ `Manuel` (contrat attesté),
un critère prouvé par des tests ne peut pas y être rattaché (« preuve non
durable ») ; d'où l'élargissement du cadrage au registre et à
`.drwil/ia-first.json`.

## 2. Hors périmètre

- Publication npm du kit (vague 7, fiche à part) : elle rendrait l'URL
  inutile.
- Le contrôle `tarball` (`outils/tester-tarball.mjs`) : il éprouve le
  tarball local construit par `npm pack`, pas la doc d'installation.
- `INSTALL.md` : il décrit le développement du kit (`npm pack` depuis le
  dépôt), pas l'installation par un utilisateur.
- `init` qui proposerait une CI d'office : `ci: none` reste le défaut.
- Le projet `drwil_com` : réinstallé à la main après la release.

## 3. Contraintes

- L'URL porte la version : elle est mise à jour à chaque release, comme la
  mention « latest release » du README.
- Ne pas casser un projet déjà installé depuis un tarball local : la
  détection de pile (`detectDir`) ne regarde que le nom `drwil`, quel que
  soit le spécificateur (fichier ou URL).
- Publication de la 0.6.2 après fusion, sur feu vert (recette
  `docs/recipes/create-a-release.md`), `--dry-run` d'abord.

## 4. Décisions

- 2026-10-17 (demandeur) : une seule fiche pour les deux points.
- 2026-10-17 (demandeur) : README **et** message de `verify`/`doctor`,
  plutôt que le README seul.
- Proposé par l'agent : installer par l'URL de la release plutôt
  qu'ignorer le `.tgz` dans `.gitignore` (le fichier resterait exigé par
  `npm ci` sur un autre poste).

## 5. Lots

- **Lot 1** : messages `noCi` du moteur (gabarit + copie) et de `doctor`
  avec la commande de sortie, tests (moteur et paquet) ; README et README
  du paquet (installation par URL, mise à jour, premier `verify` sans CI) ;
  version 0.6.2, changelog ; PR.
- **Lot 2** (après fusion, sur feu vert) : `--dry-run`, release, puis essai
  sur `drwil_com` vidé en suivant le README.

## 6. Reprise

- **Dernier état** (2026-10-17) : cadré ; rien de commencé.
