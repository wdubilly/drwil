# Projet : un projet neuf installé selon le README reste un projet neuf (0.6.1)

**Statut** : cadré le 2026-10-17.
**Risque** : MEDIUM
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/stack.ts
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - packages/drwil/package.json
  - package.json
  - package-lock.json
  - packages/drwil/CHANGELOG.md
  - README.md
-->

(cadrage : la détection de pile et son test, le registre (QUA-038), puis
la version 0.6.1 — paquets, verrou, changelog, README.)

## 1. Besoin

Constaté le 2026-10-17 en installant la 0.6.0 dans `drwil_com` (dossier
vide, projet du pilote) en suivant le README : l'étape 2
(`npm install -D ./drwil-*.tgz`) crée un `package.json` qui ne déclare que
drwil ; `init` y détecte une pile Node.js (`detectStack`,
`packages/drwil/src/stack.ts`) et traite le dossier comme un projet
existant (`packages/drwil/src/install.ts`). Comparé à un dossier vraiment
vide (vérifié le même jour) :

- pas de `git init` ni de branche d'installation (« no git repository :
  hooks not enabled ») ;
- pas de message « Scope it first (/drwil-adopt…) » ;
- la carte dit « `./` : Node.js, detected » au lieu de « Not decided » :
  `/drwil-adopt` et `AGENTS.md` lisent alors une pile à vérifier, pas une
  pile à choisir avec le demandeur.

Tout projet du pilote qui suit le README tombe dessus.

## Critères d'acceptation

- Un dossier dont le seul `package.json` ne déclare que drwil (aucune
  autre dépendance, aucun script) est un projet neuf : `init` y crée le
  dépôt git et sa branche, n'écrit aucune couche, dit de cadrer le projet,
  et la carte dit la pile « Not decided » ; un `package.json` qui déclare
  autre chose reste une pile Node.js détectée — `QUA-038`
- La version 0.6.1 est la même partout, son changelog dit la correction,
  et le README la donne comme dernière release — `QUA-040`

## Contrats modifiés

- `QUA-038` — ancien critère : « Sans pile détectée, `drwil init` n'écrit
  aucune couche et dit quoi faire » (un `package.json` quelconque valait
  pile détectée) — raison : un `package.json` qui n'installe que drwil
  n'est pas une pile ; la règle le dit et son test le prouve ; rien n'est
  retiré (validé le 2026-10-17, demande « corrige en 0.6.1 »)

## 2. Hors périmètre

- La prose non rafraîchie à la mise à jour
  (`docs/intentions/maj-prose-non-modifiee.md`).
- Le projet `drwil_com` lui-même : réinstallé à la main après la release
  (étapes données au demandeur), pas par ce chantier.

## 3. Contraintes

- Pas de changement pour un vrai projet Node : seules les dépendances
  `drwil` et l'absence de scripts font la différence.
- Publication de la 0.6.1 après fusion, sur feu vert (recette
  `docs/recipes/create-a-release.md`), avec `--dry-run` d'abord.

## 4. Décisions

- 2026-10-17 (demandeur) : corriger en 0.6.1, avant le pilote.
- Proposé par l'agent : corriger la détection plutôt que l'ordre des
  étapes du README (un utilisateur qui fait `npm install` d'abord reste
  couvert) ; la release dans le même chantier, la 0.6.1 ne contenant que
  ce correctif.

## 5. Lots

- **Lot 1** : `detectDir` ignore un `package.json` qui n'installe que
  drwil ; test du parcours (dossier avec ce seul `package.json`, et un
  `package.json` réel qui reste détecté) ; QUA-038 à jour ; version 0.6.1,
  changelog, README ; PR.
- **Lot 2** (après fusion, sur feu vert) : `--dry-run`, release, tarball
  vérifié sur un dossier vide en suivant le README.

## 6. Reprise

- **Dernier état** (2026-10-17) : cadré ; rien de commencé.
