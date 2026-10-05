# Installation par une autre personne

drwil n'est pas encore publié sur npm : il s'utilise depuis un clone de
ce dépôt.

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

# tester le CLI sur un dossier vide
node bin/drwil.js init --name "MonProjet" --layers backend,frontend
```

Voir aussi `README.md` (section « Démarrer ») pour le détail à jour.

## 4. Utiliser un autre outil IA que Claude

`AGENTS.md` est l'entrée commune ; les fichiers propres à un outil (ex.
`CLAUDE.md`, `GEMINI.md` — si présents) ne font que renvoyer à lui. Un
nouvel outil : lui faire lire `AGENTS.md` en priorité, sans dupliquer son
contenu.
