# Projet : les tests de `drwil serve` passent sous Windows, barrière de la publication 0.11.1

**Statut** : cadré le 2026-11-10.
**Risque** : LOW
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/test/serve.test.mjs
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

La CI des trois systèmes sur `master` (commit `1612f07`, 2026-11-10) est verte sur Ubuntu et macOS et échoue
sur Windows : trois tests de `packages/drwil/test/serve.test.mjs`. Ils étaient masqués avant la correction
du test QUA-281, car l'échec de macOS annulait Windows. Tant que Windows n'est pas vert sur le commit, la barrière
`release.requiredOs` refuse la publication de la version 0.11.1 (`docs/recipes/create-a-release.md`).

Les trois causes, lues dans le journal de la CI et le code :

- **QUA-278, deux tests** (ligne 2028 « avec Tailscale… », ligne 2045 « sans publication… ») : ils fabriquent un faux
  binaire `tailscale` en script `#!/bin/sh` (`tailscaleFactice`, ligne 1967), que Windows n'exécute pas ; le
  serveur ne trouve pas Tailscale et donne le message de repli. Le fichier a déjà une convention pour les faux
  outils en script : la constante `posix` (ligne 612), appliquée aux tests des forges.
- **QUA-272** (ligne 522) : le test arrête le serveur par `enfant.kill("SIGTERM")` (`demarrer`, ligne 100) puis
  vérifie que l'enregistrement du serveur (server.json) est effacé. Sous Windows, `kill` termine le processus sans lancer le
  gestionnaire de `SIGTERM` de `packages/drwil/src/cli-serve.ts` (lignes 144-145) : l'enregistrement reste.
  C'est une limite de la méthode d'arrêt du test, le produit traite déjà un enregistrement périmé (première
  moitié du même test), donc aucun changement du produit.

## Critères d'acceptation

- Les deux tests Tailscale de `QUA-278` sont sautés sous Windows avec la raison de la constante `posix` (faux
  outil en script), et jouent comme avant sous Linux et macOS — contrat `QUA-278`
- Le test de `QUA-272` ne vérifie l'effacement de l'enregistrement à l'arrêt que hors Windows, avec la raison dite
  dans un commentaire ; le remplacement d'un enregistrement périmé et le respect d'une réservation en cours
  restent vérifiés sur les trois systèmes — contrat QUA-272
- Le fichier serve.test.mjs passe en entier en local (Linux), sans test supplémentaire sauté hors Windows — contrat `QUA-278`

## 2. Hors périmètre

- Le code de `drwil serve` : aucun changement de comportement.
- Un vrai arrêt propre sous Windows : hors cadre, noté en limite si besoin.
- La publication de la 0.11.1 : un geste distinct, après la CI trois systèmes verte.

## 3. Contraintes

- Aucun contrôle sauté hors de ces trois cas, jamais pour Linux ou macOS ; chaque saut dit sa raison.
- Si, après ces trois corrections, Windows échoue encore sur un autre test, s'arrêter et le dire : ne pas deviner.
- Lancer : `node --test packages/drwil/test/serve.test.mjs` (voir packages/drwil/package.json pour le runner).

## 4. Décisions

Tranchées par le demandeur le 2026-11-10 : le faux Tailscale n'a pas à tourner sous Windows (saut par `posix`) ;
l'arrêt par signal n'est pas vérifié sous Windows.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — tests portables** [IA] : les trois changements, le fichier de tests vert en local, `GOVERNANCE: PASS`.
  Critère de sortie : PR fusionnée, CI verte.
- **Lot 2 — vérification et publication** [humain] : `gh workflow run ia-first.yml --ref master`, les trois
  systèmes verts, puis `node .githooks/create-release.mjs --dry-run` et la création de la release 0.11.1 (tag et
  artefact).

## 7. Reprise

- **Dernier état** (2026-11-10) : cadré, rien de réalisé. La 0.11.1 est fusionnée (PR #396), non publiée ; macOS
  est corrigé (PR #398).
- **Prochaine étape** : [IA] lot 1, dans une nouvelle session (`/drwil-start`) ; l'arbre de travail doit être propre,
  sinon le lancement est refusé sans message visible sous Copilot CLI.
