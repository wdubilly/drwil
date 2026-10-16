# Installation par une autre personne

drwil n'est pas encore publié sur npm : il s'utilise depuis un clone de
ce dépôt, ou depuis le tarball joint à une release GitHub (voir
`README.md`, section « Installation »).

## 1. Prérequis

- Node.js (voir la matrice testée dans `.github/workflows/ia-first.yml`,
  tests croisés Linux/macOS/Windows) ;
- npm (fourni avec Node.js).

## 2. Cloner et configurer

```bash
git clone https://github.com/wdubilly/drwil.git
cd drwil/packages/drwil
npm install
npm run build
```

Activer les contrôles Git du dépôt, une fois par clone :
```bash
git config core.hooksPath .githooks
```

## 3. Premier démarrage et vérification

```bash
npm test                 # suite de tests du paquet drwil

# tester le CLI sur un dossier vide (aucune couche inventée : cadrer
# d'abord avec /drwil-adopt, puis déclarer les couches avec --layers)
node bin/drwil.js init --name "MonProjet"
```

Depuis la racine du dépôt : `node .githooks/run-checks.mjs` rejoue tous
les contrôles, `node outils/tester-tarball.mjs` éprouve la CLI installée
depuis le tarball, comme un utilisateur.

## 4. Construire le tarball d'une version

```bash
cd packages/drwil
npm pack                 # construit (prepack) puis produit drwil-<version>.tgz
```

La version vient de `packages/drwil/package.json` ; la créer (tag, note
de release, tarball joint) suit `docs/recipes/create-a-release.md`, qui
renomme aussi la section « Unreleased » du changelog.

## 5. Utiliser un autre outil IA que Claude

`AGENTS.md` est l'entrée commune ; les fichiers propres à un outil (ex.
`CLAUDE.md`, `GEMINI.md` — si présents) ne font que renvoyer à lui. Un
nouvel outil : lui faire lire `AGENTS.md` en priorité, sans dupliquer son
contenu.
