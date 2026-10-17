# Intention : un dossier passé par `npm init -y` reste un projet neuf

**Statut** : proposée le 2026-10-17 — limite du chantier « un projet neuf
installé selon le README reste un projet neuf » (journal du 2026-10-17,
0.6.1).

## Besoin

La 0.6.1 ne compte plus comme pile un `package.json` qui n'installe que
drwil (aucune autre dépendance, aucun script). Mais `npm init -y` écrit un
script `test` par défaut (`echo "Error: no test specified" && exit 1`) :
un dossier vide passé par `npm init -y` avant l'installation est encore
pris pour un projet Node.js existant — pas de `git init` ni de branche,
pas d'invitation à cadrer, carte « Node.js, detected » (vérifié le
2026-10-17 sur un dossier d'essai). Le README ne fait pas cette étape,
mais un utilisateur Node la fait souvent par réflexe.

## Existant (vérifié le 2026-10-17)

- `detectDir` (`packages/drwil/src/stack.ts`) : un `package.json` sans
  autre dépendance que drwil et sans script n'est pas une pile ; un
  script quelconque suffit à en faire une.
- Un vrai projet Node à la racine (dépendances, scripts, code) reste
  détecté, sans message « no code yet ».

## Questions à trancher

- [décision] Ignorer aussi le script `test` par défaut de `npm init`
  (texte exact), ou juger sur la présence de code plutôt que sur le
  `package.json` ?
- [décision] Ou bien laisser la détection telle quelle et faire dire à
  `init` qu'un projet sans code est peut-être neuf (`/drwil-adopt` pour le
  cadrer) ?
